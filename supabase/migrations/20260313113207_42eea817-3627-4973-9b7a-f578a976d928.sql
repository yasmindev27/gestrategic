-- Allow assistencia_social role to read bed_records (for Corrida de Leito)
DROP POLICY IF EXISTS "Admin NIR Enfermagem podem ver bed_records" ON public.bed_records;
CREATE POLICY "Admin NIR Enfermagem AssistSocial podem ver bed_records"
  ON public.bed_records
  FOR SELECT
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'nir'::app_role, 'enfermagem'::app_role, 'assistencia_social'::app_role]));