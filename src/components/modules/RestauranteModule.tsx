import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  UtensilsCrossed, 
  Calendar, 
  CalendarDays, 
  Salad, 
  Loader2,
  Plus,
  Coffee,
  Sun,
  Cookie,
  Moon,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  BarChart3,
  FileDown,
  FileSpreadsheet,
  Filter,
  ClipboardList,
} from "lucide-react";
import { RegistrosRefeicoes } from "@/components/restaurante/RegistrosRefeicoes";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
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

const tipoRefeicaoLabels: Record<string, { label: string; icon: React.ReactNode }> = {
  cafe: { label: "Café da Manhã", icon: <Coffee className="h-4 w-4" /> },
  almoco: { label: "Almoço", icon: <Sun className="h-4 w-4" /> },
  lanche: { label: "Lanche", icon: <Cookie className="h-4 w-4" /> },
  jantar: { label: "Jantar", icon: <Moon className="h-4 w-4" /> },
  fora_horario: { label: "Fora de Horário", icon: <Clock className="h-4 w-4" /> },
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
  suspensa: "Suspensa",
};

const horariosRefeicaoOptions = [
  { value: "cafe", label: "Café da Manhã" },
  { value: "almoco", label: "Almoço" },
  { value: "lanche", label: "Lanche da Tarde" },
  { value: "jantar", label: "Jantar" },
];

const statusColors: Record<string, string> = {
  pendente: "bg-yellow-500 text-white",
  aprovada: "bg-green-500 text-white",
  rejeitada: "bg-red-500 text-white",
  cancelada: "bg-gray-500 text-white",
};

