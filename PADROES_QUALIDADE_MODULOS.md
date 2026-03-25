# 📊 Análise de Padrões de Qualidade por Módulo

> **Período:** 24 de março de 2026  
> **Objetivo:** Identificar componentes e oportunidades para aplicação de padrões de qualidade: formatação de datas, empty states, toast notifications, status tooltips

---

## 📚 Padrões Disponíveis no Sistema

### 1. **Formatação de Datas** (`src/lib/date-formatter.ts`)
- `formatDateTime()` - DD/MM/YYYY HH:mm
- `formatDate()` - DD/MM/YYYY
- `formatTime()` - HH:mm
- `formatDateTimeRelative()` - Descrição textual (ex: "sexta-feira, 21 de março às 14:30")
- `formatDateShort()` - DD/MM
- `isValidDate()` - Validação de datas ISO 8601

### 2. **Empty States** (`src/components/shared/EmptyState.tsx` e `src/components/ui/empty-state.tsx`)
- `EmptyState()` - Genérico com ícone, título e descrição
- `EmptyPendencies()` - Específico para pendências/tarefas
- `EmptyData()` - Específico para dados/tabelas
- `EmptySearchResults()` - Específico para buscas sem resultados

### 3. **Status Badges** (`src/components/ui/status-badge.tsx`)
- Tipos: success, warning, error, info, pending, processing, default
- Com ícones dinâmicos e animação para "processing"
- Mapeamento automático de status > visual

### 4. **Toast Notifications** (Sonner + `use-toast` hook)
- Integrado com Sonner para mensagens não-bloqueantes
- Tipos: success, error, warning, info, loading

### 5. **Loading/Skeleton States**
- `LoadingState` - Estado de carregamento com spinner
- `TableSkeleton`, `CardGridSkeleton`, `FormSkeleton` - Skeletons específicos

---

## 🏥 **MÓDULO 1: RH/DP** (`src/components/rhdp/`)

### Componentes Identificados

| # | Arquivo | Responsabilidade | Estado Atual |
|---|---------|------------------|-------------|
| 1 | `BancoHorasSection.tsx` | Gerenciamento de banco de horas, saldos, históricos | ⚠️ Parcial |
| 2 | `CentralAtestadosSection.tsx` | Registro, validação e acompanhamento de atestados | ⚠️ Parcial |
| 3 | `AprovacaoJustificativasHoras.tsx` | Fluxo de aprovação de justificativas de horas | ❌ Ausente |
| 4 | `JustificativaPontoSection.tsx` | Justificativas de faltas e atrasos | ⚠️ Parcial |
| 5 | `TrocasPlantcoesHistorico.tsx` | Histórico de trocas de plantão | ❌ Ausente |
| 6 | `MovimentacoesDisciplinarSection.tsx` | Movimentações e processos disciplinares | ⚠️ Parcial |
| 7 | `AvaliacaoDesempenhoSection.tsx` | Avaliações de desempenho | ⚠️ Parcial |
| 8 | `FormularioDialog.tsx` | Dialog reutilizável para formulários | ✅ OK |

### 🎯 Oportunidades de Melhoria

### **1. BancoHorasSection.tsx** ⚠️
**Localização:** [src/components/rhdp/BancoHorasSection.tsx](src/components/rhdp/BancoHorasSection.tsx)

**Melhorias Recomendadas:**
- ✅ Usar `formatDateTime()` em todas as datas da tabela (campo `created_at`, `data`)
- ✅ Adicionar `EmptyPendencies()` quando `registros.length === 0`
- ✅ Usar `StatusBadge` para Campo `tipo` (entrada/saída/ajuste)
- ✅ Adicionar Tooltip com `formatDateTimeRelative()` ao passar mouse em datas
- ✅ Melhorar loading state com `LoadingState` ao buscar dados

