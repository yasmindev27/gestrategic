
-- ============================================================
-- INTEGRIDADE DOS LOGS DE AUDITORIA — READ-ONLY ENFORCEMENT
-- LGPD Art. 37 / ONA: imutabilidade de trilha de auditoria
-- ============================================================

-- 1. Garantir que RLS está habilitado na tabela de logs
ALTER TABLE public.logs_acesso ENABLE ROW LEVEL SECURITY;

-- 2. Remover qualquer política existente de UPDATE ou DELETE
DROP POLICY IF EXISTS "Admins can update logs" ON public.logs_acesso;
DROP POLICY IF EXISTS "Admins can delete logs" ON public.logs_acesso;
DROP POLICY IF EXISTS "Users can delete own logs" ON public.logs_acesso;
DROP POLICY IF EXISTS "Allow update logs" ON public.logs_acesso;
DROP POLICY IF EXISTS "Allow delete logs" ON public.logs_acesso;

-- 3. Política de SELECT: somente admins e usuários autenticados podem ler
DROP POLICY IF EXISTS "Admins can view all logs" ON public.logs_acesso;
CREATE POLICY "Admins can view all logs"
  ON public.logs_acesso
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 4. Política de INSERT: sistema pode inserir logs (autenticados)
DROP POLICY IF EXISTS "Authenticated users can insert logs" ON public.logs_acesso;
CREATE POLICY "Authenticated users can insert logs"
  ON public.logs_acesso
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- NÃO criamos políticas de UPDATE ou DELETE.
-- Sem política = acesso negado (deny-by-default do RLS).

-- 5. Trigger de proteção: bloqueia UPDATE e DELETE mesmo via service_role
--    (segunda camada de defesa — imutabilidade física)
CREATE OR REPLACE FUNCTION public.bloquear_edicao_logs()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION
      'VIOLAÇÃO DE INTEGRIDADE: Logs de auditoria são imutáveis (LGPD Art. 37). Operação UPDATE bloqueada.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION
      'VIOLAÇÃO DE INTEGRIDADE: Logs de auditoria são imutáveis (LGPD Art. 37). Operação DELETE bloqueada.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NULL;
END;
$$;

-- 6. Vincular o trigger à tabela
DROP TRIGGER IF EXISTS trg_bloquear_edicao_logs ON public.logs_acesso;
CREATE TRIGGER trg_bloquear_edicao_logs
  BEFORE UPDATE OR DELETE
  ON public.logs_acesso
  FOR EACH ROW
  EXECUTE FUNCTION public.bloquear_edicao_logs();

-- 7. Comentário de auditoria na tabela (documentação inline)
COMMENT ON TABLE public.logs_acesso IS
  'Trilha de auditoria imutável — LGPD Art. 37 / ONA. UPDATE e DELETE bloqueados por trigger e RLS. Read-Only para todos os perfis.';
