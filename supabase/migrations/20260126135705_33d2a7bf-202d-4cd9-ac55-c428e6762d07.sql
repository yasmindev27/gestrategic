-- Add column to identify folhas avulsas (loose sheets) in saida_prontuarios
ALTER TABLE public.saida_prontuarios 
ADD COLUMN IF NOT EXISTS is_folha_avulsa boolean DEFAULT false;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_saida_prontuarios_folha_avulsa ON public.saida_prontuarios(is_folha_avulsa);

COMMENT ON COLUMN public.saida_prontuarios.is_folha_avulsa IS 'Indica se o registro é uma folha avulsa (folha que faz parte de um prontuário enviada de forma incompleta)';