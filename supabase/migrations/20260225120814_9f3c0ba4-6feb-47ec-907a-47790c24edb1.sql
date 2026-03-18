
ALTER TABLE public.saida_prontuarios
ADD COLUMN checklist_validacao jsonb DEFAULT NULL;

COMMENT ON COLUMN public.saida_prontuarios.checklist_validacao IS 'Checklist de verificação na validação: carimbo_enfermagem, evolucao, ficha_medicacao, pedidos_exames, alta_medica com valores sim/nao_se_aplica/pendente + observacao';
