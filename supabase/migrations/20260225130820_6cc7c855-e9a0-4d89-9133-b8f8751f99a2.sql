
-- =============================================
-- OTIMIZAÇÃO DE ÍNDICES DO BANCO DE DADOS
-- =============================================

-- 1. REMOVER ÍNDICES DUPLICADOS
DROP INDEX IF EXISTS public.idx_logs_acesso_data;
DROP INDEX IF EXISTS public.idx_logs_acesso_user_id;
DROP INDEX IF EXISTS public.idx_refeicoes_registros_data;
DROP INDEX IF EXISTS public.idx_refeicoes_registros_tipo_refeicao;

-- 2. ÍNDICES CRÍTICOS FALTANTES - Entregas de Prontuários
CREATE INDEX IF NOT EXISTS idx_entregas_itens_saida ON public.entregas_prontuarios_itens (saida_prontuario_id);
CREATE INDEX IF NOT EXISTS idx_entregas_itens_entrega ON public.entregas_prontuarios_itens (entrega_id);
CREATE INDEX IF NOT EXISTS idx_entregas_prontuarios_setor ON public.entregas_prontuarios (setor_origem, setor_destino);
CREATE INDEX IF NOT EXISTS idx_entregas_prontuarios_data ON public.entregas_prontuarios (data_hora DESC);

-- 3. ÍNDICE PARA BUSCA DE FUNCIONÁRIOS (ilike em full_name)
CREATE INDEX IF NOT EXISTS idx_profiles_full_name_trgm ON public.profiles USING btree (full_name text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles (user_id);

-- 4. ÍNDICE COMPOSTO PARA FILTRO DIÁRIO em saida_prontuarios (created_at + status)
CREATE INDEX IF NOT EXISTS idx_saida_prontuarios_created_status ON public.saida_prontuarios (created_at DESC, status);

-- 5. ÍNDICE PARA avaliacoes_prontuarios - avaliador lookup
CREATE INDEX IF NOT EXISTS idx_avaliacoes_avaliador ON public.avaliacoes_prontuarios (avaliador_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_data_conclusao ON public.avaliacoes_prontuarios (data_conclusao DESC);

-- 6. ÍNDICE PARA bed_records - consultas frequentes por setor/turno
CREATE INDEX IF NOT EXISTS idx_bed_records_shift ON public.bed_records (sector, shift_date, shift_type);

-- 7. ÍNDICE PARA chamados - filtro por status e data
CREATE INDEX IF NOT EXISTS idx_chamados_status_data ON public.chamados (status, data_abertura DESC);

-- 8. ÍNDICE PARA enfermagem_escalas - filtro por data e setor
CREATE INDEX IF NOT EXISTS idx_enfermagem_escalas_data_setor ON public.enfermagem_escalas (data_plantao, setor);
