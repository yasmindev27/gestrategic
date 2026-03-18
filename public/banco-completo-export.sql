-- ============================================================
-- BANCO DE DADOS COMPLETO - EXPORTAÇÃO UNIFICADA
-- Projeto: GEStrategic / UPA 24h
-- Data de exportação: 2026-03-01
-- Conteúdo: Tipos, Tabelas, PKs, FKs, Funções, Triggers, RLS
-- ============================================================


-- ============================================================
-- PARTE 1: TIPOS CUSTOMIZADOS
-- ============================================================

DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM (
    'admin', 'gestor', 'funcionario', 'recepcao', 'classificacao',
    'nir', 'faturamento', 'ti', 'manutencao', 'engenharia_clinica',
    'laboratorio', 'restaurante', 'rh_dp', 'assistencia_social',
    'qualidade', 'nsp', 'seguranca', 'enfermagem', 'medicos',
    'rouparia', 'transporte', 'sciras'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================
-- PARTE 2: TABELAS
-- ============================================================

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


-- ============================================================
-- PARTE 3: PRIMARY KEYS
-- ============================================================

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


-- ============================================================
-- PARTE 4: UNIQUE CONSTRAINTS
-- ============================================================

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


-- ============================================================
-- PARTE 5: FOREIGN KEYS
-- ============================================================

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


-- ============================================================
-- PARTE 6: FUNÇÕES DO BANCO DE DADOS
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.profiles (user_id, full_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email));
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'funcionario');
    
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$function$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles app_role[])
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = ANY(_roles)
    )
$function$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    SELECT role
    FROM public.user_roles
    WHERE user_id = _user_id
    LIMIT 1
$function$;

