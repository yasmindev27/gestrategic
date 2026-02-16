
-- Tabela de Ativos/Equipamentos
CREATE TABLE public.ativos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  numero_patrimonio TEXT,
  numero_serie TEXT,
  fabricante TEXT,
  modelo TEXT,
  categoria TEXT NOT NULL DEFAULT 'geral',
  setor_responsavel TEXT NOT NULL,
  setor_localizacao TEXT,
  data_aquisicao DATE,
  data_garantia_fim DATE,
  vida_util_meses INTEGER,
  valor_aquisicao NUMERIC(12,2),
  status TEXT NOT NULL DEFAULT 'operacional',
  criticidade TEXT NOT NULL DEFAULT 'media',
  observacoes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de Manutenções Preventivas
CREATE TABLE public.manutencoes_preventivas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ativo_id UUID NOT NULL REFERENCES public.ativos(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT NOT NULL DEFAULT 'preventiva',
  periodicidade_dias INTEGER NOT NULL DEFAULT 30,
  ultima_execucao DATE,
  proxima_execucao DATE NOT NULL,
  responsavel_id UUID,
  responsavel_nome TEXT NOT NULL,
  setor TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'agendada',
  prioridade TEXT NOT NULL DEFAULT 'media',
  custo_estimado NUMERIC(12,2),
  observacoes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de Execuções de Manutenção (histórico)
CREATE TABLE public.manutencoes_execucoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  preventiva_id UUID REFERENCES public.manutencoes_preventivas(id) ON DELETE SET NULL,
  ativo_id UUID NOT NULL REFERENCES public.ativos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'preventiva',
  descricao TEXT NOT NULL,
  data_execucao DATE NOT NULL DEFAULT CURRENT_DATE,
  executado_por UUID,
  executado_por_nome TEXT NOT NULL,
  tempo_parada_horas NUMERIC(6,2) DEFAULT 0,
  custo_real NUMERIC(12,2),
  pecas_utilizadas TEXT,
  resultado TEXT DEFAULT 'concluida',
  observacoes TEXT,
  setor TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de Disponibilidade (registro diário de uptime/downtime)
CREATE TABLE public.ativos_disponibilidade (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ativo_id UUID NOT NULL REFERENCES public.ativos(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  horas_operacionais NUMERIC(5,2) NOT NULL DEFAULT 24,
  horas_parado NUMERIC(5,2) NOT NULL DEFAULT 0,
  motivo_parada TEXT,
  registrado_por UUID,
  registrado_por_nome TEXT,
  setor TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(ativo_id, data)
);

-- Enable RLS
ALTER TABLE public.ativos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manutencoes_preventivas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manutencoes_execucoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ativos_disponibilidade ENABLE ROW LEVEL SECURITY;

-- RLS Policies: ativos
CREATE POLICY "Authenticated users can view ativos" ON public.ativos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin/tech can insert ativos" ON public.ativos
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_any_role(auth.uid(), ARRAY['admin','ti','manutencao','engenharia_clinica']::app_role[])
  );

CREATE POLICY "Admin/tech can update ativos" ON public.ativos
  FOR UPDATE TO authenticated
  USING (
    public.has_any_role(auth.uid(), ARRAY['admin','ti','manutencao','engenharia_clinica']::app_role[])
  );

CREATE POLICY "Admin can delete ativos" ON public.ativos
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies: manutencoes_preventivas
CREATE POLICY "Authenticated users can view preventivas" ON public.manutencoes_preventivas
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin/tech can manage preventivas" ON public.manutencoes_preventivas
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_any_role(auth.uid(), ARRAY['admin','ti','manutencao','engenharia_clinica']::app_role[])
  );

CREATE POLICY "Admin/tech can update preventivas" ON public.manutencoes_preventivas
  FOR UPDATE TO authenticated
  USING (
    public.has_any_role(auth.uid(), ARRAY['admin','ti','manutencao','engenharia_clinica']::app_role[])
  );

CREATE POLICY "Admin can delete preventivas" ON public.manutencoes_preventivas
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies: manutencoes_execucoes
CREATE POLICY "Authenticated users can view execucoes" ON public.manutencoes_execucoes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin/tech can insert execucoes" ON public.manutencoes_execucoes
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_any_role(auth.uid(), ARRAY['admin','ti','manutencao','engenharia_clinica']::app_role[])
  );

-- RLS Policies: ativos_disponibilidade
CREATE POLICY "Authenticated users can view disponibilidade" ON public.ativos_disponibilidade
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin/tech can insert disponibilidade" ON public.ativos_disponibilidade
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_any_role(auth.uid(), ARRAY['admin','ti','manutencao','engenharia_clinica']::app_role[])
  );

CREATE POLICY "Admin/tech can update disponibilidade" ON public.ativos_disponibilidade
  FOR UPDATE TO authenticated
  USING (
    public.has_any_role(auth.uid(), ARRAY['admin','ti','manutencao','engenharia_clinica']::app_role[])
  );

-- Indexes
CREATE INDEX idx_ativos_setor ON public.ativos(setor_responsavel);
CREATE INDEX idx_ativos_status ON public.ativos(status);
CREATE INDEX idx_preventivas_ativo ON public.manutencoes_preventivas(ativo_id);
CREATE INDEX idx_preventivas_proxima ON public.manutencoes_preventivas(proxima_execucao);
CREATE INDEX idx_preventivas_setor ON public.manutencoes_preventivas(setor);
CREATE INDEX idx_execucoes_ativo ON public.manutencoes_execucoes(ativo_id);
CREATE INDEX idx_disponibilidade_ativo_data ON public.ativos_disponibilidade(ativo_id, data);

-- Triggers for updated_at
CREATE TRIGGER update_ativos_updated_at
  BEFORE UPDATE ON public.ativos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_preventivas_updated_at
  BEFORE UPDATE ON public.manutencoes_preventivas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
