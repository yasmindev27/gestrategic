import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, XCircle, Clock, Loader2, ClipboardCheck, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export function AprovacaoExtensaoJornada() {
  const { toast } = useToast();
  const [solicitacoes, setSolicitacoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState("pendente");
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [observacao, setObservacao] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [aprovadorId, setAprovadorId] = useState("");
  const [aprovadorNome, setAprovadorNome] = useState("");

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setAprovadorId(user.id);
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .single();
      if (profile) setAprovadorNome(profile.full_name || "");
    }
    loadUser();
  }, []);

  useEffect(() => {
    loadSolicitacoes();
  }, [filtroStatus]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("extensao-jornada-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "justificativas_extensao_jornada" }, () => {
        loadSolicitacoes();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [filtroStatus]);

  const loadSolicitacoes = async () => {
    setLoading(true);
    let query = supabase
      .from("justificativas_extensao_jornada")
      .select("*")
      .order("created_at", { ascending: false });

    if (filtroStatus !== "todos") {
      query = query.eq("status", filtroStatus);
    }

    const { data } = await query.limit(50);
    setSolicitacoes(data || []);
    setLoading(false);
  };

  const handleAction = async (status: "aprovado" | "rejeitado") => {
    if (!selectedItem) return;
    setActionLoading(true);

    const { error } = await supabase
      .from("justificativas_extensao_jornada")
      .update({
        status,
        aprovado_por: aprovadorId,
        aprovado_por_nome: aprovadorNome,
        aprovado_em: new Date().toISOString(),
        observacao_aprovador: observacao || null,
      })
      .eq("id", selectedItem.id);

    setActionLoading(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: status === "aprovado" ? "Solicitação aprovada" : "Solicitação rejeitada" });
      setSelectedItem(null);
      setObservacao("");
      loadSolicitacoes();
    }
  };

  const formatMin = (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h > 0 ? `${h}h${m > 0 ? String(m).padStart(2, "0") + "min" : ""}` : `${m}min`;
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "aprovado":
        return <Badge className="bg-green-600 text-white"><CheckCircle className="h-3 w-3 mr-1" />Aprovado</Badge>;
      case "rejeitado":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejeitado</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
    }
  };

  const pendentesCount = solicitacoes.filter(s => s.status === "pendente").length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              Aprovação de Extensão de Jornada
              {filtroStatus === "pendente" && pendentesCount > 0 && (
                <Badge variant="destructive">{pendentesCount}</Badge>
              )}
            </CardTitle>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pendente">Pendentes</SelectItem>
                <SelectItem value="aprovado">Aprovados</SelectItem>
                <SelectItem value="rejeitado">Rejeitados</SelectItem>
                <SelectItem value="todos">Todos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
            </div>
          ) : solicitacoes.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">Nenhuma solicitação encontrada.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Setor</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Horário</TableHead>
                    <TableHead>Tempo</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {solicitacoes.map(item => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{item.colaborador_nome}</p>
                          <p className="text-xs text-muted-foreground">{item.colaborador_cargo}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{item.colaborador_setor || "—"}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {format(new Date(item.data_extensao + "T12:00:00"), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {item.hora_inicio_extra} — {item.hora_fim_extra}
                      </TableCell>
                      <TableCell className="font-medium text-sm">{formatMin(item.minutos_extras)}</TableCell>
                      <TableCell className="max-w-[150px] truncate text-sm">{item.motivo}</TableCell>
                      <TableCell>{statusBadge(item.status)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setSelectedItem(item); setObservacao(""); }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de detalhes / aprovação */}
      <Dialog open={!!selectedItem} onOpenChange={open => { if (!open) setSelectedItem(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes da Solicitação</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <Label className="text-xs text-muted-foreground">Colaborador</Label>
                  <p className="font-medium">{selectedItem.colaborador_nome}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Cargo</Label>
                  <p>{selectedItem.colaborador_cargo || "—"}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Setor</Label>
                  <p>{selectedItem.colaborador_setor || "—"}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Data</Label>
                  <p>{format(new Date(selectedItem.data_extensao + "T12:00:00"), "dd/MM/yyyy")}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Horário Extra</Label>
                  <p>{selectedItem.hora_inicio_extra} — {selectedItem.hora_fim_extra}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Tempo Extra</Label>
                  <p className="font-bold text-primary">{formatMin(selectedItem.minutos_extras)}</p>
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Motivo</Label>
                <p className="text-sm">{selectedItem.motivo}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Justificativa</Label>
                <p className="text-sm bg-muted/50 p-2 rounded">{selectedItem.justificativa}</p>
              </div>

              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Status atual:</Label>
                {statusBadge(selectedItem.status)}
              </div>

              {selectedItem.status === "pendente" && (
                <>
                  <div className="space-y-2">
                    <Label>Observação do Aprovador (opcional)</Label>
                    <Textarea
                      value={observacao}
                      onChange={e => setObservacao(e.target.value)}
                      placeholder="Adicione uma observação..."
                      rows={3}
                      maxLength={500}
                    />
                  </div>
                  <DialogFooter className="gap-2">
                    <Button
                      variant="destructive"
                      onClick={() => handleAction("rejeitado")}
                      disabled={actionLoading}
                    >
                      {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <XCircle className="h-4 w-4 mr-1" />}
                      Rejeitar
                    </Button>
                    <Button
                      onClick={() => handleAction("aprovado")}
                      disabled={actionLoading}
                    >
                      {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                      Aprovar
                    </Button>
                  </DialogFooter>
                </>
              )}

              {selectedItem.status !== "pendente" && selectedItem.aprovado_por_nome && (
                <div className="text-sm text-muted-foreground border-t pt-3">
                  <p><strong>Avaliado por:</strong> {selectedItem.aprovado_por_nome}</p>
                  {selectedItem.aprovado_em && (
                    <p><strong>Em:</strong> {format(new Date(selectedItem.aprovado_em), "dd/MM/yyyy HH:mm")}</p>
                  )}
                  {selectedItem.observacao_aprovador && (
                    <p><strong>Obs:</strong> {selectedItem.observacao_aprovador}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
