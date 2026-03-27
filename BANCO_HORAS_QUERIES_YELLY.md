# Exemplos de Queries e Dados para Banco de Horas

## 1. Exemplo de Registro Completo para Funcionário

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "funcionario_user_id": "12345678-1234-1234-1234-123456789000",
  "funcionario_nome": "NOME DO FUNCIONÁRIO",
  "data": "2026-03-20",
  "tipo": "credito",
  "horas": 8.50,
  "motivo": "Horas extras compensadas",
  "observacao": "Referente ao final de semana",
  "registrado_por": "87654321-4321-4321-4321-098765432100",
  "aprovado_por": "87654321-4321-4321-4321-098765432100",
  "aprovado_em": "2026-03-21T10:30:00+00:00",
  "status": "aprovado",
  "created_at": "2026-03-20T14:22:15.123456+00:00",
  "updated_at": "2026-03-21T10:30:00.654321+00:00"
}
```

---

## 2. Queries SQL para Funcionário

### 2.1. Buscar todos os registros de um funcionário

```sql
SELECT 
  id,
  data,
  tipo,
  horas,
  motivo,
  status,
  aprovado_em
FROM public.banco_horas
WHERE funcionario_nome = 'NOME DO FUNCIONÁRIO'
ORDER BY data DESC;
```

### 2.2. Buscar saldo atual de Yelly Silva

```sql
SELECT 
  (
    SELECT COALESCE(SUM(horas), 0)
    FROM public.banco_horas
    WHERE funcionario_nome = 'Yelly Silva' 
      AND tipo = 'credito'
      AND status = 'aprovado'
  ) - (
    SELECT COALESCE(SUM(horas), 0)
    FROM public.banco_horas
    WHERE funcionario_nome = 'Yelly Silva' 
      AND tipo = 'debito'
      AND status = 'aprovado'
  ) AS saldo_atual;
```

### 2.3. Registros pendentes de Yelly Silva

```sql
SELECT 
  id,
  data,
  tipo,
  horas,
  motivo,
  status,
  created_at
FROM public.banco_horas
WHERE funcionario_nome = 'Yelly Silva'
  AND status = 'pendente'
ORDER BY data ASC;
```

### 2.4. Histórico completo por tipo

```sql
SELECT 
  tipo,
  COUNT(*) as total_registros,
  SUM(horas) as total_horas,
  COUNT(CASE WHEN status = 'aprovado' THEN 1 END) as aprovados,
  COUNT(CASE WHEN status = 'pendente' THEN 1 END) as pendentes,
  COUNT(CASE WHEN status = 'rejeitado' THEN 1 END) as rejeitados
FROM public.banco_horas
WHERE funcionario_nome = 'Yelly Silva'
GROUP BY tipo;
```

### 2.5. Relatório mensal de Yelly Silva

```sql
SELECT 
  DATE_TRUNC('month', data)::DATE as mes,
  tipo,
  COUNT(*) as quantidade,
  SUM(horas) as total_horas
FROM public.banco_horas
WHERE funcionario_nome = 'Yelly Silva'
  AND status = 'aprovado'
GROUP BY DATE_TRUNC('month', data), tipo
ORDER BY mes DESC, tipo;
```

### 2.6. Buscar por similar ao nome (case-insensitive)

```sql
SELECT 
  funcionario_nome,
  COUNT(*) as total_registros,
  SUM(CASE WHEN tipo = 'credito' THEN horas ELSE 0 END) as creditos,
  SUM(CASE WHEN tipo = 'debito' THEN horas ELSE 0 END) as debitos
FROM public.banco_horas
WHERE funcionario_nome ILIKE '%yelly%'
GROUP BY funcionario_nome;
```

---

## 3. Inserção de Dados via SQL

### 3.1. Inserir novo registro para Yelly Silva

```sql
INSERT INTO public.banco_horas (
  funcionario_user_id,
  funcionario_nome,
  data,
  tipo,
  horas,
  motivo,
  observacao,
  registrado_por,
  status
) VALUES (
  '12345678-1234-1234-1234-123456789000'::uuid,
  'Yelly Silva',
  CURRENT_DATE,
  'credito',
  8.50,
  'Horas extras compensadas',
  'Referente ao final de semana',
  '87654321-4321-4321-4321-098765432100'::uuid,
  'pendente'
)
RETURNING *;
```

### 3.2. Aprovar registro pendente

```sql
UPDATE public.banco_horas
SET 
  status = 'aprovado',
  aprovado_por = '87654321-4321-4321-4321-098765432100'::uuid,
  aprovado_em = NOW()
WHERE 
  funcionario_nome = 'Yelly Silva'
  AND status = 'pendente'
  AND data = '2026-03-20'
RETURNING *;
```

### 3.3. Rejeitar registro

```sql
UPDATE public.banco_horas
SET 
  status = 'rejeitado',
  aprovado_por = '87654321-4321-4321-4321-098765432100'::uuid,
  aprovado_em = NOW()
WHERE 
  id = 'seu-uuid-aqui'::uuid
