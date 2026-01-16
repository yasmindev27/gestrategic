export interface Chamado {
  id: string;
  numero_chamado: string;
  titulo: string;
  descricao: string;
  categoria: string;
  prioridade: string;
  status: string;
  solicitante_id: string;
  solicitante_nome: string;
  solicitante_setor: string | null;
  atribuido_para: string | null;
  data_abertura: string;
  data_resolucao: string | null;
  solucao: string | null;
  created_at: string;
  updated_at: string;
}

export interface Comentario {
  id: string;
  chamado_id: string;
  usuario_id: string;
  usuario_nome: string;
  comentario: string;
  created_at: string;
}

export interface DashboardFilters {
  periodo: string;
  dataInicio: Date | null;
  dataFim: Date | null;
  atendente: string;
  categoria: string;
  status: string;
}

export interface KPIMetrics {
  totalChamados: number;
  tempoMedioAtendimento: number; // em horas
  tempoMedioResolucao: number; // em horas
  percentualSLA: number;
  taxaReabertura: number;
  mediaChamadosPorAtendente: number;
  maiorTempoResolucao: number;
  tempoMedioPrimeiroAtendimento: number;
}

export interface AtendenteProdutividade {
  id: string;
  nome: string;
  chamadosAtendidos: number;
  tempoMedioAtendimento: number;
  percentualSLA: number;
  chamadosReabertos: number;
}

export const setorLabels: Record<string, string> = {
  ti: "TI",
  manutencao: "Manutenção",
  engenharia_clinica: "Engenharia Clínica",
  nir: "NIR",
};

export const prioridadeColors: Record<string, string> = {
  baixa: "bg-green-500 text-white",
  media: "bg-yellow-500 text-black",
  alta: "bg-orange-500 text-white",
  urgente: "bg-red-500 text-white",
};

export const statusColors: Record<string, string> = {
  aberto: "bg-blue-500 text-white",
  em_andamento: "bg-yellow-500 text-black",
  pendente: "bg-orange-500 text-white",
  resolvido: "bg-green-500 text-white",
  cancelado: "bg-gray-500 text-white",
};

export const statusLabels: Record<string, string> = {
  aberto: "Aberto",
  em_andamento: "Em Andamento",
  pendente: "Pendente",
  resolvido: "Resolvido",
  cancelado: "Cancelado",
};

export const categoriaLabels: Record<string, string> = {
  sistema: "Sistema",
  financeiro: "Financeiro",
  infraestrutura: "Infraestrutura",
  acesso: "Acesso",
  duvidas: "Dúvidas Gerais",
  hardware: "Hardware",
  rede: "Rede",
  software: "Software",
  ti: "TI",
  manutencao: "Manutenção",
  engenharia_clinica: "Engenharia Clínica",
};

// SLA padrão em horas por prioridade
export const SLA_HORAS: Record<string, number> = {
  urgente: 4,
  alta: 8,
  media: 24,
  baixa: 48,
};
