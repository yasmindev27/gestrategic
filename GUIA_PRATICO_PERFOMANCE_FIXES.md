# 🛠️ Guia Prático de Implementação - Performance Fixes

## ⚡ Quick Fix #1: Adicionar staleTime em 7 Hooks

### Hook 1: useReunioes (ReuniaoModule.tsx)

**ANTES:**
```typescript
const { data: reunioes, refetch } = useQuery({
  queryKey: ["reunioes"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("reunioes")
      .select("*")
      .in("status", ["agendada", "em_andamento"])
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return data;
  },
});
```

**DEPOIS:**
```typescript
const { data: reunioes, refetch } = useQuery({
  queryKey: ["reunioes"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("reunioes")
      .select("*")
      .in("status", ["agendada", "em_andamento"])
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return data;
  },
  staleTime: 5 * 60 * 1000,      // 👈 ADD: 5 minutos
  gcTime: 30 * 60 * 1000,        // 👈 ADD: 30 minutos
});
```

---

### Hook 2: useProtocoloAtendimentos.ts

**ANTES:**
```typescript
export function useProtocoloAtendimentos(tipo: TipoProtocolo, competency?: string) {
  return useQuery({
    queryKey: ['protocolo_atendimentos', tipo, competency],
    queryFn: async () => {
      let query = supabase
        .from('protocolo_atendimentos')
        .select('*')
        .eq('tipo_protocolo', tipo)
        .order('created_at', { ascending: false })
        .limit(1000);
      if (competency) query = query.eq('competency', competency);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
}
```

**DEPOIS:**
```typescript
export function useProtocoloAtendimentos(tipo: TipoProtocolo, competency?: string) {
  return useQuery({
    queryKey: ['protocolo_atendimentos', tipo, competency],
    queryFn: async () => {
      let query = supabase
        .from('protocolo_atendimentos')
        .select('*')
        .eq('tipo_protocolo', tipo)
        .order('created_at', { ascending: false })
        .limit(1000);
      if (competency) query = query.eq('competency', competency);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 60 * 1000,       // 👈 ADD: 10 minutos (dados menos mudam)
    gcTime: 60 * 60 * 1000,          // 👈 ADD: 1 hora
  });
}
```

---

### Hook 3: useEnfermagem.ts (4 hooks)

**ANTES:**
```typescript
export function useMinhasTrocas(userId?: string) {
  return useQuery({
    queryKey: ['minhas-trocas', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('enfermagem_trocas')
        .select(`*,escala:enfermagem_escalas(*)`)
        .or(`ofertante_id.eq.${userId},aceitante_id.eq.${userId}`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as (Troca & { escala: Escala })[];
    },
    enabled: !!userId,
  });
}

export function useTrocasDisponiveis() {
  return useQuery({
    queryKey: ['trocas-disponiveis'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enfermagem_trocas')
        .select(`*,escala:enfermagem_escalas(*)`)
        .eq('status', 'aberta')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as (Troca & { escala: Escala })[];
    },
  });
}

export function useTrocasPendentes() {
  return useQuery({
    queryKey: ['trocas-pendentes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enfermagem_trocas')
        .select(`*,escala:enfermagem_escalas(*)`)
        .eq('status', 'pendente_aprovacao')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as (Troca & { escala: Escala })[];
    },
  });
}

export function useConfiguracoes() {
  return useQuery({
    queryKey: ['enfermagem-configuracoes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enfermagem_configuracoes')
        .select('*');
      if (error) throw error;
      return data as Configuracao[];
    },
  });
}
```

