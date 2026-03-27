import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Ambulance, LayoutDashboard, BedDouble, ExternalLink, Truck, Navigation, BarChart3 } from "lucide-react";
import { NirDashboardModule } from "./NirDashboardModule";
import { MapaLeitosModule } from "./MapaLeitosModule";
import { TransferenciasModule } from "@/components/nir/TransferenciasModule";
import { NucleoTrackerModule } from "@/components/nir/nucleo-tracker/NucleoTrackerModule";
import { useLogAccess } from "@/hooks/useLogAccess";
import { useRealtimeSync, REALTIME_PRESETS } from "@/hooks/useRealtimeSync";
import logoSusFacil from "@/assets/logo-susfacil.png";
import { Routes, Route, useNavigate, useLocation, Navigate, Link } from "react-router-dom";

interface NirModuleProps {
  onOpenExternal?: (url: string, title: string) => void;
}

export const NirModule = ({ onOpenExternal }: NirModuleProps) => {
  const { logAction } = useLogAccess();
  useRealtimeSync(REALTIME_PRESETS.nir);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    logAction("acesso_modulo", "nir");
  }, [logAction]);

  // SPA: define subroutes for each view
  return (
    <Routes>
      <Route path="nir">
        <Route
          index
          element={
            <div className="space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                    <Ambulance className="h-6 w-6 text-primary" />
                    Núcleo Interno de Regulação
                  </h2>
                  <p className="text-muted-foreground">Gestão de leitos e regulação hospitalar</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <Card
                                  className="cursor-pointer hover:border-primary hover:shadow-lg transition-all group"
                                  onClick={() => navigate("relatorio")}
                                >
                                  <CardHeader className="text-center pb-2">
                                    <div className="mx-auto p-4 bg-primary/10 rounded-full w-fit group-hover:bg-primary/20 transition-colors">
                                      <BarChart3 className="h-8 w-8 text-primary" />
                                    </div>
                                    <CardTitle className="mt-4">Relatório</CardTitle>
                                    <CardDescription>
                                      Produtividade e indicadores da equipe NIR
                                    </CardDescription>
                                  </CardHeader>
                                  <CardContent className="text-center">
                                    <Button variant="outline" className="w-full gap-2">
                                      Acessar Relatório
                                    </Button>
                                  </CardContent>
                                </Card>
                <Card
                  className="cursor-pointer hover:border-primary hover:shadow-lg transition-all group"
                  onClick={() => navigate("dashboard")}
                >
                  <CardHeader className="text-center pb-2">
                    <div className="mx-auto p-4 bg-primary/10 rounded-full w-fit group-hover:bg-primary/20 transition-colors">
                      <LayoutDashboard className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="mt-4">Dashboard</CardTitle>
                    <CardDescription>
                      Métricas e indicadores de ocupação hospitalar
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-center">
                    <Button variant="outline" className="w-full">
                      Acessar Dashboard
                    </Button>
                  </CardContent>
                </Card>

                <Card
                  className="cursor-pointer hover:border-primary hover:shadow-lg transition-all group"
                  onClick={() => navigate("mapa-leitos")}
                >
                  <CardHeader className="text-center pb-2">
                    <div className="mx-auto p-4 bg-primary/10 rounded-full w-fit group-hover:bg-primary/20 transition-colors">
                      <BedDouble className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="mt-4">Mapa de Leitos</CardTitle>
                    <CardDescription>
                      Visualização e gestão de leitos por setor
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-center">
                    <Button variant="outline" className="w-full">
                      Acessar Mapa
                    </Button>
                  </CardContent>
                </Card>

                <Card
                  className="cursor-pointer hover:border-primary hover:shadow-lg transition-all group"
                  onClick={() => navigate("transferencias")}
                >
                  <CardHeader className="text-center pb-2">
                    <div className="mx-auto p-4 bg-primary/10 rounded-full w-fit group-hover:bg-primary/20 transition-colors">
                      <Truck className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="mt-4">Transferências</CardTitle>
                    <CardDescription>
                      Solicitação e acompanhamento de transferências
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-center">
                    <Button variant="outline" className="w-full">
                      Acessar Transferências
                    </Button>
                  </CardContent>
                </Card>

                <Card
                  className="cursor-pointer hover:border-primary hover:shadow-lg transition-all group"
                  onClick={() => window.open("/transporte", "_blank")}
                >
                  <CardHeader className="text-center pb-2">
                    <div className="mx-auto p-4 bg-primary/10 rounded-full w-fit group-hover:bg-primary/20 transition-colors">
                      <Navigation className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="mt-4">Área do Motorista</CardTitle>
                    <CardDescription>
                      Painel mobile para motoristas em rota
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-center">
                    <Button variant="outline" className="w-full gap-2">
                      <ExternalLink className="h-4 w-4" />
                      Abrir Painel
                    </Button>
                  </CardContent>
                </Card>

                <Card
                  className="cursor-pointer hover:border-primary hover:shadow-lg transition-all group"
                  onClick={() => {
                    const url = "https://www.susfacil.mg.gov.br/administrativo/seguranca/GEN/gen_acesso.php?ini=1";
                    window.open(url, "_blank", "noopener,noreferrer");
                  }}
                >
                  <CardHeader className="text-center pb-2">
                    <div className="mx-auto p-4 bg-primary/10 rounded-full w-fit group-hover:bg-primary/20 transition-colors">
                      <img src={logoSusFacil} alt="SUSFácil MG" className="h-10 w-auto mx-auto" />
                    </div>
                    <CardTitle className="mt-4">Relatório SUSFácil</CardTitle>
                    <CardDescription>
                      Acesso ao sistema SUSFácil MG
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-center">
                    <Button variant="outline" className="w-full gap-2">
                      <img src={logoSusFacil} alt="SUSFácil MG" className="h-5 w-auto" />
                      Acessar SUSFácil
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          }
        />
        <Route
          path="dashboard"
          element={
            <div className="space-y-4">
              <Link to="/dashboard/nir" className="mb-2 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                ← Voltar ao NIR
              </Link>
              <NirDashboardModule />
            </div>
          }
        />
        <Route
          path="mapa-leitos"
          element={
            <div className="space-y-4">
              <Link to="/dashboard/nir" className="mb-2 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                ← Voltar ao NIR
              </Link>
              <MapaLeitosModule />
            </div>
          }
        />
        <Route
          path="transferencias"
          element={
            <div className="space-y-4">
              <Link to="/dashboard/nir" className="mb-2 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                ← Voltar ao NIR
              </Link>
              <TransferenciasModule />
            </div>
          }
        />
        <Route
          path="relatorio"
          element={
            <div className="space-y-4">
              <Link to="/dashboard/nir" className="mb-2 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                ← Voltar ao NIR
              </Link>
              <NucleoTrackerModule />
            </div>
          }
        />
        <Route path="*" element={<Navigate to="/dashboard/nir" replace />} />
      </Route>
    </Routes>
  );
};
// ...existing code...
