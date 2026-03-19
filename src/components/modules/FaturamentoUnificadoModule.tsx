import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileOutput, Receipt } from "lucide-react";
import { SaidaProntuariosModule } from "./SaidaProntuariosModule";
import { FaturamentoModule } from "./FaturamentoModule";
import { useUserRole } from "@/hooks/useUserRole";

export const FaturamentoUnificadoModule = () => {
  const [activeTab, setActiveTab] = useState("saida");
  const { isRecepcao, isClassificacao, isNir, isFaturamento, isAdmin } = useUserRole();

  // Apenas Faturamento e Admin veem a aba de Avaliação
  const showAvaliacaoTab = isFaturamento || isAdmin;

  // Recepção, Classificação e NIR só veem a aba de Saída de Prontuários
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

        <TabsContent value="saida" className="mt-6">
          <SaidaProntuariosModule />
        </TabsContent>

        <TabsContent value="avaliacao" className="mt-6">
          <FaturamentoModule />
        </TabsContent>
      </Tabs>
    </div>
  );
};