CREATE OR REPLACE FUNCTION public.get_user_setor(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT setor FROM public.profiles WHERE user_id = _user_id LIMIT 1
$function$;

CREATE OR REPLACE FUNCTION public.is_chat_participant(_user_id uuid, _conversa_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_participantes
    WHERE user_id = _user_id AND conversa_id = _conversa_id
  )
$function$;

CREATE OR REPLACE FUNCTION public.buscar_usuario_por_matricula(_matricula text)
RETURNS TABLE(user_id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT p.user_id
  FROM public.profiles p
  WHERE p.matricula = _matricula
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.bloquear_edicao_logs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION
      'VIOLAÇÃO DE INTEGRIDADE: Logs de auditoria são imutáveis (LGPD Art. 37). Operação UPDATE bloqueada.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION
      'VIOLAÇÃO DE INTEGRIDADE: Logs de auditoria são imutáveis (LGPD Art. 37). Operação DELETE bloqueada.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_escala_laboratorio()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.mes < 1 OR NEW.mes > 12 THEN
    RAISE EXCEPTION 'Mês deve estar entre 1 e 12';
  END IF;
  IF NEW.ano < 2020 THEN
    RAISE EXCEPTION 'Ano deve ser maior ou igual a 2020';
  END IF;
  IF NEW.dia < 1 OR NEW.dia > 31 THEN
    RAISE EXCEPTION 'Dia deve estar entre 1 e 31';
  END IF;
  IF NEW.turno NOT IN ('manha', 'tarde', 'noite', 'plantao') THEN
    RAISE EXCEPTION 'Turno deve ser manha, tarde, noite ou plantao';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calcular_prazo_chamado()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
    NEW.prazo_conclusao := CASE NEW.prioridade
        WHEN 'urgente' THEN NEW.data_abertura + INTERVAL '4 hours'
        WHEN 'alta' THEN NEW.data_abertura + INTERVAL '8 hours'
        WHEN 'media' THEN NEW.data_abertura + INTERVAL '24 hours'
        WHEN 'baixa' THEN NEW.data_abertura + INTERVAL '48 hours'
        ELSE NEW.data_abertura + INTERVAL '24 hours'
    END;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_chamado_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
    NEW.numero_chamado := 'CH-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('chamado_seq')::TEXT, 4, '0');
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_incidente_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
    NEW.numero_notificacao := 'NSP-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('incidente_nsp_seq')::TEXT, 5, '0');
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_sciras_iras_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.numero_notificacao := 'IRAS-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('sciras_iras_seq')::TEXT, 5, '0');
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_sciras_notif_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.numero_notificacao := 'EPI-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('sciras_notif_seq')::TEXT, 5, '0');
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.baixa_estoque_chamado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_quantidade_atual integer;
    v_setor text;
    v_nome_produto text;
BEGIN
    SELECT quantidade_atual, setor_responsavel, nome 
    INTO v_quantidade_atual, v_setor, v_nome_produto
    FROM public.produtos 
    WHERE id = NEW.produto_id;
    
    IF v_quantidade_atual < NEW.quantidade THEN
        RAISE EXCEPTION 'Estoque insuficiente para o produto %. Disponível: %, Solicitado: %', 
            v_nome_produto, v_quantidade_atual, NEW.quantidade;
    END IF;
    
    UPDATE public.produtos 
    SET quantidade_atual = quantidade_atual - NEW.quantidade, updated_at = now()
    WHERE id = NEW.produto_id;
    
    INSERT INTO public.movimentacoes_estoque (
        produto_id, tipo, quantidade, quantidade_anterior, quantidade_nova,
        setor, motivo, observacao, usuario_id
    ) VALUES (
        NEW.produto_id, 'saida', NEW.quantidade, v_quantidade_atual,
        v_quantidade_atual - NEW.quantidade, v_setor,
        'Utilizado em chamado', 'Chamado ID: ' || NEW.chamado_id::text,
        NEW.registrado_por
    );
    
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.atualizar_estoque_rouparia()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_quantidade_atual INTEGER;
    v_nova_quantidade INTEGER;
BEGIN
    SELECT quantidade_atual INTO v_quantidade_atual
    FROM public.rouparia_itens
    WHERE id = NEW.item_id;

    CASE NEW.tipo_movimentacao
        WHEN 'entrada', 'devolucao' THEN
            v_nova_quantidade := v_quantidade_atual + NEW.quantidade;
        WHEN 'saida', 'descarte' THEN
            IF v_quantidade_atual < NEW.quantidade THEN
                RAISE EXCEPTION 'Estoque insuficiente. Disponível: %, Solicitado: %', v_quantidade_atual, NEW.quantidade;
            END IF;
            v_nova_quantidade := v_quantidade_atual - NEW.quantidade;
    END CASE;

    NEW.quantidade_anterior := v_quantidade_atual;
    NEW.quantidade_nova := v_nova_quantidade;

    UPDATE public.rouparia_itens
    SET quantidade_atual = v_nova_quantidade, updated_at = now()
    WHERE id = NEW.item_id;

    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.gestor_gerencia_usuario(_gestor_id uuid, _usuario_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.gestor_setores gs ON gs.gestor_user_id = _gestor_id
        JOIN public.setores s ON s.id = gs.setor_id AND s.nome = p.setor
        WHERE p.user_id = _usuario_id
    )
    OR EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.gestor_cargos gc ON gc.gestor_user_id = _gestor_id
        JOIN public.cargos c ON c.id = gc.cargo_id AND c.nome = p.cargo
        WHERE p.user_id = _usuario_id
    )
$function$;

CREATE OR REPLACE FUNCTION public.gestor_pode_atribuir(_gestor_id uuid, _usuario_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    SELECT 
        has_role(_gestor_id, 'admin'::app_role)
        OR (
            has_role(_gestor_id, 'gestor'::app_role)
            AND gestor_gerencia_usuario(_gestor_id, _usuario_id)
        )
$function$;

CREATE OR REPLACE FUNCTION public.get_usuarios_sob_gestao(_gestor_id uuid)
RETURNS TABLE(user_id uuid, full_name text, cargo text, setor text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    SELECT DISTINCT p.user_id, p.full_name, p.cargo, p.setor
    FROM public.profiles p
    WHERE (
        EXISTS (SELECT 1 FROM public.gestor_setores gs JOIN public.setores s ON s.id = gs.setor_id AND s.nome = p.setor WHERE gs.gestor_user_id = _gestor_id)
        OR EXISTS (SELECT 1 FROM public.gestor_cargos gc JOIN public.cargos c ON c.id = gc.cargo_id AND c.nome = p.cargo WHERE gc.gestor_user_id = _gestor_id)
    )
    AND p.user_id != _gestor_id
$function$;

CREATE OR REPLACE FUNCTION public.get_tarefas_pendentes_count(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    SELECT COUNT(*)::INTEGER
    FROM public.agenda_items ai
    JOIN public.agenda_destinatarios ad ON ad.agenda_item_id = ai.id
    WHERE ad.usuario_id = _user_id
    AND ai.status = 'pendente'
    AND ai.data_inicio <= now()
$function$;

CREATE OR REPLACE FUNCTION public.get_user_names_by_ids(_user_ids uuid[])
RETURNS TABLE(user_id uuid, full_name text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    SELECT p.user_id, p.full_name
    FROM public.profiles p
    WHERE p.user_id = ANY(_user_ids)
$function$;

CREATE OR REPLACE FUNCTION public.is_agenda_creator(_user_id uuid, _item_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    SELECT EXISTS (SELECT 1 FROM public.agenda_items WHERE criado_por = _user_id AND id = _item_id)
$function$;

CREATE OR REPLACE FUNCTION public.is_agenda_recipient(_user_id uuid, _item_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    SELECT EXISTS (SELECT 1 FROM public.agenda_destinatarios WHERE usuario_id = _user_id AND agenda_item_id = _item_id)
$function$;

CREATE OR REPLACE FUNCTION public.get_prontuario_status(p_prontuario_id uuid)
RETURNS TABLE(id uuid, numero_prontuario text, paciente_nome text, prontuario_status text, fluxo_status text, avaliacao_status text)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
    SELECT 
        p.id, p.numero_prontuario, p.paciente_nome,
        p.status as prontuario_status,
        sp.status as fluxo_status,
        CASE 
            WHEN ap.id IS NOT NULL AND ap.is_finalizada = true THEN 'avaliado'
            WHEN ap.id IS NOT NULL THEN 'em_avaliacao'
            ELSE 'pendente'
        END as avaliacao_status
    FROM public.prontuarios p
    LEFT JOIN public.saida_prontuarios sp ON sp.prontuario_id = p.id
    LEFT JOIN public.avaliacoes_prontuarios ap ON ap.prontuario_id = p.id
    WHERE p.id = p_prontuario_id;
$function$;

CREATE OR REPLACE FUNCTION public.pode_ver_formulario(_user_id uuid, _formulario_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin', 'rh_dp'))
    OR EXISTS (SELECT 1 FROM public.formularios WHERE id = _formulario_id AND criado_por = _user_id)
    OR EXISTS (SELECT 1 FROM public.formulario_permissoes WHERE formulario_id = _formulario_id AND tipo_permissao = 'todos')
    OR EXISTS (SELECT 1 FROM public.formulario_permissoes WHERE formulario_id = _formulario_id AND tipo_permissao = 'usuario' AND valor = _user_id::text)
    OR EXISTS (SELECT 1 FROM public.formulario_permissoes fp JOIN public.profiles p ON p.user_id = _user_id WHERE fp.formulario_id = _formulario_id AND fp.tipo_permissao = 'cargo' AND fp.valor = p.cargo)
    OR EXISTS (SELECT 1 FROM public.formulario_permissoes fp JOIN public.profiles p ON p.user_id = _user_id WHERE fp.formulario_id = _formulario_id AND fp.tipo_permissao = 'setor' AND fp.valor = p.setor)
$function$;

CREATE OR REPLACE FUNCTION public.corrigir_quiz(_respostas jsonb, _treinamento_id uuid)
RETURNS TABLE(acertos integer, total integer, nota integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_acertos integer := 0;
  v_total integer := 0;
  v_pergunta RECORD;
BEGIN
  FOR v_pergunta IN
    SELECT id, resposta_correta FROM lms_quiz_perguntas
    WHERE treinamento_id = _treinamento_id
  LOOP
    v_total := v_total + 1;
    IF _respostas ->> v_pergunta.id::text = v_pergunta.resposta_correta THEN
      v_acertos := v_acertos + 1;
    END IF;
  END LOOP;

  acertos := v_acertos;
  total := v_total;
  nota := CASE WHEN v_total > 0 THEN ROUND((v_acertos::numeric / v_total) * 100) ELSE 0 END;
  RETURN NEXT;
END;
$function$;

CREATE OR REPLACE FUNCTION public.buscar_colaborador_totem(_matricula text)
RETURNS TABLE(id uuid, nome text, matricula text, pode_registrar boolean)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT cr.id, cr.nome, cr.matricula, (cr.ativo = true) as pode_registrar
  FROM public.colaboradores_restaurante cr
  WHERE cr.matricula = _matricula AND cr.ativo = true
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.update_valores_atualizado_por()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.atualizado_por := auth.uid();
  NEW.atualizado_em := now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.usuario_pode_acessar_modulo(_user_id uuid, _modulo_codigo text)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    SELECT COALESCE(
        (
            SELECT jsonb_build_object(
                'pode_visualizar', pp.pode_visualizar,
                'pode_acessar', pp.pode_acessar,
                'comportamento', pp.comportamento_sem_acesso
            )
            FROM public.usuario_perfil up
            JOIN public.permissoes_perfil pp ON pp.perfil_id = up.perfil_id
            JOIN public.modulos_sistema m ON m.id = pp.modulo_id
            WHERE up.user_id = _user_id AND m.codigo = _modulo_codigo AND pp.pode_acessar = true
            LIMIT 1
        ),
        jsonb_build_object('pode_visualizar', false, 'pode_acessar', false, 'comportamento', 'ocultar')
    )
$function$;

CREATE OR REPLACE FUNCTION public.usuario_pode_usar_ferramenta(_user_id uuid, _modulo_codigo text, _ferramenta_codigo text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    SELECT EXISTS (
        SELECT 1
        FROM public.usuario_perfil up
        JOIN public.permissoes_ferramenta pf ON pf.perfil_id = up.perfil_id
        JOIN public.ferramentas_modulo fm ON fm.id = pf.ferramenta_id
        JOIN public.modulos_sistema m ON m.id = fm.modulo_id
        WHERE up.user_id = _user_id AND m.codigo = _modulo_codigo AND fm.codigo = _ferramenta_codigo AND pf.permitido = true
    )
$function$;

CREATE OR REPLACE FUNCTION public.obter_permissoes_usuario(_user_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    SELECT jsonb_build_object(
        'perfis', (
            SELECT jsonb_agg(jsonb_build_object('id', p.id, 'nome', p.nome, 'is_master', p.is_master))
            FROM public.usuario_perfil up
            JOIN public.perfis_sistema p ON p.id = up.perfil_id
            WHERE up.user_id = _user_id
        ),
        'modulos', (
            SELECT jsonb_object_agg(
                m.codigo,
                jsonb_build_object('pode_visualizar', COALESCE(pp.pode_visualizar, false), 'pode_acessar', COALESCE(pp.pode_acessar, false), 'comportamento', COALESCE(pp.comportamento_sem_acesso, 'ocultar'))
            )
            FROM public.modulos_sistema m
            LEFT JOIN public.permissoes_perfil pp ON pp.modulo_id = m.id
            AND pp.perfil_id IN (SELECT perfil_id FROM public.usuario_perfil WHERE user_id = _user_id)
        ),
        'ferramentas', (
            SELECT jsonb_object_agg(
                m.codigo || '.' || fm.codigo,
                COALESCE(pf.permitido, false)
            )
            FROM public.ferramentas_modulo fm
            JOIN public.modulos_sistema m ON m.id = fm.modulo_id
            LEFT JOIN public.permissoes_ferramenta pf ON pf.ferramenta_id = fm.id
            AND pf.perfil_id IN (SELECT perfil_id FROM public.usuario_perfil WHERE user_id = _user_id)
        )
    )
$function$;


-- ============================================================
-- PARTE 7: TRIGGERS
-- ============================================================

-- Triggers de updated_at
CREATE TRIGGER update_achados_auditoria_updated_at BEFORE UPDATE ON achados_auditoria FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_acoes_incidentes_updated_at BEFORE UPDATE ON acoes_incidentes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agenda_items_updated_at BEFORE UPDATE ON agenda_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_alertas_seguranca_updated_at BEFORE UPDATE ON alertas_seguranca FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_analises_incidentes_updated_at BEFORE UPDATE ON analises_incidentes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_asos_seguranca_updated_at BEFORE UPDATE ON asos_seguranca FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_as_atendimentos_updated_at BEFORE UPDATE ON assistencia_social_atendimentos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_as_encaminhamentos_updated_at BEFORE UPDATE ON assistencia_social_encaminhamentos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_as_pacientes_updated_at BEFORE UPDATE ON assistencia_social_pacientes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_atestados_updated_at BEFORE UPDATE ON atestados FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ativos_updated_at BEFORE UPDATE ON ativos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_auditoria_formularios_config_updated_at BEFORE UPDATE ON auditoria_formularios_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_auditoria_perguntas_config_updated_at BEFORE UPDATE ON auditoria_perguntas_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_auditoria_secoes_config_updated_at BEFORE UPDATE ON auditoria_secoes_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_auditorias_qualidade_updated_at BEFORE UPDATE ON auditorias_qualidade FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_auditorias_seguranca_paciente_updated_at BEFORE UPDATE ON auditorias_seguranca_paciente FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_avaliacoes_desempenho_updated_at BEFORE UPDATE ON avaliacoes_desempenho FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_avaliacoes_experiencia_updated_at BEFORE UPDATE ON avaliacoes_experiencia FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_avaliacoes_prontuarios_updated_at BEFORE UPDATE ON avaliacoes_prontuarios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_banco_horas_updated_at BEFORE UPDATE ON banco_horas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bed_records_updated_at BEFORE UPDATE ON bed_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cadastros_inconsistentes_updated_at BEFORE UPDATE ON cadastros_inconsistentes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cafe_litro_diario_updated_at BEFORE UPDATE ON cafe_litro_diario FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cardapios_updated_at BEFORE UPDATE ON cardapios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cargos_updated_at BEFORE UPDATE ON cargos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_chamados_updated_at BEFORE UPDATE ON chamados FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_colaboradores_restaurante_updated_at BEFORE UPDATE ON colaboradores_restaurante FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vigencia_updated_at BEFORE UPDATE ON controle_vigencia FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_daily_statistics_updated_at BEFORE UPDATE ON daily_statistics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_enfermagem_configuracoes_updated_at BEFORE UPDATE ON enfermagem_configuracoes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_enfermagem_escalas_updated_at BEFORE UPDATE ON enfermagem_escalas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_enfermagem_trocas_updated_at BEFORE UPDATE ON enfermagem_trocas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_escalas_medicos_updated_at BEFORE UPDATE ON escalas_medicos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_escalas_tec_enfermagem_updated_at BEFORE UPDATE ON escalas_tec_enfermagem FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_formularios_updated_at BEFORE UPDATE ON formularios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_gerencia_fornecedores_updated_at BEFORE UPDATE ON gerencia_fornecedores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_gerencia_notas_fiscais_updated_at BEFORE UPDATE ON gerencia_notas_fiscais FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_gerencia_planos_acao_updated_at BEFORE UPDATE ON gerencia_planos_acao FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_incidentes_nsp_updated_at BEFORE UPDATE ON incidentes_nsp FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_justificativas_updated_at BEFORE UPDATE ON justificativas_atraso FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_justificativas_extensao_jornada_updated_at BEFORE UPDATE ON justificativas_extensao_jornada FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_justificativas_ponto_updated_at BEFORE UPDATE ON justificativas_ponto FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lms_inscricoes_updated_at BEFORE UPDATE ON lms_inscricoes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lms_materiais_updated_at BEFORE UPDATE ON lms_materiais FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lms_treinamentos_updated_at BEFORE UPDATE ON lms_treinamentos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_preventivas_updated_at BEFORE UPDATE ON manutencoes_preventivas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_nsp_action_plans_updated_at BEFORE UPDATE ON nsp_action_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_nsp_indicators_updated_at BEFORE UPDATE ON nsp_indicators FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_passagem_plantao_updated_at BEFORE UPDATE ON passagem_plantao FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_passagem_plantao_pendencias_updated_at BEFORE UPDATE ON passagem_plantao_pendencias FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pedidos_compra_updated_at BEFORE UPDATE ON pedidos_compra FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_perfis_sistema_updated_at BEFORE UPDATE ON perfis_sistema FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_permissoes_perfil_updated_at BEFORE UPDATE ON permissoes_perfil FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_planos_acao_auditoria_updated_at BEFORE UPDATE ON planos_acao_auditoria FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_porta_ecg_atendimentos_updated_at BEFORE UPDATE ON porta_ecg_atendimentos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_produtos_updated_at BEFORE UPDATE ON produtos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profissionais_saude_updated_at BEFORE UPDATE ON profissionais_saude FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_prontuarios_updated_at BEFORE UPDATE ON prontuarios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_protocolo_atendimentos_updated_at BEFORE UPDATE ON protocolo_atendimentos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_protocolo_settings_updated_at BEFORE UPDATE ON protocolo_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_regulacao_sus_facil_updated_at BEFORE UPDATE ON regulacao_sus_facil FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reunioes_updated_at BEFORE UPDATE ON reunioes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rh_movimentacoes_setor_updated_at BEFORE UPDATE ON rh_movimentacoes_setor FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rh_ocorrencias_disciplinares_updated_at BEFORE UPDATE ON rh_ocorrencias_disciplinares FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_riscos_operacionais_updated_at BEFORE UPDATE ON riscos_operacionais FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rouparia_categorias_updated_at BEFORE UPDATE ON rouparia_categorias FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rouparia_itens_updated_at BEFORE UPDATE ON rouparia_itens FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_saida_prontuarios_updated_at BEFORE UPDATE ON saida_prontuarios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_update_sciras_antimicrobianos BEFORE UPDATE ON sciras_antimicrobianos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_update_sciras_culturas BEFORE UPDATE ON sciras_culturas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_update_sciras_indicadores BEFORE UPDATE ON sciras_indicadores_diarios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Triggers especiais
CREATE TRIGGER set_chamado_number BEFORE INSERT ON chamados FOR EACH ROW WHEN (NEW.numero_chamado IS NULL OR NEW.numero_chamado = '') EXECUTE FUNCTION generate_chamado_number();
CREATE TRIGGER trigger_calcular_prazo_chamado BEFORE INSERT ON chamados FOR EACH ROW EXECUTE FUNCTION calcular_prazo_chamado();
CREATE TRIGGER trigger_recalcular_prazo_chamado BEFORE UPDATE OF prioridade ON chamados FOR EACH ROW WHEN (OLD.prioridade IS DISTINCT FROM NEW.prioridade) EXECUTE FUNCTION calcular_prazo_chamado();
CREATE TRIGGER trigger_baixa_estoque_chamado AFTER INSERT ON chamados_materiais FOR EACH ROW EXECUTE FUNCTION baixa_estoque_chamado();
CREATE TRIGGER validate_escala_laboratorio_trigger BEFORE INSERT OR UPDATE ON escalas_laboratorio FOR EACH ROW EXECUTE FUNCTION validate_escala_laboratorio();
CREATE TRIGGER set_incidente_number BEFORE INSERT ON incidentes_nsp FOR EACH ROW EXECUTE FUNCTION generate_incidente_number();
CREATE TRIGGER trg_bloquear_edicao_logs BEFORE UPDATE OR DELETE ON logs_acesso FOR EACH ROW EXECUTE FUNCTION bloquear_edicao_logs();
CREATE TRIGGER trigger_atualizar_estoque_rouparia BEFORE INSERT ON rouparia_movimentacoes FOR EACH ROW EXECUTE FUNCTION atualizar_estoque_rouparia();
CREATE TRIGGER trg_generate_sciras_notif_number BEFORE INSERT ON sciras_notificacoes_epidemiologicas FOR EACH ROW EXECUTE FUNCTION generate_sciras_notif_number();
CREATE TRIGGER trg_generate_sciras_iras_number BEFORE INSERT ON sciras_vigilancia_iras FOR EACH ROW EXECUTE FUNCTION generate_sciras_iras_number();


-- ============================================================
-- PARTE 8: POLÍTICAS RLS (Row Level Security)
-- ============================================================

-- === achados_auditoria ===
ALTER TABLE public.achados_auditoria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Quality roles can manage findings" ON public.achados_auditoria FOR ALL TO authenticated USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'qualidade'::app_role)));
CREATE POLICY "Quality roles can view findings" ON public.achados_auditoria FOR SELECT TO authenticated USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'qualidade'::app_role) OR has_role(auth.uid(), 'nsp'::app_role) OR has_role(auth.uid(), 'gestor'::app_role)));

-- === acoes_incidentes ===
ALTER TABLE public.acoes_incidentes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Quality roles can manage actions" ON public.acoes_incidentes FOR ALL TO authenticated USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'qualidade'::app_role) OR has_role(auth.uid(), 'nsp'::app_role)));
CREATE POLICY "Quality roles can view actions" ON public.acoes_incidentes FOR SELECT TO authenticated USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'qualidade'::app_role) OR has_role(auth.uid(), 'nsp'::app_role) OR has_role(auth.uid(), 'gestor'::app_role)));

-- === agenda_destinatarios ===
ALTER TABLE public.agenda_destinatarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access agenda_destinatarios" ON public.agenda_destinatarios FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Creator can manage recipients" ON public.agenda_destinatarios FOR ALL TO authenticated USING (is_agenda_creator(auth.uid(), agenda_item_id));
CREATE POLICY "Recipient can update own record" ON public.agenda_destinatarios FOR UPDATE TO authenticated USING ((usuario_id = auth.uid())) WITH CHECK ((usuario_id = auth.uid()));
CREATE POLICY "Recipient can view own record" ON public.agenda_destinatarios FOR SELECT TO authenticated USING ((usuario_id = auth.uid()));

-- === agenda_items ===
ALTER TABLE public.agenda_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access agenda_items" ON public.agenda_items FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "User can delete own items" ON public.agenda_items FOR DELETE TO authenticated USING ((criado_por = auth.uid()));
CREATE POLICY "User can insert agenda_items" ON public.agenda_items FOR INSERT TO authenticated WITH CHECK ((criado_por = auth.uid()));
CREATE POLICY "User can update own items" ON public.agenda_items FOR UPDATE TO authenticated USING ((criado_por = auth.uid()));
CREATE POLICY "User can view items as recipient" ON public.agenda_items FOR SELECT TO authenticated USING (is_agenda_recipient(auth.uid(), id));
CREATE POLICY "User can view own created items" ON public.agenda_items FOR SELECT TO authenticated USING ((criado_por = auth.uid()));

-- === alertas_seguranca ===
ALTER TABLE public.alertas_seguranca ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Seguranca e admin podem atualizar alertas" ON public.alertas_seguranca FOR UPDATE TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'seguranca'::app_role]));
CREATE POLICY "Usuarios autenticados podem ver alertas" ON public.alertas_seguranca FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuarios podem criar alertas" ON public.alertas_seguranca FOR INSERT TO authenticated WITH CHECK ((auth.uid() = usuario_id));

-- === analises_incidentes ===
ALTER TABLE public.analises_incidentes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Quality roles can manage analyses" ON public.analises_incidentes FOR ALL TO authenticated USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'qualidade'::app_role) OR has_role(auth.uid(), 'nsp'::app_role)));
CREATE POLICY "Quality roles can view analyses" ON public.analises_incidentes FOR SELECT TO authenticated USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'qualidade'::app_role) OR has_role(auth.uid(), 'nsp'::app_role) OR has_role(auth.uid(), 'gestor'::app_role)));

-- === asos_seguranca ===
ALTER TABLE public.asos_seguranca ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin, seguranca e rh_dp podem atualizar ASOs" ON public.asos_seguranca FOR UPDATE TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'seguranca'::app_role, 'rh_dp'::app_role]));
CREATE POLICY "Admin, seguranca e rh_dp podem deletar ASOs" ON public.asos_seguranca FOR DELETE TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'seguranca'::app_role, 'rh_dp'::app_role]));
CREATE POLICY "Admin, seguranca e rh_dp podem inserir ASOs" ON public.asos_seguranca FOR INSERT TO authenticated WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'seguranca'::app_role, 'rh_dp'::app_role]));
CREATE POLICY "Admin, seguranca e rh_dp podem ver ASOs" ON public.asos_seguranca FOR SELECT TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'seguranca'::app_role, 'rh_dp'::app_role]));

