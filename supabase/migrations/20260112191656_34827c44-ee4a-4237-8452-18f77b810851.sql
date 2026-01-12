-- Remove a política permissiva de SELECT que expõe prontuários a todos usuários autenticados
DROP POLICY IF EXISTS "Usuários autenticados podem visualizar prontuários" ON public.prontuarios;

-- Criar nova política restritiva para SELECT - apenas perfis que trabalham com prontuários
CREATE POLICY "Perfis autorizados visualizam prontuários" 
ON public.prontuarios 
FOR SELECT 
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'faturamento'::app_role, 'recepcao'::app_role, 'classificacao'::app_role, 'nir'::app_role, 'gestor'::app_role]));