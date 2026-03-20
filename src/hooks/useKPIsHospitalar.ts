import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

export interface KPIData {
  valor_atual: number;
  valor_anterior: number;
  variacao_percentual: number;
  tendencia: 'crescente' | 'decrescente' | 'estavel';
  meta: number;
  percentual_meta: number;
  serie_temporal: Array<{ data: string; valor: number }>;
}

export interface MetricasOperacionais {
  ocupacao_leitos: KPIData;
  pacientes_ativos: KPIData;
  taxa_readmissao: KPIData;
  tempo_medio_internacao: number;
  taxa_mortalidade: KPIData;
  disponibilidade_leitos: KPIData;
  eficiencia_operacional: KPIData;
  satisfacao_paciente: KPIData;
}

export interface IndicadorFinanceiro {
  receita_realizadas: KPIData;
  custos_operacionais: KPIData;
  resultado_operacional: KPIData;
  margem_operacional: KPIData;
  faturamento_medio_paciente: KPIData;
  custos_por_leito: KPIData;
}

export interface IndicadorQualidade {
  taxa_conformidade: KPIData;
  incidentes_seguranca: KPIData;
  tempo_resposta_chamados: KPIData;
  processos_auditados: KPIData;
  correcoes_implementadas: KPIData;
  satisfacao_colaboradores: KPIData;
}

export interface IndicadorRH {
  absenteismo: KPIData;
  turnover: KPIData;
  capacitacoes_realizadas: KPIData;
  colaboradores_ativos: KPIData;
  idade_media_equipe: number;
  distribuicao_por_setor: Record<string, number>;
}

const calcularKPI = (
  valor_atual: number,
  valor_anterior: number,
  meta: number = 100
): KPIData => {
  const variacao_percentual = valor_anterior !== 0
    ? ((valor_atual - valor_anterior) / valor_anterior) * 100
    : 0;

  const tendencia = variacao_percentual > 2
    ? 'crescente'
    : variacao_percentual < -2
      ? 'decrescente'
      : 'estavel';

  const percentual_meta = meta !== 0 ? (valor_atual / meta) * 100 : 0;

  return {
    valor_atual,
    valor_anterior,
    variacao_percentual: Math.round(variacao_percentual * 100) / 100,
    tendencia,
    meta,
    percentual_meta: Math.round(percentual_meta * 100) / 100,
    serie_temporal: []
  };
};

const MESES_PT: Record<number, string> = {
  0: 'JANEIRO', 1: 'FEVEREIRO', 2: 'MARÇO', 3: 'ABRIL', 4: 'MAIO', 5: 'JUNHO',
  6: 'JULHO', 7: 'AGOSTO', 8: 'SETEMBRO', 9: 'OUTUBRO', 10: 'NOVEMBRO', 11: 'DEZEMBRO',
};

