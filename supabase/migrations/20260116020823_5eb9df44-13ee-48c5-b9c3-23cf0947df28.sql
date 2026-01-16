-- Tabela para gerenciar solicitações SUS Fácil (regulação de vagas)
CREATE TABLE public.regulacao_sus_facil (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    numero_solicitacao TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')), -- entrada = vaga solicitada para cá, saida = transferência para fora
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovada', 'negada', 'cancelada', 'efetivada')),
    
    -- Dados do paciente
    paciente_nome TEXT NOT NULL,
    paciente_idade INTEGER,
    paciente_sexo TEXT,
    
    -- Dados clínicos
    hipotese_diagnostica TEXT,
    cid TEXT,
    quadro_clinico TEXT,
    procedimentos_necessarios TEXT,
    
    -- Origem/Destino
    estabelecimento_origem TEXT,
    estabelecimento_destino TEXT,
    setor_destino TEXT,
    leito_destino TEXT,
    
    -- Contatos
    telefone_contato TEXT,
    medico_solicitante TEXT,
    
    -- Regulação
    regulador_responsavel TEXT,
    justificativa_negativa TEXT,
    observacoes TEXT,
    prioridade TEXT DEFAULT 'media' CHECK (prioridade IN ('baixa', 'media', 'alta', 'urgente')),
    
    -- Timestamps
    data_solicitacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    data_resposta TIMESTAMP WITH TIME ZONE,
    data_efetivacao TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID
);

-- Enable RLS
ALTER TABLE public.regulacao_sus_facil ENABLE ROW LEVEL SECURITY;

-- Policies para NIR e Admin
CREATE POLICY "NIR e Admin podem visualizar solicitações SUS Fácil"
ON public.regulacao_sus_facil
FOR SELECT
TO authenticated
USING (
    public.has_any_role(auth.uid(), ARRAY['admin', 'nir']::app_role[])
);

CREATE POLICY "NIR e Admin podem criar solicitações SUS Fácil"
ON public.regulacao_sus_facil
FOR INSERT
TO authenticated
WITH CHECK (
    public.has_any_role(auth.uid(), ARRAY['admin', 'nir']::app_role[])
);

CREATE POLICY "NIR e Admin podem atualizar solicitações SUS Fácil"
ON public.regulacao_sus_facil
FOR UPDATE
TO authenticated
USING (
    public.has_any_role(auth.uid(), ARRAY['admin', 'nir']::app_role[])
);

-- Trigger para updated_at
CREATE TRIGGER update_regulacao_sus_facil_updated_at
BEFORE UPDATE ON public.regulacao_sus_facil
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_regulacao_sus_facil_status ON public.regulacao_sus_facil(status);
CREATE INDEX idx_regulacao_sus_facil_tipo ON public.regulacao_sus_facil(tipo);
CREATE INDEX idx_regulacao_sus_facil_data_solicitacao ON public.regulacao_sus_facil(data_solicitacao DESC);