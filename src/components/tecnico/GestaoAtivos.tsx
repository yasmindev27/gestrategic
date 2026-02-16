import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useSetoresNomes } from "@/hooks/useSetores";
import { SearchInput } from "@/components/ui/search-input";
import { StatCard } from "@/components/ui/stat-card";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Plus, Monitor, AlertTriangle, CheckCircle, Wrench, Package, ShieldAlert, Archive, Ban,
} from "lucide-react";

interface GestaoAtivosProps {
  setor: string;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  operacional: { label: "Em Uso", className: "bg-emerald-500/15 text-emerald-700 border-emerald-300" },
  reserva: { label: "Reserva (Backup)", className: "bg-blue-500/15 text-blue-700 border-blue-300" },
  em_manutencao: { label: "Em Manutenção", className: "bg-amber-500/15 text-amber-700 border-amber-300" },
  inoperante: { label: "Inoperante", className: "bg-red-500/15 text-red-700 border-red-300" },
  desativado: { label: "Desativado", className: "bg-muted text-muted-foreground" },
  bloqueado_engenharia: { label: "BLOQUEADO - ENGENHARIA", className: "bg-red-600/20 text-red-600 border-red-500 font-bold" },
};

const CRITICIDADE_CONFIG: Record<string, { label: string; className: string }> = {
  critica: { label: "Crítica", className: "bg-red-500/15 text-red-700 border-red-300" },
  alta: { label: "Alta", className: "bg-orange-500/15 text-orange-700 border-orange-300" },
  media: { label: "Média", className: "bg-yellow-500/15 text-yellow-700 border-yellow-300" },
  baixa: { label: "Baixa", className: "bg-blue-500/15 text-blue-700 border-blue-300" },
};

const CATEGORIAS = [
  "Equipamento Médico", "Equipamento de TI", "Infraestrutura",
  "Climatização", "Elétrico", "Hidráulico", "Mobiliário", "Outro",
];

