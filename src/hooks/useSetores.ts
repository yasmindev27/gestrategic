import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook centralizado para consultar setores do banco de dados.
 * Substitui arrays hardcoded em todos os módulos.
 * 
 * @param includeInactive - Se true, retorna todos os setores (para admin)
 * @returns Lista de nomes de setores ativos
 */
export function useSetores(includeInactive = false) {
  return useQuery({
    queryKey: ['setores_lookup', includeInactive],
    queryFn: async () => {
      let query = supabase
        .from('setores')
        .select('id, nome')
        .order('nome');
      
      if (!includeInactive) {
        query = query.eq('ativo', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
  });
}

/**
 * Retorna apenas os nomes dos setores (conveniência)
 */
export function useSetoresNomes(includeInactive = false) {
  const query = useSetores(includeInactive);
  return {
    ...query,
    data: query.data?.map(s => s.nome) || [],
  };
}
