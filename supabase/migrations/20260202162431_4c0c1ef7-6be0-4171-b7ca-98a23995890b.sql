-- Adicionar colunas para rastrear responsáveis pelas movimentações
ALTER TABLE public.rouparia_movimentacoes 
ADD COLUMN IF NOT EXISTS responsavel_retirada TEXT,
ADD COLUMN IF NOT EXISTS responsavel_devolucao TEXT;