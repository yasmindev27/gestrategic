-- Fix infinite recursion in profiles RLS policies
-- The "Gestor visualiza perfis do mesmo setor" policy has a subquery that causes recursion

-- Drop all existing SELECT policies on profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin visualiza todos perfis" ON public.profiles;
DROP POLICY IF EXISTS "Gestor visualiza perfis do mesmo setor" ON public.profiles;

-- Create a security definer function to get user's setor without triggering RLS
CREATE OR REPLACE FUNCTION public.get_user_setor(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT setor FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- Recreate policies without recursion
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
  setor = get_user_setor(auth.uid())
);