**DEPOIS:**
```typescript
export function useMinhasTrocas(userId?: string) {
  return useQuery({
    queryKey: ['minhas-trocas', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('enfermagem_trocas')
        .select(`*,escala:enfermagem_escalas(*)`)
        .or(`ofertante_id.eq.${userId},aceitante_id.eq.${userId}`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as (Troca & { escala: Escala })[];
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,        // 👈 2 minutos (muda frequente)
    gcTime: 15 * 60 * 1000,          // 👈 15 minutos
  });
}

export function useTrocasDisponiveis() {
  return useQuery({
    queryKey: ['trocas-disponiveis'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enfermagem_trocas')
        .select(`*,escala:enfermagem_escalas(*)`)
        .eq('status', 'aberta')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as (Troca & { escala: Escala })[];
    },
    staleTime: 3 * 60 * 1000,        // 👈 3 minutos
    gcTime: 20 * 60 * 1000,          // 👈 20 minutos
  });
}

export function useTrocasPendentes() {
  return useQuery({
    queryKey: ['trocas-pendentes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enfermagem_trocas')
        .select(`*,escala:enfermagem_escalas(*)`)
        .eq('status', 'pendente_aprovacao')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as (Troca & { escala: Escala })[];
    },
    staleTime: 2 * 60 * 1000,        // 👈 2 minutos (requer urgência)
    gcTime: 15 * 60 * 1000,          // 👈 15 minutos
  });
}

export function useConfiguracoes() {
  return useQuery({
    queryKey: ['enfermagem-configuracoes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enfermagem_configuracoes')
        .select('*');
      if (error) throw error;
      return data as Configuracao[];
    },
    staleTime: 30 * 60 * 1000,       // 👈 30 minutos (muda raramente)
    gcTime: 120 * 60 * 1000,         // 👈 2 horas
  });
}
```

---

### Hook 4: DISCFormModule.tsx

**ANTES:**
```typescript
const { data: results = [], refetch: refetchResults } = useQuery({
  queryKey: ['disc_results'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('disc_resultados')
      .select('*')
      .eq('colaborador_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
});
```

**DEPOIS:**
```typescript
const { data: results = [], refetch: refetchResults } = useQuery({
  queryKey: ['disc_results', userId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('disc_resultados')
      .select('*')
      .eq('colaborador_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  staleTime: 20 * 60 * 1000,       // 👈 ADD: 20 minutos
  gcTime: 60 * 60 * 1000,          // 👈 ADD: 1 hora
});
```

---

## ⚡ Quick Fix #2: Memoizar 12 Componentes

### Template Geral

**ANTES:**
```typescript
export const MeuComponente = () => {
  const { data } = useQuery({ /* ... */ });
  
  return (
    <div>
      {/* conteúdo */}
    </div>
  );
};
```

**DEPOIS:**
```typescript
import { memo } from 'react';

export const MeuComponente = memo(() => {
  const { data } = useQuery({ /* ... */ });
  
  return (
    <div>
      {/* conteúdo */}
    </div>
  );
});

MeuComponente.displayName = 'MeuComponente'; // 👈 Para debug
```

---

### Aplicação Específica: BancoHorasSection

**ANTES:**
```typescript
// src/components/rhdp/BancoHorasSection.tsx
export const BancoHorasSection = () => {
  const { toast } = useToast();
  // ... resto do código
};
```

**DEPOIS:**
```typescript
// src/components/rhdp/BancoHorasSection.tsx
import { memo } from 'react';

export const BancoHorasSection = memo(() => {
  const { toast } = useToast();
  // ... resto do código
});

BancoHorasSection.displayName = 'BancoHorasSection';
```

---

### Aplicação Específica: EscalaTecEnfermagem (CRÍTICA)

**ANTES:**
```typescript
export const EscalaTecEnfermagem = ({ tipo }: { tipo: string }) => {
  const [escalas, setEscalas] = useState([]);
  // ... 700+ linhas
};
```

**DEPOIS:**
```typescript
import { memo } from 'react';

const _EscalaTecEnfermagem = ({ tipo }: { tipo: string }) => {
  const [escalas, setEscalas] = useState([]);
  // ... resto do código (sem mudança de lógica)
};

export const EscalaTecEnfermagem = memo(_EscalaTecEnfermagem, (prevProps, nextProps) => {
  // Custom comparison: apenas re-render se tipo mudar
  return prevProps.tipo === nextProps.tipo;
});

EscalaTecEnfermagem.displayName = 'EscalaTecEnfermagem';
```

---

### Lista de Componentes para Memoizar