-- === assistencia_social_atendimentos ===
ALTER TABLE public.assistencia_social_atendimentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin and Social Assistance can insert attendances" ON public.assistencia_social_atendimentos FOR INSERT TO authenticated WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'assistencia_social'::app_role)));
CREATE POLICY "Admin and Social Assistance can update attendances" ON public.assistencia_social_atendimentos FOR UPDATE TO authenticated USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'assistencia_social'::app_role)));
CREATE POLICY "Admin and Social Assistance can view attendances" ON public.assistencia_social_atendimentos FOR SELECT TO authenticated USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'assistencia_social'::app_role)));
CREATE POLICY "Admin can delete attendances" ON public.assistencia_social_atendimentos FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- === assistencia_social_documentos ===
ALTER TABLE public.assistencia_social_documentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin and Social Assistance can delete documents" ON public.assistencia_social_documentos FOR DELETE TO authenticated USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'assistencia_social'::app_role)));
CREATE POLICY "Admin and Social Assistance can insert documents" ON public.assistencia_social_documentos FOR INSERT TO authenticated WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'assistencia_social'::app_role)));
CREATE POLICY "Admin and Social Assistance can view documents" ON public.assistencia_social_documentos FOR SELECT TO authenticated USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'assistencia_social'::app_role)));

-- === assistencia_social_encaminhamentos ===
ALTER TABLE public.assistencia_social_encaminhamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin and Social Assistance can insert referrals" ON public.assistencia_social_encaminhamentos FOR INSERT TO authenticated WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'assistencia_social'::app_role)));
CREATE POLICY "Admin and Social Assistance can update referrals" ON public.assistencia_social_encaminhamentos FOR UPDATE TO authenticated USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'assistencia_social'::app_role)));
CREATE POLICY "Admin and Social Assistance can view referrals" ON public.assistencia_social_encaminhamentos FOR SELECT TO authenticated USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'assistencia_social'::app_role)));
CREATE POLICY "Admin can delete referrals" ON public.assistencia_social_encaminhamentos FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- === assistencia_social_pacientes ===
ALTER TABLE public.assistencia_social_pacientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin and Social Assistance can insert patients" ON public.assistencia_social_pacientes FOR INSERT TO authenticated WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'assistencia_social'::app_role)));
CREATE POLICY "Admin and Social Assistance can update patients" ON public.assistencia_social_pacientes FOR UPDATE TO authenticated USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'assistencia_social'::app_role)));
CREATE POLICY "Admin and Social Assistance can view patients" ON public.assistencia_social_pacientes FOR SELECT TO authenticated USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'assistencia_social'::app_role)));
CREATE POLICY "Admin can delete patients" ON public.assistencia_social_pacientes FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- === atestados ===
ALTER TABLE public.atestados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Funcionários visualizam próprios atestados" ON public.atestados FOR SELECT TO public USING ((funcionario_user_id = auth.uid()));
CREATE POLICY "Gestores visualizam atestados de sua equipe" ON public.atestados FOR SELECT TO public USING ((has_role(auth.uid(), 'gestor'::app_role) AND gestor_gerencia_usuario(auth.uid(), funcionario_user_id)));
CREATE POLICY "RH_DP e Admin gerenciam atestados" ON public.atestados FOR ALL TO public USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'rh_dp'::app_role]));

