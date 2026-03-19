import { useQuery, useQueries } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, subMonths, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  tempo_medio_internacao: KPIData;
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

// Função auxiliar para calcular KPI
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
  
  const percentual_meta = (valor_atual / meta) * 100;

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

// Hook para KPIs Operacionais
export const useKPIsOperacionais = (periodoMeses: number = 3) => {
  return useQuery({
    queryKey: ['kpis_operacionais', periodoMeses],
    queryFn: async () => {
      const agora = new Date();
      const data_fim = format(agora, 'yyyy-MM-dd');
      const data_inicio = format(subMonths(agora, periodoMeses), 'yyyy-MM-dd');

      // Buscar dados de internação
      const { data: internacoes, error: errInternacoes } = await supabase
        .from('nir_pacientes')
        .select('id, data_internacao, data_alta, motivo_alta, causa_morte')
        .gte('data_internacao', data_inicio)
        .lte('data_internacao', data_fim);

      // Buscar dados de ocupação
      const { data: leitos, error: errLeitos } = await supabase
        .from('bed_records')
        .select('id, patient_id, status, sector')
        .eq('status', 'occupied');

      // Buscar total de leitos por setor
      const { data: totalLeitos, error: errTotalLeitos } = await supabase
        .from('bed_records')
        .select('id, sector');

      if (errInternacoes || errLeitos || errTotalLeitos) {
        throw new Error('Erro ao buscar dados operacionais');
      }

      // Calcular métricas
      const ocupacao_leitos = calcularKPI(
        leitos?.length || 0,
        (totalLeitos?.length || 1) * 0.75, // Assumir 75% de ocupação anterior
        totalLeitos?.length || 100
      );

      const pacientes_ativos = calcularKPI(
        leitos?.length || 0,
        (leitos?.length || 1) * 0.95,
        totalLeitos?.length || 100
      );

      // Taxa de readmissão (simplificado)
      const taxa_readmissao = calcularKPI(8, 12, 100); // Exemplo com dados

      // Tempo médio de internação
      const internacoes_concluidas = (internacoes || [])
        .filter(i => i.data_alta)
        .map(i => {
          const inicio = parseISO(i.data_internacao);
          const fim = i.data_alta ? parseISO(i.data_alta) : new Date();
          return Math.ceil((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
        });

      const tempo_medio_internacao = internacoes_concluidas.length > 0
        ? internacoes_concluidas.reduce((a, b) => a + b, 0) / internacoes_concluidas.length
        : 0;

      // Taxa de mortalidade
      const obitos = (internacoes || []).filter(i => i.motivo_alta === 'obito').length;
      const taxa_mortalidade = calcularKPI(
        obitos,
        Math.ceil((obitos || 1) * 1.1),
        5
      );

      // Disponibilidade de leitos
      const disponibilidade_leitos = calcularKPI(
        (totalLeitos?.length || 1) - (leitos?.length || 0),
        ((totalLeitos?.length || 1) - (leitos?.length || 0)) * 0.85,
        totalLeitos?.length || 100
      );

      // Eficiência operacional (placeholder)
      const eficiencia_operacional = calcularKPI(85, 82, 100);

      // Satisfação de pacientes (placeholder)
      const satisfacao_paciente = calcularKPI(4.2, 4.0, 5);

      return {
        ocupacao_leitos,
        pacientes_ativos,
        taxa_readmissao,
        tempo_medio_internacao,
        taxa_mortalidade,
        disponibilidade_leitos,
        eficiencia_operacional,
        satisfacao_paciente,
      } as MetricasOperacionais;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchInterval: 10 * 60 * 1000, // Refetch a cada 10 min
  });
};

// Hook para KPIs Financeiros
export const useKPIsFinanceiros = (periodoMeses: number = 3) => {
  return useQuery({
    queryKey: ['kpis_financeiros', periodoMeses],
    queryFn: async () => {
      const agora = new Date();
      const data_fim = format(agora, 'yyyy-MM-dd');
      const data_inicio = format(subMonths(agora, periodoMeses), 'yyyy-MM-dd');

      // Buscar DRE data
      const { data: dre_entries, error: errDRE } = await supabase
        .from('dre_entries')
        .select('*')
        .gte('created_at', data_inicio);

      if (errDRE) throw new Error('Erro ao buscar dados financeiros');

      // Calcular receitas (simplificado - usar valor_realizado de rubrica de receita)
      const receitas_mes = (dre_entries || [])
        .filter(d => d.rubrica?.includes('Receita') || d.categoria_pai?.includes('Receita'))
        .reduce((sum, d) => sum + (d.valor_realizado || 0), 0);

      const receita_anterior = receitas_mes * 0.95; // Assumir 95% do mês anterior

      const receita_realizadas = calcularKPI(receitas_mes, receita_anterior, receitas_mes * 1.1);

      // Custos operacionais
      const custos_mes = (dre_entries || [])
        .filter(d => !d.rubrica?.includes('Receita'))
        .reduce((sum, d) => sum + (d.valor_realizado || 0), 0);

      const custos_anterior = custos_mes * 1.05; // Assumir 5% aumento

      const custos_operacionais = calcularKPI(custos_mes, custos_anterior, custos_mes * 1.1);

      // Resultado operacional
      const resultado = receitas_mes - custos_mes;
      const resultado_anterior = (receitas_mes * 0.95) - (custos_mes * 1.05);

      const resultado_operacional = calcularKPI(
        Math.abs(resultado),
        Math.abs(resultado_anterior),
        (receitas_mes * 1.1) * 0.15 // Meta: 15% de margem
      );

      // Margem operacional
      const margem = receitas_mes > 0 ? (resultado / receitas_mes) * 100 : 0;
      const margem_anterior = receita_anterior > 0 ? (resultado_anterior / receita_anterior) * 100 : 0;

      const margem_operacional = calcularKPI(margem, margem_anterior, 20);

      // Faturamento médio por paciente
      const { data: pacientes } = await supabase
        .from('nir_pacientes')
        .select('id')
        .gte('data_internacao', data_inicio);

      const faturamento_por_paciente = pacientes?.length 
        ? receitas_mes / pacientes.length 
        : 0;

      const faturamento_medio_paciente = calcularKPI(
        faturamento_por_paciente,
        faturamento_por_paciente * 0.95,
        faturamento_por_paciente * 1.1
      );

      // Custos por leito
      const { data: totalLeitos } = await supabase
        .from('bed_records')
        .select('id');

      const custos_por_leito_valor = totalLeitos?.length 
        ? custos_mes / totalLeitos.length 
        : 0;

      const custos_por_leito = calcularKPI(
        custos_por_leito_valor,
        custos_por_leito_valor * 1.05,
        custos_por_leito_valor * 1.1
      );

      return {
        receita_realizadas,
        custos_operacionais,
        resultado_operacional,
        margem_operacional,
        faturamento_medio_paciente,
        custos_por_leito,
      } as IndicadorFinanceiro;
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });
};

// Hook para KPIs de Qualidade
export const useKPIsQualidade = (periodoMeses: number = 3) => {
  return useQuery({
    queryKey: ['kpis_qualidade', periodoMeses],
    queryFn: async () => {
      const agora = new Date();
      const data_fim = format(agora, 'yyyy-MM-dd');
      const data_inicio = format(subMonths(agora, periodoMeses), 'yyyy-MM-dd');

      // Buscar incidentes
      const { data: incidentes, error: errIncidentes } = await supabase
        .from('gestao_incidentes')
        .select('id, status, severidade, data_criacao')
        .gte('data_criacao', data_inicio);

      // Buscar chamados
      const { data: chamados, error: errChamados } = await supabase
        .from('chamados')
        .select('id, status, data_criacao, data_conclusao')
        .gte('data_criacao', data_inicio);

      if (errIncidentes || errChamados) {
        throw new Error('Erro ao buscar dados de qualidade');
      }

      // Taxa de conformidade (simplificada)
      const taxa_conformidade = calcularKPI(94, 92, 100);

      // Incidentes de segurança
      const incidentes_count = (incidentes || []).filter(i => 
        i.severidade === 'critica' || i.severidade === 'alta'
      ).length;

      const incidentes_seguranca = calcularKPI(incidentes_count, incidentes_count + 2, 0);

      // Tempo médio de resposta
      const chamados_com_tempo = (chamados || [])
        .filter(c => c.data_conclusao)
        .map(c => {
          const criacao = parseISO(c.data_criacao);
          const conclusao = parseISO(c.data_conclusao);
          return Math.ceil((conclusao.getTime() - criacao.getTime()) / (1000 * 60)); // em minutos
        });

      const tempo_medio_resposta = chamados_com_tempo.length > 0
        ? chamados_com_tempo.reduce((a, b) => a + b, 0) / chamados_com_tempo.length
        : 0;

      const tempo_resposta_chamados = calcularKPI(
        tempo_medio_resposta,
        tempo_medio_resposta * 1.1,
        240 // Meta: 4 horas
      );

      // Processos auditados (placeholder)
      const processos_auditados = calcularKPI(12, 10, 15);

      // Correções implementadas (placeholder)
      const correcoes_implementadas = calcularKPI(11, 9, 15);

      // Satisfação de colaboradores (placeholder)
      const satisfacao_colaboradores = calcularKPI(3.8, 3.7, 5);

      return {
        taxa_conformidade,
        incidentes_seguranca,
        tempo_resposta_chamados,
        processos_auditados,
        correcoes_implementadas,
        satisfacao_colaboradores,
      } as IndicadorQualidade;
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });
};

// Hook para KPIs de RH
export const useKPIsRH = (periodoMeses: number = 3) => {
  return useQuery({
    queryKey: ['kpis_rh', periodoMeses],
    queryFn: async () => {
      const agora = new Date();
      const data_fim = format(agora, 'yyyy-MM-dd');
      const data_inicio = format(subMonths(agora, periodoMeses), 'yyyy-MM-dd');

      // Buscar dados de RH
      const { data: colaboradores, error: errColab } = await supabase
        .from('profiles')
        .select('id, full_name, app_role, setor')
        .not('setor', 'is', null);

      // Buscar atestados (absenteísmo)
      const { data: atestados, error: errAtestados } = await supabase
        .from('atestados')
        .select('id, funcionario_nome, data_inicio, data_fim')
        .gte('data_inicio', data_inicio);

      // Buscar treinamentos
      const { data: treinamentos, error: errTreinamentos } = await supabase
        .from('lms_inscricoes')
        .select('id, status')
        .gte('created_at', data_inicio);

      if (errColab || errAtestados || errTreinamentos) {
        throw new Error('Erro ao buscar dados de RH');
      }

      const total_colaboradores = (colaboradores || []).length;
      const dias_no_periodo = periodoMeses * 30;
      const dias_atestados = (atestados || []).reduce((sum, a) => {
        const inicio = parseISO(a.data_inicio);
        const fim = parseISO(a.data_fim);
        return sum + Math.ceil((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
      }, 0);

      const absenteismo_percentual = (dias_atestados / (total_colaboradores * dias_no_periodo)) * 100;

      const absenteismo = calcularKPI(absenteismo_percentual, absenteismo_percentual * 1.1, 5);

      // Turnover (simplificado - usando histórico)
      const turnover = calcularKPI(3, 4, 5);

      // Capacitações
      const capacitacoes_count = (treinamentos || []).filter(t => t.status === 'concluido').length;
      const capacitacoes_realizadas = calcularKPI(
        capacitacoes_count,
        capacitacoes_count * 0.9,
        total_colaboradores * 0.5 // Meta: 50% dos colaboradores
      );

      const colaboradores_ativos = calcularKPI(
        total_colaboradores,
        total_colaboradores,
        total_colaboradores * 1.1
      );

      // Idade média (simplificada como valor fixo)
      const idade_media_equipe = 38;

      // Distribuição por setor
      const distribuicao_por_setor: Record<string, number> = {};
      (colaboradores || []).forEach(c => {
        if (c.setor) {
          distribuicao_por_setor[c.setor] = (distribuicao_por_setor[c.setor] || 0) + 1;
        }
      });

      return {
        absenteismo,
        turnover,
        capacitacoes_realizadas,
        colaboradores_ativos,
        idade_media_equipe,
        distribuicao_por_setor,
      } as IndicadorRH;
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });
};

// Hook para consolidado de todos os KPIs
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
