import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const MESES_ORDEM: Record<string, number> = {
  JANEIRO: 1, FEVEREIRO: 2, 'MARÇO': 3, ABRIL: 4, MAIO: 5, JUNHO: 6,
  JULHO: 7, AGOSTO: 8, SETEMBRO: 9, OUTUBRO: 10, NOVEMBRO: 11, DEZEMBRO: 12,
};

const MESES_CURTO: Record<string, string> = {
  JANEIRO: 'Jan', FEVEREIRO: 'Fev', 'MARÇO': 'Mar', ABRIL: 'Abr', MAIO: 'Mai', JUNHO: 'Jun',
  JULHO: 'Jul', AGOSTO: 'Ago', SETEMBRO: 'Set', OUTUBRO: 'Out', NOVEMBRO: 'Nov', DEZEMBRO: 'Dez',
};

export const useTendenciaFinanceira = () => {
  return useQuery({
    queryKey: ['bi_tendencia_financeira'],
    queryFn: async () => {
      const { data: notas } = await supabase
        .from('gerencia_notas_fiscais')
        .select('competencia, ano, valor_nota, status_pagamento');

      if (!notas?.length) return [];

      const agrupado: Record<string, { receita: number; pago: number }> = {};
      notas.forEach((n: any) => {
        const key = `${n.competencia}-${n.ano}`;
        if (!agrupado[key]) agrupado[key] = { receita: 0, pago: 0 };
        agrupado[key].receita += Number(n.valor_nota) || 0;
        if (n.status_pagamento === 'PAGA TOTALMENTE') {
          agrupado[key].pago += Number(n.valor_nota) || 0;
        }
      });

      return Object.entries(agrupado)
        .map(([key, val]) => {
          const [comp, ano] = key.split('-');
          return {
            mes: MESES_CURTO[comp] || comp.slice(0, 3),
            competencia: comp,
            ano: Number(ano),
            ordem: (Number(ano) * 100) + (MESES_ORDEM[comp] || 0),
            receita: val.receita,
            pago: val.pago,
          };
        })
        .sort((a, b) => a.ordem - b.ordem);
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useTendenciaOcupacao = (dias: number = 14) => {
  return useQuery({
    queryKey: ['bi_tendencia_ocupacao', dias],
    queryFn: async () => {
      const dataInicio = format(subDays(new Date(), dias), 'yyyy-MM-dd');

      const { data: records } = await supabase
        .from('bed_records')
        .select('shift_date, bed_number, sector, patient_name, motivo_alta, data_alta')
        .gte('shift_date', dataInicio)
        .order('shift_date');

      if (!records?.length) return [];

      const porDia: Record<string, { total: Set<string>; ocupados: Set<string> }> = {};

      records.forEach((r: any) => {
        const d = r.shift_date;
        if (!porDia[d]) porDia[d] = { total: new Set(), ocupados: new Set() };
        const bedKey = `${r.sector}-${r.bed_number}`;
        porDia[d].total.add(bedKey);
        if (r.patient_name?.trim() && !r.motivo_alta && !r.data_alta) {
          porDia[d].ocupados.add(bedKey);
        }
      });

      return Object.entries(porDia)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([data, val]) => ({
          data,
          label: format(new Date(data + 'T12:00:00'), 'dd/MM', { locale: ptBR }),
          total: val.total.size,
          ocupados: val.ocupados.size,
          taxa: val.total.size > 0 ? Math.round((val.ocupados.size / val.total.size) * 100) : 0,
        }));
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useTendenciaIncidentes = () => {
  return useQuery({
    queryKey: ['bi_tendencia_incidentes'],
    queryFn: async () => {
      const { data: incidentes } = await supabase
        .from('incidentes_nsp')
        .select('created_at, status, classificacao_risco');

      if (!incidentes?.length) return [];

      const porMes: Record<string, { total: number; encerrados: number; graves: number }> = {};

      incidentes.forEach((i: any) => {
        const d = new Date(i.created_at);
        const key = format(d, 'yyyy-MM');
        if (!porMes[key]) porMes[key] = { total: 0, encerrados: 0, graves: 0 };
        porMes[key].total++;
        if (i.status === 'encerrado') porMes[key].encerrados++;
        if (i.classificacao_risco?.toLowerCase().includes('grave') || i.classificacao_risco?.toLowerCase().includes('adverso')) {
          porMes[key].graves++;
        }
      });

      return Object.entries(porMes)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, val]) => ({
          mes: format(new Date(key + '-01'), 'MMM/yy', { locale: ptBR }),
          total: val.total,
          encerrados: val.encerrados,
          graves: val.graves,
        }));
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useTendenciaDRE = () => {
  return useQuery({
    queryKey: ['bi_tendencia_dre'],
    queryFn: async () => {
      const { data: entries } = await supabase
        .from('gerencia_dre_entries' as any)
        .select('rubrica, categoria_pai, mes, ano, valor_realizado, valor_previsto');

      if (!entries?.length) return [];

      // Only top-level categories (categoria_pai IS NULL = summary rows)
      const resumo: Record<string, { realizado: number; previsto: number }> = {};

      (entries as any[]).forEach((e) => {
        if (e.categoria_pai) return; // skip sub-items
        const key = `${e.mes}-${e.ano}`;
        if (!resumo[key]) resumo[key] = { realizado: 0, previsto: 0 };
        resumo[key].realizado += Number(e.valor_realizado) || 0;
        resumo[key].previsto += Number(e.valor_previsto) || 0;
      });

      return Object.entries(resumo)
        .map(([key, val]) => {
          const [comp, ano] = key.split('-');
          return {
            mes: MESES_CURTO[comp] || comp.slice(0, 3),
            ordem: (Number(ano) * 100) + (MESES_ORDEM[comp] || 0),
            realizado: val.realizado,
            previsto: val.previsto,
          };
        })
        .sort((a, b) => a.ordem - b.ordem);
    },
    staleTime: 5 * 60 * 1000,
  });
};
