import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ClipboardList, Send, Clock, User, ChevronDown, ChevronUp } from "lucide-react";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge, mapStatusToType } from "@/components/ui/status-badge";

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

interface Props {
  currentUser: { id: string; nome: string };
  atendimentos: Atendimento[];
  onRefresh: () => void;
}

const tiposAtendimentoMap: Record<string, string> = {
  acolhimento: "Acolhimento",
  orientacao: "Orientação Social",
  apoio_familiar: "Apoio Familiar",
  alta_social: "Alta Social",
  obito: "Acompanhamento de Óbito",
  vulnerabilidade: "Vulnerabilidade Social",
  transferencia: "Acompanhamento de Transferência",
  acolhimento_psicologico: "Acolhimento Psicológico",
  atendimento_crise: "Atendimento em Crise",
  suporte_luto: "Suporte ao Luto",
  mediacao_conflitos: "Mediação de Conflitos",
  avaliacao_psicossocial: "Avaliação Psicossocial",
  orientacao_alta: "Orientação de Alta",
  busca_ativa: "Busca Ativa",
  outros: "Outros",
};

export const PassagemPlantaoSocial = ({ currentUser, atendimentos, onRefresh }: Props) => {
  const { toast } = useToast();
  const [passagens, setPassagens] = useState<Passagem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [textoPendencias, setTextoPendencias] = useState("");
  const [selectedAtendimentos, setSelectedAtendimentos] = useState<string[]>([]);
  const [expandedPassagem, setExpandedPassagem] = useState<string | null>(null);

  const pendentes = atendimentos.filter(a => a.status !== "finalizado");

  const currentHour = new Date().getHours();
  const currentTurno = currentHour >= 7 && currentHour < 19 ? "diurno" : "noturno";

  const loadPassagens = useCallback(async () => {
    const { data } = await supabase
      .from("passagem_plantao_social")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (data) {
      // Load itens for each passagem
      const ids = data.map(p => p.id);
      const { data: itens } = await supabase
        .from("passagem_plantao_social_itens")
        .select("passagem_id, atendimento_id, observacao")
        .in("passagem_id", ids);

      const passagensWithItens = data.map(p => ({
        ...p,
        itens: itens?.filter(i => i.passagem_id === p.id) || [],
      }));
      setPassagens(passagensWithItens);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadPassagens();
  }, [loadPassagens]);

  const handleSubmit = async () => {
    if (!textoPendencias.trim() && selectedAtendimentos.length === 0) {
      toast({ title: "Erro", description: "Descreva as pendências ou selecione atendimentos pendentes", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: passagem, error } = await supabase
        .from("passagem_plantao_social")
        .insert({
          data_plantao: new Date().toISOString().split("T")[0],
          turno: currentTurno,
          profissional_id: currentUser.id,
          profissional_nome: currentUser.nome,
          texto_pendencias: textoPendencias.trim() || null,
        })
        .select("id")
        .single();

      if (error) throw error;

      if (selectedAtendimentos.length > 0) {
        const itens = selectedAtendimentos.map(atId => ({
          passagem_id: passagem.id,
          atendimento_id: atId,
          observacao: null,
        }));
        await supabase.from("passagem_plantao_social_itens").insert(itens);
      }

      toast({ title: "Sucesso", description: "Passagem de plantão registrada" });
      setTextoPendencias("");
      setSelectedAtendimentos([]);
      loadPassagens();
    } catch {
      toast({ title: "Erro", description: "Falha ao registrar passagem", variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  const toggleAtendimento = (id: string) => {
    setSelectedAtendimentos(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const getAtendimentoById = (id: string) => atendimentos.find(a => a.id === id);

  if (isLoading) return <LoadingState message="Carregando passagens..." />;

  return (
    <div className="space-y-6">
      {/* Nova passagem */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Send className="h-4 w-4" />
            Registrar Passagem de Plantão
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Turno atual: <Badge variant="outline">{currentTurno === "diurno" ? "Diurno (07h–19h)" : "Noturno (19h–07h)"}</Badge>
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Pendências / Observações do Plantão</Label>
            <Textarea
              placeholder="Descreva as pendências, informações importantes e casos que precisam de continuidade..."
              value={textoPendencias}
              onChange={e => setTextoPendencias(e.target.value)}
              rows={4}
            />
          </div>

          {pendentes.length > 0 && (
            <div className="space-y-2">
              <Label>Atendimentos Pendentes (selecione os que ficam para o próximo plantão)</Label>
              <div className="max-h-48 overflow-y-auto space-y-2 border rounded-md p-3">
                {pendentes.map(a => (
                  <div key={a.id} className="flex items-start gap-2">
                    <Checkbox
                      checked={selectedAtendimentos.includes(a.id)}
                      onCheckedChange={() => toggleAtendimento(a.id)}
                    />
                    <div className="text-sm leading-tight">
                      <span className="font-medium">{a.paciente?.nome_completo?.toUpperCase() || "—"}</span>
                      <span className="text-muted-foreground ml-2">
                        {tiposAtendimentoMap[a.tipo_atendimento] || a.tipo_atendimento}
                      </span>
                      <StatusBadge status={a.status === "em_atendimento" ? "Em Atendimento" : "Em Acompanhamento"} type={a.status === "em_atendimento" ? "info" : "warning"} className="ml-2" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button onClick={handleSubmit} disabled={isSubmitting}>
            <Send className="h-4 w-4 mr-2" />
            {isSubmitting ? "Registrando..." : "Registrar Passagem"}
          </Button>
        </CardContent>
      </Card>

      <Separator />

      {/* Histórico */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" />
            Histórico de Passagens
          </CardTitle>
        </CardHeader>
        <CardContent>
          {passagens.length === 0 ? (
            <EmptyState title="Nenhuma passagem registrada" description="Registre a primeira passagem de plantão acima." icon={ClipboardList} />
          ) : (
            <div className="space-y-3">
              {passagens.map(p => (
                <Card key={p.id} className="border">
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50"
                    onClick={() => setExpandedPassagem(expandedPassagem === p.id ? null : p.id)}
                  >
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <span className="font-medium text-sm">{p.profissional_nome}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {format(new Date(p.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{p.turno === "diurno" ? "Diurno" : "Noturno"}</Badge>
                      {p.itens && p.itens.length > 0 && (
                        <Badge variant="secondary">{p.itens.length} caso(s)</Badge>
                      )}
                      {expandedPassagem === p.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>

                  {expandedPassagem === p.id && (
                    <CardContent className="pt-0 space-y-3">
                      {p.texto_pendencias && (
                        <div className="bg-muted/50 p-3 rounded-md text-sm whitespace-pre-wrap">
                          {p.texto_pendencias}
                        </div>
                      )}
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
        </CardContent>
      </Card>
    </div>
  );
};
