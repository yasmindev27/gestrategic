-- Função para buscar nomes de usuários por IDs (para uso no módulo de logs)
CREATE OR REPLACE FUNCTION public.get_user_names_by_ids(_user_ids uuid[])
RETURNS TABLE(user_id uuid, full_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT p.user_id, p.full_name
    FROM public.profiles p
    WHERE p.user_id = ANY(_user_ids)
$$;