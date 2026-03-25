# Exemplos Práticos: Queries SQL para Roles e Aprovações

---

## 1. QUERY: Obter Subordinados de um Gerente

```sql
-- Forma 1: Usando função RLS
SELECT * FROM public.get_usuarios_sob_gestao('550e8400-e29b-41d4-a716-446655440000'::uuid);

-- Retorna:
-- | user_id                              | full_name      | cargo                 | setor       |
-- |--------------------------------------|----------------|----------------------|-------------|
-- | 660e8400-e29b-41d4-a716-446655440001 | Maria Silva    | Técnico Enfermagem   | Enfermagem  |
-- | 660e8400-e29b-41d4-a716-446655440002 | João Santos    | Enfermeiro           | Enfermagem  |
-- | 660e8400-e29b-41d4-a716-446655440003 | Ana Costa      | Técnico Enfermagem   | Recepção    |


-- Forma 2: Query direta (equivalente)
SELECT DISTINCT p.user_id, p.full_name, p.cargo, p.setor
FROM public.profiles p
WHERE (
    -- Subordinados pelo SETOR
    EXISTS (
        SELECT 1
        FROM public.gestor_setores gs
        JOIN public.setores s ON s.id = gs.setor_id AND s.nome = p.setor
        WHERE gs.gestor_user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid
    )
    -- OU subordinados pelo CARGO
    OR EXISTS (
        SELECT 1
        FROM public.gestor_cargos gc
        JOIN public.cargos c ON c.id = gc.cargo_id AND c.nome = p.cargo
        WHERE gc.gestor_user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid
    )
)
AND p.user_id != '550e8400-e29b-41d4-a716-446655440000'::uuid;
```

---

## 2. QUERY: Obter Setores que um Gerente Gerencia

```sql
SELECT 
    gs.id,
    gs.setor_id,
    s.nome as setor_nome,
    COUNT(DISTINCT p.user_id) as total_colaboradores
FROM public.gestor_setores gs
JOIN public.setores s ON s.id = gs.setor_id
LEFT JOIN public.profiles p ON p.setor = s.nome
WHERE gs.gestor_user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid
GROUP BY gs.id, gs.setor_id, s.nome
ORDER BY s.nome;

-- Retorna:
-- | id                                   | setor_id | setor_nome    | total_colaboradores |
-- |--------------------------------------|----------|---------------|---------------------|
-- | 770e8400-e29b-41d4-a716-446655440010 | <uuid>   | Enfermagem    | 12                  |
-- | 770e8400-e29b-41d4-a716-446655440011 | <uuid>   | Recepção      | 5                   |
```

---

## 3. QUERY: Trocas Aguardando Aprovação de um Coordenador

```sql
SELECT 
    et.id,
    et.ofertante_nome,
    et.aceitante_nome,
    ee.data_plantao,
    ee.hora_inicio,
    ee.hora_fim,
    ee.setor,
    et.motivo_oferta,
    et.created_at
FROM public.enfermagem_trocas et
JOIN public.enfermagem_escalas ee ON ee.id = et.escala_id
WHERE et.status = 'pendente_aprovacao'
  AND et.requer_aprovacao = true
ORDER BY et.created_at ASC;

-- Retorna:
-- | id    | ofertante_nome | aceitante_nome | data_plantao | hora_inicio | ... |
-- |-------|----------------|----------------|--------------|-------------|-----|
-- | <id> | Mariana        | Ricardo        | 2026-03-25   | 07:00       | ...  |
-- | <id> | Fábio          | Cláudia        | 2026-03-26   | 19:00       | ...  |
```

---

## 4. QUERY: Justificativas de Ponto Pendentes por Departamento

