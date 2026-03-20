import React, { useState, useEffect } from 'react';
import { useKPIsOperacionais, useKPIsFinanceiros, useKPIsQualidade, useKPIsRH } from '@/hooks/useKPIsHospitalar';
import { useTendenciaFinanceira, useTendenciaOcupacao, useTendenciaIncidentes, useTendenciaDRE } from '@/hooks/useBITrends';
import { ChevronRight, Clock, Pause, Play, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell
} from 'recharts';

const AUTO_SCROLL_DELAY = 45000;

const GaugeSVG: React.FC<{ valor: number; tamanho?: number }> = ({ valor, tamanho = 160 }) => {
  const radius = 62;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (valor / 100) * circumference;
  const cor = valor >= 80 ? '#22c55e' : valor >= 60 ? '#eab308' : '#ef4444';
  return (
    <div className="relative" style={{ width: tamanho, height: tamanho }}>
      <svg width={tamanho} height={tamanho} viewBox="0 0 160 160">
        <circle cx="80" cy="80" r={radius} fill="none" stroke="#334155" strokeWidth="8" />
        <circle cx="80" cy="80" r={radius} fill="none" stroke={cor} strokeWidth="8"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          transform="rotate(-90 80 80)" style={{ transition: 'stroke-dashoffset 1.5s ease-out' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-black text-white tabular-nums">{valor}%</span>
      </div>
    </div>
  );
};

const TVCard: React.FC<{ titulo: string; valor: string; sub: string; corSub?: string }> = ({ titulo, valor, sub, corSub = 'text-slate-400' }) => (
  <div className="bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-xl p-4 flex flex-col justify-between min-h-[110px]">
    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{titulo}</p>
    <p className="text-3xl font-black text-white mt-1 tabular-nums tracking-tight">{valor}</p>
    <p className={`text-[10px] font-medium mt-0.5 ${corSub}`}>{sub}</p>
  </div>
);

const tvTooltipStyle = {
  contentStyle: { backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 8, color: '#f1f5f9', fontSize: 11 },
  labelStyle: { color: '#94a3b8', fontSize: 11 },
};

const formatR$Short = (v: number) => `${(v / 1000).toFixed(0)}k`;

export const ModoTV: React.FC = () => {
  const [relogio, setRelogio] = useState(new Date());
  const [paginaAtiva, setPaginaAtiva] = useState(0);
  const [tempoRestante, setTempoRestante] = useState(45);
  const [emPausa, setEmPausa] = useState(false);

  const { data: op } = useKPIsOperacionais(3);
  const { data: fin } = useKPIsFinanceiros(3);
  const { data: qual } = useKPIsQualidade(3);
  const { data: rh } = useKPIsRH(3);
  const { data: trendFin } = useTendenciaFinanceira();
  const { data: trendOcup } = useTendenciaOcupacao(14);
  const { data: trendInc } = useTendenciaIncidentes();
  const { data: trendDRE } = useTendenciaDRE();

  useEffect(() => {
    const i = setInterval(() => setRelogio(new Date()), 1000);
    return () => clearInterval(i);
  }, []);

  const paginas = ['Executivo', 'Operacional', 'Financeiro', 'Qualidade'];

  useEffect(() => {
    if (emPausa) return;
    const i = setInterval(() => { setPaginaAtiva(p => (p + 1) % paginas.length); setTempoRestante(45); }, AUTO_SCROLL_DELAY);
    return () => clearInterval(i);
  }, [emPausa, paginas.length]);

  useEffect(() => {
    if (emPausa) return;
    const i = setInterval(() => setTempoRestante(p => p > 1 ? p - 1 : 45), 1000);
    return () => clearInterval(i);
  }, [emPausa]);

  const fmtR$ = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);
  const ocupacao = op?.ocupacao_leitos.valor_atual ?? 0;
  const receita = fin?.receita_realizadas.valor_atual ?? 0;
  const incidentes = qual?.incidentes_seguranca.valor_atual ?? 0;
  const conformidade = qual?.taxa_conformidade.valor_atual ?? 0;
  const colaboradores = rh?.colaboradores_ativos.valor_atual ?? 0;

  // Page: Executivo — KPIs + Occupancy Chart + ONA Gauge
  const renderExecutivo = () => (
    <div className="flex-1 flex flex-col gap-4 p-5 overflow-hidden">
      <div className="grid grid-cols-4 gap-3">
        <TVCard titulo="Taxa de Ocupação" valor={`${ocupacao.toFixed(0)}%`} sub={ocupacao > 90 ? 'Alerta' : 'Dentro da meta'} corSub={ocupacao > 90 ? 'text-orange-400' : 'text-emerald-400'} />
        <TVCard titulo="Receita Mensal" valor={fmtR$(receita)} sub={`${fin?.receita_realizadas.variacao_percentual.toFixed(0) ?? 0}% vs anterior`} corSub="text-sky-400" />
        <TVCard titulo="Incidentes NSP" valor={`${incidentes.toFixed(0)}`} sub="Neste mês" corSub={incidentes > 10 ? 'text-red-400' : 'text-emerald-400'} />
        <TVCard titulo="Colaboradores" valor={`${colaboradores.toFixed(0)}`} sub="Quadro atual" />
      </div>
      <div className="grid grid-cols-3 gap-3 flex-1 min-h-0">
        {/* Occupancy Trend */}
        <div className="col-span-2 bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-xl p-4 flex flex-col">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Tendência de Ocupação (14 dias)</p>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendOcup || []}>
                <defs>
                  <linearGradient id="tvGradOcup" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4} /><stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={{ stroke: '#475569' }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} domain={[0, 100]} unit="%" axisLine={{ stroke: '#475569' }} />
                <Tooltip {...tvTooltipStyle} formatter={(v: number) => [`${v}%`, 'Ocupação']} />
                <Area type="monotone" dataKey="taxa" stroke="#0ea5e9" strokeWidth={2.5} fill="url(#tvGradOcup)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        {/* ONA Gauge */}
        <div className="bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-xl p-4 flex flex-col items-center justify-center">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Índice Qualidade ONA</p>
          <GaugeSVG valor={Math.round(conformidade)} />
          <p className="text-sm text-slate-300 mt-2 font-medium">{conformidade >= 80 ? 'Bom' : conformidade >= 60 ? 'Regular' : 'Crítico'}</p>
        </div>
      </div>
    </div>
  );

  // Page: Operacional — Occupancy bars + KPIs
  const renderOperacional = () => (
    <div className="flex-1 flex flex-col gap-4 p-5 overflow-hidden">
      <div className="grid grid-cols-4 gap-3">
        <TVCard titulo="Ocupação de Leitos" valor={`${ocupacao.toFixed(0)}%`} sub="Meta: 85%" corSub={ocupacao > 85 ? 'text-amber-400' : 'text-emerald-400'} />
        <TVCard titulo="Pacientes Ativos" valor={`${op?.pacientes_ativos.valor_atual.toFixed(0) ?? 0}`} sub={`Anterior: ${op?.pacientes_ativos.valor_anterior.toFixed(0) ?? 0}`} />
        <TVCard titulo="Tempo Médio" valor={`${(op?.tempo_medio_internacao ?? 0).toFixed(1)}h`} sub="Internação" />
        <TVCard titulo="Leitos Disponíveis" valor={`${op?.disponibilidade_leitos.valor_atual.toFixed(0) ?? 0}`} sub={`Total: ${op?.disponibilidade_leitos.meta.toFixed(0) ?? 0}`} />
      </div>
      {/* Occupancy by day - bar chart */}
      <div className="flex-1 bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-xl p-4 flex flex-col min-h-0">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Leitos Ocupados vs Disponíveis por Dia</p>
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trendOcup || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <Tooltip {...tvTooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 10, color: '#94a3b8' }} />
              <Bar dataKey="ocupados" name="Ocupados" fill="#f59e0b" radius={[3, 3, 0, 0]} />
              <Bar dataKey="total" name="Total Leitos" fill="#334155" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  // Page: Financeiro — Revenue trend + DRE
  const renderFinanceiro = () => (
    <div className="flex-1 flex flex-col gap-4 p-5 overflow-hidden">
      <div className="grid grid-cols-3 gap-3">
        <TVCard titulo="Receita Total" valor={fmtR$(receita)} sub={`Anterior: ${fmtR$(fin?.receita_realizadas.valor_anterior ?? 0)}`} />
        <TVCard titulo="Custos" valor={fmtR$(fin?.custos_operacionais.valor_atual ?? 0)} sub={`Margem: ${fin?.margem_operacional.valor_atual.toFixed(1) ?? 0}%`} />
        <TVCard titulo="Resultado" valor={fmtR$(fin?.resultado_operacional.valor_atual ?? 0)}
          sub={(fin?.resultado_operacional.valor_atual ?? 0) >= 0 ? 'Positivo' : 'Negativo'}
          corSub={(fin?.resultado_operacional.valor_atual ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'} />
      </div>
      <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
        {/* Revenue Trend */}
        <div className="bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-xl p-4 flex flex-col">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Faturamento por Competência</p>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendFin || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="mes" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={formatR$Short} />
                <Tooltip {...tvTooltipStyle} formatter={(v: number) => [`R$ ${v.toLocaleString('pt-BR')}`, '']} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="receita" name="Receita" fill="#22c55e" radius={[3, 3, 0, 0]} />
                <Bar dataKey="pago" name="Pago" fill="#0ea5e9" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        {/* DRE Trend */}
        <div className="bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-xl p-4 flex flex-col">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">DRE – Realizado vs Previsto</p>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendDRE || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="mes" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={formatR$Short} />
                <Tooltip {...tvTooltipStyle} formatter={(v: number) => [`R$ ${v.toLocaleString('pt-BR')}`, '']} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="realizado" name="Realizado" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2, fill: '#f59e0b' }} />
                <Line type="monotone" dataKey="previsto" name="Previsto" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 2, fill: '#8b5cf6' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );

  // Page: Qualidade — Incidents trend + ONA + KPIs
  const renderQualidade = () => (
    <div className="flex-1 flex flex-col gap-4 p-5 overflow-hidden">
      <div className="grid grid-cols-4 gap-3">
        <TVCard titulo="Conformidade" valor={`${conformidade.toFixed(0)}%`} sub="Meta: 95%" corSub={conformidade >= 95 ? 'text-emerald-400' : 'text-amber-400'} />
        <TVCard titulo="Incidentes NSP" valor={`${incidentes.toFixed(0)}`} sub={`Anterior: ${qual?.incidentes_seguranca.valor_anterior.toFixed(0) ?? 0}`} />
        <TVCard titulo="Auditorias" valor={`${qual?.processos_auditados.valor_atual.toFixed(0) ?? 0}`} sub="Neste mês" />
        <TVCard titulo="Absenteísmo" valor={`${rh?.absenteismo.valor_atual.toFixed(1) ?? 0}%`} sub="Meta: <5%"
          corSub={(rh?.absenteismo.valor_atual ?? 0) > 5 ? 'text-red-400' : 'text-emerald-400'} />
      </div>
      <div className="grid grid-cols-3 gap-3 flex-1 min-h-0">
        {/* Incidents Chart */}
        <div className="col-span-2 bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-xl p-4 flex flex-col">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Evolução de Incidentes NSP</p>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendInc || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="mes" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <Tooltip {...tvTooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="total" name="Total" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                <Bar dataKey="encerrados" name="Encerrados" fill="#22c55e" radius={[3, 3, 0, 0]} />
                <Bar dataKey="graves" name="Graves" fill="#ef4444" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        {/* ONA Gauge */}
        <div className="bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-xl p-4 flex flex-col items-center justify-center">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Índice ONA</p>
          <GaugeSVG valor={Math.round(conformidade)} tamanho={140} />
          <p className="text-sm text-slate-300 mt-2">{conformidade >= 80 ? 'Bom' : 'Atenção'}</p>
        </div>
      </div>
    </div>
  );

  const paginasRender = [renderExecutivo, renderOperacional, renderFinanceiro, renderQualidade];

  return (
    <div className="w-screen h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-hidden flex flex-col select-none">
      {/* Header */}
      <div className="bg-slate-900/90 backdrop-blur-xl border-b border-slate-800 px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black text-white tracking-wide uppercase">Gestrategic — Painel Executivo</h1>
          <p className="text-xs text-slate-500 font-mono mt-0.5">{format(relogio, "dd 'de' MMMM 'de' yyyy | HH:mm:ss", { locale: ptBR })}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700/50">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" /><span className="text-xs font-bold text-red-400 uppercase">Ao Vivo</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700/50">
            <Clock className="w-3.5 h-3.5 text-sky-400" /><span className="text-xs font-mono text-white font-bold">{tempoRestante}s</span>
          </div>
          <button onClick={() => setEmPausa(!emPausa)}
            className={`p-2 rounded-lg border transition-colors ${emPausa ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-400' : 'bg-slate-800/60 border-slate-700/50 text-slate-400'}`}>
            {emPausa ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Progress */}
      <div className="h-0.5 bg-slate-800">
        <div className="h-full bg-gradient-to-r from-sky-500 to-cyan-400 transition-all duration-1000" style={{ width: `${((45 - tempoRestante) / 45) * 100}%` }} />
      </div>

      {/* Content */}
      {paginasRender[paginaAtiva]()}

      {/* Footer Nav */}
      <div className="bg-slate-900/90 backdrop-blur-xl border-t border-slate-800 px-6 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {paginas.map((nome, idx) => (
              <button key={nome} onClick={() => { setPaginaAtiva(idx); setTempoRestante(45); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  paginaAtiva === idx ? 'bg-sky-600/20 text-sky-400 border border-sky-500/40' : 'text-slate-500 hover:text-slate-300 border border-transparent'
                }`}>
                {nome}{paginaAtiva === idx && <ChevronRight className="w-3 h-3 inline ml-1" />}
              </button>
            ))}
          </div>
          <span className="text-xs font-mono text-slate-600">{paginaAtiva + 1}/{paginas.length}</span>
        </div>
      </div>
    </div>
  );
};

export default ModoTV;
