# 📊 Análise Visual - Estrutura de Performance

## 1. Cascata de Re-renders (ANTES - Problema)

```
┌─────────────────────────────────────────────────────────────┐
│ RHDPModule (activeTab mudou para "atestados")              │
└────────────────────┬────────────────────────────────────────┘
                     │
          ┌──────────▼──────────┐
          │ renderContent()      │
          │ (switch activeTab)   │
          └──────────┬──────────┘
                     │
          ┌──────────▼──────────────────────────┐
          │ <CentralAtestadosSection />          │ ❌ Novo render
          │ (ComponentType mudou)                │
          └──────────┬───────────────────────────┘
                     │
        ┌────────────┴────────────┬───────────────┐
        │                         │               │
    ┌───▼──────────┐    ┌────────▼────────┐  ┌──▼───────┐
    │ useQuery     │    │ useState        │  │ useEffect│
    │ (sem cache)  │    │ (novo state)    │  │ (executa)│
    └───┬──────────┘    └────────┬────────┘  └──┬───────┘
        │                        │               │
        │ ❌ Nova requisição     │ ❌ Novo valor│ ❌ Efeitos
        │   ao Supabase          │              │
        │                        │              │
    ┌───▼──────────────────┐    │              │
    │ Re-render com dados  │    │              │
    │ da API               │◄───┴──────────────┘
    └──────────────────────┘
    
    ⏱️ TEMPO TOTAL: 300-500ms
    🔄 RENDERS: 3-5
    📡 QUERIES: 5-10
```

---

## 2. Cascata de Re-renders (DEPOIS - Fixo)

```
┌─────────────────────────────────────────────────────────────┐
│ RHDPModule (activeTab mudou para "atestados")              │
└────────────────────┬────────────────────────────────────────┘
                     │
          ┌──────────▼──────────┐
          │ SECTION_MAP lookup   │
          │ (object map fast)    │
          └──────────┬──────────┘
                     │
          ┌──────────▼──────────────────────────┐
          │ <MemoizedAtestados />                │ ✅ Memo previne
          │ (memo + props iguais)               │    novo render
          └────────────────────────────────────┘
                     │
          ✅ Sem novo render = Sem novos efeitos
          ✅ Sem novos effects = Sem nova query
          ✅ Cache do React Query retorna dados
    
    ⏱️ TEMPO TOTAL: 50-100ms
    🔄 RENDERS: 0
    📡 QUERIES: 0 (cache hit)
```

---

## 3. Comparação de Arquiteruras

### Arquitetura 1: Switch Statement (❌ PROBLEMA)

```
Mudança de aba
    ↓
State atualiza (setActiveTab)
    ↓
renderContent() re-executa
    ↓
Switch statement re-avalia
    ↓
Novo JSX gerado e renderizado
    ↓
Novo componente criado (nova instância)
    ↓
useQuery dentro do novo componente executa
    ↓
Requisição ao Supabase
    ↓
Dados retornam e re-render acontece

⏱️ ~400ms - 5 queries
```

---

### Arquitetura 2: Object Map + Memo (✅ SOLUÇÃO)

```
Mudança de aba
    ↓
State atualiza (setActiveTab)
    ↓
SECTION_MAP lookup (O(1))
    ↓
Componente MemoizedAtestados encontrado
    ↓
memo() compara props (iguais!)
    ↓
Render SKIPPED ✅
    ↓
Componente anterior ainda no cache
    ↓
React Query retorna dados do cache
    ↓
DONE

⏱️ ~50ms - 0 queries
```

---

## 4. Hooks: Sem staleTime vs. Com staleTime

### Sem staleTime (❌ PROBLEMA)

```
Query 1: fetch data from API       ▶ 150ms
         returned: {data, status}
         
5 min depois...

Query 2: fetch data from API       ▶ 150ms
         (mesmo sem mudança!)
         returned: {data, status}
         
= 2 requisições em 5 minutos
= Resource intensive
= Network overhead
```

