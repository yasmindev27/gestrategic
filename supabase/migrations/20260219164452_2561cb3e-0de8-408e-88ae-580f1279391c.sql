-- Add km_rodados field to track distance per transfer
ALTER TABLE public.transferencia_solicitacoes
ADD COLUMN km_rodados numeric DEFAULT null;