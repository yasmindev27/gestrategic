import { useState, useEffect } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Users, ClipboardList, FileText, BarChart3, Plus, Eye, Pencil, Send, Upload, Download, Search, UserPlus } from "lucide-react";
import { ShieldX } from "lucide-react";
import { SectionHeader, ActionButton } from "@/components/ui/action-buttons";
import { StatCard } from "@/components/ui/stat-card";
import { SearchInput } from "@/components/ui/search-input";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge, mapStatusToType } from "@/components/ui/status-badge";
import { ExportDropdown } from "@/components/ui/export-dropdown";
import { DateRangeFilter } from "@/components/ui/date-range-filter";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Paciente {
  id: string;
  nome_completo: string;
  numero_prontuario: string | null;
  cpf: string | null;
  cns: string | null;
  data_nascimento: string | null;
  telefone: string | null;
  endereco: string | null;
  setor_atendimento: string;
  observacoes: string | null;
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

const tiposAtendimento = [
  { value: "orientacao", label: "Orientação" },
  { value: "apoio_familiar", label: "Apoio Familiar" },
  { value: "alta_social", label: "Alta Social" },
  { value: "obito", label: "Óbito" },
  { value: "vulnerabilidade", label: "Vulnerabilidade Social" },
  { value: "transferencia", label: "Transferência" },
  { value: "outros", label: "Outros" },
];

const tiposEncaminhamento = [
  { value: "CRAS", label: "CRAS" },
  { value: "CREAS", label: "CREAS" },
  { value: "CAPS", label: "CAPS" },
  { value: "Conselho Tutelar", label: "Conselho Tutelar" },
  { value: "familia", label: "Família" },
  { value: "outros", label: "Outros" },
];

const statusAtendimento = [
  { value: "em_atendimento", label: "Em Atendimento" },
  { value: "em_acompanhamento", label: "Em Acompanhamento" },
  { value: "finalizado", label: "Finalizado" },
];

const setoresAtendimento = [
  "Emergência", "Observação Adulto", "Observação Pediátrica", "Sala Amarela", 
  "Sala Vermelha", "Sala Verde", "Ambulatório", "Recepção", "Outro"
];

export const AssistenciaSocialModule = () => {
  const { isAdmin, isLoading: isLoadingRole } = useUserRole();
  const { logAction } = useLogAccess();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("atendimentos");
  
  // Data states
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
  const [encaminhamentos, setEncaminhamentos] = useState<Encaminhamento[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  
  // Form states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [tipoFilter, setTipoFilter] = useState("todos");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  
  // Dialog states
  const [pacienteDialog, setPacienteDialog] = useState(false);
  const [atendimentoDialog, setAtendimentoDialog] = useState(false);
  const [encaminhamentoDialog, setEncaminhamentoDialog] = useState(false);
  const [detalhesDialog, setDetalhesDialog] = useState(false);
  const [selectedAtendimento, setSelectedAtendimento] = useState<Atendimento | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form data
  const [pacienteForm, setPacienteForm] = useState({
    nome_completo: "",
    numero_prontuario: "",
    cpf: "",
    cns: "",
    data_nascimento: "",
    telefone: "",
    endereco: "",
    setor_atendimento: "",
    observacoes: "",
  });
  
  const [atendimentoForm, setAtendimentoForm] = useState({
    paciente_nome: "",
    setor_atendimento: "",
    numero_prontuario: "",
    tipo_atendimento: "",
    motivo: "",
    descricao: "",
    status: "em_atendimento",
    observacoes: "",
  });
  
  const [encaminhamentoForm, setEncaminhamentoForm] = useState({
    tipo_encaminhamento: "",
    destino: "",
    motivo: "",
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

    // Check if user has permission (admin or assistencia_social role)
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    const hasAccess = roleData?.role === "admin" || roleData?.role === "assistencia_social";
    setHasPermission(hasAccess);
    
    if (hasAccess) {
      await loadData();
      logAction("Assistência Social", "acesso_modulo");
    }
    setIsLoading(false);
  };

  const loadData = async () => {
    const [pacientesRes, atendimentosRes, encaminhamentosRes] = await Promise.all([
      supabase.from("assistencia_social_pacientes").select("*").order("created_at", { ascending: false }),
      supabase.from("assistencia_social_atendimentos").select("*").order("data_atendimento", { ascending: false }),
      supabase.from("assistencia_social_encaminhamentos").select("*").order("data_encaminhamento", { ascending: false }),
    ]);

    if (pacientesRes.data) setPacientes(pacientesRes.data);
    if (atendimentosRes.data) {
      // Join with pacientes
      const atendimentosWithPaciente = atendimentosRes.data.map(a => ({
        ...a,
        paciente: pacientesRes.data?.find(p => p.id === a.paciente_id)
      }));
      setAtendimentos(atendimentosWithPaciente);
    }
    if (encaminhamentosRes.data) setEncaminhamentos(encaminhamentosRes.data);
  };

  const handleCreatePaciente = async () => {
    if (!pacienteForm.nome_completo || !pacienteForm.setor_atendimento) {
      toast({ title: "Erro", description: "Nome e setor são obrigatórios", variant: "destructive" });
      return;
    }
    
    setIsSubmitting(true);
    const { error } = await supabase.from("assistencia_social_pacientes").insert({
      ...pacienteForm,
      created_by: currentUser.id,
    });
    
    if (error) {
      toast({ title: "Erro", description: "Falha ao cadastrar paciente", variant: "destructive" });
    } else {
      toast({ title: "Sucesso", description: "Paciente cadastrado" });
      setPacienteDialog(false);
      resetPacienteForm();
      loadData();
      logAction("Assistência Social", "cadastro_paciente", { nome: pacienteForm.nome_completo });
    }
    setIsSubmitting(false);
  };

  const handleCreateAtendimento = async () => {
    if (!atendimentoForm.paciente_nome || !atendimentoForm.setor_atendimento || !atendimentoForm.tipo_atendimento || !atendimentoForm.motivo || !atendimentoForm.descricao) {
      toast({ title: "Erro", description: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Create or find patient by name + setor
      let pacienteId: string;
      const { data: existingPaciente } = await supabase
        .from("assistencia_social_pacientes")
        .select("id")
        .ilike("nome_completo", atendimentoForm.paciente_nome.trim())
        .eq("setor_atendimento", atendimentoForm.setor_atendimento)
        .maybeSingle();

      if (existingPaciente) {
        pacienteId = existingPaciente.id;
      } else {
        const { data: newPaciente, error: pacienteError } = await supabase
          .from("assistencia_social_pacientes")
          .insert({
            nome_completo: atendimentoForm.paciente_nome.trim(),
            setor_atendimento: atendimentoForm.setor_atendimento,
            numero_prontuario: atendimentoForm.numero_prontuario || null,
            created_by: currentUser.id,
          })
          .select("id")
          .single();
        if (pacienteError || !newPaciente) throw pacienteError;
        pacienteId = newPaciente.id;
      }

      const { error } = await supabase.from("assistencia_social_atendimentos").insert({
        paciente_id: pacienteId,
        tipo_atendimento: atendimentoForm.tipo_atendimento,
        motivo: atendimentoForm.motivo,
        descricao: atendimentoForm.descricao,
        status: atendimentoForm.status,
        observacoes: atendimentoForm.observacoes || null,
        profissional_id: currentUser.id,
        profissional_nome: currentUser.nome,
      });
      
      if (error) throw error;
      toast({ title: "Sucesso", description: "Atendimento registrado" });
      setAtendimentoDialog(false);
      resetAtendimentoForm();
      loadData();
      logAction("Assistência Social", "registro_atendimento", { tipo: atendimentoForm.tipo_atendimento });
    } catch (error) {
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
    
    if (error) {
      toast({ title: "Erro", description: "Falha ao atualizar status", variant: "destructive" });
    } else {
      toast({ title: "Sucesso", description: "Status atualizado" });
      loadData();
    }
  };

  const resetPacienteForm = () => setPacienteForm({
    nome_completo: "", numero_prontuario: "", cpf: "", cns: "",
    data_nascimento: "", telefone: "", endereco: "", setor_atendimento: "", observacoes: "",
  });

  const resetAtendimentoForm = () => setAtendimentoForm({
    paciente_id: "", tipo_atendimento: "", motivo: "", descricao: "", status: "em_atendimento", observacoes: "",
  });

  const resetEncaminhamentoForm = () => setEncaminhamentoForm({
    tipo_encaminhamento: "", destino: "", motivo: "", observacoes: "",
  });

  // Filtered data
  const filteredAtendimentos = atendimentos.filter(a => {
    const matchSearch = searchTerm === "" || 
      a.paciente?.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.paciente?.numero_prontuario?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === "todos" || a.status === statusFilter;
    const matchTipo = tipoFilter === "todos" || a.tipo_atendimento === tipoFilter;
    const matchDataInicio = !dataInicio || new Date(a.data_atendimento) >= new Date(dataInicio);
    const matchDataFim = !dataFim || new Date(a.data_atendimento) <= new Date(dataFim + "T23:59:59");
    return matchSearch && matchStatus && matchTipo && matchDataInicio && matchDataFim;
  });

  // Stats
  const stats = {
    total: atendimentos.length,
    emAtendimento: atendimentos.filter(a => a.status === "em_atendimento").length,
    emAcompanhamento: atendimentos.filter(a => a.status === "em_acompanhamento").length,
    finalizados: atendimentos.filter(a => a.status === "finalizado").length,
    encaminhamentos: encaminhamentos.length,
  };

  // Export functions
  const exportToExcel = () => {
    const data = filteredAtendimentos.map(a => ({
      Data: format(new Date(a.data_atendimento), "dd/MM/yyyy HH:mm"),
      Paciente: a.paciente?.nome_completo || "",
      Prontuário: a.paciente?.numero_prontuario || "",
      Tipo: tiposAtendimento.find(t => t.value === a.tipo_atendimento)?.label || a.tipo_atendimento,
      Status: statusAtendimento.find(s => s.value === a.status)?.label || a.status,
      Profissional: a.profissional_nome,
      Motivo: a.motivo,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Atendimentos");
    XLSX.writeFile(wb, `assistencia-social-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  const exportToPDF = async () => {
    const { createStandardPdf, savePdfWithFooter } = await import('@/lib/export-utils');
    const { doc, logoImg } = await createStandardPdf('Relatório - Assistência Social');
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
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
    savePdfWithFooter(doc, 'Relatório - Assistência Social', `assistencia-social-${format(new Date(), "yyyy-MM-dd")}`, logoImg);
  };

  if (isLoadingRole || isLoading) {
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
          Você não tem permissão para acessar o módulo de Assistência Social.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader 
        title="Assistência Social" 
        description="Gestão de atendimentos e acompanhamentos sociais"
      >
        <ActionButton type="add" label="Novo Paciente" onClick={() => setPacienteDialog(true)} />
        <ActionButton type="add" label="Novo Atendimento" onClick={() => setAtendimentoDialog(true)} variant="outline" />
      </SectionHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <StatCard title="Total de Atendimentos" value={stats.total} icon={ClipboardList} variant="primary" />
        <StatCard title="Em Atendimento" value={stats.emAtendimento} icon={Users} variant="info" />
        <StatCard title="Em Acompanhamento" value={stats.emAcompanhamento} icon={Users} variant="warning" />
        <StatCard title="Finalizados" value={stats.finalizados} icon={Users} variant="success" />
        <StatCard title="Encaminhamentos" value={stats.encaminhamentos} icon={Send} variant="default" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="atendimentos">Atendimentos</TabsTrigger>
          <TabsTrigger value="pacientes">Pacientes</TabsTrigger>
          <TabsTrigger value="encaminhamentos">Encaminhamentos</TabsTrigger>
          <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
        </TabsList>

        {/* Atendimentos Tab */}
        <TabsContent value="atendimentos" className="space-y-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-wrap items-end gap-4">
                <SearchInput
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder="Buscar paciente..."
                  className="w-[250px]"
                />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {statusAtendimento.map(s => (
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
                    {tiposAtendimento.map(t => (
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

          <Card>
            <CardContent className="pt-4">
              {filteredAtendimentos.length === 0 ? (
                <EmptyState
                  icon={ClipboardList}
                  title="Nenhum atendimento encontrado"
                  description="Registre novos atendimentos sociais"
                  action={{ label: "Novo Atendimento", onClick: () => setAtendimentoDialog(true) }}
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Paciente</TableHead>
                      <TableHead>Prontuário</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Profissional</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAtendimentos.map(a => (
                      <TableRow key={a.id}>
                        <TableCell>{format(new Date(a.data_atendimento), "dd/MM/yyyy HH:mm")}</TableCell>
                        <TableCell className="font-medium">{a.paciente?.nome_completo || "-"}</TableCell>
                        <TableCell>{a.paciente?.numero_prontuario || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {tiposAtendimento.find(t => t.value === a.tipo_atendimento)?.label || a.tipo_atendimento}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <StatusBadge 
                            status={mapStatusToType(a.status)} 
                            label={statusAtendimento.find(s => s.value === a.status)?.label || a.status} 
                          />
                        </TableCell>
                        <TableCell>{a.profissional_nome}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button size="icon" variant="ghost" onClick={() => {
                              setSelectedAtendimento(a);
                              setDetalhesDialog(true);
                            }}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => {
                              setSelectedAtendimento(a);
                              setEncaminhamentoDialog(true);
                            }}>
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

        {/* Pacientes Tab */}
        <TabsContent value="pacientes" className="space-y-4">
          <Card>
            <CardContent className="pt-4">
              {pacientes.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="Nenhum paciente cadastrado"
                  description="Cadastre pacientes para registrar atendimentos"
                  action={{ label: "Novo Paciente", onClick: () => setPacienteDialog(true) }}
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Prontuário</TableHead>
                      <TableHead>CPF</TableHead>
                      <TableHead>Setor</TableHead>
                      <TableHead>Cadastrado em</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pacientes.map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.nome_completo}</TableCell>
                        <TableCell>{p.numero_prontuario || "-"}</TableCell>
                        <TableCell>{p.cpf || "-"}</TableCell>
                        <TableCell>{p.setor_atendimento}</TableCell>
                        <TableCell>{format(new Date(p.created_at), "dd/MM/yyyy")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Encaminhamentos Tab */}
        <TabsContent value="encaminhamentos" className="space-y-4">
          <Card>
            <CardContent className="pt-4">
              {encaminhamentos.length === 0 ? (
                <EmptyState
                  icon={Send}
                  title="Nenhum encaminhamento registrado"
                  description="Encaminhe casos a partir dos atendimentos"
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Destino</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Registrado por</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {encaminhamentos.map(e => (
                      <TableRow key={e.id}>
                        <TableCell>{format(new Date(e.data_encaminhamento), "dd/MM/yyyy HH:mm")}</TableCell>
                        <TableCell>{e.tipo_encaminhamento}</TableCell>
                        <TableCell>{e.destino || "-"}</TableCell>
                        <TableCell>
                          <StatusBadge status={mapStatusToType(e.status)} label={e.status} />
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

        {/* Relatórios Tab */}
        <TabsContent value="relatorios" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Atendimentos por Tipo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {tiposAtendimento.map(tipo => {
                    const count = atendimentos.filter(a => a.tipo_atendimento === tipo.value).length;
                    const percent = stats.total > 0 ? ((count / stats.total) * 100).toFixed(1) : 0;
                    return (
                      <div key={tipo.value} className="flex justify-between items-center">
                        <span className="text-sm">{tipo.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{count}</span>
                          <span className="text-xs text-muted-foreground">({percent}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Encaminhamentos por Tipo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {tiposEncaminhamento.map(tipo => {
                    const count = encaminhamentos.filter(e => e.tipo_encaminhamento === tipo.value).length;
                    return (
                      <div key={tipo.value} className="flex justify-between items-center">
                        <span className="text-sm">{tipo.label}</span>
                        <span className="text-sm font-medium">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog: Novo Paciente */}
      <Dialog open={pacienteDialog} onOpenChange={setPacienteDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Cadastrar Paciente</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Nome Completo *</Label>
              <Input value={pacienteForm.nome_completo} onChange={e => setPacienteForm({...pacienteForm, nome_completo: e.target.value})} />
            </div>
            <div>
              <Label>Nº Prontuário</Label>
              <Input value={pacienteForm.numero_prontuario} onChange={e => setPacienteForm({...pacienteForm, numero_prontuario: e.target.value})} />
            </div>
            <div>
              <Label>CPF</Label>
              <Input value={pacienteForm.cpf} onChange={e => setPacienteForm({...pacienteForm, cpf: e.target.value})} />
            </div>
            <div>
              <Label>CNS</Label>
              <Input value={pacienteForm.cns} onChange={e => setPacienteForm({...pacienteForm, cns: e.target.value})} />
            </div>
            <div>
              <Label>Data de Nascimento</Label>
              <Input type="date" value={pacienteForm.data_nascimento} onChange={e => setPacienteForm({...pacienteForm, data_nascimento: e.target.value})} />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={pacienteForm.telefone} onChange={e => setPacienteForm({...pacienteForm, telefone: e.target.value})} />
            </div>
            <div>
              <Label>Setor de Atendimento *</Label>
              <Select value={pacienteForm.setor_atendimento} onValueChange={v => setPacienteForm({...pacienteForm, setor_atendimento: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {setoresAtendimento.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Endereço</Label>
              <Input value={pacienteForm.endereco} onChange={e => setPacienteForm({...pacienteForm, endereco: e.target.value})} />
            </div>
            <div className="col-span-2">
              <Label>Observações</Label>
              <Textarea value={pacienteForm.observacoes} onChange={e => setPacienteForm({...pacienteForm, observacoes: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPacienteDialog(false)}>Cancelar</Button>
            <Button onClick={handleCreatePaciente} disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Novo Atendimento */}
      <Dialog open={atendimentoDialog} onOpenChange={setAtendimentoDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Registrar Atendimento</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label>Paciente *</Label>
              <Select value={atendimentoForm.paciente_id} onValueChange={v => setAtendimentoForm({...atendimentoForm, paciente_id: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o paciente..." />
                </SelectTrigger>
                <SelectContent>
                  {pacientes.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome_completo} {p.numero_prontuario ? `(${p.numero_prontuario})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo de Atendimento *</Label>
                <Select value={atendimentoForm.tipo_atendimento} onValueChange={v => setAtendimentoForm({...atendimentoForm, tipo_atendimento: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposAtendimento.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={atendimentoForm.status} onValueChange={v => setAtendimentoForm({...atendimentoForm, status: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusAtendimento.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Motivo do Atendimento *</Label>
              <Input value={atendimentoForm.motivo} onChange={e => setAtendimentoForm({...atendimentoForm, motivo: e.target.value})} />
            </div>
            <div>
              <Label>Descrição do Atendimento *</Label>
              <Textarea rows={4} value={atendimentoForm.descricao} onChange={e => setAtendimentoForm({...atendimentoForm, descricao: e.target.value})} />
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea value={atendimentoForm.observacoes} onChange={e => setAtendimentoForm({...atendimentoForm, observacoes: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAtendimentoDialog(false)}>Cancelar</Button>
            <Button onClick={handleCreateAtendimento} disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Novo Encaminhamento */}
      <Dialog open={encaminhamentoDialog} onOpenChange={setEncaminhamentoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Encaminhamento</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label>Tipo de Encaminhamento *</Label>
              <Select value={encaminhamentoForm.tipo_encaminhamento} onValueChange={v => setEncaminhamentoForm({...encaminhamentoForm, tipo_encaminhamento: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {tiposEncaminhamento.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Destino</Label>
              <Input value={encaminhamentoForm.destino} onChange={e => setEncaminhamentoForm({...encaminhamentoForm, destino: e.target.value})} placeholder="Nome da instituição/família" />
            </div>
            <div>
              <Label>Motivo *</Label>
              <Textarea value={encaminhamentoForm.motivo} onChange={e => setEncaminhamentoForm({...encaminhamentoForm, motivo: e.target.value})} />
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea value={encaminhamentoForm.observacoes} onChange={e => setEncaminhamentoForm({...encaminhamentoForm, observacoes: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEncaminhamentoDialog(false)}>Cancelar</Button>
            <Button onClick={handleCreateEncaminhamento} disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Detalhes do Atendimento */}
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
                  <p className="font-medium">{selectedAtendimento.paciente?.nome_completo}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Prontuário</Label>
                  <p>{selectedAtendimento.paciente?.numero_prontuario || "-"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Tipo de Atendimento</Label>
                  <p>{tiposAtendimento.find(t => t.value === selectedAtendimento.tipo_atendimento)?.label}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <Select value={selectedAtendimento.status} onValueChange={v => handleUpdateStatus(selectedAtendimento.id, v)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusAtendimento.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
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
                <Label className="text-muted-foreground">Descrição</Label>
                <p className="whitespace-pre-wrap">{selectedAtendimento.descricao}</p>
              </div>
              {selectedAtendimento.observacoes && (
                <div>
                  <Label className="text-muted-foreground">Observações</Label>
                  <p className="whitespace-pre-wrap">{selectedAtendimento.observacoes}</p>
                </div>
              )}

              {/* Encaminhamentos deste atendimento */}
              <div>
                <Label className="text-muted-foreground">Encaminhamentos</Label>
                {encaminhamentos.filter(e => e.atendimento_id === selectedAtendimento.id).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum encaminhamento registrado</p>
                ) : (
                  <div className="space-y-2 mt-2">
                    {encaminhamentos.filter(e => e.atendimento_id === selectedAtendimento.id).map(e => (
                      <div key={e.id} className="border rounded p-2 text-sm">
                        <div className="flex justify-between">
                          <span className="font-medium">{e.tipo_encaminhamento}</span>
                          <StatusBadge status={mapStatusToType(e.status)} label={e.status} showIcon={false} />
                        </div>
                        <p className="text-muted-foreground">{e.destino}</p>
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
              setEncaminhamentoDialog(true);
            }}>
              <Send className="h-4 w-4 mr-2" />
              Novo Encaminhamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
