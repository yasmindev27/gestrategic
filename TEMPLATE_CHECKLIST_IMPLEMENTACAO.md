# ✅ TEMPLATE & CHECKLIST - Implementação de Padrões de Qualidade

**Como usar:** Copia este checklist para cada componente a implementar

---

## 📋 CHECKLIST PADRÃO DE IMPLEMENTAÇÃO

### Componente: ___________________  
**Arquivo:** `src/components/[modulo]/[NomeComponente].tsx`  
**Prioridade:** ☐ P1 | ☐ P2 | ☐ P3  
**Data Início:** ___/___/2026  
**Data Conclusão:** ___/___/2026  

---

## 🔍 FASE 1: ANÁLISE

### 1.1 Listar Campos que Precisam Formatação de Datas
```
Campos identificados:
☐ _________________ → usar formatDate()
☐ _________________ → usar formatDateTime()
☐ _________________ → usar formatTime()
☐ _________________ → usar formatDateTimeRelative()

Justificativa:
___________________________________________________________________
```

### 1.2 Identificar campos de Status
```
Campo de status: _____________________

Possíveis valores:
☐ valor1 → tipo visual: ___________
☐ valor2 → tipo visual: ___________
☐ valor3 → tipo visual: ___________

Donde vem este status: ______________________________________________
```

### 1.3 Validar Empty States Necessários
```
Quando dados vazios?
☐ array.length === 0
☐ Função falhou e retornou null
☐ Usuário não tem permissão

Tipo de empty state apropriado:
☐ EmptyData (dados/tabela)
☐ EmptyPendencies (tarefas/pendências)
☐ EmptySearchResults (buscas)
☐ EmptyState genérico

Ícone apropriado: _____________________
Título sugerido: ____________________________________
Descrição: _________________________________________________________________
```

### 1.4 Ações que Precisam Toast
```
Ações identificadas:
☐ [CREATE] Criar novo registro
   Mensagem sucesso: _____________________________________________________
   Mensagem erro: _______________________________________________________
   
☐ [UPDATE] Atualizar registro
   Mensagem sucesso: _____________________________________________________
   Mensagem erro: _______________________________________________________
   
☐ [DELETE] Deletar registro
   Mensagem sucesso: _____________________________________________________
   Mensagem erro: _______________________________________________________
   
☐ [IMPORTAR] Importar dados
   Formato: ______________________________________________________________
   
☐ [EXPORTAR] Exportar dados
   Formato: ______________________________________________________________
```

### 1.5 Necessidade de Loading/Skeleton
```
☐ Carregamento inicial de dados
☐ Busca/Filter resulta em loading
☐ Upload/Download resulta em loading
☐ Operação async longa

Tipo de skeleton:
☐ TableSkeleton(rows=?, cols=?)
☐ CardGridSkeleton(cards=?)
☐ FormSkeleton(fields=?)
☐ LoadingState genérico
```

### 1.6 Tooltips/Informações Contextuais
```
Campos que precisam tooltip:
☐ _________________ → info: _____________________________________________
☐ _________________ → info: _____________________________________________
☐ _________________ → info: _____________________________________________
```

---

## 💻 FASE 2: IMPLEMENTAÇÃO

### 2.1 Preparar Imports
```tsx
// Copiar esta seção no topo do arquivo:

// ✅ Date Formatting
import { 
  formatDate, 
  formatDateTime, 
  formatTime, 
  formatDateTimeRelative,
  isValidDate 
} from '@/lib/date-formatter';

// ✅ UI Components
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyData, EmptyPendencies, EmptySearchResults } from '@/components/shared/EmptyState';
import { LoadingState, LoadingSpinner } from '@/components/ui/loading-state';
import { TableSkeleton, CardGridSkeleton, FormSkeleton } from '@/components/ui/skeleton-loader';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// ✅ Notifications
import { useToast } from '@/hooks/use-toast';

// ✅ Data Fetching
import { useMutation, useQueryClient } from '@tanstack/react-query';
```

