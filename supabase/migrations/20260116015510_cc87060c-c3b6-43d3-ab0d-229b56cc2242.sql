-- Tabela para registros de leitos
CREATE TABLE IF NOT EXISTS public.bed_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bed_id TEXT NOT NULL,
  bed_number TEXT NOT NULL,
  sector TEXT NOT NULL,
  patient_name TEXT,
  hipotese_diagnostica TEXT,
  condutas_outros TEXT,
  observacao TEXT,
  data_nascimento DATE,
  data_internacao DATE,
  sus_facil TEXT CHECK (sus_facil IN ('sim', 'nao', '')),
  numero_sus_facil TEXT,
  motivo_alta TEXT CHECK (motivo_alta IN ('alta-melhorada', 'evasao', 'transferencia', 'obito', '')),
  estabelecimento_transferencia TEXT,
  data_alta DATE,
  shift_type TEXT NOT NULL CHECK (shift_type IN ('diurno', 'noturno')),
  shift_date DATE NOT NULL,
  medicos TEXT,
  enfermeiros TEXT,
  regulador_nir TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(bed_id, shift_date)
);

-- Tabela para configurações de plantão
CREATE TABLE IF NOT EXISTS public.shift_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shift_date DATE NOT NULL,
  shift_type TEXT NOT NULL CHECK (shift_type IN ('diurno', 'noturno')),
  medicos TEXT,
  enfermeiros TEXT,
  regulador_nir TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(shift_date, shift_type)
);

-- Tabela para estatísticas diárias
CREATE TABLE IF NOT EXISTS public.daily_statistics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  total_patients INTEGER DEFAULT 0,
  patients_by_sector JSONB DEFAULT '{}',
  admissions INTEGER DEFAULT 0,
  discharges INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.bed_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_statistics ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para bed_records (NIR e Admin podem ver/editar)
CREATE POLICY "NIR e Admin podem ver bed_records"
  ON public.bed_records FOR SELECT
  USING (
    has_any_role(auth.uid(), ARRAY['admin', 'nir']::app_role[])
  );

CREATE POLICY "NIR e Admin podem inserir bed_records"
  ON public.bed_records FOR INSERT
  WITH CHECK (
    has_any_role(auth.uid(), ARRAY['admin', 'nir']::app_role[])
  );

CREATE POLICY "NIR e Admin podem atualizar bed_records"
  ON public.bed_records FOR UPDATE
  USING (
    has_any_role(auth.uid(), ARRAY['admin', 'nir']::app_role[])
  );

CREATE POLICY "NIR e Admin podem deletar bed_records"
  ON public.bed_records FOR DELETE
  USING (
    has_any_role(auth.uid(), ARRAY['admin', 'nir']::app_role[])
  );

-- Políticas RLS para shift_configurations
CREATE POLICY "NIR e Admin podem ver shift_configurations"
  ON public.shift_configurations FOR SELECT
  USING (
    has_any_role(auth.uid(), ARRAY['admin', 'nir']::app_role[])
  );

CREATE POLICY "NIR e Admin podem inserir shift_configurations"
  ON public.shift_configurations FOR INSERT
  WITH CHECK (
    has_any_role(auth.uid(), ARRAY['admin', 'nir']::app_role[])
  );

CREATE POLICY "NIR e Admin podem atualizar shift_configurations"
  ON public.shift_configurations FOR UPDATE
  USING (
    has_any_role(auth.uid(), ARRAY['admin', 'nir']::app_role[])
  );

-- Políticas RLS para daily_statistics
CREATE POLICY "NIR e Admin podem ver daily_statistics"
  ON public.daily_statistics FOR SELECT
  USING (
    has_any_role(auth.uid(), ARRAY['admin', 'nir']::app_role[])
  );

CREATE POLICY "NIR e Admin podem inserir daily_statistics"
  ON public.daily_statistics FOR INSERT
  WITH CHECK (
    has_any_role(auth.uid(), ARRAY['admin', 'nir']::app_role[])
  );

CREATE POLICY "NIR e Admin podem atualizar daily_statistics"
  ON public.daily_statistics FOR UPDATE
  USING (
    has_any_role(auth.uid(), ARRAY['admin', 'nir']::app_role[])
  );

-- Triggers para updated_at
CREATE TRIGGER update_bed_records_updated_at
  BEFORE UPDATE ON public.bed_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shift_configurations_updated_at
  BEFORE UPDATE ON public.shift_configurations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_daily_statistics_updated_at
  BEFORE UPDATE ON public.daily_statistics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_bed_records_shift_date ON public.bed_records(shift_date);
CREATE INDEX IF NOT EXISTS idx_bed_records_sector ON public.bed_records(sector);
CREATE INDEX IF NOT EXISTS idx_bed_records_bed_id ON public.bed_records(bed_id);
CREATE INDEX IF NOT EXISTS idx_daily_statistics_date ON public.daily_statistics(date);