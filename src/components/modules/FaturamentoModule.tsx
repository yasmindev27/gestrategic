import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useLogAccess } from "@/hooks/useLogAccess";
import { DashboardFaturamento } from "@/components/faturamento/DashboardFaturamento";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  FileText, 
  Search,
  ClipboardCheck,
  AlertCircle,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  BarChart2,
  Calendar as CalendarIcon,
  Filter,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { safeFormatDate } from "@/lib/brasilia-time";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, format } from "date-fns";
import { ptBR } from "date-fns/locale";

type DateFilterPreset = "hoje" | "semana" | "mes" | "ano" | "custom" | null;

interface SaidaProntuario {
  id: string;
  prontuario_id: string | null;
  numero_prontuario: string | null;
  paciente_nome: string | null;
  nascimento_mae: string | null;
  data_atendimento: string | null;
  status: string;
  registrado_recepcao_em: string | null;
  validado_classificacao_em: string | null;
  conferido_nir_em: string | null;
  created_at: string;
}

interface Avaliacao {
  id: string;
  saida_prontuario_id: string | null;
  numero_prontuario: string | null;
  paciente_nome: string | null;
  unidade_setor: string | null;
  identificacao_paciente: string | null;
  identificacao_paciente_obs: string | null;
  acolhimento_triagem: string | null;
  acolhimento_triagem_obs: string | null;
  atendimento_medico: string | null;
  atendimento_medico_obs: string | null;
  documentacao_medica_cfm: string | null;
  documentacao_medica_cfm_obs: string | null;
  enfermagem_medicacao: string | null;
  enfermagem_medicacao_obs: string | null;
  paciente_internado: string | null;
  paciente_internado_obs: string | null;
  resultado_final: string | null;
  comentarios_finais: string | null;
  is_finalizada: boolean;
  data_inicio: string;
  data_conclusao: string | null;
  data_atendimento?: string | null;
  avaliador_id: string;
}

interface FormData {
  unidade_setor: string;
  identificacao_paciente: string;
  identificacao_paciente_obs: string;
  acolhimento_triagem: string;
  acolhimento_triagem_obs: string;
  atendimento_medico: string;
  atendimento_medico_obs: string;
  documentacao_medica_cfm: string;
  documentacao_medica_cfm_obs: string;
  enfermagem_medicacao: string;
  enfermagem_medicacao_obs: string;
  paciente_internado: string;
  paciente_internado_obs: string;
  resultado_final: string;
  comentarios_finais: string;
}

const initialFormData: FormData = {
  unidade_setor: "",
  identificacao_paciente: "",
  identificacao_paciente_obs: "",
  acolhimento_triagem: "",
  acolhimento_triagem_obs: "",
  atendimento_medico: "",
  atendimento_medico_obs: "",
  documentacao_medica_cfm: "",
  documentacao_medica_cfm_obs: "",
  enfermagem_medicacao: "",
  enfermagem_medicacao_obs: "",
  paciente_internado: "",
  paciente_internado_obs: "",
  resultado_final: "",
  comentarios_finais: "",
};

const unidadeSetorOptions = [
  { value: "emergencia", label: "Emergência" },
  { value: "internacao", label: "Internação" },
  { value: "atendimento_medico_pa", label: "Atendimento Médico – P.A" },
];

const setorLabelMap: Record<string, string> = Object.fromEntries(
  unidadeSetorOptions.map(o => [o.value, o.label])
);

const conformeOptions = [
  { value: "conforme", label: "Conforme" },
  { value: "nao_conforme", label: "Não Conforme" },
];

const identificacaoOptions = [
  { value: "completa", label: "Completa" },
  { value: "incompleta", label: "Incompleta" },
];

const pacienteInternadoOptions = [
  { value: "nao_se_aplica", label: "Não se aplica" },
  { value: "conforme", label: "Conforme" },
  { value: "nao_conforme", label: "Não Conforme" },
];

const resultadoFinalOptions = [
  { value: "completo", label: "Completo" },
  { value: "com_pendencias", label: "Com Pendências" },
  { value: "incompleto", label: "Incompleto" },
];

