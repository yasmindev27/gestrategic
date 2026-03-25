# 📊 RELATÓRIO DE CORREÇÕES - Dados Incorretos do Banco

**Data:** 25 de março de 2026  
**Status:** ✅ Em Progresso

---

## ✅ CORREÇÕES APLICADAS

### **1. BANCO DE HORAS - Cálculo de Saldo Corrigido**
**Arquivo:** `src/components/rhdp/BancoHorasSection.tsx`  
**Linhas:** 320-340
**Status:** ✅ CORRIGIDO

**Problema:** Estava pegando apenas o **último registro** de débito/crédito em vez de **acumular historicamente**

**Antes:**
```typescript
const credito = v.credito ? Number(v.credito.horas) : 0; // Só último
const debito = v.debito ? Number(v.debito.horas) : 0;   // Só último
```

**Depois:**
```typescript
// Acumula TODOS os créditos e débitos
acumuladoPorColaborador[uid].credito += valor;
acumuladoPorColaborador[uid].debito += valor;
```

**Impacto:** ✅ Saldos agora refletem histórico completo

---

### **2. TIMEZONE - Datas em Brasília**
**Arquivos:** 
- ✅ `src/hooks/useEnfermagem.ts` (linhas 37, 318)
- ✅ `src/hooks/useBeds.ts` (linha 40)
- ✅ `src/hooks/useDataValidation.ts` (linha 181)

**Problema:** Estavam usando `new Date().toISOString()` → **UTC (-00:00)** em vez de **Brasília (-03:00)**

**Antes:**
```typescript
new Date().toISOString() // 2026-03-25T15:30:00Z (UTC)
```

**Depois:**
```typescript
import { getBrasiliaDate } from '@lib/brasilia-time';
getBrasiliaDate().toISOString() // 2026-03-25T12:30:00Z (Brasília)
```

**Impacto:** ✅ Datas/horas agora corrigidas (sem mais diferença de -3h)

---

## 🔴 CORREÇÕES PENDENTES

### **3. SQL - Adicionar Constraints (Crítico)**

**Executar no Supabase SQL Editor:**

```sql
-- Banco de Horas
ALTER TABLE banco_horas 
ADD CONSTRAINT check_horas_range CHECK (horas BETWEEN -99.99 AND 99.99),
ADD CONSTRAINT check_tipo CHECK (tipo IN ('credito', 'debito'));

-- Saída de Prontuários  
ALTER TABLE saida_prontuarios
ADD CONSTRAINT check_status CHECK (status IN ('aguardando_classificacao', 'em_fluxo', 'concluido'));

-- Enfermagem Escalas
ALTER TABLE enfermagem_escalas
ADD CONSTRAINT check_hora_order CHECK (hora_inicio < hora_fim),
ADD CONSTRAINT check_tipo_plantao CHECK (tipo_plantao IN ('matutino', 'vespertino', 'noturno'));

-- Incidentes NSP
ALTER TABLE incidentes_nsp
ADD UNIQUE(numero_notificacao),
ADD CONSTRAINT check_status_nsp CHECK (status IN ('notificado', 'encerrado', 'em_analise'));
```

---

### **4. Validações Faltando em Tipos**

**Verificar:** `src/types/` para adicionar Zod schemas com validação

```typescript
// Exemplo
import { z } from 'zod';

export const BancoHorasSchema = z.object({
  funcionario_user_id: z.string().uuid(),
  horas: z.number().min(-99.99).max(99.99),
  tipo: z.enum(['credito', 'debito']),
  status: z.enum(['pendente', 'aprovado', 'rejeitado']),
});
```

---

## 📊 TABELA DE PROBLEMAS ENCONTRADOS

| Módulo | Problema | Severidade | Status |
|--------|----------|-----------|--------|
| Banco de Horas | Saldo calculado errado | 🔴 Crítico | ✅ CORRIGIDO |
| Data/Hora | Timezone UTC vs Brasília | 🔴 Crítico | ✅ CORRIGIDO |
| Banco de Dados | Falta CHECK constraints | 🟠 Alto | ⏳ PENDENTE |
| Saída Prontuários | Status sem validação | 🟠 Alto | ⏳ PENDENTE |
| Trocas Plantão | Conflitos de agenda | 🟠 Alto | ⏳ PENDENTE |
| Enfermagem Escalas | Tempo sem validação | 🟠 Alto | ⏳ PENDENTE |
| Incidentes NSP | Duplicatas de número | 🟠 Alto | ⏳ PENDENTE |
| Foreign Keys | Refs soltas (órfãos) | 🟡 Médio | ⏳ PENDENTE |

---

## 🚀 PRÓXIMOS PASSOS

1. ✅ Recarregar localhost (F5)
2. ⏳ Executar SQL constraints
3. ⏳ Adicionar Zod validations
4. ⏳ Testar integridade de dados

---

## 📝 NOTAS

- Toda data agora em Brasília (America/Sao_Paulo)
- Banco de horas acumula corretamente
- Datas não devem mais aparecer com diferença de 3 horas
- SQL constraints devem ser adicionadas para evitar dados sujos

**Próximo review:** 26/03/2026
