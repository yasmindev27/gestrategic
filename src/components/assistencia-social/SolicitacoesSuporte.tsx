import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { HandHeart, Plus, MessageSquare, CheckCircle2 } from "lucide-react";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { ActionButton } from "@/components/ui/action-buttons";

interface Solicitacao {
  id: string;
  solicitante_id: string;
  solicitante_nome: string;
  destinatario_id: string | null;
  destinatario_nome: string | null;
  paciente_nome: string;
  atendimento_id: string | null;
  descricao: string;
  tipo_suporte: string;
  status: string;
  resposta: string | null;
  respondido_em: string | null;
  created_at: string;
}

interface Profissional {
  user_id: string;
  full_name: string;
}

interface Props {
  currentUser: { id: string; nome: string };
}

const tiposSuporte = [
  { value: "acompanhamento", label: "Acompanhamento do Caso" },
  { value: "avaliacao", label: "Avaliação Conjunta" },
  { value: "continuidade", label: "Continuidade / Prosseguimento" },
  { value: "orientacao", label: "Orientação Especializada" },
  { value: "outro", label: "Outro" },
];

const statusMap: Record<string, { label: string; type: "info" | "warning" | "success" | "error" }> = {
  pendente: { label: "Pendente", type: "warning" },
  aceito: { label: "Aceito", type: "info" },
  concluido: { label: "Concluído", type: "success" },
  recusado: { label: "Recusado", type: "error" },
};

