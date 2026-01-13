-- Drop existing restrictive policies on cargos
DROP POLICY IF EXISTS "Admin gerencia cargos" ON public.cargos;
DROP POLICY IF EXISTS "Usuários autenticados visualizam cargos ativos" ON public.cargos;

-- Create new PERMISSIVE policies on cargos
CREATE POLICY "Admin gerencia cargos"
ON public.cargos FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Usuários autenticados visualizam cargos ativos"
ON public.cargos FOR SELECT
TO authenticated
USING (ativo = true);

-- Drop existing restrictive policies on setores
DROP POLICY IF EXISTS "Admin gerencia setores" ON public.setores;
DROP POLICY IF EXISTS "Usuários autenticados visualizam setores ativos" ON public.setores;

-- Create new PERMISSIVE policies on setores
CREATE POLICY "Admin gerencia setores"
ON public.setores FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Usuários autenticados visualizam setores ativos"
ON public.setores FOR SELECT
TO authenticated
USING (ativo = true);