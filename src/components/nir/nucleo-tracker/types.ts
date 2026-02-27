export type Atividade =
  | "Conferência de Documentos"
  | "Cadastro SUSFácil"
  | "Gestão de Vagas"
  | "Solicitação de Transferência"
  | "Contato com Estabelecimentos";

export const ATIVIDADES: Atividade[] = [
  "Conferência de Documentos",
  "Cadastro SUSFácil",
  "Gestão de Vagas",
  "Solicitação de Transferência",
  "Contato com Estabelecimentos",
];

export interface Colaborador {
  id: string;
  nome: string;
  ativo: boolean;
  criadoEm: string;
}

export interface RegistroProducao {
  id: string;
  colaborador: string;
  atividade: Atividade;
  quantidade: number;
  observacao: string;
  data: string;
  criadoEm: string;
}