```sql
SELECT 
    jp.id,
    jp.colaborador_nome,
    jp.cargo_funcao,
    jp.setor,
    jp.data_ocorrencia,
    EXTRACT(EPOCH FROM (jp.jornada_registrada_entrada - jp.jornada_contratual_entrada)) / 60 as minutos_diferenca,
    jp.justificativa,
    COUNT(*) OVER (PARTITION BY jp.setor) as total_pendentes_deste_setor
FROM public.justificativas_ponto jp
WHERE jp.status = 'pendente'
  AND jp.setor = 'Enfermagem'
ORDER BY jp.data_ocorrencia DESC, jp.created_at DESC;

-- Retorna:
-- | id | colaborador_nome | cargo_funcao | data_ocorrencia | minutos_diferenca | justificativa |
-- |----|------------------|--------------|-----------------|-------------------|---------------|
-- | .. | Bruno            | Técnico Enf. | 2026-03-23      | 15                | Trânsito      |
-- | .. | Paula            | Técnico Enf. | 2026-03-22      | -30               | Saída antecip |
```

---

## 5. QUERY: Extensões de Jornada Rejeitadas + Motivo

```sql
SELECT 
    ej.id,
    ej.colaborador_nome,
    ej.colaborador_setor,
    ej.data_extensao,
    ej.hora_inicio_extra || ' - ' || ej.hora_fim_extra as periodo_extra,
    ej.minutos_extras,
    ej.motivo,
    ej.aprovado_por_nome as rejeitado_por,
    ej.observacao_aprovador as motivo_rejeicao,
    AGE(ej.aprovado_em, ej.created_at) as tempo_ate_resposta
FROM public.justificativas_extensao_jornada ej
WHERE ej.status = 'rejeitado'
  AND ej.aprovado_em > CURRENT_DATE - INTERVAL '30 days'
ORDER BY ej.aprovado_em DESC;

-- Retorna:
-- | ... | motivo | rejeitado_por | motivo_rejeicao | tempo_até_resposta |
-- |----|--------|---------------|------------------|-------------------|
-- | ... | Urgência | Fátima Silva | Limite excedido  | 00:15:32          |
```

---

## 6. QUERY: Histórico de Aprovações de um Coordenador

```sql
SELECT 
    jp.id,
    jp.colaborador_nome,
    jp.data_ocorrencia,
    jp.status,
    jp.aprovado_em,
    jp.justificativa_aprovacao,
    'ponto' as tipo_documento
FROM public.justificativas_ponto jp
WHERE jp.aprovado_por = '550e8400-e29b-41d4-a716-446655440000'::uuid
  AND jp.aprovado_em IS NOT NULL

UNION ALL

SELECT 
    ej.id,
    ej.colaborador_nome,
    ej.data_extensao,
    ej.status,
    ej.aprovado_em,
    ej.observacao_aprovador,
    'extensao' as tipo_documento
FROM public.justificativas_extensao_jornada ej
WHERE ej.aprovado_por = '550e8400-e29b-41d4-a716-446655440000'::uuid
  AND ej.aprovado_em IS NOT NULL

UNION ALL

SELECT 
    et.id::text,
    et.ofertante_nome || ' ↔ ' || et.aceitante_nome as colaborador_nome,
    ee.data_plantao::date,
    et.status,
    et.data_aprovacao,
    et.justificativa_rejeicao,
    'troca' as tipo_documento
FROM public.enfermagem_trocas et
JOIN public.enfermagem_escalas ee ON ee.id = et.escala_id
WHERE et.aprovador_id = '550e8400-e29b-41d4-a716-446655440000'::uuid
  AND et.data_aprovacao IS NOT NULL

ORDER BY aprovado_em DESC;

-- Retorna:
-- | ... | colaborador_nome | tipo_documento | status | observacao |
-- |----|------------------|----------------|--------|------------|
-- | ... | João             | ponto          | aprovado | OK    |
-- | ... | Maria ↔ Pedro    | troca          | rejeitado | Conflito |
```

---

## 7. QUERY: Verificar se Gerente Gerencia um Usuário

