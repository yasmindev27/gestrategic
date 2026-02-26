import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, FileText, ShieldX, ClipboardList, Users, UserCog, AlertTriangle, Stethoscope, BarChart3, UserCheck, UserRound } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { useLogAccess } from "@/hooks/useLogAccess";
import { BancoHorasSection } from "@/components/rhdp/BancoHorasSection";
import { CentralAtestadosSection } from "@/components/rhdp/CentralAtestadosSection";
import { FormulariosSection } from "@/components/rhdp/FormulariosSection";
import { MovimentacoesDisciplinarSection } from "@/components/rhdp/MovimentacoesDisciplinarSection";
import { ProfissionaisSaude } from "@/components/rh";
import { ASOControl } from "@/components/seguranca-trabalho";
import { AvaliacaoDesempenhoSection } from "@/components/rhdp/AvaliacaoDesempenhoSection";
import { AvaliacaoExperienciaSection } from "@/components/rhdp/AvaliacaoExperienciaSection";
import { JustificativaPontoSection } from "@/components/rhdp/JustificativaPontoSection";

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
            <TabsList className="grid w-full grid-cols-9">
              <TabsTrigger value="colaborador" className="flex items-center gap-2">
                <UserRound className="h-4 w-4" />
                <span className="hidden sm:inline">Colaborador</span>
                <span className="sm:hidden">Colab.</span>
              </TabsTrigger>
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
              <TabsTrigger value="aso" className="flex items-center gap-2">
                <Stethoscope className="h-4 w-4" />
                <span className="hidden sm:inline">ASO</span>
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
              <TabsTrigger value="avaliacao" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Avaliação/PDI</span>
                <span className="sm:hidden">Aval.</span>
              </TabsTrigger>
              <TabsTrigger value="experiencia" className="flex items-center gap-2">
                <UserCheck className="h-4 w-4" />
                <span className="hidden sm:inline">Av. Experiência</span>
                <span className="sm:hidden">Exp.</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="colaborador" className="mt-6">
              <JustificativaPontoSection />
            </TabsContent>

            <TabsContent value="banco-horas" className="mt-6">
              <BancoHorasSection />
            </TabsContent>

            <TabsContent value="atestados" className="mt-6">
              <CentralAtestadosSection />
            </TabsContent>

            <TabsContent value="aso" className="mt-6">
              <ASOControl />
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

            <TabsContent value="avaliacao" className="mt-6">
              <AvaliacaoDesempenhoSection />
            </TabsContent>

            <TabsContent value="experiencia" className="mt-6">
              <AvaliacaoExperienciaSection />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
