
-- =============================================
-- SCIRAS / Epidemiologia - Tabelas completas
-- =============================================

-- 1. Vigilância de IRAS
CREATE TABLE public.sciras_vigilancia_iras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_notificacao TEXT NOT NULL,
  paciente_nome TEXT NOT NULL,
  numero_prontuario TEXT,
  data_nascimento DATE,
  setor TEXT NOT NULL,
  leito TEXT,
  data_internacao DATE,
  data_infeccao DATE NOT NULL,
  sitio_infeccao TEXT NOT NULL,
  tipo_iras TEXT NOT NULL,
  dispositivo_invasivo TEXT,
  data_instalacao_dispositivo DATE,
  data_remocao_dispositivo DATE,
  microrganismo TEXT,
  perfil_resistencia TEXT,
  classificacao_gravidade TEXT DEFAULT 'moderado',
  status TEXT DEFAULT 'em_investigacao',
  observacoes TEXT,
  notificador_id UUID,
  notificador_nome TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS sciras_iras_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_sciras_iras_number()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.numero_notificacao := 'IRAS-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('sciras_iras_seq')::TEXT, 5, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_sciras_iras_number BEFORE INSERT ON public.sciras_vigilancia_iras
FOR EACH ROW EXECUTE FUNCTION public.generate_sciras_iras_number();

CREATE TRIGGER trg_update_sciras_vigilancia_iras BEFORE UPDATE ON public.sciras_vigilancia_iras
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.sciras_vigilancia_iras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can view IRAS" ON public.sciras_vigilancia_iras FOR SELECT TO authenticated USING (true);
CREATE POLICY "SCIRAS roles can insert IRAS" ON public.sciras_vigilancia_iras FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin', 'enfermagem', 'qualidade', 'nsp', 'gestor']::app_role[]));
CREATE POLICY "SCIRAS roles can update IRAS" ON public.sciras_vigilancia_iras FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin', 'enfermagem', 'qualidade', 'nsp']::app_role[]));
CREATE POLICY "Admin can delete IRAS" ON public.sciras_vigilancia_iras FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- 2. Indicadores Diários
CREATE TABLE public.sciras_indicadores_diarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_registro DATE NOT NULL,
  setor TEXT NOT NULL,
  pacientes_dia INTEGER NOT NULL DEFAULT 0,
  cvc_dia INTEGER NOT NULL DEFAULT 0,
  svd_dia INTEGER NOT NULL DEFAULT 0,
  vm_dia INTEGER NOT NULL DEFAULT 0,
  ipcs_novas INTEGER NOT NULL DEFAULT 0,
  itu_novas INTEGER NOT NULL DEFAULT 0,
  pav_novas INTEGER NOT NULL DEFAULT 0,
  registrado_por UUID NOT NULL,
  registrado_por_nome TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(data_registro, setor)
);

CREATE TRIGGER trg_update_sciras_indicadores BEFORE UPDATE ON public.sciras_indicadores_diarios
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.sciras_indicadores_diarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can view indicadores" ON public.sciras_indicadores_diarios FOR SELECT TO authenticated USING (true);
CREATE POLICY "SCIRAS roles can insert indicadores" ON public.sciras_indicadores_diarios FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin', 'enfermagem', 'qualidade', 'nsp']::app_role[]));
CREATE POLICY "SCIRAS roles can update indicadores" ON public.sciras_indicadores_diarios FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin', 'enfermagem', 'qualidade', 'nsp']::app_role[]));

-- 3. Culturas Microbiológicas
CREATE TABLE public.sciras_culturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vigilancia_iras_id UUID REFERENCES public.sciras_vigilancia_iras(id) ON DELETE SET NULL,
  paciente_nome TEXT NOT NULL,
  numero_prontuario TEXT,
  setor TEXT NOT NULL,
  data_coleta DATE NOT NULL,
  tipo_material TEXT NOT NULL,
  microrganismo_isolado TEXT,
  perfil_sensibilidade JSONB DEFAULT '{}',
  multirresistente BOOLEAN DEFAULT false,
  mecanismo_resistencia TEXT,
  resultado TEXT DEFAULT 'pendente',
  observacoes TEXT,
  registrado_por UUID NOT NULL,
  registrado_por_nome TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_update_sciras_culturas BEFORE UPDATE ON public.sciras_culturas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.sciras_culturas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can view culturas" ON public.sciras_culturas FOR SELECT TO authenticated USING (true);
