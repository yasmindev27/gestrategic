import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { IndicatorData, ActionPlan, MESES, UPA_CATEGORIAS } from '@/types/indicators';

export const useUPAIndicators = () => {
  const [indicators, setIndicators] = useState<IndicatorData[]>([]);
  const [actionPlans, setActionPlans] = useState<ActionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>(MESES[new Date().getMonth()]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const fetchIndicators = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('upa_indicators')
        .select('*')
        .order('categoria')
        .order('indicador');
      if (error) throw error;
      setIndicators((data as any[]) || []);
    } catch (error) {
      console.error('Error fetching UPA indicators:', error);
      toast.error('Erro ao carregar indicadores');
    }
  }, []);

  const fetchActionPlans = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('upa_action_plans')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setActionPlans((data as any[]) || []);
    } catch (error) {
      console.error('Error fetching UPA action plans:', error);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchIndicators(), fetchActionPlans()]);
      setLoading(false);
    };
    loadData();
  }, [fetchIndicators, fetchActionPlans]);

  const filteredIndicators = useMemo(() => {
    return indicators.filter(ind => ind.mes === selectedMonth && ind.ano === selectedYear);
  }, [indicators, selectedMonth, selectedYear]);

  const saveIndicator = async (indicator: Partial<IndicatorData> & { mes: string; ano: number; categoria: string; indicador: string }) => {
    try {
      const existing = indicators.find(
        i => i.mes === indicator.mes && i.ano === indicator.ano && i.categoria === indicator.categoria && i.indicador === indicator.indicador
      );

      if (existing) {
        const { error } = await supabase
          .from('upa_indicators')
          .update({ valor_numero: indicator.valor_numero, valor_percentual: indicator.valor_percentual, meta: indicator.meta })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('upa_indicators').insert([indicator]);
        if (error) throw error;
      }
      await fetchIndicators();
      toast.success('Indicador salvo!');
    } catch (error) {
      console.error('Error saving indicator:', error);
      toast.error('Erro ao salvar indicador');
    }
  };

  const createActionPlan = async (plan: Omit<ActionPlan, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { error } = await supabase.from('upa_action_plans').insert([plan]);
      if (error) throw error;
      await fetchActionPlans();
      toast.success('Plano de ação criado!');
    } catch (error) {
      toast.error('Erro ao criar plano de ação');
    }
  };

  const updateActionPlan = async (id: string, updates: Partial<ActionPlan>) => {
    try {
      const { error } = await supabase.from('upa_action_plans').update(updates).eq('id', id);
      if (error) throw error;
      await fetchActionPlans();
      toast.success('Plano de ação atualizado!');
    } catch (error) {
      toast.error('Erro ao atualizar plano de ação');
    }
  };

  const deleteActionPlan = async (id: string) => {
    try {
      const { error } = await supabase.from('upa_action_plans').delete().eq('id', id);
      if (error) throw error;
      await fetchActionPlans();
      toast.success('Plano de ação excluído!');
    } catch (error) {
      toast.error('Erro ao excluir plano de ação');
    }
  };

  const calculateStats = useMemo(() => {
    if (!filteredIndicators.length) {
      return { totalAtendimentos: 0, taxaMortalidade: 0, colaboradores: 0, alertasCount: 0, alertas: [] as IndicatorData[] };
    }
    const totalAtendimentos = filteredIndicators.find(i => i.indicador === 'Nº Total de Atendimentos')?.valor_numero ?? 0;
    const taxaMortalidade = filteredIndicators.find(i => i.indicador === 'Taxa de Mortalidade')?.valor_numero ?? 0;
    const colaboradores = filteredIndicators.find(i => i.indicador === 'Número de Colaboradores')?.valor_numero ?? 0;

    const alertas = filteredIndicators.filter(ind => {
      if (ind.meta === null || ind.valor_numero === null) return false;
      if (ind.categoria === UPA_CATEGORIAS.RESULTADO || ind.categoria === UPA_CATEGORIAS.GESTAO_PESSOAS) {
        return ind.meta === 0 ? ind.valor_numero > 0 : ind.valor_numero > ind.meta;
      }
      if (ind.meta === 0) return false;
      return Math.abs(((ind.valor_numero - ind.meta) / ind.meta) * 100) > 20;
    });

    return { totalAtendimentos: Number(totalAtendimentos), taxaMortalidade: Number(taxaMortalidade), colaboradores: Number(colaboradores), alertasCount: alertas.length, alertas };
  }, [filteredIndicators]);

  return {
    indicators, actionPlans, loading, selectedMonth, selectedYear,
    setSelectedMonth, setSelectedYear, filteredIndicators, saveIndicator,
    createActionPlan, updateActionPlan, deleteActionPlan, calculateStats,
    refetch: fetchIndicators,
  };
};