// Hook para KPIs Operacionais - dados reais do banco
export const useKPIsOperacionais = (periodoMeses: number = 3) => {
  return useQuery({
    queryKey: ['kpis_operacionais_real', periodoMeses],
    queryFn: async () => {
      const agora = new Date();
      const inicioMes = startOfMonth(agora);
      const inicioMesAnterior = startOfMonth(subMonths(agora, 1));
      const fimMesAnterior = endOfMonth(subMonths(agora, 1));

      // Pega o shift_date mais recente para ocupação atual
      const { data: ultimoShift } = await supabase
        .from('bed_records')
        .select('shift_date')
        .order('shift_date', { ascending: false })
        .limit(1);

      const dataUltimoShift = ultimoShift?.[0]?.shift_date;

      let totalLeitos = 0;
      let leitosOcupados = 0;

      if (dataUltimoShift) {
        // Busca APENAS registros do último turno
        const { data: leitosHoje } = await supabase
          .from('bed_records')
          .select('bed_number, sector, patient_name, motivo_alta, data_alta')
          .eq('shift_date', dataUltimoShift);

        // Deduplica por bed_number+sector
        const leitosUnicos = new Map<string, any>();
        (leitosHoje || []).forEach((l: any) => {
          const key = `${l.sector}-${l.bed_number}`;
          if (!leitosUnicos.has(key)) {
            leitosUnicos.set(key, l);
          }
        });

        totalLeitos = leitosUnicos.size;
        leitosOcupados = Array.from(leitosUnicos.values())
          .filter((l: any) => 
            l.patient_name?.trim() && 
            !l.motivo_alta?.trim() && 
            !l.data_alta?.trim()
          ).length;
      }

      // Mês anterior: busca o último shift_date do mês anterior
      const { data: shiftAnterior } = await supabase
        .from('bed_records')
        .select('shift_date')
        .lte('shift_date', format(fimMesAnterior, 'yyyy-MM-dd'))
        .gte('shift_date', format(inicioMesAnterior, 'yyyy-MM-dd'))
        .order('shift_date', { ascending: false })
        .limit(1);

      let leitosOcupadosAnterior = 0;
      let totalLeitosAnterior = totalLeitos;

      if (shiftAnterior?.[0]?.shift_date) {
        const { data: leitosAnterior } = await supabase
          .from('bed_records')
          .select('bed_number, sector, patient_name, motivo_alta, data_alta')
          .eq('shift_date', shiftAnterior[0].shift_date);

        const leitosUnicosAnt = new Map<string, any>();
        (leitosAnterior || []).forEach((l: any) => {
          const key = `${l.sector}-${l.bed_number}`;
          if (!leitosUnicosAnt.has(key)) leitosUnicosAnt.set(key, l);
        });

        totalLeitosAnterior = leitosUnicosAnt.size || totalLeitos;
        leitosOcupadosAnterior = Array.from(leitosUnicosAnt.values())
          .filter((l: any) => l.patient_name?.trim() && !l.motivo_alta?.trim() && !l.data_alta?.trim()).length;
      }

      // Incidentes de mortalidade
      const { count: mortalidadeMesAtual } = await supabase
        .from('incidentes_nsp')
        .select('id', { count: 'exact', head: true })
        .ilike('classificacao_risco', '%óbito%')
        .gte('created_at', inicioMes.toISOString());

      const { count: mortalidadeMesAnterior } = await supabase
        .from('incidentes_nsp')
        .select('id', { count: 'exact', head: true })
        .ilike('classificacao_risco', '%óbito%')
        .gte('created_at', inicioMesAnterior.toISOString())
        .lt('created_at', inicioMes.toISOString());

      // Tempo médio de internação
      const { data: internacoes } = await supabase
        .from('bed_records')
        .select('data_internacao, data_alta')
        .not('data_internacao', 'is', null)
        .not('data_alta', 'is', null)
        .gte('created_at', subMonths(agora, periodoMeses).toISOString())
        .limit(500);

      let tempoMedioInternacao = 0;
      if (internacoes && internacoes.length > 0) {
        const tempos = internacoes
          .filter((i: any) => i.data_internacao && i.data_alta)
          .map((i: any) => {
            const inicio = new Date(i.data_internacao);
            const fim = new Date(i.data_alta);
            return (fim.getTime() - inicio.getTime()) / (1000 * 60 * 60);
          })
          .filter((t: number) => t > 0 && t < 720);
        tempoMedioInternacao = tempos.length > 0
          ? tempos.reduce((a: number, b: number) => a + b, 0) / tempos.length : 0;
      }

      const taxaOcupacao = totalLeitos > 0 ? (leitosOcupados / totalLeitos) * 100 : 0;
      const taxaOcupacaoAnterior = totalLeitosAnterior > 0 ? (leitosOcupadosAnterior / totalLeitosAnterior) * 100 : 0;

      const taxaMortalidade = leitosOcupados > 0
        ? ((mortalidadeMesAtual || 0) / leitosOcupados) * 100 : 0;
      const taxaMortalidadeAnterior = leitosOcupadosAnterior > 0
        ? ((mortalidadeMesAnterior || 0) / leitosOcupadosAnterior) * 100 : 0;

      // Eficiência operacional via chamados
      const { count: chamadosTotalMes } = await supabase
        .from('chamados')
        .select('id', { count: 'exact', head: true })
        .gte('data_abertura', inicioMes.toISOString());

      const { count: chamadosResolvidosMes } = await supabase
        .from('chamados')
        .select('id', { count: 'exact', head: true })
        .gte('data_abertura', inicioMes.toISOString())
        .eq('status', 'resolvido');

      const { count: chamadosTotalAnterior } = await supabase
        .from('chamados')
        .select('id', { count: 'exact', head: true })
        .gte('data_abertura', inicioMesAnterior.toISOString())
        .lt('data_abertura', inicioMes.toISOString());

      const { count: chamadosResolvidosAnterior } = await supabase
        .from('chamados')
        .select('id', { count: 'exact', head: true })
        .gte('data_abertura', inicioMesAnterior.toISOString())
        .lt('data_abertura', inicioMes.toISOString())
        .eq('status', 'resolvido');

      const eficiencia = (chamadosTotalMes || 0) > 0
        ? ((chamadosResolvidosMes || 0) / (chamadosTotalMes || 1)) * 100 : 0;
      const eficienciaAnterior = (chamadosTotalAnterior || 0) > 0
        ? ((chamadosResolvidosAnterior || 0) / (chamadosTotalAnterior || 1)) * 100 : 0;

      return {
        ocupacao_leitos: calcularKPI(taxaOcupacao, taxaOcupacaoAnterior, 85),
        pacientes_ativos: calcularKPI(leitosOcupados, leitosOcupadosAnterior, totalLeitos),
        taxa_readmissao: calcularKPI(0, 0, 5),
        tempo_medio_internacao: Math.round(tempoMedioInternacao * 10) / 10,
        taxa_mortalidade: calcularKPI(taxaMortalidade, taxaMortalidadeAnterior, 3),
        disponibilidade_leitos: calcularKPI(
          totalLeitos - leitosOcupados,
          totalLeitosAnterior - leitosOcupadosAnterior,
          totalLeitos
        ),
        eficiencia_operacional: calcularKPI(eficiencia, eficienciaAnterior, 90),
        satisfacao_paciente: calcularKPI(0, 0, 5),
      } as MetricasOperacionais;
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });
};

// Hook para KPIs Financeiros - dados reais por competência
export const useKPIsFinanceiros = (periodoMeses: number = 3) => {
  return useQuery({
    queryKey: ['kpis_financeiros_real', periodoMeses],
    queryFn: async () => {
      const agora = new Date();
      const mesAtualNome = MESES_PT[agora.getMonth()];
      const anoAtual = agora.getFullYear();
      const mesAnterior = subMonths(agora, 1);
      const mesAnteriorNome = MESES_PT[mesAnterior.getMonth()];
      const anoAnterior = mesAnterior.getFullYear();

      // Receita por competência (campo real)
      const { data: notasMesAtual } = await supabase
        .from('gerencia_notas_fiscais')
        .select('valor_nota')
        .eq('competencia', mesAtualNome)
        .eq('ano', anoAtual);

      const receitaMesAtual = (notasMesAtual || [])
        .reduce((sum: number, n: any) => sum + (Number(n.valor_nota) || 0), 0);

      const { data: notasMesAnterior } = await supabase
        .from('gerencia_notas_fiscais')
        .select('valor_nota')
        .eq('competencia', mesAnteriorNome)
        .eq('ano', anoAnterior);

      const receitaMesAnterior = (notasMesAnterior || [])
        .reduce((sum: number, n: any) => sum + (Number(n.valor_nota) || 0), 0);

      // Se não há notas no mês atual, pegar o último mês com dados
      let receitaExibida = receitaMesAtual;
      let receitaAnteriorExibida = receitaMesAnterior;
      let mesExibido = mesAtualNome;

      if (receitaMesAtual === 0 && receitaMesAnterior === 0) {
        // Busca o mês mais recente com dados
        const { data: ultimaNota } = await supabase
          .from('gerencia_notas_fiscais')
          .select('competencia, ano, valor_nota')
          .order('ano', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(1);

        if (ultimaNota?.[0]) {
          const comp = ultimaNota[0].competencia;
          const ano = ultimaNota[0].ano;
          mesExibido = comp;

          const { data: notasUltimoMes } = await supabase
            .from('gerencia_notas_fiscais')
            .select('valor_nota')
            .eq('competencia', comp)
            .eq('ano', ano);

          receitaExibida = (notasUltimoMes || [])
            .reduce((sum: number, n: any) => sum + (Number(n.valor_nota) || 0), 0);
        }
      }

      // Custos via DRE
      let custosMesAtual = 0;
      try {
        const { data: dreMesAtual } = await (supabase
          .from('gerencia_dre_entries' as any)
          .select('valor_realizado')
          .eq('mes', mesExibido)
          .eq('ano', anoAtual) as any);

        custosMesAtual = (dreMesAtual || [])
          .reduce((sum: number, d: any) => sum + Math.abs(Number(d.valor_realizado) || 0), 0);
      } catch { /* tabela pode não existir */ }

      const resultado = receitaExibida - custosMesAtual;
      const resultadoAnterior = receitaAnteriorExibida;
      const margem = receitaExibida > 0 ? (resultado / receitaExibida) * 100 : 0;
      const margemAnterior = receitaAnteriorExibida > 0 ? (resultadoAnterior / receitaAnteriorExibida) * 100 : 0;

      // Pacientes para faturamento por paciente
      const { data: ultimoShift } = await supabase
        .from('bed_records')
        .select('shift_date')
        .order('shift_date', { ascending: false })
        .limit(1);

      let pacientesAtivos = 1;
      if (ultimoShift?.[0]?.shift_date) {
        const { count } = await supabase
          .from('bed_records')
          .select('id', { count: 'exact', head: true })
          .eq('shift_date', ultimoShift[0].shift_date)
          .not('patient_name', 'is', null)
          .neq('patient_name', '');
        pacientesAtivos = Math.max(count || 1, 1);
      }

      const faturamentoPorPaciente = receitaExibida / pacientesAtivos;

      return {
        receita_realizadas: calcularKPI(receitaExibida, receitaAnteriorExibida, receitaExibida * 1.1 || 1),
        custos_operacionais: calcularKPI(custosMesAtual, 0, custosMesAtual * 1.1 || 1),
        resultado_operacional: calcularKPI(resultado, resultadoAnterior, Math.abs(resultado) * 1.1 || 1),
        margem_operacional: calcularKPI(margem, margemAnterior, 20),
        faturamento_medio_paciente: calcularKPI(faturamentoPorPaciente, 0, faturamentoPorPaciente * 1.1 || 1),
        custos_por_leito: calcularKPI(0, 0, 1),
      } as IndicadorFinanceiro;
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });
};

// Hook para KPIs de Qualidade - dados reais cumulativos
export const useKPIsQualidade = (periodoMeses: number = 3) => {
  return useQuery({
    queryKey: ['kpis_qualidade_real', periodoMeses],
    queryFn: async () => {
      const agora = new Date();
      const inicioMes = startOfMonth(agora);
      const inicioMesAnterior = startOfMonth(subMonths(agora, 1));
      const inicioPeriodo = startOfMonth(subMonths(agora, periodoMeses));

      // Auditorias do período (não apenas mês atual)
      const { count: auditoriasTotal } = await supabase
        .from('auditorias_qualidade')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', inicioPeriodo.toISOString());

      const { count: auditoriasConformes } = await supabase
        .from('auditorias_qualidade')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', inicioPeriodo.toISOString())
        .eq('resultado', 'conforme');

      // Também considerar auditorias de segurança do paciente
      const { data: audSeguranca } = await supabase
        .from('auditorias_seguranca_paciente')
        .select('respostas, satisfacao_geral')
        .gte('created_at', inicioPeriodo.toISOString());

      // Calcular conformidade combinada
      let totalAuditorias = (auditoriasTotal || 0);
      let totalConformes = (auditoriasConformes || 0);

      if (audSeguranca && audSeguranca.length > 0) {
        totalAuditorias += audSeguranca.length;
        // Auditorias de segurança com satisfação >= 3 são consideradas conformes
        totalConformes += audSeguranca.filter((a: any) => (a.satisfacao_geral || 0) >= 3).length;
      }

      const conformidade = totalAuditorias > 0
        ? (totalConformes / totalAuditorias) * 100 : 0;

      // Conformidade do mês anterior para comparação
      const { count: auditoriasAnteriorTotal } = await supabase
        .from('auditorias_qualidade')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', inicioMesAnterior.toISOString())
        .lt('created_at', inicioMes.toISOString());

      const { count: auditoriasAnteriorConformes } = await supabase
        .from('auditorias_qualidade')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', inicioMesAnterior.toISOString())
        .lt('created_at', inicioMes.toISOString())
        .eq('resultado', 'conforme');

      const conformidadeAnterior = (auditoriasAnteriorTotal || 0) > 0
        ? ((auditoriasAnteriorConformes || 0) / (auditoriasAnteriorTotal || 1)) * 100 : conformidade;

      // Incidentes NSP (período completo)
      const { count: incidentesPeriodo } = await supabase
        .from('incidentes_nsp')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', inicioPeriodo.toISOString());

      const { count: incidentesMesAnterior } = await supabase
        .from('incidentes_nsp')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', inicioMesAnterior.toISOString())
        .lt('created_at', inicioMes.toISOString());

      const { count: incidentesMesAtual } = await supabase
        .from('incidentes_nsp')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', inicioMes.toISOString());

      // Processos auditados
      const processosMes = (auditoriasTotal || 0);

      // Correções (achados resolvidos no período)
      const { count: correcoesPeriodo } = await supabase
        .from('achados_auditoria')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'resolvido')
        .gte('created_at', inicioPeriodo.toISOString());

      const { count: correcoesAnterior } = await supabase
        .from('achados_auditoria')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'resolvido')
        .gte('created_at', inicioMesAnterior.toISOString())
        .lt('created_at', inicioMes.toISOString());

      return {
        taxa_conformidade: calcularKPI(conformidade, conformidadeAnterior, 95),
        incidentes_seguranca: calcularKPI(incidentesMesAtual || 0, incidentesMesAnterior || 0, 10),
        tempo_resposta_chamados: calcularKPI(0, 0, 100),
        processos_auditados: calcularKPI(processosMes, (auditoriasAnteriorTotal || 0), 15),
        correcoes_implementadas: calcularKPI(correcoesPeriodo || 0, correcoesAnterior || 0, 15),
        satisfacao_colaboradores: calcularKPI(0, 0, 5),
      } as IndicadorQualidade;
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });
};

// Hook para KPIs de RH - dados reais
export const useKPIsRH = (periodoMeses: number = 3) => {
  return useQuery({
    queryKey: ['kpis_rh_real', periodoMeses],
    queryFn: async () => {
      const agora = new Date();
      const inicioMes = startOfMonth(agora);
      const inicioMesAnterior = startOfMonth(subMonths(agora, 1));

      const { count: totalColaboradores } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true });

      const { count: atestadosMes } = await supabase
        .from('atestados')
        .select('id', { count: 'exact', head: true })
        .gte('data_inicio', format(inicioMes, 'yyyy-MM-dd'));

      const { count: atestadosMesAnterior } = await supabase
        .from('atestados')
        .select('id', { count: 'exact', head: true })
        .gte('data_inicio', format(inicioMesAnterior, 'yyyy-MM-dd'))
        .lt('data_inicio', format(inicioMes, 'yyyy-MM-dd'));

      const total = totalColaboradores || 1;
      const absenteismo = ((atestadosMes || 0) / total) * 100;
      const absenteismoAnterior = ((atestadosMesAnterior || 0) / total) * 100;

      let capacitacoesMes = 0;
      let capacitacoesAnterior = 0;
      try {
        const { count: capMes } = await supabase
          .from('lms_inscricoes')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', inicioMes.toISOString());
        capacitacoesMes = capMes || 0;

        const { count: capAnterior } = await supabase
          .from('lms_inscricoes')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', inicioMesAnterior.toISOString())
          .lt('created_at', inicioMes.toISOString());
        capacitacoesAnterior = capAnterior || 0;
      } catch { /* tabela pode não existir */ }

      const { data: perfis } = await supabase
        .from('profiles')
        .select('setor')
        .limit(1000);

      const distribuicao: Record<string, number> = {};
      (perfis || []).forEach((p: any) => {
        const setor = p.setor || 'Não definido';
        distribuicao[setor] = (distribuicao[setor] || 0) + 1;
      });

      return {
        absenteismo: calcularKPI(absenteismo, absenteismoAnterior, 5),
        turnover: calcularKPI(0, 0, 5),
        capacitacoes_realizadas: calcularKPI(capacitacoesMes, capacitacoesAnterior, 20),
        colaboradores_ativos: calcularKPI(total, total, total * 1.1),
        idade_media_equipe: 0,
        distribuicao_por_setor: distribuicao,
      } as IndicadorRH;
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });
};

// Hook consolidado
export const useKPIsConsolidado = (periodoMeses: number = 3) => {
  const operacionais = useKPIsOperacionais(periodoMeses);
  const financeiros = useKPIsFinanceiros(periodoMeses);
  const qualidade = useKPIsQualidade(periodoMeses);
  const rh = useKPIsRH(periodoMeses);

  return {
    operacionais,
    financeiros,
    qualidade,
    rh,
    isLoading: operacionais.isLoading || financeiros.isLoading || qualidade.isLoading || rh.isLoading,
    isError: operacionais.isError || financeiros.isError || qualidade.isError || rh.isError,
  };
};
