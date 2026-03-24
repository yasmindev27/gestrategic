
DROP POLICY "Authorized roles can insert entregas" ON public.entregas_prontuarios;
CREATE POLICY "Authorized roles can insert entregas" ON public.entregas_prontuarios
FOR INSERT TO authenticated
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'recepcao'::app_role, 'classificacao'::app_role, 'nir'::app_role, 'faturamento'::app_role, 'enfermagem'::app_role, 'coordenador_enfermagem'::app_role]));

DROP POLICY "Authorized roles can insert entrega itens" ON public.entregas_prontuarios_itens;
CREATE POLICY "Authorized roles can insert entrega itens" ON public.entregas_prontuarios_itens
FOR INSERT TO authenticated
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'recepcao'::app_role, 'classificacao'::app_role, 'nir'::app_role, 'faturamento'::app_role, 'enfermagem'::app_role, 'coordenador_enfermagem'::app_role]));
