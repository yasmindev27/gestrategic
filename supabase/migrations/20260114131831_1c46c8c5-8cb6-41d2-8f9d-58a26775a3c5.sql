-- Tabela para registros de refeições do totem
CREATE TABLE public.refeicoes_registros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo_pessoa TEXT NOT NULL CHECK (tipo_pessoa IN ('colaborador', 'visitante')),
  colaborador_user_id UUID NULL,
  colaborador_nome TEXT NOT NULL,
  visitante_cpf_hash TEXT NULL, -- CPF hasheado para LGPD
  tipo_refeicao TEXT NOT NULL,
  data_registro DATE NOT NULL DEFAULT CURRENT_DATE,
  hora_registro TIME NOT NULL DEFAULT CURRENT_TIME,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_refeicoes_registros_data ON public.refeicoes_registros(data_registro);
CREATE INDEX idx_refeicoes_registros_tipo_refeicao ON public.refeicoes_registros(tipo_refeicao);
CREATE INDEX idx_refeicoes_registros_tipo_pessoa ON public.refeicoes_registros(tipo_pessoa);

-- Habilitar RLS
ALTER TABLE public.refeicoes_registros ENABLE ROW LEVEL SECURITY;

-- Policy para inserção anônima (totem sem login)
CREATE POLICY "Totem pode inserir registros" 
ON public.refeicoes_registros 
FOR INSERT 
TO anon
WITH CHECK (true);

-- Policy para leitura apenas por admin e restaurante
CREATE POLICY "Admin e Restaurante visualizam registros" 
ON public.refeicoes_registros 
FOR SELECT 
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'restaurante'::app_role]));

-- Policy para admin gerenciar
CREATE POLICY "Admin gerencia registros" 
ON public.refeicoes_registros 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Comentário na tabela
COMMENT ON TABLE public.refeicoes_registros IS 'Registros de refeições do totem - LGPD compliant';
COMMENT ON COLUMN public.refeicoes_registros.visitante_cpf_hash IS 'CPF hasheado para proteção LGPD - nunca exibir em relatórios';