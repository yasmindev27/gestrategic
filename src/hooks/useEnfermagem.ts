import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Escala, Troca, Configuracao } from '@/components/enfermagem/types';

export function useEscalas(mes?: number, ano?: number) {
  return useQuery({
    queryKey: ['enfermagem-escalas', mes, ano],
    queryFn: async () => {
      let query = supabase
        .from('enfermagem_escalas')
        .select('*')
        .order('data_plantao', { ascending: true });

      if (mes !== undefined && ano !== undefined) {
        const startDate = new Date(ano, mes, 1).toISOString().split('T')[0];
        const endDate = new Date(ano, mes + 1, 0).toISOString().split('T')[0];
        query = query.gte('data_plantao', startDate).lte('data_plantao', endDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Escala[];
    },
  });
}

export function useMinhasEscalas(userId?: string) {
  return useQuery({
    queryKey: ['minhas-escalas', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('enfermagem_escalas')
        .select('*')
        .eq('profissional_id', userId)
        .gte('data_plantao', new Date().toISOString().split('T')[0])
        .order('data_plantao', { ascending: true });

      if (error) throw error;
      return data as Escala[];
    },
    enabled: !!userId,
  });
}

export function useTrocasDisponiveis() {
  return useQuery({
    queryKey: ['trocas-disponiveis'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enfermagem_trocas')
        .select(`
          *,
          escala:enfermagem_escalas(*)
        `)
        .eq('status', 'aberta')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as (Troca & { escala: Escala })[];
    },
  });
}

export function useMinhasTrocas(userId?: string) {
  return useQuery({
    queryKey: ['minhas-trocas', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('enfermagem_trocas')
        .select(`
          *,
          escala:enfermagem_escalas(*)
        `)
        .or(`ofertante_id.eq.${userId},aceitante_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as (Troca & { escala: Escala })[];
    },
    enabled: !!userId,
  });
}

export function useTrocasPendentes() {
  return useQuery({
    queryKey: ['trocas-pendentes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enfermagem_trocas')
        .select(`
          *,
          escala:enfermagem_escalas(*)
        `)
        .eq('status', 'pendente_aprovacao')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as (Troca & { escala: Escala })[];
    },
  });
}

export function useConfiguracoes() {
  return useQuery({
    queryKey: ['enfermagem-configuracoes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enfermagem_configuracoes')
        .select('*');

      if (error) throw error;
      return data as Configuracao[];
    },
  });
}

export function useCriarEscala() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (escala: Omit<Escala, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('enfermagem_escalas')
        .insert(escala)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enfermagem-escalas'] });
      queryClient.invalidateQueries({ queryKey: ['minhas-escalas'] });
      toast({ title: 'Escala criada com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar escala', description: error.message, variant: 'destructive' });
    },
  });
}

export function useOfertarTroca() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      escalaId,
      ofertanteId,
      ofertanteNome,
      motivo,
      requerAprovacao,
    }: {
      escalaId: string;
      ofertanteId: string;
      ofertanteNome: string;
      motivo?: string;
      requerAprovacao: boolean;
    }) => {
      // Atualizar status da escala
      await supabase
        .from('enfermagem_escalas')
        .update({ status: 'disponivel_troca' })
        .eq('id', escalaId);

      // Criar oferta de troca
      const { data, error } = await supabase
        .from('enfermagem_trocas')
        .insert({
          escala_id: escalaId,
          ofertante_id: ofertanteId,
          ofertante_nome: ofertanteNome,
          motivo_oferta: motivo,
          requer_aprovacao: requerAprovacao,
          status: 'aberta',
        })
        .select()
        .single();

      if (error) throw error;

      // Registrar histórico
      await supabase.from('enfermagem_trocas_historico').insert({
        troca_id: data.id,
        acao: 'Plantão ofertado para troca',
        executado_por: ofertanteId,
        executado_por_nome: ofertanteNome,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enfermagem-escalas'] });
      queryClient.invalidateQueries({ queryKey: ['minhas-escalas'] });
      queryClient.invalidateQueries({ queryKey: ['trocas-disponiveis'] });
      queryClient.invalidateQueries({ queryKey: ['minhas-trocas'] });
      toast({ title: 'Plantão disponibilizado para troca!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao ofertar troca', description: error.message, variant: 'destructive' });
    },
  });
}

export function useAceitarTroca() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      trocaId,
      aceitanteId,
      aceitanteNome,
      requerAprovacao,
    }: {
      trocaId: string;
      aceitanteId: string;
      aceitanteNome: string;
      requerAprovacao: boolean;
    }) => {
      const novoStatus = requerAprovacao ? 'pendente_aprovacao' : 'aprovada';

      const { data, error } = await supabase
        .from('enfermagem_trocas')
        .update({
          aceitante_id: aceitanteId,
          aceitante_nome: aceitanteNome,
          status: novoStatus,
        })
        .eq('id', trocaId)
        .select(`*, escala:enfermagem_escalas(*)`)
        .single();

      if (error) throw error;

      // Atualizar status da escala
      await supabase
        .from('enfermagem_escalas')
        .update({ status: 'em_negociacao' })
        .eq('id', data.escala_id);

      // Registrar histórico
      await supabase.from('enfermagem_trocas_historico').insert({
        troca_id: trocaId,
        acao: requerAprovacao ? 'Troca aceita - aguardando aprovação' : 'Troca aceita e aprovada automaticamente',
        executado_por: aceitanteId,
        executado_por_nome: aceitanteNome,
      });

      // Se não requer aprovação, efetivar a troca
      if (!requerAprovacao && data.escala) {
        await supabase
          .from('enfermagem_escalas')
          .update({
            profissional_id: aceitanteId,
            profissional_nome: aceitanteNome,
            status: 'trocado',
          })
          .eq('id', data.escala_id);
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['enfermagem-escalas'] });
      queryClient.invalidateQueries({ queryKey: ['minhas-escalas'] });
      queryClient.invalidateQueries({ queryKey: ['trocas-disponiveis'] });
      queryClient.invalidateQueries({ queryKey: ['minhas-trocas'] });
      queryClient.invalidateQueries({ queryKey: ['trocas-pendentes'] });
      
      const msg = data.status === 'pendente_aprovacao' 
        ? 'Troca aceita! Aguardando aprovação do gestor.'
        : 'Troca realizada com sucesso!';
      toast({ title: msg });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao aceitar troca', description: error.message, variant: 'destructive' });
    },
  });
}

export function useAprovarTroca() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      trocaId,
      aprovadorId,
      aprovadorNome,
      aprovado,
      justificativa,
    }: {
      trocaId: string;
      aprovadorId: string;
      aprovadorNome: string;
      aprovado: boolean;
      justificativa?: string;
    }) => {
      const { data, error } = await supabase
        .from('enfermagem_trocas')
        .update({
          status: aprovado ? 'aprovada' : 'rejeitada',
          aprovador_id: aprovadorId,
          aprovador_nome: aprovadorNome,
          data_aprovacao: new Date().toISOString(),
          justificativa_rejeicao: justificativa,
        })
        .eq('id', trocaId)
        .select(`*, escala:enfermagem_escalas(*)`)
        .single();

      if (error) throw error;

      // Registrar histórico
      await supabase.from('enfermagem_trocas_historico').insert({
        troca_id: trocaId,
        acao: aprovado ? 'Troca aprovada pelo gestor' : 'Troca rejeitada pelo gestor',
        executado_por: aprovadorId,
        executado_por_nome: aprovadorNome,
        detalhes: justificativa ? { justificativa } : null,
      });

      if (aprovado && data.aceitante_id && data.aceitante_nome) {
        // Efetivar a troca
        await supabase
          .from('enfermagem_escalas')
          .update({
            profissional_id: data.aceitante_id,
            profissional_nome: data.aceitante_nome,
            status: 'trocado',
          })
          .eq('id', data.escala_id);
      } else if (!aprovado) {
        // Voltar escala ao status original
        await supabase
          .from('enfermagem_escalas')
          .update({ status: 'confirmado' })
          .eq('id', data.escala_id);
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['enfermagem-escalas'] });
      queryClient.invalidateQueries({ queryKey: ['minhas-escalas'] });
      queryClient.invalidateQueries({ queryKey: ['trocas-disponiveis'] });
      queryClient.invalidateQueries({ queryKey: ['minhas-trocas'] });
      queryClient.invalidateQueries({ queryKey: ['trocas-pendentes'] });
      
      toast({ title: variables.aprovado ? 'Troca aprovada!' : 'Troca rejeitada.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao processar aprovação', description: error.message, variant: 'destructive' });
    },
  });
}

export function useCancelarTroca() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      trocaId,
      escalaId,
      userId,
      userName,
    }: {
      trocaId: string;
      escalaId: string;
      userId: string;
      userName: string;
    }) => {
      const { error } = await supabase
        .from('enfermagem_trocas')
        .update({ status: 'cancelada' })
        .eq('id', trocaId);

      if (error) throw error;

      // Voltar escala ao status confirmado
      await supabase
        .from('enfermagem_escalas')
        .update({ status: 'confirmado' })
        .eq('id', escalaId);

      // Registrar histórico
      await supabase.from('enfermagem_trocas_historico').insert({
        troca_id: trocaId,
        acao: 'Oferta de troca cancelada',
        executado_por: userId,
        executado_por_nome: userName,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enfermagem-escalas'] });
      queryClient.invalidateQueries({ queryKey: ['minhas-escalas'] });
      queryClient.invalidateQueries({ queryKey: ['trocas-disponiveis'] });
      queryClient.invalidateQueries({ queryKey: ['minhas-trocas'] });
      toast({ title: 'Oferta de troca cancelada.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao cancelar troca', description: error.message, variant: 'destructive' });
    },
  });
}
