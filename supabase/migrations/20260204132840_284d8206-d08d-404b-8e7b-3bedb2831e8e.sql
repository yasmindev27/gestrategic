-- ===================================================
-- 1. TABELA CENTRAL: profissionais_saude (Base do RH)
-- ===================================================
CREATE TABLE public.profissionais_saude (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Dados básicos
    nome TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('medico', 'enfermagem')),
    registro_profissional TEXT, -- CRM ou COREN
    especialidade TEXT,
    status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'ferias', 'afastado')),
    
    -- Vínculo opcional com usuário do sistema
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Contato
    telefone TEXT,
    email TEXT,
    
    -- Metadados
    observacoes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- Índices para busca
CREATE INDEX idx_profissionais_tipo ON public.profissionais_saude(tipo);
CREATE INDEX idx_profissionais_status ON public.profissionais_saude(status);
CREATE INDEX idx_profissionais_user_id ON public.profissionais_saude(user_id);

-- Trigger para updated_at
CREATE TRIGGER update_profissionais_saude_updated_at
    BEFORE UPDATE ON public.profissionais_saude
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.profissionais_saude ENABLE ROW LEVEL SECURITY;

-- Políticas: Admin, RH/DP e Gestores podem visualizar
CREATE POLICY "profissionais_saude_select_policy" 
ON public.profissionais_saude FOR SELECT 
TO authenticated
USING (
    has_any_role(auth.uid(), ARRAY['admin', 'rh_dp', 'gestor']::app_role[])
    OR user_id = auth.uid()
);

-- Políticas: Admin, RH/DP e Gestores podem inserir
CREATE POLICY "profissionais_saude_insert_policy" 
ON public.profissionais_saude FOR INSERT 
TO authenticated
WITH CHECK (
    has_any_role(auth.uid(), ARRAY['admin', 'rh_dp', 'gestor']::app_role[])
);

-- Políticas: Admin e RH/DP podem atualizar
CREATE POLICY "profissionais_saude_update_policy" 
ON public.profissionais_saude FOR UPDATE 
TO authenticated
USING (
    has_any_role(auth.uid(), ARRAY['admin', 'rh_dp']::app_role[])
);

-- Políticas: Apenas Admin pode deletar
CREATE POLICY "profissionais_saude_delete_policy" 
ON public.profissionais_saude FOR DELETE 
TO authenticated
USING (
    has_role(auth.uid(), 'admin')
);

-- ===================================================
-- 2. TABELA: escalas_medicos (Escalas Médicas)
-- ===================================================
CREATE TABLE public.escalas_medicos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profissional_id UUID NOT NULL REFERENCES public.profissionais_saude(id) ON DELETE CASCADE,
    
    -- Data e horário
    data_plantao DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fim TIME NOT NULL,
    
    -- Detalhes
    setor TEXT NOT NULL,
    tipo_plantao TEXT NOT NULL DEFAULT 'regular' CHECK (tipo_plantao IN ('regular', 'sobreaviso', 'extra', 'cobertura')),
    status TEXT NOT NULL DEFAULT 'confirmado' CHECK (status IN ('confirmado', 'pendente', 'cancelado')),
    
    -- Metadados
    observacoes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- Índices
CREATE INDEX idx_escalas_medicos_data ON public.escalas_medicos(data_plantao);
CREATE INDEX idx_escalas_medicos_profissional ON public.escalas_medicos(profissional_id);
CREATE INDEX idx_escalas_medicos_setor ON public.escalas_medicos(setor);

-- Trigger para updated_at
CREATE TRIGGER update_escalas_medicos_updated_at
    BEFORE UPDATE ON public.escalas_medicos
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.escalas_medicos ENABLE ROW LEVEL SECURITY;

-- Políticas: Todos autenticados podem visualizar
CREATE POLICY "escalas_medicos_select_policy" 
ON public.escalas_medicos FOR SELECT 
TO authenticated
USING (true);

-- Políticas: Admin, RH/DP e Gestores podem inserir
CREATE POLICY "escalas_medicos_insert_policy" 
ON public.escalas_medicos FOR INSERT 
TO authenticated
WITH CHECK (
    has_any_role(auth.uid(), ARRAY['admin', 'rh_dp', 'gestor']::app_role[])
);

-- Políticas: Admin, RH/DP e Gestores podem atualizar
CREATE POLICY "escalas_medicos_update_policy" 
ON public.escalas_medicos FOR UPDATE 
TO authenticated
USING (
    has_any_role(auth.uid(), ARRAY['admin', 'rh_dp', 'gestor']::app_role[])
);

-- Políticas: Admin e RH/DP podem deletar
CREATE POLICY "escalas_medicos_delete_policy" 
ON public.escalas_medicos FOR DELETE 
TO authenticated
USING (
    has_any_role(auth.uid(), ARRAY['admin', 'rh_dp']::app_role[])
);

-- ===================================================
-- 3. ATUALIZAR enfermagem_escalas para vincular profissionais
-- ===================================================
ALTER TABLE public.enfermagem_escalas 
ADD COLUMN IF NOT EXISTS profissional_saude_id UUID REFERENCES public.profissionais_saude(id) ON DELETE SET NULL;

-- Índice para a nova coluna
CREATE INDEX IF NOT EXISTS idx_enfermagem_escalas_profissional_saude 
ON public.enfermagem_escalas(profissional_saude_id);

-- ===================================================
-- 4. VIEW para escala do dia (médicos e enfermagem unificada)
-- ===================================================
CREATE OR REPLACE VIEW public.escala_dia_view AS
SELECT 
    em.id,
    'medico' as tipo_profissional,
    ps.nome,
    ps.registro_profissional,
    ps.especialidade,
    em.data_plantao,
    em.hora_inicio,
    em.hora_fim,
    em.setor,
    em.tipo_plantao,
    em.status,
    em.observacoes,
    -- Check se está de plantão agora
    CASE 
        WHEN em.data_plantao = CURRENT_DATE 
             AND CURRENT_TIME BETWEEN em.hora_inicio AND em.hora_fim 
        THEN true 
        ELSE false 
    END as de_plantao_agora
FROM public.escalas_medicos em
JOIN public.profissionais_saude ps ON ps.id = em.profissional_id
WHERE ps.status = 'ativo'

UNION ALL

SELECT 
    ee.id,
    'enfermagem' as tipo_profissional,
    COALESCE(ps.nome, ee.profissional_nome) as nome,
    ps.registro_profissional,
    ps.especialidade,
    ee.data_plantao,
    ee.hora_inicio::TIME,
    ee.hora_fim::TIME,
    ee.setor,
    ee.tipo_plantao,
    ee.status,
    ee.observacoes,
    CASE 
        WHEN ee.data_plantao = CURRENT_DATE 
             AND CURRENT_TIME BETWEEN ee.hora_inicio::TIME AND ee.hora_fim::TIME 
        THEN true 
        ELSE false 
    END as de_plantao_agora
FROM public.enfermagem_escalas ee
LEFT JOIN public.profissionais_saude ps ON ps.id = ee.profissional_saude_id
WHERE ee.status = 'confirmado';