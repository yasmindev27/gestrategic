
-- Índices para otimizar as queries do módulo de faturamento

-- Filtro por data de atendimento (range queries)
CREATE INDEX IF NOT EXISTS idx_saida_prontuarios_data_atendimento ON public.saida_prontuarios (data_atendimento DESC);

-- Filtro composto: folha_avulsa + data
CREATE INDEX IF NOT EXISTS idx_saida_prontuarios_folha_data ON public.saida_prontuarios (is_folha_avulsa, data_atendimento DESC);

-- Índice composto principal: is_folha_avulsa + status + data
CREATE INDEX IF NOT EXISTS idx_saida_prontuarios_main ON public.saida_prontuarios (is_folha_avulsa, status, data_atendimento DESC);

-- Índice para busca por nome (LIKE prefix e ilike)
CREATE INDEX IF NOT EXISTS idx_saida_prontuarios_nome_lower ON public.saida_prontuarios (lower(paciente_nome));

-- Índice para observacao_classificacao (detectar importados via salus)
CREATE INDEX IF NOT EXISTS idx_saida_prontuarios_obs_salus ON public.saida_prontuarios (lower(observacao_classificacao)) WHERE observacao_classificacao IS NOT NULL;
