-- ===========================================
-- FIX: SAIDA_PRONTUARIOS - Restringir acesso
-- ===========================================

-- Remove política atual permissiva que permite qualquer usuário autenticado
DROP POLICY IF EXISTS "Usuários autenticados visualizam saída" ON public.saida_prontuarios;

-- Apenas roles operacionais podem visualizar movimentação de prontuários
CREATE POLICY "Roles autorizadas visualizam saida" 
ON public.saida_prontuarios 
FOR SELECT 
USING (
  has_any_role(auth.uid(), ARRAY[
    'admin'::app_role, 
    'recepcao'::app_role, 
    'classificacao'::app_role, 
    'nir'::app_role, 
    'faturamento'::app_role, 
    'gestor'::app_role
  ])
);