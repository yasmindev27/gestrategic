import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type TipoProtocolo = 'dor_toracica' | 'sepse_adulto' | 'sepse_pediatrico';

export function useProtocoloAtendimentos(tipo: TipoProtocolo, competency?: string) {
  return useQuery({
    queryKey: ['protocolo_atendimentos', tipo, competency],
    queryFn: async () => {
      let query = supabase
        .from('protocolo_atendimentos')
        .select('*')
        .eq('tipo_protocolo', tipo)
        .order('created_at', { ascending: false });
      if (competency) query = query.eq('competency', competency);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
}

export function useProtocoloAtendimento(id: string) {
  return useQuery({
    queryKey: ['protocolo_atendimento', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('protocolo_atendimentos')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateProtocoloAtendimento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Record<string, any>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');
      const row = { ...input, created_by: user.id };
      const { data, error } = await supabase
        .from('protocolo_atendimentos')
        .insert(row as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['protocolo_atendimentos', data.tipo_protocolo] });
    },
  });
}

export function useDeleteProtocoloAtendimento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('protocolo_atendimentos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['protocolo_atendimentos'] });
    },
  });
}

export function useProtocoloSettings(tipo: TipoProtocolo) {
  return useQuery({
    queryKey: ['protocolo_settings', tipo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('protocolo_settings')
        .select('*')
        .eq('tipo_protocolo', tipo)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useProtocoloStats(tipo: TipoProtocolo, competency: string) {
  return useQuery({
    queryKey: ['protocolo_stats', tipo, competency],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('protocolo_atendimentos')
        .select('*')
        .eq('tipo_protocolo', tipo)
        .eq('competency', competency);
      if (error) throw error;
      const atts = data || [];
      const total = atts.length;
      const wt = atts.filter((a: any) => a.within_target).length;
      const times = atts.map((a: any) => a.porta_ecg_minutes || 0).sort((a: number, b: number) => a - b);
      const avg = total > 0 ? times.reduce((a: number, b: number) => a + b, 0) / total : 0;
      return {
        total,
        withinTarget: wt,
        percentWithinTarget: total > 0 ? (wt / total) * 100 : 0,
        average: Math.round(avg * 10) / 10,
      };
    },
    enabled: !!competency,
  });
}
