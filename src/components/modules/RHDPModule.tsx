import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, FileText, ShieldX } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { BancoHorasSection } from "@/components/rhdp/BancoHorasSection";
import { CentralAtestadosSection } from "@/components/rhdp/CentralAtestadosSection";

export const RHDPModule = () => {
  const { isAdmin, hasRole, isLoading } = useUserRole();
  const [activeTab, setActiveTab] = useState("banco-horas");

  const isRHDP = hasRole("rh_dp");
  const hasAccess = isAdmin || isRHDP;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <ShieldX className="h-12 w-12 text-destructive mx-auto" />
          <p className="text-muted-foreground">Você não tem acesso a este módulo.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Recursos Humanos / Departamento Pessoal
          </CardTitle>
          <CardDescription>
            Gerenciamento de banco de horas e atestados dos colaboradores
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="banco-horas" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Banco de Horas
              </TabsTrigger>
              <TabsTrigger value="atestados" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Central de Atestados
              </TabsTrigger>
            </TabsList>

            <TabsContent value="banco-horas" className="mt-6">
              <BancoHorasSection />
            </TabsContent>

            <TabsContent value="atestados" className="mt-6">
              <CentralAtestadosSection />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
