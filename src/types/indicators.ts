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
  { indicador: 'Total de Atendimentos Adulto', unidade: 'Nº', meta: null, subcategoria: 'Patologias Adulto' },
  { indicador: 'Distúrbios Respiratórios - Adulto', unidade: 'Nº', meta: null, subcategoria: 'Patologias Adulto' },
  { indicador: 'Distúrbios Gastrointestinais - Adulto', unidade: 'Nº', meta: null, subcategoria: 'Patologias Adulto' },
  { indicador: 'Distúrbios Neurológicos - Adulto', unidade: 'Nº', meta: null, subcategoria: 'Patologias Adulto' },
  { indicador: 'Distúrbios Cardiológicos - Adulto', unidade: 'Nº', meta: null, subcategoria: 'Patologias Adulto' },
  { indicador: 'Distúrbios Urológicos - Adulto', unidade: 'Nº', meta: null, subcategoria: 'Patologias Adulto' },
  { indicador: 'Distúrbios Ortopédicos - Adulto', unidade: 'Nº', meta: null, subcategoria: 'Patologias Adulto' },
  { indicador: 'Outros - Adulto', unidade: 'Nº', meta: null, subcategoria: 'Patologias Adulto' },
  { indicador: 'Total de Atendimentos Infantil', unidade: 'Nº', meta: null, subcategoria: 'Patologias Infantil' },
  { indicador: 'Distúrbios Respiratórios - Infantil', unidade: 'Nº', meta: null, subcategoria: 'Patologias Infantil' },
  { indicador: 'Distúrbios Gastrointestinais - Infantil', unidade: 'Nº', meta: null, subcategoria: 'Patologias Infantil' },
  { indicador: 'Distúrbios Neurológicos - Infantil', unidade: 'Nº', meta: null, subcategoria: 'Patologias Infantil' },
  { indicador: 'Distúrbios Cardiológicos - Infantil', unidade: 'Nº', meta: null, subcategoria: 'Patologias Infantil' },
  { indicador: 'Distúrbios Urológicos - Infantil', unidade: 'Nº', meta: null, subcategoria: 'Patologias Infantil' },
  { indicador: 'Distúrbios Ortopédicos - Infantil', unidade: 'Nº', meta: null, subcategoria: 'Patologias Infantil' },
  { indicador: 'Outros - Infantil', unidade: 'Nº', meta: null, subcategoria: 'Patologias Infantil' },
  // CID - Adulto
  { indicador: 'CID Adulto - Doenças do Aparelho Respiratório (J00-J99)', unidade: 'Nº', meta: null, subcategoria: 'CID Adulto' },
  { indicador: 'CID Adulto - Doenças do Aparelho Circulatório (I00-I99)', unidade: 'Nº', meta: null, subcategoria: 'CID Adulto' },
  { indicador: 'CID Adulto - Doenças do Aparelho Digestivo (K00-K93)', unidade: 'Nº', meta: null, subcategoria: 'CID Adulto' },
  { indicador: 'CID Adulto - Doenças do Sistema Nervoso (G00-G99)', unidade: 'Nº', meta: null, subcategoria: 'CID Adulto' },
  { indicador: 'CID Adulto - Doenças do Aparelho Geniturinário (N00-N99)', unidade: 'Nº', meta: null, subcategoria: 'CID Adulto' },
  { indicador: 'CID Adulto - Lesões e Causas Externas (S00-T98)', unidade: 'Nº', meta: null, subcategoria: 'CID Adulto' },
  { indicador: 'CID Adulto - Doenças Infecciosas e Parasitárias (A00-B99)', unidade: 'Nº', meta: null, subcategoria: 'CID Adulto' },
  { indicador: 'CID Adulto - Doenças Endócrinas/Metabólicas (E00-E90)', unidade: 'Nº', meta: null, subcategoria: 'CID Adulto' },
  { indicador: 'CID Adulto - Outros', unidade: 'Nº', meta: null, subcategoria: 'CID Adulto' },
  // CID - Pediátrico
  { indicador: 'CID Pediátrico - Doenças do Aparelho Respiratório (J00-J99)', unidade: 'Nº', meta: null, subcategoria: 'CID Pediátrico' },
  { indicador: 'CID Pediátrico - Doenças Infecciosas e Parasitárias (A00-B99)', unidade: 'Nº', meta: null, subcategoria: 'CID Pediátrico' },
  { indicador: 'CID Pediátrico - Doenças do Aparelho Digestivo (K00-K93)', unidade: 'Nº', meta: null, subcategoria: 'CID Pediátrico' },
  { indicador: 'CID Pediátrico - Doenças da Pele (L00-L99)', unidade: 'Nº', meta: null, subcategoria: 'CID Pediátrico' },
  { indicador: 'CID Pediátrico - Lesões e Causas Externas (S00-T98)', unidade: 'Nº', meta: null, subcategoria: 'CID Pediátrico' },
  { indicador: 'CID Pediátrico - Doenças do Sistema Nervoso (G00-G99)', unidade: 'Nº', meta: null, subcategoria: 'CID Pediátrico' },
  { indicador: 'CID Pediátrico - Outros', unidade: 'Nº', meta: null, subcategoria: 'CID Pediátrico' },
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

