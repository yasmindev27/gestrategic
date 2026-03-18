
-- Table to store shift handover (passagem de plantão) records
CREATE TABLE public.passagem_plantao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shift_date TEXT NOT NULL,
  shift_type TEXT NOT NULL, -- diurno/noturno
  colaborador_saida_id UUID,
  colaborador_saida_nome TEXT NOT NULL,
  data_hora_conclusao TIMESTAMPTZ NOT NULL DEFAULT now(),
  colaborador_entrada_id UUID,
  colaborador_entrada_nome TEXT,
  data_hora_assuncao TIMESTAMPTZ,
  justificativa TEXT,
  tempo_troca_minutos NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.passagem_plantao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view passagem_plantao"
  ON public.passagem_plantao FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert passagem_plantao"
  ON public.passagem_plantao FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update passagem_plantao"
  ON public.passagem_plantao FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE TRIGGER update_passagem_plantao_updated_at
  BEFORE UPDATE ON public.passagem_plantao
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