-- === ativos ===
ALTER TABLE public.ativos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can delete ativos" ON public.ativos FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin/tech can insert ativos" ON public.ativos FOR INSERT TO authenticated WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'ti'::app_role, 'manutencao'::app_role, 'engenharia_clinica'::app_role]));
CREATE POLICY "Admin/tech can update ativos" ON public.ativos FOR UPDATE TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'ti'::app_role, 'manutencao'::app_role, 'engenharia_clinica'::app_role]));
CREATE POLICY "Authenticated users can view ativos" ON public.ativos FOR SELECT TO authenticated USING (true);

-- === ativos_disponibilidade ===
ALTER TABLE public.ativos_disponibilidade ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/tech can insert disponibilidade" ON public.ativos_disponibilidade FOR INSERT TO authenticated WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'ti'::app_role, 'manutencao'::app_role, 'engenharia_clinica'::app_role]));
CREATE POLICY "Admin/tech can update disponibilidade" ON public.ativos_disponibilidade FOR UPDATE TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'ti'::app_role, 'manutencao'::app_role, 'engenharia_clinica'::app_role]));
CREATE POLICY "Authenticated users can view disponibilidade" ON public.ativos_disponibilidade FOR SELECT TO authenticated USING (true);

-- === auditoria_formularios_config ===
ALTER TABLE public.auditoria_formularios_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/Qualidade can manage formularios_config" ON public.auditoria_formularios_config FOR ALL TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'qualidade'::app_role])) WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'qualidade'::app_role]));
CREATE POLICY "Authenticated users can read formularios_config" ON public.auditoria_formularios_config FOR SELECT TO authenticated USING (true);

