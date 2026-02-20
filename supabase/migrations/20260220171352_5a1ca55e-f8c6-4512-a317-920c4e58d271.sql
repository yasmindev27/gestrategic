
-- As 4073 avaliações criadas em lote em 20/02/2026 às 10:58 foram feitas por
-- Yasmin Silva Fernandes (user_id: 6989b738-0b67-4a5e-ad7b-9d29762fb7fa)
-- conforme logs_acesso do mesmo momento no módulo faturamento.
UPDATE avaliacoes_prontuarios
SET avaliador_id = '6989b738-0b67-4a5e-ad7b-9d29762fb7fa'
WHERE avaliador_id IS NULL
  AND DATE(data_conclusao) = '2026-02-20'
  AND is_finalizada = true;
