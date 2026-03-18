-- Drop existing policies on asos_seguranca
DROP POLICY IF EXISTS "Admin e seguranca podem ver ASOs" ON public.asos_seguranca;
DROP POLICY IF EXISTS "Admin e seguranca podem inserir ASOs" ON public.asos_seguranca;
DROP POLICY IF EXISTS "Admin e seguranca podem atualizar ASOs" ON public.asos_seguranca;
DROP POLICY IF EXISTS "Admin e seguranca podem deletar ASOs" ON public.asos_seguranca;

-- Recreate with rh_dp included
CREATE POLICY "Admin, seguranca e rh_dp podem ver ASOs"
ON public.asos_seguranca FOR SELECT TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'seguranca', 'rh_dp']::app_role[]));

CREATE POLICY "Admin, seguranca e rh_dp podem inserir ASOs"
ON public.asos_seguranca FOR INSERT TO authenticated
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin', 'seguranca', 'rh_dp']::app_role[]));

CREATE POLICY "Admin, seguranca e rh_dp podem atualizar ASOs"
ON public.asos_seguranca FOR UPDATE TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'seguranca', 'rh_dp']::app_role[]));

CREATE POLICY "Admin, seguranca e rh_dp podem deletar ASOs"
ON public.asos_seguranca FOR DELETE TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'seguranca', 'rh_dp']::app_role[]));