
-- Add columns for tracking found and resolved pendências
ALTER TABLE public.passagem_plantao
ADD COLUMN IF NOT EXISTS pendencias_encontradas TEXT,
ADD COLUMN IF NOT EXISTS pendencias_resolvidas TEXT;
