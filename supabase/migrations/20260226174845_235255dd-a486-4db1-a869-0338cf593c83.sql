
-- Unified protocol attendances table for all 3 protocols
CREATE TABLE public.protocolo_atendimentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo_protocolo TEXT NOT NULL, -- 'dor_toracica', 'sepse_adulto', 'sepse_pediatrico'
  competency TEXT NOT NULL DEFAULT to_char(now(), 'YYYY-MM'),
  record_number TEXT NOT NULL,
  patient_name TEXT,
  sex TEXT,
  age INTEGER,
  arrival_time TIMESTAMPTZ NOT NULL,
  ecg_time TIMESTAMPTZ,
  porta_ecg_minutes INTEGER DEFAULT 0,
  within_target BOOLEAN DEFAULT false,
  risk_classification TEXT,
  first_doctor_time TIMESTAMPTZ,
  initial_diagnosis TEXT,
  medical_report TEXT,
  action_plan TEXT,
  admin_observations TEXT,
  -- Condutas
  conduct_medication BOOLEAN DEFAULT false,
  conduct_oxygen BOOLEAN DEFAULT false,
  conduct_monitoring BOOLEAN DEFAULT false,
  conduct_referral BOOLEAN DEFAULT false,
  conduct_observation BOOLEAN DEFAULT false,
  conduct_transfer BOOLEAN DEFAULT false,
  conduct_high_risk BOOLEAN DEFAULT false,
  conduct_moderate_risk BOOLEAN DEFAULT false,
  conduct_low_risk BOOLEAN DEFAULT false,
  -- Troponin samples
  troponin_sample1_collection_time TIMESTAMPTZ,
  troponin_sample1_result TEXT,
  troponin_sample1_release_time TIMESTAMPTZ,
  troponin_sample1_collector TEXT,
  troponin_sample2_collection_time TIMESTAMPTZ,
  troponin_sample2_result TEXT,
  troponin_sample2_release_time TIMESTAMPTZ,
  troponin_sample2_collector TEXT,
  troponin_sample3_collection_time TIMESTAMPTZ,
  troponin_sample3_result TEXT,
  troponin_sample3_release_time TIMESTAMPTZ,
  troponin_sample3_collector TEXT,
  -- Dor Torácica specific: Pain assessment
  pain_location TEXT,
  pain_characteristic TEXT,
  pain_irradiation TEXT,
  pain_association TEXT,
  pain_onset_date TEXT,
  pain_onset_time TEXT,
  pain_duration TEXT,
  pain_referral TEXT,
  -- Dor Torácica specific: Thrombolysis
  thrombolysis_time TIMESTAMPTZ,
  thrombolysis_complication BOOLEAN DEFAULT false,
  thrombolysis_conduct TEXT,
  samu_arrival_time TIMESTAMPTZ,
  destination_hospital TEXT,
  thrombolysis_type TEXT,
  -- Sepse specific: SIRS criteria
  sirs_temp_alta BOOLEAN DEFAULT false,
  sirs_temp_baixa BOOLEAN DEFAULT false,
  sirs_fc_alta BOOLEAN DEFAULT false,
  sirs_fr_alta BOOLEAN DEFAULT false,
  sirs_leucocitose BOOLEAN DEFAULT false,
  sirs_leucopenia BOOLEAN DEFAULT false,
  sirs_celulas_jovens BOOLEAN DEFAULT false,
  sirs_plaquetas BOOLEAN DEFAULT false,
  sirs_lactato BOOLEAN DEFAULT false,
  sirs_bilirrubina BOOLEAN DEFAULT false,
  sirs_creatinina BOOLEAN DEFAULT false,
  disfuncao_pa_baixa BOOLEAN DEFAULT false,
  disfuncao_sato2_baixa BOOLEAN DEFAULT false,
  disfuncao_consciencia BOOLEAN DEFAULT false,
  -- Sepse: Foco infeccioso
  foco_pulmonar BOOLEAN DEFAULT false,
  foco_urinario BOOLEAN DEFAULT false,
  foco_abdominal BOOLEAN DEFAULT false,
  foco_pele_partes_moles BOOLEAN DEFAULT false,
  foco_corrente_sanguinea_cateter BOOLEAN DEFAULT false,
  foco_sem_foco_definido BOOLEAN DEFAULT false,
  necessidade_uti BOOLEAN DEFAULT false,
  kit_sepse_coletado BOOLEAN DEFAULT false,
  lab_villac_horario_chamado TIMESTAMPTZ,
  lab_villac_horario_coleta TIMESTAMPTZ,
  -- Sepse: Suspeita
  sepse_suspeita BOOLEAN DEFAULT false,
  sepse_motivo TEXT,
  sepse_horario TIMESTAMPTZ,
  sepse_medico TEXT,
  protocol_opened_at TIMESTAMPTZ,
  protocol_opened_by_sector TEXT,
  -- Sinais Vitais
  vital_pa TEXT,
  vital_fc INTEGER,
  vital_fr INTEGER,
  vital_spo2 NUMERIC,
  vital_temperatura NUMERIC,
  -- ATB
  atb1_nome TEXT,
  atb1_data TEXT,
  atb1_dose TEXT,
  atb1_horario_inicio TIMESTAMPTZ,
  atb2_nome TEXT,
  atb2_data TEXT,
  atb2_dose TEXT,
  atb2_horario_inicio TIMESTAMPTZ,
  atb_profissional TEXT,
  -- Choque Séptico
  choque_septico BOOLEAN DEFAULT false,
  choque_reposicao_data_hora TIMESTAMPTZ,
  choque_reposicao_medicamento TEXT,
  choque_vasopressor_data_hora TIMESTAMPTZ,
  choque_vasopressor_medicamento TEXT,
  choque_lactato2_data_hora TIMESTAMPTZ,
  choque_lactato3_necessita BOOLEAN DEFAULT false,
  choque_lactato3_data_hora TIMESTAMPTZ,
  choque_lactato3_medicamento_data_hora TIMESTAMPTZ,
  choque_lactato3_medicamento TEXT,
  -- Destino
  destino_paciente TEXT,
  destino_instituicao_nome TEXT,
  -- Assinaturas
  assinatura_enfermeiro TEXT,
  assinatura_medico TEXT,
  assinatura_farmacia TEXT,
  -- Delay reason
  delay_reason TEXT,
  delay_reason_other TEXT,
  -- Metadata
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.protocolo_atendimentos ENABLE ROW LEVEL SECURITY;

