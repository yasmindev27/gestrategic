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
  Save,
  FileStack
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PdfPatientCounter } from "./PdfPatientCounter";
import { useToast } from "@/hooks/use-toast";
import { exportToCSV, exportToPDF } from "@/lib/export-utils";
import { safeFormatDate } from "@/lib/brasilia-time";

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
  is_folha_avulsa: boolean | null;
  possui_carimbo_medico: boolean | null;
  created_at: string;
}

export const SaidaProntuariosModule = () => {
  const { isRecepcao, isClassificacao, isNir, isAdmin, isFaturamento, userId, role, isLoading: isLoadingRole } = useUserRole();
  const { logAction } = useLogAccess();
  const { toast } = useToast();
  
  const [saidas, setSaidas] = useState<SaidaProntuario[]>([]);
  const [folhasAvulsas, setFolhasAvulsas] = useState<SaidaProntuario[]>([]);
  const [faltantesSalus, setFaltantesSalus] = useState<SaidaProntuario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Contagens reais (independente do limite de 1000 linhas)
  const [totalSaidasCount, setTotalSaidasCount] = useState(0);
  const [totalSaidasHojeCount, setTotalSaidasHojeCount] = useState(0);
  const [totalFolhasCount, setTotalFolhasCount] = useState(0);
  const [totalFaltantesCount, setTotalFaltantesCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [newProntuarioOpen, setNewProntuarioOpen] = useState(false);
  const [newFolhaAvulsaOpen, setNewFolhaAvulsaOpen] = useState(false);
  const [validarOpen, setValidarOpen] = useState(false);
  const [selectedSaida, setSelectedSaida] = useState<SaidaProntuario | null>(null);
  
  // Filter states
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("em_fluxo");
  const [showFilters, setShowFilters] = useState(false);
  const [salusAnalysis, setSalusAnalysis] = useState<AnalysisResult | null>(null);
  
  // Filters for faltantes section
  const [faltantesSearchTerm, setFaltantesSearchTerm] = useState("");
  const [faltantesDataInicio, setFaltantesDataInicio] = useState("");
  const [faltantesDataFim, setFaltantesDataFim] = useState("");
  
  // Filters for folhas avulsas section
  const [folhasSearchTerm, setFolhasSearchTerm] = useState("");
  const [folhasDataInicio, setFolhasDataInicio] = useState("");
  const [folhasDataFim, setFolhasDataFim] = useState("");
  
  // Form states
  const [pacienteNome, setPacienteNome] = useState("");
  const [nascimentoMae, setNascimentoMae] = useState("");
  const [dataAtendimento, setDataAtendimento] = useState("");
  const [possuiCarimboMedico, setPossuiCarimboMedico] = useState(false);
  const [existeFisicamente, setExisteFisicamente] = useState(true);
  const [observacao, setObservacao] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Folha Avulsa form states
  const [folhaAvulsaPaciente, setFolhaAvulsaPaciente] = useState("");
  const [folhaAvulsaNascimento, setFolhaAvulsaNascimento] = useState("");
  const [folhaAvulsaDataAtendimento, setFolhaAvulsaDataAtendimento] = useState("");
  const [folhaAvulsaObservacao, setFolhaAvulsaObservacao] = useState("");
  
  // Edit states (admin only)
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingSaida, setEditingSaida] = useState<SaidaProntuario | null>(null);
  const [editPacienteNome, setEditPacienteNome] = useState("");
  const [editNascimentoMae, setEditNascimentoMae] = useState("");
  const [editDataAtendimento, setEditDataAtendimento] = useState("");

  const canAccess = isRecepcao || isClassificacao || isNir || isAdmin || isFaturamento;
  const canInsert = isRecepcao || isClassificacao || isNir || isAdmin || isFaturamento;
  const canValidateClassificacao = isClassificacao || isAdmin;
  const canValidateNir = isNir || isAdmin;

  // Pagination
  const PAGE_SIZE = 100;
  const [saidasPage, setSaidasPage] = useState(0);
  const [folhasPage, setFolhasPage] = useState(0);
  const [faltantesPage, setFaltantesPage] = useState(0);

  // Section visibility: only one section visible at a time
  type VisibleSection = "fluxo" | "folhas" | "faltantes" | null;
  const [visibleSection, setVisibleSection] = useState<VisibleSection>("fluxo");

  useEffect(() => {
    if (!isLoadingRole && canAccess) {
      fetchCounts();
      logAction("acesso", "saida_prontuarios", { role: role || "unknown" });
    }
  }, [canAccess, isLoadingRole, role]);

  // Fetch only counts on load (very fast)
  const fetchCounts = async () => {
    setIsLoading(true);
    try {
      const hoje = new Date().toISOString().split('T')[0];
      const [regularCount, regularHojeCount, folhasCount, salusCount] = await Promise.all([
        supabase.from("saida_prontuarios").select("*", { count: "exact", head: true })
          .eq("is_folha_avulsa", false)
          .or("observacao_classificacao.is.null,observacao_classificacao.not.ilike.%importado via salus%"),
        supabase.from("saida_prontuarios").select("*", { count: "exact", head: true })
          .eq("is_folha_avulsa", false)
          .or("observacao_classificacao.is.null,observacao_classificacao.not.ilike.%importado via salus%")
          .gte("data_atendimento", hoje)
          .lte("data_atendimento", hoje),
        supabase.from("saida_prontuarios").select("*", { count: "exact", head: true })
          .eq("is_folha_avulsa", true),
        supabase.from("saida_prontuarios").select("*", { count: "exact", head: true })
          .ilike("observacao_classificacao", "%importado via salus%"),
      ]);
      setTotalSaidasCount(regularCount.count ?? 0);
      setTotalSaidasHojeCount(regularHojeCount.count ?? 0);
      setTotalFolhasCount(folhasCount.count ?? 0);
      setTotalFaltantesCount(salusCount.count ?? 0);
    } finally {
      setIsLoading(false);
    }
    fetchSaidasPage(0);
    fetchFolhasPage(0);
    fetchFaltantesPage(0);
  };

  const fetchSaidasPage = async (page: number) => {
    const from = page * PAGE_SIZE;
    let query = supabase
      .from("saida_prontuarios")
      .select("*")
      .eq("is_folha_avulsa", false)
      .or("observacao_classificacao.is.null,observacao_classificacao.not.ilike.%importado via salus%")
      .order("data_atendimento", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (debouncedSearchTerm) query = query.ilike("paciente_nome", `%${debouncedSearchTerm}%`);
    if (dataInicio) query = query.gte("data_atendimento", dataInicio);
    if (dataFim) query = query.lte("data_atendimento", dataFim);
    
    if (statusFilter === "em_fluxo") {
      query = query.neq("status", "concluido");
    } else if (statusFilter !== "todos") {
      query = query.eq("status", statusFilter);
    }

    const { data, error } = await query;
    if (!error && data) setSaidas(data as SaidaProntuario[]);
    setSaidasPage(page);
  };

  const fetchFolhasPage = async (page: number) => {
    const from = page * PAGE_SIZE;
    let query = supabase
      .from("saida_prontuarios")
      .select("*")
      .eq("is_folha_avulsa", true)
      .order("data_atendimento", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (debouncedFolhasSearch) query = query.ilike("paciente_nome", `%${debouncedFolhasSearch}%`);
    if (folhasDataInicio) query = query.gte("data_atendimento", folhasDataInicio);
    if (folhasDataFim) query = query.lte("data_atendimento", folhasDataFim);

    const { data, error } = await query;
    if (!error && data) setFolhasAvulsas(data as SaidaProntuario[]);
    setFolhasPage(page);
  };

  const fetchFaltantesPage = async (page: number) => {
    const from = page * PAGE_SIZE;
    let query = supabase
      .from("saida_prontuarios")
      .select("*")
      .ilike("observacao_classificacao", "%importado via salus%")
      .order("data_atendimento", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (debouncedFaltantesSearch) query = query.ilike("paciente_nome", `%${debouncedFaltantesSearch}%`);
    if (faltantesDataInicio) query = query.gte("data_atendimento", faltantesDataInicio);
    if (faltantesDataFim) query = query.lte("data_atendimento", faltantesDataFim);

    const { data, error } = await query;
    if (!error && data) setFaltantesSalus(data as SaidaProntuario[]);
    setFaltantesPage(page);
  };

  // Debounced search values
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [debouncedFaltantesSearch, setDebouncedFaltantesSearch] = useState("");
  const [debouncedFolhasSearch, setDebouncedFolhasSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearchTerm(searchTerm), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedFaltantesSearch(faltantesSearchTerm), 400);
    return () => clearTimeout(t);
  }, [faltantesSearchTerm]);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedFolhasSearch(folhasSearchTerm), 400);
    return () => clearTimeout(t);
  }, [folhasSearchTerm]);

  // Re-fetch when filters change (debounced)
  useEffect(() => {
    if (!isLoadingRole && canAccess) {
      fetchSaidasPage(0);
    }
  }, [debouncedSearchTerm, dataInicio, dataFim, statusFilter]);

  useEffect(() => {
    if (!isLoadingRole && canAccess) {
      fetchFolhasPage(0);
    }
  }, [debouncedFolhasSearch, folhasDataInicio, folhasDataFim]);

  useEffect(() => {
    if (!isLoadingRole && canAccess) {
      fetchFaltantesPage(0);
    }
  }, [debouncedFaltantesSearch, faltantesDataInicio, faltantesDataFim]);

  const fetchSaidas = async () => {
    await fetchCounts();
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
          possui_carimbo_medico: possuiCarimboMedico,
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
      setPossuiCarimboMedico(false);
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

  const handleAddFolhaAvulsa = async () => {
    if (!folhaAvulsaPaciente.trim() || !folhaAvulsaDataAtendimento || !userId) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("saida_prontuarios")
        .insert({
          paciente_nome: folhaAvulsaPaciente.trim(),
          nascimento_mae: folhaAvulsaNascimento || null,
          data_atendimento: folhaAvulsaDataAtendimento,
          registrado_recepcao_por: userId,
          registrado_recepcao_em: new Date().toISOString(),
          status: "aguardando_classificacao",
          is_folha_avulsa: true,
          observacao_classificacao: folhaAvulsaObservacao || null,
        });

      if (error) throw error;

      await logAction("registrar_folha_avulsa", "saida_prontuarios", { 
        paciente: folhaAvulsaPaciente,
        data_atendimento: folhaAvulsaDataAtendimento 
      });

      toast({
        title: "Sucesso",
        description: "Folha avulsa registrada!",
      });

      setNewFolhaAvulsaOpen(false);
      setFolhaAvulsaPaciente("");
      setFolhaAvulsaNascimento("");
      setFolhaAvulsaDataAtendimento("");
      setFolhaAvulsaObservacao("");
      fetchSaidas();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Erro",
        description: "Erro ao registrar folha avulsa.",
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

  // Server-side filtered — data already filtered by the DB
  const filteredSaidas = saidas;
  const filteredFolhasAvulsas = folhasAvulsas;
  const filteredFaltantesSalus = faltantesSalus;

  const clearFilters = () => {
    setSearchTerm("");
    setDataInicio("");
    setDataFim("");
    setStatusFilter("em_fluxo");
  };

  const hasActiveFilters = searchTerm || dataInicio || dataFim || (statusFilter !== "em_fluxo");

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

  const clearFaltantesFilters = () => {
    setFaltantesSearchTerm("");
    setFaltantesDataInicio("");
    setFaltantesDataFim("");
  };

  const hasFaltantesActiveFilters = faltantesSearchTerm || faltantesDataInicio || faltantesDataFim;

  const clearFolhasFilters = () => {
    setFolhasSearchTerm("");
    setFolhasDataInicio("");
    setFolhasDataFim("");
  };

  const hasFolhasActiveFilters = folhasSearchTerm || folhasDataInicio || folhasDataFim;

  const getFolhasExportData = () => {
    const headers = ['Paciente', 'Data Nascimento', 'Data Atendimento', 'Status', 'Observação'];
    const rows = filteredFolhasAvulsas.map(s => [
      s.paciente_nome || '-',
      safeFormatDate(s.nascimento_mae, "dd/MM/yyyy"),
      safeFormatDate(s.data_atendimento, "dd/MM/yyyy"),
      'Folha Avulsa',
      s.observacao_classificacao || '-',
    ]);
    return { headers, rows };
  };

  const handleExportFolhasCSV = () => {
    if (filteredFolhasAvulsas.length === 0) return;
    const { headers, rows } = getFolhasExportData();
    exportToCSV({
      title: 'Folhas Avulsas',
      headers,
      rows,
      fileName: 'folhas_avulsas',
    });
    toast({
      title: "Exportado!",
      description: `${filteredFolhasAvulsas.length} registro(s) exportado(s) para CSV.`,
    });
  };

  const handleExportFolhasPDF = () => {
    if (filteredFolhasAvulsas.length === 0) return;
    const { headers, rows } = getFolhasExportData();
    exportToPDF({
      title: 'Folhas Avulsas',
      headers,
      rows,
      fileName: 'folhas_avulsas',
      orientation: 'portrait',
    });
    toast({
      title: "Exportado!",
      description: `${filteredFolhasAvulsas.length} registro(s) exportado(s) para PDF.`,
    });
  };

  const getFaltantesExportData = () => {
    const headers = ['Paciente', 'Data Nascimento', 'Data Atendimento', 'Status'];
    const rows = filteredFaltantesSalus.map(s => [
      s.paciente_nome || '-',
      safeFormatDate(s.nascimento_mae, "dd/MM/yyyy"),
      safeFormatDate(s.data_atendimento, "dd/MM/yyyy"),
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
    const headers = ['Paciente', 'Data Nasc.', 'Data Atendimento', 'Carimbo Médico', 'Status', 'Recepção', 'Classificação', 'NIR'];
    const rows = filteredSaidas.map(s => [
      s.paciente_nome || '-',
      safeFormatDate(s.nascimento_mae, "dd/MM/yyyy"),
      safeFormatDate(s.data_atendimento, "dd/MM/yyyy"),
      s.possui_carimbo_medico ? 'Sim' : 'Não',
      s.status,
      safeFormatDate(s.registrado_recepcao_em, "dd/MM/yy HH:mm"),
      safeFormatDate(s.validado_classificacao_em, "dd/MM/yy HH:mm"),
      safeFormatDate(s.conferido_nir_em, "dd/MM/yy HH:mm"),
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
            <>
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
                    <div className="border rounded-lg p-4 bg-muted/30">
                      <p className="text-sm font-medium mb-3">Checklist de Verificação <span className="text-destructive">*</span></p>
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          id="carimbo-medico"
                          checked={possuiCarimboMedico}
                          onCheckedChange={(checked) => setPossuiCarimboMedico(checked === true)}
                          required
                        />
                        <label htmlFor="carimbo-medico" className="text-sm cursor-pointer">
                          O prontuário possui carimbo médico?
                        </label>
                      </div>
                      {!possuiCarimboMedico && (
                        <p className="text-xs text-destructive mt-2">⚠ É obrigatório confirmar o carimbo médico para registrar.</p>
                      )}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button 
                      onClick={handleAddSaida} 
                      disabled={!pacienteNome.trim() || !dataAtendimento || !possuiCarimboMedico || isSubmitting}
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

              <Dialog open={newFolhaAvulsaOpen} onOpenChange={setNewFolhaAvulsaOpen}>
                <DialogTrigger asChild>
                  <Button variant="secondary">
                    <FileStack className="h-4 w-4 mr-2" />
                    Folha Avulsa
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <FileStack className="h-5 w-5 text-warning" />
                      Registrar Folha Avulsa
                    </DialogTitle>
                  </DialogHeader>
                  <p className="text-sm text-muted-foreground">
                    Folhas que fazem parte de um prontuário mas foram enviadas de forma avulsa (incompletas).
                  </p>
                  <div 
                    className="space-y-4 pt-2"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && folhaAvulsaPaciente.trim() && folhaAvulsaDataAtendimento && !isSubmitting) {
                        e.preventDefault();
                        handleAddFolhaAvulsa();
                      }
                    }}
                  >
                    <div>
                      <label className="text-sm font-medium">Paciente <span className="text-destructive">*</span></label>
                      <Input
                        value={folhaAvulsaPaciente}
                        onChange={(e) => setFolhaAvulsaPaciente(e.target.value)}
                        placeholder="Nome completo do paciente"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Data de Nascimento <span className="text-muted-foreground text-xs">(opcional)</span></label>
                      <Input
                        type="date"
                        value={folhaAvulsaNascimento}
                        onChange={(e) => setFolhaAvulsaNascimento(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Data de Atendimento <span className="text-destructive">*</span></label>
                      <Input
                        type="date"
                        value={folhaAvulsaDataAtendimento}
                        onChange={(e) => setFolhaAvulsaDataAtendimento(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Observação</label>
                      <Textarea
                        value={folhaAvulsaObservacao}
                        onChange={(e) => setFolhaAvulsaObservacao(e.target.value)}
                        placeholder="Descrição do conteúdo da folha avulsa..."
                        rows={2}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button 
                      onClick={handleAddFolhaAvulsa} 
                      disabled={!folhaAvulsaPaciente.trim() || !folhaAvulsaDataAtendimento || isSubmitting}
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <FileStack className="h-4 w-4 mr-2" />
                      )}
                      Registrar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
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
                      <SelectValue placeholder="Em Fluxo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="em_fluxo">⚡ Em Fluxo (não concluídos)</SelectItem>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="aguardando_classificacao">Aguardando Classificação</SelectItem>
                      <SelectItem value="aguardando_nir">Aguardando NIR</SelectItem>
                      <SelectItem value="aguardando_faturamento">Aguardando Faturamento</SelectItem>
                      <SelectItem value="em_avaliacao">Em Avaliação</SelectItem>
                      <SelectItem value="concluido">Concluído</SelectItem>
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total de Registros */}
        <Card 
          className={`cursor-pointer hover:bg-primary/10 transition-colors ${visibleSection === "fluxo" ? "bg-primary/10 border-primary ring-2 ring-primary/30" : "bg-primary/5 border-primary/20"}`}
          onClick={() => setVisibleSection(visibleSection === "fluxo" ? null : "fluxo")}
        >
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {isFaturamento || isAdmin ? "Total de Registros" : "Registros do Dia"}
                </p>
                <p className="text-2xl font-bold text-primary">
                  {isFaturamento || isAdmin
                    ? (hasActiveFilters ? filteredSaidas.length : totalSaidasCount)
                    : totalSaidasHojeCount
                  }
                </p>
                {(isFaturamento || isAdmin) && hasActiveFilters && (
                  <p className="text-xs text-muted-foreground">de {totalSaidasCount} totais</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Folhas Avulsas */}
        <Card 
          className={`cursor-pointer hover:bg-warning/10 transition-colors ${visibleSection === "folhas" ? "bg-warning/10 border-warning ring-2 ring-warning/30" : "bg-warning/5 border-warning/20"}`}
          onClick={() => setVisibleSection(visibleSection === "folhas" ? null : "folhas")}
        >
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-warning/10">
                <FileStack className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Folhas Avulsas</p>
                <p className="text-2xl font-bold text-warning">{totalFolhasCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Prontuários Faltantes */}
        <Card 
          className={`cursor-pointer hover:bg-destructive/10 transition-colors ${visibleSection === "faltantes" ? "bg-destructive/10 border-destructive ring-2 ring-destructive/30" : "bg-destructive/5 border-destructive/20"}`}
          onClick={() => setVisibleSection(visibleSection === "faltantes" ? null : "faltantes")}
        >
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-destructive/10">
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Prontuários Faltantes</p>
                <p className="text-2xl font-bold text-destructive">{totalFaltantesCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table - Prontuários em Fluxo */}
      {visibleSection === "fluxo" && (
      <Card id="prontuarios-fluxo">
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
                    <TableHead>Carimbo</TableHead>
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
                        <TableCell className="font-medium uppercase">
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
                          {safeFormatDate(saida.nascimento_mae, "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell>
                          {safeFormatDate(saida.data_atendimento, "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell>
                          {saida.possui_carimbo_medico ? (
                            <Badge className="bg-success text-success-foreground text-xs">✓ Sim</Badge>
                          ) : (
                            <Badge variant="outline" className="text-destructive border-destructive text-xs">✗ Não</Badge>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(saida.status)}</TableCell>
                        <TableCell>
                          {safeFormatDate(saida.registrado_recepcao_em, "dd/MM/yy HH:mm")}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            {safeFormatDate(saida.validado_classificacao_em, "dd/MM/yy HH:mm")}
                            {saida.existe_fisicamente !== null && (
                              <span className={`text-xs ${saida.existe_fisicamente ? "text-success" : "text-destructive"}`}>
                                {saida.existe_fisicamente ? "✓ Existe" : "✗ Não existe"}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {safeFormatDate(saida.conferido_nir_em, "dd/MM/yy HH:mm")}
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
      )}

      {/* Folhas Avulsas */}
      {visibleSection === "folhas" && (
      <Card id="folhas-avulsas" className="bg-warning/5 border-warning/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-warning">
                <FileStack className="h-5 w-5" />
                Folhas Avulsas
              </CardTitle>
              <CardDescription>
                {folhasAvulsas.length > 0
                  ? `${folhasAvulsas.length} folha(s) avulsa(s) registrada(s) - prontuários incompletos enviados de forma avulsa`
                  : "Nenhuma folha avulsa registrada - utilize o botão 'Folha Avulsa' para registrar"
                }
              </CardDescription>
            </div>
            <Badge className="w-fit bg-warning text-warning-foreground">
              {filteredFolhasAvulsas.length} de {folhasAvulsas.length} registro(s)
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {folhasAvulsas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileStack className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhuma folha avulsa registrada.</p>
              <p className="text-sm mt-1">Utilize o botão "Folha Avulsa" acima para registrar.</p>
            </div>
          ) : (
            <>
              {/* Search and Filters */}
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome do paciente..."
                    value={folhasSearchTerm}
                    onChange={(e) => setFolhasSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="date"
                        value={folhasDataInicio}
                        onChange={(e) => setFolhasDataInicio(e.target.value)}
                        className="pl-10 w-40"
                        placeholder="De"
                      />
                    </div>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="date"
                        value={folhasDataFim}
                        onChange={(e) => setFolhasDataFim(e.target.value)}
                        className="pl-10 w-40"
                        placeholder="Até"
                      />
                    </div>
                  </div>
                  {hasFolhasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFolhasFilters}>
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
                      <DropdownMenuItem onClick={handleExportFolhasCSV}>
                        <FileText className="h-4 w-4 mr-2" />
                        Exportar CSV
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleExportFolhasPDF}>
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
                      <TableHead>Observação</TableHead>
                      <TableHead>Status</TableHead>
                      {isAdmin && <TableHead>Ações</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFolhasAvulsas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={isAdmin ? 7 : 6} className="text-center text-muted-foreground py-8">
                          Nenhum registro encontrado com os filtros aplicados
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredFolhasAvulsas.map((item, index) => (
                        <TableRow key={item.id} className="bg-warning/5">
                          <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>
                          <TableCell className="font-medium uppercase">{item.paciente_nome || '-'}</TableCell>
                          <TableCell>
                            {safeFormatDate(item.nascimento_mae, "dd/MM/yyyy")}
                          </TableCell>
                          <TableCell>
                            {safeFormatDate(item.data_atendimento, "dd/MM/yyyy")}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate" title={item.observacao_classificacao || ''}>
                            {item.observacao_classificacao || '-'}
                          </TableCell>
                          <TableCell>
                            <Badge className="flex items-center gap-1 w-fit bg-warning text-warning-foreground">
                              <FileStack className="h-3 w-3" />
                              Folha Avulsa
                            </Badge>
                          </TableCell>
                          {isAdmin && (
                            <TableCell>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => handleOpenEdit(item)}
                                title="Editar folha avulsa"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          )}
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
      )}

      {/* Prontuários Faltantes - Importados via Salus */}
      {visibleSection === "faltantes" && (
      <Card id="prontuarios-faltantes" className="bg-destructive/5 border-destructive/30">
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
                          <TableCell className="font-medium uppercase">{item.paciente_nome || '-'}</TableCell>
                          <TableCell>
                            {safeFormatDate(item.nascimento_mae, "dd/MM/yyyy")}
                          </TableCell>
                          <TableCell>
                            {safeFormatDate(item.data_atendimento, "dd/MM/yyyy")}
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
      )}

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
                value={safeFormatDate(selectedSaida?.nascimento_mae, "dd/MM/yyyy")} 
                disabled 
              />
            </div>
            <div>
              <label className="text-sm font-medium">Data de Atendimento</label>
              <Input 
                value={safeFormatDate(selectedSaida?.data_atendimento, "dd/MM/yyyy")} 
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