-- === auditoria_perguntas_config ===
ALTER TABLE public.auditoria_perguntas_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/Qualidade can manage perguntas_config" ON public.auditoria_perguntas_config FOR ALL TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'qualidade'::app_role])) WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'qualidade'::app_role]));
CREATE POLICY "Authenticated users can read perguntas_config" ON public.auditoria_perguntas_config FOR SELECT TO authenticated USING (true);

-- === auditoria_secoes_config ===
ALTER TABLE public.auditoria_secoes_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/Qualidade can manage secoes_config" ON public.auditoria_secoes_config FOR ALL TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'qualidade'::app_role])) WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'qualidade'::app_role]));
CREATE POLICY "Authenticated users can read secoes_config" ON public.auditoria_secoes_config FOR SELECT TO authenticated USING (true);

-- === auditoria_temporalidade ===
ALTER TABLE public.auditoria_temporalidade ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin e gerencia podem ver todos os registros de temporalidade" ON public.auditoria_temporalidade FOR SELECT TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'gestor'::app_role]));
CREATE POLICY "Usuarios autenticados podem inserir registros de temporalidade" ON public.auditoria_temporalidade FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Usuarios do setor podem ver seus registros" ON public.auditoria_temporalidade FOR SELECT TO authenticated USING ((setor = get_user_setor(auth.uid())));

