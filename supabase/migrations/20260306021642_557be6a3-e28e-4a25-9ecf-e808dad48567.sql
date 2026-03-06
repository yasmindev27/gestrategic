
-- Add tratativa fields to incidentes_nsp
ALTER TABLE public.incidentes_nsp 
  ADD COLUMN IF NOT EXISTS responsavel_tratativa_id uuid,
  ADD COLUMN IF NOT EXISTS responsavel_tratativa_nome text,
  ADD COLUMN IF NOT EXISTS plano_acao text,
  ADD COLUMN IF NOT EXISTS evidencia_url text,
  ADD COLUMN IF NOT EXISTS data_conclusao timestamptz;

-- Create storage bucket for evidence files
INSERT INTO storage.buckets (id, name, public)
VALUES ('incidentes-evidencias', 'incidentes-evidencias', false)
ON CONFLICT (id) DO NOTHING;

-- RLS for the bucket: authenticated users can upload/read
CREATE POLICY "Authenticated users can upload evidence"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'incidentes-evidencias');

CREATE POLICY "Authenticated users can view evidence"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'incidentes-evidencias');
