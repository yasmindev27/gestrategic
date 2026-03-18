-- Permitir enfermagem inserir bed_records
DROP POLICY IF EXISTS "NIR e Admin podem inserir bed_records" ON public.bed_records;
CREATE POLICY "Admin NIR Enfermagem podem inserir bed_records"
ON public.bed_records
FOR INSERT
TO authenticated
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'nir'::app_role, 'enfermagem'::app_role]));

-- Permitir enfermagem atualizar bed_records
DROP POLICY IF EXISTS "NIR e Admin podem atualizar bed_records" ON public.bed_records;
CREATE POLICY "Admin NIR Enfermagem podem atualizar bed_records"
ON public.bed_records
FOR UPDATE
TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'nir'::app_role, 'enfermagem'::app_role]));

-- Permitir enfermagem deletar bed_records
DROP POLICY IF EXISTS "NIR e Admin podem deletar bed_records" ON public.bed_records;
CREATE POLICY "Admin NIR Enfermagem podem deletar bed_records"
ON public.bed_records
FOR DELETE
TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'nir'::app_role, 'enfermagem'::app_role]));