CREATE POLICY "SCIRAS roles can insert culturas" ON public.sciras_culturas FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin', 'enfermagem', 'qualidade', 'nsp']::app_role[]));
CREATE POLICY "SCIRAS roles can update culturas" ON public.sciras_culturas FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin', 'enfermagem', 'qualidade', 'nsp']::app_role[]));

-- 4. Controle de Antimicrobianos
CREATE TABLE public.sciras_antimicrobianos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_nome TEXT NOT NULL,
  numero_prontuario TEXT,
  setor TEXT NOT NULL,
  antimicrobiano TEXT NOT NULL,
  dose TEXT NOT NULL,
  via_administracao TEXT NOT NULL,
  data_inicio DATE NOT NULL,
  data_fim DATE,
  dias_uso INTEGER,
  indicacao TEXT,
  justificativa TEXT,
  cultura_id UUID REFERENCES public.sciras_culturas(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'em_uso',
  prescrito_por TEXT,
  registrado_por UUID NOT NULL,
  registrado_por_nome TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_update_sciras_antimicrobianos BEFORE UPDATE ON public.sciras_antimicrobianos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.sciras_antimicrobianos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can view antimicrobianos" ON public.sciras_antimicrobianos FOR SELECT TO authenticated USING (true);
CREATE POLICY "SCIRAS roles can insert antimicrobianos" ON public.sciras_antimicrobianos FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin', 'enfermagem', 'qualidade', 'nsp']::app_role[]));
CREATE POLICY "SCIRAS roles can update antimicrobianos" ON public.sciras_antimicrobianos FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin', 'enfermagem', 'qualidade', 'nsp']::app_role[]));

-- 5. Notificações Epidemiológicas
CREATE TABLE public.sciras_notificacoes_epidemiologicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_notificacao TEXT NOT NULL,
  tipo TEXT NOT NULL,
  doenca_agravo TEXT NOT NULL,
  data_notificacao DATE NOT NULL DEFAULT CURRENT_DATE,
  paciente_nome TEXT,
  numero_prontuario TEXT,
  setor TEXT NOT NULL,
  descricao TEXT NOT NULL,
  medidas_controle TEXT,
  notificado_anvisa BOOLEAN DEFAULT false,
  notificado_vigilancia_municipal BOOLEAN DEFAULT false,
  data_notificacao_externa DATE,
  status TEXT DEFAULT 'aberta',
  desfecho TEXT,
  notificador_id UUID NOT NULL,
  notificador_nome TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS sciras_notif_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_sciras_notif_number()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.numero_notificacao := 'EPI-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('sciras_notif_seq')::TEXT, 5, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_sciras_notif_number BEFORE INSERT ON public.sciras_notificacoes_epidemiologicas
FOR EACH ROW EXECUTE FUNCTION public.generate_sciras_notif_number();

CREATE TRIGGER trg_update_sciras_notificacoes BEFORE UPDATE ON public.sciras_notificacoes_epidemiologicas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.sciras_notificacoes_epidemiologicas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can view notificacoes epi" ON public.sciras_notificacoes_epidemiologicas FOR SELECT TO authenticated USING (true);
CREATE POLICY "SCIRAS roles can insert notificacoes epi" ON public.sciras_notificacoes_epidemiologicas FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin', 'enfermagem', 'qualidade', 'nsp', 'gestor']::app_role[]));
CREATE POLICY "SCIRAS roles can update notificacoes epi" ON public.sciras_notificacoes_epidemiologicas FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin', 'enfermagem', 'qualidade', 'nsp']::app_role[]));
CREATE POLICY "Admin can delete notificacoes epi" ON public.sciras_notificacoes_epidemiologicas FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));
