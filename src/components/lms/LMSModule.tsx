import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUserRole } from "@/hooks/useUserRole";
import { GraduationCap, Calendar, BookOpen, BarChart3, ClipboardList, HelpCircle, User } from "lucide-react";
import CronogramaAdmin from "./CronogramaAdmin";
import LNTDManager from "./LNTDManager";
import DashboardIndicadores from "./DashboardIndicadores";
import ListaPresenca from "./ListaPresenca";
import QuizManager from "./QuizManager";
import PortalAluno from "./PortalAluno";

export default function LMSModule() {
  const { isAdmin, isGestor, isRHDP, isQualidade, isSeguranca, isFaturamento } = useUserRole();
  const isManager = isAdmin || isGestor || isRHDP || isQualidade || isSeguranca || isFaturamento;

  if (!isManager) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <GraduationCap className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Portal de Treinamentos</h1>
            <p className="text-muted-foreground text-sm">Acesse seus treinamentos e avaliações</p>
          </div>
        </div>
        <PortalAluno />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <GraduationCap className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Área de Aprendizado</h1>
          <p className="text-muted-foreground text-sm">Gerencie treinamentos, avaliações e capacitações</p>
        </div>
      </div>

      <Tabs defaultValue="cronograma" className="w-full">
        <TabsList className="grid grid-cols-6 w-full max-w-3xl">
          <TabsTrigger value="cronograma" className="text-xs"><Calendar className="h-4 w-4 mr-1" /> Cronograma</TabsTrigger>
          <TabsTrigger value="lntd" className="text-xs"><BookOpen className="h-4 w-4 mr-1" /> LNTD</TabsTrigger>
          <TabsTrigger value="quiz" className="text-xs"><HelpCircle className="h-4 w-4 mr-1" /> Quiz</TabsTrigger>
          <TabsTrigger value="indicadores" className="text-xs"><BarChart3 className="h-4 w-4 mr-1" /> Indicadores</TabsTrigger>
          <TabsTrigger value="presenca" className="text-xs"><ClipboardList className="h-4 w-4 mr-1" /> Presença</TabsTrigger>
          <TabsTrigger value="portal" className="text-xs"><User className="h-4 w-4 mr-1" /> Portal</TabsTrigger>
        </TabsList>

        <TabsContent value="cronograma"><CronogramaAdmin /></TabsContent>
        <TabsContent value="lntd"><LNTDManager /></TabsContent>
        <TabsContent value="quiz"><QuizManager /></TabsContent>
        <TabsContent value="indicadores"><DashboardIndicadores /></TabsContent>
        <TabsContent value="presenca"><ListaPresenca /></TabsContent>
        <TabsContent value="portal"><PortalAluno /></TabsContent>
      </Tabs>
    </div>
  );
}
