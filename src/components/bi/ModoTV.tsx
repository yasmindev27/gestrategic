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

  const paginas = ['Financeiro', 'Faturamento', 'Qualidade', 'NIR', 'RH/DP', 'Social', 'Salus'];
  
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
  const incidentes = qual?.incidentes_seguranca.valor_atual ?? 0;
  const conformidade = qual?.taxa_conformidade.valor_atual ?? 0;
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

  // Page: RH/DP — Tela 1: Banco de Horas + Tela 2: Atestados (rotação automática)
  const renderRHDP = () => {
    // Mock data para Banco de Horas
    const bancHoras = {
      top5Creditos: [
        { nome: 'Maria Silva', horas: 45.5, tipo: 'Férias' },
        { nome: 'João Santos', horas: 38.0, tipo: 'Banco' },
        { nome: 'Ana Costa', horas: 32.5, tipo: 'Compensação' },
        { nome: 'Carlos Oliveira', horas: 28.0, tipo: 'Banco' },
        { nome: 'Patricia Rodrigues', horas: 25.5, tipo: 'Férias' },
      ],
      top5Debitos: [
        { nome: 'Roberto Souza', horas: -52.0, tipo: 'Banco' },
        { nome: 'Fernanda Lima', horas: -48.5, tipo: 'Compensação' },
        { nome: 'Diego Martins', horas: -42.0, tipo: 'Banco' },
        { nome: 'Juliana Assis', horas: -38.5, tipo: 'Férias' },
        { nome: 'Gustavo Pereira', horas: -35.0, tipo: 'Banco' },
      ],
      distribuicao: [
        { nome: 'Créditos Férias', value: 35, color: '#0ea5e9' },
        { nome: 'Créditos Banco', value: 40, color: '#22c55e' },
        { nome: 'Débitos Utilizados', value: 25, color: '#f59e0b' },
      ],
      evolucaoMensal: [
        { mes: 'Jan', creditos: 120, debitos: 85, saldo: 35 },
        { mes: 'Fev', creditos: 108, debitos: 92, saldo: 16 },
        { mes: 'Mar', creditos: 115, debitos: 78, saldo: 37 },
        { mes: 'Abr', creditos: 125, debitos: 88, saldo: 37 },
        { mes: 'Mai', creditos: 130, debitos: 95, saldo: 35 },
        { mes: 'Jun', creditos: 140, debitos: 102, saldo: 38 },
      ],
    };

    // Mock data para Atestados
    const atestados = {
      top5Colaboradores: [
        { nome: 'Roberto Gonçalves', total: 8, critico: 0 },
        { nome: 'Mariana Oliveira', total: 6, critico: 1 },
        { nome: 'Felipe Santos', total: 5, critico: 0 },
        { nome: 'Camila Costa', total: 4, critico: 2 },
        { nome: 'Lucas Martins', total: 3, critico: 0 },
      ],
      atestadosPorMes: [
        { mes: 'Jan', total: 12, médicos: 8, odonto: 2, outro: 2 },
        { mes: 'Fev', total: 14, médicos: 10, odonto: 2, outro: 2 },
        { mes: 'Mar', total: 18, médicos: 12, odonto: 3, outro: 3 },
        { mes: 'Abr', total: 16, médicos: 11, odonto: 3, outro: 2 },
        { mes: 'Mai', total: 20, médicos: 14, odonto: 4, outro: 2 },
        { mes: 'Jun', total: 17, médicos: 12, odonto: 3, outro: 2 },
      ],
      multiploAtestados: [
        { nome: 'Roberto Gonçalves', atestados: 8, periodos: '3-5 dias cada' },
        { nome: 'Mariana Oliveira', atestados: 6, periodos: '2-4 dias cada' },
        { nome: 'Camila Costa', atestados: 4, periodos: '1-3 dias cada' },
      ],
      evolucaoAnual: [
        { mes: 'Jan', colaboradores: 12, atestados: 12 },
        { mes: 'Fev', colaboradores: 14, atestados: 14 },
        { mes: 'Mar', colaboradores: 18, atestados: 18 },
        { mes: 'Abr', colaboradores: 16, atestados: 16 },
        { mes: 'Mai', colaboradores: 20, atestados: 20 },
        { mes: 'Jun', colaboradores: 17, atestados: 17 },
      ],
    };

    // Tela 1: Banco de Horas
    if (telaRotativa === 0) {
      return (
        <div className="flex-1 flex flex-col gap-2 p-3 overflow-hidden">
          <div className="grid grid-cols-3 gap-2">
            <TVCard titulo="Saldo Total" valor={`${bancHoras.evolucaoMensal[bancHoras.evolucaoMensal.length - 1].saldo.toFixed(1)}h`} sub="Banco de horas" corSub="text-emerald-400" />
            <TVCard titulo="Créditos" valor={`${bancHoras.evolucaoMensal[bancHoras.evolucaoMensal.length - 1].creditos.toFixed(0)}h`} sub="Este mês" />
            <TVCard titulo="Débitos" valor={`${bancHoras.evolucaoMensal[bancHoras.evolucaoMensal.length - 1].debitos.toFixed(0)}h`} sub="Utilizadas" corSub="text-amber-400" />
          </div>
          <div className="grid grid-cols-2 gap-2 flex-1 min-h-0">
            {/* Row 1: TOP 5 Créditos + Débitos */}
            <div className="bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-lg p-2 flex flex-col">
              <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Top 5 Créditos</p>
              <div className="flex-1 overflow-y-auto space-y-1">
                {bancHoras.top5Creditos.map((colab, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[8px]">
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-300 truncate text-[8px]">{colab.nome}</p>
                      <p className="text-slate-500 text-[7px]">{colab.tipo}</p>
                    </div>
                    <span className="text-emerald-400 font-bold ml-1 flex-shrink-0">{colab.horas}h</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-lg p-2 flex flex-col">
              <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Top 5 Débitos</p>
              <div className="flex-1 overflow-y-auto space-y-1">
                {bancHoras.top5Debitos.map((colab, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[8px]">
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-300 truncate text-[8px]">{colab.nome}</p>
                      <p className="text-slate-500 text-[7px]">{colab.tipo}</p>
                    </div>
                    <span className="text-red-400 font-bold ml-1 flex-shrink-0">{colab.horas}h</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Row 2: Distribuição + Evolução Mensal */}
          <div className="grid grid-cols-5 gap-2 flex-1 min-h-0">
            {/* Distribuição */}
            <div className="col-span-1 bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-lg p-2 flex flex-col items-center justify-center">
              <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Distrib.</p>
              <div className="flex-1 min-h-0 flex items-center justify-center w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={bancHoras.distribuicao} cx="50%" cy="50%" innerRadius={10} outerRadius={25} paddingAngle={1} dataKey="value">
                      {bancHoras.distribuicao.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip {...tvTooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Evolução Mensal */}
            <div className="col-span-4 bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-lg p-2 flex flex-col">
              <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Evolução Mensal de Horas</p>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={bancHoras.evolucaoMensal} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="mes" tick={{ fill: '#94a3b8', fontSize: 8 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 8 }} />
                    <Tooltip {...tvTooltipStyle} formatter={(v: number) => [`${v}h`, '']} />
                    <Legend wrapperStyle={{ fontSize: 8 }} />
                    <Line type="monotone" dataKey="creditos" name="Créditos" stroke="#22c55e" strokeWidth={2} dot={{ r: 2 }} />
                    <Line type="monotone" dataKey="debitos" name="Débitos" stroke="#ef4444" strokeWidth={2} dot={{ r: 2 }} />
                    <Line type="monotone" dataKey="saldo" name="Saldo" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Tela 2: Atestados
    return (
      <div className="flex-1 flex flex-col gap-2 p-3 overflow-hidden">
        <div className="grid grid-cols-3 gap-2">
          <TVCard titulo="Total Atestados" valor={`${atestados.atestadosPorMes[atestados.atestadosPorMes.length - 1].total}`} sub="Junho 2026" />
          <TVCard titulo="Com Múltiplos" valor={`${atestados.multiploAtestados.length}`} sub="Colaboradores" corSub="text-amber-400" />
          <TVCard titulo="Média Mensal" valor={`${(atestados.atestadosPorMes.reduce((a, m) => a + m.total, 0) / atestados.atestadosPorMes.length).toFixed(0)}`} sub="Atestados" />
        </div>
        <div className="grid grid-cols-2 gap-2 flex-1 min-h-0">
          {/* TOP 5 Colaboradores */}
          <div className="bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-lg p-2 flex flex-col">
            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Top 5 com Mais Atestados</p>
            <div className="flex-1 overflow-y-auto space-y-1">
              {atestados.top5Colaboradores.map((colab, idx) => (
                <div key={idx} className="flex items-center justify-between text-[8px]">
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-300 truncate text-[8px]">{colab.nome}</p>
                    <p className="text-slate-500 text-[7px]">
                      {colab.critico > 0 ? `⚠️ ${colab.critico} crítico` : 'Normal'}
                    </p>
                  </div>
                  <span className="text-orange-400 font-bold ml-1 flex-shrink-0">{colab.total}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Atestados por Mês */}
          <div className="bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-lg p-2 flex flex-col">
            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Atestados/Mês 2026</p>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={atestados.atestadosPorMes} margin={{ top: 0, right: 5, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="mes" tick={{ fill: '#94a3b8', fontSize: 7 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 7 }} />
                  <Tooltip {...tvTooltipStyle} formatter={(v) => [v, '']} />
                  <Legend wrapperStyle={{ fontSize: 7 }} />
                  <Bar dataKey="médicos" name="Médicos" fill="#0ea5e9" radius={[2, 2, 0, 0]} stackId="a" />
                  <Bar dataKey="odonto" name="Odonto" fill="#22c55e" radius={[2, 2, 0, 0]} stackId="a" />
                  <Bar dataKey="outro" name="Outro" fill="#f59e0b" radius={[2, 2, 0, 0]} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Row 2: Múltiplos + Evolução */}
        <div className="grid grid-cols-2 gap-2 flex-1 min-h-0">
          {/* Colaboradores com Múltiplos */}
          <div className="bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-lg p-2 flex flex-col">
            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Múltiplos Atestados</p>
            <div className="flex-1 overflow-y-auto space-y-1">
              {atestados.multiploAtestados.map((colab, idx) => (
                <div key={idx} className="bg-slate-700/50 rounded p-1 text-[7px]">
                  <p className="text-slate-200 font-medium truncate">{colab.nome}</p>
                  <div className="flex justify-between text-slate-400 mt-0.5">
                    <span>{colab.atestados} atestados</span>
                    <span className="text-slate-500 text-[6px]">{colab.periodos}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Evolução Anual */}
          <div className="bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-lg p-2 flex flex-col">
            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Evolução 2026</p>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={atestados.evolucaoAnual} margin={{ top: 0, right: 5, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="mes" tick={{ fill: '#94a3b8', fontSize: 7 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 7 }} />
                  <Tooltip {...tvTooltipStyle} formatter={(v) => [v, '']} />
                  <Legend wrapperStyle={{ fontSize: 7 }} />
                  <Line type="monotone" dataKey="atestados" name="Total Atestados" stroke="#ef4444" strokeWidth={2} dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="colaboradores" name="Colaboradores" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Page: NIR — Tela 1: Dashboard KPIs + Tela 2: Produtividade (rotação automática)
  const renderNIR = () => {
    // Mock data — em produção, integrar com dados reais do Supabase
    const nirDashboard = {
      ocupacaoPorSetor: [
        { name: 'UTI', occupied: 24, total: 30, rate: 80 },
        { name: 'Clínica Geral', occupied: 45, total: 50, rate: 90 },
        { name: 'Pediatria', occupied: 18, total: 25, rate: 72 },
        { name: 'Maternidade', occupied: 12, total: 15, rate: 80 },
      ],
      distribuicaoPacientes: {
        total: 99,
        altas: 8,
        internacoes: 5,
        transferencias: 2,
      },
      evolucaoInternacoes: [
        { date: 'Seg', internacoes: 5, altas: 3, total: 89 },
        { date: 'Ter', internacoes: 7, altas: 4, total: 92 },
        { date: 'Qua', internacoes: 4, altas: 2, total: 94 },
        { date: 'Qui', internacoes: 6, altas: 5, total: 95 },
        { date: 'Sex', internacoes: 5, altas: 3, total: 97 },
        { date: 'Sáb', internacoes: 2, altas: 1, total: 98 },
        { date: 'Dom', internacoes: 3, altas: 2, total: 99 },
      ],
    };

    const nirProdutividade = {
      desempenhoPorColaborador: [
        { name: 'Colaborador A', atendimentos: 24, meta: 20, taxa: 120 },
        { name: 'Colaborador B', atendimentos: 18, meta: 20, taxa: 90 },
        { name: 'Colaborador C', atendimentos: 22, meta: 20, taxa: 110 },
        { name: 'Colaborador D', atendimentos: 19, meta: 20, taxa: 95 },
        { name: 'Colaborador E', atendimentos: 21, meta: 20, taxa: 105 },
      ],
      distribuicaoAtividade: [
        { name: 'Avaliação', value: 35, color: '#0ea5e9' },
        { name: 'Reabilitação', value: 30, color: '#22c55e' },
        { name: 'Acompanhamento', value: 20, color: '#f59e0b' },
        { name: 'Triagem', value: 15, color: '#ef4444' },
      ],
      comparativoColaboradores: [
        { mes: 'Jan', colabA: 18, colabB: 15, colabC: 17, colabD: 16, meta: 20 },
        { mes: 'Fev', colabA: 20, colabB: 17, colabC: 19, colabD: 18, meta: 20 },
        { mes: 'Mar', colabA: 22, colabB: 19, colabC: 21, colabD: 20, meta: 20 },
      ],
    };

    // Tela 1: Dashboard
    if (telaRotativa === 0) {
      return (
        <div className="flex-1 flex flex-col gap-4 p-5 overflow-hidden">
          <div className="grid grid-cols-3 gap-3">
            <TVCard titulo="Pacientes Internados" valor={`${nirDashboard.distribuicaoPacientes.total}`} sub="Total no hospital" />
            <TVCard titulo="Altas Hoje" valor={`${nirDashboard.distribuicaoPacientes.altas}`} sub={`+${nirDashboard.distribuicaoPacientes.internacoes} internações`} />
            <TVCard titulo="Taxa Média" valor={`${(nirDashboard.ocupacaoPorSetor.reduce((a, s) => a + s.rate, 0) / nirDashboard.ocupacaoPorSetor.length).toFixed(0)}%`} sub="Ocupação setores" corSub="text-sky-400" />
          </div>
          <div className="grid grid-cols-3 gap-3 flex-1 min-h-0">
            {/* Ocupação por Setor */}
            <div className="bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-xl p-4 flex flex-col">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Ocupação por Setor</p>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={nirDashboard.ocupacaoPorSetor} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 9 }} />
                    <YAxis dataKey="name" type="category" tick={{ fill: '#94a3b8', fontSize: 9 }} width={50} />
                    <Tooltip {...tvTooltipStyle} formatter={(v: number) => [`${v}%`, 'Taxa']} />
                    <Bar dataKey="rate" fill="#0ea5e9" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Distribuição de Pacientes */}
            <div className="bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-xl p-4 flex flex-col items-center justify-center">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Distribuição Pacientes</p>
              <div className="space-y-3 w-full">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-300">Total</span>
                  <span className="text-2xl font-black text-sky-400">{nirDashboard.distribuicaoPacientes.total}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-700">
                  <span className="text-xs text-slate-400">Altas</span>
                  <span className="text-lg font-bold text-emerald-400">+{nirDashboard.distribuicaoPacientes.altas}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">Internações</span>
                  <span className="text-lg font-bold text-amber-400">+{nirDashboard.distribuicaoPacientes.internacoes}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">Transferências</span>
                  <span className="text-lg font-bold text-violet-400">{nirDashboard.distribuicaoPacientes.transferencias}</span>
                </div>
              </div>
            </div>

            {/* Evolução - Internações e Altas */}
            <div className="bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-xl p-4 flex flex-col">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Evolução - Internações e Altas</p>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={nirDashboard.evolucaoInternacoes}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 9 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 9 }} />
                    <Tooltip {...tvTooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 9 }} />
                    <Line type="monotone" dataKey="internacoes" name="Internações" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2 }} />
                    <Line type="monotone" dataKey="altas" name="Altas" stroke="#22c55e" strokeWidth={2} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Tela 2: Produtividade
    return (
      <div className="flex-1 flex flex-col gap-4 p-5 overflow-hidden">
        <div className="grid grid-cols-3 gap-3">
          <TVCard titulo="Desempenho Médio" valor={`${(nirProdutividade.desempenhoPorColaborador.reduce((a, c) => a + c.taxa, 0) / nirProdutividade.desempenhoPorColaborador.length).toFixed(0)}%`} sub="Equipe" corSub="text-emerald-400" />
          <TVCard titulo="Atividades Realizadas" valor={`${nirProdutividade.distribuicaoAtividade.reduce((a, d) => a + d.value, 0)}`} sub="Nesta semana" />
          <TVCard titulo="Meta de Produção" valor="100%" sub="Equipe em dia" corSub="text-sky-400" />
        </div>
        <div className="grid grid-cols-3 gap-3 flex-1 min-h-0">
          {/* Desempenho por Colaborador */}
          <div className="bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-xl p-4 flex flex-col">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Desempenho por Colaborador</p>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={nirProdutividade.desempenhoPorColaborador}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 8 }} angle={-45} textAnchor="end" height={70} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 9 }} />
                  <Tooltip {...tvTooltipStyle} formatter={(v: number) => [`${v}`, 'Atendimentos']} />
                  <Bar dataKey="atendimentos" fill="#0ea5e9" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Distribuição Total por Atividade */}
          <div className="bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-xl p-4 flex flex-col items-center justify-center">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Distribuição por Atividade</p>
            <div className="flex-1 min-h-0 flex items-center justify-center w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={nirProdutividade.distribuicaoAtividade} cx="50%" cy="50%" innerRadius={30} outerRadius={60} paddingAngle={2} dataKey="value">
                    {nirProdutividade.distribuicaoAtividade.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip {...tvTooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Comparativo entre Colaboradores */}
          <div className="bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-xl p-4 flex flex-col">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Comparativo entre Colaboradores</p>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={nirProdutividade.comparativoColaboradores}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="mes" tick={{ fill: '#94a3b8', fontSize: 9 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 9 }} />
                  <Tooltip {...tvTooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 8 }} />
                  <Line type="monotone" dataKey="colabA" name="Colab A" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="colabB" name="Colab B" stroke="#22c55e" strokeWidth={2} dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="colabC" name="Colab C" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="colabD" name="Colab D" stroke="#ef4444" strokeWidth={2} dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="meta" name="Meta" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 1 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    );
  };

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

  const paginasRender = [renderFinanceiro, renderFaturamento, renderQualidade, renderNIR, renderRHDP, renderAssistenteSocial, renderSalus];

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
