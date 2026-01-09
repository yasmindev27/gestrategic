import { Users, ClipboardCheck, AlertTriangle, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const stats = [
  {
    label: "Atendimentos Hoje",
    value: "127",
    change: "+12%",
    trend: "up",
    icon: Users,
    color: "primary"
  },
  {
    label: "Tarefas Concluídas",
    value: "23/28",
    change: "82%",
    trend: "up",
    icon: ClipboardCheck,
    color: "success"
  },
  {
    label: "Alertas Pendentes",
    value: "5",
    change: "-3",
    trend: "down",
    icon: AlertTriangle,
    color: "warning"
  },
  {
    label: "Tempo Médio",
    value: "18min",
    change: "-2min",
    trend: "down",
    icon: Clock,
    color: "info"
  },
];

const colorClasses = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  info: "bg-info/10 text-info",
};

const StatsCards = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        const colorClass = colorClasses[stat.color as keyof typeof colorClasses];
        
        return (
          <Card key={index} className="shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
                  <p className={`text-xs mt-1 ${
                    stat.trend === "up" ? "text-success" : "text-info"
                  }`}>
                    {stat.change} vs ontem
                  </p>
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
