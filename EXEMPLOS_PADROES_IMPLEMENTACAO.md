# 💻 Exemplos de Implementação de Padrões de Qualidade

> **Referência rápida:** Como aplicar cada padrão nos componentes

---

## 📅 **Padrão 1: Formatação de Datas**

### Importação
```tsx
import { formatDate, formatDateTime, formatTime, formatDateTimeRelative } from '@/lib/date-formatter';
```

### Exemplo 1: Tabela com Datas (RH/DP - BancoHoras)
**Arquivo:** [src/components/rhdp/BancoHorasSection.tsx](src/components/rhdp/BancoHorasSection.tsx)

```tsx
// ❌ ANTES - Data sem formatação
<TableRow>
  <TableCell>{registro.data}</TableCell>
  <TableCell>{registro.created_at}</TableCell>
</TableRow>

// ✅ DEPOIS - Com formatação e tooltip
import { formatDateTime, formatDateTimeRelative } from '@/lib/date-formatter';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

<TableRow>
  <TableCell>
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-help text-sm">
          {formatDate(registro.data)}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        {formatDateTimeRelative(registro.data)}
      </TooltipContent>
    </Tooltip>
  </TableCell>
  <TableCell className="text-xs text-muted-foreground">
    {formatDateTime(registro.created_at)}
  </TableCell>
</TableRow>
```

### Exemplo 2: Filtro de Data (Faturamento)
**Arquivo:** [src/components/faturamento/DashboardFaturamento.tsx](src/components/faturamento/DashboardFaturamento.tsx)

```tsx
// ✅ BOAS PRÁTICAS
import { formatDate } from '@/lib/date-formatter';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';

<div className="flex gap-2">
  <input
    type="date"
    placeholder={formatDate(new Date())}
    onChange={(e) => setDataInicio(e.target.value)}
    title={`Filtrar de: ${formatDate(dataInicio)}`}
  />
  <span className="text-sm text-muted-foreground">até</span>
  <input
    type="date"
    placeholder={formatDate(addDays(new Date(), 7))}
    onChange={(e) => setDataFim(e.target.value)}
    title={`Filtrar até: ${formatDate(dataFim)}`}
  />
</div>
```

### Exemplo 3: Cards com Campos Temporais (Gerência - PDI)
**Arquivo:** [src/components/gerencia/PlanoDesenvolvimentoSection.tsx](src/components/gerencia/PlanoDesenvolvimentoSection.tsx)

```tsx
// ✅ IMPLEMENTAÇÃO
import { formatDate } from '@/lib/date-formatter';
import { isPast, addDays } from 'date-fns';

<Card>
  <CardContent className="pt-4">
    <div className="grid grid-cols-2 gap-2 text-xs">
      <div>
        <p className="text-muted-foreground">Data Início</p>
        <p className="font-semibold">{formatDate(pdi.data_inicio)}</p>
      </div>
      <div>
        <p className="text-muted-foreground">Data Fim</p>
        <p className={cn(
          "font-semibold",
          pdi.data_fim && isPast(new Date(pdi.data_fim)) && "text-red-600"
        )}>
          {pdi.data_fim ? formatDate(pdi.data_fim) : "Sem prazo"}
        </p>
      </div>
    </div>
  </CardContent>
</Card>
```

---

## 🎯 **Padrão 2: Status Badges**

### Importação
```tsx
import { StatusBadge } from '@/components/ui/status-badge';
```

### Exemplo 1: Bank de Horas (RH/DP)
**Arquivo:** [src/components/rhdp/BancoHorasSection.tsx](src/components/rhdp/BancoHorasSection.tsx)

```tsx
// ✅ MAPEAMENTO DE STATUS
type BancoHorasTipo = 'entrada' | 'saída' | 'ajuste';

function getTipoStatus(tipo: BancoHorasTipo): StatusType {
  const map: Record<BancoHorasTipo, StatusType> = {
    'entrada': 'success',    // Verde
    'saída': 'warning',       // Amarelo
    'ajuste': 'info',         // Azul
  };
  return map[tipo] || 'default';
}

// ✅ NA TABELA
<TableRow>
  <TableCell>{formatDate(registro.data)}</TableCell>
  <TableCell>
    <StatusBadge
      status={getTipoStatus(registro.tipo)}
      label={registro.tipo.toUpperCase()}
      showIcon={true}
    />
  </TableCell>
  <TableCell className="text-right font-semibold">
    {registro.horas}h
  </TableCell>
</TableRow>
```

