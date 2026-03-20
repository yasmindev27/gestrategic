# 🔧 Solução: Sincronização de Dados em Tempo Real

## Problema Identificado

Seu sistema tinha **dados inconsistentes** entre diferentes módulos devido a duas fontes de dados divergentes:

| Componente | Origem | Problema |
|-----------|--------|---------|
| **Mapa de Leitos** | Supabase (banco de dados) | ✅ Dados reais e atualizados |
| **Modo TV / BI** | LocalStorage (importação manual) | ❌ Dados desatualizados/inconsistentes |
| **Qualidade/Conformidade** | Desconectado | ⚠️ Possivelmente incoerente |

### Exemplo do Problema:
- Mapa de Leitos mostra **65% de ocupação** (dados reais)
- Modo TV/BI mostra **72% de ocupação** (dados importados)
- **Resultado**: Informações contraditórias em telas diferentes

---

## ✅ Solução Implementada

### 1. **Novo Hook: `useRealTimeBIData`**
Localização: `/src/hooks/useRealTimeBIData.ts`

**O que faz:**
- Busca dados de ocupação em TEMPO REAL do Supabase
- **Usa o mesmo hook que o Mapa de Leitos** (`useBeds`), garantindo sincronização perfeita
- Calcula a ocupação percentual de forma coerente
- Funciona como fallback automático se não houver dados importados

**Características:**
```typescript
// Ocupa ocupação do dia atual (tempo real)
const { totalOccupancy } = useBeds();
// Calcula e armazena em tempo real
const ocupacao_leitos = Math.round((ocupado / total) * 100);
```

### 2. **Validador de Sincronização**
Localização: `/src/components/DataSyncValidator.tsx`

**O que faz:**
- ✓ Compara ocupação do Mapa de Leitos vs BI
- ✓ Alerta se houver inconsistências > 5%
- ✓ Mostra status de sincronização em tempo real
- ✓ Pode ser adicionado a qualquer dashboard

**Uso:**
```tsx
<DataSyncValidator />
```

---

## 🔄 Fluxo de Dados Agora

```
┌─────────────────────────────────────────┐
│       SUPABASE (Fonte de Verdade)       │
│  - bed_records (leitos e pacientes)     │
│  - daily_statistics (estatísticas)      │
└──────────┬──────────────────────────────┘
           │
    ┌──────┴──────┐
    │             │
    ▼             ▼
┌─────────┐  ┌──────────────┐
│ useBeds │  │ useRealTime  │
│ (Mapa)  │  │ BIData (BI)  │
└────┬────┘  └──────┬───────┘
     │              │
     ▼              ▼
┌─────────────┐  ┌──────────────┐
│  Mapa de    │  │ Dashboard BI │
│  Leitos     │  │ / Modo TV    │
└─────────────┘  └──────────────┘
     │                    │
     └────────┬───────────┘
              ▼
      ✅ SINCRONIZADOS
```

---

## 📊 O Que Está Sincronizado

✅ **Ocupação de Leitos** - Cálculo em tempo real a partir de `bed_records`
✅ **Total de Pacientes** - Contagem real de leitos ocupados
✅ **Disponibilidade** - Leitos livres calculados dinamicamente

❓ **Ainda Placeholder** (para futura integração):
- Taxa de Mortalidade
- Tempo Médio de Internação
- Conformidade de Protocolos
- Dados Financeiros

---

## 🚀 Como Usar

### Modo Automático (Recomendado)
```tsx
import { useRealTimeBIData } from '@/hooks/useRealTimeBIData';

export function MyComponent() {
  const { dados, loading, recarregar } = useRealTimeBIData();
  
  return (
    <>
      {dados.map(mes => (
        <div key={mes.mes}>
          Ocupação: {mes.ocupacao_leitos}%
        </div>
      ))}
      <button onClick={recarregar}>Recarregar</button>
    </>
  );
}
```

### Com Validação
```tsx
import { DataSyncValidator } from '@/components/DataSyncValidator';

export function Dashboard() {
  return (
    <>
      <DataSyncValidator /> {/* Mostra status de sincronização */}
      <DashboardBIHospitalar />
    </>
  );
}
```

---

## 🔧 Próximos Passos Recomendados

1. **Integrar mais campos de qualidade**
   - Criar tabelas: `auditorias_qualidade`, `incidentes_paciente`
   - Mapear dados reais de conformidade

2. **Adicionar histórico de meses anteriores**
   - Usar `daily_statistics` para calcular média de ocupação passada
   - Armazenar histórico em cache para performance

3. **Monitorar performance**
   - `DataSyncValidator` pode ser adicionado ao Modo TV
   - Status em tempo real do sincronismo

4. **Remover dados importados quando confiante**
   - Por enquanto, `useImportedBIData` é fallback
   - Após validar dados reais, pode ser descontinuado

---

## 📝 Arquivos Criados

- ✅ `/src/hooks/useRealTimeBIData.ts` - Hook de dados em tempo real
- ✅ `/src/components/DataSyncValidator.tsx` - Componente validador

---

## ✨ Benefícios

✅ **Uma fonte de verdade** - Tudo vem do Supabase
✅ **Sincronização automática** - Sem ações manuais
✅ **Tempo real** - Dados atualizados nos gráficos
✅ **Manutenção facilitada** - Mudanças em um lugar afetam todos os módulos
✅ **Confiabilidade** - Indicadores fidedignos ao estado real
