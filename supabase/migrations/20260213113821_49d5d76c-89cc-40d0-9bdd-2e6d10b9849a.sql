-- Indexes for LMS tables (new)
CREATE INDEX IF NOT EXISTS idx_lms_treinamentos_status ON public.lms_treinamentos(status);
CREATE INDEX IF NOT EXISTS idx_lms_treinamentos_data_limite ON public.lms_treinamentos(data_limite);
CREATE INDEX IF NOT EXISTS idx_lms_treinamentos_criado_por ON public.lms_treinamentos(criado_por);
CREATE INDEX IF NOT EXISTS idx_lms_inscricoes_usuario ON public.lms_inscricoes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_lms_inscricoes_treinamento ON public.lms_inscricoes(treinamento_id);
CREATE INDEX IF NOT EXISTS idx_lms_inscricoes_status ON public.lms_inscricoes(status);
CREATE INDEX IF NOT EXISTS idx_lms_inscricoes_usuario_treinamento ON public.lms_inscricoes(usuario_id, treinamento_id);
CREATE INDEX IF NOT EXISTS idx_lms_materiais_treinamento ON public.lms_materiais(treinamento_id);
CREATE INDEX IF NOT EXISTS idx_lms_quiz_perguntas_treinamento ON public.lms_quiz_perguntas(treinamento_id);
CREATE INDEX IF NOT EXISTS idx_lms_tentativas_treinamento ON public.lms_tentativas_quiz(treinamento_id);
CREATE INDEX IF NOT EXISTS idx_lms_tentativas_inscricao ON public.lms_tentativas_quiz(inscricao_id);
CREATE INDEX IF NOT EXISTS idx_lms_tentativas_usuario ON public.lms_tentativas_quiz(usuario_id);

-- Index for saida_prontuarios status (heavily queried on dashboard)
CREATE INDEX IF NOT EXISTS idx_saida_prontuarios_status ON public.saida_prontuarios(status);

-- Index for chamados status + date (dashboard queries)
CREATE INDEX IF NOT EXISTS idx_chamados_status_data ON public.chamados(status, data_abertura);

-- Index for agenda date range queries
CREATE INDEX IF NOT EXISTS idx_agenda_items_data_inicio ON public.agenda_items(data_inicio);

-- Index for logs_acesso by date
CREATE INDEX IF NOT EXISTS idx_logs_acesso_created_at ON public.logs_acesso(created_at);