### Exemplo 2: Atestados com Cores Diferentes (RH/DP)
**Arquivo:** [src/components/rhdp/CentralAtestadosSection.tsx](src/components/rhdp/CentralAtestadosSection.tsx)

```tsx
// ✅ STATUS COMPLEXO
type AtestadoStatus = 'ativo' | 'vencido' | 'pendente' | 'rejeitado';

function getAtestadoStatus(atestado: Atestado): AtestadoStatus {
  const hoje = new Date();
  const dataFim = new Date(atestado.data_fim);
  
  if (atestado.status === 'rejeitado') return 'rejeitado';
  if (dataFim < hoje) return 'vencido';
  if (atestado.status === 'pendente') return 'pendente';
  return 'ativo';
}

// ✅ NA TABELA
<TableRow key={atestado.id}>
  <TableCell>{formatDate(atestado.data_inicio)}</TableCell>
  <TableCell>{formatDate(atestado.data_fim)}</TableCell>
  <TableCell>{atestado.dias_afastamento} dias</TableCell>
  <TableCell>
    <StatusBadge
      status={getAtestadoStatus(atestado)}
      label={getAtestadoStatus(atestado).toUpperCase()}
      showIcon={true}
    />
  </TableCell>
</TableRow>
```

### Exemplo 3: Estoque Rouparia (Rouparia)
**Arquivo:** [src/components/rouparia/RoupariaEstoque.tsx](src/components/rouparia/RoupariaEstoque.tsx)

```tsx
// ✅ STATUS DE QUANTIDADE EM ESTOQUE
function getEstoqueStatus(
  quantidade: number,
  minimo: number
): StatusType {
  if (quantidade === 0) return 'error';           // Crítico
  if (quantidade < minimo) return 'warning';      // Baixo
  if (quantidade < minimo * 1.5) return 'info';   // Atenção
  return 'success';                               // OK
}

// ✅ NA TABELA
<TableRow>
  <TableCell>{item.descricao}</TableCell>
  <TableCell className="text-right">
    <div className="flex items-center justify-between">
      <span>{item.quantidade_atual}</span>
      <StatusBadge
        status={getEstoqueStatus(item.quantidade_atual, item.estoque_minimo)}
        label={item.quantidade_atual === 0 ? 'SEM ESTOQUE' : 'EM ESTOQUE'}
      />
    </div>
  </TableCell>
  <TableCell className="text-xs text-muted-foreground">
    Mín: {item.estoque_minimo}
  </TableCell>
</TableRow>
```

---

## 📭 **Padrão 3: Empty States**

### Importação
```tsx
import { EmptyState, EmptyPendencies, EmptyData, EmptySearchResults } from '@/components/shared/EmptyState';
import { EmptyState } from '@/components/ui/empty-state';
```

### Exemplo 1: Tabela Vazia (RH/DP)
**Arquivo:** [src/components/rhdp/BancoHorasSection.tsx](src/components/rhdp/BancoHorasSection.tsx)

```tsx
// ❌ ANTES - Sem feedback
{registros.length === 0 && <p>Nenhum registro</p>}

// ✅ DEPOIS - Com empty state
import { EmptyData } from '@/components/shared/EmptyState';
import { Clock } from 'lucide-react';

{isLoading ? (
  <LoadingState message="Carregando banco de horas..." />
) : registros.length === 0 ? (
  <EmptyData
    entityName="registros de banco de horas"
    description="Nenhuma entrada de banco de horas foi registrada ainda."
  />
) : (
  <Table>
    {/* ... conteúdo */}
  </Table>
)}
```

### Exemplo 2: Pendências Vazias (Gerência)
**Arquivo:** [src/components/gerencia/GestaoTalentos.tsx](src/components/gerencia/GestaoTalentos.tsx)

```tsx
// ✅ USAR COMPONENTE ESPECÍFICO
import { EmptyPendencies } from '@/components/shared/EmptyState';

{pendenciasDoColaborador.length === 0 ? (
  <EmptyPendencies />
) : (
  <div className="space-y-2">
    {pendenciasDoColaborador.map(p => (
      <div key={p.id} className="p-2 bg-amber-50 border border-amber-200 rounded">
        {p.titulo}
      </div>
    ))}
  </div>
)}
```

### Exemplo 3: Busca sem Resultados (Faturamento)
**Arquivo:** [src/components/faturamento/DashboardFaturamento.tsx](src/components/faturamento/DashboardFaturamento.tsx)

