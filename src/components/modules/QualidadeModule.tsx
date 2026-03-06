import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLogAccess } from "@/hooks/useLogAccess";
import { useRealtimeSync, REALTIME_PRESETS } from "@/hooks/useRealtimeSync";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, ClipboardCheck, BarChart3, FileText, Plus, Eye, Pencil, ShieldX, TrendingUp, AlertCircle, CheckCircle2, Clock, Target, Stethoscope, Brain, Send, UserCheck, Upload, Bot, Loader2, Users, Paperclip } from "lucide-react";
import { SectionHeader, ActionButton } from "@/components/ui/action-buttons";
import { StatCard } from "@/components/ui/stat-card";
import { SearchInput } from "@/components/ui/search-input";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge, mapStatusToType } from "@/components/ui/status-badge";
import { ExportDropdown } from "@/components/ui/export-dropdown";
import { DateRangeFilter } from "@/components/ui/date-range-filter";
import { DashboardConformidade, MetasSegurancaPaciente, FormulariosQualidade } from "@/components/qualidade";
import { RiscosOperacionaisChart, AnalisarIncidenteIA, ImportarIncidentesDialog } from "@/components/gestao-incidentes";
import * as XLSX from "xlsx";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Incidente {
  id: string;
  numero_notificacao: string;
  tipo_incidente: string;
  data_ocorrencia: string;
  local_ocorrencia: string;
  setor: string;
  setor_origem: string | null;
  descricao: string;
  classificacao_risco: string;
  status: string;
  notificador_id: string | null;
  notificador_nome: string | null;
  notificacao_anonima: boolean;
  paciente_envolvido: boolean;
  paciente_nome: string | null;
  paciente_prontuario: string | null;
  observacoes: string | null;
  created_at: string;
  responsavel_tratativa_id: string | null;
  responsavel_tratativa_nome: string | null;
  plano_acao: string | null;
  evidencia_url: string | null;
  data_conclusao: string | null;
}

interface Analise {
  id: string;
  incidente_id: string;
  tipo_analise: string;
  descricao_analise: string;
  causas_identificadas: string | null;
  fatores_contribuintes: string | null;
  analisado_por: string;
  analisado_por_nome: string;
  data_analise: string;
}

interface Acao {
  id: string;
  incidente_id: string;
  analise_id: string | null;
  tipo_acao: string;
  descricao: string;
  responsavel_id: string | null;
  responsavel_nome: string;
  prazo: string;
  status: string;
  data_conclusao: string | null;
  observacoes: string | null;
}

interface Usuario {
  id: string;
  user_id: string;
  full_name: string;
}

interface Auditoria {
  id: string;
  tipo_auditoria: string;
  titulo: string;
  data_auditoria: string;
  auditor: string;
  setor_auditado: string;
  escopo: string | null;
  status: string;
  resultado: string | null;
  observacoes: string | null;
  created_by_nome: string;
}

/** Normaliza nome de setor: remove acentos, capitaliza. "urgencia" e "Urgência" → "Urgência" */
const normalizeSetor = (s: string): string => {
  const lower = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  // Mapa de nomes canônicos
  const map: Record<string, string> = {
    "urgencia": "Urgência",
    "emergencia": "Emergência",
    "pediatria": "Pediatria",
    "isolamento": "Isolamento",
    "internacao": "Internação",
    "medicacao": "Medicação",
    "laboratorio": "Laboratório",
    "recepcao": "Recepção",
    "classificacao": "Classificação",
    "sutura": "Sutura",
    "raio-x": "Raio-X",
  };
  return map[lower] || s.charAt(0).toUpperCase() + s.slice(1);
};

const tiposIncidente = [
  { value: "evento_adverso", label: "Evento Adverso" },
  { value: "quase_erro", label: "Quase Erro (Near Miss)" },
  { value: "incidente_sem_dano", label: "Incidente sem Dano" },
];

const classificacoesRisco = [
  { value: "leve", label: "Leve", color: "bg-green-500" },
  { value: "moderado", label: "Moderado", color: "bg-yellow-500" },
  { value: "grave", label: "Grave", color: "bg-orange-500" },
  { value: "catastrofico", label: "Catastrófico", color: "bg-red-600" },
];

const statusIncidente = [
  { value: "notificado", label: "Notificado" },
  { value: "em_analise", label: "Em Análise" },
  { value: "encerrado", label: "Encerrado" },
];

const tiposAnalise = [
  { value: "causa_raiz", label: "Análise de Causa Raiz" },
  { value: "espinha_peixe", label: "Diagrama Espinha de Peixe" },
  { value: "5_porques", label: "5 Porquês" },
  { value: "outro", label: "Outro" },
];

const setoresHospitalares = [
  "Emergência", "UTI Adulto", "UTI Pediátrica", "Centro Cirúrgico", "CME",
  "Observação Adulto", "Observação Pediátrica", "Farmácia", "Laboratório",
  "Radiologia", "Recepção", "Ambulatório", "Administração", "Outro"
];

