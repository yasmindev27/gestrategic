-- Criar tabela de colaboradores para o totem de refeições
CREATE TABLE public.colaboradores_restaurante (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    matricula TEXT NOT NULL UNIQUE,
    nome TEXT NOT NULL,
    cargo TEXT,
    setor TEXT,
    data_admissao DATE,
    data_demissao DATE,
    tipo TEXT DEFAULT 'Funcionário',
    situacao TEXT DEFAULT 'Trabalhando',
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para busca rápida
CREATE INDEX idx_colaboradores_restaurante_matricula ON public.colaboradores_restaurante(matricula);
CREATE INDEX idx_colaboradores_restaurante_nome ON public.colaboradores_restaurante(nome);
CREATE INDEX idx_colaboradores_restaurante_ativo ON public.colaboradores_restaurante(ativo);

-- Habilitar RLS
ALTER TABLE public.colaboradores_restaurante ENABLE ROW LEVEL SECURITY;

-- Política pública para leitura (totem não requer autenticação)
CREATE POLICY "Colaboradores são visíveis publicamente para o totem"
ON public.colaboradores_restaurante
FOR SELECT
USING (true);

-- Apenas admin e restaurante podem modificar
CREATE POLICY "Admin e restaurante podem inserir colaboradores"
ON public.colaboradores_restaurante
FOR INSERT
WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR
    get_user_setor(auth.uid()) = 'Restaurante'
);

CREATE POLICY "Admin e restaurante podem atualizar colaboradores"
ON public.colaboradores_restaurante
FOR UPDATE
USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    get_user_setor(auth.uid()) = 'Restaurante'
);

CREATE POLICY "Admin e restaurante podem deletar colaboradores"
ON public.colaboradores_restaurante
FOR DELETE
USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    get_user_setor(auth.uid()) = 'Restaurante'
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_colaboradores_restaurante_updated_at
BEFORE UPDATE ON public.colaboradores_restaurante
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();