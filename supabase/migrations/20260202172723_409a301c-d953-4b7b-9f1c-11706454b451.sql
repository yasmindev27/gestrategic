-- Create table for social assistance patients
CREATE TABLE public.assistencia_social_pacientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_completo TEXT NOT NULL,
    numero_prontuario TEXT,
    cpf TEXT,
    cns TEXT,
    data_nascimento DATE,
    telefone TEXT,
    endereco TEXT,
    setor_atendimento TEXT NOT NULL,
    observacoes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- Create table for social assistance attendances
CREATE TABLE public.assistencia_social_atendimentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id UUID REFERENCES public.assistencia_social_pacientes(id) ON DELETE CASCADE NOT NULL,
    tipo_atendimento TEXT NOT NULL,
    motivo TEXT NOT NULL,
    descricao TEXT NOT NULL,
    profissional_id UUID REFERENCES auth.users(id) NOT NULL,
    profissional_nome TEXT NOT NULL,
    data_atendimento TIMESTAMPTZ NOT NULL DEFAULT now(),
    status TEXT NOT NULL DEFAULT 'em_atendimento',
    observacoes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create table for referrals
CREATE TABLE public.assistencia_social_encaminhamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    atendimento_id UUID REFERENCES public.assistencia_social_atendimentos(id) ON DELETE CASCADE NOT NULL,
    tipo_encaminhamento TEXT NOT NULL,
    destino TEXT,
    motivo TEXT NOT NULL,
    observacoes TEXT,
    data_encaminhamento TIMESTAMPTZ NOT NULL DEFAULT now(),
    data_retorno TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pendente',
    registrado_por UUID REFERENCES auth.users(id) NOT NULL,
    registrado_por_nome TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create table for document attachments
CREATE TABLE public.assistencia_social_documentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    atendimento_id UUID REFERENCES public.assistencia_social_atendimentos(id) ON DELETE CASCADE NOT NULL,
    nome_arquivo TEXT NOT NULL,
    tipo_documento TEXT NOT NULL,
    arquivo_url TEXT NOT NULL,
    tamanho_bytes INTEGER,
    uploaded_by UUID REFERENCES auth.users(id) NOT NULL,
    uploaded_by_nome TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.assistencia_social_pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistencia_social_atendimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistencia_social_encaminhamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistencia_social_documentos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pacientes
CREATE POLICY "Admin and Social Assistance can view patients"
ON public.assistencia_social_pacientes FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'assistencia_social'::app_role));

CREATE POLICY "Admin and Social Assistance can insert patients"
ON public.assistencia_social_pacientes FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'assistencia_social'::app_role));

CREATE POLICY "Admin and Social Assistance can update patients"
ON public.assistencia_social_pacientes FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'assistencia_social'::app_role));

CREATE POLICY "Admin can delete patients"
ON public.assistencia_social_pacientes FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for atendimentos
CREATE POLICY "Admin and Social Assistance can view attendances"
ON public.assistencia_social_atendimentos FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'assistencia_social'::app_role));

CREATE POLICY "Admin and Social Assistance can insert attendances"
ON public.assistencia_social_atendimentos FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'assistencia_social'::app_role));

CREATE POLICY "Admin and Social Assistance can update attendances"
ON public.assistencia_social_atendimentos FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'assistencia_social'::app_role));

CREATE POLICY "Admin can delete attendances"
ON public.assistencia_social_atendimentos FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for encaminhamentos
CREATE POLICY "Admin and Social Assistance can view referrals"
ON public.assistencia_social_encaminhamentos FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'assistencia_social'::app_role));

CREATE POLICY "Admin and Social Assistance can insert referrals"
ON public.assistencia_social_encaminhamentos FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'assistencia_social'::app_role));

CREATE POLICY "Admin and Social Assistance can update referrals"
ON public.assistencia_social_encaminhamentos FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'assistencia_social'::app_role));

CREATE POLICY "Admin can delete referrals"
ON public.assistencia_social_encaminhamentos FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for documentos
CREATE POLICY "Admin and Social Assistance can view documents"
ON public.assistencia_social_documentos FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'assistencia_social'::app_role));

CREATE POLICY "Admin and Social Assistance can insert documents"
ON public.assistencia_social_documentos FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'assistencia_social'::app_role));

CREATE POLICY "Admin and Social Assistance can delete documents"
ON public.assistencia_social_documentos FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'assistencia_social'::app_role));

-- Create indexes for performance
CREATE INDEX idx_as_pacientes_nome ON public.assistencia_social_pacientes(nome_completo);
CREATE INDEX idx_as_pacientes_prontuario ON public.assistencia_social_pacientes(numero_prontuario);
CREATE INDEX idx_as_atendimentos_paciente ON public.assistencia_social_atendimentos(paciente_id);
CREATE INDEX idx_as_atendimentos_status ON public.assistencia_social_atendimentos(status);
CREATE INDEX idx_as_atendimentos_data ON public.assistencia_social_atendimentos(data_atendimento);
CREATE INDEX idx_as_encaminhamentos_atendimento ON public.assistencia_social_encaminhamentos(atendimento_id);
CREATE INDEX idx_as_documentos_atendimento ON public.assistencia_social_documentos(atendimento_id);

-- Create storage bucket for social assistance documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('assistencia-social-docs', 'assistencia-social-docs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Social Assistance can upload documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'assistencia-social-docs' AND
    (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'assistencia_social'::app_role))
);

CREATE POLICY "Social Assistance can view documents"
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'assistencia-social-docs' AND
    (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'assistencia_social'::app_role))
);

CREATE POLICY "Social Assistance can delete documents"
ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'assistencia-social-docs' AND
    (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'assistencia_social'::app_role))
);

-- Triggers for updated_at
CREATE TRIGGER update_as_pacientes_updated_at
    BEFORE UPDATE ON public.assistencia_social_pacientes
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_as_atendimentos_updated_at
    BEFORE UPDATE ON public.assistencia_social_atendimentos
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_as_encaminhamentos_updated_at
    BEFORE UPDATE ON public.assistencia_social_encaminhamentos
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();