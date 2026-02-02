import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shirt, ArrowUpDown, Package, BarChart3 } from "lucide-react";
import { RoupariaMovimentacao } from "@/components/rouparia/RoupariaMovimentacao";
import { RoupariaEstoque } from "@/components/rouparia/RoupariaEstoque";
import { RoupariaCategorias } from "@/components/rouparia/RoupariaCategorias";
import { RoupariaRelatorios } from "@/components/rouparia/RoupariaRelatorios";
import { useUserRole } from "@/hooks/useUserRole";

export function RoupariaModule() {
  const [activeTab, setActiveTab] = useState("movimentacao");
  const { isAdmin, isGestor } = useUserRole();
  const canManage = isAdmin || isGestor;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Shirt className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>Controle de Rouparia</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Gestão de entrada e saída de itens por código de barras
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="movimentacao" className="flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4" />
                <span className="hidden sm:inline">Movimentação</span>
              </TabsTrigger>
              <TabsTrigger value="estoque" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                <span className="hidden sm:inline">Estoque</span>
              </TabsTrigger>
              <TabsTrigger value="categorias" className="flex items-center gap-2">
                <Shirt className="h-4 w-4" />
                <span className="hidden sm:inline">Categorias</span>
              </TabsTrigger>
              <TabsTrigger value="relatorios" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Relatórios</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="movimentacao" className="mt-6">
              <RoupariaMovimentacao />
            </TabsContent>

            <TabsContent value="estoque" className="mt-6">
              <RoupariaEstoque canManage={canManage} />
            </TabsContent>

            <TabsContent value="categorias" className="mt-6">
              <RoupariaCategorias canManage={canManage} />
            </TabsContent>

            <TabsContent value="relatorios" className="mt-6">
              <RoupariaRelatorios />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
