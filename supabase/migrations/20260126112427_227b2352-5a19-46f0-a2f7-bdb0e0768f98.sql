-- Corrigir política de logs de moderação para ser mais restritiva
DROP POLICY IF EXISTS "Sistema pode inserir logs" ON public.chat_moderacao_logs;

-- Apenas o próprio sistema (via service role) ou admins podem inserir logs
CREATE POLICY "Admins podem inserir logs de moderação"
ON public.chat_moderacao_logs FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR auth.uid() = user_id);