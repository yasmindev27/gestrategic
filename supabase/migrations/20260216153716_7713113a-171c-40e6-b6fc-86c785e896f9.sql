
-- Tabela de indicadores UPA (urgência)
CREATE TABLE public.upa_indicators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mes TEXT NOT NULL,
  ano INTEGER NOT NULL,
  categoria TEXT NOT NULL,
  subcategoria TEXT,
  indicador TEXT NOT NULL,
  valor_numero NUMERIC,
  valor_percentual NUMERIC,
  meta NUMERIC,
  unidade_medida TEXT NOT NULL DEFAULT 'Nº',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.upa_indicators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view upa_indicators"
ON public.upa_indicators FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert upa_indicators"
ON public.upa_indicators FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update upa_indicators"
ON public.upa_indicators FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete upa_indicators"
ON public.upa_indicators FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_upa_indicators_updated_at
BEFORE UPDATE ON public.upa_indicators
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de planos de ação UPA
CREATE TABLE public.upa_action_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  indicator_id UUID REFERENCES public.upa_indicators(id) ON DELETE SET NULL,
  mes TEXT NOT NULL,
  ano INTEGER NOT NULL,
  analise_critica TEXT,
  fator_causa TEXT,
  plano_acao TEXT,
  responsavel TEXT,
  prazo TEXT,
  status TEXT NOT NULL DEFAULT 'Pendente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.upa_action_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view upa_action_plans"
ON public.upa_action_plans FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert upa_action_plans"
ON public.upa_action_plans FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update upa_action_plans"
ON public.upa_action_plans FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete upa_action_plans"
ON public.upa_action_plans FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_upa_action_plans_updated_at
BEFORE UPDATE ON public.upa_action_plans
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de indicadores NSP (internação)
CREATE TABLE public.nsp_indicators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mes TEXT NOT NULL,
  ano INTEGER NOT NULL,
  categoria TEXT NOT NULL,
  subcategoria TEXT,
  indicador TEXT NOT NULL,
  valor_numero NUMERIC,
  valor_percentual NUMERIC,
  meta NUMERIC,
  unidade_medida TEXT NOT NULL DEFAULT 'Nº',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.nsp_indicators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view nsp_indicators"
ON public.nsp_indicators FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert nsp_indicators"
ON public.nsp_indicators FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update nsp_indicators"
ON public.nsp_indicators FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete nsp_indicators"
ON public.nsp_indicators FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_nsp_indicators_updated_at
BEFORE UPDATE ON public.nsp_indicators
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de planos de ação NSP
CREATE TABLE public.nsp_action_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  indicator_id UUID REFERENCES public.nsp_indicators(id) ON DELETE SET NULL,
  mes TEXT NOT NULL,
  ano INTEGER NOT NULL,
  analise_critica TEXT,
  fator_causa TEXT,
  plano_acao TEXT,
  responsavel TEXT,
  prazo TEXT,
  status TEXT NOT NULL DEFAULT 'Pendente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.nsp_action_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view nsp_action_plans"
ON public.nsp_action_plans FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert nsp_action_plans"
ON public.nsp_action_plans FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update nsp_action_plans"
ON public.nsp_action_plans FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete nsp_action_plans"
ON public.nsp_action_plans FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_nsp_action_plans_updated_at
BEFORE UPDATE ON public.nsp_action_plans
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
