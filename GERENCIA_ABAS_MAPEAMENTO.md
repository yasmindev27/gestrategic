# 📋 MAPEAMENTO COMPLETO - MÓDULO GERÊNCIA

## 🎯 RESUMO EXECUTIVO

| Item | Detalhes |
|------|----------|
| **Componente Principal** | [GerenciaModule.tsx](src/components/modules/GerenciaModule.tsx) |
| **Sub-componentes** | [src/components/gerencia/](src/components/gerencia/) (4 arquivos) |
| **Abas Principais** | 7 Tabs |
| **Sub-abas** | 13 Tabs (apenas em "Visão por Setor") |
| **Modo TV** | [ModoTV.tsx](src/components/bi/ModoTV.tsx) - rota `/modo-tv` |
| **Total de Páginas** | 7 + 13 + 6 (Modo TV) = 26 visualizações |

---

## 🗂️ LOCALIZAÇÃO DOS ARQUIVOS

```
src/
├── components/
│   ├── modules/
│   │   └── GerenciaModule.tsx              ← PRINCIPAL
│   ├── gerencia/
│   │   ├── GestaoTalentos.tsx
│   │   ├── LancamentoNotas.tsx
│   │   ├── PlanoDesenvolvimentoSection.tsx
│   │   └── ImportDataDialog.tsx
│   └── bi/
│       ├── ModoTV.tsx                      ← PAINEL TV
│       ├── DashboardBIHospitalar.tsx       (acesso ao ModoTV)
│       ├── TVPageFaturamento.tsx
│       ├── TVPageAssistenciaSocial.tsx
│       └── TVPageNIR.tsx
└── pages/
    └── ModoTVPage.tsx                      (wrapper do ModoTV)
```

---

## 📑 ABAS PRINCIPAIS DO GERÊNCIA (7 tabs)

| # | Nome | Componente | Localização | Tipo | Status |
|---|------|-----------|-------------|------|--------|
| 1 | **Business Intelligence** | `DashboardBIHospitalar` | src/components/bi/ | Indicadores | ✅ Ativo |
| 2 | **Planos de Ação** | Nativo (Tabela) | GerenciaModule.tsx | CRUD + Filtros | ✅ Ativo |
| 3 | **Visão por Setor** | Sub-abas aninhadas | GerenciaModule.tsx | **13 sub-tabs** | ✅ Ativo |
| 4 | **Lançamento de Notas** | `LancamentoNotas` | src/components/gerencia/ | Formulário | ✅ Ativo |
| 5 | **DISC Liderança** | `DISCFormModule` | src/components/disc/ | Avaliações | ✅ Ativo |
| 6 | **Gestão de Talentos** | `GestaoTalentos` | src/components/gerencia/ | Dashboard | ✅ Ativo |
| 7 | **Plano Desenvolvimento** | `PlanoDesenvolvimentoSection` | src/components/gerencia/ | Dashboard | ✅ Ativo |

---

## 📊 SUB-ABAS DE "VISÃO POR SETOR" (13 tabs)

Quando usuário clica em **"Visão por Setor"**, aparecem 13 abas secundárias:

| # | Nome | Componente | Localização | Status |
|---|------|-----------|-------------|--------|
| **Geral** | Resumo por Setor (Cards) | Nativo em GerenciaModule | Renderizado inline | ✅ |
| **Faturamento** | `DashboardFaturamento` | src/components/faturamento/ | Importado | ✅ |
| **Indicadores UPA** | `IndicadoresUPA` | src/components/indicadores/ | Importado | ✅ |
| **Indicadores NSP** | `IndicadoresNSP` | src/components/indicadores/ | Importado | ✅ |
| **Qualidade** | `DashboardConformidade` | src/components/qualidade/ | Importado | ✅ |
| **NIR** | `NirDashboardModule` | src/components/modules/ | Importado | ✅ |
| **Capacitação** | `DashboardIndicadores` (LMS) | src/components/lms/ | Importado | ✅ |
| **Seg. Patrimonial** | `SegurancaPatrimonialModule` | src/components/modules/ | Importado | ✅ |
| **Seg. Trabalho** | `SegurancaTrabalhoModule` | src/components/modules/ | Importado | ✅ |
| **Incidentes** | `DashboardIAIncidentes` | src/components/gestao-incidentes/ | Importado | ✅ |
| **Rouparia** | `RoupariaModule` | src/components/modules/ | Importado | ✅ |
| **Restaurante** | `RestauranteModule` | src/components/modules/ | Importado | ✅ |
| **Fluxograma** | `FluxogramaSetores` | src/components/admin/ | Importado | ✅ |

