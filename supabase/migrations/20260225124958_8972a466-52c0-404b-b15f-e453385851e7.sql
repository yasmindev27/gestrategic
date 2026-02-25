
-- Tabela para registrar entregas de prontuários entre setores
CREATE TABLE public.entregas_prontuarios (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    entregador_id UUID NOT NULL,
    entregador_nome TEXT NOT NULL,
    setor_origem TEXT NOT NULL,
    setor_destino TEXT NOT NULL,
    responsavel_recebimento_id UUID,
    responsavel_recebimento_nome TEXT NOT NULL,
    data_hora TIMESTAMPTZ NOT NULL DEFAULT now(),
    observacao TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de vínculo: quais prontuários foram entregues nessa entrega
CREATE TABLE public.entregas_prontuarios_itens (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    entrega_id UUID NOT NULL REFERENCES public.entregas_prontuarios(id) ON DELETE CASCADE,
    saida_prontuario_id UUID NOT NULL REFERENCES public.saida_prontuarios(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.entregas_prontuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entregas_prontuarios_itens ENABLE ROW LEVEL SECURITY;

-- Policies for entregas_prontuarios
CREATE POLICY "Authenticated users can view entregas"
ON public.entregas_prontuarios FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authorized roles can insert entregas"
ON public.entregas_prontuarios FOR INSERT TO authenticated
WITH CHECK (
    public.has_any_role(auth.uid(), ARRAY['admin', 'recepcao', 'classificacao', 'nir', 'faturamento']::app_role[])
);

-- Policies for entregas_prontuarios_itens
CREATE POLICY "Authenticated users can view entrega itens"
ON public.entregas_prontuarios_itens FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authorized roles can insert entrega itens"
ON public.entregas_prontuarios_itens FOR INSERT TO authenticated
WITH CHECK (
    public.has_any_role(auth.uid(), ARRAY['admin', 'recepcao', 'classificacao', 'nir', 'faturamento']::app_role[])
);
