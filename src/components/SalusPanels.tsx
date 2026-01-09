import { BarChart3, ExternalLink, Activity, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const dashboards = [
  {
    id: 1,
    title: "Painel Entrada por Classificação",
    description: "Visualize as entradas classificadas por tipo de atendimento",
    icon: BarChart3,
    url: "https://dashboard-appolus.streamlit.app/#painel-entrada-por-classificacao",
    color: "primary"
  },
  {
    id: 2,
    title: "Visão Geral da Unidade",
    description: "Panorama completo do funcionamento da unidade",
    icon: Activity,
    url: "https://dashboard-appolus.streamlit.app/#painel-entrada-por-classificacao",
    color: "info"
  },
];

const colorClasses = {
  primary: "bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground",
  info: "bg-info/10 text-info hover:bg-info hover:text-info-foreground",
};

const SalusPanels = () => {
  const openDashboard = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <div className="p-1.5 bg-primary/10 rounded-lg">
            <BarChart3 className="h-4 w-4 text-primary" />
          </div>
          Painéis Salus
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {dashboards.map((dashboard) => {
          const Icon = dashboard.icon;
          const colorClass = colorClasses[dashboard.color as keyof typeof colorClasses];
          
          return (
            <Button
              key={dashboard.id}
              variant="outline"
              className={`w-full h-auto p-4 flex items-center gap-4 justify-start transition-all ${colorClass}`}
              onClick={() => openDashboard(dashboard.url)}
            >
              <div className="p-2 rounded-lg bg-background/50">
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold">{dashboard.title}</p>
                <p className="text-xs opacity-80 font-normal">{dashboard.description}</p>
              </div>
              <ExternalLink className="h-4 w-4 opacity-60" />
            </Button>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default SalusPanels;
