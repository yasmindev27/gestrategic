
-- Allow any authenticated user to read approved diets (needed for quantitative reports)
CREATE POLICY "Authenticated users can view approved diets"
ON public.solicitacoes_dieta
FOR SELECT
TO authenticated
USING (status = 'aprovada');
