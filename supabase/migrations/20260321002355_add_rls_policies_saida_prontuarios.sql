-- Add RLS policies for saida_prontuarios table to allow access to authorized roles

-- Policy: Admin full access
CREATE POLICY "Admin full access saida_prontuarios" ON public.saida_prontuarios
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Policy: Faturamento can manage
CREATE POLICY "Faturamento can manage saida_prontuarios" ON public.saida_prontuarios
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'faturamento'::app_role))
  WITH CHECK (has_role(auth.uid(), 'faturamento'::app_role));

-- Policy: Recepcao can insert and update
CREATE POLICY "Recepcao can insert update saida_prontuarios" ON public.saida_prontuarios
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'recepcao'::app_role))
  WITH CHECK (has_role(auth.uid(), 'recepcao'::app_role));

-- Policy: NIR can view and update
CREATE POLICY "NIR can view update saida_prontuarios" ON public.saida_prontuarios
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'nir'::app_role))
  WITH CHECK (has_role(auth.uid(), 'nir'::app_role));

-- Policy: Enfermagem can view and validate
CREATE POLICY "Enfermagem can view update saida_prontuarios" ON public.saida_prontuarios
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'enfermagem'::app_role))
  WITH CHECK (has_role(auth.uid(), 'enfermagem'::app_role));

-- Policy: Authenticated users can view (fallback for other authorized roles)
CREATE POLICY "Authenticated users can view saida_prontuarios" ON public.saida_prontuarios
  FOR SELECT TO authenticated
  USING (auth.jwt() ->> 'app_metadata'::text) IS NOT NULL;