**Exemplo de Implementação:**
```tsx
// Antes
<TableCell>{registro.data}</TableCell>
<TableCell>{registro.tipo}</TableCell>

// Depois
<TableCell>
  <Tooltip content={formatDateTimeRelative(registro.data)}>
    {formatDate(registro.data)}
  </Tooltip>
</TableCell>
<TableCell>
  <StatusBadge 
    status={getTipoStatus(registro.tipo)}
    label={registro.tipo}
  />
</TableCell>
```

---

### **2. CentralAtestadosSection.tsx** ⚠️
**Localização:** [src/components/rhdp/CentralAtestadosSection.tsx](src/components/rhdp/CentralAtestadosSection.tsx)

**Melhorias Recomendadas:**
- ✅ `formatDate()` para `data_inicio` e `data_fim`
- ✅ `StatusBadge` para campo `status` (ativo/vencido/pendente)
- ✅ Tooltip mostrando `dias_afastamento` ao passar mouse em datas
- ✅ `EmptyState` com título "Nenhum atestado registrado"
- ✅ Toast ao criar/atualizar/deletar atestado

**Métricas:**
- Campo `dias_afastamento` → badge com número
- Campo `status` → status visual (success/warning/error)

---

### **3. AprovacaoJustificativasHoras.tsx** ❌
**Localização:** [src/components/rhdp/AprovacaoJustificativasHoras.tsx](src/components/rhdp/AprovacaoJustificativasHoras.tsx)

**Melhorias Recomendadas:**
- ✅ Adicionar Toasts: aprovação/rejeição/pendência
- ✅ `StatusBadge` para "Aprovado", "Pendente", "Rejeitado"
- ✅ `formatTime()` para horários de trabalho
- ✅ Skeleton loading enquanto busca justificativas
- ✅ `EmptyState` "Nenhuma justificativa pendente"

---

### **4. TrocasPlantcoesHistorico.tsx** ❌
**Localização:** [src/components/rhdp/TrocasPlantcoesHistorico.tsx](src/components/rhdp/TrocasPlantcoesHistorico.tsx)

**Melhorias Recomendadas:**
- ✅ `formatDateTime()` em datas de solicitação/aprovação
- ✅ `StatusBadge` para status da troca (pendente/aprovado/rejeitado)
- ✅ Toast notifications em ações
- ✅ `EmptyState` quando sem trocas
- ✅ Tooltips com histórico de pagadores/recebedores

---

## 🧴 **MÓDULO 2: ROUPARIA** (`src/components/rouparia/`)

### Componentes Identificados

| # | Arquivo | Responsabilidade | Estado Atual |
|---|---------|------------------|-------------|
| 1 | `RoupariaEstoque.tsx` | Visualização e gerenciamento de estoque | ⚠️ Parcial |
| 2 | `RoupariaMovimentacao.tsx` | Registro de entradas, saídas, devoluções | ⚠️ Parcial |
| 3 | `RoupariaCategorias.tsx` | Gestão de categorias e limites mínimos | ❌ Ausente |
| 4 | `RoupariaRelatorios.tsx` | Relatórios analíticos de consumo/perdas | ❌ Ausente |

### 🎯 Oportunidades de Melhoria

### **1. RoupariaEstoque.tsx** ⚠️
**Localização:** [src/components/rouparia/RoupariaEstoque.tsx](src/components/rouparia/RoupariaEstoque.tsx)

**Melhorias Recomendadas:**
- ✅ Status visual para nível de estoque (crítico/baixo/normal/alto)
- ✅ `EmptyState` "Nenhum item no estoque" com icon Package
- ✅ Toast ao criar/atualizar item
- ✅ Badge para "Estoque Mínimo Atingido" in red
- ✅ Formatar quantidade com separadores (ex: "1.250 peças")

**Alerta Visual:**
```tsx
// Status do Estoque
- Crítico (< estoque_minimo): StatusBadge "error"
- Baixo (entre minimo e minimo*1.5): StatusBadge "warning"  
- Normal: StatusBadge "success"
```