export const RestauranteModule = () => {
  const { toast } = useToast();
  const { isAdmin, hasRole, userId } = useUserRole();
  const isRestaurante = hasRole("restaurante");
  const canManage = isAdmin || isRestaurante;

  const [activeTab, setActiveTab] = useState("cardapio");
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
    data_inicio: format(new Date(), "yyyy-MM-dd"),
    data_fim: "",
    observacoes: "",
    is_dieta_extra: false,
    observacao_dieta_extra: "",
  });

  // Cardápio management states (for admin/restaurante)
  const [cardapioDialogOpen, setCardapioDialogOpen] = useState(false);
  const [cardapioFormData, setCardapioFormData] = useState({
    data: format(new Date(), "yyyy-MM-dd"),
    tipo_refeicao: "",
    descricao: "",
    observacoes: "",
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

  useEffect(() => {
    fetchData();
    fetchUserName();
  }, [cardapioView]);

  const fetchUserName = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .single();
      
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
        startDate = startOfWeek(new Date(), { weekStartsOn: 1 });
        endDate = endOfWeek(new Date(), { weekStartsOn: 1 });
      }

      const { data: cardapiosData, error: cardapiosError } = await supabase
        .from("cardapios")
        .select("*")
        .gte("data", format(startDate, "yyyy-MM-dd"))
        .lte("data", format(endDate, "yyyy-MM-dd"))
        .order("data")
        .order("tipo_refeicao");

      if (cardapiosError) throw cardapiosError;
      setCardapios(cardapiosData || []);

      // Fetch minhas solicitações
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: minhasData, error: minhasError } = await supabase
          .from("solicitacoes_dieta")
          .select("*")
          .eq("solicitante_id", user.id)
          .order("created_at", { ascending: false });

        if (minhasError) throw minhasError;
        setMinhasSolicitacoes(minhasData || []);

        // Se for admin ou restaurante, buscar todas as solicitações e registros de refeições
        if (canManage) {
          const { data: todasData, error: todasError } = await supabase
            .from("solicitacoes_dieta")
            .select("*")
            .order("created_at", { ascending: false });

          if (todasError) throw todasError;
          setTodasSolicitacoes(todasData || []);

          // Buscar registros de refeições do totem
          const { data: refeicoesData, error: refeicoesError } = await supabase
            .from("refeicoes_registros")
            .select("*")
            .order("created_at", { ascending: false });

          if (refeicoesError) throw refeicoesError;
          setRegistrosRefeicoes(refeicoesData || []);
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Combinar registros de dieta e refeições para o registro geral
  const registrosGerais: RegistroGeral[] = [
    ...todasSolicitacoes
      .filter(s => {
        const data = new Date(s.created_at);
        return data >= new Date(registroGeralDataInicio) && data <= new Date(registroGeralDataFim + "T23:59:59");
      })
      .map(s => ({
        id: s.id,
        tipo: "dieta" as const,
        nome: s.paciente_nome || "N/A",
        descricao: `Dieta ${tipoDietaLabels[s.tipo_dieta] || s.tipo_dieta}`,
        data: s.data_inicio,
        status: s.status,
        detalhes: `Quarto/Leito: ${s.quarto_leito || "N/A"} | Solicitante: ${s.solicitante_nome}`,
        created_at: s.created_at,
      })),
    ...registrosRefeicoes
      .filter(r => {
        const data = new Date(r.data_registro);
        return data >= new Date(registroGeralDataInicio) && data <= new Date(registroGeralDataFim + "T23:59:59");
      })
      .map(r => ({
        id: r.id,
        tipo: "refeicao" as const,
        nome: r.colaborador_nome,
        descricao: tipoRefeicaoLabels[r.tipo_refeicao]?.label || r.tipo_refeicao,
        data: r.data_registro,
        hora: r.hora_registro,
        detalhes: `Tipo: ${r.tipo_pessoa === "colaborador" ? "Colaborador" : "Visitante"}`,
        created_at: r.created_at,
      })),
  ]
    .filter(r => registroGeralFiltroTipo === "todos" || r.tipo === registroGeralFiltroTipo)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const handleSubmitSolicitacao = async () => {
    // Validação diferente para dieta extra
    if (formData.is_dieta_extra) {
      if (!formData.tipo_dieta || !formData.data_inicio) {
        toast({
          title: "Erro",
          description: "Preencha os campos obrigatórios: tipo de dieta e data início.",
          variant: "destructive",
        });
        return;
      }
      if (!formData.observacao_dieta_extra.trim()) {
        toast({
          title: "Erro",
          description: "Para dieta extra, é obrigatório informar o motivo na observação.",
          variant: "destructive",
        });
        return;
      }
    } else {
      if (!formData.tipo_dieta || !formData.data_inicio || !formData.paciente_nome || !formData.quarto_leito) {
        toast({
          title: "Erro",
          description: "Preencha os campos obrigatórios: nome do paciente, quarto/leito, tipo de dieta e data início.",
          variant: "destructive",
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Combinar observações se for dieta extra
      const observacoesCompletas = formData.is_dieta_extra 
        ? `[DIETA EXTRA] ${formData.observacao_dieta_extra}${formData.observacoes ? ` | Observações: ${formData.observacoes}` : ''}`
        : formData.observacoes || null;

      const { error } = await supabase.from("solicitacoes_dieta").insert({
        solicitante_id: user.id,
        solicitante_nome: userName,
        tipo_dieta: formData.tipo_dieta,
        paciente_nome: formData.paciente_nome || null,
        paciente_data_nascimento: formData.paciente_data_nascimento || null,
        quarto_leito: formData.quarto_leito || null,
        tem_acompanhante: formData.tem_acompanhante,
        restricoes_alimentares: formData.restricoes_alimentares || null,
        horarios_refeicoes: formData.horarios_refeicoes,
        data_inicio: formData.data_inicio,
        data_fim: formData.data_fim || null,
        observacoes: observacoesCompletas,
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Solicitação de dieta enviada com sucesso.",
      });

      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Erro",
        description: "Erro ao enviar solicitação.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitCardapio = async () => {
    if (!cardapioFormData.data || !cardapioFormData.tipo_refeicao || !cardapioFormData.descricao) {
      toast({
        title: "Erro",
        description: "Preencha os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase.from("cardapios").upsert({
        data: cardapioFormData.data,
        tipo_refeicao: cardapioFormData.tipo_refeicao,
        descricao: cardapioFormData.descricao,
        observacoes: cardapioFormData.observacoes || null,
        criado_por: user.id,
      }, { onConflict: "data,tipo_refeicao" });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Cardápio salvo com sucesso.",
      });

      setCardapioDialogOpen(false);
      resetCardapioForm();
      fetchData();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Erro",
        description: "Erro ao salvar cardápio.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateSolicitacaoStatus = async (id: string, newStatus: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("solicitacoes_dieta")
        .update({
          status: newStatus,
          aprovado_por: user.id,
          aprovado_em: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Solicitação ${newStatus === "aprovada" ? "aprovada" : "rejeitada"} com sucesso.`,
      });

      fetchData();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar status.",
        variant: "destructive",
      });
    }
  };

  const handleCancelarSolicitacao = async (id: string) => {
    try {
      const { error } = await supabase
        .from("solicitacoes_dieta")
        .update({ status: "cancelada" })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Solicitação cancelada com sucesso.",
      });

      fetchData();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Erro",
        description: "Erro ao cancelar solicitação.",
        variant: "destructive",
      });
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
      data_inicio: format(new Date(), "yyyy-MM-dd"),
      data_fim: "",
      observacoes: "",
      is_dieta_extra: false,
      observacao_dieta_extra: "",
    });
  };

  const resetCardapioForm = () => {
    setCardapioFormData({
      data: format(new Date(), "yyyy-MM-dd"),
      tipo_refeicao: "",
      descricao: "",
      observacoes: "",
    });
  };

  const getCardapioForDay = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return cardapios.filter(c => c.data === dateStr);
  };

  const weekDays = eachDayOfInterval({
    start: startOfWeek(new Date(), { weekStartsOn: 1 }),
    end: endOfWeek(new Date(), { weekStartsOn: 1 }),
  });

  // Dashboard functions
  const fetchDashboardData = async () => {
    if (!canManage) return;
    
    setIsLoadingDashboard(true);
    try {
      const { data, error } = await supabase
        .from("solicitacoes_dieta")
        .select("*")
        .gte("created_at", dashboardDataInicio)
        .lte("created_at", dashboardDataFim + "T23:59:59")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDashboardSolicitacoes(data || []);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados do dashboard.",
        variant: "destructive",
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
    total: dashboardSolicitacoes.length,
    aprovadas: dashboardSolicitacoes.filter(s => s.status === "aprovada").length,
    rejeitadas: dashboardSolicitacoes.filter(s => s.status === "rejeitada").length,
    pendentes: dashboardSolicitacoes.filter(s => s.status === "pendente").length,
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
      "Data Início": format(new Date(s.data_inicio), "dd/MM/yyyy"),
      "Data Fim": s.data_fim ? format(new Date(s.data_fim), "dd/MM/yyyy") : "-",
      "Status": s.status.charAt(0).toUpperCase() + s.status.slice(1),
      "Solicitado em": format(new Date(s.created_at), "dd/MM/yyyy HH:mm"),
      "Observações": s.observacoes || "-",
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Solicitações de Dieta");
    
    const fileName = `dietas_${format(new Date(dashboardDataInicio), "ddMMyyyy")}_${format(new Date(dashboardDataFim), "ddMMyyyy")}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    toast({
      title: "Sucesso",
      description: "Arquivo Excel exportado com sucesso.",
    });
  };

  const exportToPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    
    // Header
    doc.setFontSize(18);
    doc.text("Relatório de Solicitações de Dieta", 14, 22);
    
    doc.setFontSize(11);
    doc.text(`Período: ${format(new Date(dashboardDataInicio), "dd/MM/yyyy")} a ${format(new Date(dashboardDataFim), "dd/MM/yyyy")}`, 14, 32);
    
    // Stats
    doc.setFontSize(10);
    doc.text(`Total: ${dashboardStats.total} | Aprovadas: ${dashboardStats.aprovadas} | Rejeitadas: ${dashboardStats.rejeitadas} | Pendentes: ${dashboardStats.pendentes}`, 14, 42);
    
    // Table
    const tableData = dashboardSolicitacoes.map(s => [
      s.paciente_nome || "-",
      s.quarto_leito || "-",
      tipoDietaLabels[s.tipo_dieta] || s.tipo_dieta,
      s.restricoes_alimentares || "-",
      format(new Date(s.data_inicio), "dd/MM/yyyy"),
      s.status.charAt(0).toUpperCase() + s.status.slice(1),
      s.solicitante_nome,
    ]);

    autoTable(doc, {
      startY: 50,
      head: [["Paciente", "Quarto/Leito", "Tipo de Dieta", "Restrições", "Data Início", "Status", "Solicitante"]],
      body: tableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
    });
    
    const fileName = `dietas_${format(new Date(dashboardDataInicio), "ddMMyyyy")}_${format(new Date(dashboardDataFim), "ddMMyyyy")}.pdf`;
    doc.save(fileName);
    
    toast({
      title: "Sucesso",
      description: "Arquivo PDF exportado com sucesso.",
    });
  };

  return (
    <div className="space-y-6">
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
        {canManage && (
            <>
              <TabsTrigger value="dashboard" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="gerenciar" className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                Gerenciar
              </TabsTrigger>
            </>
          )}
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
                  <Button
                    variant={cardapioView === "dia" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCardapioView("dia")}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Hoje
                  </Button>
                  <Button
                    variant={cardapioView === "semana" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCardapioView("semana")}
                  >
                    <CalendarDays className="h-4 w-4 mr-2" />
                    Semana
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : cardapioView === "dia" ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">
                    {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                  </h3>
                  {getCardapioForDay(new Date()).length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <UtensilsCrossed className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhum cardápio cadastrado para hoje.</p>
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {["cafe", "almoco", "lanche", "jantar"].map((tipo) => {
                        const cardapio = getCardapioForDay(new Date()).find(c => c.tipo_refeicao === tipo);
                        if (!cardapio) return null;
                        return (
                          <Card key={tipo} className="border-l-4 border-l-primary">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-base flex items-center gap-2">
                                {tipoRefeicaoLabels[tipo]?.icon}
                                {tipoRefeicaoLabels[tipo]?.label}
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm">{cardapio.descricao}</p>
                              {cardapio.observacoes && (
                                <p className="text-xs text-muted-foreground mt-2">
                                  {cardapio.observacoes}
                                </p>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {weekDays.map((day) => {
                    const dayCardapios = getCardapioForDay(day);
                    return (
                      <div key={day.toISOString()} className={`p-4 rounded-lg border ${isToday(day) ? "bg-primary/5 border-primary" : ""}`}>
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          {format(day, "EEEE, dd/MM", { locale: ptBR })}
                          {isToday(day) && <Badge>Hoje</Badge>}
                        </h4>
                        {dayCardapios.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Sem cardápio cadastrado</p>
                        ) : (
                          <div className="grid gap-2 md:grid-cols-4">
                            {["cafe", "almoco", "lanche", "jantar"].map((tipo) => {
                              const cardapio = dayCardapios.find(c => c.tipo_refeicao === tipo);
                              if (!cardapio) return null;
                              return (
                                <div key={tipo} className="p-2 bg-secondary/50 rounded text-sm">
                                  <span className="font-medium flex items-center gap-1">
                                    {tipoRefeicaoLabels[tipo]?.icon}
                                    {tipoRefeicaoLabels[tipo]?.label}
                                  </span>
                                  <p className="text-muted-foreground truncate">{cardapio.descricao}</p>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dietas Tab */}
        <TabsContent value="solicitar" className="space-y-4">
          <Card>
            <CardHeader>
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
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : minhasSolicitacoes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Salad className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Você ainda não fez nenhuma solicitação de dieta.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo de Dieta</TableHead>
                      <TableHead>Período</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Solicitado em</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {minhasSolicitacoes.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>
                          <div>
                            <span className="font-medium">{tipoDietaLabels[s.tipo_dieta] || s.tipo_dieta}</span>
                            {s.descricao_especifica && (
                              <p className="text-xs text-muted-foreground">{s.descricao_especifica}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Clock className="h-3 w-3" />
                            {format(new Date(s.data_inicio), "dd/MM/yyyy")}
                            {s.data_fim && ` - ${format(new Date(s.data_fim), "dd/MM/yyyy")}`}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[s.status]}>
                            {s.status === "pendente" && <AlertCircle className="h-3 w-3 mr-1" />}
                            {s.status === "aprovada" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                            {s.status === "rejeitada" && <XCircle className="h-3 w-3 mr-1" />}
                            {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(s.created_at), "dd/MM/yyyy HH:mm")}
                        </TableCell>
                        <TableCell>
                          {s.status === "pendente" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-red-600 hover:bg-red-50"
                              onClick={() => handleCancelarSolicitacao(s.id)}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Cancelar
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>


        {/* Dashboard Tab (Restaurante only) */}
        {canManage && (
          <TabsContent value="dashboard" className="space-y-4">
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
                      <Input
                        type="date"
                        value={dashboardDataInicio}
                        onChange={(e) => setDashboardDataInicio(e.target.value)}
                        className="w-[140px]"
                      />
                      <span className="text-muted-foreground">até</span>
                      <Input
                        type="date"
                        value={dashboardDataFim}
                        onChange={(e) => setDashboardDataFim(e.target.value)}
                        className="w-[140px]"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={exportToExcel}>
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                        Excel
                      </Button>
                      <Button variant="outline" size="sm" onClick={exportToPDF}>
                        <FileDown className="h-4 w-4 mr-2" />
                        PDF
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* KPI Cards */}
            {isLoadingDashboard ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Total de Solicitações</CardDescription>
                      <CardTitle className="text-3xl">{dashboardStats.total}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground">No período selecionado</p>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-green-500">
                    <CardHeader className="pb-2">
                      <CardDescription className="flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Aprovadas
                      </CardDescription>
                      <CardTitle className="text-3xl text-green-600">{dashboardStats.aprovadas}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground">
                        {dashboardStats.total > 0 ? ((dashboardStats.aprovadas / dashboardStats.total) * 100).toFixed(1) : 0}% do total
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-red-500">
                    <CardHeader className="pb-2">
                      <CardDescription className="flex items-center gap-1">
                        <XCircle className="h-4 w-4 text-red-500" />
                        Rejeitadas
                      </CardDescription>
                      <CardTitle className="text-3xl text-red-600">{dashboardStats.rejeitadas}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground">
                        {dashboardStats.total > 0 ? ((dashboardStats.rejeitadas / dashboardStats.total) * 100).toFixed(1) : 0}% do total
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-yellow-500">
                    <CardHeader className="pb-2">
                      <CardDescription className="flex items-center gap-1">
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                        Pendentes
                      </CardDescription>
                      <CardTitle className="text-3xl text-yellow-600">{dashboardStats.pendentes}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground">
                        {dashboardStats.total > 0 ? ((dashboardStats.pendentes / dashboardStats.total) * 100).toFixed(1) : 0}% do total
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Table with all requests */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Detalhamento das Solicitações</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {dashboardSolicitacoes.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Salad className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Nenhuma solicitação encontrada no período.</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Paciente</TableHead>
                            <TableHead>Quarto/Leito</TableHead>
                            <TableHead>Tipo de Dieta</TableHead>
                            <TableHead>Período</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Solicitante</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dashboardSolicitacoes.map((s) => (
                            <TableRow key={s.id}>
                              <TableCell>
                                <div>
                                  <span className="font-medium">{s.paciente_nome || "N/A"}</span>
                                  {s.tem_acompanhante && (
                                    <p className="text-xs text-muted-foreground">Com acompanhante</p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>{s.quarto_leito || "N/A"}</TableCell>
                              <TableCell>
                                <div>
                                  <span>{tipoDietaLabels[s.tipo_dieta] || s.tipo_dieta}</span>
                                  {s.restricoes_alimentares && (
                                    <p className="text-xs text-muted-foreground">{s.restricoes_alimentares}</p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1 text-sm">
                                  <Clock className="h-3 w-3" />
                                  {format(new Date(s.data_inicio), "dd/MM/yyyy")}
                                  {s.data_fim && ` - ${format(new Date(s.data_fim), "dd/MM/yyyy")}`}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge className={statusColors[s.status]}>
                                  {s.status === "pendente" && <AlertCircle className="h-3 w-3 mr-1" />}
                                  {s.status === "aprovada" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                                  {s.status === "rejeitada" && <XCircle className="h-3 w-3 mr-1" />}
                                  {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {s.solicitante_nome}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        )}

        {/* Gerenciar Tab (Admin/Restaurante only) */}
        {canManage && (
          <TabsContent value="gerenciar" className="space-y-4">
            <Tabs defaultValue="geral" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="geral" className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" />
                  Registro Geral
                </TabsTrigger>
                <TabsTrigger value="solicitacoes" className="flex items-center gap-2">
                  <Salad className="h-4 w-4" />
                  Solicitações de Dieta
                </TabsTrigger>
                <TabsTrigger value="totem" className="flex items-center gap-2">
                  <UtensilsCrossed className="h-4 w-4" />
                  Registros do Totem
                </TabsTrigger>
                <TabsTrigger value="cardapios" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Cardápios
                </TabsTrigger>
              </TabsList>

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
                        <Input
                          type="date"
                          value={registroGeralDataInicio}
                          onChange={(e) => setRegistroGeralDataInicio(e.target.value)}
                          className="w-[140px]"
                        />
                        <span className="text-muted-foreground">até</span>
                        <Input
                          type="date"
                          value={registroGeralDataFim}
                          onChange={(e) => setRegistroGeralDataFim(e.target.value)}
                          className="w-[140px]"
                        />
                        <Select
                          value={registroGeralFiltroTipo}
                          onValueChange={(value: "todos" | "dieta" | "refeicao") => setRegistroGeralFiltroTipo(value)}
                        >
                          <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Filtrar tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todos">Todos</SelectItem>
                            <SelectItem value="dieta">Dietas</SelectItem>
                            <SelectItem value="refeicao">Refeições</SelectItem>
                          </SelectContent>
                        </Select>
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

                    {registrosGerais.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Nenhum registro encontrado no período.</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Nome</TableHead>
                            <TableHead>Descrição</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead>Detalhes</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {registrosGerais.map((r) => (
                            <TableRow key={`${r.tipo}-${r.id}`}>
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
                              <TableCell>
                                {r.status ? (
                                  <Badge className={statusColors[r.status]}>
                                    {r.status === "pendente" && "Pendente"}
                                    {r.status === "aprovada" && "Aprovada"}
                                    {r.status === "rejeitada" && "Rejeitada"}
                                    {r.status === "cancelada" && "Cancelada"}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-green-600 border-green-600">
                                    Registrado
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Sub-tab: Solicitações de Dieta */}
              <TabsContent value="solicitacoes" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Salad className="h-5 w-5" />
                      Solicitações de Dieta para Pacientes
                    </CardTitle>
                    <CardDescription>
                      Gerencie as solicitações de dietas especiais para pacientes
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {todasSolicitacoes.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Salad className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Nenhuma solicitação encontrada.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {todasSolicitacoes.map((s) => (
                            <div key={s.id} className="p-4 border rounded-lg space-y-2 hover:bg-muted/30 transition-colors">
                              <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium">Paciente: {s.paciente_nome || "N/A"}</p>
                                    <Badge className={statusColors[s.status]}>
                                      {s.status === "pendente" && "Pendente"}
                                      {s.status === "aprovada" && "Aprovada"}
                                      {s.status === "rejeitada" && "Rejeitada"}
                                      {s.status === "cancelada" && "Cancelada"}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    Quarto/Leito: {s.quarto_leito || "N/A"}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    Dieta: {tipoDietaLabels[s.tipo_dieta] || s.tipo_dieta}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    Período: {format(new Date(s.data_inicio), "dd/MM/yyyy")}
                                    {s.data_fim && ` até ${format(new Date(s.data_fim), "dd/MM/yyyy")}`}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Solicitado por: {s.solicitante_nome} em {format(new Date(s.created_at), "dd/MM/yyyy 'às' HH:mm")}
                                  </p>
                                  {s.restricoes_alimentares && (
                                    <p className="text-xs text-orange-600">
                                      Restrições: {s.restricoes_alimentares}
                                    </p>
                                  )}
                                  {s.observacoes && (
                                    <p className="text-xs text-muted-foreground italic">
                                      Obs: {s.observacoes}
                                    </p>
                                  )}
                                </div>
                                {s.status === "pendente" && (
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-green-600 hover:bg-green-50"
                                      onClick={() => handleUpdateSolicitacaoStatus(s.id, "aprovada")}
                                    >
                                      <CheckCircle2 className="h-4 w-4 mr-1" />
                                      Aprovar
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-red-600 hover:bg-red-50"
                                      onClick={() => handleUpdateSolicitacaoStatus(s.id, "rejeitada")}
                                    >
                                      <XCircle className="h-4 w-4 mr-1" />
                                      Rejeitar
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Sub-tab: Registros do Totem */}
              <TabsContent value="totem" className="mt-4">
                <RegistrosRefeicoes />
              </TabsContent>

              {/* Sub-tab: Cardápios */}
              <TabsContent value="cardapios" className="mt-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Calendar className="h-5 w-5" />
                          Gerenciar Cardápios
                        </CardTitle>
                        <CardDescription>Cadastre e gerencie os cardápios do restaurante</CardDescription>
                      </div>
                      <Button size="sm" onClick={() => setCardapioDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Novo Cardápio
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {cardapios.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <UtensilsCrossed className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Nenhum cardápio cadastrado.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {cardapios.map((c) => (
                          <div key={c.id} className="p-3 border rounded-lg flex justify-between items-center hover:bg-muted/30 transition-colors">
                            <div>
                              <span className="font-medium">{format(new Date(c.data + 'T12:00:00'), "dd/MM/yyyy")}</span>
                              <span className="text-muted-foreground mx-2">-</span>
                              <span className="inline-flex items-center gap-1">
                                {tipoRefeicaoLabels[c.tipo_refeicao]?.icon}
                                {tipoRefeicaoLabels[c.tipo_refeicao]?.label}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground truncate max-w-xs">{c.descricao}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>
        )}
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
                <Input
                  value={formData.paciente_nome}
                  onChange={(e) => setFormData({ ...formData, paciente_nome: e.target.value })}
                  placeholder="Nome completo do paciente"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data de Nascimento</Label>
                  <Input
                    type="date"
                    value={formData.paciente_data_nascimento}
                    onChange={(e) => setFormData({ ...formData, paciente_data_nascimento: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Quarto e Leito *</Label>
                  <Input
                    value={formData.quarto_leito}
                    onChange={(e) => setFormData({ ...formData, quarto_leito: e.target.value })}
                    placeholder="Ex: Quarto 101 - Leito A"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="tem_acompanhante"
                  checked={formData.tem_acompanhante}
                  onChange={(e) => setFormData({ ...formData, tem_acompanhante: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="tem_acompanhante">O paciente tem acompanhante?</Label>
              </div>
            </div>

            {/* Tipo de Dieta */}
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <h4 className="font-medium text-sm">Tipo de Dieta</h4>
              <div className="space-y-2">
                <Label>Selecione o Tipo de Dieta *</Label>
                <Select
                  value={formData.tipo_dieta}
                  onValueChange={(value) => setFormData({ ...formData, tipo_dieta: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo de dieta" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(tipoDietaLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Restrições Alimentares</Label>
                <Textarea
                  value={formData.restricoes_alimentares}
                  onChange={(e) => setFormData({ ...formData, restricoes_alimentares: e.target.value })}
                  placeholder="Descreva as restrições alimentares do paciente (alergias, intolerâncias, etc.)"
                  rows={2}
                />
              </div>
            </div>

            {/* Horários das Refeições */}
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <h4 className="font-medium text-sm">Horários das Refeições</h4>
              <div className="grid grid-cols-2 gap-2">
                {horariosRefeicaoOptions.map((horario) => (
                  <div key={horario.value} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`horario_${horario.value}`}
                      checked={formData.horarios_refeicoes.includes(horario.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            horarios_refeicoes: [...formData.horarios_refeicoes, horario.value],
                          });
                        } else {
                          setFormData({
                            ...formData,
                            horarios_refeicoes: formData.horarios_refeicoes.filter((h) => h !== horario.value),
                          });
                        }
                      }}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Label htmlFor={`horario_${horario.value}`}>{horario.label}</Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Período e Observações */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data Início *</Label>
                <Input
                  type="date"
                  value={formData.data_inicio}
                  onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Data Fim (opcional)</Label>
                <Input
                  type="date"
                  value={formData.data_fim}
                  onChange={(e) => setFormData({ ...formData, data_fim: e.target.value })}
                />
              </div>
            </div>

            {/* Dieta Extra */}
            <div className="space-y-3 p-4 border rounded-lg bg-amber-50/50 border-amber-200">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_dieta_extra"
                  checked={formData.is_dieta_extra}
                  onChange={(e) => setFormData({ ...formData, is_dieta_extra: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="is_dieta_extra" className="font-medium text-amber-800">
                  Dieta Extra (para possíveis internações ou outros casos)
                </Label>
              </div>
              {formData.is_dieta_extra && (
                <div className="space-y-2">
                  <Label className="text-amber-700">Observação da Dieta Extra *</Label>
                  <Textarea
                    value={formData.observacao_dieta_extra}
                    onChange={(e) => setFormData({ ...formData, observacao_dieta_extra: e.target.value })}
                    placeholder="Descreva o motivo da dieta extra (ex: possível internação, acompanhante extra, visitante, etc.)"
                    rows={2}
                    className="border-amber-200 focus:border-amber-400"
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Observações Gerais</Label>
              <Textarea
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                placeholder="Informações adicionais sobre a dieta ou o paciente"
              />
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
                <Input
                  type="date"
                  value={cardapioFormData.data}
                  onChange={(e) => setCardapioFormData({ ...cardapioFormData, data: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Refeição *</Label>
                <Select
                  value={cardapioFormData.tipo_refeicao}
                  onValueChange={(value) => setCardapioFormData({ ...cardapioFormData, tipo_refeicao: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(tipoRefeicaoLabels).map(([value, { label }]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrição do Cardápio *</Label>
              <Textarea
                value={cardapioFormData.descricao}
                onChange={(e) => setCardapioFormData({ ...cardapioFormData, descricao: e.target.value })}
                placeholder="Ex: Arroz, feijão, frango grelhado, salada..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Input
                value={cardapioFormData.observacoes}
                onChange={(e) => setCardapioFormData({ ...cardapioFormData, observacoes: e.target.value })}
                placeholder="Informações adicionais"
              />
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
    </div>
  );
};
