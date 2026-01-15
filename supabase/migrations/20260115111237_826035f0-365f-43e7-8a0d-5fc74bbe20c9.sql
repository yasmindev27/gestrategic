-- Criar tabela para registrar café litro diariamente
CREATE TABLE public.cafe_litro_diario (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    data DATE NOT NULL UNIQUE,
    quantidade_litros DECIMAL(10,2) NOT NULL DEFAULT 0,
    registrado_por UUID NOT NULL,
    observacao TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cafe_litro_diario ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Usuários autenticados podem visualizar café litro"
ON public.cafe_litro_diario
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários com role restaurante podem inserir café litro"
ON public.cafe_litro_diario
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role IN ('admin', 'restaurante')
    )
);

CREATE POLICY "Usuários com role restaurante podem atualizar café litro"
ON public.cafe_litro_diario
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role IN ('admin', 'restaurante')
    )
);

CREATE POLICY "Usuários com role restaurante podem deletar café litro"
ON public.cafe_litro_diario
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role IN ('admin', 'restaurante')
    )
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_cafe_litro_diario_updated_at
BEFORE UPDATE ON public.cafe_litro_diario
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();