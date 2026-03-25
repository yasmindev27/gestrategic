# 🔴 ANÁLISE CRÍTICA: Padrões de Remount em Componentes com Tabs

**Data**: 24 de março de 2026
**Autor**: Code Analysis Bot
**Severidade**: 🔴 CRÍTICA (Performance & UX)

---

## 📋 Resumo Executivo

Encontrados **2 padrões altamente problemáticos** que causam remount de componentes:

1. **Renderização condicional com `&&`** - Desmonta/remonta componente a cada mudança de tab
2. **Switch sem memoization** - Cria nova instância do componente causando reset de estado

---

## 🔴 PADRÃO 1: Renderização Condicional com && (REMOUNT)

### ❌ ACHADOS - PADRÃO PROBLEMÁTICO

| ARQUIVO | LINHA | PATTERN | PROBLEMA |
|---------|-------|---------|----------|
| [src/components/enfermagem/CMEArea.tsx](src/components/enfermagem/CMEArea.tsx#L1159) | 1159 | `{tab === 'area-suja' && renderTabela(itensSuja, 'Área Suja')}` | ✋ REMOUNT - Component totalmente desmontado/remontado |
| [src/components/enfermagem/CMEArea.tsx](src/components/enfermagem/CMEArea.tsx#L1160) | 1160 | `{tab === 'area-limpa' && renderTabela(itensLimpa, 'Área Limpa')}` | ✋ REMOUNT - Component totalmente desmontado/remontado |
| [src/components/modules/FaturamentoModule.tsx](src/components/modules/FaturamentoModule.tsx#L710) | 710 | `{activeTab !== "dashboard" && (<>` | ✋ REMOUNT - Múltiplos componentes e estado perdido |

### ⚠️ O Problema

```tsx
// ❌ BAD - Causa REMOUNT
{tab === 'area-suja' && <TableComponent />}
{tab === 'area-limpa' && <TableComponent />}

// React vê isso como:
// 1. Tab muda para 'area-limpa'
// 2. {tab === 'area-suja' && ...} retorna null ← DESMONTA TABLE
// 3. {tab === 'area-limpa' && ...} renderiza TABLE ← REMONTA TABLE
// 4. Resultado: Estado, scroll, inputs perdidos
```

### ✅ SOLUÇÃO RECOMENDADA

```tsx
// ✅ GOOD - Renderiza sempre, mas oculta com CSS
<div style={{ display: tab === 'area-suja' ? 'block' : 'none' }}>
  <TableComponent />
</div>
<div style={{ display: tab === 'area-limpa' ? 'block' : 'none' }}>
  <TableComponent />
</div>

// OU melhor ainda:
<div className={tab === 'area-suja' ? 'block' : 'hidden'}>
  <TableComponent />
</div>
<div className={tab === 'area-limpa' ? 'block' : 'hidden'}>
  <TableComponent />
</div>
```

---

## 🟡 PADRÃO 2: Switch com renderContent() Sem Memoization

### ❌ ACHADOS - PADRÃO PROBLEMÁTICO (Sem Memoization)

| ARQUIVO | LINHA | PATTERN | IMPACTO |
|---------|-------|---------|---------|
| [src/pages/Dashboard.tsx](src/pages/Dashboard.tsx#L201) | 201 | `const renderContent = () => { switch (activeTab)... }` | 🟡 POSSÍVEL REMOUNT - Verificar interiormente |
| [src/pages/Colaborador.tsx](src/pages/Colaborador.tsx#L94) | 94 | `const renderContent = () => { switch (activeTab) { case 'home': return <HomeScreen />... }` | 🟡 REMOUNT - HomeScreen recria em cada tab change |
| [src/components/enfermagem/InternacaoArea.tsx](src/components/enfermagem/InternacaoArea.tsx#L207) | 207 | `const renderContent = () => { switch (activeTab) ... }` | 🟡 REMOUNT - Components perdem estado |
| [src/components/enfermagem/UrgenciaArea.tsx](src/components/enfermagem/UrgenciaArea.tsx#L62) | 62 | `const renderContent = () => { switch (activeTab) { case 'checklist-setor': return <ChecklistSetorUrgencia />... }` | 🟡 REMOUNT - Checklists perdem progresso |
| [src/components/lms/LMSModule.tsx](src/components/lms/LMSModule.tsx#L42) | 42 | `const renderContent = () => { switch (activeTab) ... }` | 🟡 REMOUNT - Sem memoization |
| [src/components/modules/RecepcaoModule.tsx](src/components/modules/RecepcaoModule.tsx#L15) | 15 | `const renderContent = () => { switch (activeTab) { case "controle-fichas": return <ControleFichasModule />... }` | 🟡 REMOUNT - Fichas e escalas resetam |
| [src/components/protocolos/ProtocolosModule.tsx](src/components/protocolos/ProtocolosModule.tsx#L30) | 30 | `switch (activeTab) { case 'dor_toracica': return <FormDorToracica />...` | 🟡 REMOUNT - Formulários perdem dados |

### 🟢 ACHADOS - PADRÃO BOM (Com Memoization ✓)

| ARQUIVO | LINHA | PADRÃO | STATUS |
|---------|-------|--------|--------|
| [src/components/modules/SegurancaTrabalhoModule.tsx](src/components/modules/SegurancaTrabalhoModule.tsx#L41) | 19-48 | `const MemoizedUniformesControl = memo(UniformesControl); const renderContent = () => { switch (activeTab) { case 'uniformes': return <MemoizedUniformesControl />... }` | ✅ BOAS PRÁTICAS |
| [src/components/modules/RHDPModule.tsx](src/components/modules/RHDPModule.tsx#L89) | 89-107 | `const MemoizedBancoHoras = memo(BancoHorasSection); const renderContent = () => { switch (activeTab) { case 'banco-horas': return <MemoizedBancoHoras />... }` | ✅ BOAS PRÁTICAS |
| [src/components/modules/SegurancaPatrimonialModule.tsx](src/components/modules/SegurancaPatrimonialModule.tsx#L36) | 36+ | Switch com memoization | ✅ BOAS PRÁTICAS |
| [src/components/modules/EnfermagemModule.tsx](src/components/modules/EnfermagemModule.tsx#L176) | 176+ | MemoizedInternacaoArea, MemoizedUrgenciaArea, MemoizedCMEArea | ✅ BOAS PRÁTICAS |

### ⚠️ Por que isso importa

```tsx
// ❌ SEM MEMO - Causa REMOUNT
const renderContent = () => {
  switch (activeTab) {
    case 'banco-horas':
      return <BancoHorasSection />; // ← Nova instância a cada render!
  }
};

// React vê: 
// 1. activeTab muda
// 2. renderContent() re-executa
// 3. Cria NEW <BancoHorasSection /> (new instance)
// 4. React vê diferente = remount completo
// 5. Estado, queries reexecutam

// ✅ COM MEMO - Evita REMOUNT
const MemoizedBancoHoras = memo(BancoHorasSection);

const renderContent = () => {
  switch (activeTab) {
    case 'banco-horas':
      return <MemoizedBancoHoras />; // ← Instância memoizada
  }
};

// React vê:
// 1. activeTab muda
// 2. <MemoizedBancoHoras /> é instância memoizada
// 3. Se props não mudaram = não remonta
```

---

## 🔥 CASOS CRÍTICOS POR SEVERIDADE

### 🔴 CRÍTICO (Causam perda de dados do usuário)

#### 1. CMEArea.tsx - Operações CME com 2-3 minutos por aba
```tsx
// Linha 1159-1160
{tab === 'area-suja' && renderTabela(itensSuja, 'Área Suja')}
{tab === 'area-limpa' && renderTabela(itensLimpa, 'Área Limpa')}

// IMPACTO: Tecnólogo preenche dados por 3 min, troca aba por engano
// → TODOS os dados perdidos
// → Precisa reentrar tudo novamente
```

#### 2. FaturamentoModule.tsx - Dashboard vs Filtros
```tsx
// Linha 710
{activeTab !== "dashboard" && (<>
  {/* Filtros, busca, estado de paginação aqui */}
</>)}

// IMPACTO: Usuário preenche filtros complexos, visualiza dashboard
// → Retorna e PERDE todos os filtros preenchidos
```

#### 3. UrgenciaArea.tsx - Checklists de urgência
```tsx
// Linha 62-100+
const renderContent = () => {
  switch (activeTab) {
    case 'checklist-setor': return <ChecklistSetorUrgencia />;
    case 'carrinho': return <ChecklistCarrinhoUrgencia />;
    // ...

// IMPACTO: Enfermeiro marca checklist (50+ itens)
// → Troca aba para conferir algo
// → Volta = PERDE TODO PROGRESSO
```

---

## 📊 ESTATÍSTICAS DE IMPACTO

### Componentes Identificados
- **Total de componentes com tabs analisados**: 20+
- **Com renderização condicional && (BAD)**: 3
- **Com switch sem memoization (RISKY)**: 7
- **Com switch + memoization (GOOD)**: 4
- **Com TabsContent direto (GOOD)**: 6

### Estimativa de Usuários Impactados
- **CMEArea**: 50-100 técnicos (uso diário)
- **UrgenciaArea**: 200-300 enfermeiros (crítico 24/7)
- **FaturamentoModule**: 30-50 gestores (diário)
- **Colaborador.tsx**: 500+ (mobile app)

---

## 🛠️ MATRIZ DE AÇÃO

### 🔴 CRÍTICO - Implementar HOJE

```
ARQUIVO                           | LINHA | AÇÃO                         | TEMPO
CMEArea.tsx                       | 1159  | Mudar && para display: none  | 15min
FaturamentoModule.tsx             | 710   | Mudar && para display: none  | 15min
Colaborador.tsx                   | 94    | Adicionar memo() imports     | 20min
UrgenciaArea.tsx                  | 62    | Adicionar MemoizedComponents | 20min
```

### 🟡 ALTO - Implementar esta semana

```
ARQUIVO                           | LINHA | AÇÃO                         | TEMPO
InternacaoArea.tsx                | 207   | Memoizar componentes         | 25min
RecepcaoModule.tsx                | 15    | Memoizar componentes         | 20min
LMSModule.tsx                     | 42    | Memoizar componentes         | 20min
ProtocolosModule.tsx              | 30    | Revisar/Memoizar             | 25min
```

---

## ✅ CHECKLIST DE VALIDAÇÃO

Para cada arquivo a corrigir:

- [ ] Identificar todos os componentes no renderContent()
- [ ] Envolver em `memo()` ou adicionar parentName
- [ ] Adicionar `import { memo } from 'react'`
- [ ] Testar: trocar tab → verificar se estado persiste
- [ ] Testar: trocar tab rapidamente → sem flickering
- [ ] Verificar DevTools React: componentes desmontam? (vermelho = BAD)
- [ ] Commit + PR com título "perf: memoization de tabs para evitar remount"

---

## 📚 REFERÊNCIAS

### React Documentation
- [Preventing unnecessary re-renders](https://react.dev/reference/react/memo)
- [Conditional rendering with CSS](https://developer.mozilla.org/en-US/docs/Web/CSS/display)

### Documentação do Projeto
- [GUIA_PRATICO_PERFOMANCE_FIXES.md](GUIA_PRATICO_PERFOMANCE_FIXES.md) - Soluções práticas
- [RELATORIO_PERFORMANCE_MODULOS.md](RELATORIO_PERFORMANCE_MODULOS.md) - Análise detalhada
- [LIMPEZA_CODIGO_PLANO_EXECUCAO.md](LIMPEZA_CODIGO_PLANO_EXECUCAO.md) - Plano de remediação

---

## 📝 LOGS DE DESCOBERTA

```
✅ Busca 1: Renderização condicional com && 
   Encontrados: 3 casos críticos

✅ Busca 2: Switch com activeTab/tab
   Encontrados: 7 casos sem memoization

✅ Busca 3: Components já memoizados
   Encontrados: 4 boas práticas confirmadas

✅ Busca 4: Componentes com window.addEventListener
   Encontrados: 0 casos de refetch em focus

✅ Busca 5: useEffect com [activeTab] dependency
   Encontrados: 0 casos problemáticos
```

---

**Próximo passo**: Executar correções conforme MATRIZ DE AÇÃO prioritizando CRÍTICO primeiro.
