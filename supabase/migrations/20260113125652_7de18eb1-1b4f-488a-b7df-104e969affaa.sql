-- Fix #1: Replace overly permissive chamados SELECT policy with role-based access
DROP POLICY IF EXISTS "Usuários autenticados visualizam chamados" ON public.chamados;

CREATE POLICY "Role-based chamados access"
ON public.chamados FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'gestor'::app_role) OR
  auth.uid() = solicitante_id OR
  auth.uid() = atribuido_para OR
  (has_role(auth.uid(), 'ti'::app_role) AND categoria = 'ti') OR
  (has_role(auth.uid(), 'manutencao'::app_role) AND categoria = 'manutencao') OR
  (has_role(auth.uid(), 'engenharia_clinica'::app_role) AND categoria = 'engenharia_clinica')
);

-- Fix #2: Remove duplicate profiles policy
DROP POLICY IF EXISTS "Usuario visualiza proprio perfil" ON public.profiles;

-- Fix #3: Convert RESTRICTIVE policies to PERMISSIVE for proper access logic
-- First, drop all existing restrictive policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin visualiza todos perfis" ON public.profiles;
DROP POLICY IF EXISTS "Gestor visualiza perfis do mesmo setor" ON public.profiles;

-- Recreate as PERMISSIVE policies (default behavior, no RESTRICTIVE keyword)
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admin visualiza todos perfis"
ON public.profiles FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Gestor visualiza perfis do mesmo setor"
ON public.profiles FOR SELECT
USING (
  has_role(auth.uid(), 'gestor'::app_role) AND 
  setor = (SELECT p.setor FROM public.profiles p WHERE p.user_id = auth.uid())
);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);