export function GestaoAtivos({ setor }: GestaoAtivosProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: setores = [] } = useSetoresNomes();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tecnoDialogOpen, setTecnoDialogOpen] = useState(false);
  const [tecnoAtivoId, setTecnoAtivoId] = useState<string | null>(null);
  const [tecnoForm, setTecnoForm] = useState({ relatorio_risco: "", impacto_paciente: "nao" });
  const [formData, setFormData] = useState({
    nome: "", descricao: "", numero_patrimonio: "", numero_serie: "",
    fabricante: "", modelo: "", categoria: "Outro",
    setor_localizacao: "", data_aquisicao: "", data_garantia_fim: "",
    vida_util_meses: "", valor_aquisicao: "", criticidade: "media",
    observacoes: "",
    // Campos ONA obrigatórios para Eng. Clínica
    periodicidade_preventiva: "",
    data_ultima_calibracao: "",
  });

  const isEngClin = setor === "engenharia_clinica";

  const { data: ativos = [], isLoading } = useQuery({
    queryKey: ["ativos", setor],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ativos")
        .select("*")
        .eq("setor_responsavel", setor)
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  // Check calibrações vencidas to auto-block
  const { data: calibracoesVencidas = [] } = useQuery({
    queryKey: ["calibracoes_vencidas_ativos", setor],
    queryFn: async () => {
      if (!isEngClin) return [];
      const { data, error } = await supabase
        .from("manutencoes_preventivas")
        .select("ativo_id, data_vencimento_calibracao, ativos(nome)")
        .eq("setor", setor)
        .eq("requer_calibracao", true)
        .not("data_vencimento_calibracao", "is", null)
        .lt("data_vencimento_calibracao", new Date().toISOString().split("T")[0]);
      if (error) throw error;
      return data || [];
    },
    enabled: isEngClin,
  });

  const ativosComCalibVencida = new Set(calibracoesVencidas.map((c: any) => c.ativo_id));

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase.from("ativos").insert({
        nome: data.nome,
        descricao: data.descricao || null,
        numero_patrimonio: data.numero_patrimonio || null,
        numero_serie: data.numero_serie || null,
        fabricante: data.fabricante || null,
        modelo: data.modelo || null,
        categoria: data.categoria,
        setor_responsavel: setor,
        setor_localizacao: data.setor_localizacao || null,
        data_aquisicao: data.data_aquisicao || null,
        data_garantia_fim: data.data_garantia_fim || null,
        vida_util_meses: data.vida_util_meses ? parseInt(data.vida_util_meses) : null,
        valor_aquisicao: data.valor_aquisicao ? parseFloat(data.valor_aquisicao) : null,
        criticidade: data.criticidade,
        observacoes: data.observacoes || null,
        created_by: user.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ativos", setor] });
      toast({ title: "Ativo cadastrado com sucesso!" });
      setDialogOpen(false);
      resetForm();
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("ativos").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ativos", setor] });
      toast({ title: "Status atualizado!" });
    },
  });

  // Tecnovigilância: report when equipment retired for recurring failure
  const tecnoMutation = useMutation({
    mutationFn: async () => {
      if (!tecnoAtivoId) return;
      const ativo = ativos.find(a => a.id === tecnoAtivoId);
      const { data: user } = await supabase.auth.getUser();
      // Create incident report
      await supabase.from("gerencia_planos_acao").insert({
        titulo: `Tecnovigilância: ${ativo?.nome || "Equipamento"} - Quebra Recorrente`,
        descricao: `Relatório de risco ONA:\n\n${tecnoForm.relatorio_risco}\n\nImpacto ao paciente: ${tecnoForm.impacto_paciente === "sim" ? "SIM" : "NÃO"}`,
        setor,
        responsavel_nome: user.user?.user_metadata?.full_name || user.user?.email || "",
        prioridade: tecnoForm.impacto_paciente === "sim" ? "critica" : "alta",
        prazo: new Date(Date.now() + 3 * 86400000).toISOString(),
        created_by: user.user?.id,
        ultima_atualizacao_por: user.user?.user_metadata?.full_name || "",
        ultima_atualizacao_em: new Date().toISOString(),
      });
      // Update status
      await supabase.from("ativos").update({ status: "inoperante" }).eq("id", tecnoAtivoId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ativos", setor] });
      queryClient.invalidateQueries({ queryKey: ["gerencia_planos_acao"] });
      toast({ title: "Relatório de tecnovigilância registrado e encaminhado à Gerência" });
      setTecnoDialogOpen(false);
      setTecnoForm({ relatorio_risco: "", impacto_paciente: "nao" });
    },
    onError: () => toast({ title: "Erro ao registrar relatório", variant: "destructive" }),
  });

  const handleStatusChange = (id: string, newStatus: string) => {
    // If the asset has expired calibration and trying to set to operational, block it
    if (isEngClin && ativosComCalibVencida.has(id) && newStatus === "operacional") {
      toast({
        title: "⚠️ Bloqueio ONA",
        description: "Este equipamento possui calibração vencida e não pode ser colocado em uso. Realize a calibração primeiro.",
        variant: "destructive",
      });
      return;
    }

    // If changing to "inoperante" due to recurring failure, require tecnovigilância report
    if (isEngClin && newStatus === "inoperante") {
      setTecnoAtivoId(id);
      setTecnoForm({ relatorio_risco: "", impacto_paciente: "nao" });
      setTecnoDialogOpen(true);
      return;
    }

    updateStatusMutation.mutate({ id, status: newStatus });
  };

  const resetForm = () => setFormData({
    nome: "", descricao: "", numero_patrimonio: "", numero_serie: "",
    fabricante: "", modelo: "", categoria: "Outro",
    setor_localizacao: "", data_aquisicao: "", data_garantia_fim: "",
    vida_util_meses: "", valor_aquisicao: "", criticidade: "media",
    observacoes: "", periodicidade_preventiva: "", data_ultima_calibracao: "",
  });

  const handleSave = () => {
    if (!formData.nome) {
      toast({ title: "Erro", description: "Nome é obrigatório", variant: "destructive" });
      return;
    }
    // *** TRAVA 1: Bloqueio de Ativo Incompleto (Eng. Clínica) ***
    if (isEngClin && (!formData.periodicidade_preventiva || !formData.data_ultima_calibracao)) {
      toast({
        title: "⚠️ Erro ONA",
        description: "Equipamentos sem plano de manutenção não podem ser integrados ao parque tecnológico. Preencha 'Periodicidade de Preventiva' e 'Data da Última Calibração'.",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate(formData);
  };

  const filtered = ativos.filter(a => {
    if (filterStatus !== "todos" && a.status !== filterStatus) return false;
    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      return a.nome.toLowerCase().includes(t) ||
        (a.numero_patrimonio?.toLowerCase() || "").includes(t) ||
        (a.fabricante?.toLowerCase() || "").includes(t);
    }
    return true;
  });

  const stats = {
    total: ativos.length,
    emUso: ativos.filter(a => a.status === "operacional").length,
    reserva: ativos.filter(a => a.status === "reserva").length,
    manutencao: ativos.filter(a => a.status === "em_manutencao").length,
    inoperantes: ativos.filter(a => a.status === "inoperante").length,
    bloqueados: ativos.filter(a => a.status === "bloqueado_engenharia").length,
  };

  // Alert: critical items with zero backup
  const criticosGrouped = new Map<string, { emUso: number; reserva: number }>();
  ativos.filter(a => a.criticidade === "critica").forEach(a => {
    const key = a.categoria || a.nome;
    const entry = criticosGrouped.get(key) || { emUso: 0, reserva: 0 };
    if (a.status === "operacional") entry.emUso++;
    if (a.status === "reserva") entry.reserva++;
    criticosGrouped.set(key, entry);
  });
  const alertasBackupZero = Array.from(criticosGrouped.entries())
    .filter(([_, v]) => v.emUso > 0 && v.reserva === 0)
    .map(([name]) => name);

  // Semáforo: ativos com calibração vencida
  const getEffectiveStatus = (ativo: any) => {
    if (isEngClin && ativosComCalibVencida.has(ativo.id)) return "bloqueado_engenharia";
    return ativo.status;
  };

  if (isLoading) return <LoadingState message="Carregando ativos..." />;

  return (
    <div className="space-y-4">
      {/* Alert: Risco de Parada Operacional */}
      {alertasBackupZero.length > 0 && (
        <Card className="border-destructive bg-destructive/10 ring-2 ring-destructive/30">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="p-3 rounded-full bg-destructive/20 animate-pulse">
              <ShieldAlert className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <p className="text-lg font-bold text-destructive">⚠ Risco de Parada Operacional</p>
              <p className="text-sm text-destructive/80 mb-2">
                Itens críticos sem equipamento de reserva (backup):
              </p>
              <div className="flex flex-wrap gap-2">
                {alertasBackupZero.map(name => (
                  <Badge key={name} variant="destructive" className="text-xs">{name}</Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alert: Calibrações vencidas - SEMÁFORO */}
      {isEngClin && calibracoesVencidas.length > 0 && (
        <Card className="border-red-600 bg-red-600/10 ring-2 ring-red-600/30">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="p-3 rounded-full bg-red-600/20">
              <Ban className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-red-600">🔴 Equipamentos BLOQUEADOS - Calibração Vencida</p>
              <p className="text-sm text-red-600/80 mb-2">
                Estes equipamentos não podem ser alocados a leitos (NIR/Enfermagem) até que a calibração seja regularizada.
              </p>
              <div className="flex flex-wrap gap-2">
                {calibracoesVencidas.map((c: any) => (
                  <Badge key={c.ativo_id} className="bg-red-600 text-white text-xs">
                    {c.ativos?.nome || "Equipamento"}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard title="Total de Ativos" value={stats.total} icon={Package} variant="primary" />
        <StatCard title="Em Uso" value={stats.emUso} icon={CheckCircle} variant="success" />
        <StatCard title="Reserva (Backup)" value={stats.reserva} icon={Archive} variant="primary" />
        <StatCard title="Em Manutenção" value={stats.manutencao} icon={Wrench} variant="warning" />
        <StatCard title="Inoperantes" value={stats.inoperantes} icon={AlertTriangle} variant="destructive" />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Buscar por nome, patrimônio..." />
          </div>
          <div className="w-[180px]">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Novo Ativo
          </Button>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <EmptyState icon={Monitor} title="Nenhum ativo encontrado" description="Cadastre ativos para começar" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Patrimônio</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Localização</TableHead>
                  <TableHead>Criticidade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((a) => {
                  const effectiveStatus = getEffectiveStatus(a);
                  return (
                    <TableRow key={a.id} className={effectiveStatus === "bloqueado_engenharia" ? "bg-red-600/5" : ""}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{a.nome}</p>
                          <p className="text-xs text-muted-foreground">{a.fabricante} {a.modelo}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{a.numero_patrimonio || "-"}</TableCell>
                      <TableCell>{a.categoria}</TableCell>
                      <TableCell>{a.setor_localizacao || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={CRITICIDADE_CONFIG[a.criticidade]?.className}>
                          {CRITICIDADE_CONFIG[a.criticidade]?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATUS_CONFIG[effectiveStatus]?.className || ""}>
                          {STATUS_CONFIG[effectiveStatus]?.label || a.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {effectiveStatus === "bloqueado_engenharia" ? (
                          <Badge variant="destructive" className="text-[10px]">Calibrar primeiro</Badge>
                        ) : (
                          <Select value={a.status} onValueChange={(s) => handleStatusChange(a.id, s)}>
                            <SelectTrigger className="w-[160px] h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(STATUS_CONFIG).filter(([k]) => k !== "bloqueado_engenharia").map(([k, v]) => (
                                <SelectItem key={k} value={k}>{v.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog Novo Ativo */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Ativo</DialogTitle>
            {isEngClin && (
              <DialogDescription className="text-amber-600 font-medium">
                ⚠️ ONA: Campos de periodicidade de preventiva e calibração são obrigatórios para Engenharia Clínica.
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Nome *</Label>
              <Input value={formData.nome} onChange={e => setFormData(p => ({ ...p, nome: e.target.value }))} />
            </div>
            <div>
              <Label>Nº Patrimônio</Label>
              <Input value={formData.numero_patrimonio} onChange={e => setFormData(p => ({ ...p, numero_patrimonio: e.target.value }))} />
            </div>
            <div>
              <Label>Nº Série</Label>
              <Input value={formData.numero_serie} onChange={e => setFormData(p => ({ ...p, numero_serie: e.target.value }))} />
            </div>
            <div>
              <Label>Fabricante</Label>
              <Input value={formData.fabricante} onChange={e => setFormData(p => ({ ...p, fabricante: e.target.value }))} />
            </div>
            <div>
              <Label>Modelo</Label>
              <Input value={formData.modelo} onChange={e => setFormData(p => ({ ...p, modelo: e.target.value }))} />
            </div>
            <div>
              <Label>Categoria</Label>
              <Select value={formData.categoria} onValueChange={v => setFormData(p => ({ ...p, categoria: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Localização</Label>
              <Select value={formData.setor_localizacao} onValueChange={v => setFormData(p => ({ ...p, setor_localizacao: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {setores.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Criticidade</Label>
              <Select value={formData.criticidade} onValueChange={v => setFormData(p => ({ ...p, criticidade: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CRITICIDADE_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data Aquisição</Label>
              <Input type="date" value={formData.data_aquisicao} onChange={e => setFormData(p => ({ ...p, data_aquisicao: e.target.value }))} />
            </div>
            <div>
              <Label>Garantia até</Label>
              <Input type="date" value={formData.data_garantia_fim} onChange={e => setFormData(p => ({ ...p, data_garantia_fim: e.target.value }))} />
            </div>

            {/* CAMPOS ONA OBRIGATÓRIOS PARA ENG. CLÍNICA */}
            {isEngClin && (
              <>
                <div>
                  <Label className="text-amber-600">Periodicidade Preventiva (dias) *</Label>
                  <Input type="number" value={formData.periodicidade_preventiva}
                    onChange={e => setFormData(p => ({ ...p, periodicidade_preventiva: e.target.value }))}
                    placeholder="Ex: 90, 180, 365"
                    className={!formData.periodicidade_preventiva ? "border-amber-500" : ""} />
                </div>
                <div>
                  <Label className="text-amber-600">Data Última Calibração *</Label>
                  <Input type="date" value={formData.data_ultima_calibracao}
                    onChange={e => setFormData(p => ({ ...p, data_ultima_calibracao: e.target.value }))}
                    className={!formData.data_ultima_calibracao ? "border-amber-500" : ""} />
                </div>
              </>
            )}

            <div>
              <Label>Vida útil (meses)</Label>
              <Input type="number" value={formData.vida_util_meses} onChange={e => setFormData(p => ({ ...p, vida_util_meses: e.target.value }))} />
            </div>
            <div>
              <Label>Valor Aquisição (R$)</Label>
              <Input type="number" step="0.01" value={formData.valor_aquisicao} onChange={e => setFormData(p => ({ ...p, valor_aquisicao: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <Label>Descrição</Label>
              <Textarea value={formData.descricao} onChange={e => setFormData(p => ({ ...p, descricao: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending}>
              Cadastrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Tecnovigilância - Retirada por quebra recorrente */}
      <Dialog open={tecnoDialogOpen} onOpenChange={setTecnoDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" /> Relatório de Tecnovigilância (ONA)
            </DialogTitle>
            <DialogDescription>
              Equipamento sendo retirado de uso. Preencha o relatório de risco obrigatório.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-red-600">Relatório de Risco / Justificativa *</Label>
              <Textarea
                value={tecnoForm.relatorio_risco}
                onChange={e => setTecnoForm(p => ({ ...p, relatorio_risco: e.target.value }))}
                placeholder="Descreva o histórico de falhas, motivo da retirada e análise de risco..."
                rows={5}
              />
              {tecnoForm.relatorio_risco.length > 0 && tecnoForm.relatorio_risco.length < 50 && (
                <p className="text-xs text-amber-600 mt-1">Mínimo 50 caracteres ({tecnoForm.relatorio_risco.length}/50)</p>
              )}
            </div>
            <div>
              <Label>Houve impacto ao paciente? *</Label>
              <Select value={tecnoForm.impacto_paciente} onValueChange={v => setTecnoForm(p => ({ ...p, impacto_paciente: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nao">Não</SelectItem>
                  <SelectItem value="sim">Sim - Requer notificação ANVISA</SelectItem>
                  <SelectItem value="potencial">Potencial - Quase evento</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTecnoDialogOpen(false)}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={tecnoForm.relatorio_risco.length < 50 || tecnoMutation.isPending}
              onClick={() => tecnoMutation.mutate()}
            >
              {tecnoMutation.isPending ? "Registrando..." : "Registrar e Retirar de Uso"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}