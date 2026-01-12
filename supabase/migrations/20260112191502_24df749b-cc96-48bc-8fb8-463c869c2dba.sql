-- Remove a política permissiva de SELECT que expõe dados a todos usuários autenticados
DROP POLICY IF EXISTS "Usuários autenticados visualizam inconsistências" ON public.cadastros_inconsistentes;

-- Criar nova política restritiva para SELECT - apenas admin e recepcao podem visualizar
CREATE POLICY "Admin e Recepcao visualizam inconsistências" 
ON public.cadastros_inconsistentes 
FOR SELECT 
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'recepcao'::app_role]));