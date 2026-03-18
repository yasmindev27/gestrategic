
-- FIX OVERLY PERMISSIVE RLS POLICIES

-- nsp_action_plans
DROP POLICY IF EXISTS "Authenticated users can delete nsp_action_plans" ON public.nsp_action_plans;
DROP POLICY IF EXISTS "Authenticated users can insert nsp_action_plans" ON public.nsp_action_plans;
DROP POLICY IF EXISTS "Authenticated users can update nsp_action_plans" ON public.nsp_action_plans;
CREATE POLICY "Auth insert nsp_action_plans" ON public.nsp_action_plans FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth update nsp_action_plans" ON public.nsp_action_plans FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth delete nsp_action_plans" ON public.nsp_action_plans FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- nsp_indicators
DROP POLICY IF EXISTS "Authenticated users can delete nsp_indicators" ON public.nsp_indicators;
DROP POLICY IF EXISTS "Authenticated users can insert nsp_indicators" ON public.nsp_indicators;
DROP POLICY IF EXISTS "Authenticated users can update nsp_indicators" ON public.nsp_indicators;
CREATE POLICY "Auth insert nsp_indicators" ON public.nsp_indicators FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth update nsp_indicators" ON public.nsp_indicators FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth delete nsp_indicators" ON public.nsp_indicators FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- upa_action_plans
DROP POLICY IF EXISTS "Authenticated users can delete upa_action_plans" ON public.upa_action_plans;
DROP POLICY IF EXISTS "Authenticated users can update upa_action_plans" ON public.upa_action_plans;
DROP POLICY IF EXISTS "Authenticated users can insert upa_action_plans" ON public.upa_action_plans;
CREATE POLICY "Auth insert upa_action_plans" ON public.upa_action_plans FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth update upa_action_plans" ON public.upa_action_plans FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth delete upa_action_plans" ON public.upa_action_plans FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- upa_indicators
DROP POLICY IF EXISTS "Authenticated users can delete upa_indicators" ON public.upa_indicators;
DROP POLICY IF EXISTS "Authenticated users can update upa_indicators" ON public.upa_indicators;
DROP POLICY IF EXISTS "Authenticated users can insert upa_indicators" ON public.upa_indicators;
CREATE POLICY "Auth insert upa_indicators" ON public.upa_indicators FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth update upa_indicators" ON public.upa_indicators FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth delete upa_indicators" ON public.upa_indicators FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- transferencia_coordenadas
DROP POLICY IF EXISTS "Authenticated users can insert coordinates" ON public.transferencia_coordenadas;
CREATE POLICY "Auth insert coordinates" ON public.transferencia_coordenadas FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- auditoria_temporalidade
DROP POLICY IF EXISTS "Usuarios autenticados podem inserir registros de temporalidade" ON public.auditoria_temporalidade;
CREATE POLICY "Auth insert temporalidade" ON public.auditoria_temporalidade FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- justificativas_atraso
DROP POLICY IF EXISTS "Usuarios autenticados podem inserir justificativas" ON public.justificativas_atraso;
CREATE POLICY "Auth insert justificativas" ON public.justificativas_atraso FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- refeicoes_registros (mantém anon para totem)
DROP POLICY IF EXISTS "Autenticado pode inserir registros" ON public.refeicoes_registros;
CREATE POLICY "Auth insert refeicoes" ON public.refeicoes_registros FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- tentativas_duplicidade_refeicoes (mantém anon para totem)
DROP POLICY IF EXISTS "Autenticado pode inserir tentativas duplicidade" ON public.tentativas_duplicidade_refeicoes;
CREATE POLICY "Auth insert tentativas" ON public.tentativas_duplicidade_refeicoes FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
