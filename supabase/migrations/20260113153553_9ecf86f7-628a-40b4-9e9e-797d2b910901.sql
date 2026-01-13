-- Adicionar novos campos na tabela solicitacoes_dieta
ALTER TABLE public.solicitacoes_dieta
ADD COLUMN IF NOT EXISTS paciente_nome text,
ADD COLUMN IF NOT EXISTS paciente_data_nascimento date,
ADD COLUMN IF NOT EXISTS quarto_leito text,
ADD COLUMN IF NOT EXISTS tem_acompanhante boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS restricoes_alimentares text,
ADD COLUMN IF NOT EXISTS horarios_refeicoes text[] DEFAULT ARRAY['cafe', 'almoco', 'lanche', 'jantar']::text[];