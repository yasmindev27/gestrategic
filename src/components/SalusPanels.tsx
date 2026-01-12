import { BarChart3, ExternalLink, Activity } from "lucide-react";
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
  primary: {
    container: "bg-primary/10 text-primary",
    hover: "hover:bg-primary hover:text-primary-foreground hover:border-primary"
  },
  info: {
    container: "bg-info/10 text-info",
    hover: "hover:bg-info hover:text-info-foreground hover:border-info"
  },
};

const SalusPanels = () => {
  const openDashboard = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <Card className="shadow-sm border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2 text-foreground">
          <div className="p-1.5 bg-primary/10 rounded-lg">
            <BarChart3 className="h-4 w-4 text-primary" />
          </div>
          Painéis Salus
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {dashboards.map((dashboard) => {
          const Icon = dashboard.icon;
          const colorConfig = colorClasses[dashboard.color as keyof typeof colorClasses];
          
          return (
            <Button
              key={dashboard.id}
              variant="outline"
              className={`w-full h-auto p-4 flex items-center gap-4 justify-start transition-all border-border ${colorConfig.hover}`}
              onClick={() => openDashboard(dashboard.url)}
            >
              <div className={`p-2 rounded-lg ${colorConfig.container}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-foreground">{dashboard.title}</p>
                <p className="text-xs text-muted-foreground font-normal">{dashboard.description}</p>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </Button>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default SalusPanels;