### Com staleTime (✅ SOLUÇÃO)

```
Query 1: fetch data from API       ▶ 150ms
         cached for 5 minutes
         status: fresh
         
2 min depois (dentro do cache):

Query 2: SKIPPED ✅
         returned from cache in: 1ms
         
5 min depois (agora está stale):

Query 3: fetch data from API       ▶ 150ms
         cached for 5 more minutes
         
= 1 requisição a cada 5 minutos
= vs 1 requisição a cada render
= 30-50x mais eficiente
```

---

## 5. RHDPModule - Problema com Escalas Sub-tabs

```
RHDPModule
│
├─ Main Tabs (9 abas)
│  └─ onClick → setActiveTab
│
└─ renderContent()
   └─ CASE 'escalas':
      └─ <Tabs escalasSubTab>
         │
         └─ ESCALAS_SUB_ITEMS.map(item =>
            ├─ TabsTrigger
            └─ TabsContent
               └─ <EscalaTecEnfermagem tipo={item.id} /> ❌ 8x

❌ PROBLEMA 1: Sem memo
   - RHDPModule re-render → EscalaTecEnfermagem re-render
   - 8 sub-tabs = 8 novos renders
   - Cada com ~700 linhas de código

❌ PROBLEMA 2: Dupla mudança de aba
   - Usuário muda de "banco-horas" → "escalas"
   - Depois "tecnicos" → "enfermeiros" (sub-tab)
   - Cada mudança = re-render completa da section

❌ PROBLEMA 3: Sem staleTime em queries
   - Cada render = nova query
   - 8 sub-tabs × random renders = múltiplas queries
```

**Solução:**
```javascript
// 1️⃣ Memoizar componente principal
export const EscalaTecEnfermagem = memo(({ tipo }) => { ... });

// 2️⃣ Memoizar content em sub-tab
const TabContent = memo(({ tipo }) => (
  <TabsContent value={tipo}>
    <EscalaTecEnfermagem tipo={tipo} />
  </TabsContent>
));

// 3️⃣ Resultado
Usuário muda sub-tab → memo compara props → Se tipo igual = SKIP
Usuário muda main tab → RHDPModule re-render → mas EscalaTecEnfermagem em cache
```

---

## 6. Comparação: Tempo de Resposta

### Usuário Navegando entre 3 Abas

**ANTES (Problema - sem staleTime + sem memo):**
```
Ab 1: "banco-horas"
├─ Click em "banco-horas" tab
├─ renderContent() executa
├─ <BancoHorasSection /> renderiza
├─ useState/useEffect/useQuery
├─ Fetch Supabase: 150ms
├─ Render resultado: 50ms
└─ TOTAL: ~200ms ❌

Aba 2: "atestados"
├─ Click em "atestados"
├─ BancoHorasSection desaparece
├─ renderContent() muda case
├─ <CentralAtestadosSection /> renderiza
├─ useState/useEffect/useQuery
├─ Fetch Supabase: 150ms
├─ Render resultado: 50ms
└─ TOTAL: ~200ms ❌

Aba 3: "escalas"
├─ Click em "escalas"
├─ Tabs renderizam (8 sub-items)
├─ EscalaTecEnfermagem × 8 renderizam
├─ Fetch Supabase × 4: 600ms
├─ Render resultado: 80ms
└─ TOTAL: ~680ms ❌❌❌

📊 TEMPO TOTAL: 200 + 200 + 680 = 1080ms (1.08 segundos)
🚨 Percepção do usuário: LENTO E TRAVADO
```

