-- Adicionar coluna de prazo de conclusão na tabela chamados
ALTER TABLE public.chamados 
ADD COLUMN IF NOT EXISTS prazo_conclusao timestamp with time zone;

-- Criar tabela para materiais utilizados em chamados
CREATE TABLE public.chamados_materiais (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    chamado_id uuid NOT NULL REFERENCES public.chamados(id) ON DELETE CASCADE,
    produto_id uuid NOT NULL REFERENCES public.produtos(id),
    quantidade integer NOT NULL CHECK (quantidade > 0),
    registrado_por uuid NOT NULL,
    observacao text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.chamados_materiais ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para chamados_materiais
CREATE POLICY "Usuários autenticados visualizam materiais"
ON public.chamados_materiais
FOR SELECT
USING (true);

CREATE POLICY "TI Manutencao Engenharia e Admin inserem materiais"
ON public.chamados_materiais
FOR INSERT
WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'ti'::app_role) OR
    has_role(auth.uid(), 'manutencao'::app_role) OR
    has_role(auth.uid(), 'engenharia_clinica'::app_role)
);

-- Função para calcular prazo de conclusão baseado na prioridade
CREATE OR REPLACE FUNCTION public.calcular_prazo_chamado()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    -- Definir prazo baseado na prioridade (em horas)
    -- urgente: 4h, alta: 8h, media: 24h, baixa: 48h
    NEW.prazo_conclusao := CASE NEW.prioridade
        WHEN 'urgente' THEN NEW.data_abertura + INTERVAL '4 hours'
        WHEN 'alta' THEN NEW.data_abertura + INTERVAL '8 hours'
        WHEN 'media' THEN NEW.data_abertura + INTERVAL '24 hours'
        WHEN 'baixa' THEN NEW.data_abertura + INTERVAL '48 hours'
        ELSE NEW.data_abertura + INTERVAL '24 hours'
    END;
    RETURN NEW;
END;
$$;

-- Trigger para calcular prazo ao inserir chamado
CREATE TRIGGER trigger_calcular_prazo_chamado
BEFORE INSERT ON public.chamados
FOR EACH ROW
EXECUTE FUNCTION public.calcular_prazo_chamado();

-- Trigger para recalcular prazo quando prioridade muda
CREATE TRIGGER trigger_recalcular_prazo_chamado
BEFORE UPDATE OF prioridade ON public.chamados
FOR EACH ROW
WHEN (OLD.prioridade IS DISTINCT FROM NEW.prioridade)
EXECUTE FUNCTION public.calcular_prazo_chamado();

-- Função para baixa automática no estoque ao registrar material
CREATE OR REPLACE FUNCTION public.baixa_estoque_chamado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_quantidade_atual integer;
    v_setor text;
    v_nome_produto text;
BEGIN
    -- Buscar informações do produto
    SELECT quantidade_atual, setor_responsavel, nome 
    INTO v_quantidade_atual, v_setor, v_nome_produto
    FROM public.produtos 
    WHERE id = NEW.produto_id;
    
    -- Verificar se há estoque suficiente
    IF v_quantidade_atual < NEW.quantidade THEN
        RAISE EXCEPTION 'Estoque insuficiente para o produto %. Disponível: %, Solicitado: %', 
            v_nome_produto, v_quantidade_atual, NEW.quantidade;
    END IF;
    
    -- Atualizar estoque do produto
    UPDATE public.produtos 
    SET quantidade_atual = quantidade_atual - NEW.quantidade,
        updated_at = now()
    WHERE id = NEW.produto_id;
    
    -- Registrar movimentação de estoque
    INSERT INTO public.movimentacoes_estoque (
        produto_id,
        tipo,
        quantidade,
        quantidade_anterior,
        quantidade_nova,
        setor,
        motivo,
        observacao,
        usuario_id
    ) VALUES (
        NEW.produto_id,
        'saida',
        NEW.quantidade,
        v_quantidade_atual,
        v_quantidade_atual - NEW.quantidade,
        v_setor,
        'Utilizado em chamado',
        'Chamado ID: ' || NEW.chamado_id::text,
        NEW.registrado_por
    );
    
    RETURN NEW;
END;
$$;

-- Trigger para baixa automática
CREATE TRIGGER trigger_baixa_estoque_chamado
AFTER INSERT ON public.chamados_materiais
FOR EACH ROW
EXECUTE FUNCTION public.baixa_estoque_chamado();

-- Atualizar prazos dos chamados existentes
UPDATE public.chamados 
SET prazo_conclusao = CASE prioridade
    WHEN 'urgente' THEN data_abertura + INTERVAL '4 hours'
    WHEN 'alta' THEN data_abertura + INTERVAL '8 hours'
    WHEN 'media' THEN data_abertura + INTERVAL '24 hours'
    WHEN 'baixa' THEN data_abertura + INTERVAL '48 hours'
    ELSE data_abertura + INTERVAL '24 hours'
END
WHERE prazo_conclusao IS NULL;