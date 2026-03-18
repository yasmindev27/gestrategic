
-- Add checklist field for carimbo médico
ALTER TABLE public.saida_prontuarios 
ADD COLUMN IF NOT EXISTS possui_carimbo_medico boolean DEFAULT false;
