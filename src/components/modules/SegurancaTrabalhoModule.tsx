import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shirt, HardHat, Syringe, ClipboardCheck, Bell, Stethoscope } from "lucide-react";
import {
  UniformesControl,
  EPIsControl,
  VacinasControl,
  RondasControl,
  NotificacoesControl,
  ASOControl
} from "@/components/seguranca-trabalho";
import { useLogAccess } from "@/hooks/useLogAccess";

export function SegurancaTrabalhoModule() {
  const [activeTab, setActiveTab] = useState("aso");
  const { logAction } = useLogAccess();

  useEffect(() => {
    logAction("acesso_modulo", "seguranca_trabalho");
  }, [logAction]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    logAction("navegacao_aba", "seguranca_trabalho", { aba: value });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Segurança do Trabalho</h1>
        <p className="text-muted-foreground">
          Gestão de ASOs, uniformes, EPIs, vacinação e rondas de segurança
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="aso" className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4" />
            <span className="hidden sm:inline">ASO</span>
          </TabsTrigger>
          <TabsTrigger value="uniformes" className="flex items-center gap-2">
            <Shirt className="h-4 w-4" />
            <span className="hidden sm:inline">Uniformes</span>
          </TabsTrigger>
          <TabsTrigger value="epis" className="flex items-center gap-2">
            <HardHat className="h-4 w-4" />
            <span className="hidden sm:inline">EPIs</span>
          </TabsTrigger>
          <TabsTrigger value="vacinas" className="flex items-center gap-2">
            <Syringe className="h-4 w-4" />
            <span className="hidden sm:inline">Vacinação</span>
          </TabsTrigger>
          <TabsTrigger value="rondas" className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Rondas</span>
          </TabsTrigger>
          <TabsTrigger value="notificacoes" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notificações</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="aso" className="mt-6">
          <ASOControl />
        </TabsContent>

        <TabsContent value="uniformes" className="mt-6">
          <UniformesControl />
        </TabsContent>

        <TabsContent value="epis" className="mt-6">
          <EPIsControl />
        </TabsContent>

        <TabsContent value="vacinas" className="mt-6">
          <VacinasControl />
        </TabsContent>

        <TabsContent value="rondas" className="mt-6">
          <RondasControl />
        </TabsContent>

        <TabsContent value="notificacoes" className="mt-6">
          <NotificacoesControl />
        </TabsContent>
      </Tabs>
    </div>
  );
}
