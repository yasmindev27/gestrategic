import { useState, useEffect } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SalusImportModule } from "@/components/nir";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  FileStack,
  Trash2,
  Upload
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PdfPatientCounter } from "./PdfPatientCounter";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EntregaProntuariosDialog } from "./EntregaProntuariosDialog";
import { ImportarSaidasDialog } from "./ImportarSaidasDialog";
import { useToast } from "@/hooks/use-toast";
import { exportToCSV, exportToPDF } from "@/lib/export-utils";
import { safeFormatDate, getBrasiliaDateString } from "@/lib/brasilia-time";

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
  cadastro_conferido: boolean | null;
  checklist_validacao: Record<string, string> | null;
  pendencia_resolvida_em: string | null;
  pendencia_resolvida_por: string | null;
  created_at: string;
}

interface EntregaInfo {
  data_hora: string;
  entregador_nome: string;
  responsavel_recebimento_nome: string;
  setor_origem: string;
  setor_destino: string;
}

export const SaidaProntuariosModule = () => {
  const { isRecepcao, isClassificacao, isNir, isAdmin, isFaturamento, userId, role, isLoading: isLoadingRole } = useUserRole();
  const { logAction } = useLogAccess();
  const { toast } = useToast();
  
  const [saidas, setSaidas] = useState<SaidaProntuario[]>([]);
  const [folhasAvulsas, setFolhasAvulsas] = useState<SaidaProntuario[]>([]);
  const [faltantesSalus, setFaltantesSalus] = useState<SaidaProntuario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Entregas lookup: saida_prontuario_id -> array of EntregaInfo
  const [entregasMap, setEntregasMap] = useState<Record<string, EntregaInfo[]>>({});
  
  // Contagens reais (independente do limite de 1000 linhas)
  const [totalSaidasCount, setTotalSaidasCount] = useState(0);
  const [totalSaidasHojeCount, setTotalSaidasHojeCount] = useState(0);
  const [totalFolhasCount, setTotalFolhasCount] = useState(0);
  const [totalFaltantesCount, setTotalFaltantesCount] = useState(0);
  const [filteredSaidasCount, setFilteredSaidasCount] = useState<number | null>(null);
  const [filteredFolhasCount, setFilteredFolhasCount] = useState<number | null>(null);
  const [filteredFaltantesCount, setFilteredFaltantesCount] = useState<number | null>(null);
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
  
  // Track which folhas avulsas have a corresponding main prontuário (with details)
  const [folhasVinculadasMap, setFolhasVinculadasMap] = useState<Record<string, { data_registro: string; status: string; origem_pendencia?: string }>>({}); 
  
  // Form states
  const [pacienteNome, setPacienteNome] = useState("");
  const [nascimentoMae, setNascimentoMae] = useState("");
  const [dataAtendimento, setDataAtendimento] = useState("");
  const [cadastroConferido, setCadastroConferido] = useState(false);
  const [possuiCarimboMedico, setPossuiCarimboMedico] = useState(false);
  const [observacaoSaida, setObservacaoSaida] = useState("");
  const [existeFisicamente, setExisteFisicamente] = useState(true);
  const [observacao, setObservacao] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checklistValidacao, setChecklistValidacao] = useState({
    carimbo_enfermagem: "pendente",
    evolucao: "pendente",
    ficha_medicacao: "pendente",
    pedidos_exames: "pendente",
    alta_medica: "pendente",
  });
  const [observacaoChecklist, setObservacaoChecklist] = useState("");

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
  const [entregaDialogOpen, setEntregaDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingSaida, setDeletingSaida] = useState<SaidaProntuario | null>(null);
  const [importarOpen, setImportarOpen] = useState(false);

  const canAccess = isRecepcao || isClassificacao || isNir || isAdmin || isFaturamento;
  const canInsert = isRecepcao || isClassificacao || isNir || isAdmin || isFaturamento;
  const canValidateClassificacao = isClassificacao || isAdmin;
  const canValidateNir = isNir || isAdmin;
  const isFullAccessRole = isFaturamento || isAdmin || isNir || isClassificacao;

  // Data de referência no fuso de Brasília (UTC-3) com offset explícito para filtros de created_at
  const hoje = getBrasiliaDateString();
  const inicioHoje = `${hoje}T00:00:00-03:00`;
  const fimHoje = `${hoje}T23:59:59-03:00`;

  // D1: Classificação vê ontem + hoje (24h para tratar prontuários)
  const ontemDate = new Date();
  ontemDate.setDate(ontemDate.getDate() - 1);
  const ontem = ontemDate.toISOString().slice(0, 10);
  const inicioOntem = `${ontem}T00:00:00-03:00`;

  // Pagination
  const PAGE_SIZE = 100;
  const [saidasPage, setSaidasPage] = useState(0);
  const [folhasPage, setFolhasPage] = useState(0);
  const [faltantesPage, setFaltantesPage] = useState(0);

  // Section visibility: only one section visible at a time
  type VisibleSection = "fluxo" | "folhas" | "faltantes" | null;
  const [visibleSection, setVisibleSection] = useState<VisibleSection>("fluxo");

  useEffect(() => {
    if (
      !isLoadingRole &&
      isClassificacao &&
      !isAdmin &&
      !isNir &&
      !isFaturamento &&
      statusFilter === "em_fluxo"
    ) {
      setStatusFilter("todos");
    }
  }, [isLoadingRole, isClassificacao, isAdmin, isNir, isFaturamento, statusFilter]);

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
      const restrictedToToday = isRecepcao && !isAdmin && !isNir && !isFaturamento && !isClassificacao;
      const restrictedToYesterdayToday = isClassificacao && !isAdmin && !isNir && !isFaturamento;

      const regularCountQuery = supabase
        .from("saida_prontuarios")
        .select("*", { count: "exact", head: true })
        .eq("is_folha_avulsa", false)
        .or("observacao_classificacao.is.null,observacao_classificacao.not.ilike.%importado via salus%");

      // Contagem "Registros do Dia" para Recepção: hoje + em fluxo (não concluído)
      const regularHojeQueryBuilder = supabase
        .from("saida_prontuarios")
        .select("*", { count: "exact", head: true })
        .eq("is_folha_avulsa", false)
        .or("observacao_classificacao.is.null,observacao_classificacao.not.ilike.%importado via salus%")
        .gte("created_at", inicioHoje)
        .lte("created_at", fimHoje)
        .neq("status", "concluido");

      // Folhas avulsas: restringir contagem para recepção/classificação
      let folhasCountQueryBase = supabase
        .from("saida_prontuarios")
        .select("*", { count: "exact", head: true })
        .eq("is_folha_avulsa", true);

      if (restrictedToToday) {
        folhasCountQueryBase = folhasCountQueryBase.gte("created_at", inicioHoje).lte("created_at", fimHoje);
      }

      let faltantesCountQueryBase = supabase
        .from("saida_prontuarios")
        .select("*", { count: "exact", head: true })
        .ilike("observacao_classificacao", "%importado via salus%")
        .eq("status", "pendente");

      const [regularCount, regularHojeCount, folhasCount, salusCount] = await Promise.all([
        regularCountQuery,
        regularHojeQueryBuilder,
        folhasCountQueryBase,
        restrictedToToday
          ? faltantesCountQueryBase.gte("created_at", inicioHoje).lte("created_at", fimHoje)
          : faltantesCountQueryBase,
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



  const applySaidasFilters = (query: any) => {
    // Filtrar por status baseado no setor do usuário
    if (isRecepcao && !isAdmin && !isNir && !isFaturamento && !isClassificacao) {
      query = query.gte("created_at", inicioHoje).lte("created_at", fimHoje);
    } else if (isNir && !isAdmin && !isFaturamento) {
      query = query.in("status", ["aguardando_nir"]);
    } else {
      if (statusFilter === "em_fluxo") {
        query = query.neq("status", "concluido");
      } else if (statusFilter !== "todos") {
        query = query.eq("status", statusFilter);
      }
    }

    if (debouncedSearchTerm) query = query.ilike("paciente_nome", `%${debouncedSearchTerm}%`);
    if (dataInicio) query = query.gte("data_atendimento", dataInicio);
    if (dataFim) query = query.lte("data_atendimento", dataFim);
    return query;
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

    query = applySaidasFilters(query);

    // Count query with same filters (no range/order)
    let countQuery = supabase
      .from("saida_prontuarios")
      .select("*", { count: "exact", head: true })
      .eq("is_folha_avulsa", false)
      .or("observacao_classificacao.is.null,observacao_classificacao.not.ilike.%importado via salus%");
    countQuery = applySaidasFilters(countQuery);

    const [{ data, error }, { count: filteredCount }] = await Promise.all([query, countQuery]);
    if (!error && data) {
      setSaidas(data as SaidaProntuario[]);
      fetchEntregas(data.map((d: any) => d.id));
    }
    setFilteredSaidasCount(filteredCount ?? 0);
    setSaidasPage(page);
  };

  const fetchEntregas = async (saidaIds: string[]) => {
    if (saidaIds.length === 0) { setEntregasMap({}); return; }
    const { data, error } = await supabase
      .from("entregas_prontuarios_itens")
      .select("saida_prontuario_id, entrega_id")
      .in("saida_prontuario_id", saidaIds);
    if (error || !data || data.length === 0) { setEntregasMap({}); return; }

    const entregaIds = [...new Set(data.map(d => d.entrega_id))];
    const { data: entregas } = await supabase
      .from("entregas_prontuarios")
      .select("id, data_hora, entregador_nome, responsavel_recebimento_nome, setor_origem, setor_destino")
      .in("id", entregaIds);

    if (!entregas) { setEntregasMap({}); return; }
    const entregaById = Object.fromEntries(entregas.map(e => [e.id, e]));

    const map: Record<string, EntregaInfo[]> = {};
    for (const item of data) {
      const e = entregaById[item.entrega_id];
      if (!e) continue;
      if (!map[item.saida_prontuario_id]) map[item.saida_prontuario_id] = [];
      map[item.saida_prontuario_id].push({
        data_hora: e.data_hora,
        entregador_nome: e.entregador_nome,
        responsavel_recebimento_nome: e.responsavel_recebimento_nome,
        setor_origem: e.setor_origem,
        setor_destino: e.setor_destino,
      });
    }
    setEntregasMap(map);
  };

  const applyFolhasFilters = (query: any) => {
    const restrictToToday = isRecepcao && !isAdmin && !isNir && !isFaturamento && !isClassificacao;
    if (restrictToToday) {
      query = query.gte("created_at", inicioHoje).lte("created_at", fimHoje);
    }
    if (debouncedFolhasSearch) query = query.ilike("paciente_nome", `%${debouncedFolhasSearch}%`);
    if (folhasDataInicio) query = query.gte("data_atendimento", folhasDataInicio);
    if (folhasDataFim) query = query.lte("data_atendimento", folhasDataFim);
    return query;
  };

  const fetchFolhasPage = async (page: number) => {
    let query = supabase
      .from("saida_prontuarios")
      .select("*")
      .eq("is_folha_avulsa", true)
      .order("data_atendimento", { ascending: false })
      .limit(2000);
    query = applyFolhasFilters(query);

    let countQuery = supabase
      .from("saida_prontuarios")
      .select("*", { count: "exact", head: true })
      .eq("is_folha_avulsa", true);
    countQuery = applyFolhasFilters(countQuery);

    const hasFolhasFilters = debouncedFolhasSearch || folhasDataInicio || folhasDataFim;

    const [{ data, error }, { count: fCount }] = await Promise.all([query, countQuery]);
    if (!error && data) {
      const folhas = data as SaidaProntuario[];
      setFolhasAvulsas(folhas);
      
      // Check which folhas avulsas have a corresponding main record (batched)
      const vinculadosMap: Record<string, { data_registro: string; status: string; origem_pendencia?: string }> = {};
      const checks = folhas
        .filter(f => f.paciente_nome && f.data_atendimento)
        .map(async (folha) => {
          const { data: match } = await supabase
            .from("saida_prontuarios")
            .select("id, created_at, status, validado_classificacao_em, conferido_nir_em")
            .eq("is_folha_avulsa", false)
            .eq("paciente_nome", folha.paciente_nome!)
            .eq("data_atendimento", folha.data_atendimento!)
            .limit(1)
            .maybeSingle();
          if (match) {
            let origem_pendencia: string | undefined;
            if (match.status === "pendente" || match.status === "aguardando_pendencia") {
              if (match.conferido_nir_em) origem_pendencia = "NIR";
              else if (match.validado_classificacao_em) origem_pendencia = "Classificação";
              else origem_pendencia = "Recepção";
            }
            vinculadosMap[folha.id] = {
              data_registro: match.created_at,
              status: match.status,
              origem_pendencia,
            };
          }
        });
      await Promise.all(checks);
      setFolhasVinculadasMap(vinculadosMap);
    }
    if (hasFolhasFilters) setFilteredFolhasCount(fCount ?? 0);
    else setFilteredFolhasCount(null);
    setFolhasPage(page);
  };

  const applyFaltantesFilters = (query: any) => {
    const restrictToToday = isRecepcao && !isAdmin && !isNir && !isFaturamento && !isClassificacao;
    if (restrictToToday) {
      query = query.gte("created_at", inicioHoje).lte("created_at", fimHoje);
    }
    if (debouncedFaltantesSearch) query = query.ilike("paciente_nome", `%${debouncedFaltantesSearch}%`);
    if (faltantesDataInicio) query = query.gte("data_atendimento", faltantesDataInicio);
    if (faltantesDataFim) query = query.lte("data_atendimento", faltantesDataFim);
    return query;
  };

  const fetchFaltantesPage = async (page: number) => {
    const from = page * PAGE_SIZE;
    let query = supabase
      .from("saida_prontuarios")
      .select("*")
      .ilike("observacao_classificacao", "%importado via salus%")
      .eq("status", "pendente")
      .order("data_atendimento", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    query = applyFaltantesFilters(query);

    let countQuery = supabase
      .from("saida_prontuarios")
      .select("*", { count: "exact", head: true })
      .ilike("observacao_classificacao", "%importado via salus%")
      .eq("status", "pendente");
    countQuery = applyFaltantesFilters(countQuery);

    const hasFaltantesFilters = debouncedFaltantesSearch || faltantesDataInicio || faltantesDataFim;

    const [{ data, error }, { count: fCount }] = await Promise.all([query, countQuery]);
    if (!error && data) setFaltantesSalus(data as SaidaProntuario[]);
    if (hasFaltantesFilters) setFilteredFaltantesCount(fCount ?? 0);
    else setFilteredFaltantesCount(null);
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
      // Verificar duplicidade: mesmo paciente + mesma data de atendimento
      const { data: existente } = await supabase
        .from("saida_prontuarios")
        .select("id, status, observacao_classificacao")
        .eq("paciente_nome", pacienteNome.trim().toUpperCase())
        .eq("data_atendimento", dataAtendimento)
        .eq("is_folha_avulsa", false)
        .maybeSingle();

      if (existente) {
        // Se for um faltante do Salus, atualizar em vez de bloquear
        const isFaltanteSalus = existente.status === "pendente" && 
          (existente.observacao_classificacao || "").toLowerCase().includes("importado via salus");
        
        if (isFaltanteSalus) {
          const { error: updateError } = await supabase
            .from("saida_prontuarios")
            .update({
              nascimento_mae: nascimentoMae || null,
              cadastro_conferido: cadastroConferido,
              possui_carimbo_medico: possuiCarimboMedico,
              observacao_classificacao: observacaoSaida.trim() || null,
              registrado_recepcao_por: userId,
              registrado_recepcao_em: new Date().toISOString(),
              status: "aguardando_classificacao",
            })
            .eq("id", existente.id);

          if (updateError) throw updateError;

          toast({
            title: "Prontuário faltante resolvido",
            description: "O prontuário foi localizado e removido da lista de faltantes.",
          });
        } else {
          toast({
            title: "Registro duplicado",
            description: "Já existe um prontuário registrado para este paciente nesta data de atendimento.",
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }
      } else {
        const hasPendencia = !cadastroConferido || !possuiCarimboMedico;
        const pendenciaItems: string[] = [];
        if (!cadastroConferido) pendenciaItems.push("Cadastro não conferido");
        if (!possuiCarimboMedico) pendenciaItems.push("Sem carimbo médico");
        
        const observacaoFinal = hasPendencia
          ? [observacaoSaida.trim(), `Pendência (Recepção): ${pendenciaItems.join(", ")}`].filter(Boolean).join(" | ")
          : observacaoSaida.trim() || null;

        const { error } = await supabase
          .from("saida_prontuarios")
          .insert({
            paciente_nome: pacienteNome.trim(),
            nascimento_mae: nascimentoMae || null,
            data_atendimento: dataAtendimento,
            cadastro_conferido: cadastroConferido,
            possui_carimbo_medico: possuiCarimboMedico,
            observacao_classificacao: observacaoFinal,
            registrado_recepcao_por: userId,
            registrado_recepcao_em: new Date().toISOString(),
            status: hasPendencia ? "pendente" : "aguardando_classificacao",
          });

        if (error) throw error;
      }


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
      setCadastroConferido(false);
      setPossuiCarimboMedico(false);
      setObservacaoSaida("");
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
          checklist_validacao: JSON.parse(JSON.stringify({ ...checklistValidacao, observacao: observacaoChecklist || null })),
          status: Object.values(checklistValidacao).some(v => v === "pendente") ? "pendente" : "aguardando_nir",
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
      setChecklistValidacao({ carimbo_enfermagem: "pendente", evolucao: "pendente", ficha_medicacao: "pendente", pedidos_exames: "pendente", alta_medica: "pendente" });
      setObservacaoChecklist("");
      setExisteFisicamente(true);
      fetchSaidas();
    } catch (error: any) {
      console.error("Erro ao validar classificação:", error);
      console.error("Dados enviados:", {
        validado_classificacao_por: userId,
        existe_fisicamente: existeFisicamente,
        checklist: checklistValidacao,
        selectedSaidaId: selectedSaida?.id,
      });
      toast({
        title: "Erro",
        description: `Erro ao validar: ${error?.message || error?.details || "Erro desconhecido"}`,
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

  // Delete prontuário (admin only)
  const handleDeleteSaida = async () => {
    if (!deletingSaida) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("saida_prontuarios")
        .delete()
        .eq("id", deletingSaida.id);

      if (error) throw error;

      await logAction("excluir_prontuario", "saida_prontuarios", {
        id: deletingSaida.id,
        paciente: deletingSaida.paciente_nome,
      });

      toast({ title: "Sucesso", description: "Registro excluído com sucesso!" });
      setDeleteConfirmOpen(false);
      setDeletingSaida(null);
      fetchSaidas();
      fetchCounts();
    } catch (error) {
      console.error("Error deleting:", error);
      toast({ title: "Erro", description: "Erro ao excluir registro.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      aguardando_classificacao: { label: "Aguardando Classificação", className: "bg-warning text-warning-foreground" },
      aguardando_nir: { label: "Aguardando NIR", className: "bg-info text-info-foreground" },
      pendente: { label: "Aguardando Resolução de Pendência", className: "bg-warning text-warning-foreground" },
      aguardando_pendencia: { label: "Aguardando Resolução de Pendência", className: "bg-warning text-warning-foreground" },
      aguardando_faturamento: { label: "Aguardando Faturamento", className: "bg-primary text-primary-foreground" },
      em_avaliacao: { label: "Em Avaliação", className: "bg-secondary text-secondary-foreground" },
      concluido: { label: "Concluído", className: "bg-success text-success-foreground" },
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
      buttons.push(
        <Button 
          key="delete"
          size="sm" 
          variant="ghost"
          className="text-destructive hover:text-destructive"
          onClick={() => {
            setDeletingSaida(saida);
            setDeleteConfirmOpen(true);
          }}
          title="Excluir registro"
        >
          <Trash2 className="h-4 w-4" />
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
    setFilteredSaidasCount(null);
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
    const headers = ['Paciente', 'Data Nascimento', 'Data Atendimento', 'Status', 'Observação', 'Vínculo'];
    const rows = filteredFolhasAvulsas.map(s => [
      s.paciente_nome || '-',
      safeFormatDate(s.nascimento_mae, "dd/MM/yyyy"),
      safeFormatDate(s.data_atendimento, "dd/MM/yyyy"),
      'Folha Avulsa',
      s.observacao_classificacao || '-',
      folhasVinculadasMap[s.id] ? `Vinculado - ${safeFormatDate(folhasVinculadasMap[s.id].data_registro, "dd/MM/yyyy")} - ${folhasVinculadasMap[s.id].status}` : 'Sem prontuário',
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
    const headers = ['Paciente', 'Data Nasc.', 'Data Atendimento', 'Pendências', 'Status', 'Recepção', 'Classificação', 'NIR'];
    const rows = filteredSaidas.map(s => {
      const cl = s.checklist_validacao as Record<string, string> | null;
      const pendCount = cl ? Object.entries(cl).filter(([k, v]) => k !== "observacao" && v === "pendente").length : 0;
      return [
      s.paciente_nome || '-',
      safeFormatDate(s.nascimento_mae, "dd/MM/yyyy"),
      safeFormatDate(s.data_atendimento, "dd/MM/yyyy"),
      pendCount > 0 ? `${pendCount} pendência(s)` : 'Nenhuma',
      s.status,
      safeFormatDate(s.registrado_recepcao_em, "dd/MM/yy HH:mm"),
      safeFormatDate(s.validado_classificacao_em, "dd/MM/yy HH:mm"),
      safeFormatDate(s.conferido_nir_em, "dd/MM/yy HH:mm"),
      ];
    });
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
          {isNir && <SalusImportModule />}
          {!isRecepcao && !isClassificacao && (
            <>
              {isAdmin && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span><PdfPatientCounter onAnalysisComplete={setSalusAnalysis} onLaunchComplete={fetchSaidas} /></span>
                  </TooltipTrigger>
                  <TooltipContent>Importar lista de pacientes a partir de PDF do Salus</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline">
                          <Download className="h-4 w-4 mr-2" />
                          Exportar
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Exportar registros em CSV ou PDF</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
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
            </>
          )}
          {canInsert && (
            <>
              <Button variant="outline" onClick={() => setImportarOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Importar Planilha
              </Button>
              <Dialog open={newProntuarioOpen} onOpenChange={setNewProntuarioOpen}>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Registrar Saída
                        </Button>
                      </DialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent>Registrar a saída de um prontuário do setor</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
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
                      <p className="text-sm font-medium mb-3">Checklist de Verificação</p>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            id="cadastro-conferido"
                            checked={cadastroConferido}
                            onCheckedChange={(checked) => setCadastroConferido(checked === true)}
                          />
                          <label htmlFor="cadastro-conferido" className="text-sm cursor-pointer">
                            Cadastro conferido e identificação do paciente correta?
                          </label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            id="carimbo-medico"
                            checked={possuiCarimboMedico}
                            onCheckedChange={(checked) => setPossuiCarimboMedico(checked === true)}
                          />
                          <label htmlFor="carimbo-medico" className="text-sm cursor-pointer">
                            O prontuário possui carimbo médico?
                          </label>
                        </div>
                      </div>
                      {(!cadastroConferido || !possuiCarimboMedico) && (
                        <p className="text-xs text-warning mt-2">Atenção: itens desmarcados serão registrados como pendência.</p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium">Observação</label>
                      <Textarea
                        value={observacaoSaida}
                        onChange={(e) => setObservacaoSaida(e.target.value)}
                        placeholder="Observações adicionais (opcional)..."
                        rows={2}
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

              {!isClassificacao && <Dialog open={newFolhaAvulsaOpen} onOpenChange={setNewFolhaAvulsaOpen}>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DialogTrigger asChild>
                        <Button variant="secondary">
                          <FileStack className="h-4 w-4 mr-2" />
                          Folha Avulsa
                        </Button>
                      </DialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent>Registrar folha avulsa de prontuário incompleto</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
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
              </Dialog>}

              {(isNir || isAdmin || isRecepcao || isClassificacao || isFaturamento) && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" onClick={() => setEntregaDialogOpen(true)}>
                        <FileOutput className="h-4 w-4 mr-2" />
                        Registrar Entrega
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Registrar entrega de prontuários entre setores</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
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
                      {isNir && !isAdmin && !isFaturamento ? (
                        <>
                          <SelectItem value="em_fluxo">Aguardando NIR</SelectItem>
                        </>
                      ) : isRecepcao && !isAdmin && !isNir && !isFaturamento && !isClassificacao ? (
                        <>
                          <SelectItem value="em_fluxo">Em Fluxo (não concluídos)</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="em_fluxo">Em Fluxo (não concluídos)</SelectItem>
                          <SelectItem value="todos">Todos</SelectItem>
                          <SelectItem value="aguardando_classificacao">Aguardando Classificação</SelectItem>
                          <SelectItem value="aguardando_nir">Aguardando NIR</SelectItem>
                          <SelectItem value="pendente">Aguardando Resolução de Pendência</SelectItem>
                          <SelectItem value="aguardando_faturamento">Aguardando Faturamento</SelectItem>
                          <SelectItem value="em_avaliacao">Em Avaliação</SelectItem>
                          <SelectItem value="concluido">Concluído</SelectItem>
                        </>
                      )}
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
                  {isFullAccessRole ? "Total de Registros" : "Registros do Dia"}
                </p>
                <p className="text-2xl font-bold text-primary">
                  {isFullAccessRole
                    ? (hasActiveFilters && filteredSaidasCount !== null ? filteredSaidasCount : totalSaidasCount)
                    : totalSaidasHojeCount
                  }
                </p>
                {isFullAccessRole && hasActiveFilters && filteredSaidasCount !== null && (
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
                <p className="text-2xl font-bold text-warning">{filteredFolhasCount !== null ? filteredFolhasCount : totalFolhasCount}</p>
                {filteredFolhasCount !== null && (
                  <p className="text-xs text-muted-foreground">de {totalFolhasCount} totais</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Prontuários Faltantes - oculto para NIR */}
        {!isNir && <Card 
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
                <p className="text-2xl font-bold text-destructive">{filteredFaltantesCount !== null ? filteredFaltantesCount : totalFaltantesCount}</p>
                {filteredFaltantesCount !== null && (
                  <p className="text-xs text-muted-foreground">de {totalFaltantesCount} totais</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>}
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
            <div className="overflow-x-auto relative">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 z-20 bg-card min-w-[180px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Paciente</TableHead>
                    <TableHead>Data Nasc.</TableHead>
                    <TableHead>Data Atendimento</TableHead>
                    <TableHead>Pendências</TableHead>
                    <TableHead>Resolução</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Recepção</TableHead>
                    <TableHead>Entrega Rec.</TableHead>
                    <TableHead>Classificação</TableHead>
                    <TableHead>Entrega Class.</TableHead>
                    <TableHead>NIR</TableHead>
                    <TableHead>Entrega Fat.</TableHead>
                    <TableHead className="sticky right-0 z-20 bg-card shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]">Ações</TableHead>
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
                        <TableCell className="font-medium uppercase sticky left-0 z-10 bg-card shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
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
                          {(() => {
                            const cl = saida.checklist_validacao as Record<string, string> | null;
                            if (!cl) return <span className="text-xs text-muted-foreground">-</span>;
                            const pendencias = Object.entries(cl)
                              .filter(([k, v]) => k !== "observacao" && v === "pendente")
                              .map(([k]) => {
                                const labels: Record<string, string> = {
                                  carimbo_enfermagem: "Carimbo Enfermagem",
                                  evolucao: "Evolução da medicação",
                                  ficha_medicacao: "Ficha de medicação",
                                  pedidos_exames: "Pedidos de exames",
                                  alta_medica: "Alta médica",
                                };
                                return labels[k] || k;
                              });
                            if (pendencias.length === 0) {
                              return <Badge className="bg-success text-success-foreground text-xs">Nenhuma</Badge>;
                            }
                            if (saida.pendencia_resolvida_em) {
                              return (
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button variant="outline" size="sm" className="text-xs text-muted-foreground h-7">
                                      Houveram {pendencias.length} pendência{pendencias.length > 1 ? "s" : ""}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-64 p-3">
                                    <p className="text-sm font-medium mb-2">Pendências Resolvidas</p>
                                    <ul className="space-y-1">
                                      {pendencias.map((p, i) => (
                                        <li key={i} className="text-sm flex items-center gap-1.5">
                                          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                                          {p}
                                        </li>
                                      ))}
                                    </ul>
                                    {cl.observacao && (
                                      <p className="text-xs text-muted-foreground mt-2 border-t pt-2">
                                        <strong>Obs:</strong> {cl.observacao}
                                      </p>
                                    )}
                                  </PopoverContent>
                                </Popover>
                              );
                            }
                            return (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" size="sm" className="text-xs text-destructive border-destructive h-7">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    {pendencias.length} pendência{pendencias.length > 1 ? "s" : ""}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-64 p-3">
                                  <p className="text-sm font-medium mb-2">Itens Pendentes</p>
                                  <ul className="space-y-1">
                                    {pendencias.map((p, i) => (
                                      <li key={i} className="text-sm flex items-center gap-1.5">
                                        <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                                        {p}
                                      </li>
                                    ))}
                                  </ul>
                                  {cl.observacao && (
                                    <p className="text-xs text-muted-foreground mt-2 border-t pt-2">
                                      <strong>Obs:</strong> {cl.observacao}
                                    </p>
                                  )}
                                </PopoverContent>
                              </Popover>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const cl = saida.checklist_validacao as Record<string, string> | null;
                            const hasPendencias = cl && Object.entries(cl).some(([k, v]) => k !== "observacao" && v === "pendente");
                            if (!hasPendencias) return <span className="text-xs text-muted-foreground">-</span>;
                            if (saida.pendencia_resolvida_em) {
                              return (
                                <div className="flex flex-col">
                                  <Badge className="bg-success text-success-foreground text-xs w-fit">Resolvida</Badge>
                                  <span className="text-xs text-muted-foreground mt-0.5">
                                    {safeFormatDate(saida.pendencia_resolvida_em, "dd/MM/yy HH:mm")}
                                  </span>
                                </div>
                              );
                            }
                            return (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-7"
                                onClick={async () => {
                                  try {
                                    const { error } = await supabase
                                      .from("saida_prontuarios")
                                      .update({
                                        pendencia_resolvida_em: new Date().toISOString(),
                                        pendencia_resolvida_por: userId,
                                        status: "aguardando_nir",
                                      } as any)
                                      .eq("id", saida.id);
                                    if (error) throw error;
                                    toast({ title: "Sucesso", description: "Pendência marcada como resolvida!" });
                                    fetchSaidas();
                                  } catch (err) {
                                    console.error(err);
                                    toast({ title: "Erro", description: "Erro ao resolver pendência.", variant: "destructive" });
                                  }
                                }}
                              >
                                <Check className="h-3 w-3 mr-1" />
                                Resolver
                              </Button>
                            );
                          })()}
                        </TableCell>
                        <TableCell>{getStatusBadge(saida.status)}</TableCell>
                        <TableCell>
                          {safeFormatDate(saida.registrado_recepcao_em, "dd/MM/yy HH:mm")}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const entrega = entregasMap[saida.id]?.find(e => e.setor_origem === "Recepção");
                            if (!entrega) return <span className="text-xs text-muted-foreground">-</span>;
                            return (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" size="sm" className="text-xs h-7 gap-1">
                                    {safeFormatDate(entrega.data_hora, "dd/MM HH:mm")}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-56 p-3">
                                  <p className="text-sm font-medium mb-2">Entrega Recepção - Classificação</p>
                                  <div className="space-y-1 text-sm">
                                    <p><strong>Entregador:</strong> {entrega.entregador_nome}</p>
                                    <p><strong>Recebido por:</strong> {entrega.responsavel_recebimento_nome}</p>
                                    <p className="text-xs text-muted-foreground">{safeFormatDate(entrega.data_hora, "dd/MM/yyyy HH:mm:ss")}</p>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            {safeFormatDate(saida.validado_classificacao_em, "dd/MM/yy HH:mm")}
                            {saida.existe_fisicamente !== null && (
                              <span className={`text-xs ${saida.existe_fisicamente ? "text-success" : "text-destructive"}`}>
                                {saida.existe_fisicamente ? "Existe" : "Não existe"}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const entrega = entregasMap[saida.id]?.find(e => e.setor_origem === "Classificação");
                            if (!entrega) return <span className="text-xs text-muted-foreground">-</span>;
                            return (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" size="sm" className="text-xs h-7 gap-1">
                                    {safeFormatDate(entrega.data_hora, "dd/MM HH:mm")}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-56 p-3">
                                  <p className="text-sm font-medium mb-2">Entrega Classificação - NIR</p>
                                  <div className="space-y-1 text-sm">
                                    <p><strong>Entregador:</strong> {entrega.entregador_nome}</p>
                                    <p><strong>Recebido por:</strong> {entrega.responsavel_recebimento_nome}</p>
                                    <p className="text-xs text-muted-foreground">{safeFormatDate(entrega.data_hora, "dd/MM/yyyy HH:mm:ss")}</p>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          {safeFormatDate(saida.conferido_nir_em, "dd/MM/yy HH:mm")}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const entrega = entregasMap[saida.id]?.find(e => e.setor_origem === "NIR");
                            if (!entrega) return <span className="text-xs text-muted-foreground">-</span>;
                            return (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" size="sm" className="text-xs h-7 gap-1">
                                    {safeFormatDate(entrega.data_hora, "dd/MM HH:mm")}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-56 p-3">
                                  <p className="text-sm font-medium mb-2">Entrega NIR - Faturamento</p>
                                  <div className="space-y-1 text-sm">
                                    <p><strong>Entregador:</strong> {entrega.entregador_nome}</p>
                                    <p><strong>Recebido por:</strong> {entrega.responsavel_recebimento_nome}</p>
                                    <p className="text-xs text-muted-foreground">{safeFormatDate(entrega.data_hora, "dd/MM/yyyy HH:mm:ss")}</p>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="sticky right-0 z-10 bg-card shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]">
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
                      <TableHead>Vínculo</TableHead>
                      <TableHead>Status</TableHead>
                      {isAdmin && <TableHead>Ações</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFolhasAvulsas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={isAdmin ? 8 : 7} className="text-center text-muted-foreground py-8">
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
                            {folhasVinculadasMap[item.id] ? (
                              <div className="space-y-1">
                                <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                                  <Check className="h-3 w-3 mr-1" />
                                  Vinculado
                                </Badge>
                                <div className="text-xs text-muted-foreground">
                                  <span className="block">Registrado: {safeFormatDate(folhasVinculadasMap[item.id].data_registro, "dd/MM/yyyy HH:mm")}</span>
                                  <span className="block">Etapa: {
                                    (() => {
                                      const info = folhasVinculadasMap[item.id];
                                      const statusLabels: Record<string, string> = {
                                        aguardando_classificacao: "Classificação",
                                        aguardando_nir: "NIR",
                                        pendente: "Pendência",
                                        aguardando_pendencia: "Pendência",
                                        aguardando_faturamento: "Faturamento",
                                        em_avaliacao: "Em Avaliação",
                                        concluido: "Concluído",
                                      };
                                      const label = statusLabels[info.status] || info.status;
                                      if (info.origem_pendencia) {
                                        return `${label} (${info.origem_pendencia})`;
                                      }
                                      return label;
                                    })()
                                  }</span>
                                </div>
                              </div>
                            ) : (
                              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Sem prontuário
                              </Badge>
                            )}
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
      {visibleSection === "faltantes" && !isNir && (
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
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedSaida?.status === "aguardando_classificacao" 
                ? "Validar Classificação" 
                : "Conferência NIR"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Paciente</label>
                <Input value={selectedSaida?.paciente_nome || "-"} disabled className="h-8 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Dt. Nascimento</label>
                <Input 
                  value={safeFormatDate(selectedSaida?.nascimento_mae, "dd/MM/yyyy")} 
                  disabled className="h-8 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Dt. Atendimento</label>
                <Input 
                  value={safeFormatDate(selectedSaida?.data_atendimento, "dd/MM/yyyy")} 
                  disabled className="h-8 text-sm"
                />
              </div>
              {selectedSaida?.status === "aguardando_classificacao" && (
                <div className="flex items-center pt-5">
                  <Checkbox
                    id="existeFisicamente"
                    checked={existeFisicamente}
                    onCheckedChange={(checked) => setExisteFisicamente(checked as boolean)}
                  />
                  <label htmlFor="existeFisicamente" className="text-sm font-medium cursor-pointer ml-2">
                    Existe fisicamente
                  </label>
                </div>
              )}
            </div>
            
            {selectedSaida?.status === "aguardando_classificacao" && (
              <>
                <div className="border rounded-lg p-3 bg-muted/30">
                  <p className="text-sm font-medium mb-2">Checklist de Verificação</p>
                  <div className="space-y-2">
                    {[
                      { key: "carimbo_enfermagem", label: "Carimbo e assinatura Enfermagem" },
                      { key: "evolucao", label: "Evolução da medicação" },
                      { key: "ficha_medicacao", label: "Ficha de medicação" },
                      { key: "pedidos_exames", label: "Pedidos de exames" },
                      { key: "alta_medica", label: "Alta médica" },
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between gap-2">
                        <span className="text-sm">{item.label}</span>
                        <Select
                          value={checklistValidacao[item.key as keyof typeof checklistValidacao]}
                          onValueChange={(val) =>
                            setChecklistValidacao((prev) => ({ ...prev, [item.key]: val }))
                          }
                        >
                          <SelectTrigger className="w-[140px] h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sim">Sim</SelectItem>
                            <SelectItem value="nao_se_aplica">Não se aplica</SelectItem>
                            <SelectItem value="pendente">Pendente</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">Observação do checklist (opcional)</label>
                  <Textarea
                    value={observacaoChecklist}
                    onChange={(e) => setObservacaoChecklist(e.target.value)}
                    placeholder="Observações sobre os itens verificados..."
                    className="min-h-[60px]"
                  />
                </div>
              </>
            )}
            
            <div>
              <label className="text-xs font-medium text-muted-foreground">Observações gerais (opcional)</label>
              <Textarea
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Adicione observações..."
                className="min-h-[60px]"
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

      <EntregaProntuariosDialog
        open={entregaDialogOpen}
        onOpenChange={setEntregaDialogOpen}
        onSuccess={() => fetchCounts()}
      />

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o registro de{" "}
              <strong>{deletingSaida?.paciente_nome}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSaida}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ImportarSaidasDialog
        open={importarOpen}
        onOpenChange={setImportarOpen}
        userId={userId || ""}
        onImportComplete={() => fetchCounts()}
      />
    </div>
  );
};
