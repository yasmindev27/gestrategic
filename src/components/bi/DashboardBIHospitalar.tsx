import React, { useState } from 'react';
import { useKPIsConsolidado } from '@/hooks/useKPIsHospitalar';
import { GradeMetricas, CardMetrica, IndicadorAI } from '@/components/bi/CardMetrica';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Activity, DollarSign, Users, CheckCircle2, AlertTriangle, TrendingUp,
  BarChart3, Target, Heart, Clock, Zap, Eye, MonitorPlay, Download, Filter
} from 'lucide-react';
import { LoadingState } from '@/components/ui/loading-state';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';

interface DashboardBIProps {
  periodoMeses?: number;
}

export const DashboardBIHospitalar: React.FC<DashboardBIProps> = ({ periodoMeses = 3 }) => {
  const kpis = useKPIsConsolidado(periodoMeses);
  const { toast } = useToast();
  const [exibicaoCompacta, setExibicaoCompacta] = useState(false);

  // Interpretações inteligentes dos dados
  const gerarInterpretacoes = () => {
    const interpretacoes = [];

    if (kpis.operacionais.data?.taxa_mortalidade.valor_atual! > 5) {
      interpretacoes.push({
        titulo: 'Taxa de Mortalidade Elevada',
        valor: kpis.operacionais.data?.taxa_mortalidade.valor_atual!.toFixed(1),
        interpretacao: 'Taxa de mortalidade acima da meta. Recomenda-se análise de causas de óbito.',
        severidade: 'error' as const,
        acao: 'Realizar auditoria de práticas clínicas com foco em protocolos de urgência'
      });
    }

    if (kpis.operacionais.data?.ocupacao_leitos.percentual_meta! > 95) {
      interpretacoes.push({
        titulo: 'Ocupação Crítica de Leitos',
        valor: kpis.operacionais.data?.ocupacao_leitos.percentual_meta!.toFixed(1),
        interpretacao: 'Capacidade ocupada acima de 95%. Sistema operando em limite.',
        severidade: 'warning' as const,
        acao: 'Avaliar necessidade de ampliação de leitos ou aumento de altas'
      });
    }

    if (kpis.financeiros.data?.resultado_operacional.valor_atual! < 1000) {
      interpretacoes.push({
        titulo: 'Resultado Operacional Baixo',
        valor: kpis.financeiros.data?.resultado_operacional.valor_atual!.toFixed(0),
        interpretacao: 'Resultado operacional abaixo do esperado para o período.',
        severidade: 'warning' as const,
        acao: 'Revisar custos com Serviços de Terceiros e Materiais de Consumo'
      });
    }

    if (kpis.qualidade.data?.tempo_resposta_chamados.valor_atual! > 240) {
      interpretacoes.push({
        titulo: 'Tempo de Resposta Elevado',
        valor: kpis.qualidade.data?.tempo_resposta_chamados.valor_atual!.toFixed(0),
        interpretacao: 'Tempo de resposta a chamados acima de 4 horas. Qualidade comprometida.',
        severidade: 'warning' as const,
        acao: 'Aumentar equipe de suporte ou revisar processos de triagem'
      });
    }

    if (kpis.rh.data?.absenteismo.valor_atual! > 5) {
      interpretacoes.push({
        titulo: 'Absenteísmo Elevado',
        valor: kpis.rh.data?.absenteismo.valor_atual!.toFixed(1),
        interpretacao: 'Taxa de absenteísmo acima de 5%. Produtividade afetada.',
        severidade: 'warning' as const,
        acao: 'Investigar causas de ausências e considerar programa de bem-estar'
      });
    }

    if (kpis.operacionais.data?.eficiencia_operacional.percentual_meta! >= 100) {
      interpretacoes.push({
        titulo: 'Eficiência Operacional Excelente',
        valor: kpis.operacionais.data?.eficiencia_operacional.percentual_meta!.toFixed(1),
        interpretacao: 'Operações executadas dentro ou acima da meta.',
        severidade: 'success' as const,
        acao: 'Manter padrões atuais e documentar boas práticas'
      });
    }

    return interpretacoes;
  };

  const interpretacoes = gerarInterpretacoes();

  // Export para Excel com análise completa
  const handleExportAnalise = () => {
    try {
      const dataOperacional = [
        ['INDICADORES OPERACIONAIS', ''],
        ['Métrica', 'Valor', 'Meta', '% Meta', 'Tendência'],
        ['Ocupação de Leitos', kpis.operacionais.data?.ocupacao_leitos.valor_atual, kpis.operacionais.data?.ocupacao_leitos.meta, kpis.operacionais.data?.ocupacao_leitos.percentual_meta, kpis.operacionais.data?.ocupacao_leitos.tendencia],
        ['Pacientes Ativos', kpis.operacionais.data?.pacientes_ativos.valor_atual, kpis.operacionais.data?.pacientes_ativos.meta, kpis.operacionais.data?.pacientes_ativos.percentual_meta, kpis.operacionais.data?.pacientes_ativos.tendencia],
        ['Taxa de Mortalidade', kpis.operacionais.data?.taxa_mortalidade.valor_atual, kpis.operacionais.data?.taxa_mortalidade.meta, kpis.operacionais.data?.taxa_mortalidade.percentual_meta, kpis.operacionais.data?.taxa_mortalidade.tendencia],
        ['Tempo Médio Internação', kpis.operacionais.data?.tempo_medio_internacao, '', '', ''],
      ];

      const dataFinanceiro = [
        ['', ''],
        ['INDICADORES FINANCEIROS', ''],
        ['Métrica', 'Valor', 'Meta', '% Meta', 'Tendência'],
        ['Receita Realizada', kpis.financeiros.data?.receita_realizadas.valor_atual, kpis.financeiros.data?.receita_realizadas.meta, kpis.financeiros.data?.receita_realizadas.percentual_meta, kpis.financeiros.data?.receita_realizadas.tendencia],
        ['Custos Operacionais', kpis.financeiros.data?.custos_operacionais.valor_atual, kpis.financeiros.data?.custos_operacionais.meta, kpis.financeiros.data?.custos_operacionais.percentual_meta, kpis.financeiros.data?.custos_operacionais.tendencia],
        ['Resultado Operacional', kpis.financeiros.data?.resultado_operacional.valor_atual, kpis.financeiros.data?.resultado_operacional.meta, kpis.financeiros.data?.resultado_operacional.percentual_meta, kpis.financeiros.data?.resultado_operacional.tendencia],
        ['Margem Operacional', kpis.financeiros.data?.margem_operacional.valor_atual, kpis.financeiros.data?.margem_operacional.meta, kpis.financeiros.data?.margem_operacional.percentual_meta, kpis.financeiros.data?.margem_operacional.tendencia],
      ];

      const dataQualidade = [
        ['', ''],
        ['INDICADORES DE QUALIDADE', ''],
        ['Métrica', 'Valor', 'Meta', '% Meta', 'Tendência'],
        ['Taxa de Conformidade', kpis.qualidade.data?.taxa_conformidade.valor_atual, kpis.qualidade.data?.taxa_conformidade.meta, kpis.qualidade.data?.taxa_conformidade.percentual_meta, kpis.qualidade.data?.taxa_conformidade.tendencia],
        ['Incidentes de Segurança', kpis.qualidade.data?.incidentes_seguranca.valor_atual, kpis.qualidade.data?.incidentes_seguranca.meta, kpis.qualidade.data?.incidentes_seguranca.percentual_meta, kpis.qualidade.data?.incidentes_seguranca.tendencia],
        ['Tempo Resposta Chamados', kpis.qualidade.data?.tempo_resposta_chamados.valor_atual, kpis.qualidade.data?.tempo_resposta_chamados.meta, kpis.qualidade.data?.tempo_resposta_chamados.percentual_meta, kpis.qualidade.data?.tempo_resposta_chamados.tendencia],
      ];

      const dataRH = [
        ['', ''],
        ['INDICADORES DE RH', ''],
        ['Métrica', 'Valor', 'Meta', '% Meta', 'Tendência'],
        ['Absenteísmo', kpis.rh.data?.absenteismo.valor_atual, kpis.rh.data?.absenteismo.meta, kpis.rh.data?.absenteismo.percentual_meta, kpis.rh.data?.absenteismo.tendencia],
        ['Turnover', kpis.rh.data?.turnover.valor_atual, kpis.rh.data?.turnover.meta, kpis.rh.data?.turnover.percentual_meta, kpis.rh.data?.turnover.tendencia],
        ['Colaboradores Ativos', kpis.rh.data?.colaboradores_ativos.valor_atual, kpis.rh.data?.colaboradores_ativos.meta, kpis.rh.data?.colaboradores_ativos.percentual_meta, kpis.rh.data?.colaboradores_ativos.tendencia],
      ];

      const allData = [...dataOperacional, ...dataFinanceiro, ...dataQualidade, ...dataRH];

      const ws = XLSX.utils.aoa_to_sheet(allData);
      ws['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 15 }];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Análise BI');
      XLSX.writeFile(wb, `relatorio_bi_hospitalar_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);

      toast({ title: 'Relatório exportado com sucesso!' });
    } catch (error) {
      toast({ title: 'Erro ao exportar', variant: 'destructive' });
    }
  };

  if (kpis.isLoading) {
    return <LoadingState message="Carregando dashboard BI..." />;
  }

  if (kpis.isError) {
    return (
      <Card className="border-destructive">
        <CardContent className="p-6 text-center">
          <AlertTriangle className="w-12 h-12 mx-auto text-destructive mb-2" />
          <p className="text-destructive font-semibold">Erro ao carregar dados BI</p>
          <p className="text-sm text-muted-foreground mt-1">Verifique sua conexão com o banco de dados</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            Dashboard BI - Business Intelligence Hospitalar
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Período: {format(new Date(), "MMMM/yyyy", { locale: ptBR })} (últimos {periodoMeses} meses)
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExibicaoCompacta(!exibicaoCompacta)}
            className="gap-2"
          >
            <Filter className="w-4 h-4" />
            {exibicaoCompacta ? 'Detalhado' : 'Compacto'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportAnalise}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Exportar Análise
          </Button>
          <Button
            size="sm"
            className="gap-2"
            onClick={() => window.open('/modo-tv', '_blank')}
          >
            <MonitorPlay className="w-4 h-4" />
            Modo TV
          </Button>
        </div>
      </div>

      {/* Alert de Interpretações */}
      {interpretacoes.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Interpretações de Dados
          </h3>
          <div className="space-y-2">
            {interpretacoes.map((interp, idx) => (
              <IndicadorAI
                key={idx}
                titulo={interp.titulo}
                valor={parseFloat(interp.valor)}
                interpretacao={interp.interpretacao}
                severidade={interp.severidade}
                acao={interp.acao}
              />
            ))}
          </div>
        </div>
      )}

      {/* Tabs por Área */}
      <Tabs defaultValue="operacional" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="operacional" className="gap-2">
            <Activity className="w-4 h-4" />
            <span className="hidden sm:inline">Operacional</span>
          </TabsTrigger>
          <TabsTrigger value="financeiro" className="gap-2">
            <DollarSign className="w-4 h-4" />
            <span className="hidden sm:inline">Financeiro</span>
          </TabsTrigger>
          <TabsTrigger value="qualidade" className="gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span className="hidden sm:inline">Qualidade</span>
          </TabsTrigger>
          <TabsTrigger value="rh" className="gap-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">RH</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab Operacional */}
        <TabsContent value="operacional" className="space-y-4">
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Métricas Operacionais
            </h3>
            <GradeMetricas
              metricas={[
                {
                  titulo: 'Ocupação de Leitos',
                  kpi: kpis.operacionais.data?.ocupacao_leitos!,
                  unidade: '%',
                  icon: <Zap className="w-5 h-5" />,
                  cor: 'azul',
                },
                {
                  titulo: 'Pacientes Ativos',
                  kpi: kpis.operacionais.data?.pacientes_ativos!,
                  unidade: '',
                  icon: <Users className="w-5 h-5" />,
                  cor: 'verde',
                },
                {
                  titulo: 'Taxa de Readmissão',
                  kpi: kpis.operacionais.data?.taxa_readmissao!,
                  unidade: '%',
                  icon: <TrendingUp className="w-5 h-5" />,
                  cor: 'amarelo',
                },
                {
                  titulo: 'Disponibilidade de Leitos',
                  kpi: kpis.operacionais.data?.disponibilidade_leitos!,
                  unidade: '',
                  icon: <Target className="w-5 h-5" />,
                  cor: 'verde',
                },
              ]}
              colunas={4}
              compact={exibicaoCompacta}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Tempo Médio Internação</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {kpis.operacionais.data?.tempo_medio_internacao.toFixed(0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">dias</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Eficiência Operacional</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-2">
                  <p className="text-3xl font-bold">
                    {kpis.operacionais.data?.eficiencia_operacional.valor_atual.toFixed(0)}%
                  </p>
                  <Badge 
                    variant={kpis.operacionais.data?.eficiencia_operacional.percentual_meta! >= 100 ? 'default' : 'secondary'}
                    className="mb-1"
                  >
                    {kpis.operacionais.data?.eficiencia_operacional.percentual_meta!.toFixed(0)}% da meta
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab Financeiro */}
        <TabsContent value="financeiro" className="space-y-4">
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Métricas Financeiras
            </h3>
            <GradeMetricas
              metricas={[
                {
                  titulo: 'Receita Realizada',
                  kpi: kpis.financeiros.data?.receita_realizadas!,
                  unidade: 'R$',
                  icon: <TrendingUp className="w-5 h-5" />,
                  cor: 'verde',
                },
                {
                  titulo: 'Custos Operacionais',
                  kpi: kpis.financeiros.data?.custos_operacionais!,
                  unidade: 'R$',
                  icon: <BarChart3 className="w-5 h-5" />,
                  cor: 'vermelho',
                },
                {
                  titulo: 'Resultado Operacional',
                  kpi: kpis.financeiros.data?.resultado_operacional!,
                  unidade: 'R$',
                  icon: <DollarSign className="w-5 h-5" />,
                  cor: 'azul',
                },
                {
                  titulo: 'Margem Operacional',
                  kpi: kpis.financeiros.data?.margem_operacional!,
                  unidade: '%',
                  icon: <Target className="w-5 h-5" />,
                  cor: 'roxo',
                },
              ]}
              colunas={4}
              compact={exibicaoCompacta}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Faturamento Médio/Paciente</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  R$ {kpis.financeiros.data?.faturamento_medio_paciente.valor_atual.toFixed(0)}
                </p>
                <Badge className="mt-2">
                  {kpis.financeiros.data?.faturamento_medio_paciente.variacao_percentual! >= 0 ? '+' : ''}
                  {kpis.financeiros.data?.faturamento_medio_paciente.variacao_percentual?.toFixed(1)}%
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Custo por Leito</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  R$ {kpis.financeiros.data?.custos_por_leito.valor_atual.toFixed(0)}
                </p>
                <Badge className="mt-2">
                  {kpis.financeiros.data?.custos_por_leito.variacao_percentual! >= 0 ? '+' : ''}
                  {kpis.financeiros.data?.custos_por_leito.variacao_percentual?.toFixed(1)}%
                </Badge>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab Qualidade */}
        <TabsContent value="qualidade" className="space-y-4">
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Métricas de Qualidade
            </h3>
            <GradeMetricas
              metricas={[
                {
                  titulo: 'Taxa de Conformidade',
                  kpi: kpis.qualidade.data?.taxa_conformidade!,
                  unidade: '%',
                  icon: <CheckCircle2 className="w-5 h-5" />,
                  cor: 'verde',
                },
                {
                  titulo: 'Incidentes de Segurança',
                  kpi: kpis.qualidade.data?.incidentes_seguranca!,
                  unidade: '',
                  icon: <AlertTriangle className="w-5 h-5" />,
                  cor: 'vermelho',
                },
                {
                  titulo: 'Tempo Resposta',
                  kpi: kpis.qualidade.data?.tempo_resposta_chamados!,
                  unidade: 'min',
                  icon: <Clock className="w-5 h-5" />,
                  cor: 'amarelo',
                },
                {
                  titulo: 'Satisfação Colaboradores',
                  kpi: kpis.qualidade.data?.satisfacao_colaboradores!,
                  unidade: '/5',
                  icon: <Heart className="w-5 h-5" />,
                  cor: 'roxo',
                },
              ]}
              colunas={4}
              compact={exibicaoCompacta}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Processos Auditados</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {kpis.qualidade.data?.processos_auditados.valor_atual.toFixed(0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Meta: {kpis.qualidade.data?.processos_auditados.meta.toFixed(0)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Correções Implementadas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {kpis.qualidade.data?.correcoes_implementadas.valor_atual.toFixed(0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Meta: {kpis.qualidade.data?.correcoes_implementadas.meta.toFixed(0)}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab RH */}
        <TabsContent value="rh" className="space-y-4">
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Métricas de RH
            </h3>
            <GradeMetricas
              metricas={[
                {
                  titulo: 'Colaboradores Ativos',
                  kpi: kpis.rh.data?.colaboradores_ativos!,
                  unidade: '',
                  icon: <Users className="w-5 h-5" />,
                  cor: 'verde',
                },
                {
                  titulo: 'Absenteísmo',
                  kpi: kpis.rh.data?.absenteismo!,
                  unidade: '%',
                  icon: <AlertTriangle className="w-5 h-5" />,
                  cor: 'vermelho',
                },
                {
                  titulo: 'Turnover',
                  kpi: kpis.rh.data?.turnover!,
                  unidade: '%',
                  icon: <TrendingUp className="w-5 h-5" />,
                  cor: 'amarelo',
                },
                {
                  titulo: 'Capacitações',
                  kpi: kpis.rh.data?.capacitacoes_realizadas!,
                  unidade: '',
                  icon: <Target className="w-5 h-5" />,
                  cor: 'azul',
                },
              ]}
              colunas={4}
              compact={exibicaoCompacta}
            />
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-3">Distribuição por Setor</h4>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {Object.entries(kpis.rh.data?.distribuicao_por_setor || {}).map(([setor, qtd]) => (
                <Card key={setor} className="text-center">
                  <CardContent className="p-3">
                    <p className="text-2xl font-bold text-blue-600">{qtd}</p>
                    <p className="text-xs text-muted-foreground mt-1 truncate">{setor}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Idade Média da Equipe</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">
                {kpis.rh.data?.idade_media_equipe.toFixed(0)}
                <span className="text-sm text-muted-foreground ml-2">anos</span>
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer com Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <p className="text-sm text-blue-900">
            <strong>Nota:</strong> Este dashboard apresenta análise de BI agreg ada dos últimos {periodoMeses} meses
            (jan/fev/mar 2026). Dados atualizados automaticamente a cada 10 minutos.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
