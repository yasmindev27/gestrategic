// Types for UPA and NSP indicators

export interface IndicatorData {
  id: string;
  mes: string;
  ano: number;
  categoria: string;
  subcategoria: string | null;
  indicador: string;
  valor_numero: number | null;
  valor_percentual: number | null;
  meta: number | null;
  unidade_medida: string;
  created_at: string;
  updated_at: string;
}

export interface ActionPlan {
  id: string;
  indicator_id: string | null;
  mes: string;
  ano: number;
  analise_critica: string | null;
  fator_causa: string | null;
  plano_acao: string | null;
  responsavel: string | null;
  prazo: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
] as const;

// ── UPA Indicators ──
export const UPA_CATEGORIAS = {
  ESTRUTURA: 'Indicadores de Estrutura',
  PROCESSO: 'Indicadores de Processo',
  RESULTADO: 'Indicadores de Resultado',
  GESTAO_PESSOAS: 'Indicadores de Gestão de Pessoas',
} as const;

export const UPA_INDICADORES_ESTRUTURA = [
  { indicador: 'Número de Leitos de Emergência', unidade: 'Nº', meta: null },
  { indicador: 'Número de Leitos de Observação', unidade: 'Nº', meta: null },
  { indicador: 'Número de Leitos de Isolamento', unidade: 'Nº', meta: null },
  { indicador: 'Número de Leitos Bloqueados/Interditados', unidade: 'Nº', meta: null },
  { indicador: 'Número de Enfermeiros', unidade: 'Nº', meta: null },
  { indicador: 'Número de Técnicos de Enfermagem', unidade: 'Nº', meta: 40 },
];

export const UPA_INDICADORES_PROCESSO = [
  { indicador: 'Número de Acolhimentos na Triagem', unidade: 'Nº', meta: null, subcategoria: 'Acolhimento' },
  { indicador: 'Nº Total de Atendimentos', unidade: 'Nº', meta: null, subcategoria: 'Atendimentos' },
  { indicador: 'Atendimento Clínico Adulto', unidade: 'Nº', meta: null, subcategoria: 'Atendimentos' },
  { indicador: 'Atendimento Clínico Infantil', unidade: 'Nº', meta: null, subcategoria: 'Atendimentos' },
  { indicador: 'Pacientes Classificados Azul (Não Urgente)', unidade: 'Nº', meta: null, subcategoria: 'Classificação de Risco' },
  { indicador: 'Pacientes Classificados Verde (Urgente)', unidade: 'Nº', meta: null, subcategoria: 'Classificação de Risco' },
  { indicador: 'Pacientes Classificados Amarelo (Urgência Menor)', unidade: 'Nº', meta: null, subcategoria: 'Classificação de Risco' },
  { indicador: 'Pacientes Classificados Laranja (Urgência Maior)', unidade: 'Nº', meta: null, subcategoria: 'Classificação de Risco' },
  { indicador: 'Pacientes Classificados Vermelho (Emergência)', unidade: 'Nº', meta: null, subcategoria: 'Classificação de Risco' },
  { indicador: 'Pacientes Classificados Branco', unidade: 'Nº', meta: null, subcategoria: 'Classificação de Risco' },
  { indicador: '0-29 dias (Recém Nascido)', unidade: 'Nº', meta: null, subcategoria: 'Perfil Idade Infantil' },
  { indicador: '30 dias a 12 meses (Lactante)', unidade: 'Nº', meta: null, subcategoria: 'Perfil Idade Infantil' },
  { indicador: '1 a 11 anos (Criança)', unidade: 'Nº', meta: null, subcategoria: 'Perfil Idade Infantil' },
  { indicador: '12 a 18 anos (Adolescente)', unidade: 'Nº', meta: null, subcategoria: 'Perfil Idade Adulto' },
  { indicador: '18 a 60 anos (Adulto)', unidade: 'Nº', meta: null, subcategoria: 'Perfil Idade Adulto' },
  { indicador: 'Acima de 60 anos (Idoso)', unidade: 'Nº', meta: null, subcategoria: 'Perfil Idade Adulto' },
  { indicador: 'Sexo Masculino', unidade: 'Nº', meta: null, subcategoria: 'Perfil Gênero' },
  { indicador: 'Sexo Feminino', unidade: 'Nº', meta: null, subcategoria: 'Perfil Gênero' },
];

