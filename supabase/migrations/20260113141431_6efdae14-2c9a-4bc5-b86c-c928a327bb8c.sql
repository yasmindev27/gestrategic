-- ===================================
-- 1. TABELA DE CARGOS
-- ===================================
CREATE TABLE public.cargos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL UNIQUE,
    descricao TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.cargos ENABLE ROW LEVEL SECURITY;

-- Políticas para cargos
CREATE POLICY "Usuários autenticados visualizam cargos ativos"
ON public.cargos FOR SELECT
USING (ativo = true);

CREATE POLICY "Admin gerencia cargos"
ON public.cargos FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- ===================================
-- 2. TABELA DE SETORES
-- ===================================
CREATE TABLE public.setores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL UNIQUE,
    descricao TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.setores ENABLE ROW LEVEL SECURITY;

-- Políticas para setores
CREATE POLICY "Usuários autenticados visualizam setores ativos"
ON public.setores FOR SELECT
USING (ativo = true);

CREATE POLICY "Admin gerencia setores"
ON public.setores FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- ===================================
-- 3. VINCULAÇÃO GESTOR -> CARGOS
-- ===================================
CREATE TABLE public.gestor_cargos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gestor_user_id UUID NOT NULL,
    cargo_id UUID NOT NULL REFERENCES public.cargos(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID,
    UNIQUE(gestor_user_id, cargo_id)
);

ALTER TABLE public.gestor_cargos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin gerencia vinculação gestor-cargos"
ON public.gestor_cargos FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Gestores visualizam próprias vinculações"
ON public.gestor_cargos FOR SELECT
USING (gestor_user_id = auth.uid());

-- ===================================
-- 4. VINCULAÇÃO GESTOR -> SETORES
-- ===================================
CREATE TABLE public.gestor_setores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gestor_user_id UUID NOT NULL,
    setor_id UUID NOT NULL REFERENCES public.setores(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID,
    UNIQUE(gestor_user_id, setor_id)
);

ALTER TABLE public.gestor_setores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin gerencia vinculação gestor-setores"
ON public.gestor_setores FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Gestores visualizam próprias vinculações"
ON public.gestor_setores FOR SELECT
USING (gestor_user_id = auth.uid());

-- ===================================
-- 5. FUNÇÃO PARA VERIFICAR SE GESTOR GERENCIA USUÁRIO
-- ===================================
CREATE OR REPLACE FUNCTION public.gestor_gerencia_usuario(_gestor_id UUID, _usuario_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles p
        JOIN public.gestor_setores gs ON gs.gestor_user_id = _gestor_id
        JOIN public.setores s ON s.id = gs.setor_id AND s.nome = p.setor
        WHERE p.user_id = _usuario_id
    )
    OR EXISTS (
        SELECT 1
        FROM public.profiles p
        JOIN public.gestor_cargos gc ON gc.gestor_user_id = _gestor_id
        JOIN public.cargos c ON c.id = gc.cargo_id AND c.nome = p.cargo
        WHERE p.user_id = _usuario_id
    )
$$;

-- ===================================
-- 6. FUNÇÃO PARA LISTAR USUÁRIOS SOB GESTÃO
-- ===================================
CREATE OR REPLACE FUNCTION public.get_usuarios_sob_gestao(_gestor_id UUID)
RETURNS TABLE (
    user_id UUID,
    full_name TEXT,
    cargo TEXT,
    setor TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT DISTINCT p.user_id, p.full_name, p.cargo, p.setor
    FROM public.profiles p
    WHERE (
        EXISTS (
            SELECT 1
            FROM public.gestor_setores gs
            JOIN public.setores s ON s.id = gs.setor_id AND s.nome = p.setor
            WHERE gs.gestor_user_id = _gestor_id
        )
        OR EXISTS (
            SELECT 1
            FROM public.gestor_cargos gc
            JOIN public.cargos c ON c.id = gc.cargo_id AND c.nome = p.cargo
            WHERE gc.gestor_user_id = _gestor_id
        )
    )
    AND p.user_id != _gestor_id
$$;

-- ===================================
-- 7. TRIGGERS PARA UPDATED_AT
-- ===================================
CREATE TRIGGER update_cargos_updated_at
BEFORE UPDATE ON public.cargos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_setores_updated_at
BEFORE UPDATE ON public.setores
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ===================================
-- 8. ATUALIZAR POLÍTICA DE PROFILES PARA GESTORES
-- ===================================
DROP POLICY IF EXISTS "Gestor visualiza perfis do mesmo setor" ON public.profiles;

CREATE POLICY "Gestor visualiza perfis sob sua gestão"
ON public.profiles FOR SELECT
USING (
    has_role(auth.uid(), 'gestor'::app_role) 
    AND gestor_gerencia_usuario(auth.uid(), user_id)
);