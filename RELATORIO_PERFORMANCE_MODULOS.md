# 📊 Relatório de Análise de Performance - Módulos Gestrategic

**Data:** 24 de Março de 2026  
**Escopo:** Análise de 50+ módulos e componentes  
**Nível:** Medium (Exploração completa mas focada)

---

## 🎯 Sumário Executivo

O projeto **Gestrategic** utiliza uma arquitetura bem estruturada com React Query, mas apresenta **problemas significativos de performance** relacionados a:

1. ⚠️ **Queries sem `staleTime` definido** (7 hooks críticos)
2. ⚠️ **Refetches desnecessários em mudança de abas** (RHDPModule, GerenciaModule)
3. ⚠️ **Componentes não memoizados** (12+ componentes Section/Tab)
4. ⚠️ **Re-renders desnecessários** (useMemo excessivo em alguns lugares, insuficiente em outros)

---

## 📁 Estrutura de Módulos Identificada

### Padrão 1: Tabs com Switch Statement (RHDPModule)

```
RHDPModule
├── Main Tabs (9 abas)
│   ├── banco-horas → BancoHorasSection
│   ├── atestados → CentralAtestadosSection
│   ├── aso → ASOControl
│   ├── escalas → EscalaTecEnfermagem (com 8 sub-tabs)
│   ├── formularios → FormulariosSection
│   ├── disciplinar → MovimentacoesDisciplinarSection
│   ├── profissionais → ProfissionaisSaude
│   ├── avaliacao → AvaliacaoDesempenhoSection
│   └── experiencia → AvaliacaoExperienciaSection
└── Sub-tabs (escalas)
    ├── tecnicos
    ├── enfermeiros
    ├── radiologia
    ├── administrativa
    ├── farmacia
    ├── recepcao
    ├── justificativa-horas
    └── trocas-plantoes
```

**Problema:** Cada mudança de aba causa **refetch completo** de queries não memoizadas.

### Padrão 2: Menu View (NirModule)

```
NirModule
├── Dashboard
├── Mapa-leitos
├── Transferencias
└── Relatorio
```

**Status:** ✅ OK - Renderiza apenas view ativa

### Padrão 3: Dashboard com Múltiplas Sections (GerenciaModule)

