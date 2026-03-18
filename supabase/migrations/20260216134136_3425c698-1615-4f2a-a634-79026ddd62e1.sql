
ALTER TABLE public.reunioes ADD COLUMN IF NOT EXISTS hora_inicio timestamptz;
ALTER TABLE public.reunioes ADD COLUMN IF NOT EXISTS hora_encerramento timestamptz;
