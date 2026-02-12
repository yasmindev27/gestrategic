CREATE OR REPLACE FUNCTION public.buscar_usuario_por_matricula(_matricula text)
RETURNS TABLE(user_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id
  FROM public.profiles p
  WHERE p.matricula = _matricula
  LIMIT 1;
$$;