import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProfissionalLookup {
  id: string;
  nome: string;
  tipo: string;
  registro_profissional: string | null;
  especialidade: string | null;
  status: string;
}

/**
 * Hook centralizado para consultar profissionais de saúde.
 * Fonte única de verdade para todos os módulos que precisam de médicos/enfermeiros.
 * 
 * @param tipo - Filtrar por tipo: 'medico', 'enfermeiro', 'tecnico_enfermagem', ou undefined para todos
 * @param apenasAtivos - Se true (default), retorna apenas ativos
 */
export function useProfissionais(tipo?: string, apenasAtivos = true) {
  return useQuery({
    queryKey: ['profissionais_lookup', tipo, apenasAtivos],
    queryFn: async () => {
      let query = supabase
        .from('profissionais_saude')
        .select('id, nome, tipo, registro_profissional, especialidade, status')
        .order('nome');

      if (tipo) query = query.eq('tipo', tipo);
      if (apenasAtivos) query = query.eq('status', 'ativo');

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as ProfissionalLookup[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para buscar cargos do banco de dados.
 */
export function useCargos(includeInactive = false) {
  return useQuery({
    queryKey: ['cargos_lookup', includeInactive],
    queryFn: async () => {
      let query = supabase
        .from('cargos')
        .select('id, nome')
        .order('nome');
      
      if (!includeInactive) {
        query = query.eq('ativo', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para buscar colaboradores do perfil (profiles) para lookups em formulários.
 */
export function useColaboradores() {
  return useQuery({
    queryKey: ['colaboradores_lookup'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, cargo, setor')
        .order('full_name');
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
}
