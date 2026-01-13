-- Allow users to update their own diet requests (for cancellation)
CREATE POLICY "Usuários podem cancelar próprias solicitações" 
ON public.solicitacoes_dieta 
FOR UPDATE 
USING (auth.uid() = solicitante_id AND status = 'pendente')
WITH CHECK (auth.uid() = solicitante_id);