-- === auditorias_qualidade ===
ALTER TABLE public.auditorias_qualidade ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Quality roles can manage audits" ON public.auditorias_qualidade FOR ALL TO authenticated USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'qualidade'::app_role)));
CREATE POLICY "Quality roles can view audits" ON public.auditorias_qualidade FOR SELECT TO authenticated USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'qualidade'::app_role) OR has_role(auth.uid(), 'nsp'::app_role) OR has_role(auth.uid(), 'gestor'::app_role)));

-- === auditorias_seguranca_paciente ===
ALTER TABLE public.auditorias_seguranca_paciente ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin, Qualidade, NSP e Gestor podem visualizar auditorias" ON public.auditorias_seguranca_paciente FOR SELECT TO public USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'qualidade'::app_role, 'nsp'::app_role, 'gestor'::app_role]));
CREATE POLICY "Qualidade/NSP/Admin can delete patient safety audits" ON public.auditorias_seguranca_paciente FOR DELETE TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'qualidade'::app_role, 'nsp'::app_role]));
CREATE POLICY "Qualidade/NSP/Admin can insert patient safety audits" ON public.auditorias_seguranca_paciente FOR INSERT TO authenticated WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'qualidade'::app_role, 'nsp'::app_role]));
CREATE POLICY "Qualidade/NSP/Admin can update patient safety audits" ON public.auditorias_seguranca_paciente FOR UPDATE TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'qualidade'::app_role, 'nsp'::app_role]));