```tsx
// ✅ USAR COMPONENTE ESPECÍFICO
import { EmptySearchResults } from '@/components/shared/EmptyState';

const saidasFiltradas = saidas.filter(s => 
  s.id.includes(searchTerm) || s.status.includes(searchTerm)
);

{saidasFiltradas.length === 0 ? (
  searchTerm ? (
    <EmptySearchResults
      query={searchTerm}
      onClear={() => setSearchTerm('')}
    />
  ) : (
    <EmptyData entityName="saídas prontuário" />
  )
) : (
  <Table>{/* ... */}</Table>
)}
```

---

## 🔔 **Padrão 4: Toast Notifications**

### Importação
```tsx
import { useToast } from '@/hooks/use-toast';
import { toast } from 'sonner'; // Alternativa
```

### Exemplo 1: Operações CRUD (RH/DP)
**Arquivo:** [src/components/rhdp/BancoHorasSection.tsx](src/components/rhdp/BancoHorasSection.tsx)

```tsx
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';

export const BancoHorasSection = () => {
  const { toast } = useToast();

  // ✅ CRIAR
  const createMutation = useMutation({
    mutationFn: async (data) => {
      const { error } = await supabase
        .from('banco_horas')
        .insert([data]);
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "✅ Sucesso",
        description: `${data.horas}h registrado em ${formatDate(data.data)}`,
        variant: "default",
      });
      // Refetch data
    },
    onError: (error) => {
      toast({
        title: "❌ Erro ao registrar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // ✅ DELETAR
  const deleteMutation = useMutation({
    mutationFn: ({ id }: { id: string }) =>
      supabase.from('banco_horas').delete().eq('id', id),
    onSuccess: () => {
      toast({
        title: "✅ Registro removido",
        description: "O registro de banco de horas foi excluído.",
        variant: "default",
      });
    },
    onError: () => {
      toast({
        title: "❌ Erro ao deletar",
        description: "Não foi possível remover o registro.",
        variant: "destructive",
      });
    },
  });

  return (
    <>
      <Button
        onClick={() => createMutation.mutate(newEntry)}
        disabled={createMutation.isPending}
      >
        {createMutation.isPending ? "Salvando..." : "Salvar"}
      </Button>
    </>
  );
};
```

### Exemplo 2: Importação (Gerência)
**Arquivo:** [src/components/gerencia/ImportDataDialog.tsx](src/components/gerencia/ImportDataDialog.tsx)

```tsx
// ✅ TOAST COM PROGRESSO
import { toast } from 'sonner';

const handleImport = async (file: File) => {
  const total = rowCount;
  let success = 0;
  let error = 0;

  for (let i = 0; i < total; i++) {
    try {
      // Importar linha
      success++;
      
      // Atualizar toast a cada 10 registros
      if (i % 10 === 0) {
        toast.loading(`Importando... ${i + 1}/${total}`, {
          id: 'import-progress',
        });
      }
    } catch (err) {
      error++;
      console.error(`Erro na linha ${i}: ${err.message}`);
    }
  }

  // ✅ RESUMO FINAL
  toast.dismiss('import-progress');
  toast.success(`Importação concluída! ${success} OK, ${error} erros`, {
    description: `Total: ${total} registros`,
  });

  // Se houver erros, mostrar detalhe
  if (error > 0) {
    toast.error(`${error} registro(s) falharam`, {
      description: 'Verifique o arquivo e tente novamente',
    });
  }
};
```

### Exemplo 3: Ações com Loading (Rouparia)
**Arquivo:** [src/components/rouparia/RoupariaMovimentacao.tsx](src/components/rouparia/RoupariaMovimentacao.tsx)

```tsx
// ✅ COM LOADING STATE
const { toast } = useToast();

const handleRegistrarMovimentacao = async (dados) => {
  // ID único para controlar o toast
  const toastId = 'movimentacao-' + Date.now();

  toast({
    title: "⏳ Processando",
    description: "Registrando movimentação...",
    id: toastId,
  });

  try {
    const { error } = await supabase
      .from('rouparia_movimentacoes')
      .insert([dados]);

    if (error) throw error;

    // Sucesso
    toast({
      title: "✅ Movimentação registrada",
      description: `${dados.quantidade} peças de ${dados.descricao}`,
      variant: "default",
      id: toastId,
    });

    // Atualizar lista (refetch)
    
  } catch (error) {
    toast({
      title: "❌ Erro ao registrar",
      description: error.message,
      variant: "destructive",
      id: toastId,
    });
  }
};
```

