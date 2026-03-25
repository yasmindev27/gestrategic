# Investigação: Estrutura e Dados do Banco de Horas

## Resumo Executivo

Realizei uma investigação completa dos arquivos Supabase relacionados ao `banco_horas`, incluindo:
- Estrutura da tabela no banco de dados
- Formato de armazenamento de nomes de usuários
- Como os dados são populados
- Procura por registros de Yelly Silva

---

## 1. Estrutura da Tabela `banco_horas`

**Arquivo de origem:** [supabase/migrations/20260116124942_3f69e3f7-8b7a-4e05-834a-e29b4c5eb046.sql](supabase/migrations/20260116124942_3f69e3f7-8b7a-4e05-834a-e29b4c5eb046.sql)

### Campos da Tabela:

```sql
CREATE TABLE public.banco_horas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_user_id UUID NOT NULL,
  funcionario_nome TEXT NOT NULL,           -- ← FORMATO DO NOME
  data DATE NOT NULL,
  tipo TEXT NOT NULL,                       -- 'credito' ou 'debito'
  horas NUMERIC(5,2) NOT NULL,
  motivo TEXT,
  observacao TEXT,
  registrado_por UUID NOT NULL,
  aprovado_por UUID,
  aprovado_em TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pendente',  -- Estados: 'pendente', 'aprovado', 'rejeitado'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

---

## 2. Formato do Nome do Usuário

### Especificação:
- **Campo:** `funcionario_nome` (TEXT NOT NULL)
- **Tipo:** Texto simples (sem formatação especial)
- **Tamanho:** Não limitado (TEXT = ilimitado no PostgreSQL)

### Exemplos de Uso no Código:

#### Em [src/components/rhdp/BancoHorasSection.tsx](src/components/rhdp/BancoHorasSection.tsx):
- **Linha 600-610:** Importação de dados externos com busca de perfil por nome
  ```typescript
  const profile = profiles.find(p => 
    p.full_name.toUpperCase() === nome  // Comparação case-insensitive
  );
  ```

- **Linha 637-670:** Inserção no banco com nome do perfil
  ```typescript
  const { error } = await supabase.from("banco_horas").insert({
    funcionario_user_id: profile.user_id,
    funcionario_nome: profile.full_name,  // ← Nome armazenado conforme perfil
    data: dataFormatted,
    tipo,
    horas,
    motivo: String(row["Motivo"] || row["motivo"] || "") || null,
    status: "aprovado",
  });
  ```

#### Em [src/components/colaborador/mobile/HorasScreen.tsx](src/components/colaborador/mobile/HorasScreen.tsx):
- **Linha 59-70:** Busca por nome do funcionário
  ```typescript
  const { data: horas } = await supabase
    .from('banco_horas')
    .select('*')
    .eq('funcionario_nome', userName)  // ← Busca exata por nome
    .order('data', { ascending: false });
  ```

---

## 3. Como o Banco de Horas é Populado

### 3.1. Migração SQL (Criação)
**Arquivo:** [supabase/migrations/20260116124942_3f69e3f7-8b7a-4e05-834a-e29b4c5eb046.sql](supabase/migrations/20260116124942_3f69e3f7-8b7a-4e05-834a-e29b4c5eb046.sql)
- Define a estrutura da tabela
- Habilita RLS (Row Level Security)
- Cria políticas de acesso

### 3.2. Importação de Dados - Dois Formatos Suportados

#### Formato 1: Interno (Simples)
**Campos esperados:**
- `Colaborador` ou `Funcionário`
- `Data`
- `Tipo` (contém 'créd' ou 'cred' → 'credito', caso contrário → 'debito')
- `Horas`
- `Motivo` (opcional)
- `Observação` (opcional)

**Função:** [src/components/rhdp/BancoHorasSection.tsx](src/components/rhdp/BancoHorasSection.tsx) - `handleImport()`

#### Formato 2: Sistema Externo (Saldo Final)
**Campos esperados:**
- `Matricula`
- `Funcionario`
- `Saldo Final` (em formato HH:MM)
- `Data Final`
- `Tipo de saldo`

**Característica:** Busca por matrícula primeiro, depois por nome

**Detecção automática:** [src/components/rhdp/BancoHorasSection.tsx](src/components/rhdp/BancoHorasSection.tsx) - linha 556
```typescript
const isBancoHorasExternalFormat = (row: Record<string, unknown>): boolean => {
  return "Saldo Final" in row || "Funcionario" in row || "Matricula" in row;
};
```

### 3.3. Método de Inserção Manual
**Componente:** [src/components/rhdp/BancoHorasSection.tsx](src/components/rhdp/BancoHorasSection.tsx) - `handleSubmit()`

Permite registrar crédito ou débito manualmente selecionando:
- Colaborador (dropdown com todos os perfis)
- Data
- Tipo (Crédito / Débito)
- Horas (decimal)
- Motivo
- Observação

---

## 4. Busca por Yelly Silva

### Resultados:

#### 4.1. Procura em Migrations SQL
❌ **Resultado:** Nenhum registro de "Yelly" encontrado em arquivos SQL de migração

#### 4.2. Procura em Arquivos de Importação
**Arquivo:** [supabase/migrations/import_data_2026-03-19.sql](supabase/migrations/import_data_2026-03-19.sql)
- Contém: Fornecedores, Notas fiscais, DRE entries, Invoices
- ❌ **Resultado:** Nenhuma referência a "Yelly" ou "banco_horas"

#### 4.3. Procura em Código TypeScript/TSX
❌ **Resultado:** Nenhuma referência hardcoded a "Yelly" em código de teste ou fixture

#### 4.4. Arquivos SQL Exportados
**Arquivo:** [public/banco-completo-export.sql](public/banco-completo-export.sql) (3073 linhas)
- Define tabela: ✅ Sim
- Define políticas RLS: ✅ Sim
- Contém dados: ❌ Não (somente schema e funções)

### Conclusão Sobre Yelly:
**Não existem registros pré-carregados para Yelly Silva** na base de dados ou em arquivos de seed/teste. Os dados devem ser criados:
1. Manualmente via interface web
2. Via importação de arquivo Excel
3. Via inserção SQL direta

---

## 5. Formato Esperado do Nome para Yelly Silva

Para criar um registro para Yelly Silva, o `funcionario_nome` seria armazenado exatamente como:
```
Yelly Silva
```

### Variações Possíveis:
- **Case-sensitive em buscas simples:** `funcionario_nome = 'Yelly Silva'` (exato)
- **Case-insensitive no código:** O código usa `.toUpperCase()` para comparações
- **Sem espaços extras:** O código faz `.trim()`

### Exemplo de Query:
```sql
SELECT * FROM banco_horas 
WHERE funcionario_nome = 'Yelly Silva'
ORDER BY data DESC;
```

---

## 6. Fluxo Completo de um Registro

```
1. Usuário cria perfil (profiles)
   └─ full_name = "Yelly Silva"

