-- ============================================================
-- SCHEMA COMPLETO DO BANCO DE DADOS - EXPORTAÇÃO PARA MIGRAÇÃO
-- Projeto: UPA 24h / Gestrategic
-- Data de exportação: 2026-03-01
-- ============================================================

-- ====================
-- TIPOS CUSTOMIZADOS
-- ====================
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM (
    'admin', 'gestor', 'funcionario', 'recepcao', 'classificacao', 
    'nir', 'faturamento', 'ti', 'manutencao', 'engenharia_clinica', 
    'laboratorio', 'restaurante', 'rh_dp', 'assistencia_social', 
    'qualidade', 'nsp', 'seguranca', 'enfermagem', 'medicos'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ====================
-- TABELAS
-- ====================

CREATE TABLE public.achados_auditoria (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  auditoria_id uuid NOT NULL,
  tipo_achado text NOT NULL,
  descricao text NOT NULL,
  evidencia text,
  requisito_referencia text,
  gravidade text,
  status text NOT NULL DEFAULT 'aberto'::text,
  registrado_por uuid,
  registrado_por_nome text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.acoes_incidentes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  incidente_id uuid NOT NULL,
  analise_id uuid,
  tipo_acao text NOT NULL,
  descricao text NOT NULL,
  responsavel_id uuid,
  responsavel_nome text NOT NULL,
  prazo date NOT NULL,
  status text NOT NULL DEFAULT 'pendente'::text,
  data_conclusao date,
  observacoes text,
  registrado_por uuid,
  registrado_por_nome text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.agenda_destinatarios (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agenda_item_id uuid NOT NULL,
  usuario_id uuid NOT NULL,
  visualizado boolean DEFAULT false,
  visualizado_em timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.agenda_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tipo text NOT NULL,
  titulo text NOT NULL,
  descricao text,
  data_inicio timestamp with time zone NOT NULL,
  data_fim timestamp with time zone,
  hora text,
  prioridade text DEFAULT 'media'::text,
  status text DEFAULT 'pendente'::text,
  criado_por uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.alertas_seguranca (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tipo text NOT NULL DEFAULT 'apoio'::text,
  setor text NOT NULL,
  usuario_id uuid NOT NULL,
  usuario_nome text NOT NULL,
  observacao text,
  status text NOT NULL DEFAULT 'pendente'::text,
  atendido_por uuid,
  atendido_por_nome text,
  desfecho text,
  atendido_em timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.analises_incidentes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  incidente_id uuid NOT NULL,
  tipo_analise text NOT NULL,
  descricao_analise text NOT NULL,
  causas_identificadas text,
  fatores_contribuintes text,
  analisado_por uuid,
  analisado_por_nome text NOT NULL,
  data_analise timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.asos_seguranca (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  colaborador_nome text NOT NULL,
  colaborador_user_id uuid,
  tipo_aso text NOT NULL,
  data_exame date NOT NULL,
  data_validade date,
  resultado text NOT NULL DEFAULT 'apto'::text,
  medico_nome text,
  crm text,
  cargo_atual text,
  cargo_novo text,
  setor text,
  riscos_ocupacionais text,
  exames_realizados text,
  restricoes text,
  observacoes text,
  status text NOT NULL DEFAULT 'vigente'::text,
  registrado_por uuid DEFAULT auth.uid(),
  registrado_por_nome text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.assistencia_social_atendimentos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  paciente_id uuid NOT NULL,
  tipo_atendimento text NOT NULL,
  motivo text NOT NULL,
  descricao text NOT NULL,
  profissional_id uuid,
  profissional_nome text NOT NULL,
  data_atendimento timestamp with time zone NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'em_atendimento'::text,
  observacoes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.assistencia_social_documentos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  atendimento_id uuid NOT NULL,
  nome_arquivo text NOT NULL,
  tipo_documento text NOT NULL,
  arquivo_url text NOT NULL,
  tamanho_bytes integer,
  uploaded_by uuid,
  uploaded_by_nome text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.assistencia_social_encaminhamentos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  atendimento_id uuid NOT NULL,
  tipo_encaminhamento text NOT NULL,
  destino text,
  motivo text NOT NULL,
  observacoes text,
  data_encaminhamento timestamp with time zone NOT NULL DEFAULT now(),
  data_retorno timestamp with time zone,
  status text NOT NULL DEFAULT 'pendente'::text,
  registrado_por uuid,
  registrado_por_nome text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.assistencia_social_pacientes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nome_completo text NOT NULL,
  numero_prontuario text,
  cpf text,
  cns text,
  data_nascimento date,
  telefone text,
  endereco text,
  setor_atendimento text NOT NULL,
  observacoes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE TABLE public.atestados (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  funcionario_user_id uuid NOT NULL,
  funcionario_nome text NOT NULL,
  data_inicio date NOT NULL,
  data_fim date NOT NULL,
  dias_afastamento integer NOT NULL,
  tipo text NOT NULL,
  cid text,
  medico_nome text,
  crm text,
  observacao text,
  arquivo_url text,
  registrado_por uuid NOT NULL,
  validado_por uuid,
  validado_em timestamp with time zone,
  status text NOT NULL DEFAULT 'pendente'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.ativos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  numero_patrimonio text,
  numero_serie text,
  fabricante text,
  modelo text,
  categoria text NOT NULL DEFAULT 'geral'::text,
  setor_responsavel text NOT NULL,
  setor_localizacao text,
  data_aquisicao date,
  data_garantia_fim date,
  vida_util_meses integer,
  valor_aquisicao numeric(12,2),
  status text NOT NULL DEFAULT 'operacional'::text,
  criticidade text NOT NULL DEFAULT 'media'::text,
  observacoes text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.ativos_disponibilidade (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ativo_id uuid NOT NULL,
  data date NOT NULL,
  horas_operacionais numeric(5,2) NOT NULL DEFAULT 24,
  horas_parado numeric(5,2) NOT NULL DEFAULT 0,
  motivo_parada text,
  registrado_por uuid,
  registrado_por_nome text,
  setor text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.auditoria_formularios_config (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tipo text NOT NULL,
  nome text NOT NULL,
  icone text DEFAULT 'FileText'::text,
  ativo boolean DEFAULT true,
  ordem integer DEFAULT 0,
  setores text[] DEFAULT '{}'::text[],
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.auditoria_perguntas_config (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  secao_id uuid NOT NULL,
  codigo text NOT NULL,
  label text NOT NULL,
  opcoes text[] NOT NULL DEFAULT '{conforme,nao_conforme,nao_aplica}'::text[],
  ativo boolean DEFAULT true,
  ordem integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.auditoria_secoes_config (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  formulario_id uuid NOT NULL,
  nome text NOT NULL,
  ordem integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.auditoria_temporalidade (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  setor text NOT NULL,
  modulo text NOT NULL,
  registro_id uuid,
  descricao text NOT NULL,
  data_fato timestamp with time zone NOT NULL,
  data_registro timestamp with time zone NOT NULL,
  delay_horas numeric,
  limite_horas numeric NOT NULL DEFAULT 24,
  justificado boolean DEFAULT false,
  justificativa_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE TABLE public.auditorias_qualidade (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tipo_auditoria text NOT NULL,
  titulo text NOT NULL,
  data_auditoria date NOT NULL,
  auditor text NOT NULL,
  setor_auditado text NOT NULL,
  escopo text,
  status text NOT NULL DEFAULT 'programada'::text,
  resultado text,
  observacoes text,
  created_by uuid,
  created_by_nome text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.auditorias_seguranca_paciente (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tipo text NOT NULL,
  data_auditoria date NOT NULL,
  setor text NOT NULL,
  auditor_id uuid NOT NULL,
  auditor_nome text NOT NULL,
  paciente_iniciais text,
  paciente_ra text,
  numero_prontuario text,
  score_risco text,
  possui_lpp boolean,
  grau_lpp text,
  apresentou_queda boolean,
  notificacao_aberta text,
  profissional_auditado text,
  mes_avaliacao text,
  unidade_atendimento text,
  satisfacao_geral integer,
  respostas jsonb NOT NULL DEFAULT '{}'::jsonb,
  observacoes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.avaliacoes_desempenho (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  colaborador text NOT NULL,
  cargo text,
  avaliador text NOT NULL,
  data_avaliacao date NOT NULL DEFAULT CURRENT_DATE,
  scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  pontos_fortes text,
  oportunidades text,
  feedback text,
  acoes_desenvolvimento jsonb DEFAULT '[]'::jsonb,
  medias_categorias jsonb DEFAULT '{}'::jsonb,
  nota_geral numeric(5,2),
  registrado_por uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.avaliacoes_experiencia (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  periodo_avaliacao text NOT NULL,
  colaborador_nome text NOT NULL,
  setor text,
  funcao text,
  data_admissao date NOT NULL,
  data_termino_experiencia date,
  data_avaliacao date NOT NULL DEFAULT CURRENT_DATE,
  avaliador_nome text NOT NULL,
  avaliador_id uuid,
  assiduidade text NOT NULL,
  disciplina text NOT NULL,
  iniciativa text NOT NULL,
  produtividade text NOT NULL,
  responsabilidade text NOT NULL,
  competencias_destaque text,
  competencias_ajustes text,
  acoes_adequacao text,
  outros_comentarios text,
  resultado text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.avaliacoes_historico (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  avaliacao_id uuid,
  prontuario_id uuid NOT NULL,
  acao text NOT NULL,
  dados_anteriores jsonb,
  dados_novos jsonb,
  executado_por uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.avaliacoes_prontuarios (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  prontuario_id uuid,
  saida_prontuario_id uuid,
  avaliador_id uuid,
  status text NOT NULL DEFAULT 'em_andamento'::text,
  observacoes text,
  data_inicio timestamp with time zone NOT NULL DEFAULT now(),
  data_conclusao timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  unidade_setor text,
  identificacao_paciente text,
  identificacao_paciente_obs text,
  acolhimento_triagem text,
  acolhimento_triagem_obs text,
  atendimento_medico text,
  atendimento_medico_obs text,
  documentacao_medica_cfm text,
  documentacao_medica_cfm_obs text,
  enfermagem_medicacao text,
  enfermagem_medicacao_obs text,
  paciente_internado text,
  paciente_internado_obs text,
  resultado_final text,
  comentarios_finais text,
  paciente_nome text,
  numero_prontuario text,
  is_finalizada boolean NOT NULL DEFAULT false
);

CREATE TABLE public.banco_horas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  funcionario_user_id uuid NOT NULL,
  funcionario_nome text NOT NULL,
  data date NOT NULL,
  tipo text NOT NULL,
  horas numeric(5,2) NOT NULL,
  motivo text,
  observacao text,
  registrado_por uuid NOT NULL,
  aprovado_por uuid,
  aprovado_em timestamp with time zone,
  status text NOT NULL DEFAULT 'pendente'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.bed_records (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  bed_id text NOT NULL,
  bed_number text NOT NULL,
  sector text NOT NULL,
  patient_name text,
  hipotese_diagnostica text,
  condutas_outros text,
  observacao text,
  data_nascimento date,
  data_internacao date,
  sus_facil text,
  numero_sus_facil text,
  motivo_alta text,
  estabelecimento_transferencia text,
  data_alta date,
  shift_type text NOT NULL,
  shift_date date NOT NULL,
  medicos text,
  enfermeiros text,
  regulador_nir text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.cadastros_inconsistentes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  prontuario_id uuid,
  numero_prontuario text,
  tipo_inconsistencia text NOT NULL,
  descricao text NOT NULL,
  status text NOT NULL DEFAULT 'pendente'::text,
  registrado_por uuid,
  resolvido_por uuid,
  resolvido_em timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  paciente_nome text,
  resolvido_por_nome text
);

CREATE TABLE public.cafe_litro_diario (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  data date NOT NULL,
  quantidade_litros numeric(10,2) NOT NULL DEFAULT 0,
  registrado_por uuid NOT NULL,
  observacao text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.cardapios (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  data date NOT NULL,
  tipo_refeicao text NOT NULL,
  descricao text NOT NULL,
  observacoes text,
  criado_por uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.cargos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  ativo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.chamados (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  numero_chamado text NOT NULL,
  titulo text NOT NULL,
  descricao text NOT NULL,
  categoria text NOT NULL,
  prioridade text NOT NULL DEFAULT 'media'::text,
  status text NOT NULL DEFAULT 'aberto'::text,
  solicitante_id uuid NOT NULL,
  solicitante_nome text NOT NULL,
  solicitante_setor text,
  atribuido_para uuid,
  data_abertura timestamp with time zone NOT NULL DEFAULT now(),
  data_resolucao timestamp with time zone,
  solucao text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  prazo_conclusao timestamp with time zone
);

CREATE TABLE public.chamados_comentarios (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  chamado_id uuid NOT NULL,
  usuario_id uuid NOT NULL,
  usuario_nome text NOT NULL,
  comentario text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.chamados_materiais (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  chamado_id uuid NOT NULL,
  produto_id uuid NOT NULL,
  quantidade integer NOT NULL,
  registrado_por uuid NOT NULL,
  observacao text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.chat_conversas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nome character varying(100) NOT NULL,
  descricao text,
  tipo character varying(20) NOT NULL DEFAULT 'grupo'::character varying,
  criado_por uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.chat_mensagens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  conversa_id uuid NOT NULL,
  remetente_id uuid NOT NULL,
  conteudo text NOT NULL,
  tipo character varying(20) NOT NULL DEFAULT 'texto'::character varying,
  arquivo_url text,
  editado boolean DEFAULT false,
  excluido boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.chat_mensagens_lidas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  mensagem_id uuid NOT NULL,
  user_id uuid NOT NULL,
  lido_em timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.chat_moderacao_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  mensagem_id uuid,
  user_id uuid NOT NULL,
  tipo_violacao character varying(50) NOT NULL,
  conteudo_original text,
  acao_tomada character varying(50) NOT NULL,
  detalhes jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.chat_participantes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  conversa_id uuid NOT NULL,
  user_id uuid NOT NULL,
  adicionado_por uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.colaboradores_restaurante (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  matricula text,
  setor text,
  cargo text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.controle_vigencia (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  categoria text NOT NULL,
  tipo_documento text NOT NULL,
  descricao text NOT NULL,
  referencia_id uuid,
  referencia_nome text,
  data_emissao date,
  data_validade date NOT NULL,
  arquivo_url text,
  setor_responsavel text,
  bloqueio_operacional boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE TABLE public.daily_statistics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  date date NOT NULL,
  total_patients integer DEFAULT 0,
  patients_by_sector jsonb DEFAULT '{}'::jsonb,
  admissions integer DEFAULT 0,
  discharges integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.disc_results (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nome_completo text NOT NULL,
  cargo_atual text NOT NULL,
  setor text NOT NULL,
  tempo_atuacao text NOT NULL,
  formacao text NOT NULL,
  experiencia_lideranca text NOT NULL,
  score_d integer NOT NULL DEFAULT 0,
  score_i integer NOT NULL DEFAULT 0,
  score_s integer NOT NULL DEFAULT 0,
  score_c integer NOT NULL DEFAULT 0,
  perfil_predominante text NOT NULL,
  perfil_secundario text NOT NULL,
  leadership_score integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE TABLE public.enfermagem_configuracoes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  chave text NOT NULL,
  valor text NOT NULL,
  descricao text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.enfermagem_escalas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  profissional_id uuid NOT NULL,
  profissional_nome text NOT NULL,
  setor text NOT NULL,
  data_plantao date NOT NULL,
  hora_inicio time without time zone NOT NULL,
  hora_fim time without time zone NOT NULL,
  tipo_plantao text NOT NULL,
  status text NOT NULL DEFAULT 'confirmado'::text,
  observacoes text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  profissional_saude_id uuid
);

CREATE TABLE public.enfermagem_trocas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  escala_id uuid NOT NULL,
  ofertante_id uuid NOT NULL,
  ofertante_nome text NOT NULL,
  aceitante_id uuid,
  aceitante_nome text,
  motivo_oferta text,
  status text NOT NULL DEFAULT 'aberta'::text,
  requer_aprovacao boolean NOT NULL DEFAULT true,
  aprovador_id uuid,
  aprovador_nome text,
  data_aprovacao timestamp with time zone,
  justificativa_rejeicao text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.enfermagem_trocas_historico (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  troca_id uuid NOT NULL,
  acao text NOT NULL,
  executado_por uuid NOT NULL,
  executado_por_nome text NOT NULL,
  detalhes jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.entregas_prontuarios (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  entregador_id uuid NOT NULL,
  entregador_nome text NOT NULL,
  setor_origem text NOT NULL,
  setor_destino text NOT NULL,
  responsavel_recebimento_id uuid,
  responsavel_recebimento_nome text NOT NULL,
  data_hora timestamp with time zone NOT NULL DEFAULT now(),
  observacao text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.entregas_prontuarios_itens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  entrega_id uuid NOT NULL,
  saida_prontuario_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.epis_seguranca (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL,
  usuario_nome text NOT NULL,
  tipo_epi text NOT NULL,
  ca_numero text,
  quantidade integer NOT NULL DEFAULT 1,
  data_entrega date NOT NULL,
  data_validade date,
  status text NOT NULL DEFAULT 'em_uso'::text,
  observacao text,
  registrado_por uuid NOT NULL,
  registrado_por_nome text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.escala_tec_enf_dias (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  profissional_id uuid NOT NULL,
  dia integer NOT NULL,
  setor_codigo text NOT NULL DEFAULT ''::text
);

CREATE TABLE public.escala_tec_enf_profissionais (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  escala_id uuid NOT NULL,
  nome text NOT NULL,
  coren text NOT NULL,
  horario text NOT NULL,
  grupo text NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  profissional_saude_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.escalas_laboratorio (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  mes integer NOT NULL,
  ano integer NOT NULL,
  funcionario_nome text NOT NULL,
  funcionario_id uuid,
  dia integer NOT NULL,
  turno text NOT NULL,
  observacao text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.escalas_medicos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  profissional_id uuid NOT NULL,
  data_plantao date NOT NULL,
  hora_inicio time without time zone NOT NULL,
  hora_fim time without time zone NOT NULL,
  setor text NOT NULL,
  tipo_plantao text NOT NULL DEFAULT 'regular'::text,
  status text NOT NULL DEFAULT 'confirmado'::text,
  observacoes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE TABLE public.escalas_tec_enfermagem (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  mes integer NOT NULL,
  ano integer NOT NULL,
  titulo text DEFAULT 'ESCALA DE SERVIÇO DE TECNICO DE ENFERMAGEM'::text,
  unidade text DEFAULT 'UNIDADE DE PRONTO ATENDIMENTO ANTONIO JOSE DOS SANTOS'::text,
  legenda jsonb DEFAULT '{"A": "ACOLHIMENTO", "I": "INTERNAÇÃO", "S": "SUTURA", "T": "TRANSPORTE", "U": "URGÊNCIA", "AF": "AFASTAMENTO JUSTIFICADO", "M1": "MEDICAÇÃO / ACOLHIMENTO", "M2": "LAB / MEDICAÇÃO", "C/M": "CME / MEDICAÇÃO", "CME": "CME", "LAB": "LABORATÓRIO"}'::jsonb,
  mensagem_motivacional text,
  coordenadora_nome text,
  coordenadora_coren text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  tipo text NOT NULL DEFAULT 'tecnicos'::text
);

CREATE TABLE public.ferramentas_modulo (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  modulo_id uuid,
  codigo text NOT NULL,
  nome text NOT NULL,
  descricao text,
  ordem integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.formulario_campos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  formulario_id uuid NOT NULL,
  tipo text NOT NULL,
  label text NOT NULL,
  obrigatorio boolean DEFAULT false,
  opcoes text[],
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.formulario_permissoes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  formulario_id uuid NOT NULL,
  tipo_permissao text NOT NULL,
  valor text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.formulario_respostas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  formulario_id uuid NOT NULL,
  respondido_por uuid,
  respondido_em timestamp with time zone NOT NULL DEFAULT now(),
  respostas jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.formularios (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descricao text,
  prazo date,
  status text NOT NULL DEFAULT 'rascunho'::text,
  criado_por uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.gerencia_fornecedores (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cnpj text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.gerencia_notas_fiscais (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  fornecedor_id uuid,
  fornecedor_nome text NOT NULL,
  cnpj text NOT NULL DEFAULT ''::text,
  competencia text NOT NULL,
  ano integer NOT NULL DEFAULT 2026,
  numero_nf text NOT NULL DEFAULT ''::text,
  data_recebimento date,
  status text NOT NULL DEFAULT 'LANÇADO'::text,
  data_envio date,
  status_pagamento text NOT NULL DEFAULT 'PENDENTE'::text,
  valor_nota numeric(12,2) NOT NULL DEFAULT 0,
  observacao text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.gerencia_planos_acao (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descricao text,
  setor text NOT NULL,
  responsavel_id uuid,
  responsavel_nome text NOT NULL,
  status text NOT NULL DEFAULT 'pendente'::text,
  prioridade text NOT NULL DEFAULT 'media'::text,
  data_criacao timestamp with time zone NOT NULL DEFAULT now(),
  prazo timestamp with time zone NOT NULL,
  data_conclusao timestamp with time zone,
  observacoes text,
  ultima_atualizacao_por text,
  ultima_atualizacao_em timestamp with time zone DEFAULT now(),
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.gerencia_planos_historico (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  plano_id uuid NOT NULL,
  acao text NOT NULL,
  detalhes text,
  executado_por uuid,
  executado_por_nome text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.gestor_cargos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  gestor_user_id uuid NOT NULL,
  cargo_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid
);

CREATE TABLE public.gestor_setores (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  gestor_user_id uuid NOT NULL,
  setor_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid
);

CREATE TABLE public.incidentes_nsp (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  numero_notificacao text NOT NULL,
  tipo_incidente text NOT NULL,
  data_ocorrencia timestamp with time zone NOT NULL,
  local_ocorrencia text NOT NULL,
  setor text NOT NULL,
  descricao text NOT NULL,
  classificacao_risco text NOT NULL,
  status text NOT NULL DEFAULT 'notificado'::text,
  notificador_id uuid,
  notificador_nome text,
  notificacao_anonima boolean DEFAULT false,
  paciente_envolvido boolean DEFAULT false,
  paciente_nome text,
  paciente_prontuario text,
  observacoes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  setor_origem text,
  categoria_operacional text
);

CREATE TABLE public.justificativas_atraso (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  auditoria_id uuid NOT NULL,
  responsavel_nome text NOT NULL,
  responsavel_id uuid,
  motivo text NOT NULL,
  acao_corretiva text NOT NULL,
  prazo_correcao date,
  status text NOT NULL DEFAULT 'pendente'::text,
  aprovado_por uuid,
  aprovado_por_nome text,
  aprovado_em timestamp with time zone,
  observacao_gerencia text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.justificativas_extensao_jornada (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  colaborador_user_id uuid NOT NULL,
  colaborador_nome text NOT NULL,
  colaborador_cargo text,
  colaborador_setor text,
  data_extensao date NOT NULL,
  hora_inicio_extra text NOT NULL,
  hora_fim_extra text NOT NULL,
  minutos_extras integer NOT NULL DEFAULT 0,
  motivo text NOT NULL,
  justificativa text NOT NULL,
  status text NOT NULL DEFAULT 'pendente'::text,
  aprovado_por uuid,
  aprovado_por_nome text,
  aprovado_em timestamp with time zone,
  observacao_aprovador text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.justificativas_ponto (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  unidade text NOT NULL DEFAULT 'UPA ANTONIO JOSE DOS SANTOS'::text,
  setor text,
  colaborador_nome text NOT NULL,
  cargo_funcao text,
  matricula text,
  colaborador_user_id uuid,
  data_ocorrencia date NOT NULL,
  jornada_contratual_entrada time without time zone,
  jornada_contratual_saida time without time zone,
  jornada_registrada_entrada time without time zone,
  jornada_registrada_saida time without time zone,
  minutos_excedentes integer DEFAULT 0,
  justificativa text,
  observacoes text,
  registrado_por uuid,
  registrado_por_nome text,
  status text NOT NULL DEFAULT 'pendente'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  aprovado_por uuid,
  aprovado_por_nome text,
  aprovado_em timestamp with time zone,
  justificativa_aprovacao text
);

CREATE TABLE public.lms_inscricoes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  treinamento_id uuid NOT NULL,
  usuario_id uuid NOT NULL,
  usuario_nome text NOT NULL,
  setor text,
  status text NOT NULL DEFAULT 'pendente'::text,
  nota numeric,
  data_conclusao timestamp with time zone,
  material_acessado_em timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.lms_materiais (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  treinamento_id uuid NOT NULL,
  titulo text NOT NULL,
  tipo text NOT NULL DEFAULT 'pdf'::text,
  url text,
  descricao text,
  ordem integer DEFAULT 0,
  criado_por uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.lms_quiz_perguntas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  treinamento_id uuid NOT NULL,
  pergunta text NOT NULL,
  opcao_a text NOT NULL,
  opcao_b text NOT NULL,
  opcao_c text NOT NULL,
  opcao_d text NOT NULL,
  resposta_correta text NOT NULL,
  ordem integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.lms_tentativas_quiz (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  inscricao_id uuid NOT NULL,
  treinamento_id uuid NOT NULL,
  usuario_id uuid NOT NULL,
  respostas jsonb NOT NULL DEFAULT '{}'::jsonb,
  acertos integer NOT NULL DEFAULT 0,
  total_perguntas integer NOT NULL DEFAULT 0,
  nota numeric NOT NULL DEFAULT 0,
  aprovado boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.lms_treinamentos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descricao text,
  objetivo text,
  tipo_treinamento text NOT NULL DEFAULT 'Conhecimento'::text,
  metodo_identificacao text,
  competencia text,
  indicador_competencia text,
  instrutor text,
  carga_horaria text,
  setor_responsavel text,
  setores_alvo text[] DEFAULT '{}'::text[],
  publico_alvo text,
  data_limite date,
  mes_planejado integer,
  ano integer DEFAULT 2026,
  status text NOT NULL DEFAULT 'planejado'::text,
  nota_minima_aprovacao numeric DEFAULT 70,
  criado_por uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.logs_acesso (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  acao text NOT NULL,
  modulo text NOT NULL,
  detalhes jsonb,
  ip_address text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.logs_permissoes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  acao text NOT NULL,
  entidade_tipo text,
  entidade_id uuid,
  dados_anteriores jsonb,
  dados_novos jsonb,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.manutencoes_execucoes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  preventiva_id uuid,
  ativo_id uuid NOT NULL,
  tipo text NOT NULL DEFAULT 'preventiva'::text,
  descricao text NOT NULL,
  data_execucao date NOT NULL DEFAULT CURRENT_DATE,
  executado_por uuid,
  executado_por_nome text NOT NULL,
  tempo_parado_horas numeric(5,2) DEFAULT 0,
  pecas_utilizadas text,
  custo numeric(12,2) DEFAULT 0,
  observacoes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.manutencoes_preventivas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ativo_id uuid NOT NULL,
  descricao text NOT NULL,
  periodicidade_dias integer NOT NULL,
  ultima_execucao date,
  proxima_execucao date,
  responsavel_nome text,
  status text NOT NULL DEFAULT 'programada'::text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.modulos_sistema (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  codigo text NOT NULL,
  nome text NOT NULL,
  descricao text,
  icone text DEFAULT 'Box'::text,
  ordem integer DEFAULT 0,
  ativo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.movimentacoes_estoque (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  produto_id uuid NOT NULL,
  tipo text NOT NULL,
  quantidade integer NOT NULL,
  quantidade_anterior integer NOT NULL,
  quantidade_nova integer NOT NULL,
  motivo text,
  observacao text,
  usuario_id uuid NOT NULL,
  setor text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.nir_colaboradores (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE TABLE public.nir_registros_producao (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  colaborador text NOT NULL,
  atividade text NOT NULL,
  quantidade integer NOT NULL DEFAULT 1,
  observacao text DEFAULT ''::text,
  data date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE TABLE public.notificacoes_pendencias (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  pendencia_id uuid NOT NULL,
  destinatario_id uuid NOT NULL,
  titulo text NOT NULL,
  mensagem text NOT NULL,
  lida boolean NOT NULL DEFAULT false,
  respondida boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.notificacoes_seguranca (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ronda_id uuid,
  tipo_notificacao text NOT NULL,
  descricao text NOT NULL,
  setor text NOT NULL,
  responsavel_notificado text,
  prioridade text NOT NULL DEFAULT 'media'::text,
  status text NOT NULL DEFAULT 'pendente'::text,
  resolvido_em timestamp with time zone,
  resolvido_por uuid,
  resolvido_por_nome text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.nsp_action_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  indicator_id uuid,
  mes text NOT NULL,
  ano integer NOT NULL,
  analise_critica text,
  fator_causa text,
  plano_acao text,
  responsavel text,
  prazo text,
  status text NOT NULL DEFAULT 'Pendente'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.nsp_indicators (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  mes text NOT NULL,
  ano integer NOT NULL,
  categoria text NOT NULL,
  subcategoria text,
  indicador text NOT NULL,
  valor_numero numeric,
  valor_percentual numeric,
  meta numeric,
  unidade_medida text NOT NULL DEFAULT 'Nº'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.passagem_plantao (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  shift_date text NOT NULL,
  shift_type text NOT NULL,
  colaborador_saida_id uuid,
  colaborador_saida_nome text NOT NULL,
  data_hora_conclusao timestamp with time zone NOT NULL DEFAULT now(),
  colaborador_entrada_id uuid,
  colaborador_entrada_nome text,
  data_hora_assuncao timestamp with time zone,
  justificativa text,
  tempo_troca_minutos numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  pendencias text,
  pendencias_encontradas text,
  pendencias_resolvidas text
);

CREATE TABLE public.passagem_plantao_pendencias (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  passagem_id uuid NOT NULL,
  descricao text NOT NULL,
  registrado_por_id uuid,
  registrado_por_nome text NOT NULL,
  destinatario_id uuid,
  destinatario_nome text,
  data_hora_registro timestamp with time zone NOT NULL DEFAULT now(),
  data_hora_resolucao timestamp with time zone,
  resolvido_por_id uuid,
  resolvido_por_nome text,
  status text NOT NULL DEFAULT 'pendente'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.pedidos_compra (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  produto_id uuid,
  ativo_id uuid,
  setor_solicitante text NOT NULL,
  solicitante_id uuid,
  solicitante_nome text NOT NULL,
  item_nome text NOT NULL,
  item_descricao text,
  quantidade_solicitada integer NOT NULL DEFAULT 1,
  unidade_medida text DEFAULT 'UN'::text,
  justificativa text NOT NULL,
  urgencia text NOT NULL DEFAULT 'media'::text,
  status text NOT NULL DEFAULT 'pendente'::text,
  aprovado_por text,
  aprovado_em timestamp with time zone,
  observacoes_gerencia text,
  data_estimada_entrega date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  arquivo_url text,
  arquivo_nome text,
  encaminhado_almoxarifado boolean DEFAULT false,
  encaminhado_em timestamp with time zone
);

CREATE TABLE public.perfis_sistema (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  cor text DEFAULT '#6b7280'::text,
  icone text DEFAULT 'Shield'::text,
  is_sistema boolean DEFAULT false,
  is_master boolean DEFAULT false,
  ordem integer DEFAULT 0,
  ativo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid
);

CREATE TABLE public.permissoes_ferramenta (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  perfil_id uuid,
  ferramenta_id uuid,
  permitido boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.permissoes_perfil (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  perfil_id uuid,
  modulo_id uuid,
  pode_visualizar boolean DEFAULT false,
  pode_acessar boolean DEFAULT false,
  comportamento_sem_acesso text DEFAULT 'ocultar'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.planos_acao_auditoria (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  achado_id uuid NOT NULL,
  descricao text NOT NULL,
  responsavel_nome text NOT NULL,
  prazo date NOT NULL,
  status text NOT NULL DEFAULT 'pendente'::text,
  data_conclusao date,
  eficacia_verificada boolean DEFAULT false,
  observacoes text,
  registrado_por uuid,
  registrado_por_nome text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.porta_ecg_atendimentos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  competence_month integer NOT NULL,
  competence_year integer NOT NULL,
  record_number text NOT NULL,
  patient_name text,
  sex text NOT NULL DEFAULT 'masculino'::text,
  age integer NOT NULL DEFAULT 0,
  arrival_time timestamp with time zone NOT NULL,
  ecg_time timestamp with time zone NOT NULL,
  door_to_ecg_minutes integer NOT NULL DEFAULT 0,
  within_goal boolean NOT NULL DEFAULT true,
  goal_minutes integer NOT NULL DEFAULT 10,
  delay_reason text,
  delay_reason_other text,
  conducts text[] DEFAULT '{}'::text[],
  risk_classification text NOT NULL DEFAULT 'amarelo'::text,
  first_doctor_time timestamp with time zone,
  initial_diagnosis text,
  medical_report text,
  action_plan text,
  observations text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.produtos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  codigo text,
  categoria text,
  unidade_medida text DEFAULT 'UN'::text,
  quantidade_minima integer DEFAULT 0,
  quantidade_atual integer DEFAULT 0,
  localizacao text,
  setor_responsavel text NOT NULL,
  ativo boolean DEFAULT true,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  numero_ca text,
  data_validade date
);

CREATE TABLE public.profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  full_name text NOT NULL,
  cargo text,
  setor text,
  telefone text,
  avatar_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  matricula text,
  deve_trocar_senha boolean DEFAULT true
);

CREATE TABLE public.profissionais_documentos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  profissional_id uuid NOT NULL,
  tipo_documento text NOT NULL,
  nome_arquivo text NOT NULL,
  arquivo_url text NOT NULL,
  observacao text,
  uploaded_by uuid,
  uploaded_by_nome text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.profissionais_saude (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  tipo text NOT NULL,
  registro_profissional text,
  especialidade text,
  status text NOT NULL DEFAULT 'ativo'::text,
  user_id uuid,
  telefone text,
  email text,
  observacoes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  coren text
);

CREATE TABLE public.prontuarios (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  numero_prontuario text NOT NULL,
  paciente_nome text NOT NULL,
  paciente_cpf text,
  data_atendimento timestamp with time zone,
  status text NOT NULL DEFAULT 'ativo'::text,
  observacoes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE TABLE public.protocolo_atendimentos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tipo_protocolo text NOT NULL,
  competency text NOT NULL DEFAULT to_char(now(), 'YYYY-MM'::text),
  record_number text NOT NULL,
  patient_name text,
  sex text,
  age integer,
  arrival_time timestamp with time zone NOT NULL,
  ecg_time timestamp with time zone,
  porta_ecg_minutes integer DEFAULT 0,
  within_target boolean DEFAULT false,
  risk_classification text,
  first_doctor_time timestamp with time zone,
  initial_diagnosis text,
  medical_report text,
  action_plan text,
  admin_observations text,
  conduct_medication boolean DEFAULT false,
  conduct_oxygen boolean DEFAULT false,
  conduct_monitoring boolean DEFAULT false,
  conduct_referral boolean DEFAULT false,
  conduct_observation boolean DEFAULT false,
  conduct_transfer boolean DEFAULT false,
  conduct_high_risk boolean DEFAULT false,
  conduct_moderate_risk boolean DEFAULT false,
  conduct_low_risk boolean DEFAULT false,
  troponin_sample1_collection_time timestamp with time zone,
  troponin_sample1_result text,
  troponin_sample1_release_time timestamp with time zone,
  troponin_sample1_collector text,
  troponin_sample2_collection_time timestamp with time zone,
  troponin_sample2_result text,
  troponin_sample2_release_time timestamp with time zone,
  troponin_sample2_collector text,
  troponin_sample3_collection_time timestamp with time zone,
  troponin_sample3_result text,
  troponin_sample3_release_time timestamp with time zone,
  troponin_sample3_collector text,
  pain_location text,
  pain_characteristic text,
  pain_irradiation text,
  pain_association text,
  pain_onset_date text,
  pain_onset_time text,
  pain_duration text,
  pain_referral text,
  thrombolysis_time timestamp with time zone,
  thrombolysis_complication boolean DEFAULT false,
  thrombolysis_conduct text,
  samu_arrival_time timestamp with time zone,
  destination_hospital text,
  thrombolysis_type text,
  sirs_temp_alta boolean DEFAULT false,
  sirs_temp_baixa boolean DEFAULT false,
  sirs_fc_alta boolean DEFAULT false,
  sirs_fr_alta boolean DEFAULT false,
  sirs_leucocitose boolean DEFAULT false,
  sirs_leucopenia boolean DEFAULT false,
  sirs_celulas_jovens boolean DEFAULT false,
  sirs_plaquetas boolean DEFAULT false,
  sirs_lactato boolean DEFAULT false,
  sirs_bilirrubina boolean DEFAULT false,
  sirs_creatinina boolean DEFAULT false,
  disfuncao_pa_baixa boolean DEFAULT false,
  disfuncao_sato2_baixa boolean DEFAULT false,
  disfuncao_consciencia boolean DEFAULT false,
  foco_pulmonar boolean DEFAULT false,
  foco_urinario boolean DEFAULT false,
  foco_abdominal boolean DEFAULT false,
  foco_pele_partes_moles boolean DEFAULT false,
  foco_corrente_sanguinea_cateter boolean DEFAULT false,
  foco_sem_foco_definido boolean DEFAULT false,
  necessidade_uti boolean DEFAULT false,
  kit_sepse_coletado boolean DEFAULT false,
  lab_villac_horario_chamado timestamp with time zone,
  lab_villac_horario_coleta timestamp with time zone,
  sepse_suspeita boolean DEFAULT false,
  sepse_motivo text,
  sepse_horario timestamp with time zone,
  sepse_medico text,
  protocol_opened_at timestamp with time zone,
  protocol_opened_by_sector text,
  vital_pa text,
  vital_fc integer,
  vital_fr integer,
  vital_spo2 numeric,
  vital_temperatura numeric,
  atb1_nome text,
  atb1_data text,
  atb1_dose text,
  atb1_horario_inicio timestamp with time zone,
  atb2_nome text,
  atb2_data text,
  atb2_dose text,
  atb2_horario_inicio timestamp with time zone,
  atb_profissional text,
  choque_septico boolean DEFAULT false,
  choque_reposicao_data_hora timestamp with time zone,
  choque_reposicao_medicamento text,
  choque_vasopressor_data_hora timestamp with time zone,
  choque_vasopressor_medicamento text,
  choque_lactato2_data_hora timestamp with time zone,
  choque_lactato3_necessita boolean DEFAULT false,
  choque_lactato3_data_hora timestamp with time zone,
  choque_lactato3_medicamento_data_hora timestamp with time zone,
  choque_lactato3_medicamento text,
  destino_paciente text,
  destino_instituicao_nome text,
  assinatura_enfermeiro text,
  assinatura_medico text,
  assinatura_farmacia text,
  delay_reason text,
  delay_reason_other text,
  created_by uuid,
  updated_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  investigation_name text,
  investigation_status text,
  attachment_path text,
  achados_clinicos jsonb DEFAULT '[]'::jsonb,
  achados_neurologicos jsonb DEFAULT '[]'::jsonb
);

CREATE TABLE public.protocolo_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tipo_protocolo text NOT NULL,
  meta_minutos integer NOT NULL DEFAULT 10,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.refeicoes_registros (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tipo_pessoa text NOT NULL,
  colaborador_user_id uuid,
  colaborador_nome text NOT NULL,
  visitante_cpf_hash text,
  tipo_refeicao text NOT NULL,
  data_registro date NOT NULL DEFAULT CURRENT_DATE,
  hora_registro time without time zone NOT NULL DEFAULT CURRENT_TIME,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.regulacao_sus_facil (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  numero_solicitacao text NOT NULL,
  tipo text NOT NULL,
  status text NOT NULL DEFAULT 'pendente'::text,
  paciente_nome text NOT NULL,
  paciente_idade integer,
  paciente_sexo text,
  hipotese_diagnostica text,
  cid text,
  quadro_clinico text,
  procedimentos_necessarios text,
  estabelecimento_origem text,
  estabelecimento_destino text,
  setor_destino text,
  leito_destino text,
  telefone_contato text,
  medico_solicitante text,
  regulador_responsavel text,
  justificativa_negativa text,
  observacoes text,
  prioridade text DEFAULT 'media'::text,
  data_solicitacao timestamp with time zone NOT NULL DEFAULT now(),
  data_resposta timestamp with time zone,
  data_efetivacao timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid
);

CREATE TABLE public.reunioes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  pauta text,
  participantes uuid[] DEFAULT '{}'::uuid[],
  transcricao text,
  ata_gerada jsonb,
  gravacao_url text,
  status text NOT NULL DEFAULT 'agendada'::text,
  criado_por uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  hora_inicio timestamp with time zone,
  hora_encerramento timestamp with time zone
);

CREATE TABLE public.rh_movimentacoes_setor (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  colaborador_nome text NOT NULL,
  colaborador_matricula text,
  cargo text NOT NULL,
  setor_anterior text NOT NULL,
  setor_novo text NOT NULL,
  data_mudanca date NOT NULL DEFAULT CURRENT_DATE,
  motivo text,
  aprovado_por text,
  observacoes text,
  registrado_por uuid,
  registrado_por_nome text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.rh_ocorrencias_disciplinares (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  colaborador_nome text NOT NULL,
  colaborador_matricula text,
  setor text,
  tipo_ocorrencia text NOT NULL,
  data_ocorrencia date NOT NULL DEFAULT CURRENT_DATE,
  descricao text NOT NULL,
  testemunhas text,
  medida_aplicada text,
  data_medida date,
  observacoes text,
  registrado_por uuid,
  registrado_por_nome text NOT NULL,
  status text NOT NULL DEFAULT 'pendente'::text,
  resolvido_por uuid,
  resolvido_por_nome text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.riscos_operacionais (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descricao text NOT NULL,
  setor text NOT NULL,
  categoria text NOT NULL DEFAULT 'operacional'::text,
  probabilidade integer NOT NULL DEFAULT 1,
  impacto integer NOT NULL DEFAULT 1,
  grau_risco integer NOT NULL DEFAULT 1,
  acao_mitigacao text,
  status text NOT NULL DEFAULT 'identificado'::text,
  registrado_por uuid,
  registrado_por_nome text NOT NULL,
  resolvido_por uuid,
  resolvido_por_nome text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.rondas_seguranca (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  data_ronda date NOT NULL DEFAULT CURRENT_DATE,
  hora_ronda time without time zone NOT NULL DEFAULT CURRENT_TIME,
  responsavel_id uuid NOT NULL,
  responsavel_nome text NOT NULL,
  setor text NOT NULL,
  checklist jsonb NOT NULL DEFAULT '{}'::jsonb,
  observacoes text,
  status text NOT NULL DEFAULT 'em_andamento'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.rouparia_categorias (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  estoque_minimo integer DEFAULT 0,
  ativo boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.rouparia_itens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  codigo_barras text NOT NULL,
  categoria_id uuid NOT NULL,
  descricao text,
  quantidade_atual integer NOT NULL DEFAULT 0,
  ativo boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.rouparia_movimentacoes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL,
  tipo_movimentacao text NOT NULL,
  quantidade integer NOT NULL,
  quantidade_anterior integer NOT NULL,
  quantidade_nova integer NOT NULL,
  setor_destino text,
  setor_origem text,
  observacao text,
  registrado_por uuid NOT NULL,
  registrado_por_nome text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  responsavel_retirada text,
  responsavel_devolucao text
);

CREATE TABLE public.saida_prontuarios (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  prontuario_id uuid,
  numero_prontuario text,
  registrado_recepcao_por uuid,
  registrado_recepcao_em timestamp with time zone,
  validado_classificacao_por uuid,
  validado_classificacao_em timestamp with time zone,
  existe_fisicamente boolean,
  observacao_classificacao text,
  conferido_nir_por uuid,
  conferido_nir_em timestamp with time zone,
  observacao_nir text,
  status text NOT NULL DEFAULT 'aguardando_classificacao'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  paciente_nome text,
  nascimento_mae date,
  data_atendimento date,
  is_folha_avulsa boolean DEFAULT false,
  possui_carimbo_medico boolean DEFAULT false,
  cadastro_conferido boolean DEFAULT false,
  checklist_validacao jsonb,
  pendencia_resolvida_em timestamp with time zone,
  pendencia_resolvida_por uuid
);

CREATE TABLE public.sciras_antimicrobianos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  paciente_nome text NOT NULL,
  numero_prontuario text,
  setor text NOT NULL,
  antimicrobiano text NOT NULL,
  dose text NOT NULL,
  via_administracao text NOT NULL,
  data_inicio date NOT NULL,
  data_fim date,
  dias_uso integer,
  indicacao text,
  justificativa text,
  cultura_id uuid,
  status text DEFAULT 'em_uso'::text,
  prescrito_por text,
  registrado_por uuid NOT NULL,
  registrado_por_nome text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.sciras_culturas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  vigilancia_iras_id uuid,
  paciente_nome text NOT NULL,
  numero_prontuario text,
  setor text NOT NULL,
  data_coleta date NOT NULL,
  tipo_material text NOT NULL,
  microrganismo_isolado text,
  perfil_sensibilidade jsonb DEFAULT '{}'::jsonb,
  multirresistente boolean DEFAULT false,
  mecanismo_resistencia text,
  resultado text DEFAULT 'pendente'::text,
  observacoes text,
  registrado_por uuid NOT NULL,
  registrado_por_nome text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.sciras_indicadores_diarios (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  data_registro date NOT NULL,
  setor text NOT NULL,
  pacientes_dia integer NOT NULL DEFAULT 0,
  cvc_dia integer NOT NULL DEFAULT 0,
  svd_dia integer NOT NULL DEFAULT 0,
  vm_dia integer NOT NULL DEFAULT 0,
  ipcs_novas integer NOT NULL DEFAULT 0,
  itu_novas integer NOT NULL DEFAULT 0,
  pav_novas integer NOT NULL DEFAULT 0,
  registrado_por uuid NOT NULL,
  registrado_por_nome text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.sciras_notificacoes_epidemiologicas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  numero_notificacao text NOT NULL,
  tipo text NOT NULL,
  doenca_agravo text NOT NULL,
  data_notificacao date NOT NULL DEFAULT CURRENT_DATE,
  paciente_nome text,
  numero_prontuario text,
  setor text NOT NULL,
  descricao text NOT NULL,
  medidas_controle text,
  notificado_anvisa boolean DEFAULT false,
  notificado_vigilancia_municipal boolean DEFAULT false,
  data_notificacao_externa date,
  status text DEFAULT 'aberta'::text,
  desfecho text,
  notificador_id uuid NOT NULL,
  notificador_nome text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.sciras_vigilancia_iras (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  numero_notificacao text NOT NULL,
  paciente_nome text NOT NULL,
  numero_prontuario text,
  data_nascimento date,
  setor text NOT NULL,
  leito text,
  data_internacao date,
  data_infeccao date NOT NULL,
  sitio_infeccao text NOT NULL,
  tipo_iras text NOT NULL,
  dispositivo_invasivo text,
  data_instalacao_dispositivo date,
  data_remocao_dispositivo date,
  microrganismo text,
  perfil_resistencia text,
  classificacao_gravidade text DEFAULT 'moderado'::text,
  status text DEFAULT 'em_investigacao'::text,
  observacoes text,
  notificador_id uuid,
  notificador_nome text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.seg_patrimonial_conflitos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nome_envolvido text NOT NULL,
  setor text NOT NULL,
  grau_agressividade text NOT NULL DEFAULT 'baixo'::text,
  descricao text NOT NULL,
  desfecho text,
  status text NOT NULL DEFAULT 'aberto'::text,
  registrado_por uuid NOT NULL,
  registrado_por_nome text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.seg_patrimonial_danos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tipo_dano text NOT NULL,
  local_dano text NOT NULL,
  descricao text NOT NULL,
  urgencia text NOT NULL DEFAULT 'media'::text,
  foto_url text,
  status text NOT NULL DEFAULT 'pendente'::text,
  encaminhado_manutencao boolean DEFAULT false,
  registrado_por uuid NOT NULL,
  registrado_por_nome text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.seg_patrimonial_passagem_plantao (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  turno_saida text NOT NULL,
  turno_entrada text NOT NULL,
  relato text NOT NULL,
  pontos_atencao text,
  usuario_saida_id uuid NOT NULL,
  usuario_saida_nome text NOT NULL,
  lido_por uuid,
  lido_por_nome text,
  lido_em timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.seg_patrimonial_rondas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  setor text NOT NULL,
  observacoes text,
  infraestrutura_ok boolean DEFAULT true,
  detalhes_infraestrutura text,
  usuario_id uuid NOT NULL,
  usuario_nome text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.seg_patrimonial_visitantes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nome_visitante text NOT NULL,
  documento text,
  paciente_nome text NOT NULL,
  numero_prontuario text,
  setor_leito text NOT NULL,
  parentesco text,
  hora_entrada timestamp with time zone NOT NULL DEFAULT now(),
  hora_saida timestamp with time zone,
  registrado_por uuid NOT NULL,
  registrado_por_nome text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.setores (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  ativo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.shift_configurations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  shift_date date NOT NULL,
  shift_type text NOT NULL,
  medicos text,
  enfermeiros text,
  regulador_nir text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.solicitacoes_dieta (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  solicitante_id uuid NOT NULL,
  solicitante_nome text NOT NULL,
  tipo_dieta text NOT NULL,
  descricao_especifica text,
  data_inicio date NOT NULL,
  data_fim date,
  status text NOT NULL DEFAULT 'aprovada'::text,
  observacoes text,
  aprovado_por uuid,
  aprovado_em timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  paciente_nome text,
  paciente_data_nascimento date,
  quarto_leito text,
  tem_acompanhante boolean DEFAULT false,
  restricoes_alimentares text,
  horarios_refeicoes text[] DEFAULT ARRAY['cafe'::text, 'almoco'::text, 'lanche'::text, 'jantar'::text],
  entregue boolean NOT NULL DEFAULT false
);

CREATE TABLE public.tentativas_duplicidade_refeicoes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tipo_pessoa text NOT NULL,
  colaborador_nome text NOT NULL,
  visitante_cpf_hash text,
  tipo_refeicao text NOT NULL,
  data_tentativa date NOT NULL,
  hora_tentativa time without time zone NOT NULL,
  registro_original_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.transferencia_coordenadas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  solicitacao_id uuid NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  registrado_em timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.transferencia_intercorrencias (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  solicitacao_id uuid NOT NULL,
  descricao text NOT NULL,
  registrado_por uuid,
  registrado_por_nome text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.transferencia_solicitacoes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  paciente_nome text NOT NULL,
  setor_origem text NOT NULL,
  destino text NOT NULL,
  motivo text,
  prioridade text NOT NULL DEFAULT 'normal'::text,
  status text NOT NULL DEFAULT 'pendente'::text,
  veiculo_id uuid,
  hora_saida timestamp with time zone,
  hora_chegada timestamp with time zone,
  solicitado_por uuid,
  solicitado_por_nome text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  motorista_nome text,
  veiculo_placa text,
  veiculo_tipo text,
  km_rodados numeric
);

CREATE TABLE public.transferencia_veiculos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  placa text NOT NULL,
  tipo text NOT NULL DEFAULT 'ambulancia'::text,
  motorista_nome text NOT NULL,
  status text NOT NULL DEFAULT 'disponivel'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.uniformes_seguranca (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL,
  usuario_nome text NOT NULL,
  tipo_uniforme text NOT NULL,
  tamanho text NOT NULL,
  quantidade integer NOT NULL DEFAULT 1,
  data_entrega date NOT NULL,
  data_devolucao date,
  status text NOT NULL DEFAULT 'entregue'::text,
  observacao text,
  registrado_por uuid NOT NULL,
  registrado_por_nome text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.upa_action_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  indicator_id uuid,
  mes text NOT NULL,
  ano integer NOT NULL,
  analise_critica text,
  fator_causa text,
  plano_acao text,
  responsavel text,
  prazo text,
  status text NOT NULL DEFAULT 'Pendente'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.upa_indicators (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  mes text NOT NULL,
  ano integer NOT NULL,
  categoria text NOT NULL,
  subcategoria text,
  indicador text NOT NULL,
  valor_numero numeric,
  valor_percentual numeric,
  meta numeric,
  unidade_medida text NOT NULL DEFAULT 'Nº'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role app_role NOT NULL DEFAULT 'funcionario'::app_role
);

CREATE TABLE public.usuario_perfil (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  perfil_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid
);

CREATE TABLE public.vacinas_seguranca (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL,
  usuario_nome text NOT NULL,
  tipo_vacina text NOT NULL,
  dose text,
  data_aplicacao date NOT NULL,
  data_proxima_dose date,
  lote text,
  local_aplicacao text,
  status text NOT NULL DEFAULT 'aplicada'::text,
  observacao text,
  registrado_por uuid NOT NULL,
  registrado_por_nome text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.valores_refeicoes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tipo_refeicao text NOT NULL,
  valor numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  atualizado_por uuid
);

-- ====================
-- PRIMARY KEYS
-- ====================
ALTER TABLE public.achados_auditoria ADD CONSTRAINT achados_auditoria_pkey PRIMARY KEY (id);
ALTER TABLE public.acoes_incidentes ADD CONSTRAINT acoes_incidentes_pkey PRIMARY KEY (id);
ALTER TABLE public.agenda_destinatarios ADD CONSTRAINT agenda_destinatarios_pkey PRIMARY KEY (id);
ALTER TABLE public.agenda_items ADD CONSTRAINT agenda_items_pkey PRIMARY KEY (id);
ALTER TABLE public.alertas_seguranca ADD CONSTRAINT alertas_seguranca_pkey PRIMARY KEY (id);
ALTER TABLE public.analises_incidentes ADD CONSTRAINT analises_incidentes_pkey PRIMARY KEY (id);
ALTER TABLE public.asos_seguranca ADD CONSTRAINT asos_seguranca_pkey PRIMARY KEY (id);
ALTER TABLE public.assistencia_social_atendimentos ADD CONSTRAINT assistencia_social_atendimentos_pkey PRIMARY KEY (id);
ALTER TABLE public.assistencia_social_documentos ADD CONSTRAINT assistencia_social_documentos_pkey PRIMARY KEY (id);
ALTER TABLE public.assistencia_social_encaminhamentos ADD CONSTRAINT assistencia_social_encaminhamentos_pkey PRIMARY KEY (id);
ALTER TABLE public.assistencia_social_pacientes ADD CONSTRAINT assistencia_social_pacientes_pkey PRIMARY KEY (id);
ALTER TABLE public.atestados ADD CONSTRAINT atestados_pkey PRIMARY KEY (id);
ALTER TABLE public.ativos ADD CONSTRAINT ativos_pkey PRIMARY KEY (id);
ALTER TABLE public.ativos_disponibilidade ADD CONSTRAINT ativos_disponibilidade_pkey PRIMARY KEY (id);
ALTER TABLE public.auditoria_formularios_config ADD CONSTRAINT auditoria_formularios_config_pkey PRIMARY KEY (id);
ALTER TABLE public.auditoria_perguntas_config ADD CONSTRAINT auditoria_perguntas_config_pkey PRIMARY KEY (id);
ALTER TABLE public.auditoria_secoes_config ADD CONSTRAINT auditoria_secoes_config_pkey PRIMARY KEY (id);
ALTER TABLE public.auditoria_temporalidade ADD CONSTRAINT auditoria_temporalidade_pkey PRIMARY KEY (id);
ALTER TABLE public.auditorias_qualidade ADD CONSTRAINT auditorias_qualidade_pkey PRIMARY KEY (id);
ALTER TABLE public.auditorias_seguranca_paciente ADD CONSTRAINT auditorias_seguranca_paciente_pkey PRIMARY KEY (id);
ALTER TABLE public.avaliacoes_desempenho ADD CONSTRAINT avaliacoes_desempenho_pkey PRIMARY KEY (id);
ALTER TABLE public.avaliacoes_experiencia ADD CONSTRAINT avaliacoes_experiencia_pkey PRIMARY KEY (id);
ALTER TABLE public.avaliacoes_historico ADD CONSTRAINT avaliacoes_historico_pkey PRIMARY KEY (id);
ALTER TABLE public.avaliacoes_prontuarios ADD CONSTRAINT avaliacoes_prontuarios_pkey PRIMARY KEY (id);
ALTER TABLE public.banco_horas ADD CONSTRAINT banco_horas_pkey PRIMARY KEY (id);
ALTER TABLE public.bed_records ADD CONSTRAINT bed_records_pkey PRIMARY KEY (id);
ALTER TABLE public.cadastros_inconsistentes ADD CONSTRAINT cadastros_inconsistentes_pkey PRIMARY KEY (id);
ALTER TABLE public.cafe_litro_diario ADD CONSTRAINT cafe_litro_diario_pkey PRIMARY KEY (id);
ALTER TABLE public.cardapios ADD CONSTRAINT cardapios_pkey PRIMARY KEY (id);
ALTER TABLE public.cargos ADD CONSTRAINT cargos_pkey PRIMARY KEY (id);
ALTER TABLE public.chamados ADD CONSTRAINT chamados_pkey PRIMARY KEY (id);
ALTER TABLE public.chamados_comentarios ADD CONSTRAINT chamados_comentarios_pkey PRIMARY KEY (id);
ALTER TABLE public.chamados_materiais ADD CONSTRAINT chamados_materiais_pkey PRIMARY KEY (id);
ALTER TABLE public.chat_conversas ADD CONSTRAINT chat_conversas_pkey PRIMARY KEY (id);
ALTER TABLE public.chat_mensagens ADD CONSTRAINT chat_mensagens_pkey PRIMARY KEY (id);
ALTER TABLE public.chat_mensagens_lidas ADD CONSTRAINT chat_mensagens_lidas_pkey PRIMARY KEY (id);
ALTER TABLE public.chat_moderacao_logs ADD CONSTRAINT chat_moderacao_logs_pkey PRIMARY KEY (id);
ALTER TABLE public.chat_participantes ADD CONSTRAINT chat_participantes_pkey PRIMARY KEY (id);
ALTER TABLE public.colaboradores_restaurante ADD CONSTRAINT colaboradores_restaurante_pkey PRIMARY KEY (id);
ALTER TABLE public.controle_vigencia ADD CONSTRAINT controle_vigencia_pkey PRIMARY KEY (id);
ALTER TABLE public.daily_statistics ADD CONSTRAINT daily_statistics_pkey PRIMARY KEY (id);
ALTER TABLE public.disc_results ADD CONSTRAINT disc_results_pkey PRIMARY KEY (id);
ALTER TABLE public.enfermagem_configuracoes ADD CONSTRAINT enfermagem_configuracoes_pkey PRIMARY KEY (id);
ALTER TABLE public.enfermagem_escalas ADD CONSTRAINT enfermagem_escalas_pkey PRIMARY KEY (id);
ALTER TABLE public.enfermagem_trocas ADD CONSTRAINT enfermagem_trocas_pkey PRIMARY KEY (id);
ALTER TABLE public.enfermagem_trocas_historico ADD CONSTRAINT enfermagem_trocas_historico_pkey PRIMARY KEY (id);
ALTER TABLE public.entregas_prontuarios ADD CONSTRAINT entregas_prontuarios_pkey PRIMARY KEY (id);
ALTER TABLE public.entregas_prontuarios_itens ADD CONSTRAINT entregas_prontuarios_itens_pkey PRIMARY KEY (id);
ALTER TABLE public.epis_seguranca ADD CONSTRAINT epis_seguranca_pkey PRIMARY KEY (id);
ALTER TABLE public.escala_tec_enf_dias ADD CONSTRAINT escala_tec_enf_dias_pkey PRIMARY KEY (id);
ALTER TABLE public.escala_tec_enf_profissionais ADD CONSTRAINT escala_tec_enf_profissionais_pkey PRIMARY KEY (id);
ALTER TABLE public.escalas_laboratorio ADD CONSTRAINT escalas_laboratorio_pkey PRIMARY KEY (id);
ALTER TABLE public.escalas_medicos ADD CONSTRAINT escalas_medicos_pkey PRIMARY KEY (id);
ALTER TABLE public.escalas_tec_enfermagem ADD CONSTRAINT escalas_tec_enfermagem_pkey PRIMARY KEY (id);
ALTER TABLE public.ferramentas_modulo ADD CONSTRAINT ferramentas_modulo_pkey PRIMARY KEY (id);
ALTER TABLE public.formulario_campos ADD CONSTRAINT formulario_campos_pkey PRIMARY KEY (id);
ALTER TABLE public.formulario_permissoes ADD CONSTRAINT formulario_permissoes_pkey PRIMARY KEY (id);
ALTER TABLE public.formulario_respostas ADD CONSTRAINT formulario_respostas_pkey PRIMARY KEY (id);
ALTER TABLE public.formularios ADD CONSTRAINT formularios_pkey PRIMARY KEY (id);
ALTER TABLE public.gerencia_fornecedores ADD CONSTRAINT gerencia_fornecedores_pkey PRIMARY KEY (id);
ALTER TABLE public.gerencia_notas_fiscais ADD CONSTRAINT gerencia_notas_fiscais_pkey PRIMARY KEY (id);
ALTER TABLE public.gerencia_planos_acao ADD CONSTRAINT gerencia_planos_acao_pkey PRIMARY KEY (id);
ALTER TABLE public.gerencia_planos_historico ADD CONSTRAINT gerencia_planos_historico_pkey PRIMARY KEY (id);
ALTER TABLE public.gestor_cargos ADD CONSTRAINT gestor_cargos_pkey PRIMARY KEY (id);
ALTER TABLE public.gestor_setores ADD CONSTRAINT gestor_setores_pkey PRIMARY KEY (id);
ALTER TABLE public.incidentes_nsp ADD CONSTRAINT incidentes_nsp_pkey PRIMARY KEY (id);
ALTER TABLE public.justificativas_atraso ADD CONSTRAINT justificativas_atraso_pkey PRIMARY KEY (id);
ALTER TABLE public.justificativas_extensao_jornada ADD CONSTRAINT justificativas_extensao_jornada_pkey PRIMARY KEY (id);
ALTER TABLE public.justificativas_ponto ADD CONSTRAINT justificativas_ponto_pkey PRIMARY KEY (id);
ALTER TABLE public.lms_inscricoes ADD CONSTRAINT lms_inscricoes_pkey PRIMARY KEY (id);
ALTER TABLE public.lms_materiais ADD CONSTRAINT lms_materiais_pkey PRIMARY KEY (id);
ALTER TABLE public.lms_quiz_perguntas ADD CONSTRAINT lms_quiz_perguntas_pkey PRIMARY KEY (id);
ALTER TABLE public.lms_tentativas_quiz ADD CONSTRAINT lms_tentativas_quiz_pkey PRIMARY KEY (id);
ALTER TABLE public.lms_treinamentos ADD CONSTRAINT lms_treinamentos_pkey PRIMARY KEY (id);
ALTER TABLE public.logs_acesso ADD CONSTRAINT logs_acesso_pkey PRIMARY KEY (id);
ALTER TABLE public.logs_permissoes ADD CONSTRAINT logs_permissoes_pkey PRIMARY KEY (id);
ALTER TABLE public.manutencoes_execucoes ADD CONSTRAINT manutencoes_execucoes_pkey PRIMARY KEY (id);
ALTER TABLE public.manutencoes_preventivas ADD CONSTRAINT manutencoes_preventivas_pkey PRIMARY KEY (id);
ALTER TABLE public.modulos_sistema ADD CONSTRAINT modulos_sistema_pkey PRIMARY KEY (id);
ALTER TABLE public.movimentacoes_estoque ADD CONSTRAINT movimentacoes_estoque_pkey PRIMARY KEY (id);
ALTER TABLE public.nir_colaboradores ADD CONSTRAINT nir_colaboradores_pkey PRIMARY KEY (id);
ALTER TABLE public.nir_registros_producao ADD CONSTRAINT nir_registros_producao_pkey PRIMARY KEY (id);
ALTER TABLE public.notificacoes_pendencias ADD CONSTRAINT notificacoes_pendencias_pkey PRIMARY KEY (id);
ALTER TABLE public.notificacoes_seguranca ADD CONSTRAINT notificacoes_seguranca_pkey PRIMARY KEY (id);
ALTER TABLE public.nsp_action_plans ADD CONSTRAINT nsp_action_plans_pkey PRIMARY KEY (id);
ALTER TABLE public.nsp_indicators ADD CONSTRAINT nsp_indicators_pkey PRIMARY KEY (id);
ALTER TABLE public.passagem_plantao ADD CONSTRAINT passagem_plantao_pkey PRIMARY KEY (id);
ALTER TABLE public.passagem_plantao_pendencias ADD CONSTRAINT passagem_plantao_pendencias_pkey PRIMARY KEY (id);
ALTER TABLE public.pedidos_compra ADD CONSTRAINT pedidos_compra_pkey PRIMARY KEY (id);
ALTER TABLE public.perfis_sistema ADD CONSTRAINT perfis_sistema_pkey PRIMARY KEY (id);
ALTER TABLE public.permissoes_ferramenta ADD CONSTRAINT permissoes_ferramenta_pkey PRIMARY KEY (id);
ALTER TABLE public.permissoes_perfil ADD CONSTRAINT permissoes_perfil_pkey PRIMARY KEY (id);
ALTER TABLE public.planos_acao_auditoria ADD CONSTRAINT planos_acao_auditoria_pkey PRIMARY KEY (id);
ALTER TABLE public.porta_ecg_atendimentos ADD CONSTRAINT porta_ecg_atendimentos_pkey PRIMARY KEY (id);
ALTER TABLE public.produtos ADD CONSTRAINT produtos_pkey PRIMARY KEY (id);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);
ALTER TABLE public.profissionais_documentos ADD CONSTRAINT profissionais_documentos_pkey PRIMARY KEY (id);
ALTER TABLE public.profissionais_saude ADD CONSTRAINT profissionais_saude_pkey PRIMARY KEY (id);
ALTER TABLE public.prontuarios ADD CONSTRAINT prontuarios_pkey PRIMARY KEY (id);
ALTER TABLE public.protocolo_atendimentos ADD CONSTRAINT protocolo_atendimentos_pkey PRIMARY KEY (id);
ALTER TABLE public.protocolo_settings ADD CONSTRAINT protocolo_settings_pkey PRIMARY KEY (id);
ALTER TABLE public.refeicoes_registros ADD CONSTRAINT refeicoes_registros_pkey PRIMARY KEY (id);
ALTER TABLE public.regulacao_sus_facil ADD CONSTRAINT regulacao_sus_facil_pkey PRIMARY KEY (id);
ALTER TABLE public.reunioes ADD CONSTRAINT reunioes_pkey PRIMARY KEY (id);
ALTER TABLE public.rh_movimentacoes_setor ADD CONSTRAINT rh_movimentacoes_setor_pkey PRIMARY KEY (id);
ALTER TABLE public.rh_ocorrencias_disciplinares ADD CONSTRAINT rh_ocorrencias_disciplinares_pkey PRIMARY KEY (id);
ALTER TABLE public.riscos_operacionais ADD CONSTRAINT riscos_operacionais_pkey PRIMARY KEY (id);
ALTER TABLE public.rondas_seguranca ADD CONSTRAINT rondas_seguranca_pkey PRIMARY KEY (id);
ALTER TABLE public.rouparia_categorias ADD CONSTRAINT rouparia_categorias_pkey PRIMARY KEY (id);
ALTER TABLE public.rouparia_itens ADD CONSTRAINT rouparia_itens_pkey PRIMARY KEY (id);
ALTER TABLE public.rouparia_movimentacoes ADD CONSTRAINT rouparia_movimentacoes_pkey PRIMARY KEY (id);
ALTER TABLE public.saida_prontuarios ADD CONSTRAINT saida_prontuarios_pkey PRIMARY KEY (id);
ALTER TABLE public.sciras_antimicrobianos ADD CONSTRAINT sciras_antimicrobianos_pkey PRIMARY KEY (id);
ALTER TABLE public.sciras_culturas ADD CONSTRAINT sciras_culturas_pkey PRIMARY KEY (id);
ALTER TABLE public.sciras_indicadores_diarios ADD CONSTRAINT sciras_indicadores_diarios_pkey PRIMARY KEY (id);
ALTER TABLE public.sciras_notificacoes_epidemiologicas ADD CONSTRAINT sciras_notificacoes_epidemiologicas_pkey PRIMARY KEY (id);
ALTER TABLE public.sciras_vigilancia_iras ADD CONSTRAINT sciras_vigilancia_iras_pkey PRIMARY KEY (id);
ALTER TABLE public.seg_patrimonial_conflitos ADD CONSTRAINT seg_patrimonial_conflitos_pkey PRIMARY KEY (id);
ALTER TABLE public.seg_patrimonial_danos ADD CONSTRAINT seg_patrimonial_danos_pkey PRIMARY KEY (id);
ALTER TABLE public.seg_patrimonial_passagem_plantao ADD CONSTRAINT seg_patrimonial_passagem_plantao_pkey PRIMARY KEY (id);
ALTER TABLE public.seg_patrimonial_rondas ADD CONSTRAINT seg_patrimonial_rondas_pkey PRIMARY KEY (id);
ALTER TABLE public.seg_patrimonial_visitantes ADD CONSTRAINT seg_patrimonial_visitantes_pkey PRIMARY KEY (id);
ALTER TABLE public.setores ADD CONSTRAINT setores_pkey PRIMARY KEY (id);
ALTER TABLE public.shift_configurations ADD CONSTRAINT shift_configurations_pkey PRIMARY KEY (id);
ALTER TABLE public.solicitacoes_dieta ADD CONSTRAINT solicitacoes_dieta_pkey PRIMARY KEY (id);
ALTER TABLE public.tentativas_duplicidade_refeicoes ADD CONSTRAINT tentativas_duplicidade_refeicoes_pkey PRIMARY KEY (id);
ALTER TABLE public.transferencia_coordenadas ADD CONSTRAINT transferencia_coordenadas_pkey PRIMARY KEY (id);
ALTER TABLE public.transferencia_intercorrencias ADD CONSTRAINT transferencia_intercorrencias_pkey PRIMARY KEY (id);
ALTER TABLE public.transferencia_solicitacoes ADD CONSTRAINT transferencia_solicitacoes_pkey PRIMARY KEY (id);
ALTER TABLE public.transferencia_veiculos ADD CONSTRAINT transferencia_veiculos_pkey PRIMARY KEY (id);
ALTER TABLE public.uniformes_seguranca ADD CONSTRAINT uniformes_seguranca_pkey PRIMARY KEY (id);
ALTER TABLE public.upa_action_plans ADD CONSTRAINT upa_action_plans_pkey PRIMARY KEY (id);
ALTER TABLE public.upa_indicators ADD CONSTRAINT upa_indicators_pkey PRIMARY KEY (id);
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);
ALTER TABLE public.usuario_perfil ADD CONSTRAINT usuario_perfil_pkey PRIMARY KEY (id);
ALTER TABLE public.vacinas_seguranca ADD CONSTRAINT vacinas_seguranca_pkey PRIMARY KEY (id);
ALTER TABLE public.valores_refeicoes ADD CONSTRAINT valores_refeicoes_pkey PRIMARY KEY (id);

-- ====================
-- UNIQUE CONSTRAINTS
-- ====================
ALTER TABLE public.agenda_destinatarios ADD CONSTRAINT agenda_destinatarios_agenda_item_id_usuario_id_key UNIQUE (agenda_item_id, usuario_id);
ALTER TABLE public.chat_mensagens_lidas ADD CONSTRAINT chat_mensagens_lidas_mensagem_id_user_id_key UNIQUE (mensagem_id, user_id);
ALTER TABLE public.chat_participantes ADD CONSTRAINT chat_participantes_conversa_id_user_id_key UNIQUE (conversa_id, user_id);
ALTER TABLE public.daily_statistics ADD CONSTRAINT daily_statistics_date_key UNIQUE (date);
ALTER TABLE public.enfermagem_configuracoes ADD CONSTRAINT enfermagem_configuracoes_chave_key UNIQUE (chave);
ALTER TABLE public.gestor_cargos ADD CONSTRAINT gestor_cargos_gestor_user_id_cargo_id_key UNIQUE (gestor_user_id, cargo_id);
ALTER TABLE public.gestor_setores ADD CONSTRAINT gestor_setores_gestor_user_id_setor_id_key UNIQUE (gestor_user_id, setor_id);
ALTER TABLE public.modulos_sistema ADD CONSTRAINT modulos_sistema_codigo_key UNIQUE (codigo);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);
ALTER TABLE public.protocolo_settings ADD CONSTRAINT protocolo_settings_tipo_protocolo_key UNIQUE (tipo_protocolo);
ALTER TABLE public.shift_configurations ADD CONSTRAINT shift_configurations_shift_date_shift_type_key UNIQUE (shift_date, shift_type);

-- ====================
-- FOREIGN KEYS
-- ====================
ALTER TABLE public.achados_auditoria ADD CONSTRAINT achados_auditoria_auditoria_id_fkey FOREIGN KEY (auditoria_id) REFERENCES auditorias_qualidade(id) ON DELETE CASCADE;
ALTER TABLE public.acoes_incidentes ADD CONSTRAINT acoes_incidentes_analise_id_fkey FOREIGN KEY (analise_id) REFERENCES analises_incidentes(id) ON DELETE SET NULL;
ALTER TABLE public.acoes_incidentes ADD CONSTRAINT acoes_incidentes_incidente_id_fkey FOREIGN KEY (incidente_id) REFERENCES incidentes_nsp(id) ON DELETE CASCADE;
ALTER TABLE public.agenda_destinatarios ADD CONSTRAINT agenda_destinatarios_agenda_item_id_fkey FOREIGN KEY (agenda_item_id) REFERENCES agenda_items(id) ON DELETE CASCADE;
ALTER TABLE public.analises_incidentes ADD CONSTRAINT analises_incidentes_incidente_id_fkey FOREIGN KEY (incidente_id) REFERENCES incidentes_nsp(id) ON DELETE CASCADE;
ALTER TABLE public.assistencia_social_atendimentos ADD CONSTRAINT assistencia_social_atendimentos_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES assistencia_social_pacientes(id) ON DELETE CASCADE;
ALTER TABLE public.assistencia_social_documentos ADD CONSTRAINT assistencia_social_documentos_atendimento_id_fkey FOREIGN KEY (atendimento_id) REFERENCES assistencia_social_atendimentos(id) ON DELETE CASCADE;
ALTER TABLE public.assistencia_social_encaminhamentos ADD CONSTRAINT assistencia_social_encaminhamentos_atendimento_id_fkey FOREIGN KEY (atendimento_id) REFERENCES assistencia_social_atendimentos(id) ON DELETE CASCADE;
ALTER TABLE public.ativos_disponibilidade ADD CONSTRAINT ativos_disponibilidade_ativo_id_fkey FOREIGN KEY (ativo_id) REFERENCES ativos(id) ON DELETE CASCADE;
ALTER TABLE public.auditoria_perguntas_config ADD CONSTRAINT auditoria_perguntas_config_secao_id_fkey FOREIGN KEY (secao_id) REFERENCES auditoria_secoes_config(id) ON DELETE CASCADE;
ALTER TABLE public.auditoria_secoes_config ADD CONSTRAINT auditoria_secoes_config_formulario_id_fkey FOREIGN KEY (formulario_id) REFERENCES auditoria_formularios_config(id) ON DELETE CASCADE;
ALTER TABLE public.avaliacoes_historico ADD CONSTRAINT avaliacoes_historico_avaliacao_id_fkey FOREIGN KEY (avaliacao_id) REFERENCES avaliacoes_prontuarios(id);
ALTER TABLE public.avaliacoes_prontuarios ADD CONSTRAINT avaliacoes_prontuarios_prontuario_id_fkey FOREIGN KEY (prontuario_id) REFERENCES prontuarios(id);
ALTER TABLE public.avaliacoes_prontuarios ADD CONSTRAINT avaliacoes_prontuarios_saida_prontuario_id_fkey FOREIGN KEY (saida_prontuario_id) REFERENCES saida_prontuarios(id);
ALTER TABLE public.cadastros_inconsistentes ADD CONSTRAINT cadastros_inconsistentes_prontuario_id_fkey FOREIGN KEY (prontuario_id) REFERENCES prontuarios(id);
ALTER TABLE public.chamados_comentarios ADD CONSTRAINT chamados_comentarios_chamado_id_fkey FOREIGN KEY (chamado_id) REFERENCES chamados(id) ON DELETE CASCADE;
ALTER TABLE public.chamados_materiais ADD CONSTRAINT chamados_materiais_chamado_id_fkey FOREIGN KEY (chamado_id) REFERENCES chamados(id) ON DELETE CASCADE;
ALTER TABLE public.chamados_materiais ADD CONSTRAINT chamados_materiais_produto_id_fkey FOREIGN KEY (produto_id) REFERENCES produtos(id);
ALTER TABLE public.chat_mensagens ADD CONSTRAINT chat_mensagens_conversa_id_fkey FOREIGN KEY (conversa_id) REFERENCES chat_conversas(id) ON DELETE CASCADE;
ALTER TABLE public.chat_mensagens_lidas ADD CONSTRAINT chat_mensagens_lidas_mensagem_id_fkey FOREIGN KEY (mensagem_id) REFERENCES chat_mensagens(id) ON DELETE CASCADE;
ALTER TABLE public.chat_moderacao_logs ADD CONSTRAINT chat_moderacao_logs_mensagem_id_fkey FOREIGN KEY (mensagem_id) REFERENCES chat_mensagens(id) ON DELETE SET NULL;
ALTER TABLE public.chat_participantes ADD CONSTRAINT chat_participantes_conversa_id_fkey FOREIGN KEY (conversa_id) REFERENCES chat_conversas(id) ON DELETE CASCADE;
ALTER TABLE public.enfermagem_escalas ADD CONSTRAINT enfermagem_escalas_profissional_saude_id_fkey FOREIGN KEY (profissional_saude_id) REFERENCES profissionais_saude(id);
ALTER TABLE public.enfermagem_trocas ADD CONSTRAINT enfermagem_trocas_escala_id_fkey FOREIGN KEY (escala_id) REFERENCES enfermagem_escalas(id) ON DELETE CASCADE;
ALTER TABLE public.enfermagem_trocas_historico ADD CONSTRAINT enfermagem_trocas_historico_troca_id_fkey FOREIGN KEY (troca_id) REFERENCES enfermagem_trocas(id) ON DELETE CASCADE;
ALTER TABLE public.entregas_prontuarios_itens ADD CONSTRAINT entregas_prontuarios_itens_entrega_id_fkey FOREIGN KEY (entrega_id) REFERENCES entregas_prontuarios(id) ON DELETE CASCADE;
ALTER TABLE public.entregas_prontuarios_itens ADD CONSTRAINT entregas_prontuarios_itens_saida_prontuario_id_fkey FOREIGN KEY (saida_prontuario_id) REFERENCES saida_prontuarios(id);
ALTER TABLE public.escala_tec_enf_dias ADD CONSTRAINT escala_tec_enf_dias_profissional_id_fkey FOREIGN KEY (profissional_id) REFERENCES escala_tec_enf_profissionais(id) ON DELETE CASCADE;
ALTER TABLE public.escala_tec_enf_profissionais ADD CONSTRAINT escala_tec_enf_profissionais_escala_id_fkey FOREIGN KEY (escala_id) REFERENCES escalas_tec_enfermagem(id) ON DELETE CASCADE;
ALTER TABLE public.escala_tec_enf_profissionais ADD CONSTRAINT escala_tec_enf_profissionais_profissional_saude_id_fkey FOREIGN KEY (profissional_saude_id) REFERENCES profissionais_saude(id);
ALTER TABLE public.ferramentas_modulo ADD CONSTRAINT ferramentas_modulo_modulo_id_fkey FOREIGN KEY (modulo_id) REFERENCES modulos_sistema(id) ON DELETE CASCADE;
ALTER TABLE public.formulario_campos ADD CONSTRAINT formulario_campos_formulario_id_fkey FOREIGN KEY (formulario_id) REFERENCES formularios(id) ON DELETE CASCADE;
ALTER TABLE public.formulario_permissoes ADD CONSTRAINT formulario_permissoes_formulario_id_fkey FOREIGN KEY (formulario_id) REFERENCES formularios(id) ON DELETE CASCADE;
ALTER TABLE public.formulario_respostas ADD CONSTRAINT formulario_respostas_formulario_id_fkey FOREIGN KEY (formulario_id) REFERENCES formularios(id) ON DELETE CASCADE;
ALTER TABLE public.gerencia_notas_fiscais ADD CONSTRAINT gerencia_notas_fiscais_fornecedor_id_fkey FOREIGN KEY (fornecedor_id) REFERENCES gerencia_fornecedores(id);
ALTER TABLE public.gerencia_planos_historico ADD CONSTRAINT gerencia_planos_historico_plano_id_fkey FOREIGN KEY (plano_id) REFERENCES gerencia_planos_acao(id) ON DELETE CASCADE;
ALTER TABLE public.gestor_cargos ADD CONSTRAINT gestor_cargos_cargo_id_fkey FOREIGN KEY (cargo_id) REFERENCES cargos(id) ON DELETE CASCADE;
ALTER TABLE public.gestor_setores ADD CONSTRAINT gestor_setores_setor_id_fkey FOREIGN KEY (setor_id) REFERENCES setores(id) ON DELETE CASCADE;
ALTER TABLE public.lms_inscricoes ADD CONSTRAINT lms_inscricoes_treinamento_id_fkey FOREIGN KEY (treinamento_id) REFERENCES lms_treinamentos(id) ON DELETE CASCADE;
ALTER TABLE public.lms_materiais ADD CONSTRAINT lms_materiais_treinamento_id_fkey FOREIGN KEY (treinamento_id) REFERENCES lms_treinamentos(id) ON DELETE CASCADE;
ALTER TABLE public.lms_quiz_perguntas ADD CONSTRAINT lms_quiz_perguntas_treinamento_id_fkey FOREIGN KEY (treinamento_id) REFERENCES lms_treinamentos(id) ON DELETE CASCADE;
ALTER TABLE public.lms_tentativas_quiz ADD CONSTRAINT lms_tentativas_quiz_inscricao_id_fkey FOREIGN KEY (inscricao_id) REFERENCES lms_inscricoes(id) ON DELETE CASCADE;
ALTER TABLE public.lms_tentativas_quiz ADD CONSTRAINT lms_tentativas_quiz_treinamento_id_fkey FOREIGN KEY (treinamento_id) REFERENCES lms_treinamentos(id) ON DELETE CASCADE;
ALTER TABLE public.manutencoes_execucoes ADD CONSTRAINT manutencoes_execucoes_ativo_id_fkey FOREIGN KEY (ativo_id) REFERENCES ativos(id) ON DELETE CASCADE;
ALTER TABLE public.manutencoes_execucoes ADD CONSTRAINT manutencoes_execucoes_preventiva_id_fkey FOREIGN KEY (preventiva_id) REFERENCES manutencoes_preventivas(id) ON DELETE SET NULL;
ALTER TABLE public.manutencoes_preventivas ADD CONSTRAINT manutencoes_preventivas_ativo_id_fkey FOREIGN KEY (ativo_id) REFERENCES ativos(id) ON DELETE CASCADE;
ALTER TABLE public.movimentacoes_estoque ADD CONSTRAINT movimentacoes_estoque_produto_id_fkey FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE;
ALTER TABLE public.nsp_action_plans ADD CONSTRAINT nsp_action_plans_indicator_id_fkey FOREIGN KEY (indicator_id) REFERENCES nsp_indicators(id) ON DELETE CASCADE;
ALTER TABLE public.passagem_plantao_pendencias ADD CONSTRAINT passagem_plantao_pendencias_passagem_id_fkey FOREIGN KEY (passagem_id) REFERENCES passagem_plantao(id) ON DELETE CASCADE;
ALTER TABLE public.permissoes_ferramenta ADD CONSTRAINT permissoes_ferramenta_ferramenta_id_fkey FOREIGN KEY (ferramenta_id) REFERENCES ferramentas_modulo(id) ON DELETE CASCADE;
ALTER TABLE public.permissoes_ferramenta ADD CONSTRAINT permissoes_ferramenta_perfil_id_fkey FOREIGN KEY (perfil_id) REFERENCES perfis_sistema(id) ON DELETE CASCADE;
ALTER TABLE public.permissoes_perfil ADD CONSTRAINT permissoes_perfil_modulo_id_fkey FOREIGN KEY (modulo_id) REFERENCES modulos_sistema(id) ON DELETE CASCADE;
ALTER TABLE public.permissoes_perfil ADD CONSTRAINT permissoes_perfil_perfil_id_fkey FOREIGN KEY (perfil_id) REFERENCES perfis_sistema(id) ON DELETE CASCADE;
ALTER TABLE public.planos_acao_auditoria ADD CONSTRAINT planos_acao_auditoria_achado_id_fkey FOREIGN KEY (achado_id) REFERENCES achados_auditoria(id) ON DELETE CASCADE;
ALTER TABLE public.profissionais_documentos ADD CONSTRAINT profissionais_documentos_profissional_id_fkey FOREIGN KEY (profissional_id) REFERENCES profissionais_saude(id) ON DELETE CASCADE;
ALTER TABLE public.rouparia_itens ADD CONSTRAINT rouparia_itens_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES rouparia_categorias(id) ON DELETE CASCADE;
ALTER TABLE public.rouparia_movimentacoes ADD CONSTRAINT rouparia_movimentacoes_item_id_fkey FOREIGN KEY (item_id) REFERENCES rouparia_itens(id) ON DELETE CASCADE;
ALTER TABLE public.sciras_antimicrobianos ADD CONSTRAINT sciras_antimicrobianos_cultura_id_fkey FOREIGN KEY (cultura_id) REFERENCES sciras_culturas(id);
ALTER TABLE public.sciras_culturas ADD CONSTRAINT sciras_culturas_vigilancia_iras_id_fkey FOREIGN KEY (vigilancia_iras_id) REFERENCES sciras_vigilancia_iras(id);
ALTER TABLE public.transferencia_coordenadas ADD CONSTRAINT transferencia_coordenadas_solicitacao_id_fkey FOREIGN KEY (solicitacao_id) REFERENCES transferencia_solicitacoes(id) ON DELETE CASCADE;
ALTER TABLE public.transferencia_intercorrencias ADD CONSTRAINT transferencia_intercorrencias_solicitacao_id_fkey FOREIGN KEY (solicitacao_id) REFERENCES transferencia_solicitacoes(id) ON DELETE CASCADE;
ALTER TABLE public.upa_action_plans ADD CONSTRAINT upa_action_plans_indicator_id_fkey FOREIGN KEY (indicator_id) REFERENCES upa_indicators(id) ON DELETE CASCADE;
ALTER TABLE public.usuario_perfil ADD CONSTRAINT usuario_perfil_perfil_id_fkey FOREIGN KEY (perfil_id) REFERENCES perfis_sistema(id) ON DELETE CASCADE;

-- ====================
-- ENABLE RLS (verifique e adicione as policies conforme necessário)
-- ====================
-- NOTA: As políticas RLS (Row Level Security) não foram incluídas nesta exportação.
-- Você precisará recriá-las manualmente no novo projeto.
-- Use: SELECT tablename, policyname, permissive, roles, cmd, qual, with_check FROM pg_policies WHERE schemaname = 'public';

-- Trigger para calcular delay_horas automaticamente
CREATE OR REPLACE FUNCTION public.calcular_delay_horas()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.delay_horas := EXTRACT(epoch FROM (NEW.data_registro - NEW.data_fato)) / 3600;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_calcular_delay_horas
BEFORE INSERT OR UPDATE ON public.auditoria_temporalidade
FOR EACH ROW
EXECUTE FUNCTION public.calcular_delay_horas();

-- ====================
-- FIM DO SCHEMA
-- ====================
