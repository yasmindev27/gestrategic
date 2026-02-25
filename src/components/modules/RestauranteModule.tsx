import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UtensilsCrossed, Calendar, CalendarDays, Salad, Loader2, Plus, Coffee, Sun, Cookie, Moon, Clock, CheckCircle2, XCircle, AlertCircle, BarChart3, FileDown, FileSpreadsheet, Filter, ClipboardList, TrendingUp, Search, Users, AlertTriangle, Pencil, Trash2 } from "lucide-react";
import { ExportDropdown } from "@/components/ui/export-dropdown";
import { RegistrosRefeicoes } from "@/components/restaurante/RegistrosRefeicoes";
import { RelatorioQuantitativoRefeicoes } from "@/components/restaurante/RelatorioQuantitativoRefeicoes";
import { ColaboradoresManager } from "@/components/restaurante/ColaboradoresManager";
import { TentativasDuplicidade } from "@/components/restaurante/TentativasDuplicidade";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { useLogAccess } from "@/hooks/useLogAccess";
import { useRealtimeSync, REALTIME_PRESETS } from "@/hooks/useRealtimeSync";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isToday, addDays, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
interface Cardapio {
  id: string;
  data: string;
  tipo_refeicao: string;
  descricao: string;
  observacoes: string | null;
}
interface SolicitacaoDieta {
  id: string;
  solicitante_id: string;
  solicitante_nome: string;
  tipo_dieta: string;
  descricao_especifica: string | null;
  data_inicio: string;
  data_fim: string | null;
  status: string;
  observacoes: string | null;
  created_at: string;
  paciente_nome: string | null;
  paciente_data_nascimento: string | null;
  quarto_leito: string | null;
  tem_acompanhante: boolean | null;
  restricoes_alimentares: string | null;
  horarios_refeicoes: string[] | null;
  entregue: boolean;
}
interface RegistroRefeicao {
  id: string;
  tipo_pessoa: string;
  colaborador_nome: string;
  colaborador_user_id: string | null;
  tipo_refeicao: string;
  data_registro: string;
  hora_registro: string;
  created_at: string;
}

// Tipo unificado para o registro geral
interface RegistroGeral {
  id: string;
  tipo: "dieta" | "refeicao";
  nome: string;
  descricao: string;
  data: string;
  hora?: string;
  status?: string;
  detalhes: string;
  created_at: string;
}
const tipoRefeicaoLabels: Record<string, {
  label: string;
  icon: React.ReactNode;
}> = {
  cafe: {
    label: "Café da Manhã",
    icon: <Coffee className="h-4 w-4" />
  },
  almoco: {
    label: "Almoço",
    icon: <Sun className="h-4 w-4" />
  },
  lanche: {
    label: "Café da Tarde",
    icon: <Cookie className="h-4 w-4" />
  },
  jantar: {
    label: "Jantar",
    icon: <Moon className="h-4 w-4" />
  },
  fora_horario: {
    label: "Fora de Horário",
    icon: <Clock className="h-4 w-4" />
  }
};
const tipoDietaLabels: Record<string, string> = {
  pastosa: "Pastosa",
  geral: "Geral",
  liquida: "Líquida",
  hipossodica: "Hipossódica (Baixo Sódio)",
  hipocalorica: "Hipocalórica (Baixas Calorias)",
  has_dm: "HAS/DM",
  enteral: "Enteral",
  branda: "Branda",
  suspensa: "Suspensa"
};
const horariosRefeicaoOptions = [{
  value: "cafe",
  label: "Café da Manhã"
}, {
  value: "almoco",
  label: "Almoço"
}, {
  value: "lanche",
  label: "Lanche da Tarde"
}, {
  value: "jantar",
  label: "Jantar"
}];

// Status removido - dietas são automaticamente aceitas

