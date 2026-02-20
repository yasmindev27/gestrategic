import { useState, useEffect, lazy, Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, FileText, ShieldX, ClipboardList, Users, UserCog, AlertTriangle, Loader2 } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { useLogAccess } from "@/hooks/useLogAccess";
import { BancoHorasSection } from "@/components/rhdp/BancoHorasSection";
import { CentralAtestadosSection } from "@/components/rhdp/CentralAtestadosSection";
import { FormulariosSection } from "@/components/rhdp/FormulariosSection";
import { MovimentacoesDisciplinarSection } from "@/components/rhdp/MovimentacoesDisciplinarSection";
import { ProfissionaisSaude } from "@/components/rh";

const EquipeModule = lazy(() => import("@/components/modules/EquipeModule"));

export const RHDPModule = () => {
  const { isAdmin, hasRole, isLoading } = useUserRole();
  const { logAction } = useLogAccess();
  const [activeTab, setActiveTab] = useState("banco-horas");

  useEffect(() => {
    logAction("acesso_modulo", "rhdp");
  }, [logAction]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    logAction("navegacao_aba", "rhdp", { aba: value });
  };

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
            <UserCog className="h-6 w-6 text-primary" />
            Recursos Humanos / Departamento Pessoal
          </CardTitle>
          <CardDescription>
            Central de gestão de pessoas, cadastros, escalas, banco de horas e atestados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="banco-horas" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span className="hidden sm:inline">Banco de Horas</span>
                <span className="sm:hidden">Horas</span>
              </TabsTrigger>
              <TabsTrigger value="atestados" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Atestados</span>
                <span className="sm:hidden">Atest.</span>
              </TabsTrigger>
              <TabsTrigger value="formularios" className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                <span className="hidden sm:inline">Formulários</span>
                <span className="sm:hidden">Forms</span>
              </TabsTrigger>
              <TabsTrigger value="disciplinar" className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                <span className="hidden sm:inline">Disciplinar</span>
                <span className="sm:hidden">Discip.</span>
              </TabsTrigger>
              <TabsTrigger value="profissionais" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Profissionais</span>
                <span className="sm:hidden">Prof.</span>
              </TabsTrigger>
              <TabsTrigger value="equipe" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Equipe</span>
                <span className="sm:hidden">Equipe</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="banco-horas" className="mt-6">
              <BancoHorasSection />
            </TabsContent>

            <TabsContent value="atestados" className="mt-6">
              <CentralAtestadosSection />
            </TabsContent>

            <TabsContent value="formularios" className="mt-6">
              <FormulariosSection />
            </TabsContent>

            <TabsContent value="disciplinar" className="mt-6">
              <MovimentacoesDisciplinarSection />
            </TabsContent>

            <TabsContent value="profissionais" className="mt-6">
              <ProfissionaisSaude />
            </TabsContent>

            <TabsContent value="equipe" className="mt-6">
              <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
                <EquipeModule />
              </Suspense>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
