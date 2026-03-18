
-- Remove duplicate avaliacoes (keep the earliest one per saida_prontuario_id)
DELETE FROM avaliacoes_prontuarios
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY saida_prontuario_id 
      ORDER BY data_inicio ASC
    ) as rn
    FROM avaliacoes_prontuarios
    WHERE saida_prontuario_id IS NOT NULL
  ) sub
  WHERE rn > 1
);

-- Add unique constraint to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_avaliacoes_unique_saida 
ON avaliacoes_prontuarios (saida_prontuario_id) 
WHERE saida_prontuario_id IS NOT NULL;
