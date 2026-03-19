-- Fix: Add NIR role to avaliacoes_prontuarios SELECT policy
DROP POLICY IF EXISTS "Admin, Faturamento e Gestor visualizam avaliações" ON public.avaliacoes_prontuarios;

CREATE POLICY "Roles autorizadas visualizam avaliacoes"
  ON public.avaliacoes_prontuarios FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin', 'faturamento', 'gestor', 'nir']::app_role[]));