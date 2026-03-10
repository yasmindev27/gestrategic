import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ClipboardList, Send, Clock, User, ChevronDown, ChevronUp, HandHeart, MessageSquare, CheckCircle2, Plus } from "lucide-react";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";

interface Atendimento {
  id: string;
  tipo_atendimento: string;
  motivo: string;
  status: string;
  profissional_nome: string;
  data_atendimento: string;
  observacoes: string | null;
  paciente?: { nome_completo: string } | null;
}

interface Passagem {
  id: string;
  data_plantao: string;
  turno: string;
  profissional_nome: string;
  texto_pendencias: string | null;
  created_at: string;
  itens?: { atendimento_id: string; observacao: string | null }[];
}

interface Solicitacao {
  id: string;
  solicitante_id: string;
  solicitante_nome: string;
  destinatario_id: string | null;
  destinatario_nome: string | null;
  paciente_nome: string;
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
  atendimentos: Atendimento[];
  onRefresh: () => void;
}

const tiposAtendimentoMap: Record<string, string> = {
  acolhimento: "Acolhimento", orientacao: "Orientação Social", apoio_familiar: "Apoio Familiar",
  alta_social: "Alta Social", obito: "Acompanhamento de Óbito", vulnerabilidade: "Vulnerabilidade Social",
  transferencia: "Acompanhamento de Transferência", acolhimento_psicologico: "Acolhimento Psicológico",
  atendimento_crise: "Atendimento em Crise", suporte_luto: "Suporte ao Luto",
  mediacao_conflitos: "Mediação de Conflitos", avaliacao_psicossocial: "Avaliação Psicossocial",
  orientacao_alta: "Orientação de Alta", busca_ativa: "Busca Ativa", outros: "Outros",
};

const tiposSuporte = [
  { value: "acompanhamento", label: "Acompanhamento do Caso" },
  { value: "avaliacao", label: "Avaliação Conjunta" },
  { value: "continuidade", label: "Continuidade / Prosseguimento" },
  { value: "orientacao", label: "Orientação Especializada" },
  { value: "outro", label: "Outro" },
];

const statusSuporteMap: Record<string, { label: string; type: "info" | "warning" | "success" | "error" }> = {
  pendente: { label: "Pendente", type: "warning" },
  aceito: { label: "Aceito", type: "info" },
  concluido: { label: "Concluído", type: "success" },
  recusado: { label: "Recusado", type: "error" },
};

