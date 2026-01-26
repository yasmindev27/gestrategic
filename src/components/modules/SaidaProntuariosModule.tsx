import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useLogAccess } from "@/hooks/useLogAccess";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  FileOutput, 
  Plus, 
  Search,
  Check,
  AlertCircle,
  Loader2,
  ClipboardCheck,
  Download,
  FileText,
  Calendar,
  Users,
  Filter,
  X,
  XCircle,
  Pencil,
  Save
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PdfPatientCounter } from "./PdfPatientCounter";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { exportToCSV, exportToPDF } from "@/lib/export-utils";

interface AnalysisResult {
  success: boolean;
  totalPdf: number;
  totalSistema: number;
  encontrados: number;
  faltando: number;
  pacientes: { nome: string; prontuario: string | null; status: 'encontrado' | 'faltando' }[];
  error?: string;
}

interface SaidaProntuario {
  id: string;
  numero_prontuario: string | null;
  paciente_nome: string | null;
  nascimento_mae: string | null;
  data_atendimento: string | null;
  status: string;
  registrado_recepcao_em: string | null;
  registrado_recepcao_por: string | null;
  validado_classificacao_em: string | null;
  validado_classificacao_por: string | null;
  existe_fisicamente: boolean | null;
  observacao_classificacao: string | null;
  conferido_nir_em: string | null;
  conferido_nir_por: string | null;
  observacao_nir: string | null;
  created_at: string;
}

