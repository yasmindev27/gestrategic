
-- Create table for DISC assessment results
CREATE TABLE public.disc_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_completo TEXT NOT NULL,
  cargo_atual TEXT NOT NULL,
  setor TEXT NOT NULL,
  tempo_atuacao TEXT NOT NULL,
  formacao TEXT NOT NULL,
  experiencia_lideranca TEXT NOT NULL,
  score_d INTEGER NOT NULL DEFAULT 0,
  score_i INTEGER NOT NULL DEFAULT 0,
  score_s INTEGER NOT NULL DEFAULT 0,
  score_c INTEGER NOT NULL DEFAULT 0,
  perfil_predominante TEXT NOT NULL,
  perfil_secundario TEXT NOT NULL,
  leadership_score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.disc_results ENABLE ROW LEVEL SECURITY;

-- Authenticated users can insert (anyone can fill the form)
CREATE POLICY "Authenticated users can insert disc results"
  ON public.disc_results FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Admin and gestor can view all results
CREATE POLICY "Admin and gestor can view all disc results"
  ON public.disc_results FOR SELECT
  USING (
    has_any_role(auth.uid(), ARRAY['admin', 'gestor']::app_role[])
  );

-- Users can view their own results
CREATE POLICY "Users can view own disc results"
  ON public.disc_results FOR SELECT
  USING (auth.uid() = created_by);

-- Admin can delete results
CREATE POLICY "Admin can delete disc results"
  ON public.disc_results FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));
