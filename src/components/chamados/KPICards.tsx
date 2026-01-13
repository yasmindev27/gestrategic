import { Card, CardContent } from "@/components/ui/card";
import { 
  Ticket, 
  Clock, 
  Timer, 
  CheckCircle2, 
  RefreshCw, 
  Users,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { KPIMetrics } from "./types";

interface KPICardsProps {
  metrics: KPIMetrics;
  isLoading: boolean;
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

export const KPICards = ({ metrics, isLoading }: KPICardsProps) => {
  const kpis = [
    {
      title: "Total de Chamados",
      value: metrics.totalChamados.toString(),
      icon: Ticket,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Tempo Médio de Atendimento",
      value: formatTime(metrics.tempoMedioAtendimento),
      icon: Clock,
      color: "text-info",
      bgColor: "bg-info/10",
    },
    {
      title: "Tempo Médio de Resolução",
      value: formatTime(metrics.tempoMedioResolucao),
      icon: Timer,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      title: "SLA Cumprido",
      value: `${metrics.percentualSLA.toFixed(1)}%`,
      icon: CheckCircle2,
      color: metrics.percentualSLA >= 80 ? "text-success" : "text-destructive",
      bgColor: metrics.percentualSLA >= 80 ? "bg-success/10" : "bg-destructive/10",
    },
    {
      title: "Taxa de Reabertura",
      value: `${metrics.taxaReabertura.toFixed(1)}%`,
      icon: RefreshCw,
      color: metrics.taxaReabertura <= 5 ? "text-success" : "text-warning",
      bgColor: metrics.taxaReabertura <= 5 ? "bg-success/10" : "bg-warning/10",
    },
    {
      title: "Média por Atendente",
      value: metrics.mediaChamadosPorAtendente.toFixed(1),
      icon: Users,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: "Primeiro Atendimento",
      value: formatTime(metrics.tempoMedioPrimeiroAtendimento),
      icon: TrendingUp,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Maior Tempo Resolução",
      value: formatTime(metrics.maiorTempoResolucao),
      icon: AlertTriangle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
      {kpis.map((kpi, index) => (
        <Card key={index} className="card-hover">
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-col items-center text-center gap-2">
              <div className={`p-2 rounded-lg ${kpi.bgColor}`}>
                <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
              </div>
              <div>
                <p className={`text-2xl font-bold ${kpi.color}`}>
                  {isLoading ? "..." : kpi.value}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {kpi.title}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
