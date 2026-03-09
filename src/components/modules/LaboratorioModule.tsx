import { useState, useEffect } from "react";
import { useUserRole } from "@/hooks/useUserRole";
import { useLogAccess } from "@/hooks/useLogAccess";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Calendar, Package, FlaskConical } from "lucide-react";
import { InventarioModule } from "./InventarioModule";
import { EscalaTecEnfermagem } from "@/components/enfermagem";
import ExternalViewer from "@/components/ExternalViewer";

const RESULTADOS_URL = "https://portal.worklabweb.com.br/resultados-on-line/2079";

export const LaboratorioModule = () => {
  const { isAdmin, isLaboratorio, isMedicos, isGestor, isLoading } = useUserRole();
  const { logAction } = useLogAccess();
  const isMedicosOnly = (isMedicos || isGestor) && !isAdmin && !isLaboratorio;
  const [activeTab, setActiveTab] = useState(isMedicosOnly ? "resultados" : "escala");
  
  useEffect(() => {
    logAction("acesso_modulo", "laboratorio");
  }, [logAction]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    logAction("navegacao_aba", "laboratorio", { aba: value });
  };
  
  const hasAccess = isAdmin || isLaboratorio || isMedicos || isGestor;

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
            Gerencie escalas mensais, inventário e resultados de exames
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        {!isMedicosOnly ? (
          <TabsList className="grid w-full grid-cols-3 max-w-lg">
            <TabsTrigger value="escala" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Escala Mensal
            </TabsTrigger>
            <TabsTrigger value="inventario" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Inventário
            </TabsTrigger>
            <TabsTrigger value="resultados" className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4" />
              Resultados
            </TabsTrigger>
          </TabsList>
        ) : (
          <TabsList className="max-w-xs">
            <TabsTrigger value="resultados" className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4" />
              Resultados de Exames
            </TabsTrigger>
          </TabsList>
        )}

        {!isMedicosOnly && (
          <>
            <TabsContent value="escala" className="mt-6">
              <EscalaLaboratorioModule />
            </TabsContent>

            <TabsContent value="inventario" className="mt-6">
              <InventarioModule setor="laboratorio" />
            </TabsContent>
          </>
        )}

        <TabsContent value="resultados" className="mt-6">
          <ExternalViewer
            url={RESULTADOS_URL}
            title="Resultados de Exames - Laboratório Villac"
            onClose={() => setActiveTab(isMedicosOnly ? "resultados" : "escala")}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
