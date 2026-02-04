import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Brain, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Loader2, RefreshCw, Target, Lightbulb, Building2 } from "lucide-react";

interface Tendencia {
  tipo: "alerta" | "melhoria" | "estavel";
  descricao: string;
  setor?: string;
  variacao_percentual?: number;
}

interface SetorCritico {
  setor: string;
  motivo: string;
  prioridade: "alta" | "media" | "baixa";
}

interface Recomendacao {
  acao: string;
  setor_alvo?: string;
  base_normativa?: string;
  prazo: string;
}

interface Indicadores {
  variacao_total?: number;
  status_geral: "critico" | "atencao" | "controlado" | "excelente";
  meta_atingida?: boolean;
}

interface ResumoSemanal {
  resumo_executivo: string;
  tendencias: Tendencia[];
  setores_criticos?: SetorCritico[];
  recomendacoes: Recomendacao[];
  indicadores: Indicadores;
}

interface DadosBrutos {
  total: number;
  quase_erros: number;
  eventos_adversos: number;
  por_tipo: Record<string, number>;
  por_setor: Record<string, number>;
}

const STATUS_CONFIG = {
  critico: { color: "bg-red-500", label: "Crítico", icon: AlertTriangle },
  atencao: { color: "bg-yellow-500", label: "Atenção", icon: AlertTriangle },
  controlado: { color: "bg-blue-500", label: "Controlado", icon: CheckCircle2 },
  excelente: { color: "bg-green-500", label: "Excelente", icon: CheckCircle2 },
};

export function DashboardIAIncidentes() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [resumo, setResumo] = useState<ResumoSemanal | null>(null);
  const [dadosBrutos, setDadosBrutos] = useState<DadosBrutos | null>(null);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null);

  const carregarResumo = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("resumo-semanal-incidentes");

      if (error) throw error;

      if (data?.success) {
        setResumo(data.resumo);
        setDadosBrutos(data.dados_brutos);
        setUltimaAtualizacao(new Date());
      } else {
        throw new Error(data?.error || "Falha ao gerar resumo");
      }
    } catch (error) {
      console.error("Erro ao carregar resumo:", error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Não foi possível gerar o resumo",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    carregarResumo();
  }, []);

  if (isLoading && !resumo) {
    return (
      <Card className="min-h-[400px] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Brain className="h-12 w-12 text-primary animate-pulse mx-auto" />
          <div>
            <p className="font-medium">Gerando análise semanal...</p>
            <p className="text-sm text-muted-foreground">A IA está processando os dados de incidentes</p>
          </div>
          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
        </div>
      </Card>
    );
  }

  const statusConfig = resumo ? STATUS_CONFIG[resumo.indicadores.status_geral] : null;
  const StatusIcon = statusConfig?.icon || AlertTriangle;

  return (
    <div className="space-y-6">
      {/* Header com status geral */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Análise Semanal por IA
          </h3>
          {ultimaAtualizacao && (
            <p className="text-sm text-muted-foreground">
              Última atualização: {ultimaAtualizacao.toLocaleString("pt-BR")}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {resumo && statusConfig && (
            <Badge className={`${statusConfig.color} text-white gap-1`}>
              <StatusIcon className="h-3 w-3" />
              {statusConfig.label}
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={carregarResumo} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {resumo && (
        <>
          {/* Resumo Executivo */}
          <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="pt-4">
              <p className="text-sm leading-relaxed">{resumo.resumo_executivo}</p>
            </CardContent>
          </Card>

          {/* KPIs Rápidos */}
          {dadosBrutos && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-2xl font-bold">{dadosBrutos.total}</p>
                  <p className="text-xs text-muted-foreground">Total Incidentes</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-2xl font-bold text-yellow-600">{dadosBrutos.quase_erros}</p>
                  <p className="text-xs text-muted-foreground">Quase-Erros</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-2xl font-bold text-red-600">{dadosBrutos.eventos_adversos}</p>
                  <p className="text-xs text-muted-foreground">Eventos Adversos</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-2xl font-bold">
                    {resumo.indicadores.variacao_total !== undefined
                      ? `${resumo.indicadores.variacao_total > 0 ? "+" : ""}${resumo.indicadores.variacao_total}%`
                      : "-"}
                  </p>
                  <p className="text-xs text-muted-foreground">Variação Semanal</p>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tendências */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Tendências Detectadas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-3">
                    {resumo.tendencias.map((tendencia, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border ${
                          tendencia.tipo === "alerta"
                            ? "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800"
                            : tendencia.tipo === "melhoria"
                            ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
                            : "bg-muted border-border"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {tendencia.tipo === "alerta" ? (
                            <TrendingUp className="h-4 w-4 text-red-500 mt-0.5" />
                          ) : tendencia.tipo === "melhoria" ? (
                            <TrendingDown className="h-4 w-4 text-green-500 mt-0.5" />
                          ) : (
                            <Target className="h-4 w-4 text-muted-foreground mt-0.5" />
                          )}
                          <div className="flex-1">
                            <p className="text-sm">{tendencia.descricao}</p>
                            {tendencia.setor && (
                              <Badge variant="outline" className="mt-1 text-xs">
                                {tendencia.setor}
                              </Badge>
                            )}
                          </div>
                          {tendencia.variacao_percentual !== undefined && (
                            <span
                              className={`text-sm font-medium ${
                                tendencia.variacao_percentual > 0 ? "text-red-600" : "text-green-600"
                              }`}
                            >
                              {tendencia.variacao_percentual > 0 ? "+" : ""}
                              {tendencia.variacao_percentual}%
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Setores Críticos */}
            {resumo.setores_criticos && resumo.setores_criticos.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Setores que Requerem Atenção
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-3">
                      {resumo.setores_criticos.map((setor, index) => (
                        <div key={index} className="p-3 rounded-lg border">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm">{setor.setor}</span>
                            <Badge
                              variant={
                                setor.prioridade === "alta"
                                  ? "destructive"
                                  : setor.prioridade === "media"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {setor.prioridade}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{setor.motivo}</p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Recomendações */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Recomendações de Ação
              </CardTitle>
              <CardDescription>
                Sugestões baseadas nas normas ONA/Qmentum
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {resumo.recomendacoes.map((rec, index) => (
                  <div key={index} className="p-4 rounded-lg border bg-card">
                    <p className="font-medium text-sm mb-2">{rec.acao}</p>
                    <div className="flex flex-wrap gap-2">
                      {rec.setor_alvo && (
                        <Badge variant="outline" className="text-xs">
                          📍 {rec.setor_alvo}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        ⏰ {rec.prazo}
                      </Badge>
                      {rec.base_normativa && (
                        <Badge variant="secondary" className="text-xs">
                          📚 {rec.base_normativa}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Disclaimer */}
          <p className="text-xs text-muted-foreground text-center">
            Esta análise é gerada por IA com base nos dados da última semana e deve ser validada pela equipe de Qualidade.
          </p>
        </>
      )}
    </div>
  );
}