#### Status da Implementação:
- ☐ Imports adicionados
- ☐ Compilação sem erro
- ☐ No console warnings

---

### 2.2 Implementar Formatação de Datas

**Arquivo para editar:** [src/components/[modulo]/[NomeComponente].tsx](src/components/[modulo]/[NomeComponente].tsx)

```tsx
// ANTES
<TableCell>{registro.data}</TableCell>
<TableCell>{registro.created_at}</TableCell>

// DEPOIS
<TableCell>
  {formatDate(registro.data)}
</TableCell>
<TableCell className="text-xs text-muted-foreground">
  {formatDateTime(registro.created_at)}
</TableCell>
```

**Campos a atualizar:**
- ☐ Campo 1: `{campo}` → `formatDate({campo})`
- ☐ Campo 2: `{campo}` → `formatDateTime({campo})`
- ☐ Campo 3: `{campo}` → `formatTime({campo})`

#### Status:
- ☐ Todas as datas formatadas
- ☐ Sem erros no console
- ☐ Data exibida corretamente em pt-BR

---

### 2.3 Implementar Status Badges

**Criar função helper:**

```tsx
// Adicionar após imports e antes do componente:

type [NomeComponente]Status = 'valor1' | 'valor2' | 'valor3';

function getStatusType(
  valor: [NomeComponente]Status
): StatusType {
  const map: Record<[NomeComponente]Status, StatusType> = {
    'valor1': 'success',      // ✅ Verde
    'valor2': 'warning',      // ⚠️ Amarelo
    'valor3': 'error',        // ❌ Vermelho
  };
  return map[valor] || 'default';
}
```

**Usar no render:**

```tsx
// ANTES
<TableCell>{registro.status}</TableCell>

// DEPOIS
<TableCell>
  <StatusBadge
    status={getStatusType(registro.status)}
    label={registro.status.toUpperCase()}
    showIcon={true}
  />
</TableCell>
```

#### Status:
- ☐ Função getStatusType criada
- ☐ Cores mapeadas corretamente
- ☐ StatusBadges renderizando
- ☐ Ícones animados para "processing"

---

### 2.4 Implementar Empty States

**Adicionar verificação antes de render:**

```tsx
// NO RENDER
if (isLoading) {
  return <TableSkeleton rows={5} cols={4} />;
}

if (data.length === 0) {
  return (
    <EmptyData
      entityName="registros de [entity]"
      description="Nenhum registro foi encontrado."
    />
  );
}

// Renderizar conteúdo normal aqui
return <Table>{/* ... */}</Table>;
```

#### Status:
- ☐ Verificação `isLoading` adicionada
- ☐ Verificação `data.length === 0` adicionada
- ☐ EmptyState renderiza corretamente
- ☐ Ícones aparecem
- ☐ Texto é claro e informativo

---

### 2.5 Implementar Toast Notifications

**Para CREATE:**

```tsx
const createMutation = useMutation({
  mutationFn: async (formData) => {
    const { error } = await supabase
      .from('[tabela]')
      .insert([formData]);
    
    if (error) throw error;
    return formData;
  },
  onSuccess: (data) => {
    toast({
      title: "✅ Sucesso",
      description: `Registro criado: ${data.descricao}`,
      variant: "default",
    });
    queryClient.invalidateQueries({ queryKey: ['[entity]'] });
  },
  onError: (error: Error) => {
    toast({
      title: "❌ Erro ao criar",
      description: error.message || "Não foi possível criar o registro",
      variant: "destructive",
    });
  },
});
```

**Para UPDATE:**

```tsx
const updateMutation = useMutation({
  // ... similar to create
  onSuccess: () => {
    toast({
      title: "✅ Atualizado",
      description: "Registro foi atualizado",
    });
  },
});
```

**Para DELETE com Confirmação:**

