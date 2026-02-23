
-- Rondas de Segurança Patrimonial
CREATE TABLE public.seg_patrimonial_rondas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setor TEXT NOT NULL,
    observacoes TEXT,
    infraestrutura_ok BOOLEAN DEFAULT true,
    detalhes_infraestrutura TEXT,
    usuario_id UUID NOT NULL,
    usuario_nome TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.seg_patrimonial_rondas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can read rondas" ON public.seg_patrimonial_rondas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert rondas" ON public.seg_patrimonial_rondas FOR INSERT TO authenticated WITH CHECK (auth.uid() = usuario_id);

-- Gestão de Conflitos
CREATE TABLE public.seg_patrimonial_conflitos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_envolvido TEXT NOT NULL,
    setor TEXT NOT NULL,
    grau_agressividade TEXT NOT NULL DEFAULT 'baixo',
    descricao TEXT NOT NULL,
    desfecho TEXT,
    status TEXT NOT NULL DEFAULT 'aberto',
    registrado_por UUID NOT NULL,
    registrado_por_nome TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.seg_patrimonial_conflitos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can read conflitos" ON public.seg_patrimonial_conflitos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert conflitos" ON public.seg_patrimonial_conflitos FOR INSERT TO authenticated WITH CHECK (auth.uid() = registrado_por);
CREATE POLICY "Admin/seguranca can update conflitos" ON public.seg_patrimonial_conflitos FOR UPDATE TO authenticated USING (
    public.has_any_role(auth.uid(), ARRAY['admin','seguranca']::app_role[])
);

-- Controle de Visitantes
CREATE TABLE public.seg_patrimonial_visitantes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_visitante TEXT NOT NULL,
    documento TEXT,
    paciente_nome TEXT NOT NULL,
    numero_prontuario TEXT,
    setor_leito TEXT NOT NULL,
    parentesco TEXT,
    hora_entrada TIMESTAMPTZ NOT NULL DEFAULT now(),
    hora_saida TIMESTAMPTZ,
    registrado_por UUID NOT NULL,
    registrado_por_nome TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.seg_patrimonial_visitantes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can read visitantes" ON public.seg_patrimonial_visitantes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert visitantes" ON public.seg_patrimonial_visitantes FOR INSERT TO authenticated WITH CHECK (auth.uid() = registrado_por);
CREATE POLICY "Admin/seguranca can update visitantes" ON public.seg_patrimonial_visitantes FOR UPDATE TO authenticated USING (
    public.has_any_role(auth.uid(), ARRAY['admin','seguranca']::app_role[])
);

-- Mapa de Danos ao Patrimônio
CREATE TABLE public.seg_patrimonial_danos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo_dano TEXT NOT NULL,
    local_dano TEXT NOT NULL,
    descricao TEXT NOT NULL,
    urgencia TEXT NOT NULL DEFAULT 'media',
    foto_url TEXT,
    status TEXT NOT NULL DEFAULT 'pendente',
    encaminhado_manutencao BOOLEAN DEFAULT false,
    registrado_por UUID NOT NULL,
    registrado_por_nome TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.seg_patrimonial_danos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can read danos" ON public.seg_patrimonial_danos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert danos" ON public.seg_patrimonial_danos FOR INSERT TO authenticated WITH CHECK (auth.uid() = registrado_por);
CREATE POLICY "Admin/seguranca can update danos" ON public.seg_patrimonial_danos FOR UPDATE TO authenticated USING (
    public.has_any_role(auth.uid(), ARRAY['admin','seguranca']::app_role[])
);

-- Passagem de Plantão
CREATE TABLE public.seg_patrimonial_passagem_plantao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    turno_saida TEXT NOT NULL,
    turno_entrada TEXT NOT NULL,
    relato TEXT NOT NULL,
    pontos_atencao TEXT,
    usuario_saida_id UUID NOT NULL,
    usuario_saida_nome TEXT NOT NULL,
    lido_por UUID,
    lido_por_nome TEXT,
    lido_em TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.seg_patrimonial_passagem_plantao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can read passagem" ON public.seg_patrimonial_passagem_plantao FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert passagem" ON public.seg_patrimonial_passagem_plantao FOR INSERT TO authenticated WITH CHECK (auth.uid() = usuario_saida_id);
CREATE POLICY "Admin/seguranca can update passagem" ON public.seg_patrimonial_passagem_plantao FOR UPDATE TO authenticated USING (
    public.has_any_role(auth.uid(), ARRAY['admin','seguranca']::app_role[])
);
