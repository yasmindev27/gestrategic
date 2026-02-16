
-- Table for cross-department action plans managed by Gerência
CREATE TABLE public.gerencia_planos_acao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT,
  setor TEXT NOT NULL,
  responsavel_id UUID,
  responsavel_nome TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  prioridade TEXT NOT NULL DEFAULT 'media',
  data_criacao TIMESTAMPTZ NOT NULL DEFAULT now(),
  prazo TIMESTAMPTZ NOT NULL,
  data_conclusao TIMESTAMPTZ,
  observacoes TEXT,
  ultima_atualizacao_por TEXT,
  ultima_atualizacao_em TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gerencia_planos_acao ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admin full access gerencia_planos_acao"
ON public.gerencia_planos_acao
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Gestores can view all
CREATE POLICY "Gestores can view gerencia_planos_acao"
ON public.gerencia_planos_acao
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'gestor'));

-- Responsáveis can view their own
CREATE POLICY "Responsaveis can view own planos"
ON public.gerencia_planos_acao
FOR SELECT
TO authenticated
USING (responsavel_id = auth.uid());

-- Responsáveis can update their own
CREATE POLICY "Responsaveis can update own planos"
ON public.gerencia_planos_acao
FOR UPDATE
TO authenticated
USING (responsavel_id = auth.uid());

-- Auto-update timestamp trigger
CREATE TRIGGER update_gerencia_planos_acao_updated_at
BEFORE UPDATE ON public.gerencia_planos_acao
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Histórico de interações
CREATE TABLE public.gerencia_planos_historico (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plano_id UUID NOT NULL REFERENCES public.gerencia_planos_acao(id) ON DELETE CASCADE,
  acao TEXT NOT NULL,
  detalhes TEXT,
  executado_por UUID,
  executado_por_nome TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.gerencia_planos_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access gerencia_planos_historico"
ON public.gerencia_planos_historico
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Gestores can view gerencia_planos_historico"
ON public.gerencia_planos_historico
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'gestor'));
