# 📊 MATRIZ DE IMPLEMENTAÇÃO - RESUMO EXECUTIVO

**Status em:** 24 de março de 2026  
**Objetivo:** Visão consolidada de onde aplicar cada padrão

---

## 🎯 MATRIZ PRINCIPAL

### RH/DP Module

| Componente | Arquivo | Formatação Datas | Empty State | Status Badge | Toast | Tooltip | Skeleton | Prioridade |
|:---|:---|:---:|:---:|:---:|:---:|:---:|:---:|---|
| **BancoHorasSection** | BancoHorasSection.tsx | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🔴 P1 |
| **CentralAtestados** | CentralAtestadosSection.tsx | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 P2 |
| **AprovacaoJustificativas** | AprovacaoJustificativasHoras.tsx | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ | 🟢 P3 |
| **TrocasPlantoes** | TrocasPlantcoesHistorico.tsx | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟢 P3 |
| **MovimentacoesDisciplinar** | MovimentacoesDisciplinarSection.tsx | ✅ | ⚠️ | ✅ | ⚠️ | ⚠️ | ⚠️ | 🟢 P3 |
| **AvaliacaoDesempenho** | AvaliacaoDesempenhoSection.tsx | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | 🟡 P2 |

**Legenda:** ✅ Alto impacto | ⚠️ Médio impacto | ❌ Não necessário

---

### Rouparia Module

| Componente | Arquivo | Formatação Datas | Empty State | Status Badge | Toast | Tooltip | Skeleton | Prioridade |
|:---|:---|:---:|:---:|:---:|:---:|:---:|:---:|---|
| **RoupariaEstoque** | RoupariaEstoque.tsx | ⚠️ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 P2 |
| **RoupariaMovimentacao** | RoupariaMovimentacao.tsx | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 P2 |
| **RoupariaCategorias** | RoupariaCategorias.tsx | ⚠️ | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | 🟢 P3 |
| **RoupariaRelatorios** | RoupariaRelatorios.tsx | ✅ | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | 🟢 P3 |

---

### Gerência Module

| Componente | Arquivo | Formatação Datas | Empty State | Status Badge | Toast | Tooltip | Skeleton | Prioridade |
|:---|:---|:---:|:---:|:---:|:---:|:---:|:---:|---|
| **GestaoTalentos** | GestaoTalentos.tsx | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 P2 |
| **LancamentoNotas** | LancamentoNotas.tsx | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟢 P3 |
| **PlanoDesenvolvimento** | PlanoDesenvolvimentoSection.tsx | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | 🟢 P3 |
| **ImportDataDialog** | ImportDataDialog.tsx | ⚠️ | ✅ | ✅ | ✅ | ⚠️ | ✅ | 🟢 P3 |

---

### Faturamento Module

| Componente | Arquivo | Formatação Datas | Empty State | Status Badge | Toast | Tooltip | Skeleton | Prioridade |
|:---|:---|:---:|:---:|:---:|:---:|:---:|:---:|---|
| **DashboardFaturamento** | DashboardFaturamento.tsx | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🔴 P1 |

---

## 📋 O QUE IMPLEMENTAR EM CADA COMPONENTE

### 🔴 PRIORIDADE 1 (Esta semana)

#### 1️⃣ BancoHorasSection.tsx
**Padrões:** Todas → formatação de datas + empty states + status badges + toasts

```
✅ Formatação:
  - campo `data` → formatDate()
  - campo `created_at` → formatDateTime()
  
✅ Empty State:
  - Quando registros.length === 0
  - Icon: Clock, Título: "Nenhum banco de horas"
  
✅ Status Badges:
  - campo `tipo`: entrada (success), saída (warning), ajuste (info)
  
✅ Toast:
  - Ao criar: "X horas registradas em {data}"
  - Ao deletar: "Registro removido"
  
✅ Tooltips:
  - Passar mouse em data mostra formatação completa
```

#### 2️⃣ DashboardFaturamento.tsx  
**Padrões:** Todas → formatação + empty states + status badges + toasts + skeleton

```
✅ Formatação:
  - campo `data_atendimento` → formatDate()
  - filtros de período → formatDate()
  
✅ Empty State:
  - Quando saidas.length === 0
  - Icon: FileText, Título: "Nenhuma saída registrada"
  
✅ Status Badges:
  - campo `status`: 
    * pendente (warning)
    * processando (processing)
    * finalizado (success)
    * erro (error)
  
✅ Toast:
  - Ao finalizar: "Saída prontuário finalizada"
  - Ao atualizar: "Status atualizado para {novo_status}"
  
✅ Skeleton:
  - TableSkeleton(5,4) enquanto isLoading=true
```

---

### 🟡 PRIORIDADE 2 (Próximas 2 semanas)

#### 3️⃣ CentralAtestadosSection.tsx
```
✅ Formatação:
  - data_inicio, data_fim → formatDate()
  - created_at → formatDateTime()
  - Tooltip mostra periodo completo
  
✅ Status Badge:
  - status: ativo (success), vencido (error), pendente (warning)
  
✅ Empty State:
  - "Nenhum atestado registrado"
  
✅ Toast:
  - Criar: "Atestado registrado para {funcionário}"
  - Deletar: "Atestado removido"
```

