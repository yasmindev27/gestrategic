
-- Tornar a política de INSERT mais restritiva:
-- apenas usuários autenticados podem inserir logs referenciando seu próprio user_id
DROP POLICY IF EXISTS "Authenticated users can insert logs" ON public.logs_acesso;

CREATE POLICY "Authenticated users can insert logs"
  ON public.logs_acesso
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR user_id IS NULL  -- permite logs de sistema sem user_id
  );