// ── NSP Indicators (Indicadores Hospitalares) ──
export const NSP_CATEGORIAS = {
  ESTRUTURA: 'Indicadores de Estrutura',
  PROCESSO: 'Indicadores de Processo',
  RESULTADO: 'Indicadores de Resultado',
  SEPSE: 'Protocolo de Sepse',
  DOR_TORACICA: 'Protocolo de Dor Torácica',
} as const;

export const NSP_INDICADORES_ESTRUTURA = [
  { indicador: 'Número Total de Leitos Clínicos', unidade: 'Nº', meta: null },
  { indicador: 'Número de Leitos Pediátricos', unidade: 'Nº', meta: null },
  { indicador: 'Número de Leitos de Isolamento', unidade: 'Nº', meta: null },
];

export const NSP_INDICADORES_PROCESSO = [
  { indicador: 'Número de Internações', unidade: 'Nº', meta: null },
  { indicador: 'Taxa de Ocupação', unidade: '%', meta: null },
  { indicador: 'Perfil Epidemiológico Adulto - Sexo Masculino', unidade: 'Nº', meta: null, subcategoria: 'Perfil Epidemiológico - Adulto' },
  { indicador: 'Perfil Epidemiológico Adulto - Sexo Feminino', unidade: 'Nº', meta: null, subcategoria: 'Perfil Epidemiológico - Adulto' },
  { indicador: 'Perfil Epidemiológico Infantil', unidade: 'Nº', meta: null, subcategoria: 'Perfil Epidemiológico - Infantil' },
];

export const NSP_INDICADORES_RESULTADO = [
  { indicador: 'Tempo Médio de Permanência - Geral', unidade: 'Dias', meta: null },
  { indicador: 'Tempo Médio de Permanência - Adulto', unidade: 'Dias', meta: null },
  { indicador: 'Tempo Médio de Permanência - Infantil', unidade: 'Dias', meta: null },
  { indicador: 'Taxa de Mortalidade', unidade: 'Nº', meta: null },
  { indicador: 'Número de Transferências para HSJ', unidade: 'Nº', meta: null },
  { indicador: 'Número de Transferências para Outros Hospitais', unidade: 'Nº', meta: null },
];

export const NSP_INDICADORES_SEPSE = [
  { indicador: 'Total de Protocolos Abertos', unidade: 'Nº', meta: null, subcategoria: 'Abertura' },
  { indicador: 'Protocolo Negado pelo Médico', unidade: 'Nº', meta: null, subcategoria: 'Abertura' },
  { indicador: 'Protocolos Realizados', unidade: 'Nº', meta: null, subcategoria: 'Abertura' },
  { indicador: 'Coleta de HMC antes do ATB', unidade: 'Nº', meta: null, subcategoria: 'Conformidade' },
  { indicador: 'Administração do ATB em até 01 hora da abertura do protocolo Sepse', unidade: 'Nº', meta: null, subcategoria: 'Conformidade' },
  { indicador: 'Resultado do Lactato em até 60 min', unidade: 'Nº', meta: null, subcategoria: 'Conformidade' },
  { indicador: 'Resultado do Lactato em 3 horas', unidade: 'Nº', meta: null, subcategoria: 'Conformidade' },
  { indicador: 'Resultado do Lactato em 6 horas', unidade: 'Nº', meta: null, subcategoria: 'Conformidade' },
  { indicador: 'Desfecho Clínico - Óbito', unidade: 'Nº', meta: null, subcategoria: 'Desfecho Clínico' },
  { indicador: 'Desfecho Clínico - Transferência', unidade: 'Nº', meta: null, subcategoria: 'Desfecho Clínico' },
  { indicador: 'Desfecho Clínico - Alta', unidade: 'Nº', meta: null, subcategoria: 'Desfecho Clínico' },
];

export const NSP_INDICADORES_DOR_TORACICA = [
  { indicador: 'Total de Protocolos Abertos', unidade: 'Nº', meta: null, subcategoria: 'Abertura' },
  { indicador: 'Baixo Risco', unidade: 'Nº', meta: null, subcategoria: 'Classificação de Risco' },
  { indicador: 'Moderado / Alto Risco', unidade: 'Nº', meta: null, subcategoria: 'Classificação de Risco' },
  { indicador: 'Porta ECG em até 10 minutos', unidade: 'Nº', meta: null, subcategoria: 'Tempo Resposta' },
  { indicador: 'Porta Agulha em até 30 minutos', unidade: 'Nº', meta: null, subcategoria: 'Tempo Resposta' },
  { indicador: 'Desfecho Clínico - Óbito', unidade: 'Nº', meta: null, subcategoria: 'Desfecho Clínico' },
  { indicador: 'Desfecho Clínico - Transferência', unidade: 'Nº', meta: null, subcategoria: 'Desfecho Clínico' },
  { indicador: 'Desfecho Clínico - Alta', unidade: 'Nº', meta: null, subcategoria: 'Desfecho Clínico' },
];

// Keep backward compatibility - auditorias is now empty but referenced in some places
export const NSP_INDICADORES_AUDITORIAS: any[] = [];

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
    ...NSP_INDICADORES_RESULTADO.map(i => ({ ...i, categoria: NSP_CATEGORIAS.RESULTADO, subcategoria: null })),
    ...NSP_INDICADORES_SEPSE.map(i => ({ ...i, categoria: NSP_CATEGORIAS.SEPSE })),
    ...NSP_INDICADORES_DOR_TORACICA.map(i => ({ ...i, categoria: NSP_CATEGORIAS.DOR_TORACICA })),
  ];
}