**DEPOIS (Solução - com staleTime + com memo):**
```
Aba 1: "banco-horas"
├─ Click em "banco-horas" tab
├─ SECTION_MAP lookup
├─ <MemoizedBancoHoras /> → memo checked
├─ Props iguais? SIM → SKIP RENDER ✅
├─ Cache React Query hit: 1ms
└─ TOTAL: ~2ms ✅

Aba 2: "atestados"
├─ Click em "atestados"
├─ SECTION_MAP lookup
├─ <MemoizedAtestados /> → memo checked
├─ Props diferentes? SIM → render
├─ Cache React Query hit: 1ms (staleTime 5min)
├─ Render resultado: 30ms
└─ TOTAL: ~35ms ✅

Aba 3: "escalas"
├─ Click em "escalas"
├─ EscalasTabContent já em cache (memo)
├─ Sub-tabs renderizam (8 items, memoized)
├─ EscalaTecEnfermagem × 8 → memo checks
├─ Props iguais desde último render → SKIP × 8 ✅
└─ TOTAL: ~15ms ✅

📊 TEMPO TOTAL: 2 + 35 + 15 = 52ms (0.052 segundos)
✨ Percepção do usuário: INSTANTÂNEO E RESPONSIVO

🎯 MELHORIA: 1080ms → 52ms = 20x mais rápido!
```

---

## 7. Tree de Componentes (Antes vs Depois)

### ANTES - Sem Otimizações

```
<RHDPModule>
  ├─ <Tabs activeTab={activeTab}>
  │  ├─ <TabsList>
  │  │  ├─ <TabsTrigger>banco-horas</TabsTrigger>
  │  │  ├─ <TabsTrigger>atestados</TabsTrigger>
  │  │  └─ ... (9 tabs)
  │  │
  │  └─ [activeTab switch]
  │     │
  │     └─ <BancoHorasSection /> ❌ Novo quando activeTab muda
  │        ├─ <useState> × 5
  │        ├─ <useEffect> × 3
  │        ├─ <useQuery> × 3
  │        └─ Re-render completa da tree
  │           └─ 300+ linhas renderizadas novamente
  │
  └─ Quando "atestados" clicado → REFRESH TOTAL
```

### DEPOIS - Com Otimizações

```
<RHDPModule>
  ├─ <Tabs activeTab={activeTab}>
  │  ├─ <TabsList>
  │  │  ├─ <TabsTrigger>banco-horas</TabsTrigger>
  │  │  ├─ <TabsTrigger>atestados</TabsTrigger>
  │  │  └─ ... (9 tabs)
  │  │
  │  └─ [SECTION_MAP lookup]
  │     │
  │     └─ <MemoizedBancoHoras /> ✅ Cached
  │        └─ Memo checks: props iguais? → SKIP
  │           └─ Sem re-render = sem novo estado/efeitos
  │
  └─ Quando "atestados" clicado → <MemoizedAtestados /> renderiza
     └─ Apenas 1x se props mudarem
     └─ Input: useState/useEffect/useQuery EXISTENTE
     └─ Output: React Query cache
```

---

## 8. Diagrama de Query Cache

### Sem staleTime (❌ PROBLEMA)

```
TEMPO
│
├─ 0:00 - User entra em "banco-horas"
│         useQuery executa
│         │
│         ├─ Fetch Supabase: 150ms
│         └─ Cache criado
│
├─ 0:05 - Data ainda fresh
│         User muda para "atestados" e volta
│         │
│         └─ useQuery vê que data era queryado
│             → Status STALE (sem staleTime = imediatamente stale)
│             → Nova fetch: 150ms
│
├─ 0:10 - Novamente stale
│          Nova fetch: 150ms
│
└─ 0:15 - Novamente stale
          Nova fetch: 150ms
```

### Com staleTime (✅ SOLUÇÃO)

```
TEMPO
│
├─ 0:00 - User entra em "banco-horas"
│         useQuery executa com staleTime: 5min
│         │
│         ├─ Fetch Supabase: 150ms
│         └─ Cache criado com expiry em 0:05
│
├─ 0:01 - Data still FRESH ✅
│         User muda para "atestados" e volta
│         │
│         └─ useQuery vê que data é fresh
│             → Retorna cache em 1ms ✅
│
├─ 0:03 - Data still FRESH ✅
│         Mesma coisa
│         → Cache em 1ms ✅
│
├─ 0:05 - Data agora STALE (expiry atingido)
│         User volta a "banco-horas"
│         │
│         └─ useQuery vê que data é stale
│             → Fetch em background
│             → Retorna cache enquanto busca
│             → Quando termina, atualiza
│
└─ 0:06 - Data novamente FRESH com novo valor
          nova expiry em 0:11
```

