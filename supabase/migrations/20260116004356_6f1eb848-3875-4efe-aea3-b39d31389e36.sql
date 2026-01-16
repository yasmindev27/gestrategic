-- Adicionar coluna matricula na tabela profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS matricula TEXT UNIQUE;

-- Adicionar coluna para controle de primeiro login
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deve_trocar_senha BOOLEAN DEFAULT true;

-- Criar índice para busca por matrícula
CREATE INDEX IF NOT EXISTS idx_profiles_matricula ON public.profiles(matricula);