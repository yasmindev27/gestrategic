
-- Tabela de colaboradores do Nucleo Tracker (NIR produtividade)
CREATE TABLE public.nir_colaboradores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.nir_colaboradores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view nir_colaboradores"
  ON public.nir_colaboradores FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "NIR and admin can insert nir_colaboradores"
  ON public.nir_colaboradores FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'nir')
  );

CREATE POLICY "NIR and admin can update nir_colaboradores"
  ON public.nir_colaboradores FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'nir')
  );

-- Tabela de registros de produção do Nucleo Tracker
CREATE TABLE public.nir_registros_producao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador TEXT NOT NULL,
  atividade TEXT NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1,
  observacao TEXT DEFAULT '',
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.nir_registros_producao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view nir_registros_producao"
  ON public.nir_registros_producao FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "NIR and admin can insert nir_registros_producao"
  ON public.nir_registros_producao FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'nir')
  );

CREATE POLICY "NIR and admin can delete nir_registros_producao"
  ON public.nir_registros_producao FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'nir')
  );
