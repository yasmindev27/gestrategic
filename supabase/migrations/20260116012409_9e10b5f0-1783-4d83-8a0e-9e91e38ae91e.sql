-- Alterar o valor padrão da coluna status para 'aprovada' (dietas são automaticamente aceitas)
ALTER TABLE public.solicitacoes_dieta ALTER COLUMN status SET DEFAULT 'aprovada';

-- Atualizar todas as dietas pendentes existentes para aprovadas
UPDATE public.solicitacoes_dieta SET status = 'aprovada' WHERE status = 'pendente';