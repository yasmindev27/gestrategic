-- Tabela para armazenar valores de cada tipo de refeição
CREATE TABLE public.valores_refeicoes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tipo_refeicao TEXT NOT NULL UNIQUE,
    valor DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    atualizado_por UUID
);

-- Enable RLS
ALTER TABLE public.valores_refeicoes ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Usuarios autenticados podem ver valores"
ON public.valores_refeicoes FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Usuarios autenticados podem atualizar valores"
ON public.valores_refeicoes FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Usuarios autenticados podem inserir valores"
ON public.valores_refeicoes FOR INSERT
TO authenticated
WITH CHECK (true);

-- Inserir valores iniciais para cada tipo de refeição
INSERT INTO public.valores_refeicoes (tipo_refeicao, valor) VALUES
('cafe', 0),
('almoco', 0),
('lanche', 0),
('jantar', 0),
('cafe_litro', 0);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_valores_refeicoes_updated_at
BEFORE UPDATE ON public.valores_refeicoes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();