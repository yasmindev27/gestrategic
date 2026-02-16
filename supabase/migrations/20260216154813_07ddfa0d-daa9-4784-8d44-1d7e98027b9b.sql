
-- Fornecedores para notas fiscais da gerência
CREATE TABLE public.gerencia_fornecedores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  cnpj TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.gerencia_fornecedores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access gerencia_fornecedores"
ON public.gerencia_fornecedores FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Gestores can view gerencia_fornecedores"
ON public.gerencia_fornecedores FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'gestor'));

CREATE TRIGGER update_gerencia_fornecedores_updated_at
BEFORE UPDATE ON public.gerencia_fornecedores
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Notas fiscais
CREATE TABLE public.gerencia_notas_fiscais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fornecedor_id UUID REFERENCES public.gerencia_fornecedores(id) ON DELETE SET NULL,
  fornecedor_nome TEXT NOT NULL,
  cnpj TEXT NOT NULL DEFAULT '',
  competencia TEXT NOT NULL,
  ano INTEGER NOT NULL DEFAULT 2026,
  numero_nf TEXT NOT NULL DEFAULT '',
  data_recebimento DATE,
  status TEXT NOT NULL DEFAULT 'LANÇADO',
  data_envio DATE,
  status_pagamento TEXT NOT NULL DEFAULT 'PENDENTE',
  valor_nota NUMERIC(12,2) NOT NULL DEFAULT 0,
  observacao TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.gerencia_notas_fiscais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access gerencia_notas_fiscais"
ON public.gerencia_notas_fiscais FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Gestores can view gerencia_notas_fiscais"
ON public.gerencia_notas_fiscais FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'gestor'));

CREATE POLICY "Faturamento can manage gerencia_notas_fiscais"
ON public.gerencia_notas_fiscais FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'faturamento'))
WITH CHECK (public.has_role(auth.uid(), 'faturamento'));

CREATE TRIGGER update_gerencia_notas_fiscais_updated_at
BEFORE UPDATE ON public.gerencia_notas_fiscais
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
