-- Create inventory table (produtos)
CREATE TABLE public.produtos (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL,
    descricao TEXT,
    codigo TEXT UNIQUE,
    categoria TEXT,
    unidade_medida TEXT DEFAULT 'UN',
    quantidade_minima INTEGER DEFAULT 0,
    quantidade_atual INTEGER DEFAULT 0,
    localizacao TEXT,
    setor_responsavel TEXT NOT NULL,
    ativo BOOLEAN DEFAULT true,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create inventory movements table
CREATE TABLE public.movimentacoes_estoque (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
    quantidade INTEGER NOT NULL,
    quantidade_anterior INTEGER NOT NULL,
    quantidade_nova INTEGER NOT NULL,
    motivo TEXT,
    observacao TEXT,
    usuario_id UUID NOT NULL,
    setor TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chamados/tickets table
CREATE TABLE public.chamados (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    numero_chamado TEXT NOT NULL UNIQUE,
    titulo TEXT NOT NULL,
    descricao TEXT NOT NULL,
    categoria TEXT NOT NULL,
    prioridade TEXT NOT NULL DEFAULT 'media' CHECK (prioridade IN ('baixa', 'media', 'alta', 'urgente')),
    status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'em_andamento', 'pendente', 'resolvido', 'cancelado')),
    solicitante_id UUID NOT NULL,
    solicitante_nome TEXT NOT NULL,
    solicitante_setor TEXT,
    atribuido_para UUID,
    data_abertura TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    data_resolucao TIMESTAMP WITH TIME ZONE,
    solucao TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chamados comments table for tracking
CREATE TABLE public.chamados_comentarios (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    chamado_id UUID NOT NULL REFERENCES public.chamados(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL,
    usuario_nome TEXT NOT NULL,
    comentario TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes_estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chamados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chamados_comentarios ENABLE ROW LEVEL SECURITY;

-- RLS Policies for produtos
CREATE POLICY "Usuários autenticados visualizam produtos"
ON public.produtos FOR SELECT
USING (true);

CREATE POLICY "TI Manutencao Engenharia e Admin gerenciam produtos do seu setor"
ON public.produtos FOR ALL
USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    (has_role(auth.uid(), 'ti'::app_role) AND setor_responsavel = 'ti') OR
    (has_role(auth.uid(), 'manutencao'::app_role) AND setor_responsavel = 'manutencao') OR
    (has_role(auth.uid(), 'engenharia_clinica'::app_role) AND setor_responsavel = 'engenharia_clinica')
);

-- RLS Policies for movimentacoes_estoque
CREATE POLICY "Usuários autenticados visualizam movimentações"
ON public.movimentacoes_estoque FOR SELECT
USING (true);

CREATE POLICY "TI Manutencao Engenharia e Admin inserem movimentações do seu setor"
ON public.movimentacoes_estoque FOR INSERT
WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR
    (has_role(auth.uid(), 'ti'::app_role) AND setor = 'ti') OR
    (has_role(auth.uid(), 'manutencao'::app_role) AND setor = 'manutencao') OR
    (has_role(auth.uid(), 'engenharia_clinica'::app_role) AND setor = 'engenharia_clinica')
);

-- RLS Policies for chamados
CREATE POLICY "Usuários autenticados visualizam chamados"
ON public.chamados FOR SELECT
USING (true);

CREATE POLICY "Usuários podem criar chamados"
ON public.chamados FOR INSERT
WITH CHECK (auth.uid() = solicitante_id);

CREATE POLICY "TI Manutencao Engenharia Admin e solicitante atualizam chamados"
ON public.chamados FOR UPDATE
USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    auth.uid() = solicitante_id OR
    (has_role(auth.uid(), 'ti'::app_role) AND categoria = 'ti') OR
    (has_role(auth.uid(), 'manutencao'::app_role) AND categoria = 'manutencao') OR
    (has_role(auth.uid(), 'engenharia_clinica'::app_role) AND categoria = 'engenharia_clinica')
);

-- RLS Policies for chamados_comentarios
CREATE POLICY "Usuários autenticados visualizam comentários"
ON public.chamados_comentarios FOR SELECT
USING (true);

CREATE POLICY "Usuários autenticados podem comentar"
ON public.chamados_comentarios FOR INSERT
WITH CHECK (auth.uid() = usuario_id);

-- Create triggers for updated_at
CREATE TRIGGER update_produtos_updated_at
    BEFORE UPDATE ON public.produtos
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_chamados_updated_at
    BEFORE UPDATE ON public.chamados
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes
CREATE INDEX idx_produtos_setor ON public.produtos(setor_responsavel);
CREATE INDEX idx_produtos_codigo ON public.produtos(codigo);
CREATE INDEX idx_movimentacoes_produto ON public.movimentacoes_estoque(produto_id);
CREATE INDEX idx_movimentacoes_setor ON public.movimentacoes_estoque(setor);
CREATE INDEX idx_chamados_categoria ON public.chamados(categoria);
CREATE INDEX idx_chamados_status ON public.chamados(status);
CREATE INDEX idx_chamados_solicitante ON public.chamados(solicitante_id);

-- Create sequence for chamado numbers
CREATE SEQUENCE IF NOT EXISTS chamado_seq START 1;

-- Function to generate chamado number
CREATE OR REPLACE FUNCTION public.generate_chamado_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.numero_chamado := 'CH-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('chamado_seq')::TEXT, 4, '0');
    RETURN NEW;
END;
$$;

-- Create trigger for auto-generating chamado number
CREATE TRIGGER set_chamado_number
    BEFORE INSERT ON public.chamados
    FOR EACH ROW
    WHEN (NEW.numero_chamado IS NULL OR NEW.numero_chamado = '')
    EXECUTE FUNCTION public.generate_chamado_number();