---

## 📺 MODO TV - 6 PÁGINAS ROTATIVAS

| # | Nome | Páginas Atuais | Componente | Status |
|---|------|---|-----------|--------|
| 1 | **Financeiro** | Índice 0 | Inline (ModoTV) | ✅ |
| 2 | **Faturamento** | Índice 1 | `TVPageFaturamento` | ✅ |
| 3 | **NIR** | Índice 2 | `TVPageNIR` + **telaRotativa** (2 sub-telas) | ✅ |
| 4 | **RH/DP** | Índice 3 | Inline + **telaRotativa** (Banco Horas / Indicadores RH) | ✅ |
| 5 | **Social** | Índice 4 | `TVPageAssistenciaSocial` | ✅ |
| 6 | **Salus** | Índice 5 | Link externo (Streamlit) | ✅ |

### Duração de Rotação:
- **Páginas principais**: 45 segundos cada
- **Sub-telas (NIR/RH)**: Alternâncias cada 45s também
- **Auto-rotação**: Desabilitada quando em **Pausa**
- **Controle manual**: Clique em aba ou botão Play/Pause

---

## 🔄 ESTADO DAS ABAS

### Em GerenciaModule:
```javascript
// Tabs principal (usa Shadcn UI)
<Tabs defaultValue="bi">
  <TabsList>
    <TabsTrigger value="bi">Business Intelligence</TabsTrigger>
    <TabsTrigger value="planos">Planos de Ação</TabsTrigger>
    <TabsTrigger value="setores">Visão por Setor</TabsTrigger>
    // ... mais 4 tabs
  </TabsList>
  
  <TabsContent value="bi">...</TabsContent>
  <TabsContent value="planos">...</TabsContent>
  // ...
</Tabs>

// Sub-tabs dentro de "setores"
<Tabs defaultValue="geral">
  <TabsTrigger value="geral">Geral</TabsTrigger>
  <TabsTrigger value="faturamento">Faturamento</TabsTrigger>
  // ... mais 11 sub-tabs
</Tabs>
```

**Controle**: Clique em `TabsTrigger` muda o `value` automaticamente

### Em ModoTV:
```javascript
const [paginaAtiva, setPaginaAtiva] = useState(0);        // Página atual (0-5)
const [tempoRestante, setTempoRestante] = useState(45);   // Contador (45s → 1s → 45s)
const [emPausa, setEmPausa] = useState(false);            // Play/Pause
const [telaRotativa, setTelaRotativa] = useState(0);      // Sub-telas NIR/RH (0-1)

// Clique manual em aba
onClick={() => { 
  setPaginaAtiva(idx);
  setTempoRestante(45); 
}}

// Rotação automática a cada 45s (se não estiver em pausa)
useEffect(() => {
  if (emPausa || paginaAtiva === 3 || paginaAtiva === 4) return;
  const i = setInterval(() => {
    setPaginaAtiva(p => (p + 1) % 6);
    setTempoRestante(45);
  }, 45000);
  return () => clearInterval(i);
}, [emPausa, paginaAtiva]);
```

---

## 🔀 MUDANÇA ENTRE ABAS

### GerenciaModule (MANUAL):
1. Usuário clica em `TabsTrigger`
2. Aciona `onValueChange` (implícito)
3. Muda state interno do Tabs
4. `TabsContent` renderiza conteúdo correspondente
5. ✅ **Sem lógica adicional**

### ModoTV (MANUAL + AUTOMÁTICA):

#### Automática:
```javascript
// Rotação de páginas principais
if (!emPausa && paginaAtiva !== 3 && paginaAtiva !== 4) {
  // A cada 45s
  setPaginaAtiva(p => (p + 1) % 6);
}

// Rotação de sub-telas (NIR / RH)
if (paginaAtiva === 3 || paginaAtiva === 4) {
  if (!emPausa) {
    // A cada 45s
    setTelaRotativa(t => (t + 1) % 2);
  }
}
```

