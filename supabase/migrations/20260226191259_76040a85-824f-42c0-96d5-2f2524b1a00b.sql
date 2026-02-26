
-- Add approval fields to justificativas_ponto
ALTER TABLE public.justificativas_ponto 
  ADD COLUMN IF NOT EXISTS aprovado_por uuid,
  ADD COLUMN IF NOT EXISTS aprovado_por_nome text,
  ADD COLUMN IF NOT EXISTS aprovado_em timestamptz,
  ADD COLUMN IF NOT EXISTS justificativa_aprovacao text;
