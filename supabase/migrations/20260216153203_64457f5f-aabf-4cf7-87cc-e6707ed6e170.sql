
-- Tabela de atendimentos Porta-ECG (indicador cardíaco)
CREATE TABLE public.porta_ecg_atendimentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  competence_month INTEGER NOT NULL,
  competence_year INTEGER NOT NULL,
  record_number TEXT NOT NULL,
  patient_name TEXT,
  sex TEXT NOT NULL DEFAULT 'masculino',
  age INTEGER NOT NULL DEFAULT 0,
  arrival_time TIMESTAMPTZ NOT NULL,
  ecg_time TIMESTAMPTZ NOT NULL,
  door_to_ecg_minutes INTEGER NOT NULL DEFAULT 0,
  within_goal BOOLEAN NOT NULL DEFAULT true,
  goal_minutes INTEGER NOT NULL DEFAULT 10,
  delay_reason TEXT,
  delay_reason_other TEXT,
  conducts TEXT[] DEFAULT '{}',
  risk_classification TEXT NOT NULL DEFAULT 'amarelo',
  first_doctor_time TIMESTAMPTZ,
  initial_diagnosis TEXT,
  medical_report TEXT,
  action_plan TEXT,
  observations TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.porta_ecg_atendimentos ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view porta_ecg_atendimentos"
ON public.porta_ecg_atendimentos FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert porta_ecg_atendimentos"
ON public.porta_ecg_atendimentos FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update porta_ecg_atendimentos"
ON public.porta_ecg_atendimentos FOR UPDATE
TO authenticated
USING (auth.uid() = created_by);

CREATE POLICY "Authenticated users can delete porta_ecg_atendimentos"
ON public.porta_ecg_atendimentos FOR DELETE
TO authenticated
USING (auth.uid() = created_by);

-- Trigger for updated_at
CREATE TRIGGER update_porta_ecg_atendimentos_updated_at
BEFORE UPDATE ON public.porta_ecg_atendimentos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
