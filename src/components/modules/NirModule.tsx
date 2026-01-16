import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Ambulance, LayoutDashboard, BedDouble, FileText } from "lucide-react";
import { NirDashboardModule } from "./NirDashboardModule";
import { MapaLeitosModule } from "./MapaLeitosModule";
import { SusFacilManager } from "@/components/nir";

type NirView = "menu" | "dashboard" | "mapa-leitos" | "sus-facil";

export const NirModule = () => {
  const [currentView, setCurrentView] = useState<NirView>("menu");

  if (currentView === "dashboard") {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setCurrentView("menu")} className="mb-2">
          ← Voltar ao NIR
        </Button>
        <NirDashboardModule />
      </div>
    );
  }

  if (currentView === "mapa-leitos") {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setCurrentView("menu")} className="mb-2">
          ← Voltar ao NIR
        </Button>
        <MapaLeitosModule />
      </div>
    );
  }

  if (currentView === "sus-facil") {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setCurrentView("menu")} className="mb-2">
          ← Voltar ao NIR
        </Button>
        <SusFacilManager />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Ambulance className="h-6 w-6 text-primary" />
          Núcleo Interno de Regulação
        </h2>
        <p className="text-muted-foreground">Gestão de leitos e regulação hospitalar</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card 
          className="cursor-pointer hover:border-primary hover:shadow-lg transition-all group"
          onClick={() => setCurrentView("dashboard")}
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
          onClick={() => setCurrentView("mapa-leitos")}
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
          onClick={() => setCurrentView("sus-facil")}
        >
          <CardHeader className="text-center pb-2">
            <div className="mx-auto p-4 bg-primary/10 rounded-full w-fit group-hover:bg-primary/20 transition-colors">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="mt-4">SUS Fácil</CardTitle>
            <CardDescription>
              Regulação de vagas externas e internas
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button variant="outline" className="w-full">
              Acessar SUS Fácil
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
