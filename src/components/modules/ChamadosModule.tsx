import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useLogAccess } from "@/hooks/useLogAccess";
import { useRealtimeSync, REALTIME_PRESETS } from "@/hooks/useRealtimeSync";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
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
  Ticket, 
  Plus, 
  BarChart3,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Eye,
  LayoutDashboard,
  Package,
  Minus,
  Search,
  Loader2,
  MessageSquare,
  FileText,
  Upload,
  FileSpreadsheet,
  CalendarIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInHours, parseISO, subDays, isAfter, isBefore, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChamadosDashboard, RelatorioIADialog } from "@/components/chamados";
import { SectionHeader, ActionButton } from "@/components/ui/action-buttons";
import { StatCard } from "@/components/ui/stat-card";
import { SearchInput } from "@/components/ui/search-input";
import { LoadingState, LoadingSpinner } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { exportToPDF } from "@/lib/export-utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";

interface ChamadosModuleProps {
  setor: 'ti' | 'manutencao' | 'engenharia_clinica' | 'nir';
}

interface Chamado {
  id: string;
  numero_chamado: string;
  titulo: string;
  descricao: string;
  categoria: string;
  prioridade: string;
  status: string;
  solicitante_id: string;
  solicitante_nome: string;
  solicitante_setor: string | null;
  atribuido_para: string | null;
  data_abertura: string;
  data_resolucao: string | null;
  solucao: string | null;
  prazo_conclusao: string | null;
}

interface Produto {
  id: string;
  nome: string;
  codigo: string | null;
  quantidade_atual: number | null;
  setor_responsavel: string;
}

interface MaterialUtilizado {
  id: string;
  produto_id: string;
  quantidade: number;
  observacao: string | null;
  created_at: string;
  produtos?: {
    nome: string;
    codigo: string | null;
  };
}

interface Comentario {
  id: string;
  chamado_id: string;
  usuario_id: string;
  usuario_nome: string;
  comentario: string;
  created_at: string;
}

const setorLabels: Record<string, string> = {
  ti: "TI",
  manutencao: "Manutenção",
  engenharia_clinica: "Engenharia Clínica",
};

const prioridadeColors: Record<string, string> = {
  baixa: "bg-green-500 text-white",
  media: "bg-yellow-500 text-black",
  alta: "bg-orange-500 text-white",
  urgente: "bg-red-500 text-white",
};

const statusColors: Record<string, string> = {
  aberto: "bg-blue-500 text-white",
  em_andamento: "bg-yellow-500 text-black",
  pendente: "bg-orange-500 text-white",
  resolvido: "bg-green-500 text-white",
  cancelado: "bg-gray-500 text-white",
};

const statusLabels: Record<string, string> = {
  aberto: "Aberto",
  em_andamento: "Em Andamento",
  pendente: "Pendente",
  resolvido: "Resolvido",
  cancelado: "Cancelado",
};