```tsx
const deleteConfirm = () => {
  deleteMutation.mutate({ id: selectedItem.id });
};

const deleteMutation = useMutation({
  mutationFn: async ({ id }) => {
    const { error } = await supabase
      .from('[tabela]')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },
  onSuccess: () => {
    toast({
      title: "✅ Removido",
      description: "Registro foi excluído",
    });
  },
  onError: (error: Error) => {
    toast({
      title: "❌ Erro ao deletar",
      description: error.message,
      variant: "destructive",
    });
  },
});
```

#### Status:
- ☐ Toast para CREATE implementado
- ☐ Toast para UPDATE implementado
- ☐ Toast para DELETE implementado
- ☐ Toast de erro implementado
- ☐ Mensagens são informativas

---

### 2.6 Implementar Loading/Skeleton

**Adicionar estado de loading:**

```tsx
const [isLoading, setIsLoading] = useState(true);

useEffect(() => {
  fetchData();
}, []);

const fetchData = async () => {
  try {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('[tabela]')
      .select('*');
    
    if (error) throw error;
    setData(data);
  } catch (error) {
    toast({
      title: "Erro ao carregar",
      description: error.message,
      variant: "destructive",
    });
  } finally {
    setIsLoading(false);
  }
};
```

**No render:**

```tsx
if (isLoading) {
  return <TableSkeleton rows={5} cols={4} />;
  // ou
  // return <CardGridSkeleton cards={3} />;
}
```

#### Status:
- ☐ Estado `isLoading` criado
- ☐ Skeleton renderiza durante loading
- ☐ Skeleton desaparece quando termina
- ☐ Dados aparecem após loading

---

### 2.7 Implementar Tooltips

```tsx
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// NO RENDER
<Tooltip>
  <TooltipTrigger asChild>
    <span className="cursor-help underline underline-offset-2">
      {visibleText}
    </span>
  </TooltipTrigger>
  <TooltipContent className="w-64">
    <div className="space-y-1 text-sm">
      <p><strong>Campo 1:</strong> valor1</p>
      <p><strong>Campo 2:</strong> valor2</p>
      <p><strong>Contexto:</strong> informação adicional</p>
    </div>
  </TooltipContent>
</Tooltip>
```

#### Status:
- ☐ Tooltip adiciona context
- ☐ Cursor muda para "help"
- ☐ Conteúdo é relevante
- ☐ Lay out não quebra

---

## 🧪 FASE 3: VALIDAÇÃO

### 3.1 Testes Visuais
```
Em diferentes navegadores:
☐ Chrome (Desktop)
☐ Firefox (Desktop)
☐ Safari (Desktop)
☐ Chrome Mobile
☐ Safari Mobile

Verificar:
☐ Datas formatadas corretamente
☐ Status badges com cores corretas
☐ Empty states renderizam
☐ Toasts aparecem em ações
☐ Skeleton carrega
☐ Tooltips funcionam
☐ Responsividade mantida
```

### 3.2 Testes Funcionais
```
☐ Criar novo item → toast success
☐ Editar item → toast success
☐ Deletar item → toast + confirmação
☐ Carregar dados → skeleton → dados
☐ Sem dados → empty state
☐ Erro na API → toast error
☐ Filtro sem resultados → empty state
☐ Tooltip ao passar mouse
```

### 3.3 Verificação de Acessibilidade
```
☐ Toasts acessíveis (ARIA)
☐ Tooltips com label
☐ Cores suficiente contraste
☐ Texto alternativo em ícones
☐ Navegação por teclado funciona
```

### 3.4 Performance
```
☐ Sem re-renders desnecessários
☐ Skeleton não causa layout shift
☐ Nenhum memory leak
☐ Console sem warnings
☐ Bundle size não aumentou significativamente
```

---

## 📸 FASE 4: CAPTURA DE EVIDÊNCIAS

### Screenshots para PR:

