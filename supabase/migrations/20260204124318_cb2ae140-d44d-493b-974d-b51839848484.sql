-- =====================================================
-- SISTEMA DE PERMISSÕES GRANULAR
-- =====================================================

-- 1. Tabela de Perfis (customizáveis)
CREATE TABLE public.perfis_sistema (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL UNIQUE,
    descricao TEXT,
    cor TEXT DEFAULT '#6b7280',
    icone TEXT DEFAULT 'Shield',
    is_sistema BOOLEAN DEFAULT false, -- Perfis do sistema não podem ser excluídos
    is_master BOOLEAN DEFAULT false, -- Master não pode ser bloqueado
    ordem INTEGER DEFAULT 0,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- 2. Tabela de Módulos do Sistema
CREATE TABLE public.modulos_sistema (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo TEXT NOT NULL UNIQUE, -- ex: 'enfermagem', 'nir', 'faturamento'
    nome TEXT NOT NULL,
    descricao TEXT,
    icone TEXT,
    categoria TEXT, -- 'assistencial', 'administrativo', 'suporte', 'utilidades'
    ordem INTEGER DEFAULT 0,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabela de Ferramentas/Ações por Módulo
CREATE TABLE public.ferramentas_modulo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    modulo_id UUID REFERENCES public.modulos_sistema(id) ON DELETE CASCADE,
    codigo TEXT NOT NULL, -- ex: 'criar', 'editar', 'excluir', 'aprovar'
    nome TEXT NOT NULL,
    descricao TEXT,
    ordem INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(modulo_id, codigo)
);

-- 4. Tabela de Permissões por Perfil
CREATE TABLE public.permissoes_perfil (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    perfil_id UUID REFERENCES public.perfis_sistema(id) ON DELETE CASCADE,
    modulo_id UUID REFERENCES public.modulos_sistema(id) ON DELETE CASCADE,
    pode_visualizar BOOLEAN DEFAULT false,
    pode_acessar BOOLEAN DEFAULT false,
    comportamento_sem_acesso TEXT DEFAULT 'ocultar', -- 'ocultar' ou 'desabilitar'
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(perfil_id, modulo_id)
);

-- 5. Tabela de Permissões de Ferramentas
CREATE TABLE public.permissoes_ferramenta (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    perfil_id UUID REFERENCES public.perfis_sistema(id) ON DELETE CASCADE,
    ferramenta_id UUID REFERENCES public.ferramentas_modulo(id) ON DELETE CASCADE,
    permitido BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(perfil_id, ferramenta_id)
);

-- 6. Vincular usuários aos novos perfis
CREATE TABLE public.usuario_perfil (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    perfil_id UUID REFERENCES public.perfis_sistema(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(user_id, perfil_id)
);

-- 7. Log de alterações de permissões
CREATE TABLE public.logs_permissoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    acao TEXT NOT NULL, -- 'criar_perfil', 'alterar_permissao', 'vincular_usuario', etc.
    entidade_tipo TEXT, -- 'perfil', 'modulo', 'ferramenta', 'usuario_perfil'
    entidade_id UUID,
    dados_anteriores JSONB,
    dados_novos JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- HABILITAR RLS
-- =====================================================

ALTER TABLE public.perfis_sistema ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modulos_sistema ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ferramentas_modulo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissoes_perfil ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissoes_ferramenta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuario_perfil ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs_permissoes ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS RLS
-- =====================================================

-- Perfis: todos podem ler, apenas admin pode modificar
CREATE POLICY "perfis_select" ON public.perfis_sistema FOR SELECT TO authenticated USING (true);
CREATE POLICY "perfis_all_admin" ON public.perfis_sistema FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Módulos: todos podem ler
CREATE POLICY "modulos_select" ON public.modulos_sistema FOR SELECT TO authenticated USING (true);
CREATE POLICY "modulos_all_admin" ON public.modulos_sistema FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Ferramentas: todos podem ler
CREATE POLICY "ferramentas_select" ON public.ferramentas_modulo FOR SELECT TO authenticated USING (true);
CREATE POLICY "ferramentas_all_admin" ON public.ferramentas_modulo FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Permissões perfil: todos podem ler, admin modifica
CREATE POLICY "perm_perfil_select" ON public.permissoes_perfil FOR SELECT TO authenticated USING (true);
CREATE POLICY "perm_perfil_all_admin" ON public.permissoes_perfil FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Permissões ferramenta: todos podem ler, admin modifica
CREATE POLICY "perm_ferramenta_select" ON public.permissoes_ferramenta FOR SELECT TO authenticated USING (true);
CREATE POLICY "perm_ferramenta_all_admin" ON public.permissoes_ferramenta FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Usuario perfil: todos podem ler, admin modifica
CREATE POLICY "usuario_perfil_select" ON public.usuario_perfil FOR SELECT TO authenticated USING (true);
CREATE POLICY "usuario_perfil_all_admin" ON public.usuario_perfil FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Logs: apenas admin pode ver
CREATE POLICY "logs_perm_admin" ON public.logs_permissoes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- INSERIR PERFIS PADRÃO (migração dos roles existentes)
-- =====================================================

INSERT INTO public.perfis_sistema (nome, descricao, cor, icone, is_sistema, is_master, ordem) VALUES
    ('Administrador', 'Acesso total ao sistema', '#dc2626', 'Shield', true, true, 1),
    ('Gestor', 'Gerencia equipe e atribui tarefas', '#2563eb', 'Users', true, false, 2),
    ('NIR', 'Núcleo Interno de Regulação', '#059669', 'Ambulance', true, false, 3),
    ('Faturamento', 'Gestão de prontuários e faturamento', '#7c3aed', 'Receipt', true, false, 4),
    ('Recepção', 'Atendimento e controle de fichas', '#0891b2', 'ClipboardX', true, false, 5),
    ('Classificação', 'Classificação de risco', '#ca8a04', 'Activity', true, false, 6),
    ('TI', 'Suporte técnico de TI', '#4f46e5', 'Monitor', true, false, 7),
    ('Manutenção', 'Manutenção predial', '#ea580c', 'Wrench', true, false, 8),
    ('Engenharia Clínica', 'Manutenção de equipamentos médicos', '#be185d', 'Stethoscope', true, false, 9),
    ('Laboratório', 'Gestão de laboratório', '#0d9488', 'FlaskConical', true, false, 10),
    ('RH/DP', 'Recursos Humanos e Departamento Pessoal', '#7c3aed', 'UserCog', true, false, 11),
    ('Funcionário', 'Acesso básico ao sistema', '#6b7280', 'User', true, false, 99);

-- =====================================================
-- INSERIR MÓDULOS DO SISTEMA
-- =====================================================

INSERT INTO public.modulos_sistema (codigo, nome, descricao, icone, categoria, ordem) VALUES
    ('dashboard', 'Dashboard', 'Painel principal com indicadores', 'LayoutDashboard', 'utilidades', 1),
    ('nir', 'NIR', 'Núcleo Interno de Regulação', 'Ambulance', 'assistencial', 2),
    ('mapa-leitos', 'Mapa de Leitos', 'Visualização de ocupação de leitos', 'Ambulance', 'assistencial', 3),
    ('enfermagem', 'Enfermagem', 'Escalas e gestão de enfermagem', 'Syringe', 'assistencial', 4),
    ('laboratorio', 'Laboratório', 'Escalas e gestão de laboratório', 'FlaskConical', 'assistencial', 5),
    ('assistencia-social', 'Assistência Social', 'Atendimentos e encaminhamentos', 'Heart', 'assistencial', 6),
    ('qualidade', 'Qualidade/NSP', 'Núcleo de Segurança do Paciente', 'AlertTriangle', 'assistencial', 7),
    ('faturamento', 'Faturamento', 'Gestão de prontuários', 'Receipt', 'administrativo', 8),
    ('rhdp', 'RH/DP', 'Recursos Humanos', 'UserCog', 'administrativo', 9),
    ('controle-fichas', 'Controle de Fichas', 'Gestão de fichas de atendimento', 'ClipboardX', 'administrativo', 10),
    ('rouparia', 'Rouparia', 'Controle de enxoval', 'Shirt', 'administrativo', 11),
    ('seguranca-trabalho', 'Seg. Trabalho', 'Segurança do trabalho', 'HardHat', 'administrativo', 12),
    ('tecnico-ti', 'TI', 'Suporte de TI', 'Monitor', 'suporte', 13),
    ('tecnico-manutencao', 'Manutenção', 'Manutenção predial', 'Wrench', 'suporte', 14),
    ('tecnico-engenharia', 'Eng. Clínica', 'Engenharia clínica', 'Stethoscope', 'suporte', 15),
    ('agenda', 'Agenda', 'Agenda pessoal e tarefas', 'Calendar', 'utilidades', 16),
    ('equipe', 'Equipe', 'Visualização da equipe', 'Users', 'utilidades', 17),
    ('chat', 'Chat', 'Chat corporativo', 'MessageSquare', 'utilidades', 18),
    ('restaurante', 'Restaurante', 'Controle de refeições', 'UtensilsCrossed', 'utilidades', 19),
    ('abrir-chamado', 'Abrir Chamado', 'Abertura de chamados', 'Ticket', 'utilidades', 20),
    ('logs', 'Logs', 'Logs de auditoria', 'ScrollText', 'administrativo', 21),
    ('admin', 'Administração', 'Configurações do sistema', 'Shield', 'administrativo', 22),
    ('recepcao', 'Recepção', 'Módulo da recepção', 'ClipboardX', 'administrativo', 23);

-- =====================================================
-- INSERIR FERRAMENTAS PADRÃO PARA CADA MÓDULO
-- =====================================================

-- Ferramentas genéricas para todos os módulos
INSERT INTO public.ferramentas_modulo (modulo_id, codigo, nome, descricao, ordem)
SELECT 
    m.id,
    f.codigo,
    f.nome,
    f.descricao,
    f.ordem
FROM public.modulos_sistema m
CROSS JOIN (
    VALUES 
        ('visualizar', 'Visualizar', 'Visualizar dados do módulo', 1),
        ('criar', 'Criar', 'Criar novos registros', 2),
        ('editar', 'Editar', 'Editar registros existentes', 3),
        ('excluir', 'Excluir', 'Excluir registros', 4),
        ('exportar', 'Exportar', 'Exportar dados para relatórios', 5)
) AS f(codigo, nome, descricao, ordem);

-- Ferramentas específicas do módulo Enfermagem
INSERT INTO public.ferramentas_modulo (modulo_id, codigo, nome, descricao, ordem)
SELECT id, 'aprovar_troca', 'Aprovar Trocas', 'Aprovar trocas de plantão', 6
FROM public.modulos_sistema WHERE codigo = 'enfermagem';

INSERT INTO public.ferramentas_modulo (modulo_id, codigo, nome, descricao, ordem)
SELECT id, 'oferecer_plantao', 'Oferecer Plantão', 'Oferecer plantão para troca', 7
FROM public.modulos_sistema WHERE codigo = 'enfermagem';

INSERT INTO public.ferramentas_modulo (modulo_id, codigo, nome, descricao, ordem)
SELECT id, 'aceitar_plantao', 'Aceitar Plantão', 'Aceitar plantão oferecido', 8
FROM public.modulos_sistema WHERE codigo = 'enfermagem';

INSERT INTO public.ferramentas_modulo (modulo_id, codigo, nome, descricao, ordem)
SELECT id, 'importar_escala', 'Importar Escala', 'Importar escala via Excel/CSV', 9
FROM public.modulos_sistema WHERE codigo = 'enfermagem';

-- Ferramentas específicas do Admin
INSERT INTO public.ferramentas_modulo (modulo_id, codigo, nome, descricao, ordem)
SELECT id, 'gerenciar_usuarios', 'Gerenciar Usuários', 'Criar e gerenciar usuários', 6
FROM public.modulos_sistema WHERE codigo = 'admin';

INSERT INTO public.ferramentas_modulo (modulo_id, codigo, nome, descricao, ordem)
SELECT id, 'gerenciar_permissoes', 'Gerenciar Permissões', 'Configurar permissões de perfis', 7
FROM public.modulos_sistema WHERE codigo = 'admin';

-- =====================================================
-- FUNÇÃO PARA VERIFICAR PERMISSÃO DE MÓDULO
-- =====================================================

CREATE OR REPLACE FUNCTION public.usuario_pode_acessar_modulo(_user_id UUID, _modulo_codigo TEXT)
RETURNS JSONB
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        (
            SELECT jsonb_build_object(
                'pode_visualizar', pp.pode_visualizar,
                'pode_acessar', pp.pode_acessar,
                'comportamento', pp.comportamento_sem_acesso
            )
            FROM public.usuario_perfil up
            JOIN public.permissoes_perfil pp ON pp.perfil_id = up.perfil_id
            JOIN public.modulos_sistema m ON m.id = pp.modulo_id
            WHERE up.user_id = _user_id
            AND m.codigo = _modulo_codigo
            AND pp.pode_acessar = true
            LIMIT 1
        ),
        jsonb_build_object(
            'pode_visualizar', false,
            'pode_acessar', false,
            'comportamento', 'ocultar'
        )
    )
$$;

-- =====================================================
-- FUNÇÃO PARA VERIFICAR PERMISSÃO DE FERRAMENTA
-- =====================================================

CREATE OR REPLACE FUNCTION public.usuario_pode_usar_ferramenta(_user_id UUID, _modulo_codigo TEXT, _ferramenta_codigo TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.usuario_perfil up
        JOIN public.permissoes_ferramenta pf ON pf.perfil_id = up.perfil_id
        JOIN public.ferramentas_modulo fm ON fm.id = pf.ferramenta_id
        JOIN public.modulos_sistema m ON m.id = fm.modulo_id
        WHERE up.user_id = _user_id
        AND m.codigo = _modulo_codigo
        AND fm.codigo = _ferramenta_codigo
        AND pf.permitido = true
    )
$$;

-- =====================================================
-- FUNÇÃO PARA OBTER TODAS AS PERMISSÕES DO USUÁRIO
-- =====================================================

CREATE OR REPLACE FUNCTION public.obter_permissoes_usuario(_user_id UUID)
RETURNS JSONB
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT jsonb_build_object(
        'perfis', (
            SELECT jsonb_agg(jsonb_build_object(
                'id', p.id,
                'nome', p.nome,
                'is_master', p.is_master
            ))
            FROM public.usuario_perfil up
            JOIN public.perfis_sistema p ON p.id = up.perfil_id
            WHERE up.user_id = _user_id
        ),
        'modulos', (
            SELECT jsonb_object_agg(
                m.codigo,
                jsonb_build_object(
                    'pode_visualizar', COALESCE(pp.pode_visualizar, false),
                    'pode_acessar', COALESCE(pp.pode_acessar, false),
                    'comportamento', COALESCE(pp.comportamento_sem_acesso, 'ocultar')
                )
            )
            FROM public.modulos_sistema m
            LEFT JOIN public.permissoes_perfil pp ON pp.modulo_id = m.id
            AND pp.perfil_id IN (SELECT perfil_id FROM public.usuario_perfil WHERE user_id = _user_id)
        ),
        'ferramentas', (
            SELECT jsonb_object_agg(
                m.codigo || '.' || fm.codigo,
                COALESCE(pf.permitido, false)
            )
            FROM public.ferramentas_modulo fm
            JOIN public.modulos_sistema m ON m.id = fm.modulo_id
            LEFT JOIN public.permissoes_ferramenta pf ON pf.ferramenta_id = fm.id
            AND pf.perfil_id IN (SELECT perfil_id FROM public.usuario_perfil WHERE user_id = _user_id)
        )
    )
$$;

-- =====================================================
-- TRIGGER PARA UPDATED_AT
-- =====================================================

CREATE TRIGGER update_perfis_sistema_updated_at
BEFORE UPDATE ON public.perfis_sistema
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_permissoes_perfil_updated_at
BEFORE UPDATE ON public.permissoes_perfil
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- MIGRAÇÃO: Vincular usuários existentes aos novos perfis
-- =====================================================

-- Vincular admins
INSERT INTO public.usuario_perfil (user_id, perfil_id)
SELECT ur.user_id, ps.id
FROM public.user_roles ur
JOIN public.perfis_sistema ps ON ps.nome = 'Administrador'
WHERE ur.role = 'admin'
ON CONFLICT (user_id, perfil_id) DO NOTHING;

-- Vincular gestores
INSERT INTO public.usuario_perfil (user_id, perfil_id)
SELECT ur.user_id, ps.id
FROM public.user_roles ur
JOIN public.perfis_sistema ps ON ps.nome = 'Gestor'
WHERE ur.role = 'gestor'
ON CONFLICT (user_id, perfil_id) DO NOTHING;

-- Vincular NIR
INSERT INTO public.usuario_perfil (user_id, perfil_id)
SELECT ur.user_id, ps.id
FROM public.user_roles ur
JOIN public.perfis_sistema ps ON ps.nome = 'NIR'
WHERE ur.role = 'nir'
ON CONFLICT (user_id, perfil_id) DO NOTHING;

-- Vincular Faturamento
INSERT INTO public.usuario_perfil (user_id, perfil_id)
SELECT ur.user_id, ps.id
FROM public.user_roles ur
JOIN public.perfis_sistema ps ON ps.nome = 'Faturamento'
WHERE ur.role = 'faturamento'
ON CONFLICT (user_id, perfil_id) DO NOTHING;

-- Vincular Recepção
INSERT INTO public.usuario_perfil (user_id, perfil_id)
SELECT ur.user_id, ps.id
FROM public.user_roles ur
JOIN public.perfis_sistema ps ON ps.nome = 'Recepção'
WHERE ur.role = 'recepcao'
ON CONFLICT (user_id, perfil_id) DO NOTHING;

-- Vincular Classificação
INSERT INTO public.usuario_perfil (user_id, perfil_id)
SELECT ur.user_id, ps.id
FROM public.user_roles ur
JOIN public.perfis_sistema ps ON ps.nome = 'Classificação'
WHERE ur.role = 'classificacao'
ON CONFLICT (user_id, perfil_id) DO NOTHING;

-- Vincular TI
INSERT INTO public.usuario_perfil (user_id, perfil_id)
SELECT ur.user_id, ps.id
FROM public.user_roles ur
JOIN public.perfis_sistema ps ON ps.nome = 'TI'
WHERE ur.role = 'ti'
ON CONFLICT (user_id, perfil_id) DO NOTHING;

-- Vincular Manutenção
INSERT INTO public.usuario_perfil (user_id, perfil_id)
SELECT ur.user_id, ps.id
FROM public.user_roles ur
JOIN public.perfis_sistema ps ON ps.nome = 'Manutenção'
WHERE ur.role = 'manutencao'
ON CONFLICT (user_id, perfil_id) DO NOTHING;

-- Vincular Engenharia Clínica
INSERT INTO public.usuario_perfil (user_id, perfil_id)
SELECT ur.user_id, ps.id
FROM public.user_roles ur
JOIN public.perfis_sistema ps ON ps.nome = 'Engenharia Clínica'
WHERE ur.role = 'engenharia_clinica'
ON CONFLICT (user_id, perfil_id) DO NOTHING;

-- Vincular Laboratório
INSERT INTO public.usuario_perfil (user_id, perfil_id)
SELECT ur.user_id, ps.id
FROM public.user_roles ur
JOIN public.perfis_sistema ps ON ps.nome = 'Laboratório'
WHERE ur.role = 'laboratorio'
ON CONFLICT (user_id, perfil_id) DO NOTHING;

-- Vincular RH/DP
INSERT INTO public.usuario_perfil (user_id, perfil_id)
SELECT ur.user_id, ps.id
FROM public.user_roles ur
JOIN public.perfis_sistema ps ON ps.nome = 'RH/DP'
WHERE ur.role = 'rh_dp'
ON CONFLICT (user_id, perfil_id) DO NOTHING;

-- Vincular Funcionários (fallback)
INSERT INTO public.usuario_perfil (user_id, perfil_id)
SELECT ur.user_id, ps.id
FROM public.user_roles ur
JOIN public.perfis_sistema ps ON ps.nome = 'Funcionário'
WHERE ur.role = 'funcionario'
ON CONFLICT (user_id, perfil_id) DO NOTHING;

-- =====================================================
-- CRIAR PERMISSÕES PADRÃO PARA PERFIL ADMINISTRADOR
-- (acesso total a tudo)
-- =====================================================

INSERT INTO public.permissoes_perfil (perfil_id, modulo_id, pode_visualizar, pode_acessar, comportamento_sem_acesso)
SELECT 
    ps.id,
    m.id,
    true,
    true,
    'ocultar'
FROM public.perfis_sistema ps
CROSS JOIN public.modulos_sistema m
WHERE ps.nome = 'Administrador';

INSERT INTO public.permissoes_ferramenta (perfil_id, ferramenta_id, permitido)
SELECT 
    ps.id,
    f.id,
    true
FROM public.perfis_sistema ps
CROSS JOIN public.ferramentas_modulo f
WHERE ps.nome = 'Administrador';