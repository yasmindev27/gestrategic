import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ChevronDown, ChevronUp, ArrowUpRight, MessageSquare,
} from "lucide-react";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";

// === Types ===
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

interface Profissional { user_id: string; full_name: string; }

interface Props {
  currentUser: { id: string; nome: string };
  atendimentos: Atendimento[];
  onRefresh: () => void;
}

// === Constants ===
const tiposAtendimentoMap: Record<string, string> = {
  acolhimento: "Acolhimento", orientacao: "Orientação Social", apoio_familiar: "Apoio Familiar",
  alta_social: "Alta Social", obito: "Acomp. Óbito", vulnerabilidade: "Vulnerabilidade",
  transferencia: "Acomp. Transferência", acolhimento_psicologico: "Acolhimento Psicológico",
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

// === Component ===
export const PassagemPlantaoSocial = ({ currentUser, atendimentos, onRefresh }: Props) => {
  const { toast } = useToast();

  // State
  const [passagens, setPassagens] = useState<Passagem[]>([]);
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Passagem form
  const [textoPendencias, setTextoPendencias] = useState("");
  const [selectedAtendimentos, setSelectedAtendimentos] = useState<string[]>([]);
  const [expandedPassagem, setExpandedPassagem] = useState<string | null>(null);
  const [showPassagemForm, setShowPassagemForm] = useState(false);

  // Suporte
  const [suporteDialog, setSuporteDialog] = useState(false);
  const [respostaDialog, setRespostaDialog] = useState<Solicitacao | null>(null);
  const [respostaText, setRespostaText] = useState("");
  const [suporteForm, setSuporteForm] = useState({
    destinatario_id: "", paciente_nome: "", descricao: "", tipo_suporte: "acompanhamento",
  });
  const [showHistorico, setShowHistorico] = useState(false);
  const [detalheSolicitacao, setDetalheSolicitacao] = useState<Solicitacao | null>(null);

  // Computed
  const pendentes = atendimentos.filter(a => a.status !== "finalizado");

  const recebidas = useMemo(() => solicitacoes.filter(s =>
    s.destinatario_id === currentUser.id || (!s.destinatario_id && s.solicitante_id !== currentUser.id)
  ), [solicitacoes, currentUser.id]);
  const enviadas = useMemo(() => solicitacoes.filter(s => s.solicitante_id === currentUser.id), [solicitacoes, currentUser.id]);
  const pendentesSuporteCount = recebidas.filter(r => r.status === "pendente").length;

  // Data loading
  const loadAll = useCallback(async () => {
    const [passRes, solRes, roleRes] = await Promise.all([
      supabase.from("passagem_plantao_social").select("*").order("created_at", { ascending: false }).limit(20),
      supabase.from("solicitacoes_suporte_social").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id").in("role", ["assistencia_social", "admin"]),
    ]);

    if (passRes.data) {
      const ids = passRes.data.map(p => p.id);
      const { data: itens } = ids.length > 0
        ? await supabase.from("passagem_plantao_social_itens").select("passagem_id, atendimento_id, observacao").in("passagem_id", ids)
        : { data: [] };
      setPassagens(passRes.data.map(p => ({ ...p, itens: itens?.filter(i => i.passagem_id === p.id) || [] })));
    }
    if (solRes.data) setSolicitacoes(solRes.data as Solicitacao[]);
    if (roleRes.data) {
      const { data: profs } = await supabase.from("profiles").select("user_id, full_name").in("user_id", roleRes.data.map(r => r.user_id));
      if (profs) setProfissionais(profs.filter(p => p.user_id !== currentUser.id));
    }
    setIsLoading(false);
  }, [currentUser.id]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Handlers
  const handleSubmitPassagem = async () => {
    if (!textoPendencias.trim() && selectedAtendimentos.length === 0) {
      toast({ title: "Erro", description: "Descreva as pendências ou selecione atendimentos", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const { data: passagem, error } = await supabase.from("passagem_plantao_social")
        .insert({ data_plantao: new Date().toISOString().split("T")[0], profissional_id: currentUser.id, profissional_nome: currentUser.nome, texto_pendencias: textoPendencias.trim() || null })
        .select("id").single();
      if (error) throw error;
      if (selectedAtendimentos.length > 0) {
        await supabase.from("passagem_plantao_social_itens").insert(selectedAtendimentos.map(atId => ({ passagem_id: passagem.id, atendimento_id: atId, observacao: null })));
      }
      toast({ title: "Sucesso", description: "Passagem de plantão registrada" });
      setTextoPendencias(""); setSelectedAtendimentos([]); setShowPassagemForm(false); loadAll();
    } catch {
      toast({ title: "Erro", description: "Falha ao registrar passagem", variant: "destructive" });
    }
    setIsSubmitting(false);
  };

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
    if (!error) {
      toast({ title: "Sucesso", description: "Solicitação de suporte enviada" });
      setSuporteDialog(false);
      setSuporteForm({ destinatario_id: "", paciente_nome: "", descricao: "", tipo_suporte: "acompanhamento" });
      loadAll();
    } else {
      toast({ title: "Erro", description: "Falha ao criar solicitação", variant: "destructive" });
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

  const toggleAtendimento = (id: string) => {
    setSelectedAtendimentos(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);
  };
  const getAtendimentoById = (id: string) => atendimentos.find(a => a.id === id);

  if (isLoading) return <LoadingState message="Carregando passagem de plantão..." />;

  return (
    <TooltipProvider>
      <div className="space-y-5">
        {/* ===== KPI SUMMARY ===== */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card className="hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Casos em aberto</p>
              <p className="text-2xl font-bold text-foreground mt-1">{pendentes.length}</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Passagens registradas</p>
              <p className="text-2xl font-bold text-foreground mt-1">{passagens.length}</p>
            </CardContent>
          </Card>
          <Card className={`hover:shadow-sm transition-shadow ${pendentesSuporteCount > 0 ? "border-destructive/40" : ""}`}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Suporte pendente</p>
              <p className={`text-2xl font-bold mt-1 ${pendentesSuporteCount > 0 ? "text-destructive" : "text-foreground"}`}>{pendentesSuporteCount}</p>
            </CardContent>
          </Card>
        </div>

        {/* ===== AÇÕES RÁPIDAS ===== */}
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => setShowPassagemForm(!showPassagemForm)} variant={showPassagemForm ? "secondary" : "default"} size="sm">
            {showPassagemForm ? "Fechar Formulário" : "Nova Passagem"}
          </Button>
          <Button onClick={() => setSuporteDialog(true)} variant="outline" size="sm">
            Solicitar Suporte
          </Button>
        </div>

        {/* ===== FORMULÁRIO PASSAGEM (colapsável) ===== */}
        {showPassagemForm && (
          <Card className="border-primary/30 shadow-sm animate-in slide-in-from-top-2 duration-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Registrar Passagem de Plantão</CardTitle>
              <CardDescription>
                Registre as pendências e casos que ficam para o próximo turno
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Pendências / Observações</Label>
                <Textarea
                  placeholder="Descreva pendências, informações importantes e casos que precisam de continuidade..."
                  value={textoPendencias}
                  onChange={e => setTextoPendencias(e.target.value)}
                  rows={4}
                  className="mt-1.5 resize-none"
                />
              </div>

              {pendentes.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    Vincular casos em aberto
                    <Badge variant="secondary" className="text-xs">{selectedAtendimentos.length} selecionado(s)</Badge>
                  </Label>
                  <div className="max-h-52 overflow-y-auto space-y-1.5 border rounded-lg p-3 bg-muted/30">
                    {pendentes.map(a => (
                      <div
                        key={a.id}
                        className={`flex items-start gap-3 p-2 rounded-md cursor-pointer transition-colors ${selectedAtendimentos.includes(a.id) ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/60"}`}
                        onClick={() => toggleAtendimento(a.id)}
                      >
                        <Checkbox checked={selectedAtendimentos.includes(a.id)} className="mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{a.paciente?.nome_completo?.toUpperCase() || "—"}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-xs text-muted-foreground">{tiposAtendimentoMap[a.tipo_atendimento] || a.tipo_atendimento}</span>
                            <StatusBadge
                              status={a.status === "em_atendimento" ? "info" : "warning"}
                              label={a.status === "em_atendimento" ? "Em Atendimento" : "Em Acompanhamento"}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <Button onClick={handleSubmitPassagem} disabled={isSubmitting} size="sm">
                  {isSubmitting ? "Registrando..." : "Registrar Passagem"}
                </Button>
                <Button variant="ghost" onClick={() => setShowPassagemForm(false)}>Cancelar</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ===== SOLICITAÇÕES DE SUPORTE RECEBIDAS (inline alert) ===== */}
        {pendentesSuporteCount > 0 && (
          <Card className="border-destructive/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-destructive">
                {pendentesSuporteCount} solicitação(ões) de suporte aguardando resposta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {recebidas.filter(s => s.status === "pendente").map(s => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-background border hover:shadow-sm transition-shadow">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold">{s.paciente_nome}</span>
                      <Badge variant="outline" className="text-xs">{tiposSuporte.find(t => t.value === s.tipo_suporte)?.label}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      De: {s.solicitante_nome} — {format(new Date(s.created_at), "dd/MM 'às' HH:mm")}
                    </p>
                  </div>
                  <div className="flex gap-2 ml-3">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="sm" variant="ghost" onClick={() => setDetalheSolicitacao(s)}>
                          <ArrowUpRight className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Ver detalhes</TooltipContent>
                    </Tooltip>
                    <Button size="sm" onClick={() => { setRespostaDialog(s); setRespostaText(""); }}>
                      Responder
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* ===== SOLICITAÇÕES ACEITAS (em andamento) ===== */}
        {recebidas.filter(s => s.status === "aceito").length > 0 && (
          <Card className="border-blue-500/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">
                Acompanhamentos em andamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {recebidas.filter(s => s.status === "aceito").map(s => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                  <div>
                    <span className="text-sm font-medium">{s.paciente_nome}</span>
                    <p className="text-xs text-muted-foreground">De: {s.solicitante_nome}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => { setRespostaDialog(s); setRespostaText(""); }}>
                    Concluir
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* ===== MINHAS SOLICITAÇÕES ENVIADAS ===== */}
        {enviadas.length > 0 && (
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between text-sm text-muted-foreground hover:text-foreground">
                <span>Minhas solicitações enviadas ({enviadas.length})</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2">
              {enviadas.map(s => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{s.paciente_nome}</span>
                      <StatusBadge status={statusSuporteMap[s.status]?.type || "info"} label={statusSuporteMap[s.status]?.label || s.status} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Para: {s.destinatario_nome || "Todas"} — {format(new Date(s.created_at), "dd/MM HH:mm")}
                    </p>
                  </div>
                  {s.resposta && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="sm" variant="ghost" onClick={() => setDetalheSolicitacao(s)}>
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Ver resposta</TooltipContent>
                    </Tooltip>
                  )}
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        <Separator />

        {/* ===== HISTÓRICO DE PASSAGENS ===== */}
        <Collapsible open={showHistorico} onOpenChange={setShowHistorico}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between text-sm font-medium">
              <span>Histórico de Passagens ({passagens.length})</span>
              {showHistorico ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 space-y-2">
            {passagens.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhuma passagem registrada ainda.</p>
            ) : (
              passagens.map(p => (
                <Card key={p.id} className="border hover:shadow-sm transition-shadow">
                  <div
                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/40 rounded-t-lg transition-colors"
                    onClick={() => setExpandedPassagem(expandedPassagem === p.id ? null : p.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <span className="font-medium text-sm">{p.profissional_nome}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {format(new Date(p.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {p.itens && p.itens.length > 0 && (
                        <Badge variant="secondary" className="text-xs">{p.itens.length} caso(s)</Badge>
                      )}
                      {expandedPassagem === p.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>
                  {expandedPassagem === p.id && (
                    <CardContent className="pt-0 pb-4 space-y-3">
                      {p.texto_pendencias && (
                        <div className="bg-muted/40 p-3 rounded-lg text-sm whitespace-pre-wrap border-l-2 border-primary/40">
                          {p.texto_pendencias}
                        </div>
                      )}
                      {p.itens && p.itens.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Casos vinculados</p>
                          {p.itens.map((item, idx) => {
                            const at = getAtendimentoById(item.atendimento_id);
                            return (
                              <div key={idx} className="text-sm flex items-center gap-2 p-2 rounded-md bg-muted/20 border-l-2 border-primary/30">
                                <span className="font-semibold">{at?.paciente?.nome_completo?.toUpperCase() || "Removido"}</span>
                                {at && <span className="text-muted-foreground text-xs">— {tiposAtendimentoMap[at.tipo_atendimento] || at.tipo_atendimento}</span>}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              ))
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* ===== DIALOGS ===== */}
      {/* Nova Solicitação */}
      <Dialog open={suporteDialog} onOpenChange={setSuporteDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Solicitar Suporte</DialogTitle>
            <DialogDescription>Solicite acompanhamento ou suporte de outra profissional</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm">Destinatário (opcional)</Label>
              <Select value={suporteForm.destinatario_id} onValueChange={v => setSuporteForm(f => ({ ...f, destinatario_id: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Todas as profissionais" /></SelectTrigger>
                <SelectContent>
                  {profissionais.map(p => <SelectItem key={p.user_id} value={p.user_id}>{p.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Paciente *</Label>
              <Input className="mt-1" value={suporteForm.paciente_nome} onChange={e => setSuporteForm(f => ({ ...f, paciente_nome: e.target.value.toUpperCase() }))} placeholder="NOME DO PACIENTE" />
            </div>
            <div>
              <Label className="text-sm">Tipo de Suporte *</Label>
              <Select value={suporteForm.tipo_suporte} onValueChange={v => setSuporteForm(f => ({ ...f, tipo_suporte: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {tiposSuporte.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Descrição do caso *</Label>
              <Textarea className="mt-1 resize-none" value={suporteForm.descricao} onChange={e => setSuporteForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Descreva o caso e o que precisa de suporte..." rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuporteDialog(false)}>Cancelar</Button>
            <Button onClick={handleCreateSuporte} disabled={isSubmitting}>
              {isSubmitting ? "Enviando..." : "Enviar Solicitação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Responder Solicitação */}
      <Dialog open={!!respostaDialog} onOpenChange={() => setRespostaDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Responder Solicitação</DialogTitle>
          </DialogHeader>
          {respostaDialog && (
            <div className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg text-sm space-y-2 border">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{respostaDialog.paciente_nome}</span>
                  <Badge variant="outline" className="text-xs">{tiposSuporte.find(t => t.value === respostaDialog.tipo_suporte)?.label}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">De: {respostaDialog.solicitante_nome} — {format(new Date(respostaDialog.created_at), "dd/MM/yyyy 'às' HH:mm")}</p>
                <Separator />
                <p>{respostaDialog.descricao}</p>
              </div>
              <div>
                <Label className="text-sm">Resposta / Observações</Label>
                <Textarea className="mt-1 resize-none" value={respostaText} onChange={e => setRespostaText(e.target.value)} placeholder="Adicione observações sobre o acompanhamento..." rows={3} />
              </div>
            </div>
          )}
          <DialogFooter className="flex-wrap gap-2">
            {respostaDialog?.status === "pendente" && (
              <>
                <Button variant="outline" onClick={() => handleResponder("recusado")} disabled={isSubmitting}>Recusar</Button>
                <Button onClick={() => handleResponder("aceito")} disabled={isSubmitting}>
                  Aceitar
                </Button>
              </>
            )}
            {respostaDialog?.status === "aceito" && (
              <Button onClick={() => handleResponder("concluido")} disabled={isSubmitting}>
                Marcar como Concluído
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detalhe Solicitação */}
      <Dialog open={!!detalheSolicitacao} onOpenChange={() => setDetalheSolicitacao(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes da Solicitação</DialogTitle>
          </DialogHeader>
          {detalheSolicitacao && (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold">{detalheSolicitacao.paciente_nome}</span>
                  <StatusBadge status={statusSuporteMap[detalheSolicitacao.status]?.type || "info"} label={statusSuporteMap[detalheSolicitacao.status]?.label || detalheSolicitacao.status} />
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Solicitante</p>
                    <p className="font-medium">{detalheSolicitacao.solicitante_nome}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Destinatário</p>
                    <p className="font-medium">{detalheSolicitacao.destinatario_nome || "Todas"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Tipo</p>
                    <p className="font-medium">{tiposSuporte.find(t => t.value === detalheSolicitacao.tipo_suporte)?.label}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Data</p>
                    <p className="font-medium">{format(new Date(detalheSolicitacao.created_at), "dd/MM/yyyy HH:mm")}</p>
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Descrição</p>
                  <p className="text-sm">{detalheSolicitacao.descricao}</p>
                </div>
                {detalheSolicitacao.resposta && (
                  <div className="bg-primary/5 p-3 rounded-lg border border-primary/10">
                    <p className="text-xs text-muted-foreground mb-1">Resposta</p>
                    <p className="text-sm">{detalheSolicitacao.resposta}</p>
                    {detalheSolicitacao.respondido_em && (
                      <p className="text-xs text-muted-foreground mt-1">{format(new Date(detalheSolicitacao.respondido_em), "dd/MM/yyyy 'às' HH:mm")}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
};
