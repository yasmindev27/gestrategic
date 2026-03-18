
CREATE TABLE public.justificativas_ponto (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unidade TEXT NOT NULL DEFAULT 'UPA ANTONIO JOSE DOS SANTOS',
  setor TEXT,
  colaborador_nome TEXT NOT NULL,
  cargo_funcao TEXT,
  matricula TEXT,
  colaborador_user_id UUID,
  data_ocorrencia DATE NOT NULL,
  jornada_contratual_entrada TIME,
  jornada_contratual_saida TIME,
  jornada_registrada_entrada TIME,
  jornada_registrada_saida TIME,
  minutos_excedentes INTEGER DEFAULT 0,
  justificativa TEXT,
  observacoes TEXT,
  registrado_por UUID,
  registrado_por_nome TEXT,
  status TEXT NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.justificativas_ponto ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins e RH podem ver todas justificativas"
  ON public.justificativas_ponto FOR SELECT
  USING (has_any_role(auth.uid(), ARRAY['admin','rh_dp']::app_role[]));

CREATE POLICY "Admins e RH podem inserir justificativas"
  ON public.justificativas_ponto FOR INSERT
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin','rh_dp']::app_role[]));

CREATE POLICY "Admins e RH podem atualizar justificativas"
  ON public.justificativas_ponto FOR UPDATE
  USING (has_any_role(auth.uid(), ARRAY['admin','rh_dp']::app_role[]));

CREATE POLICY "Admins e RH podem deletar justificativas"
  ON public.justificativas_ponto FOR DELETE
  USING (has_any_role(auth.uid(), ARRAY['admin','rh_dp']::app_role[]));

CREATE TRIGGER update_justificativas_ponto_updated_at
  BEFORE UPDATE ON public.justificativas_ponto
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