export const SolicitacoesSuporte = ({ currentUser }: Props) => {
  const { toast } = useToast();
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [respostaDialog, setRespostaDialog] = useState<Solicitacao | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState("todos");

  const [form, setForm] = useState({
    destinatario_id: "",
    paciente_nome: "",
    descricao: "",
    tipo_suporte: "acompanhamento",
  });

  const [respostaText, setRespostaText] = useState("");

  const loadData = useCallback(async () => {
    const [solRes, profRes] = await Promise.all([
      supabase.from("solicitacoes_suporte_social").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("user_id, full_name")
        .in("user_id", 
          (await supabase.from("user_roles").select("user_id").in("role", ["assistencia_social", "admin"])).data?.map(r => r.user_id) || []
        ),
    ]);

    if (solRes.data) setSolicitacoes(solRes.data as Solicitacao[]);
    if (profRes.data) setProfissionais(profRes.data.filter(p => p.user_id !== currentUser.id));
    setIsLoading(false);
  }, [currentUser.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async () => {
    if (!form.paciente_nome.trim() || !form.descricao.trim()) {
      toast({ title: "Erro", description: "Preencha paciente e descrição", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    const dest = profissionais.find(p => p.user_id === form.destinatario_id);

    const { error } = await supabase.from("solicitacoes_suporte_social").insert({
      solicitante_id: currentUser.id,
      solicitante_nome: currentUser.nome,
      destinatario_id: form.destinatario_id || null,
      destinatario_nome: dest?.full_name || null,
      paciente_nome: form.paciente_nome.trim().toUpperCase(),
      descricao: form.descricao.trim(),
      tipo_suporte: form.tipo_suporte,
    });

    if (error) {
      toast({ title: "Erro", description: "Falha ao criar solicitação", variant: "destructive" });
    } else {
      toast({ title: "Sucesso", description: "Solicitação de suporte enviada" });
      setDialogOpen(false);
      setForm({ destinatario_id: "", paciente_nome: "", descricao: "", tipo_suporte: "acompanhamento" });
      loadData();
    }
    setIsSubmitting(false);
  };

  const handleResponder = async (status: "aceito" | "concluido" | "recusado") => {
    if (!respostaDialog) return;
    setIsSubmitting(true);

    const { error } = await supabase
      .from("solicitacoes_suporte_social")
      .update({
        status,
        resposta: respostaText.trim() || null,
        respondido_em: new Date().toISOString(),
      })
      .eq("id", respostaDialog.id);

    if (!error) {
      toast({ title: "Sucesso", description: `Solicitação ${statusMap[status].label.toLowerCase()}` });
      setRespostaDialog(null);
      setRespostaText("");
      loadData();
    }
    setIsSubmitting(false);
  };

  const filtered = solicitacoes.filter(s => filterStatus === "todos" || s.status === filterStatus);

  const minhasSolicitacoes = filtered.filter(s => s.solicitante_id === currentUser.id);
  const recebidas = filtered.filter(s => s.destinatario_id === currentUser.id || (!s.destinatario_id && s.solicitante_id !== currentUser.id));

  if (isLoading) return <LoadingState message="Carregando solicitações..." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {Object.entries(statusMap).map(([v, { label }]) => (
                <SelectItem key={v} value={v}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <ActionButton type="add" label="Nova Solicitação" onClick={() => setDialogOpen(true)} />
      </div>

      {/* Recebidas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Solicitações Recebidas
            {recebidas.filter(r => r.status === "pendente").length > 0 && (
              <Badge variant="destructive">{recebidas.filter(r => r.status === "pendente").length} pendente(s)</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recebidas.length === 0 ? (
            <EmptyState title="Nenhuma solicitação recebida" description="Quando alguém solicitar seu suporte, aparecerá aqui." icon={HandHeart} />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Solicitante</TableHead>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recebidas.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="text-sm">{format(new Date(s.created_at), "dd/MM/yyyy HH:mm")}</TableCell>
                      <TableCell className="font-medium text-sm">{s.solicitante_nome}</TableCell>
                      <TableCell className="text-sm">{s.paciente_nome}</TableCell>
                      <TableCell className="text-sm">{tiposSuporte.find(t => t.value === s.tipo_suporte)?.label || s.tipo_suporte}</TableCell>
                      <TableCell>
                        <StatusBadge status={(statusMap[s.status]?.type || "info") as "info" | "warning" | "success" | "error"} label={statusMap[s.status]?.label || s.status} />
                      </TableCell>
                      <TableCell>
                        {s.status === "pendente" && (
                          <Button size="sm" variant="outline" onClick={() => { setRespostaDialog(s); setRespostaText(""); }}>
                            Responder
                          </Button>
                        )}
                        {s.status === "aceito" && (
                          <Button size="sm" variant="outline" onClick={() => { setRespostaDialog(s); setRespostaText(""); }}>
                            Concluir
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enviadas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <HandHeart className="h-4 w-4" />
            Minhas Solicitações Enviadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {minhasSolicitacoes.length === 0 ? (
            <EmptyState title="Nenhuma solicitação enviada" description="Solicite suporte de uma colega clicando no botão acima." icon={HandHeart} />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Destinatário</TableHead>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Resposta</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {minhasSolicitacoes.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="text-sm">{format(new Date(s.created_at), "dd/MM/yyyy HH:mm")}</TableCell>
                      <TableCell className="font-medium text-sm">{s.destinatario_nome || "Todas"}</TableCell>
                      <TableCell className="text-sm">{s.paciente_nome}</TableCell>
                      <TableCell className="text-sm">{tiposSuporte.find(t => t.value === s.tipo_suporte)?.label || s.tipo_suporte}</TableCell>
                      <TableCell>
                        <StatusBadge status={(statusMap[s.status]?.type || "info") as "info" | "warning" | "success" | "error"} label={statusMap[s.status]?.label || s.status} />
                      </TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{s.resposta || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Nova Solicitação */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Solicitação de Suporte</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Destinatário (opcional — deixe vazio para todas)</Label>
              <Select value={form.destinatario_id} onValueChange={v => setForm(f => ({ ...f, destinatario_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar profissional..." /></SelectTrigger>
                <SelectContent>
                  {profissionais.map(p => (
                    <SelectItem key={p.user_id} value={p.user_id}>{p.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nome do Paciente *</Label>
              <Input
                value={form.paciente_nome}
                onChange={e => setForm(f => ({ ...f, paciente_nome: e.target.value.toUpperCase() }))}
                placeholder="NOME DO PACIENTE"
              />
            </div>
            <div>
              <Label>Tipo de Suporte *</Label>
              <Select value={form.tipo_suporte} onValueChange={v => setForm(f => ({ ...f, tipo_suporte: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {tiposSuporte.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Descrição / Detalhes do Caso *</Label>
              <Textarea
                value={form.descricao}
                onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                placeholder="Descreva o caso e o que precisa de suporte..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={isSubmitting}>
              {isSubmitting ? "Enviando..." : "Enviar Solicitação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Responder */}
      <Dialog open={!!respostaDialog} onOpenChange={() => setRespostaDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Responder Solicitação</DialogTitle>
          </DialogHeader>
          {respostaDialog && (
            <div className="space-y-4">
              <div className="bg-muted/50 p-3 rounded-md text-sm space-y-1">
                <p><strong>De:</strong> {respostaDialog.solicitante_nome}</p>
                <p><strong>Paciente:</strong> {respostaDialog.paciente_nome}</p>
                <p><strong>Tipo:</strong> {tiposSuporte.find(t => t.value === respostaDialog.tipo_suporte)?.label}</p>
                <p className="mt-2">{respostaDialog.descricao}</p>
              </div>
              <div>
                <Label>Resposta / Observações</Label>
                <Textarea
                  value={respostaText}
                  onChange={e => setRespostaText(e.target.value)}
                  placeholder="Adicione observações sobre o acompanhamento..."
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter className="flex-wrap gap-2">
            {respostaDialog?.status === "pendente" && (
              <>
                <Button variant="outline" onClick={() => handleResponder("recusado")} disabled={isSubmitting}>
                  Recusar
                </Button>
                <Button onClick={() => handleResponder("aceito")} disabled={isSubmitting}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Aceitar
                </Button>
              </>
            )}
            {respostaDialog?.status === "aceito" && (
              <Button onClick={() => handleResponder("concluido")} disabled={isSubmitting}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Marcar como Concluído
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
