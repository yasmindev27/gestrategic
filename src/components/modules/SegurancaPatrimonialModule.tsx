import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, ShieldAlert, Users, Construction, FileText, Bell } from "lucide-react";
import {
  RondasPatrimoniais,
  GestaoConflitos,
  ControleVisitantes,
  MapaDanos,
  PassagemPlantao,
} from "@/components/seguranca-patrimonial";
import { PainelSeguranca } from "@/components/seguranca";
import { useLogAccess } from "@/hooks/useLogAccess";

export function SegurancaPatrimonialModule() {
  const [activeTab, setActiveTab] = useState("painel");
  const { logAction } = useLogAccess();

  useEffect(() => {
    logAction("acesso_modulo", "seguranca_patrimonial");
  }, [logAction]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    logAction("navegacao_aba", "seguranca_patrimonial", { aba: value });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Segurança Patrimonial</h1>
        <p className="text-muted-foreground">
          Vigilância desarmada, prevenção e controle patrimonial da UPA
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="painel" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Painel</span>
          </TabsTrigger>
          <TabsTrigger value="rondas" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span className="hidden sm:inline">Rondas</span>
          </TabsTrigger>
          <TabsTrigger value="conflitos" className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" />
            <span className="hidden sm:inline">Conflitos</span>
          </TabsTrigger>
          <TabsTrigger value="visitantes" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Visitantes</span>
          </TabsTrigger>
          <TabsTrigger value="danos" className="flex items-center gap-2">
            <Construction className="h-4 w-4" />
            <span className="hidden sm:inline">Danos</span>
          </TabsTrigger>
          <TabsTrigger value="passagem" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Plantão</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="painel" className="mt-6"><PainelSeguranca /></TabsContent>
        <TabsContent value="rondas" className="mt-6"><RondasPatrimoniais /></TabsContent>
        <TabsContent value="conflitos" className="mt-6"><GestaoConflitos /></TabsContent>
        <TabsContent value="visitantes" className="mt-6"><ControleVisitantes /></TabsContent>
        <TabsContent value="danos" className="mt-6"><MapaDanos /></TabsContent>
        <TabsContent value="passagem" className="mt-6"><PassagemPlantao /></TabsContent>
      </Tabs>
    </div>
  );
}
