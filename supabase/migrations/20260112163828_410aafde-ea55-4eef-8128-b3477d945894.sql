-- Adicionar políticas explícitas de INSERT e UPDATE para a tabela user_roles
-- Apenas admins podem inserir novos roles
CREATE POLICY "Only admins can insert roles" 
ON public.user_roles 
FOR INSERT 
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Apenas admins podem atualizar roles
CREATE POLICY "Only admins can update roles" 
ON public.user_roles 
FOR UPDATE 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Apenas admins podem deletar roles
CREATE POLICY "Only admins can delete roles" 
ON public.user_roles 
FOR DELETE 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));