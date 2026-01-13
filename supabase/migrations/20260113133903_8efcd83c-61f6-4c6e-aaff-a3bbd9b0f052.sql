-- Fix function search_path for validate_escala_laboratorio
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
$$ LANGUAGE plpgsql SET search_path = public;