export const ChamadosModule = ({ setor }: ChamadosModuleProps) => {
  const { role } = useUserRole();
  const { logAction } = useLogAccess();
  const { toast } = useToast();
  useRealtimeSync(REALTIME_PRESETS.chamados);
  
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Filtros de período
  const [filterDay, setFilterDay] = useState<string>("todos");
  const [filterMonth, setFilterMonth] = useState<string>("todos");
  const [filterYear, setFilterYear] = useState<string>("todos");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  
  const [createDialog, setCreateDialog] = useState(false);
  const [detailsDialog, setDetailsDialog] = useState(false);
  const [selectedChamado, setSelectedChamado] = useState<Chamado | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [chamadoForm, setChamadoForm] = useState({
    titulo: "",
    descricao: "",
    prioridade: "media",
  });

  const [novoComentario, setNovoComentario] = useState("");
  const [novoStatus, setNovoStatus] = useState("");
  const [solucao, setSolucao] = useState("");
  
  // Estados para materiais
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [materiaisUtilizados, setMateriaisUtilizados] = useState<MaterialUtilizado[]>([]);
  const [materialForm, setMaterialForm] = useState({
    produto_id: "",
    quantidade: 1,
    observacao: "",
  });
  const [isAddingMaterial, setIsAddingMaterial] = useState(false);

  // Estados para importação
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<Array<Record<string, string>>>([]);

  // Estados para filtro de data do dashboard simples
  const [dashboardDataInicio, setDashboardDataInicio] = useState<Date | undefined>(undefined);
  const [dashboardDataFim, setDashboardDataFim] = useState<Date | undefined>(undefined);

  const isResponsavel = role === 'admin' || role === setor;

  // SLA configuration
  const SLA_HORAS: Record<string, number> = {
    urgente: 2,
    alta: 4,
    media: 8,
    baixa: 24,
  };

  useEffect(() => {
    fetchChamados();
    fetchProdutos();
    logAction("acesso", `chamados_${setor}`);
  }, [setor]);

  const fetchProdutos = async () => {
    try {
      const { data, error } = await supabase
        .from("produtos")
        .select("id, nome, codigo, quantidade_atual, setor_responsavel")
        .eq("setor_responsavel", setor)
        .eq("ativo", true)
        .order("nome");

      if (error) throw error;
      setProdutos(data || []);
    } catch (error) {
      console.error("Error fetching produtos:", error);
    }
  };

  const fetchMateriaisUtilizados = async (chamadoId: string) => {
    try {
      const { data, error } = await supabase
        .from("chamados_materiais")
        .select(`
          id,
          produto_id,
          quantidade,
          observacao,
          created_at,
          produtos (nome, codigo)
        `)
        .eq("chamado_id", chamadoId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMateriaisUtilizados(data || []);
    } catch (error) {
      console.error("Error fetching materiais:", error);
    }
  };

  const fetchChamados = async () => {
    setIsLoading(true);
    try {
      // Paginated fetch to handle >1000 records
      const pageSize = 1000;
      let allChamados: Chamado[] = [];
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("chamados")
          .select("*")
          .eq("categoria", setor)
          .order("created_at", { ascending: false })
          .range(from, from + pageSize - 1);

        if (error) throw error;
        allChamados = allChamados.concat((data || []) as Chamado[]);
        hasMore = (data || []).length === pageSize;
        from += pageSize;
      }

      setChamados(allChamados);
    } catch (error) {
      console.error("Error fetching chamados:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar chamados.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchComentarios = async (chamadoId: string) => {
    try {
      const { data, error } = await supabase
        .from("chamados_comentarios")
        .select("*")
        .eq("chamado_id", chamadoId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setComentarios(data || []);
    } catch (error) {
      console.error("Error fetching comentarios:", error);
    }
  };

  const handleCreateChamado = async () => {
    if (!chamadoForm.titulo || !chamadoForm.descricao) {
      toast({
        title: "Erro",
        description: "Título e descrição são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, setor")
        .eq("user_id", user?.id)
        .single();
      
      // Gerar número do chamado
      const numeroChamado = `CH-${setor.toUpperCase()}-${Date.now()}`;
      
      const { error } = await supabase
        .from("chamados")
        .insert({
          numero_chamado: numeroChamado,
          titulo: chamadoForm.titulo,
          descricao: chamadoForm.descricao,
          prioridade: chamadoForm.prioridade,
          categoria: setor,
          solicitante_id: user?.id,
          solicitante_nome: profile?.full_name || user?.email || "Usuário",
          solicitante_setor: profile?.setor,
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Chamado aberto com sucesso.",
      });

      await logAction("abrir_chamado", `chamados_${setor}`, { titulo: chamadoForm.titulo });
      
      setCreateDialog(false);
      setChamadoForm({ titulo: "", descricao: "", prioridade: "media" });
      fetchChamados();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Erro",
        description: "Erro ao abrir chamado.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddComentario = async () => {
    if (!novoComentario.trim() || !selectedChamado) return;

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user?.id)
        .single();
      
      const { error } = await supabase
        .from("chamados_comentarios")
        .insert({
          chamado_id: selectedChamado.id,
          usuario_id: user?.id!,
          usuario_nome: profile?.full_name || user?.email || "Usuário",
          comentario: novoComentario,
        });

      if (error) throw error;

      setNovoComentario("");
      fetchComentarios(selectedChamado.id);
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar comentário.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!novoStatus || !selectedChamado) return;

    setIsSubmitting(true);
    try {
      const updateData: Record<string, unknown> = { status: novoStatus };
      
      if (novoStatus === 'resolvido') {
        updateData.data_resolucao = new Date().toISOString();
        updateData.solucao = solucao;
      }

      const { error } = await supabase
        .from("chamados")
        .update(updateData)
        .eq("id", selectedChamado.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Status atualizado com sucesso.",
      });

      await logAction("atualizar_chamado", `chamados_${setor}`, { 
        chamado: selectedChamado.numero_chamado,
        status: novoStatus,
      });

      setDetailsDialog(false);
      setSelectedChamado(null);
      setNovoStatus("");
      setSolucao("");
      fetchChamados();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar status.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddMaterial = async () => {
    if (!materialForm.produto_id || materialForm.quantidade <= 0 || !selectedChamado) {
      toast({
        title: "Erro",
        description: "Selecione um produto e quantidade válida.",
        variant: "destructive",
      });
      return;
    }

    setIsAddingMaterial(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("chamados_materiais")
        .insert({
          chamado_id: selectedChamado.id,
          produto_id: materialForm.produto_id,
          quantidade: materialForm.quantidade,
          observacao: materialForm.observacao || null,
          registrado_por: user?.id,
        });

      if (error) {
        if (error.message.includes("Estoque insuficiente")) {
          toast({
            title: "Estoque Insuficiente",
            description: error.message,
            variant: "destructive",
          });
        } else {
          throw error;
        }
        return;
      }

      toast({
        title: "Sucesso",
        description: "Material registrado e baixa no estoque realizada.",
      });

      await logAction("registrar_material", `chamados_${setor}`, { 
        chamado: selectedChamado.numero_chamado,
        produto_id: materialForm.produto_id,
        quantidade: materialForm.quantidade,
      });

      setMaterialForm({ produto_id: "", quantidade: 1, observacao: "" });
      fetchMateriaisUtilizados(selectedChamado.id);
      fetchProdutos(); // Atualizar estoque exibido
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Erro",
        description: "Erro ao registrar material.",
        variant: "destructive",
      });
    } finally {
      setIsAddingMaterial(false);
    }
  };

  const openDetails = (chamado: Chamado) => {
    setSelectedChamado(chamado);
    setNovoStatus(chamado.status);
    setSolucao(chamado.solucao || "");
    setMaterialForm({ produto_id: "", quantidade: 1, observacao: "" });
    fetchComentarios(chamado.id);
    fetchMateriaisUtilizados(chamado.id);
    setDetailsDialog(true);
  };

  const getPrazoStatus = (chamado: Chamado) => {
    if (!chamado.prazo_conclusao) return null;
    if (chamado.status === 'resolvido' || chamado.status === 'cancelado') return null;
    
    const prazo = new Date(chamado.prazo_conclusao);
    const agora = new Date();
    const diffHoras = (prazo.getTime() - agora.getTime()) / (1000 * 60 * 60);
    
    if (diffHoras < 0) {
      return { status: 'atrasado', label: 'Atrasado', color: 'bg-red-500 text-white' };
    } else if (diffHoras < 2) {
      return { status: 'critico', label: 'Crítico', color: 'bg-orange-500 text-white' };
    } else if (diffHoras < 4) {
      return { status: 'alerta', label: 'Atenção', color: 'bg-yellow-500 text-black' };
    }
    return { status: 'ok', label: 'No prazo', color: 'bg-green-500 text-white' };
  };

  const filteredChamados = useMemo(() => {
    return chamados.filter(c => {
      const matchesSearch = c.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.numero_chamado.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "todos" || c.status === statusFilter;
      
      // Filtro por período (dia, mês, ano)
      const dataAbertura = new Date(c.data_abertura);
      const matchesDay = filterDay === "todos" || dataAbertura.getDate() === parseInt(filterDay);
      const matchesMonth = filterMonth === "todos" || (dataAbertura.getMonth() + 1) === parseInt(filterMonth);
      const matchesYear = filterYear === "todos" || dataAbertura.getFullYear() === parseInt(filterYear);
      
      return matchesSearch && matchesStatus && matchesDay && matchesMonth && matchesYear;
    });
  }, [chamados, searchTerm, statusFilter, filterDay, filterMonth, filterYear]);

  const stats = {
    total: chamados.length,
    abertos: chamados.filter(c => c.status === 'aberto').length,
    emAndamento: chamados.filter(c => c.status === 'em_andamento').length,
    resolvidos: chamados.filter(c => c.status === 'resolvido').length,
  };

  // Importar chamados de Excel
  const handleFileImport = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportPreview([]);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet, { header: 0 });
          
          if (jsonData.length === 0) {
            toast({
              title: "Erro",
              description: "Arquivo vazio ou formato inválido.",
              variant: "destructive",
            });
            setIsImporting(false);
            return;
          }

          setImportPreview(jsonData);
          setShowImportDialog(true);
        } catch (err) {
          console.error("Error parsing file:", err);
          toast({
            title: "Erro",
            description: "Erro ao processar o arquivo.",
            variant: "destructive",
          });
        } finally {
          setIsImporting(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Erro",
        description: "Erro ao importar arquivo.",
        variant: "destructive",
      });
      setIsImporting(false);
    }

    // Reset file input
    event.target.value = '';
  }, [toast]);

  // Confirmar importação
  const handleConfirmImport = async () => {
    if (importPreview.length === 0) return;

    setIsImporting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const chamadosToInsert = importPreview.map((row, index) => {
        // Mapear colunas do Excel para campos do banco
        // Suporta múltiplos formatos de planilha (TI, Manutenção e Engenharia Clínica)
        const prioridadeRaw = (
          row['PRIORIDADE DO CHAMADO'] || 
          row['PRIORIDADE DO C'] || 
          row['ORIDADE DO CHAM'] ||
          row['ORIDADE DO CHAMADO'] ||
          row['PRIORIDADE'] || 
          'media'
        ).toString().toLowerCase().trim();
        
        let prioridade = 'media';
        if (prioridadeRaw === 'baixo' || prioridadeRaw === 'baixa') prioridade = 'baixa';
        else if (prioridadeRaw === 'alto' || prioridadeRaw === 'alta') prioridade = 'alta';
        else if (prioridadeRaw === 'urgente') prioridade = 'urgente';
        else if (prioridadeRaw === 'médio' || prioridadeRaw === 'medio' || prioridadeRaw === 'média' || prioridadeRaw === 'media') prioridade = 'media';
        
        // Status - suporta múltiplos formatos
        const statusRaw = (
          row['SITUAÇÃO'] || 
          row['STATUS'] || 
          row['Status do chamado'] ||
          row['STATUS DO CHAMADO'] ||
          'resolvido'
        ).toString().toLowerCase();
        
        let status = 'aberto';
        if (statusRaw.includes('conclu') || statusRaw.includes('resolvido')) {
          status = 'resolvido';
        } else if (statusRaw.includes('andamento') || statusRaw.includes('em_andamento')) {
          status = 'em_andamento';
        }

        // Tentar extrair data de abertura - suporta múltiplos formatos
        let dataAbertura = new Date().toISOString();
        const dataRaw = row['Hora de início'] || row['DATA'] || row['DATA ABERTURA'] || Object.values(row)[0];
        if (dataRaw) {
          try {
            // Formato DD/MM/YY HH:MM ou similar
            const dateMatch = dataRaw.toString().match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
            if (dateMatch) {
              const day = parseInt(dateMatch[1]);
              const month = parseInt(dateMatch[2]) - 1;
              let year = parseInt(dateMatch[3]);
              if (year < 100) year += 2000;
              dataAbertura = new Date(year, month, day).toISOString();
            }
          } catch {
            // Mantém data atual se falhar
          }
        }

        const descricao = row['DESCRIÇÃO DO CHAMADO'] || row['DESCRICAO'] || row['TITULO'] || `Chamado importado ${index + 1}`;
        const solicitante = row['NOME DO SOLICITANTE'] || row['NOME DO SOLICI'] || row['NOME DO SOLICITA'] || row['SOLICITANTE'] || 'Importado';
        const setorOrigem = row['SETOR'] || row['SETOR:'] || null;
        const contatoRetorno = row['ONDE DESEJA RECEBER O RETORNO DO CHAMADO?'] || row['CONTATO'] || null;
        const tipoChamado = row['TIPO DE CHAMADO'] || row['TIPO'] || null;

        // Montar descrição completa incluindo tipo de chamado se disponível
        let descricaoCompleta = descricao;
        if (tipoChamado) {
          descricaoCompleta = `[${tipoChamado}] ${descricao}`;
        }
        if (contatoRetorno) {
          descricaoCompleta += `\n\nContato para retorno: ${contatoRetorno}`;
        }

        return {
          numero_chamado: `CH-${setor.toUpperCase()}-IMP-${Date.now()}-${index}`,
          titulo: descricao.length > 100 ? descricao.substring(0, 100) : descricao,
          descricao: descricaoCompleta,
          categoria: setor,
          prioridade,
          status,
          solicitante_id: user?.id || '00000000-0000-0000-0000-000000000000',
          solicitante_nome: solicitante,
          solicitante_setor: setorOrigem,
          data_abertura: dataAbertura,
          data_resolucao: status === 'resolvido' ? new Date().toISOString() : null,
          solucao: status === 'resolvido' ? 'Chamado importado como resolvido' : null,
        };
      });

      const { error } = await supabase.from("chamados").insert(chamadosToInsert);
      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: `${chamadosToInsert.length} chamados importados com sucesso.`,
      });

      await logAction("importar_chamados", `chamados_${setor}`, { quantidade: chamadosToInsert.length });
      
      setShowImportDialog(false);
      setImportPreview([]);
      fetchChamados();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Erro",
        description: "Erro ao importar chamados.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader 
        title={`Chamados - ${setorLabels[setor]}`}
        description="Central de atendimento e suporte"
      >
        <div className="flex gap-2">
          <div className="relative">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileImport}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={isImporting}
            />
            <Button variant="outline" disabled={isImporting}>
              {isImporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Importar
            </Button>
          </div>
          <ActionButton type="add" label="Novo Chamado" onClick={() => setCreateDialog(true)} />
        </div>
      </SectionHeader>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Total de chamados"
          value={stats.total}
          icon={Ticket}
          variant="primary"
        />
        <StatCard
          title="Abertos"
          value={stats.abertos}
          icon={Clock}
          variant="info"
        />
        <StatCard
          title="Em andamento"
          value={stats.emAndamento}
          icon={AlertTriangle}
          variant="warning"
        />
        <StatCard
          title="Resolvidos"
          value={stats.resolvidos}
          icon={CheckCircle2}
          variant="success"
        />
      </div>

      <Tabs defaultValue="chamados">
        <TabsList>
          <TabsTrigger value="chamados">
            <Ticket className="h-4 w-4 mr-2" />
            Chamados
          </TabsTrigger>
          <TabsTrigger value="dashboard">
            <BarChart3 className="h-4 w-4 mr-2" />
            Dashboard Simples
          </TabsTrigger>
          <TabsTrigger value="analitico">
            <LayoutDashboard className="h-4 w-4 mr-2" />
            Dashboard Analítico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chamados" className="space-y-4 mt-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4">
                <div className="flex gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por título ou número..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filtrar por status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="aberto">Abertos</SelectItem>
                      <SelectItem value="em_andamento">Em Andamento</SelectItem>
                      <SelectItem value="pendente">Pendentes</SelectItem>
                      <SelectItem value="resolvido">Resolvidos</SelectItem>
                      <SelectItem value="cancelado">Cancelados</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Filtros por período */}
                <div className="flex gap-4 items-end flex-wrap">
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">Dia</Label>
                    <Select value={filterDay} onValueChange={setFilterDay}>
                      <SelectTrigger className="w-24">
                        <SelectValue placeholder="Dia" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        {Array.from({ length: 31 }, (_, i) => (
                          <SelectItem key={i + 1} value={String(i + 1)}>
                            {String(i + 1).padStart(2, '0')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">Mês</Label>
                    <Select value={filterMonth} onValueChange={setFilterMonth}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Mês" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="1">Janeiro</SelectItem>
                        <SelectItem value="2">Fevereiro</SelectItem>
                        <SelectItem value="3">Março</SelectItem>
                        <SelectItem value="4">Abril</SelectItem>
                        <SelectItem value="5">Maio</SelectItem>
                        <SelectItem value="6">Junho</SelectItem>
                        <SelectItem value="7">Julho</SelectItem>
                        <SelectItem value="8">Agosto</SelectItem>
                        <SelectItem value="9">Setembro</SelectItem>
                        <SelectItem value="10">Outubro</SelectItem>
                        <SelectItem value="11">Novembro</SelectItem>
                        <SelectItem value="12">Dezembro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">Ano</Label>
                    <Select value={filterYear} onValueChange={setFilterYear}>
                      <SelectTrigger className="w-28">
                        <SelectValue placeholder="Ano" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        {Array.from({ length: 5 }, (_, i) => {
                          const year = new Date().getFullYear() - i;
                          return (
                            <SelectItem key={year} value={String(year)}>
                              {year}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {(filterDay !== "todos" || filterMonth !== "todos" || filterYear !== "todos") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFilterDay("todos");
                        setFilterMonth("todos");
                        setFilterYear("todos");
                      }}
                    >
                      Limpar filtros
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Lista de Chamados</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredChamados.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum chamado encontrado.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Título</TableHead>
                      <TableHead>Prioridade</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Prazo</TableHead>
                      <TableHead>Abertura</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredChamados.map((chamado) => {
                      const prazoStatus = getPrazoStatus(chamado);
                      return (
                        <TableRow key={chamado.id}>
                          <TableCell className="font-mono text-xs">{chamado.numero_chamado}</TableCell>
                          <TableCell className="font-medium max-w-xs truncate">{chamado.titulo}</TableCell>
                          <TableCell>
                            <Badge className={prioridadeColors[chamado.prioridade]}>
                              {chamado.prioridade.charAt(0).toUpperCase() + chamado.prioridade.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={statusColors[chamado.status]}>
                              {statusLabels[chamado.status]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {chamado.prazo_conclusao ? (
                              <div className="flex flex-col gap-1">
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(chamado.prazo_conclusao), "dd/MM HH:mm", { locale: ptBR })}
                                </span>
                                {prazoStatus && (
                                  <Badge className={prazoStatus.color} variant="outline">
                                    {prazoStatus.label}
                                  </Badge>
                                )}
                              </div>
                            ) : "-"}
                          </TableCell>
                          <TableCell>
                            {format(new Date(chamado.data_abertura), "dd/MM/yy HH:mm", { locale: ptBR })}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => openDetails(chamado)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dashboard" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle>Dashboard de Chamados</CardTitle>
                  <CardDescription>Visão geral dos chamados</CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-[140px] justify-start text-left font-normal",
                          !dashboardDataInicio && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dashboardDataInicio ? format(dashboardDataInicio, "dd/MM/yyyy") : "Data início"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dashboardDataInicio}
                        onSelect={setDashboardDataInicio}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-[140px] justify-start text-left font-normal",
                          !dashboardDataFim && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dashboardDataFim ? format(dashboardDataFim, "dd/MM/yyyy") : "Data fim"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dashboardDataFim}
                        onSelect={setDashboardDataFim}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                  {(dashboardDataInicio || dashboardDataFim) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDashboardDataInicio(undefined);
                        setDashboardDataFim(undefined);
                      }}
                    >
                      Limpar
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {(() => {
                const dashboardChamados = chamados.filter(c => {
                  const dataAbertura = parseISO(c.data_abertura);
                  if (dashboardDataInicio && isBefore(dataAbertura, startOfDay(dashboardDataInicio))) return false;
                  if (dashboardDataFim && isAfter(dataAbertura, endOfDay(dashboardDataFim))) return false;
                  return true;
                });
                return (
                  <>
                    <div className="mb-4 text-sm text-muted-foreground">
                      Total de chamados no período: <span className="font-semibold text-foreground">{dashboardChamados.length}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold mb-4">Por Prioridade</h4>
                        {['urgente', 'alta', 'media', 'baixa'].map(prioridade => {
                          const count = dashboardChamados.filter(c => c.prioridade === prioridade).length;
                          return (
                            <div key={prioridade} className="flex justify-between items-center p-2 border-b">
                              <Badge className={prioridadeColors[prioridade]}>
                                {prioridade.charAt(0).toUpperCase() + prioridade.slice(1)}
                              </Badge>
                              <span className="font-bold">{count}</span>
                            </div>
                          );
                        })}
                      </div>
                      <div>
                        <h4 className="font-semibold mb-4">Por Status</h4>
                        {Object.entries(statusLabels).map(([status, label]) => {
                          const count = dashboardChamados.filter(c => c.status === status).length;
                          return (
                            <div key={status} className="flex justify-between items-center p-2 border-b">
                              <Badge className={statusColors[status]}>{label}</Badge>
                              <span className="font-bold">{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analitico" className="mt-4">
          <ChamadosDashboard />
        </TabsContent>
      </Tabs>

      {/* Create Chamado Dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Chamado</DialogTitle>
            <DialogDescription>Abra um novo chamado para {setorLabels[setor]}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input
                value={chamadoForm.titulo}
                onChange={(e) => setChamadoForm({ ...chamadoForm, titulo: e.target.value })}
                placeholder="Resumo do problema"
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Textarea
                value={chamadoForm.descricao}
                onChange={(e) => setChamadoForm({ ...chamadoForm, descricao: e.target.value })}
                placeholder="Descreva o problema em detalhes"
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select 
                value={chamadoForm.prioridade}
                onValueChange={(v) => setChamadoForm({ ...chamadoForm, prioridade: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateChamado} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Abrir Chamado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={detailsDialog} onOpenChange={setDetailsDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chamado {selectedChamado?.numero_chamado}</DialogTitle>
          </DialogHeader>
          {selectedChamado && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="mt-1">
                    <Badge className={statusColors[selectedChamado.status]}>
                      {statusLabels[selectedChamado.status]}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Prioridade</Label>
                  <div className="mt-1">
                    <Badge className={prioridadeColors[selectedChamado.prioridade]}>
                      {selectedChamado.prioridade.charAt(0).toUpperCase() + selectedChamado.prioridade.slice(1)}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Prazo de Conclusão */}
              {selectedChamado.prazo_conclusao && (
                <div className="bg-muted/50 p-3 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-muted-foreground">Prazo de Conclusão</Label>
                      <p className="font-medium">
                        {format(new Date(selectedChamado.prazo_conclusao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    {(() => {
                      const prazoStatus = getPrazoStatus(selectedChamado);
                      return prazoStatus && (
                        <Badge className={prazoStatus.color}>
                          {prazoStatus.label}
                        </Badge>
                      );
                    })()}
                  </div>
                </div>
              )}
              
              <div>
                <Label className="text-muted-foreground">Título</Label>
                <p className="font-medium">{selectedChamado.titulo}</p>
              </div>
              
              <div>
                <Label className="text-muted-foreground">Descrição</Label>
                <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded">{selectedChamado.descricao}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Solicitante</Label>
                  <p>{selectedChamado.solicitante_nome}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Setor</Label>
                  <p>{selectedChamado.solicitante_setor || "-"}</p>
                </div>
              </div>

              {selectedChamado.solucao && (
                <div>
                  <Label className="text-muted-foreground">Solução</Label>
                  <p className="text-sm whitespace-pre-wrap bg-green-50 p-3 rounded border border-green-200">
                    {selectedChamado.solucao}
                  </p>
                </div>
              )}

              {/* Comentários */}
              <div>
                <Label className="text-muted-foreground flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Comentários
                </Label>
                <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                  {comentarios.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum comentário.</p>
                  ) : (
                    comentarios.map((c) => (
                      <div key={c.id} className="bg-muted p-2 rounded text-sm">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span className="font-medium">{c.usuario_nome}</span>
                          <span>{format(new Date(c.created_at), "dd/MM HH:mm")}</span>
                        </div>
                        <p>{c.comentario}</p>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="Adicionar comentário..."
                    value={novoComentario}
                    onChange={(e) => setNovoComentario(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddComentario()}
                  />
                  <Button size="sm" onClick={handleAddComentario} disabled={isSubmitting}>
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Materiais Utilizados (apenas para responsáveis) */}
              {isResponsavel && (
                <div className="border-t pt-4">
                  <Label className="text-muted-foreground flex items-center gap-2 mb-3">
                    <Package className="h-4 w-4" />
                    Materiais Utilizados
                  </Label>
                  
                  {/* Lista de materiais já adicionados */}
                  {materiaisUtilizados.length > 0 && (
                    <div className="space-y-2 mb-4 max-h-32 overflow-y-auto">
                      {materiaisUtilizados.map((m) => (
                        <div key={m.id} className="flex justify-between items-center bg-muted p-2 rounded text-sm">
                          <div>
                            <span className="font-medium">{m.produtos?.nome}</span>
                            {m.produtos?.codigo && (
                              <span className="text-xs text-muted-foreground ml-2">({m.produtos.codigo})</span>
                            )}
                          </div>
                          <Badge variant="outline">Qtd: {m.quantidade}</Badge>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Formulário para adicionar material */}
                  {selectedChamado.status !== 'resolvido' && selectedChamado.status !== 'cancelado' && (
                    <div className="space-y-3 bg-muted/30 p-3 rounded-lg">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Produto</Label>
                          <Select 
                            value={materialForm.produto_id}
                            onValueChange={(v) => setMaterialForm({ ...materialForm, produto_id: v })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecionar..." />
                            </SelectTrigger>
                            <SelectContent>
                              {produtos.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  <div className="flex items-center gap-2">
                                    <span>{p.nome}</span>
                                    <span className="text-xs text-muted-foreground">
                                      (Disp: {p.quantidade_atual ?? 0})
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Quantidade</Label>
                          <div className="flex items-center gap-2">
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="icon"
                              onClick={() => setMaterialForm({ 
                                ...materialForm, 
                                quantidade: Math.max(1, materialForm.quantidade - 1) 
                              })}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <Input
                              type="number"
                              min={1}
                              value={materialForm.quantidade}
                              onChange={(e) => setMaterialForm({ 
                                ...materialForm, 
                                quantidade: Math.max(1, parseInt(e.target.value) || 1) 
                              })}
                              className="text-center w-20"
                            />
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="icon"
                              onClick={() => setMaterialForm({ 
                                ...materialForm, 
                                quantidade: materialForm.quantidade + 1 
                              })}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Observação (opcional)</Label>
                        <Input
                          value={materialForm.observacao}
                          onChange={(e) => setMaterialForm({ ...materialForm, observacao: e.target.value })}
                          placeholder="Observação sobre o uso do material"
                        />
                      </div>
                      <Button 
                        size="sm" 
                        onClick={handleAddMaterial}
                        disabled={isAddingMaterial || !materialForm.produto_id}
                        className="w-full"
                      >
                        {isAddingMaterial && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        <Package className="h-4 w-4 mr-2" />
                        Registrar Material (Baixa Automática)
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Atualizar Status (apenas para responsáveis) */}
              {isResponsavel && selectedChamado.status !== 'resolvido' && selectedChamado.status !== 'cancelado' && (
                <div className="border-t pt-4">
                  <Label>Atualizar Status</Label>
                  <div className="flex gap-2 mt-2">
                    <Select value={novoStatus} onValueChange={setNovoStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aberto">Aberto</SelectItem>
                        <SelectItem value="em_andamento">Em Andamento</SelectItem>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="resolvido">Resolvido</SelectItem>
                        <SelectItem value="cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {novoStatus === 'resolvido' && (
                    <div className="mt-2">
                      <Label>Solução</Label>
                      <Textarea
                        value={solucao}
                        onChange={(e) => setSolucao(e.target.value)}
                        placeholder="Descreva a solução aplicada"
                        rows={3}
                      />
                    </div>
                  )}
                  <Button 
                    className="mt-2" 
                    onClick={handleUpdateStatus} 
                    disabled={isSubmitting || novoStatus === selectedChamado.status}
                  >
                    {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Atualizar
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Importação */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Importar Chamados
            </DialogTitle>
            <DialogDescription>
              Revise os dados antes de importar. {importPreview.length} registros encontrados.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto">
            {importPreview.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    {Object.keys(importPreview[0]).slice(0, 5).map((key) => (
                      <TableHead key={key} className="text-xs">{key}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importPreview.slice(0, 10).map((row, i) => (
                    <TableRow key={i}>
                      {Object.values(row).slice(0, 5).map((val, j) => (
                        <TableCell key={j} className="text-xs max-w-[200px] truncate">
                          {String(val || '-')}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {importPreview.length > 10 && (
              <p className="text-sm text-muted-foreground mt-2 text-center">
                ... e mais {importPreview.length - 10} registros
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmImport} disabled={isImporting}>
              {isImporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Importar {importPreview.length} chamados
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
