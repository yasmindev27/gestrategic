ALTER TABLE public.auditorias_seguranca_paciente DROP CONSTRAINT auditorias_seguranca_paciente_tipo_check;

ALTER TABLE public.auditorias_seguranca_paciente ADD CONSTRAINT auditorias_seguranca_paciente_tipo_check CHECK (tipo = ANY (ARRAY['comunicacao_efetiva','lesao_pressao','queda','higiene_maos','avaliacao_prontuarios_enfermeiros','prontuario_qualitativa_cc','seguranca_paciente']));