-- Criar bucket de atestados (caso não exista)
INSERT INTO storage.buckets (id, name, public)
VALUES ('atestados', 'atestados', false)
ON CONFLICT (id) DO NOTHING;

-- Política para upload de arquivos (admin e rh_dp)
CREATE POLICY "RH/DP e Admin podem fazer upload de atestados"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'atestados' 
  AND public.has_any_role(auth.uid(), ARRAY['admin', 'rh_dp']::public.app_role[])
);

-- Política para visualizar arquivos (admin e rh_dp)
CREATE POLICY "RH/DP e Admin podem visualizar atestados"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'atestados' 
  AND public.has_any_role(auth.uid(), ARRAY['admin', 'rh_dp']::public.app_role[])
);

-- Política para deletar arquivos (admin e rh_dp)
CREATE POLICY "RH/DP e Admin podem deletar atestados"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'atestados' 
  AND public.has_any_role(auth.uid(), ARRAY['admin', 'rh_dp']::public.app_role[])
);