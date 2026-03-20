
CREATE TABLE public.gerencia_dre_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rubrica text NOT NULL,
  categoria_pai text,
  mes text NOT NULL,
  ano integer NOT NULL DEFAULT 2025,
  valor_realizado numeric(14,2) NOT NULL DEFAULT 0,
  valor_previsto numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.gerencia_dre_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access gerencia_dre_entries" ON public.gerencia_dre_entries
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Gestores can view gerencia_dre_entries" ON public.gerencia_dre_entries
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'gestor'::app_role));

CREATE POLICY "Faturamento can manage gerencia_dre_entries" ON public.gerencia_dre_entries
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'faturamento'::app_role))
  WITH CHECK (has_role(auth.uid(), 'faturamento'::app_role));

CREATE TRIGGER update_gerencia_dre_entries_updated_at
  BEFORE UPDATE ON public.gerencia_dre_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
