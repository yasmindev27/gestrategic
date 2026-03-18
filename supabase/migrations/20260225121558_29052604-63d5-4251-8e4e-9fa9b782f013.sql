
ALTER TABLE public.saida_prontuarios
ADD COLUMN pendencia_resolvida_em timestamptz DEFAULT NULL,
ADD COLUMN pendencia_resolvida_por uuid DEFAULT NULL;
