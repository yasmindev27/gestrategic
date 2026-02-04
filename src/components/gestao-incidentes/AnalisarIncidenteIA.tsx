import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Brain, AlertTriangle, Lightbulb, Target, Loader2, CheckCircle2, Clock } from "lucide-react";

interface IncidenteData {
  descricao: string;
  setor: string;
  categoria_operacional?: string;
  paciente_envolvido?: boolean;
  equipamento_nome?: string;
}

interface AnaliseResult {
  classificacao_sugerida: {
    tipo: string;
    label: string;
    confianca: number;
    justificativa: string;
  };
  causas_provaveis: {
    categoria: string;
    descricao: string;
    probabilidade: string;
  }[];
  plano_acao: {
    acao: string;
    responsavel_sugerido: string;
    prazo_sugerido: string;
    prioridade: string;
  }[];
  resumo_tecnico: string;
}

interface AnalisarIncidenteIAProps {
  incidente: IncidenteData;
  onClassificacaoSelecionada?: (tipo: string) => void;
  disabled?: boolean;
}

const CATEGORIA_LABELS: Record<string, string> = {
  falha_humana: "Falha Humana",
  falha_processo: "Falha de Processo",
  falha_equipamento: "Falha de Equipamento",
  falha_comunicacao: "Falha de Comunicação",
  falha_organizacional: "Falha Organizacional",
  fator_paciente: "Fator do Paciente",
};

const CLASSIFICACAO_ICONS: Record<string, { icon: string; color: string }> = {
  circunstancia_notificavel: { icon: "📋", color: "bg-blue-500" },
  quase_erro: { icon: "⚠️", color: "bg-yellow-500" },
  incidente_sem_dano: { icon: "🔶", color: "bg-orange-500" },
  evento_adverso: { icon: "🔴", color: "bg-red-600" },
};

const PRIORIDADE_COLORS: Record<string, string> = {
  imediata: "bg-red-500",
  curto_prazo: "bg-orange-500",
  medio_prazo: "bg-blue-500",
};

export function AnalisarIncidenteIA({ incidente, onClassificacaoSelecionada, disabled }: AnalisarIncidenteIAProps) {
  const { toast } = useToast();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analise, setAnalise] = useState<AnaliseResult | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const handleAnalisar = async () => {
    if (!incidente.descricao || incidente.descricao.length < 20) {
      toast({
        title: "Descrição insuficiente",
        description: "Forneça uma descrição mais detalhada do incidente (mínimo 20 caracteres)",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    setAnalise(null);

    try {
      const { data, error } = await supabase.functions.invoke("analisar-incidente-ia", {
        body: { incidente, tipo_analise: "completa" },
      });

      if (error) throw error;

      if (data?.success && data?.analise) {
        setAnalise(data.analise);
        setIsOpen(true);
      } else {
        throw new Error(data?.error || "Falha na análise");
      }
    } catch (error) {
      console.error("Erro ao analisar:", error);
      toast({
        title: "Erro na análise",
        description: error instanceof Error ? error.message : "Não foi possível analisar o incidente",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAplicarClassificacao = () => {
    if (analise?.classificacao_sugerida?.tipo) {
      onClassificacaoSelecionada?.(analise.classificacao_sugerida.tipo);
      toast({
        title: "Classificação aplicada",
        description: `Tipo alterado para: ${analise.classificacao_sugerida.label}`,
      });
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={handleAnalisar}
        disabled={disabled || isAnalyzing || !incidente.descricao}
        className="gap-2"
      >
        {isAnalyzing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Analisando...
          </>
        ) : (
          <>
            <Brain className="h-4 w-4" />
            Analisar com IA
          </>
        )}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Análise de Incidente por IA
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh] pr-4">
            {analise && (
              <div className="space-y-6">
                {/* Resumo Técnico */}
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="pt-4">
                    <p className="text-sm italic">{analise.resumo_tecnico}</p>
                  </CardContent>
                </Card>

                {/* Classificação Sugerida */}
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Classificação Sugerida
                  </h3>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">
                            {CLASSIFICACAO_ICONS[analise.classificacao_sugerida.tipo]?.icon || "📋"}
                          </span>
                          <div>
                            <p className="font-medium">{analise.classificacao_sugerida.label}</p>
                            <p className="text-sm text-muted-foreground">
                              Confiança: {analise.classificacao_sugerida.confianca}%
                            </p>
                          </div>
                        </div>
                        {onClassificacaoSelecionada && (
                          <Button size="sm" onClick={handleAplicarClassificacao}>
                            Aplicar
                          </Button>
                        )}
                      </div>
                      <Separator className="my-3" />
                      <p className="text-sm text-muted-foreground">
                        <strong>Justificativa:</strong> {analise.classificacao_sugerida.justificativa}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Causas Prováveis */}
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Análise de Causa Raiz (Protocolo de Londres)
                  </h3>
                  <div className="space-y-2">
                    {analise.causas_provaveis.map((causa, index) => (
                      <Card key={index}>
                        <CardContent className="pt-3 pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline">
                                  {CATEGORIA_LABELS[causa.categoria] || causa.categoria}
                                </Badge>
                                <Badge
                                  variant={
                                    causa.probabilidade === "alta"
                                      ? "destructive"
                                      : causa.probabilidade === "media"
                                      ? "default"
                                      : "secondary"
                                  }
                                >
                                  {causa.probabilidade}
                                </Badge>
                              </div>
                              <p className="text-sm">{causa.descricao}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Plano de Ação */}
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Lightbulb className="h-4 w-4" />
                    Plano de Ação Sugerido
                  </h3>
                  <div className="space-y-2">
                    {analise.plano_acao.map((acao, index) => (
                      <Card key={index}>
                        <CardContent className="pt-3 pb-3">
                          <div className="flex items-start gap-3">
                            <div
                              className={`w-2 h-2 rounded-full mt-2 ${
                                PRIORIDADE_COLORS[acao.prioridade] || "bg-gray-500"
                              }`}
                            />
                            <div className="flex-1">
                              <p className="font-medium text-sm">{acao.acao}</p>
                              <div className="flex flex-wrap gap-2 mt-2">
                                <Badge variant="outline" className="text-xs">
                                  👤 {acao.responsavel_sugerido}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {acao.prazo_sugerido}
                                </Badge>
                                <Badge
                                  className={`text-xs text-white ${
                                    PRIORIDADE_COLORS[acao.prioridade] || "bg-gray-500"
                                  }`}
                                >
                                  {acao.prioridade === "imediata"
                                    ? "Imediata"
                                    : acao.prioridade === "curto_prazo"
                                    ? "Curto Prazo"
                                    : "Médio Prazo"}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Disclaimer */}
                <p className="text-xs text-muted-foreground text-center pt-4 border-t">
                  Esta análise é uma sugestão baseada em IA e deve ser validada pela equipe de Qualidade.
                  Baseado nas normas ONA e metodologia Qmentum.
                </p>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