RETURNING *;
```

---

## 4. Importação de Arquivo Excel - Formatos Suportados

### Formato 1: Simples (Interno)

| Colaborador | Data       | Tipo                | Horas | Motivo                 |
|------------|------------|-------------------|-------|----------------------|
| Yelly Silva | 2026-03-20 | Crédito           | 8.50  | Horas extras         |
| Yelly Silva | 2026-03-19 | Débito            | 2.00  | Falta injustificada  |

**Notas:**
- Coluna "Tipo" deve conter "crédito" ou "débito" (case-insensitive)
- Data pode estar em: 2026-03-20, 03/20/2026, 20/03/2026

### Formato 2: Sistema Externo

| Matricula | Funcionario | Saldo Final | Data Final | Tipo de saldo |
|----------|-----------|-----------|---------|-------------|
| 12345    | Yelly Silva | 08:30     | 2026-03-20 | Banco de Horas |

**Notas:**
- "Saldo Final" em formato HH:MM (horas:minutos)
- Valores negativos: -02:30 indica débito
- Matricula deve corresponder ao campo `matricula` da tabela `profiles`

---

## 5. Estrutura de Resposta da API Supabase

### Ao buscar registros:

```typescript
interface BancoHoraRow {
  id: string;                           // UUID
  funcionario_user_id: string;          // UUID do perfil
  funcionario_nome: string;             // "Yelly Silva"
  data: string;                         // "2026-03-20"
  tipo: "credito" | "debito";          // Tipo de lançamento
  horas: number;                        // Ex: 8.50
  motivo: string | null;                // Opcional
  observacao: string | null;            // Opcional
  registrado_por: string;              // UUID de quem registrou
  aprovado_por: string | null;         // UUID de quem aprovou
  aprovado_em: string | null;          // ISO timestamp
  status: "pendente" | "aprovado" | "rejeitado";
  created_at: string;                   // ISO timestamp
  updated_at: string;                   // ISO timestamp
}
```

---

## 6. Código TypeScript para Consultar Yelly

### 6.1. Buscar todos os registros

```typescript
const { data: registrosYelly, error } = await supabase
  .from('banco_horas')
  .select('*')
  .eq('funcionario_nome', 'Yelly Silva')
  .order('data', { ascending: false });

if (error) {
  console.error('Erro ao buscar:', error);
} else {
  console.log('Registros de Yelly Silva:', registrosYelly);
}
```

### 6.2. Buscar apenas aprovados

```typescript
const { data: aprovados } = await supabase
  .from('banco_horas')
  .select('*')
  .eq('funcionario_nome', 'Yelly Silva')
  .eq('status', 'aprovado')
  .order('data', { ascending: false });
```

### 6.3. Buscar em período específico

```typescript
const { data: periodo } = await supabase
  .from('banco_horas')
  .select('*')
  .eq('funcionario_nome', 'Yelly Silva')
  .gte('data', '2026-03-01')
  .lte('data', '2026-03-31')
  .order('data', { ascending: true });
```

### 6.4. Buscar por UUID (mais eficiente)

```typescript
// Se você tiver o UUID do usuário
const { data: registros } = await supabase
  .from('banco_horas')
  .select('*')
  .eq('funcionario_user_id', userUUID)
  .order('data', { ascending: false });
```

---

## 7. Mapeamento de Relacionamentos

```
profiles (auth)
  ├─ user_id (UUID) ← funcionario_user_id
  ├─ full_name: "Yelly Silva" ← funcionario_nome
  └─ matricula: "12345" (opcional)
      └─ RELACIONA COM ↴
          
banco_horas
  ├─ funcionario_user_id (FK → profiles.user_id)
  ├─ funcionario_nome (cópia textual de profiles.full_name)
  ├─ registrado_por (FK → profiles.user_id) [usuário que registrou]
  ├─ aprovado_por (FK → profiles.user_id) [opcional]
```

---

## 8. Dicas de Troubleshooting

### Problema: "Yelly Silva" não encontrada

**Causa 1:** Nome armazenado diferente (espaço extra, maiúsculas/minúsculas)
```sql
-- Verificar qual é o nome exato
SELECT DISTINCT funcionario_nome
FROM public.banco_horas
WHERE funcionario_nome ILIKE '%yelly%';
```

**Causa 2:** Usuário não existe em `profiles`
```sql
-- Verificar se existe
SELECT full_name, matricula, cargo
FROM public.profiles
WHERE full_name ILIKE '%yelly%';
```

**Causa 3:** RLS bloqueando acesso
- Verificar papel do usuário autenticado
- Verificar políticas em `banco_horas`

### Problema: Não consegue inserir

**Verificar:**
1. Você possui role `rh_dp` ou `admin`?
2. O `funcionario_user_id` é um UUID válido?
3. O nome do funcionário corresponde ao perfil?

```sql
-- Verificar permissões
SELECT * FROM public.user_roles 
WHERE user_id = YOUR_USER_ID;
```

---

## 9. Estados de Transição

```
Criação
    │
    ├─→ [pendente] ← Status inicial
    │
    ├─→ RH/DP avalia
    │
    ├─→ [aprovado] ← Aprovado com data em aprovado_em
    │
    └─→ [rejeitado] ← Rejeitado com data em aprovado_em
```

---

## 10. KPIs Possíveis para Yelly Silva

```SQL
-- Resumo consolidado
SELECT 
  'Yelly Silva' as colaborador,
  COUNT(DISTINCT id) as total_movimentacoes,
  COUNT(DISTINCT data) as dias_com_movimento,
  SUM(CASE WHEN tipo = 'credito' AND status = 'aprovado' THEN horas ELSE 0 END) as total_creditos_aprovados,
  SUM(CASE WHEN tipo = 'debito' AND status = 'aprovado' THEN horas ELSE 0 END) as total_debitos_aprovados,
  COUNT(CASE WHEN status = 'pendente' THEN 1 END) as registros_pendentes,
  MAX(data) as ultima_movimentacao,
  DATE_TRUNC('month', CURRENT_DATE)::DATE as mes_referencia
FROM public.banco_horas
WHERE funcionario_nome = 'Yelly Silva';
```

