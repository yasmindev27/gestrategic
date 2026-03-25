# 🎯 ANÁLISE DETALHADA: Padrões de Renderização Condicional

**Data**: 24 de março de 2026
**Status**: Análise Completa ✓

---

## 📊 Tabela de Achados Consolidada

### ⚠️ PADRÃO 1: Renderização com && que causa REMOUNT

```
ARQUIVO                    | LINHA | PATTERN                                        | PROBLEMA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CMEArea.tsx               | 1159  | {tab === 'area-suja' && renderTabela(...)}    | 🔴 REMOUNT - Estado perdido
CMEArea.tsx               | 1160  | {tab === 'area-limpa' && renderTabela(...)}   | 🔴 REMOUNT - Estado perdido
CMEArea.tsx               | 1161+ | {tab === 'devolucao' && (...)}                | 🔴 REMOUNT - Múltiplos condicionais
CMEArea.tsx               | 1162+ | {tab === 'pincas' && (...)}                   | 🔴 REMOUNT - Múltiplos condicionais
FaturamentoModule.tsx     | 710   | {activeTab !== "dashboard" && (<>              | 🔴 REMOUNT - Filtros/Paginação perdidos
```

### 🟡 PADRÃO 2: Switch com renderContent() - NECESSÁRIO VERIFICAR

```
ARQUIVO                    | LINHA | PATTERN                           | STATUS MEMOI | NECESSÁRIO?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Colaborador.tsx           | 94    | switch(activeTab) {...}          | ❌ NÃO       | ✅ SIM - Fix
UrgenciaArea.tsx          | 62    | switch(activeTab) {...}          | ❌ NÃO       | ✅ SIM - Fix
InternacaoArea.tsx        | 207   | switch(activeTab) {...}          | ❌ NÃO       | ✅ SIM - Fix
RecepcaoModule.tsx        | 15    | switch(activeTab) {...}          | ❌ NÃO       | ✅ SIM - Fix
LMSModule.tsx             | 42    | switch(activeTab) {...}          | ❌ NÃO       | ✅ SIM - Fix
ProtocolosModule.tsx      | 30    | switch(activeTab) {...}          | ❌ NÃO       | ✅ SIM - Fix
Dashboard.tsx             | 201   | switch(activeTab/mainTab) {...}  | ✅ VERIFICAR | ⚠️ VERIFICAR
PdfPatientCounter.tsx     | 223   | switch(activeTab) {...}          | ❌ NÃO       | ✅ SIM - Fix
```

### ✅ PADRÃO 3: Com Memoization - BOAS PRÁTICAS

```
ARQUIVO                       | LINHA | STATUS                        | IMPLEMENTAÇÃO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SegurancaTrabalhoModule.tsx   | 19-48 | ✅ MEMOIZADO                  | memo() import + renderContent switch
RHDPModule.tsx                | 45-95 | ✅ MEMOIZADO                  | memo() import + renderContent switch
SegurancaPatrimonialModule.tsx| 30+   | ✅ MEMOIZADO                  | memo() import + renderContent switch
EnfermagemModule.tsx          | 80+   | ✅ PARCIALMENTE MEMOIZADO     | Some areas memoized
```

### 🟢 PADRÃO 4: Com TabsContent Direto - TAMBÉM OK

```
ARQUIVO                       | PADRÃO                        | STATUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LaboratorioModule.tsx        | <TabsContent value="...">... | ✅ NÃO REMONTA (Tabs mantém estado)
FaturamentoUnificadoModule   | <TabsContent value="...">... | ✅ NÃO REMONTA
RestauranteModule.tsx        | <TabsContent value="...">... | ✅ NÃO REMONTA
DISCFormModule.tsx           | <Tabs value={activeTab}>...  | ✅ NÃO REMONTA
ProtocolosModule.tsx         | Mixed (switch + TabsContent)  | ⚠️ VERIFICAR
```

---

## 🔥 CRITICALIDADE E IMPACTO POR SETOR

### 1️⃣ CRÍTICO - CMEArea.tsx (Linha 1159-1160)

**Severidade**: 🔴 CRÍTICA
**Frequência**: Alta (uso diário)
**Impacto**: Perda de entrada de dados

