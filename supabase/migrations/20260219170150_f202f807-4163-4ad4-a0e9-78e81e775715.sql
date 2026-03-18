-- Table for transport incident reports (intercorrências)
CREATE TABLE public.transferencia_intercorrencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitacao_id uuid NOT NULL REFERENCES public.transferencia_solicitacoes(id) ON DELETE CASCADE,
  descricao text NOT NULL,
  registrado_por uuid,
  registrado_por_nome text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.transferencia_intercorrencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view intercorrencias"
  ON public.transferencia_intercorrencias FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert intercorrencias"
  ON public.transferencia_intercorrencias FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = registrado_por);