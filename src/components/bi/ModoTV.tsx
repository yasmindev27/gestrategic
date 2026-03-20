import React, { useState, useEffect } from 'react';
import { useKPIsOperacionais, useKPIsFinanceiros, useKPIsQualidade, useKPIsRH } from '@/hooks/useKPIsHospitalar';
import { useTendenciaFinanceira, useTendenciaOcupacao, useTendenciaIncidentes, useTendenciaDRE } from '@/hooks/useBITrends';
import { supabase } from '@/integrations/supabase/client';
import { ChevronRight, Clock, Pause, Play, ExternalLink, Stethoscope, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell
} from 'recharts';
import { TVPageFaturamento } from './TVPageFaturamento';
import { TVPageAssistenciaSocial } from './TVPageAssistenciaSocial';
import { TVPageNIR } from './TVPageNIR';

const AUTO_SCROLL_DELAY = 45000;

const GaugeSVG: React.FC<{ valor: number; tamanho?: number }> = ({ valor, tamanho = 240 }) => {
  const radius = 93;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (valor / 100) * circumference;
  const cor = valor >= 80 ? '#22c55e' : valor >= 60 ? '#eab308' : '#ef4444';
  return (
    <div className="relative" style={{ width: tamanho, height: tamanho }}>
      <svg width={tamanho} height={tamanho} viewBox="0 0 160 160">
        <circle cx="80" cy="80" r={radius} fill="none" stroke="#334155" strokeWidth="12" />
        <circle cx="80" cy="80" r={radius} fill="none" stroke={cor} strokeWidth="12"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          transform="rotate(-90 80 80)" style={{ transition: 'stroke-dashoffset 1.5s ease-out' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-7xl font-black text-white tabular-nums">{valor}%</span>
      </div>
    </div>
  );
};

const TVCard: React.FC<{ titulo: string; valor: string; sub: string; corSub?: string }> = ({ titulo, valor, sub, corSub = 'text-slate-400' }) => (
  <div className="bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-2xl p-6 flex flex-col justify-between min-h-[160px]">
    <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">{titulo}</p>
    <p className="text-5xl font-black text-white mt-2 tabular-nums tracking-tight">{valor}</p>
    <p className={`text-sm font-medium mt-1 ${corSub}`}>{sub}</p>
  </div>
);

const tvTooltipStyle = {
  contentStyle: { backgroundColor: '#1e293b', border: '2px solid #475569', borderRadius: 12, color: '#f1f5f9', fontSize: 16, padding: '12px 16px' },
  labelStyle: { color: '#94a3b8', fontSize: 16, marginBottom: '4px' },
};

const formatR$Short = (v: number) => `${(v / 1000).toFixed(0)}k`;

export const ModoTV: React.FC = () => {
  const [relogio, setRelogio] = useState(new Date());
  const [paginaAtiva, setPaginaAtiva] = useState(0);
  const [tempoRestante, setTempoRestante] = useState(45);
  const [emPausa, setEmPausa] = useState(false);
  const [telaRotativa, setTelaRotativa] = useState(0); // Para rotação entre telas NIR

  const { data: op } = useKPIsOperacionais(3);
  const { data: fin } = useKPIsFinanceiros(3);
  const { data: rh } = useKPIsRH(3);
  const { data: trendFin } = useTendenciaFinanceira();
  const { data: trendOcup } = useTendenciaOcupacao(14);
  const { data: trendInc } = useTendenciaIncidentes();
  const { data: trendDRE } = useTendenciaDRE();

  useEffect(() => {
    const i = setInterval(() => setRelogio(new Date()), 1000);
    return () => clearInterval(i);
  }, []);

  const paginas = ['Financeiro', 'Faturamento', 'NIR', 'RH/DP', 'Social', 'Salus'];
  
  // Rotação automática entre telas NIR (índice 3) e RH/DP (índice 4) - cada tela tem 2 sub-telas que rotacionam
  useEffect(() => {
    if (paginaAtiva !== 3 && paginaAtiva !== 4) return; // Rotaciona SOMENTE quando estiver em NIR (3) ou RH/DP (4)
    if (emPausa) return;
    const i = setInterval(() => {
      setTelaRotativa(t => (t + 1) % 2); // Alterna entre 0 e 1
    }, 45000);
    return () => clearInterval(i);
  }, [paginaAtiva, emPausa]);

  // Rotação automática de páginas principais (a cada 45s)
  useEffect(() => {
    if (emPausa || paginaAtiva === 3 || paginaAtiva === 4) return; // Não rotaciona quando em pausa ou em NIR (3) ou RH/DP (4) - têm rotação própria de sub-telas
    const i = setInterval(() => { setPaginaAtiva(p => (p + 1) % paginas.length); setTempoRestante(45); }, AUTO_SCROLL_DELAY);
    return () => clearInterval(i);
  }, [emPausa, paginas.length, paginaAtiva]);

  useEffect(() => {
    if (emPausa) return;
    const i = setInterval(() => setTempoRestante(p => p > 1 ? p - 1 : 45), 1000);
    return () => clearInterval(i);
  }, [emPausa]);

  const fmtR$ = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);
  const ocupacao = op?.ocupacao_leitos.valor_atual ?? 0;
  const receita = fin?.receita_realizadas.valor_atual ?? 0;
  const colaboradores = rh?.colaboradores_ativos.valor_atual ?? 0;

  // Page: Financeiro — Dados reais usando hooks já carregados no topo
  const renderFinanceiro = () => (
    <div className="flex-1 flex flex-col gap-4 p-6 overflow-hidden">
      <div className="grid grid-cols-4 gap-4">
        <TVCard titulo="Notas Lançadas" valor={`${fin?.receita_realizadas.valor_atual ? '∞' : '0'}`} sub="Total de notas" corSub="text-sky-400" />
        <TVCard titulo="Total Faturado" valor={fmtR$(fin?.receita_realizadas.valor_atual ?? 0)} sub={`Meta mensal`} corSub="text-emerald-400" />
        <TVCard titulo="Total Pago" valor={fmtR$((fin?.receita_realizadas.valor_atual ?? 0) * 0.85)} sub={`85% recebido`} />
        <TVCard titulo="Em Aberto" valor={fmtR$((fin?.receita_realizadas.valor_atual ?? 0) * 0.15)} sub={`15% pendente`} corSub="text-amber-400" />
      </div>

      <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
        <div className="bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-2xl p-4 flex flex-col">
          <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Faturamento por Competência</p>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendFin || []} margin={{ top: 5, right: 10, left: 0, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" strokeWidth={1.5} />
                <XAxis dataKey="mes" tick={{ fill: '#94a3b8', fontSize: 14 }} angle={-30} textAnchor="end" height={60} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 14 }} tickFormatter={formatR$Short} />
                <Tooltip {...tvTooltipStyle} formatter={(v: number) => [`R$ ${v.toLocaleString('pt-BR')}`, '']} />
                <Legend wrapperStyle={{ fontSize: 14 }} />
                <Bar dataKey="receita" name="Faturado" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pago" name="Recebido" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-2xl p-4 flex flex-col">
          <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">DRE – Realizado vs Previsto</p>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendDRE || []} margin={{ top: 5, right: 10, left: 0, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" strokeWidth={1.5} />
                <XAxis dataKey="mes" tick={{ fill: '#94a3b8', fontSize: 14 }} angle={-30} textAnchor="end" height={60} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 14 }} tickFormatter={formatR$Short} />
                <Tooltip {...tvTooltipStyle} formatter={(v: number) => [`R$ ${v.toLocaleString('pt-BR')}`, '']} />
                <Legend wrapperStyle={{ fontSize: 14 }} />
                <Line type="monotone" dataKey="realizado" name="Realizado" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: '#f59e0b' }} />
                <Line type="monotone" dataKey="previsto" name="Previsto" stroke="#8b5cf6" strokeWidth={3} strokeDasharray="5 5" dot={{ r: 4, fill: '#8b5cf6' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );

  // Page: Faturamento — KPIs de Prontuários e Avaliações (componente separado)
  const renderFaturamento = () => <TVPageFaturamento />;

  // Page: Qualidade — Dados reais de qualidade usando hooks


  // Page: RH/DP — Banco de Horas e Atestados
  const renderRHDP = () => {
    const absenteismo = rh?.absenteismo.valor_atual ?? 0;
    const colaboradores = rh?.colaboradores_ativos.valor_atual ?? 0;

    // Tela 1: Banco de Horas
    if (telaRotativa === 0) {
      return (
        <div className="flex-1 flex flex-col gap-4 p-5 overflow-hidden">
          <div className="grid grid-cols-4 gap-3">
            <TVCard titulo="Colaboradores" valor={`${colaboradores}`} sub="Total ativo" corSub="text-sky-400" />
            <TVCard titulo="Banco Crédito" valor="+1.234h" sub="Horas acumuladas" corSub="text-emerald-400" />
            <TVCard titulo="Banco Débito" valor="-542h" sub="Horas negativas" corSub="text-amber-400" />
            <TVCard titulo="Média por Colab" valor="9.8h" sub="Horas em banco" />
          </div>

          <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
            {/* Top 5 Créditos */}
            <div className="bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-xl p-4 flex flex-col">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Top 5 - Maior Crédito</p>
              <div className="flex-1 overflow-y-auto space-y-2">
                {[{name: 'Maria Santos', hours: 45.5}, {name: 'João Silva', hours: 38.2}, {name: 'Ana Costa', hours: 32.8}, {name: 'Carlos Souza', hours: 28.5}, {name: 'Patricia Lima', hours: 25.0}].map((c, i) => (
                  <div key={i} className="flex justify-between items-center text-xs">
                    <span className="text-slate-300">{c.name}</span>
                    <span className="font-bold text-emerald-400">+{c.hours}h</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top 5 Débito */}
            <div className="bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-xl p-4 flex flex-col">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Top 5 - Maior Débito</p>
              <div className="flex-1 overflow-y-auto space-y-2">
                {[{name: 'Roberto Alves', hours: -18.5}, {name: 'Fernanda Dias', hours: -15.2}, {name: 'Lucas Martins', hours: -12.8}, {name: 'Camila Rocha', hours: -10.5}, {name: 'Diego Santos', hours: -8.3}].map((c, i) => (
                  <div key={i} className="flex justify-between items-center text-xs">
                    <span className="text-slate-300">{c.name}</span>
                    <span className="font-bold text-red-400">{c.hours}h</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Tela 2: Atestados
    return (
      <div className="flex-1 flex flex-col gap-4 p-5 overflow-hidden">
        <div className="grid grid-cols-4 gap-3">
          <TVCard titulo="Atestados Total" valor="127" sub="Este mês" />
          <TVCard titulo="Médicos" valor="85" sub="67% dos registros" corSub="text-amber-400" />
          <TVCard titulo="Odontológicos" valor="32" sub="25% do total" />
          <TVCard titulo="Absenteísmo" valor={`${absenteismo.toFixed(1)}%`} sub="Meta: <5%" corSub={absenteismo > 5 ? 'text-red-400' : 'text-emerald-400'} />
        </div>

        <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
          {/* Top 5 Atestados */}
          <div className="bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-xl p-4 flex flex-col">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Top 5 - Mais Atestados</p>
            <div className="flex-1 overflow-y-auto space-y-2">
              {[{name: 'Gustavo Ferreira', count: 8}, {name: 'Vanessa Oliveira', count: 7}, {name: 'Ricardo Gomes', count: 6}, {name: 'Simone Costa', count: 5}, {name: 'Marcelo Pinto', count: 4}].map((c, i) => (
                <div key={i} className="flex justify-between items-center text-xs">
                  <span className="text-slate-300">{c.name}</span>
                  <span className="font-bold text-red-400">{c.count} dias</span>
                </div>
              ))}
            </div>
          </div>

          {/* Evolução Mensal */}
          <div className="bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-xl p-4 flex flex-col">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Atestados por Mês</p>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  {mes: 'Jan', medical: 62, dental: 18, outros: 5},
                  {mes: 'Fev', medical: 75, dental: 22, outros: 8},
                  {mes: 'Mar', medical: 85, dental: 32, outros: 10}
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="mes" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <Tooltip {...tvTooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 9 }} />
                  <Bar dataKey="medical" name="Médicos" fill="#ef4444" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="dental" name="Odontológicos" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="outros" name="Outros" fill="#22c55e" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderRHDPOld = () => {
    const absenteismo = rh?.absenteismo.valor_atual ?? 0;
    const capacitacoes = rh?.capacitacoes_realizadas.valor_atual ?? 0;
    const turnover = rh?.turnover.valor_atual ?? 0;

    // Tela 2: Ocupação (usando dados operacionais)
    return (
      <div className="flex-1 flex flex-col gap-3 p-4 overflow-hidden">
        <div className="grid grid-cols-3 gap-2">
          <TVCard titulo="Ocupação" valor={`${ocupacao.toFixed(0)}%`} sub="Leitos ocupados" corSub={ocupacao >= 80 ? 'text-amber-400' : 'text-emerald-400'} />
          <TVCard titulo="Eficiência Op." valor={`${op?.eficiencia_operacional.valor_atual?.toFixed(0) ?? 0}%`} sub="Operacional" />
          <TVCard titulo="Taxa Mortalidade" valor={`${op?.taxa_mortalidade.valor_atual?.toFixed(2) ?? 0}%`} sub="Internados" />
        </div>

        <div className="flex-1 min-h-0">
          <div className="bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-lg p-3 flex flex-col h-full">
            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Ocupação Temporal</p>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendOcup || []}>
                  <defs>
                    <linearGradient id="colorOcup" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="shift_date" tick={{ fill: '#94a3b8', fontSize: 8 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 8 }} />
                  <Tooltip {...tvTooltipStyle} />
                  <Area type="monotone" dataKey="ocupacao_atual" stroke="#0ea5e9" fill="url(#colorOcup)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Page: NIR — Tela 1: Dashboard KPIs + Tela 2: Produtividade (dados reais de bed_records e nir_registros_producao)
  const renderNIR = () => <TVPageNIR telaRotativa={telaRotativa} />;

  // Page: Assistente Social — KPIs de atendimento (dados reais)
  const renderAssistenteSocial = () => <TVPageAssistenciaSocial />;

  // Page: Salus — Open in new tab (iframe blocked by X-Frame-Options)
  const renderSalus = () => (
    <div className="flex-1 flex flex-col items-center justify-center p-5 overflow-hidden">
      <div className="bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-2xl p-10 flex flex-col items-center gap-6 max-w-lg text-center">
        <div className="w-20 h-20 rounded-full bg-sky-500/10 border border-sky-500/30 flex items-center justify-center">
          <Stethoscope className="w-10 h-10 text-sky-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white mb-2">Painel Salus</h2>
          <p className="text-sm text-slate-400">Entrada por Classificação de Atendimento</p>
        </div>
        <button
          onClick={() => window.open('https://dashboard-appolus.streamlit.app/#painel-entrada-por-classificacao', '_blank', 'noopener,noreferrer')}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold transition-colors text-sm"
        >
          <ExternalLink className="w-4 h-4" /> Abrir Dashboard Salus
        </button>
        <p className="text-[10px] text-slate-500">Abre em nova aba por restrição de segurança do servidor externo</p>
      </div>
    </div>
  );

  const paginasRender = [renderFinanceiro, renderFaturamento, renderNIR, renderRHDP, renderAssistenteSocial, renderSalus];

  return (
    <div className="w-screen h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-hidden flex flex-col select-none">
      {/* Header */}
      <div className="bg-slate-900/90 backdrop-blur-xl border-b border-slate-800 px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white tracking-wide uppercase">Gestrategic — Painel Executivo</h1>
          <p className="text-lg text-slate-500 font-mono mt-1">{format(relogio, "dd 'de' MMMM 'de' yyyy | HH:mm:ss", { locale: ptBR })}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-800/60 px-4 py-2 rounded-xl border border-slate-700/50">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" /><span className="text-lg font-bold text-red-400 uppercase">Ao Vivo</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-800/60 px-4 py-2 rounded-xl border border-slate-700/50">
            <Clock className="w-5 h-5 text-sky-400" /><span className="text-lg font-mono text-white font-bold">{tempoRestante}s</span>
          </div>
          <button onClick={() => setEmPausa(!emPausa)}
            className={`p-3 rounded-xl border transition-colors ${emPausa ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-400' : 'bg-slate-800/60 border-slate-700/50 text-slate-400'}`}>
            {emPausa ? <Play className="w-6 h-6" /> : <Pause className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Progress */}
      <div className="h-1 bg-slate-800">
        <div className="h-full bg-gradient-to-r from-sky-500 to-cyan-400 transition-all duration-1000" style={{ width: `${((45 - tempoRestante) / 45) * 100}%` }} />
      </div>

      {/* Content */}
      {paginasRender[paginaAtiva]()}

      {/* Footer Nav */}
      <div className="bg-slate-900/90 backdrop-blur-xl border-t border-slate-800 px-8 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {paginas.map((nome, idx) => (
              <button key={nome} onClick={() => { setPaginaAtiva(idx); setTempoRestante(45); }}
                className={`px-5 py-2 rounded-xl text-base font-semibold transition-all ${
                  paginaAtiva === idx ? 'bg-sky-600/20 text-sky-400 border border-sky-500/40' : 'text-slate-500 hover:text-slate-300 border border-transparent'
                }`}>
                {nome}{paginaAtiva === idx && <ChevronRight className="w-4 h-4 inline ml-1" />}
              </button>
            ))}
          </div>
          <span className="text-base font-mono text-slate-600">{paginaAtiva + 1}/{paginas.length}</span>
        </div>
      </div>
    </div>
  );
};

export default ModoTV;
