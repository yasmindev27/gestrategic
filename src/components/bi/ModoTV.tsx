import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Clock,
  Users, Bed, DollarSign, Activity, BarChart3, Zap, Heart, Target
} from 'lucide-react';
import { useKPIsConsolidado } from '@/hooks/useKPIsHospitalar';
import { GradeMetricas, CardMetrica, GaugeMetrica, IndicadorAI } from '@/components/bi/CardMetrica';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/ui/loading-state';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TabPainel {
  id: string;
  titulo: string;
  icone: React.ReactNode;
}

const PAINEIS: TabPainel[] = [
  { id: 'operacional', titulo: 'Operacional', icone: <Activity className="w-5 h-5" /> },
  { id: 'financeiro', titulo: 'Financeiro', icone: <DollarSign className="w-5 h-5" /> },
  { id: 'qualidade', titulo: 'Qualidade', icone: <CheckCircle2 className="w-5 h-5" /> },
  { id: 'rh', titulo: 'Recursos Humanos', icone: <Users className="w-5 h-5" /> },
];

const AUTO_SCROLL_DELAY = 30000; // 30 segundos por painel

export const ModoTV: React.FC = () => {
  const kpis = useKPIsConsolidado(3);
  const [paginaAtiva, setPaginaAtiva] = useState(0);
  const [proximaAtualizacao, setProximaAtualizacao] = useState<Date>(new Date());
  const [tempoRestante, setTempoRestante] = useState(30);

  // Auto-scroll entre painéis
  useEffect(() => {
    const interval = setInterval(() => {
      setPaginaAtiva((prev) => (prev + 1) % PAINEIS.length);
      setProximaAtualizacao(new Date(Date.now() + AUTO_SCROLL_DELAY));
      setTempoRestante(30);
    }, AUTO_SCROLL_DELAY);

    return () => clearInterval(interval);
  }, []);

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTempoRestante((prev) => (prev > 1 ? prev - 1 : 30));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const painel_atual = PAINEIS[paginaAtiva];

  if (kpis.isLoading) {
    return (
      <div className="w-screen h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <LoadingState />
      </div>
    );
  }

  if (kpis.isError) {
    return (
      <div className="w-screen h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center text-white">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h1 className="text-3xl font-bold mb-2">Erro ao carregar dados</h1>
          <p className="text-gray-300">Verifique sua conexão e tente novamente</p>
        </div>
      </div>
    );
  }

  const renderPainelOperacional = () => (
    <div className="space-y-6">
      <GradeMetricas
        metricas={[
          {
            titulo: 'Ocupação de Leitos',
            kpi: kpis.operacionais.data?.ocupacao_leitos!,
            unidade: '%',
            icon: <Bed className="w-6 h-6" />,
            cor: 'azul',
          },
          {
            titulo: 'Pacientes Ativos',
            kpi: kpis.operacionais.data?.pacientes_ativos!,
            unidade: '',
            icon: <Users className="w-6 h-6" />,
            cor: 'verde',
          },
          {
            titulo: 'Disponibilidade de Leitos',
            kpi: kpis.operacionais.data?.disponibilidade_leitos!,
            unidade: '',
            icon: <Bed className="w-6 h-6" />,
            cor: 'amarelo',
          },
          {
            titulo: 'Eficiência Operacional',
            kpi: kpis.operacionais.data?.eficiencia_operacional!,
            unidade: '%',
            icon: <Zap className="w-6 h-6" />,
            cor: 'roxo',
          },
        ]}
        colunas={4}
      />

      <div className="grid grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-red-500/10 to-red-600/10 border-red-300">
          <CardHeader>
            <CardTitle className="text-red-700 flex items-center gap-2">
              <Heart className="w-5 h-5" />
              Taxa de Mortalidade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-red-700">
              {kpis.operacionais.data?.taxa_mortalidade.valor_atual.toFixed(1)}%
            </p>
            <p className="text-sm text-gray-600 mt-2">
              Meta: {kpis.operacionais.data?.taxa_mortalidade.meta.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 border-orange-300">
          <CardHeader>
            <CardTitle className="text-orange-700 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Tempo Médio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-orange-700">
              {kpis.operacionais.data?.tempo_medio_internacao.toFixed(0)}
            </p>
            <p className="text-sm text-gray-600 mt-2">dias de internação</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-300">
          <CardHeader>
            <CardTitle className="text-purple-700 flex items-center gap-2">
              <Target className="w-5 h-5" />
              Satisfação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-purple-700">
              {kpis.operacionais.data?.satisfacao_paciente.valor_atual.toFixed(1)}/5
            </p>
            <p className="text-sm text-gray-600 mt-2">de satisfação do paciente</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderPainelFinanceiro = () => (
    <div className="space-y-6">
      <GradeMetricas
        metricas={[
          {
            titulo: 'Receita Realizada',
            kpi: kpis.financeiros.data?.receita_realizadas!,
            unidade: 'R$',
            icon: <DollarSign className="w-6 h-6" />,
            cor: 'verde',
          },
          {
            titulo: 'Custos Operacionais',
            kpi: kpis.financeiros.data?.custos_operacionais!,
            unidade: 'R$',
            icon: <BarChart3 className="w-6 h-6" />,
            cor: 'vermelho',
          },
          {
            titulo: 'Resultado Operacional',
            kpi: kpis.financeiros.data?.resultado_operacional!,
            unidade: 'R$',
            icon: <Zap className="w-6 h-6" />,
            cor: 'azul',
          },
          {
            titulo: 'Margem Operacional',
            kpi: kpis.financeiros.data?.margem_operacional!,
            unidade: '%',
            icon: <Target className="w-6 h-6" />,
            cor: 'roxo',
          },
        ]}
        colunas={4}
      />

      <div className="grid grid-cols-2 gap-6">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-300">
          <CardHeader>
            <CardTitle className="text-blue-700">Faturamento Médio/Paciente</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-blue-700">
              R$ {kpis.financeiros.data?.faturamento_medio_paciente.valor_atual.toFixed(0)}
            </p>
            <Badge className="mt-2">
              {kpis.financeiros.data?.faturamento_medio_paciente.variacao_percentual! >= 0 ? '+' : ''}
              {kpis.financeiros.data?.faturamento_medio_paciente.variacao_percentual?.toFixed(1)}%
            </Badge>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/10 border-amber-300">
          <CardHeader>
            <CardTitle className="text-amber-700">Custo por Leito</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-amber-700">
              R$ {kpis.financeiros.data?.custos_por_leito.valor_atual.toFixed(0)}
            </p>
            <Badge className="mt-2">
              {kpis.financeiros.data?.custos_por_leito.variacao_percentual! >= 0 ? '+' : ''}
              {kpis.financeiros.data?.custos_por_leito.variacao_percentual?.toFixed(1)}%
            </Badge>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderPainelQualidade = () => (
    <div className="space-y-6">
      <GradeMetricas
        metricas={[
          {
            titulo: 'Taxa de Conformidade',
            kpi: kpis.qualidade.data?.taxa_conformidade!,
            unidade: '%',
            icon: <CheckCircle2 className="w-6 h-6" />,
            cor: 'verde',
          },
          {
            titulo: 'Incidentes de Segurança',
            kpi: kpis.qualidade.data?.incidentes_seguranca!,
            unidade: '',
            icon: <AlertTriangle className="w-6 h-6" />,
            cor: 'vermelho',
          },
          {
            titulo: 'Tempo Resposta Chamados',
            kpi: kpis.qualidade.data?.tempo_resposta_chamados!,
            unidade: 'min',
            icon: <Clock className="w-6 h-6" />,
            cor: 'amarelo',
          },
          {
            titulo: 'Satisfação Colaboradores',
            kpi: kpis.qualidade.data?.satisfacao_colaboradores!,
            unidade: '/5',
            icon: <Heart className="w-6 h-6" />,
            cor: 'roxo',
          },
        ]}
        colunas={4}
      />

      <div className="grid grid-cols-2 gap-6">
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 border-emerald-300">
          <CardHeader>
            <CardTitle className="text-emerald-700">Processos Auditados</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-emerald-700">
              {kpis.qualidade.data?.processos_auditados.valor_atual.toFixed(0)}
            </p>
            <p className="text-sm text-gray-600 mt-2">Meta: {kpis.qualidade.data?.processos_auditados.meta.toFixed(0)}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-teal-500/10 to-teal-600/10 border-teal-300">
          <CardHeader>
            <CardTitle className="text-teal-700">Correções Implementadas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-teal-700">
              {kpis.qualidade.data?.correcoes_implementadas.valor_atual.toFixed(0)}
            </p>
            <p className="text-sm text-gray-600 mt-2">Meta: {kpis.qualidade.data?.correcoes_implementadas.meta.toFixed(0)}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderPainelRH = () => (
    <div className="space-y-6">
      <GradeMetricas
        metricas={[
          {
            titulo: 'Colaboradores Ativos',
            kpi: kpis.rh.data?.colaboradores_ativos!,
            unidade: '',
            icon: <Users className="w-6 h-6" />,
            cor: 'verde',
          },
          {
            titulo: 'Absenteísmo',
            kpi: kpis.rh.data?.absenteismo!,
            unidade: '%',
            icon: <Clock className="w-6 h-6" />,
            cor: 'vermelho',
          },
          {
            titulo: 'Turnover',
            kpi: kpis.rh.data?.turnover!,
            unidade: '%',
            icon: <TrendingUp className="w-6 h-6" />,
            cor: 'amarelo',
          },
          {
            titulo: 'Capacitações Realizadas',
            kpi: kpis.rh.data?.capacitacoes_realizadas!,
            unidade: '',
            icon: <Target className="w-6 h-6" />,
            cor: 'azul',
          },
        ]}
        colunas={4}
      />

      <Card className="bg-gradient-to-br from-slate-500/10 to-slate-600/10 border-slate-300">
        <CardHeader>
          <CardTitle className="text-slate-700">Distribuição por Setor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {Object.entries(kpis.rh.data?.distribuicao_por_setor || {}).map(([setor, quantidade]) => (
              <div key={setor} className="bg-white/50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-slate-700">{quantidade}</p>
                <p className="text-xs text-gray-600 mt-1">{setor}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-indigo-500/10 to-indigo-600/10 border-indigo-300">
        <CardHeader>
          <CardTitle className="text-indigo-700">Idade Média da Equipe</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold text-indigo-700">
            {kpis.rh.data?.idade_media_equipe.toFixed(0)}
          </p>
          <p className="text-sm text-gray-600 mt-2">anos</p>
        </CardContent>
      </Card>
    </div>
  );

  const renderPainel = () => {
    switch (painel_atual.id) {
      case 'operacional':
        return renderPainelOperacional();
      case 'financeiro':
        return renderPainelFinanceiro();
      case 'qualidade':
        return renderPainelQualidade();
      case 'rh':
        return renderPainelRH();
      default:
        return renderPainelOperacional();
    }
  };

  return (
    <div className="w-screen h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
      {/* Header */}
      <div className="bg-slate-900/80 backdrop-blur border-b border-slate-700 px-8 py-6">
        <div className="flex items-center justify-between">
          {/* Logo/Título */}
          <div>
            <h1 className="text-4xl font-bold text-white flex items-center gap-3">
              <Activity className="w-10 h-10 text-blue-400" />
              GEStrategic - Modo TV
            </h1>
            <p className="text-gray-400 mt-2">Business Intelligence Hospitalar em Tempo Real</p>
          </div>

          {/* Info */}
          <div className="text-right text-white">
            <p className="text-sm text-gray-400">
              {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
            <p className="text-lg font-semibold mt-1">
              {format(new Date(), 'HH:mm:ss')}
            </p>
          </div>
        </div>
      </div>

      {/* Navegação de Painéis */}
      <div className="bg-slate-800/50 backdrop-blur border-b border-slate-700 px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex gap-4">
            {PAINEIS.map((painel, idx) => (
              <button
                key={painel.id}
                onClick={() => {
                  setPaginaAtiva(idx);
                  setProximaAtualizacao(new Date(Date.now() + AUTO_SCROLL_DELAY));
                  setTempoRestante(30);
                }}
                className={cn(
                  'px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-all duration-300',
                  paginaAtiva === idx
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/50'
                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                )}
              >
                {painel.icone}
                {painel.titulo}
              </button>
            ))}
          </div>

          {/* Status Online */}
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 border border-emerald-400 rounded-lg">
            <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-emerald-300 font-semibold">Online • Próxima atualização em {tempoRestante}s</span>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="p-8 h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-white mb-2">{painel_atual.titulo}</h2>
          <div className="h-1 w-32 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" />
        </div>

        {renderPainel()}
      </div>

      {/* Footer com Indicadores Globais */}
      <div className="bg-slate-900/80 backdrop-blur border-t border-slate-700 px-8 py-4">
        <div className="flex items-center justify-between text-sm text-gray-400">
          <div>Sistema Gestrategic BI v2.0 • Atualização automática a cada 10 minutos</div>
          <div className="flex gap-4">
            <span>Status: ✓ Produção</span>
            <span>Base: {format(new Date(), "'jan/fev/mar' yyyy")}</span>
            <span>Painel: {paginaAtiva + 1}/{PAINEIS.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

