-- Permitir prontuario_id nulo na tabela avaliacoes_prontuarios
-- Isso é necessário porque os registros de saida_prontuarios 
-- nem sempre têm um numero_prontuario associado

ALTER TABLE public.avaliacoes_prontuarios 
ALTER COLUMN prontuario_id DROP NOT NULL;

-- Remover a foreign key constraint que pode impedir valores nulos
ALTER TABLE public.avaliacoes_prontuarios 
DROP CONSTRAINT IF EXISTS avaliacoes_prontuarios_prontuario_id_fkey;

-- Recriar a foreign key permitindo nulos (ON DELETE SET NULL)
ALTER TABLE public.avaliacoes_prontuarios 
ADD CONSTRAINT avaliacoes_prontuarios_prontuario_id_fkey 
FOREIGN KEY (prontuario_id) REFERENCES public.prontuarios(id) ON DELETE SET NULL;