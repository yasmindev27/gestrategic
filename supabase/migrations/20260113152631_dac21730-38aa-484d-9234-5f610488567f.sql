-- Tabela para cardápios
CREATE TABLE public.cardapios (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    data DATE NOT NULL,
    tipo_refeicao TEXT NOT NULL, -- 'cafe', 'almoco', 'lanche', 'jantar'
    descricao TEXT NOT NULL,
    observacoes TEXT,
    criado_por UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(data, tipo_refeicao)
);

-- Tabela para solicitações de dieta
CREATE TABLE public.solicitacoes_dieta (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    solicitante_id UUID NOT NULL,
    solicitante_nome TEXT NOT NULL,
    tipo_dieta TEXT NOT NULL, -- 'normal', 'vegetariana', 'low_carb', 'sem_gluten', 'sem_lactose', 'outra'
    descricao_especifica TEXT,
    data_inicio DATE NOT NULL,
    data_fim DATE,
    status TEXT NOT NULL DEFAULT 'pendente', -- 'pendente', 'aprovada', 'rejeitada'
    observacoes TEXT,
    aprovado_por UUID,
    aprovado_em TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cardapios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitacoes_dieta ENABLE ROW LEVEL SECURITY;

-- Políticas para cardapios
CREATE POLICY "Todos visualizam cardápios"
ON public.cardapios FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Restaurante e Admin gerenciam cardápios"
ON public.cardapios FOR ALL
TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'restaurante'::app_role]))
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'restaurante'::app_role]));

-- Políticas para solicitacoes_dieta
CREATE POLICY "Usuários podem criar próprias solicitações"
ON public.solicitacoes_dieta FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = solicitante_id);

CREATE POLICY "Usuários visualizam próprias solicitações"
ON public.solicitacoes_dieta FOR SELECT
TO authenticated
USING (auth.uid() = solicitante_id);

CREATE POLICY "Restaurante e Admin visualizam todas solicitações"
ON public.solicitacoes_dieta FOR SELECT
TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'restaurante'::app_role]));

CREATE POLICY "Restaurante e Admin gerenciam solicitações"
ON public.solicitacoes_dieta FOR ALL
TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'restaurante'::app_role]))
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'restaurante'::app_role]));

-- Trigger para updated_at
CREATE TRIGGER update_cardapios_updated_at
BEFORE UPDATE ON public.cardapios
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_solicitacoes_dieta_updated_at
BEFORE UPDATE ON public.solicitacoes_dieta
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();