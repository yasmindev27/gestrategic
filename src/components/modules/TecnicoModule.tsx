import { useState } from "react";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Ticket, Package, Plus } from "lucide-react";
import { ChamadosModule } from "./ChamadosModule";
import { InventarioModule } from "./InventarioModule";

interface TecnicoModuleProps {
  setor: 'ti' | 'manutencao' | 'engenharia_clinica';
}

const setorLabels: Record<string, string> = {
  ti: "TI",
  manutencao: "Manutenção",
  engenharia_clinica: "Engenharia Clínica",
};

export const TecnicoModule = ({ setor }: TecnicoModuleProps) => {
  const { role, isAdmin, isLoading } = useUserRole();
  const [activeTab, setActiveTab] = useState("chamados");
  
  // Técnicos só podem acessar seu próprio setor ou se for admin
  const hasAccess = isAdmin || role === setor;

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
            Gerencie chamados e inventário do seu setor
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="chamados" className="flex items-center gap-2">
            <Ticket className="h-4 w-4" />
            Chamados
          </TabsTrigger>
          <TabsTrigger value="inventario" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Inventário
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chamados" className="mt-6">
          <ChamadosModule setor={setor} />
        </TabsContent>

        <TabsContent value="inventario" className="mt-6">
          <InventarioModule setor={setor} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
