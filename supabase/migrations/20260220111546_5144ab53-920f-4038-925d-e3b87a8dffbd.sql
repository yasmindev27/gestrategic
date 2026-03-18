
-- Tabela de movimentações internas de setor
CREATE TABLE IF NOT EXISTS public.rh_movimentacoes_setor (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  colaborador_nome TEXT NOT NULL,
  colaborador_matricula TEXT,
  cargo TEXT NOT NULL,
  setor_anterior TEXT NOT NULL,
  setor_novo TEXT NOT NULL,
  data_mudanca DATE NOT NULL DEFAULT CURRENT_DATE,
  motivo TEXT,
  aprovado_por TEXT,
  observacoes TEXT,
  registrado_por UUID,
  registrado_por_nome TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.rh_movimentacoes_setor ENABLE ROW LEVEL SECURITY;

CREATE POLICY "RH e admin podem gerenciar movimentações"
ON public.rh_movimentacoes_setor
FOR ALL
USING (has_any_role(auth.uid(), ARRAY['admin', 'rh_dp']::app_role[]))
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin', 'rh_dp']::app_role[]));

CREATE POLICY "Gestores podem visualizar movimentações"
ON public.rh_movimentacoes_setor
FOR SELECT
USING (has_any_role(auth.uid(), ARRAY['admin', 'rh_dp', 'gestor']::app_role[]));

-- Tabela de ocorrências disciplinares
CREATE TABLE IF NOT EXISTS public.rh_ocorrencias_disciplinares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  colaborador_nome TEXT NOT NULL,
  colaborador_matricula TEXT,
  cargo TEXT,
  setor TEXT,
  tipo_ocorrencia TEXT NOT NULL CHECK (tipo_ocorrencia IN ('advertencia_verbal', 'advertencia_escrita', 'suspensao')),
  data_ocorrencia DATE NOT NULL DEFAULT CURRENT_DATE,
  motivo_clt TEXT NOT NULL,
  descricao TEXT,
  status_assinatura TEXT NOT NULL DEFAULT 'pendente' CHECK (status_assinatura IN ('assinado', 'pendente', 'recusado_testemunhas')),
  dias_suspensao INTEGER,
  testemunha_1 TEXT,
  testemunha_2 TEXT,
  data_assinatura DATE,
  observacoes TEXT,
  arquivo_url TEXT,
  registrado_por UUID,
  registrado_por_nome TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.rh_ocorrencias_disciplinares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "RH e admin podem gerenciar ocorrências"
ON public.rh_ocorrencias_disciplinares
FOR ALL
USING (has_any_role(auth.uid(), ARRAY['admin', 'rh_dp']::app_role[]))
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin', 'rh_dp']::app_role[]));

CREATE POLICY "Gestores podem visualizar ocorrências"
ON public.rh_ocorrencias_disciplinares
FOR SELECT
USING (has_any_role(auth.uid(), ARRAY['admin', 'rh_dp', 'gestor']::app_role[]));

-- Triggers para updated_at
CREATE TRIGGER update_rh_movimentacoes_setor_updated_at
  BEFORE UPDATE ON public.rh_movimentacoes_setor
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rh_ocorrencias_disciplinares_updated_at
  BEFORE UPDATE ON public.rh_ocorrencias_disciplinares
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