2. RH/DP registra horas manualmente OU importa de Excel
   └─ Busca o perfil por nome
   
3. Dados inseridos em banco_horas:
   ├─ funcionario_user_id: UUID do perfil
   ├─ funcionario_nome: "Yelly Silva"
   ├─ data: YYYY-MM-DD
   ├─ tipo: "credito" ou "debito"
   ├─ horas: decimal (ex: 2.50)
   ├─ status: "pendente" (começa aqui)
   
4. RH/DP aprova/rejeita
   └─ status muda para "aprovado" ou "rejeitado"
   └─ aprovado_por e aprovado_em preenchidos

5. Colaborador visualiza via [src/components/colaborador/mobile/HorasScreen.tsx](src/components/colaborador/mobile/HorasScreen.tsx)
   └─ Busca: WHERE funcionario_nome = 'Yelly Silva'
```

---

## 7. Arquivos Relacionados Encontrados

### Componentes de Interface:
- [src/components/rhdp/BancoHorasSection.tsx](src/components/rhdp/BancoHorasSection.tsx) - Gerenciamento completo (RH/DP)
- [src/components/colaborador/mobile/HorasScreen.tsx](src/components/colaborador/mobile/HorasScreen.tsx) - Visualização do colaborador
- [src/components/rhdp/AprovacaoJustificativasHoras.tsx](src/components/rhdp/AprovacaoJustificativasHoras.tsx) - Aprovação de justificativas
- [src/components/rhdp/JustificativaDeHorasHistorico.tsx](src/components/rhdp/JustificativaDeHorasHistorico.tsx) - Histórico

### Hooks/Consultas:
- [src/hooks/useBancoHorasKPIs.ts](src/hooks/useBancoHorasKPIs.ts) - KPIs e estatísticas
- [src/components/gerencia/GestaoTalentos.tsx](src/components/gerencia/GestaoTalentos.tsx) - Dashboard de talentos (inclui banco_horas)

### Tipos/Definições:
- [src/types/global.ts](src/types/global.ts) - Linha 42: `export type BancoHoras = Tables["banco_horas"]["Row"];`

### Migrations SQL:
- [supabase/migrations/20260116124942_3f69e3f7-8b7a-4e05-834a-e29b4c5eb046.sql](supabase/migrations/20260116124942_3f69e3f7-8b7a-4e05-834a-e29b4c5eb046.sql) - Criação da tabela

### Exports SQL:
- [public/banco-completo-export.sql](public/banco-completo-export.sql) - Definição completa do schema
- [public/rls-functions-triggers-export.sql](public/rls-functions-triggers-export.sql) - Políticas e triggers

---

## 8. Políticas de Segurança (RLS)

**Arquivo:** [supabase/migrations/20260116124942_3f69e3f7-8b7a-4e05-834a-e29b4c5eb046.sql](supabase/migrations/20260116124942_3f69e3f7-8b7a-4e05-834a-e29b4c5eb046.sql)

```sql
-- RH_DP e Admin gerenciam banco_horas (completo acesso)
CREATE POLICY "RH_DP e Admin gerenciam banco_horas"
ON public.banco_horas FOR ALL
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'rh_dp'::app_role]));

