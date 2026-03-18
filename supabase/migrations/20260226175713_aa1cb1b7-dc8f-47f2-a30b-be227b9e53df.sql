
-- Add missing columns from original repos
ALTER TABLE public.protocolo_atendimentos
  ADD COLUMN IF NOT EXISTS investigation_name text,
  ADD COLUMN IF NOT EXISTS investigation_status text,
  ADD COLUMN IF NOT EXISTS attachment_path text,
  ADD COLUMN IF NOT EXISTS achados_clinicos jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS achados_neurologicos jsonb DEFAULT '[]'::jsonb;
