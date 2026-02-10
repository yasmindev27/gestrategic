
-- =============================================
-- FIX 1: profiles - Remove public SELECT policy, keep authenticated access
-- =============================================

-- Drop the overly permissive public policy
DROP POLICY IF EXISTS "Totem pode visualizar nomes de colaboradores" ON public.profiles;

-- Add a policy for authenticated users to view all profiles (needed for internal directory, chat, etc.)
CREATE POLICY "Authenticated users can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- =============================================
-- FIX 2: cadastros_inconsistentes - Remove all public policies
-- =============================================

-- Drop all overly permissive public policies
DROP POLICY IF EXISTS "Acesso público para registrar inconsistências" ON public.cadastros_inconsistentes;
DROP POLICY IF EXISTS "Acesso público para resolver inconsistências" ON public.cadastros_inconsistentes;
DROP POLICY IF EXISTS "Acesso público para visualizar inconsistências" ON public.cadastros_inconsistentes;

-- =============================================
-- FIX 3: produtos - Remove public SELECT, restrict to authenticated
-- =============================================

-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Usuários autenticados visualizam produtos" ON public.produtos;

-- Re-create as properly scoped authenticated-only policy
CREATE POLICY "Authenticated users can view produtos"
ON public.produtos
FOR SELECT
TO authenticated
USING (true);
