
-- 1. Atualizar tabela de avaliações para incluir todos os campos do formulário
ALTER TABLE public.avaliacoes_prontuarios 
ADD COLUMN IF NOT EXISTS unidade_setor TEXT CHECK (unidade_setor IN ('emergencia', 'internacao', 'atendimento_medico_pa')),
ADD COLUMN IF NOT EXISTS identificacao_paciente TEXT CHECK (identificacao_paciente IN ('completa', 'incompleta')),
ADD COLUMN IF NOT EXISTS identificacao_paciente_obs TEXT,
ADD COLUMN IF NOT EXISTS acolhimento_triagem TEXT CHECK (acolhimento_triagem IN ('conforme', 'nao_conforme')),
ADD COLUMN IF NOT EXISTS acolhimento_triagem_obs TEXT,
ADD COLUMN IF NOT EXISTS atendimento_medico TEXT CHECK (atendimento_medico IN ('conforme', 'nao_conforme')),
ADD COLUMN IF NOT EXISTS atendimento_medico_obs TEXT,
ADD COLUMN IF NOT EXISTS documentacao_medica_cfm TEXT CHECK (documentacao_medica_cfm IN ('conforme', 'nao_conforme')),
ADD COLUMN IF NOT EXISTS documentacao_medica_cfm_obs TEXT,
ADD COLUMN IF NOT EXISTS enfermagem_medicacao TEXT CHECK (enfermagem_medicacao IN ('conforme', 'nao_conforme')),
ADD COLUMN IF NOT EXISTS enfermagem_medicacao_obs TEXT,
ADD COLUMN IF NOT EXISTS paciente_internado TEXT CHECK (paciente_internado IN ('nao_se_aplica', 'conforme', 'nao_conforme')),
ADD COLUMN IF NOT EXISTS paciente_internado_obs TEXT,
ADD COLUMN IF NOT EXISTS resultado_final TEXT CHECK (resultado_final IN ('completo', 'com_pendencias', 'incompleto')),
ADD COLUMN IF NOT EXISTS comentarios_finais TEXT,
ADD COLUMN IF NOT EXISTS paciente_nome TEXT,
ADD COLUMN IF NOT EXISTS numero_prontuario TEXT,
ADD COLUMN IF NOT EXISTS is_finalizada BOOLEAN NOT NULL DEFAULT false;

-- 2. Remover políticas antigas que permitiam outros perfis verem avaliações
DROP POLICY IF EXISTS "Faturamento visualiza avaliações" ON public.avaliacoes_prontuarios;

-- 3. Criar política mais restritiva - apenas Faturamento e Admin veem conteúdo
CREATE POLICY "Faturamento e Admin visualizam avaliações completas"
ON public.avaliacoes_prontuarios FOR SELECT
TO authenticated
USING (
    public.has_any_role(auth.uid(), ARRAY['admin', 'faturamento']::app_role[])
);

-- 4. Criar view pública para outros perfis verem apenas status (sem conteúdo da avaliação)
CREATE OR REPLACE VIEW public.prontuarios_status AS
SELECT 
    p.id,
    p.numero_prontuario,
    p.paciente_nome,
    p.status as prontuario_status,
    sp.status as fluxo_status,
    CASE 
        WHEN ap.id IS NOT NULL AND ap.is_finalizada = true THEN 'avaliado'
        WHEN ap.id IS NOT NULL THEN 'em_avaliacao'
        ELSE 'pendente'
    END as avaliacao_status,
    sp.registrado_recepcao_em,
    sp.validado_classificacao_em,
    sp.conferido_nir_em
FROM public.prontuarios p
LEFT JOIN public.saida_prontuarios sp ON sp.prontuario_id = p.id
LEFT JOIN public.avaliacoes_prontuarios ap ON ap.prontuario_id = p.id;

-- 5. Criar tabela de histórico para auditoria das avaliações
CREATE TABLE IF NOT EXISTS public.avaliacoes_historico (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    avaliacao_id UUID REFERENCES public.avaliacoes_prontuarios(id) ON DELETE SET NULL,
    prontuario_id UUID NOT NULL,
    acao TEXT NOT NULL,
    dados_anteriores JSONB,
    dados_novos JSONB,
    executado_por UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Habilitar RLS no histórico
ALTER TABLE public.avaliacoes_historico ENABLE ROW LEVEL SECURITY;

-- 7. Apenas Admin pode ver histórico de avaliações
CREATE POLICY "Apenas admin visualiza histórico"
ON public.avaliacoes_historico FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Sistema pode inserir histórico"
ON public.avaliacoes_historico FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = executado_por);

-- 8. Índices para performance
CREATE INDEX IF NOT EXISTS idx_avaliacoes_finalizada ON public.avaliacoes_prontuarios(is_finalizada);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_resultado ON public.avaliacoes_prontuarios(resultado_final);
CREATE INDEX IF NOT EXISTS idx_historico_avaliacao ON public.avaliacoes_historico(avaliacao_id);
