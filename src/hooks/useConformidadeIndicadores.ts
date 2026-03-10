import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { differenceInHours, parseISO, startOfMonth, endOfMonth } from "date-fns";

// SLA em horas por prioridade (conforme ONA/ISO 9001)
const SLA_HORAS = {
  urgente: 4,
  alta: 8,
  media: 24,
  baixa: 48,
} as const;

export interface IndicadorONA {
  id: string;
  nome: string;
  categoria: "seguranca_paciente" | "gestao_qualidade" | "infraestrutura" | "rh" | "documentacao";
  meta: number;
  valor_atual: number;
  unidade: string;
  status: "conforme" | "alerta" | "nao_conforme";
  tendencia: "subindo" | "estavel" | "descendo";
  descricao: string;
}

export interface ConformidadeGeral {
  ona_score: number;
  iso_score: number;
  qmentum_score: number;
  total_indicadores: number;
  conformes: number;
  alertas: number;
  nao_conformes: number;
}

export interface IndicadoresPorModulo {
  modulo: string;
  indicadores: IndicadorONA[];
  score_geral: number;
}

export const useConformidadeIndicadores = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [conformidadeGeral, setConformidadeGeral] = useState<ConformidadeGeral>({
    ona_score: 0,
    iso_score: 0,
    qmentum_score: 0,
    total_indicadores: 0,
    conformes: 0,
    alertas: 0,
    nao_conformes: 0,
  });
  const [indicadoresPorModulo, setIndicadoresPorModulo] = useState<IndicadoresPorModulo[]>([]);

  const calcularStatus = (valor: number, meta: number, tipo: "maior_melhor" | "menor_melhor" = "maior_melhor"): "conforme" | "alerta" | "nao_conforme" => {
    if (tipo === "maior_melhor") {
      if (valor >= meta) return "conforme";
      if (valor >= meta * 0.8) return "alerta";
      return "nao_conforme";
    } else {
      if (valor <= meta) return "conforme";
      if (valor <= meta * 1.2) return "alerta";
      return "nao_conforme";
    }
  };

  const carregarIndicadores = useCallback(async () => {
    setIsLoading(true);
    try {
      const inicioMes = startOfMonth(new Date());
      const fimMes = endOfMonth(new Date());

      // Carregar dados em paralelo
      const [
        incidentesRes,
        auditoriasRes,
        chamadosRes,
        acoesRes,
        episRes,
        vacinasRes,
        rondasRes,
        atestadosRes,
        escalasRes,
        bedRecordsRes,
      ] = await Promise.all([
        supabase.from("incidentes_nsp").select("id, status, classificacao_risco, responsavel_tratativa_nome, plano_acao, evidencia_url, data_conclusao, data_ocorrencia"),
        supabase.from("auditorias_seguranca_paciente").select("id, respostas, data_auditoria").gte("data_auditoria", inicioMes.toISOString()),
        supabase.from("chamados").select("id, status, prioridade, data_abertura, data_resolucao").gte("created_at", inicioMes.toISOString()),
        supabase.from("acoes_incidentes").select("id, status"),
        supabase.from("epis_seguranca").select("id, data_validade"),
        supabase.from("vacinas_seguranca").select("id, status"),
        supabase.from("rondas_seguranca").select("id").gte("created_at", inicioMes.toISOString()),
        supabase.from("atestados").select("id, dias_afastamento").gte("created_at", inicioMes.toISOString()),
        supabase.from("enfermagem_escalas").select("id, status"),
        supabase.from("bed_records").select("id, patient_name").gte("created_at", inicioMes.toISOString()),
      ]);

      const incidentes = incidentesRes.data || [];
      const auditorias = auditoriasRes.data || [];
      const chamados = chamadosRes.data || [];
      const acoes = acoesRes.data || [];
      const epis = episRes.data || [];
      const vacinas = vacinasRes.data || [];
      const rondas = rondasRes.data || [];
      const atestados = atestadosRes.data || [];
      const escalas = escalasRes.data || [];
      const bedRecords = bedRecordsRes.data || [];

      // ========== INDICADORES DE SEGURANÇA DO PACIENTE (ONA) ==========
      const incidentesEncerrados = incidentes.filter(i => i.status === "encerrado").length;
      const taxaEncerramento = incidentes.length > 0 
        ? (incidentesEncerrados / incidentes.length) * 100 
        : 100;

      const acoesImplementadas = acoes.filter(a => a.status === "concluida").length;
      const taxaAcoesImplementadas = acoes.length > 0 
        ? (acoesImplementadas / acoes.length) * 100 
        : 100;

      const auditoriaConformes = auditorias.filter(a => {
        if (a.respostas && typeof a.respostas === 'object') {
          const respostas = a.respostas as Record<string, string>;
          const total = Object.keys(respostas).length;
          const conformes = Object.values(respostas).filter(v => v === 'conforme' || v === 'sim' || v === 'sim_completo').length;
          return total > 0 && (conformes / total) >= 0.8;
        }
        return false;
      }).length;
      const taxaConformidadeAuditorias = auditorias.length > 0 
        ? (auditoriaConformes / auditorias.length) * 100 
        : 100;

      // ========== INDICADORES DE GESTÃO DA QUALIDADE (ISO 9001) ==========
      const chamadosResolvidos = chamados.filter(c => c.status === "resolvido").length;
      const taxaResolucaoChamados = chamados.length > 0 
        ? (chamadosResolvidos / chamados.length) * 100 
        : 100;

      const chamadosDentroSLA = chamados.filter(c => {
        if (!c.data_resolucao || !c.data_abertura) return false;
        const horasResolucao = differenceInHours(parseISO(c.data_resolucao), parseISO(c.data_abertura));
        const slaHoras = SLA_HORAS[c.prioridade as keyof typeof SLA_HORAS] || 24;
        return horasResolucao <= slaHoras;
      }).length;
      const taxaSLA = chamadosResolvidos > 0 
        ? (chamadosDentroSLA / chamadosResolvidos) * 100 
        : 100;

      // ========== INDICADORES DE INFRAESTRUTURA ==========
      const rondasRealizadas = rondas.length;
      const diasNoMes = new Date().getDate();
      const rondasEsperadas = diasNoMes * 2;
      const taxaRondas = rondasEsperadas > 0 
        ? Math.min((rondasRealizadas / rondasEsperadas) * 100, 100) 
        : 100;

      // ========== INDICADORES DE RH/SEGURANÇA DO TRABALHO ==========
      const episVencidos = epis.filter(e => {
        if (!e.data_validade) return false;
        return new Date(e.data_validade) < new Date();
      }).length;
      const taxaEPIsValidos = epis.length > 0 
        ? ((epis.length - episVencidos) / epis.length) * 100 
        : 100;

      const vacinasEmDia = vacinas.filter(v => v.status === "valida").length;
      const taxaVacinacao = vacinas.length > 0 
        ? (vacinasEmDia / vacinas.length) * 100 
        : 100;

      const escalasPreenchidas = escalas.filter(e => e.status === "confirmado").length;
      const taxaEscalas = escalas.length > 0 
        ? (escalasPreenchidas / escalas.length) * 100 
        : 100;

      // ========== INDICADORES DE OCUPAÇÃO/ASSISTENCIAL ==========
      const leitosOcupados = bedRecords.filter(b => b.patient_name).length;
      const taxaOcupacao = bedRecords.length > 0 
        ? (leitosOcupados / bedRecords.length) * 100 
        : 0;

      // Novos indicadores baseados em incidentes
      const comResponsavel = incidentes.filter(i => i.responsavel_tratativa_nome).length;
      const taxaAtribuicao = incidentes.length > 0 
        ? (comResponsavel / incidentes.length) * 100 
        : 100;

      const comPlano = incidentes.filter(i => i.plano_acao).length;
      const taxaPlanoAcao = incidentes.length > 0 
        ? (comPlano / incidentes.length) * 100 
        : 100;

      const comEvidencia = incidentes.filter(i => i.evidencia_url).length;
      const taxaEvidencia = incidentes.length > 0 
        ? (comEvidencia / incidentes.length) * 100 
        : 100;

      // Risco crítico: incidentes graves ou catastróficos abertos
      const incidentesCriticos = incidentes.filter(
        i => (i.classificacao_risco === "grave" || i.classificacao_risco === "catastrofico") && i.status !== "encerrado"
      ).length;

      // Tempo médio de tratativa (da notificação ao encerramento, em dias)
      const encerradosComDatas = incidentes.filter(i => i.status === "encerrado" && i.data_conclusao && i.data_ocorrencia);
      const tempoMedioTratativaDias = encerradosComDatas.length > 0
        ? encerradosComDatas.reduce((acc, i) => {
            const dias = differenceInHours(parseISO(i.data_conclusao!), parseISO(i.data_ocorrencia)) / 24;
            return acc + Math.max(dias, 0);
          }, 0) / encerradosComDatas.length
        : 0;

      const indicadoresSegurancaPaciente: IndicadorONA[] = [
        {
          id: "inc_encerramento",
          nome: "Taxa de Encerramento de Incidentes",
          categoria: "seguranca_paciente",
          meta: 90,
          valor_atual: taxaEncerramento,
          unidade: "%",
          status: calcularStatus(taxaEncerramento, 90),
          tendencia: "estavel",
          descricao: "Percentual de incidentes encerrados em relação ao total notificado",
        },
        {
          id: "inc_atribuicao",
          nome: "Taxa de Atribuição de Responsável",
          categoria: "seguranca_paciente",
          meta: 95,
          valor_atual: taxaAtribuicao,
          unidade: "%",
          status: calcularStatus(taxaAtribuicao, 95),
          tendencia: "estavel",
          descricao: "Percentual de incidentes com responsável designado para tratativa",
        },
        {
          id: "inc_plano_acao",
          nome: "Taxa de Plano de Ação",
          categoria: "seguranca_paciente",
          meta: 85,
          valor_atual: taxaPlanoAcao,
          unidade: "%",
          status: calcularStatus(taxaPlanoAcao, 85),
          tendencia: "estavel",
          descricao: "Percentual de incidentes com plano de ação registrado",
        },
        {
          id: "inc_evidencia",
          nome: "Taxa de Evidências Anexadas",
          categoria: "seguranca_paciente",
          meta: 80,
          valor_atual: taxaEvidencia,
          unidade: "%",
          status: calcularStatus(taxaEvidencia, 80),
          tendencia: "estavel",
          descricao: "Percentual de incidentes com evidência documental anexada",
        },
        {
          id: "inc_criticos_abertos",
          nome: "Incidentes Críticos em Aberto",
          categoria: "seguranca_paciente",
          meta: 0,
          valor_atual: incidentesCriticos,
          unidade: "",
          status: incidentesCriticos === 0 ? "conforme" : incidentesCriticos <= 2 ? "alerta" : "nao_conforme",
          tendencia: "estavel",
          descricao: "Quantidade de incidentes graves/catastróficos ainda sem encerramento",
        },
        {
          id: "inc_tempo_tratativa",
          nome: "Tempo Médio de Tratativa",
          categoria: "seguranca_paciente",
          meta: 15,
          valor_atual: Math.round(tempoMedioTratativaDias * 10) / 10,
          unidade: " dias",
          status: calcularStatus(tempoMedioTratativaDias, 15, "menor_melhor"),
          tendencia: "estavel",
          descricao: "Média de dias entre a notificação e o encerramento do incidente",
        },
        {
          id: "acoes_implementadas",
          nome: "Taxa de Ações Implementadas",
          categoria: "seguranca_paciente",
          meta: 85,
          valor_atual: taxaAcoesImplementadas,
          unidade: "%",
          status: calcularStatus(taxaAcoesImplementadas, 85),
          tendencia: "estavel",
          descricao: "Percentual de ações corretivas/preventivas concluídas",
        },
        {
          id: "conformidade_auditorias",
          nome: "Conformidade em Auditorias de Segurança",
          categoria: "seguranca_paciente",
          meta: 80,
          valor_atual: taxaConformidadeAuditorias,
          unidade: "%",
          status: calcularStatus(taxaConformidadeAuditorias, 80),
          tendencia: "estavel",
          descricao: "Percentual de auditorias com mais de 80% de conformidade",
        },
      ];

      const indicadoresGestaoQualidade: IndicadorONA[] = [
        {
          id: "resolucao_chamados",
          nome: "Taxa de Resolução de Chamados",
          categoria: "gestao_qualidade",
          meta: 95,
          valor_atual: taxaResolucaoChamados,
          unidade: "%",
          status: calcularStatus(taxaResolucaoChamados, 95),
          tendencia: "estavel",
          descricao: "Percentual de chamados resolvidos",
        },
        {
          id: "sla_chamados",
          nome: "Conformidade SLA",
          categoria: "gestao_qualidade",
          meta: 90,
          valor_atual: taxaSLA,
          unidade: "%",
          status: calcularStatus(taxaSLA, 90),
          tendencia: "estavel",
          descricao: "Percentual de chamados resolvidos dentro do prazo SLA",
        },
      ];

      const indicadoresInfraestrutura: IndicadorONA[] = [
        {
          id: "rondas_realizadas",
          nome: "Rondas de Segurança Realizadas",
          categoria: "infraestrutura",
          meta: 80,
          valor_atual: taxaRondas,
          unidade: "%",
          status: calcularStatus(taxaRondas, 80),
          tendencia: "estavel",
          descricao: "Percentual de rondas realizadas em relação ao esperado",
        },
      ];

      const indicadoresRH: IndicadorONA[] = [
        {
          id: "epis_validos",
          nome: "EPIs dentro da Validade",
          categoria: "rh",
          meta: 100,
          valor_atual: taxaEPIsValidos,
          unidade: "%",
          status: calcularStatus(taxaEPIsValidos, 100),
          tendencia: "estavel",
          descricao: "Percentual de EPIs entregues ainda dentro da validade",
        },
        {
          id: "vacinacao_em_dia",
          nome: "Vacinação em Dia",
          categoria: "rh",
          meta: 95,
          valor_atual: taxaVacinacao,
          unidade: "%",
          status: calcularStatus(taxaVacinacao, 95),
          tendencia: "estavel",
          descricao: "Percentual de colaboradores com vacinação em dia",
        },
        {
          id: "escalas_confirmadas",
          nome: "Escalas Confirmadas",
          categoria: "rh",
          meta: 90,
          valor_atual: taxaEscalas,
          unidade: "%",
          status: calcularStatus(taxaEscalas, 90),
          tendencia: "estavel",
          descricao: "Percentual de escalas com status confirmado",
        },
      ];

      // Calcular scores gerais
      const todosIndicadores = [
        ...indicadoresSegurancaPaciente,
        ...indicadoresGestaoQualidade,
        ...indicadoresInfraestrutura,
        ...indicadoresRH,
      ];

      const conformes = todosIndicadores.filter(i => i.status === "conforme").length;
      const alertas = todosIndicadores.filter(i => i.status === "alerta").length;
      const naoConformes = todosIndicadores.filter(i => i.status === "nao_conforme").length;

      const onaScore = Math.round(
        (indicadoresSegurancaPaciente.reduce((acc, i) => acc + (i.status === "conforme" ? 100 : i.status === "alerta" ? 70 : 30), 0) /
        (indicadoresSegurancaPaciente.length * 100)) * 100
      );

      const isoScore = Math.round(
        (indicadoresGestaoQualidade.reduce((acc, i) => acc + (i.status === "conforme" ? 100 : i.status === "alerta" ? 70 : 30), 0) /
        (indicadoresGestaoQualidade.length * 100)) * 100
      );

      const qmentumScore = Math.round(
        (todosIndicadores.reduce((acc, i) => acc + (i.status === "conforme" ? 100 : i.status === "alerta" ? 70 : 30), 0) /
        (todosIndicadores.length * 100)) * 100
      );

      setConformidadeGeral({
        ona_score: onaScore,
        iso_score: isoScore,
        qmentum_score: qmentumScore,
        total_indicadores: todosIndicadores.length,
        conformes,
        alertas,
        nao_conformes: naoConformes,
      });

      setIndicadoresPorModulo([
        {
          modulo: "Segurança do Paciente (ONA)",
          indicadores: indicadoresSegurancaPaciente,
          score_geral: onaScore,
        },
        {
          modulo: "Gestão da Qualidade (ISO 9001)",
          indicadores: indicadoresGestaoQualidade,
          score_geral: isoScore,
        },
        {
          modulo: "Infraestrutura",
          indicadores: indicadoresInfraestrutura,
          score_geral: Math.round((taxaRondas / 100) * 100),
        },
        {
          modulo: "RH / Segurança do Trabalho",
          indicadores: indicadoresRH,
          score_geral: Math.round(((taxaEPIsValidos + taxaVacinacao + taxaEscalas) / 3)),
        },
      ]);

    } catch (error) {
      console.error("Erro ao carregar indicadores:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarIndicadores();
  }, [carregarIndicadores]);

  return {
    isLoading,
    conformidadeGeral,
    indicadoresPorModulo,
    recarregar: carregarIndicadores,
  };
};
