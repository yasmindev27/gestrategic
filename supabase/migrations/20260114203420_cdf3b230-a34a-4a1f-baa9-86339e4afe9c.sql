-- Adicionar policy para permitir que o totem (anônimo) visualize os perfis para listagem
CREATE POLICY "Totem pode visualizar nomes de colaboradores"
ON public.profiles
FOR SELECT
USING (true);
