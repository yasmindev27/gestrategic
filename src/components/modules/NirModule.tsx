import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Ambulance, LayoutDashboard, BedDouble, ExternalLink, Truck } from "lucide-react";
import { NirDashboardModule } from "./NirDashboardModule";
import { MapaLeitosModule } from "./MapaLeitosModule";
import { SalusImportModule, ListaFaltantesSalus } from "@/components/nir";
import { TransferenciasModule } from "@/components/nir/TransferenciasModule";
import { useLogAccess } from "@/hooks/useLogAccess";
import logoSusFacil from "@/assets/logo-susfacil.png";

type NirView = "menu" | "dashboard" | "mapa-leitos" | "transferencias";

interface NirModuleProps {
  onOpenExternal?: (url: string, title: string) => void;
}

export const NirModule = ({ onOpenExternal }: NirModuleProps) => {
  const [currentView, setCurrentView] = useState<NirView>("menu");
  const { logAction } = useLogAccess();

  useEffect(() => {
    logAction("acesso_modulo", "nir");
  }, [logAction]);

  const handleViewChange = (view: NirView) => {
    setCurrentView(view);
    logAction("navegacao_view", "nir", { view });
  };

  if (currentView === "dashboard") {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => handleViewChange("menu")} className="mb-2">
          ← Voltar ao NIR
        </Button>
        <NirDashboardModule />
      </div>
    );
  }

  if (currentView === "mapa-leitos") {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => handleViewChange("menu")} className="mb-2">
          ← Voltar ao NIR
        </Button>
        <MapaLeitosModule />
      </div>
    );
  }

  if (currentView === "transferencias") {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => handleViewChange("menu")} className="mb-2">
          ← Voltar ao NIR
        </Button>
        <TransferenciasModule />
      </div>
    );
  }


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Ambulance className="h-6 w-6 text-primary" />
            Núcleo Interno de Regulação
          </h2>
          <p className="text-muted-foreground">Gestão de leitos e regulação hospitalar</p>
        </div>
        <SalusImportModule />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card 
          className="cursor-pointer hover:border-primary hover:shadow-lg transition-all group"
          onClick={() => handleViewChange("dashboard")}
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
          onClick={() => handleViewChange("mapa-leitos")}
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
          onClick={() => handleViewChange("transferencias")}
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
          onClick={() => {
            const url = "https://www.susfacil.mg.gov.br/administrativo/seguranca/GEN/gen_acesso.php?ini=1";
            window.open(url, "_blank", "noopener,noreferrer");
          }}
        >
          <CardHeader className="text-center pb-2">
            <div className="mx-auto p-4 bg-white rounded-lg w-fit group-hover:shadow-md transition-all">
              <img src={logoSusFacil} alt="SUS Fácil MG" className="h-16 w-auto" />
            </div>
            <CardTitle className="mt-4">SUS Fácil MG</CardTitle>
            <CardDescription>
              Central de Regulação - Portal Oficial
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button variant="outline" className="w-full gap-2">
              <ExternalLink className="h-4 w-4" />
              Acessar Portal
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Prontuários Faltantes - Salus */}
      <ListaFaltantesSalus />
    </div>
  );
};
