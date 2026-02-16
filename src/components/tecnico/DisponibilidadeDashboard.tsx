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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { StatCard } from "@/components/ui/stat-card";
import { LoadingState } from "@/components/ui/loading-state";
import { useToast } from "@/hooks/use-toast";
import {
  Activity, AlertTriangle, CheckCircle, Clock, Archive, ShoppingCart,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";

interface DisponibilidadeDashboardProps {
  setor: string;
}

const COLORS = ["hsl(var(--primary))", "#3b82f6", "hsl(var(--destructive))", "hsl(var(--muted))"];

export function DisponibilidadeDashboard({ setor }: DisponibilidadeDashboardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pedidoDialogOpen, setPedidoDialogOpen] = useState(false);
  const [pedidoForm, setPedidoForm] = useState({
    item_nome: "", item_descricao: "", quantidade_solicitada: "1",
    unidade_medida: "UN", justificativa: "", urgencia: "media",
  });
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  useState(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        supabase.from("profiles").select("full_name").eq("user_id", data.user.id).single()
          .then(({ data: p }) => { if (p) setUserName(p.full_name); });
      }
    });
  });

  const { data: ativos = [], isLoading: loadingAtivos } = useQuery({
    queryKey: ["ativos", setor],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ativos").select("*").eq("setor_responsavel", setor).order("nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: execucoes = [] } = useQuery({
    queryKey: ["execucoes_30d", setor],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data, error } = await supabase
        .from("manutencoes_execucoes")
        .select("ativo_id, tempo_parada_horas, tipo, data_execucao")
        .eq("setor", setor)
        .gte("data_execucao", thirtyDaysAgo.toISOString().split("T")[0]);
      if (error) throw error;
      return data;
    },
  });

  const { data: preventivas = [] } = useQuery({
    queryKey: ["preventivas", setor],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("manutencoes_preventivas")
        .select("ativo_id, proxima_execucao, status, requer_calibracao, data_vencimento_calibracao")
        .eq("setor", setor);
      if (error) throw error;
      return data;
    },
  });

  // Query produtos com estoque baixo para botão de solicitar peça
  const { data: produtosBaixos = [] } = useQuery({
    queryKey: ["produtos_baixos", setor],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("produtos")
        .select("id, nome, quantidade_atual, quantidade_minima, unidade_medida")
        .eq("setor_responsavel", setor)
        .eq("ativo", true);
      if (error) throw error;
      return (data || []).filter(p => (p.quantidade_atual || 0) <= (p.quantidade_minima || 0));
    },
  });

  // Query pedidos de compra pendentes
  const { data: pedidosPendentes = [] } = useQuery({
    queryKey: ["pedidos_compra", setor],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedidos_compra")
        .select("*")
        .eq("setor_solicitante", setor)
        .in("status", ["pendente", "aprovado"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const criarPedidoMutation = useMutation({
    mutationFn: async (data: typeof pedidoForm) => {
      const { error } = await supabase.from("pedidos_compra").insert({
        setor_solicitante: setor,
        solicitante_id: userId,
        solicitante_nome: userName,
        item_nome: data.item_nome,
        item_descricao: data.item_descricao || null,
        quantidade_solicitada: parseInt(data.quantidade_solicitada),
        unidade_medida: data.unidade_medida,
        justificativa: data.justificativa,
        urgencia: data.urgencia,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pedidos_compra", setor] });
      toast({ title: "Pedido de compra enviado para a Gerência!" });
      setPedidoDialogOpen(false);
      setPedidoForm({ item_nome: "", item_descricao: "", quantidade_solicitada: "1", unidade_medida: "UN", justificativa: "", urgencia: "media" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  if (loadingAtivos) return <LoadingState message="Carregando dashboard..." />;

  const totalAtivos = ativos.length;
  const emUso = ativos.filter(a => a.status === "operacional").length;
  const emReserva = ativos.filter(a => a.status === "reserva").length;
  const emManutencao = ativos.filter(a => a.status === "em_manutencao").length;
  const taxaDisponibilidade = totalAtivos > 0 ? (((emUso + emReserva) / totalAtivos) * 100).toFixed(1) : "0";

  const totalParadaHoras = execucoes.reduce((sum: number, e: any) => sum + (parseFloat(e.tempo_parada_horas) || 0), 0);
  const prevAtrasadas = preventivas.filter((p: any) => p.status !== "concluida" && new Date(p.proxima_execucao) < new Date()).length;

  // Compliance: calibrações vencidas
  const calibracoesVencidas = preventivas.filter((p: any) =>
    p.requer_calibracao && p.data_vencimento_calibracao && new Date(p.data_vencimento_calibracao) < new Date()
  ).length;
  const totalCalibracoes = preventivas.filter((p: any) => p.requer_calibracao).length;
  const complianceCalib = totalCalibracoes > 0 ? (((totalCalibracoes - calibracoesVencidas) / totalCalibracoes) * 100).toFixed(0) : "100";

  const statusData = [
    { name: "Em Uso", value: emUso },
    { name: "Reserva", value: emReserva },
    { name: "Manutenção", value: emManutencao },
    { name: "Inoperante", value: ativos.filter(a => a.status === "inoperante").length },
  ].filter(d => d.value > 0);

  const downtimeByAsset = new Map<string, { nome: string; horas: number }>();
  execucoes.forEach((e: any) => {
    const ativo = ativos.find(a => a.id === e.ativo_id);
    if (!ativo) return;
    const existing = downtimeByAsset.get(e.ativo_id) || { nome: ativo.nome, horas: 0 };
    existing.horas += parseFloat(e.tempo_parada_horas) || 0;
    downtimeByAsset.set(e.ativo_id, existing);
  });
  const topDowntime = Array.from(downtimeByAsset.values())
    .sort((a, b) => b.horas - a.horas)
    .slice(0, 5);

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard title="Taxa Disponibilidade" value={`${taxaDisponibilidade}%`} icon={Activity} variant="primary" />
        <StatCard title="Em Uso" value={emUso} icon={CheckCircle} variant="success" />
        <StatCard title="Reserva (Backup)" value={emReserva} icon={Archive} variant="primary" />
        <StatCard title="Em Manutenção" value={emManutencao} icon={Clock} variant="warning" />
        <StatCard title="Compliance Calibração" value={`${complianceCalib}%`} icon={AlertTriangle}
          variant={parseInt(complianceCalib) < 100 ? "destructive" : "success"} />
      </div>

      {/* Low inventory alert + purchase request */}
      {produtosBaixos.length > 0 && (
        <Card className="border-amber-400 bg-amber-500/5">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <ShoppingCart className="h-5 w-5 text-amber-600 mt-1" />
                <div>
                  <p className="font-semibold text-amber-700">{produtosBaixos.length} item{produtosBaixos.length > 1 ? "ns" : ""} com estoque baixo/zerado</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {produtosBaixos.slice(0, 5).map(p => (
                      <Badge key={p.id} variant="outline" className="text-xs bg-amber-500/10 text-amber-700 border-amber-300">
                        {p.nome}: {p.quantidade_atual || 0} {p.unidade_medida}
                      </Badge>
                    ))}
                    {produtosBaixos.length > 5 && (
                      <Badge variant="outline" className="text-xs">+{produtosBaixos.length - 5} mais</Badge>
                    )}
                  </div>
                </div>
              </div>
              <Button variant="outline" size="sm" className="shrink-0 border-amber-400 text-amber-700 hover:bg-amber-500/10"
                onClick={() => setPedidoDialogOpen(true)}>
                <ShoppingCart className="h-4 w-4 mr-1" /> Solicitar Peça/Suprimento
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pedidos pendentes */}
      {pedidosPendentes.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><ShoppingCart className="h-4 w-4" /> Pedidos de Compra Pendentes</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pedidosPendentes.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between p-2 rounded border bg-muted/30">
                  <div>
                    <p className="font-medium text-sm">{p.item_nome} (x{p.quantidade_solicitada})</p>
                    <p className="text-xs text-muted-foreground">{p.justificativa}</p>
                  </div>
                  <Badge variant="outline" className={
                    p.status === "aprovado" ? "bg-emerald-500/15 text-emerald-700" :
                    p.urgencia === "critica" ? "bg-red-500/15 text-red-700" :
                    "bg-amber-500/15 text-amber-700"
                  }>
                    {p.status === "aprovado" ? "Aprovado" : `Pendente (${p.urgencia})`}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Distribuição por Status</CardTitle></CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center py-8 text-muted-foreground">Sem dados</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Maior Tempo Parado (30 dias)</CardTitle></CardHeader>
          <CardContent>
            {topDowntime.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={topDowntime} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" unit="h" />
                  <YAxis dataKey="nome" type="category" width={120} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(val: number) => `${val.toFixed(1)}h`} />
                  <Bar dataKey="horas" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center py-8 text-muted-foreground">Sem dados de parada</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog Solicitar Peça */}
      <Dialog open={pedidoDialogOpen} onOpenChange={setPedidoDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Solicitar Peça / Suprimento</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Item *</Label>
              <Input value={pedidoForm.item_nome} onChange={e => setPedidoForm(p => ({ ...p, item_nome: e.target.value }))}
                placeholder="Ex: Toner HP, Filtro HEPA, Disjuntor 20A" />
            </div>
            <div>
              <Label>Quantidade *</Label>
              <Input type="number" value={pedidoForm.quantidade_solicitada} onChange={e => setPedidoForm(p => ({ ...p, quantidade_solicitada: e.target.value }))} />
            </div>
            <div>
              <Label>Urgência</Label>
              <Select value={pedidoForm.urgencia} onValueChange={v => setPedidoForm(p => ({ ...p, urgencia: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="critica">Crítica - Parada operacional</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Justificativa *</Label>
              <Textarea value={pedidoForm.justificativa} onChange={e => setPedidoForm(p => ({ ...p, justificativa: e.target.value }))}
                placeholder="Descreva por que precisa deste item e o impacto da falta..." />
            </div>
            <div className="col-span-2">
              <Label>Descrição adicional</Label>
              <Input value={pedidoForm.item_descricao} onChange={e => setPedidoForm(p => ({ ...p, item_descricao: e.target.value }))}
                placeholder="Especificações, marca, modelo..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPedidoDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => {
              if (!pedidoForm.item_nome || !pedidoForm.justificativa) {
                toast({ title: "Erro", description: "Preencha item e justificativa", variant: "destructive" }); return;
              }
              criarPedidoMutation.mutate(pedidoForm);
            }} disabled={criarPedidoMutation.isPending}>
              Enviar Pedido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
