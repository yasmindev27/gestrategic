-- Criar tabela de colaboradores do restaurante
CREATE TABLE public.colaboradores_restaurante (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  matricula TEXT,
  setor TEXT,
  cargo TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar índice para busca por nome
CREATE INDEX idx_colaboradores_restaurante_nome ON public.colaboradores_restaurante USING gin(to_tsvector('portuguese', nome));

-- Habilitar RLS
ALTER TABLE public.colaboradores_restaurante ENABLE ROW LEVEL SECURITY;

-- Política de leitura: qualquer pessoa autenticada pode ler (para o totem funcionar)
CREATE POLICY "Colaboradores são visíveis para todos autenticados"
ON public.colaboradores_restaurante FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Política de escrita: apenas admin e restaurante podem gerenciar
CREATE POLICY "Admin e Restaurante gerenciam colaboradores"
ON public.colaboradores_restaurante FOR ALL
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'restaurante'::app_role]))
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'restaurante'::app_role]));

-- Trigger para updated_at
CREATE TRIGGER update_colaboradores_restaurante_updated_at
BEFORE UPDATE ON public.colaboradores_restaurante
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();