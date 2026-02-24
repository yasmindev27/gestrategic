import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { HardHat, Package, Warehouse } from "lucide-react";
import { LoadingState } from "@/components/ui/loading-state";
import { InventarioModule } from "@/components/modules/InventarioModule";

export function EPIsControl() {
  const [loading, setLoading] = useState(true);
  const [movResumo, setMovResumo] = useState<{ usuario_nome: string; responsavel_entrega: string; produto: string; entradas: number; saidas: number }[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchResumo();
  }, []);

  const fetchResumo = async () => {
    try {
      const { data: movData } = await supabase
        .from("movimentacoes_estoque")
        .select("*, produtos(nome)")
        .eq("setor", "seguranca_epis");

      if (movData && movData.length > 0) {
        const userIds = [...new Set(movData.map(m => m.usuario_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", userIds);
        const nameMap = new Map((profiles || []).map(p => [p.user_id, p.full_name]));

        const resumoMap = new Map<string, { usuario_nome: string; responsavel_entrega: string; produto: string; entradas: number; saidas: number }>();
        movData.forEach(m => {
          let colabName = "-";
          const colabMatch = (m.observacao || "").match(/\[COLAB:(.+?)\]/);
          if (colabMatch) {
            colabName = colabMatch[1];
          } else if (m.observacao && m.observacao.trim()) {
            colabName = m.observacao.trim();
          }

          const responsavel = nameMap.get(m.usuario_id) || "-";
          const produto = (m.produtos as any)?.nome || "-";
          const key = `${colabName}_${m.produto_id}`;
          const existing = resumoMap.get(key) || {
            usuario_nome: colabName,
            responsavel_entrega: responsavel,
            produto,
            entradas: 0,
            saidas: 0,
          };
          if (m.tipo === 'entrada') existing.entradas += m.quantidade;
          else existing.saidas += m.quantidade;
          existing.responsavel_entrega = responsavel;
          resumoMap.set(key, existing);
        });
        setMovResumo(Array.from(resumoMap.values()).sort((a, b) => a.usuario_nome.localeCompare(b.usuario_nome)));
      }
    } catch (error) {
      console.error("Erro ao carregar resumo:", error);
      toast({ title: "Erro", description: "Não foi possível carregar o resumo de EPIs.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingState message="Carregando EPIs..." />;
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="inventario" onValueChange={(v) => { if (v === 'resumo') fetchResumo(); }}>
        <TabsList>
          <TabsTrigger value="inventario">
            <Warehouse className="h-4 w-4 mr-2" />
            Inventário
          </TabsTrigger>
          <TabsTrigger value="resumo">
            <Package className="h-4 w-4 mr-2" />
            Resumo por Colaborador
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventario" className="mt-4">
          <InventarioModule setor="seguranca_epis" />
        </TabsContent>

        <TabsContent value="resumo" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardHat className="h-5 w-5" />
                Resumo por Colaborador
              </CardTitle>
              <CardDescription>Movimentações de EPIs por colaborador e tipo de produto</CardDescription>
            </CardHeader>
            <CardContent>
              {movResumo.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">Nenhuma movimentação registrada.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Colaborador</TableHead>
                        <TableHead>Responsável pela Entrega</TableHead>
                        <TableHead>Produto / EPI</TableHead>
                        <TableHead className="text-center">Entradas</TableHead>
                        <TableHead className="text-center">Saídas</TableHead>
                        <TableHead className="text-center">Saldo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movResumo.map((r, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{r.usuario_nome}</TableCell>
                          <TableCell>{r.responsavel_entrega}</TableCell>
                          <TableCell>{r.produto}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="default">{r.entradas}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="destructive">{r.saidas}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">{r.entradas - r.saidas}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