```sql
-- Usando a função RLS
SELECT public.gestor_gerencia_usuario(
    '550e8400-e29b-41d4-a716-446655440000'::uuid,  -- gestor_id
    '660e8400-e29b-41d4-a716-446655440001'::uuid   -- usuario_id
) as gerencia;

-- Retorna: true ou false


-- Query manual equivalente:
SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.gestor_setores gs ON gs.gestor_user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid
    JOIN public.setores s ON s.id = gs.setor_id AND s.nome = p.setor
    WHERE p.user_id = '660e8400-e29b-41d4-a716-446655440001'::uuid
)
OR EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.gestor_cargos gc ON gc.gestor_user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid
    JOIN public.cargos c ON c.id = gc.cargo_id AND c.nome = p.cargo
    WHERE p.user_id = '660e8400-e29b-41d4-a716-446655440001'::uuid
) as gerencia;
```

---

## 8. QUERY: Obter Todas as Roles de um Usuário

```sql
SELECT 
    ur.user_id,
    p.full_name,
    ARRAY_AGG(ur.role) as roles,
    COUNT(*) as total_roles
FROM public.user_roles ur
JOIN public.profiles p ON p.user_id = ur.user_id
WHERE ur.user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid
GROUP BY ur.user_id, p.full_name;

-- Retorna:
-- | user_id | full_name | roles | total_roles |
-- |---------|-----------|-------|------------|
-- | <id>    | Fátima    | {coordenador_enfermagem, enfermagem} | 2 |
```

---

## 9. QUERY: Dashboard - Resumo de Aprovações Pendentes

```sql
WITH trocas_pendentes AS (
    SELECT COUNT(*) as total FROM public.enfermagem_trocas 
    WHERE status = 'pendente_aprovacao'
),
extensoes_pendentes AS (
    SELECT COUNT(*) as total FROM public.justificativas_extensao_jornada 
    WHERE status = 'pendente'
),
pontos_pendentes AS (
    SELECT COUNT(*) as total FROM public.justificativas_ponto 
    WHERE status = 'pendente'
)
SELECT 
    'Trocas de Plantão' as categoria,
    (SELECT total FROM trocas_pendentes) as itens_pendentes
UNION ALL
SELECT 
    'Extensões de Jornada',
    (SELECT total FROM extensoes_pendentes)
UNION ALL
SELECT 
    'Justificativas de Ponto',
    (SELECT total FROM pontos_pendentes)
ORDER BY itens_pendentes DESC;

-- Retorna:
-- | categoria | itens_pendentes |
-- |-----------|-----------------|
-- | Trocas de Plantão | 5 |
-- | Extensões de Jornada | 3 |
-- | Justificativas de Ponto | 12 |
```

---

## 10. QUERY: Performance - Índices Recomendados

```sql
-- Criar índices para melhorar performance

-- Para buscar trocas pendentes
CREATE INDEX IF NOT EXISTS idx_enfermagem_trocas_status_data
ON public.enfermagem_trocas (status, created_at DESC)
WHERE status = 'pendente_aprovacao';

-- Para buscar justificativas de ponto pendentes
CREATE INDEX IF NOT EXISTS idx_justificativas_ponto_status_setor
ON public.justificativas_ponto (status, setor)
WHERE status = 'pendente';

-- Para buscar justificativas de extensão pendentes
CREATE INDEX IF NOT EXISTS idx_justificativas_extensao_status
ON public.justificativas_extensao_jornada (status)
WHERE status = 'pendente';

-- Para relacionar gestor a colaboradores via setor
CREATE INDEX IF NOT EXISTS idx_gestor_setores_gestor_id
ON public.gestor_setores (gestor_user_id);

CREATE INDEX IF NOT EXISTS idx_gestor_cargos_gestor_id
ON public.gestor_cargos (gestor_user_id);

-- Para buscar subordinados rápido
CREATE INDEX IF NOT EXISTS idx_profiles_setor_cargo
ON public.profiles (setor, cargo);

-- Para auditar quem aprovou
CREATE INDEX IF NOT EXISTS idx_justificativas_ponto_aprovador
ON public.justificativas_ponto (aprovado_por, aprovado_em DESC);
```

---

## 11. QUERY: Auditoria - Quem Aprovou o Quê

