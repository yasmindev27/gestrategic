# 📺 MODO TV - Status Completo dos Módulos

**Data**: 24 de Março de 2026  
**Status**: 🔴 CRÍTICO - 3 Problemas Identificados

---

## 🎯 Visão Geral - 6 Páginas Mapeadas

```
┌─────────────────────────────────────────────────────────────────┐
│                        MODO TV - FLUXO                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Página 0: FINANCEIRO                                           │
│    ├─ Hook: useKPIsFinanceiros                                  │
│    ├─ Tabelas: gerencia_notas_fiscais, gerencia_dre_entries     │
│    └─ Status: ✅ FUNCIONANDO                                    │
│                                                                 │
│  Página 1: FATURAMENTO                                          │
│    ├─ Dados: Fetch direto (NÃO hook)                            │
│    ├─ Tabelas: saida_prontuarios, avaliacoes_prontuarios        │
│    └─ Status: 🔴 INFINITO LOADING (problema crítico)            │
│                                                                 │
│  Página 2: NIR (com 2 subtelas)                                 │
│    ├─ Tela 1: Leitos/Ocupação                                   │
│    │   └─ Tabelas: bed_records (fetch OK)                       │
│    ├─ Tela 2: Produtividade Colaboradores ⚠️ INCOMPLETA         │
│    │   └─ Falta: nir_registros_producao (nunca buscado)         │
│    └─ Status: ⚠️ PARCIALMENTE (Tela 1 OK, Tela 2 INCOMPLETA)    │
│                                                                 │
│  Página 3: RH/DP (com 2 subtelas)                               │
│    ├─ Tela 1: Banco de Horas (crédito/débito)                   │
│    │   └─ Tabelas: banco_horas (status='aprovado')              │
│    ├─ Tela 2: Indicadores RH + Setores                          │
│    │   └─ Dados: Hardcoded (não busca real)                     │
│    └─ Status: ⚠️ PARCIALMENTE (Tela 1 OK, Tela 2 Fake)          │
│                                                                 │
│  Página 4: ASSISTÊNCIA SOCIAL                                   │
│    ├─ Hook: useAssistenciaSocialKPIs                            │
│    ├─ Tabelas: assistencia_social_atendimentos                  │
│    └─ Status: ✅ FUNCIONANDO                                    │
│                                                                 │
│  Página 5: SALUS                                                │
│    ├─ Dados: URL externa (iframe)                               │
│    └─ Status: ⚠️ PODE ESTAR BLOQUEADA (CORS/iframe)             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔴 PROBLEMAS CRÍTICOS

### **Problema 1: FATURAMENTO - INFINITE LOADING**

**Localização**: [src/components/faturamento/DashboardFaturamento.tsx](src/components/faturamento/DashboardFaturamento.tsx)

**Sintomas**:
- Tela fica carregando indefinidamente quando abre
- Loader não desaparece (ou desaparece sem dados)

**Causa Raiz**:
```typescript
// ❌ PROBLEMA: Paginação com 1000 registros por página
const pageSize = 1000;
let from = 0;
while (true) {
  const { data } = await supabase
    .from("saida_prontuarios")
    .select("...")
    .range(from, from + 999);
  
  if ((data || []).length < pageSize) break;
  from += pageSize;
  // Se há 50k registros = 50 requisições SEQUENCIAIS = timeout!
}
```

**Por que falha**:
1. **50.000+ saídas** = 50 requisições sequenciais
2. **40.000+ avaliações** = 40 requisições sequenciais
3. **Total: ~100 requisições** em série = **40-60 segundos mínimo**
4. **Timeout/RLS bloqueio** = fetch nunca retorna

**Solução**:
- Usar `pageSize: 5000` (menos requisições)
- Usar `Promise.all()` em vez sequencial
- Adicionar timeout (AbortController)
- Adicionar error toast

---

### **Problema 2: NIR - TELA 2 INCOMPLETA**

**Localização**: [src/components/bi/TVPageNIR.tsx](src/components/bi/TVPageNIR.tsx)

**Sintomas**:
- Gráficos de "Produtividade" aparecem VAZIOS
- Dados não carregam para colaboradores

**Causa Raiz**:
```typescript
// ❌ PROBLEMA: Dados nunca são buscados do banco
const desempenhoPorColaborador = []; // Array vazio sempre!
const distribuicaoAtividade = [];     // Array vazio sempre!
```

Hook `useNIRKPIs` **não busca** tabela `nir_registros_producao`.

**Solução**:
- Implementar fetch de `nir_registros_producao`
- Calcular produtividade por colaborador
- Retornar dados no hook

---

### **Problema 3: RH/DP - TELA 2 COM DADOS HARDCODED**

**Localização**: [src/hooks/useKPIsRH.ts](src/hooks/useKPIsRH.ts)

**Sintomas**:
- Totais de setores nunca mudam (sempre 50, 25, 30, 15)
- Não reflete dados reais do banco

**Dados Hardcoded**:
```typescript
const totais: { [key: string]: number } = {
  'enfermaria-masculina': 50,  // ❌ Fake!
  'pediatria': 25,             // ❌ Fake!
  'uti': 30,                   // ❌ Fake!
  'maternidade': 15,           // ❌ Fake!
};
```

**Solução**:
- Buscar realmente de `bed_records.groupBy(setor)`
- Calcular contagens reais
- Atualizar quando dados mudam

---

## 📊 Mapeamento Hooks → Tabelas

### ✅ Hooks Funcionando Corretamente

| Hook | Retorna | Tabelas | Status |
|------|--------|---------|--------|
| `useKPIsOperacionais` | KPIs de camas/ocupação | `bed_records` | ✅ OK |
| `useKPIsFinanceiros` | Revenue/Faturamento | `gerencia_notas_fiscais` | ✅ OK |
| `useBancoHorasKPIs` | Crédito/Débito RH | `banco_horas` | ✅ OK |
| `useTendenciaFinanceira` | Gráfico linha 14 dias | `gerencia_notas_fiscais` | ✅ OK |
| `useTendenciaOcupacao` | Ocupação ao longo tempo | `bed_records` | ✅ OK |
| `useTendenciaIncidentes` | Incidentes por dia | `incidentes_nsp` | ✅ OK |
| `useTendenciaDRE` | DRE por dia | `gerencia_dre_entries` | ✅ OK |
| `useAssistenciaSocialKPIs` | Atendimentos social | `assistencia_social_atendimentos` | ✅ OK |

### ⚠️ Hooks com Problemas

| Hook | Problema | Tabelas Faltando | Status |
|------|----------|------------------|--------|
| `useNIRKPIs` | Tela 2 vazia | `nir_registros_producao` | ⚠️ INCOMPLETO |
| `useKPIsRH` | Dados hardcoded | `bed_records.groupBy(setor)` | ⚠️ FAKE |
| `DashboardFaturamento.fetch()` | Infinite loop | `saida_prontuarios`, `avaliacoes_prontuarios` | 🔴 BROKEN |

---

## 🔌 Conexões com Banco

### Tabelas Usadas no Modo TV

```sql
-- ✅ USADAS E FUNCIONANDO
SELECT * FROM gerencia_notas_fiscais;          -- Financeiro
SELECT * FROM gerencia_dre_entries;             -- DRE
SELECT * FROM bed_records;                      -- NIR + RH Leitos
SELECT * FROM banco_horas;                      -- RH Banco de Horas
SELECT * FROM assistencia_social_atendimentos;  -- Social
SELECT * FROM saida_prontuarios;                -- Faturamento
SELECT * FROM avaliacoes_prontuarios;           -- Faturamento Avaliação

