
-- Tabela para justificativas de extensão de jornada
CREATE TABLE public.justificativas_extensao_jornada (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  colaborador_user_id UUID NOT NULL,
  colaborador_nome TEXT NOT NULL,
  colaborador_cargo TEXT,
  colaborador_setor TEXT,
  data_extensao DATE NOT NULL,
  hora_inicio_extra TEXT NOT NULL,
  hora_fim_extra TEXT NOT NULL,
  minutos_extras INTEGER NOT NULL DEFAULT 0,
  motivo TEXT NOT NULL,
  justificativa TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  aprovado_por UUID,
  aprovado_por_nome TEXT,
  aprovado_em TIMESTAMPTZ,
  observacao_aprovador TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.justificativas_extensao_jornada ENABLE ROW LEVEL SECURITY;

-- Colaborador pode ver suas próprias justificativas
CREATE POLICY "Colaborador vê próprias justificativas extensão"
ON public.justificativas_extensao_jornada FOR SELECT
USING (auth.uid() = colaborador_user_id);

-- Colaborador pode inserir suas próprias justificativas
CREATE POLICY "Colaborador insere própria justificativa extensão"
ON public.justificativas_extensao_jornada FOR INSERT
WITH CHECK (auth.uid() = colaborador_user_id);

-- Admin e enfermagem podem ver todas
CREATE POLICY "Admin e enfermagem veem todas extensões"
ON public.justificativas_extensao_jornada FOR SELECT
USING (has_any_role(auth.uid(), ARRAY['admin', 'enfermagem', 'gestor']::app_role[]));

-- Admin e enfermagem podem atualizar (aprovar/rejeitar)
CREATE POLICY "Admin e enfermagem aprovam extensões"
ON public.justificativas_extensao_jornada FOR UPDATE
USING (has_any_role(auth.uid(), ARRAY['admin', 'enfermagem', 'gestor']::app_role[]));

-- Trigger updated_at
CREATE TRIGGER update_justificativas_extensao_jornada_updated_at
BEFORE UPDATE ON public.justificativas_extensao_jornada
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.justificativas_extensao_jornada;
