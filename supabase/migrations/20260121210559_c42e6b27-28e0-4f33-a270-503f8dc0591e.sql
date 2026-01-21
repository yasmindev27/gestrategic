-- Remover políticas permissivas existentes
DROP POLICY IF EXISTS "Usuarios autenticados podem atualizar valores" ON public.valores_refeicoes;
DROP POLICY IF EXISTS "Usuarios autenticados podem inserir valores" ON public.valores_refeicoes;

-- Criar política restritiva para admin e restaurante
CREATE POLICY "Admin e Restaurante gerenciam valores"
ON public.valores_refeicoes FOR ALL
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'restaurante'::app_role]))
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'restaurante'::app_role]));

-- Criar função para preencher automaticamente o campo de auditoria
CREATE OR REPLACE FUNCTION public.update_valores_atualizado_por()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_por := auth.uid();
  NEW.atualizado_em := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar trigger para auditoria automática
DROP TRIGGER IF EXISTS set_valores_atualizado_por ON public.valores_refeicoes;
CREATE TRIGGER set_valores_atualizado_por
BEFORE UPDATE ON public.valores_refeicoes
FOR EACH ROW
EXECUTE FUNCTION public.update_valores_atualizado_por();