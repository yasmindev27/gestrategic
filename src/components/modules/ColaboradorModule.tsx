import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserRound, Clock, Calendar, Users } from "lucide-react";
import { useLogAccess } from "@/hooks/useLogAccess";
import { HorasScreen } from "@/components/colaborador/mobile/HorasScreen";
import { EscalaScreen } from "@/components/colaborador/mobile/EscalaScreen";
import { TrocaPlantaoScreen } from "@/components/colaborador/mobile/TrocaPlantaoScreen";

const ColaboradorModule = () => {
  const { logAction } = useLogAccess();
  const [activeTab, setActiveTab] = useState("horas");

  useEffect(() => {
    logAction("acesso_modulo", "colaborador");
  }, [logAction]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserRound className="h-6 w-6 text-primary" />
            Colaborador
          </CardTitle>
          <CardDescription>
            Área do colaborador — horas, escala e trocas de plantão
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="horas" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span className="hidden sm:inline">Horas</span>
                <span className="sm:hidden">Hrs</span>
              </TabsTrigger>
              <TabsTrigger value="escala" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Escala</span>
                <span className="sm:hidden">Esc.</span>
              </TabsTrigger>
              <TabsTrigger value="trocas" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Trocas</span>
                <span className="sm:hidden">Troc.</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="horas" forceMount className="mt-6 data-[state=inactive]:hidden">
              <HorasScreen />
            </TabsContent>

            <TabsContent value="escala" forceMount className="mt-6 data-[state=inactive]:hidden">
              <EscalaScreen />
            </TabsContent>

            <TabsContent value="trocas" forceMount className="mt-6 data-[state=inactive]:hidden">
              <TrocaPlantaoScreen />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ColaboradorModule;
