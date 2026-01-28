-- Adicionar política para permitir INSERT por usuários autenticados também
-- (útil quando o totem é acessado em navegador com sessão ativa)
CREATE POLICY "Autenticado pode inserir registros"
ON public.refeicoes_registros
FOR INSERT
TO authenticated
WITH CHECK (true);