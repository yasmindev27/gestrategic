-- Drop existing INSERT policy and create a new one that includes all authorized roles
DROP POLICY IF EXISTS "Recepção pode registrar saída inicial" ON public.saida_prontuarios;

-- Create new INSERT policy with all authorized roles
CREATE POLICY "Roles autorizadas podem registrar saída" 
ON public.saida_prontuarios 
FOR INSERT 
WITH CHECK (
  has_any_role(auth.uid(), ARRAY['admin'::app_role, 'recepcao'::app_role, 'classificacao'::app_role, 'nir'::app_role, 'faturamento'::app_role])
);