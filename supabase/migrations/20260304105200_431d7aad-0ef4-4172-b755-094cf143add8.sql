
-- PERFORMANCE INDEXES for high-traffic tables

-- saida_prontuarios (37k rows)
CREATE INDEX IF NOT EXISTS idx_saida_prontuarios_created ON public.saida_prontuarios (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saida_prontuarios_prontuario ON public.saida_prontuarios (prontuario_id);
CREATE INDEX IF NOT EXISTS idx_saida_prontuarios_status ON public.saida_prontuarios (status);

-- avaliacoes_prontuarios (22k rows)
CREATE INDEX IF NOT EXISTS idx_avaliacoes_prontuarios_prontuario ON public.avaliacoes_prontuarios (prontuario_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_prontuarios_status ON public.avaliacoes_prontuarios (status);

-- logs_acesso (15k rows)
CREATE INDEX IF NOT EXISTS idx_logs_acesso_created ON public.logs_acesso (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_acesso_user ON public.logs_acesso (user_id);

-- bed_records
CREATE INDEX IF NOT EXISTS idx_bed_records_shift_date ON public.bed_records (shift_date);
CREATE INDEX IF NOT EXISTS idx_bed_records_sector ON public.bed_records (sector);

-- prontuarios
CREATE INDEX IF NOT EXISTS idx_prontuarios_status ON public.prontuarios (status);

-- entregas_prontuarios_itens
CREATE INDEX IF NOT EXISTS idx_entregas_itens_entrega ON public.entregas_prontuarios_itens (entrega_id);

-- ANALYZE top tables
ANALYZE public.saida_prontuarios;
ANALYZE public.avaliacoes_prontuarios;
ANALYZE public.logs_acesso;
ANALYZE public.bed_records;
ANALYZE public.prontuarios;
