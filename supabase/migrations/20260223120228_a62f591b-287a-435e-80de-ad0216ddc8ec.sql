
-- Composite index for FaturamentoModule: list query (status + data_atendimento + paciente_nome)
CREATE INDEX IF NOT EXISTS idx_saida_prontuarios_status_data_nome 
ON public.saida_prontuarios (status, data_atendimento DESC, paciente_nome);

-- Index for "faltantes" query: saidas without finalized evaluation (LEFT JOIN pattern)
CREATE INDEX IF NOT EXISTS idx_avaliacoes_saida_finalizada 
ON public.avaliacoes_prontuarios (saida_prontuario_id, is_finalizada) 
WHERE is_finalizada = true;

-- Index for avaliacao tab search
CREATE INDEX IF NOT EXISTS idx_avaliacoes_data_inicio 
ON public.avaliacoes_prontuarios (data_inicio DESC);

-- Index for saida_prontuarios paciente_nome text search (trigram would be ideal but btree pattern is sufficient)
CREATE INDEX IF NOT EXISTS idx_saida_prontuarios_nome_pattern 
ON public.saida_prontuarios (paciente_nome text_pattern_ops);

-- Drop duplicate index
DROP INDEX IF EXISTS idx_saida_prontuarios_created;

-- Analyze tables to update statistics
ANALYZE public.saida_prontuarios;
ANALYZE public.avaliacoes_prontuarios;
