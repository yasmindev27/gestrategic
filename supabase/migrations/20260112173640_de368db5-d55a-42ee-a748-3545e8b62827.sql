
-- 1. Criar tabela de prontuários (registro mestre)
CREATE TABLE public.prontuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_prontuario TEXT NOT NULL UNIQUE,
    paciente_nome TEXT NOT NULL,
    paciente_cpf TEXT,
    data_atendimento TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'arquivado', 'faltante')),
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- 2. Criar tabela de saída de prontuários (fluxo entre setores)
CREATE TABLE public.saida_prontuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prontuario_id UUID REFERENCES public.prontuarios(id) ON DELETE CASCADE,
    numero_prontuario TEXT NOT NULL,
    
    -- Etapa Recepção
    registrado_recepcao_por UUID REFERENCES auth.users(id),
    registrado_recepcao_em TIMESTAMP WITH TIME ZONE,
    
    -- Etapa Classificação
    validado_classificacao_por UUID REFERENCES auth.users(id),
    validado_classificacao_em TIMESTAMP WITH TIME ZONE,
    existe_fisicamente BOOLEAN,
    observacao_classificacao TEXT,
    
    -- Etapa NIR
    conferido_nir_por UUID REFERENCES auth.users(id),
    conferido_nir_em TIMESTAMP WITH TIME ZONE,
    observacao_nir TEXT,
    
    -- Status geral
    status TEXT NOT NULL DEFAULT 'aguardando_classificacao' CHECK (status IN (
        'aguardando_classificacao', 
        'aguardando_nir', 
        'aguardando_faturamento',
        'em_avaliacao',
        'concluido',
        'pendente'
    )),
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Criar tabela de cadastros inconsistentes (Controle de Fichas)
CREATE TABLE public.cadastros_inconsistentes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prontuario_id UUID REFERENCES public.prontuarios(id) ON DELETE SET NULL,
    numero_prontuario TEXT,
    tipo_inconsistencia TEXT NOT NULL CHECK (tipo_inconsistencia IN (
        'dados_incompletos',
        'dados_divergentes', 
        'prontuario_nao_localizado',
        'documentacao_faltante',
        'outro'
    )),
    descricao TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'resolvido', 'em_analise')),
    registrado_por UUID REFERENCES auth.users(id) NOT NULL,
    resolvido_por UUID REFERENCES auth.users(id),
    resolvido_em TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Criar tabela de avaliações de prontuários (Faturamento)
CREATE TABLE public.avaliacoes_prontuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prontuario_id UUID REFERENCES public.prontuarios(id) ON DELETE CASCADE NOT NULL,
    saida_prontuario_id UUID REFERENCES public.saida_prontuarios(id) ON DELETE SET NULL,
    avaliador_id UUID REFERENCES auth.users(id) NOT NULL,
    status TEXT NOT NULL DEFAULT 'em_andamento' CHECK (status IN (
        'em_andamento',
        'concluido',
        'pendente_informacao',
        'glosa_identificada'
    )),
    observacoes TEXT,
    data_inicio TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    data_conclusao TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Criar tabela de logs de acesso (auditoria)
CREATE TABLE public.logs_acesso (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    acao TEXT NOT NULL,
    modulo TEXT NOT NULL,
    detalhes JSONB,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Habilitar RLS em todas as tabelas
ALTER TABLE public.prontuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saida_prontuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cadastros_inconsistentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avaliacoes_prontuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs_acesso ENABLE ROW LEVEL SECURITY;

-- 7. Função auxiliar para verificar múltiplos roles
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles app_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = ANY(_roles)
    )
$$;

-- 8. Políticas RLS para prontuarios
CREATE POLICY "Admins podem gerenciar todos prontuários"
ON public.prontuarios FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Usuários autenticados podem visualizar prontuários"
ON public.prontuarios FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Faturamento pode inserir prontuários"
ON public.prontuarios FOR INSERT
TO authenticated
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin', 'faturamento']::app_role[]));

-- 9. Políticas RLS para saida_prontuarios
CREATE POLICY "Admins gerenciam saída de prontuários"
ON public.saida_prontuarios FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Usuários autenticados visualizam saída"
ON public.saida_prontuarios FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Recepção pode registrar saída inicial"
ON public.saida_prontuarios FOR INSERT
TO authenticated
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin', 'recepcao']::app_role[]));

CREATE POLICY "Recepção, Classificação e NIR podem atualizar"
ON public.saida_prontuarios FOR UPDATE
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'recepcao', 'classificacao', 'nir', 'faturamento']::app_role[]));

-- 10. Políticas RLS para cadastros_inconsistentes
CREATE POLICY "Admins gerenciam cadastros inconsistentes"
ON public.cadastros_inconsistentes FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Usuários autenticados visualizam inconsistências"
ON public.cadastros_inconsistentes FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Recepção pode registrar inconsistências"
ON public.cadastros_inconsistentes FOR INSERT
TO authenticated
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin', 'recepcao']::app_role[]));

CREATE POLICY "Recepção pode atualizar próprias inconsistências"
ON public.cadastros_inconsistentes FOR UPDATE
TO authenticated
USING (
    public.has_role(auth.uid(), 'admin') OR 
    (public.has_role(auth.uid(), 'recepcao') AND registrado_por = auth.uid())
);

-- 11. Políticas RLS para avaliacoes_prontuarios
CREATE POLICY "Admins gerenciam avaliações"
ON public.avaliacoes_prontuarios FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Faturamento visualiza avaliações"
ON public.avaliacoes_prontuarios FOR SELECT
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'faturamento']::app_role[]));

CREATE POLICY "Faturamento pode criar avaliações"
ON public.avaliacoes_prontuarios FOR INSERT
TO authenticated
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin', 'faturamento']::app_role[]));

CREATE POLICY "Faturamento pode atualizar próprias avaliações"
ON public.avaliacoes_prontuarios FOR UPDATE
TO authenticated
USING (
    public.has_role(auth.uid(), 'admin') OR 
    (public.has_role(auth.uid(), 'faturamento') AND avaliador_id = auth.uid())
);

-- 12. Políticas RLS para logs_acesso
CREATE POLICY "Apenas admins visualizam logs"
ON public.logs_acesso FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Sistema pode inserir logs"
ON public.logs_acesso FOR INSERT
TO authenticated
WITH CHECK (true);

-- 13. Triggers para updated_at
CREATE TRIGGER update_prontuarios_updated_at
BEFORE UPDATE ON public.prontuarios
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_saida_prontuarios_updated_at
BEFORE UPDATE ON public.saida_prontuarios
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cadastros_inconsistentes_updated_at
BEFORE UPDATE ON public.cadastros_inconsistentes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_avaliacoes_prontuarios_updated_at
BEFORE UPDATE ON public.avaliacoes_prontuarios
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 14. Índices para performance
CREATE INDEX idx_prontuarios_numero ON public.prontuarios(numero_prontuario);
CREATE INDEX idx_prontuarios_status ON public.prontuarios(status);
CREATE INDEX idx_saida_prontuarios_status ON public.saida_prontuarios(status);
CREATE INDEX idx_saida_prontuarios_numero ON public.saida_prontuarios(numero_prontuario);
CREATE INDEX idx_cadastros_inconsistentes_status ON public.cadastros_inconsistentes(status);
CREATE INDEX idx_avaliacoes_prontuarios_status ON public.avaliacoes_prontuarios(status);
CREATE INDEX idx_logs_acesso_user ON public.logs_acesso(user_id);
CREATE INDEX idx_logs_acesso_modulo ON public.logs_acesso(modulo);
