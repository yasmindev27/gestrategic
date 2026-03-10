import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useLogAccess } from "@/hooks/useLogAccess";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Users, ClipboardList, BarChart3, Plus, Eye, Send, BedDouble, Shield, Heart, Brain, HandHeart, ArrowRightLeft } from "lucide-react";
import { ShieldX } from "lucide-react";
import { PassagemPlantaoSocial } from "@/components/assistencia-social/PassagemPlantaoSocial";
import { SolicitacoesSuporte } from "@/components/assistencia-social/SolicitacoesSuporte";
import { SectionHeader, ActionButton } from "@/components/ui/action-buttons";
import { StatCard } from "@/components/ui/stat-card";
import { SearchInput } from "@/components/ui/search-input";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge, mapStatusToType } from "@/components/ui/status-badge";
import { ExportDropdown } from "@/components/ui/export-dropdown";
import { DateRangeFilter } from "@/components/ui/date-range-filter";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import * as XLSX from "xlsx";
import autoTable from "jspdf-autotable";

// --- Types ---
interface Paciente {
  id: string;
  nome_completo: string;
  numero_prontuario: string | null;
  setor_atendimento: string;
  created_at: string;
}

interface Atendimento {
  id: string;
  paciente_id: string;
  tipo_atendimento: string;
  motivo: string;
  descricao: string;
  profissional_id: string;
  profissional_nome: string;
  data_atendimento: string;
  status: string;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  paciente?: Paciente;
}

interface Encaminhamento {
  id: string;
  atendimento_id: string;
  tipo_encaminhamento: string;
  destino: string | null;
  motivo: string;
  observacoes: string | null;
  data_encaminhamento: string;
  data_retorno: string | null;
  status: string;
  registrado_por: string;
  registrado_por_nome: string;
}

interface BedPatient {
  sector: string;
  bed_number: string;
  patient_name: string;
  hipotese_diagnostica: string | null;
  data_internacao: string | null;
}

// --- Constants ---
const tiposAtendimento = [
  { value: "acolhimento", label: "Acolhimento", area: "ambos" },
  { value: "orientacao", label: "Orientação Social", area: "social" },
  { value: "apoio_familiar", label: "Apoio Familiar", area: "social" },
  { value: "alta_social", label: "Alta Social", area: "social" },
  { value: "obito", label: "Acompanhamento de Óbito", area: "ambos" },
  { value: "vulnerabilidade", label: "Vulnerabilidade Social", area: "social" },
  { value: "transferencia", label: "Acompanhamento de Transferência", area: "social" },
  { value: "acolhimento_psicologico", label: "Acolhimento Psicológico", area: "psicologia" },
  { value: "atendimento_crise", label: "Atendimento em Crise", area: "psicologia" },
  { value: "suporte_luto", label: "Suporte ao Luto", area: "psicologia" },
  { value: "mediacao_conflitos", label: "Mediação de Conflitos", area: "psicologia" },
  { value: "avaliacao_psicossocial", label: "Avaliação Psicossocial", area: "ambos" },
  { value: "orientacao_alta", label: "Orientação de Alta", area: "ambos" },
  { value: "busca_ativa", label: "Busca Ativa", area: "social" },
  { value: "outros", label: "Outros", area: "ambos" },
];

const tiposEncaminhamento = [
  { value: "CRAS", label: "CRAS" },
  { value: "CREAS", label: "CREAS" },
  { value: "CAPS", label: "CAPS" },
  { value: "CAPS_AD", label: "CAPS AD (Álcool e Drogas)" },
  { value: "Conselho Tutelar", label: "Conselho Tutelar" },
  { value: "Vara Infancia", label: "Vara da Infância e Juventude" },
  { value: "Delegacia Mulher", label: "Delegacia da Mulher" },
  { value: "SAMU Social", label: "SAMU Social / Pop Rua" },
  { value: "Abrigo", label: "Abrigo / Casa de Acolhimento" },
  { value: "NASF", label: "NASF / eSF" },
  { value: "familia", label: "Família / Responsável" },
  { value: "outros", label: "Outros" },
];

const statusAtendimento = [
  { value: "em_atendimento", label: "Em Atendimento" },
  { value: "em_acompanhamento", label: "Em Acompanhamento" },
  { value: "finalizado", label: "Finalizado" },
];

const statusEncaminhamento = [
  { value: "pendente", label: "Pendente" },
  { value: "realizado", label: "Realizado" },
  { value: "cancelado", label: "Cancelado" },
];

const locaisAtendimento = [
  "Medicação", "Recepção Externa", "Recepção Interna", "Sala de Espera", 
  "Radiologia", "Corredor", "Sala Amarela", "Sala Vermelha", "Observação",
  "Consultório", "Beira-leito",
];

const areasAtuacao = [
  { value: "social", label: "Serviço Social" },
  { value: "psicologia", label: "Psicologia" },
];

