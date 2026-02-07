-- Adicionar política para permitir INSERT anônimo (página pública)
CREATE POLICY "Acesso público para registrar inconsistências" 
ON public.cadastros_inconsistentes 
FOR INSERT 
TO anon
WITH CHECK (true);

-- Adicionar política para permitir SELECT anônimo (visualizar na página pública)
CREATE POLICY "Acesso público para visualizar inconsistências" 
ON public.cadastros_inconsistentes 
FOR SELECT 
TO anon
USING (true);

-- Adicionar política para permitir UPDATE anônimo (resolver inconsistências na página pública)
CREATE POLICY "Acesso público para resolver inconsistências" 
ON public.cadastros_inconsistentes 
FOR UPDATE 
TO anon
USING (true);