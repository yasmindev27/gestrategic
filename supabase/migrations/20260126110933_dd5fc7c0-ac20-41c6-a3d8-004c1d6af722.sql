-- Adicionar campo data_atendimento na tabela saida_prontuarios
ALTER TABLE public.saida_prontuarios
ADD COLUMN data_atendimento DATE;

-- Comentário sobre a coluna
COMMENT ON COLUMN public.saida_prontuarios.data_atendimento IS 'Data do atendimento do paciente';