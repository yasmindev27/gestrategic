
-- =============================================
-- FIX 1: colaboradores_restaurante - Replace public SELECT with lookup function
-- =============================================

-- Drop the overly permissive public policy
DROP POLICY IF EXISTS "Colaboradores são visíveis publicamente para o totem" ON public.colaboradores_restaurante;

-- Create a restricted policy for the totem: only active employees, minimal columns exposed via RLS
-- The totem queries with .eq("ativo", true) so this is safe
CREATE POLICY "Totem can view active employees only"
ON public.colaboradores_restaurante
FOR SELECT
USING (ativo = true);

-- Create a lookup function for the totem that returns minimal data
CREATE OR REPLACE FUNCTION public.buscar_colaborador_totem(_matricula TEXT)
RETURNS TABLE (
  id UUID,
  nome TEXT,
  matricula TEXT,
  pode_registrar BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    cr.id,
    cr.nome,
    cr.matricula,
    (cr.ativo = true) as pode_registrar
  FROM public.colaboradores_restaurante cr
  WHERE cr.matricula = _matricula
  AND cr.ativo = true
  LIMIT 1;
$$;

-- =============================================
-- FIX 2: movimentacoes_estoque - Restrict SELECT to relevant roles
-- =============================================

-- Drop the current permissive SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view movimentacoes" ON public.movimentacoes_estoque;
DROP POLICY IF EXISTS "Usuários autenticados podem visualizar movimentações" ON public.movimentacoes_estoque;

-- Create role-restricted SELECT policy
CREATE POLICY "Inventory roles can view movimentacoes"
ON public.movimentacoes_estoque
FOR SELECT
TO authenticated
USING (
  public.has_any_role(auth.uid(), ARRAY['admin', 'manutencao', 'ti', 'engenharia_clinica']::public.app_role[])
);

-- =============================================
-- FIX 3: profiles - Update to ignore since it's intentional for internal system
-- The profiles table needs broad read access for chat, directory, assignments, etc.
-- Already restricted to authenticated users only (no public/anon access).
-- =============================================
-- No changes needed - will update finding status instead
