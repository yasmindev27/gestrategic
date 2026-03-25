import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

export function useAltasInternacoesNIR(periodoMeses: number = 3) {
  return useQuery({
    queryKey: ['altas_internacoes_nir', periodoMeses],
    queryFn: async () => {
      const agora = new Date();
      const inicioPeriodo = startOfMonth(subMonths(agora, periodoMeses - 1));
      const fimPeriodo = endOfMonth(agora);

      // Altas
      const { count: totalAltas } = await supabase
        .from('bed_records')
        .select('id', { count: 'exact', head: true })
        .not('data_alta', 'is', null)
        .gte('data_alta', format(inicioPeriodo, 'yyyy-MM-dd'))
        .lte('data_alta', format(fimPeriodo, 'yyyy-MM-dd'));

      // Internações
      const { count: totalInternacoes } = await supabase
        .from('bed_records')
        .select('id', { count: 'exact', head: true })
        .not('data_internacao', 'is', null)
        .gte('data_internacao', format(inicioPeriodo, 'yyyy-MM-dd'))
        .lte('data_internacao', format(fimPeriodo, 'yyyy-MM-dd'));

      return {
        totalAltas: totalAltas || 0,
        totalInternacoes: totalInternacoes || 0,
      };
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });
}
