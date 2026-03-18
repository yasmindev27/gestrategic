-- Add unique constraint on quantitativo_ajustes for reliable lookups
ALTER TABLE public.quantitativo_ajustes 
ADD CONSTRAINT quantitativo_ajustes_data_categoria_tipo_unique 
UNIQUE (data, categoria, tipo_refeicao);

-- Add trigger to ensure solicitacoes_dieta always have data_fim set
CREATE OR REPLACE FUNCTION public.set_default_data_fim()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.data_fim IS NULL THEN
    NEW.data_fim := NEW.data_inicio;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_default_data_fim
BEFORE INSERT OR UPDATE ON public.solicitacoes_dieta
FOR EACH ROW
EXECUTE FUNCTION public.set_default_data_fim();