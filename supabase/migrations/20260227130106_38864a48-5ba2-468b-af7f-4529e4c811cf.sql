
-- Add numero_ca and data_validade columns to produtos table for EPI tracking
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS numero_ca TEXT;
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS data_validade DATE;
