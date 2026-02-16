
-- Add file attachment and almoxarifado routing columns
ALTER TABLE public.pedidos_compra 
ADD COLUMN IF NOT EXISTS arquivo_url text,
ADD COLUMN IF NOT EXISTS arquivo_nome text,
ADD COLUMN IF NOT EXISTS encaminhado_almoxarifado boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS encaminhado_em timestamp with time zone;

-- Create storage bucket for purchase order attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('pedidos-compra-anexos', 'pedidos-compra-anexos', false)
ON CONFLICT (id) DO NOTHING;

-- RLS for the bucket: authenticated users can upload
CREATE POLICY "Authenticated users can upload pedidos anexos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'pedidos-compra-anexos');

-- Authenticated users can view their uploads
CREATE POLICY "Authenticated users can view pedidos anexos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'pedidos-compra-anexos');

-- Authenticated users can delete their own uploads
CREATE POLICY "Authenticated users can delete pedidos anexos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'pedidos-compra-anexos' AND (storage.foldername(name))[1] = auth.uid()::text);
