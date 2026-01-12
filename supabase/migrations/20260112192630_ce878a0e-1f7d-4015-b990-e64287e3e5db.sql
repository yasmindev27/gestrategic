-- ===========================================
-- FIX 1: PRONTUARIOS - Acesso mais restritivo
-- ===========================================

-- Remove política atual permissiva
DROP POLICY IF EXISTS "Perfis autorizados visualizam prontuários" ON public.prontuarios;

-- Admin e Faturamento podem ver TODOS os prontuários (necessário para gestão e faturamento)
CREATE POLICY "Admin e faturamento visualizam todos prontuarios" 
ON public.prontuarios 
FOR SELECT 
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'faturamento'::app_role]));

-- Outros perfis operacionais só veem prontuários que eles criaram
CREATE POLICY "Usuarios visualizam prontuarios que criaram" 
ON public.prontuarios 
FOR SELECT 
USING (
  created_by = auth.uid() 
  AND has_any_role(auth.uid(), ARRAY['recepcao'::app_role, 'classificacao'::app_role, 'nir'::app_role, 'gestor'::app_role])
);

-- ===========================================
-- FIX 2: PROFILES - Gestores só veem mesmo setor
-- ===========================================

-- Remove política atual que permite gestor ver todos
DROP POLICY IF EXISTS "Admins and gestors can view all profiles" ON public.profiles;

-- Admin pode ver todos os perfis
CREATE POLICY "Admin visualiza todos perfis" 
ON public.profiles 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Gestores só veem perfis do mesmo setor
CREATE POLICY "Gestor visualiza perfis do mesmo setor" 
ON public.profiles 
FOR SELECT 
USING (
  has_role(auth.uid(), 'gestor'::app_role) 
  AND setor = (SELECT setor FROM public.profiles WHERE user_id = auth.uid())
);

-- Usuários podem ver seu próprio perfil
CREATE POLICY "Usuario visualiza proprio perfil" 
ON public.profiles 
FOR SELECT 
USING (user_id = auth.uid());