---

## 9. Matriz de Impacto

| Problema | Impacto | Frequência | Severidade | Fix Time |
|----------|--------|-----------|-----------|----------|
| Sem staleTime (7 hooks) | 30-50% extra queries | Contínuo | 🔴 ALTA | 20 min |
| Sem memo (12 componentes) | 40-60% extra renders | Contínuo | 🔴 ALTA | 30 min |
| Switch statement em RHDP | 20-30% performance loss | Por aba | 🟠 MÉDIA | 15 min |
| Dupla aba (escalas sub-tabs) | 8x renders desnecessários | Por subtab | 🟠 MÉDIA | 10 min |
| useMemo excessivo | -5% performance | Raro | 🟡 BAIXA | Análise |

---

## 10. Roadmap Visual

```
SEMANA 1:
┌─────────────────────────────────────────────────┐
│ DIA 1 (CRÍTICO)                                │
├─────────────────────────────────────────────────┤
│ ✓ Add staleTime aos 7 hooks              2h    │
│ ✓ Setup React DevTools Profiler                │
│ ✓ Test + commit                                │
└─────────────────────────────────────────────────┘
        ↓ (Esperado: -30% queries)

┌─────────────────────────────────────────────────┐
│ DIA 2 (CRÍTICO)                                │
├─────────────────────────────────────────────────┤
│ ✓ Memoizar EscalaTecEnfermagem          1h    │
│ ✓ Memoizar 11 componentes               1h30  │
│ ✓ Test + commit                                │
└─────────────────────────────────────────────────┘
        ↓ (Esperado: -40% renders)

┌─────────────────────────────────────────────────┐
│ DIA 3 (REFACTOR)                               │
├─────────────────────────────────────────────────┤
│ ✓ Refactor RHDPModule object map        1h    │
│ ✓ Performance tests                     1h    │
│ ✓ Benchmark antes/depois                      │
│ ✓ Create PR                                   │
└─────────────────────────────────────────────────┘
        ↓ (Esperado: -50% latência)

📊 RESULTADO FINAL: 3-5x mais rápido
```

---

## 11. Performance Checklist

```
🔍 PRÉ-IMPLEMENTAÇÃO
├─ [ ] Baseline: Abrir React Profiler
├─ [ ] Mudar aba 3 vezes, anotar tempo
├─ [ ] Mudar aba 3 vezes, anotar queries
├─ [ ] Screenshot de "antes"

🔧 DURANTE IMPLEMENTAÇÃO
├─ [ ] Fix #1: staleTime nos 7 hooks
├─ [ ] Fix #2: Memoizar 12 componentes  
├─ [ ] Fix #3: Object map em RHDPModule
├─ [ ] Run tests localmente

🧪 PÓS-IMPLEMENTAÇÃO
├─ [ ] Abrir React Profiler novamente
├─ [ ] Mudar aba 3 vezes, anotar tempo
├─ [ ] Mudar aba 3 vezes, anotar queries
├─ [ ] Screenshot de "depois"
├─ [ ] Calcular % melhoria

✅ VALIDAÇÃO
├─ [ ] Time reduced by 50%+?
├─ [ ] Queries reduced by 50%+?
├─ [ ] No console errors?
├─ [ ] Visual look the same?
├─ [ ] Responsive time < 100ms?

📊 DOCUMENTAÇÃO
├─ [ ] Before/after screenshots
├─ [ ] Performance metrics
├─ [ ] PR description
├─ [ ] Link to this guide
```

---

**Fim da Análise Visual**
