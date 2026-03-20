import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Activity, DollarSign, Users, CheckCircle2, AlertTriangle, TrendingUp, TrendingDown,
  BarChart3, Target, Clock, Zap, MonitorPlay, Download, Minus
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';
import {
  useKPIsOperacionais,
  useKPIsFinanceiros,
  useKPIsQualidade,
  useKPIsRH,
  type KPIData
} from '@/hooks/useKPIsHospitalar';

interface DashboardBIProps {
  periodoMeses?: number;
}

const TrendIcon = ({ tendencia }: { tendencia: string }) => {
  if (tendencia === 'crescente') return <TrendingUp className="w-3 h-3 text-green-600" />;
  if (tendencia === 'decrescente') return <TrendingDown className="w-3 h-3 text-red-600" />;
  return <Minus className="w-3 h-3 text-muted-foreground" />;
};

const KPICard = ({
  titulo,
  kpi,
  unidade = '',
  icon,
  invertido = false,
}: {
  titulo: string;
  kpi: KPIData;
  unidade?: string;
  icon: React.ReactNode;
  invertido?: boolean;
}) => {
  const pctMeta = kpi.percentual_meta;
  const status = invertido
    ? pctMeta <= 100 ? 'ok' : pctMeta <= 120 ? 'warning' : 'error'
    : pctMeta >= 90 ? 'ok' : pctMeta >= 70 ? 'warning' : 'error';

  const borderColor = {
    ok: 'border-l-green-500',
    warning: 'border-l-yellow-500',
    error: 'border-l-red-500',
  }[status];

  return (
    <Card className={`border-l-4 ${borderColor}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground truncate">{titulo}</p>
            <p className="text-2xl font-bold mt-1 tabular-nums">
              {kpi.valor_atual.toLocaleString('pt-BR', { maximumFractionDigits: kpi.valor_atual > 100 ? 0 : 1 })}
              {unidade && <span className="text-sm font-normal text-muted-foreground ml-1">{unidade}</span>}
            </p>
            <div className="flex items-center gap-1 mt-1">
              <TrendIcon tendencia={kpi.tendencia} />
              <span className={`text-xs tabular-nums ${
                kpi.variacao_percentual > 0 ? 'text-green-600' : kpi.variacao_percentual < 0 ? 'text-red-600' : 'text-muted-foreground'
              }`}>
                {kpi.variacao_percentual > 0 ? '+' : ''}{kpi.variacao_percentual.toFixed(1)}%
              </span>
              <span className="text-xs text-muted-foreground">vs mês ant.</span>
            </div>
          </div>
          <div className="text-muted-foreground/10">{icon}</div>
        </div>
        <Progress value={Math.min(pctMeta, 100)} className="mt-2 h-1" />
        <p className="text-[10px] text-muted-foreground mt-1">Meta: {kpi.meta.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</p>
      </CardContent>
    </Card>
  );
};

const LoadingGrid = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    {[1,2,3,4].map(i => (
      <Card key={i} className="border-l-4 border-l-muted">
        <CardContent className="p-4 space-y-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-1 w-full" />
        </CardContent>
      </Card>
    ))}
  </div>
);

export const DashboardBIHospitalar: React.FC<DashboardBIProps> = ({ periodoMeses = 3 }) => {
  const { toast } = useToast();
  const { data: operacional, isLoading: loadOp } = useKPIsOperacionais(periodoMeses);
  const { data: financeiro, isLoading: loadFin } = useKPIsFinanceiros(periodoMeses);
  const { data: qualidade, isLoading: loadQual } = useKPIsQualidade(periodoMeses);
  const { data: rh, isLoading: loadRH } = useKPIsRH(periodoMeses);

  const handleExport = () => {
    try {
      const rows: any[][] = [
        ['DASHBOARD BI HOSPITALAR - RELATÓRIO EXECUTIVO'],
        ['Data', format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })],
        [''],
        ['INDICADOR', 'VALOR ATUAL', 'MÊS ANTERIOR', 'VARIAÇÃO %', 'META'],
      ];

      if (operacional) {
        rows.push(
          ['Ocupação Leitos (%)', operacional.ocupacao_leitos.valor_atual, operacional.ocupacao_leitos.valor_anterior, operacional.ocupacao_leitos.variacao_percentual, operacional.ocupacao_leitos.meta],
          ['Taxa Mortalidade (%)', operacional.taxa_mortalidade.valor_atual, operacional.taxa_mortalidade.valor_anterior, operacional.taxa_mortalidade.variacao_percentual, operacional.taxa_mortalidade.meta],
          ['Pacientes Ativos', operacional.pacientes_ativos.valor_atual, operacional.pacientes_ativos.valor_anterior, operacional.pacientes_ativos.variacao_percentual, operacional.pacientes_ativos.meta],
          ['Eficiência (%)', operacional.eficiencia_operacional.valor_atual, operacional.eficiencia_operacional.valor_anterior, operacional.eficiencia_operacional.variacao_percentual, operacional.eficiencia_operacional.meta],
        );
      }
      if (financeiro) {
        rows.push(
          [''],
          ['Receita (R$)', financeiro.receita_realizadas.valor_atual, financeiro.receita_realizadas.valor_anterior, financeiro.receita_realizadas.variacao_percentual, ''],
          ['Custos (R$)', financeiro.custos_operacionais.valor_atual, financeiro.custos_operacionais.valor_anterior, financeiro.custos_operacionais.variacao_percentual, ''],
          ['Margem (%)', financeiro.margem_operacional.valor_atual, financeiro.margem_operacional.valor_anterior, financeiro.margem_operacional.variacao_percentual, financeiro.margem_operacional.meta],
        );
      }
      if (qualidade) {
        rows.push(
          [''],
          ['Conformidade (%)', qualidade.taxa_conformidade.valor_atual, qualidade.taxa_conformidade.valor_anterior, qualidade.taxa_conformidade.variacao_percentual, qualidade.taxa_conformidade.meta],
          ['Incidentes NSP', qualidade.incidentes_seguranca.valor_atual, qualidade.incidentes_seguranca.valor_anterior, qualidade.incidentes_seguranca.variacao_percentual, ''],
        );
      }
      if (rh) {
        rows.push(
          [''],
          ['Colaboradores', rh.colaboradores_ativos.valor_atual, '', '', ''],
          ['Absenteísmo (%)', rh.absenteismo.valor_atual, rh.absenteismo.valor_anterior, rh.absenteismo.variacao_percentual, rh.absenteismo.meta],
          ['Capacitações', rh.capacitacoes_realizadas.valor_atual, rh.capacitacoes_realizadas.valor_anterior, rh.capacitacoes_realizadas.variacao_percentual, ''],
        );
      }

      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [{ wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 12 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'BI Hospitalar');
      XLSX.writeFile(wb, `bi_hospitalar_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      toast({ title: 'Relatório exportado com sucesso!' });
    } catch {
      toast({ title: 'Erro ao exportar', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            Dashboard BI – Business Intelligence Hospitalar
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Dados em tempo real • Atualizado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
            <Download className="w-4 h-4" />
            Exportar
          </Button>
          <Button size="sm" className="gap-2" onClick={() => window.open('/modo-tv', '_blank')}>
            <MonitorPlay className="w-4 h-4" />
            Modo TV
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="operacional" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="operacional" className="gap-1.5">
            <Activity className="w-4 h-4" />
            <span className="hidden sm:inline">Operacional</span>
          </TabsTrigger>
          <TabsTrigger value="financeiro" className="gap-1.5">
            <DollarSign className="w-4 h-4" />
            <span className="hidden sm:inline">Financeiro</span>
          </TabsTrigger>
          <TabsTrigger value="qualidade" className="gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span className="hidden sm:inline">Qualidade</span>
          </TabsTrigger>
          <TabsTrigger value="rh" className="gap-1.5">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">RH</span>
          </TabsTrigger>
        </TabsList>

        {/* Operacional */}
        <TabsContent value="operacional" className="space-y-4 mt-4">
          {loadOp ? <LoadingGrid /> : operacional ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard titulo="Ocupação de Leitos" kpi={operacional.ocupacao_leitos} unidade="%" icon={<Activity className="w-8 h-8" />} />
              <KPICard titulo="Taxa de Mortalidade" kpi={operacional.taxa_mortalidade} unidade="%" icon={<AlertTriangle className="w-8 h-8" />} invertido />
              <KPICard titulo="Pacientes Ativos" kpi={operacional.pacientes_ativos} icon={<Users className="w-8 h-8" />} />
              <KPICard titulo="Eficiência Operacional" kpi={operacional.eficiencia_operacional} unidade="%" icon={<Zap className="w-8 h-8" />} />
            </div>
          ) : null}
          {operacional && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Tempo Médio Internação</p>
                  <p className="text-2xl font-bold mt-1 tabular-nums">{operacional.tempo_medio_internacao}<span className="text-sm font-normal text-muted-foreground ml-1">horas</span></p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Leitos Disponíveis</p>
                  <p className="text-2xl font-bold mt-1 tabular-nums">{operacional.disponibilidade_leitos.valor_atual.toFixed(0)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Taxa Readmissão</p>
                  <p className="text-2xl font-bold mt-1 tabular-nums">{operacional.taxa_readmissao.valor_atual.toFixed(1)}<span className="text-sm font-normal text-muted-foreground ml-1">%</span></p>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Financeiro */}
        <TabsContent value="financeiro" className="space-y-4 mt-4">
          {loadFin ? <LoadingGrid /> : financeiro ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-l-4 border-l-green-500">
                  <CardContent className="p-5">
                    <p className="text-xs text-muted-foreground">Receita Total</p>
                    <p className="text-3xl font-bold text-green-600 mt-1 tabular-nums">
                      R$ {financeiro.receita_realizadas.valor_atual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <TrendIcon tendencia={financeiro.receita_realizadas.tendencia} />
                      <span className="text-xs text-muted-foreground">
                        {financeiro.receita_realizadas.variacao_percentual > 0 ? '+' : ''}{financeiro.receita_realizadas.variacao_percentual.toFixed(1)}% vs mês anterior
                      </span>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-red-500">
                  <CardContent className="p-5">
                    <p className="text-xs text-muted-foreground">Custos Operacionais</p>
                    <p className="text-3xl font-bold text-red-600 mt-1 tabular-nums">
                      R$ {financeiro.custos_operacionais.valor_atual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <TrendIcon tendencia={financeiro.custos_operacionais.tendencia} />
                      <span className="text-xs text-muted-foreground">
                        {financeiro.custos_operacionais.variacao_percentual > 0 ? '+' : ''}{financeiro.custos_operacionais.variacao_percentual.toFixed(1)}% vs mês anterior
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Resultado Operacional</p>
                    <p className={`text-2xl font-bold mt-1 tabular-nums ${financeiro.resultado_operacional.valor_atual >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      R$ {financeiro.resultado_operacional.valor_atual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Margem Operacional</p>
                    <p className="text-2xl font-bold mt-1 tabular-nums">{financeiro.margem_operacional.valor_atual.toFixed(1)}%</p>
                    <Progress value={Math.min(Math.max(financeiro.margem_operacional.valor_atual, 0), 100)} className="mt-2 h-1.5" />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Faturamento Médio/Paciente</p>
                    <p className="text-2xl font-bold mt-1 tabular-nums">
                      R$ {financeiro.faturamento_medio_paciente.valor_atual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : null}
        </TabsContent>

        {/* Qualidade */}
        <TabsContent value="qualidade" className="space-y-4 mt-4">
          {loadQual ? <LoadingGrid /> : qualidade ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard titulo="Conformidade Protocolos" kpi={qualidade.taxa_conformidade} unidade="%" icon={<CheckCircle2 className="w-8 h-8" />} />
              <KPICard titulo="Incidentes NSP" kpi={qualidade.incidentes_seguranca} icon={<AlertTriangle className="w-8 h-8" />} invertido />
              <KPICard titulo="Processos Auditados" kpi={qualidade.processos_auditados} icon={<Target className="w-8 h-8" />} />
              <KPICard titulo="Correções Implementadas" kpi={qualidade.correcoes_implementadas} icon={<CheckCircle2 className="w-8 h-8" />} />
            </div>
          ) : null}
        </TabsContent>

        {/* RH */}
        <TabsContent value="rh" className="space-y-4 mt-4">
          {loadRH ? <LoadingGrid /> : rh ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard titulo="Colaboradores Ativos" kpi={rh.colaboradores_ativos} icon={<Users className="w-8 h-8" />} />
                <KPICard titulo="Absenteísmo" kpi={rh.absenteismo} unidade="%" icon={<AlertTriangle className="w-8 h-8" />} invertido />
                <KPICard titulo="Capacitações" kpi={rh.capacitacoes_realizadas} icon={<Target className="w-8 h-8" />} />
                <KPICard titulo="Turnover" kpi={rh.turnover} unidade="%" icon={<TrendingUp className="w-8 h-8" />} invertido />
              </div>
              {Object.keys(rh.distribuicao_por_setor).length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-sm">Distribuição por Setor</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(rh.distribuicao_por_setor)
                        .sort(([,a],[,b]) => b - a)
                        .slice(0, 10)
                        .map(([setor, count]) => (
                          <Badge key={setor} variant="secondary" className="text-xs">
                            {setor}: {count}
                          </Badge>
                        ))
                      }
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
};
