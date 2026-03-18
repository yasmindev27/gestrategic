
-- Add tipo column to support multiple schedule types
ALTER TABLE public.escalas_tec_enfermagem 
ADD COLUMN tipo text NOT NULL DEFAULT 'tecnicos';

-- Drop old unique constraint (mes, ano only)
ALTER TABLE public.escalas_tec_enfermagem 
DROP CONSTRAINT escalas_tec_enfermagem_mes_ano_key;

-- Create new unique constraint including tipo
ALTER TABLE public.escalas_tec_enfermagem 
ADD CONSTRAINT escalas_tec_enfermagem_mes_ano_tipo_key UNIQUE (mes, ano, tipo);