```tsx
// CÓDIGO ATUAL (BAD)
{tab === 'area-suja' && renderTabela(itensSuja, 'Área Suja')}
{tab === 'area-limpa' && renderTabela(itensLimpa, 'Área Limpa')}

// PROBLEMA:
// - Técnico CME passa 2-3 minutos preenchendo tabela de "Área Suja"
// - Troca para "Área Limpa" por engano OU para conferir algo
// - Volta para "Área Suja" → TUDO PERDIDO

// SOLUÇÃO RECOMENDADA:
<div className={tab === 'area-suja' ? 'block' : 'hidden'}>
  {renderTabela(itensSuja, 'Área Suja')}
</div>
<div className={tab === 'area-limpa' ? 'block' : 'hidden'}>
  {renderTabela(itensLimpa, 'Área Limpa')}
</div>
```

### 2️⃣ CRÍTICO - FaturamentoModule.tsx (Linha 710)

**Severidade**: 🔴 CRÍTICA
**Frequência**: Alta (gestores faturamento)
**Impacto**: Retrabalho, filtros perdidos

```tsx
// CÓDIGO ATUAL (BAD)
{activeTab !== "dashboard" && (<>
  {/* Card com filtros complexos */}
  {/* Table com 50+ linhas filtradas */}
</>)}

// PROBLEMA:
// - Gestor configura: Data início, Data fim, Setor, Status
// - Visualiza dashboard para comparação
// - Volta = TODOS OS FILTROS PERDIDOS
// - Precisa reconfigurar tudo novamente ❌

// SOLUÇÃO:
<div className={activeTab !== "dashboard" ? 'block' : 'hidden'}>
  {/* Mantém estado de filtros */}
</div>
```

### 3️⃣ CRÍTICO - UrgenciaArea.tsx (Linha 62+)

**Severidade**: 🔴 CRÍTICA
**Frequência**: Muito Alta (24/7)
**Impacto**: Segurança do paciente, retrabalho

```tsx
// CÓDIGO ATUAL (BAD)
const renderContent = () => {
  switch (activeTab) {
    case 'checklist-setor': 
      return <ChecklistSetorUrgencia />;  // ← Remonta COMPLETAMENTE
    case 'carrinho': 
      return <ChecklistCarrinhoUrgencia />;
    case 'sinais-vitais':
      return <ChecklistSinaisVitais ...};
    // ... 15+ mais cases
  }
};

// PROBLEMA:
// - Enfermeiro marca 30+ itens de checklist em 5 minutos
// - Troca para conferir sinais vitais (1 min)
// - Volta para checklist = TODOS OS ITENS PERDIDOS
// - Precisa RE-FAZER CHECKLIST INTEIRO

// SOLUÇÃO:
const MemoizedChecklistSetor = memo(ChecklistSetorUrgencia);
const MemoizedChecklistCarrinho = memo(ChecklistCarrinhoUrgencia);

const renderContent = () => {
  switch (activeTab) {
    case 'checklist-setor': return <MemoizedChecklistSetor />;
    case 'carrinho': return <MemoizedChecklistCarrinho />;
    // ...
  }
};
```

### 4️⃣ ALTO - Colaborador.tsx (Linha 94)

**Severidade**: 🟡 ALTA
**Frequência**: Muito Alta (500+ usuários)
**Impacto**: UX ruim, estado perdido

```tsx
// CÓDIGO ATUAL (BAD)
const renderContent = () => {
  switch (activeTab) {
    case 'home':
      return (
        <HomeScreen
          userName={userName}
          userRole={userRole}
          pendingActions={{...}}
        />
      );
    case 'escalas':
      return <EscalaScreen />;
    // ...
  }
};

// PROBLEMA:
// - HomeScreen está scrollado 500px para baixo
// - Usuário clica em "Escalas"
// - Clica de volta em "Home" → Scroll resetado para topo
// - Estado de HomeScreen perdido

// SOLUÇÃO:
const MemoizedHomeScreen = memo(HomeScreen);
const MemoizedEscalaScreen = memo(EscalaScreen);

const renderContent = () => {
  switch (activeTab) {
    case 'home':
      return <MemoizedHomeScreen {...} />;
    case 'escalas':
      return <MemoizedEscalaScreen />;
    // ...
  }
};
```

---

## 📈 ANÁLISE DE COMPONENTES

