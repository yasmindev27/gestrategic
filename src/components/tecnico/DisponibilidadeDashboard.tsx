import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { LoadingState } from "@/components/ui/loading-state";
import {
  Activity, TrendingUp, AlertTriangle, CheckCircle, Clock,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";

interface DisponibilidadeDashboardProps {
  setor: string;
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--destructive))", "hsl(var(--muted))"];

export function DisponibilidadeDashboard({ setor }: DisponibilidadeDashboardProps) {
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
        .select("ativo_id, proxima_execucao, status")
        .eq("setor", setor);
      if (error) throw error;
      return data;
    },
  });

  if (loadingAtivos) return <LoadingState message="Carregando dashboard..." />;

  // Calculate stats
  const totalAtivos = ativos.length;
  const operacionais = ativos.filter(a => a.status === "operacional").length;
  const taxaDisponibilidade = totalAtivos > 0 ? ((operacionais / totalAtivos) * 100).toFixed(1) : "0";
  
  const totalParadaHoras = execucoes.reduce((sum: number, e: any) => sum + (parseFloat(e.tempo_parada_horas) || 0), 0);
  const prevAtrasadas = preventivas.filter((p: any) => p.status !== "concluida" && new Date(p.proxima_execucao) < new Date()).length;

  // Chart data: status distribution
  const statusData = [
    { name: "Operacional", value: ativos.filter(a => a.status === "operacional").length },
    { name: "Em Manutenção", value: ativos.filter(a => a.status === "em_manutencao").length },
    { name: "Inoperante", value: ativos.filter(a => a.status === "inoperante").length },
  ].filter(d => d.value > 0);

  // Chart data: downtime by asset (top 5)
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

  // Chart data: criticidade
  const criticidadeData = [
    { name: "Crítica", value: ativos.filter(a => a.criticidade === "critica").length, fill: "hsl(var(--destructive))" },
    { name: "Alta", value: ativos.filter(a => a.criticidade === "alta").length, fill: "#f97316" },
    { name: "Média", value: ativos.filter(a => a.criticidade === "media").length, fill: "#eab308" },
    { name: "Baixa", value: ativos.filter(a => a.criticidade === "baixa").length, fill: "#3b82f6" },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Taxa Disponibilidade" value={`${taxaDisponibilidade}%`} icon={Activity} variant="primary" />
        <StatCard title="Ativos Operacionais" value={`${operacionais}/${totalAtivos}`} icon={CheckCircle} variant="success" />
        <StatCard title="Horas Parada (30d)" value={totalParadaHoras.toFixed(1)} icon={Clock} variant="warning" />
        <StatCard title="Preventivas Atrasadas" value={prevAtrasadas} icon={AlertTriangle} variant="destructive" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Status Distribution */}
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

        {/* Top Downtime */}
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

      {/* Criticidade breakdown */}
      <Card>
        <CardHeader><CardTitle className="text-base">Ativos por Criticidade</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {criticidadeData.map(c => (
              <div key={c.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.fill }} />
                <span className="text-sm">{c.name}: <strong>{c.value}</strong></span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
