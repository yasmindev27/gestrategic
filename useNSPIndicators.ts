import { useState, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { IndicatorData, ActionPlan, MESES } from '@/types/indicators';

export const useNSPIndicators = () => {
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState<string>(MESES[new Date().getMonth()]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const { data: indicators = [], isLoading: loadingIndicators } = useQuery({
    queryKey: ['nsp_indicators'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nsp_indicators')
        .select('*')
        .order('categoria')
        .order('indicador');
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  const { data: actionPlans = [], isLoading: loadingPlans } = useQuery({
    queryKey: ['nsp_action_plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nsp_action_plans')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  const loading = loadingIndicators || loadingPlans;

  const normalize = (str: string) => str?.toLocaleLowerCase('pt-BR').trim();

  const filteredIndicators = useMemo(() => {
    return indicators.filter(
      (ind: IndicatorData) => normalize(ind.mes) === normalize(selectedMonth) && ind.ano === selectedYear
    );
  }, [indicators, selectedMonth, selectedYear]);

  const saveIndicator = async (indicatorData: Partial<IndicatorData> & { mes: string; ano: number; categoria: string; indicador: string }) => {
    try {
      const existing = indicators.find(
        (i: IndicatorData) => i.mes === indicatorData.mes && i.ano === indicatorData.ano && i.categoria === indicatorData.categoria && i.indicador === indicatorData.indicador
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
      queryClient.invalidateQueries({ queryKey: ['nsp_indicators'] });
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
      queryClient.invalidateQueries({ queryKey: ['nsp_action_plans'] });
    } catch (error) {
      toast.error('Erro ao criar plano de ação');
    }
  };

  const updateActionPlan = async (id: string, updates: Partial<ActionPlan>) => {
    try {
      const { error } = await supabase.from('nsp_action_plans').update(updates).eq('id', id);
      if (error) throw error;
      toast.success('Plano de ação atualizado!');
      queryClient.invalidateQueries({ queryKey: ['nsp_action_plans'] });
    } catch (error) {
      toast.error('Erro ao atualizar plano de ação');
    }
  };

  const deleteActionPlan = async (id: string) => {
    try {
      const { error } = await supabase.from('nsp_action_plans').delete().eq('id', id);
      if (error) throw error;
      toast.success('Plano de ação excluído!');
      queryClient.invalidateQueries({ queryKey: ['nsp_action_plans'] });
    } catch (error) {
      toast.error('Erro ao excluir plano de ação');
    }
  };

  const calculateStats = useMemo(() => {
    const totalInternacoes = filteredIndicators.find((i: IndicatorData) => i.indicador === 'Número de Internações')?.valor_numero || 0;
    const taxaOcupacao = filteredIndicators.find((i: IndicatorData) => i.indicador === 'Taxa de Ocupação')?.valor_numero || 0;
    const mortalidadeAbsoluta = filteredIndicators.find((i: IndicatorData) => i.indicador === 'Taxa de Mortalidade')?.valor_numero || 0;
    const protocolosSepse = filteredIndicators.find((i: IndicatorData) => i.categoria === 'Protocolo de Sepse' && i.indicador === 'Total de Protocolos Abertos')?.valor_numero || 0;

    const numInternacoes = Number(totalInternacoes);
    const numMortalidade = Number(mortalidadeAbsoluta);
    const taxaMortalidadePct = numInternacoes > 0
      ? ((numMortalidade / numInternacoes) * 100).toFixed(2)
      : '0.00';

    const alertas = filteredIndicators.filter((ind: IndicatorData) => {
      if (ind.meta === null || ind.valor_numero === null) return false;
      if (ind.meta === 0) return ind.valor_numero > 0;
      return ind.valor_numero > ind.meta;
    });

    return {
      totalInternacoes: numInternacoes,
      taxaOcupacao: Number(taxaOcupacao),
      taxaMortalidade: taxaMortalidadePct,
      protocolosSepse: Number(protocolosSepse),
      alertas, alertasCount: alertas.length,
    };
  }, [filteredIndicators]);

  return {
    indicators, actionPlans, loading, selectedMonth, selectedYear,
    setSelectedMonth, setSelectedYear, filteredIndicators, saveIndicator,
    createActionPlan, updateActionPlan, deleteActionPlan, calculateStats,
    refetch: () => queryClient.invalidateQueries({ queryKey: ['nsp_indicators'] }),
  };
};
