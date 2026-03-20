import React, { useState, useEffect } from 'react';
import { useKPIsOperacionais, useKPIsFinanceiros, useKPIsQualidade, useKPIsRH } from '@/hooks/useKPIsHospitalar';
import { useTendenciaFinanceira, useTendenciaOcupacao, useTendenciaIncidentes, useTendenciaDRE } from '@/hooks/useBITrends';
import { ChevronRight, Clock, Pause, Play, ExternalLink, Stethoscope } from 'lucide-react';
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

  const paginas = ['Executivo', 'Operacional', 'Financeiro', 'Faturamento', 'Qualidade', 'NIR', 'RH/DP', 'Social', 'Salus'];
  
  // Rotação automática entre telas NIR (a cada 45s em pausa/ou quando estiver na página NIR)
  useEffect(() => {
    if (paginaAtiva !== 5 && paginaAtiva !== 6) return; // Rotaciona quando estiver em RH/DP (5) ou NIR (6)
    if (emPausa) return;
    const i = setInterval(() => {
      setTelaRotativa(t => (t + 1) % 2); // Alterna entre 0 e 1
    }, 45000);
    return () => clearInterval(i);
  }, [paginaAtiva, emPausa]);

  useEffect(() => {
    if (emPausa || paginaAtiva === 5 || paginaAtiva === 6) return; // Não rotaciona quando em pausa ou em RH/DP (5) ou NIR (6) - têm rotação própria
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

  // Page: Faturamento — KPIs detalhados de billing e receita
  const renderFaturamento = () => {
    const faturamentoMedio = fin?.faturamento_medio_paciente?.valor_atual ?? 0;
    const custoPorLeito = fin?.custos_por_leito?.valor_atual ?? 0;
    
    // Mock data para gráficos de faturamento
    const faturamentoPorOrigem = [
      { name: 'Particular', value: 35, color: '#22c55e' },
      { name: 'Convênio', value: 45, color: '#0ea5e9' },
      { name: 'SUS', value: 20, color: '#f59e0b' },
    ];

    const recebiveisEvolution = [
      { mes: 'Jan', a_receber: 120000, recebido: 450000 },
      { mes: 'Fev', a_receber: 135000, recebido: 480000 },
      { mes: 'Mar', a_receber: 125000, recebido: 520000 },
      { mes: 'Abr', a_receber: 145000, recebido: 510000 },
      { mes: 'Mai', a_receber: 140000, recebido: 530000 },
      { mes: 'Jun', a_receber: 155000, recebido: 550000 },
    ];

    const ticketMedioPorSetor = [
      { setor: 'UTI', ticket: 8500 },
      { setor: 'Clínica', ticket: 4200 },
      { setor: 'Pediatria', ticket: 3800 },
      { setor: 'Maternidade', ticket: 5600 },
    ];

    return (
      <div className="flex-1 flex flex-col gap-4 p-5 overflow-hidden">
        <div className="grid grid-cols-4 gap-3">
          <TVCard titulo="Receita Total" valor={fmtR$(receita)} sub={`Variação: ${fin?.receita_realizadas.variacao_percentual > 0 ? '+' : ''}${fin?.receita_realizadas.variacao_percentual.toFixed(1)}%`}
            corSub={fin?.receita_realizadas.variacao_percentual > 0 ? 'text-emerald-400' : 'text-red-400'} />
          <TVCard titulo="Ticket Médio" valor={fmtR$(faturamentoMedio)} sub={`Por paciente`} />
          <TVCard titulo="Custo por Leito" valor={fmtR$(custoPorLeito)} sub="Diário" />
          <TVCard titulo="Margem" valor={`${fin?.margem_operacional.valor_atual.toFixed(1) ?? 0}%`} sub="Operacional"
            corSub={fin?.margem_operacional.valor_atual > 15 ? 'text-emerald-400' : 'text-amber-400'} />
        </div>
        <div className="grid grid-cols-3 gap-3 flex-1 min-h-0">
          {/* Recebíveis Evolution */}
          <div className="col-span-2 bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-xl p-4 flex flex-col">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Recebíveis vs Recebido</p>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={recebiveisEvolution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="mes" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={formatR$Short} />
                  <Tooltip {...tvTooltipStyle} formatter={(v: number) => [`R$ ${v.toLocaleString('pt-BR')}`, '']} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="a_receber" name="A Receber" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="recebido" name="Recebido" fill="#22c55e" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Distribuição por Origem de Faturamento */}
          <div className="bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-xl p-4 flex flex-col items-center justify-center">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Faturamento por Origem</p>
            <div className="flex-1 min-h-0 flex items-center justify-center w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={faturamentoPorOrigem} cx="50%" cy="50%" innerRadius={25} outerRadius={55} paddingAngle={2} dataKey="value">
                    {faturamentoPorOrigem.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip {...tvTooltipStyle} formatter={(v: number) => [`${v}%`]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 text-xs space-y-1 w-full">
              {faturamentoPorOrigem.map(item => (
                <div key={item.name} className="flex items-center justify-between">
                  <span className="text-slate-400">{item.name}</span>
                  <span className="font-bold text-slate-300">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

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
        <div className="flex-1 flex flex-col gap-4 p-5 overflow-hidden">
          <div className="grid grid-cols-3 gap-3">
            <TVCard titulo="Saldo Total" valor={`${bancHoras.evolucaoMensal[bancHoras.evolucaoMensal.length - 1].saldo.toFixed(1)}h`} sub="Banco de horas" corSub="text-emerald-400" />
            <TVCard titulo="Créditos" valor={`${bancHoras.evolucaoMensal[bancHoras.evolucaoMensal.length - 1].creditos.toFixed(0)}h`} sub="Este mês" />
            <TVCard titulo="Débitos" valor={`${bancHoras.evolucaoMensal[bancHoras.evolucaoMensal.length - 1].debitos.toFixed(0)}h`} sub="Utilizadas" corSub="text-amber-400" />
          </div>
          <div className="grid grid-cols-3 gap-3 flex-1 min-h-0">
            {/* TOP 5 Créditos + Débitos */}
            <div className="bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-xl p-4 flex flex-col">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Top 5 Mais Créditos</p>
              <div className="flex-1 overflow-y-auto space-y-2">
                {bancHoras.top5Creditos.map((colab, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-300 truncate">{colab.nome}</p>
                      <p className="text-slate-500 text-[10px]">{colab.tipo}</p>
                    </div>
                    <span className="text-emerald-400 font-bold ml-2">{colab.horas}h</span>
                  </div>
                ))}
              </div>
            </div>

            {/* TOP 5 Débitos */}
            <div className="bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-xl p-4 flex flex-col">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Top 5 Mais Débitos</p>
              <div className="flex-1 overflow-y-auto space-y-2">
                {bancHoras.top5Debitos.map((colab, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-300 truncate">{colab.nome}</p>
                      <p className="text-slate-500 text-[10px]">{colab.tipo}</p>
                    </div>
                    <span className="text-red-400 font-bold ml-2">{colab.horas}h</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Distribuição */}
            <div className="bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-xl p-4 flex flex-col items-center justify-center">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Distribuição</p>
              <div className="flex-1 min-h-0 flex items-center justify-center w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={bancHoras.distribuicao} cx="50%" cy="50%" innerRadius={20} outerRadius={40} paddingAngle={2} dataKey="value">
                      {bancHoras.distribuicao.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip {...tvTooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Evolução Mensal */}
          <div className="bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-xl p-4 flex flex-col">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Evolução Mensal de Horas</p>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={bancHoras.evolucaoMensal}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="mes" tick={{ fill: '#94a3b8', fontSize: 9 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 9 }} />
                  <Tooltip {...tvTooltipStyle} formatter={(v: number) => [`${v}h`, '']} />
                  <Legend wrapperStyle={{ fontSize: 9 }} />
                  <Line type="monotone" dataKey="creditos" name="Créditos" stroke="#22c55e" strokeWidth={2} dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="debitos" name="Débitos" stroke="#ef4444" strokeWidth={2} dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="saldo" name="Saldo" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      );
    }

    // Tela 2: Atestados
    return (
      <div className="flex-1 flex flex-col gap-4 p-5 overflow-hidden">
        <div className="grid grid-cols-3 gap-3">
          <TVCard titulo="Total de Atestados" valor={`${atestados.atestadosPorMes[atestados.atestadosPorMes.length - 1].total}`} sub="Junho 2026" />
          <TVCard titulo="Com Múltiplos" valor={`${atestados.multiploAtestados.length}`} sub="Colaboradores" corSub="text-amber-400" />
          <TVCard titulo="Média Mensal" valor={`${(atestados.atestadosPorMes.reduce((a, m) => a + m.total, 0) / atestados.atestadosPorMes.length).toFixed(0)}`} sub="Atestados" />
        </div>
        <div className="grid grid-cols-3 gap-3 flex-1 min-h-0">
          {/* TOP 5 Colaboradores + Múltiplos Atestados */}
          <div className="bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-xl p-4 flex flex-col">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Top 5 com Mais Atestados</p>
            <div className="flex-1 overflow-y-auto space-y-2">
              {atestados.top5Colaboradores.map((colab, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <div className="flex-1">
                    <p className="text-slate-300">{colab.nome}</p>
                    <p className="text-slate-500 text-[10px]">
                      {colab.critico > 0 ? `⚠️ ${colab.critico} crítico` : 'Normal'}
                    </p>
                  </div>
                  <span className="text-orange-400 font-bold ml-2">{colab.total}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Atestados por Mês */}
          <div className="col-span-2 bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-xl p-4 flex flex-col">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Atestados por Mês - 2026</p>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={atestados.atestadosPorMes}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="mes" tick={{ fill: '#94a3b8', fontSize: 9 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 9 }} />
                  <Tooltip {...tvTooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 9 }} />
                  <Bar dataKey="médicos" name="Médicos" fill="#0ea5e9" radius={[3, 3, 0, 0]} stackId="a" />
                  <Bar dataKey="odonto" name="Odonto" fill="#22c55e" radius={[3, 3, 0, 0]} stackId="a" />
                  <Bar dataKey="outro" name="Outro" fill="#f59e0b" radius={[3, 3, 0, 0]} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Detalhamento + Evolução */}
        <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
          {/* Colaboradores com Múltiplos */}
          <div className="bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-xl p-4 flex flex-col">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Múltiplos Atestados - Detalhes</p>
            <div className="flex-1 overflow-y-auto space-y-2">
              {atestados.multiploAtestados.map((colab, idx) => (
                <div key={idx} className="bg-slate-700/50 rounded p-2 text-xs">
                  <p className="text-slate-200 font-medium">{colab.nome}</p>
                  <div className="flex justify-between text-slate-400 mt-1">
                    <span>{colab.atestados} atestados</span>
                    <span>{colab.periodos}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Evolução Anual */}
          <div className="bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-xl p-4 flex flex-col">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Evolução 2026</p>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={atestados.evolucaoAnual}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="mes" tick={{ fill: '#94a3b8', fontSize: 9 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 9 }} />
                  <Tooltip {...tvTooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 9 }} />
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

  // Page: Assistente Social / Psicologia — KPIs de atendimento
  const renderAssistenteSocial = () => {
    // Mock data para Assistente Social
    const socialData = {
      tiposAtendimento: [
        { name: 'Acolhimento', value: 28, color: '#0ea5e9' },
        { name: 'Orientação', value: 35, color: '#22c55e' },
        { name: 'Acompanhamento', value: 22, color: '#f59e0b' },
        { name: 'Encaminhamento', value: 15, color: '#ef4444' },
      ],
      localAtendimento: [
        { local: 'Ambulatório', demanda: 45 },
        { local: 'Internação', demanda: 38 },
        { local: 'Urgência', demanda: 28 },
        { local: 'Teleprevidência', demanda: 12 },
        { local: 'Homecare', demanda: 8 },
      ],
      produtividadeProfissional: [
        { nome: 'Profissional A', atendimentos: 52, meta: 50, taxa: 104 },
        { nome: 'Profissional B', atendimentos: 48, meta: 50, taxa: 96 },
        { nome: 'Profissional C', atendimentos: 55, meta: 50, taxa: 110 },
        { nome: 'Profissional D', atendimentos: 41, meta: 50, taxa: 82 },
      ],
      motivosMais: [
        { motivo: 'Questões Financeiras', frequencia: 28, percentual: 22 },
        { motivo: 'Problemas Familiares', frequencia: 25, percentual: 19 },
        { motivo: 'Saúde Mental', frequencia: 22, percentual: 17 },
        { motivo: 'Moradia', frequencia: 18, percentual: 14 },
        { motivo: 'Educação', frequencia: 15, percentual: 12 },
        { motivo: 'Outros', frequencia: 20, percentual: 16 },
      ],
      evolucaoMensal: [
        { mes: 'Jan', total: 98, acolhimento: 24, orientacao: 32, acompanhamento: 24, encaminhamento: 18 },
        { mes: 'Fev', total: 105, acolhimento: 26, orientacao: 36, acompanhamento: 25, encaminhamento: 18 },
        { mes: 'Mar', total: 112, acolhimento: 28, orientacao: 38, acompanhamento: 26, encaminhamento: 20 },
        { mes: 'Abr', total: 108, acolhimento: 27, orientacao: 35, acompanhamento: 25, encaminhamento: 21 },
        { mes: 'Mai', total: 115, acolhimento: 29, orientacao: 38, acompanhamento: 26, encaminhamento: 22 },
        { mes: 'Jun', total: 120, acolhimento: 31, orientacao: 40, acompanhamento: 27, encaminhamento: 22 },
      ],
    };

    const totalAtendimentos = socialData.evolucaoMensal[socialData.evolucaoMensal.length - 1].total;
    const mediaAtendimentos = (socialData.evolucaoMensal.reduce((a, m) => a + m.total, 0) / socialData.evolucaoMensal.length).toFixed(0);
    const profComMaisProdutividade = socialData.produtividadeProfissional.reduce((a, p) => p.taxa > a.taxa ? p : a);

    return (
      <div className="flex-1 flex flex-col gap-4 p-5 overflow-hidden">
        <div className="grid grid-cols-4 gap-3">
          <TVCard titulo="Total Atendimentos" valor={`${totalAtendimentos}`} sub="Junho 2026" corSub="text-sky-400" />
          <TVCard titulo="Média Mensal" valor={`${mediaAtendimentos}`} sub="2026" />
          <TVCard titulo="Produtividade Máx" valor={`${profComMaisProdutividade.taxa}%`} sub={profComMaisProdutividade.nome} corSub="text-emerald-400" />
          <TVCard titulo="Motivo Primário" valor="Financeiras" sub="28% dos casos" corSub="text-amber-400" />
        </div>

        <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
          {/* Perfil por Tipo de Atendimento */}
          <div className="bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-xl p-4 flex flex-col">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Perfil por Tipo de Atendimento</p>
            <div className="flex-1 min-h-0 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={socialData.tiposAtendimento} cx="50%" cy="50%" innerRadius={25} outerRadius={55} paddingAngle={2} dataKey="value">
                    {socialData.tiposAtendimento.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip {...tvTooltipStyle} formatter={(v: number) => [`${v}%`]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Demanda por Local de Atendimento */}
          <div className="bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-xl p-4 flex flex-col">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Demanda por Local de Atendimento</p>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={socialData.localAtendimento} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 9 }} />
                  <YAxis dataKey="local" type="category" tick={{ fill: '#94a3b8', fontSize: 8 }} width={85} />
                  <Tooltip {...tvTooltipStyle} formatter={(v: number) => [`${v}`, 'Demanda']} />
                  <Bar dataKey="demanda" fill="#0ea5e9" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
          {/* Produtividade por Profissional */}
          <div className="bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-xl p-4 flex flex-col">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Produtividade por Profissional</p>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={socialData.produtividadeProfissional}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="nome" tick={{ fill: '#94a3b8', fontSize: 8 }} angle={-45} textAnchor="end" height={60} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 9 }} />
                  <Tooltip {...tvTooltipStyle} formatter={(v: number) => [`${v}`, 'Atendimentos']} />
                  <Bar dataKey="atendimentos" fill="#22c55e" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Motivos de Atendimento Mais Frequentes */}
          <div className="bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-xl p-4 flex flex-col">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Motivos Mais Frequentes</p>
            <div className="flex-1 overflow-y-auto space-y-1.5">
              {socialData.motivosMais.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <div className="flex-1">
                    <p className="text-slate-300 truncate">{item.motivo}</p>
                    <div className="h-1.5 bg-slate-700 rounded mt-0.5 overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-sky-500 to-cyan-400" 
                        style={{ width: `${item.percentual}%` }} 
                      />
                    </div>
                  </div>
                  <span className="text-slate-400 font-bold ml-2 text-[9px]">{item.percentual}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

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

  const paginasRender = [renderExecutivo, renderOperacional, renderFinanceiro, renderFaturamento, renderQualidade, renderNIR, renderRHDP, renderAssistenteSocial, renderSalus];

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