#### 4️⃣ GestaoTalentos.tsx
```
✅ Formatação:
  - Capacitações: data_inicio, data_fim → formatDate()
  - PDI: data_inicio, data_fim → formatDate()
  - Tooltip mostra status + dias restantes
  
✅ Status Badges:
  - Capacitação: em progresso (processing), concluída (success), vencida (error)
  - PDI: pendente (warning), em progresso (processing), concluída (success)
  - Saldo BH: crédito (success) ou débito (error)
  
✅ Empty State:
  - Sem colaboradores: "Nenhum colaborador encontrado"
  - Sem pendências: "Todas as tarefas em dia"
```

#### 5️⃣ RoupariaEstoque.tsx
```
✅ Status Badge:
  - Nível de estoque:
    * Crítico (< minimo): error
    * Baixo (minimo < x < minimo*1.5): warning
    * Normal: success
  
✅ Empty State:
  - "Nenhum item no estoque"
  
✅ Toast:
  - Criar: "Item {descricao} adicionado"
  - Atualizar quantidade: "Estoque atualizado"
```

#### 6️⃣ RoupariaMovimentacao.tsx
```
✅ Formatação:
  - created_at → formatDateTime()
  - Tooltip mostra: {"quantidade": "200 → 350"}
  
✅ Status Badge:
  - tipo_movimentacao:
    * Entrada: success
    * Saída: warning
    * Devolução: info
    * Ajuste: default
  
✅ Toast:
  - "Movimentação registrada: {tipo} de {quantidade} peças"
```

---

### 🟢 PRIORIDADE 3 (Próximo mês)

#### 7️⃣ AprovacaoJustificativasHoras.tsx
```
✅ Status Badge:
  - Aprovado (success)
  - Pendente (warning)
  - Rejeitado (error)
  
✅ Toast:
  - Aprovação: "Justificativa aprovada"
  - Rejeição: "Justificativa rejeitada"
```

#### 8️⃣ PlanoDesenvolvimentoSection.tsx
```
✅ Formatação:
  - data_inicio, data_fim → formatDate()
  
✅ Status Badge:
  - Não iniciado, Em progresso, Concluído, Atrasado
  
✅ Progress Bar:
  - Visual representation de completitude
```

#### 9️⃣ LancamentoNotas.tsx
```
✅ Toast ao salvar nota
✅ Status Badge para status de lançamento
```

#### 🔟 RoupariaCategorias.tsx & RoupariaRelatorios.tsx
```
✅ Expansão de funcionalidades com padrões
```

---

## 📁 ESTRUTURA DE PASSOS

### Passo 1: Setup (30 min)
```bash
# Verificar se os utilitários existem (já existem!)
✅ src/lib/date-formatter.ts
✅ src/components/ui/status-badge.tsx
✅ src/components/ui/empty-state.tsx
✅ src/components/ui/skeleton-loader.tsx
✅ src/hooks/use-toast.ts
```

### Passo 2: P1 (BancoHoras + Faturamento)
**Tempo estimado:** 4-6 horas cada

```tsx
// Passo 2a: Refatorar componente
// Passo 2b: Adicionar imports
// Passo 2c: Implementar padrões
// Passo 2d: Testar visualmente
// Passo 2e: PR review
```

### Passo 3: P2 (4 componentes)
**Tempo estimado:** 2-3 horas cada

### Passo 4: P3 (5+ componentes)
**Tempo estimado:** 1-2 horas cada

---

## 🚀 SCRIPT DE IMPLEMENTAÇÃO RÁPIDA

Para cada componente, seguir este template:

```tsx
// 1. IMPORTS
import { formatDate, formatDateTime } from '@/lib/date-formatter';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyData } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/ui/loading-state';
import { TableSkeleton } from '@/components/ui/skeleton-loader';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// 2. TYPES
interface ComponentData {
  id: string;
  date_field: string;
  status_field: string;
  // ...
}

// 3. HELPERS
function getStatusType(status: string): StatusType {
  // mapping logic
}

// 4. COMPONENT
export const ComponentName = memo(() => {
  const { toast } = useToast();
  const [data, setData] = useState<ComponentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 5. RENDER STATES
  if (isLoading) return <TableSkeleton />;
  if (data.length === 0) return <EmptyData />;
  
  return (
    <Table>
      {data.map(item => (
        <TableRow key={item.id}>
          {/* Use formatDate, StatusBadge, Tooltip */}
        </TableRow>
      ))}
    </Table>
  );
});
```

---

## 📊 MÉTRICAS PÓS-IMPLEMENTAÇÃO

Após completar P1 + P2, esperamos:

| Métrica | Alvo |
|---|---|
| Consistência de formatação de datas | 100% |
| Empty states implementados | 90%+ |
| Status badges visuais | 85%+ |
| Toast notifications | 80%+ |
| Skeleton loaders | 75%+ |
| Satisfação de UX | ↑ 30-40% |

---

## 📌 NEXT STEPS

1. **Hoje:** Revisar e importar este documento
2. **Amanhã:** Iniciar P1 → BancoHoras
3. **Semana 1:** Completar BancoHoras + Faturamento
4. **Semana 2-3:** P2 components
5. **Semana 4+:** P3 components + expansão de novos módulos

---

**Documento atualizado:** 24 de março de 2026