---

### **2. RoupariaMovimentacao.tsx** ⚠️
**Localização:** [src/components/rouparia/RoupariaMovimentacao.tsx](src/components/rouparia/RoupariaMovimentacao.tsx)

**Melhorias Recomendadas:**
- ✅ `formatDateTime()` em `created_at` (campo de data/hora)
- ✅ `StatusBadge` para `tipo_movimentacao` (entrada/saída/devolução/ajuste)
- ✅ Tooltip mostrando diferença: `quantidade_anterior → quantidade_nova`
- ✅ Toast ao registrar movimentação com sucesso/erro
- ✅ `EmptyState` sem movimentações: "Nenhuma movimentação registrada"
- ✅ Formatar quantidades com cores: entrada (verde), saída (vermelho), ajuste (amarelo)

**Exemplo:**
```tsx
// Cores por tipo
Entrada: StatusBadge("success", "Entrada")
Saída: StatusBadge("warning", "Saída")
Devolução: StatusBadge("info", "Devolução")
Ajuste: StatusBadge("default", "Ajuste")
```

---

### **3. RoupariaCategorias.tsx** ❌
**Localização:** [src/components/rouparia/RoupariaCategorias.tsx](src/components/rouparia/RoupariaCategorias.tsx)

**Melhorias Recomendadas:**
- ✅ `StatusBadge` para categorias ativas/inativas
- ✅ Toast ao criar/editar categoria
- ✅ `EmptyState` "Nenhuma categoria criada"
- ✅ Validação visual de limites mínimos
- ✅ Tabela com itens por categoria e status

---

### **4. RoupariaRelatorios.tsx** ❌
**Localização:** [src/components/rouparia/RoupariaRelatorios.tsx](src/components/rouparia/RoupariaRelatorios.tsx)

**Melhorias Recomendadas:**
- ✅ `formatDate()` para períodos em filtros
- ✅ Gráficos com tooltips formatadas
- ✅ `EmptyState` "Nenhum dado para o período selecionado"
- ✅ Toast ao exportar relatório
- ✅ Status badges para tendências (↑ aumento, ↓ redução, → estável)

---

## 📋 **MÓDULO 3: GERÊNCIA** (`src/components/gerencia/`)

### Componentes Identificados

| # | Arquivo | Responsabilidade | Estado Atual |
|---|---------|------------------|-------------|
| 1 | `GestaoTalentos.tsx` | Dashboard de colaboradores, pendências, métricas | ⚠️ Parcial |
| 2 | `LancamentoNotas.tsx` | Lançamento de avaliações e notas | ❌ Ausente |
| 3 | `PlanoDesenvolvimentoSection.tsx` | Planos de desenvolvimento individual (PDI) | ❌ Ausente |
| 4 | `ImportDataDialog.tsx` | Importação de dados em lote | ⚠️ Parcial |

### 🎯 Oportunidades de Melhoria

### **1. GestaoTalentos.tsx** ⚠️
**Localização:** [src/components/gerencia/GestaoTalentos.tsx](src/components/gerencia/GestaoTalentos.tsx)

**Melhorias Recomendadas:**
- ✅ `formatDate()` em `data_inicio` e `data_fim` de capacitações/PDI
- ✅ `formatTime()` em horários de treinamento
- ✅ `StatusBadge` para status de capacitação (em progresso/concluída/vencida)
- ✅ `StatusBadge` para PDI (pendente/em progresso/concluída)
- ✅ Toast ao atualizar status de desenvolvimento
- ✅ Tooltip ao passar mouse em Avatar mostrando: "Cargo: X | Setor: Y | Saldo Horas: Z"
- ✅ Cores para badges de pendências (vencidos em vermelho, próximos em amarelo)
- ✅ `EmptySearchResults()` quando filtro não encontra colaboradores
- ✅ Progress bar visual para progresso de capacitações

