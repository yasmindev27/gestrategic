import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CheckCircle, XCircle, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";

export const AprovacaoPontoJustificativa = () => {
  const queryClient = useQueryClient();
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [decisao, setDecisao] = useState<"aprovado" | "reprovado" | "">("");
  const [justificativaAprovacao, setJustificativaAprovacao] = useState("");
  const [salvando, setSalvando] = useState(false);

  const { data: registros = [] } = useQuery({
    queryKey: ["justificativas_ponto_aprovacao"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("justificativas_ponto")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
  });

  const pendentes = registros.filter((r: any) => r.status === "pendente");
  const processados = registros.filter((r: any) => r.status !== "pendente");

  const handleAprovar = async () => {
    if (!selectedRecord || !decisao) {
      toast.error("Selecione aprovar ou reprovar.");
      return;
    }
    if (decisao === "reprovado" && !justificativaAprovacao.trim()) {
      toast.error("Informe a justificativa para reprovação.");
      return;
    }
    setSalvando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("justificativas_ponto")
        .update({
          status: decisao,
          aprovado_por: user?.id,
          aprovado_por_nome: user?.user_metadata?.full_name || user?.email || "",
          aprovado_em: new Date().toISOString(),
          justificativa_aprovacao: justificativaAprovacao || null,
        } as any)
        .eq("id", selectedRecord.id);
      if (error) throw error;
      toast.success(`Justificativa ${decisao === "aprovado" ? "aprovada" : "reprovada"} com sucesso!`);
      setSelectedRecord(null);
      setDecisao("");
      setJustificativaAprovacao("");
      queryClient.invalidateQueries({ queryKey: ["justificativas_ponto_aprovacao"] });
    } catch (e: any) {
      toast.error(e.message || "Erro ao processar.");
    } finally {
      setSalvando(false);
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "aprovado": return <Badge className="bg-green-600">Aprovado</Badge>;
      case "reprovado": return <Badge variant="destructive">Reprovado</Badge>;
      default: return <Badge variant="outline">Pendente</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Justificativas Pendentes de Aprovação</h3>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Colaborador</TableHead>
                <TableHead>Setor</TableHead>
                <TableHead>Min. Excedentes</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendentes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nenhuma justificativa pendente.
                  </TableCell>
                </TableRow>
              )}
              {pendentes.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell>{r.data_ocorrencia ? format(new Date(r.data_ocorrencia + "T00:00:00"), "dd/MM/yyyy") : "-"}</TableCell>
                  <TableCell className="font-medium">{r.colaborador_nome}</TableCell>
                  <TableCell>{r.setor || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={r.minutos_excedentes > 0 ? "default" : "secondary"}>
                      {r.minutos_excedentes} min
                    </Badge>
                  </TableCell>
                  <TableCell>{statusBadge(r.status)}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => setSelectedRecord(r)} className="gap-1">
                      <Eye className="h-3 w-3" /> Analisar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {processados.length > 0 && (
        <>
          <h3 className="text-lg font-semibold mt-6">Histórico de Aprovações</h3>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Min. Excedentes</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Aprovado por</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processados.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.data_ocorrencia ? format(new Date(r.data_ocorrencia + "T00:00:00"), "dd/MM/yyyy") : "-"}</TableCell>
                      <TableCell>{r.colaborador_nome}</TableCell>
                      <TableCell>{r.minutos_excedentes} min</TableCell>
                      <TableCell>{statusBadge(r.status)}</TableCell>
                      <TableCell>{r.aprovado_por_nome || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* Dialog de aprovação */}
      <Dialog open={!!selectedRecord} onOpenChange={(open) => { if (!open) { setSelectedRecord(null); setDecisao(""); setJustificativaAprovacao(""); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Analisar Justificativa de Ponto</DialogTitle>
          </DialogHeader>

          {selectedRecord && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="font-semibold">Colaborador:</span> {selectedRecord.colaborador_nome}</div>
                <div><span className="font-semibold">Cargo:</span> {selectedRecord.cargo_funcao || "-"}</div>
                <div><span className="font-semibold">Setor:</span> {selectedRecord.setor || "-"}</div>
                <div><span className="font-semibold">Data:</span> {selectedRecord.data_ocorrencia ? format(new Date(selectedRecord.data_ocorrencia + "T00:00:00"), "dd/MM/yyyy") : "-"}</div>
                <div><span className="font-semibold">Entrada prevista:</span> {selectedRecord.jornada_contratual_entrada || "-"}</div>
                <div><span className="font-semibold">Saída prevista:</span> {selectedRecord.jornada_contratual_saida || "-"}</div>
                <div><span className="font-semibold">Entrada real:</span> {selectedRecord.jornada_registrada_entrada || "-"}</div>
                <div><span className="font-semibold">Saída real:</span> {selectedRecord.jornada_registrada_saida || "-"}</div>
                <div className="col-span-2">
                  <span className="font-semibold">Minutos excedentes:</span>{" "}
                  <Badge variant={selectedRecord.minutos_excedentes > 0 ? "default" : "secondary"}>
                    {selectedRecord.minutos_excedentes} min
                  </Badge>
                </div>
              </div>

              <div>
                <Label className="font-semibold">Justificativa do colaborador:</Label>
                <p className="text-sm mt-1 p-2 bg-muted rounded">{selectedRecord.justificativa || "Não informada"}</p>
              </div>

              {selectedRecord.observacoes && (
                <div>
                  <Label className="font-semibold">Observações:</Label>
                  <p className="text-sm mt-1 p-2 bg-muted rounded">{selectedRecord.observacoes}</p>
                </div>
              )}

              <div className="border-t pt-4 space-y-3">
                <Label className="font-semibold">Decisão:</Label>
                <RadioGroup value={decisao} onValueChange={(v) => setDecisao(v as "aprovado" | "reprovado")}>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="aprovado" id="aprovar" />
                    <label htmlFor="aprovar" className="flex items-center gap-1 text-sm cursor-pointer">
                      <CheckCircle className="h-4 w-4 text-green-600" /> Aprovar
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="reprovado" id="reprovar" />
                    <label htmlFor="reprovar" className="flex items-center gap-1 text-sm cursor-pointer">
                      <XCircle className="h-4 w-4 text-destructive" /> Reprovar
                    </label>
                  </div>
                </RadioGroup>

                <div>
                  <Label className="font-semibold">Justificativa da decisão {decisao === "reprovado" ? "(obrigatória)" : "(opcional)"}</Label>
                  <Textarea
                    value={justificativaAprovacao}
                    onChange={(e) => setJustificativaAprovacao(e.target.value)}
                    placeholder="Justifique sua decisão..."
                    rows={3}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedRecord(null)}>Cancelar</Button>
            <Button onClick={handleAprovar} disabled={salvando || !decisao}>
              {salvando ? "Processando..." : "Confirmar Decisão"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
