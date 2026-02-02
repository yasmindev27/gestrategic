-- Create table for patient safety incidents
CREATE TABLE public.incidentes_nsp (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_notificacao TEXT NOT NULL,
    tipo_incidente TEXT NOT NULL, -- evento_adverso, quase_erro, incidente_sem_dano
    data_ocorrencia TIMESTAMPTZ NOT NULL,
    local_ocorrencia TEXT NOT NULL,
    setor TEXT NOT NULL,
    descricao TEXT NOT NULL,
    classificacao_risco TEXT NOT NULL, -- leve, moderado, grave, catastrofico
    status TEXT NOT NULL DEFAULT 'notificado', -- notificado, em_analise, encerrado
    notificador_id UUID REFERENCES auth.users(id),
    notificador_nome TEXT,
    notificacao_anonima BOOLEAN DEFAULT false,
    paciente_envolvido BOOLEAN DEFAULT false,
    paciente_nome TEXT,
    paciente_prontuario TEXT,
    observacoes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create table for incident analysis
CREATE TABLE public.analises_incidentes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incidente_id UUID REFERENCES public.incidentes_nsp(id) ON DELETE CASCADE NOT NULL,
    tipo_analise TEXT NOT NULL, -- causa_raiz, espinha_peixe, 5_porques, outro
    descricao_analise TEXT NOT NULL,
    causas_identificadas TEXT,
    fatores_contribuintes TEXT,
    analisado_por UUID REFERENCES auth.users(id) NOT NULL,
    analisado_por_nome TEXT NOT NULL,
    data_analise TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create table for corrective/preventive actions
CREATE TABLE public.acoes_incidentes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incidente_id UUID REFERENCES public.incidentes_nsp(id) ON DELETE CASCADE NOT NULL,
    analise_id UUID REFERENCES public.analises_incidentes(id) ON DELETE SET NULL,
    tipo_acao TEXT NOT NULL, -- corretiva, preventiva
    descricao TEXT NOT NULL,
    responsavel_id UUID REFERENCES auth.users(id),
    responsavel_nome TEXT NOT NULL,
    prazo DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendente', -- pendente, em_andamento, concluida, cancelada
    data_conclusao DATE,
    observacoes TEXT,
    registrado_por UUID REFERENCES auth.users(id) NOT NULL,
    registrado_por_nome TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create table for audits
CREATE TABLE public.auditorias_qualidade (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo_auditoria TEXT NOT NULL, -- interna, externa
    titulo TEXT NOT NULL,
    data_auditoria DATE NOT NULL,
    auditor TEXT NOT NULL,
    setor_auditado TEXT NOT NULL,
    escopo TEXT,
    status TEXT NOT NULL DEFAULT 'programada', -- programada, em_andamento, concluida
    resultado TEXT, -- conforme, nao_conforme, parcialmente_conforme
    observacoes TEXT,
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    created_by_nome TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create table for audit findings
CREATE TABLE public.achados_auditoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auditoria_id UUID REFERENCES public.auditorias_qualidade(id) ON DELETE CASCADE NOT NULL,
    tipo_achado TEXT NOT NULL, -- conformidade, nao_conformidade, oportunidade_melhoria, observacao
    descricao TEXT NOT NULL,
    evidencia TEXT,
    requisito_referencia TEXT,
    gravidade TEXT, -- menor, maior, critica
    status TEXT NOT NULL DEFAULT 'aberto', -- aberto, em_tratamento, encerrado
    registrado_por UUID REFERENCES auth.users(id) NOT NULL,
    registrado_por_nome TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create table for action plans linked to audit findings
CREATE TABLE public.planos_acao_auditoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    achado_id UUID REFERENCES public.achados_auditoria(id) ON DELETE CASCADE NOT NULL,
    descricao TEXT NOT NULL,
    responsavel_nome TEXT NOT NULL,
    prazo DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendente', -- pendente, em_andamento, concluida, cancelada
    data_conclusao DATE,
    eficacia_verificada BOOLEAN DEFAULT false,
    observacoes TEXT,
    registrado_por UUID REFERENCES auth.users(id) NOT NULL,
    registrado_por_nome TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.incidentes_nsp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analises_incidentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acoes_incidentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditorias_qualidade ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achados_auditoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planos_acao_auditoria ENABLE ROW LEVEL SECURITY;

-- RLS Policies for incidentes_nsp
CREATE POLICY "Quality roles can view incidents"
ON public.incidentes_nsp FOR SELECT TO authenticated
USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'qualidade'::app_role) OR
    public.has_role(auth.uid(), 'nsp'::app_role) OR
    public.has_role(auth.uid(), 'gestor'::app_role)
);

CREATE POLICY "Authenticated users can create incidents"
ON public.incidentes_nsp FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Quality roles can update incidents"
ON public.incidentes_nsp FOR UPDATE TO authenticated
USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'qualidade'::app_role) OR
    public.has_role(auth.uid(), 'nsp'::app_role)
);

