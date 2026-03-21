-- Permitir enfermagem visualizar prontuarios
CREATE POLICY "Enfermagem visualiza prontuarios"
ON public.prontuarios
FOR SELECT
TO authenticated
USING (has_any_role(auth.uid(), ARRAY['enfermagem'::app_role, 'coordenador_enfermagem'::app_role]));

-- Permitir enfermagem visualizar saida_prontuarios
DROP POLICY IF EXISTS "Roles autorizadas visualizam saida" ON public.saida_prontuarios;
CREATE POLICY "Roles autorizadas visualizam saida"
ON public.saida_prontuarios
FOR SELECT
TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'recepcao'::app_role, 'classificacao'::app_role, 'nir'::app_role, 'faturamento'::app_role, 'gestor'::app_role, 'enfermagem'::app_role, 'coordenador_enfermagem'::app_role]));

-- Permitir enfermagem atualizar saida_prontuarios (para validar classificação)
DROP POLICY IF EXISTS "Recepção, Classificação e NIR podem atualizar" ON public.saida_prontuarios;
CREATE POLICY "Roles autorizadas podem atualizar saida"
ON public.saida_prontuarios
FOR UPDATE
TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'recepcao'::app_role, 'classificacao'::app_role, 'nir'::app_role, 'faturamento'::app_role, 'enfermagem'::app_role, 'coordenador_enfermagem'::app_role]));