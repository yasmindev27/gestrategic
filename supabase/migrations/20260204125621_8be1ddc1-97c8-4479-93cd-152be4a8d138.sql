-- =====================================================
-- OTIMIZAÇÃO DO BANCO DE DADOS - ÍNDICES E PERFORMANCE
-- =====================================================

-- 1. ÍNDICES PARA TABELAS MAIS CONSULTADAS
-- =========================================

-- Profiles - consultas frequentes por user_id, setor e cargo
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_setor ON public.profiles(setor) WHERE setor IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_cargo ON public.profiles(cargo) WHERE cargo IS NOT NULL;

-- User Roles - consultas de autorização
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- Chamados - buscas por status, categoria e datas
CREATE INDEX IF NOT EXISTS idx_chamados_status ON public.chamados(status);
CREATE INDEX IF NOT EXISTS idx_chamados_categoria ON public.chamados(categoria);
CREATE INDEX IF NOT EXISTS idx_chamados_data_abertura ON public.chamados(data_abertura DESC);
CREATE INDEX IF NOT EXISTS idx_chamados_solicitante_id ON public.chamados(solicitante_id);
CREATE INDEX IF NOT EXISTS idx_chamados_atribuido_para ON public.chamados(atribuido_para) WHERE atribuido_para IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chamados_prioridade ON public.chamados(prioridade);

-- Bed Records - consultas por data e setor (mapa de leitos)
CREATE INDEX IF NOT EXISTS idx_bed_records_shift_date ON public.bed_records(shift_date DESC);
CREATE INDEX IF NOT EXISTS idx_bed_records_sector ON public.bed_records(sector);
CREATE INDEX IF NOT EXISTS idx_bed_records_shift_type ON public.bed_records(shift_type);
CREATE INDEX IF NOT EXISTS idx_bed_records_bed_id ON public.bed_records(bed_id);