CREATE POLICY "Admin can delete incidents"
ON public.incidentes_nsp FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for analises_incidentes
CREATE POLICY "Quality roles can view analyses"
ON public.analises_incidentes FOR SELECT TO authenticated
USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'qualidade'::app_role) OR
    public.has_role(auth.uid(), 'nsp'::app_role) OR
    public.has_role(auth.uid(), 'gestor'::app_role)
);

CREATE POLICY "Quality roles can manage analyses"
ON public.analises_incidentes FOR ALL TO authenticated
USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'qualidade'::app_role) OR
    public.has_role(auth.uid(), 'nsp'::app_role)
);

-- RLS Policies for acoes_incidentes
CREATE POLICY "Quality roles can view actions"
ON public.acoes_incidentes FOR SELECT TO authenticated
USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'qualidade'::app_role) OR
    public.has_role(auth.uid(), 'nsp'::app_role) OR
    public.has_role(auth.uid(), 'gestor'::app_role)
);

CREATE POLICY "Quality roles can manage actions"
ON public.acoes_incidentes FOR ALL TO authenticated
USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'qualidade'::app_role) OR
    public.has_role(auth.uid(), 'nsp'::app_role)
);

-- RLS Policies for auditorias_qualidade
CREATE POLICY "Quality roles can view audits"
ON public.auditorias_qualidade FOR SELECT TO authenticated
USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'qualidade'::app_role) OR
    public.has_role(auth.uid(), 'nsp'::app_role) OR
    public.has_role(auth.uid(), 'gestor'::app_role)
);

CREATE POLICY "Quality roles can manage audits"
ON public.auditorias_qualidade FOR ALL TO authenticated
USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'qualidade'::app_role)
);

-- RLS Policies for achados_auditoria
CREATE POLICY "Quality roles can view findings"
ON public.achados_auditoria FOR SELECT TO authenticated
USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'qualidade'::app_role) OR
    public.has_role(auth.uid(), 'nsp'::app_role) OR
    public.has_role(auth.uid(), 'gestor'::app_role)
);

CREATE POLICY "Quality roles can manage findings"
ON public.achados_auditoria FOR ALL TO authenticated
USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'qualidade'::app_role)
);

-- RLS Policies for planos_acao_auditoria
CREATE POLICY "Quality roles can view action plans"
ON public.planos_acao_auditoria FOR SELECT TO authenticated
USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'qualidade'::app_role) OR
    public.has_role(auth.uid(), 'nsp'::app_role) OR
    public.has_role(auth.uid(), 'gestor'::app_role)
);

CREATE POLICY "Quality roles can manage action plans"
ON public.planos_acao_auditoria FOR ALL TO authenticated
USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'qualidade'::app_role)
);

-- Create indexes for performance
CREATE INDEX idx_incidentes_status ON public.incidentes_nsp(status);
CREATE INDEX idx_incidentes_tipo ON public.incidentes_nsp(tipo_incidente);
CREATE INDEX idx_incidentes_setor ON public.incidentes_nsp(setor);
CREATE INDEX idx_incidentes_data ON public.incidentes_nsp(data_ocorrencia);
CREATE INDEX idx_analises_incidente ON public.analises_incidentes(incidente_id);
CREATE INDEX idx_acoes_incidente ON public.acoes_incidentes(incidente_id);
CREATE INDEX idx_acoes_status ON public.acoes_incidentes(status);
CREATE INDEX idx_auditorias_status ON public.auditorias_qualidade(status);
CREATE INDEX idx_auditorias_tipo ON public.auditorias_qualidade(tipo_auditoria);
CREATE INDEX idx_achados_auditoria ON public.achados_auditoria(auditoria_id);
CREATE INDEX idx_planos_achado ON public.planos_acao_auditoria(achado_id);

-- Triggers for updated_at
CREATE TRIGGER update_incidentes_nsp_updated_at
    BEFORE UPDATE ON public.incidentes_nsp
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_analises_incidentes_updated_at
    BEFORE UPDATE ON public.analises_incidentes
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_acoes_incidentes_updated_at
    BEFORE UPDATE ON public.acoes_incidentes
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_auditorias_qualidade_updated_at
    BEFORE UPDATE ON public.auditorias_qualidade
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_achados_auditoria_updated_at
    BEFORE UPDATE ON public.achados_auditoria
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_planos_acao_auditoria_updated_at
    BEFORE UPDATE ON public.planos_acao_auditoria
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create sequence for incident number
CREATE SEQUENCE IF NOT EXISTS incidente_nsp_seq START 1;

-- Function to generate incident number
CREATE OR REPLACE FUNCTION public.generate_incidente_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.numero_notificacao := 'NSP-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('incidente_nsp_seq')::TEXT, 5, '0');
    RETURN NEW;
END;
$$;

CREATE TRIGGER set_incidente_number
    BEFORE INSERT ON public.incidentes_nsp
    FOR EACH ROW
    EXECUTE FUNCTION public.generate_incidente_number();