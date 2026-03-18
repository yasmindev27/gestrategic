export interface Treinamento {
  id: string;
  titulo: string;
  descricao: string | null;
  objetivo: string | null;
  tipo_treinamento: string;
  metodo_identificacao: string | null;
  competencia: string | null;
  indicador_competencia: string | null;
  instrutor: string | null;
  carga_horaria: string | null;
  setor_responsavel: string | null;
  setores_alvo: string[];
  publico_alvo: string | null;
  data_limite: string | null;
  mes_planejado: number | null;
  ano: number | null;
  status: string;
  nota_minima_aprovacao: number;
  criado_por: string | null;
  created_at: string;
  updated_at: string;
}

export interface Material {
  id: string;
  treinamento_id: string;
  titulo: string;
  tipo: string;
  url: string | null;
  descricao: string | null;
  ordem: number;
  created_at: string;
}

export interface QuizPergunta {
  id: string;
  treinamento_id: string;
  pergunta: string;
  opcao_a: string;
  opcao_b: string;
  opcao_c: string;
  opcao_d: string;
  resposta_correta: string;
  ordem: number;
}

export interface Inscricao {
  id: string;
  treinamento_id: string;
  usuario_id: string;
  usuario_nome: string;
  setor: string | null;
  status: string;
  nota: number | null;
  data_conclusao: string | null;
  material_acessado_em: string | null;
  created_at: string;
}

export interface TentativaQuiz {
  id: string;
  inscricao_id: string;
  treinamento_id: string;
  usuario_id: string;
  respostas: Record<string, string>;
  acertos: number;
  total_perguntas: number;
  nota: number;
  aprovado: boolean;
  created_at: string;
}