-- Gestores veem horas de sua equipe
CREATE POLICY "Gestores visualizam banco_horas de sua equipe"
ON public.banco_horas FOR SELECT
USING (has_role(auth.uid(), 'gestor'::app_role) AND gestor_gerencia_usuario(auth.uid(), funcionario_user_id));

-- Funcionários veem suas próprias horas
CREATE POLICY "Funcionários visualizam próprio banco_horas"
ON public.banco_horas FOR SELECT
USING (funcionario_user_id = auth.uid());
```

---

## 9. Questões de Implementação - Considerações

### Se você precisa buscar por "Yelly":
1. **Busca exata:** `WHERE funcionario_nome = 'Yelly Silva'`
2. **Busca parcial:** `WHERE funcionario_nome ILIKE '%Yelly%'` (case-insensitive)
3. **Por UUID:** Se você tiver o `funcionario_user_id`, use: `WHERE funcionario_user_id = $1`

### Formato de data esperado:
- Entrada: DD/MM/YYYY, MM/DD/YY, ou numérico (Excel date code)
- Armazenado: YYYY-MM-DD

### Formato de horas:
- Pode ser: Decimal (2.5) ou Tempo (02:30)
- Armazenado: NUMERIC(5,2) - até 999 horas com 2 casas decimais

---

## Conclusão

A tabela `banco_horas` armazena nomes de usuários no campo `funcionario_nome` como texto simples, conforme fornecido no perfil do usuário (`profiles.full_name`). Para Yelly Silva, isso seria `"Yelly Silva"` exatamente como aparece no perfil. **Não existem registros pré-carregados** para este usuário; eles devem ser criados via importação ou inserção manual através da interface web.