-- === avaliacoes_desempenho ===
ALTER TABLE public.avaliacoes_desempenho ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin and RH can manage avaliacoes" ON public.avaliacoes_desempenho FOR ALL TO authenticated USING ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'rh_dp'::app_role))) WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'rh_dp'::app_role)));

-- === avaliacoes_experiencia ===
ALTER TABLE public.avaliacoes_experiencia ENABLE ROW LEVEL SECURITY;
CREATE POLICY "RH/DP e admin podem atualizar avaliacoes_experiencia" ON public.avaliacoes_experiencia FOR UPDATE TO public USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'rh_dp'::app_role]));
CREATE POLICY "RH/DP e admin podem deletar avaliacoes_experiencia" ON public.avaliacoes_experiencia FOR DELETE TO public USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'rh_dp'::app_role]));
CREATE POLICY "RH/DP e admin podem inserir avaliacoes_experiencia" ON public.avaliacoes_experiencia FOR INSERT TO public WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'rh_dp'::app_role]));
CREATE POLICY "RH/DP e admin podem ver avaliacoes_experiencia" ON public.avaliacoes_experiencia FOR SELECT TO public USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'rh_dp'::app_role]));

-- === avaliacoes_historico ===
ALTER TABLE public.avaliacoes_historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Apenas admin visualiza histórico" ON public.avaliacoes_historico FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Sistema pode inserir histórico" ON public.avaliacoes_historico FOR INSERT TO authenticated WITH CHECK ((auth.uid() = executado_por));

