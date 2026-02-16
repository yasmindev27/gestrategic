import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { StatCard } from "@/components/ui/stat-card";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Plus, CalendarClock, AlertTriangle, CheckCircle, Clock, Wrench, Play,
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

  // Load user name
  useState(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        supabase.from("profiles").select("full_name").eq("user_id", data.user.id).single()
          .then(({ data: p }) => { if (p) setUserName(p.full_name); });
      }
    });
  });

  const [formData, setFormData] = useState({
    ativo_id: "", titulo: "", descricao: "", periodicidade_dias: "30",
    proxima_execucao: "", responsavel_nome: "", prioridade: "media",
    custo_estimado: "", observacoes: "",
  });

  const [execForm, setExecForm] = useState({
    descricao: "", data_execucao: format(new Date(), "yyyy-MM-dd"),
    tempo_parada_horas: "0", custo_real: "", pecas_utilizadas: "",
    resultado: "concluida", observacoes: "",
  });

  // Query ativos for selector
  const { data: ativos = [] } = useQuery({
    queryKey: ["ativos", setor],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ativos").select("id, nome").eq("setor_responsavel", setor).order("nome");
      if (error) throw error;
      return data;
    },
  });

  // Query preventivas
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

  // Query últimas execuções
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
      const { data: user } = await supabase.auth.getUser();
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
        created_by: user.user?.id,
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
      const { data: user } = await supabase.auth.getUser();
      
      // Insert execution record
      const { error: execError } = await supabase.from("manutencoes_execucoes").insert({
        preventiva_id: selectedPrev.id,
        ativo_id: selectedPrev.ativo_id,
        tipo: "preventiva",
        descricao: data.descricao,
        data_execucao: data.data_execucao,
        executado_por: user.user?.id,
        executado_por_nome: userName,
        tempo_parada_horas: parseFloat(data.tempo_parada_horas) || 0,
        custo_real: data.custo_real ? parseFloat(data.custo_real) : null,
        pecas_utilizadas: data.pecas_utilizadas || null,
        resultado: data.resultado,
        observacoes: data.observacoes || null,
        setor,
      });
      if (execError) throw execError;

      // Update preventiva: set last execution, calculate next
      const nextDate = format(
        addDays(new Date(data.data_execucao), selectedPrev.periodicidade_dias),
        "yyyy-MM-dd"
      );
      const { error: updateError } = await supabase.from("manutencoes_preventivas").update({
        ultima_execucao: data.data_execucao,
        proxima_execucao: nextDate,
        status: "agendada",
      }).eq("id", selectedPrev.id);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preventivas", setor] });
      queryClient.invalidateQueries({ queryKey: ["execucoes", setor] });
      toast({ title: "Manutenção registrada!" });
      setExecDialogOpen(false);
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const enriched = preventivas.map((p: any) => {
    const isOverdue = p.status !== "concluida" && isPast(new Date(p.proxima_execucao));
    const days = differenceInDays(new Date(p.proxima_execucao), new Date());
    return { ...p, isOverdue, daysRemaining: days, effectiveStatus: isOverdue ? "atrasada" : p.status };
  });

  const stats = {
    total: enriched.length,
    atrasadas: enriched.filter((p: any) => p.isOverdue).length,
    proximas7d: enriched.filter((p: any) => !p.isOverdue && p.daysRemaining <= 7 && p.daysRemaining >= 0).length,
    executadas: execucoes.length,
  };

  if (isLoading) return <LoadingState message="Carregando preventivas..." />;

  return (
    <div className="space-y-4">
      {/* Alert atrasadas */}
      {stats.atrasadas > 0 && (
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Preventivas" value={stats.total} icon={CalendarClock} variant="primary" />
        <StatCard title="Atrasadas" value={stats.atrasadas} icon={AlertTriangle} variant="destructive" />
        <StatCard title="Próx. 7 dias" value={stats.proximas7d} icon={Clock} variant="warning" />
        <StatCard title="Executadas (mês)" value={stats.executadas} icon={CheckCircle} variant="success" />
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Nova Preventiva
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {enriched.length === 0 ? (
            <EmptyState icon={Wrench} title="Nenhuma preventiva" description="Agende manutenções preventivas" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ativo</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Periodicidade</TableHead>
                  <TableHead>Próxima</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enriched.map((p: any) => (
                  <TableRow key={p.id} className={p.isOverdue ? "bg-destructive/5" : ""}>
                    <TableCell className="font-medium">{p.ativos?.nome || "-"}</TableCell>
                    <TableCell>{p.titulo}</TableCell>
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
                  <TableHead>Descrição</TableHead>
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
                    <TableCell className="max-w-[200px] truncate">{e.descricao}</TableCell>
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
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Agendar Manutenção Preventiva</DialogTitle></DialogHeader>
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
              <Label>Periodicidade (dias)</Label>
              <Input type="number" value={formData.periodicidade_dias} onChange={e => setFormData(p => ({ ...p, periodicidade_dias: e.target.value }))} />
            </div>
            <div>
              <Label>Próxima Execução *</Label>
              <Input type="date" value={formData.proxima_execucao} onChange={e => setFormData(p => ({ ...p, proxima_execucao: e.target.value }))} />
            </div>
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

      {/* Dialog Executar Manutenção */}
      <Dialog open={execDialogOpen} onOpenChange={setExecDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Registrar Execução de Manutenção</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Descrição *</Label>
              <Textarea value={execForm.descricao} onChange={e => setExecForm(p => ({ ...p, descricao: e.target.value }))} />
            </div>
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
            <div className="col-span-2">
              <Label>Observações</Label>
              <Textarea value={execForm.observacoes} onChange={e => setExecForm(p => ({ ...p, observacoes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExecDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => {
              if (!execForm.descricao) { toast({ title: "Erro", description: "Descrição é obrigatória", variant: "destructive" }); return; }
              executeMutation.mutate(execForm);
            }} disabled={executeMutation.isPending}>Registrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
