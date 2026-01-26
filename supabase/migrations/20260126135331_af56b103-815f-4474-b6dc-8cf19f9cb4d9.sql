-- Tornar numero_prontuario opcional e com valor default
ALTER TABLE public.saida_prontuarios 
ALTER COLUMN numero_prontuario DROP NOT NULL;

ALTER TABLE public.saida_prontuarios 
ALTER COLUMN numero_prontuario SET DEFAULT NULL;

-- Atualizar registros existentes que têm valores auto-gerados (ATD-) para null
UPDATE public.saida_prontuarios 
SET numero_prontuario = NULL 
WHERE numero_prontuario LIKE 'ATD-%';