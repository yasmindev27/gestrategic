-- =============================================
-- MÓDULO DE ENFERMAGEM - ESCALAS E TROCAS DE PLANTÃO
-- =============================================

-- Tabela de escalas de plantão
CREATE TABLE public.enfermagem_escalas (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    profissional_id UUID NOT NULL,
    profissional_nome TEXT NOT NULL,
    setor TEXT NOT NULL,
    data_plantao DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fim TIME NOT NULL,
    tipo_plantao TEXT NOT NULL CHECK (tipo_plantao IN ('diurno', 'noturno', '12x36', 'extra', 'cobertura')),
    status TEXT NOT NULL DEFAULT 'confirmado' CHECK (status IN ('confirmado', 'disponivel_troca', 'em_negociacao', 'trocado', 'cancelado')),
    observacoes TEXT,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de ofertas de troca de plantão (estilo Pega Plantão)
CREATE TABLE public.enfermagem_trocas (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    escala_id UUID NOT NULL REFERENCES public.enfermagem_escalas(id) ON DELETE CASCADE,
    ofertante_id UUID NOT NULL,
    ofertante_nome TEXT NOT NULL,
    aceitante_id UUID,
    aceitante_nome TEXT,
    motivo_oferta TEXT,
    status TEXT NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta', 'aceita', 'pendente_aprovacao', 'aprovada', 'rejeitada', 'cancelada', 'expirada')),
    requer_aprovacao BOOLEAN NOT NULL DEFAULT true,
    aprovador_id UUID,
    aprovador_nome TEXT,
    data_aprovacao TIMESTAMP WITH TIME ZONE,
    justificativa_rejeicao TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de configurações do módulo de enfermagem
CREATE TABLE public.enfermagem_configuracoes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    chave TEXT NOT NULL UNIQUE,
    valor TEXT NOT NULL,
    descricao TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de histórico de trocas (auditoria)
CREATE TABLE public.enfermagem_trocas_historico (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    troca_id UUID NOT NULL REFERENCES public.enfermagem_trocas(id) ON DELETE CASCADE,
    acao TEXT NOT NULL,
    executado_por UUID NOT NULL,
    executado_por_nome TEXT NOT NULL,
    detalhes JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_enfermagem_escalas_profissional ON public.enfermagem_escalas(profissional_id);
CREATE INDEX idx_enfermagem_escalas_data ON public.enfermagem_escalas(data_plantao);
CREATE INDEX idx_enfermagem_escalas_setor ON public.enfermagem_escalas(setor);
CREATE INDEX idx_enfermagem_escalas_status ON public.enfermagem_escalas(status);
CREATE INDEX idx_enfermagem_trocas_escala ON public.enfermagem_trocas(escala_id);
CREATE INDEX idx_enfermagem_trocas_status ON public.enfermagem_trocas(status);
CREATE INDEX idx_enfermagem_trocas_ofertante ON public.enfermagem_trocas(ofertante_id);

-- Enable RLS
ALTER TABLE public.enfermagem_escalas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enfermagem_trocas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enfermagem_configuracoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enfermagem_trocas_historico ENABLE ROW LEVEL SECURITY;

-- Políticas para enfermagem_escalas
CREATE POLICY "Todos autenticados podem ver escalas"
ON public.enfermagem_escalas FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins e gestores podem criar escalas"
ON public.enfermagem_escalas FOR INSERT
TO authenticated
WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role) OR 
    public.has_role(auth.uid(), 'gestor'::app_role)
);

CREATE POLICY "Admins e gestores podem atualizar escalas"
ON public.enfermagem_escalas FOR UPDATE
TO authenticated
USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR 
    public.has_role(auth.uid(), 'gestor'::app_role) OR
    profissional_id = auth.uid()
);

CREATE POLICY "Admins podem deletar escalas"
ON public.enfermagem_escalas FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Políticas para enfermagem_trocas
CREATE POLICY "Todos autenticados podem ver trocas"
ON public.enfermagem_trocas FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Autenticados podem criar ofertas de troca"
ON public.enfermagem_trocas FOR INSERT
TO authenticated
WITH CHECK (ofertante_id = auth.uid());

CREATE POLICY "Participantes e gestores podem atualizar trocas"
ON public.enfermagem_trocas FOR UPDATE
TO authenticated
USING (
    ofertante_id = auth.uid() OR
    aceitante_id = auth.uid() OR
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'gestor'::app_role)
);

CREATE POLICY "Ofertantes e admins podem cancelar trocas"
ON public.enfermagem_trocas FOR DELETE
TO authenticated
USING (
    ofertante_id = auth.uid() OR
    public.has_role(auth.uid(), 'admin'::app_role)
);

-- Políticas para configurações
CREATE POLICY "Todos podem ver configurações"
ON public.enfermagem_configuracoes FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins podem gerenciar configurações"
ON public.enfermagem_configuracoes FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Políticas para histórico
CREATE POLICY "Todos podem ver histórico"
ON public.enfermagem_trocas_historico FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Sistema pode inserir histórico"
ON public.enfermagem_trocas_historico FOR INSERT
TO authenticated
WITH CHECK (true);

-- Triggers para updated_at
CREATE TRIGGER update_enfermagem_escalas_updated_at
BEFORE UPDATE ON public.enfermagem_escalas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_enfermagem_trocas_updated_at
BEFORE UPDATE ON public.enfermagem_trocas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_enfermagem_configuracoes_updated_at
BEFORE UPDATE ON public.enfermagem_configuracoes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir configuração padrão
INSERT INTO public.enfermagem_configuracoes (chave, valor, descricao) VALUES
    ('requer_aprovacao_troca', 'true', 'Define se trocas de plantão requerem aprovação do gestor'),
    ('carga_horaria_maxima_semanal', '44', 'Carga horária máxima semanal em horas'),
    ('antecedencia_minima_troca', '24', 'Antecedência mínima em horas para solicitar troca');

-- Enable realtime para notificações
ALTER PUBLICATION supabase_realtime ADD TABLE public.enfermagem_trocas;