import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { StatCard } from "@/components/ui/stat-card";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Plus, CalendarClock, AlertTriangle, CheckCircle, Clock, Wrench, Play, FlaskConical, ShieldAlert,
} from "lucide-react";
import { format, isPast, differenceInDays, addDays } from "date-fns";

interface PreventivasManagerProps {
  setor: string;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  agendada: { label: "Agendada", className: "bg-blue-500/15 text-blue-700 border-blue-300" },
  em_andamento: { label: "Em andamento", className: "bg-amber-500/15 text-amber-700 border-amber-300" },
  concluida: { label: "Concluída", className: "bg-emerald-500/15 text-emerald-700 border-emerald-300" },
  atrasada: { label: "Atrasada", className: "bg-red-500/15 text-red-700 border-red-300" },
};

export function PreventivasManager({ setor }: PreventivasManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [execDialogOpen, setExecDialogOpen] = useState(false);
  const [selectedPrev, setSelectedPrev] = useState<any>(null);
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("todas");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        supabase.from("profiles").select("full_name").eq("user_id", data.user.id).single()
          .then(({ data: p }) => { if (p) setUserName(p.full_name); });
      }
    });
  }, []);

  const [formData, setFormData] = useState({
    ativo_id: "", titulo: "", descricao: "", periodicidade_dias: "30",
    proxima_execucao: "", responsavel_nome: "", prioridade: "media",
    custo_estimado: "", observacoes: "",
    tipo_manutencao: "preventiva", requer_calibracao: false,
    data_vencimento_calibracao: "",
  });

  const [execForm, setExecForm] = useState({
    descricao: "", data_execucao: format(new Date(), "yyyy-MM-dd"),
    tempo_parada_horas: "0", custo_real: "", pecas_utilizadas: "",
    resultado: "concluida", observacoes: "",
  });

  const { data: ativos = [] } = useQuery({
    queryKey: ["ativos", setor],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ativos").select("id, nome").eq("setor_responsavel", setor).order("nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: preventivas = [], isLoading } = useQuery({
    queryKey: ["preventivas", setor],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("manutencoes_preventivas")
        .select("*, ativos(nome)")
        .eq("setor", setor)
        .order("proxima_execucao");
      if (error) throw error;
      return data;
    },
  });

  const { data: execucoes = [] } = useQuery({
    queryKey: ["execucoes", setor],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("manutencoes_execucoes")
        .select("*, ativos(nome)")
        .eq("setor", setor)
        .order("data_execucao", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("manutencoes_preventivas").insert({
        ativo_id: data.ativo_id,
        titulo: data.titulo,
        descricao: data.descricao || null,
        periodicidade_dias: parseInt(data.periodicidade_dias),
        proxima_execucao: data.proxima_execucao,
        responsavel_nome: data.responsavel_nome,
        prioridade: data.prioridade,
        custo_estimado: data.custo_estimado ? parseFloat(data.custo_estimado) : null,
        observacoes: data.observacoes || null,
        setor,
        tipo_manutencao: data.tipo_manutencao,
        requer_calibracao: data.requer_calibracao,
        data_vencimento_calibracao: data.data_vencimento_calibracao || null,
        created_by: userId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preventivas", setor] });
      toast({ title: "Preventiva agendada!" });
      setDialogOpen(false);
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const executeMutation = useMutation({
    mutationFn: async (data: typeof execForm) => {
      if (!selectedPrev) return;
      const { error: execError } = await supabase.from("manutencoes_execucoes").insert({
        preventiva_id: selectedPrev.id,
        ativo_id: selectedPrev.ativo_id,
        tipo: selectedPrev.tipo_manutencao || "preventiva",
        descricao: data.descricao,
        data_execucao: data.data_execucao,
        executado_por: userId,
        executado_por_nome: userName,
        tempo_parada_horas: parseFloat(data.tempo_parada_horas) || 0,
        custo_real: data.custo_real ? parseFloat(data.custo_real) : null,
        pecas_utilizadas: data.pecas_utilizadas || null,
        resultado: data.resultado,
        observacoes: data.observacoes || null,
        setor,
      });
      if (execError) throw execError;

      const nextDate = format(
        addDays(new Date(data.data_execucao), selectedPrev.periodicidade_dias),
        "yyyy-MM-dd"
      );
      const updateData: any = {
        ultima_execucao: data.data_execucao,
        proxima_execucao: nextDate,
        status: "agendada",
      };
      if (selectedPrev.requer_calibracao) {
        updateData.data_vencimento_calibracao = nextDate;
      }
      const { error: updateError } = await supabase.from("manutencoes_preventivas").update(updateData).eq("id", selectedPrev.id);
      if (updateError) throw updateError;

      // Auto-create plano de ação for overdue calibrations that were just executed
      if (selectedPrev.isOverdue && selectedPrev.requer_calibracao) {
        await supabase.from("gerencia_planos_acao").insert({
          titulo: `Calibração atrasada executada: ${selectedPrev.ativos?.nome || selectedPrev.titulo}`,
          descricao: `Calibração do equipamento ${selectedPrev.ativos?.nome || ""} foi realizada com atraso de ${Math.abs(selectedPrev.daysRemaining)} dias. Verificar impacto operacional.`,
          setor,
          responsavel_nome: userName,
          prioridade: "alta",
          prazo: new Date(Date.now() + 7 * 86400000).toISOString(),
          created_by: userId,
          ultima_atualizacao_por: userName,
          ultima_atualizacao_em: new Date().toISOString(),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preventivas", setor] });
      queryClient.invalidateQueries({ queryKey: ["execucoes", setor] });
      queryClient.invalidateQueries({ queryKey: ["gerencia_planos_acao"] });
      toast({ title: "Manutenção registrada!" });
      setExecDialogOpen(false);
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const enriched = preventivas.map((p: any) => {
    const isOverdue = p.status !== "concluida" && isPast(new Date(p.proxima_execucao));
    const days = differenceInDays(new Date(p.proxima_execucao), new Date());
    const calibracaoVencida = p.requer_calibracao && p.data_vencimento_calibracao && isPast(new Date(p.data_vencimento_calibracao));
    return { ...p, isOverdue, daysRemaining: days, effectiveStatus: isOverdue ? "atrasada" : p.status, calibracaoVencida };
  });

  const calibracoes = enriched.filter((p: any) => p.requer_calibracao);
  const calibracoesVencidas = calibracoes.filter((p: any) => p.calibracaoVencida);

  const listToShow = activeTab === "calibracoes" ? calibracoes : enriched;

  const stats = {
    total: enriched.length,
    atrasadas: enriched.filter((p: any) => p.isOverdue).length,
    proximas7d: enriched.filter((p: any) => !p.isOverdue && p.daysRemaining <= 7 && p.daysRemaining >= 0).length,
    executadas: execucoes.length,
    calibracoesVencidas: calibracoesVencidas.length,
  };

  // Auto-create planos de ação for overdue calibrations
  useEffect(() => {
    if (calibracoesVencidas.length === 0) return;
    calibracoesVencidas.forEach(async (c: any) => {
      // Check if a plano already exists
      const { data: existing } = await supabase
        .from("gerencia_planos_acao")
        .select("id")
        .ilike("titulo", `%Calibração vencida%${c.ativos?.nome || c.titulo}%`)
        .eq("status", "pendente")
        .limit(1);
      if (existing && existing.length > 0) return;

      await supabase.from("gerencia_planos_acao").insert({
        titulo: `Calibração vencida: ${c.ativos?.nome || c.titulo}`,
        descricao: `A calibração do equipamento "${c.ativos?.nome || ""}" (${c.titulo}) venceu em ${format(new Date(c.data_vencimento_calibracao + "T00:00:00"), "dd/MM/yyyy")}. Ação corretiva necessária.`,
        setor,
        responsavel_nome: c.responsavel_nome,
        prioridade: "critica",
        prazo: new Date().toISOString(),
        ultima_atualizacao_por: "Sistema",
        ultima_atualizacao_em: new Date().toISOString(),
      });
    });
  }, [calibracoesVencidas.length]);

  if (isLoading) return <LoadingState message="Carregando preventivas..." />;

  return (
    <div className="space-y-4">
      {/* Alert calibrações vencidas */}
      {stats.calibracoesVencidas > 0 && (
        <Card className="border-destructive bg-destructive/10 ring-2 ring-destructive/30">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="p-3 rounded-full bg-destructive/20 animate-pulse">
              <ShieldAlert className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <p className="text-lg font-bold text-destructive">⚠ {stats.calibracoesVencidas} Calibração{stats.calibracoesVencidas > 1 ? "ões" : ""} Vencida{stats.calibracoesVencidas > 1 ? "s" : ""}</p>
              <p className="text-sm text-destructive/80 mb-2">
                Compliance comprometido — Plano de Ação automático criado para a Gerência
              </p>
              <div className="flex flex-wrap gap-2">
                {calibracoesVencidas.map((c: any) => (
                  <Badge key={c.id} variant="destructive" className="text-xs">
                    {c.ativos?.nome || c.titulo}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alert atrasadas */}
      {stats.atrasadas > 0 && stats.calibracoesVencidas === 0 && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <div>
              <p className="font-bold text-destructive">{stats.atrasadas} Preventiva{stats.atrasadas > 1 ? "s" : ""} Atrasada{stats.atrasadas > 1 ? "s" : ""}</p>
              <p className="text-sm text-muted-foreground">Manutenções pendentes requerem atenção imediata</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard title="Preventivas" value={stats.total} icon={CalendarClock} variant="primary" />
        <StatCard title="Atrasadas" value={stats.atrasadas} icon={AlertTriangle} variant="destructive" />
        <StatCard title="Próx. 7 dias" value={stats.proximas7d} icon={Clock} variant="warning" />
        <StatCard title="Calibrações" value={calibracoes.length} icon={FlaskConical} variant="primary" />
        <StatCard title="Executadas (mês)" value={stats.executadas} icon={CheckCircle} variant="success" />
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="todas">Todas</TabsTrigger>
            <TabsTrigger value="calibracoes" className="flex items-center gap-1">
              <FlaskConical className="h-3 w-3" /> Calibrações
              {stats.calibracoesVencidas > 0 && (
                <Badge variant="destructive" className="ml-1 text-[10px] px-1 py-0">{stats.calibracoesVencidas}</Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Nova Preventiva
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {listToShow.length === 0 ? (
            <EmptyState icon={Wrench} title="Nenhuma preventiva" description="Agende manutenções preventivas" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ativo</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Periodicidade</TableHead>
                  <TableHead>Próxima</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listToShow.map((p: any) => (
                  <TableRow key={p.id} className={p.calibracaoVencida ? "bg-destructive/10" : p.isOverdue ? "bg-destructive/5" : ""}>
                    <TableCell className="font-medium">
                      {p.ativos?.nome || "-"}
                      {p.calibracaoVencida && (
                        <Badge variant="destructive" className="ml-2 text-[10px]">CALIBRAÇÃO VENCIDA</Badge>
                      )}
                    </TableCell>
                    <TableCell>{p.titulo}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={p.requer_calibracao ? "bg-purple-500/15 text-purple-700 border-purple-300" : ""}>
                        {p.requer_calibracao ? "Calibração" : p.tipo_manutencao === "corretiva" ? "Corretiva" : "Preventiva"}
                      </Badge>
                    </TableCell>
                    <TableCell>{p.periodicidade_dias} dias</TableCell>
                    <TableCell>
                      <span className={p.isOverdue ? "text-destructive font-semibold" : ""}>
                        {format(new Date(p.proxima_execucao + "T00:00:00"), "dd/MM/yyyy")}
                      </span>
                      {p.daysRemaining <= 7 && !p.isOverdue && (
                        <Badge variant="outline" className="ml-2 text-xs bg-amber-500/15 text-amber-700">
                          {p.daysRemaining}d
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{p.responsavel_nome}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_CONFIG[p.effectiveStatus]?.className}>
                        {STATUS_CONFIG[p.effectiveStatus]?.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => {
                        setSelectedPrev(p);
                        setExecForm({
                          descricao: p.titulo, data_execucao: format(new Date(), "yyyy-MM-dd"),
                          tempo_parada_horas: "0", custo_real: "", pecas_utilizadas: "",
                          resultado: "concluida", observacoes: "",
                        });
                        setExecDialogOpen(true);
                      }}>
                        <Play className="h-3 w-3 mr-1" /> Executar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Últimas Execuções */}
      {execucoes.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Últimas Execuções</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Ativo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Executado por</TableHead>
                  <TableHead>Tempo parada</TableHead>
                  <TableHead>Resultado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {execucoes.map((e: any) => (
                  <TableRow key={e.id}>
                    <TableCell>{format(new Date(e.data_execucao + "T00:00:00"), "dd/MM/yyyy")}</TableCell>
                    <TableCell>{e.ativos?.nome || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {e.tipo === "calibracao" ? "Calibração" : e.tipo === "corretiva" ? "Corretiva" : "Preventiva"}
                      </Badge>
                    </TableCell>
                    <TableCell>{e.executado_por_nome}</TableCell>
                    <TableCell>{e.tempo_parada_horas}h</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={e.resultado === "concluida" ? "bg-emerald-500/15 text-emerald-700" : "bg-amber-500/15 text-amber-700"}>
                        {e.resultado === "concluida" ? "Concluída" : e.resultado}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Dialog Nova Preventiva */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Agendar Manutenção Preventiva / Calibração</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Ativo *</Label>
              <Select value={formData.ativo_id} onValueChange={v => setFormData(p => ({ ...p, ativo_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione o ativo" /></SelectTrigger>
                <SelectContent>
                  {ativos.map(a => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Título *</Label>
              <Input value={formData.titulo} onChange={e => setFormData(p => ({ ...p, titulo: e.target.value }))} />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={formData.tipo_manutencao} onValueChange={v => setFormData(p => ({ ...p, tipo_manutencao: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="preventiva">Preventiva</SelectItem>
                  <SelectItem value="calibracao">Calibração</SelectItem>
                  <SelectItem value="corretiva">Corretiva</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2 pb-1">
              <Checkbox
                id="requer_calibracao"
                checked={formData.requer_calibracao || formData.tipo_manutencao === "calibracao"}
                onCheckedChange={v => setFormData(p => ({ ...p, requer_calibracao: !!v }))}
              />
              <Label htmlFor="requer_calibracao" className="text-sm">Requer Calibração</Label>
            </div>
            <div>
              <Label>Periodicidade (dias)</Label>
              <Input type="number" value={formData.periodicidade_dias} onChange={e => setFormData(p => ({ ...p, periodicidade_dias: e.target.value }))} />
            </div>
            <div>
              <Label>Próxima Execução *</Label>
              <Input type="date" value={formData.proxima_execucao} onChange={e => setFormData(p => ({ ...p, proxima_execucao: e.target.value }))} />
            </div>
            {(formData.requer_calibracao || formData.tipo_manutencao === "calibracao") && (
              <div className="col-span-2">
                <Label>Vencimento da Calibração</Label>
                <Input type="date" value={formData.data_vencimento_calibracao} onChange={e => setFormData(p => ({ ...p, data_vencimento_calibracao: e.target.value }))} />
              </div>
            )}
            <div>
              <Label>Responsável *</Label>
              <Input value={formData.responsavel_nome} onChange={e => setFormData(p => ({ ...p, responsavel_nome: e.target.value }))} />
            </div>
            <div>
              <Label>Prioridade</Label>
              <Select value={formData.prioridade} onValueChange={v => setFormData(p => ({ ...p, prioridade: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="critica">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Descrição</Label>
              <Textarea value={formData.descricao} onChange={e => setFormData(p => ({ ...p, descricao: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => {
              if (!formData.ativo_id || !formData.titulo || !formData.proxima_execucao || !formData.responsavel_nome) {
                toast({ title: "Erro", description: "Preencha os campos obrigatórios", variant: "destructive" }); return;
              }
              createMutation.mutate(formData);
            }} disabled={createMutation.isPending}>Agendar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Executar */}
      <Dialog open={execDialogOpen} onOpenChange={setExecDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Registrar Execução de Manutenção</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Descrição / Ação Realizada *</Label>
              <Textarea value={execForm.descricao} onChange={e => setExecForm(p => ({ ...p, descricao: e.target.value }))} 
                placeholder="Descreva detalhadamente a ação realizada (mínimo 30 caracteres)..." />
              {execForm.descricao.length > 0 && execForm.descricao.length < 30 && (
                <p className="text-xs text-amber-600 mt-1">Mínimo 30 caracteres ({execForm.descricao.length}/30)</p>
              )}
            </div>
            {/* Causa da Falha - obrigatório para corretivas */}
            {selectedPrev?.tipo_manutencao === "corretiva" && (
              <div className="col-span-2">
                <Label className="text-amber-600">Causa da Falha * (Corretiva)</Label>
                <Textarea value={execForm.observacoes} onChange={e => setExecForm(p => ({ ...p, observacoes: e.target.value }))}
                  placeholder="Descreva a causa raiz da falha (mínimo 30 caracteres)..." />
                {(execForm.observacoes || "").length > 0 && (execForm.observacoes || "").length < 30 && (
                  <p className="text-xs text-amber-600 mt-1">Mínimo 30 caracteres ({(execForm.observacoes || "").length}/30)</p>
                )}
              </div>
            )}
            <div>
              <Label>Data Execução</Label>
              <Input type="date" value={execForm.data_execucao} onChange={e => setExecForm(p => ({ ...p, data_execucao: e.target.value }))} />
            </div>
            <div>
              <Label>Tempo Parada (horas)</Label>
              <Input type="number" step="0.5" value={execForm.tempo_parada_horas} onChange={e => setExecForm(p => ({ ...p, tempo_parada_horas: e.target.value }))} />
            </div>
            <div>
              <Label>Custo Real (R$)</Label>
              <Input type="number" step="0.01" value={execForm.custo_real} onChange={e => setExecForm(p => ({ ...p, custo_real: e.target.value }))} />
            </div>
            <div>
              <Label>Resultado</Label>
              <Select value={execForm.resultado} onValueChange={v => setExecForm(p => ({ ...p, resultado: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="concluida">Concluída</SelectItem>
                  <SelectItem value="parcial">Parcial</SelectItem>
                  <SelectItem value="reprogramada">Reprogramada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Peças Utilizadas</Label>
              <Input value={execForm.pecas_utilizadas} onChange={e => setExecForm(p => ({ ...p, pecas_utilizadas: e.target.value }))} />
            </div>
            {selectedPrev?.tipo_manutencao !== "corretiva" && (
              <div className="col-span-2">
                <Label>Observações</Label>
                <Textarea value={execForm.observacoes} onChange={e => setExecForm(p => ({ ...p, observacoes: e.target.value }))} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExecDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => {
              // *** TRAVA 3: Validação de OS ***
              if (execForm.descricao.trim().length < 30) {
                toast({ title: "⚠️ Validação ONA", description: "O campo 'Ação Realizada' deve ter pelo menos 30 caracteres. Evite descrições genéricas como 'ok' ou 'feito'.", variant: "destructive" });
                return;
              }
              if (selectedPrev?.tipo_manutencao === "corretiva" && (!execForm.observacoes || execForm.observacoes.trim().length < 30)) {
                toast({ title: "⚠️ Validação ONA", description: "Para manutenções corretivas, o campo 'Causa da Falha' deve ter pelo menos 30 caracteres.", variant: "destructive" });
                return;
              }
              executeMutation.mutate(execForm);
            }} disabled={executeMutation.isPending}>Registrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
