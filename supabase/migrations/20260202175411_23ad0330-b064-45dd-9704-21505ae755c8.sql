-- Create table for structured patient safety audits
CREATE TABLE public.auditorias_seguranca_paciente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN (
    'comunicacao_efetiva',
    'lesao_pressao',
    'queda',
    'higiene_maos',
    'avaliacao_prontuarios_enfermeiros'
  )),
  data_auditoria DATE NOT NULL,
  setor TEXT NOT NULL,
  auditor_id UUID NOT NULL,
  auditor_nome TEXT NOT NULL,
  -- Patient-specific fields (for patient safety audits)
  paciente_iniciais TEXT,
  paciente_ra TEXT,
  numero_prontuario TEXT,
  -- Specific fields for lesao_pressao and queda
  score_risco TEXT,
  possui_lpp BOOLEAN,
  grau_lpp TEXT,
  apresentou_queda BOOLEAN,
  notificacao_aberta TEXT,
  -- Specific field for higiene_maos
  profissional_auditado TEXT,
  -- Specific fields for avaliacao_prontuarios
  mes_avaliacao TEXT,
  unidade_atendimento TEXT,
  satisfacao_geral INTEGER,
  -- Form responses stored as JSONB (for checklist items and Likert scales)
  respostas JSONB NOT NULL DEFAULT '{}',
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.auditorias_seguranca_paciente ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Qualidade/NSP/Admin can view all patient safety audits"
ON public.auditorias_seguranca_paciente
FOR SELECT
TO authenticated
USING (
  public.has_any_role(auth.uid(), ARRAY['admin', 'qualidade', 'nsp']::public.app_role[])
);

CREATE POLICY "Qualidade/NSP/Admin can insert patient safety audits"
ON public.auditorias_seguranca_paciente
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_any_role(auth.uid(), ARRAY['admin', 'qualidade', 'nsp']::public.app_role[])
);

CREATE POLICY "Qualidade/NSP/Admin can update patient safety audits"
ON public.auditorias_seguranca_paciente
FOR UPDATE
TO authenticated
USING (
  public.has_any_role(auth.uid(), ARRAY['admin', 'qualidade', 'nsp']::public.app_role[])
);

CREATE POLICY "Qualidade/NSP/Admin can delete patient safety audits"
ON public.auditorias_seguranca_paciente
FOR DELETE
TO authenticated
USING (
  public.has_any_role(auth.uid(), ARRAY['admin', 'qualidade', 'nsp']::public.app_role[])
);

-- Create trigger for updated_at
CREATE TRIGGER update_auditorias_seguranca_paciente_updated_at
  BEFORE UPDATE ON public.auditorias_seguranca_paciente
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for common queries
CREATE INDEX idx_auditorias_seguranca_paciente_tipo ON public.auditorias_seguranca_paciente(tipo);
CREATE INDEX idx_auditorias_seguranca_paciente_data ON public.auditorias_seguranca_paciente(data_auditoria);
CREATE INDEX idx_auditorias_seguranca_paciente_setor ON public.auditorias_seguranca_paciente(setor);