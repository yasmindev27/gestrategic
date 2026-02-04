import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertTriangle, BarChart3, ClipboardList, Plus, Brain } from "lucide-react";
import { useLogAccess } from "@/hooks/useLogAccess";
import { ReportarIncidenteRapido, RiscosOperacionaisChart, IncidentesList, DashboardIAIncidentes } from "@/components/gestao-incidentes";

export function GestaoIncidentesModule() {
  const { logAction } = useLogAccess();
  const [activeTab, setActiveTab] = useState("reportar");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    logAction("acesso_modulo", "gestao-incidentes");
  }, [logAction]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    logAction("navegacao_aba", "gestao-incidentes", { aba: value });
  };

  const handleIncidenteRegistrado = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-primary" />
          Gestão de Incidentes
        </h1>
        <p className="text-muted-foreground">
          Central unificada para reporte de quase-erros, incidentes e análise de riscos operacionais
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="reportar" className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Reportar</span>
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="ia" className="gap-2">
            <Brain className="h-4 w-4" />
            <span className="hidden sm:inline">Análise IA</span>
          </TabsTrigger>
          <TabsTrigger value="incidentes" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            <span className="hidden sm:inline">Incidentes</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab: Reportar Incidente */}
        <TabsContent value="reportar" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <ReportarIncidenteRapido onIncidenteRegistrado={handleIncidenteRegistrado} />
            </div>
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Por que reportar?</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-3">
                  <p>
                    <strong>Quase-erros</strong> são eventos que poderiam ter causado dano, 
                    mas foram interceptados a tempo. Reportá-los ajuda a prevenir incidentes reais.
                  </p>
                  <p>
                    <strong>Cultura justa:</strong> O objetivo não é punir, mas aprender. 
                    Sua notificação é fundamental para a segurança de todos.
                  </p>
                  <p>
                    <strong>Confidencialidade:</strong> Você pode reportar de forma anônima 
                    se preferir.
                  </p>
                </CardContent>
              </Card>
              
              <Card className="bg-primary/5 border-primary/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-primary">Exemplos de Reportes</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <div className="p-2 bg-background rounded">
                    <p className="font-medium">⚠️ Equipamento</p>
                    <p className="text-muted-foreground">Monitor cardíaco com falha intermitente</p>
                  </div>
                  <div className="p-2 bg-background rounded">
                    <p className="font-medium">🔶 Laudo</p>
                    <p className="text-muted-foreground">Resultado de exame crítico atrasado</p>
                  </div>
                  <div className="p-2 bg-background rounded">
                    <p className="font-medium">💊 Medicamento</p>
                    <p className="text-muted-foreground">Dose quase administrada errada</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Tab: Dashboard de Riscos */}
        <TabsContent value="dashboard" className="mt-6">
          <RiscosOperacionaisChart />
        </TabsContent>

        {/* Tab: Análise IA */}
        <TabsContent value="ia" className="mt-6">
          <DashboardIAIncidentes />
        </TabsContent>

        {/* Tab: Lista de Incidentes */}
        <TabsContent value="incidentes" className="mt-6">
          <IncidentesList refreshTrigger={refreshTrigger} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