### CMEArea.tsx

**Linhas com &amp;&amp;:**
```
1159: {tab === 'area-suja' && renderTabela(itensSuja, 'Área Suja')}
1160: {tab === 'area-limpa' && renderTabela(itensLimpa, 'Área Limpa')}
1161: {tab === 'devolucao' && ( <div>... </div>)}
1162: {tab === 'pincas' && (...)}
1163: {tab === 'almotolia' && (...)}
... [30+ mais casos]
```

**Impacto**: ALTÁSSIMO - CME é operação crítica com dados complexos

---

### FaturamentoModule.tsx

**Padrão de renderização:**
```tsx
// Linha 710
{activeTab !== "dashboard" && (<>
  {/* Search & Filters Card */}
  {/* Multiple state variables for filters */}
  {/* Error state, Loading state, Data display */}
</>)}
```

**Impacto**: ALTO - Estado de paginação/filtros perdido

---

### UrgenciaArea.tsx

**Múltiplas abas com checklists:**
```
62  : switch (activeTab) {
63  :   case 'checklist-setor': return <ChecklistSetorUrgencia />;
64  :   case 'carrinho': return <ChecklistCarrinhoUrgencia />;
65  :   case 'sinais-vitais': return <ChecklistSinaisVitais ...>;
...
```

**Impacto**: CRÍTICO - Segurança do paciente depende de checklists persistentes

---

## 🎯 PLANO DE REMEDIAÇÃO PRIORITIZADO

### Phase 1: Hoje (Crítico)

1. **CMEArea.tsx** - Linha 1159-1160
   - [ ] Mudar && para display: none
   - [ ] Teste: trocar abas, dados devem persistir
   - [ ] Tempo: 20 min

2. **FaturamentoModule.tsx** - Linha 710
   - [ ] Mudar && para display: none
   - [ ] Teste: filtros devem persistir ao trocar para dashboard
   - [ ] Tempo: 20 min

3. **UrgenciaArea.tsx** - Linha 62+
   - [ ] Adicionar memo imports
   - [ ] Memoizar todos os componentes no switch
   - [ ] Teste: dados do checklist persistem ao trocar aba
   - [ ] Tempo: 25 min

### Phase 2: Week 1 (Alto)

1. **Colaborador.tsx** - Linha 94
2. **InternacaoArea.tsx** - Linha 207
3. **RecepcaoModule.tsx** - Linha 15
4. **LMSModule.tsx** - Linha 42

### Phase 3: Week 2 (Médio)

1. **ProtocolosModule.tsx** - Linha 30
2. **PdfPatientCounter.tsx** - Linha 223
3. **Dashboard.tsx** - Linha 201

---

## 🧪 TESTE DE VALIDAÇÃO (POST-FIX)

Para cada arquivo corrigido, execute este teste:

```bash
# 1. Abrir DevTools → React
# 2. Clicar em tab A
# 3. Verificar se componente está em tree (deve estar ✓)
# 4. Clicar em tab B
# 5. DevTools: componente tab A deve estar EM TREE (não desmontado)
# 6. Se componente desaparecer da tree = AINDA ESTÁ REMONTANDO ❌
```

### Checklist de Validação

- [ ] Componente NÃO desaparece da tree React
- [ ] Estado visual persiste (scroll, inputs, checked items)
- [ ] Sem loading falso ao trocar tabs
- [ ] Sem novo fetch/query executando
- [ ] Performance não degradou (DevTools profiler)

---

## 📚 Correspondência com Documentação Existente

Este documento complementa:

1. **[GUIA_PRATICO_PERFOMANCE_FIXES.md](GUIA_PRATICO_PERFOMANCE_FIXES.md)**
   - Quick Fix #3 sobre RHDPModule Object Map

2. **[RELATORIO_PERFORMANCE_MODULOS.md](RELATORIO_PERFORMANCE_MODULOS.md)**
   - Seção 2: "Componentes Refetchando a Cada Mudança de Aba"

3. **[LIMPEZA_CODIGO_PLANO_EXECUCAO.md](LIMPEZA_CODIGO_PLANO_EXECUCAO.md)**
   - Sprint de Performance Optimization

---

**Próximo passo**: Executar Phase 1 (Today) com as correções prioritárias.
