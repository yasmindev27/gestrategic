-- Criar tabela de categorias/tipos de itens da rouparia
CREATE TABLE public.rouparia_categorias (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL UNIQUE,
    descricao TEXT,
    estoque_minimo INTEGER DEFAULT 0,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de itens da rouparia (catálogo)
CREATE TABLE public.rouparia_itens (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    codigo_barras TEXT NOT NULL UNIQUE,
    categoria_id UUID NOT NULL REFERENCES public.rouparia_categorias(id) ON DELETE RESTRICT,
    descricao TEXT,
    quantidade_atual INTEGER NOT NULL DEFAULT 0,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de movimentações da rouparia
CREATE TABLE public.rouparia_movimentacoes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    item_id UUID NOT NULL REFERENCES public.rouparia_itens(id) ON DELETE RESTRICT,
    tipo_movimentacao TEXT NOT NULL CHECK (tipo_movimentacao IN ('entrada', 'saida', 'descarte', 'devolucao')),
    quantidade INTEGER NOT NULL CHECK (quantidade > 0),
    quantidade_anterior INTEGER NOT NULL,
    quantidade_nova INTEGER NOT NULL,
    setor_destino TEXT,
    setor_origem TEXT,
    observacao TEXT,
    registrado_por UUID NOT NULL,
    registrado_por_nome TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar índices para melhor performance
CREATE INDEX idx_rouparia_itens_codigo ON public.rouparia_itens(codigo_barras);
CREATE INDEX idx_rouparia_itens_categoria ON public.rouparia_itens(categoria_id);
CREATE INDEX idx_rouparia_movimentacoes_item ON public.rouparia_movimentacoes(item_id);
CREATE INDEX idx_rouparia_movimentacoes_tipo ON public.rouparia_movimentacoes(tipo_movimentacao);
CREATE INDEX idx_rouparia_movimentacoes_data ON public.rouparia_movimentacoes(created_at DESC);

-- Enable RLS
ALTER TABLE public.rouparia_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rouparia_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rouparia_movimentacoes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para rouparia_categorias
CREATE POLICY "Usuários autenticados podem visualizar categorias"
ON public.rouparia_categorias FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins podem gerenciar categorias"
ON public.rouparia_categorias FOR ALL
TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'gestor'::app_role]));

-- Políticas RLS para rouparia_itens
CREATE POLICY "Usuários autenticados podem visualizar itens"
ON public.rouparia_itens FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins podem gerenciar itens"
ON public.rouparia_itens FOR ALL
TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'gestor'::app_role]));

-- Políticas RLS para rouparia_movimentacoes
CREATE POLICY "Usuários autenticados podem visualizar movimentações"
ON public.rouparia_movimentacoes FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Usuários autenticados podem registrar movimentações"
ON public.rouparia_movimentacoes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = registrado_por);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_rouparia_categorias_updated_at
    BEFORE UPDATE ON public.rouparia_categorias
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rouparia_itens_updated_at
    BEFORE UPDATE ON public.rouparia_itens
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Função para atualizar estoque após movimentação
CREATE OR REPLACE FUNCTION public.atualizar_estoque_rouparia()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_quantidade_atual INTEGER;
    v_nova_quantidade INTEGER;
BEGIN
    -- Buscar quantidade atual do item
    SELECT quantidade_atual INTO v_quantidade_atual
    FROM public.rouparia_itens
    WHERE id = NEW.item_id;

    -- Calcular nova quantidade baseado no tipo de movimentação
    CASE NEW.tipo_movimentacao
        WHEN 'entrada', 'devolucao' THEN
            v_nova_quantidade := v_quantidade_atual + NEW.quantidade;
        WHEN 'saida', 'descarte' THEN
            IF v_quantidade_atual < NEW.quantidade THEN
                RAISE EXCEPTION 'Estoque insuficiente. Disponível: %, Solicitado: %', v_quantidade_atual, NEW.quantidade;
            END IF;
            v_nova_quantidade := v_quantidade_atual - NEW.quantidade;
    END CASE;

    -- Atualizar o registro com as quantidades corretas
    NEW.quantidade_anterior := v_quantidade_atual;
    NEW.quantidade_nova := v_nova_quantidade;

    -- Atualizar estoque do item
    UPDATE public.rouparia_itens
    SET quantidade_atual = v_nova_quantidade,
        updated_at = now()
    WHERE id = NEW.item_id;

    RETURN NEW;
END;
$$;

-- Criar trigger para atualizar estoque
CREATE TRIGGER trigger_atualizar_estoque_rouparia
    BEFORE INSERT ON public.rouparia_movimentacoes
    FOR EACH ROW
    EXECUTE FUNCTION public.atualizar_estoque_rouparia();

-- Inserir algumas categorias iniciais
INSERT INTO public.rouparia_categorias (nome, descricao, estoque_minimo) VALUES
    ('Lençol Casal', 'Lençol para cama de casal', 50),
    ('Lençol Solteiro', 'Lençol para cama de solteiro/maca', 100),
    ('Fronha', 'Fronha para travesseiro', 100),
    ('Toalha de Banho', 'Toalha grande para banho', 80),
    ('Toalha de Rosto', 'Toalha pequena para rosto', 60),
    ('Cobertor', 'Cobertor hospitalar', 40),
    ('Avental Descartável', 'Avental descartável para procedimentos', 200),
    ('Uniforme - Calça', 'Calça de uniforme hospitalar', 50),
    ('Uniforme - Blusa', 'Blusa/jaleco de uniforme hospitalar', 50),
    ('Campo Cirúrgico', 'Campo estéril para cirurgia', 100);