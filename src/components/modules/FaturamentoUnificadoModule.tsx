import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileOutput, Receipt } from "lucide-react";
import { SaidaProntuariosModule } from "./SaidaProntuariosModule";
import { FaturamentoModule } from "./FaturamentoModule";
import { useUserRole } from "@/hooks/useUserRole";

export const FaturamentoUnificadoModule = () => {
  const [activeTab, setActiveTab] = useState("saida");
  const { isFaturamento, isAdmin } = useUserRole();

  // Apenas Faturamento e Admin veem a aba de Avaliação
  const showAvaliacaoTab = isFaturamento || isAdmin;

  // Perfis sem permissão de avaliação veem apenas Saída de Prontuários
  if (!showAvaliacaoTab) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Faturamento</h2>
          <p className="text-muted-foreground">Gestão de prontuários e faturamento</p>
        </div>
        <SaidaProntuariosModule />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Faturamento</h2>
        <p className="text-muted-foreground">Gestão de prontuários e faturamento</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="saida" className="flex items-center gap-2">
            <FileOutput className="h-4 w-4" />
            Saída Prontuários
          </TabsTrigger>
          <TabsTrigger value="avaliacao" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Avaliação
          </TabsTrigger>
        </TabsList>

        <TabsContent value="saida" forceMount className="mt-6 data-[state=inactive]:hidden">
          <SaidaProntuariosModule />
        </TabsContent>

        <TabsContent value="avaliacao" forceMount className="mt-6 data-[state=inactive]:hidden">
          <FaturamentoModule />
        </TabsContent>
      </Tabs>
    </div>
  );
};
