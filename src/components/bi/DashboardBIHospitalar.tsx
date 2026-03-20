import React, { useState } from 'react';
import { useImportedBIData } from '@/hooks/useImportedBIData';
import { BIDataImport } from '@/components/bi/BIDataImport';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Activity, DollarSign, Users, CheckCircle2, AlertTriangle, TrendingUp,
  BarChart3, Target, Heart, Clock, Zap, Eye, MonitorPlay, Download, Filter, Upload
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';

interface DashboardBIProps {
  periodoMeses?: number;
}

export const DashboardBIHospitalar: React.FC<DashboardBIProps> = ({ periodoMeses = 3 }) => {
  const { dados, obterUltimosMeses } = useImportedBIData();
  const { toast } = useToast();
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const ultimosMeses = obterUltimosMeses(periodoMeses);
  const mesAtual = ultimosMeses[ultimosMeses.length - 1];

  // Função auxiliar para renderizar card métrica
  const CardMetrica = ({ 
    titulo, 
    valor, 
    unidade, 
    icon, 
    status 
  }: { 
    titulo: string; 
    valor: number; 
    unidade: string; 
    icon: React.ReactNode;
    status?: 'ok' | 'warning' | 'error';
  }) => {
    const colores = {
      ok: 'border-l-4 border-l-green-500',
      warning: 'border-l-4 border-l-yellow-500',
      error: 'border-l-4 border-l-red-500',
    };

    return (
      <Card className={colores[status || 'ok']}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">{titulo}</p>
              <p className="text-2xl font-bold mt-1">
                {valor.toLocaleString('pt-BR', { 
                  maximumFractionDigits: valor > 100 ? 0 : 1 
                })}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{unidade}</p>
            </div>
            <div className="text-3xl opacity-10">
              {icon}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const handleExportAnalise = () => {
    try {
      const data = [
        ['DASHBOARD BI HOSPITALAR - RELATÓRIO'],
        ['Data de Geração', format(new Date(), 'dd/MM/yyyy HH:mm')],
        ['', ''],
        ['MÊS', 'OCUPAÇÃO', 'MORTALIDADE', 'RECEITA', 'CUSTOS', 'RESULTADO', 'CONFORMIDADE'],
        ...ultimosMeses.map(m => [
          m.mes,
          `${m.ocupacao_leitos}%`,
          `${m.taxa_mortalidade}%`,
          `R$ ${m.receita_total.toLocaleString('pt-BR')}`,
          `R$ ${m.custos_totais.toLocaleString('pt-BR')}`,
          `R$ ${m.resultado_operacional.toLocaleString('pt-BR')}`,
          `${m.conformidade_protocolos}%`,
        ]),
      ];

      const ws = XLSX.utils.aoa_to_sheet(data);
      ws['!cols'] = [
        { wch: 15 },
        { wch: 12 },
        { wch: 12 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
        { wch: 14 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'BI Hospitalar');
      XLSX.writeFile(wb, `relatorio_bi_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);

      toast({ title: 'Relatório exportado com sucesso!' });
    } catch (error) {
      toast({ title: 'Erro ao exportar', variant: 'destructive' });
    }
  };

  if (!dados || dados.length === 0) {
    return (
      <>
        <Card className="border-yellow-500">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto text-yellow-500 mb-2" />
            <p className="font-semibold mb-2">Nenhum dado importado</p>
            <p className="text-sm text-muted-foreground mb-4">
              Importe dados do sistema V3 para visualizar o Dashboard BI
            </p>
            <Button onClick={() => setImportDialogOpen(true)} className="gap-2">
              <Upload className="w-4 h-4" />
              Importar Dados
            </Button>
          </CardContent>
        </Card>
        <BIDataImport open={importDialogOpen} onOpenChange={setImportDialogOpen} />
      </>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-blue-600" />
              Dashboard BI - Business Intelligence Hospitalar
            </h2>
            {mesAtual && (
              <p className="text-sm text-muted-foreground mt-1">
                Dados de {mesAtual.mes} • {dados.length} mês(es) importado(s)
              </p>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setImportDialogOpen(true)}
              className="gap-2"
            >
              <Upload className="w-4 h-4" />
              Importar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportAnalise}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Exportar
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

        {mesAtual && (
          <>
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <CardMetrica
                    titulo="Ocupação de Leitos"
                    valor={mesAtual.ocupacao_leitos}
                    unidade="%"
                    icon={<Activity className="w-8 h-8" />}
                    status={mesAtual.ocupacao_leitos > 95 ? 'error' : mesAtual.ocupacao_leitos > 85 ? 'warning' : 'ok'}
                  />
                  <CardMetrica
                    titulo="Taxa de Mortalidade"
                    valor={mesAtual.taxa_mortalidade}
                    unidade="%"
                    icon={<AlertTriangle className="w-8 h-8" />}
                    status={mesAtual.taxa_mortalidade > 5 ? 'error' : 'ok'}
                  />
                  <CardMetrica
                    titulo="Tempo Internação"
                    valor={mesAtual.tempo_medio_internacao}
                    unidade="dias"
                    icon={<Clock className="w-8 h-8" />}
                  />
                  <CardMetrica
                    titulo="Eficiência Operacional"
                    valor={mesAtual.eficiencia_operacional}
                    unidade="%"
                    icon={<Zap className="w-8 h-8" />}
                    status={mesAtual.eficiencia_operacional >= 90 ? 'ok' : 'warning'}
                  />
                </div>
              </TabsContent>

              {/* Tab Financeiro */}
              <TabsContent value="financeiro" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Receita Total</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold text-green-600">
                        R$ {mesAtual.receita_total.toLocaleString('pt-BR')}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Custos Totais</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold text-red-600">
                        R$ {mesAtual.custos_totais.toLocaleString('pt-BR')}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Resultado Operacional</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className={`text-3xl font-bold ${mesAtual.resultado_operacional > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                        R$ {mesAtual.resultado_operacional.toLocaleString('pt-BR')}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Margem Operacional</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold">
                        {mesAtual.margem_operacional.toFixed(1)}%
                      </p>
                      <Progress value={Math.min(mesAtual.margem_operacional, 100)} className="mt-2" />
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Tab Qualidade */}
              <TabsContent value="qualidade" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <CardMetrica
                    titulo="Conformidade Protocolos"
                    valor={mesAtual.conformidade_protocolos}
                    unidade="%"
                    icon={<CheckCircle2 className="w-8 h-8" />}
                    status={mesAtual.conformidade_protocolos >= 95 ? 'ok' : mesAtual.conformidade_protocolos >= 90 ? 'warning' : 'error'}
                  />
                  <CardMetrica
                    titulo="Tempo Resposta"
                    valor={mesAtual.tempo_resposta_chamados}
                    unidade="min"
                    icon={<Clock className="w-8 h-8" />}
                    status={mesAtual.tempo_resposta_chamados > 240 ? 'warning' : 'ok'}
                  />
                  <CardMetrica
                    titulo="Incidentes Reportados"
                    valor={mesAtual.incidentes_reportados}
                    unidade="casos"
                    icon={<AlertTriangle className="w-8 h-8" />}
                  />
                  <CardMetrica
                    titulo="Satisfação Paciente"
                    valor={mesAtual.satisfacao_paciente}
                    unidade="%"
                    icon={<Heart className="w-8 h-8" />}
                  />
                </div>
              </TabsContent>

              {/* Tab RH */}
              <TabsContent value="rh" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <CardMetrica
                    titulo="Total de Colaboradores"
                    valor={mesAtual.total_colaboradores}
                    unidade="pessoas"
                    icon={<Users className="w-8 h-8" />}
                  />
                  <CardMetrica
                    titulo="Absenteísmo"
                    valor={mesAtual.absenteismo}
                    unidade="%"
                    icon={<AlertTriangle className="w-8 h-8" />}
                    status={mesAtual.absenteismo > 5 ? 'warning' : 'ok'}
                  />
                  <CardMetrica
                    titulo="Rotatividade"
                    valor={mesAtual.rotatividade}
                    unidade="%"
                    icon={<TrendingUp className="w-8 h-8" />}
                  />
                  <CardMetrica
                    titulo="Treinamentos"
                    valor={mesAtual.treinamentos_realizados}
                    unidade="atividades"
                    icon={<Target className="w-8 h-8" />}
                  />
                </div>
              </TabsContent>
            </Tabs>

            {/* Histórico de Meses */}
            {ultimosMeses.length > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Histórico dos Últimos Meses</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {ultimosMeses.map((m) => (
                      <div key={m.mes} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{m.mes}</p>
                          <p className="text-sm text-muted-foreground">
                            Ocupação: {m.ocupacao_leitos}% • Receita: R$ {m.receita_total.toLocaleString('pt-BR')}
                          </p>
                        </div>
                        <Badge variant={m.ocupacao_leitos > 85 ? 'secondary' : 'outline'}>
                          {m.ocupacao_leitos}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Dialog de Importação */}
      <BIDataImport open={importDialogOpen} onOpenChange={setImportDialogOpen} />
    </>
  );
};

