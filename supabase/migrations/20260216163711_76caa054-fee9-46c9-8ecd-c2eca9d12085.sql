
-- Tabela para registrar atrasos de lançamento detectados
CREATE TABLE public.auditoria_temporalidade (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setor TEXT NOT NULL,
  modulo TEXT NOT NULL,
  registro_id UUID,
  descricao TEXT NOT NULL,
  data_fato TIMESTAMPTZ NOT NULL,
  data_registro TIMESTAMPTZ NOT NULL,
  delay_horas NUMERIC GENERATED ALWAYS AS (EXTRACT(EPOCH FROM (data_registro - data_fato)) / 3600) STORED,
  limite_horas NUMERIC NOT NULL DEFAULT 24,
  justificado BOOLEAN DEFAULT false,
  justificativa_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

ALTER TABLE public.auditoria_temporalidade ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin e gerencia podem ver todos os registros de temporalidade"
  ON public.auditoria_temporalidade FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','gestor']::app_role[]));

CREATE POLICY "Usuarios autenticados podem inserir registros de temporalidade"
  ON public.auditoria_temporalidade FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios do setor podem ver seus registros"
  ON public.auditoria_temporalidade FOR SELECT TO authenticated
  USING (setor = public.get_user_setor(auth.uid()));

-- Tabela de justificativas de atraso (5W2H simplificado)
CREATE TABLE public.justificativas_atraso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auditoria_id UUID NOT NULL REFERENCES public.auditoria_temporalidade(id) ON DELETE CASCADE,
  responsavel_nome TEXT NOT NULL,
  responsavel_id UUID,
  motivo TEXT NOT NULL,
  acao_corretiva TEXT NOT NULL,
  prazo_correcao DATE,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','aprovada','rejeitada')),
  aprovado_por UUID,
  aprovado_por_nome TEXT,
  aprovado_em TIMESTAMPTZ,
  observacao_gerencia TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.justificativas_atraso ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin e gerencia podem ver justificativas"
  ON public.justificativas_atraso FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','gestor']::app_role[]));

CREATE POLICY "Responsavel pode ver suas justificativas"
  ON public.justificativas_atraso FOR SELECT TO authenticated
  USING (responsavel_id = auth.uid());

CREATE POLICY "Usuarios autenticados podem inserir justificativas"
  ON public.justificativas_atraso FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admin e gerencia podem atualizar justificativas"
  ON public.justificativas_atraso FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','gestor']::app_role[]));

CREATE POLICY "Responsavel pode atualizar suas justificativas"
  ON public.justificativas_atraso FOR UPDATE TO authenticated
  USING (responsavel_id = auth.uid());

-- Tabela para controle de vigência de documentos (ONA 1.4)
CREATE TABLE public.controle_vigencia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria TEXT NOT NULL CHECK (categoria IN ('institucional','equipamento','pessoa')),
  tipo_documento TEXT NOT NULL,
  descricao TEXT NOT NULL,
  referencia_id UUID,
  referencia_nome TEXT,
  data_emissao DATE,
  data_validade DATE NOT NULL,
  arquivo_url TEXT,
  setor_responsavel TEXT,
  bloqueio_operacional BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

ALTER TABLE public.controle_vigencia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Roles autorizados podem ver controle de vigencia"
  ON public.controle_vigencia FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','gestor','qualidade','nsp']::app_role[]));

CREATE POLICY "Admin e qualidade podem gerenciar vigencia"
  ON public.controle_vigencia FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','qualidade']::app_role[]));

CREATE POLICY "Admin e qualidade podem atualizar vigencia"
  ON public.controle_vigencia FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','qualidade']::app_role[]));

CREATE POLICY "Admin pode deletar vigencia"
  ON public.controle_vigencia FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Índices
CREATE INDEX idx_temporalidade_setor ON public.auditoria_temporalidade(setor);
CREATE INDEX idx_temporalidade_delay ON public.auditoria_temporalidade(delay_horas);
CREATE INDEX idx_vigencia_validade ON public.controle_vigencia(data_validade);
CREATE INDEX idx_vigencia_categoria ON public.controle_vigencia(categoria);

-- Trigger updated_at
CREATE TRIGGER update_justificativas_updated_at BEFORE UPDATE ON public.justificativas_atraso
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_vigencia_updated_at BEFORE UPDATE ON public.controle_vigencia
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