```
ANTES (sem padrões):
- [ ] Screenshot do estado vazio (sem empty state)
- [ ] Screenshot da tabela com datas brutas
- [ ] Screenshot sem status visual

DEPOIS (com padrões):
- [ ] Screenshot com empty state bonito
- [ ] Screenshot com datas formatadas
- [ ] Screenshot com status badges coloridas
- [ ] Screenshot com tooltip ao passar mouse
- [ ] Screenshot com toast notification
```

### Screen Recording (opcional):
```
- [ ] Criar novo registro (toast)
- [ ] Deletar registro (confirmação + toast)
- [ ] Carregar dados (skeleton)
- [ ] Filtro sem resultados (empty state)
- [ ] Hover em tooltip (contexto)
```

---

## 🚀 FASE 5: FINALIZAÇÃO

### 5.1 Code Review Checklist

```tsx
// Verificar:
☐ Todos imports necessários presentes
☐ Nenhum import não utilizado
☐ Funções helper bem nomeadas
☐ Types/Interfaces claros
☐ Sem console.log() ou commented code
☐ Sem warnings no TypeScript
☐ Código segue padrões do projeto
☐ Memoization apropriada (React.memo)
☐ displayName setado em componentes
```

### 5.2 Documentação

```
☐ Comentários adicionados em lógica complexa
☐ JSDoc para funções públicas
☐ Exemplo de uso documentado
☐ Status de deprecation (se aplicável)
```

### 5.3 Commit & PR

```bash
# Mensagem de commit:
# Exemplo:
git commit -m "feat: aplicar padrões de qualidade em BancoHorasSection

- ✅ Formatação de datas com formatDate/formatDateTime
- ✅ Status badges para tipo de movimento (entrada/saída/ajuste)
- ✅ Empty state quando sem registros
- ✅ Toast notifications para ações CRUD
- ✅ Skeleton loader durante carregamento
- ✅ Tooltips com contexto de datas completo

Componentes afetados:
- BancoHorasSection.tsx

Testes:
- Verificado em Chrome, Firefox, Safari
- Mobile responsividade testada
- Acessibilidade verificada"

# Push e criar PR
git push origin feat/padoes-banco-horas
```

### PR Description Template:

```markdown
## 📋 Descrição
Implementação de padrões de qualidade no componente [NomeComponente]:

## ✅ Mudanças
- Formatação de datas com `formatDate()`
- Status badges para campo `[campo]`
- Empty state quando sem dados
- Toast notifications para ações
- Skeleton loader durante loading
- Tooltips com informações contextuais

## 📱 Tipo de Mudança
- [ ] 🐛 Bug fix
- [x] ✨ Novo recurso
- [ ] 🔄 Refatoração
- [ ] 📚 Documentação
- [ ] 🎨 Estilos

## 📸 Screenshots
[ANTES]
[DEPOIS]

## ✅ Checklits
- [x] Código testado localmente
- [x] Testes visuais em múltiplos navegadores
- [x] Responsividade mobile verificada
- [x] Acessibilidade verificada
- [x] Sem console warnings/errors

## 🔗 Links Relacionados
Referência: PADROES_QUALIDADE_MODULOS.md
```

---

## 📊 TEMPLATE DE RESUMO

**Componente:** ___________________  
**Data Conclusão:** ___/___/2026  
**Tempo Gasto:** ___ horas  
**Padrões Implementados:** 
- ☐ Formatação de Datas
- ☐ Empty States
- ☐ Status Badges
- ☐ Toast Notifications
- ☐ Loading/Skeleton
- ☐ Tooltips

**Observações:**
________________________________________________________________
________________________________________________________________

**Próximos Passos:**
________________________________________________________________

---

## 🎓 APRENDIZADOS (para próximas implementações)

O que funcionou bem:
________________________________________________________________

O que foi difícil:
________________________________________________________________

Melhorias para próximos componentes:
________________________________________________________________

---

**COMPONENTE CONCLUÍDO ✅**

Assinatura: _________________________ Data: ___/___/2026
