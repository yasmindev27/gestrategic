import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Clock, Timer, AlertTriangle, TrendingUp } from "lucide-react";
import { Chamado, SLA_HORAS, categoriaLabels } from "./types";
import { differenceInHours, parseISO } from "date-fns";

interface TempoAtendimentoCardsProps {
  chamados: Chamado[];
}

const formatTime = (hours: number): string => {
  if (hours < 1) {
    return `${Math.round(hours * 60)}min`;
  }
  if (hours < 24) {
    return `${hours.toFixed(1)}h`;
  }
  return `${(hours / 24).toFixed(1)}d`;
};

export const TempoAtendimentoCards = ({ chamados }: TempoAtendimentoCardsProps) => {
  const metrics = useMemo(() => {
    const resolvidos = chamados.filter((c) => c.status === "resolvido" && c.data_resolucao);
    const emAndamento = chamados.filter((c) => c.status === "em_andamento");

    // Tempo médio de primeiro atendimento (abertura -> em_andamento)
    let tempoMedioPrimeiroAtendimento = 0;
    const comAtendimento = emAndamento.concat(resolvidos);
    if (comAtendimento.length > 0) {
      // Simplificação: usar diferença entre abertura e updated_at para os em_andamento
      // Para um cálculo real, precisaríamos de um histórico de status
      tempoMedioPrimeiroAtendimento = comAtendimento.reduce((acc, c) => {
        const diff = differenceInHours(parseISO(c.updated_at), parseISO(c.data_abertura));
        return acc + Math.max(0, diff);
      }, 0) / comAtendimento.length;
    }

    // Tempo médio de resolução
    let tempoMedioResolucao = 0;
    let maiorTempoResolucao = 0;
    if (resolvidos.length > 0) {
      const tempos = resolvidos.map((c) => {
        return differenceInHours(parseISO(c.data_resolucao!), parseISO(c.data_abertura));
      });
      tempoMedioResolucao = tempos.reduce((a, b) => a + b, 0) / tempos.length;
      maiorTempoResolucao = Math.max(...tempos);
    }

    // SLA por categoria
    const slaPorCategoria = chamados.reduce((acc, c) => {
      const cat = c.categoria;
      if (!acc[cat]) {
        acc[cat] = { total: 0, dentroDeSLA: 0 };
      }
      acc[cat].total++;
      
      if (c.status === "resolvido" && c.data_resolucao) {
        const horasResolucao = differenceInHours(
          parseISO(c.data_resolucao),
          parseISO(c.data_abertura)
        );
        const slaHoras = SLA_HORAS[c.prioridade] || 24;
        if (horasResolucao <= slaHoras) {
          acc[cat].dentroDeSLA++;
        }
      }
      
      return acc;
    }, {} as Record<string, { total: number; dentroDeSLA: number }>);

    const slaChartData = Object.entries(slaPorCategoria).map(([cat, data]) => ({
      categoria: categoriaLabels[cat] || cat,
      sla: data.total > 0 ? (data.dentroDeSLA / data.total) * 100 : 0,
      total: data.total,
    })).sort((a, b) => b.total - a.total).slice(0, 8);

    return {
      tempoMedioPrimeiroAtendimento,
      tempoMedioResolucao,
      maiorTempoResolucao,
      slaChartData,
    };
  }, [chamados]);

  const cards = [
    {
      title: "Primeiro Atendimento",
      value: formatTime(metrics.tempoMedioPrimeiroAtendimento),
      subtitle: "Tempo médio até iniciar atendimento",
      icon: Clock,
      color: "text-info",
      bgColor: "bg-info/10",
    },
    {
      title: "Tempo de Resolução",
      value: formatTime(metrics.tempoMedioResolucao),
      subtitle: "Tempo médio para resolver",
      icon: Timer,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "Maior Tempo Registrado",
      value: formatTime(metrics.maiorTempoResolucao),
      subtitle: "Resolução mais demorada",
      icon: AlertTriangle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map((card, index) => (
          <Card key={index} className="card-hover">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${card.bgColor}`}>
                  <card.icon className={`h-6 w-6 ${card.color}`} />
                </div>
                <div className="flex-1">
                  <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
                  <p className="font-medium text-foreground">{card.title}</p>
                  <p className="text-xs text-muted-foreground">{card.subtitle}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* SLA por Categoria Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            SLA Médio por Categoria
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.slaChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="categoria" 
                  tick={{ fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  tick={{ fontSize: 11 }}
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip 
                  formatter={(value: number) => [`${value.toFixed(1)}%`, "SLA Cumprido"]}
                />
                <Bar 
                  dataKey="sla" 
                  name="SLA %" 
                  fill="hsl(142, 50%, 45%)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
