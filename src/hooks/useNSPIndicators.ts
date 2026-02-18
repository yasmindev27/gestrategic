import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { IndicatorData, ActionPlan, MESES } from '@/types/indicators';

export const useNSPIndicators = () => {
  const [indicators, setIndicators] = useState<IndicatorData[]>([]);
  const [actionPlans, setActionPlans] = useState<ActionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>(MESES[new Date().getMonth()]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const fetchIndicators = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('nsp_indicators')
        .select('*')
        .order('categoria')
        .order('indicador');
      if (error) throw error;
      setIndicators((data as any[]) || []);
    } catch (error) {
      console.error('Error fetching NSP indicators:', error);
      toast.error('Erro ao carregar indicadores');
    }
  }, []);

  const fetchActionPlans = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('nsp_action_plans')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setActionPlans((data as any[]) || []);
    } catch (error) {
      console.error('Error fetching NSP action plans:', error);
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

  const saveIndicator = async (indicatorData: Partial<IndicatorData> & { mes: string; ano: number; categoria: string; indicador: string }) => {
    try {
      const existing = indicators.find(
        i => i.mes === indicatorData.mes && i.ano === indicatorData.ano && i.categoria === indicatorData.categoria && i.indicador === indicatorData.indicador
      );

      if (existing) {
        const { error } = await supabase
          .from('nsp_indicators')
          .update({ valor_numero: indicatorData.valor_numero, valor_percentual: indicatorData.valor_percentual, meta: indicatorData.meta })
          .eq('id', existing.id);
        if (error) throw error;
        toast.success('Indicador atualizado!');
      } else {
        const { error } = await supabase.from('nsp_indicators').insert([{
          mes: indicatorData.mes, ano: indicatorData.ano, categoria: indicatorData.categoria,
          indicador: indicatorData.indicador, subcategoria: indicatorData.subcategoria,
          valor_numero: indicatorData.valor_numero, valor_percentual: indicatorData.valor_percentual,
          meta: indicatorData.meta, unidade_medida: indicatorData.unidade_medida || 'Nº',
        }]);
        if (error) throw error;
        toast.success('Indicador salvo!');
      }
      await fetchIndicators();
    } catch (error) {
      console.error('Error saving NSP indicator:', error);
      toast.error('Erro ao salvar indicador');
    }
  };

  const createActionPlan = async (planData: Omit<ActionPlan, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { error } = await supabase.from('nsp_action_plans').insert([planData]);
      if (error) throw error;
      toast.success('Plano de ação criado!');
      await fetchActionPlans();
    } catch (error) {
      toast.error('Erro ao criar plano de ação');
    }
  };

  const updateActionPlan = async (id: string, updates: Partial<ActionPlan>) => {
    try {
      const { error } = await supabase.from('nsp_action_plans').update(updates).eq('id', id);
      if (error) throw error;
      toast.success('Plano de ação atualizado!');
      await fetchActionPlans();
    } catch (error) {
      toast.error('Erro ao atualizar plano de ação');
    }
  };

  const deleteActionPlan = async (id: string) => {
    try {
      const { error } = await supabase.from('nsp_action_plans').delete().eq('id', id);
      if (error) throw error;
      toast.success('Plano de ação excluído!');
      await fetchActionPlans();
    } catch (error) {
      toast.error('Erro ao excluir plano de ação');
    }
  };

  const calculateStats = useMemo(() => {
    const totalInternacoes = filteredIndicators.find(i => i.indicador === 'Número de Internações')?.valor_numero || 0;
    const taxaOcupacao = filteredIndicators.find(i => i.indicador === 'Taxa de Ocupação')?.valor_numero || 0;
    const taxaMortalidade = filteredIndicators.find(i => i.indicador === 'Taxa de Mortalidade')?.valor_numero || 0;
    const protocolosSepse = filteredIndicators.find(i => i.categoria === 'Protocolo de Sepse' && i.indicador === 'Total de Protocolos Abertos')?.valor_numero || 0;

    const alertas = filteredIndicators.filter(ind => {
      if (ind.meta === null || ind.valor_numero === null) return false;
      if (ind.meta === 0) return ind.valor_numero > 0;
      return ind.valor_numero > ind.meta;
    });

    return {
      totalInternacoes: Number(totalInternacoes),
      taxaOcupacao: Number(taxaOcupacao),
      taxaMortalidade: Number(taxaMortalidade),
      protocolosSepse: Number(protocolosSepse),
      alertas, alertasCount: alertas.length,
    };
  }, [filteredIndicators]);

  return {
    indicators, actionPlans, loading, selectedMonth, selectedYear,
    setSelectedMonth, setSelectedYear, filteredIndicators, saveIndicator,
    createActionPlan, updateActionPlan, deleteActionPlan, calculateStats,
    refetch: fetchIndicators,
  };
};
