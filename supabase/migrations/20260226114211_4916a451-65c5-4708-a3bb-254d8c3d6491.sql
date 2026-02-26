
-- Tabela para avaliações de experiência (FORM.RH.009)
CREATE TABLE public.avaliacoes_experiencia (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  periodo_avaliacao TEXT NOT NULL CHECK (periodo_avaliacao IN ('45_dias', '90_dias')),
  colaborador_nome TEXT NOT NULL,
  setor TEXT,
  funcao TEXT,
  data_admissao DATE NOT NULL,
  data_termino_experiencia DATE,
  data_avaliacao DATE NOT NULL DEFAULT CURRENT_DATE,
  avaliador_nome TEXT NOT NULL,
  avaliador_id UUID REFERENCES auth.users(id),
  -- 5 competências: excelente, bom, regular, insatisfatorio
  assiduidade TEXT NOT NULL CHECK (assiduidade IN ('excelente', 'bom', 'regular', 'insatisfatorio')),
  disciplina TEXT NOT NULL CHECK (disciplina IN ('excelente', 'bom', 'regular', 'insatisfatorio')),
  iniciativa TEXT NOT NULL CHECK (iniciativa IN ('excelente', 'bom', 'regular', 'insatisfatorio')),
  produtividade TEXT NOT NULL CHECK (produtividade IN ('excelente', 'bom', 'regular', 'insatisfatorio')),
  responsabilidade TEXT NOT NULL CHECK (responsabilidade IN ('excelente', 'bom', 'regular', 'insatisfatorio')),
  -- Campos descritivos página 3
  competencias_destaque TEXT,
  competencias_ajustes TEXT,
  acoes_adequacao TEXT,
  outros_comentarios TEXT,
  -- Resultado final
  resultado TEXT NOT NULL CHECK (resultado IN ('aprovado', 'reprovado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.avaliacoes_experiencia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "RH/DP e admin podem ver avaliacoes_experiencia"
  ON public.avaliacoes_experiencia FOR SELECT
  USING (has_any_role(auth.uid(), ARRAY['admin','rh_dp']::app_role[]));

CREATE POLICY "RH/DP e admin podem inserir avaliacoes_experiencia"
  ON public.avaliacoes_experiencia FOR INSERT
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin','rh_dp']::app_role[]));

CREATE POLICY "RH/DP e admin podem atualizar avaliacoes_experiencia"
  ON public.avaliacoes_experiencia FOR UPDATE
  USING (has_any_role(auth.uid(), ARRAY['admin','rh_dp']::app_role[]));

CREATE POLICY "RH/DP e admin podem deletar avaliacoes_experiencia"
  ON public.avaliacoes_experiencia FOR DELETE
  USING (has_any_role(auth.uid(), ARRAY['admin','rh_dp']::app_role[]));

CREATE TRIGGER update_avaliacoes_experiencia_updated_at
  BEFORE UPDATE ON public.avaliacoes_experiencia
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
