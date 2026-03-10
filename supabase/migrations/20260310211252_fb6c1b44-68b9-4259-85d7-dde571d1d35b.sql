
-- Tabela de Passagem de Plantão do Serviço Social/Psicologia
CREATE TABLE public.passagem_plantao_social (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_plantao DATE NOT NULL DEFAULT CURRENT_DATE,
  turno TEXT NOT NULL DEFAULT 'diurno',
  profissional_id UUID NOT NULL,
  profissional_nome TEXT NOT NULL,
  texto_pendencias TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Atendimentos vinculados como pendentes na passagem
CREATE TABLE public.passagem_plantao_social_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passagem_id UUID NOT NULL REFERENCES public.passagem_plantao_social(id) ON DELETE CASCADE,
  atendimento_id UUID NOT NULL REFERENCES public.assistencia_social_atendimentos(id) ON DELETE CASCADE,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Solicitações de suporte entre profissionais
CREATE TABLE public.solicitacoes_suporte_social (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitante_id UUID NOT NULL,
  solicitante_nome TEXT NOT NULL,
  destinatario_id UUID,
  destinatario_nome TEXT,
  paciente_nome TEXT NOT NULL,
  atendimento_id UUID REFERENCES public.assistencia_social_atendimentos(id) ON DELETE SET NULL,
  descricao TEXT NOT NULL,
  tipo_suporte TEXT NOT NULL DEFAULT 'acompanhamento',
  status TEXT NOT NULL DEFAULT 'pendente',
  resposta TEXT,
  respondido_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.passagem_plantao_social ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passagem_plantao_social_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitacoes_suporte_social ENABLE ROW LEVEL SECURITY;

-- Policies passagem_plantao_social
CREATE POLICY "Admin e assistencia_social podem ver passagens"
  ON public.passagem_plantao_social FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin', 'assistencia_social']::app_role[]));

CREATE POLICY "Admin e assistencia_social podem inserir passagens"
  ON public.passagem_plantao_social FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin', 'assistencia_social']::app_role[]));

CREATE POLICY "Admin e assistencia_social podem atualizar passagens"
  ON public.passagem_plantao_social FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin', 'assistencia_social']::app_role[]));

-- Policies passagem_plantao_social_itens
CREATE POLICY "Admin e assistencia_social podem ver itens passagem"
  ON public.passagem_plantao_social_itens FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin', 'assistencia_social']::app_role[]));

CREATE POLICY "Admin e assistencia_social podem inserir itens passagem"
  ON public.passagem_plantao_social_itens FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin', 'assistencia_social']::app_role[]));

-- Policies solicitacoes_suporte_social
CREATE POLICY "Admin e assistencia_social podem ver solicitacoes"
  ON public.solicitacoes_suporte_social FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin', 'assistencia_social']::app_role[]));

CREATE POLICY "Admin e assistencia_social podem inserir solicitacoes"
  ON public.solicitacoes_suporte_social FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin', 'assistencia_social']::app_role[]));

CREATE POLICY "Admin e assistencia_social podem atualizar solicitacoes"
  ON public.solicitacoes_suporte_social FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin', 'assistencia_social']::app_role[]));

-- Triggers updated_at
CREATE TRIGGER update_passagem_plantao_social_updated_at
  BEFORE UPDATE ON public.passagem_plantao_social
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_solicitacoes_suporte_social_updated_at
  BEFORE UPDATE ON public.solicitacoes_suporte_social
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
