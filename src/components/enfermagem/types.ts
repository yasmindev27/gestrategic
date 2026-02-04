export interface Escala {
  id: string;
  profissional_id: string;
  profissional_nome: string;
  setor: string;
  data_plantao: string;
  hora_inicio: string;
  hora_fim: string;
  tipo_plantao: 'diurno' | 'noturno' | '12x36' | 'extra' | 'cobertura';
  status: 'confirmado' | 'disponivel_troca' | 'em_negociacao' | 'trocado' | 'cancelado';
  observacoes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Troca {
  id: string;
  escala_id: string;
  ofertante_id: string;
  ofertante_nome: string;
  aceitante_id?: string;
  aceitante_nome?: string;
  motivo_oferta?: string;
  status: 'aberta' | 'aceita' | 'pendente_aprovacao' | 'aprovada' | 'rejeitada' | 'cancelada' | 'expirada';
  requer_aprovacao: boolean;
  aprovador_id?: string;
  aprovador_nome?: string;
  data_aprovacao?: string;
  justificativa_rejeicao?: string;
  created_at: string;
  updated_at: string;
  escala?: Escala;
}

export interface TrocaHistorico {
  id: string;
  troca_id: string;
  acao: string;
  executado_por: string;
  executado_por_nome: string;
  detalhes?: Record<string, unknown>;
  created_at: string;
}

export interface Configuracao {
  id: string;
  chave: string;
  valor: string;
  descricao?: string;
}

export const TIPOS_PLANTAO = [
  { value: 'diurno', label: 'Diurno (7h-19h)', cor: 'bg-yellow-100 text-yellow-800' },
  { value: 'noturno', label: 'Noturno (19h-7h)', cor: 'bg-indigo-100 text-indigo-800' },
  { value: '12x36', label: '12x36', cor: 'bg-blue-100 text-blue-800' },
  { value: 'extra', label: 'Extra', cor: 'bg-green-100 text-green-800' },
  { value: 'cobertura', label: 'Cobertura', cor: 'bg-orange-100 text-orange-800' },
] as const;

export const STATUS_ESCALA = [
  { value: 'confirmado', label: 'Confirmado', cor: 'bg-green-100 text-green-800' },
  { value: 'disponivel_troca', label: 'Disponível para Troca', cor: 'bg-yellow-100 text-yellow-800' },
  { value: 'em_negociacao', label: 'Em Negociação', cor: 'bg-blue-100 text-blue-800' },
  { value: 'trocado', label: 'Trocado', cor: 'bg-purple-100 text-purple-800' },
  { value: 'cancelado', label: 'Cancelado', cor: 'bg-red-100 text-red-800' },
] as const;

export const STATUS_TROCA = [
  { value: 'aberta', label: 'Aberta', cor: 'bg-yellow-100 text-yellow-800' },
  { value: 'aceita', label: 'Aceita', cor: 'bg-blue-100 text-blue-800' },
  { value: 'pendente_aprovacao', label: 'Aguardando Aprovação', cor: 'bg-orange-100 text-orange-800' },
  { value: 'aprovada', label: 'Aprovada', cor: 'bg-green-100 text-green-800' },
  { value: 'rejeitada', label: 'Rejeitada', cor: 'bg-red-100 text-red-800' },
  { value: 'cancelada', label: 'Cancelada', cor: 'bg-gray-100 text-gray-800' },
  { value: 'expirada', label: 'Expirada', cor: 'bg-gray-100 text-gray-600' },
] as const;
