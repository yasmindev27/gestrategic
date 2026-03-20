import React from 'react';
import { useAssistenciaSocialKPIs } from '@/hooks/useAssistenciaSocialKPIs';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area
} from 'recharts';

const tvTooltipStyle = {
  contentStyle: { backgroundColor: '#1e293b', border: '2px solid #475569', borderRadius: 12, color: '#f1f5f9', fontSize: 16, padding: '12px 16px' },
  labelStyle: { color: '#94a3b8', fontSize: 16, marginBottom: '4px' },
};

interface TVCardProps {
  titulo: string;
  valor: string;
  sub: string;
  corSub?: string;
}

const TVCard: React.FC<TVCardProps> = ({ titulo, valor, sub, corSub = 'text-slate-400' }) => (
  <div className="bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-2xl p-6 flex flex-col justify-between min-h-[160px]">
    <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">{titulo}</p>
    <p className="text-5xl font-black text-white mt-2 tabular-nums tracking-tight">{valor}</p>
    <p className={`text-sm font-medium mt-1 ${corSub}`}>{sub}</p>
  </div>
);

export const TVPageAssistenciaSocial: React.FC = () => {
  const { data: social, loading, error } = useAssistenciaSocialKPIs();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400">
        Carregando dados de Assistência Social...
      </div>
    );
  }

  if (error || !social) {
    return (
      <div className="flex-1 flex items-center justify-center text-red-400">
        Erro ao carregar dados: {error || 'Sem dados disponíveis'}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-3 p-4 overflow-hidden">
      {/* Header Cards */}
      <div className="grid grid-cols-4 gap-2">
        <TVCard 
          titulo="Total Atendimentos" 
          valor={`${social.totalAtendimentos}`} 
          sub={`Últimos 90 dias`} 
          corSub="text-sky-400" 
        />
        <TVCard 
          titulo="Média Mensal" 
          valor={`${social.mediaAtendimentos}`} 
          sub="3 meses" 
        />
        <TVCard 
          titulo="Produtividade Máx" 
          valor={`${social.profComMaisProdutividade?.taxa ?? 0}%`} 
          sub={social.profComMaisProdutividade?.nome ?? 'N/A'} 
          corSub="text-emerald-400" 
        />
        <TVCard 
          titulo="Motivo Primário" 
          valor={social.motivosMais[0]?.motivo ?? 'N/A'} 
          sub={`${social.motivosMais[0]?.percentual ?? 0}% dos casos`} 
          corSub="text-amber-400" 
        />
      </div>

      {/* Row 1: Tipo Atendimento + Demanda Local */}
      <div className="grid grid-cols-2 gap-2 flex-1 min-h-0">
        {/* Perfil por Tipo de Atendimento */}
        <div className="bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-lg p-3 flex flex-col">
          <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Tipo de Atendimento</p>
          <div className="flex-1 min-h-0 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={social.tiposAtendimento} cx="50%" cy="50%" innerRadius={20} outerRadius={45} paddingAngle={2} dataKey="value">
                  {social.tiposAtendimento.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip {...tvTooltipStyle} formatter={(v: number) => [`${v}%`]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Demanda por Tipo */}
        <div className="bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-lg p-3 flex flex-col">
          <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Demanda por Tipo</p>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={social.localAtendimento} layout="vertical" margin={{ top: 0, right: 10, left: 70, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 8 }} />
                <YAxis dataKey="local" type="category" tick={{ fill: '#94a3b8', fontSize: 7 }} width={65} />
                <Tooltip {...tvTooltipStyle} formatter={(v: number) => [`${v}`, 'Demanda']} />
                <Bar dataKey="demanda" fill="#0ea5e9" radius={[0, 2, 2, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2: Produtividade + Motivos */}
      <div className="grid grid-cols-2 gap-2 flex-1 min-h-0">
        {/* Produtividade por Profissional */}
        <div className="bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-lg p-3 flex flex-col">
          <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Produtividade por Profissional</p>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={social.produtividadeProfissional} margin={{ top: 0, right: 10, left: 0, bottom: 50 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="nome" tick={{ fill: '#94a3b8', fontSize: 7 }} angle={-35} textAnchor="end" height={50} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 8 }} />
                <Tooltip {...tvTooltipStyle} formatter={(v: number) => [`${v}`, 'Atend.']} />
                <Bar dataKey="atendimentos" fill="#22c55e" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Motivos Mais Frequentes */}
        <div className="bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-lg p-3 flex flex-col">
          <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Motivos Mais Frequentes</p>
          <div className="flex-1 overflow-y-auto space-y-1">
            {social.motivosMais.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-[9px]">
                <div className="flex-1 min-w-0">
                  <p className="text-slate-300 truncate text-[8px]">{item.motivo}</p>
                  <div className="h-1 bg-slate-700 rounded mt-0.5 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-sky-500 to-cyan-400" 
                      style={{ width: `${item.percentual}%` }} 
                    />
                  </div>
                </div>
                <span className="text-slate-400 font-bold ml-1 text-[8px] flex-shrink-0">{item.percentual}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Evolução Mensal */}
      <div className="bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-lg p-3 flex flex-col">
        <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Evolução Mensal (Últimos 6 meses)</p>
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={social.evolucaoMensal} margin={{ top: 5, right: 10, left: 0, bottom: 30 }}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="mes" tick={{ fill: '#94a3b8', fontSize: 8 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 8 }} />
              <Tooltip {...tvTooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 8 }} />
              <Area type="monotone" dataKey="total" name="Total" stroke="#0ea5e9" strokeWidth={2} fillOpacity={1} fill="url(#colorTotal)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
