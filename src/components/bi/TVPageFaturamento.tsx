import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { subDays, format } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell
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

export const TVPageFaturamento: React.FC = () => {
  const [saidaProntuarios, setSaidaProntuarios] = useState<any[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<any[]>([]);
  const [loadingFat, setLoadingFat] = useState(true);

  useEffect(() => {
    const fetchFaturamentoData = async () => {
      try {
        const since = subDays(new Date(), 30).toISOString();
        
        const { data: saidas, error: err1 } = await supabase
          .from('saida_prontuarios')
          .select('id, status, data_atendimento, created_at')
          .gte('created_at', since)
          .range(0, 999);
        
        if (err1) throw err1;
        setSaidaProntuarios(saidas || []);

        const { data: avals, error: err2 } = await supabase
          .from('avaliacoes_prontuarios')
          .select('id, saida_prontuario_id, is_finalizada, data_inicio')
          .gte('data_inicio', since)
          .range(0, 999);
        
        if (err2) throw err2;
        setAvaliacoes(avals || []);
      } catch (e) {
        console.error('Erro ao buscar dados de faturamento:', e);
      } finally {
        setLoadingFat(false);
      }
    };
    
    fetchFaturamentoData();
  }, []);

  const totalSaidas = saidaProntuarios.length;
  const saidasPendentes = saidaProntuarios.filter((s: any) => s.status === 'pendente').length;
  const saidasFinalizadas = saidaProntuarios.filter((s: any) => s.status === 'finalizado').length;
  const saidasEmProgresso = saidaProntuarios.filter((s: any) => s.status === 'em_progresso').length;
  const avaliadas = avaliacoes.filter((a: any) => a.is_finalizada).length;
  const taxaAvaliacao = totalSaidas > 0 ? Math.round((avaliadas / totalSaidas) * 100) : 0;

  const statusDistribution = [
    { name: 'Pendente', value: saidasPendentes, color: '#f59e0b' },
    { name: 'Em Progresso', value: saidasEmProgresso, color: '#0ea5e9' },
    { name: 'Finalizado', value: saidasFinalizadas, color: '#22c55e' },
  ].filter(s => s.value > 0);

  const diasMap = new Map<string, { pendente: number; progresso: number; finalizado: number }>();
  for (let i = 13; i >= 0; i--) {
    const d = subDays(new Date(), i);
    const key = format(d, 'dd/MM');
    diasMap.set(key, { pendente: 0, progresso: 0, finalizado: 0 });
  }
  
  saidaProntuarios.forEach((s: any) => {
    const d = format(new Date(s.created_at), 'dd/MM');
    if (diasMap.has(d)) {
      const stat = diasMap.get(d)!;
      if (s.status === 'pendente') stat.pendente++;
      else if (s.status === 'em_progresso') stat.progresso++;
      else if (s.status === 'finalizado') stat.finalizado++;
    }
  });

  const evolucaoSaidas = Array.from(diasMap.entries()).map(([dia, vals]) => ({
    dia,
    pendente: vals.pendente,
    progresso: vals.progresso,
    finalizado: vals.finalizado,
  }));

  return (
    <div className="flex-1 flex flex-col gap-3 p-4 overflow-hidden">
      <div className="grid grid-cols-4 gap-2">
        <TVCard titulo="Total Saídas" valor={`${totalSaidas}`} sub={`Últimos 30 dias`} corSub="text-sky-400" />
        <TVCard titulo="Pendentes" valor={`${saidasPendentes}`} sub={`${totalSaidas > 0 ? Math.round((saidasPendentes / totalSaidas) * 100) : 0}%`} corSub="text-amber-400" />
        <TVCard titulo="Finalizadas" valor={`${saidasFinalizadas}`} sub={`${totalSaidas > 0 ? Math.round((saidasFinalizadas / totalSaidas) * 100) : 0}%`} corSub="text-emerald-400" />
        <TVCard titulo="Taxa Avaliação" valor={`${taxaAvaliacao}%`} sub={`${avaliadas}/${totalSaidas}`} corSub={taxaAvaliacao >= 80 ? 'text-emerald-400' : 'text-amber-400'} />
      </div>

      {!loadingFat && totalSaidas > 0 ? (
        <div className="grid grid-cols-2 gap-2 flex-1 min-h-0">
          <div className="bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-lg p-3 flex flex-col">
            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Evolução de Saídas (14 dias)</p>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={evolucaoSaidas} margin={{ top: 0, right: 10, left: 0, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="dia" tick={{ fill: '#94a3b8', fontSize: 7 }} angle={-45} textAnchor="end" height={50} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 8 }} />
                  <Tooltip {...tvTooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 8 }} />
                  <Bar dataKey="pendente" name="Pendente" fill="#f59e0b" stackId="a" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="progresso" name="Em Prog." fill="#0ea5e9" stackId="a" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="finalizado" name="Finalizado" fill="#22c55e" stackId="a" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-lg p-3 flex flex-col items-center justify-center">
            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Status Atual</p>
            <div className="flex-1 min-h-0 flex items-center justify-center w-full">
              {statusDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusDistribution} cx="50%" cy="50%" innerRadius={12} outerRadius={35} paddingAngle={1} dataKey="value">
                      {statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip {...tvTooltipStyle} formatter={(v: number) => [`${v}`, 'Saídas']} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-slate-400 text-[8px]">Sem dados</div>
              )}
            </div>
            <div className="mt-1 text-[8px] space-y-0.5 w-full">
              {statusDistribution.map(item => (
                <div key={item.name} className="flex items-center justify-between">
                  <span className="text-slate-400">{item.name}</span>
                  <span className="font-bold text-slate-300">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
          {loadingFat ? 'Carregando dados...' : 'Sem dados de prontuários'}
        </div>
      )}
    </div>
  );
};
