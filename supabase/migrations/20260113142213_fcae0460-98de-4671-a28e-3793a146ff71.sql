-- ===================================
-- 1. TABELA DE TAREFAS/AGENDA
-- ===================================
CREATE TABLE public.agenda_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo TEXT NOT NULL CHECK (tipo IN ('tarefa', 'reuniao', 'anotacao')),
    titulo TEXT NOT NULL,
    descricao TEXT,
    data_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
    data_fim TIMESTAMP WITH TIME ZONE,
    hora TEXT,
    prioridade TEXT DEFAULT 'media' CHECK (prioridade IN ('baixa', 'media', 'alta', 'urgente')),
    status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluida', 'cancelada')),
    criado_por UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.agenda_items ENABLE ROW LEVEL SECURITY;

-- ===================================
-- 2. TABELA DE DESTINATÁRIOS (MUITOS-PARA-MUITOS)
-- ===================================
CREATE TABLE public.agenda_destinatarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agenda_item_id UUID NOT NULL REFERENCES public.agenda_items(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL,
    visualizado BOOLEAN DEFAULT false,
    visualizado_em TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(agenda_item_id, usuario_id)
);

ALTER TABLE public.agenda_destinatarios ENABLE ROW LEVEL SECURITY;

-- ===================================
-- 3. POLÍTICAS RLS PARA AGENDA_ITEMS
-- ===================================

-- Admin pode ver e gerenciar tudo
CREATE POLICY "Admin gerencia todos os itens de agenda"
ON public.agenda_items FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Usuário pode ver itens que criou
CREATE POLICY "Usuário visualiza itens que criou"
ON public.agenda_items FOR SELECT
USING (criado_por = auth.uid());

-- Usuário pode ver itens onde é destinatário
CREATE POLICY "Usuário visualiza itens destinados a ele"
ON public.agenda_items FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.agenda_destinatarios ad
        WHERE ad.agenda_item_id = id AND ad.usuario_id = auth.uid()
    )
);

-- Gestor pode criar itens
CREATE POLICY "Gestor pode criar itens de agenda"
ON public.agenda_items FOR INSERT
WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'gestor'::app_role)
    OR criado_por = auth.uid()
);

-- Gestor pode atualizar itens que criou
CREATE POLICY "Usuário pode atualizar seus próprios itens"
ON public.agenda_items FOR UPDATE
USING (criado_por = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Gestor pode deletar itens que criou
CREATE POLICY "Usuário pode deletar seus próprios itens"
ON public.agenda_items FOR DELETE
USING (criado_por = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- ===================================
-- 4. POLÍTICAS RLS PARA AGENDA_DESTINATARIOS
-- ===================================

-- Admin pode gerenciar tudo
CREATE POLICY "Admin gerencia todos os destinatários"
ON public.agenda_destinatarios FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Criador do item pode gerenciar destinatários
CREATE POLICY "Criador pode gerenciar destinatários"
ON public.agenda_destinatarios FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.agenda_items ai
        WHERE ai.id = agenda_item_id AND ai.criado_por = auth.uid()
    )
);

-- Destinatário pode visualizar e atualizar seu registro
CREATE POLICY "Destinatário visualiza seu registro"
ON public.agenda_destinatarios FOR SELECT
USING (usuario_id = auth.uid());

CREATE POLICY "Destinatário pode marcar como visualizado"
ON public.agenda_destinatarios FOR UPDATE
USING (usuario_id = auth.uid())
WITH CHECK (usuario_id = auth.uid());

-- ===================================
-- 5. TRIGGER PARA UPDATED_AT
-- ===================================
CREATE TRIGGER update_agenda_items_updated_at
BEFORE UPDATE ON public.agenda_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ===================================
-- 6. FUNÇÃO PARA CONTAR TAREFAS PENDENTES DO USUÁRIO
-- ===================================
CREATE OR REPLACE FUNCTION public.get_tarefas_pendentes_count(_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COUNT(*)::INTEGER
    FROM public.agenda_items ai
    JOIN public.agenda_destinatarios ad ON ad.agenda_item_id = ai.id
    WHERE ad.usuario_id = _user_id
    AND ai.status = 'pendente'
    AND ai.data_inicio <= now()
$$;

-- ===================================
-- 7. FUNÇÃO PARA VERIFICAR SE GESTOR PODE ATRIBUIR AO USUÁRIO
-- ===================================
CREATE OR REPLACE FUNCTION public.gestor_pode_atribuir(_gestor_id UUID, _usuario_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        has_role(_gestor_id, 'admin'::app_role)
        OR (
            has_role(_gestor_id, 'gestor'::app_role)
            AND gestor_gerencia_usuario(_gestor_id, _usuario_id)
        )
$$;