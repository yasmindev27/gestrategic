
-- Remove anonymous policies
DROP POLICY IF EXISTS "Acesso público para registrar inconsistências" ON public.cadastros_inconsistentes;
DROP POLICY IF EXISTS "Acesso público para visualizar inconsistências" ON public.cadastros_inconsistentes;
DROP POLICY IF EXISTS "Acesso público para resolver inconsistências" ON public.cadastros_inconsistentes;

-- Authenticated-only access with role checks
CREATE POLICY "Authenticated users can view inconsistencies"
ON public.cadastros_inconsistentes FOR SELECT TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin', 'recepcao', 'faturamento']::app_role[]));

CREATE POLICY "Recepcao can register inconsistencies"
ON public.cadastros_inconsistentes FOR INSERT TO authenticated
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin', 'recepcao']::app_role[]));

CREATE POLICY "Recepcao can update inconsistencies"
ON public.cadastros_inconsistentes FOR UPDATE TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin', 'recepcao']::app_role[]));
