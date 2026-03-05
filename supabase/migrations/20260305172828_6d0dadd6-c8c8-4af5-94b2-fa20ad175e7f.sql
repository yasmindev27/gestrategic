
DROP POLICY "NIR e Admin podem ver bed_records" ON public.bed_records;

CREATE POLICY "Admin NIR Enfermagem podem ver bed_records"
ON public.bed_records FOR SELECT
TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'nir'::app_role, 'enfermagem'::app_role]));
