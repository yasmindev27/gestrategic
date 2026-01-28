-- Criar tabela para registrar tentativas de duplicidade de refeições
CREATE TABLE public.tentativas_duplicidade_refeicoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo_pessoa TEXT NOT NULL CHECK (tipo_pessoa IN ('colaborador', 'visitante')),
  colaborador_nome TEXT NOT NULL,
  visitante_cpf_hash TEXT NULL,
  tipo_refeicao TEXT NOT NULL,
  data_tentativa DATE NOT NULL,
  hora_tentativa TIME NOT NULL,
  registro_original_id UUID REFERENCES public.refeicoes_registros(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tentativas_duplicidade_refeicoes ENABLE ROW LEVEL SECURITY;

-- Policy para inserção anônima (totem sem login)
CREATE POLICY "Totem pode inserir tentativas duplicidade" 
ON public.tentativas_duplicidade_refeicoes 
FOR INSERT 
TO anon
WITH CHECK (true);

-- Policy para inserção autenticada
CREATE POLICY "Autenticado pode inserir tentativas duplicidade" 
ON public.tentativas_duplicidade_refeicoes 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Policy para leitura apenas por admin
CREATE POLICY "Apenas Admin visualiza tentativas duplicidade" 
ON public.tentativas_duplicidade_refeicoes 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Policy para admin deletar
CREATE POLICY "Admin pode deletar tentativas duplicidade" 
ON public.tentativas_duplicidade_refeicoes 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));