---

## ⏳ **Padrão 5: Loading & Skeleton States**

### Importação
```tsx
import { LoadingState, LoadingSpinner } from '@/components/ui/loading-state';
import { TableSkeleton, CardGridSkeleton, FormSkeleton } from '@/components/ui/skeleton-loader';
```

### Exemplo 1: Tabela com Skeleton (RH/DP)
**Arquivo:** [src/components/rhdp/BancoHorasSection.tsx](src/components/rhdp/BancoHorasSection.tsx)

```tsx
import { TableSkeleton } from '@/components/ui/skeleton-loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

{isLoading ? (
  <TableSkeleton rows={5} cols={4} />
) : registros.length === 0 ? (
  <EmptyData entityName="registros de banco de horas" />
) : (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Data</TableHead>
        <TableHead>Tipo</TableHead>
        <TableHead>Horas</TableHead>
        <TableHead>Ações</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {registros.map(r => (
        <TableRow key={r.id}>
          <TableCell>{formatDate(r.data)}</TableCell>
          <TableCell>
            <StatusBadge status={getTipoStatus(r.tipo)} label={r.tipo} />
          </TableCell>
          <TableCell>{r.horas}h</TableCell>
          <TableCell>
            <Button size="sm" variant="ghost">Editar</Button>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
)}
```

### Exemplo 2: Dashboard com Cards Skeleton (Gerência)
**Arquivo:** [src/components/gerencia/GestaoTalentos.tsx](src/components/gerencia/GestaoTalentos.tsx)

```tsx
import { CardGridSkeleton } from '@/components/ui/skeleton-loader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

{isLoading ? (
  <CardGridSkeleton cards={3} />
) : (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <Users className="h-5 w-5 text-muted-foreground" />
          <span className="text-2xl font-bold">{colaboradores.length}</span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">Total Colaboradores</p>
      </CardContent>
    </Card>
    {/* ... mais cards */}
  </div>
)}
```

### Exemplo 3: Loading dentro de um Card (Faturamento)
**Arquivo:** [src/components/faturamento/DashboardFaturamento.tsx](src/components/faturamento/DashboardFaturamento.tsx)

```tsx
import { LoadingState } from '@/components/ui/loading-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

<Card>
  <CardHeader>
    <CardTitle>Saídas Prontuário</CardTitle>
  </CardHeader>
  <CardContent>
    {isLoading ? (
      <LoadingState message="Carregando saídas..." size="default" />
    ) : saidas.length === 0 ? (
      <EmptyData entityName="saídas prontuário" />
    ) : (
      <Table>{/* ... */}</Table>
    )}
  </CardContent>
</Card>
```

---

## 🎨 **Padrão 6: Tooltips com Informações Contextuais**

### Importação
```tsx
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
```

### Exemplo 1: Data com Histórico (RH/DP)
**Arquivo:** [src/components/rhdp/CentralAtestadosSection.tsx](src/components/rhdp/CentralAtestadosSection.tsx)

```tsx
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatDate, formatDateTimeRelative } from '@/lib/date-formatter';

<TableRow>
  <TableCell>
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-help underline underline-offset-2">
          {formatDate(atestado.data_inicio)}
        </span>
      </TooltipTrigger>
      <TooltipContent className="w-64">
        <div className="space-y-1 text-sm">
          <p><strong>Início:</strong> {formatDateTimeRelative(atestado.data_inicio)}</p>
          <p><strong>Fim:</strong> {formatDateTimeRelative(atestado.data_fim)}</p>
          <p><strong>Médico:</strong> {atestado.medico_nome}</p>
          <p><strong>CID:</strong> {atestado.cid}</p>
        </div>
      </TooltipContent>
    </Tooltip>
  </TableCell>
</TableRow>
```

### Exemplo 2: Avatar com Perfil (Gerência)
**Arquivo:** [src/components/gerencia/GestaoTalentos.tsx](src/components/gerencia/GestaoTalentos.tsx)

