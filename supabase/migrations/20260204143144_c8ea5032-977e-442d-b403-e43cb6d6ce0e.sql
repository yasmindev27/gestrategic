-- Tabela para categorização de riscos operacionais
CREATE TABLE public.riscos_operacionais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo_risco TEXT NOT NULL, -- 'equipamento', 'laudo', 'processo', 'infra', 'outro'
  categoria TEXT NOT NULL, -- 'engenharia_clinica', 'laboratorio', 'ti', 'manutencao', etc.
  descricao TEXT NOT NULL,
  severidade TEXT NOT NULL DEFAULT 'baixo', -- 'baixo', 'medio', 'alto', 'critico'
  status TEXT NOT NULL DEFAULT 'aberto', -- 'aberto', 'em_tratamento', 'mitigado', 'aceito', 'fechado'
  data_ocorrencia TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_resolucao TIMESTAMPTZ,
  
  -- Referências opcionais
  incidente_id UUID REFERENCES public.incidentes_nsp(id),
  chamado_id UUID REFERENCES public.chamados(id),
  
  -- Contexto adicional
  setor_afetado TEXT,
  equipamento_nome TEXT,
  equipamento_patrimonio TEXT,
  impacto_estimado TEXT,
  acao_tomada TEXT,
  
  -- Rastreabilidade
  registrado_por UUID NOT NULL,
  registrado_por_nome TEXT NOT NULL,
  resolvido_por UUID,
  resolvido_por_nome TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.riscos_operacionais ENABLE ROW LEVEL SECURITY;

-- Política de leitura para autenticados
CREATE POLICY "Usuários autenticados podem visualizar riscos"
  ON public.riscos_operacionais
  FOR SELECT
  TO authenticated
  USING (true);

-- Política de inserção para autenticados  
CREATE POLICY "Usuários autenticados podem registrar riscos"
  ON public.riscos_operacionais
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = registrado_por);

-- Política de atualização para gestores
CREATE POLICY "Gestores podem atualizar riscos"
  ON public.riscos_operacionais
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'gestor', 'qualidade', 'nsp')
    )
  );

-- Índices para performance
CREATE INDEX idx_riscos_operacionais_tipo ON public.riscos_operacionais(tipo_risco);
CREATE INDEX idx_riscos_operacionais_categoria ON public.riscos_operacionais(categoria);
CREATE INDEX idx_riscos_operacionais_status ON public.riscos_operacionais(status);
CREATE INDEX idx_riscos_operacionais_data ON public.riscos_operacionais(data_ocorrencia DESC);

-- Trigger para updated_at
CREATE TRIGGER update_riscos_operacionais_updated_at
  BEFORE UPDATE ON public.riscos_operacionais
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Adicionar coluna origem_risco à tabela de incidentes para rastrear origem
ALTER TABLE public.incidentes_nsp ADD COLUMN IF NOT EXISTS setor_origem TEXT;
ALTER TABLE public.incidentes_nsp ADD COLUMN IF NOT EXISTS categoria_operacional TEXT;