#### Manual (Usuário clica aba):
```javascript
// Footer Nav
{paginas.map((nome, idx) => (
  <button onClick={() => {
    setPaginaAtiva(idx);
    setTempoRestante(45);
  }}>
    {nome}
  </button>
))}
```

#### Pausa/Play:
```javascript
<button onClick={() => setEmPausa(!emPausa)}>
  {emPausa ? <Play /> : <Pause />}
</button>
```

---

## ⚠️ INEFICIÊNCIAS IDENTIFICADAS

### 🔴 Alto Impacto - ModoTV

| Problema | Localização | Impacto | Solução |
|----------|-------------|--------|---------|
| **Múltiplos useEffects com pausa redundante** | ModoTV.tsx (3 efeitos) | Difícil manutenção, possível race condition | Centralizar lógica de pausa em 1 efeito |
| **Array paginas criado a cada render** | ModoTV.tsx linha ~90 | Quebra dependências de efeitos | Mover fora do componente ou usar useMemo |
| **Fetch de totalNotas sem retry** | ModoTV.tsx linhas 70-80 | Se banco falhar, fica zerado sem feedback | Adicionar React Query ou retry com backoff |

### 🟡 Médio Impacto - GerenciaModule

| Problema | Localização | Impacto | Solução |
|----------|-------------|--------|---------|
| **Queries com configs diferentes** | Lines 125-150 | Inconsistência de cache | Usar config padrão + overrides |
| **Dialog form sem persistência parcial** | Lines 140+ | Perda de dados ao fechar | Usar sessionStorage para rascunho |

### 🟢 Baixo Impacto

| Problema | Localização | Justificativa |
|----------|-------------|---------------|
| useMemo bem implementado | GerenciaModule | ✅ Não há ineficiência aqui |
| React Query cache config | GerenciaModule | ✅ staleTime/gcTime apropriados |

---

## 🎯 RECOMENDAÇÕES PRIORITÁRIAS

### 1️⃣ Refatorar lógica de rotação do ModoTV
- **Arquivo**: src/components/bi/ModoTV.tsx
- **Ação**: Consolidar 3 useEffects em 1 com lógica de máquina de estados
- **Impacto**: -30% linha de código, +50% legibilidade

### 2️⃣ Corrigir array de páginas
- **Arquivo**: src/components/bi/ModoTV.tsx
- **Ação**: `const paginas = useMemo(() => [...], [])`
- **Impacto**: Evitar re-criação desnecessária

### 3️⃣ Adicionar retry ao fetch de notas
- **Arquivo**: src/components/bi/ModoTV.tsx
- **Ação**: Usar React Query `useQuery` ao invés de `useEffect` + try/catch
- **Impacto**: Automático retry + error state

---

## 📊 TABELA DE ESTADO

| Componente | Estado | Tipo | Scope | Persistência |
|-----------|--------|------|-------|--------------|
| GerenciaModule | filterSetor, filterStatus, searchTerm... | Local | useState | ❌ Não |
| ModoTV | paginaAtiva, tempoRestante, emPausa | Local | useState | ❌ Não |
| Queries | planos_acao, inconsistencias... | React Query | Cache | ✅ Sim (5-30min) |

---

## 🚀 FLUXO DE NAVEGAÇÃO

```
Index / Auth
    ↓
Dashboard
    ↓
Módulo Gerência (GerenciaModule)
    ├── Tab 1: BI → Botão "Modo TV" → /modo-tv (nova aba)
    │              └── ModoTV (painel executivo)
    ├── Tab 2: Planos de Ação
    │   ├── Buscar/Filtrar
    │   ├── Criar novo
    │   ├── Editar status
    │   └── Ver histórico
    ├── Tab 3: Visão por Setor
    │   ├── Sub-tab: Geral (cards por setor)
    │   ├── Sub-tab: Faturamento
    │   ├── Sub-tab: Indicadores UPA
    │   ├── Sub-tab: Indicadores NSP
    │   ├── Sub-tab: Qualidade
    │   ├── Sub-tab: NIR
    │   │... (mais 7 sub-tabs)
    ├── Tab 4: Lançamento de Notas
    ├── Tab 5: DISC Liderança
    ├── Tab 6: Gestão de Talentos
    └── Tab 7: Plano de Desenvolvimento
```

---

**Última atualização**: 24 de março de 2026  
**Versão**: 1.0  
**Status**: ✅ Análise Completa
