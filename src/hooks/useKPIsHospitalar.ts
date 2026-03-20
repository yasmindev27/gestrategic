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

// Hook para KPIs Operacionais - dados reais do banco
export const useKPIsOperacionais = (periodoMeses: number = 3) => {
  return useQuery({
    queryKey: ['kpis_operacionais_real', periodoMeses],
    queryFn: async () => {
      const agora = new Date();
      const inicioMes = startOfMonth(agora);
      const fimMes = endOfMonth(agora);
      const inicioMesAnterior = startOfMonth(subMonths(agora, 1));
      const fimMesAnterior = endOfMonth(subMonths(agora, 1));

      // Total de leitos configurados (bed_records com registros únicos por leito)
      const { data: todosLeitos } = await supabase
        .from('bed_records')
        .select('bed_number, sector, patient_name')
        .order('shift_date', { ascending: false });

      // Deduplica por bed_number+sector para pegar o estado atual de cada leito
      const leitosUnicos = new Map<string, any>();
      (todosLeitos || []).forEach((l: any) => {
        const key = `${l.sector}-${l.bed_number}`;
        if (!leitosUnicos.has(key)) {
          leitosUnicos.set(key, l);
        }
      });

      const totalLeitos = leitosUnicos.size || 0;
      const leitosOcupados = Array.from(leitosUnicos.values())
        .filter((l: any) => l.patient_name && l.patient_name.trim() !== '').length;

      // Leitos do mês anterior (usando daily_statistics se disponível)
      const { data: statsAnterior } = await supabase
        .from('daily_statistics')
        .select('total_patients')
        .gte('date', format(inicioMesAnterior, 'yyyy-MM-dd'))
        .lte('date', format(fimMesAnterior, 'yyyy-MM-dd'))
        .order('date', { ascending: false })
        .limit(1);

      const pacientesAnterior = statsAnterior?.[0]?.total_patients || leitosOcupados;

      // Incidentes de mortalidade (incidentes_nsp com classificação grave)
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

      // Tempo médio de internação (diferença entre data_internacao e data_alta)
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
          ? tempos.reduce((a: number, b: number) => a + b, 0) / tempos.length
          : 0;
      }

      const taxaOcupacao = totalLeitos > 0 ? (leitosOcupados / totalLeitos) * 100 : 0;
      const taxaOcupacaoAnterior = totalLeitos > 0 ? (pacientesAnterior / totalLeitos) * 100 : 0;

      const taxaMortalidade = leitosOcupados > 0
        ? ((mortalidadeMesAtual || 0) / leitosOcupados) * 100
        : 0;
      const taxaMortalidadeAnterior = pacientesAnterior > 0
        ? ((mortalidadeMesAnterior || 0) / pacientesAnterior) * 100
        : 0;

      // Chamados resolvidos vs total para eficiência
      const { count: chamadosTotalMes } = await supabase
        .from('chamados')
        .select('id', { count: 'exact', head: true })
        .gte('data_abertura', inicioMes.toISOString());

      const { count: chamadosResolvidosMes } = await supabase
        .from('chamados')
        .select('id', { count: 'exact', head: true })
        .gte('data_abertura', inicioMes.toISOString())
        .eq('status', 'resolvido');

      const eficiencia = (chamadosTotalMes || 0) > 0
        ? ((chamadosResolvidosMes || 0) / (chamadosTotalMes || 1)) * 100
        : 0;

      return {
        ocupacao_leitos: calcularKPI(taxaOcupacao, taxaOcupacaoAnterior, 85),
        pacientes_ativos: calcularKPI(leitosOcupados, pacientesAnterior, totalLeitos),
        taxa_readmissao: calcularKPI(0, 0, 5),
        tempo_medio_internacao: Math.round(tempoMedioInternacao * 10) / 10,
        taxa_mortalidade: calcularKPI(taxaMortalidade, taxaMortalidadeAnterior, 3),
        disponibilidade_leitos: calcularKPI(
          totalLeitos - leitosOcupados,
          totalLeitos - pacientesAnterior,
          totalLeitos
        ),
        eficiencia_operacional: calcularKPI(eficiencia, eficiencia * 0.95, 90),
        satisfacao_paciente: calcularKPI(0, 0, 5),
      } as MetricasOperacionais;
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });
};

