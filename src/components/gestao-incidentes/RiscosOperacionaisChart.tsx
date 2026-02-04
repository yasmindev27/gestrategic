import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { AlertTriangle, TrendingUp, Activity, Target, Wrench, Clock, FileText } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

interface RiscoOperacional {
  id: string;
  tipo_risco: string;
  categoria: string;
  descricao: string;
  severidade: string;
  status: string;
  data_ocorrencia: string;
  setor_afetado: string | null;
  equipamento_nome: string | null;
}

interface Incidente {
  id: string;
  tipo_incidente: string;
  categoria_operacional: string | null;
  setor: string;
  classificacao_risco: string;
  data_ocorrencia: string;
  status: string;
}

const COLORS = {
  equipamento: "#ef4444",
  laudo: "#f59e0b",
  processo: "#3b82f6",
  comunicacao: "#8b5cf6",
  infraestrutura: "#06b6d4",
  medicamento: "#10b981",
  outro: "#6b7280",
};

const SEVERITY_COLORS = {
  critico: "#dc2626",
  alto: "#ea580c",
  medio: "#eab308",
  baixo: "#22c55e",
};

export function RiscosOperacionaisChart() {
  const [riscos, setRiscos] = useState<RiscoOperacional[]>([]);
  const [incidentes, setIncidentes] = useState<Incidente[]>([]);
  const [periodo, setPeriodo] = useState("30");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [periodo]);

  const loadData = async () => {
    setIsLoading(true);
    const dataInicio = subDays(new Date(), parseInt(periodo)).toISOString();

    const [riscosRes, incidentesRes] = await Promise.all([
      supabase
        .from("riscos_operacionais")
        .select("*")
        .gte("data_ocorrencia", dataInicio)
        .order("data_ocorrencia", { ascending: false }),
      supabase
        .from("incidentes_nsp")
        .select("id, tipo_incidente, categoria_operacional, setor, classificacao_risco, data_ocorrencia, status")
        .gte("data_ocorrencia", dataInicio)
        .order("data_ocorrencia", { ascending: false }),
    ]);

    if (riscosRes.data) setRiscos(riscosRes.data);
    if (incidentesRes.data) setIncidentes(incidentesRes.data);
    setIsLoading(false);
  };

  // Métricas calculadas
  const stats = useMemo(() => {
    const equipamentos = incidentes.filter(i => i.categoria_operacional === "equipamento").length;
    const laudos = incidentes.filter(i => i.categoria_operacional === "laudo").length;
    const riscosAbertos = riscos.filter(r => r.status === "aberto").length;
    const riscosCriticos = riscos.filter(r => r.severidade === "critico" || r.severidade === "alto").length;
    
    return {
      totalIncidentes: incidentes.length,
      equipamentos,
      laudos,
      riscosAbertos,
      riscosCriticos,
      quaseErros: incidentes.filter(i => i.tipo_incidente === "quase_erro").length,
    };
  }, [riscos, incidentes]);

  // Dados para gráfico de categorias
  const categoriaData = useMemo(() => {
    const counts: Record<string, number> = {};
    incidentes.forEach(i => {
      const cat = i.categoria_operacional || "outro";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    
    return Object.entries(counts).map(([name, value]) => ({
      name: name === "equipamento" ? "Equipamentos" :
            name === "laudo" ? "Laudos/Exames" :
            name === "processo" ? "Processos" :
            name === "comunicacao" ? "Comunicação" :
            name === "infraestrutura" ? "Infraestrutura" :
            name === "medicamento" ? "Medicamentos" : "Outros",
      value,
      fill: COLORS[name as keyof typeof COLORS] || COLORS.outro,
    })).sort((a, b) => b.value - a.value);
  }, [incidentes]);

  // Dados para gráfico de severidade
  const severidadeData = useMemo(() => {
    const counts = { critico: 0, alto: 0, medio: 0, baixo: 0 };
    
    incidentes.forEach(i => {
      if (i.classificacao_risco === "catastrofico") counts.critico++;
      else if (i.classificacao_risco === "grave") counts.alto++;
      else if (i.classificacao_risco === "moderado") counts.medio++;
      else counts.baixo++;
    });
    
    return [
      { name: "Crítico", value: counts.critico, fill: SEVERITY_COLORS.critico },
      { name: "Alto", value: counts.alto, fill: SEVERITY_COLORS.alto },
      { name: "Médio", value: counts.medio, fill: SEVERITY_COLORS.medio },
      { name: "Baixo", value: counts.baixo, fill: SEVERITY_COLORS.baixo },
    ];
  }, [incidentes]);

  // Dados para evolução temporal
  const evolucaoData = useMemo(() => {
    const dias = parseInt(periodo);
    const data: Record<string, { date: string; equipamento: number; laudo: number; outros: number }> = {};
    
    for (let i = 0; i < Math.min(dias, 30); i++) {
      const date = format(subDays(new Date(), i), "dd/MM");
      data[date] = { date, equipamento: 0, laudo: 0, outros: 0 };
    }
    
    incidentes.forEach(i => {
      const date = format(new Date(i.data_ocorrencia), "dd/MM");
      if (data[date]) {
        if (i.categoria_operacional === "equipamento") data[date].equipamento++;
        else if (i.categoria_operacional === "laudo") data[date].laudo++;
        else data[date].outros++;
      }
    });
    
    return Object.values(data).reverse();
  }, [incidentes, periodo]);

  // Dados por setor
  const setorData = useMemo(() => {
    const counts: Record<string, { equipamento: number; laudo: number; outros: number }> = {};
    
    incidentes.forEach(i => {
      if (!counts[i.setor]) {
        counts[i.setor] = { equipamento: 0, laudo: 0, outros: 0 };
      }
      if (i.categoria_operacional === "equipamento") counts[i.setor].equipamento++;
      else if (i.categoria_operacional === "laudo") counts[i.setor].laudo++;
      else counts[i.setor].outros++;
    });
    
    return Object.entries(counts)
      .map(([setor, values]) => ({
        setor,
        ...values,
        total: values.equipamento + values.laudo + values.outros,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [incidentes]);

  if (isLoading) {
    return (
      <div className="grid gap-4">
        <div className="h-[200px] bg-muted animate-pulse rounded-lg" />
        <div className="h-[300px] bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtro de período */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Dashboard de Riscos Operacionais
        </h3>
        <Select value={periodo} onValueChange={setPeriodo}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          title="Total Incidentes"
          value={stats.totalIncidentes}
          icon={AlertTriangle}
          variant="default"
        />
        <StatCard
          title="Falhas Equipamentos"
          value={stats.equipamentos}
          icon={Wrench}
          variant="destructive"
        />
        <StatCard
          title="Atrasos Laudos"
          value={stats.laudos}
          icon={Clock}
          variant="warning"
        />
        <StatCard
          title="Quase Erros"
          value={stats.quaseErros}
          icon={Target}
          variant="default"
        />
        <StatCard
          title="Riscos Abertos"
          value={stats.riscosAbertos}
          icon={FileText}
          variant="default"
        />
        <StatCard
          title="Riscos Críticos"
          value={stats.riscosCriticos}
          icon={TrendingUp}
          variant="destructive"
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Evolução temporal */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Evolução de Riscos</CardTitle>
            <CardDescription>Incidentes por categoria ao longo do tempo</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={evolucaoData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="equipamento" name="Equipamentos" stroke={COLORS.equipamento} strokeWidth={2} />
                <Line type="monotone" dataKey="laudo" name="Laudos" stroke={COLORS.laudo} strokeWidth={2} />
                <Line type="monotone" dataKey="outros" name="Outros" stroke={COLORS.outro} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Por categoria */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição por Categoria</CardTitle>
            <CardDescription>Tipos de falhas reportadas</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={categoriaData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {categoriaData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Por severidade */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Severidade dos Incidentes</CardTitle>
            <CardDescription>Classificação de risco</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={severidadeData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" fontSize={12} />
                <YAxis type="category" dataKey="name" fontSize={12} width={60} />
                <Tooltip />
                <Bar dataKey="value" name="Quantidade">
                  {severidadeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Por setor */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Incidentes por Setor</CardTitle>
            <CardDescription>Setores com mais ocorrências</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={setorData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="setor" fontSize={10} angle={-45} textAnchor="end" height={80} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Legend />
                <Bar dataKey="equipamento" name="Equipamentos" fill={COLORS.equipamento} stackId="a" />
                <Bar dataKey="laudo" name="Laudos" fill={COLORS.laudo} stackId="a" />
                <Bar dataKey="outros" name="Outros" fill={COLORS.outro} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