export const UPA_INDICADORES_RESULTADO = [
  { indicador: 'Tempo Médio Classificação Azul (até 240min)', unidade: 'Minutos', meta: 240 },
  { indicador: 'Tempo Médio Classificação Verde (até 120min)', unidade: 'Minutos', meta: 120 },
  { indicador: 'Tempo Médio Classificação Amarelo (até 60min)', unidade: 'Minutos', meta: 60 },
  { indicador: 'Tempo Médio Classificação Laranja (até 10min)', unidade: 'Minutos', meta: 10 },
  { indicador: 'Tempo Médio Classificação Vermelho (imediato)', unidade: 'Minutos', meta: 0 },
  { indicador: 'Retorno pelo mesmo motivo em 24h', unidade: 'Nº', meta: null, subcategoria: 'Resolutividade' },
  { indicador: 'Nº Total de Transferências', unidade: 'Nº', meta: null, subcategoria: 'Transferências' },
  { indicador: 'Encaminhados para HSJ', unidade: 'Nº', meta: null, subcategoria: 'Transferências' },
  { indicador: 'Encaminhados para outros Hospitais', unidade: 'Nº', meta: null, subcategoria: 'Transferências' },
  { indicador: 'Taxa de Mortalidade', unidade: 'Nº', meta: null, subcategoria: 'Saídas' },
];

export const UPA_INDICADORES_GESTAO = [
  { indicador: 'Número de Colaboradores', unidade: 'Nº', meta: 60 },
  { indicador: 'Nº de Treinamentos', unidade: 'Nº', meta: null },
  { indicador: 'Número de Acidentes do Trabalho', unidade: 'Nº', meta: null },
  { indicador: 'Índice de Absenteísmo', unidade: 'Nº', meta: null },
  { indicador: 'Admissões', unidade: 'Nº', meta: null, subcategoria: 'Turnover' },
  { indicador: 'Demissões', unidade: 'Nº', meta: null, subcategoria: 'Turnover' },
];

// ── NSP Indicators ──
export const NSP_CATEGORIAS = {
  ESTRUTURA: 'Indicadores de Estrutura',
  PROCESSO: 'Indicadores de Processo',
  AUDITORIAS: 'Auditorias de Segurança do Paciente',
  RESULTADO: 'Indicadores de Resultado',
} as const;

export const NSP_INDICADORES_ESTRUTURA = [
  { indicador: 'Número Total de Profissionais - Institucional', unidade: 'Nº', meta: null },
  { indicador: 'Número de Internações', unidade: 'Nº', meta: null },
  { indicador: 'Número de Pacientes Atendidos', unidade: 'Nº', meta: null },
  { indicador: 'Número de Óbitos', unidade: 'Nº', meta: null },
];

export const NSP_INDICADORES_PROCESSO = [
  { indicador: 'Número Total de Notificações de Incidentes', unidade: 'Nº', meta: null, subcategoria: 'Notificações' },
  { indicador: 'Sem Dano', unidade: 'Nº', meta: null, subcategoria: 'Classificação de Incidentes' },
  { indicador: 'Circunstância de Risco', unidade: 'Nº', meta: null, subcategoria: 'Classificação de Incidentes' },
  { indicador: 'Quase Erro "Near Miss"', unidade: 'Nº', meta: null, subcategoria: 'Classificação de Incidentes' },
  { indicador: 'Com Dano / Evento Adverso', unidade: 'Nº', meta: null, subcategoria: 'Classificação de Incidentes' },
  { indicador: 'Dano Leve', unidade: 'Nº', meta: null, subcategoria: 'Grau do Dano' },
  { indicador: 'Dano Moderado', unidade: 'Nº', meta: null, subcategoria: 'Grau do Dano' },
  { indicador: 'Dano Grave', unidade: 'Nº', meta: null, subcategoria: 'Grau do Dano' },
  { indicador: 'Óbito', unidade: 'Nº', meta: null, subcategoria: 'Grau do Dano' },
  { indicador: 'Não Conformidades', unidade: 'Nº', meta: null, subcategoria: 'Não Conformidades' },
  { indicador: 'Unidade de Internação', unidade: 'Nº', meta: null, subcategoria: 'Procedência das Notificações' },
  { indicador: 'Emergência', unidade: 'Nº', meta: null, subcategoria: 'Procedência das Notificações' },
  { indicador: 'Pronto Atendimento', unidade: 'Nº', meta: null, subcategoria: 'Procedência das Notificações' },
  { indicador: 'Laboratório', unidade: 'Nº', meta: null, subcategoria: 'Procedência das Notificações' },
  { indicador: 'Farmácia', unidade: 'Nº', meta: null, subcategoria: 'Procedência das Notificações' },
  { indicador: 'Medicação', unidade: 'Nº', meta: null, subcategoria: 'Tipo de Incidentes - OMS' },
  { indicador: 'Documentação', unidade: 'Nº', meta: null, subcategoria: 'Tipo de Incidentes - OMS' },
  { indicador: 'Comportamento', unidade: 'Nº', meta: null, subcategoria: 'Tipo de Incidentes - OMS' },
  { indicador: 'Equipamentos Médicos', unidade: 'Nº', meta: null, subcategoria: 'Tipo de Incidentes - OMS' },
];