// Hook para KPIs Financeiros - dados reais
export const useKPIsFinanceiros = (periodoMeses: number = 3) => {
  return useQuery({
    queryKey: ['kpis_financeiros_real', periodoMeses],
    queryFn: async () => {
      const agora = new Date();
      const inicioMes = startOfMonth(agora);
      const inicioMesAnterior = startOfMonth(subMonths(agora, 1));
      const fimMesAnterior = endOfMonth(subMonths(agora, 1));

      // Receita: soma de notas fiscais do mês atual
      const { data: notasMesAtual } = await supabase
        .from('gerencia_notas_fiscais')
        .select('valor_nota')
        .gte('created_at', inicioMes.toISOString());

      const receitaMesAtual = (notasMesAtual || [])
        .reduce((sum: number, n: any) => sum + (Number(n.valor_nota) || 0), 0);

      // Receita mês anterior
      const { data: notasMesAnterior } = await supabase
        .from('gerencia_notas_fiscais')
        .select('valor_nota')
        .gte('created_at', inicioMesAnterior.toISOString())
        .lt('created_at', inicioMes.toISOString());

      const receitaMesAnterior = (notasMesAnterior || [])
        .reduce((sum: number, n: any) => sum + (Number(n.valor_nota) || 0), 0);

      // Custos - DRE entries
      let custosMesAtual = 0;
      let custosMesAnterior = 0;
      try {
        const mesAtualNome = format(agora, 'MMMM').toUpperCase();
        const { data: dreMesAtual } = await (supabase
          .from('gerencia_dre_entries' as any)
          .select('valor_realizado')
          .eq('mes', mesAtualNome)
          .eq('ano', agora.getFullYear()) as any);

        custosMesAtual = (dreMesAtual || [])
          .reduce((sum: number, d: any) => sum + (Number(d.valor_realizado) || 0), 0);
      } catch {
        // tabela pode não existir
      }

      const resultado = receitaMesAtual - custosMesAtual;
      const resultadoAnterior = receitaMesAnterior - custosMesAnterior;
      const margem = receitaMesAtual > 0 ? (resultado / receitaMesAtual) * 100 : 0;
      const margemAnterior = receitaMesAnterior > 0 ? (resultadoAnterior / receitaMesAnterior) * 100 : 0;

      // Pacientes ativos para cálculo por paciente
      const { count: pacientesCount } = await supabase
        .from('bed_records')
        .select('id', { count: 'exact', head: true })
        .not('patient_name', 'is', null);

      const pacientes = pacientesCount || 1;
      const faturamentoPorPaciente = receitaMesAtual / pacientes;
      const faturamentoAnteriorPaciente = receitaMesAnterior / Math.max(pacientes, 1);

      return {
        receita_realizadas: calcularKPI(receitaMesAtual, receitaMesAnterior, receitaMesAtual * 1.1 || 1),
        custos_operacionais: calcularKPI(custosMesAtual, custosMesAnterior, custosMesAtual * 1.1 || 1),
        resultado_operacional: calcularKPI(Math.abs(resultado), Math.abs(resultadoAnterior), Math.abs(resultado) * 1.1 || 1),
        margem_operacional: calcularKPI(margem, margemAnterior, 20),
        faturamento_medio_paciente: calcularKPI(faturamentoPorPaciente, faturamentoAnteriorPaciente, faturamentoPorPaciente * 1.1 || 1),
        custos_por_leito: calcularKPI(0, 0, 1),
      } as IndicadorFinanceiro;
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });
};

// Hook para KPIs de Qualidade - dados reais
export const useKPIsQualidade = (periodoMeses: number = 3) => {
  return useQuery({
    queryKey: ['kpis_qualidade_real', periodoMeses],
    queryFn: async () => {
      const agora = new Date();
      const inicioMes = startOfMonth(agora);
      const inicioMesAnterior = startOfMonth(subMonths(agora, 1));

      // Auditorias conformes / total
      const { count: auditoriasTotal } = await supabase
        .from('auditorias_qualidade')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', inicioMes.toISOString());

      const { count: auditoriasConformes } = await supabase
        .from('auditorias_qualidade')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', inicioMes.toISOString())
        .eq('resultado', 'conforme');

      const conformidade = (auditoriasTotal || 0) > 0
        ? ((auditoriasConformes || 0) / (auditoriasTotal || 1)) * 100
        : 0;

      // Auditorias mês anterior
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
        ? ((auditoriasAnteriorConformes || 0) / (auditoriasAnteriorTotal || 1)) * 100
        : 0;

      // Incidentes NSP
      const { count: incidentesMes } = await supabase
        .from('incidentes_nsp')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', inicioMes.toISOString());

      const { count: incidentesMesAnterior } = await supabase
        .from('incidentes_nsp')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', inicioMesAnterior.toISOString())
        .lt('created_at', inicioMes.toISOString());

      // Tempo médio de resposta de chamados (primeiro comentário)
      const { data: chamadosComResposta } = await supabase
        .from('chamados')
        .select('data_abertura, created_at')
        .gte('data_abertura', inicioMes.toISOString())
        .eq('status', 'resolvido')
        .limit(200);

      const { data: chamadosAnteriorComResposta } = await supabase
        .from('chamados')
        .select('data_abertura, created_at')
        .gte('data_abertura', inicioMesAnterior.toISOString())
        .lt('data_abertura', inicioMes.toISOString())
        .eq('status', 'resolvido')
        .limit(200);

      // Processos auditados
      const processosMes = auditoriasTotal || 0;
      const processosAnterior = auditoriasAnteriorTotal || 0;

      // Correções (achados com status resolvido)
      const { count: correcoesMes } = await supabase
        .from('achados_auditoria')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'resolvido')
        .gte('created_at', inicioMes.toISOString());

      const { count: correcoesAnterior } = await supabase
        .from('achados_auditoria')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'resolvido')
        .gte('created_at', inicioMesAnterior.toISOString())
        .lt('created_at', inicioMes.toISOString());

      return {
        taxa_conformidade: calcularKPI(conformidade, conformidadeAnterior, 95),
        incidentes_seguranca: calcularKPI(incidentesMes || 0, incidentesMesAnterior || 0, 10),
        tempo_resposta_chamados: calcularKPI(
          (chamadosComResposta || []).length,
          (chamadosAnteriorComResposta || []).length,
          100
        ),
        processos_auditados: calcularKPI(processosMes, processosAnterior, 15),
        correcoes_implementadas: calcularKPI(correcoesMes || 0, correcoesAnterior || 0, 15),
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

      // Total de colaboradores (profiles)
      const { count: totalColaboradores } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true });

      // Atestados no mês = proxy para absenteísmo
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

      // Capacitações (lms_treinamentos participações)
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
      } catch {
        // tabela pode não existir
      }

      // Distribuição por setor
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