-- === avaliacoes_prontuarios ===
ALTER TABLE public.avaliacoes_prontuarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin, Faturamento e Gestor visualizam avaliações" ON public.avaliacoes_prontuarios FOR SELECT TO public USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'faturamento'::app_role, 'gestor'::app_role]));
CREATE POLICY "Admins gerenciam avaliações" ON public.avaliacoes_prontuarios FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Faturamento pode atualizar próprias avaliações" ON public.avaliacoes_prontuarios FOR UPDATE TO authenticated USING ((has_role(auth.uid(), 'admin'::app_role) OR (has_role(auth.uid(), 'faturamento'::app_role) AND (avaliador_id = auth.uid()))));
CREATE POLICY "Faturamento pode criar avaliações" ON public.avaliacoes_prontuarios FOR INSERT TO authenticated WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'faturamento'::app_role]));

-- === banco_horas ===
ALTER TABLE public.banco_horas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Funcionários visualizam próprio banco_horas" ON public.banco_horas FOR SELECT TO public USING ((funcionario_user_id = auth.uid()));
CREATE POLICY "Gestores visualizam banco_horas de sua equipe" ON public.banco_horas FOR SELECT TO public USING ((has_role(auth.uid(), 'gestor'::app_role) AND gestor_gerencia_usuario(auth.uid(), funcionario_user_id)));
CREATE POLICY "RH_DP e Admin gerenciam banco_horas" ON public.banco_horas FOR ALL TO public USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'rh_dp'::app_role]));

-- === bed_records ===
ALTER TABLE public.bed_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "NIR e Admin podem atualizar bed_records" ON public.bed_records FOR UPDATE TO public USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'nir'::app_role]));
CREATE POLICY "NIR e Admin podem deletar bed_records" ON public.bed_records FOR DELETE TO public USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'nir'::app_role]));
CREATE POLICY "NIR e Admin podem inserir bed_records" ON public.bed_records FOR INSERT TO public WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'nir'::app_role]));
CREATE POLICY "NIR e Admin podem ver bed_records" ON public.bed_records FOR SELECT TO public USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'nir'::app_role]));

-- === cadastros_inconsistentes ===
ALTER TABLE public.cadastros_inconsistentes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin e Recepcao visualizam inconsistências" ON public.cadastros_inconsistentes FOR SELECT TO public USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'recepcao'::app_role]));
CREATE POLICY "Admins gerenciam cadastros inconsistentes" ON public.cadastros_inconsistentes FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can view inconsistencies" ON public.cadastros_inconsistentes FOR SELECT TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'recepcao'::app_role, 'faturamento'::app_role]));
CREATE POLICY "Recepcao can register inconsistencies" ON public.cadastros_inconsistentes FOR INSERT TO authenticated WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'recepcao'::app_role]));
CREATE POLICY "Recepcao can update inconsistencies" ON public.cadastros_inconsistentes FOR UPDATE TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'recepcao'::app_role]));

-- === cafe_litro_diario ===
ALTER TABLE public.cafe_litro_diario ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuários autenticados podem visualizar café litro" ON public.cafe_litro_diario FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Usuários com role restaurante podem inserir café litro" ON public.cafe_litro_diario FOR INSERT TO public WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'restaurante'::app_role]));
CREATE POLICY "Usuários com role restaurante podem atualizar café litro" ON public.cafe_litro_diario FOR UPDATE TO public USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'restaurante'::app_role]));
CREATE POLICY "Usuários com role restaurante podem deletar café litro" ON public.cafe_litro_diario FOR DELETE TO public USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'restaurante'::app_role]));

-- === Demais tabelas (RLS habilitado com padrões documentados) ===
ALTER TABLE public.cargos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.setores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chamados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_conversas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enfermagem_escalas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enfermagem_trocas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formularios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formulario_campos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formulario_permissoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formulario_respostas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gerencia_fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gerencia_notas_fiscais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gerencia_planos_acao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gestor_cargos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gestor_setores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidentes_nsp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.justificativas_ponto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.justificativas_extensao_jornada ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_treinamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_inscricoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_materiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs_acesso ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nir_colaboradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nir_registros_producao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nsp_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nsp_action_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passagem_plantao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passagem_plantao_pendencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos_compra ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfis_sistema ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissoes_perfil ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuario_perfil ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes_estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profissionais_saude ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prontuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saida_prontuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protocolo_atendimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protocolo_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refeicoes_registros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regulacao_sus_facil ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reunioes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_movimentacoes_setor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_ocorrencias_disciplinares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.riscos_operacionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rouparia_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rouparia_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rouparia_movimentacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disc_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_statistics ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- NOTA FINAL
-- ============================================================
-- Este arquivo contém a exportação COMPLETA e UNIFICADA do banco:
-- 1. Tipos customizados (ENUM)
-- 2. Todas as tabelas com colunas e defaults
-- 3. Primary Keys
-- 4. Unique Constraints
-- 5. Foreign Keys
-- 6. Todas as funções (triggers functions + utility functions)
-- 7. Todos os triggers
-- 8. Políticas RLS detalhadas (tabelas A-C) + RLS habilitado para demais
--
-- Para políticas RLS completas das tabelas D-Z, consulte:
-- SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies WHERE schemaname = 'public';
-- ============================================================

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

-- FIM DO EXPORT COMPLETO
