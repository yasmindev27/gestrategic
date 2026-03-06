import { useState, useEffect } from "react";
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
import { AlertTriangle, ClipboardCheck, BarChart3, FileText, Plus, Eye, Pencil, ShieldX, TrendingUp, AlertCircle, CheckCircle2, Clock, Target, Stethoscope, Brain, Send, UserCheck, Upload } from "lucide-react";
import { SectionHeader, ActionButton } from "@/components/ui/action-buttons";
import { StatCard } from "@/components/ui/stat-card";
import { SearchInput } from "@/components/ui/search-input";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge, mapStatusToType } from "@/components/ui/status-badge";
import { ExportDropdown } from "@/components/ui/export-dropdown";
import { DateRangeFilter } from "@/components/ui/date-range-filter";
import { DashboardConformidade, MetasSegurancaPaciente } from "@/components/qualidade";
import { RiscosOperacionaisChart, AnalisarIncidenteIA, ImportarIncidentesDialog } from "@/components/gestao-incidentes";
import * as XLSX from "xlsx";
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

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-4">
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
                          <TableHead className="whitespace-nowrap">Nome do Paciente</TableHead>
                          <TableHead className="whitespace-nowrap">Nº Prontuário</TableHead>
                          <TableHead className="whitespace-nowrap">Data do Ocorrido</TableHead>
                          <TableHead className="whitespace-nowrap">Setor Notificante</TableHead>
                          <TableHead className="whitespace-nowrap">Setor Notificado</TableHead>
                          <TableHead className="whitespace-nowrap">Descrição</TableHead>
                          <TableHead className="whitespace-nowrap">Correção/Ação Imediata</TableHead>
                          <TableHead className="whitespace-nowrap">Classificação</TableHead>
                          <TableHead className="whitespace-nowrap">Dano</TableHead>
                          <TableHead className="whitespace-nowrap">Notificante</TableHead>
                          
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredIncidentes.map(i => {
                          // Extract correction from description if embedded
                          const descParts = i.descricao.split("\n\nCorreção/Ação imediata: ");
                          const descricaoPura = descParts[0];
                          const correcao = descParts[1] || "-";
                          // Extract "Classificação original" and dano from observacoes
                          const classificacaoOriginal = i.observacoes?.replace("Classificação original: ", "") || 
                            tiposIncidente.find(t => t.value === i.tipo_incidente)?.label || "-";
                          const dano = classificacoesRisco.find(c => c.value === i.classificacao_risco)?.label || "-";

                          return (
                            <TableRow key={i.id}>
                              <TableCell className="font-mono text-sm whitespace-nowrap">{i.numero_notificacao}</TableCell>
                              <TableCell className="whitespace-nowrap">{format(new Date(i.created_at), "dd/MM/yyyy HH:mm")}</TableCell>
                              <TableCell className="text-sm max-w-[150px] truncate">{i.paciente_nome || "-"}</TableCell>
                              <TableCell className="text-sm">{i.paciente_prontuario || "-"}</TableCell>
                              <TableCell className="whitespace-nowrap">{format(new Date(i.data_ocorrencia), "dd/MM/yyyy HH:mm")}</TableCell>
                              <TableCell className="text-sm">{i.setor_origem || "-"}</TableCell>
                              <TableCell className="text-sm">{i.setor}</TableCell>
                              <TableCell className="text-sm max-w-[200px] truncate" title={descricaoPura}>{descricaoPura}</TableCell>
                              <TableCell className="text-sm max-w-[200px] truncate" title={correcao}>{correcao}</TableCell>
                              <TableCell className="text-sm">{classificacaoOriginal}</TableCell>
                              <TableCell>
                                <Badge className={`${getRiscoColor(i.classificacao_risco)} text-white`}>
                                  {dano}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm">{i.notificacao_anonima ? "Anônimo" : i.notificador_nome || "-"}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Dashboard de Riscos Operacionais */}
            <RiscosOperacionaisChart />
          </div>
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
    </div>
  );
};
