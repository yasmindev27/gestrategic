-- Adicionar coluna para nome do paciente
ALTER TABLE public.cadastros_inconsistentes 
ADD COLUMN IF NOT EXISTS paciente_nome TEXT;

-- Tornar registrado_por nullable para permitir inserções públicas
ALTER TABLE public.cadastros_inconsistentes 
ALTER COLUMN registrado_por DROP NOT NULL;

-- Tornar resolvido_por também capaz de receber texto (para resolução pública)
ALTER TABLE public.cadastros_inconsistentes 
ADD COLUMN IF NOT EXISTS resolvido_por_nome TEXT;