export const RestauranteModule = () => {
  const {
    toast
  } = useToast();
  const { logAction } = useLogAccess();
  const {
    isAdmin,
    hasRole,
    userId,
    isLoading: isLoadingRole
  } = useUserRole();
  const isRestaurante = hasRole("restaurante");
  const canManage = isAdmin || isRestaurante;
  const [activeTab, setActiveTab] = useState("cardapio");

  // Sincronização em tempo real com outros módulos
  useRealtimeSync(REALTIME_PRESETS.restaurante);

  useEffect(() => {
    logAction("acesso_modulo", "restaurante");
  }, [logAction]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    logAction("navegacao_aba", "restaurante", { aba: value });
  };
  const [cardapioView, setCardapioView] = useState<"dia" | "semana">("dia");
  const [cardapios, setCardapios] = useState<Cardapio[]>([]);
  const [minhasSolicitacoes, setMinhasSolicitacoes] = useState<SolicitacaoDieta[]>([]);
  const [todasSolicitacoes, setTodasSolicitacoes] = useState<SolicitacaoDieta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userName, setUserName] = useState("");
  const [formData, setFormData] = useState({
    paciente_nome: "",
    paciente_data_nascimento: "",
    quarto_leito: "",
    tem_acompanhante: false,
    tipo_dieta: "",
    restricoes_alimentares: "",
    horarios_refeicoes: ["cafe", "almoco", "lanche", "jantar"] as string[],
    observacoes: "",
    is_dieta_extra: false,
    observacao_dieta_extra: ""
  });

  // Cardápio management states (for admin/restaurante)
  const [cardapioDialogOpen, setCardapioDialogOpen] = useState(false);
  const [cardapioFormData, setCardapioFormData] = useState({
    data: format(new Date(), "yyyy-MM-dd"),
    tipo_refeicao: "",
    descricao: "",
    observacoes: ""
  });

  // Dashboard states
  const [dashboardDataInicio, setDashboardDataInicio] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [dashboardDataFim, setDashboardDataFim] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [dashboardSolicitacoes, setDashboardSolicitacoes] = useState<SolicitacaoDieta[]>([]);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);

  // Registro Geral states
  const [registrosRefeicoes, setRegistrosRefeicoes] = useState<RegistroRefeicao[]>([]);
  const [registroGeralDataInicio, setRegistroGeralDataInicio] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [registroGeralDataFim, setRegistroGeralDataFim] = useState(format(new Date(), "yyyy-MM-dd"));
  const [registroGeralFiltroTipo, setRegistroGeralFiltroTipo] = useState<"todos" | "dieta" | "refeicao">("todos");

  // Solicitações de Dieta - Filtros e Pesquisa
  const [solicitacoesPesquisa, setSolicitacoesPesquisa] = useState("");
  const [solicitacoesPeriodo, setSolicitacoesPeriodo] = useState<"todos" | "dia" | "semana" | "mes">("todos");

  // Minhas Solicitações - Filtros (aba Dietas)
  const [minhasDietasFiltro, setMinhasDietasFiltro] = useState<"todos" | "dia" | "semana" | "mes">("todos");

  // Admin edit/delete dieta states
  const [editDietaDialogOpen, setEditDietaDialogOpen] = useState(false);
  const [deleteDietaDialogOpen, setDeleteDietaDialogOpen] = useState(false);
  const [selectedDieta, setSelectedDieta] = useState<SolicitacaoDieta | null>(null);
  const [editDietaFormData, setEditDietaFormData] = useState({
    paciente_nome: "",
    quarto_leito: "",
    tem_acompanhante: false,
    tipo_dieta: "",
    restricoes_alimentares: "",
    horarios_refeicoes: [] as string[],
  });
  const [isDietaSubmitting, setIsDietaSubmitting] = useState(false);
  useEffect(() => {
    // Só busca dados quando o role terminou de carregar
    if (!isLoadingRole) {
      fetchData();
    }
    fetchUserName();
  }, [cardapioView, canManage, isLoadingRole]);
  const fetchUserName = async () => {
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    if (user) {
      const {
        data: profile
      } = await supabase.from("profiles").select("full_name").eq("user_id", user.id).single();
      if (profile) {
        setUserName(profile.full_name);
      }
    }
  };
  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch cardápios
      let startDate: Date;
      let endDate: Date;
      if (cardapioView === "dia") {
        startDate = new Date();
        endDate = new Date();
      } else {
        startDate = startOfWeek(new Date(), {
          weekStartsOn: 1
        });
        endDate = endOfWeek(new Date(), {
          weekStartsOn: 1
        });
      }
      const {
        data: cardapiosData,
        error: cardapiosError
      } = await supabase.from("cardapios").select("*").gte("data", format(startDate, "yyyy-MM-dd")).lte("data", format(endDate, "yyyy-MM-dd")).order("data").order("tipo_refeicao");
      if (cardapiosError) throw cardapiosError;
      setCardapios(cardapiosData || []);

      // Fetch minhas solicitações
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (user) {
        const {
          data: minhasData,
          error: minhasError
        } = await supabase.from("solicitacoes_dieta").select("*").eq("solicitante_id", user.id).order("created_at", {
          ascending: false
        });
        if (minhasError) throw minhasError;
        setMinhasSolicitacoes(minhasData || []);

        // Se for admin ou restaurante, buscar todas as solicitações e registros de refeições
        if (canManage) {
          const {
            data: todasData,
            error: todasError
          } = await supabase.from("solicitacoes_dieta").select("*").order("created_at", {
            ascending: false
          });
          if (todasError) throw todasError;
          setTodasSolicitacoes(todasData || []);

          // Buscar TODOS os registros de refeições do totem (paginação para superar limite de 1000)
          let allRefeicoes: any[] = [];
          let refPage = 0;
          const REF_PAGE_SIZE = 1000;
          let refHasMore = true;

          while (refHasMore) {
            const from = refPage * REF_PAGE_SIZE;
            const to = from + REF_PAGE_SIZE - 1;
            const { data: batch, error: batchError } = await supabase
              .from("refeicoes_registros")
              .select("*")
              .order("created_at", { ascending: false })
              .range(from, to);

            if (batchError) throw batchError;

            if (batch && batch.length > 0) {
              allRefeicoes = allRefeicoes.concat(batch);
              refHasMore = batch.length === REF_PAGE_SIZE;
              refPage++;
            } else {
              refHasMore = false;
            }
          }
          setRegistrosRefeicoes(allRefeicoes);
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Combinar registros de dieta e refeições para o registro geral
  // Usar mesma lógica do Quantitativo: dietas ATIVAS no período (não apenas as que iniciaram no período)
  const registrosGerais: RegistroGeral[] = [...todasSolicitacoes.filter(s => {
    // Dieta está ativa se: começou antes/durante o período E termina durante/depois do período
    const inicio = s.data_inicio;
    const fim = s.data_fim || registroGeralDataFim;
    return inicio <= registroGeralDataFim && fim >= registroGeralDataInicio;
  }).map(s => ({
    id: s.id,
    tipo: "dieta" as const,
    nome: s.paciente_nome || "N/A",
    descricao: `Dieta ${tipoDietaLabels[s.tipo_dieta] || s.tipo_dieta}`,
    data: s.data_inicio,
    status: s.status,
    detalhes: `Quarto/Leito: ${s.quarto_leito || "N/A"} | Solicitante: ${s.solicitante_nome}`,
    created_at: s.created_at
  })), ...registrosRefeicoes.filter(r => {
    // Filtrar por data_registro
    return r.data_registro >= registroGeralDataInicio && r.data_registro <= registroGeralDataFim;
  }).map(r => ({
    id: r.id,
    tipo: "refeicao" as const,
    nome: r.colaborador_nome,
    descricao: tipoRefeicaoLabels[r.tipo_refeicao]?.label || r.tipo_refeicao,
    data: r.data_registro,
    hora: r.hora_registro,
    detalhes: `Tipo: ${r.tipo_pessoa === "colaborador" ? "Colaborador" : "Visitante"}`,
    created_at: r.created_at
  }))].filter(r => registroGeralFiltroTipo === "todos" || r.tipo === registroGeralFiltroTipo).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const handleSubmitSolicitacao = async () => {
    // Validação diferente para dieta extra
    if (formData.is_dieta_extra) {
      if (!formData.tipo_dieta) {
        toast({
          title: "Erro",
          description: "Preencha o campo obrigatório: tipo de dieta.",
          variant: "destructive"
        });
        return;
      }
      if (!formData.observacao_dieta_extra.trim()) {
        toast({
          title: "Erro",
          description: "Para dieta extra, é obrigatório informar o motivo na observação.",
          variant: "destructive"
        });
        return;
      }
    } else {
      if (!formData.tipo_dieta || !formData.paciente_nome || !formData.quarto_leito) {
        toast({
          title: "Erro",
          description: "Preencha os campos obrigatórios: nome do paciente, quarto/leito e tipo de dieta.",
          variant: "destructive"
        });
        return;
      }
    }
    setIsSubmitting(true);
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Combinar observações se for dieta extra
      const observacoesCompletas = formData.is_dieta_extra ? `[DIETA EXTRA] ${formData.observacao_dieta_extra}${formData.observacoes ? ` | Observações: ${formData.observacoes}` : ''}` : formData.observacoes || null;
      const {
        error
      } = await supabase.from("solicitacoes_dieta").insert({
        solicitante_id: user.id,
        solicitante_nome: userName,
        tipo_dieta: formData.tipo_dieta,
        paciente_nome: formData.is_dieta_extra ? formData.observacao_dieta_extra.trim() : (formData.paciente_nome || null),
        paciente_data_nascimento: formData.paciente_data_nascimento || null,
        quarto_leito: formData.quarto_leito || null,
        tem_acompanhante: formData.tem_acompanhante,
        restricoes_alimentares: formData.restricoes_alimentares || null,
        horarios_refeicoes: formData.horarios_refeicoes,
        data_inicio: format(new Date(), "yyyy-MM-dd"),
        observacoes: observacoesCompletas,
        status: "aprovada" // Dietas são automaticamente aceitas
      });
      if (error) throw error;
      toast({
        title: "Sucesso",
        description: "Dieta registrada com sucesso."
      });
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Erro",
        description: "Erro ao enviar solicitação.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Admin functions for diet edit/delete
  const handleEditDietaClick = (dieta: SolicitacaoDieta) => {
    setSelectedDieta(dieta);
    setEditDietaFormData({
      paciente_nome: dieta.paciente_nome || "",
      quarto_leito: dieta.quarto_leito || "",
      tem_acompanhante: dieta.tem_acompanhante || false,
      tipo_dieta: dieta.tipo_dieta,
      restricoes_alimentares: dieta.restricoes_alimentares || "",
      horarios_refeicoes: dieta.horarios_refeicoes || ["cafe", "almoco", "lanche", "jantar"],
    });
    setEditDietaDialogOpen(true);
  };

  const handleDeleteDietaClick = (dieta: SolicitacaoDieta) => {
    setSelectedDieta(dieta);
    setDeleteDietaDialogOpen(true);
  };

  const handleUpdateDieta = async () => {
    if (!selectedDieta) return;
    
    setIsDietaSubmitting(true);
    try {
      const { error } = await supabase
        .from("solicitacoes_dieta")
        .update({
          paciente_nome: editDietaFormData.paciente_nome || null,
          quarto_leito: editDietaFormData.quarto_leito || null,
          tem_acompanhante: editDietaFormData.tem_acompanhante,
          tipo_dieta: editDietaFormData.tipo_dieta,
          restricoes_alimentares: editDietaFormData.restricoes_alimentares || null,
          horarios_refeicoes: editDietaFormData.horarios_refeicoes,
        })
        .eq("id", selectedDieta.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Dieta atualizada com sucesso.",
      });
      setEditDietaDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error("Erro ao atualizar dieta:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a dieta.",
        variant: "destructive",
      });
    } finally {
      setIsDietaSubmitting(false);
    }
  };

  const handleDeleteDieta = async () => {
    if (!selectedDieta) return;
    
    setIsDietaSubmitting(true);
    try {
      const { error } = await supabase
        .from("solicitacoes_dieta")
        .delete()
        .eq("id", selectedDieta.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Dieta excluída com sucesso.",
      });
      setDeleteDietaDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error("Erro ao excluir dieta:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a dieta.",
        variant: "destructive",
      });
    } finally {
      setIsDietaSubmitting(false);
    }
  };
  const handleSubmitCardapio = async () => {
    if (!cardapioFormData.data || !cardapioFormData.tipo_refeicao || !cardapioFormData.descricao) {
      toast({
        title: "Erro",
        description: "Preencha os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");
      const {
        error
      } = await supabase.from("cardapios").upsert({
        data: cardapioFormData.data,
        tipo_refeicao: cardapioFormData.tipo_refeicao,
        descricao: cardapioFormData.descricao,
        observacoes: cardapioFormData.observacoes || null,
        criado_por: user.id
      }, {
        onConflict: "data,tipo_refeicao"
      });
      if (error) throw error;
      toast({
        title: "Sucesso",
        description: "Cardápio salvo com sucesso."
      });
      setCardapioDialogOpen(false);
      resetCardapioForm();
      fetchData();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Erro",
        description: "Erro ao salvar cardápio.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Funções de status removidas - dietas são automaticamente aceitas

  const handleToggleEntregue = async (dieta: SolicitacaoDieta) => {
    try {
      const { error } = await supabase
        .from("solicitacoes_dieta")
        .update({ entregue: !dieta.entregue })
        .eq("id", dieta.id);
      if (error) throw error;
      toast({
        title: "Sucesso",
        description: dieta.entregue ? "Dieta marcada como não entregue." : "Dieta marcada como entregue.",
      });
      fetchData();
    } catch (error) {
      console.error("Erro ao atualizar entrega:", error);
      toast({ title: "Erro", description: "Não foi possível atualizar.", variant: "destructive" });
    }
  };

  const resetForm = () => {
    setFormData({
      paciente_nome: "",
      paciente_data_nascimento: "",
      quarto_leito: "",
      tem_acompanhante: false,
      tipo_dieta: "",
      restricoes_alimentares: "",
      horarios_refeicoes: ["cafe", "almoco", "lanche", "jantar"],
      observacoes: "",
      is_dieta_extra: false,
      observacao_dieta_extra: ""
    });
  };
  const resetCardapioForm = () => {
    setCardapioFormData({
      data: format(new Date(), "yyyy-MM-dd"),
      tipo_refeicao: "",
      descricao: "",
      observacoes: ""
    });
  };
  const getCardapioForDay = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return cardapios.filter(c => c.data === dateStr);
  };
  const weekDays = eachDayOfInterval({
    start: startOfWeek(new Date(), {
      weekStartsOn: 1
    }),
    end: endOfWeek(new Date(), {
      weekStartsOn: 1
    })
  });

  // Export functions
  const exportRegistroGeralExcel = () => {
    const data = registrosGerais.map(r => ({
      "Tipo": r.tipo === "dieta" ? "Dieta" : "Refeição",
      "Nome": r.nome,
      "Descrição": r.descricao,
      "Data": format(new Date(r.data), "dd/MM/yyyy"),
      "Hora": r.hora ? r.hora.substring(0, 5) : "-",
      "Detalhes": r.detalhes,
      "Status": r.status || "Registrado"
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Registro Geral");
    XLSX.writeFile(wb, `registro_geral_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`);
    toast({
      title: "Sucesso",
      description: "Arquivo Excel exportado!"
    });
  };
  const exportRegistroGeralPDF = async () => {
    const { createStandardPdf, savePdfWithFooter } = await import('@/lib/export-utils');
    const { doc, logoImg } = await createStandardPdf('Registro Geral - Restaurante');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Período: ${format(new Date(registroGeralDataInicio), "dd/MM/yyyy")} a ${format(new Date(registroGeralDataFim), "dd/MM/yyyy")}`, 14, 32);
    autoTable(doc, {
      head: [["Tipo", "Nome", "Descrição", "Data", "Status"]],
      body: registrosGerais.map(r => [r.tipo === "dieta" ? "Dieta" : "Refeição", r.nome, r.descricao.substring(0, 30) + (r.descricao.length > 30 ? "..." : ""), format(new Date(r.data), "dd/MM/yyyy"), r.status || "Registrado"]),
      startY: 38,
      styles: { fontSize: 8 },
      margin: { bottom: 28 },
    });
    savePdfWithFooter(doc, 'Registro Geral - Restaurante', `registro_geral_${format(new Date(), "yyyyMMdd_HHmm")}`, logoImg);
    toast({ title: "Sucesso", description: "Arquivo PDF exportado!" });
  };
  const exportSolicitacoesExcel = () => {
    const data = todasSolicitacoes.map(s => ({
      "Paciente": s.paciente_nome || "N/A",
      "Quarto/Leito": s.quarto_leito || "N/A",
      "Tipo de Dieta": tipoDietaLabels[s.tipo_dieta] || s.tipo_dieta,
      "Data Início": format(new Date(s.data_inicio), "dd/MM/yyyy"),
      "Data Fim": s.data_fim ? format(new Date(s.data_fim), "dd/MM/yyyy") : "-",
      "Solicitante": s.solicitante_nome,
      "Status": s.status.charAt(0).toUpperCase() + s.status.slice(1),
      "Restrições": s.restricoes_alimentares || "-",
      "Observações": s.observacoes || "-"
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Solicitações");
    XLSX.writeFile(wb, `solicitacoes_dieta_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`);
    toast({
      title: "Sucesso",
      description: "Arquivo Excel exportado!"
    });
  };
  const exportSolicitacoesPDF = async () => {
    const { createStandardPdf, savePdfWithFooter } = await import('@/lib/export-utils');
    const { doc, logoImg } = await createStandardPdf('Solicitações de Dieta para Pacientes');
    autoTable(doc, {
      head: [["Paciente", "Quarto", "Dieta", "Período", "Status"]],
      body: todasSolicitacoes.map(s => [s.paciente_nome || "N/A", s.quarto_leito || "N/A", tipoDietaLabels[s.tipo_dieta] || s.tipo_dieta, format(new Date(s.data_inicio), "dd/MM") + (s.data_fim ? ` - ${format(new Date(s.data_fim), "dd/MM")}` : ""), s.status.charAt(0).toUpperCase() + s.status.slice(1)]),
      startY: 32,
      styles: { fontSize: 8 },
      margin: { top: 32, bottom: 28 },
    });
    savePdfWithFooter(doc, 'Solicitações de Dieta para Pacientes', `solicitacoes_dieta_${format(new Date(), "yyyyMMdd_HHmm")}`, logoImg);
    toast({ title: "Sucesso", description: "Arquivo PDF exportado!" });
  };
  const exportCardapiosExcel = () => {
    const data = cardapios.map(c => ({
      "Data": format(new Date(c.data + 'T12:00:00'), "dd/MM/yyyy"),
      "Refeição": tipoRefeicaoLabels[c.tipo_refeicao]?.label || c.tipo_refeicao,
      "Descrição": c.descricao,
      "Observações": c.observacoes || "-"
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cardápios");
    XLSX.writeFile(wb, `cardapios_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`);
    toast({
      title: "Sucesso",
      description: "Arquivo Excel exportado!"
    });
  };
  const exportCardapiosPDF = async () => {
    const { createStandardPdf, savePdfWithFooter } = await import('@/lib/export-utils');
    const { doc, logoImg } = await createStandardPdf('Cardápios do Restaurante');
    autoTable(doc, {
      head: [["Data", "Refeição", "Descrição", "Observações"]],
      body: cardapios.map(c => [format(new Date(c.data + 'T12:00:00'), "dd/MM/yyyy"), tipoRefeicaoLabels[c.tipo_refeicao]?.label || c.tipo_refeicao, c.descricao.substring(0, 50) + (c.descricao.length > 50 ? "..." : ""), c.observacoes || "-"]),
      startY: 32,
      styles: { fontSize: 8 },
      margin: { bottom: 28 },
    });
    savePdfWithFooter(doc, 'Cardápios do Restaurante', `cardapios_${format(new Date(), "yyyyMMdd_HHmm")}`, logoImg);
    toast({ title: "Sucesso", description: "Arquivo PDF exportado!" });
  };

  // Dashboard functions
  const fetchDashboardData = async () => {
    if (!canManage) return;
    setIsLoadingDashboard(true);
    try {
      const {
        data,
        error
      } = await supabase.from("solicitacoes_dieta").select("*").gte("created_at", dashboardDataInicio).lte("created_at", dashboardDataFim + "T23:59:59").order("created_at", {
        ascending: false
      });
      if (error) throw error;
      setDashboardSolicitacoes(data || []);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados do dashboard.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingDashboard(false);
    }
  };
  useEffect(() => {
    if (canManage && activeTab === "dashboard") {
      fetchDashboardData();
    }
  }, [activeTab, dashboardDataInicio, dashboardDataFim, canManage]);
  const dashboardStats = {
    total: dashboardSolicitacoes.length
    // Status removidos - dietas são automaticamente aceitas
  };
  const exportToExcel = () => {
    const dataToExport = dashboardSolicitacoes.map(s => ({
      "Solicitante": s.solicitante_nome,
      "Paciente": s.paciente_nome || "-",
      "Data Nascimento": s.paciente_data_nascimento ? format(new Date(s.paciente_data_nascimento), "dd/MM/yyyy") : "-",
      "Quarto/Leito": s.quarto_leito || "-",
      "Tem Acompanhante": s.tem_acompanhante ? "Sim" : "Não",
      "Tipo de Dieta": tipoDietaLabels[s.tipo_dieta] || s.tipo_dieta,
      "Restrições Alimentares": s.restricoes_alimentares || "-",
      "Horários": s.horarios_refeicoes?.map(h => horariosRefeicaoOptions.find(o => o.value === h)?.label).join(", ") || "-",
      "Solicitado em": format(new Date(s.created_at), "dd/MM/yyyy HH:mm"),
      "Observações": s.observacoes || "-"
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Solicitações de Dieta");
    const fileName = `dietas_${format(new Date(dashboardDataInicio), "ddMMyyyy")}_${format(new Date(dashboardDataFim), "ddMMyyyy")}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast({
      title: "Sucesso",
      description: "Arquivo Excel exportado com sucesso."
    });
  };
  const exportToPDF = async () => {
    const { createStandardPdf, savePdfWithFooter } = await import('@/lib/export-utils');
    const { doc, logoImg } = await createStandardPdf('Relatório de Solicitações de Dieta', 'landscape');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Período: ${format(new Date(dashboardDataInicio), "dd/MM/yyyy")} a ${format(new Date(dashboardDataFim), "dd/MM/yyyy")}`, 14, 32);
    doc.text(`Total de Dietas: ${dashboardStats.total}`, 14, 38);

    const tableData = dashboardSolicitacoes.map(s => [s.paciente_nome || "-", s.quarto_leito || "-", tipoDietaLabels[s.tipo_dieta] || s.tipo_dieta, s.restricoes_alimentares || "-", s.solicitante_nome]);
    autoTable(doc, {
      startY: 44,
      head: [["Paciente", "Quarto/Leito", "Tipo de Dieta", "Restrições", "Solicitante"]],
      body: tableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
      margin: { top: 32, bottom: 28 },
    });
    const fileName = `dietas_${format(new Date(dashboardDataInicio), "ddMMyyyy")}_${format(new Date(dashboardDataFim), "ddMMyyyy")}`;
    savePdfWithFooter(doc, 'Relatório de Solicitações de Dieta', fileName, logoImg);
    toast({ title: "Sucesso", description: "Arquivo PDF exportado com sucesso." });
  };

  // Filtrar minhas solicitações pelo período selecionado
  const minhasSolicitacoesFiltradas = minhasSolicitacoes.filter(s => {
    const hoje = new Date();
    const dataCriacao = new Date(s.created_at);
    switch (minhasDietasFiltro) {
      case "dia":
        return format(dataCriacao, "yyyy-MM-dd") === format(hoje, "yyyy-MM-dd");
      case "semana":
        const inicioSemana = startOfWeek(hoje, {
          weekStartsOn: 0
        });
        const fimSemana = endOfWeek(hoje, {
          weekStartsOn: 0
        });
        return dataCriacao >= inicioSemana && dataCriacao <= fimSemana;
      case "mes":
        return dataCriacao >= startOfMonth(hoje) && dataCriacao <= endOfMonth(hoje);
      default:
        return true;
    }
  });

  // Exportar minhas solicitações para Excel
  const exportMinhasDietasToExcel = () => {
    const dataToExport = minhasSolicitacoesFiltradas.map(s => ({
      "Paciente": s.paciente_nome || "-",
      "Quarto/Leito": s.quarto_leito || "-",
      "Tipo de Dieta": tipoDietaLabels[s.tipo_dieta] || s.tipo_dieta,
      "Tem Acompanhante": s.tem_acompanhante ? "Sim" : "Não",
      "Restrições Alimentares": s.restricoes_alimentares || "-",
      "Horários": s.horarios_refeicoes?.map(h => horariosRefeicaoOptions.find(o => o.value === h)?.label).join(", ") || "Todos",
      "Solicitado em": format(new Date(s.created_at), "dd/MM/yyyy HH:mm"),
      
      "Observações": s.observacoes || "-"
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Minhas Dietas");
    const fileName = `minhas_dietas_${format(new Date(), "ddMMyyyy")}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast({
      title: "Sucesso",
      description: "Arquivo Excel exportado com sucesso."
    });
  };

  // Exportar minhas solicitações para PDF
  const exportMinhasDietasToPDF = async () => {
    const { createStandardPdf, savePdfWithFooter } = await import('@/lib/export-utils');
    const { doc, logoImg } = await createStandardPdf('Minhas Solicitações de Dieta', 'landscape');
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total: ${minhasSolicitacoesFiltradas.length} dietas`, 14, 32);
    
    const tableData = minhasSolicitacoesFiltradas.map(s => [
      s.paciente_nome || "-",
      s.quarto_leito || "-",
      tipoDietaLabels[s.tipo_dieta] || s.tipo_dieta,
      s.descricao_especifica || "-",
      s.restricoes_alimentares || "-",
      s.tem_acompanhante ? "Sim" : "Não",
      s.observacoes || "-",
      format(new Date(s.created_at), "dd/MM/yyyy"),
    ]);
    autoTable(doc, {
      startY: 38,
      head: [["Paciente", "Quarto/Leito", "Tipo", "Descrição", "Restrições", "Acomp.", "Observações", "Solicitado em"]],
      body: tableData,
      styles: { fontSize: 7 },
      headStyles: { fillColor: [59, 130, 246] },
      margin: { top: 32, bottom: 28 },
    });
    savePdfWithFooter(doc, 'Minhas Solicitações de Dieta', `minhas_dietas_${format(new Date(), "ddMMyyyy")}`, logoImg);
    toast({ title: "Sucesso", description: "Arquivo PDF exportado com sucesso." });
  };

  // Mostrar loading enquanto verifica roles
  if (isLoadingRole) {
    return <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>;
  }
  return <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <UtensilsCrossed className="h-7 w-7" />
            Restaurante
          </h2>
          <p className="text-muted-foreground">Cardápio e solicitações de dieta</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="cardapio" className="flex items-center gap-2">
            <UtensilsCrossed className="h-4 w-4" />
            Cardápio
          </TabsTrigger>
          <TabsTrigger value="solicitar" className="flex items-center gap-2">
            <Salad className="h-4 w-4" />
            Dietas
          </TabsTrigger>
        {canManage && <>
              <TabsTrigger value="dashboard" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Dashboard Dietas
              </TabsTrigger>
              <TabsTrigger value="gerenciar" className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                Gerenciar
              </TabsTrigger>
            </>}
        </TabsList>

        {/* Cardápio Tab */}
        <TabsContent value="cardapio" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Visualizar Cardápio</CardTitle>
                  <CardDescription>Confira o cardápio do dia ou da semana</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant={cardapioView === "dia" ? "default" : "outline"} size="sm" onClick={() => setCardapioView("dia")}>
                    <Calendar className="h-4 w-4 mr-2" />
                    Hoje
                  </Button>
                  <Button variant={cardapioView === "semana" ? "default" : "outline"} size="sm" onClick={() => setCardapioView("semana")}>
                    <CalendarDays className="h-4 w-4 mr-2" />
                    Semana
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div> : cardapioView === "dia" ? <div className="space-y-4">
                  <h3 className="text-lg font-semibold">
                    {format(new Date(), "EEEE, dd 'de' MMMM", {
                  locale: ptBR
                })}
                  </h3>
                  {getCardapioForDay(new Date()).length === 0 ? <div className="text-center py-8 text-muted-foreground">
                      <UtensilsCrossed className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhum cardápio cadastrado para hoje.</p>
                    </div> : <div className="grid gap-4 md:grid-cols-2">
                      {["cafe", "almoco", "lanche", "jantar"].map(tipo => {
                  const cardapio = getCardapioForDay(new Date()).find(c => c.tipo_refeicao === tipo);
                  if (!cardapio) return null;
                  return <Card key={tipo} className="border-l-4 border-l-primary">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-base flex items-center gap-2">
                                {tipoRefeicaoLabels[tipo]?.icon}
                                {tipoRefeicaoLabels[tipo]?.label}
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm">{cardapio.descricao}</p>
                              {cardapio.observacoes && <p className="text-xs text-muted-foreground mt-2">
                                  {cardapio.observacoes}
                                </p>}
                            </CardContent>
                          </Card>;
                })}
                    </div>}
                </div> : <div className="space-y-6">
                  {weekDays.map(day => {
                const dayCardapios = getCardapioForDay(day);
                return <div key={day.toISOString()} className={`p-4 rounded-lg border ${isToday(day) ? "bg-primary/5 border-primary" : ""}`}>
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          {format(day, "EEEE, dd/MM", {
                      locale: ptBR
                    })}
                          {isToday(day) && <Badge>Hoje</Badge>}
                        </h4>
                        {dayCardapios.length === 0 ? <p className="text-sm text-muted-foreground">Sem cardápio cadastrado</p> : <div className="grid gap-2 md:grid-cols-4">
                            {["cafe", "almoco", "lanche", "jantar"].map(tipo => {
                      const cardapio = dayCardapios.find(c => c.tipo_refeicao === tipo);
                      if (!cardapio) return null;
                      return <div key={tipo} className="p-2 bg-secondary/50 rounded text-sm">
                                  <span className="font-medium flex items-center gap-1">
                                    {tipoRefeicaoLabels[tipo]?.icon}
                                    {tipoRefeicaoLabels[tipo]?.label}
                                  </span>
                                  <p className="text-muted-foreground truncate">{cardapio.descricao}</p>
                                </div>;
                    })}
                          </div>}
                      </div>;
              })}
                </div>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dietas Tab */}
        <TabsContent value="solicitar" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Solicitações de Dieta</CardTitle>
                    <CardDescription>Solicite uma dieta especial</CardDescription>
                  </div>
                  <Button onClick={() => setDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Solicitação
                  </Button>
                </div>
                
                {/* Filtros e Exportação */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <Button variant={minhasDietasFiltro === "todos" ? "default" : "outline"} size="sm" onClick={() => setMinhasDietasFiltro("todos")}>
                      Todos
                    </Button>
                    <Button variant={minhasDietasFiltro === "dia" ? "default" : "outline"} size="sm" onClick={() => setMinhasDietasFiltro("dia")}>
                      Hoje
                    </Button>
                    <Button variant={minhasDietasFiltro === "semana" ? "default" : "outline"} size="sm" onClick={() => setMinhasDietasFiltro("semana")}>
                      Semana
                    </Button>
                    <Button variant={minhasDietasFiltro === "mes" ? "default" : "outline"} size="sm" onClick={() => setMinhasDietasFiltro("mes")}>
                      Mês
                    </Button>
                  </div>
                  <ExportDropdown onExportExcel={exportMinhasDietasToExcel} onExportPDF={exportMinhasDietasToPDF} disabled={minhasSolicitacoesFiltradas.length === 0} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div> : minhasSolicitacoesFiltradas.length === 0 ? <div className="text-center py-8 text-muted-foreground">
                  <Salad className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{minhasSolicitacoes.length === 0 ? "Você ainda não fez nenhuma solicitação de dieta." : "Nenhuma dieta encontrada para o período selecionado."}
                  </p>
                </div> : <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Paciente</TableHead>
                      <TableHead>Tipo de Dieta</TableHead>
                      <TableHead>Horários</TableHead>
                      <TableHead>Acompanhante</TableHead>
                      <TableHead>Solicitado em</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {minhasSolicitacoesFiltradas.map(s => <TableRow key={s.id}>
                        <TableCell>
                          <div>
                            <span className="font-medium">{s.paciente_nome || "N/A"}</span>
                            {s.quarto_leito && <p className="text-xs text-muted-foreground">{s.quarto_leito}</p>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <span className="font-medium">{tipoDietaLabels[s.tipo_dieta] || s.tipo_dieta}</span>
                            {s.descricao_especifica && <p className="text-xs text-muted-foreground">{s.descricao_especifica}</p>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {s.horarios_refeicoes && s.horarios_refeicoes.length > 0 ? s.horarios_refeicoes.map(h => {
                        const option = horariosRefeicaoOptions.find(o => o.value === h);
                        return option ? option.label : h;
                      }).join(", ") : "Todos"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={s.tem_acompanhante ? "default" : "outline"}>
                            {s.tem_acompanhante ? "Sim" : "Não"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(s.created_at), "dd/MM/yyyy HH:mm")}
                        </TableCell>
                      </TableRow>)}
                  </TableBody>
                </Table>}
            </CardContent>
          </Card>
        </TabsContent>


        {/* Dashboard Tab (Restaurante only) */}
        {canManage && <TabsContent value="dashboard" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Dashboard de Dietas
                    </CardTitle>
                    <CardDescription>Visualize estatísticas e exporte relatórios</CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-muted-foreground" />
                      <Input type="date" value={dashboardDataInicio} onChange={e => setDashboardDataInicio(e.target.value)} className="w-[140px]" />
                      <span className="text-muted-foreground">até</span>
                      <Input type="date" value={dashboardDataFim} onChange={e => setDashboardDataFim(e.target.value)} className="w-[140px]" />
                    </div>
                    <ExportDropdown onExportExcel={exportToExcel} onExportPDF={exportToPDF} />
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* KPI Cards */}
            {isLoadingDashboard ? <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div> : <>
                <div className="grid gap-4 md:grid-cols-1">
                  <Card className="border-l-4 border-l-primary">
                    <CardHeader className="pb-2">
                      <CardDescription className="flex items-center gap-1">
                        <Salad className="h-4 w-4 text-primary" />
                        Total de Dietas
                      </CardDescription>
                      <CardTitle className="text-3xl text-primary">{dashboardStats.total}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground">No período selecionado</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Table with all requests */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Detalhamento das Dietas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {dashboardSolicitacoes.length === 0 ? <div className="text-center py-8 text-muted-foreground">
                        <Salad className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Nenhuma dieta encontrada no período.</p>
                      </div> : <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Paciente</TableHead>
                            <TableHead>Quarto/Leito</TableHead>
                            <TableHead>Tipo de Dieta</TableHead>
                            <TableHead>Solicitante</TableHead>
                            <TableHead>Solicitado em</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dashboardSolicitacoes.map(s => <TableRow key={s.id}>
                              <TableCell>
                                <div>
                                  <span className="font-medium">{s.paciente_nome || "N/A"}</span>
                                  {s.tem_acompanhante && <p className="text-xs text-muted-foreground">Com acompanhante</p>}
                                </div>
                              </TableCell>
                              <TableCell>{s.quarto_leito || "N/A"}</TableCell>
                              <TableCell>
                                <div>
                                  <span>{tipoDietaLabels[s.tipo_dieta] || s.tipo_dieta}</span>
                                  {s.restricoes_alimentares && <p className="text-xs text-muted-foreground">{s.restricoes_alimentares}</p>}
                                </div>
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {s.solicitante_nome}
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {format(new Date(s.created_at), "dd/MM/yyyy HH:mm")}
                              </TableCell>
                            </TableRow>)}
                        </TableBody>
                      </Table>}
                  </CardContent>
                </Card>
              </>}
          </TabsContent>}

        {/* Gerenciar Tab (Admin/Restaurante only) */}
        {canManage && <TabsContent value="gerenciar" className="space-y-4">
            <Tabs defaultValue="quantitativo" className="w-full">
              <TabsList className="flex flex-wrap h-auto gap-1 p-1 w-full">
                <TabsTrigger value="quantitativo" className="flex items-center gap-2 flex-1 min-w-fit">
                  <TrendingUp className="h-4 w-4" />
                  <span className="hidden sm:inline">Quantitativo Diário</span>
                  <span className="sm:hidden">Quant.</span>
                </TabsTrigger>
                <TabsTrigger value="geral" className="flex items-center gap-2 flex-1 min-w-fit">
                  <ClipboardList className="h-4 w-4" />
                  <span className="hidden sm:inline">Registro Geral</span>
                  <span className="sm:hidden">Geral</span>
                </TabsTrigger>
                <TabsTrigger value="solicitacoes" className="flex items-center gap-2 flex-1 min-w-fit">
                  <Salad className="h-4 w-4" />
                  <span className="hidden sm:inline">Solicitações de Dieta</span>
                  <span className="sm:hidden">Dietas</span>
                </TabsTrigger>
                <TabsTrigger value="totem" className="flex items-center gap-2 flex-1 min-w-fit">
                  <UtensilsCrossed className="h-4 w-4" />
                  <span className="hidden sm:inline">Registros do Totem</span>
                  <span className="sm:hidden">Totem</span>
                </TabsTrigger>
                <TabsTrigger value="cardapios" className="flex items-center gap-2 flex-1 min-w-fit">
                  <Calendar className="h-4 w-4" />
                  <span className="hidden sm:inline">Cardápios</span>
                  <span className="sm:hidden">Cardápio</span>
                </TabsTrigger>
                <TabsTrigger value="colaboradores" className="flex items-center gap-2 flex-1 min-w-fit">
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">Colaboradores UPA </span>
                  <span className="sm:hidden">Colab.</span>
                </TabsTrigger>
                {isAdmin && (
                  <TabsTrigger value="duplicidades" className="flex items-center gap-2 flex-1 min-w-fit">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="hidden sm:inline">Duplicidades</span>
                    <span className="sm:hidden">Duplic.</span>
                  </TabsTrigger>
                )}
              </TabsList>

              {/* Sub-tab: Quantitativo Diário */}
              <TabsContent value="quantitativo" className="mt-4">
                <RelatorioQuantitativoRefeicoes isAdmin={isAdmin} />
              </TabsContent>

              {/* Sub-tab: Registro Geral */}
              <TabsContent value="geral" className="mt-4">
                <Card>
                  <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <ClipboardList className="h-5 w-5" />
                          Registro Geral
                        </CardTitle>
                        <CardDescription>
                          Visualização unificada de solicitações de dieta e registros do totem
                        </CardDescription>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Input type="date" value={registroGeralDataInicio} onChange={e => setRegistroGeralDataInicio(e.target.value)} className="w-[140px]" />
                        <span className="text-muted-foreground">até</span>
                        <Input type="date" value={registroGeralDataFim} onChange={e => setRegistroGeralDataFim(e.target.value)} className="w-[140px]" />
                        <Select value={registroGeralFiltroTipo} onValueChange={(value: "todos" | "dieta" | "refeicao") => setRegistroGeralFiltroTipo(value)}>
                          <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Filtrar tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todos">Todos</SelectItem>
                            <SelectItem value="dieta">Dietas</SelectItem>
                            <SelectItem value="refeicao">Refeições</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => exportRegistroGeralExcel()} disabled={registrosGerais.length === 0}>
                            <FileSpreadsheet className="h-4 w-4 mr-1" />
                            Excel
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => exportRegistroGeralPDF()} disabled={registrosGerais.length === 0}>
                            <FileDown className="h-4 w-4 mr-1" />
                            PDF
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* KPIs */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="p-4 bg-muted/30 rounded-lg">
                        <p className="text-sm text-muted-foreground">Total de Registros</p>
                        <p className="text-2xl font-bold">{registrosGerais.length}</p>
                      </div>
                      <div className="p-4 bg-orange-50 rounded-lg border-l-4 border-orange-500">
                        <p className="text-sm text-muted-foreground">Dietas</p>
                        <p className="text-2xl font-bold text-orange-600">
                          {registrosGerais.filter(r => r.tipo === "dieta").length}
                        </p>
                      </div>
                      <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                        <p className="text-sm text-muted-foreground">Refeições Totem</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {registrosGerais.filter(r => r.tipo === "refeicao").length}
                        </p>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                        <p className="text-sm text-muted-foreground">Dietas Aprovadas</p>
                        <p className="text-2xl font-bold text-green-600">
                          {registrosGerais.filter(r => r.tipo === "dieta" && r.status === "aprovada").length}
                        </p>
                      </div>
                    </div>

                    {registrosGerais.length === 0 ? <div className="text-center py-8 text-muted-foreground">
                        <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Nenhum registro encontrado no período.</p>
                      </div> : <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Origem</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Nome</TableHead>
                            <TableHead>Descrição</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead>Detalhes</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {registrosGerais.map(r => <TableRow key={`${r.tipo}-${r.id}`}>
                              <TableCell>
                                <Badge variant="outline" className={r.tipo === "dieta" ? "border-orange-500 text-orange-600 bg-orange-50" : "border-blue-500 text-blue-600 bg-blue-50"}>
                                  {r.tipo === "dieta" ? "Dieta" : "Totem"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant={r.tipo === "dieta" ? "default" : "secondary"}>
                                  {r.tipo === "dieta" ? "Dieta" : "Refeição"}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-medium">{r.nome}</TableCell>
                              <TableCell>{r.descricao}</TableCell>
                              <TableCell>
                                {format(new Date(r.data), "dd/MM/yyyy")}
                                {r.hora && <span className="text-muted-foreground ml-1">às {r.hora.substring(0, 5)}</span>}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">{r.detalhes}</TableCell>
                            </TableRow>)}
                        </TableBody>
                      </Table>}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Sub-tab: Solicitações de Dieta */}
              <TabsContent value="solicitacoes" className="mt-4">
                <Card>
                  <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Salad className="h-5 w-5" />
                          Solicitações de Dieta para Pacientes
                        </CardTitle>
                        <CardDescription>
                          Gerencie as solicitações de dietas especiais para pacientes
                        </CardDescription>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => exportSolicitacoesExcel()} disabled={todasSolicitacoes.length === 0}>
                          <FileSpreadsheet className="h-4 w-4 mr-1" />
                          Excel
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => exportSolicitacoesPDF()} disabled={todasSolicitacoes.length === 0}>
                          <FileDown className="h-4 w-4 mr-1" />
                          PDF
                        </Button>
                      </div>
                    </div>

                    {/* Filtros e Pesquisa */}
                    <div className="flex flex-col md:flex-row gap-4 mt-4">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Pesquisar por paciente, quarto, tipo de dieta..." value={solicitacoesPesquisa} onChange={e => setSolicitacoesPesquisa(e.target.value)} className="pl-9" />
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant={solicitacoesPeriodo === "todos" ? "default" : "outline"} onClick={() => setSolicitacoesPeriodo("todos")}>
                          Todos
                        </Button>
                        <Button size="sm" variant={solicitacoesPeriodo === "dia" ? "default" : "outline"} onClick={() => setSolicitacoesPeriodo("dia")}>
                          Hoje
                        </Button>
                        <Button size="sm" variant={solicitacoesPeriodo === "semana" ? "default" : "outline"} onClick={() => setSolicitacoesPeriodo("semana")}>
                          Semana
                        </Button>
                        <Button size="sm" variant={solicitacoesPeriodo === "mes" ? "default" : "outline"} onClick={() => setSolicitacoesPeriodo("mes")}>
                          Mês
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                  // Filtrar por período
                  let solicitacoesFiltradas = todasSolicitacoes.filter(s => {
                    const dataCriacao = new Date(s.created_at);
                    const hoje = new Date();
                    hoje.setHours(0, 0, 0, 0);
                    if (solicitacoesPeriodo === "dia") {
                      return format(dataCriacao, "yyyy-MM-dd") === format(hoje, "yyyy-MM-dd");
                    } else if (solicitacoesPeriodo === "semana") {
                      const inicioSemana = startOfWeek(hoje, {
                        weekStartsOn: 0
                      });
                      const fimSemana = endOfWeek(hoje, {
                        weekStartsOn: 0
                      });
                      return dataCriacao >= inicioSemana && dataCriacao <= fimSemana;
                    } else if (solicitacoesPeriodo === "mes") {
                      const inicioMes = startOfMonth(hoje);
                      const fimMes = endOfMonth(hoje);
                      return dataCriacao >= inicioMes && dataCriacao <= fimMes;
                    }
                    return true;
                  });

                  // Filtrar por pesquisa
                  if (solicitacoesPesquisa.trim()) {
                    const termo = solicitacoesPesquisa.toLowerCase();
                    solicitacoesFiltradas = solicitacoesFiltradas.filter(s => s.paciente_nome && s.paciente_nome.toLowerCase().includes(termo) || s.quarto_leito && s.quarto_leito.toLowerCase().includes(termo) || s.tipo_dieta && s.tipo_dieta.toLowerCase().includes(termo) || tipoDietaLabels[s.tipo_dieta] && tipoDietaLabels[s.tipo_dieta].toLowerCase().includes(termo) || s.solicitante_nome && s.solicitante_nome.toLowerCase().includes(termo));
                  }
                  if (solicitacoesFiltradas.length === 0) {
                    return <div className="text-center py-8 text-muted-foreground">
                            <Salad className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>Nenhuma solicitação encontrada.</p>
                          </div>;
                  }
                  return <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Paciente</TableHead>
                                <TableHead>Tipo de Dieta</TableHead>
                                <TableHead>Horários</TableHead>
                                <TableHead className="text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <Users className="h-4 w-4" />
                                    Acomp.
                                  </div>
                                </TableHead>
                                <TableHead>Quarto/Leito</TableHead>
                                <TableHead>Solicitante</TableHead>
                                <TableHead>Solicitado em</TableHead>
                                
                                {isAdmin && <TableHead className="w-[100px]">Ações</TableHead>}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {solicitacoesFiltradas.map(s => <TableRow key={s.id}>
                                  <TableCell>
                                    <div>
                                      <span className="font-medium">{s.paciente_nome || "N/A"}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div>
                                      <span>{tipoDietaLabels[s.tipo_dieta] || s.tipo_dieta}</span>
                                      {s.restricoes_alimentares && <p className="text-xs text-orange-600 mt-1">
                                          {s.restricoes_alimentares}
                                        </p>}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="text-sm">
                                      {s.horarios_refeicoes && s.horarios_refeicoes.length > 0 ? s.horarios_refeicoes.map(h => {
                                const option = horariosRefeicaoOptions.find(o => o.value === h);
                                return option ? option.label : h;
                              }).join(", ") : "Todos"}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Badge variant={s.tem_acompanhante ? "default" : "outline"}>
                                      {s.tem_acompanhante ? "Sim" : "Não"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>{s.quarto_leito || "N/A"}</TableCell>
                                  <TableCell>
                                    <span className="text-sm text-muted-foreground">{s.solicitante_nome}</span>
                                  </TableCell>
                                  <TableCell className="text-muted-foreground text-sm">
                                    {format(new Date(s.created_at), "dd/MM/yyyy HH:mm")}
                                  </TableCell>
                                  {isAdmin && (
                                    <TableCell>
                                      <div className="flex gap-1">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleEditDietaClick(s)}
                                          title="Editar"
                                        >
                                          <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleDeleteDietaClick(s)}
                                          title="Excluir"
                                          className="text-destructive hover:text-destructive"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  )}
                                </TableRow>)}
                            </TableBody>
                          </Table>
                        </div>;
                })()}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Sub-tab: Registros do Totem */}
              <TabsContent value="totem" className="mt-4">
                <RegistrosRefeicoes isAdmin={isAdmin} />
              </TabsContent>

              {/* Sub-tab: Cardápios */}
              <TabsContent value="cardapios" className="mt-4">
                <Card>
                  <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Calendar className="h-5 w-5" />
                          Gerenciar Cardápios
                        </CardTitle>
                        <CardDescription>Cadastre e gerencie os cardápios do restaurante</CardDescription>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => exportCardapiosExcel()} disabled={cardapios.length === 0}>
                          <FileSpreadsheet className="h-4 w-4 mr-1" />
                          Excel
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => exportCardapiosPDF()} disabled={cardapios.length === 0}>
                          <FileDown className="h-4 w-4 mr-1" />
                          PDF
                        </Button>
                        <Button size="sm" onClick={() => setCardapioDialogOpen(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Novo Cardápio
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {cardapios.length === 0 ? <div className="text-center py-8 text-muted-foreground">
                        <UtensilsCrossed className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Nenhum cardápio cadastrado.</p>
                      </div> : <div className="space-y-2">
                        {cardapios.map(c => <div key={c.id} className="p-3 border rounded-lg flex justify-between items-center hover:bg-muted/30 transition-colors">
                            <div>
                              <span className="font-medium">{format(new Date(c.data + 'T12:00:00'), "dd/MM/yyyy")}</span>
                              <span className="text-muted-foreground mx-2">-</span>
                              <span className="inline-flex items-center gap-1">
                                {tipoRefeicaoLabels[c.tipo_refeicao]?.icon}
                                {tipoRefeicaoLabels[c.tipo_refeicao]?.label}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground truncate max-w-xs">{c.descricao}</p>
                          </div>)}
                      </div>}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Sub-tab: Colaboradores */}
              <TabsContent value="colaboradores" className="mt-4">
                <ColaboradoresManager />
              </TabsContent>

              {/* Sub-tab: Tentativas de Duplicidade (apenas Admin) */}
              {isAdmin && (
                <TabsContent value="duplicidades" className="mt-4">
                  <TentativasDuplicidade />
                </TabsContent>
              )}
            </Tabs>
          </TabsContent>}
      </Tabs>

      {/* Dialog para Solicitar Dieta */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Solicitar Dieta para Paciente</DialogTitle>
            <DialogDescription>
              Preencha os dados do paciente para solicitar uma dieta especial.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {/* Dados do Paciente */}
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <h4 className="font-medium text-sm">Dados do Paciente</h4>
              <div className="space-y-2">
                <Label>Nome Completo do Paciente *</Label>
                <Input value={formData.paciente_nome} onChange={e => setFormData({
                ...formData,
                paciente_nome: e.target.value
              })} placeholder="Nome completo do paciente" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data de Nascimento</Label>
                  <Input type="date" value={formData.paciente_data_nascimento} onChange={e => setFormData({
                  ...formData,
                  paciente_data_nascimento: e.target.value
                })} />
                </div>
                <div className="space-y-2">
                  <Label>Quarto e Leito *</Label>
                  <Input value={formData.quarto_leito} onChange={e => setFormData({
                  ...formData,
                  quarto_leito: e.target.value
                })} placeholder="Ex: Quarto 101 - Leito A" />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="tem_acompanhante" checked={formData.tem_acompanhante} onChange={e => setFormData({
                ...formData,
                tem_acompanhante: e.target.checked
              })} className="h-4 w-4 rounded border-gray-300" />
                <Label htmlFor="tem_acompanhante">O paciente tem acompanhante?</Label>
              </div>
            </div>

            {/* Tipo de Dieta */}
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <h4 className="font-medium text-sm">Tipo de Dieta</h4>
              <div className="space-y-2">
                <Label>Selecione o Tipo de Dieta *</Label>
                <Select value={formData.tipo_dieta} onValueChange={value => setFormData({
                ...formData,
                tipo_dieta: value
              })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo de dieta" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(tipoDietaLabels).map(([value, label]) => <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Restrições Alimentares</Label>
                <Textarea value={formData.restricoes_alimentares} onChange={e => setFormData({
                ...formData,
                restricoes_alimentares: e.target.value
              })} placeholder="Descreva as restrições alimentares do paciente (alergias, intolerâncias, etc.)" rows={2} />
              </div>
            </div>

            {/* Horários das Refeições */}
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <h4 className="font-medium text-sm">Horários das Refeições</h4>
              <div className="grid grid-cols-2 gap-2">
                {horariosRefeicaoOptions.map(horario => <div key={horario.value} className="flex items-center space-x-2">
                    <input type="checkbox" id={`horario_${horario.value}`} checked={formData.horarios_refeicoes.includes(horario.value)} onChange={e => {
                  if (e.target.checked) {
                    setFormData({
                      ...formData,
                      horarios_refeicoes: [...formData.horarios_refeicoes, horario.value]
                    });
                  } else {
                    setFormData({
                      ...formData,
                      horarios_refeicoes: formData.horarios_refeicoes.filter(h => h !== horario.value)
                    });
                  }
                }} className="h-4 w-4 rounded border-gray-300" />
                    <Label htmlFor={`horario_${horario.value}`}>{horario.label}</Label>
                  </div>)}
              </div>
            </div>

            {/* Dieta Extra */}
            <div className="space-y-3 p-4 border rounded-lg bg-amber-50/50 border-amber-200">
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="is_dieta_extra" checked={formData.is_dieta_extra} onChange={e => setFormData({
                ...formData,
                is_dieta_extra: e.target.checked
              })} className="h-4 w-4 rounded border-gray-300" />
                <Label htmlFor="is_dieta_extra" className="font-medium text-amber-800">
                  Dieta Extra (para possíveis internações ou outros casos)
                </Label>
              </div>
              {formData.is_dieta_extra && <div className="space-y-2">
                  <Label className="text-amber-700">Observação da Dieta Extra *</Label>
                  <Textarea value={formData.observacao_dieta_extra} onChange={e => setFormData({
                ...formData,
                observacao_dieta_extra: e.target.value
              })} placeholder="Descreva o motivo da dieta extra (ex: possível internação, acompanhante extra, visitante, etc.)" rows={2} className="border-amber-200 focus:border-amber-400" />
                </div>}
            </div>

            <div className="space-y-2">
              <Label>Observações Gerais</Label>
              <Textarea value={formData.observacoes} onChange={e => setFormData({
              ...formData,
              observacoes: e.target.value
            })} placeholder="Informações adicionais sobre a dieta ou o paciente" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmitSolicitacao} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enviar Solicitação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para Cadastrar Cardápio */}
      <Dialog open={cardapioDialogOpen} onOpenChange={setCardapioDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cadastrar Cardápio</DialogTitle>
            <DialogDescription>
              Adicione ou atualize o cardápio de uma refeição.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data *</Label>
                <Input type="date" value={cardapioFormData.data} onChange={e => setCardapioFormData({
                ...cardapioFormData,
                data: e.target.value
              })} />
              </div>
              <div className="space-y-2">
                <Label>Refeição *</Label>
                <Select value={cardapioFormData.tipo_refeicao} onValueChange={value => setCardapioFormData({
                ...cardapioFormData,
                tipo_refeicao: value
              })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(tipoRefeicaoLabels).map(([value, {
                    label
                  }]) => <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrição do Cardápio *</Label>
              <Textarea value={cardapioFormData.descricao} onChange={e => setCardapioFormData({
              ...cardapioFormData,
              descricao: e.target.value
            })} placeholder="Ex: Arroz, feijão, frango grelhado, salada..." rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Input value={cardapioFormData.observacoes} onChange={e => setCardapioFormData({
              ...cardapioFormData,
              observacoes: e.target.value
            })} placeholder="Informações adicionais" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCardapioDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmitCardapio} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar Cardápio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Edição de Dieta */}
      <Dialog open={editDietaDialogOpen} onOpenChange={setEditDietaDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Dieta</DialogTitle>
            <DialogDescription>Altere os dados da dieta.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label>Paciente</Label>
              <Input value={editDietaFormData.paciente_nome} onChange={e => setEditDietaFormData({...editDietaFormData, paciente_nome: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Quarto/Leito</Label>
              <Input value={editDietaFormData.quarto_leito} onChange={e => setEditDietaFormData({...editDietaFormData, quarto_leito: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Dieta</Label>
              <Select value={editDietaFormData.tipo_dieta} onValueChange={value => setEditDietaFormData({...editDietaFormData, tipo_dieta: value})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(tipoDietaLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <input type="checkbox" id="edit_tem_acompanhante" checked={editDietaFormData.tem_acompanhante} onChange={e => setEditDietaFormData({...editDietaFormData, tem_acompanhante: e.target.checked})} className="h-4 w-4 rounded border-gray-300" />
              <Label htmlFor="edit_tem_acompanhante">Tem acompanhante</Label>
            </div>
            <div className="space-y-2">
              <Label>Restrições Alimentares</Label>
              <Textarea value={editDietaFormData.restricoes_alimentares} onChange={e => setEditDietaFormData({...editDietaFormData, restricoes_alimentares: e.target.value})} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDietaDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpdateDieta} disabled={isDietaSubmitting}>
              {isDietaSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão de Dieta */}
      <AlertDialog open={deleteDietaDialogOpen} onOpenChange={setDeleteDietaDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a dieta de <strong>{selectedDieta?.paciente_nome || "N/A"}</strong>?
              <br />Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDieta} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={isDietaSubmitting}>
              {isDietaSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>;
};