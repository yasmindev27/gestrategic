
-- =============================================
-- PARTE 1: CORREÇÕES DE SEGURANÇA (RLS)
-- =============================================

-- 1. enfermagem_trocas_historico: restringir INSERT
DROP POLICY IF EXISTS "Sistema pode inserir histórico" ON public.enfermagem_trocas_historico;
CREATE POLICY "Autenticados podem inserir histórico"
ON public.enfermagem_trocas_historico
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = executado_por);

-- 2. incidentes_nsp: restringir INSERT
DROP POLICY IF EXISTS "Authenticated users can create incidents" ON public.incidentes_nsp;
CREATE POLICY "Autenticados podem criar incidentes"
ON public.incidentes_nsp
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = notificador_id 
  OR notificacao_anonima = true
);

-- 3. colaboradores_restaurante: restringir acesso direto
DROP POLICY IF EXISTS "Totem pode consultar colaboradores" ON public.colaboradores_restaurante;
DROP POLICY IF EXISTS "Anyone can view colaboradores" ON public.colaboradores_restaurante;
DROP POLICY IF EXISTS "Authenticated can view colaboradores" ON public.colaboradores_restaurante;
DROP POLICY IF EXISTS "Colaboradores visíveis para todos" ON public.colaboradores_restaurante;

CREATE POLICY "Gestão pode ver colaboradores restaurante"
ON public.colaboradores_restaurante
FOR SELECT TO authenticated
USING (
  public.has_any_role(auth.uid(), ARRAY['admin', 'restaurante', 'gestor', 'rh_dp']::app_role[])
);

-- =============================================
-- PARTE 2: OTIMIZAÇÕES DE PERFORMANCE (ÍNDICES)
-- =============================================

CREATE INDEX IF NOT EXISTS idx_chamados_status ON public.chamados(status);
CREATE INDEX IF NOT EXISTS idx_chamados_data_abertura ON public.chamados(data_abertura);
CREATE INDEX IF NOT EXISTS idx_chamados_solicitante_id ON public.chamados(solicitante_id);
CREATE INDEX IF NOT EXISTS idx_chamados_atribuido_para ON public.chamados(atribuido_para);

CREATE INDEX IF NOT EXISTS idx_bed_records_shift ON public.bed_records(shift_date, shift_type, sector);
CREATE INDEX IF NOT EXISTS idx_bed_records_bed_id ON public.bed_records(bed_id);

CREATE INDEX IF NOT EXISTS idx_refeicoes_data ON public.refeicoes_registros(data_registro);
CREATE INDEX IF NOT EXISTS idx_refeicoes_user ON public.refeicoes_registros(colaborador_user_id);

CREATE INDEX IF NOT EXISTS idx_chat_mensagens_conversa ON public.chat_mensagens(conversa_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_participantes_user ON public.chat_participantes(user_id);

CREATE INDEX IF NOT EXISTS idx_enfermagem_escalas_data ON public.enfermagem_escalas(data_plantao);
CREATE INDEX IF NOT EXISTS idx_enfermagem_escalas_profissional ON public.enfermagem_escalas(profissional_id);

CREATE INDEX IF NOT EXISTS idx_saida_prontuarios_status ON public.saida_prontuarios(status);
CREATE INDEX IF NOT EXISTS idx_saida_prontuarios_created ON public.saida_prontuarios(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_incidentes_status ON public.incidentes_nsp(status);
CREATE INDEX IF NOT EXISTS idx_incidentes_data ON public.incidentes_nsp(data_ocorrencia);

CREATE INDEX IF NOT EXISTS idx_atestados_funcionario ON public.atestados(funcionario_user_id);
CREATE INDEX IF NOT EXISTS idx_atestados_status ON public.atestados(status);

CREATE INDEX IF NOT EXISTS idx_banco_horas_funcionario ON public.banco_horas(funcionario_user_id);
CREATE INDEX IF NOT EXISTS idx_banco_horas_data ON public.banco_horas(data);

CREATE INDEX IF NOT EXISTS idx_escalas_medicos_data ON public.escalas_medicos(data_plantao);
CREATE INDEX IF NOT EXISTS idx_escalas_medicos_profissional ON public.escalas_medicos(profissional_id);

CREATE INDEX IF NOT EXISTS idx_auditorias_sp_data ON public.auditorias_seguranca_paciente(data_auditoria);
CREATE INDEX IF NOT EXISTS idx_auditorias_sp_tipo ON public.auditorias_seguranca_paciente(tipo);

CREATE INDEX IF NOT EXISTS idx_logs_acesso_user ON public.logs_acesso(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_acesso_data ON public.logs_acesso(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_acesso_modulo ON public.logs_acesso(modulo);