```tsx
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

<Tooltip>
  <TooltipTrigger asChild>
    <Avatar className="cursor-help h-10 w-10">
      <AvatarImage src={colaborador.avatar_url} />
      <AvatarFallback>{getInitials(colaborador.full_name)}</AvatarFallback>
    </Avatar>
  </TooltipTrigger>
  <TooltipContent className="w-64 p-3">
    <div className="space-y-2">
      <p><strong>{colaborador.full_name}</strong></p>
      <div className="text-xs space-y-1 text-muted-foreground">
        <p>Cargo: {colaborador.cargo || "N/A"}</p>
        <p>Setor: {colaborador.setor || "N/A"}</p>
        <p>Saldo BH: <span className="text-accent font-semibold">{formatHM(colaborador.saldoHoras)}</span></p>
      </div>
    </div>
  </TooltipContent>
</Tooltip>
```

---

## 🚀 Exemplo Completo: Refatoração de um Componente

### Antes (SEM PADRÕES)
**Arquivo:** [src/components/rhdp/BancoHorasSection.tsx](src/components/rhdp/BancoHorasSection.tsx) - Versão Original

```tsx
const BancoHorasSection = () => {
  const [registros, setRegistros] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Fetch dados
  }, []);

  return (
    <div>
      {isLoading ? (
        <p>Carregando...</p>
      ) : registros.length === 0 ? (
        <p>Nenhum registro</p>
      ) : (
        <table>
          {registros.map(r => (
            <tr key={r.id}>
              <td>{r.data}</td>
              <td>{r.tipo}</td>
              <td>{r.horas}</td>
            </tr>
          ))}
        </table>
      )}
    </div>
  );
};
```

### Depois (COM PADRÕES) ✅

```tsx
import { useState, useEffect, memo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDate, formatDateTime } from '@/lib/date-formatter';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyData } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/ui/loading-state';
import { TableSkeleton } from '@/components/ui/skeleton-loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface BancoHora {
  id: string;
  data: string;
  tipo: 'entrada' | 'saída' | 'ajuste';
  horas: number;
  created_at: string;
}

function getTipoStatus(tipo: BancoHora['tipo']) {
  const map: Record<BancoHora['tipo'], 'success' | 'warning' | 'info'> = {
    'entrada': 'success',
    'saída': 'warning',
    'ajuste': 'info',
  };
  return map[tipo];
}

export const BancoHorasSection = memo(() => {
  const { toast } = useToast();
  const [registros, setRegistros] = useState<BancoHora[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('banco_horas')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setRegistros(data || []);
      } catch (error) {
        toast({
          title: "❌ Erro ao carregar",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // ✅ LOADING STATE
  if (isLoading) {
    return <TableSkeleton rows={5} cols={4} />;
  }

  // ✅ EMPTY STATE
  if (registros.length === 0) {
    return (
      <EmptyData
        entityName="registros de banco de horas"
        description="Nenhuma entrada de banco de horas foi registrada ainda."
      />
    );
  }

  // ✅ TABELA COM PADRÕES
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead className="text-right">Horas</TableHead>
            <TableHead className="text-xs text-muted-foreground">Registrado em</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {registros.map((registro) => (
            <TableRow key={registro.id}>
              {/* Data com Tooltip */}
              <TableCell>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-help underline underline-offset-2">
                      {formatDate(registro.data)}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {new Date(registro.data).toLocaleDateString('pt-BR', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </TooltipContent>
                </Tooltip>
              </TableCell>
              
              {/* Tipo com StatusBadge */}
              <TableCell>
                <StatusBadge
                  status={getTipoStatus(registro.tipo)}
                  label={registro.tipo.charAt(0).toUpperCase() + registro.tipo.slice(1)}
                  showIcon={true}
                />
              </TableCell>
              
              {/* Horas */}
              <TableCell className="text-right font-semibold">
                {registro.horas}h
              </TableCell>
              
              {/* Data de Registro */}
              <TableCell className="text-xs text-muted-foreground">
                {formatDateTime(registro.created_at)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
});

BancoHorasSection.displayName = 'BancoHorasSection';
```

---

## 📋 Checklist de Implementação

Para cada componente, seguir este checklist:

```
[ ] Datas formatadas com `formatDate()` / `formatDateTime()`
[ ] Empty states com ícone e descrição
[ ] StatusBadges para campos de status
[ ] Toasts para ações (criar, editar, deletar)
[ ] Loading/Skeleton states configurados
[ ] Tooltips em campos complexos
[ ] Validações visuais em inputs
[ ] Mensagens de erro claras
[ ] Responsividade testada
[ ] Acessibilidade verificada
```

---

**Mantém a consistência visual e funcional em toda a aplicação! 🎯**