-- ❌ NÃO USADAS OU INCOMPLETAS
SELECT * FROM nir_registros_producao;           -- NIR Tela 2 (falta!)
SELECT * FROM incidentes_nsp;                   -- Tendência OK
```

---

## 🛠️ Verificação de RLS Policies

### Por Página

| Página | Tabelas | RLS Verificado | Status |
|--------|---------|---------------|--------|
| **Financeiro** | `gerencia_notas_fiscais` | ✅ Busca do_periodo_gte/lte | ✅ OK |
| **Faturamento** | `saida_prontuarios` | ⚠️ Não testado | ❌ PODE ESTAR BLOQUEADO |
| | `avaliacoes_prontuarios` | ⚠️ Não testado | ❌ PODE ESTAR BLOQUEADO |
| **NIR** | `bed_records` | ✅ Busca com status=open | ✅ OK |
| | `nir_registros_producao` | ❌ Nunca acessa | N/A |
| **RH/DP** | `banco_horas` | ⚠️ Status hardcoded | ⚠️ PODE FALHAR |
| **Social** | `assistencia_social_atendimentos` | ✅ Busca com date_gte | ✅ OK |

---

## 📝 Resumo da Saúde

| Aspecto | Score | Notas |
|--------|-------|-------|
| **Módulos Funcionais** | 3/6 | Financeiro, Social, RH Tela 1 |
| **Módulos ParciaisFuncionais** | 2/6 | NIR (1/2), RH (1/2) |
| **Módulos Quebrados** | 1/6 | Faturamento (infinite loading) |
| **Conexão BD** | 7/7 | Todas tabelas configuradas |
| **RLS Policies** | 4/5 | 1 incertitude (Faturamento) |
| **Error Handling** | 2/10 | Sem toasts, erros silenciosos |
| **Loading UX** | 3/10 | Nenhum skeleton screen |
| **Score Geral** | 2.5/5 | ⚠️ Precisa urgente de correções |

---

## ✅ Plano de Correção (Ordem de Prioridade)

### **FASE 1 - HOJE (P1 - Crítico)**

1. **✅ Faturamento - Fix Infinite Loading**
   - Arquivo: [src/components/faturamento/DashboardFaturamento.tsx](src/components/faturamento/DashboardFaturamento.tsx)
   - Mudança: Alter pageSize para 5000, usar Promise.all, adicionar timeout
   - Tempo: ~20 min

2. **✅ NIR - Implementar Tela 2**
   - Arquivo: [src/hooks/useNIRKPIs.ts](src/hooks/useNIRKPIs.ts)
   - Mudança: Adicionar fetch de `nir_registros_producao`
   - Tempo: ~30 min

3. **✅ RH - Remover Hardcode**
   - Arquivo: [src/hooks/useKPIsRH.ts](src/hooks/useKPIsRH.ts)
   - Mudança: Buscar realmente de `bed_records` agrupado por setor
   - Tempo: ~20 min

---

### **FASE 2 - AMANHÃ (P2 - Importante)**

4. **Adicionar Toast Notifications**
   - Todos os hooks (`useKPIs*.ts`)
   - Adicionar `useToast()` em catch blocks

5. **Implementar Skeleton Loading**
   - TVPageFaturamento
   - TVPageAssistenciaSocial
   - TVPageNIR

6. **Validar RLS Policies**
   - Retirar teste silencioso de Faturamento
   - Adicionar logs de erro

---

### **FASE 3 - SEMANA (P3 - Polimento)**

7. Design improvements (conforme DESIGNS_MELHORIAS_MODO_TV.md)
8. Gradientes dinâmicos por página
9. Animações de transição

---

## 📌 Próximos Passos

```
[ ] 1. Implementar correção do Faturamento (Promise.all, timeout)
[ ] 2. Implementar fetch de nir_registros_producao
[ ] 3. Remover hardcode de RH/setores
[ ] 4. Testar todas 6 páginas
[ ] 5. Validar banco de dados (RLS)
[ ] 6. Deploy + observar em Modo TV
```

---

**Status Final**: 🔴 **CRÍTICO** - 3 problemas bloqueadores devem ser corrigidos hoje
