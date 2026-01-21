-- Criar tabela de formulários
CREATE TABLE public.formularios (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    titulo TEXT NOT NULL,
    descricao TEXT,
    prazo DATE,
    status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'ativo', 'encerrado')),
    criado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de campos do formulário
CREATE TABLE public.formulario_campos (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    formulario_id UUID NOT NULL REFERENCES public.formularios(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN ('texto', 'texto_longo', 'numero', 'data', 'selecao', 'multipla_escolha', 'sim_nao')),
    label TEXT NOT NULL,
    obrigatorio BOOLEAN DEFAULT false,
    opcoes TEXT[], -- Para campos de seleção/múltipla escolha
    ordem INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de permissões de visualização do formulário
CREATE TABLE public.formulario_permissoes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    formulario_id UUID NOT NULL REFERENCES public.formularios(id) ON DELETE CASCADE,
    tipo_permissao TEXT NOT NULL CHECK (tipo_permissao IN ('usuario', 'cargo', 'setor', 'todos')),
    valor TEXT, -- ID do usuário, nome do cargo ou nome do setor
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(formulario_id, tipo_permissao, valor)
);

-- Criar tabela de respostas do formulário
CREATE TABLE public.formulario_respostas (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    formulario_id UUID NOT NULL REFERENCES public.formularios(id) ON DELETE CASCADE,
    respondido_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    respondido_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    respostas JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_formularios_status ON public.formularios(status);
CREATE INDEX idx_formularios_criado_por ON public.formularios(criado_por);
CREATE INDEX idx_formulario_campos_formulario ON public.formulario_campos(formulario_id);
CREATE INDEX idx_formulario_permissoes_formulario ON public.formulario_permissoes(formulario_id);
CREATE INDEX idx_formulario_respostas_formulario ON public.formulario_respostas(formulario_id);

-- Habilitar RLS
ALTER TABLE public.formularios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formulario_campos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formulario_permissoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formulario_respostas ENABLE ROW LEVEL SECURITY;

-- Função para verificar se usuário pode ver o formulário
CREATE OR REPLACE FUNCTION public.pode_ver_formulario(_user_id uuid, _formulario_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        -- Admin ou RH/DP sempre podem ver
        SELECT 1 FROM public.user_roles 
        WHERE user_id = _user_id AND role IN ('admin', 'rh_dp')
    )
    OR EXISTS (
        -- Criador do formulário
        SELECT 1 FROM public.formularios 
        WHERE id = _formulario_id AND criado_por = _user_id
    )
    OR EXISTS (
        -- Permissão para todos
        SELECT 1 FROM public.formulario_permissoes 
        WHERE formulario_id = _formulario_id AND tipo_permissao = 'todos'
    )
    OR EXISTS (
        -- Permissão específica para o usuário
        SELECT 1 FROM public.formulario_permissoes 
        WHERE formulario_id = _formulario_id 
        AND tipo_permissao = 'usuario' 
        AND valor = _user_id::text
    )
    OR EXISTS (
        -- Permissão por cargo
        SELECT 1 FROM public.formulario_permissoes fp
        JOIN public.profiles p ON p.user_id = _user_id
        WHERE fp.formulario_id = _formulario_id 
        AND fp.tipo_permissao = 'cargo' 
        AND fp.valor = p.cargo
    )
    OR EXISTS (
        -- Permissão por setor
        SELECT 1 FROM public.formulario_permissoes fp
        JOIN public.profiles p ON p.user_id = _user_id
        WHERE fp.formulario_id = _formulario_id 
        AND fp.tipo_permissao = 'setor' 
        AND fp.valor = p.setor
    )
$$;

-- Políticas para formularios
CREATE POLICY "RH/DP e Admin podem ver todos os formulários"
ON public.formularios FOR SELECT
USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'rh_dp'::app_role) OR
    pode_ver_formulario(auth.uid(), id)
);

CREATE POLICY "RH/DP e Admin podem criar formulários"
ON public.formularios FOR INSERT
WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'rh_dp'::app_role)
);

CREATE POLICY "RH/DP e Admin podem atualizar formulários"
ON public.formularios FOR UPDATE
USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'rh_dp'::app_role)
);

CREATE POLICY "RH/DP e Admin podem deletar formulários"
ON public.formularios FOR DELETE
USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'rh_dp'::app_role)
);

-- Políticas para formulario_campos
CREATE POLICY "Campos visíveis se pode ver formulário"
ON public.formulario_campos FOR SELECT
USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'rh_dp'::app_role) OR
    pode_ver_formulario(auth.uid(), formulario_id)
);

CREATE POLICY "RH/DP e Admin podem gerenciar campos"
ON public.formulario_campos FOR ALL
USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'rh_dp'::app_role)
);

-- Políticas para formulario_permissoes
CREATE POLICY "RH/DP e Admin podem ver permissões"
ON public.formulario_permissoes FOR SELECT
USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'rh_dp'::app_role)
);

CREATE POLICY "RH/DP e Admin podem gerenciar permissões"
ON public.formulario_permissoes FOR ALL
USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'rh_dp'::app_role)
);

-- Políticas para formulario_respostas
CREATE POLICY "Usuários podem ver suas próprias respostas"
ON public.formulario_respostas FOR SELECT
USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'rh_dp'::app_role) OR
    respondido_por = auth.uid()
);

CREATE POLICY "Usuários podem responder formulários que podem ver"
ON public.formulario_respostas FOR INSERT
WITH CHECK (
    respondido_por = auth.uid() AND
    pode_ver_formulario(auth.uid(), formulario_id)
);

-- Trigger para updated_at
CREATE TRIGGER update_formularios_updated_at
BEFORE UPDATE ON public.formularios
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();