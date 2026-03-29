import React, { useEffect } from "react";
import { Stethoscope, BarChart3, ClipboardCheck, Activity } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLogAccess } from "@/hooks/useLogAccess";
import { IndicadoresNSP, IndicadoresUPA } from "@/components/indicadores";
import AvaliacaoProntuariosCC from "@/components/medicos/AvaliacaoProntuariosCC";

const MedicosModule = ({ onOpenExternal }: { onOpenExternal?: (url: string, title: string) => void }) => {
  const { logAction } = useLogAccess();

  useEffect(() => {
    logAction("acesso_modulo", "medicos");
  }, [logAction]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Stethoscope className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Módulo Médicos</h2>
            <p className="text-sm text-muted-foreground">Indicadores de internação e avaliação de prontuários</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="indicadores-nsp">
        <TabsList className="h-auto p-1">
          <TabsTrigger value="indicadores-nsp" className="gap-2 text-sm px-4 py-2">
            <BarChart3 className="h-4 w-4" />
            Indicadores NSP
          </TabsTrigger>
          <TabsTrigger value="perfil-epidemiologico" className="gap-2 text-sm px-4 py-2">
            <Activity className="h-4 w-4" />
            Perfil Epidemiológico
          </TabsTrigger>
          <TabsTrigger value="avaliacao-prontuarios" className="gap-2 text-sm px-4 py-2">
            <ClipboardCheck className="h-4 w-4" />
            Avaliação de Prontuários
          </TabsTrigger>
        </TabsList>

        <TabsContent value="indicadores-nsp" className="mt-6 data-[state=inactive]:hidden" forceMount>
          <IndicadoresNSP />
        </TabsContent>

        <TabsContent value="perfil-epidemiologico" className="mt-6 data-[state=inactive]:hidden" forceMount>
          <IndicadoresUPA />
        </TabsContent>

        <TabsContent value="avaliacao-prontuarios" className="mt-6 data-[state=inactive]:hidden" forceMount>
          <AvaliacaoProntuariosCC />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MedicosModule;
