-- Criar bucket para armazenar atestados digitalizados
INSERT INTO storage.buckets (id, name, public)
VALUES ('atestados', 'atestados', false);

-- Políticas de acesso ao bucket
CREATE POLICY "RH_DP e Admin podem fazer upload de atestados"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'atestados' 
  AND has_any_role(auth.uid(), ARRAY['admin'::app_role, 'rh_dp'::app_role])
);

CREATE POLICY "RH_DP e Admin podem visualizar atestados"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'atestados' 
  AND has_any_role(auth.uid(), ARRAY['admin'::app_role, 'rh_dp'::app_role])
);

CREATE POLICY "RH_DP e Admin podem deletar atestados"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'atestados' 
  AND has_any_role(auth.uid(), ARRAY['admin'::app_role, 'rh_dp'::app_role])
);