**Badges Específicos:**
```tsx
- Capacitação Vencida: StatusBadge("error", "Prazo Vencido")
- Capacitação em Progresso: StatusBadge("processing", "Em Progresso")
- PDI Pendente: StatusBadge("warning", "PDI Pendente")
- BH Crédito: StatusBadge("success", "+5h30 crédito")
- BH Débito: StatusBadge("error", "-2h15 débito")
```

---

### **2. LancamentoNotas.tsx** ❌
**Localização:** [src/components/gerencia/LancamentoNotas.tsx](src/components/gerencia/LancamentoNotas.tsx)

**Melhorias Recomendadas:**
- ✅ `formatDateTime()` em data de lançamento
- ✅ Toast ao salvar nota
- ✅ `StatusBadge` para "Salvo", "Pendente", "Revisão"
- ✅ `EmptyState` "Nenhuma nota para lançar"
- ✅ Tooltip com histórico de alterações
- ✅ Validação em tempo real com feedback visual

---

### **3. PlanoDesenvolvimentoSection.tsx** ❌
**Localização:** [src/components/gerencia/PlanoDesenvolvimentoSection.tsx](src/components/gerencia/PlanoDesenvolvimentoSection.tsx)

**Melhorias Recomendadas:**
- ✅ `formatDate()` em datas início/fim do PDI
- ✅ `StatusBadge` para status do PDI (não iniciado/em progresso/concluído/atrasado)
- ✅ Tooltip com próximos marcos e prazos
- ✅ Toast ao marcar PDI como concluído
- ✅ Progress bar visual para completude
- ✅ `EmptyState` "Nenhum PDI criado"

---

### **4. ImportDataDialog.tsx** ⚠️
**Localização:** [src/components/gerencia/ImportDataDialog.tsx](src/components/gerencia/ImportDataDialog.tsx)

**Melhorias Recomendadas:**
- ✅ Toast com contador: "3 de 50 registros importados"
- ✅ `StatusBadge` para status da importação (processando/sucesso/erro)
- ✅ TableSkeleton durante importação
- ✅ Toast de erro com linha específica do erro
- ✅ Summary final com badges (✅ 45 sucesso, ❌ 5 erro)

---

## 💰 **MÓDULO 4: FATURAMENTO** (`src/components/faturamento/`)

### Componentes Identificados

| # | Arquivo | Responsabilidade | Estado Atual |
|---|---------|------------------|-------------|
| 1 | `DashboardFaturamento.tsx` | Dashboard com listas de saída, faltantes, métricas | ⚠️ Parcial |

**Nota:** Este módulo atualmente tem apenas 1 componente principal. Recomenda-se expandir a estrutura.

### 🎯 Oportunidades de Melhoria

### **1. DashboardFaturamento.tsx** ⚠️
**Localização:** [src/components/faturamento/DashboardFaturamento.tsx](src/components/faturamento/DashboardFaturamento.tsx)

**Melhorias Recomendadas:**
- ✅ `formatDateTime()` em `data_atendimento` (campo data/hora)
- ✅ `formatDate()` em periódos de filtro e datas de saída
- ✅ `StatusBadge` para status de saída (pendente/processando/finalizado/erro)
- ✅ `StatusBadge` para status de avaliação (não iniciada/em avaliação/finalizada)
- ✅ Toast ao finalizar saída
- ✅ `EmptyState` "Nenhuma saída registrada"
- ✅ Tooltip com histórico de avaliadores em campo "Avaliador"
- ✅ Tabela com cores para status (verde = ok, vermelho = faltante)
- ✅ Filtro por data usando `formatDate()` em placeholders
- ✅ Skeleton loading enquanto busca saídas

