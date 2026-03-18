
-- Allow gestores to also view avaliacoes_prontuarios
DROP POLICY "Faturamento e Admin visualizam avaliações completas" ON public.avaliacoes_prontuarios;

CREATE POLICY "Admin, Faturamento e Gestor visualizam avaliações"
ON public.avaliacoes_prontuarios
FOR SELECT
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'faturamento'::app_role, 'gestor'::app_role]));
