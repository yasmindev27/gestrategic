
-- Tabela de formulários de auditoria configuráveis
CREATE TABLE public.auditoria_formularios_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  icone TEXT DEFAULT 'FileText',
  ativo BOOLEAN DEFAULT true,
  ordem INTEGER DEFAULT 0,
  setores TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seções dentro de cada formulário
CREATE TABLE public.auditoria_secoes_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  formulario_id UUID NOT NULL REFERENCES public.auditoria_formularios_config(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Perguntas dentro de cada seção
CREATE TABLE public.auditoria_perguntas_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  secao_id UUID NOT NULL REFERENCES public.auditoria_secoes_config(id) ON DELETE CASCADE,
  codigo TEXT NOT NULL,
  label TEXT NOT NULL,
  opcoes TEXT[] NOT NULL DEFAULT '{"conforme","nao_conforme","nao_aplica"}',
  ativo BOOLEAN DEFAULT true,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.auditoria_formularios_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria_secoes_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria_perguntas_config ENABLE ROW LEVEL SECURITY;

-- Policies: anyone authenticated can read, admin/qualidade can modify
CREATE POLICY "Authenticated users can read formularios_config"
  ON public.auditoria_formularios_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Qualidade can manage formularios_config"
  ON public.auditoria_formularios_config FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','qualidade']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','qualidade']::app_role[]));

CREATE POLICY "Authenticated users can read secoes_config"
  ON public.auditoria_secoes_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Qualidade can manage secoes_config"
  ON public.auditoria_secoes_config FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','qualidade']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','qualidade']::app_role[]));

CREATE POLICY "Authenticated users can read perguntas_config"
  ON public.auditoria_perguntas_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Qualidade can manage perguntas_config"
  ON public.auditoria_perguntas_config FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','qualidade']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','qualidade']::app_role[]));

-- Triggers for updated_at
CREATE TRIGGER update_auditoria_formularios_config_updated_at
  BEFORE UPDATE ON public.auditoria_formularios_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_auditoria_secoes_config_updated_at
  BEFORE UPDATE ON public.auditoria_secoes_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_auditoria_perguntas_config_updated_at
  BEFORE UPDATE ON public.auditoria_perguntas_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Index
CREATE INDEX idx_secoes_formulario ON public.auditoria_secoes_config(formulario_id);
CREATE INDEX idx_perguntas_secao ON public.auditoria_perguntas_config(secao_id);
