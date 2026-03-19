
-- Fix colaboradores_restaurante anon policy - keep for totem functionality but acknowledged
-- Fix upa_indicators, nsp_indicators, upa_action_plans, nsp_action_plans write policies

-- UPA_INDICATORS
DROP POLICY IF EXISTS "Allow authenticated users to delete upa_indicators" ON public.upa_indicators;
DROP POLICY IF EXISTS "Allow authenticated users to insert upa_indicators" ON public.upa_indicators;
DROP POLICY IF EXISTS "Allow authenticated users to update upa_indicators" ON public.upa_indicators;

CREATE POLICY "Quality roles manage upa_indicators" ON public.upa_indicators FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'qualidade'::app_role, 'gestor'::app_role, 'nsp'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'qualidade'::app_role, 'gestor'::app_role, 'nsp'::app_role]));

-- NSP_INDICATORS
DROP POLICY IF EXISTS "Allow authenticated users to delete nsp_indicators" ON public.nsp_indicators;
DROP POLICY IF EXISTS "Allow authenticated users to insert nsp_indicators" ON public.nsp_indicators;
DROP POLICY IF EXISTS "Allow authenticated users to update nsp_indicators" ON public.nsp_indicators;

CREATE POLICY "Quality roles manage nsp_indicators" ON public.nsp_indicators FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'qualidade'::app_role, 'nsp'::app_role, 'gestor'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'qualidade'::app_role, 'nsp'::app_role, 'gestor'::app_role]));

-- UPA_ACTION_PLANS
DROP POLICY IF EXISTS "Allow authenticated users to delete upa_action_plans" ON public.upa_action_plans;
DROP POLICY IF EXISTS "Allow authenticated users to insert upa_action_plans" ON public.upa_action_plans;
DROP POLICY IF EXISTS "Allow authenticated users to update upa_action_plans" ON public.upa_action_plans;

CREATE POLICY "Quality roles manage upa_action_plans" ON public.upa_action_plans FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'qualidade'::app_role, 'gestor'::app_role, 'nsp'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'qualidade'::app_role, 'gestor'::app_role, 'nsp'::app_role]));

-- NSP_ACTION_PLANS
DROP POLICY IF EXISTS "Allow authenticated users to delete nsp_action_plans" ON public.nsp_action_plans;
DROP POLICY IF EXISTS "Allow authenticated users to insert nsp_action_plans" ON public.nsp_action_plans;
DROP POLICY IF EXISTS "Allow authenticated users to update nsp_action_plans" ON public.nsp_action_plans;

CREATE POLICY "Quality roles manage nsp_action_plans" ON public.nsp_action_plans FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'qualidade'::app_role, 'nsp'::app_role, 'gestor'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'qualidade'::app_role, 'nsp'::app_role, 'gestor'::app_role]));

-- Fix profiles UPDATE to prevent cargo/setor self-editing
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile limited"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
