import { useState, useEffect } from "react";
import { useUserRole } from "@/hooks/useUserRole";
import { useLogAccess } from "@/hooks/useLogAccess";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Calendar, Package } from "lucide-react";
import { InventarioModule } from "./InventarioModule";
import { EscalaLaboratorioModule } from "./EscalaLaboratorioModule";

export const LaboratorioModule = () => {
  const { isAdmin, isLaboratorio, isLoading } = useUserRole();
  const { logAction } = useLogAccess();
  const [activeTab, setActiveTab] = useState("escala");
  
  useEffect(() => {
    logAction("acesso_modulo", "laboratorio");
  }, [logAction]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    logAction("navegacao_aba", "laboratorio", { aba: value });
  };
  
  const hasAccess = isAdmin || isLaboratorio;

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
            Central do Laboratório
          </h2>
          <p className="text-muted-foreground">
            Gerencie escalas mensais e inventário do laboratório
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="escala" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Escala Mensal
          </TabsTrigger>
          <TabsTrigger value="inventario" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Inventário
          </TabsTrigger>
        </TabsList>

        <TabsContent value="escala" className="mt-6">
          <EscalaLaboratorioModule />
        </TabsContent>

        <TabsContent value="inventario" className="mt-6">
          <InventarioModule setor="laboratorio" />
        </TabsContent>
      </Tabs>
    </div>
  );
};