```typescript
// src/components/rhdp/BancoHorasSection.tsx
export const BancoHorasSection = memo(() => { /* ... */ });

// src/components/rhdp/CentralAtestadosSection.tsx
export const CentralAtestadosSection = memo(() => { /* ... */ });

// src/components/rhdp/AvaliacaoDesempenhoSection.tsx
export const AvaliacaoDesempenhoSection = memo(() => { /* ... */ });

// src/components/rhdp/FormulariosSection.tsx
export const FormulariosSection = memo(() => { /* ... */ });

// src/components/rhdp/MovimentacoesDisciplinarSection.tsx
export const MovimentacoesDisciplinarSection = memo(() => { /* ... */ });

// src/components/rhdp/TrocasPlantcoesHistorico.tsx
export const TrocasPlantcoesHistorico = memo(() => { /* ... */ });

// src/components/rhdp/JustificativaDeHorasHistorico.tsx
export const JustificativaDeHorasHistorico = memo(() => { /* ... */ });

// src/components/enfermagem/EscalaTecEnfermagem.tsx
export const EscalaTecEnfermagem = memo(({ tipo }: { tipo: string }) => { /* ... */ }, 
  (prevProps, nextProps) => prevProps.tipo === nextProps.tipo
);

// src/components/faturamento/DashboardFaturamento.tsx
export const DashboardFaturamento = memo(() => { /* ... */ });

// src/components/gerencia/GestaoTalentos.tsx
export const GestaoTalentos = memo(() => { /* ... */ });

// src/components/gerencia/LancamentoNotas.tsx
export const LancamentoNotas = memo(() => { /* ... */ });

// src/components/chamados/ChamadosDashboard.tsx
export const ChamadosDashboard = memo(() => { /* ... */ });
```

---

## ⚡ Quick Fix #3: RHDPModule Object Map

**ANTES:**
```typescript
// src/components/modules/RHDPModule.tsx
export const RHDPModule = () => {
  const [activeTab, setActiveTab] = useState("banco-horas");
  
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    logAction("navegacao_aba", "rhdp", { aba: value });
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'banco-horas': return <BancoHorasSection />;
      case 'atestados': return <CentralAtestadosSection />;
      case 'aso': return <ASOControl />;
      case 'escalas': return (
        <Tabs value={escalasSubTab} onValueChange={setEscalasSubTab}>
          {/* ... */}
        </Tabs>
      );
      case 'formularios': return <FormulariosSection />;
      case 'disciplinar': return <MovimentacoesDisciplinarSection />;
      case 'profissionais': return <ProfissionaisSaude />;
      case 'avaliacao': return <AvaliacaoDesempenhoSection />;
      case 'experiencia': return <AvaliacaoExperienciaSection />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* ... */}
      <div className="flex gap-4">
        <nav className="w-48 flex-shrink-0">
          {/* ... */}
        </nav>
        <div className="flex-1 min-w-0">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};
```