export const NSP_INDICADORES_AUDITORIAS = [
  { indicador: 'Nº pacientes avaliados - Identificação', unidade: 'Nº', meta: null, subcategoria: 'Identificação do Paciente' },
  { indicador: 'Conformidade na identificação dos pacientes', unidade: '%', meta: 100, subcategoria: 'Identificação do Paciente' },
  { indicador: 'Nº pacientes avaliados - Quedas', unidade: 'Nº', meta: null, subcategoria: 'Prevenção de Quedas' },
  { indicador: 'Conformidade nas barreiras de prevenção de Queda', unidade: '%', meta: 100, subcategoria: 'Prevenção de Quedas' },
  { indicador: 'Nº pacientes avaliados - Lesão', unidade: 'Nº', meta: null, subcategoria: 'Prevenção de Lesão por Pressão' },
  { indicador: 'Conformidade nas barreiras de prevenção de Lesão por Pressão', unidade: '%', meta: 100, subcategoria: 'Prevenção de Lesão por Pressão' },
];

export const NSP_INDICADORES_RESULTADO = [
  { indicador: 'Taxa de incidentes - Identificação do Paciente', unidade: 'Nº', meta: 0 },
  { indicador: 'Taxa de incidentes - Comunicação Efetiva', unidade: 'Nº', meta: 0 },
  { indicador: 'Taxa de incidentes - Medicamentos', unidade: 'Nº', meta: 0 },
  { indicador: 'Taxa de incidentes - Quedas', unidade: 'Nº', meta: 0 },
  { indicador: 'Taxa de incidentes - Retirada não programada de Dispositivos', unidade: 'Nº', meta: 0 },
  { indicador: 'Taxa de incidentes - Lesão de Pele', unidade: 'Nº', meta: 0 },
  { indicador: 'Taxa de incidentes - Flebite', unidade: 'Nº', meta: 0 },
  { indicador: 'Taxa de incidentes - Farmacovigilância', unidade: 'Nº', meta: 0 },
  { indicador: 'Taxa de incidentes - Tecnovigilância', unidade: 'Nº', meta: 0 },
];

// Helper to get all indicators for a module
export function getAllUPAIndicators() {
  return [
    ...UPA_INDICADORES_ESTRUTURA.map(i => ({ ...i, categoria: UPA_CATEGORIAS.ESTRUTURA, subcategoria: (i as any).subcategoria || null })),
    ...UPA_INDICADORES_PROCESSO.map(i => ({ ...i, categoria: UPA_CATEGORIAS.PROCESSO })),
    ...UPA_INDICADORES_RESULTADO.map(i => ({ ...i, categoria: UPA_CATEGORIAS.RESULTADO, subcategoria: (i as any).subcategoria || null })),
    ...UPA_INDICADORES_GESTAO.map(i => ({ ...i, categoria: UPA_CATEGORIAS.GESTAO_PESSOAS, subcategoria: (i as any).subcategoria || null })),
  ];
}

export function getAllNSPIndicators() {
  return [
    ...NSP_INDICADORES_ESTRUTURA.map(i => ({ ...i, categoria: NSP_CATEGORIAS.ESTRUTURA, subcategoria: null })),
    ...NSP_INDICADORES_PROCESSO.map(i => ({ ...i, categoria: NSP_CATEGORIAS.PROCESSO })),
    ...NSP_INDICADORES_AUDITORIAS.map(i => ({ ...i, categoria: NSP_CATEGORIAS.AUDITORIAS })),
    ...NSP_INDICADORES_RESULTADO.map(i => ({ ...i, categoria: NSP_CATEGORIAS.RESULTADO, subcategoria: null })),
  ];
}
