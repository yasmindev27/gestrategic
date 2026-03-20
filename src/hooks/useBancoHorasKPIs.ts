import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';

export interface BancoHorasKPI {
  total_credito: number;
  total_debito: number;
  saldo_geral: number;
  media_por_colaborador: number;
  colaboradores_com_credito: number;
  colaboradores_com_debito: number;
  top_5_credito: Array<{ nome: string; horas: number }>;
  top_5_debito: Array<{ nome: string; horas: number }>;
  tendencia_mensal: Array<{ mes: string; credito: number; debito: number }>;
}

export const useBancoHorasKPIs = (periodoMeses: number = 3) => {
  return useQuery({
    queryKey: ['banco_horas_kpis', periodoMeses],
    queryFn: async (): Promise<BancoHorasKPI> => {
      const agora = new Date();
      const inicioMeses = startOfMonth(subMonths(agora, periodoMeses));

      // Busca TODOS os registros de banco_horas aprovados no período
      const { data: registros } = await supabase
        .from('banco_horas')
        .select('funcionario_nome, tipo, horas, data, status')
        .gte('data', inicioMeses.toISOString().split('T')[0])
        .eq('status', 'aprovado')
        .order('horas', { ascending: false });

      if (!registros || registros.length === 0) {
        return {
          total_credito: 0,
          total_debito: 0,
          saldo_geral: 0,
          media_por_colaborador: 0,
          colaboradores_com_credito: 0,
          colaboradores_com_debito: 0,
          top_5_credito: [],
          top_5_debito: [],
          tendencia_mensal: [],
        };
      }

      // Agregar por colaborador
      const porColaborador: Record<string, { credito: number; debito: number }> = {};
      let totalCredito = 0;
      let totalDebito = 0;

      registros.forEach((reg: any) => {
        const nome = reg.funcionario_nome || 'Desconhecido';
        const horas = Number(reg.horas) || 0;

        if (!porColaborador[nome]) {
          porColaborador[nome] = { credito: 0, debito: 0 };
        }

        if (reg.tipo === 'credito' || reg.tipo === 'CREDITO') {
          porColaborador[nome].credito += horas;
          totalCredito += horas;
        } else if (reg.tipo === 'debito' || reg.tipo === 'DEBITO') {
          porColaborador[nome].debito += horas;
          totalDebito += horas;
        }
      });

      // Top 5 Créditos
      const top5Credito = Object.entries(porColaborador)
        .map(([nome, val]) => ({ nome, horas: val.credito }))
        .filter(x => x.horas > 0)
        .sort((a, b) => b.horas - a.horas)
        .slice(0, 5);

      // Top 5 Débitos
      const top5Debito = Object.entries(porColaborador)
        .map(([nome, val]) => ({ nome, horas: val.debito }))
        .filter(x => x.horas > 0)
        .sort((a, b) => b.horas - a.horas)
        .slice(0, 5);

      // Contadores
      const comCredito = Object.values(porColaborador).filter(v => v.credito > 0).length;
      const comDebito = Object.values(porColaborador).filter(v => v.debito > 0).length;
      const totalColaboradores = Object.keys(porColaborador).length;
      const mediaPorColab = totalColaboradores > 0
        ? (totalCredito - totalDebito) / totalColaboradores
        : 0;

      // Tendência mensal
      const porMes: Record<string, { credito: number; debito: number }> = {};
      const MESES_ABREV: Record<number, string> = {
        0: 'Jan', 1: 'Fev', 2: 'Mar', 3: 'Abr', 4: 'Mai', 5: 'Jun',
        6: 'Jul', 7: 'Ago', 8: 'Set', 9: 'Out', 10: 'Nov', 11: 'Dez',
      };

      registros.forEach((reg: any) => {
        const dataReg = new Date(reg.data);
        const mesKey = MESES_ABREV[dataReg.getMonth()];
        if (!porMes[mesKey]) porMes[mesKey] = { credito: 0, debito: 0 };

        const horas = Number(reg.horas) || 0;
        if (reg.tipo === 'credito' || reg.tipo === 'CREDITO') {
          porMes[mesKey].credito += horas;
        } else if (reg.tipo === 'debito' || reg.tipo === 'DEBITO') {
          porMes[mesKey].debito += horas;
        }
      });

      const tendenciaLinear = Object.entries(porMes).map(([mes, val]) => ({
        mes,
        credito: Math.round(val.credito * 10) / 10,
        debito: Math.round(val.debito * 10) / 10,
      }));

      return {
        total_credito: Math.round(totalCredito * 100) / 100,
        total_debito: Math.round(totalDebito * 100) / 100,
        saldo_geral: Math.round((totalCredito - totalDebito) * 100) / 100,
        media_por_colaborador: Math.round(mediaPorColab * 100) / 100,
        colaboradores_com_credito: comCredito,
        colaboradores_com_debito: comDebito,
        top_5_credito: top5Credito.map(x => ({ ...x, horas: Math.round(x.horas * 100) / 100 })),
        top_5_debito: top5Debito.map(x => ({ ...x, horas: Math.round(x.horas * 100) / 100 })),
        tendencia_mensal: tendenciaLinear,
      };
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });
};
