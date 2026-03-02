
CREATE TABLE public.quantitativo_ajustes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data TEXT NOT NULL,
  categoria TEXT NOT NULL, -- 'dieta' or 'extra'
  tipo_refeicao TEXT NOT NULL, -- 'cafe', 'almoco', 'lanche', 'jantar'
  valor_override INTEGER NOT NULL,
  ajustado_por UUID REFERENCES auth.users(id),
  ajustado_por_nome TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(data, categoria, tipo_refeicao)
);

ALTER TABLE public.quantitativo_ajustes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin pode gerenciar ajustes" ON public.quantitativo_ajustes
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated podem visualizar ajustes" ON public.quantitativo_ajustes
FOR SELECT TO authenticated
USING (true);