// --- Component ---
export const AssistenciaSocialModule = () => {
  const { isAdmin, isLoading: isLoadingRole } = useUserRole();
  const { logAction } = useLogAccess();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("atendimentos");
  
  // Data states
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
  const [encaminhamentos, setEncaminhamentos] = useState<Encaminhamento[]>([]);
  const [bedPatients, setBedPatients] = useState<BedPatient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [bedSearchTerm, setBedSearchTerm] = useState("");
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [tipoFilter, setTipoFilter] = useState("todos");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  
  // Dialogs
  const [atendimentoDialog, setAtendimentoDialog] = useState(false);
  const [encaminhamentoDialog, setEncaminhamentoDialog] = useState(false);
  const [detalhesDialog, setDetalhesDialog] = useState(false);
  const [selectedAtendimento, setSelectedAtendimento] = useState<Atendimento | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form data
  const [atendimentoForm, setAtendimentoForm] = useState({
    paciente_nome: "",
    setor_atendimento: "",
    setor_internacao: "",
    area: "" as string,
    tipo_atendimento: "",
    motivo: "",
    descricao: "",
    status: "em_atendimento",
    observacoes: "",
    evolucao_salus: "" as string,
  });
  
  const [encaminhamentoForm, setEncaminhamentoForm] = useState({
    tipo_encaminhamento: "",
    destino: "",
    motivo: "",
    observacoes: "",
  });
  
  const [currentUser, setCurrentUser] = useState<{ id: string; nome: string }>({ id: "", nome: "" });

  // --- Data Loading ---
  useEffect(() => {
    checkPermissionAndLoad();
  }, []);

  const checkPermissionAndLoad = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [profileRes, roleRes] = await Promise.all([
      supabase.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle(),
    ]);
    
    setCurrentUser({ id: user.id, nome: profileRes.data?.full_name || user.email || "" });
    const hasAccess = roleRes.data?.role === "admin" || roleRes.data?.role === "assistencia_social";
    setHasPermission(hasAccess);
    
    if (hasAccess) {
      await loadData();
      logAction("Assistência Social", "acesso_modulo");
    }
    setIsLoading(false);
  };

  const loadData = useCallback(async () => {
    // Determine current shift to match Mapa de Leitos exactly
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentHour = now.getHours();
    const currentShift = currentHour >= 7 && currentHour < 19 ? 'diurno' : 'noturno';

    const [pacientesRes, atendimentosRes, encaminhamentosRes, bedRes] = await Promise.all([
      supabase.from("assistencia_social_pacientes").select("id, nome_completo, numero_prontuario, setor_atendimento, created_at").order("created_at", { ascending: false }),
      supabase.from("assistencia_social_atendimentos").select("*").order("data_atendimento", { ascending: false }),
      supabase.from("assistencia_social_encaminhamentos").select("*").order("data_encaminhamento", { ascending: false }),
      supabase.from("bed_records").select("sector, bed_number, patient_name, hipotese_diagnostica, data_internacao, motivo_alta, data_alta")
        .eq("shift_date", todayStr)
        .eq("shift_type", currentShift)
        .not("patient_name", "is", null).neq("patient_name", ""),
    ]);

    if (pacientesRes.data) setPacientes(pacientesRes.data as Paciente[]);
    if (atendimentosRes.data) {
      const withPaciente = atendimentosRes.data.map(a => ({
        ...a,
        paciente: pacientesRes.data?.find(p => p.id === a.paciente_id) as Paciente | undefined,
      }));
      setAtendimentos(withPaciente);
    }
    if (encaminhamentosRes.data) setEncaminhamentos(encaminhamentosRes.data);

    if (bedRes.data) {
      setBedPatients(
        bedRes.data
          .filter(r => r.patient_name && !r.motivo_alta && !r.data_alta)
          .map(r => ({
            sector: r.sector,
            bed_number: r.bed_number,
            patient_name: r.patient_name?.trim() || '',
            hipotese_diagnostica: r.hipotese_diagnostica,
            data_internacao: r.data_internacao,
          }))
          .sort((a, b) => a.sector.localeCompare(b.sector) || a.bed_number.localeCompare(b.bed_number, undefined, { numeric: true }))
      );
    }
  }, []);

  // --- Handlers ---
  const handleCreateAtendimento = async () => {
    if (!atendimentoForm.paciente_nome || !atendimentoForm.setor_atendimento || !atendimentoForm.tipo_atendimento || !atendimentoForm.motivo || !atendimentoForm.descricao || !atendimentoForm.evolucao_salus) {
      toast({ title: "Erro", description: "Preencha todos os campos obrigatórios, incluindo a evolução no Salus", variant: "destructive" });
      return;
    }
    
    setIsSubmitting(true);
    try {
      let pacienteId: string;
      const { data: existing } = await supabase
        .from("assistencia_social_pacientes")
        .select("id")
        .ilike("nome_completo", atendimentoForm.paciente_nome.trim())
        .eq("setor_atendimento", atendimentoForm.setor_atendimento)
        .maybeSingle();

      if (existing) {
        pacienteId = existing.id;
      } else {
        const { data: newP, error: pErr } = await supabase
          .from("assistencia_social_pacientes")
          .insert({
            nome_completo: atendimentoForm.paciente_nome.trim(),
            setor_atendimento: atendimentoForm.setor_atendimento,
            created_by: currentUser.id,
          })
          .select("id").single();
        if (pErr || !newP) throw pErr;
        pacienteId = newP.id;
      }

      const obsLines = [
        atendimentoForm.area ? `Área: ${areasAtuacao.find(a => a.value === atendimentoForm.area)?.label || atendimentoForm.area}` : '',
        atendimentoForm.setor_internacao ? `Setor de Internação: ${atendimentoForm.setor_internacao}` : '',
        `Evolução Salus: ${atendimentoForm.evolucao_salus === 'sim' ? 'Sim' : 'Não'}`,
        atendimentoForm.observacoes,
      ].filter(Boolean).join('\n') || null;

      const { error } = await supabase.from("assistencia_social_atendimentos").insert({
        paciente_id: pacienteId,
        tipo_atendimento: atendimentoForm.tipo_atendimento,
        motivo: atendimentoForm.motivo,
        descricao: atendimentoForm.descricao,
        status: atendimentoForm.status,
        observacoes: obsLines,
        profissional_id: currentUser.id,
        profissional_nome: currentUser.nome,
      });
      
      if (error) throw error;
      toast({ title: "Sucesso", description: "Atendimento registrado com sucesso" });
      setAtendimentoDialog(false);
      resetAtendimentoForm();
      loadData();
      logAction("Assistência Social", "registro_atendimento", { tipo: atendimentoForm.tipo_atendimento });
    } catch {
      toast({ title: "Erro", description: "Falha ao registrar atendimento", variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  const handleCreateEncaminhamento = async () => {
    if (!selectedAtendimento || !encaminhamentoForm.tipo_encaminhamento || !encaminhamentoForm.motivo) {
      toast({ title: "Erro", description: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }
    
    setIsSubmitting(true);
    const { error } = await supabase.from("assistencia_social_encaminhamentos").insert({
      atendimento_id: selectedAtendimento.id,
      ...encaminhamentoForm,
      registrado_por: currentUser.id,
      registrado_por_nome: currentUser.nome,
    });
    
    if (error) {
      toast({ title: "Erro", description: "Falha ao registrar encaminhamento", variant: "destructive" });
    } else {
      toast({ title: "Sucesso", description: "Encaminhamento registrado" });
      setEncaminhamentoDialog(false);
      resetEncaminhamentoForm();
      loadData();
      logAction("Assistência Social", "registro_encaminhamento", { tipo: encaminhamentoForm.tipo_encaminhamento });
    }
    setIsSubmitting(false);
  };

  const handleUpdateStatus = async (atendimentoId: string, novoStatus: string) => {
    const { error } = await supabase
      .from("assistencia_social_atendimentos")
      .update({ status: novoStatus })
      .eq("id", atendimentoId);
    
    if (!error) {
      toast({ title: "Sucesso", description: "Status atualizado" });
      // Atualizar selectedAtendimento localmente para refletir no dialog
      if (selectedAtendimento?.id === atendimentoId) {
        setSelectedAtendimento(prev => prev ? { ...prev, status: novoStatus } : null);
      }
      loadData();
    }
  };

  const resetAtendimentoForm = () => setAtendimentoForm({
    paciente_nome: "", setor_atendimento: "", setor_internacao: "", area: "", tipo_atendimento: "", motivo: "", descricao: "", status: "em_atendimento", observacoes: "", evolucao_salus: "",
  });

  const resetEncaminhamentoForm = () => setEncaminhamentoForm({
    tipo_encaminhamento: "", destino: "", motivo: "", observacoes: "",
  });

  // --- Computed ---
  const filteredAtendimentos = useMemo(() => atendimentos.filter(a => {
    const matchSearch = !searchTerm || 
      a.paciente?.nome_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.profissional_nome?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === "todos" || a.status === statusFilter;
    const matchTipo = tipoFilter === "todos" || a.tipo_atendimento === tipoFilter;
    const matchDI = !dataInicio || new Date(a.data_atendimento) >= new Date(dataInicio);
    const matchDF = !dataFim || new Date(a.data_atendimento) <= new Date(dataFim + "T23:59:59");
    return matchSearch && matchStatus && matchTipo && matchDI && matchDF;
  }), [atendimentos, searchTerm, statusFilter, tipoFilter, dataInicio, dataFim]);

  const stats = useMemo(() => ({
    total: atendimentos.length,
    emAtendimento: atendimentos.filter(a => a.status === "em_atendimento").length,
    emAcompanhamento: atendimentos.filter(a => a.status === "em_acompanhamento").length,
    finalizados: atendimentos.filter(a => a.status === "finalizado").length,
    encaminhamentos: encaminhamentos.length,
  }), [atendimentos, encaminhamentos]);

  const tiposFilteredByArea = useMemo(() => {
    if (!atendimentoForm.area) return tiposAtendimento;
    return tiposAtendimento.filter(t => t.area === atendimentoForm.area || t.area === "ambos");
  }, [atendimentoForm.area]);

  // --- Exports ---
  const exportToExcel = () => {
    const data = filteredAtendimentos.map(a => ({
      Data: format(new Date(a.data_atendimento), "dd/MM/yyyy HH:mm"),
      Paciente: a.paciente?.nome_completo || "",
      Tipo: tiposAtendimento.find(t => t.value === a.tipo_atendimento)?.label || a.tipo_atendimento,
      Status: statusAtendimento.find(s => s.value === a.status)?.label || a.status,
      Profissional: a.profissional_nome,
      Motivo: a.motivo,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Atendimentos");
    XLSX.writeFile(wb, `assistencia-social-psicologia-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  const exportToPDF = async () => {
    const { createStandardPdf, savePdfWithFooter } = await import('@/lib/export-utils');
    const { doc, logoImg } = await createStandardPdf('Relatório — Serviço Social e Psicologia');
    doc.setFontSize(10);
    doc.text(`Período: ${dataInicio || "Início"} a ${dataFim || "Atual"}`, 14, 32);
    
    autoTable(doc, {
      startY: 38,
      head: [["Data", "Paciente", "Tipo", "Status", "Profissional"]],
      body: filteredAtendimentos.map(a => [
        format(new Date(a.data_atendimento), "dd/MM/yyyy"),
        a.paciente?.nome_completo || "",
        tiposAtendimento.find(t => t.value === a.tipo_atendimento)?.label || "",
        statusAtendimento.find(s => s.value === a.status)?.label || "",
        a.profissional_nome,
      ]),
      margin: { bottom: 28 },
    });
    savePdfWithFooter(doc, 'Relatório — Serviço Social e Psicologia', `assist-social-psicologia-${format(new Date(), "yyyy-MM-dd")}`, logoImg);
  };

  // --- Render guards ---
  if (isLoadingRole || isLoading) return <LoadingState message="Carregando módulo..." />;

  if (!hasPermission) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="p-4 rounded-full bg-destructive/10 mb-4">
          <ShieldX className="h-8 w-8 text-destructive" />
        </div>
        <h3 className="text-lg font-medium text-foreground">Acesso Negado</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          Você não tem permissão para acessar este módulo.
        </p>
      </div>
    );
  }

  const sectorLabel = (s: string) => s.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="space-y-6">
      <SectionHeader 
        title="Assistente Social / Psicologia" 
        description="Gestão de atendimentos sociais e acompanhamentos psicológicos — ONA Nível 1"
      >
        <ActionButton type="add" label="Novo Atendimento" onClick={() => setAtendimentoDialog(true)} />
      </SectionHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard title="Total de Atendimentos" value={stats.total} icon={ClipboardList} variant="primary" />
        <StatCard title="Em Atendimento" value={stats.emAtendimento} icon={Heart} variant="info" />
        <StatCard title="Em Acompanhamento" value={stats.emAcompanhamento} icon={Brain} variant="warning" />
        <StatCard title="Finalizados" value={stats.finalizados} icon={Users} variant="success" />
        <StatCard title="Encaminhamentos" value={stats.encaminhamentos} icon={Send} variant="default" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="atendimentos">Atendimentos</TabsTrigger>
          <TabsTrigger value="corrida-leito">Corrida de Leito</TabsTrigger>
          <TabsTrigger value="encaminhamentos">Encaminhamentos</TabsTrigger>
          <TabsTrigger value="passagem">Passagem de Plantão</TabsTrigger>
          <TabsTrigger value="suporte">Solicitações de Suporte</TabsTrigger>
          <TabsTrigger value="relatorios">Relatórios ONA</TabsTrigger>
        </TabsList>

        {/* ======= ATENDIMENTOS TAB ======= */}
        <TabsContent value="atendimentos" className="space-y-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-wrap items-end gap-4">
                <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Buscar paciente ou profissional..." className="w-[250px]" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {statusAtendimento.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={tipoFilter} onValueChange={setTipoFilter}>
                  <SelectTrigger className="w-[200px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os Tipos</SelectItem>
                    {tiposAtendimento.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <DateRangeFilter startDate={dataInicio} endDate={dataFim} onStartDateChange={setDataInicio} onEndDateChange={setDataFim} showPresets={false} />
                <div className="ml-auto">
                  <ExportDropdown onExportExcel={exportToExcel} onExportPDF={exportToPDF} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              {filteredAtendimentos.length === 0 ? (
                <EmptyState icon={ClipboardList} title="Nenhum atendimento encontrado" description="Registre novos atendimentos" action={{ label: "Novo Atendimento", onClick: () => setAtendimentoDialog(true) }} />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Paciente</TableHead>
                      <TableHead>Local</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Profissional</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAtendimentos.map(a => (
                      <TableRow key={a.id}>
                        <TableCell className="whitespace-nowrap">{format(new Date(a.data_atendimento), "dd/MM/yyyy HH:mm")}</TableCell>
                        <TableCell className="font-medium uppercase">{a.paciente?.nome_completo || "-"}</TableCell>
                        <TableCell>{a.paciente?.setor_atendimento || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {tiposAtendimento.find(t => t.value === a.tipo_atendimento)?.label || a.tipo_atendimento}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={mapStatusToType(a.status)} label={statusAtendimento.find(s => s.value === a.status)?.label || a.status} />
                        </TableCell>
                        <TableCell>{a.profissional_nome}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button size="icon" variant="ghost" title="Ver detalhes" onClick={() => { setSelectedAtendimento(a); setDetalhesDialog(true); }}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" title="Encaminhar" onClick={() => { setSelectedAtendimento(a); setEncaminhamentoDialog(true); }}>
                              <Send className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ======= CORRIDA DE LEITO TAB ======= */}
        <TabsContent value="corrida-leito" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BedDouble className="h-5 w-5" />
                Pacientes Internados — Mapa de Leitos
              </CardTitle>
              <CardDescription>
                Pacientes ativos no mapa de leitos do NIR • Clique em "Atender" para registrar atendimento social/psicológico
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <SearchInput value={bedSearchTerm} onChange={setBedSearchTerm} placeholder="Buscar paciente, setor ou leito..." className="w-[300px]" />
                <Badge variant="outline" className="text-xs">{bedPatients.length} pacientes internados</Badge>
              </div>
              {bedPatients.length === 0 ? (
                <EmptyState icon={BedDouble} title="Nenhum paciente internado" description="Não há pacientes ativos no mapa de leitos" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Setor de Internação</TableHead>
                      <TableHead>Leito</TableHead>
                      <TableHead>Paciente</TableHead>
                      <TableHead>Hipótese Diagnóstica</TableHead>
                      <TableHead>Data Internação</TableHead>
                      <TableHead className="text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bedPatients
                      .filter(b => {
                        if (!bedSearchTerm) return true;
                        const term = bedSearchTerm.toLowerCase();
                        return b.patient_name.toLowerCase().includes(term) || b.sector.toLowerCase().includes(term) || b.bed_number.toLowerCase().includes(term);
                      })
                      .map((b, idx) => {
                        const sl = sectorLabel(b.sector);
                        return (
                          <TableRow key={`${b.sector}-${b.bed_number}-${idx}`}>
                            <TableCell><Badge variant="outline">{sl}</Badge></TableCell>
                            <TableCell className="font-medium">{b.bed_number}</TableCell>
                            <TableCell className="font-medium uppercase">{b.patient_name}</TableCell>
                            <TableCell className="max-w-[200px] truncate">{b.hipotese_diagnostica || "-"}</TableCell>
                            <TableCell>{b.data_internacao ? format(new Date(b.data_internacao), "dd/MM/yyyy") : "-"}</TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" variant="outline" onClick={() => {
                                setAtendimentoForm(prev => ({
                                  ...prev,
                                  paciente_nome: b.patient_name,
                                  setor_atendimento: sl,
                                  setor_internacao: `Leito ${b.bed_number} - ${sl}`,
                                }));
                                setAtendimentoDialog(true);
                              }}>
                                <Plus className="h-3 w-3 mr-1" />
                                Atender
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

        {/* ======= ENCAMINHAMENTOS TAB ======= */}
        <TabsContent value="encaminhamentos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Encaminhamentos para Rede de Atenção</CardTitle>
              <CardDescription>RAPS, SUAS, Conselhos e demais equipamentos da rede</CardDescription>
            </CardHeader>
            <CardContent>
              {encaminhamentos.length === 0 ? (
                <EmptyState icon={Send} title="Nenhum encaminhamento registrado" description="Encaminhe casos a partir dos atendimentos" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Tipo / Serviço</TableHead>
                      <TableHead>Destino</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Registrado por</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {encaminhamentos.map(e => (
                      <TableRow key={e.id}>
                        <TableCell className="whitespace-nowrap">{format(new Date(e.data_encaminhamento), "dd/MM/yyyy HH:mm")}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {tiposEncaminhamento.find(t => t.value === e.tipo_encaminhamento)?.label || e.tipo_encaminhamento}
                          </Badge>
                        </TableCell>
                        <TableCell>{e.destino || "-"}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{e.motivo}</TableCell>
                        <TableCell>
                          <StatusBadge status={mapStatusToType(e.status)} label={statusEncaminhamento.find(s => s.value === e.status)?.label || e.status} />
                        </TableCell>
                        <TableCell>{e.registrado_por_nome}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ======= PASSAGEM DE PLANTÃO TAB ======= */}
        <TabsContent value="passagem" className="space-y-4">
          <PassagemPlantaoSocial currentUser={currentUser} atendimentos={atendimentos} onRefresh={loadData} />
        </TabsContent>

        {/* ======= SOLICITAÇÕES DE SUPORTE TAB ======= */}
        <TabsContent value="suporte" className="space-y-4">
          <SolicitacoesSuporte currentUser={currentUser} />
        </TabsContent>

        {/* ======= RELATÓRIOS ONA TAB ======= */}
        <TabsContent value="relatorios" className="space-y-4">
          <ReportSection atendimentos={atendimentos} encaminhamentos={encaminhamentos} bedPatients={bedPatients} />
        </TabsContent>
      </Tabs>

      {/* ======= DIALOG: NOVO ATENDIMENTO ======= */}
      <Dialog open={atendimentoDialog} onOpenChange={setAtendimentoDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">Registrar Atendimento</DialogTitle>
            <CardDescription>Preencha os dados do atendimento social ou psicológico</CardDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* Identificação */}
            <div className="space-y-1">
              <p className="text-sm font-semibold text-primary">Identificação do Paciente</p>
              <div className="h-px bg-border" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label>Nome do Paciente *</Label>
                <Input 
                  value={atendimentoForm.paciente_nome} 
                  onChange={e => setAtendimentoForm({...atendimentoForm, paciente_nome: e.target.value.toUpperCase()})} 
                  placeholder="NOME COMPLETO DO PACIENTE"
                  className="uppercase"
                />
              </div>
              <div>
                <Label>Local de Atendimento *</Label>
                <Select value={atendimentoForm.setor_atendimento} onValueChange={v => setAtendimentoForm({...atendimentoForm, setor_atendimento: v})}>
                  <SelectTrigger><SelectValue placeholder="Selecione o local..." /></SelectTrigger>
                  <SelectContent>
                    {locaisAtendimento.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Área de Atuação *</Label>
                <Select value={atendimentoForm.area} onValueChange={v => setAtendimentoForm({...atendimentoForm, area: v, tipo_atendimento: ""})}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {areasAtuacao.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Classificação */}
            <div className="space-y-1">
              <p className="text-sm font-semibold text-primary">Classificação</p>
              <div className="h-px bg-border" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Tipo de Atendimento *</Label>
                <Select value={atendimentoForm.tipo_atendimento} onValueChange={v => setAtendimentoForm({...atendimentoForm, tipo_atendimento: v})}>
                  <SelectTrigger><SelectValue placeholder="Selecione o tipo..." /></SelectTrigger>
                  <SelectContent>
                    {tiposFilteredByArea.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={atendimentoForm.status} onValueChange={v => setAtendimentoForm({...atendimentoForm, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {statusAtendimento.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Detalhes */}
            <div className="space-y-1">
              <p className="text-sm font-semibold text-primary">Detalhes do Atendimento</p>
              <div className="h-px bg-border" />
            </div>
            <div className="space-y-4">
              <div>
                <Label>Motivo do Atendimento *</Label>
                <Input value={atendimentoForm.motivo} onChange={e => setAtendimentoForm({...atendimentoForm, motivo: e.target.value})} placeholder="Descreva o motivo principal..." />
              </div>
              <div>
                <Label>Descrição / Evolução *</Label>
                <Textarea rows={5} value={atendimentoForm.descricao} onChange={e => setAtendimentoForm({...atendimentoForm, descricao: e.target.value})} placeholder="Descreva detalhadamente o atendimento realizado, condutas e orientações..." />
              </div>
              <div>
                <Label>Evolução de Prontuário realizada no Sistema Salus? *</Label>
                <Select value={atendimentoForm.evolucao_salus} onValueChange={v => setAtendimentoForm({...atendimentoForm, evolucao_salus: v})}>
                  <SelectTrigger className={!atendimentoForm.evolucao_salus ? "border-destructive" : ""}><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sim">Sim</SelectItem>
                    <SelectItem value="nao">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Observações Adicionais</Label>
                <Textarea rows={2} value={atendimentoForm.observacoes} onChange={e => setAtendimentoForm({...atendimentoForm, observacoes: e.target.value})} placeholder="Informações complementares (opcional)" />
              </div>
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setAtendimentoDialog(false)}>Cancelar</Button>
            <Button onClick={handleCreateAtendimento} disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Registrar Atendimento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ======= DIALOG: ENCAMINHAMENTO ======= */}
      <Dialog open={encaminhamentoDialog} onOpenChange={setEncaminhamentoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Encaminhamento</DialogTitle>
            <CardDescription>Encaminhar para rede de atenção (RAPS, SUAS, Conselhos)</CardDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label>Serviço / Equipamento *</Label>
              <Select value={encaminhamentoForm.tipo_encaminhamento} onValueChange={v => setEncaminhamentoForm({...encaminhamentoForm, tipo_encaminhamento: v})}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {tiposEncaminhamento.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Destino / Instituição</Label>
              <Input value={encaminhamentoForm.destino} onChange={e => setEncaminhamentoForm({...encaminhamentoForm, destino: e.target.value})} placeholder="Nome da instituição, unidade ou família" />
            </div>
            <div>
              <Label>Motivo *</Label>
              <Textarea value={encaminhamentoForm.motivo} onChange={e => setEncaminhamentoForm({...encaminhamentoForm, motivo: e.target.value})} placeholder="Descreva o motivo do encaminhamento..." />
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea value={encaminhamentoForm.observacoes} onChange={e => setEncaminhamentoForm({...encaminhamentoForm, observacoes: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEncaminhamentoDialog(false)}>Cancelar</Button>
            <Button onClick={handleCreateEncaminhamento} disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Registrar Encaminhamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ======= DIALOG: DETALHES ======= */}
      <Dialog open={detalhesDialog} onOpenChange={setDetalhesDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Atendimento</DialogTitle>
          </DialogHeader>
          {selectedAtendimento && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Paciente</Label>
                  <p className="font-medium uppercase">{selectedAtendimento.paciente?.nome_completo}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Local</Label>
                  <p>{selectedAtendimento.paciente?.setor_atendimento || "-"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Tipo de Atendimento</Label>
                  <p>{tiposAtendimento.find(t => t.value === selectedAtendimento.tipo_atendimento)?.label}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <Select value={selectedAtendimento.status} onValueChange={v => handleUpdateStatus(selectedAtendimento.id, v)}>
                    <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {statusAtendimento.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-muted-foreground">Data/Hora</Label>
                  <p>{format(new Date(selectedAtendimento.data_atendimento), "dd/MM/yyyy HH:mm")}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Profissional</Label>
                  <p>{selectedAtendimento.profissional_nome}</p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Motivo</Label>
                <p>{selectedAtendimento.motivo}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Descrição / Evolução</Label>
                <p className="whitespace-pre-wrap text-sm">{selectedAtendimento.descricao}</p>
              </div>
              {selectedAtendimento.observacoes && (
                <div>
                  <Label className="text-muted-foreground">Observações</Label>
                  <p className="whitespace-pre-wrap text-sm">{selectedAtendimento.observacoes}</p>
                </div>
              )}
              <Separator />
              <div>
                <Label className="text-muted-foreground">Encaminhamentos vinculados</Label>
                {encaminhamentos.filter(e => e.atendimento_id === selectedAtendimento.id).length === 0 ? (
                  <p className="text-sm text-muted-foreground mt-1">Nenhum encaminhamento registrado</p>
                ) : (
                  <div className="space-y-2 mt-2">
                    {encaminhamentos.filter(e => e.atendimento_id === selectedAtendimento.id).map(e => (
                      <div key={e.id} className="border rounded p-3 text-sm">
                        <div className="flex justify-between items-center">
                          <Badge variant="outline">{tiposEncaminhamento.find(t => t.value === e.tipo_encaminhamento)?.label || e.tipo_encaminhamento}</Badge>
                          <StatusBadge status={mapStatusToType(e.status)} label={statusEncaminhamento.find(s => s.value === e.status)?.label || e.status} showIcon={false} />
                        </div>
                        {e.destino && <p className="text-muted-foreground mt-1">{e.destino}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetalhesDialog(false)}>Fechar</Button>
            <Button onClick={() => { setDetalhesDialog(false); setEncaminhamentoDialog(true); }}>
              <Send className="h-4 w-4 mr-2" />
              Novo Encaminhamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ======= REPORT SECTION (extracted for readability) =======
const ReportSection = ({ atendimentos: allAtendimentos, encaminhamentos: allEncaminhamentos, bedPatients }: {
  atendimentos: Atendimento[];
  encaminhamentos: Encaminhamento[];
  bedPatients: BedPatient[];
}) => {
  const COLORS = ['hsl(var(--primary))', '#16a34a', '#eab308', '#ea580c', '#dc2626', '#8b5cf6', '#06b6d4', '#f97316'];
  const now = new Date();

  // --- Filters ---
  const [rptDataInicio, setRptDataInicio] = useState("");
  const [rptDataFim, setRptDataFim] = useState("");
  const [rptStatus, setRptStatus] = useState("todos");
  const [rptProfissional, setRptProfissional] = useState("todos");
  const [rptArea, setRptArea] = useState("todos");

  const profissionaisUnicos = useMemo(() => {
    const s = new Set(allAtendimentos.map(a => a.profissional_nome));
    return Array.from(s).sort();
  }, [allAtendimentos]);

  // Filtered data
  const atendimentos = useMemo(() => allAtendimentos.filter(a => {
    if (rptDataInicio && new Date(a.data_atendimento) < new Date(rptDataInicio)) return false;
    if (rptDataFim && new Date(a.data_atendimento) > new Date(rptDataFim + "T23:59:59")) return false;
    if (rptStatus !== "todos" && a.status !== rptStatus) return false;
    if (rptProfissional !== "todos" && a.profissional_nome !== rptProfissional) return false;
    if (rptArea !== "todos") {
      const tipoInfo = tiposAtendimento.find(t => t.value === a.tipo_atendimento);
      if (tipoInfo && tipoInfo.area !== rptArea && tipoInfo.area !== "ambos") return false;
    }
    return true;
  }), [allAtendimentos, rptDataInicio, rptDataFim, rptStatus, rptProfissional, rptArea]);

  const atendimentoIds = useMemo(() => new Set(atendimentos.map(a => a.id)), [atendimentos]);

  const encaminhamentos = useMemo(() => allEncaminhamentos.filter(e => {
    if (!atendimentoIds.has(e.atendimento_id)) return false;
    if (rptDataInicio && new Date(e.data_encaminhamento) < new Date(rptDataInicio)) return false;
    if (rptDataFim && new Date(e.data_encaminhamento) > new Date(rptDataFim + "T23:59:59")) return false;
    return true;
  }), [allEncaminhamentos, atendimentoIds, rptDataInicio, rptDataFim]);

  const months = useMemo(() => {
    const start = rptDataInicio ? startOfMonth(new Date(rptDataInicio)) : subMonths(startOfMonth(now), 5);
    const end = rptDataFim ? startOfMonth(new Date(rptDataFim)) : startOfMonth(now);
    return eachMonthOfInterval({ start, end });
  }, [rptDataInicio, rptDataFim]);

  const totalAtend = atendimentos.length;
  const totalEnc = encaminhamentos.length;
  const finalizados = atendimentos.filter(a => a.status === 'finalizado').length;
  const emAtendimento = atendimentos.filter(a => a.status === 'em_atendimento').length;
  const encRealizados = encaminhamentos.filter(e => e.status === 'realizado').length;
  const comRetorno = encaminhamentos.filter(e => e.data_retorno).length;

  const taxaResolutividade = totalAtend > 0 ? (finalizados / totalAtend) * 100 : 0;
  const taxaEncaminhamento = totalAtend > 0 ? (totalEnc / totalAtend) * 100 : 0;
  const taxaEfetividade = totalEnc > 0 ? (encRealizados / totalEnc) * 100 : 0;
  const taxaRetorno = totalEnc > 0 ? (comRetorno / totalEnc) * 100 : 0;

  // Tempo médio de resolução
  const atendFin = atendimentos.filter(a => a.status === 'finalizado' && a.updated_at);
  let tempoMedio = 0;
  if (atendFin.length > 0) {
    tempoMedio = atendFin.reduce((acc, a) => {
      const inicio = new Date(a.data_atendimento).getTime();
      const fim = new Date(a.updated_at).getTime();
      return acc + Math.max(0, (fim - inicio) / 3600000);
    }, 0) / atendFin.length;
  }

  const tipoData = tiposAtendimento.map((t, i) => ({
    name: t.label, value: atendimentos.filter(a => a.tipo_atendimento === t.value).length, fill: COLORS[i % COLORS.length],
  })).filter(d => d.value > 0);

  const encamData = tiposEncaminhamento.map((t, i) => ({
    name: t.label, value: encaminhamentos.filter(e => e.tipo_encaminhamento === t.value).length, fill: COLORS[i % COLORS.length],
  })).filter(d => d.value > 0);

  const evolucaoData = months.map(m => {
    const s = startOfMonth(m), e = endOfMonth(m);
    return {
      mes: format(m, "MMM/yy", { locale: ptBR }),
      Atendimentos: atendimentos.filter(a => { const d = new Date(a.data_atendimento); return d >= s && d <= e; }).length,
      Encaminhamentos: encaminhamentos.filter(enc => { const d = new Date(enc.data_encaminhamento); return d >= s && d <= e; }).length,
    };
  });

  const profCount: Record<string, number> = {};
  atendimentos.forEach(a => { profCount[a.profissional_nome] = (profCount[a.profissional_nome] || 0) + 1; });
  const profData = Object.entries(profCount).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  const motivoCount: Record<string, number> = {};
  atendimentos.forEach(a => { const m = a.motivo?.trim() || 'N/I'; motivoCount[m] = (motivoCount[m] || 0) + 1; });
  const motivoData = Object.entries(motivoCount).map(([name, value]) => ({ name: name.length > 35 ? name.slice(0, 35) + '…' : name, value })).sort((a, b) => b.value - a.value).slice(0, 8);

  const setorCount: Record<string, number> = {};
  atendimentos.forEach(a => { const s = a.paciente?.setor_atendimento || 'N/I'; setorCount[s] = (setorCount[s] || 0) + 1; });
  const setorData = Object.entries(setorCount).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  const hasFilters = rptDataInicio || rptDataFim || rptStatus !== "todos" || rptProfissional !== "todos" || rptArea !== "todos";
  const clearFilters = () => { setRptDataInicio(""); setRptDataFim(""); setRptStatus("todos"); setRptProfissional("todos"); setRptArea("todos"); };

  const OnaIndicator = ({ label, value, meta, metaLabel }: { label: string; value: number; meta: number; metaLabel: string }) => (
    <div className="p-4 rounded-lg border bg-card">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <Badge variant={value >= meta ? "default" : value >= meta * 0.75 ? "secondary" : "destructive"} className="text-[10px]">
          {value >= meta ? "Conforme" : value >= meta * 0.75 ? "Atenção" : "Não Conforme"}
        </Badge>
      </div>
      <p className="text-3xl font-bold">{value.toFixed(1)}%</p>
      <p className="text-[10px] text-muted-foreground mt-1">{metaLabel}</p>
      <Progress value={Math.min(value, 100)} className="mt-2 h-1.5" />
    </div>
  );

  const checklistItems = [
    { req: "Registro sistemático dos atendimentos realizados", met: totalAtend > 0 },
    { req: "Identificação e classificação das demandas sociais e psicológicas", met: tipoData.length > 0 },
    { req: "Separação por área de atuação (Serviço Social / Psicologia)", met: (() => {
      const tiposSocial = tiposAtendimento.filter(t => t.area === 'social' || t.area === 'ambos').map(t => t.value);
      const tiposPsico = tiposAtendimento.filter(t => t.area === 'psicologia' || t.area === 'ambos').map(t => t.value);
      const temSocial = atendimentos.some(a => a.observacoes?.includes('Área: Serviço Social') || tiposSocial.includes(a.tipo_atendimento));
      const temPsico = atendimentos.some(a => a.observacoes?.includes('Área: Psicologia') || tiposPsico.includes(a.tipo_atendimento));
      return temSocial && temPsico;
    })() },
    { req: "Encaminhamentos para rede RAPS/SUAS (CRAS, CREAS, CAPS)", met: totalEnc > 0 },
    { req: "Acompanhamento dos encaminhamentos (contra-referência)", met: taxaRetorno > 0 },
    { req: "Monitoramento de indicadores de produtividade profissional", met: profData.length > 0 },
    { req: "Taxa de resolutividade ≥ 80%", met: taxaResolutividade >= 80 },
    { req: "Efetividade dos encaminhamentos ≥ 70%", met: taxaEfetividade >= 70 },
    { req: "Corrida de leito — acompanhamento de pacientes internados", met: bedPatients.length > 0 && atendimentos.some(a => a.observacoes?.includes("Setor de Internação:")) },
    { req: "Documentação e evolução dos atendimentos", met: totalAtend > 0 },
    { req: "Integração multiprofissional", met: profData.length > 1 },
    { req: "Identificação de vulnerabilidades e riscos psicossociais", met: motivoData.length > 0 },
  ];
  const conformidade = checklistItems.filter(i => i.met).length;

  return (
    <>
      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Data Início</Label>
              <Input type="date" value={rptDataInicio} onChange={e => setRptDataInicio(e.target.value)} className="w-[150px]" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Data Fim</Label>
              <Input type="date" value={rptDataFim} onChange={e => setRptDataFim(e.target.value)} className="w-[150px]" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={rptStatus} onValueChange={setRptStatus}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {statusAtendimento.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Área</Label>
              <Select value={rptArea} onValueChange={setRptArea}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  {areasAtuacao.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Profissional</Label>
              <Select value={rptProfissional} onValueChange={setRptProfissional}>
                <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {profissionaisUnicos.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-muted-foreground">
                Limpar filtros
              </Button>
            )}
          </div>
          {hasFilters && (
            <p className="text-xs text-muted-foreground mt-2">
              Exibindo {totalAtend} atendimentos e {totalEnc} encaminhamentos com os filtros aplicados
            </p>
          )}
        </CardContent>
      </Card>

      {/* Header */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="h-6 w-6 text-primary" />
            <div>
              <h3 className="text-lg font-bold text-primary">Relatório ONA — Nível 1 (Segurança)</h3>
              <p className="text-sm text-muted-foreground">Serviço Social e Psicologia • Indicadores de segurança, processos e resultados assistenciais</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Período: {rptDataInicio ? format(new Date(rptDataInicio), "dd/MM/yyyy") : format(subMonths(now, 5), "MMM/yyyy", { locale: ptBR })} a {rptDataFim ? format(new Date(rptDataFim), "dd/MM/yyyy") : format(now, "MMM/yyyy", { locale: ptBR })} • Gerado em: {format(now, "dd/MM/yyyy HH:mm")}
          </p>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { v: totalAtend, l: "Total Atendimentos" },
          { v: emAtendimento, l: "Em Atendimento" },
          { v: finalizados, l: "Finalizados" },
          { v: totalEnc, l: "Encaminhamentos" },
          { v: `${tempoMedio.toFixed(1)}h`, l: "Tempo Médio Resolução" },
          { v: bedPatients.length, l: "Pacientes Internados" },
        ].map((k, i) => (
          <Card key={i}>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-bold text-primary">{k.v}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{k.l}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ONA Indicators */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Shield className="h-4 w-4" />Indicadores ONA — Nível 1</CardTitle>
          <CardDescription>Métricas de segurança e efetividade assistencial</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <OnaIndicator label="Taxa de Resolutividade" value={taxaResolutividade} meta={80} metaLabel="Meta ONA: ≥ 80%" />
            <OnaIndicator label="Taxa de Encaminhamento" value={taxaEncaminhamento} meta={100} metaLabel="Encaminhamentos / Atendimentos" />
            <OnaIndicator label="Efetividade Encaminhamentos" value={taxaEfetividade} meta={70} metaLabel="Meta ONA: ≥ 70%" />
            <OnaIndicator label="Contra-referência" value={taxaRetorno} meta={50} metaLabel="Meta ONA: ≥ 50%" />
          </div>
        </CardContent>
      </Card>

      {/* Evolução */}
      <Card>
        <CardHeader>
          <CardTitle>Evolução Mensal</CardTitle>
          <CardDescription>Acompanhamento da demanda nos últimos 6 meses</CardDescription>
        </CardHeader>
        <CardContent>
          {evolucaoData.some(d => d.Atendimentos > 0 || d.Encaminhamentos > 0) ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={evolucaoData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip /><Legend />
                <Bar dataKey="Atendimentos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Encaminhamentos" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyState icon={BarChart3} title="Sem dados" description="Registre atendimentos para gerar o gráfico" />}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Perfil por Tipo de Atendimento</CardTitle></CardHeader>
          <CardContent>
            {tipoData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart><Pie data={tipoData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} labelLine={false}>
                  {tipoData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Pie><Tooltip /></PieChart>
              </ResponsiveContainer>
            ) : <EmptyState icon={BarChart3} title="Sem dados" description="Nenhum atendimento" />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Rede de Encaminhamentos (RAPS/SUAS)</CardTitle></CardHeader>
          <CardContent>
            {encamData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart><Pie data={encamData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} labelLine={false}>
                  {encamData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Pie><Tooltip /></PieChart>
              </ResponsiveContainer>
            ) : <EmptyState icon={BarChart3} title="Sem dados" description="Nenhum encaminhamento" />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Demanda por Local de Atendimento</CardTitle></CardHeader>
          <CardContent>
            {setorData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={setorData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#16a34a" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyState icon={BarChart3} title="Sem dados" description="Nenhum atendimento" />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Produtividade por Profissional</CardTitle></CardHeader>
          <CardContent>
            {profData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={profData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#06b6d4" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyState icon={BarChart3} title="Sem dados" description="Nenhum atendimento" />}
          </CardContent>
        </Card>
      </div>

      {/* Motivos */}
      <Card>
        <CardHeader>
          <CardTitle>Motivos de Atendimento Mais Frequentes</CardTitle>
          <CardDescription>Principais demandas identificadas</CardDescription>
        </CardHeader>
        <CardContent>
          {motivoData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={motivoData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                <YAxis allowDecimals={false} /><Tooltip />
                <Bar dataKey="value" fill="#ea580c" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyState icon={BarChart3} title="Sem dados" description="Nenhum atendimento" />}
        </CardContent>
      </Card>

      {/* Checklist ONA */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ClipboardList className="h-4 w-4" />Checklist ONA — Requisitos Nível 1</CardTitle>
          <CardDescription>Requisitos do Manual ONA para Serviço Social e Psicologia em Urgência/Emergência</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {checklistItems.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50">
                <div className={`h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${item.met ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {item.met ? '✓' : '✗'}
                </div>
                <span className="text-sm flex-1">{item.req}</span>
                <Badge variant={item.met ? "default" : "destructive"} className="text-[10px] shrink-0">
                  {item.met ? "Conforme" : "Não Conforme"}
                </Badge>
              </div>
            ))}
          </div>
          <Separator className="my-4" />
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Conformidade Geral</span>
            <div className="flex items-center gap-2">
              <Progress value={(conformidade / checklistItems.length) * 100} className="w-32 h-2" />
              <span className="text-sm font-bold text-primary">{conformidade}/{checklistItems.length}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
};
