
-- Table to persist performance evaluations
CREATE TABLE public.avaliacoes_desempenho (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  colaborador TEXT NOT NULL,
  cargo TEXT,
  avaliador TEXT NOT NULL,
  data_avaliacao DATE NOT NULL DEFAULT CURRENT_DATE,
  scores JSONB NOT NULL DEFAULT '{}',
  pontos_fortes TEXT,
  oportunidades TEXT,
  feedback TEXT,
  acoes_desenvolvimento JSONB DEFAULT '[]',
  medias_categorias JSONB DEFAULT '{}',
  nota_geral NUMERIC(5,2),
  registrado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.avaliacoes_desempenho ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin and RH can manage avaliacoes"
ON public.avaliacoes_desempenho
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'rh_dp')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'rh_dp')
);

CREATE TRIGGER update_avaliacoes_desempenho_updated_at
BEFORE UPDATE ON public.avaliacoes_desempenho
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