```sql
-- Relatório: Todas as aprovações de um período
SELECT 
    DATE(jp.aprovado_em) as data_aprovacao,
    jp.aprovado_por_nome as aprovador,
    COUNT(*) as total_pontos_aprovados,
    COUNT(CASE WHEN jp.status = 'aprovado' THEN 1 END) as aprovados,
    COUNT(CASE WHEN jp.status = 'reprovado' THEN 1 END) as reprovados
FROM public.justificativas_ponto jp
WHERE jp.aprovado_em >= '2026-03-01'::date
  AND jp.aprovado_em < '2026-04-01'::date
GROUP BY DATE(jp.aprovado_em), jp.aprovado_por_nome
ORDER BY data_aprovacao DESC, aprovador;

-- Retorna:
-- | data_aprovação | aprovador | total | aprovados | reprovados |
-- |-----------------|-----------|-------|-----------|------------|
-- | 2026-03-24      | Fátima    | 8     | 7         | 1          |
-- | 2026-03-23      | Fátima    | 12    | 11        | 1          |
-- | 2026-03-22      | Coordena... | 6  | 5         | 1          |
```

---

## 12. UPDATE: Aprovar uma Troca de Plantão

```sql
UPDATE public.enfermagem_trocas
SET 
    status = 'aprovada',
    aprovador_id = '550e8400-e29b-41d4-a716-446655440000'::uuid,
    aprovador_nome = 'Fátima Silva',
    data_aprovacao = NOW(),
    updated_at = NOW()
WHERE id = '880e8400-e29b-41d4-a716-446655440055'::uuid
  AND status = 'pendente_aprovacao'
RETURNING id, status, data_aprovacao;

-- Retorna:
-- | id | status | data_aprovacao |
-- |----|--------|----------------|
-- | <id> | aprovada | 2026-03-24 14:32:15 |
```

---

## 13. UPDATE: Rejeitar com Justificativa

```sql
UPDATE public.justificativas_extensao_jornada
SET 
    status = 'rejeitado',
    aprovado_por = '550e8400-e29b-41d4-a716-446655440000'::uuid,
    aprovado_por_nome = 'Fátima Silva',
    aprovado_em = NOW(),
    observacao_aprovador = 'Colaborador já atingiu limite de horas extras no mês',
    updated_at = NOW()
WHERE id = '990e8400-e29b-41d4-a716-446655440066'::uuid
RETURNING id, status, observacao_aprovador;

-- Retorna:
-- | id | status | observacao_aprovador |
-- |----|--------|----------------------|
-- | <id> | rejeitado | Colaborador já atingiu... |
```

---

## 14. INSERT: Vincular Gestor a Setor

```sql
INSERT INTO public.gestor_setores (gestor_user_id, setor_id, created_by)
VALUES (
    '550e8400-e29b-41d4-a716-446655440000'::uuid,  -- Fátima (gestor)
    (SELECT id FROM public.setores WHERE nome = 'Enfermagem' LIMIT 1),
    '550e8400-e29b-41d4-a716-446655440000'::uuid   -- criado por admin
)
RETURNING id, gestor_user_id, setor_id, created_at;

-- Retorna:
-- | id | gestor_user_id | setor_id | created_at |
-- |----|----------------|----------|-----------|
-- | <novo_id> | 550e8400-e29b-41d4-a716... | <uuid> | 2026-03-24 |
```

---

## 15. DELETE: Remover Gestão de um Setor

```sql
DELETE FROM public.gestor_setores
WHERE gestor_user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid
  AND setor_id = (SELECT id FROM public.setores WHERE nome = 'Recepção' LIMIT 1)
RETURNING id, gestor_user_id;

-- Retorna:
-- | id | gestor_user_id |
-- |----|----------------|
-- | <id_deletado> | 550e8400-e29b-41d4-a716... |
```

---

## NOTAS IMPORTANTES

- **SEMPRE** usar `auth.uid()` em RLS policies para comparar com usuário autenticado
- **NUNCA** confiar em `user_id` vindo do frontend - sempre usar `auth.uid()`
- Todas as tabelas com dados sensíveis devem ter RLS habilitado
- Funções devem usar `SECURITY DEFINER` para bypass de RLS quando necessário
- Logs de auditoria servem para rastreabilidade (não devem ser editáveis)

---

**Fim do Arquivo de Exemplos**