export const SaidaProntuariosModule = () => {
  const { isRecepcao, isClassificacao, isNir, isAdmin, isFaturamento, userId, role, isLoading: isLoadingRole } = useUserRole();
  const { logAction } = useLogAccess();
  const { toast } = useToast();
  
  const [saidas, setSaidas] = useState<SaidaProntuario[]>([]);
  const [faltantesSalus, setFaltantesSalus] = useState<SaidaProntuario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [newProntuarioOpen, setNewProntuarioOpen] = useState(false);
  const [validarOpen, setValidarOpen] = useState(false);
  const [selectedSaida, setSelectedSaida] = useState<SaidaProntuario | null>(null);
  
  // Filter states
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [showFilters, setShowFilters] = useState(false);
  const [salusAnalysis, setSalusAnalysis] = useState<AnalysisResult | null>(null);
  
  // Filters for faltantes section
  const [faltantesSearchTerm, setFaltantesSearchTerm] = useState("");
  const [faltantesDataInicio, setFaltantesDataInicio] = useState("");
  const [faltantesDataFim, setFaltantesDataFim] = useState("");
  
  // Form states
  const [pacienteNome, setPacienteNome] = useState("");
  const [nascimentoMae, setNascimentoMae] = useState("");
  const [dataAtendimento, setDataAtendimento] = useState("");
  const [existeFisicamente, setExisteFisicamente] = useState(true);
  const [observacao, setObservacao] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Edit states (admin only)
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingSaida, setEditingSaida] = useState<SaidaProntuario | null>(null);
  const [editPacienteNome, setEditPacienteNome] = useState("");
  const [editNascimentoMae, setEditNascimentoMae] = useState("");
  const [editDataAtendimento, setEditDataAtendimento] = useState("");

  const canAccess = isRecepcao || isClassificacao || isNir || isAdmin || isFaturamento;
  const canInsert = isRecepcao || isClassificacao || isNir || isAdmin;
  const canValidateClassificacao = isClassificacao || isAdmin;
  const canValidateNir = isNir || isAdmin;

  useEffect(() => {
    if (!isLoadingRole && canAccess) {
      fetchSaidas();
      logAction("acesso", "saida_prontuarios", { role: role || "unknown" });
    }
  }, [canAccess, isLoadingRole, role]);

  const fetchSaidas = async () => {
    setIsLoading(true);
    try {
      // Fetch regular saidas (excluding Salus imports)
      // Need to use OR filter: observacao_classificacao is null OR does not contain 'Importado via Salus'
      const { data: regularData, error: regularError } = await supabase
        .from("saida_prontuarios")
        .select("*")
        .or('observacao_classificacao.is.null,observacao_classificacao.not.ilike.%Importado via Salus%')
        .order("created_at", { ascending: false });

      if (regularError) throw regularError;
      setSaidas(regularData || []);

      // Fetch Salus imports separately
      const { data: salusData, error: salusError } = await supabase
        .from("saida_prontuarios")
        .select("*")
        .ilike('observacao_classificacao', '%Importado via Salus%')
        .order("created_at", { ascending: false });

      if (salusError) throw salusError;
      setFaltantesSalus(salusData || []);
    } catch (error) {
      console.error("Error fetching saidas:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar lista de saída.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSaida = async () => {
    if (!pacienteNome.trim() || !dataAtendimento || !userId) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("saida_prontuarios")
        .insert({
          paciente_nome: pacienteNome.trim(),
          nascimento_mae: nascimentoMae || null,
          data_atendimento: dataAtendimento,
          registrado_recepcao_por: userId,
          registrado_recepcao_em: new Date().toISOString(),
          status: "aguardando_classificacao",
        });

      if (error) throw error;

      await logAction("registrar_saida", "saida_prontuarios", { 
        paciente: pacienteNome,
        data_atendimento: dataAtendimento 
      });

      toast({
        title: "Sucesso",
        description: "Saída de prontuário registrada!",
      });

      setNewProntuarioOpen(false);
      setPacienteNome("");
      setNascimentoMae("");
      setDataAtendimento("");
      fetchSaidas();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Erro",
        description: "Erro ao registrar saída.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleValidarClassificacao = async () => {
    if (!selectedSaida || !userId) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("saida_prontuarios")
        .update({
          validado_classificacao_por: userId,
          validado_classificacao_em: new Date().toISOString(),
          existe_fisicamente: existeFisicamente,
          observacao_classificacao: observacao || null,
          status: "aguardando_nir",
        })
        .eq("id", selectedSaida.id);

      if (error) throw error;

      await logAction("validar_classificacao", "saida_prontuarios", { 
        id: selectedSaida.id,
        paciente: selectedSaida.paciente_nome,
        existe: existeFisicamente
      });

      toast({
        title: "Sucesso",
        description: "Validação de classificação registrada!",
      });

      setValidarOpen(false);
      setSelectedSaida(null);
      setObservacao("");
      setExisteFisicamente(true);
      fetchSaidas();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Erro",
        description: "Erro ao validar.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleValidarNir = async () => {
    if (!selectedSaida || !userId) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("saida_prontuarios")
        .update({
          conferido_nir_por: userId,
          conferido_nir_em: new Date().toISOString(),
          observacao_nir: observacao || null,
          status: "aguardando_faturamento",
        })
        .eq("id", selectedSaida.id);

      if (error) throw error;

      await logAction("validar_nir", "saida_prontuarios", { 
        id: selectedSaida.id,
        paciente: selectedSaida.paciente_nome
      });

      toast({
        title: "Sucesso",
        description: "Conferência NIR registrada!",
      });

      setValidarOpen(false);
      setSelectedSaida(null);
      setObservacao("");
      fetchSaidas();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Erro",
        description: "Erro ao conferir.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open edit dialog (admin only)
  const handleOpenEdit = (saida: SaidaProntuario) => {
    setEditingSaida(saida);
    setEditPacienteNome(saida.paciente_nome || "");
    setEditNascimentoMae(saida.nascimento_mae || "");
    setEditDataAtendimento(saida.data_atendimento || "");
    setEditDialogOpen(true);
  };

  // Save edit (admin only)
  const handleSaveEdit = async () => {
    if (!editingSaida || !editPacienteNome.trim() || !editDataAtendimento) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("saida_prontuarios")
        .update({
          paciente_nome: editPacienteNome.trim(),
          nascimento_mae: editNascimentoMae || null,
          data_atendimento: editDataAtendimento,
        })
        .eq("id", editingSaida.id);

      if (error) throw error;

      await logAction("editar_prontuario", "saida_prontuarios", { 
        id: editingSaida.id,
        paciente: editPacienteNome.trim(),
        data_atendimento: editDataAtendimento
      });

      toast({
        title: "Sucesso",
        description: "Registro atualizado com sucesso!",
      });

      setEditDialogOpen(false);
      setEditingSaida(null);
      fetchSaidas();
    } catch (error) {
      console.error("Error updating:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar registro.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      aguardando_classificacao: { label: "Aguardando Classificação", className: "bg-warning text-warning-foreground" },
      aguardando_nir: { label: "Aguardando NIR", className: "bg-info text-info-foreground" },
      aguardando_faturamento: { label: "Aguardando Faturamento", className: "bg-primary text-primary-foreground" },
      em_avaliacao: { label: "Em Avaliação", className: "bg-secondary text-secondary-foreground" },
      concluido: { label: "Concluído", className: "bg-success text-success-foreground" },
      pendente: { label: "Pendente", className: "bg-destructive text-destructive-foreground" },
    };
    
    const config = statusConfig[status] || { label: status, className: "bg-secondary" };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getActionButton = (saida: SaidaProntuario) => {
    const buttons = [];
    
    // Edit button for admin
    if (isAdmin) {
      buttons.push(
        <Button 
          key="edit"
          size="sm" 
          variant="ghost"
          onClick={() => handleOpenEdit(saida)}
          title="Editar registro"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      );
    }
    
    if (canValidateClassificacao && saida.status === "aguardando_classificacao") {
      buttons.push(
        <Button 
          key="validar"
          size="sm" 
          variant="outline"
          onClick={() => {
            setSelectedSaida(saida);
            setValidarOpen(true);
          }}
        >
          <ClipboardCheck className="h-4 w-4 mr-1" />
          Validar
        </Button>
      );
    }
    
    if (canValidateNir && saida.status === "aguardando_nir") {
      buttons.push(
        <Button 
          key="conferir"
          size="sm" 
          variant="outline"
          onClick={() => {
            setSelectedSaida(saida);
            setValidarOpen(true);
          }}
        >
          <Check className="h-4 w-4 mr-1" />
          Conferir
        </Button>
      );
    }

    if (buttons.length === 0) return null;
    
    return <div className="flex gap-1">{buttons}</div>;
  };

  // Apply all filters
  const filteredSaidas = saidas.filter(s => {
    // Text search - only by patient name now
    const matchesSearch = 
      !searchTerm ||
      (s.paciente_nome && s.paciente_nome.toLowerCase().includes(searchTerm.toLowerCase()));

    // Date filter
    let matchesDate = true;
    if (dataInicio || dataFim) {
      const recordDate = new Date(s.created_at);
      if (dataInicio) {
        const startDate = new Date(dataInicio);
        startDate.setHours(0, 0, 0, 0);
        matchesDate = matchesDate && recordDate >= startDate;
      }
      if (dataFim) {
        const endDate = new Date(dataFim);
        endDate.setHours(23, 59, 59, 999);
        matchesDate = matchesDate && recordDate <= endDate;
      }
    }

    // Status filter
    const matchesStatus = statusFilter === "todos" || s.status === statusFilter;

    return matchesSearch && matchesDate && matchesStatus;
  });

  const clearFilters = () => {
    setSearchTerm("");
    setDataInicio("");
    setDataFim("");
    setStatusFilter("todos");
  };

  const hasActiveFilters = searchTerm || dataInicio || dataFim || statusFilter !== "todos";

  // Check if a record is missing from Salus analysis
  const isMissingFromSalus = (saida: SaidaProntuario): boolean => {
    if (!salusAnalysis || !salusAnalysis.success) return false;
    
    const normalizeText = (text: string) => 
      text.toLowerCase().trim()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ");
    
    // Find matching patient in Salus analysis that is marked as "faltando"
    return salusAnalysis.pacientes.some(p => {
      if (p.status !== 'faltando') return false;
      
      // Check by name only (numero_prontuario no longer used)
      if (p.nome && saida.paciente_nome) {
        const pdfNome = normalizeText(p.nome);
        const saidaNome = normalizeText(saida.paciente_nome);
        if (pdfNome === saidaNome || pdfNome.includes(saidaNome) || saidaNome.includes(pdfNome)) {
          return true;
        }
      }
      
      return false;
    });
  };

  // Get filtered faltantes from database
  const filteredFaltantesSalus = faltantesSalus.filter(s => {
    // Text search - only by patient name now
    const matchesSearch = 
      !faltantesSearchTerm ||
      (s.paciente_nome && s.paciente_nome.toLowerCase().includes(faltantesSearchTerm.toLowerCase()));

    let matchesDate = true;
    if (faltantesDataInicio || faltantesDataFim) {
      const recordDate = new Date(s.created_at);
      if (faltantesDataInicio) {
        const startDate = new Date(faltantesDataInicio);
        startDate.setHours(0, 0, 0, 0);
        matchesDate = matchesDate && recordDate >= startDate;
      }
      if (faltantesDataFim) {
        const endDate = new Date(faltantesDataFim);
        endDate.setHours(23, 59, 59, 999);
        matchesDate = matchesDate && recordDate <= endDate;
      }
    }

    return matchesSearch && matchesDate;
  });

  const clearFaltantesFilters = () => {
    setFaltantesSearchTerm("");
    setFaltantesDataInicio("");
    setFaltantesDataFim("");
  };

  const hasFaltantesActiveFilters = faltantesSearchTerm || faltantesDataInicio || faltantesDataFim;

  const getFaltantesExportData = () => {
    const headers = ['Paciente', 'Data Nascimento', 'Data Atendimento', 'Status'];
    const rows = filteredFaltantesSalus.map(s => [
      s.paciente_nome || '-',
      s.nascimento_mae ? format(new Date(s.nascimento_mae + "T12:00:00"), "dd/MM/yyyy") : '-',
      s.data_atendimento ? format(new Date(s.data_atendimento + "T12:00:00"), "dd/MM/yyyy") : '-',
      'Falta prontuário físico',
    ]);
    return { headers, rows };
  };

  const handleExportFaltantesCSV = () => {
    if (filteredFaltantesSalus.length === 0) return;
    const { headers, rows } = getFaltantesExportData();
    exportToCSV({
      title: 'Prontuários Faltantes - Salus',
      headers,
      rows,
      fileName: 'prontuarios_faltantes_salus',
    });
    toast({
      title: "Exportado!",
      description: `${filteredFaltantesSalus.length} registro(s) exportado(s) para CSV.`,
    });
  };

  const handleExportFaltantesPDF = () => {
    if (filteredFaltantesSalus.length === 0) return;
    const { headers, rows } = getFaltantesExportData();
    exportToPDF({
      title: 'Prontuários Faltantes - Salus',
      headers,
      rows,
      fileName: 'prontuarios_faltantes_salus',
      orientation: 'portrait',
    });
    toast({
      title: "Exportado!",
      description: `${filteredFaltantesSalus.length} registro(s) exportado(s) para PDF.`,
    });
  };

  const getExportData = () => {
    const headers = ['Paciente', 'Data Nasc.', 'Data Atendimento', 'Status', 'Recepção', 'Classificação', 'NIR'];
    const rows = filteredSaidas.map(s => [
      s.paciente_nome || '-',
      s.nascimento_mae ? format(new Date(s.nascimento_mae), "dd/MM/yyyy") : '-',
      s.data_atendimento ? format(new Date(s.data_atendimento), "dd/MM/yyyy") : '-',
      s.status,
      s.registrado_recepcao_em ? format(new Date(s.registrado_recepcao_em), "dd/MM/yy HH:mm") : '-',
      s.validado_classificacao_em ? format(new Date(s.validado_classificacao_em), "dd/MM/yy HH:mm") : '-',
      s.conferido_nir_em ? format(new Date(s.conferido_nir_em), "dd/MM/yy HH:mm") : '-',
    ]);
    return { headers, rows };
  };

  const handleExportCSV = () => {
    if (filteredSaidas.length === 0) {
      toast({
        title: "Aviso",
        description: "Não há dados para exportar.",
        variant: "destructive",
      });
      return;
    }

    const { headers, rows } = getExportData();
    exportToCSV({
      title: 'Saída de Prontuários',
      headers,
      rows,
      fileName: 'saida_prontuarios',
    });

    toast({
      title: "Exportado!",
      description: `${filteredSaidas.length} registro(s) exportado(s) para CSV.`,
    });
  };

  const handleExportPDF = () => {
    if (filteredSaidas.length === 0) {
      toast({
        title: "Aviso",
        description: "Não há dados para exportar.",
        variant: "destructive",
      });
      return;
    }

    const { headers, rows } = getExportData();
    exportToPDF({
      title: 'Saída de Prontuários',
      headers,
      rows,
      fileName: 'saida_prontuarios',
      orientation: 'landscape',
    });

    toast({
      title: "Exportado!",
      description: `${filteredSaidas.length} registro(s) exportado(s) para PDF.`,
    });
  };

  if (isLoadingRole) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span>Você não tem permissão para acessar este módulo.</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Lista de Saída de Prontuários</h2>
          <p className="text-muted-foreground">Controle de fluxo entre setores</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PdfPatientCounter onAnalysisComplete={setSalusAnalysis} onLaunchComplete={fetchSaidas} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportCSV}>
                <FileText className="h-4 w-4 mr-2" />
                Exportar CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF}>
                <FileText className="h-4 w-4 mr-2" />
                Exportar PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {canInsert && (
            <Dialog open={newProntuarioOpen} onOpenChange={setNewProntuarioOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Registrar Saída
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Registrar Saída de Prontuário</DialogTitle>
                </DialogHeader>
                <div 
                  className="space-y-4 pt-4"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && pacienteNome.trim() && dataAtendimento && !isSubmitting) {
                      e.preventDefault();
                      handleAddSaida();
                    }
                  }}
                >
                  <div>
                    <label className="text-sm font-medium">Paciente <span className="text-destructive">*</span></label>
                    <Input
                      value={pacienteNome}
                      onChange={(e) => setPacienteNome(e.target.value)}
                      placeholder="Nome completo do paciente"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Data de Nascimento</label>
                    <Input
                      type="date"
                      value={nascimentoMae}
                      onChange={(e) => setNascimentoMae(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Data de Atendimento <span className="text-destructive">*</span></label>
                    <Input
                      type="date"
                      value={dataAtendimento}
                      onChange={(e) => setDataAtendimento(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    onClick={handleAddSaida} 
                    disabled={!pacienteNome.trim() || !dataAtendimento || isSubmitting}
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <FileOutput className="h-4 w-4 mr-2" />
                    )}
                    Registrar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome do paciente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button 
                variant={showFilters ? "secondary" : "outline"} 
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtros
                {hasActiveFilters && (
                  <Badge className="ml-2 bg-primary text-primary-foreground" variant="secondary">
                    {[searchTerm, dataInicio, dataFim, statusFilter !== "todos"].filter(Boolean).length}
                  </Badge>
                )}
              </Button>
            </div>

            {showFilters && (
              <div className="flex flex-col md:flex-row gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-1 block">Data Início</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="date"
                      value={dataInicio}
                      onChange={(e) => setDataInicio(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium mb-1 block">Data Fim</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="date"
                      value={dataFim}
                      onChange={(e) => setDataFim(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium mb-1 block">Status</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="aguardando_classificacao">Aguardando Classificação</SelectItem>
                      <SelectItem value="aguardando_nir">Aguardando NIR</SelectItem>
                      <SelectItem value="aguardando_faturamento">Aguardando Faturamento</SelectItem>
                      <SelectItem value="em_avaliacao">Em Avaliação</SelectItem>
                      <SelectItem value="concluido">Concluído</SelectItem>
                      <SelectItem value="pendente">Pendente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {hasActiveFilters && (
                  <div className="flex items-end">
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      <X className="h-4 w-4 mr-1" />
                      Limpar
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Total Counter */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Registros</p>
                <p className="text-2xl font-bold text-primary">{filteredSaidas.length}</p>
              </div>
            </div>
            {hasActiveFilters && (
              <div className="text-sm text-muted-foreground">
                de {saidas.length} registros totais
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Prontuários em Fluxo</CardTitle>
          <CardDescription>
            {role === "recepcao" && "Registre a saída inicial dos prontuários físicos."}
            {role === "classificacao" && "Valide se os prontuários registrados existem fisicamente."}
            {role === "nir" && "Confira e valide os registros da Classificação."}
            {isFaturamento && "Visualização dos prontuários em fluxo."}
            {isAdmin && "Visualização completa de todos os fluxos."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredSaidas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum prontuário encontrado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Data Nasc.</TableHead>
                    <TableHead>Data Atendimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Recepção</TableHead>
                    <TableHead>Classificação</TableHead>
                    <TableHead>NIR</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSaidas.map((saida) => {
                    const missingFromSalus = isMissingFromSalus(saida);
                    return (
                      <TableRow 
                        key={saida.id}
                        className={missingFromSalus ? "bg-destructive/10 border-l-4 border-l-destructive" : ""}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {saida.paciente_nome || "-"}
                            {missingFromSalus && (
                              <Badge variant="destructive" className="text-xs">
                                Falta Salus
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {saida.nascimento_mae 
                            ? format(new Date(saida.nascimento_mae + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {saida.data_atendimento 
                            ? format(new Date(saida.data_atendimento + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })
                            : "-"}
                        </TableCell>
                        <TableCell>{getStatusBadge(saida.status)}</TableCell>
                        <TableCell>
                          {saida.registrado_recepcao_em 
                            ? format(new Date(saida.registrado_recepcao_em), "dd/MM/yy HH:mm", { locale: ptBR })
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            {saida.validado_classificacao_em 
                              ? format(new Date(saida.validado_classificacao_em), "dd/MM/yy HH:mm", { locale: ptBR })
                              : "-"}
                            {saida.existe_fisicamente !== null && (
                              <span className={`text-xs ${saida.existe_fisicamente ? "text-success" : "text-destructive"}`}>
                                {saida.existe_fisicamente ? "✓ Existe" : "✗ Não existe"}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {saida.conferido_nir_em 
                            ? format(new Date(saida.conferido_nir_em), "dd/MM/yy HH:mm", { locale: ptBR })
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {getActionButton(saida)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prontuários Faltantes - Importados via Salus */}
      <Card className="bg-destructive/5 border-destructive/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                Prontuários Faltantes (Importados Salus)
              </CardTitle>
              <CardDescription>
                {faltantesSalus.length > 0
                  ? `${faltantesSalus.length} prontuário(s) importado(s) do Salus aguardando localização física`
                  : "Nenhum prontuário faltante - utilize o botão 'Importar PDF' e 'Lançar Faltando' para registrar discrepâncias"
                }
              </CardDescription>
            </div>
            <Badge variant="destructive" className="w-fit">
              {filteredFaltantesSalus.length} de {faltantesSalus.length} registro(s)
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {faltantesSalus.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Utilize o botão "Importar PDF" acima para analisar discrepâncias.</p>
              <p className="text-sm mt-1">Depois clique em "Lançar Faltando" para registrar os prontuários ausentes.</p>
            </div>
          ) : (
            <>
              {/* Search and Filters */}
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome do paciente..."
                    value={faltantesSearchTerm}
                    onChange={(e) => setFaltantesSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="date"
                        value={faltantesDataInicio}
                        onChange={(e) => setFaltantesDataInicio(e.target.value)}
                        className="pl-10 w-40"
                        placeholder="De"
                      />
                    </div>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="date"
                        value={faltantesDataFim}
                        onChange={(e) => setFaltantesDataFim(e.target.value)}
                        className="pl-10 w-40"
                        placeholder="Até"
                      />
                    </div>
                  </div>
                  {hasFaltantesActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFaltantesFilters}>
                      <X className="h-4 w-4 mr-1" />
                      Limpar
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Exportar
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handleExportFaltantesCSV}>
                        <FileText className="h-4 w-4 mr-2" />
                        Exportar CSV
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleExportFaltantesPDF}>
                        <FileText className="h-4 w-4 mr-2" />
                        Exportar PDF
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-md border bg-background">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Paciente</TableHead>
                      <TableHead>Data Nasc.</TableHead>
                      <TableHead>Data Atendimento</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFaltantesSalus.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          Nenhum registro encontrado com os filtros aplicados
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredFaltantesSalus.map((item, index) => (
                        <TableRow key={item.id} className="bg-destructive/5">
                          <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>
                          <TableCell className="font-medium">{item.paciente_nome || '-'}</TableCell>
                          <TableCell>
                            {item.nascimento_mae
                              ? format(new Date(item.nascimento_mae + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })
                              : '-'}
                          </TableCell>
                          <TableCell>
                            {item.data_atendimento
                              ? format(new Date(item.data_atendimento + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })
                              : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                              <XCircle className="h-3 w-3" />
                              Falta prontuário físico
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Validation Dialog */}
      <Dialog open={validarOpen} onOpenChange={setValidarOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedSaida?.status === "aguardando_classificacao" 
                ? "Validar Classificação" 
                : "Conferência NIR"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <label className="text-sm font-medium">Nome do Paciente</label>
              <Input value={selectedSaida?.paciente_nome || "-"} disabled />
            </div>
            <div>
              <label className="text-sm font-medium">Data de Nascimento</label>
              <Input 
                value={selectedSaida && selectedSaida.nascimento_mae 
                  ? format(new Date(selectedSaida.nascimento_mae + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })
                  : "-"
                } 
                disabled 
              />
            </div>
            <div>
              <label className="text-sm font-medium">Data de Atendimento</label>
              <Input 
                value={selectedSaida && selectedSaida.data_atendimento 
                  ? format(new Date(selectedSaida.data_atendimento + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })
                  : "-"
                } 
                disabled 
              />
            </div>
            
            {selectedSaida?.status === "aguardando_classificacao" && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="existeFisicamente"
                  checked={existeFisicamente}
                  onCheckedChange={(checked) => setExisteFisicamente(checked as boolean)}
                />
                <label htmlFor="existeFisicamente" className="text-sm font-medium cursor-pointer">
                  Prontuário existe fisicamente
                </label>
              </div>
            )}
            
            <div>
              <label className="text-sm font-medium">Observações (opcional)</label>
              <Textarea
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Adicione observações..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={selectedSaida?.status === "aguardando_classificacao" 
                ? handleValidarClassificacao 
                : handleValidarNir
              }
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog (Admin Only) */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Registro de Prontuário</DialogTitle>
          </DialogHeader>
          <div 
            className="space-y-4 pt-4"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && editPacienteNome.trim() && editDataAtendimento && !isSubmitting) {
                e.preventDefault();
                handleSaveEdit();
              }
            }}
          >
            <div>
              <label className="text-sm font-medium">Paciente <span className="text-destructive">*</span></label>
              <Input
                value={editPacienteNome}
                onChange={(e) => setEditPacienteNome(e.target.value)}
                placeholder="Nome completo do paciente"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Data de Nascimento</label>
              <Input
                type="date"
                value={editNascimentoMae}
                onChange={(e) => setEditNascimentoMae(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Data de Atendimento <span className="text-destructive">*</span></label>
              <Input
                type="date"
                value={editDataAtendimento}
                onChange={(e) => setEditDataAtendimento(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveEdit} 
              disabled={!editPacienteNome.trim() || !editDataAtendimento || isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