export const PassagemPlantaoSocial = ({ currentUser, atendimentos, onRefresh }: Props) => {
  const { toast } = useToast();
  const [innerTab, setInnerTab] = useState("passagem");

  // === Passagem state ===
  const [passagens, setPassagens] = useState<Passagem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [textoPendencias, setTextoPendencias] = useState("");
  const [selectedAtendimentos, setSelectedAtendimentos] = useState<string[]>([]);
  const [expandedPassagem, setExpandedPassagem] = useState<string | null>(null);

  // === Suporte state ===
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [suporteDialog, setSuporteDialog] = useState(false);
  const [respostaDialog, setRespostaDialog] = useState<Solicitacao | null>(null);
  const [respostaText, setRespostaText] = useState("");
  const [suporteForm, setSuporteForm] = useState({
    destinatario_id: "", paciente_nome: "", descricao: "", tipo_suporte: "acompanhamento",
  });

  const pendentes = atendimentos.filter(a => a.status !== "finalizado");
  const currentHour = new Date().getHours();
  const currentTurno = currentHour >= 7 && currentHour < 19 ? "diurno" : "noturno";

  const loadAll = useCallback(async () => {
    // Load passagens
    const { data: passData } = await supabase
      .from("passagem_plantao_social").select("*")
      .order("created_at", { ascending: false }).limit(20);

    if (passData) {
      const ids = passData.map(p => p.id);
      const { data: itens } = ids.length > 0
        ? await supabase.from("passagem_plantao_social_itens")
            .select("passagem_id, atendimento_id, observacao").in("passagem_id", ids)
        : { data: [] };
      setPassagens(passData.map(p => ({ ...p, itens: itens?.filter(i => i.passagem_id === p.id) || [] })));
    }

    // Load solicitações
    const { data: solData } = await supabase
      .from("solicitacoes_suporte_social").select("*")
      .order("created_at", { ascending: false });
    if (solData) setSolicitacoes(solData as Solicitacao[]);

    // Load profissionais do setor
    const { data: roleUsers } = await supabase
      .from("user_roles").select("user_id").in("role", ["assistencia_social", "admin"]);
    if (roleUsers) {
      const { data: profs } = await supabase
        .from("profiles").select("user_id, full_name")
        .in("user_id", roleUsers.map(r => r.user_id));
      if (profs) setProfissionais(profs.filter(p => p.user_id !== currentUser.id));
    }

    setIsLoading(false);
  }, [currentUser.id]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // === Passagem handlers ===
  const handleSubmitPassagem = async () => {
    if (!textoPendencias.trim() && selectedAtendimentos.length === 0) {
      toast({ title: "Erro", description: "Descreva as pendências ou selecione atendimentos pendentes", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const { data: passagem, error } = await supabase.from("passagem_plantao_social")
        .insert({ data_plantao: new Date().toISOString().split("T")[0], turno: currentTurno, profissional_id: currentUser.id, profissional_nome: currentUser.nome, texto_pendencias: textoPendencias.trim() || null })
        .select("id").single();
      if (error) throw error;
      if (selectedAtendimentos.length > 0) {
        await supabase.from("passagem_plantao_social_itens").insert(
          selectedAtendimentos.map(atId => ({ passagem_id: passagem.id, atendimento_id: atId, observacao: null }))
        );
      }
      toast({ title: "Sucesso", description: "Passagem de plantão registrada" });
      setTextoPendencias(""); setSelectedAtendimentos([]); loadAll();
    } catch {
      toast({ title: "Erro", description: "Falha ao registrar passagem", variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  const toggleAtendimento = (id: string) => {
    setSelectedAtendimentos(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);
  };

  const getAtendimentoById = (id: string) => atendimentos.find(a => a.id === id);

  // === Suporte handlers ===
  const handleCreateSuporte = async () => {
    if (!suporteForm.paciente_nome.trim() || !suporteForm.descricao.trim()) {
      toast({ title: "Erro", description: "Preencha paciente e descrição", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    const dest = profissionais.find(p => p.user_id === suporteForm.destinatario_id);
    const { error } = await supabase.from("solicitacoes_suporte_social").insert({
      solicitante_id: currentUser.id, solicitante_nome: currentUser.nome,
      destinatario_id: suporteForm.destinatario_id || null, destinatario_nome: dest?.full_name || null,
      paciente_nome: suporteForm.paciente_nome.trim().toUpperCase(),
      descricao: suporteForm.descricao.trim(), tipo_suporte: suporteForm.tipo_suporte,
    });
    if (error) {
      toast({ title: "Erro", description: "Falha ao criar solicitação", variant: "destructive" });
    } else {
      toast({ title: "Sucesso", description: "Solicitação de suporte enviada" });
      setSuporteDialog(false);
      setSuporteForm({ destinatario_id: "", paciente_nome: "", descricao: "", tipo_suporte: "acompanhamento" });
      loadAll();
    }
    setIsSubmitting(false);
  };

  const handleResponder = async (status: "aceito" | "concluido" | "recusado") => {
    if (!respostaDialog) return;
    setIsSubmitting(true);
    const { error } = await supabase.from("solicitacoes_suporte_social")
      .update({ status, resposta: respostaText.trim() || null, respondido_em: new Date().toISOString() })
      .eq("id", respostaDialog.id);
    if (!error) {
      toast({ title: "Sucesso", description: `Solicitação ${statusSuporteMap[status].label.toLowerCase()}` });
      setRespostaDialog(null); setRespostaText(""); loadAll();
    }
    setIsSubmitting(false);
  };

  const recebidas = solicitacoes.filter(s => s.destinatario_id === currentUser.id || (!s.destinatario_id && s.solicitante_id !== currentUser.id));
  const enviadas = solicitacoes.filter(s => s.solicitante_id === currentUser.id);
  const pendentesSuporteCount = recebidas.filter(r => r.status === "pendente").length;

  if (isLoading) return <LoadingState message="Carregando..." />;

  return (
    <div className="space-y-4">
      <Tabs value={innerTab} onValueChange={setInnerTab}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <TabsList>
            <TabsTrigger value="passagem" className="gap-1.5">
              <Send className="h-3.5 w-3.5" /> Pendências
            </TabsTrigger>
            <TabsTrigger value="suporte" className="gap-1.5">
              <HandHeart className="h-3.5 w-3.5" /> Suporte
              {pendentesSuporteCount > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 min-w-5 text-xs px-1">{pendentesSuporteCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="historico" className="gap-1.5">
              <Clock className="h-3.5 w-3.5" /> Histórico
            </TabsTrigger>
          </TabsList>
          {innerTab === "suporte" && (
            <Button size="sm" onClick={() => setSuporteDialog(true)}>
              <Plus className="h-4 w-4 mr-1" /> Solicitar Suporte
            </Button>
          )}
        </div>

        {/* ========== PENDÊNCIAS ========== */}
        <TabsContent value="passagem" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Registrar Passagem de Plantão</CardTitle>
              <p className="text-sm text-muted-foreground">
                Turno: <Badge variant="outline" className="ml-1">{currentTurno === "diurno" ? "Diurno (07h–19h)" : "Noturno (19h–07h)"}</Badge>
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Pendências / Observações</Label>
                <Textarea placeholder="Descreva pendências, informações importantes e casos que precisam de continuidade..." value={textoPendencias} onChange={e => setTextoPendencias(e.target.value)} rows={4} />
              </div>

              {pendentes.length > 0 && (
                <div className="space-y-2">
                  <Label>Casos em aberto (marque os que ficam para o próximo plantão)</Label>
                  <div className="max-h-48 overflow-y-auto space-y-2 border rounded-md p-3">
                    {pendentes.map(a => (
                      <div key={a.id} className="flex items-start gap-2">
                        <Checkbox checked={selectedAtendimentos.includes(a.id)} onCheckedChange={() => toggleAtendimento(a.id)} />
                        <div className="text-sm leading-tight">
                          <span className="font-medium">{a.paciente?.nome_completo?.toUpperCase() || "—"}</span>
                          <span className="text-muted-foreground ml-2">{tiposAtendimentoMap[a.tipo_atendimento] || a.tipo_atendimento}</span>
                          <StatusBadge status={a.status === "em_atendimento" ? "info" : "warning"} label={a.status === "em_atendimento" ? "Em Atendimento" : "Em Acompanhamento"} className="ml-2" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button onClick={handleSubmitPassagem} disabled={isSubmitting}>
                <Send className="h-4 w-4 mr-2" />
                {isSubmitting ? "Registrando..." : "Registrar Passagem"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========== SUPORTE ========== */}
        <TabsContent value="suporte" className="space-y-4 mt-4">
          {/* Recebidas */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" /> Recebidas
                {pendentesSuporteCount > 0 && <Badge variant="destructive">{pendentesSuporteCount} pendente(s)</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recebidas.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma solicitação recebida.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead><TableHead>Solicitante</TableHead><TableHead>Paciente</TableHead><TableHead>Tipo</TableHead><TableHead>Status</TableHead><TableHead>Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recebidas.map(s => (
                        <TableRow key={s.id}>
                          <TableCell className="text-sm">{format(new Date(s.created_at), "dd/MM HH:mm")}</TableCell>
                          <TableCell className="text-sm font-medium">{s.solicitante_nome}</TableCell>
                          <TableCell className="text-sm">{s.paciente_nome}</TableCell>
                          <TableCell className="text-sm">{tiposSuporte.find(t => t.value === s.tipo_suporte)?.label}</TableCell>
                          <TableCell><StatusBadge status={statusSuporteMap[s.status]?.type || "info"} label={statusSuporteMap[s.status]?.label || s.status} /></TableCell>
                          <TableCell>
                            {(s.status === "pendente" || s.status === "aceito") && (
                              <Button size="sm" variant="outline" onClick={() => { setRespostaDialog(s); setRespostaText(""); }}>
                                {s.status === "pendente" ? "Responder" : "Concluir"}
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
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <HandHeart className="h-4 w-4" /> Enviadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {enviadas.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma solicitação enviada.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead><TableHead>Para</TableHead><TableHead>Paciente</TableHead><TableHead>Tipo</TableHead><TableHead>Status</TableHead><TableHead>Resposta</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {enviadas.map(s => (
                        <TableRow key={s.id}>
                          <TableCell className="text-sm">{format(new Date(s.created_at), "dd/MM HH:mm")}</TableCell>
                          <TableCell className="text-sm font-medium">{s.destinatario_nome || "Todas"}</TableCell>
                          <TableCell className="text-sm">{s.paciente_nome}</TableCell>
                          <TableCell className="text-sm">{tiposSuporte.find(t => t.value === s.tipo_suporte)?.label}</TableCell>
                          <TableCell><StatusBadge status={statusSuporteMap[s.status]?.type || "info"} label={statusSuporteMap[s.status]?.label || s.status} /></TableCell>
                          <TableCell className="text-sm max-w-[200px] truncate">{s.resposta || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========== HISTÓRICO ========== */}
        <TabsContent value="historico" className="space-y-4 mt-4">
          {passagens.length === 0 ? (
            <EmptyState title="Nenhuma passagem registrada" description="Registre a primeira passagem na aba Pendências." icon={ClipboardList} />
          ) : (
            <div className="space-y-3">
              {passagens.map(p => (
                <Card key={p.id} className="border">
                  <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50" onClick={() => setExpandedPassagem(expandedPassagem === p.id ? null : p.id)}>
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <span className="font-medium text-sm">{p.profissional_nome}</span>
                        <span className="text-xs text-muted-foreground ml-2">{format(new Date(p.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{p.turno === "diurno" ? "Diurno" : "Noturno"}</Badge>
                      {p.itens && p.itens.length > 0 && <Badge variant="secondary">{p.itens.length} caso(s)</Badge>}
                      {expandedPassagem === p.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>
                  {expandedPassagem === p.id && (
                    <CardContent className="pt-0 space-y-3">
                      {p.texto_pendencias && <div className="bg-muted/50 p-3 rounded-md text-sm whitespace-pre-wrap">{p.texto_pendencias}</div>}
                      {p.itens && p.itens.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Atendimentos vinculados:</p>
                          {p.itens.map((item, idx) => {
                            const at = getAtendimentoById(item.atendimento_id);
                            return (
                              <div key={idx} className="text-sm flex items-center gap-2 pl-2 border-l-2 border-primary/30">
                                <span className="font-medium">{at?.paciente?.nome_completo?.toUpperCase() || "Atendimento removido"}</span>
                                {at && <span className="text-muted-foreground">— {tiposAtendimentoMap[at.tipo_atendimento] || at.tipo_atendimento}</span>}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog Nova Solicitação */}
      <Dialog open={suporteDialog} onOpenChange={setSuporteDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Solicitar Suporte</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Para quem? (opcional — deixe vazio para todas)</Label>
              <Select value={suporteForm.destinatario_id} onValueChange={v => setSuporteForm(f => ({ ...f, destinatario_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar profissional..." /></SelectTrigger>
                <SelectContent>
                  {profissionais.map(p => <SelectItem key={p.user_id} value={p.user_id}>{p.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Paciente *</Label>
              <Input value={suporteForm.paciente_nome} onChange={e => setSuporteForm(f => ({ ...f, paciente_nome: e.target.value.toUpperCase() }))} placeholder="NOME DO PACIENTE" />
            </div>
            <div>
              <Label>Tipo de Suporte *</Label>
              <Select value={suporteForm.tipo_suporte} onValueChange={v => setSuporteForm(f => ({ ...f, tipo_suporte: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {tiposSuporte.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Descrição do Caso *</Label>
              <Textarea value={suporteForm.descricao} onChange={e => setSuporteForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Descreva o caso e o que precisa..." rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuporteDialog(false)}>Cancelar</Button>
            <Button onClick={handleCreateSuporte} disabled={isSubmitting}>{isSubmitting ? "Enviando..." : "Enviar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Responder */}
      <Dialog open={!!respostaDialog} onOpenChange={() => setRespostaDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Responder Solicitação</DialogTitle></DialogHeader>
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
                <Textarea value={respostaText} onChange={e => setRespostaText(e.target.value)} placeholder="Observações..." rows={3} />
              </div>
            </div>
          )}
          <DialogFooter className="flex-wrap gap-2">
            {respostaDialog?.status === "pendente" && (
              <>
                <Button variant="outline" onClick={() => handleResponder("recusado")} disabled={isSubmitting}>Recusar</Button>
                <Button onClick={() => handleResponder("aceito")} disabled={isSubmitting}><CheckCircle2 className="h-4 w-4 mr-1" /> Aceitar</Button>
              </>
            )}
            {respostaDialog?.status === "aceito" && (
              <Button onClick={() => handleResponder("concluido")} disabled={isSubmitting}><CheckCircle2 className="h-4 w-4 mr-1" /> Concluir</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
