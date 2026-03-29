import { Users, ClipboardList, AlertTriangle, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getBrasiliaDateString } from "@/lib/brasilia-time";

const StatsCards = () => {
  const today = getBrasiliaDateString();

  const { data: funcionariosHoje = 0, isLoading: loadingFunc } = useQuery({
    queryKey: ["stats-funcionarios-hoje", today],
    queryFn: async () => {
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true });
      return count || 0;
    },
  });

  const { data: tarefas, isLoading: loadingTarefas } = useQuery({
    queryKey: ["stats-tarefas"],
    queryFn: async () => {
      const { data } = await supabase
        .from("gerencia_planos_acao")
        .select("status");
      const total = data?.length || 0;
      const pendentes = data?.filter(t => t.status === "pendente" || t.status === "em_andamento").length || 0;
      return { total, pendentes };
    },
  });

  const { data: alertas = 0, isLoading: loadingAlertas } = useQuery({
    queryKey: ["stats-alertas-ativos"],
    queryFn: async () => {
      const { count } = await supabase
        .from("alertas_seguranca")
        .select("id", { count: "exact", head: true })
        .eq("status", "ativo");
      return count || 0;
    },
  });

  const { data: agendaCount = 0, isLoading: loadingAgenda } = useQuery({
    queryKey: ["stats-agenda-hoje", today],
    queryFn: async () => {
      const { count } = await supabase
        .from("agenda_items")
        .select("id", { count: "exact", head: true })
        .eq("date", today);
      return count || 0;
    },
  });

  const stats = [
    {
      label: "Colaboradores Ativos",
      value: loadingFunc ? null : String(funcionariosHoje),
      change: "Total cadastrado",
      icon: Users,
      color: "primary",
    },
    {
      label: "Planos de Ação",
      value: loadingTarefas ? null : `${tarefas?.pendentes ?? 0}/${tarefas?.total ?? 0}`,
      change: `${tarefas?.pendentes ?? 0} pendentes`,
      icon: ClipboardList,
      color: "success",
    },
    {
      label: "Alertas Ativos",
      value: loadingAlertas ? null : String(alertas),
      change: alertas === 0 ? "Nenhum alerta" : "Requer atenção",
      icon: AlertTriangle,
      color: "warning",
    },
    {
      label: "Agenda Hoje",
      value: loadingAgenda ? null : String(agendaCount),
      change: "itens hoje",
      icon: Calendar,
      color: "info",
    },
  ];

  const colorClasses = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    info: "bg-info/10 text-info",
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        const colorClass = colorClasses[stat.color as keyof typeof colorClasses];
        return (
          <Card key={index} className="shadow-sm hover:shadow-md transition-all border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  {stat.value === null ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
                  )}
                  <p className="text-xs mt-1 text-muted-foreground">{stat.change}</p>
                </div>
                <div className={`p-3 rounded-xl ${colorClass}`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default StatsCards;
