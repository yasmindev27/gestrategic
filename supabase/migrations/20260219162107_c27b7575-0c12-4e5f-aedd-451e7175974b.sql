ALTER TABLE public.transferencia_solicitacoes 
ADD COLUMN IF NOT EXISTS motorista_nome text,
ADD COLUMN IF NOT EXISTS veiculo_placa text,
ADD COLUMN IF NOT EXISTS veiculo_tipo text;