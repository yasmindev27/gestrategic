-- Criar tabela para banco de horas
CREATE TABLE public.banco_horas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_user_id UUID NOT NULL,
  funcionario_nome TEXT NOT NULL,
  data DATE NOT NULL,
  tipo TEXT NOT NULL,
  horas NUMERIC(5,2) NOT NULL,
  motivo TEXT,
  observacao TEXT,
  registrado_por UUID NOT NULL,
  aprovado_por UUID,
  aprovado_em TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para central de atestados
CREATE TABLE public.atestados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_user_id UUID NOT NULL,
  funcionario_nome TEXT NOT NULL,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  dias_afastamento INTEGER NOT NULL,
  tipo TEXT NOT NULL,
  cid TEXT,
  medico_nome TEXT,
  crm TEXT,
  observacao TEXT,
  arquivo_url TEXT,
  registrado_por UUID NOT NULL,
  validado_por UUID,
  validado_em TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.banco_horas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atestados ENABLE ROW LEVEL SECURITY;

-- Policies para banco_horas
CREATE POLICY "RH_DP e Admin gerenciam banco_horas"
ON public.banco_horas FOR ALL
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'rh_dp'::app_role]));

CREATE POLICY "Gestores visualizam banco_horas de sua equipe"
ON public.banco_horas FOR SELECT
USING (has_role(auth.uid(), 'gestor'::app_role) AND gestor_gerencia_usuario(auth.uid(), funcionario_user_id));

CREATE POLICY "Funcionários visualizam próprio banco_horas"
ON public.banco_horas FOR SELECT
USING (funcionario_user_id = auth.uid());

-- Policies para atestados
CREATE POLICY "RH_DP e Admin gerenciam atestados"
ON public.atestados FOR ALL
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'rh_dp'::app_role]));

CREATE POLICY "Gestores visualizam atestados de sua equipe"
ON public.atestados FOR SELECT
USING (has_role(auth.uid(), 'gestor'::app_role) AND gestor_gerencia_usuario(auth.uid(), funcionario_user_id));

CREATE POLICY "Funcionários visualizam próprios atestados"
ON public.atestados FOR SELECT
USING (funcionario_user_id = auth.uid());

-- Trigger para updated_at
CREATE TRIGGER update_banco_horas_updated_at
BEFORE UPDATE ON public.banco_horas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_atestados_updated_at
BEFORE UPDATE ON public.atestados
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();