-- Saída de Prontuários - consultas frequentes
CREATE INDEX IF NOT EXISTS idx_saida_prontuarios_status ON public.saida_prontuarios(status);
CREATE INDEX IF NOT EXISTS idx_saida_prontuarios_created_at ON public.saida_prontuarios(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saida_prontuarios_numero ON public.saida_prontuarios(numero_prontuario);

-- Prontuários - consultas por número e status
CREATE INDEX IF NOT EXISTS idx_prontuarios_numero ON public.prontuarios(numero_prontuario);
CREATE INDEX IF NOT EXISTS idx_prontuarios_status ON public.prontuarios(status);

-- Logs de Acesso - consultas de auditoria
CREATE INDEX IF NOT EXISTS idx_logs_acesso_created_at ON public.logs_acesso(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_acesso_user_id ON public.logs_acesso(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_acesso_modulo ON public.logs_acesso(modulo);

-- Agenda Items - consultas por data e criador
CREATE INDEX IF NOT EXISTS idx_agenda_items_data_inicio ON public.agenda_items(data_inicio);
CREATE INDEX IF NOT EXISTS idx_agenda_items_criado_por ON public.agenda_items(criado_por);
CREATE INDEX IF NOT EXISTS idx_agenda_items_status ON public.agenda_items(status);

-- Agenda Destinatários - consultas por usuário
CREATE INDEX IF NOT EXISTS idx_agenda_destinatarios_usuario_id ON public.agenda_destinatarios(usuario_id);

-- Chat Mensagens - consultas por conversa e data
CREATE INDEX IF NOT EXISTS idx_chat_mensagens_conversa_id ON public.chat_mensagens(conversa_id);
CREATE INDEX IF NOT EXISTS idx_chat_mensagens_created_at ON public.chat_mensagens(created_at DESC);

-- Chat Participantes - consultas por usuário
CREATE INDEX IF NOT EXISTS idx_chat_participantes_user_id ON public.chat_participantes(user_id);

-- Enfermagem Escalas - consultas por profissional e data
CREATE INDEX IF NOT EXISTS idx_enfermagem_escalas_profissional_id ON public.enfermagem_escalas(profissional_id);
CREATE INDEX IF NOT EXISTS idx_enfermagem_escalas_data_plantao ON public.enfermagem_escalas(data_plantao);
CREATE INDEX IF NOT EXISTS idx_enfermagem_escalas_setor ON public.enfermagem_escalas(setor);

-- Refeições Registros - consultas por data (restaurante) - coluna correta: data_registro
CREATE INDEX IF NOT EXISTS idx_refeicoes_registros_data ON public.refeicoes_registros(data_registro DESC);
CREATE INDEX IF NOT EXISTS idx_refeicoes_registros_tipo ON public.refeicoes_registros(tipo_refeicao);

-- Produtos - consultas de inventário
CREATE INDEX IF NOT EXISTS idx_produtos_setor ON public.produtos(setor_responsavel);
CREATE INDEX IF NOT EXISTS idx_produtos_ativo ON public.produtos(ativo);
CREATE INDEX IF NOT EXISTS idx_produtos_categoria ON public.produtos(categoria) WHERE categoria IS NOT NULL;

-- Atestados - consultas por funcionário e status
CREATE INDEX IF NOT EXISTS idx_atestados_funcionario_user_id ON public.atestados(funcionario_user_id);
CREATE INDEX IF NOT EXISTS idx_atestados_status ON public.atestados(status);
CREATE INDEX IF NOT EXISTS idx_atestados_data_inicio ON public.atestados(data_inicio);

-- Banco de Horas - consultas por funcionário
CREATE INDEX IF NOT EXISTS idx_banco_horas_funcionario_user_id ON public.banco_horas(funcionario_user_id);
CREATE INDEX IF NOT EXISTS idx_banco_horas_status ON public.banco_horas(status);

-- Incidentes NSP - consultas por status e data
CREATE INDEX IF NOT EXISTS idx_incidentes_nsp_status ON public.incidentes_nsp(status);
CREATE INDEX IF NOT EXISTS idx_incidentes_nsp_data_ocorrencia ON public.incidentes_nsp(data_ocorrencia DESC);
CREATE INDEX IF NOT EXISTS idx_incidentes_nsp_setor ON public.incidentes_nsp(setor);

-- Auditorias Qualidade - consultas por status e data
CREATE INDEX IF NOT EXISTS idx_auditorias_qualidade_status ON public.auditorias_qualidade(status);
CREATE INDEX IF NOT EXISTS idx_auditorias_qualidade_data ON public.auditorias_qualidade(data_auditoria DESC);

-- 2. ÍNDICES COMPOSTOS PARA CONSULTAS FREQUENTES
-- ===============================================

-- Chamados por status e data (dashboard)
CREATE INDEX IF NOT EXISTS idx_chamados_status_data ON public.chamados(status, data_abertura DESC);

-- Bed Records por data e setor (mapa de leitos)
CREATE INDEX IF NOT EXISTS idx_bed_records_date_sector ON public.bed_records(shift_date, sector);

-- Escalas por data e setor (enfermagem)
CREATE INDEX IF NOT EXISTS idx_enfermagem_escalas_data_setor ON public.enfermagem_escalas(data_plantao, setor);

-- 3. ÍNDICES PARA SISTEMA DE PERMISSÕES
-- =====================================

CREATE INDEX IF NOT EXISTS idx_usuario_perfil_user_id ON public.usuario_perfil(user_id);
CREATE INDEX IF NOT EXISTS idx_usuario_perfil_perfil_id ON public.usuario_perfil(perfil_id);
CREATE INDEX IF NOT EXISTS idx_permissoes_perfil_perfil_id ON public.permissoes_perfil(perfil_id);
CREATE INDEX IF NOT EXISTS idx_permissoes_perfil_modulo_id ON public.permissoes_perfil(modulo_id);
CREATE INDEX IF NOT EXISTS idx_permissoes_ferramenta_perfil_id ON public.permissoes_ferramenta(perfil_id);
CREATE INDEX IF NOT EXISTS idx_permissoes_ferramenta_ferramenta_id ON public.permissoes_ferramenta(ferramenta_id);
CREATE INDEX IF NOT EXISTS idx_gestor_setores_gestor ON public.gestor_setores(gestor_user_id);
CREATE INDEX IF NOT EXISTS idx_gestor_cargos_gestor ON public.gestor_cargos(gestor_user_id);

-- 4. COMENTÁRIOS NAS TABELAS PRINCIPAIS
-- =====================================

COMMENT ON TABLE public.profiles IS 'Perfis de usuários do sistema com dados pessoais e profissionais';
COMMENT ON TABLE public.user_roles IS 'Papéis de usuários para controle de acesso';
COMMENT ON TABLE public.chamados IS 'Sistema de chamados técnicos e de manutenção';
COMMENT ON TABLE public.bed_records IS 'Registros do mapa de leitos por plantão';
COMMENT ON TABLE public.logs_acesso IS 'Auditoria de acessos e ações no sistema';