export const FaturamentoModule = () => {
  const { isFaturamento, isAdmin, isGestor, userId, isLoading: isLoadingRole } = useUserRole();
  const { logAction } = useLogAccess();
  const { toast } = useToast();
  
  const [saidas, setSaidas] = useState<SaidaProntuario[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [prontuariosFaltantes, setProntuariosFaltantes] = useState<SaidaProntuario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"faltantes" | "avaliados" | "dashboard">("faltantes");
  const [datePreset, setDatePreset] = useState<DateFilterPreset>(null);
  const [customDateStart, setCustomDateStart] = useState("");
  const [customDateEnd, setCustomDateEnd] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");

  // Server-side pagination
  const PAGE_SIZE = 100;
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [faltantesCount, setFaltantesCount] = useState(0);
  const [avaliadosCount, setAvaliadosCount] = useState(0);

  // Avaliacoes lookup map (only for current page saidas)
  const [avaliacoesMap, setAvaliacoesMap] = useState<Map<string, Avaliacao>>(new Map());

  const canSeeDashboard = isAdmin || isGestor;
  
  // Form dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProntuario, setSelectedProntuario] = useState<SaidaProntuario | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // View dialog
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedAvaliacao, setSelectedAvaliacao] = useState<Avaliacao | null>(null);

  const canAccess = isFaturamento || isAdmin;

  // Debounce search term
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (!isLoadingRole && canAccess) {
      logAction("acesso", "faturamento", { modulo: "prontuarios" });
    }
  }, [canAccess, isLoadingRole]);

  // Fetch counts (lightweight)
  useEffect(() => {
    if (!isLoadingRole && canAccess) {
      fetchCounts();
    }
  }, [canAccess, isLoadingRole]);

  // Re-fetch data when filters/tab/page change
  useEffect(() => {
    if (!isLoadingRole && canAccess && activeTab !== "dashboard") {
      fetchPageData();
    }
  }, [canAccess, isLoadingRole, activeTab, currentPage, debouncedSearch, datePreset, customDateStart, customDateEnd, statusFilter]);

  // Reset page on filter/tab change
  useEffect(() => {
    setCurrentPage(0);
  }, [activeTab, debouncedSearch, datePreset, customDateStart, customDateEnd, statusFilter]);

  const getDateRangeForQuery = (): { start: string; end: string } | null => {
    const now = new Date();
    switch (datePreset) {
      case "hoje":
        return { start: format(startOfDay(now), "yyyy-MM-dd"), end: format(endOfDay(now), "yyyy-MM-dd'T'23:59:59") };
      case "semana":
        return { start: format(startOfWeek(now, { locale: ptBR }), "yyyy-MM-dd"), end: format(endOfWeek(now, { locale: ptBR }), "yyyy-MM-dd'T'23:59:59") };
      case "mes":
        return { start: format(startOfMonth(now), "yyyy-MM-dd"), end: format(endOfMonth(now), "yyyy-MM-dd'T'23:59:59") };
      case "ano":
        return { start: format(startOfYear(now), "yyyy-MM-dd"), end: format(endOfYear(now), "yyyy-MM-dd'T'23:59:59") };
      case "custom":
        if (customDateStart) {
          return { start: customDateStart, end: customDateEnd || customDateStart + "T23:59:59" };
        }
        return null;
      default:
        return null;
    }
  };

  const applyFiltersToQuery = (query: any) => {
    if (debouncedSearch) {
      query = query.ilike("paciente_nome", `%${debouncedSearch}%`);
    }
    if (statusFilter !== "todos") {
      query = query.eq("status", statusFilter);
    }
    const range = getDateRangeForQuery();
    if (range) {
      query = query.gte("data_atendimento", range.start).lte("data_atendimento", range.end);
    }
    return query;
  };

  const fetchCounts = async () => {
    try {
      const [totalRes, avaliadosDistinctRes] = await Promise.all([
        supabase.from("saida_prontuarios").select("*", { count: "exact", head: true }).eq("is_folha_avulsa", false),
        // Count distinct saidas that have a finalized avaliacao (ignores orphans with NULL saida_prontuario_id)
        supabase.from("avaliacoes_prontuarios").select("saida_prontuario_id", { count: "exact", head: true })
          .eq("is_finalizada", true)
          .not("saida_prontuario_id", "is", null),
      ]);
      const total = totalRes.count ?? 0;
      const avaliados = avaliadosDistinctRes.count ?? 0;
      setTotalCount(total);
      setAvaliadosCount(avaliados);
      setFaltantesCount(Math.max(0, total - avaliados));
    } catch (e) {
      console.error("Error fetching counts:", e);
    }
  };

  const fetchPageData = async () => {
    setIsLoading(true);
    try {
      const from = currentPage * PAGE_SIZE;

      if (activeTab === "avaliados") {
        // Fetch finalized avaliacoes with server-side pagination
        let query = supabase
          .from("avaliacoes_prontuarios")
          .select("*")
          .eq("is_finalizada", true)
          .order("data_inicio", { ascending: false })
          .range(from, from + PAGE_SIZE - 1);

        if (debouncedSearch) {
          query = query.ilike("paciente_nome", `%${debouncedSearch}%`);
        }

        if (statusFilter !== "todos") {
          query = query.eq("resultado_final", statusFilter === "concluido" ? "completo" : statusFilter);
        }

        const range = getDateRangeForQuery();
        if (range) {
          query = query.gte("data_inicio", range.start).lte("data_inicio", range.end);
        }

        const { data, error } = await query;
        if (error) throw error;

        // Enrich from saida_prontuarios (paciente_nome + data_atendimento)
        const rows = (data || []) as Avaliacao[];
        const needsEnrichment = rows.filter(r => r.saida_prontuario_id);
        if (needsEnrichment.length > 0) {
          const saidaIds = needsEnrichment.map(r => r.saida_prontuario_id!);
          const { data: saidasData } = await supabase
            .from("saida_prontuarios")
            .select("id, paciente_nome, data_atendimento, nascimento_mae")
            .in("id", saidaIds);
          const saidaMap = new Map((saidasData || []).map((s: any) => [s.id, s]));
          rows.forEach(r => {
            if (r.saida_prontuario_id) {
              const saida = saidaMap.get(r.saida_prontuario_id);
              if (saida) {
                if (!r.paciente_nome) (r as any).paciente_nome = saida.paciente_nome || null;
                (r as any).data_atendimento = saida.data_atendimento || null;
                (r as any).nascimento_mae = saida.nascimento_mae || null;
              }
            }
          });
        }

        setAvaliacoes(rows);
        setSaidas([]);
        setProntuariosFaltantes([]);
      } else if (activeTab === "faltantes") {
        // Fetch saidas that do NOT have a finalized avaliacao
        // Strategy: fetch saidas page, then check which have avaliacoes
        let query = supabase
          .from("saida_prontuarios")
          .select("*")
          .order("created_at", { ascending: false });

        query = applyFiltersToQuery(query);

        // We fetch more to compensate for filtering out avaliados
        const { data: saidasData, error } = await query.range(from, from + PAGE_SIZE * 2 - 1);
        if (error) throw error;

        const rows = (saidasData || []) as SaidaProntuario[];
        if (rows.length > 0) {
          const ids = rows.map(r => r.id);
          const { data: avData } = await supabase
            .from("avaliacoes_prontuarios")
            .select("saida_prontuario_id")
            .eq("is_finalizada", true)
            .in("saida_prontuario_id", ids);

          const avaliadosSet = new Set((avData || []).map(a => a.saida_prontuario_id));
          const faltantes = rows.filter(r => !avaliadosSet.has(r.id)).slice(0, PAGE_SIZE);
          setProntuariosFaltantes(faltantes);
        } else {
          setProntuariosFaltantes([]);
        }
        setSaidas([]);
         setAvaliacoes([]);
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

  const fetchData = async () => {
    await fetchCounts();
    await fetchPageData();
  };

  const handleOpenForm = (saida: SaidaProntuario) => {
    setSelectedProntuario(saida);
    setFormData(initialFormData);
    setDialogOpen(true);
  };

  const handleSubmitAvaliacao = async () => {
    if (!selectedProntuario || !userId) return;
    
    // Validate required fields
    if (!formData.unidade_setor || !formData.identificacao_paciente || 
        !formData.acolhimento_triagem || !formData.atendimento_medico ||
        !formData.documentacao_medica_cfm || !formData.enfermagem_medicacao ||
        !formData.paciente_internado || !formData.resultado_final) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);

    // Check if avaliacao already exists for this saida
    const { data: existing } = await supabase
      .from("avaliacoes_prontuarios")
      .select("id")
      .eq("saida_prontuario_id", selectedProntuario.id)
      .eq("is_finalizada", true)
      .maybeSingle();

    if (existing) {
      toast({
        title: "Avaliação já existe",
        description: "Este prontuário já possui uma avaliação finalizada.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }
    try {
      // Get or create prontuario
      let prontuarioId: string | null = selectedProntuario.prontuario_id;
      
      if (!prontuarioId && selectedProntuario.numero_prontuario) {
        const { data: existingProntuario } = await supabase
          .from("prontuarios")
          .select("id, paciente_nome")
          .eq("numero_prontuario", selectedProntuario.numero_prontuario)
          .maybeSingle();

        if (existingProntuario) {
          prontuarioId = existingProntuario.id;
        } else {
          const { data: newProntuario, error: createError } = await supabase
            .from("prontuarios")
            .insert({
              numero_prontuario: selectedProntuario.numero_prontuario,
              paciente_nome: selectedProntuario.paciente_nome || "A identificar",
              created_by: userId,
            })
            .select("id")
            .single();

          if (createError) throw createError;
          prontuarioId = newProntuario.id;
        }
      }

      // Create the evaluation
      const { error: avaliacaoError } = await supabase
        .from("avaliacoes_prontuarios")
        .insert({
          prontuario_id: prontuarioId,
          saida_prontuario_id: selectedProntuario.id,
          avaliador_id: userId,
          paciente_nome: selectedProntuario.paciente_nome || null,
          numero_prontuario: selectedProntuario.numero_prontuario,
          unidade_setor: formData.unidade_setor,
          identificacao_paciente: formData.identificacao_paciente,
          identificacao_paciente_obs: formData.identificacao_paciente_obs || null,
          acolhimento_triagem: formData.acolhimento_triagem,
          acolhimento_triagem_obs: formData.acolhimento_triagem_obs || null,
          atendimento_medico: formData.atendimento_medico,
          atendimento_medico_obs: formData.atendimento_medico_obs || null,
          documentacao_medica_cfm: formData.documentacao_medica_cfm,
          documentacao_medica_cfm_obs: formData.documentacao_medica_cfm_obs || null,
          enfermagem_medicacao: formData.enfermagem_medicacao,
          enfermagem_medicacao_obs: formData.enfermagem_medicacao_obs || null,
          paciente_internado: formData.paciente_internado,
          paciente_internado_obs: formData.paciente_internado_obs || null,
          resultado_final: formData.resultado_final,
          comentarios_finais: formData.comentarios_finais || null,
          is_finalizada: true,
          data_conclusao: new Date().toISOString(),
        });

      if (avaliacaoError) throw avaliacaoError;

      // Update prontuario status based on resultado_final (only if prontuario exists)
      if (prontuarioId) {
        const newStatus = formData.resultado_final === "completo" ? "ativo" : 
                         formData.resultado_final === "incompleto" ? "faltante" : "ativo";
        
        await supabase
          .from("prontuarios")
          .update({ status: newStatus })
          .eq("id", prontuarioId);
      }

      // Update saida_prontuarios status
      await supabase
        .from("saida_prontuarios")
        .update({ status: "concluido" })
        .eq("id", selectedProntuario.id);

      // Log action
      await logAction("finalizar_avaliacao", "faturamento", { 
        prontuario: selectedProntuario.numero_prontuario,
        resultado: formData.resultado_final
      });

      // Log to historico
      if (prontuarioId) {
        await supabase
          .from("avaliacoes_historico")
          .insert([{
            prontuario_id: prontuarioId,
            acao: "criar_avaliacao",
            dados_novos: formData as unknown as null,
            executado_por: userId,
          }]);
      }

      toast({
        title: "Sucesso",
        description: "Avaliação finalizada com sucesso!",
      });

      setDialogOpen(false);
      setSelectedProntuario(null);
      setFormData(initialFormData);
      fetchData();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Erro",
        description: "Erro ao salvar avaliação.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
      aguardando_classificacao: { label: "Aguardando Classificação", className: "bg-warning text-warning-foreground", icon: <Clock className="h-3 w-3" /> },
      aguardando_nir: { label: "Aguardando NIR", className: "bg-info text-info-foreground", icon: <Clock className="h-3 w-3" /> },
      aguardando_faturamento: { label: "Aguardando Faturamento", className: "bg-primary text-primary-foreground", icon: <Clock className="h-3 w-3" /> },
      em_avaliacao: { label: "Em Avaliação", className: "bg-secondary text-secondary-foreground", icon: <Clock className="h-3 w-3" /> },
      concluido: { label: "Concluído", className: "bg-success text-success-foreground", icon: <CheckCircle className="h-3 w-3" /> },
      pendente: { label: "Pendente", className: "bg-destructive text-destructive-foreground", icon: <AlertCircle className="h-3 w-3" /> },
    };
    
    const config = statusConfig[status] || { label: status, className: "bg-secondary", icon: null };
    return (
      <Badge className={`${config.className} flex items-center gap-1`}>
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  const getResultadoBadge = (resultado: string | null) => {
    if (!resultado) return null;
    const config: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
      completo: { label: "Completo", className: "bg-success text-success-foreground", icon: <CheckCircle className="h-3 w-3" /> },
      com_pendencias: { label: "Com Pendências", className: "bg-warning text-warning-foreground", icon: <AlertCircle className="h-3 w-3" /> },
      incompleto: { label: "Incompleto", className: "bg-destructive text-destructive-foreground", icon: <XCircle className="h-3 w-3" /> },
    };
    const c = config[resultado] || { label: resultado, className: "bg-secondary", icon: null };
    return (
      <Badge className={`${c.className} flex items-center gap-1`}>
        {c.icon}
        {c.label}
      </Badge>
    );
  };

  const isProntuarioAvaliado = (saidaId: string) => {
    return avaliacoesMap.has(saidaId);
  };

  // Data is now server-side filtered; return current data per active tab
  const displayData = activeTab === "faltantes" ? prontuariosFaltantes : [];
  const displayCount = activeTab === "avaliados" ? avaliacoes.length : displayData.length;

  const handleViewAvaliacao = (saidaId: string) => {
    const avaliacao = avaliacoesMap.get(saidaId);
    if (avaliacao) {
      setSelectedAvaliacao(avaliacao);
      setViewDialogOpen(true);
    }
  };

  const renderFormField = (
    label: string, 
    fieldName: keyof FormData, 
    options: { value: string; label: string }[],
    obsFieldName?: keyof FormData
  ) => (
    <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
      <Label className="text-sm font-semibold">{label} *</Label>
      <RadioGroup
        value={formData[fieldName]}
        onValueChange={(value) => setFormData(prev => ({ ...prev, [fieldName]: value }))}
        className="flex flex-wrap gap-4"
      >
        {options.map((option) => (
          <div key={option.value} className="flex items-center space-x-2">
            <RadioGroupItem value={option.value} id={`${fieldName}-${option.value}`} />
            <Label htmlFor={`${fieldName}-${option.value}`} className="cursor-pointer font-normal">
              {option.label}
            </Label>
          </div>
        ))}
      </RadioGroup>
      {obsFieldName && (
        <div className="mt-2">
          <Label className="text-xs text-muted-foreground">Observações (opcional)</Label>
          <Textarea
            value={formData[obsFieldName] as string}
            onChange={(e) => setFormData(prev => ({ ...prev, [obsFieldName]: e.target.value }))}
            placeholder="Adicione observações se necessário..."
            className="mt-1 h-20"
          />
        </div>
      )}
    </div>
  );

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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Prontuários</h2>
          <p className="text-muted-foreground">Avaliação e gestão de prontuários médicos</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={activeTab === "faltantes" ? "default" : "outline"}
          onClick={() => setActiveTab("faltantes")}
        >
          <AlertCircle className="h-4 w-4 mr-2" />
          Faltantes ({faltantesCount})
        </Button>
        <Button
          variant={activeTab === "avaliados" ? "default" : "outline"}
          onClick={() => setActiveTab("avaliados")}
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Avaliados ({avaliadosCount})
        </Button>
        {canSeeDashboard && (
          <Button
            variant={activeTab === "dashboard" ? "default" : "outline"}
            onClick={() => setActiveTab("dashboard")}
          >
            <BarChart2 className="h-4 w-4 mr-2" />
            Dashboard Gerencial
          </Button>
        )}
      </div>

      {/* Dashboard Tab */}
      {activeTab === "dashboard" && canSeeDashboard && (
        <DashboardFaturamento />
      )}

      {activeTab !== "dashboard" && (<>
      {/* Search & Filters */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome do paciente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Date filter presets */}
          <div className="flex flex-wrap items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground mr-1">Filtrar por:</span>
            {([
              { key: "hoje", label: "Hoje" },
              { key: "semana", label: "Semana" },
              { key: "mes", label: "Mês" },
              { key: "ano", label: "Ano" },
            ] as { key: DateFilterPreset; label: string }[]).map(({ key, label }) => (
              <Button
                key={key}
                size="sm"
                variant={datePreset === key ? "default" : "outline"}
                onClick={() => {
                  setDatePreset(datePreset === key ? null : key);
                  setCustomDateStart("");
                  setCustomDateEnd("");
                }}
                className="h-8"
              >
                {label}
              </Button>
            ))}

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* Custom date range */}
            <Input
              type="date"
              value={customDateStart}
              onChange={(e) => {
                setCustomDateStart(e.target.value);
                setDatePreset(e.target.value ? "custom" : null);
              }}
              className="h-8 w-36 text-xs"
              placeholder="Data início"
            />
            <span className="text-xs text-muted-foreground">até</span>
            <Input
              type="date"
              value={customDateEnd}
              onChange={(e) => {
                setCustomDateEnd(e.target.value);
                if (customDateStart) setDatePreset("custom");
              }}
              className="h-8 w-36 text-xs"
              placeholder="Data fim"
            />

            {datePreset && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setDatePreset(null);
                  setCustomDateStart("");
                  setCustomDateEnd("");
                }}
                className="h-8 text-muted-foreground"
              >
                <X className="h-3 w-3 mr-1" />
                Limpar
              </Button>
            )}
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{activeTab === "avaliados" ? "Resultado:" : "Status:"}</span>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-48 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {activeTab === "avaliados" ? (
                  <>
                    <SelectItem value="completo">Completo</SelectItem>
                    <SelectItem value="com_pendencias">Com Pendências</SelectItem>
                    <SelectItem value="incompleto">Incompleto</SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="aguardando_classificacao">Aguardando Classificação</SelectItem>
                    <SelectItem value="aguardando_nir">Aguardando NIR</SelectItem>
                    <SelectItem value="aguardando_faturamento">Aguardando Faturamento</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          {(datePreset || statusFilter !== "todos") && (
            <p className="text-xs text-muted-foreground">
              Exibindo <span className="font-medium text-foreground">{displayCount}</span> registro(s) filtrado(s)
            </p>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {activeTab === "faltantes" ? "Prontuários Faltantes" : "Prontuários Avaliados"}
          </CardTitle>
          <CardDescription>
            {activeTab === "faltantes" ? "Prontuários que ainda não foram avaliados" : "Prontuários com avaliação finalizada"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : activeTab === "avaliados" ? (
            // Avaliados tab - show avaliacoes directly
            avaliacoes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma avaliação encontrada.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                     <TableHead>Paciente</TableHead>
                     <TableHead>Data Nasc.</TableHead>
                     <TableHead>Setor</TableHead>
                     <TableHead>Data Atendimento</TableHead>
                     <TableHead>Resultado</TableHead>
                     <TableHead>Data Avaliação</TableHead>
                     <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {avaliacoes.map((av) => (
                    <TableRow key={av.id}>
                      <TableCell className="font-medium uppercase">{av.paciente_nome || "-"}</TableCell>
                      <TableCell>{safeFormatDate((av as any).nascimento_mae, "dd/MM/yyyy")}</TableCell>
                      <TableCell>{(av.unidade_setor && setorLabelMap[av.unidade_setor]) || av.unidade_setor || "-"}</TableCell>
                      <TableCell>{safeFormatDate(av.data_atendimento, "dd/MM/yyyy")}</TableCell>
                      <TableCell>{getResultadoBadge(av.resultado_final)}</TableCell>
                      <TableCell>{safeFormatDate(av.data_inicio, "dd/MM/yyyy")}</TableCell>
                      <TableCell>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => { setSelectedAvaliacao(av); setViewDialogOpen(true); }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Visualizar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )
          ) : displayData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum prontuário encontrado.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Data Nasc.</TableHead>
                  <TableHead>Data Atendimento</TableHead>
                  <TableHead>Status Fluxo</TableHead>
                  <TableHead>Recepção</TableHead>
                  <TableHead>Classificação</TableHead>
                  <TableHead>NIR</TableHead>
                  <TableHead>Resultado</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayData.map((saida) => {
                  const avaliacao = avaliacoesMap.get(saida.id);
                  return (
                    <TableRow key={saida.id}>
                      <TableCell className="font-medium uppercase">{saida.paciente_nome || "-"}</TableCell>
                      <TableCell>
                        {safeFormatDate(saida.nascimento_mae, "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>
                        {safeFormatDate(saida.data_atendimento, "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>{getStatusBadge(saida.status)}</TableCell>
                      <TableCell>
                        {safeFormatDate(saida.registrado_recepcao_em, "dd/MM/yy HH:mm")}
                      </TableCell>
                      <TableCell>
                        {safeFormatDate(saida.validado_classificacao_em, "dd/MM/yy HH:mm")}
                      </TableCell>
                      <TableCell>
                        {safeFormatDate(saida.conferido_nir_em, "dd/MM/yy HH:mm")}
                      </TableCell>
                      <TableCell>
                        {avaliacao ? getResultadoBadge(avaliacao.resultado_final) : "-"}
                      </TableCell>
                      <TableCell>
                        {avaliacao ? (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleViewAvaliacao(saida.id)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Visualizar
                          </Button>
                        ) : (
                          <Button 
                            size="sm" 
                            onClick={() => handleOpenForm(saida)}
                          >
                            <ClipboardCheck className="h-4 w-4 mr-1" />
                            Iniciar Avaliação
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {!isLoading && (activeTab !== "avaliados" ? displayData.length >= PAGE_SIZE : avaliacoes.length >= PAGE_SIZE) && (
            <div className="flex justify-center gap-2 mt-4">
              <Button 
                size="sm" 
                variant="outline" 
                disabled={currentPage === 0}
                onClick={() => setCurrentPage(p => p - 1)}
              >
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground self-center">
                Página {currentPage + 1}
              </span>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setCurrentPage(p => p + 1)}
              >
                Próxima
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      </>)}

      {/* Evaluation Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              Avaliação de Prontuário
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-6 py-4">
              {/* Header Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-primary/5 rounded-lg border">
                <div>
                  <Label className="text-xs text-muted-foreground">Nome do Paciente</Label>
                  <Input value={selectedProntuario?.paciente_nome || "-"} disabled className="mt-1 font-bold" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Data/Hora da Avaliação</Label>
                  <Input value={safeFormatDate(new Date().toISOString(), "dd/MM/yyyy HH:mm")} disabled className="mt-1" />
                </div>
              </div>

              <Separator />

              {/* RF-03.1 - Unidade/Setor */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Unidade / Setor *</Label>
                <Select
                  value={formData.unidade_setor}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, unidade_setor: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a unidade/setor" />
                  </SelectTrigger>
                  <SelectContent>
                    {unidadeSetorOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Accordion for evaluation sections */}
              <Accordion type="multiple" defaultValue={["identificacao", "acolhimento", "atendimento", "documentacao", "enfermagem", "internado"]} className="space-y-2">
                <AccordionItem value="identificacao" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="font-semibold">Identificação do Paciente</span>
                  </AccordionTrigger>
                  <AccordionContent>
                    {renderFormField("Status", "identificacao_paciente", identificacaoOptions, "identificacao_paciente_obs")}
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="acolhimento" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="font-semibold">Acolhimento, Triagem e Classificação</span>
                  </AccordionTrigger>
                  <AccordionContent>
                    {renderFormField("Status", "acolhimento_triagem", conformeOptions, "acolhimento_triagem_obs")}
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="atendimento" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="font-semibold">Atendimento Médico</span>
                  </AccordionTrigger>
                  <AccordionContent>
                    {renderFormField("Status", "atendimento_medico", conformeOptions, "atendimento_medico_obs")}
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="documentacao" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="font-semibold">Documentação Médica (CFM)</span>
                  </AccordionTrigger>
                  <AccordionContent>
                    {renderFormField("Status", "documentacao_medica_cfm", conformeOptions, "documentacao_medica_cfm_obs")}
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="enfermagem" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="font-semibold">Enfermagem / Medicação</span>
                  </AccordionTrigger>
                  <AccordionContent>
                    {renderFormField("Status", "enfermagem_medicacao", conformeOptions, "enfermagem_medicacao_obs")}
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="internado" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="font-semibold">Paciente Internado</span>
                  </AccordionTrigger>
                  <AccordionContent>
                    {renderFormField("Status", "paciente_internado", pacienteInternadoOptions, "paciente_internado_obs")}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <Separator />

              {/* RF-03.9 - Resultado Final */}
              <div className="space-y-3 p-4 bg-primary/5 rounded-lg border-2 border-primary/20">
                <Label className="text-sm font-semibold text-primary">Resultado Final do Prontuário *</Label>
                <RadioGroup
                  value={formData.resultado_final}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, resultado_final: value }))}
                  className="flex flex-wrap gap-4"
                >
                  {resultadoFinalOptions.map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={option.value} id={`resultado-${option.value}`} />
                      <Label htmlFor={`resultado-${option.value}`} className="cursor-pointer font-normal">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {/* RF-03.10 - Comentários Finais */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Comentários Finais (opcional)</Label>
                <Textarea
                  value={formData.comentarios_finais}
                  onChange={(e) => setFormData(prev => ({ ...prev, comentarios_finais: e.target.value }))}
                  placeholder="Adicione comentários finais sobre a avaliação..."
                  className="h-24"
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSubmitAvaliacao}
                  disabled={isSubmitting}
                  className="min-w-[180px]"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Finalizar Avaliação
                </Button>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* View Evaluation Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Visualização da Avaliação
            </DialogTitle>
          </DialogHeader>
          
          {selectedAvaliacao && (
            <ScrollArea className="max-h-[70vh] pr-4">
              <div className="space-y-4 py-4">
                {/* Header */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground">Paciente</p>
                    <p className="font-bold">{selectedAvaliacao.paciente_nome || selectedAvaliacao.numero_prontuario || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Data da Avaliação</p>
                    <p className="font-medium">
                      {safeFormatDate(selectedAvaliacao.data_conclusao, "dd/MM/yyyy HH:mm")}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-muted/30 rounded">
                    <p className="text-xs text-muted-foreground">Unidade/Setor</p>
                    <p className="font-medium">{unidadeSetorOptions.find(o => o.value === selectedAvaliacao.unidade_setor)?.label || "-"}</p>
                  </div>
                  <div className="p-3 bg-muted/30 rounded">
                    <p className="text-xs text-muted-foreground">Resultado Final</p>
                    {getResultadoBadge(selectedAvaliacao.resultado_final)}
                  </div>
                </div>

                <Separator />

                {/* Evaluation Details */}
                <div className="space-y-3">
                  {[
                    { label: "Identificação do Paciente", value: selectedAvaliacao.identificacao_paciente, obs: selectedAvaliacao.identificacao_paciente_obs },
                    { label: "Acolhimento, Triagem e Classificação", value: selectedAvaliacao.acolhimento_triagem, obs: selectedAvaliacao.acolhimento_triagem_obs },
                    { label: "Atendimento Médico", value: selectedAvaliacao.atendimento_medico, obs: selectedAvaliacao.atendimento_medico_obs },
                    { label: "Documentação Médica (CFM)", value: selectedAvaliacao.documentacao_medica_cfm, obs: selectedAvaliacao.documentacao_medica_cfm_obs },
                    { label: "Enfermagem / Medicação", value: selectedAvaliacao.enfermagem_medicacao, obs: selectedAvaliacao.enfermagem_medicacao_obs },
                    { label: "Paciente Internado", value: selectedAvaliacao.paciente_internado, obs: selectedAvaliacao.paciente_internado_obs },
                  ].map((item, index) => (
                    <div key={index} className="flex items-start justify-between p-3 bg-muted/20 rounded">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.label}</p>
                        {item.obs && <p className="text-xs text-muted-foreground mt-1">{item.obs}</p>}
                      </div>
                      <Badge 
                        className={
                          item.value === "conforme" || item.value === "completa" 
                            ? "bg-success text-success-foreground" 
                            : item.value === "nao_se_aplica"
                            ? "bg-secondary text-secondary-foreground"
                            : "bg-destructive text-destructive-foreground"
                        }
                      >
                        {item.value === "conforme" ? "Conforme" : 
                         item.value === "nao_conforme" ? "Não Conforme" :
                         item.value === "completa" ? "Completa" :
                         item.value === "incompleta" ? "Incompleta" :
                         item.value === "nao_se_aplica" ? "N/A" : item.value}
                      </Badge>
                    </div>
                  ))}
                </div>

                {selectedAvaliacao.comentarios_finais && (
                  <>
                    <Separator />
                    <div className="p-3 bg-muted/30 rounded">
                      <p className="text-xs text-muted-foreground mb-1">Comentários Finais</p>
                      <p className="text-sm">{selectedAvaliacao.comentarios_finais}</p>
                    </div>
                  </>
                )}

                <div className="p-3 bg-warning/10 border border-warning/30 rounded flex items-center gap-2 text-sm text-warning">
                  <AlertCircle className="h-4 w-4" />
                  Esta avaliação está finalizada e não pode ser editada.
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
