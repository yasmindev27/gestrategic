import { useState } from "react";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Ticket, Package, ExternalLink, Monitor, Wrench, Activity, ShoppingCart } from "lucide-react";
import { InventarioModule } from "./InventarioModule";
import { GestaoAtivos, PreventivasManager, DisponibilidadeDashboard, PedidosCompraSection } from "@/components/tecnico";

interface TecnicoModuleProps {
  setor: 'ti' | 'manutencao' | 'engenharia_clinica' | 'nir';
  onOpenExternal?: (url: string, title: string) => void;
}

const setorLabels: Record<string, string> = {
  ti: "TI",
  manutencao: "Manutenção",
  engenharia_clinica: "Engenharia Clínica",
  nir: "NIR",
};

export const TecnicoModule = ({ setor, onOpenExternal }: TecnicoModuleProps) => {
  const { role, isAdmin, isLoading } = useUserRole();
  const [activeTab, setActiveTab] = useState("ativos");
  
  const hasAccess = isAdmin || role === setor;

  const handleAbrirChamados = () => {
    const url = "https://suporte.santacasachavantes.org/index.php";
    if (onOpenExternal) {
      onOpenExternal(url, "GLPI - Suporte");
    } else {
      window.open(url, "_blank");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span>Você não tem permissão para acessar este módulo.</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            Central do Técnico - {setorLabels[setor]}
          </h2>
          <p className="text-muted-foreground">
            Gestão de ativos, preventivas, inventário e disponibilidade
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6 max-w-3xl">
          <TabsTrigger value="ativos" className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            <span className="hidden sm:inline">Ativos</span>
          </TabsTrigger>
          <TabsTrigger value="preventivas" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            <span className="hidden sm:inline">Preventivas</span>
          </TabsTrigger>
          <TabsTrigger value="disponibilidade" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Disponibilidade</span>
          </TabsTrigger>
          <TabsTrigger value="inventario" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Inventário</span>
          </TabsTrigger>
          <TabsTrigger value="pedidos" className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            <span className="hidden sm:inline">Pedidos</span>
          </TabsTrigger>
          <TabsTrigger value="chamados" className="flex items-center gap-2">
            <Ticket className="h-4 w-4" />
            <span className="hidden sm:inline">Chamados</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ativos" className="mt-6">
          <GestaoAtivos setor={setor} />
        </TabsContent>

        <TabsContent value="preventivas" className="mt-6">
          <PreventivasManager setor={setor} />
        </TabsContent>

        <TabsContent value="disponibilidade" className="mt-6">
          <DisponibilidadeDashboard setor={setor} />
        </TabsContent>

        <TabsContent value="inventario" className="mt-6">
          <InventarioModule setor={setor} />
        </TabsContent>

        <TabsContent value="pedidos" className="mt-6">
          <PedidosCompraSection setor={setor} />
        </TabsContent>

        <TabsContent value="chamados" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ticket className="h-5 w-5" />
                Sistema de Chamados - GLPI
              </CardTitle>
              <CardDescription>
                Acesse o GLPI para gerenciar chamados de {setorLabels[setor]}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                O gerenciamento de chamados é realizado através do GLPI. Clique no botão abaixo para acessar o sistema.
              </p>
              <Button onClick={handleAbrirChamados} size="lg" className="gap-2">
                <ExternalLink className="h-5 w-5" />
                Acessar GLPI
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