export const QualidadeModule = () => {
  const { logAction } = useLogAccess();
  useRealtimeSync(REALTIME_PRESETS.qualidade);
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("metas");
  const [incidentesView, setIncidentesView] = useState<"lista" | "tratamento" | "dashboard">("lista");
  
  // Data states
  const [incidentes, setIncidentes] = useState<Incidente[]>([]);
  const [analises, setAnalises] = useState<Analise[]>([]);
  const [acoes, setAcoes] = useState<Acao[]>([]);
  const [auditorias, setAuditorias] = useState<Auditoria[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [tipoFilter, setTipoFilter] = useState("todos");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  
  // Dialog states
  const [incidenteDialog, setIncidenteDialog] = useState(false);
  const [analiseDialog, setAnaliseDialog] = useState(false);
  const [acaoDialog, setAcaoDialog] = useState(false);
  const [auditoriaDialog, setAuditoriaDialog] = useState(false);
  const [detalhesDialog, setDetalhesDialog] = useState(false);
  const [encaminharDialog, setEncaminharDialog] = useState(false);
  const [importarDialog, setImportarDialog] = useState(false);
  const [selectedIncidente, setSelectedIncidente] = useState<Incidente | null>(null);
  const [selectedAcao, setSelectedAcao] = useState<Acao | null>(null);
  const [novoResponsavel, setNovoResponsavel] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [iaReviewLoading, setIaReviewLoading] = useState<string | null>(null);
  const [iaReviewResult, setIaReviewResult] = useState<{ incidenteId: string; resultado: any } | null>(null);
  const [iaReviewDialog, setIaReviewDialog] = useState(false);
  const [responsavelDialog, setResponsavelDialog] = useState(false);
  const [responsavelIncidente, setResponsavelIncidente] = useState<Incidente | null>(null);
  const [tratativaDialog, setTratativaDialog] = useState(false);
  const [tratativaIncidente, setTratativaIncidente] = useState<Incidente | null>(null);
  const [tratativaPlano, setTratativaPlano] = useState("");
  const [tratativaStatus, setTratativaStatus] = useState("");
  const [tratativaEvidencia, setTratativaEvidencia] = useState<File | null>(null);
  const [uploadingEvidencia, setUploadingEvidencia] = useState(false);
  const [iaSugestaoClassificacao, setIaSugestaoClassificacao] = useState("");
  const [iaSugestaoRisco, setIaSugestaoRisco] = useState("");
  const [iaSugestaoResponsavel, setIaSugestaoResponsavel] = useState("");
  const [iaSugestaoPlano, setIaSugestaoPlano] = useState("");
  const [iaSugestaoEvidencia, setIaSugestaoEvidencia] = useState("");
  
  // Form data
  const [incidenteForm, setIncidenteForm] = useState({
    tipo_incidente: "",
    data_ocorrencia: "",
    local_ocorrencia: "",
    setor: "",
    descricao: "",
    classificacao_risco: "",
    notificacao_anonima: false,
    paciente_envolvido: false,
    paciente_nome: "",
    paciente_prontuario: "",
    observacoes: "",
  });

  const [analiseForm, setAnaliseForm] = useState({
    tipo_analise: "",
    descricao_analise: "",
    causas_identificadas: "",
    fatores_contribuintes: "",
  });

  const [acaoForm, setAcaoForm] = useState({
    tipo_acao: "corretiva",
    descricao: "",
    responsavel_nome: "",
    prazo: "",
    observacoes: "",
  });

  const [auditoriaForm, setAuditoriaForm] = useState({
    tipo_auditoria: "interna",
    titulo: "",
    data_auditoria: "",
    auditor: "",
    setor_auditado: "",
    escopo: "",
    observacoes: "",
  });
  
  // Current user info
  const [currentUser, setCurrentUser] = useState<{ id: string; nome: string }>({ id: "", nome: "" });

  useEffect(() => {
    checkPermissionAndLoad();
  }, []);

  const checkPermissionAndLoad = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .maybeSingle();
    
    setCurrentUser({ id: user.id, nome: profile?.full_name || user.email || "" });

    // Check if user has permission
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    const hasAccess = ["admin", "qualidade", "nsp", "gestor"].includes(roleData?.role || "");
    setHasPermission(hasAccess);
    
    if (hasAccess) {
      await loadData();
      logAction("Qualidade/NSP", "acesso_modulo");
    }
    setIsLoading(false);
  };

  const loadData = async () => {
    const [incidentesRes, analisesRes, acoesRes, auditoriasRes, usuariosRes] = await Promise.all([
      supabase.from("incidentes_nsp").select("*").order("data_ocorrencia", { ascending: false }),
      supabase.from("analises_incidentes").select("*").order("data_analise", { ascending: false }),
      supabase.from("acoes_incidentes").select("*").order("created_at", { ascending: false }),
      supabase.from("auditorias_qualidade").select("*").order("data_auditoria", { ascending: false }),
      supabase.from("profiles").select("id, user_id, full_name").order("full_name"),
    ]);

    if (incidentesRes.data) setIncidentes(incidentesRes.data);
    if (analisesRes.data) setAnalises(analisesRes.data);
    if (acoesRes.data) setAcoes(acoesRes.data);
    if (auditoriasRes.data) setAuditorias(auditoriasRes.data);
    if (usuariosRes.data) setUsuarios(usuariosRes.data);
  };

  const handleCreateIncidente = async () => {
    if (!incidenteForm.tipo_incidente || !incidenteForm.data_ocorrencia || !incidenteForm.setor || !incidenteForm.descricao || !incidenteForm.classificacao_risco) {
      toast({ title: "Erro", description: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }
    
    setIsSubmitting(true);
    const { error } = await supabase.from("incidentes_nsp").insert([{
      numero_notificacao: "", // Generated by trigger
      tipo_incidente: incidenteForm.tipo_incidente,
      data_ocorrencia: incidenteForm.data_ocorrencia,
      local_ocorrencia: incidenteForm.local_ocorrencia,
      setor: incidenteForm.setor,
      descricao: incidenteForm.descricao,
      classificacao_risco: incidenteForm.classificacao_risco,
      notificacao_anonima: incidenteForm.notificacao_anonima,
      paciente_envolvido: incidenteForm.paciente_envolvido,
      paciente_nome: incidenteForm.paciente_nome || null,
      paciente_prontuario: incidenteForm.paciente_prontuario || null,
      observacoes: incidenteForm.observacoes || null,
      notificador_id: incidenteForm.notificacao_anonima ? null : currentUser.id,
      notificador_nome: incidenteForm.notificacao_anonima ? null : currentUser.nome,
    }]);
    
    if (error) {
      toast({ title: "Erro", description: "Falha ao registrar incidente", variant: "destructive" });
    } else {
      toast({ title: "Sucesso", description: "Incidente notificado com sucesso" });
      setIncidenteDialog(false);
      resetIncidenteForm();
      loadData();
      logAction("Qualidade/NSP", "registro_incidente", { tipo: incidenteForm.tipo_incidente });
    }
    setIsSubmitting(false);
  };

  const handleCreateAnalise = async () => {
    if (!selectedIncidente || !analiseForm.tipo_analise || !analiseForm.descricao_analise) {
      toast({ title: "Erro", description: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }
    
    setIsSubmitting(true);
    
    // Create analysis
    const { error: analiseError } = await supabase.from("analises_incidentes").insert({
      incidente_id: selectedIncidente.id,
      ...analiseForm,
      analisado_por: currentUser.id,
      analisado_por_nome: currentUser.nome,
    });
    
    // Update incident status
    if (!analiseError) {
      await supabase.from("incidentes_nsp")
        .update({ status: "em_analise" })
        .eq("id", selectedIncidente.id);
    }
    
    if (analiseError) {
      toast({ title: "Erro", description: "Falha ao registrar análise", variant: "destructive" });
    } else {
      toast({ title: "Sucesso", description: "Análise registrada" });
      setAnaliseDialog(false);
      resetAnaliseForm();
      loadData();
      logAction("Qualidade/NSP", "registro_analise", { incidente: selectedIncidente.numero_notificacao });
    }
    setIsSubmitting(false);
  };

  const handleCreateAcao = async () => {
    if (!selectedIncidente || !acaoForm.descricao || !acaoForm.responsavel_nome || !acaoForm.prazo) {
      toast({ title: "Erro", description: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }
    
    setIsSubmitting(true);
    const { error } = await supabase.from("acoes_incidentes").insert({
      incidente_id: selectedIncidente.id,
      ...acaoForm,
      registrado_por: currentUser.id,
      registrado_por_nome: currentUser.nome,
    });
    
    if (error) {
      toast({ title: "Erro", description: "Falha ao registrar ação", variant: "destructive" });
    } else {
      toast({ title: "Sucesso", description: "Ação registrada" });
      setAcaoDialog(false);
      resetAcaoForm();
      loadData();
      logAction("Qualidade/NSP", "registro_acao", { tipo: acaoForm.tipo_acao });
    }
    setIsSubmitting(false);
  };

  const handleCreateAuditoria = async () => {
    if (!auditoriaForm.titulo || !auditoriaForm.data_auditoria || !auditoriaForm.auditor || !auditoriaForm.setor_auditado) {
      toast({ title: "Erro", description: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }
    
    setIsSubmitting(true);
    const { error } = await supabase.from("auditorias_qualidade").insert({
      ...auditoriaForm,
      created_by: currentUser.id,
      created_by_nome: currentUser.nome,
    });
    
    if (error) {
      toast({ title: "Erro", description: "Falha ao registrar auditoria", variant: "destructive" });
    } else {
      toast({ title: "Sucesso", description: "Auditoria registrada" });
      setAuditoriaDialog(false);
      resetAuditoriaForm();
      loadData();
      logAction("Qualidade/NSP", "registro_auditoria", { titulo: auditoriaForm.titulo });
    }
    setIsSubmitting(false);
  };

  const handleUpdateIncidenteStatus = async (id: string, novoStatus: string) => {
    const { error } = await supabase
      .from("incidentes_nsp")
      .update({ status: novoStatus })
      .eq("id", id);
    
    if (error) {
      toast({ title: "Erro", description: "Falha ao atualizar status", variant: "destructive" });
    } else {
      toast({ title: "Sucesso", description: "Status atualizado" });
      loadData();
      logAction("Qualidade/NSP", "alteracao_status_incidente", { id, status: novoStatus });
    }
  };

  const handleEncaminharAcao = async () => {
    if (!selectedAcao || !novoResponsavel) {
      toast({ title: "Erro", description: "Selecione um responsável", variant: "destructive" });
      return;
    }
    
    const usuario = usuarios.find(u => u.user_id === novoResponsavel);
    if (!usuario) return;

    setIsSubmitting(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Atualizar a ação com o novo responsável
      const { error: updateError } = await supabase
        .from("acoes_incidentes")
        .update({ 
          responsavel_id: usuario.user_id,
          responsavel_nome: usuario.full_name 
        })
        .eq("id", selectedAcao.id);

      if (updateError) throw updateError;

      // Criar notificação na agenda para o destinatário
      const { data: agendaItem, error: agendaError } = await supabase
        .from("agenda_items")
        .insert({
          tipo: "tarefa",
          titulo: `Ação encaminhada: ${selectedAcao.tipo_acao === "corretiva" ? "Corretiva" : "Preventiva"}`,
          descricao: `Você recebeu uma ação para executar: ${selectedAcao.descricao}\n\nPrazo: ${format(new Date(selectedAcao.prazo), "dd/MM/yyyy")}`,
          data_inicio: new Date().toISOString(),
          prioridade: "alta",
          status: "pendente",
          criado_por: user.id,
        })
        .select()
        .single();

      if (agendaError) throw agendaError;

      // Associar a notificação ao destinatário
      const { error: destinatarioError } = await supabase
        .from("agenda_destinatarios")
        .insert({
          agenda_item_id: agendaItem.id,
          usuario_id: usuario.user_id,
          visualizado: false,
        });

      if (destinatarioError) throw destinatarioError;

      toast({ title: "Sucesso", description: `Ação encaminhada para ${usuario.full_name} com notificação` });
      setEncaminharDialog(false);
      setSelectedAcao(null);
      setNovoResponsavel("");
      loadData();
      logAction("Qualidade/NSP", "encaminhar_acao", { acao_id: selectedAcao.id, novo_responsavel: usuario.full_name });
    } catch (error) {
      console.error("Erro ao encaminhar ação:", error);
      toast({ title: "Erro", description: "Falha ao encaminhar ação", variant: "destructive" });
    }
    
    setIsSubmitting(false);
  };

  const openEncaminharDialog = (acao: Acao) => {
    setSelectedAcao(acao);
    setNovoResponsavel(acao.responsavel_id || "");
    setEncaminharDialog(true);
  };

  // IA Review Classification
  const handleIAReview = async (incidente: Incidente) => {
    setIaReviewLoading(incidente.id);
    try {
      const { data, error } = await supabase.functions.invoke("analisar-incidente-ia", {
        body: {
          incidente: {
            descricao: incidente.descricao,
            setor: incidente.setor,
            paciente_envolvido: incidente.paciente_envolvido,
          },
          tipo_analise: "completa",
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erro na análise");
      
      const resultado = data.analise;
      setIaReviewResult({ incidenteId: incidente.id, resultado });
      
      // Pre-fill editable fields from AI suggestions
      setIaSugestaoClassificacao(resultado.classificacao_sugerida?.tipo || incidente.tipo_incidente);
      setIaSugestaoRisco(incidente.classificacao_risco);
      setIaSugestaoResponsavel("");
      setIaSugestaoPlano(
        resultado.plano_acao?.map((a: any) => `• ${a.acao} (${a.responsavel_sugerido} - ${a.prazo_sugerido})`).join("\n") || ""
      );
      setIaSugestaoEvidencia(
        resultado.plano_acao?.map((a: any) => a.acao).filter(Boolean).join("; ") || ""
      );
      setIaReviewDialog(true);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message || "Falha na análise de IA", variant: "destructive" });
    } finally {
      setIaReviewLoading(null);
    }
  };

  // Apply IA suggestions to the incident
  const handleApplyIASuggestions = async () => {
    if (!iaReviewResult) return;
    setIsSubmitting(true);
    try {
      const updateData: Record<string, any> = {
        tipo_incidente: iaSugestaoClassificacao,
        classificacao_risco: iaSugestaoRisco,
        plano_acao: iaSugestaoPlano || null,
      };

      if (iaSugestaoResponsavel) {
        const usuario = usuarios.find(u => u.user_id === iaSugestaoResponsavel);
        if (usuario) {
          updateData.responsavel_tratativa_id = usuario.user_id;
          updateData.responsavel_tratativa_nome = usuario.full_name;
          updateData.status = "em_analise";
        }
      }

      const { error } = await supabase.from("incidentes_nsp")
        .update(updateData)
        .eq("id", iaReviewResult.incidenteId);
      if (error) throw error;

      toast({ title: "Sucesso", description: "Sugestões da IA aplicadas com sucesso" });
      setIaReviewDialog(false);
      setIaReviewResult(null);
      loadData();
    } catch (err: any) {
      toast({ title: "Erro", description: "Falha ao aplicar sugestões", variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  // Assign responsible and create agenda notification
  const handleAssignResponsavel = async (userId: string) => {
    if (!responsavelIncidente) return;
    const usuario = usuarios.find(u => u.user_id === userId);
    if (!usuario) return;

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      // Update incident with responsible and status
      await supabase.from("incidentes_nsp")
        .update({ 
          status: "em_analise",
          responsavel_tratativa_id: userId,
          responsavel_tratativa_nome: usuario.full_name,
        })
        .eq("id", responsavelIncidente.id);

      // Create agenda item for the responsible
      const { data: agendaItem, error: agendaError } = await supabase
        .from("agenda_items")
        .insert({
          tipo: "tarefa",
          titulo: `Tratativa de Notificação ${responsavelIncidente.numero_notificacao}`,
          descricao: `Nova notificação de incidente atribuída para tratativa.\n\nNº: ${responsavelIncidente.numero_notificacao}\nSetor: ${responsavelIncidente.setor}\nClassificação: ${classificacoesRisco.find(c => c.value === responsavelIncidente.classificacao_risco)?.label || responsavelIncidente.classificacao_risco}\n\nDescrição: ${responsavelIncidente.descricao.substring(0, 200)}`,
          data_inicio: new Date().toISOString(),
          prioridade: responsavelIncidente.classificacao_risco === "catastrofico" || responsavelIncidente.classificacao_risco === "grave" ? "alta" : "media",
          status: "pendente",
          criado_por: user.id,
        })
        .select()
        .single();

      if (agendaError) throw agendaError;

      await supabase.from("agenda_destinatarios").insert({
        agenda_item_id: agendaItem.id,
        usuario_id: userId,
        visualizado: false,
      });

      toast({ title: "Sucesso", description: `Notificação atribuída a ${usuario.full_name}. Uma nova tarefa foi criada na agenda.` });
      setResponsavelDialog(false);
      setResponsavelIncidente(null);
      loadData();
      logAction("Qualidade/NSP", "atribuir_responsavel_notificacao", { incidente_id: responsavelIncidente.id, responsavel: usuario.full_name });
    } catch (err: any) {
      console.error("Erro ao atribuir responsável:", err);
      toast({ title: "Erro", description: "Falha ao atribuir responsável", variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  // Open tratativa dialog
  const openTratativaDialog = (incidente: Incidente) => {
    setTratativaIncidente(incidente);
    setTratativaPlano(incidente.plano_acao || "");
    setTratativaStatus(incidente.status);
    setTratativaEvidencia(null);
    setTratativaDialog(true);
  };

  // Save tratativa (plan, status, evidence)
  const handleSaveTratativa = async () => {
    if (!tratativaIncidente) return;
    setUploadingEvidencia(true);
    try {
      let evidenciaUrl = tratativaIncidente.evidencia_url;
      if (tratativaEvidencia) {
        const fileExt = tratativaEvidencia.name.split(".").pop();
        const filePath = `${tratativaIncidente.id}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("incidentes-evidencias")
          .upload(filePath, tratativaEvidencia);
        if (uploadError) throw uploadError;
        const { data: urlData } = await supabase.storage
          .from("incidentes-evidencias")
          .createSignedUrl(filePath, 60 * 60 * 24 * 365);
        evidenciaUrl = urlData?.signedUrl || null;
      }
      const updateData: Record<string, any> = {
        plano_acao: tratativaPlano || null,
        status: tratativaStatus,
        evidencia_url: evidenciaUrl,
      };
      if (tratativaStatus === "encerrado") {
        updateData.data_conclusao = new Date().toISOString();
      }
      const { error } = await supabase.from("incidentes_nsp")
        .update(updateData)
        .eq("id", tratativaIncidente.id);
      if (error) throw error;
      toast({ title: "Sucesso", description: "Tratativa atualizada com sucesso" });
      setTratativaDialog(false);
      setTratativaIncidente(null);
      loadData();
    } catch (err: any) {
      console.error("Erro ao salvar tratativa:", err);
      toast({ title: "Erro", description: "Falha ao salvar tratativa", variant: "destructive" });
    }
    setUploadingEvidencia(false);
  };

  const resetIncidenteForm = () => setIncidenteForm({
    tipo_incidente: "", data_ocorrencia: "", local_ocorrencia: "", setor: "",
    descricao: "", classificacao_risco: "", notificacao_anonima: false,
    paciente_envolvido: false, paciente_nome: "", paciente_prontuario: "", observacoes: "",
  });

  const resetAnaliseForm = () => setAnaliseForm({
    tipo_analise: "", descricao_analise: "", causas_identificadas: "", fatores_contribuintes: "",
  });

  const resetAcaoForm = () => setAcaoForm({
    tipo_acao: "corretiva", descricao: "", responsavel_nome: "", prazo: "", observacoes: "",
  });

  const resetAuditoriaForm = () => setAuditoriaForm({
    tipo_auditoria: "interna", titulo: "", data_auditoria: "", auditor: "",
    setor_auditado: "", escopo: "", observacoes: "",
  });

  // Filtered data
  const filteredIncidentes = incidentes.filter(i => {
    const matchSearch = searchTerm === "" || 
      i.numero_notificacao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.setor.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === "todos" || i.status === statusFilter;
    const matchTipo = tipoFilter === "todos" || i.tipo_incidente === tipoFilter;
    const matchDataInicio = !dataInicio || new Date(i.data_ocorrencia) >= new Date(dataInicio);
    const matchDataFim = !dataFim || new Date(i.data_ocorrencia) <= new Date(dataFim + "T23:59:59");
    return matchSearch && matchStatus && matchTipo && matchDataInicio && matchDataFim;
  });

  // Stats
  const stats = {
    total: incidentes.length,
    notificados: incidentes.filter(i => i.status === "notificado").length,
    emAnalise: incidentes.filter(i => i.status === "em_analise").length,
    encerrados: incidentes.filter(i => i.status === "encerrado").length,
    eventosAdversos: incidentes.filter(i => i.tipo_incidente === "evento_adverso").length,
    quaseErros: incidentes.filter(i => i.tipo_incidente === "quase_erro").length,
    acoesPendentes: acoes.filter(a => a.status === "pendente").length,
  };

  // Export functions
  const exportToExcel = () => {
    const data = filteredIncidentes.map(i => ({
      Número: i.numero_notificacao,
      Data: format(new Date(i.data_ocorrencia), "dd/MM/yyyy HH:mm"),
      Tipo: tiposIncidente.find(t => t.value === i.tipo_incidente)?.label || i.tipo_incidente,
      Setor: i.setor,
      Risco: classificacoesRisco.find(c => c.value === i.classificacao_risco)?.label || i.classificacao_risco,
      Status: statusIncidente.find(s => s.value === i.status)?.label || i.status,
      Descrição: i.descricao,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Incidentes");
    XLSX.writeFile(wb, `incidentes-nsp-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  const exportToPDF = async () => {
    const { createStandardPdf, savePdfWithFooter } = await import('@/lib/export-utils');
    const { doc, logoImg } = await createStandardPdf('Relatório de Incidentes - NSP');
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Período: ${dataInicio || "Início"} a ${dataFim || "Atual"}`, 14, 32);
    
    autoTable(doc, {
      startY: 38,
      head: [["Número", "Data", "Tipo", "Setor", "Risco", "Status"]],
      body: filteredIncidentes.map(i => [
        i.numero_notificacao,
        format(new Date(i.data_ocorrencia), "dd/MM/yyyy"),
        tiposIncidente.find(t => t.value === i.tipo_incidente)?.label || "",
        i.setor,
        classificacoesRisco.find(c => c.value === i.classificacao_risco)?.label || "",
        statusIncidente.find(s => s.value === i.status)?.label || "",
      ]),
      styles: { fontSize: 8 },
      margin: { bottom: 28 },
    });
    savePdfWithFooter(doc, 'Relatório de Incidentes - NSP', `incidentes-nsp-${format(new Date(), "yyyy-MM-dd")}`, logoImg);
  };

  const getRiscoColor = (risco: string) => {
    const r = classificacoesRisco.find(c => c.value === risco);
    return r?.color || "bg-gray-500";
  };

  if (isLoading) {
    return <LoadingState message="Carregando módulo..." />;
  }

  if (!hasPermission) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="p-4 rounded-full bg-destructive/10 mb-4">
          <ShieldX className="h-8 w-8 text-destructive" />
        </div>
        <h3 className="text-lg font-medium text-foreground">Acesso Negado</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          Você não tem permissão para acessar o módulo de Qualidade/NSP.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader 
        title="Qualidade / NSP - ONA Nível 1" 
        description="Gestão de incidentes, metas de segurança e conformidade - Núcleo de Segurança do Paciente"
      >
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-primary text-primary font-semibold px-3 py-1">
            ONA N1
          </Badge>
          <Button variant="outline" size="sm" onClick={() => setImportarDialog(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Importar XLSX
          </Button>
          <ActionButton type="add" label="Nova Notificação" onClick={() => setIncidenteDialog(true)} />
        </div>
      </SectionHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <StatCard title="Total" value={stats.total} icon={AlertTriangle} variant="primary" />
        <StatCard title="Notificados" value={stats.notificados} icon={Clock} variant="warning" />
        <StatCard title="Em Análise" value={stats.emAnalise} icon={Target} variant="info" />
        <StatCard title="Encerrados" value={stats.encerrados} icon={CheckCircle2} variant="success" />
        <StatCard title="Eventos Adversos" value={stats.eventosAdversos} icon={AlertCircle} variant="destructive" />
        <StatCard title="Quase Erros" value={stats.quaseErros} icon={AlertTriangle} variant="warning" />
        <StatCard title="Ações Pendentes" value={stats.acoesPendentes} icon={ClipboardCheck} variant="default" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="metas" className="gap-1">
            <Target className="h-4 w-4" />
            Metas de Segurança
          </TabsTrigger>
          <TabsTrigger value="conformidade" className="gap-1">
            <TrendingUp className="h-4 w-4" />
            Conformidade
          </TabsTrigger>
          <TabsTrigger value="incidentes">Incidentes</TabsTrigger>
          <TabsTrigger value="formularios" className="gap-1">
            <FileText className="h-4 w-4" />
            Formulários
          </TabsTrigger>
        </TabsList>

        {/* Metas de Segurança do Paciente - ONA Nível 1 */}
        <TabsContent value="metas" className="mt-4">
          <MetasSegurancaPaciente />
        </TabsContent>

        {/* Dashboard de Conformidade */}
        <TabsContent value="conformidade" className="mt-4">
          <DashboardConformidade />
        </TabsContent>

        {/* Incidentes Tab (com Riscos Operacionais) */}
        <TabsContent value="incidentes" className="space-y-4">
          {/* Sub-navigation buttons */}
          <div className="flex gap-2">
            <Button
              variant={incidentesView === "lista" ? "default" : "outline"}
              onClick={() => setIncidentesView("lista")}
            >
              Lista de Incidentes Notificados
            </Button>
            <Button
              variant={incidentesView === "tratamento" ? "default" : "outline"}
              onClick={() => setIncidentesView("tratamento")}
            >
              Tratamento de Notificações
            </Button>
            <Button
              variant={incidentesView === "dashboard" ? "default" : "outline"}
              onClick={() => setIncidentesView("dashboard")}
            >
              <BarChart3 className="h-4 w-4 mr-1" />
              Dashboard
            </Button>
          </div>

          {incidentesView === "lista" && (
            <>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex flex-wrap items-end gap-4">
                    <SearchInput
                      value={searchTerm}
                      onChange={setSearchTerm}
                      placeholder="Buscar incidente..."
                      className="w-[250px]"
                    />
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        {statusIncidente.map(s => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={tipoFilter} onValueChange={setTipoFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        {tiposIncidente.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <DateRangeFilter
                      startDate={dataInicio}
                      endDate={dataFim}
                      onStartDateChange={setDataInicio}
                      onEndDateChange={setDataFim}
                      showPresets={false}
                    />
                    <div className="ml-auto">
                      <ExportDropdown onExportExcel={exportToExcel} onExportPDF={exportToPDF} />
                    </div>
                  </div>
                </CardContent>
              </Card>

          {/* Tabela de Incidentes */}
            <Card className="overflow-auto">
              <CardContent className="pt-4">
                {filteredIncidentes.length === 0 ? (
                  <EmptyState
                    icon={AlertTriangle}
                    title="Nenhum incidente encontrado"
                    description="Registre notificações de incidentes de segurança"
                    action={{ label: "Nova Notificação", onClick: () => setIncidenteDialog(true) }}
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="whitespace-nowrap">Nº</TableHead>
                          <TableHead className="whitespace-nowrap">Data de Abertura</TableHead>
                          <TableHead className="whitespace-nowrap">Notificante</TableHead>
                          <TableHead className="whitespace-nowrap">Nome do Paciente</TableHead>
                          <TableHead className="whitespace-nowrap">Nº Prontuário</TableHead>
                          <TableHead className="whitespace-nowrap">Data do Ocorrido</TableHead>
                          <TableHead className="whitespace-nowrap">Setor Notificante</TableHead>
                          <TableHead className="whitespace-nowrap">Setor Notificado</TableHead>
                          <TableHead className="whitespace-nowrap">Descrição</TableHead>
                          <TableHead className="whitespace-nowrap">Correção/Ação Imediata</TableHead>
                          <TableHead className="whitespace-nowrap">Classificação</TableHead>
                          <TableHead className="whitespace-nowrap">Causas Prováveis (Protocolo de Londres)</TableHead>
                          <TableHead className="whitespace-nowrap">Dano</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredIncidentes.map(i => {
                          const descParts = i.descricao.split("\n\nCorreção/Ação imediata: ");
                          const descricaoPura = descParts[0];
                          const correcao = descParts[1] || "-";
                          const classificacaoOriginal = i.observacoes?.replace("Classificação original: ", "") || 
                            tiposIncidente.find(t => t.value === i.tipo_incidente)?.label || "-";
                          const dano = classificacoesRisco.find(c => c.value === i.classificacao_risco)?.label || "-";

                          return (
                            <TableRow key={i.id}>
                              <TableCell className="font-mono text-sm whitespace-nowrap">{i.numero_notificacao}</TableCell>
                              <TableCell className="whitespace-nowrap">{format(new Date(i.created_at), "dd/MM/yyyy HH:mm")}</TableCell>
                              <TableCell className="text-sm">{i.notificacao_anonima ? "Anônimo" : i.notificador_nome || "-"}</TableCell>
                              <TableCell className="text-sm max-w-[150px] truncate">{i.paciente_nome || "-"}</TableCell>
                              <TableCell className="text-sm">{i.paciente_prontuario || "-"}</TableCell>
                              <TableCell className="whitespace-nowrap">{format(new Date(i.data_ocorrencia), "dd/MM/yyyy HH:mm")}</TableCell>
                              <TableCell className="text-sm">{i.setor_origem || "-"}</TableCell>
                              <TableCell className="text-sm">{i.setor}</TableCell>
                              <TableCell className="text-sm max-w-[200px] truncate" title={descricaoPura}>{descricaoPura}</TableCell>
                              <TableCell className="text-sm max-w-[200px] truncate" title={correcao}>{correcao}</TableCell>
                              <TableCell className="text-sm">{classificacaoOriginal}</TableCell>
                              <TableCell className="text-sm max-w-[200px] truncate" title={
                                analises.filter(a => a.incidente_id === i.id).map(a => a.causas_identificadas).filter(Boolean).join("; ") || "Sem análise"
                              }>
                                {analises.filter(a => a.incidente_id === i.id).map(a => a.causas_identificadas).filter(Boolean).join("; ") || <span className="text-muted-foreground">-</span>}
                              </TableCell>
                              <TableCell>
                                <Badge className={`${getRiscoColor(i.classificacao_risco)} text-white`}>
                                  {dano}
                                </Badge>
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
            </>
          )}

          {incidentesView === "tratamento" && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">Tratamento de Notificações</h3>
                      <p className="text-sm text-muted-foreground">
                        Visualize, atribua responsáveis, gerencie tratativas e utilize IA para revisar classificações.
                      </p>
                    </div>
                  </div>
                  {incidentes.length === 0 ? (
                    <EmptyState
                      icon={CheckCircle2}
                      title="Nenhuma notificação"
                      description="Nenhuma notificação registrada"
                    />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nº</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Setor</TableHead>
                          <TableHead>Classificação</TableHead>
                          <TableHead>Responsável</TableHead>
                          <TableHead>Plano de Ação</TableHead>
                          <TableHead>Evidência</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {incidentes.map(i => (
                          <TableRow key={i.id}>
                            <TableCell className="font-mono text-sm">{i.numero_notificacao}</TableCell>
                            <TableCell>{format(new Date(i.data_ocorrencia), "dd/MM/yyyy")}</TableCell>
                            <TableCell>{i.setor}</TableCell>
                            <TableCell>
                              <Badge className={`${getRiscoColor(i.classificacao_risco)} text-white`}>
                                {classificacoesRisco.find(c => c.value === i.classificacao_risco)?.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {i.responsavel_tratativa_nome || <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className="text-sm max-w-[150px] truncate" title={i.plano_acao || ""}>
                              {i.plano_acao ? i.plano_acao.substring(0, 50) + (i.plano_acao.length > 50 ? "..." : "") : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell>
                              {i.evidencia_url ? (
                                <a href={i.evidencia_url} target="_blank" rel="noopener noreferrer">
                                  <Badge variant="outline" className="cursor-pointer gap-1">
                                    <Paperclip className="h-3 w-3" />
                                    Anexo
                                  </Badge>
                                </a>
                              ) : <span className="text-muted-foreground text-sm">—</span>}
                            </TableCell>
                            <TableCell>
                              <StatusBadge 
                                status={mapStatusToType(i.status)} 
                                label={statusIncidente.find(s => s.value === i.status)?.label || i.status} 
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-1 justify-end">
                                <Button size="sm" variant="outline" onClick={() => {
                                  setSelectedIncidente(i);
                                  setDetalhesDialog(true);
                                }}>
                                  <Eye className="h-4 w-4 mr-1" />
                                  Ver
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => handleIAReview(i)}
                                  disabled={iaReviewLoading === i.id}
                                >
                                  {iaReviewLoading === i.id ? (
                                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                  ) : (
                                    <Bot className="h-4 w-4 mr-1" />
                                  )}
                                  IA
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => {
                                  setResponsavelIncidente(i);
                                  setResponsavelDialog(true);
                                }}>
                                  <Users className="h-4 w-4 mr-1" />
                                  Responsável
                                </Button>
                                <Button size="sm" variant="default" onClick={() => openTratativaDialog(i)}>
                                  <ClipboardCheck className="h-4 w-4 mr-1" />
                                  Tratativa
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {incidentesView === "dashboard" && (() => {
            const totalIncidentes = incidentes.length;
            const pendentes = incidentes.filter(i => i.status === "notificado").length;
            const emAnalise = incidentes.filter(i => i.status === "em_analise").length;
            const encerrados = incidentes.filter(i => i.status === "encerrado").length;
            const comResponsavel = incidentes.filter(i => i.responsavel_tratativa_nome).length;
            const semResponsavel = incidentes.filter(i => !i.responsavel_tratativa_nome && i.status !== "encerrado").length;
            const comPlano = incidentes.filter(i => i.plano_acao).length;
            const comEvidencia = incidentes.filter(i => i.evidencia_url).length;
            const taxaEncerramento = totalIncidentes > 0 ? Math.round((encerrados / totalIncidentes) * 100) : 0;
            const taxaTratativa = totalIncidentes > 0 ? Math.round((comResponsavel / totalIncidentes) * 100) : 0;

            const leves = incidentes.filter(i => i.classificacao_risco === "leve").length;
            const moderados = incidentes.filter(i => i.classificacao_risco === "moderado").length;
            const graves = incidentes.filter(i => i.classificacao_risco === "grave").length;
            const catastroficos = incidentes.filter(i => i.classificacao_risco === "catastrofico").length;

            const eventosAdversos = incidentes.filter(i => i.tipo_incidente === "evento_adverso").length;
            const quaseErros = incidentes.filter(i => i.tipo_incidente === "quase_erro").length;
            const semDano = incidentes.filter(i => i.tipo_incidente === "incidente_sem_dano").length;

            const setorCount: Record<string, number> = {};
            incidentes.forEach(i => { const key = normalizeSetor(i.setor); setorCount[key] = (setorCount[key] || 0) + 1; });
            const topSetores = Object.entries(setorCount).sort((a, b) => b[1] - a[1]).slice(0, 6);

            const RISK_COLORS = ["hsl(142 71% 45%)", "hsl(48 96% 53%)", "hsl(25 95% 53%)", "hsl(0 84% 60%)"];
            const TYPE_COLORS = ["hsl(0 84% 60%)", "hsl(48 96% 53%)", "hsl(210 60% 55%)"];
            const STATUS_COLORS = ["hsl(48 96% 53%)", "hsl(210 60% 55%)", "hsl(142 71% 45%)"];

            const riskData = [
              { name: "Leve", value: leves },
              { name: "Moderado", value: moderados },
              { name: "Grave", value: graves },
              { name: "Catastrófico", value: catastroficos },
            ].filter(d => d.value > 0);

            const typeData = [
              { name: "Evento Adverso", value: eventosAdversos },
              { name: "Quase Erro", value: quaseErros },
              { name: "Sem Dano", value: semDano },
            ].filter(d => d.value > 0);

            const statusData = [
              { name: "Aguardando", value: pendentes },
              { name: "Em Análise", value: emAnalise },
              { name: "Encerrados", value: encerrados },
            ].filter(d => d.value > 0);

            const setorData = topSetores.map(([setor, count]) => ({
              setor: setor.length > 18 ? setor.slice(0, 18) + "..." : setor,
              total: count,
            }));

            // Monthly trend
            const monthMap: Record<string, { notificado: number; encerrado: number }> = {};
            incidentes.forEach(i => {
              const m = format(new Date(i.data_ocorrencia), "MMM/yy", { locale: ptBR });
              if (!monthMap[m]) monthMap[m] = { notificado: 0, encerrado: 0 };
              monthMap[m].notificado += 1;
              if (i.status === "encerrado") monthMap[m].encerrado += 1;
            });
            const trendData = Object.entries(monthMap).slice(-6).map(([mes, v]) => ({ mes, ...v }));

            // Treatment funnel
            const funnelSteps = [
              { label: "Notificados", value: totalIncidentes, pct: 100 },
              { label: "Com Responsável", value: comResponsavel, pct: totalIncidentes > 0 ? Math.round((comResponsavel / totalIncidentes) * 100) : 0 },
              { label: "Com Plano", value: comPlano, pct: totalIncidentes > 0 ? Math.round((comPlano / totalIncidentes) * 100) : 0 },
              { label: "Com Evidência", value: comEvidencia, pct: totalIncidentes > 0 ? Math.round((comEvidencia / totalIncidentes) * 100) : 0 },
              { label: "Encerrados", value: encerrados, pct: taxaEncerramento },
            ];

            return (
              <div className="space-y-4">
                {/* KPI Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatCard title="Total de Notificações" value={totalIncidentes} icon={AlertTriangle} variant="default" />
                  <StatCard title="Taxa de Encerramento" value={`${taxaEncerramento}%`} icon={CheckCircle2} variant="success" />
                  <StatCard title="Sem Responsável" value={semResponsavel} icon={AlertCircle} variant="destructive" />
                  <StatCard title="Taxa de Atribuição" value={`${taxaTratativa}%`} icon={UserCheck} variant="info" />
                </div>

                {/* Charts Row 1: Donuts */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold">Status das Notificações</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                            {statusData.map((_, i) => <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />)}
                          </Pie>
                          <Tooltip />
                          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "12px" }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold">Classificação de Risco</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie data={riskData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                            {riskData.map((_, i) => <Cell key={i} fill={RISK_COLORS[i % RISK_COLORS.length]} />)}
                          </Pie>
                          <Tooltip />
                          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "12px" }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold">Tipo de Incidente</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie data={typeData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                            {typeData.map((_, i) => <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />)}
                          </Pie>
                          <Tooltip />
                          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "12px" }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* Setores Notificados - full width */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Setores Notificados</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {setorData.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={setorData} layout="vertical" margin={{ left: 10, right: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                          <YAxis type="category" dataKey="setor" width={120} tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Bar dataKey="total" name="Incidentes" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={18} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                {/* Distribuição por Responsável - logo abaixo */}
                {(() => {
                  const respCount: Record<string, number> = {};
                  incidentes.forEach(i => {
                    const r = i.responsavel_tratativa_nome || "Sem responsável";
                    respCount[r] = (respCount[r] || 0) + 1;
                  });
                  const topResp = Object.entries(respCount).sort((a, b) => b[1] - a[1]).slice(0, 10);
                  const respData = topResp.map(([nome, count]) => ({
                    nome: nome.length > 30 ? nome.slice(0, 30) + "..." : nome,
                    total: count,
                  }));
                  const RESP_COLORS = ["hsl(210 70% 50%)", "hsl(150 60% 45%)", "hsl(30 80% 55%)", "hsl(280 50% 55%)", "hsl(190 60% 45%)", "hsl(350 60% 55%)", "hsl(80 50% 45%)", "hsl(240 50% 55%)", "hsl(320 50% 50%)", "hsl(50 70% 50%)"];
                  return (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold">Distribuição por Responsável</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={320}>
                          <BarChart data={respData} layout="vertical" margin={{ left: 10, right: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                            <YAxis type="category" dataKey="nome" width={180} tick={{ fontSize: 10 }} />
                            <Tooltip />
                            <Bar dataKey="total" name="Incidentes" radius={[0, 4, 4, 0]} barSize={16}>
                              {respData.map((_, i) => <Cell key={i} fill={RESP_COLORS[i % RESP_COLORS.length]} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  );
                })()}

                {/* Setor Notificante (Origem) - full width */}
                {(() => {
                  const origemCount: Record<string, number> = {};
                  incidentes.forEach(i => {
                    const o = i.setor_origem || "Não informado";
                    const normalized = normalizeSetor(o);
                    origemCount[normalized] = (origemCount[normalized] || 0) + 1;
                  });
                  const topOrigem = Object.entries(origemCount).sort((a, b) => b[1] - a[1]).slice(0, 10);
                  const origemData = topOrigem.map(([nome, count]) => ({
                    nome: nome.length > 30 ? nome.slice(0, 30) + "..." : nome,
                    total: count,
                  }));
                  return (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold">Setor Notificante (Origem)</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={origemData} layout="vertical" margin={{ left: 10, right: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                            <YAxis type="category" dataKey="nome" width={180} tick={{ fontSize: 10 }} />
                            <Tooltip />
                            <Bar dataKey="total" name="Notificações" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={16} />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  );
                })()}

                {/* Evolução Mensal */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Evolução Mensal</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {trendData.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={220}>
                        <AreaChart data={trendData} margin={{ left: 0, right: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "12px" }} />
                          <Area type="monotone" dataKey="notificado" name="Notificados" stroke="hsl(48 96% 53%)" fill="hsl(48 96% 53% / 0.15)" strokeWidth={2} />
                          <Area type="monotone" dataKey="encerrado" name="Encerrados" stroke="hsl(142 71% 45%)" fill="hsl(142 71% 45% / 0.15)" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                {/* Treatment Funnel */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Funil de Tratativa</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end gap-3 justify-between px-2">
                      {funnelSteps.map((step, idx) => (
                        <div key={step.label} className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-lg font-bold text-foreground">{step.value}</span>
                          <div
                            className="w-full rounded-md transition-all"
                            style={{
                              height: `${Math.max(step.pct * 1.2, 12)}px`,
                              background: `hsl(var(--primary) / ${1 - idx * 0.15})`,
                            }}
                          />
                          <span className="text-[10px] text-muted-foreground text-center leading-tight mt-1">{step.label}</span>
                          <span className="text-[10px] font-semibold text-primary">{step.pct}%</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })()}
        </TabsContent>

        {/* Formulários de Auditoria */}
        <TabsContent value="formularios" className="mt-4">
          <FormulariosQualidade />
        </TabsContent>
      </Tabs>

      {/* Dialog: Nova Notificação de Incidente */}
      <Dialog open={incidenteDialog} onOpenChange={setIncidenteDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Notificação de Incidente</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="flex items-center gap-2">
              <Checkbox 
                id="anonimo" 
                checked={incidenteForm.notificacao_anonima}
                onCheckedChange={(checked) => setIncidenteForm({...incidenteForm, notificacao_anonima: checked as boolean})}
              />
              <Label htmlFor="anonimo" className="text-sm">Notificação anônima</Label>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo de Incidente *</Label>
                <Select value={incidenteForm.tipo_incidente} onValueChange={v => setIncidenteForm({...incidenteForm, tipo_incidente: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposIncidente.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Data/Hora da Ocorrência *</Label>
                <Input type="datetime-local" value={incidenteForm.data_ocorrencia} onChange={e => setIncidenteForm({...incidenteForm, data_ocorrencia: e.target.value})} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Setor *</Label>
                <Select value={incidenteForm.setor} onValueChange={v => setIncidenteForm({...incidenteForm, setor: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {setoresHospitalares.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Local Específico *</Label>
                <Input value={incidenteForm.local_ocorrencia} onChange={e => setIncidenteForm({...incidenteForm, local_ocorrencia: e.target.value})} placeholder="Ex: Leito 5, Sala de Medicação" />
              </div>
            </div>

            <div>
              <Label>Classificação de Risco *</Label>
              <Select value={incidenteForm.classificacao_risco} onValueChange={v => setIncidenteForm({...incidenteForm, classificacao_risco: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {classificacoesRisco.map(c => (
                    <SelectItem key={c.value} value={c.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${c.color}`} />
                        {c.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox 
                id="paciente" 
                checked={incidenteForm.paciente_envolvido}
                onCheckedChange={(checked) => setIncidenteForm({...incidenteForm, paciente_envolvido: checked as boolean})}
              />
              <Label htmlFor="paciente" className="text-sm">Paciente envolvido</Label>
            </div>

            {incidenteForm.paciente_envolvido && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nome do Paciente</Label>
                  <Input value={incidenteForm.paciente_nome} onChange={e => setIncidenteForm({...incidenteForm, paciente_nome: e.target.value})} />
                </div>
                <div>
                  <Label>Nº Prontuário</Label>
                  <Input value={incidenteForm.paciente_prontuario} onChange={e => setIncidenteForm({...incidenteForm, paciente_prontuario: e.target.value})} />
                </div>
              </div>
            )}

            <div>
              <Label>Descrição do Incidente *</Label>
              <Textarea rows={4} value={incidenteForm.descricao} onChange={e => setIncidenteForm({...incidenteForm, descricao: e.target.value})} placeholder="Descreva o que aconteceu, como aconteceu e as circunstâncias..." />
            </div>

            <div>
              <Label>Observações Adicionais</Label>
              <Textarea value={incidenteForm.observacoes} onChange={e => setIncidenteForm({...incidenteForm, observacoes: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIncidenteDialog(false)}>Cancelar</Button>
            <Button onClick={handleCreateIncidente} disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Notificar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Análise de Incidente */}
      <Dialog open={analiseDialog} onOpenChange={setAnaliseDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Registrar Análise</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            {/* Info do incidente selecionado */}
            {selectedIncidente && (
              <Card className="bg-muted/50">
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{selectedIncidente.numero_notificacao}</p>
                      <p className="text-xs text-muted-foreground truncate">{selectedIncidente.descricao.substring(0, 100)}...</p>
                    </div>
                    <AnalisarIncidenteIA 
                      incidente={{
                        id: selectedIncidente.id,
                        descricao: selectedIncidente.descricao,
                        setor: selectedIncidente.setor,
                        paciente_envolvido: selectedIncidente.paciente_envolvido,
                      }}
                      onClassificacaoSelecionada={(tipo) => {
                        setAnaliseForm(prev => ({
                          ...prev,
                          tipo_analise: "causa_raiz",
                        }));
                      }}
                      onUtilizarSugestao={(analise) => {
                        setAnaliseForm(prev => ({
                          ...prev,
                          tipo_analise: "causa_raiz",
                          descricao_analise: analise.resumo_tecnico,
                          causas_identificadas: analise.causas_provaveis
                            .map(c => `[${c.categoria}] ${c.descricao} (${c.probabilidade})`)
                            .join("\n"),
                          fatores_contribuintes: analise.causas_provaveis
                            .map(c => c.categoria)
                            .join(", "),
                        }));
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            )}
            
            <div>
              <Label>Tipo de Análise *</Label>
              <Select value={analiseForm.tipo_analise} onValueChange={v => setAnaliseForm({...analiseForm, tipo_analise: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {tiposAnalise.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Descrição da Análise *</Label>
              <Textarea rows={3} value={analiseForm.descricao_analise} onChange={e => setAnaliseForm({...analiseForm, descricao_analise: e.target.value})} />
            </div>
            <div>
              <Label>Causas Identificadas</Label>
              <Textarea value={analiseForm.causas_identificadas} onChange={e => setAnaliseForm({...analiseForm, causas_identificadas: e.target.value})} />
            </div>
            <div>
              <Label>Fatores Contribuintes</Label>
              <Textarea value={analiseForm.fatores_contribuintes} onChange={e => setAnaliseForm({...analiseForm, fatores_contribuintes: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAnaliseDialog(false)}>Cancelar</Button>
            <Button onClick={handleCreateAnalise} disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Nova Ação */}
      <Dialog open={acaoDialog} onOpenChange={setAcaoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Ação</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label>Tipo de Ação *</Label>
              <Select value={acaoForm.tipo_acao} onValueChange={v => setAcaoForm({...acaoForm, tipo_acao: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="corretiva">Corretiva</SelectItem>
                  <SelectItem value="preventiva">Preventiva</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Descrição da Ação *</Label>
              <Textarea value={acaoForm.descricao} onChange={e => setAcaoForm({...acaoForm, descricao: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Responsável *</Label>
                <Input value={acaoForm.responsavel_nome} onChange={e => setAcaoForm({...acaoForm, responsavel_nome: e.target.value})} />
              </div>
              <div>
                <Label>Prazo *</Label>
                <Input type="date" value={acaoForm.prazo} onChange={e => setAcaoForm({...acaoForm, prazo: e.target.value})} />
              </div>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea value={acaoForm.observacoes} onChange={e => setAcaoForm({...acaoForm, observacoes: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAcaoDialog(false)}>Cancelar</Button>
            <Button onClick={handleCreateAcao} disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Nova Auditoria */}
      <Dialog open={auditoriaDialog} onOpenChange={setAuditoriaDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Registrar Auditoria</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo de Auditoria *</Label>
                <Select value={auditoriaForm.tipo_auditoria} onValueChange={v => setAuditoriaForm({...auditoriaForm, tipo_auditoria: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="interna">Interna</SelectItem>
                    <SelectItem value="externa">Externa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Data *</Label>
                <Input type="date" value={auditoriaForm.data_auditoria} onChange={e => setAuditoriaForm({...auditoriaForm, data_auditoria: e.target.value})} />
              </div>
            </div>
            <div>
              <Label>Título *</Label>
              <Input value={auditoriaForm.titulo} onChange={e => setAuditoriaForm({...auditoriaForm, titulo: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Auditor *</Label>
                <Input value={auditoriaForm.auditor} onChange={e => setAuditoriaForm({...auditoriaForm, auditor: e.target.value})} />
              </div>
              <div>
                <Label>Setor Auditado *</Label>
                <Select value={auditoriaForm.setor_auditado} onValueChange={v => setAuditoriaForm({...auditoriaForm, setor_auditado: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {setoresHospitalares.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Escopo</Label>
              <Textarea value={auditoriaForm.escopo} onChange={e => setAuditoriaForm({...auditoriaForm, escopo: e.target.value})} />
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea value={auditoriaForm.observacoes} onChange={e => setAuditoriaForm({...auditoriaForm, observacoes: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAuditoriaDialog(false)}>Cancelar</Button>
            <Button onClick={handleCreateAuditoria} disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Detalhes do Incidente */}
      <Dialog open={detalhesDialog} onOpenChange={setDetalhesDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Incidente</DialogTitle>
          </DialogHeader>
          {selectedIncidente && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Número</Label>
                  <p className="font-mono">{selectedIncidente.numero_notificacao}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <Select value={selectedIncidente.status} onValueChange={v => handleUpdateIncidenteStatus(selectedIncidente.id, v)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusIncidente.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-muted-foreground">Tipo</Label>
                  <p>{tiposIncidente.find(t => t.value === selectedIncidente.tipo_incidente)?.label}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Data/Hora</Label>
                  <p>{format(new Date(selectedIncidente.data_ocorrencia), "dd/MM/yyyy HH:mm")}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Setor</Label>
                  <p>{selectedIncidente.setor}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Classificação de Risco</Label>
                  <Badge className={`${getRiscoColor(selectedIncidente.classificacao_risco)} text-white`}>
                    {classificacoesRisco.find(c => c.value === selectedIncidente.classificacao_risco)?.label}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">Notificador</Label>
                  <p>{selectedIncidente.notificacao_anonima ? "Anônimo" : selectedIncidente.notificador_nome}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Local</Label>
                  <p>{selectedIncidente.local_ocorrencia}</p>
                </div>
              </div>

              {selectedIncidente.paciente_envolvido && (
                <div className="grid grid-cols-2 gap-4 p-3 bg-muted rounded-lg">
                  <div>
                    <Label className="text-muted-foreground">Paciente</Label>
                    <p>{selectedIncidente.paciente_nome || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Prontuário</Label>
                    <p>{selectedIncidente.paciente_prontuario || "-"}</p>
                  </div>
                </div>
              )}

              <div>
                <Label className="text-muted-foreground">Descrição</Label>
                <p className="whitespace-pre-wrap">{selectedIncidente.descricao}</p>
              </div>

              {selectedIncidente.observacoes && (
                <div>
                  <Label className="text-muted-foreground">Observações</Label>
                  <p className="whitespace-pre-wrap">{selectedIncidente.observacoes}</p>
                </div>
              )}

              {/* Análises */}
              <div>
                <Label className="text-muted-foreground">Análises</Label>
                {analises.filter(a => a.incidente_id === selectedIncidente.id).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma análise registrada</p>
                ) : (
                  <div className="space-y-2 mt-2">
                    {analises.filter(a => a.incidente_id === selectedIncidente.id).map(a => (
                      <div key={a.id} className="border rounded p-3 text-sm">
                        <div className="flex justify-between mb-1">
                          <Badge variant="outline">{tiposAnalise.find(t => t.value === a.tipo_analise)?.label}</Badge>
                          <span className="text-muted-foreground">{a.analisado_por_nome}</span>
                        </div>
                        <p>{a.descricao_analise}</p>
                        {a.causas_identificadas && (
                          <p className="mt-1 text-muted-foreground"><strong>Causas:</strong> {a.causas_identificadas}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Ações */}
              <div>
                <Label className="text-muted-foreground">Ações</Label>
                {acoes.filter(a => a.incidente_id === selectedIncidente.id).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma ação registrada</p>
                ) : (
                  <div className="space-y-2 mt-2">
                    {acoes.filter(a => a.incidente_id === selectedIncidente.id).map(a => (
                      <div key={a.id} className="border rounded p-3 text-sm">
                        <div className="flex justify-between mb-1">
                          <Badge variant={a.tipo_acao === "corretiva" ? "default" : "secondary"}>
                            {a.tipo_acao === "corretiva" ? "Corretiva" : "Preventiva"}
                          </Badge>
                          <StatusBadge status={mapStatusToType(a.status)} label={a.status} showIcon={false} />
                        </div>
                        <p>{a.descricao}</p>
                        <p className="text-muted-foreground mt-1">
                          Responsável: {a.responsavel_nome} | Prazo: {format(new Date(a.prazo), "dd/MM/yyyy")}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetalhesDialog(false)}>Fechar</Button>
            <Button onClick={() => {
              setDetalhesDialog(false);
              setAnaliseDialog(true);
            }}>
              <Target className="h-4 w-4 mr-2" />
              Nova Análise
            </Button>
            <Button onClick={() => {
              setDetalhesDialog(false);
              setAcaoDialog(true);
            }}>
              <ClipboardCheck className="h-4 w-4 mr-2" />
              Nova Ação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Encaminhar Ação */}
      <Dialog open={encaminharDialog} onOpenChange={(open) => {
        setEncaminharDialog(open);
        if (!open) {
          setSelectedAcao(null);
          setNovoResponsavel("");
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Encaminhar Ação
            </DialogTitle>
          </DialogHeader>
          {selectedAcao && (
            <div className="space-y-4">
              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={selectedAcao.tipo_acao === "corretiva" ? "default" : "secondary"}>
                        {selectedAcao.tipo_acao === "corretiva" ? "Corretiva" : "Preventiva"}
                      </Badge>
                      <StatusBadge status={mapStatusToType(selectedAcao.status)} label={selectedAcao.status} />
                    </div>
                    <p className="text-sm">{selectedAcao.descricao}</p>
                    <div className="text-xs text-muted-foreground">
                      <span>Prazo: {format(new Date(selectedAcao.prazo), "dd/MM/yyyy")}</span>
                      {selectedAcao.responsavel_nome && (
                        <span className="ml-2">• Atual: {selectedAcao.responsavel_nome}</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div>
                <Label>Selecionar Novo Responsável *</Label>
                <Select value={novoResponsavel} onValueChange={setNovoResponsavel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um colaborador..." />
                  </SelectTrigger>
                  <SelectContent>
                    {usuarios.map(u => (
                      <SelectItem key={u.user_id} value={u.user_id}>
                        {u.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEncaminharDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEncaminharAcao} disabled={isSubmitting || !novoResponsavel}>
              {isSubmitting ? "Encaminhando..." : "Confirmar Encaminhamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Importar Incidentes */}
      <ImportarIncidentesDialog 
        open={importarDialog} 
        onOpenChange={setImportarDialog}
        onImportComplete={loadData}
      />

      {/* Dialog: Revisão IA Completa */}
      <Dialog open={iaReviewDialog} onOpenChange={setIaReviewDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              Assistente IA - Sugestões de Tratativa
            </DialogTitle>
          </DialogHeader>
          {iaReviewResult?.resultado && (
            <div className="space-y-5">
              {/* AI Summary */}
              {iaReviewResult.resultado.resumo_tecnico && (
                <Card className="bg-muted/50 border-primary/20">
                  <CardContent className="pt-4">
                    <p className="text-sm font-medium mb-1">Resumo Técnico da IA</p>
                    <p className="text-sm text-muted-foreground">{iaReviewResult.resultado.resumo_tecnico}</p>
                    {iaReviewResult.resultado.classificacao_sugerida && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Confiança: <strong>{iaReviewResult.resultado.classificacao_sugerida.confianca}%</strong></span>
                        <span>•</span>
                        <span>Justificativa: {iaReviewResult.resultado.classificacao_sugerida.justificativa}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Editable: Classification */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Classificação do Incidente</Label>
                  <Select value={iaSugestaoClassificacao} onValueChange={setIaSugestaoClassificacao}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {tiposIncidente.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {iaReviewResult.resultado.classificacao_sugerida && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Sugestão IA: <strong>{iaReviewResult.resultado.classificacao_sugerida.label}</strong>
                    </p>
                  )}
                </div>
                <div>
                  <Label>Classificação de Risco</Label>
                  <Select value={iaSugestaoRisco} onValueChange={setIaSugestaoRisco}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {classificacoesRisco.map(c => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Editable: Responsible */}
              <div>
                <Label>Responsável pela Tratativa</Label>
                <Select value={iaSugestaoResponsavel} onValueChange={setIaSugestaoResponsavel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar responsável..." />
                  </SelectTrigger>
                  <SelectContent>
                    {usuarios.map(u => (
                      <SelectItem key={u.user_id} value={u.user_id}>{u.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {iaReviewResult.resultado.plano_acao?.[0]?.responsavel_sugerido && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Sugestão IA: <strong>{iaReviewResult.resultado.plano_acao[0].responsavel_sugerido}</strong>
                  </p>
                )}
              </div>

              {/* Editable: Action Plan */}
              <div>
                <Label>Plano de Ação</Label>
                <Textarea 
                  value={iaSugestaoPlano} 
                  onChange={e => setIaSugestaoPlano(e.target.value)} 
                  rows={5}
                  placeholder="Plano de ação sugerido pela IA..."
                />
              </div>

              {/* Suggested Evidence */}
              <div>
                <Label>Evidências Sugeridas</Label>
                <Textarea 
                  value={iaSugestaoEvidencia} 
                  onChange={e => setIaSugestaoEvidencia(e.target.value)} 
                  rows={2}
                  placeholder="Tipos de evidência recomendados..."
                />
                <p className="text-xs text-muted-foreground mt-1">Descreva os tipos de evidência necessários para conclusão.</p>
              </div>

              {/* Causes (read-only from AI) */}
              {iaReviewResult.resultado.causas_provaveis?.length > 0 && (
                <Card className="bg-muted/30">
                  <CardContent className="pt-4">
                    <p className="text-sm font-medium mb-2">Causas Prováveis (Protocolo de Londres)</p>
                    <div className="space-y-2">
                      {iaReviewResult.resultado.causas_provaveis.map((c: any, idx: number) => (
                        <div key={idx} className="flex items-start gap-2 text-sm">
                          <Badge variant="outline" className="text-xs shrink-0">{c.probabilidade}</Badge>
                          <span>{c.descricao}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIaReviewDialog(false)}>Cancelar</Button>
            <Button onClick={handleApplyIASuggestions} disabled={isSubmitting}>
              {isSubmitting ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Aplicando...</>
              ) : (
                <><CheckCircle2 className="h-4 w-4 mr-1" /> Aceitar e Aplicar</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Selecionar Responsável */}
      <Dialog open={responsavelDialog} onOpenChange={(open) => {
        setResponsavelDialog(open);
        if (!open) setResponsavelIncidente(null);
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Selecionar Responsável para Tratativa
            </DialogTitle>
          </DialogHeader>
          {responsavelIncidente && (
            <div className="space-y-4">
              <Card className="bg-muted/50">
                <CardContent className="pt-4 space-y-1">
                  <p className="text-sm font-medium">{responsavelIncidente.numero_notificacao}</p>
                  <p className="text-xs text-muted-foreground">{responsavelIncidente.setor} • {classificacoesRisco.find(c => c.value === responsavelIncidente.classificacao_risco)?.label}</p>
                </CardContent>
              </Card>
              <div>
                <Label>Selecionar Responsável *</Label>
                <div className="max-h-[300px] overflow-y-auto border rounded-md mt-2">
                  {usuarios.map(u => (
                    <button
                      key={u.user_id}
                      className="w-full text-left px-4 py-3 hover:bg-muted/50 border-b last:border-b-0 flex items-center gap-3 transition-colors"
                      onClick={() => handleAssignResponsavel(u.user_id)}
                      disabled={isSubmitting}
                    >
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium">
                        {u.full_name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm">{u.full_name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Tratativa de Notificação */}
      <Dialog open={tratativaDialog} onOpenChange={(open) => {
        setTratativaDialog(open);
        if (!open) setTratativaIncidente(null);
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Tratativa de Notificação
            </DialogTitle>
          </DialogHeader>
          {tratativaIncidente && (
            <div className="space-y-4">
              <Card className="bg-muted/50">
                <CardContent className="pt-4 space-y-1">
                  <p className="text-sm font-medium">{tratativaIncidente.numero_notificacao}</p>
                  <p className="text-xs text-muted-foreground">
                    {tratativaIncidente.setor} • {classificacoesRisco.find(c => c.value === tratativaIncidente.classificacao_risco)?.label}
                    {tratativaIncidente.responsavel_tratativa_nome && ` • Responsável: ${tratativaIncidente.responsavel_tratativa_nome}`}
                  </p>
                </CardContent>
              </Card>

              <div>
                <Label>Plano de Ação</Label>
                <Textarea 
                  value={tratativaPlano} 
                  onChange={e => setTratativaPlano(e.target.value)} 
                  placeholder="Descreva o plano de ação para esta notificação..."
                  rows={4}
                />
              </div>

              <div>
                <Label>Status da Notificação</Label>
                <Select value={tratativaStatus} onValueChange={setTratativaStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusIncidente.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Anexar Evidência</Label>
                <Input 
                  type="file" 
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={e => setTratativaEvidencia(e.target.files?.[0] || null)}
                  className="mt-1"
                />
                {tratativaIncidente.evidencia_url && !tratativaEvidencia && (
                  <div className="mt-2">
                    <a href={tratativaIncidente.evidencia_url} target="_blank" rel="noopener noreferrer">
                      <Badge variant="outline" className="cursor-pointer gap-1">
                        <Paperclip className="h-3 w-3" />
                        Evidência atual anexada
                      </Badge>
                    </a>
                  </div>
                )}
              </div>

              {tratativaStatus === "encerrado" && !tratativaEvidencia && !tratativaIncidente.evidencia_url && (
                <p className="text-sm text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  Recomenda-se anexar evidência antes de encerrar a notificação.
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setTratativaDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveTratativa} disabled={uploadingEvidencia}>
              {uploadingEvidencia ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Salvando...
                </>
              ) : "Salvar Tratativa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
