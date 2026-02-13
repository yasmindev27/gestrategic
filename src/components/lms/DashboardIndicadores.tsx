import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { BarChart3, PieChart as PieIcon, TrendingUp, Users, BookCheck, Clock } from "lucide-react";
import { Treinamento } from "./types";

const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function DashboardIndicadores() {
  const { data: treinamentos = [] } = useQuery({
    queryKey: ["lms-treinamentos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("lms_treinamentos").select("*");
      if (error) throw error;
      return data as Treinamento[];
    },
  });

  const { data: inscricoes = [] } = useQuery({
    queryKey: ["lms-inscricoes-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("lms_inscricoes").select("*");
      if (error) throw error;
      return data;
    },
  });

  const stats = useMemo(() => {
    const total = treinamentos.length;
    const realizados = treinamentos.filter(t => t.status === "realizado").length;
    const planejados = treinamentos.filter(t => t.status === "planejado").length;
    const emAndamento = treinamentos.filter(t => t.status === "em_andamento").length;
    const capacitados = inscricoes.filter(i => i.status === "capacitado").length;
    const totalInscritos = inscricoes.length;

    return { total, realizados, planejados, emAndamento, capacitados, totalInscritos };
  }, [treinamentos, inscricoes]);

  const barChartData = useMemo(() => {
    const setorMap: Record<string, { realizados: number; planejados: number }> = {};
    treinamentos.forEach(t => {
      const setor = t.setor_responsavel || "Outros";
      if (!setorMap[setor]) setorMap[setor] = { realizados: 0, planejados: 0 };
      if (t.status === "realizado") setorMap[setor].realizados++;
      else setorMap[setor].planejados++;
    });
    return Object.entries(setorMap).map(([setor, v]) => ({ setor, ...v }));
  }, [treinamentos]);

  const pieChartData = useMemo(() => {
    const statusCount: Record<string, number> = {};
    treinamentos.forEach(t => {
      const label = t.status === "realizado" ? "Realizado" : t.status === "planejado" ? "Planejado" : t.status === "em_andamento" ? "Em Andamento" : "Outros";
      statusCount[label] = (statusCount[label] || 0) + 1;
    });
    return Object.entries(statusCount).map(([name, value]) => ({ name, value }));
  }, [treinamentos]);

  const tipoChartData = useMemo(() => {
    const tipos: Record<string, number> = {};
    treinamentos.forEach(t => {
      const tipo = t.tipo_treinamento || "Outro";
      tipos[tipo] = (tipos[tipo] || 0) + 1;
    });
    return Object.entries(tipos).map(([name, value]) => ({ name, value }));
  }, [treinamentos]);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <BookCheck className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats.realizados}</p>
                <p className="text-xs text-muted-foreground">Realizados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stats.planejados}</p>
                <p className="text-xs text-muted-foreground">Planejados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{stats.total > 0 ? Math.round((stats.realizados / stats.total) * 100) : 0}%</p>
                <p className="text-xs text-muted-foreground">Taxa Conclusão</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{stats.capacitados}</p>
                <p className="text-xs text-muted-foreground">Capacitados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><BarChart3 className="h-5 w-5" /> Realizados vs Planejados por Setor</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="setor" fontSize={11} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="realizados" fill="#22c55e" name="Realizados" radius={[4,4,0,0]} />
                <Bar dataKey="planejados" fill="#3b82f6" name="Planejados" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie Chart - Status */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><PieIcon className="h-5 w-5" /> Distribuição por Status</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={pieChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {pieChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie Chart - Tipo */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><PieIcon className="h-5 w-5" /> Distribuição por Tipo de Treinamento</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={tipoChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {tipoChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
