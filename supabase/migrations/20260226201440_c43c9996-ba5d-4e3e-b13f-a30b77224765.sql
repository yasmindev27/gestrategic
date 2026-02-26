
-- Add COREN column to profissionais_saude
ALTER TABLE public.profissionais_saude ADD COLUMN IF NOT EXISTS coren TEXT;

-- Create monthly schedule table for Técnicos de Enfermagem
CREATE TABLE public.escalas_tec_enfermagem (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
  ano INTEGER NOT NULL CHECK (ano >= 2020),
  titulo TEXT DEFAULT 'ESCALA DE SERVIÇO DE TECNICO DE ENFERMAGEM',
  unidade TEXT DEFAULT 'UNIDADE DE PRONTO ATENDIMENTO ANTONIO JOSE DOS SANTOS',
  legenda JSONB DEFAULT '{"U":"URGÊNCIA","S":"SUTURA","I":"INTERNAÇÃO","C/M":"CME / MEDICAÇÃO","M1":"MEDICAÇÃO / ACOLHIMENTO","M2":"LAB / MEDICAÇÃO","T":"TRANSPORTE","A":"ACOLHIMENTO","LAB":"LABORATÓRIO","AF":"AFASTAMENTO JUSTIFICADO","CME":"CME"}',
  mensagem_motivacional TEXT,
  coordenadora_nome TEXT,
  coordenadora_coren TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(mes, ano)
);

-- Professionals within a schedule
CREATE TABLE public.escala_tec_enf_profissionais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escala_id UUID NOT NULL REFERENCES public.escalas_tec_enfermagem(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  coren TEXT NOT NULL,
  horario TEXT NOT NULL, -- e.g. "19:00 AS 07:00" or "07:00 AS 19:00"
  grupo TEXT NOT NULL, -- noturno_impar, noturno_par, diurno_impar, diurno_par, especial
  ordem INTEGER NOT NULL DEFAULT 0,
  profissional_saude_id UUID REFERENCES public.profissionais_saude(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Daily assignments for each professional
CREATE TABLE public.escala_tec_enf_dias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profissional_id UUID NOT NULL REFERENCES public.escala_tec_enf_profissionais(id) ON DELETE CASCADE,
  dia INTEGER NOT NULL CHECK (dia >= 1 AND dia <= 31),
  setor_codigo TEXT NOT NULL DEFAULT '', -- U, S, I, C/M, M1, M2, T, A, LAB, CME, etc.
  UNIQUE(profissional_id, dia)
);

-- Enable RLS
ALTER TABLE public.escalas_tec_enfermagem ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escala_tec_enf_profissionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escala_tec_enf_dias ENABLE ROW LEVEL SECURITY;

-- Policies: authenticated users can read, admin/gestor/enfermagem can write
CREATE POLICY "Authenticated users can view schedules"
ON public.escalas_tec_enfermagem FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin/gestor can manage schedules"
ON public.escalas_tec_enfermagem FOR ALL TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin','gestor','enfermagem']::app_role[]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','gestor','enfermagem']::app_role[]));

CREATE POLICY "Authenticated users can view prof"
ON public.escala_tec_enf_profissionais FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin/gestor can manage prof"
ON public.escala_tec_enf_profissionais FOR ALL TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin','gestor','enfermagem']::app_role[]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','gestor','enfermagem']::app_role[]));

CREATE POLICY "Authenticated users can view dias"
ON public.escala_tec_enf_dias FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin/gestor can manage dias"
ON public.escala_tec_enf_dias FOR ALL TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin','gestor','enfermagem']::app_role[]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','gestor','enfermagem']::app_role[]));

-- Trigger for updated_at
CREATE TRIGGER update_escalas_tec_enfermagem_updated_at
BEFORE UPDATE ON public.escalas_tec_enfermagem
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.escalas_tec_enfermagem;
ALTER PUBLICATION supabase_realtime ADD TABLE public.escala_tec_enf_dias;