**Status Mapping:**
```tsx
- Pendente: StatusBadge("warning", "Pendente")
- Processando: StatusBadge("processing", "Processando")
- Finalizado: StatusBadge("success", "Finalizado")
- Erro/Faltante: StatusBadge("error", "Faltante")
- Avaliação Finalizada: StatusBadge("success", "Avaliado")
- Avaliação Pendente: StatusBadge("warning", "Aguardando")
```

---

## 📊 Resumo Executivo

### Status Geral

```
╔════════════════════════════════════════════════════════════════╗
║ MÓDULO          │ COMPONENTES │ IMPLEMENTADOS │ PENDENTES      ║
╠════════════════════════════════════════════════════════════════╣
║ RH/DP           │      8      │       3 (37%) │    5 (63%)     ║
║ Rouparia        │      4      │       2 (50%) │    2 (50%)     ║
║ Gerência        │      4      │       1 (25%) │    3 (75%)     ║
║ Faturamento     │      1      │       0 (0%)  │    1 (100%)    ║
╠════════════════════════════════════════════════════════════════╣
║ TOTAL           │     17      │       6 (35%) │   11 (65%)     ║
╚════════════════════════════════════════════════════════════════╝
```

### Prioridade de Implementação (ordem recomendada)

| Prioridade | Componente | Impacto | Esforço | Score |
|:---:|---|---|---|---|
| 🔴 **P1** | `BancoHorasSection.tsx` | ⭐⭐⭐⭐⭐ | ⌚⌚ | 4.5 |
| 🔴 **P1** | `DashboardFaturamento.tsx` | ⭐⭐⭐⭐⭐ | ⌚⌚⌚ | 4.0 |
| 🟡 **P2** | `RoupariaMovimentacao.tsx` | ⭐⭐⭐⭐ | ⌚⌚ | 4.0 |
| 🟡 **P2** | `GestaoTalentos.tsx` | ⭐⭐⭐⭐ | ⌚⌚⌚ | 3.8 |
| 🟡 **P2** | `CentralAtestadosSection.tsx` | ⭐⭐⭐ | ⌚⌚ | 3.5 |
| 🟢 **P3** | `AprovacaoJustificativasHoras.tsx` | ⭐⭐⭐ | ⌚⌚ | 3.3 |
| 🟢 **P3** | `PlanoDesenvolvimentoSection.tsx` | ⭐⭐⭐ | ⌚⌚⌚ | 3.0 |

---

## 🚀 Próximos Passos

### 1. **Criar Task para cada P1** (Hoje)
   - [ ] Implementar padrões em `BancoHorasSection.tsx`
   - [ ] Implementar padrões em `DashboardFaturamento.tsx`

### 2. **Documentar Guia de Estilo** (Esta semana)
   - [ ] Criar componente template reutilizável
   - [ ] Documentar mapa de cores por status
   - [ ] Criar exemplos de usar date-formatter

### 3. **Criar Componentes Faltantes** (Próximas sprints)
   - [ ] `LancamentoNotas.tsx` (Gerência)
   - [ ] `PlanoDesenvolvimentoSection.tsx` (Gerência)
   - [ ] Expandir módulo Faturamento com componentes específicos

---

## 📁 Estrutura de Arquivos Recomendada

Para uniformidade, criar utilitários específicos por módulo:

```
src/
├── lib/
│   ├── date-formatter.ts ✅ (já existe)
│   ├── status-mappers.ts 🆕 (status para cores/ícones)
│   └── toast-utils.ts 🆕 (helper para notificações)
│
├── hooks/
│   ├── use-toast.ts ✅ (já existe)
│   └── use-dates.ts 🆕 (formatadores como hook)
│
└── components/
    ├── ui/
    │   ├── status-badge.tsx ✅
    │   ├── empty-state.tsx ✅
    │   └── skeleton-loader.tsx ✅
    │
    └── rhdp/ / rouparia/ / gerencia/ / faturamento/
        └── (aplicar padrões em cada componente)
```

---

**Criado em:** 24 de março de 2026  
**Próxima Review:** Após implementação de P1
