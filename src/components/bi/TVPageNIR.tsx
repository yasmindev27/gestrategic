import React from 'react';
import { useNIRKPIs } from '@/hooks/useNIRKPIs';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TVCard } from './TVCard';

const tvTooltipStyle = {
  contentStyle: {
    backgroundColor: '#1e293b',
    border: '1px solid #475569',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
    fontSize: '12px',
  },
  labelStyle: { color: '#cbd5e1', fontSize: '11px' },
  itemStyle: { color: '#e2e8f0' },
  wrapperStyle: { outline: 'none' },
};

interface TVPageNIRState {
  telaRotativa: number;
}

interface TVPageNIRProps {
  telaRotativa: number;
}

export function TVPageNIR({ telaRotativa }: TVPageNIRProps) {
  const nir = useNIRKPIs();

  if (nir.loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-slate-700 border-t-sky-500 mb-4" />
          <p className="text-slate-400 text-lg">Carregando dados NIR...</p>
        </div>
      </div>
    );
  }

  if (nir.error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-5">
        <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-6 text-center max-w-lg">
          <p className="text-red-400 text-lg font-semibold mb-2">Erro ao carregar dados NIR</p>
          <p className="text-red-300 text-sm">{nir.error}</p>
        </div>
      </div>
    );
  }

  // Tela 1: Dashboard de Internações
  if (telaRotativa === 0) {
    return (
      <div className="flex-1 flex flex-col gap-4 p-5 overflow-hidden">
        <div className="grid grid-cols-3 gap-3">
          <TVCard 
            titulo="Pacientes Internados" 
            valor={`${nir.distribuicaoPacientes.total}`} 
            sub="Total no hospital" 
          />
          <TVCard 
            titulo="Altas Hoje" 
            valor={`${nir.distribuicaoPacientes.altas}`} 
            sub={`+${nir.distribuicaoPacientes.internacoes} internações`} 
          />
          <TVCard 
            titulo="Taxa Média" 
            valor={`${(nir.ocupacaoPorSetor.reduce((a, s) => a + s.rate, 0) / Math.max(nir.ocupacaoPorSetor.length, 1)).toFixed(0)}%`} 
            sub="Ocupação setores" 
            corSub="text-sky-400" 
          />
        </div>
        <div className="grid grid-cols-3 gap-3 flex-1 min-h-0">
          {/* Ocupação por Setor */}
          <div className="bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-xl p-4 flex flex-col">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Ocupação por Setor</p>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={nir.ocupacaoPorSetor} layout="vertical">
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
                <span className="text-2xl font-black text-sky-400">{nir.distribuicaoPacientes.total}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-700">
                <span className="text-xs text-slate-400">Altas</span>
                <span className="text-lg font-bold text-emerald-400">+{nir.distribuicaoPacientes.altas}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">Internações</span>
                <span className="text-lg font-bold text-amber-400">+{nir.distribuicaoPacientes.internacoes}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">Transferências</span>
                <span className="text-lg font-bold text-violet-400">{nir.distribuicaoPacientes.transferencias}</span>
              </div>
            </div>
          </div>

          {/* Evolução - Internações e Altas */}
          <div className="bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-xl p-4 flex flex-col">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Evolução - Internações e Altas</p>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={nir.evolucaoInternacoes}>
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
        <TVCard 
          titulo="Desempenho Médio" 
          valor={`${(nir.desempenhoPorColaborador.reduce((a, c) => a + c.taxa, 0) / Math.max(nir.desempenhoPorColaborador.length, 1)).toFixed(0)}%`} 
          sub="Equipe" 
          corSub="text-emerald-400" 
        />
        <TVCard 
          titulo="Atividades Realizadas" 
          valor={`${nir.distribuicaoAtividade.reduce((a, d) => a + d.value, 0)}`} 
          sub="Nesta semana" 
        />
        <TVCard 
          titulo="Meta de Produção" 
          valor="100%" 
          sub="Equipe em dia" 
          corSub="text-sky-400" 
        />
      </div>
      <div className="grid grid-cols-3 gap-3 flex-1 min-h-0">
        {/* Desempenho por Colaborador */}
        <div className="bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-xl p-4 flex flex-col">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Desempenho por Colaborador</p>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={nir.desempenhoPorColaborador}>
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
                <Pie data={nir.distribuicaoAtividade} cx="50%" cy="50%" innerRadius={30} outerRadius={60} paddingAngle={2} dataKey="value">
                  {nir.distribuicaoAtividade.map((entry, index) => (
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
              <LineChart data={nir.comparativoColaboradores}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="mes" tick={{ fill: '#94a3b8', fontSize: 9 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 9 }} />
                <Tooltip {...tvTooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 8 }} />
                {/* Render linhas dinamicamente para cada colaborador encontrado */}
                {nir.comparativoColaboradores.length > 0 && 
                  Object.keys(nir.comparativoColaboradores[0])
                    .filter(k => k !== 'mes' && k !== 'meta')
                    .slice(0, 4)
                    .map((colabKey, idx) => (
                      <Line 
                        key={colabKey} 
                        type="monotone" 
                        dataKey={colabKey as any} 
                        name={colabKey.replace('colab_', 'Colab ')} 
                        stroke={['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444'][idx]} 
                        strokeWidth={2} 
                        dot={{ r: 2 }} 
                      />
                    ))
                }
                <Line type="monotone" dataKey="meta" name="Meta" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 1 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
