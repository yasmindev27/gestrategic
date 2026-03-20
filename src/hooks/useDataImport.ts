import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Supplier {
  id: string;
  nome: string;
  cnpj: string;
  ativo: boolean;
  created_at: string;
  updated_at?: string;
}

interface Invoice {
  id: string;
  fornecedor_id: string;
  fornecedor_nome: string;
  cnpj: string;
  competencia: string;
  numero_nf: string;
  data_recebimento: string;
  status: string;
  data_envio?: string | null;
  status_pagamento: string;
  valor_nota: number;
  ano: number;
  created_at: string;
  updated_at?: string;
}

interface DREEntry {
  id: string;
  rubrica: string;
  categoria_pai?: string | null;
  mes: string;
  ano: number;
  valor_realizado: number;
  valor_previsto: number;
  created_at: string;
  updated_at?: string;
}

export const useDataImport = () => {
  const { toast } = useToast();

  const importSuppliers = useCallback(async (data: Supplier[]) => {
    try {
      const { error, count } = await supabase
        .from('gerencia_fornecedores')
        .upsert(
          data.map(d => ({
            ...d,
            updated_at: new Date().toISOString(),
          })),
          { onConflict: 'id' }
        );

      if (error) throw error;
      return { success: true, count, message: `${count} fornecedores importados` };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao importar fornecedores';
      console.error('Erro ao importar fornecedores:', error);
      return { success: false, count: 0, message };
    }
  }, []);

  const importInvoices = useCallback(async (data: Invoice[]) => {
    try {
      const { error, count } = await supabase
        .from('gerencia_notas_fiscais')
        .upsert(
          data.map(d => ({
            ...d,
            updated_at: new Date().toISOString(),
          })),
          { onConflict: 'id' }
        );

      if (error) throw error;
      return { success: true, count, message: `${count} notas fiscais importadas` };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao importar notas fiscais';
      console.error('Erro ao importar notas fiscais:', error);
      return { success: false, count: 0, message };
    }
  }, []);

  const importDREEntries = useCallback(async (data: DREEntry[]) => {
    try {
      const { error, count } = await (supabase
        .from('gerencia_dre_entries' as any)
        .upsert(
          data.map(d => ({
            ...d,
            updated_at: new Date().toISOString(),
          })),
          { onConflict: 'id' }
        ) as any);

      if (error) throw error;
      return { success: true, count: data.length, message: `${data.length} lançamentos DRE importados` };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao importar DRE';
      console.error('Erro ao importar DRE:', error);
      return { success: false, count: 0, message };
    }
  }, []);

  const getSuppliers = useCallback(async (filters?: { ativo?: boolean }) => {
    try {
      let query = supabase.from('gerencia_fornecedores').select('*');
      
      if (filters?.ativo !== undefined) {
        query = query.eq('ativo', filters.ativo);
      }
      
      query = query.order('nome');
      const { data, error } = await query;
      
      if (error) throw error;
      return { success: true, data, count: data?.length || 0 };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao buscar fornecedores';
      console.error('Erro ao buscar fornecedores:', error);
      return { success: false, data: [], count: 0, message };
    }
  }, []);

  const getInvoices = useCallback(async (filters?: { 
    competencia?: string;
    status_pagamento?: string;
    ano?: number;
  }) => {
    try {
      let query = supabase.from('gerencia_notas_fiscais').select('*');
      
      if (filters?.competencia) {
        query = query.eq('competencia', filters.competencia);
      }
      if (filters?.status_pagamento) {
        query = query.eq('status_pagamento', filters.status_pagamento);
      }
      if (filters?.ano) {
        query = query.eq('ano', filters.ano);
      }
      
      query = query.order('data_recebimento', { ascending: false });
      const { data, error } = await query;
      
      if (error) throw error;
      return { success: true, data, count: data?.length || 0 };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao buscar notas fiscais';
      console.error('Erro ao buscar notas fiscais:', error);
      return { success: false, data: [], count: 0, message };
    }
  }, []);

  const getDREEntries = useCallback(async (filters?: {
    rubrica?: string;
    mes?: string;
    ano?: number;
  }) => {
    try {
      let query = (supabase.from('gerencia_dre_entries' as any).select('*') as any);
      
      if (filters?.rubrica) {
        query = query.eq('rubrica', filters.rubrica);
      }
      if (filters?.mes) {
        query = query.eq('mes', filters.mes);
      }
      if (filters?.ano) {
        query = query.eq('ano', filters.ano);
      }
      
      query = query.order('created_at', { ascending: false });
      const { data, error } = await query;
      
      if (error) throw error;
      return { success: true, data, count: data?.length || 0 };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao buscar entradas DRE';
      console.error('Erro ao buscar entradas DRE:', error);
      return { success: false, data: [], count: 0, message };
    }
  }, []);

  return {
    importSuppliers,
    importInvoices,
    importDREEntries,
    getSuppliers,
    getInvoices,
    getDREEntries,
  };
};