-- Settings table for protocol metas
CREATE TABLE public.protocolo_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo_protocolo TEXT NOT NULL UNIQUE,
  meta_minutos INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.protocolo_settings ENABLE ROW LEVEL SECURITY;

-- Insert default settings
INSERT INTO public.protocolo_settings (tipo_protocolo, meta_minutos) VALUES
  ('dor_toracica', 10),
  ('sepse_adulto', 60),
  ('sepse_pediatrico', 60);

-- RLS Policies
CREATE POLICY "Authenticated users can view protocol attendances"
  ON public.protocolo_atendimentos FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert protocol attendances"
  ON public.protocolo_atendimentos FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own or admins can update all"
  ON public.protocolo_atendimentos FOR UPDATE
  USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete protocol attendances"
  ON public.protocolo_atendimentos FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role) OR auth.uid() = created_by);

CREATE POLICY "Authenticated users can view protocol settings"
  ON public.protocolo_settings FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage protocol settings"
  ON public.protocolo_settings FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Indexes
CREATE INDEX idx_protocolo_atendimentos_tipo ON public.protocolo_atendimentos(tipo_protocolo);
CREATE INDEX idx_protocolo_atendimentos_competency ON public.protocolo_atendimentos(competency);

-- Trigger
CREATE TRIGGER update_protocolo_atendimentos_updated_at
  BEFORE UPDATE ON public.protocolo_atendimentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_protocolo_settings_updated_at
  BEFORE UPDATE ON public.protocolo_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
