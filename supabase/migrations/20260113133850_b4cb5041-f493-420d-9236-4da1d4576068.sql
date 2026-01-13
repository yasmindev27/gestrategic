-- Update produtos RLS policy to include laboratorio
DROP POLICY IF EXISTS "TI Manutencao Engenharia e Admin gerenciam produtos do seu seto" ON public.produtos;

CREATE POLICY "Setores técnicos e Admin gerenciam produtos do seu setor"
ON public.produtos FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  (has_role(auth.uid(), 'ti'::app_role) AND setor_responsavel = 'ti') OR
  (has_role(auth.uid(), 'manutencao'::app_role) AND setor_responsavel = 'manutencao') OR
  (has_role(auth.uid(), 'engenharia_clinica'::app_role) AND setor_responsavel = 'engenharia_clinica') OR
  (has_role(auth.uid(), 'laboratorio'::app_role) AND setor_responsavel = 'laboratorio')
);

-- Update movimentacoes_estoque RLS policy to include laboratorio
DROP POLICY IF EXISTS "TI Manutencao Engenharia e Admin inserem movimentações do seu" ON public.movimentacoes_estoque;

CREATE POLICY "Setores técnicos e Admin inserem movimentações do seu setor"
ON public.movimentacoes_estoque FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  (has_role(auth.uid(), 'ti'::app_role) AND setor = 'ti') OR
  (has_role(auth.uid(), 'manutencao'::app_role) AND setor = 'manutencao') OR
  (has_role(auth.uid(), 'engenharia_clinica'::app_role) AND setor = 'engenharia_clinica') OR
  (has_role(auth.uid(), 'laboratorio'::app_role) AND setor = 'laboratorio')
);

-- Create escalas_laboratorio table for monthly schedules
CREATE TABLE public.escalas_laboratorio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mes integer NOT NULL,
  ano integer NOT NULL,
  funcionario_nome text NOT NULL,
  funcionario_id uuid,
  dia integer NOT NULL,
  turno text NOT NULL,
  observacao text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(mes, ano, funcionario_nome, dia, turno)
);

-- Add validation trigger instead of CHECK constraints for flexibility
CREATE OR REPLACE FUNCTION public.validate_escala_laboratorio()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.mes < 1 OR NEW.mes > 12 THEN
    RAISE EXCEPTION 'Mês deve estar entre 1 e 12';
  END IF;
  IF NEW.ano < 2020 THEN
    RAISE EXCEPTION 'Ano deve ser maior ou igual a 2020';
  END IF;
  IF NEW.dia < 1 OR NEW.dia > 31 THEN
    RAISE EXCEPTION 'Dia deve estar entre 1 e 31';
  END IF;
  IF NEW.turno NOT IN ('manha', 'tarde', 'noite', 'plantao') THEN
    RAISE EXCEPTION 'Turno deve ser manha, tarde, noite ou plantao';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_escala_laboratorio_trigger
BEFORE INSERT OR UPDATE ON public.escalas_laboratorio
FOR EACH ROW EXECUTE FUNCTION public.validate_escala_laboratorio();

-- Enable RLS
ALTER TABLE public.escalas_laboratorio ENABLE ROW LEVEL SECURITY;

-- RLS policies for escalas_laboratorio
CREATE POLICY "Laboratorio e Admin visualizam escalas"
ON public.escalas_laboratorio FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'laboratorio'::app_role) OR
  has_role(auth.uid(), 'gestor'::app_role)
);

CREATE POLICY "Laboratorio e Admin inserem escalas"
ON public.escalas_laboratorio FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'laboratorio'::app_role)
);

CREATE POLICY "Laboratorio e Admin atualizam escalas"
ON public.escalas_laboratorio FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'laboratorio'::app_role)
);

CREATE POLICY "Laboratorio e Admin deletam escalas"
ON public.escalas_laboratorio FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'laboratorio'::app_role)
);