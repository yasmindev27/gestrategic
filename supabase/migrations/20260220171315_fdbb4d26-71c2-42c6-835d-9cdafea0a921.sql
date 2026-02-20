
-- Popula avaliador_id nas avaliações que têm nulo, usando os logs_acesso como fonte de verdade.
-- A estratégia: para cada avaliação sem avaliador_id, busca o log 'finalizar_avaliacao'
-- mais próximo (em tempo) ao data_conclusao da avaliação, dentro de uma janela de 5 minutos.

UPDATE avaliacoes_prontuarios ap
SET avaliador_id = sub.user_id
FROM (
  SELECT DISTINCT ON (ap2.id)
    ap2.id AS avaliacao_id,
    la.user_id
  FROM avaliacoes_prontuarios ap2
  JOIN logs_acesso la ON la.acao = 'finalizar_avaliacao'
  WHERE ap2.avaliador_id IS NULL
    AND ap2.is_finalizada = true
    AND ap2.data_conclusao IS NOT NULL
    AND ABS(EXTRACT(EPOCH FROM (la.created_at - ap2.data_conclusao))) <= 300  -- 5 minutos
  ORDER BY ap2.id, ABS(EXTRACT(EPOCH FROM (la.created_at - ap2.data_conclusao)))
) sub
WHERE ap.id = sub.avaliacao_id
  AND ap.avaliador_id IS NULL;

-- Para avaliações que ainda ficaram sem avaliador (sem log correspondente próximo),
-- tenta recuperar via avaliacoes_historico
UPDATE avaliacoes_prontuarios ap
SET avaliador_id = ah.executado_por
FROM avaliacoes_historico ah
WHERE ap.prontuario_id = ah.prontuario_id
  AND ah.acao = 'criar_avaliacao'
  AND ah.executado_por IS NOT NULL
  AND ap.avaliador_id IS NULL;
