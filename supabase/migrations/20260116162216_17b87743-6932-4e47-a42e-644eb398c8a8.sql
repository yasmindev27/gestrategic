-- Adicionar campos paciente_nome e nascimento_mae na tabela saida_prontuarios
ALTER TABLE public.saida_prontuarios
ADD COLUMN paciente_nome TEXT,
ADD COLUMN nascimento_mae DATE;