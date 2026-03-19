
CREATE TABLE public.notificacoes_arboviroses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  paciente_nome TEXT NOT NULL,
  data_nascimento DATE,
  idade INTEGER,
  data_notificacao DATE NOT NULL,
  unidade_notificadora TEXT DEFAULT 'UPA',
  suspeita TEXT NOT NULL, -- DENGUE, ZIKA, CHIKUNGUNYA, etc.
  grupo TEXT, -- A, B, C, D
  endereco TEXT,
  bairro TEXT,
  comorbidades TEXT,
  data_inicio_sintomas DATE,
  dias_evolucao INTEGER,
  lab_data DATE,
  lab_exame TEXT,
  sorologia_data DATE,
  sorologia_resultado TEXT,
  ciclo1_data DATE,
  ciclo1_hematocrito TEXT,
  ciclo1_gl TEXT,
  ciclo1_plaquetas TEXT,
  ciclo2_data DATE,
  ciclo2_hematocrito TEXT,
  ciclo2_gl TEXT,
  ciclo2_plaquetas TEXT,
  ciclo3_data DATE,
  ciclo3_hematocrito TEXT,
  ciclo3_gl TEXT,
  ciclo3_plaquetas TEXT,
  investigacao_campo TEXT,
  registrado_por UUID REFERENCES auth.users(id),
  registrado_por_nome TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notificacoes_arboviroses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view arboviroses"
  ON public.notificacoes_arboviroses FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert arboviroses"
  ON public.notificacoes_arboviroses FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update arboviroses"
  ON public.notificacoes_arboviroses FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Admin can delete arboviroses"
  ON public.notificacoes_arboviroses FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
