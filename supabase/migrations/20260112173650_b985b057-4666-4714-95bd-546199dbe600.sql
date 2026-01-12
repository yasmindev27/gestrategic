
-- Corrigir política de logs para ser mais restritiva
DROP POLICY IF EXISTS "Sistema pode inserir logs" ON public.logs_acesso;

CREATE POLICY "Usuários autenticados podem inserir logs próprios"
ON public.logs_acesso FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
