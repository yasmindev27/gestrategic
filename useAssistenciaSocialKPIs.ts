import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, format } from 'date-fns';

interface TipoAtendimento { name: string; value: number; color: string; }
interface LocalAtendimento { local: string; demanda: number; }
interface ProdutividadeProfissional { nome: string; atendimentos: number; meta: number; taxa: number; }
interface MotivoFrequente { motivo: string; frequencia: number; percentual: number; }
interface EvoluçaoMensal { mes: string; total: number; acolhimento: number; orientacao: number; acompanhamento: number; encaminhamento: number; }
interface AssistenciaSocialKPIs {
  tiposAtendimento: TipoAtendimento[];
  localAtendimento: LocalAtendimento[];
  produtividadeProfissional: ProdutividadeProfissional[];
  motivosMais: MotivoFrequente[];
  evolucaoMensal: EvoluçaoMensal[];
  totalAtendimentos: number;
  mediaAtendimentos: number;
  profComMaisProdutividade: ProdutividadeProfissional | null;
}

const CORES_TIPO: Record<string, string> = {
  acolhimento: '#0ea5e9', orientacao: '#22c55e', acompanhamento: '#f59e0b',
  encaminhamento: '#ef4444', avaliacao_psicossocial: '#8b5cf6',
  atendimento_crise: '#ec4899', outros: '#64748b',
};

function computeKPIs(atendimentos: any[], oneMonthAgo: string): AssistenciaSocialKPIs {
  const tiposMap = new Map<string, number>();
  atendimentos.forEach(a => { const t = a.tipo_atendimento || 'outros'; tiposMap.set(t, (tiposMap.get(t) || 0) + 1); });
  const totalTipos = Array.from(tiposMap.values()).reduce((a, b) => a + b, 0);
  const tiposAtendimento = Array.from(tiposMap.entries())
    .map(([tipo, count]) => ({ name: tipo.charAt(0).toUpperCase() + tipo.slice(1).replace(/_/g, ' '), value: Math.round((count / totalTipos) * 100), color: CORES_TIPO[tipo] || CORES_TIPO['outros'] }))
    .sort((a, b) => b.value - a.value).slice(0, 4);

  const localAtendimento = Array.from(tiposMap.entries())
    .map(([tipo, demanda]) => ({ local: tipo.charAt(0).toUpperCase() + tipo.slice(1).replace(/_/g, ' '), demanda }))
    .sort((a, b) => b.demanda - a.demanda).slice(0, 5);

  const profMap = new Map<string, number>();
  atendimentos.filter(a => new Date(a.data_atendimento) >= new Date(oneMonthAgo))
    .forEach(a => { const p = a.profissional_nome || 'Não atribuído'; profMap.set(p, (profMap.get(p) || 0) + 1); });
  const meta = 50;
  const produtividadeProfissional = Array.from(profMap.entries())
    .map(([nome, n]) => ({ nome, atendimentos: n, meta, taxa: Math.round((n / meta) * 100) }))
    .sort((a, b) => b.atendimentos - a.atendimentos).slice(0, 4);

  const motivosMap = new Map<string, number>();
  atendimentos.forEach(a => { const m = a.motivo || 'Sem especificação'; motivosMap.set(m, (motivosMap.get(m) || 0) + 1); });
  const totalMotivos = Array.from(motivosMap.values()).reduce((a, b) => a + b, 0);
  const motivosMais = Array.from(motivosMap.entries())
    .map(([motivo, freq]) => ({ motivo, frequencia: freq, percentual: Math.round((freq / totalMotivos) * 100) }))
    .sort((a, b) => b.frequencia - a.frequencia).slice(0, 6);

  const evolucaoMap = new Map<string, { total: number; acolhimento: number; orientacao: number; acompanhamento: number; encaminhamento: number }>();
  for (let i = 5; i >= 0; i--) {
    const mes = format(subDays(new Date(), i * 30), 'MMM').toUpperCase();
    evolucaoMap.set(mes, { total: 0, acolhimento: 0, orientacao: 0, acompanhamento: 0, encaminhamento: 0 });
  }
  atendimentos.forEach(a => {
    const mes = format(new Date(a.data_atendimento), 'MMM').toUpperCase();
    if (evolucaoMap.has(mes)) {
      const s = evolucaoMap.get(mes)!;
      s.total++;
      const tipo = a.tipo_atendimento?.toLowerCase() || '';
      if (tipo === 'acolhimento') s.acolhimento++;
      else if (tipo === 'orientacao') s.orientacao++;
      else if (tipo === 'acompanhamento') s.acompanhamento++;
      else if (tipo === 'encaminhamento') s.encaminhamento++;
    }
  });
  const evolucaoMensal = Array.from(evolucaoMap.entries()).map(([mes, vals]) => ({ mes, ...vals }));

  return {
    tiposAtendimento, localAtendimento, produtividadeProfissional, motivosMais, evolucaoMensal,
    totalAtendimentos: atendimentos.length,
    mediaAtendimentos: Math.round(atendimentos.length / 3),
    profComMaisProdutividade: produtividadeProfissional[0] || null,
  };
}

export const useAssistenciaSocialKPIs = () => {
  const threeMonthsAgo = subDays(new Date(), 90).toISOString();
  const oneMonthAgo = subDays(new Date(), 30).toISOString();

  const { data: raw, isLoading: loading, error: queryError } = useQuery({
    queryKey: ['assistencia_social_kpis'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assistencia_social_atendimentos')
        .select('id, profissional_nome, tipo_atendimento, status, motivo, data_atendimento')
        .gte('data_atendimento', threeMonthsAgo)
        .order('data_atendimento', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const data = useMemo(() => {
    if (!raw) return null;
    return computeKPIs(raw, oneMonthAgo);
  }, [raw]);

  const error = queryError ? (queryError instanceof Error ? queryError.message : 'Erro ao buscar dados') : null;

  return { data, loading, error };
};
