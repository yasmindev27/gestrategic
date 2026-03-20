import React, { useState, useEffect, useMemo } from 'react';
import { useKPIsOperacionais, useKPIsFinanceiros, useKPIsQualidade, useKPIsRH } from '@/hooks/useKPIsHospitalar';
import { ChevronRight, Clock, Pause, Play } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { subDays } from 'date-fns';

const AUTO_SCROLL_DELAY = 45000;

// Hook para tendência de atendimentos dos últimos 7 dias
const useTendenciaAtendimentos = () => {
  return useQuery({
    queryKey: ['tendencia_atendimentos_7d'],
    queryFn: async () => {
      const dias: Array<{ data: string; label: string; atendidos: number; pendentes: number }> = [];

      for (let i = 6; i >= 0; i--) {
        const dia = subDays(new Date(), i);
        const diaStr = format(dia, 'yyyy-MM-dd');
        const label = format(dia, 'EEE', { locale: ptBR });

        const { count: resolvidos } = await supabase
          .from('chamados')
          .select('id', { count: 'exact', head: true })
          .gte('data_abertura', `${diaStr}T00:00:00`)
          .lt('data_abertura', `${diaStr}T23:59:59`)
          .eq('status', 'resolvido');

        const { count: pendentes } = await supabase
          .from('chamados')
          .select('id', { count: 'exact', head: true })
          .gte('data_abertura', `${diaStr}T00:00:00`)
          .lt('data_abertura', `${diaStr}T23:59:59`)
          .neq('status', 'resolvido');

        dias.push({
          data: diaStr,
          label: label.charAt(0).toUpperCase() + label.slice(1),
          atendidos: resolvidos || 0,
          pendentes: pendentes || 0,
        });
      }

      return dias;
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });
};

// Hook para índice ONA (conformidade geral)
const useIndiceONA = () => {
  return useQuery({
    queryKey: ['indice_ona'],
    queryFn: async () => {
      const { count: totalAuditorias } = await supabase
        .from('auditorias_qualidade')
        .select('id', { count: 'exact', head: true });

      const { count: conformes } = await supabase
        .from('auditorias_qualidade')
        .select('id', { count: 'exact', head: true })
        .eq('resultado', 'conforme');

      if (!totalAuditorias || totalAuditorias === 0) return 0;
      return Math.round(((conformes || 0) / totalAuditorias) * 100);
    },
    staleTime: 5 * 60 * 1000,
  });
};

// Gauge SVG component
const GaugeSVG: React.FC<{ valor: number; tamanho?: number }> = ({ valor, tamanho = 160 }) => {
  const radius = 62;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (valor / 100) * circumference;
  const cor = valor >= 80 ? '#22c55e' : valor >= 60 ? '#eab308' : '#ef4444';

  return (
    <div className="relative" style={{ width: tamanho, height: tamanho }}>
      <svg width={tamanho} height={tamanho} viewBox="0 0 160 160">
        <circle cx="80" cy="80" r={radius} fill="none" stroke="#334155" strokeWidth="8" />
        <circle
          cx="80" cy="80" r={radius}
          fill="none"
          stroke={cor}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 80 80)"
          style={{ transition: 'stroke-dashoffset 1.5s ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-black text-white tabular-nums">{valor}%</span>
      </div>
    </div>
  );
};

// KPI Card para o painel executivo
const KPICard: React.FC<{
  titulo: string;
  valor: string;
  subtitulo: string;
  corSubtitulo?: string;
}> = ({ titulo, valor, subtitulo, corSubtitulo = 'text-slate-400' }) => (
  <div className="bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-xl p-5 flex flex-col justify-between min-h-[130px]">
    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider leading-tight">
      {titulo}
    </p>
    <p className="text-4xl font-black text-white mt-2 tabular-nums tracking-tight">
      {valor}
    </p>
    <p className={`text-xs font-medium mt-1 ${corSubtitulo}`}>
      {subtitulo}
    </p>
  </div>
);

export const ModoTV: React.FC = () => {
  const [relogio, setRelogio] = useState(new Date());
  const [paginaAtiva, setPaginaAtiva] = useState(0);
  const [tempoRestante, setTempoRestante] = useState(45);
  const [emPausa, setEmPausa] = useState(false);

  const { data: operacionais } = useKPIsOperacionais(3);
  const { data: financeiros } = useKPIsFinanceiros(3);
  const { data: qualidade } = useKPIsQualidade(3);
  const { data: rh } = useKPIsRH(3);
  const { data: tendencia } = useTendenciaAtendimentos();
  const { data: indiceONA } = useIndiceONA();

  // Relógio em tempo real
  useEffect(() => {
    const interval = setInterval(() => setRelogio(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const paginas = ['Executivo', 'Operacional', 'Financeiro', 'Qualidade'];

  // Auto-scroll
  useEffect(() => {
    if (emPausa) return;
    const interval = setInterval(() => {
      setPaginaAtiva((prev) => (prev + 1) % paginas.length);
      setTempoRestante(45);
    }, AUTO_SCROLL_DELAY);
    return () => clearInterval(interval);
  }, [emPausa, paginas.length]);

  // Countdown
  useEffect(() => {
    if (emPausa) return;
    const interval = setInterval(() => {
      setTempoRestante((prev) => (prev > 1 ? prev - 1 : 45));
    }, 1000);
    return () => clearInterval(interval);
  }, [emPausa]);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);

  const ocupacao = operacionais?.ocupacao_leitos.valor_atual ?? 0;
  const permanencia = operacionais?.tempo_medio_internacao ?? 0;
  const receita = financeiros?.receita_realizadas.valor_atual ?? 0;
  const incidentes = qualidade?.incidentes_seguranca.valor_atual ?? 0;
  const colaboradores = rh?.colaboradores_ativos.valor_atual ?? 0;
  const conformidade = qualidade?.taxa_conformidade.valor_atual ?? 0;

  const renderPaginaExecutivo = () => (
    <div className="flex-1 flex flex-col gap-5 p-6 overflow-hidden">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-4 gap-4">
        <KPICard
          titulo="Taxa de Ocupação Atual"
          valor={`${ocupacao.toFixed(0)}%`}
          subtitulo={ocupacao > 90 ? 'Ver em Alerta' : 'Dentro da meta'}
          corSubtitulo={ocupacao > 90 ? 'text-orange-400' : 'text-emerald-400'}
        />
        <KPICard
          titulo="Média de Permanência (Horas)"
          valor={`${permanencia.toFixed(1)}h`}
          subtitulo={permanencia > 4 ? 'Alta' : 'Normal'}
          corSubtitulo={permanencia > 4 ? 'text-amber-400' : 'text-emerald-400'}
        />
        <KPICard
          titulo="Receita Mensal"
          valor={formatCurrency(receita)}
          subtitulo={`${financeiros?.receita_realizadas.percentual_meta.toFixed(0) ?? 0}% META`}
          corSubtitulo="text-sky-400"
        />
        <KPICard
          titulo="Colaboradores Ativos"
          valor={`${colaboradores.toFixed(0)}`}
          subtitulo="Quadro atual"
          corSubtitulo="text-slate-400"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-3 gap-4 flex-1 min-h-0">
        {/* Area Chart - Tendência */}
        <div className="col-span-2 bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-xl p-5 flex flex-col">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Tendência de Atendimentos (7 Dias)
          </p>
          <div className="flex items-center gap-4 mb-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-sky-500" />
              <span className="text-xs text-slate-300">Atendidos</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="text-xs text-slate-300">Pendentes</span>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={tendencia || []}>
                <defs>
                  <linearGradient id="gradAtendidos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradPendentes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: '#475569' }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: '#475569' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 8, color: '#f1f5f9' }}
                  labelStyle={{ color: '#94a3b8' }}
                />
                <Area type="monotone" dataKey="atendidos" stroke="#0ea5e9" strokeWidth={2} fill="url(#gradAtendidos)" />
                <Area type="monotone" dataKey="pendentes" stroke="#f59e0b" strokeWidth={2} fill="url(#gradPendentes)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gauge ONA */}
        <div className="bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-xl p-5 flex flex-col items-center justify-center">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Índice de Qualidade ONA
          </p>
          <GaugeSVG valor={indiceONA ?? 0} />
          <p className="text-sm text-slate-300 mt-3 font-medium">
            {(indiceONA ?? 0) >= 80 ? 'Bom' : (indiceONA ?? 0) >= 60 ? 'Regular' : 'Crítico'}
          </p>
        </div>
      </div>
    </div>
  );

  const renderPaginaOperacional = () => (
    <div className="flex-1 p-6 grid grid-cols-4 gap-4 content-start">
      <KPICard
        titulo="Ocupação de Leitos"
        valor={`${ocupacao.toFixed(0)}%`}
        subtitulo={`Meta: 85%`}
        corSubtitulo={ocupacao > 85 ? 'text-amber-400' : 'text-emerald-400'}
      />
      <KPICard
        titulo="Pacientes Ativos"
        valor={`${operacionais?.pacientes_ativos.valor_atual.toFixed(0) ?? 0}`}
        subtitulo={`Anterior: ${operacionais?.pacientes_ativos.valor_anterior.toFixed(0) ?? 0}`}
      />
      <KPICard
        titulo="Tempo Médio Internação"
        valor={`${permanencia.toFixed(1)}h`}
        subtitulo="Horas"
      />
      <KPICard
        titulo="Leitos Disponíveis"
        valor={`${operacionais?.disponibilidade_leitos.valor_atual.toFixed(0) ?? 0}`}
        subtitulo={`Total: ${operacionais?.disponibilidade_leitos.meta.toFixed(0) ?? 0}`}
      />
      <KPICard
        titulo="Taxa Mortalidade"
        valor={`${operacionais?.taxa_mortalidade.valor_atual.toFixed(1) ?? 0}%`}
        subtitulo={`Meta: <3%`}
        corSubtitulo={(operacionais?.taxa_mortalidade.valor_atual ?? 0) > 3 ? 'text-red-400' : 'text-emerald-400'}
      />
      <KPICard
        titulo="Eficiência Operacional"
        valor={`${operacionais?.eficiencia_operacional.valor_atual.toFixed(0) ?? 0}%`}
        subtitulo="Chamados resolvidos"
      />
      <KPICard
        titulo="Incidentes NSP"
        valor={`${incidentes.toFixed(0)}`}
        subtitulo="Neste mês"
      />
      <KPICard
        titulo="Conformidade"
        valor={`${conformidade.toFixed(0)}%`}
        subtitulo="Auditorias"
      />
    </div>
  );

  const renderPaginaFinanceiro = () => (
    <div className="flex-1 p-6 grid grid-cols-3 gap-4 content-start">
      <KPICard
        titulo="Receita Total (Mês)"
        valor={formatCurrency(receita)}
        subtitulo={`Anterior: ${formatCurrency(financeiros?.receita_realizadas.valor_anterior ?? 0)}`}
      />
      <KPICard
        titulo="Custos Operacionais"
        valor={formatCurrency(financeiros?.custos_operacionais.valor_atual ?? 0)}
        subtitulo={`Anterior: ${formatCurrency(financeiros?.custos_operacionais.valor_anterior ?? 0)}`}
      />
      <KPICard
        titulo="Resultado Operacional"
        valor={formatCurrency(financeiros?.resultado_operacional.valor_atual ?? 0)}
        subtitulo={`Margem: ${financeiros?.margem_operacional.valor_atual.toFixed(1) ?? 0}%`}
        corSubtitulo={(financeiros?.resultado_operacional.valor_atual ?? 0) > 0 ? 'text-emerald-400' : 'text-red-400'}
      />
      <KPICard
        titulo="Margem Operacional"
        valor={`${financeiros?.margem_operacional.valor_atual.toFixed(1) ?? 0}%`}
        subtitulo="Meta: 20%"
      />
      <KPICard
        titulo="Faturamento/Paciente"
        valor={formatCurrency(financeiros?.faturamento_medio_paciente.valor_atual ?? 0)}
        subtitulo="Média mensal"
      />
      <KPICard
        titulo="Notas Fiscais"
        valor={`${financeiros?.receita_realizadas.percentual_meta.toFixed(0) ?? 0}%`}
        subtitulo="Meta de faturamento"
      />
    </div>
  );

  const renderPaginaQualidade = () => (
    <div className="flex-1 p-6 grid grid-cols-4 gap-4 content-start">
      <KPICard
        titulo="Conformidade Protocolos"
        valor={`${conformidade.toFixed(0)}%`}
        subtitulo="Meta: 95%"
        corSubtitulo={conformidade >= 95 ? 'text-emerald-400' : 'text-amber-400'}
      />
      <KPICard
        titulo="Incidentes NSP"
        valor={`${incidentes.toFixed(0)}`}
        subtitulo={`Anterior: ${qualidade?.incidentes_seguranca.valor_anterior.toFixed(0) ?? 0}`}
      />
      <KPICard
        titulo="Auditorias Realizadas"
        valor={`${qualidade?.processos_auditados.valor_atual.toFixed(0) ?? 0}`}
        subtitulo="Neste mês"
      />
      <KPICard
        titulo="Correções Implementadas"
        valor={`${qualidade?.correcoes_implementadas.valor_atual.toFixed(0) ?? 0}`}
        subtitulo="Achados resolvidos"
      />
      <div className="col-span-2 bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-xl p-5 flex flex-col items-center justify-center">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Índice ONA</p>
        <GaugeSVG valor={indiceONA ?? 0} tamanho={140} />
        <p className="text-sm text-slate-300 mt-2">{(indiceONA ?? 0) >= 80 ? 'Bom' : 'Atenção'}</p>
      </div>
      <KPICard
        titulo="Absenteísmo"
        valor={`${rh?.absenteismo.valor_atual.toFixed(1) ?? 0}%`}
        subtitulo="Meta: <5%"
        corSubtitulo={(rh?.absenteismo.valor_atual ?? 0) > 5 ? 'text-red-400' : 'text-emerald-400'}
      />
      <KPICard
        titulo="Capacitações"
        valor={`${rh?.capacitacoes_realizadas.valor_atual.toFixed(0) ?? 0}`}
        subtitulo="Participações LMS"
      />
    </div>
  );

  const paginasRender = [renderPaginaExecutivo, renderPaginaOperacional, renderPaginaFinanceiro, renderPaginaQualidade];

  return (
    <div className="w-screen h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-hidden flex flex-col select-none">
      {/* Header */}
      <div className="bg-slate-900/90 backdrop-blur-xl border-b border-slate-800 px-6 py-3.5 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black text-white tracking-wide uppercase">
            Gestrategic — Painel Executivo da Diretoria
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            {format(relogio, "dd 'de' MMMM 'de' yyyy | HH:mm:ss", { locale: ptBR })}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700/50">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-xs font-bold text-red-400 uppercase">Ao Vivo</span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700/50">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-xs font-mono text-white font-bold">{tempoRestante}s</span>
          </div>

          <button
            onClick={() => setEmPausa(!emPausa)}
            className={`p-2 rounded-lg border transition-colors ${
              emPausa
                ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-400'
                : 'bg-slate-800/60 border-slate-700/50 text-slate-400'
            }`}
          >
            {emPausa ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-slate-800">
        <div
          className="h-full bg-gradient-to-r from-sky-500 to-cyan-400 transition-all duration-1000"
          style={{ width: `${((45 - tempoRestante) / 45) * 100}%` }}
        />
      </div>

      {/* Content */}
      {paginasRender[paginaAtiva]()}

      {/* Footer Nav */}
      <div className="bg-slate-900/90 backdrop-blur-xl border-t border-slate-800 px-6 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {paginas.map((nome, idx) => (
              <button
                key={nome}
                onClick={() => { setPaginaAtiva(idx); setTempoRestante(45); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  paginaAtiva === idx
                    ? 'bg-sky-600/20 text-sky-400 border border-sky-500/40'
                    : 'text-slate-500 hover:text-slate-300 border border-transparent'
                }`}
              >
                {nome}
                {paginaAtiva === idx && <ChevronRight className="w-3 h-3 inline ml-1" />}
              </button>
            ))}
          </div>
          <span className="text-xs font-mono text-slate-600">
            {paginaAtiva + 1}/{paginas.length}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ModoTV;