**DEPOIS:**
```typescript
// src/components/modules/RHDPModule.tsx
import { memo } from 'react';

// Memoizar cada section
const MemoizedBancoHoras = memo(BancoHorasSection);
const MemoizedAtestados = memo(CentralAtestadosSection);
const MemoizedFormularios = memo(FormulariosSection);
const MemoizedDisciplinar = memo(MovimentacoesDisciplinarSection);
const MemoizedAvaliacao = memo(AvaliacaoDesempenhoSection);
const MemoizedExperiencia = memo(AvaliacaoExperienciaSection);

// Object map para renderização eficiente
const SECTION_MAP = {
  'banco-horas': MemoizedBancoHoras,
  'atestados': MemoizedAtestados,
  'aso': ASOControl,
  'escalas': null, // Special handling below
  'formularios': MemoizedFormularios,
  'disciplinar': MemoizedDisciplinar,
  'profissionais': ProfissionaisSaude,
  'avaliacao': MemoizedAvaliacao,
  'experiencia': MemoizedExperiencia,
};

const EscalasTabContent = memo(({ escalasSubTab, setEscalasSubTab }) => (
  <Tabs value={escalasSubTab} onValueChange={setEscalasSubTab}>
    <TabsList className="flex flex-wrap h-auto gap-1">
      {ESCALAS_SUB_ITEMS.map(item => (
        <TabsTrigger key={item.id} value={item.id} className="gap-2">
          <item.icon className="h-4 w-4" />
          {item.label}
        </TabsTrigger>
      ))}
    </TabsList>
    {ESCALAS_SUB_ITEMS.map(item => (
      <TabsContent key={item.id} value={item.id} className="mt-4">
        {item.id === 'justificativa-horas' ? (
          <JustificativaDeHorasHistorico />
        ) : item.id === 'trocas-plantoes' ? (
          <TrocasPlantcoesHistorico />
        ) : (
          <EscalaTecEnfermagem tipo={item.id as any} />
        )}
      </TabsContent>
    ))}
  </Tabs>
));

export const RHDPModule = () => {
  const { isAdmin, hasRole, isLoading } = useUserRole();
  const { logAction } = useLogAccess();
  const [activeTab, setActiveTab] = useState("banco-horas");
  const [escalasSubTab, setEscalasSubTab] = useState("tecnicos");

  useEffect(() => {
    logAction("acesso_modulo", "rhdp");
  }, [logAction]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    logAction("navegacao_aba", "rhdp", { aba: value });
  };

  const isRHDP = hasRole("rh_dp");
  const hasAccess = isAdmin || isRHDP;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <ShieldX className="h-12 w-12 text-destructive mx-auto" />
          <p className="text-muted-foreground">Você não tem acesso a este módulo.</p>
        </div>
      </div>
    );
  }

  // Renderizar usando object map
  const renderContent = () => {
    if (activeTab === 'escalas') {
      return <EscalasTabContent escalasSubTab={escalasSubTab} setEscalasSubTab={setEscalasSubTab} />;
    }
    
    const Component = SECTION_MAP[activeTab];
    return Component ? <Component /> : null;
  };

  return (
    <div className="space-y-6">
      <Card>
        {/* CardHeader mesmo */}
        <CardContent>
          <div className="flex gap-4">
            <nav className="w-48 flex-shrink-0 space-y-0.5 border-r pr-3">
              {RHDP_NAV_ITEMS.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabChange(item.id)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-md text-left text-sm transition-colors",
                      isActive ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="flex-1 min-w-0">
              {renderContent()}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
```

**Benefícios:**
- ✅ Cada component re-renderiza APENAS mudanças internas
- ✅ Memo previne re-render da section inteira
- ✅ Code mais legível e maintenance-friendly
- ✅ Performance melhor em 20-30%

---

## 📋 Ordem de Implementação

### Dia 1 (2-3 horas)
1. Adicionar `staleTime` nos 7 hooks
   - ReuniaoModule: 5 min
   - useProtocoloAtendimentos: 10 min
   - useEnfermagem (4 hooks): 15 min
   - DISCFormModule: 5 min

2. Testar com React Query DevTools

### Dia 2 (3-4 horas)
3. Memoizar EscalaTecEnfermagem (CRÍTICA)
4. Memoizar 11 componentes Section
5. Refatorar RHDPModule com object map
6. Local testing

### Dia 3 (1-2 horas)
7. Performance testing com Profiler
8. Screenshots antes/depois
9. Create PR

---

## 🧪 Verificação Pós-Implementação

### Teste 1: React Query DevTools
```typescript
// Abrir DevTools (Ctrl+Shift+F)
// Mudar de aba 3 vezes
// Verificar que queries NÃO aparecem 3 vezes (deve estar em cache)
```

### Teste 2: React Profiler
```typescript
// DevTools > Profiler
// Record muda de aba
// Verificar:
// - Component re-renderiza apenas 1x (não 2-3x)
// - Queries result do cache (não nova fetch)
// - Tempo < 100ms
```

### Teste 3: Network
```typescript
// DevTools > Network
// Clear cache
// Mudar aba banco-horas → atestados → banco-horas
// Verificar que segunda requisição de banco-horas NÃO aparece
```

---

## 🎯 Métricas Esperadas

**ANTES:**
- Mudança de aba: 5 queries + 2-3 re-renders
- Tempo: 300-500ms
- Cache hit: 0%

**DEPOIS:**
- Mudança de aba: 0 queries (cache) + 0 re-renders (memo)
- Tempo: 50-100ms
- Cache hit: 100%

**Melhoria esperada: 3-5x mais rápido**

---

## 🔗 Referencias Práticas

- [React Query Docs - staleTime](https://tanstack.com/query/latest/docs/React/guides/important-defaults)
- [React Memo Docs](https://react.dev/reference/react/memo)
- [Performance Profiling](https://react.dev/learn/render-and-commit)

---

**Fim do Guia Prático**