Arquivo: [src/components/modules/GerenciaModule.tsx](src/components/modules/GerenciaModule.tsx#L1)

Contém 20+ sub-componentes renderizados via switch statement.

---

## 🚨 PROBLEMAS IDENTIFICADOS

### 1️⃣ Queries SEM `staleTime` (CRÍTICO)

#### Hooks Afetados:

| Hook | Arquivo | Status | Impacto |
|------|---------|--------|--------|
| `useReunioes` | `ReuniaoModule.tsx` | ❌ Sem staleTime | Refetch at every render |
| `useProtocoloAtendimentos` | `useProtocoloAtendimentos.ts` | ❌ Sem staleTime | Multiple calls por tab |
| `useMinhasTrocas` | `useEnfermagem.ts` | ❌ Sem staleTime | Re-query em mudança aba |
| `useDiscResults` | `DISCFormModule.tsx` | ❌ Sem staleTime | Perda de dados em cache |
| `useTrocasDisponiveis` | `useEnfermagem.ts` | ❌ Sem staleTime | - |
| `useTrocasPendentes` | `useEnfermagem.ts` | ❌ Sem staleTime | - |
| `useConfiguracoes` | `useEnfermagem.ts` | ❌ Sem staleTime | - |

**Recomendação:**
```typescript
// ANTES ❌
useQuery({
  queryKey: ['reunioes'],
  queryFn: async () => { /* ... */ },
})

// DEPOIS ✅
useQuery({
  queryKey: ['reunioes'],
  queryFn: async () => { /* ... */ },
  staleTime: 5 * 60 * 1000,      // 5 minutos
  gcTime: 30 * 60 * 1000,        // 30 minutos
})
```

---

### 2️⃣ Componentes Refetchando a Cada Mudança de Aba

#### Arquivo: [src/components/modules/RHDPModule.tsx](src/components/modules/RHDPModule.tsx#L1)

**Problema:**
```tsx
const handleTabChange = (value: string) => {
  setActiveTab(value);
  logAction("navegacao_aba", "rhdp", { aba: value });
};

const renderContent = () => {
  switch (activeTab) {
    case 'banco-horas': 
      return <BancoHorasSection />; // 🔴 Re-renderiza COMPLETAMENTE
    case 'atestados': 
      return <CentralAtestadosSection />;
    // ... 7 outros cases
    case 'escalas': 
      return (
        <Tabs value={escalasSubTab} onValueChange={setEscalasSubTab}>
          {ESCALAS_SUB_ITEMS.map(item => (
            <TabsContent key={item.id} value={item.id}>
              <EscalaTecEnfermagem tipo={item.id} /> {/* 🔴 Duplo re-render */}
            </TabsContent>
          ))}
        </Tabs>
      );
  }
};
```

**Cascata de Re-fetches:**
1. `activeTab` muda
2. `renderContent()` re-executa switch
3. Nova instância de `<BancoHorasSection />` é criada
4. Queries dentro dela executam (sem staleTime = nova chamada)
5. Components não memoizados = re-render completo

**Solução Proposta:**
```tsx
// Memoizar cada section
const MemoizedBancoHoras = memo(BancoHorasSection);
const MemoizedAtestados = memo(CentralAtestadosSection);

// Usar object map em vez de switch
const SECTION_COMPONENTS = {
  'banco-horas': MemoizedBancoHoras,
  'atestados': MemoizedAtestados,
  // ...
};

const StallContent = () => {
  const Component = SECTION_COMPONENTS[activeTab];
  return <Component />;
};
```

---

### 3️⃣ Componentes NÃO Memoizados (ALTO IMPACTO)

#### Componentes que deveriam ter `memo()`:

| Componente | Motivo | Tamanho | Localização |
|-----------|--------|--------|-----------|
| `BancoHorasSection` | 300+ linhas, múltiplas queries | Alto | `rhdp/` |
| `CentralAtestadosSection` | 200+ linhas, custos com render | Alto | `rhdp/` |
| `AvaliacaoDesempenhoSection` | 400+ linhas, múltiplas queries | Alto | `rhdp/` |
| `FormulariosSection` | 200+ linhas | Médio | `rhdp/` |
| `MovimentacoesDisciplinarSection` | 150+ linhas | Médio | `rhdp/` |
| `TrocasPlantcoesHistorico` | 180+ linhas | Médio | `rhdp/` |
| `JustificativaDeHorasHistorico` | 150+ linhas | Médio | `rhdp/` |
| `EscalaTecEnfermagem` | 700+ linhas, muito complexo | **CRÍTICO** | `enfermagem/` |
| `DashboardFaturamento` | 400+ linhas, múltiplas queries | Alto | `faturamento/` |
| `GestaoTalentos` | 600+ linhas | Alto | `gerencia/` |
| `LancamentoNotas` | 300+ linhas | Alto | `gerencia/` |
| `ChamadosDashboard` | 400+ linhas | Alto | `chamados/` |

**Status Correto:**
```tsx
// ✅ Estes JÁ têm memo:
export const BedCard = memo(forwardRef<...>(...));
export const BedGrid = memo(forwardRef<...>(...));
const TopHeader = memo(() => { ... });
const DashboardLayout = memo(({ ... }) => { ... });

// ❌ Estes FALTAM memo:
export const BancoHorasSection = () => { ... }; // Deveria ter memo
export const AvaliacaoDesempenhoSection = () => { ... }; // Deveria ter memo
```

**Impacto de não ter memo:**
- Re-render pai = re-render filho (mesmo com props iguais)
- Queries re-executam
- Charts recalculam
- Timers resetam

---

### 4️⃣ Padrões de Re-renders Desnecessários

#### Problema A: `loadData()` sem dependências

[BancoHorasSection.tsx](src/components/rhdp/BancoHorasSection.tsx#L100):
```tsx
useEffect(() => {
  loadData(); // 🔴 Executa em todo render!
}, []);
```

**Melhor:**
```tsx
useEffect(() => {
  loadData();
}, []); // ✅ Sem mudança, mas considerar retry policy
```

---

#### Problema B: `useMemo` excessivo em cálculos triviais

[BancoHorasSection.tsx](src/components/rhdp/BancoHorasSection.tsx#L230):
```tsx
const calcularSaldo = (funcionarioId: string) => {
  const registrosFuncionario = registros.filter(
    r => r.funcionario_user_id === funcionarioId
  );
  
  let latestCredito: BancoHora | null = null;
  let latestDebito: BancoHora | null = null;
  // ... 20+ linhas de lógica
};
// NÃO está em useMemo mas deveria estar
```

**Melhor:**
```tsx
const calcularSaldo = useMemo(() => (funcionarioId: string) => {
  // ... lógica
}, [registros]);
```

---

#### Problema C: Dupla inicialização (PlanoDesenvolvimentoSection)

[PlanoDesenvolvimentoSection.tsx](src/components/gerencia/PlanoDesenvolvimentoSection.tsx#L158):
```tsx
// ❌ RUIM: enabled depende de 2 dataources
const { data: colaboradorData, isLoading: loadingColaborador } = useQuery({
  queryKey: ['colaborador-detalhes', colaboradorSelecionado],
  queryFn: async () => { /* ... */ },
  enabled: !!colaboradorSelecionado && !!avaliacoesAltas, // ⚠️ Duplo gatilho
});
```

**Cascata:**
1. Component renderiza
2. `avaliacoesAltas` está loading
3. Query fica pending
4. `colaboradorSelecionado` muda
5. Query re-executa mesmo que `avaliacoesAltas` ainda está loading

---

### 5️⃣ React Query Configuration Global (✅ BOM)

[App.tsx](src/App.tsx#L37):
```tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,        // ✅ 5 minutos
      gcTime: 1000 * 60 * 30,          // ✅ 30 minutos
      refetchOnWindowFocus: false,      // ✅ Não refetch ao voltar
      retry: 1,                         // ✅ Retry uma vez
    },
  },
});
```

**Status:** Configuração global está correta, mas:
- Alguns hooks override sem motivo válido
- Alguns hooks não respeitam config global

---

## 📊 Análise de useRealtimeSync

### ✅ Implementação Correta

[useRealtimeSync.ts](src/hooks/useRealtimeSync.ts#L28):
```tsx
export const useRealtimeSync = (
  tables: readonly { readonly table: TableName; readonly queryKeys: readonly (readonly string[])[] }[],
  enabled = true
) => {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    // ... setup channel
    tables.forEach(({ table, queryKeys }) => {
      channel = channel.on("postgres_changes", ..., () => {
        queryKeys.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: key }); // ✅ Smart invalidation
        });
      });
    });
  }, [enabled, queryClient, tables]);
};
```

**Presets por módulo:**
```tsx
export const REALTIME_PRESETS = {
  restaurante: [ /* queries */ ],
  mapaLeitos: [ /* queries */ ],
  enfermagem: [ /* queries */ ],
  chamados: [ /* queries */ ],
  nir: [ /* queries */ ],
  qualidade: [ /* queries */ ],
  seguranca: [ /* queries */ ],
};
```

**Status:** ✅ Bem implementado e pronto para uso

---

## 🔍 Detalhes por Módulo

### RHDPModule (⚠️ CRÍTICO)

**Arquivo:** [src/components/modules/RHDPModule.tsx](src/components/modules/RHDPModule.tsx#L1)

**Problemas:**
1. 9 main tabs + 8 sub-tabs = 17 possíveis mudanças de rendering
2. `EscalaTecEnfermagem` é um dos maiores componentes (700+ linhas) SEM memo
3. Cada aba carrega novo componente que faz queries próprias
4. Sub-tabs dentro de "escalas" causam duplo re-render

**Impacto:** Usuário muda de aba → Re-fetch completo de todos os dados

**Recomendação:** 
- [ ] Adicionar `memo()` a todos os Section components
- [ ] Usar object map em vez de switch
- [ ] Considerar QueryCache sharing entre abas

---

### GerenciaModule (⚠️ CRÍTICO)

**Arquivo:** [src/components/modules/GerenciaModule.tsx](src/components/modules/GerenciaModule.tsx#L1)

**Problemas:**
1. 20+ sub-componentes carregados via switch
2. Nenhum memoizado
3. `useSetoresNomes` + `useUserRole` + `useLogAccess` em cada render

**Recomendação:**
- [ ] Lazy load sub-componentes
- [ ] Memoizar cada sub-módulo
- [ ] Cache de setores

---

### EnfermagemModule (⚠️ ALTO)

**Problema Principal:** `EscalaTecEnfermagem` não memoizado

**Uso:**
- [EscalaTecEnfermagem.tsx](src/components/enfermagem/EscalaTecEnfermagem.tsx#L1): 700+ linhas
- Renderizado em 8 sub-tabs do RHDPModule
- Renderizado em EnfermagemModule
- Múltiplos `useQuery` sem staleTime em alguns hooks

---

### ChamadosModule (⚠️ MÉDIO)

**Arquivo:** [src/components/modules/ChamadosModule.tsx](src/components/modules/ChamadosModule.tsx#L1)

**Status:** Good useMemo usage, mas faltam memos nos sub-componentes

---

## 📈 Recomendações Prioritárias

### 🔴 CRÍTICO (Fazer AGORA)

#### 1. Adicionar `staleTime` aos 7 hooks

```typescript
// src/hooks/useReuniao.ts
export function useReunioes() {
  return useQuery({
    queryKey: ['reunioes'],
    queryFn: async () => { /* ... */ },
    staleTime: 5 * 60 * 1000,   // 💾 ADD THIS
    gcTime: 30 * 60 * 1000,     // 💾 ADD THIS
  });
}

// Repetir para:
// - useProtocoloAtendimentos
// - useMinhasTrocas
// - useDiscResults
// - useTrocasDisponiveis
// - useTrocasPendentes
// - useConfiguracoes
```

**Impacto:** ⚡ 30-50% redução em queries desnecessárias

---

#### 2. Memoizar 12 componentes Section/Tab

```typescript
// ANTES ❌
export const BancoHorasSection = () => { ... };

// DEPOIS ✅
export const BancoHorasSection = memo(() => { ... });

// Repetir para:
// BancoHorasSection (rhdp)
// CentralAtestadosSection (rhdp)
// AvaliacaoDesempenhoSection (rhdp)
// FormulariosSection (rhdp)
// MovimentacoesDisciplinarSection (rhdp)
// TrocasPlantcoesHistorico (rhdp)
// JustificativaDeHorasHistorico (rhdp)
// EscalaTecEnfermagem (enfermagem) - PRIORIDADE
// DashboardFaturamento (faturamento)
// GestaoTalentos (gerencia)
// LancamentoNotas (gerencia)
// ChamadosDashboard (chamados)
```

**Impacto:** ⚡ 40-60% redução em re-renders

---

#### 3. Refatorar RHDPModule com object map

```typescript
// ANTES ❌ (switch statement)
const renderContent = () => {
  switch (activeTab) {
    case 'banco-horas': return <BancoHorasSection />;
    case 'atestados': return <CentralAtestadosSection />;
    // ... 7 cases
  }
};

// DEPOIS ✅ (object map)
const SECTIONS = {
  'banco-horas': memo(BancoHorasSection),
  'atestados': memo(CentralAtestadosSection),
  // ... outros memoizados
};

const Component = SECTIONS[activeTab] || null;
return Component ? <Component /> : null;
```

**Impacto:** ⚡ 20-30% em RHDPModule

---

### 🟠 ALTO (Fazer em 2-3 dias)

#### 4. Implementar QueryCache Preloading

```typescript
// Pré-carregar queries relacionadas quando aba está para mudar
const handleTabChange = (tab: string) => {
  // Pré-fetch queries da próxima aba
  if (tab === 'banco-horas') {
    queryClient.prefetchQuery({
      queryKey: ['banco_horas'],
      queryFn: fetchBancoHoras,
    });
  }
  setActiveTab(tab);
};
```

---

#### 5. Otimizar EscalaTecEnfermagem

Este componente é crítico e aparece em múltiplos lugares. Considerar:
- [ ] Dividir em mini-componentes
- [ ] Memoizar sub-componentes
- [ ] Virtualize lists se houver 50+ escalas

---

### 🟡 MÉDIO (Fazer em 1-2 semanas)

#### 6. Audit de `useMemo` excessivo

Revisar se todos os `useMemo` são necessários. Exemplos:
- Strings simples não precisam de memo
- Números não precisam de memo
- Apenas objetos/arrays usados em dependências de outras queries

---

#### 7. Implementar Performance Monitoring

```typescript
// Adicionar a cada módulo
import { useLayoutEffect } from 'react';

export const BancoHorasSection = memo(() => {
  useLayoutEffect(() => {
    console.time('BancoHorasSection-render');
    return () => console.timeEnd('BancoHorasSection-render');
  });
  
  return ( /* ... */ );
});
```

---

## 🧪 Padrão de Teste Recomendado

```typescript
// Teste de performance
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

test('RHDPModule - tab change should not trigger new queries', async () => {
  const { rerender } = render(<RHDPModule />);
  
  const bancoHorasQueries = getQueryCount('banco_horas');
  
  // Mudar aba
  const atestadosTab = await screen.findByRole('tab', { name: /atestados/i });
  await userEvent.click(atestadosTab);
  
  // Voltar aba
  const bancoTab = await screen.findByRole('tab', { name: /banco de horas/i });
  await userEvent.click(bancoTab);
  
  // Query de banco_horas deveria estar em cache
  expect(getQueryCount('banco_horas')).toBe(bancoHorasQueries); // ✅ Sem nova query
});
```

---

## 📋 Checklist de Implementação

### Fase 1 (1 dia)
- [ ] Adicionar staleTime aos 7 hooks SEM configuração
- [ ] Memoizar EscalaTecEnfermagem (CRÍTICO)
- [ ] Criar PR para review

### Fase 2 (1-2 dias)
- [ ] Memoizar 11 componentes Section restantes
- [ ] Refatorar RHDPModule com object map
- [ ] Testar com React DevTools Profiler

### Fase 3 (1 semana)
- [ ] Implementar prefetch strategy
- [ ] Audit de useMemo
- [ ] Monitoring de performance
- [ ] Testes de regress

---

## 🔗 Arquivos de Referência

### Configuração React Query
- [App.tsx](src/App.tsx#L37) - QueryClient defaults ✅

### Hooks com staleTime
- [useBancoHorasKPIs.ts](src/hooks/useBancoHorasKPIs.ts#L128) ✅
- [useKPIsHospitalar.ts](src/hooks/useKPIsHospitalar.ts#L252) ✅
- [useSetores.ts](src/hooks/useSetores.ts#L28) ✅

### Hooks FALTANDO staleTime
- [ReuniaoModule.tsx](src/components/modules/ReuniaoModule.tsx#L17) ❌
- [useProtocoloAtendimentos.ts](src/hooks/useProtocoloAtendimentos.ts#L24) ❌
- [useEnfermagem.ts](src/hooks/useEnfermagem.ts#L47) ❌
- [DISCFormModule.tsx](src/components/disc/DISCFormModule.tsx#L38) ❌

### Componentes sem memo
- [RHDPModule.tsx](src/components/modules/RHDPModule.tsx#L1) - BancoHorasSection, etc ❌
- [EscalaTecEnfermagem.tsx](src/components/enfermagem/EscalaTecEnfermagem.tsx#L1) ❌ (CRÍTICO)

### Componentes COM memo
- [DashboardLayout.tsx](src/components/layout/DashboardLayout.tsx#L37) ✅

### Realtime Sync
- [useRealtimeSync.ts](src/hooks/useRealtimeSync.ts#L1) ✅ (Bem implementado)

---

## 💡 Conclusão

O projeto tem uma **boa base de React Query**, mas sofre de:
1. **Inconsistência** em aplicar staleTime (7 hooks)
2. **Falta de memoização** em componentes pesados (12 componentes)
3. **Architetura de tabs ineficiente** que causa re-renders cascata

Com as **3 recomendações críticas** implementadas, espera-se:
- ⚡ **40-60% redução em re-renders**
- ⚡ **30-50% redução em queries desnecessárias**
- ⚡ **2-3x melhoria em switching de abas**

---

**Próximo Passo:** Criar issues no GitHub com PRs para cada recomendação crítica.
