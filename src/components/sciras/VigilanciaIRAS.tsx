import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SearchInput } from '@/components/ui/search-input';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingState } from '@/components/ui/loading-state';
import { StatusBadge } from '@/components/ui/status-badge';
import { toast } from 'sonner';
import { Plus, Bug, Search } from 'lucide-react';
import { format } from 'date-fns';
import { SITIOS_INFECCAO, DISPOSITIVOS_INVASIVOS } from './types';
import type { VigilanciaIRAS } from './types';

interface Props {
  userId: string;
  userName: string;
}

export function VigilanciaIRASComponent({ userId, userName }: Props) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');

  const { data: registros = [], isLoading } = useQuery({
    queryKey: ['sciras-iras'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sciras_vigilancia_iras')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as VigilanciaIRAS[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (form: Partial<VigilanciaIRAS>) => {
      const { error } = await supabase.from('sciras_vigilancia_iras').insert({
        ...form,
        numero_notificacao: 'temp',
        notificador_id: userId,
        notificador_nome: userName,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sciras-iras'] });
      setDialogOpen(false);
      toast.success('Registro de IRAS criado com sucesso');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const filtered = registros.filter(r => {
    const matchSearch = !search || r.paciente_nome.toLowerCase().includes(search.toLowerCase()) ||
      r.numero_notificacao.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'todos' || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statusMap: Record<string, 'success' | 'warning' | 'error' | 'info' | 'pending' | 'processing' | 'default'> = {
    em_investigacao: 'processing',
    confirmado: 'error',
    descartado: 'success',
    notificado: 'warning',
  };

  const statusLabelsMap: Record<string, string> = {
    em_investigacao: 'Em Investigação',
    confirmado: 'Confirmado',
    descartado: 'Descartado',
    notificado: 'Notificado',
  };

  if (isLoading) return <LoadingState message="Carregando vigilância IRAS..." />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-1 w-full sm:w-auto">
          <SearchInput placeholder="Buscar por paciente ou nº..." value={search} onChange={setSearch} className="flex-1" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="em_investigacao">Em Investigação</SelectItem>
              <SelectItem value="confirmado">Confirmado</SelectItem>
              <SelectItem value="descartado">Descartado</SelectItem>
              <SelectItem value="notificado">Notificado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Nova Notificação IRAS</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Registrar Nova IRAS</DialogTitle>
            </DialogHeader>
            <NovaIRASForm onSubmit={(form) => createMutation.mutate(form)} isLoading={createMutation.isPending} />
          </DialogContent>
        </Dialog>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Bug} title="Nenhum registro encontrado" description="Nenhuma notificação de IRAS cadastrada." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>Sítio</TableHead>
                  <TableHead>Data Infecção</TableHead>
                  <TableHead>Dispositivo</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.numero_notificacao}</TableCell>
                    <TableCell className="font-medium">{r.paciente_nome}</TableCell>
                    <TableCell>{r.setor}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {SITIOS_INFECCAO.find(s => s.value === r.sitio_infeccao)?.label || r.sitio_infeccao}
                      </Badge>
                    </TableCell>
                    <TableCell>{format(new Date(r.data_infeccao), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>{DISPOSITIVOS_INVASIVOS.find(d => d.value === r.dispositivo_invasivo)?.label || r.dispositivo_invasivo || '-'}</TableCell>
                    <TableCell>
                      <StatusBadge status={statusMap[r.status] || 'default'} label={statusLabelsMap[r.status] || r.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function NovaIRASForm({ onSubmit, isLoading }: { onSubmit: (f: any) => void; isLoading: boolean }) {
  const [form, setForm] = useState({
    paciente_nome: '',
    numero_prontuario: '',
    setor: '',
    leito: '',
    data_internacao: '',
    data_infeccao: '',
    sitio_infeccao: '',
    tipo_iras: 'hospitalar',
    dispositivo_invasivo: '',
    microrganismo: '',
    perfil_resistencia: '',
    classificacao_gravidade: 'moderado',
    observacoes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.paciente_nome || !form.setor || !form.data_infeccao || !form.sitio_infeccao) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Paciente *</Label>
          <Input value={form.paciente_nome} onChange={e => setForm(p => ({ ...p, paciente_nome: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Prontuário</Label>
          <Input value={form.numero_prontuario} onChange={e => setForm(p => ({ ...p, numero_prontuario: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Setor *</Label>
          <Input value={form.setor} onChange={e => setForm(p => ({ ...p, setor: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Leito</Label>
          <Input value={form.leito} onChange={e => setForm(p => ({ ...p, leito: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Data Internação</Label>
          <Input type="date" value={form.data_internacao} onChange={e => setForm(p => ({ ...p, data_internacao: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Data Infecção *</Label>
          <Input type="date" value={form.data_infeccao} onChange={e => setForm(p => ({ ...p, data_infeccao: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Sítio de Infecção *</Label>
          <Select value={form.sitio_infeccao} onValueChange={v => setForm(p => ({ ...p, sitio_infeccao: v }))}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {SITIOS_INFECCAO.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Tipo</Label>
          <Select value={form.tipo_iras} onValueChange={v => setForm(p => ({ ...p, tipo_iras: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="hospitalar">Hospitalar</SelectItem>
              <SelectItem value="comunitaria">Comunitária</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Dispositivo Invasivo</Label>
          <Select value={form.dispositivo_invasivo} onValueChange={v => setForm(p => ({ ...p, dispositivo_invasivo: v }))}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {DISPOSITIVOS_INVASIVOS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Gravidade</Label>
          <Select value={form.classificacao_gravidade} onValueChange={v => setForm(p => ({ ...p, classificacao_gravidade: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="leve">Leve</SelectItem>
              <SelectItem value="moderado">Moderado</SelectItem>
              <SelectItem value="grave">Grave</SelectItem>
              <SelectItem value="obito">Óbito</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Microrganismo</Label>
          <Input value={form.microrganismo} onChange={e => setForm(p => ({ ...p, microrganismo: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Perfil de Resistência</Label>
          <Select value={form.perfil_resistencia} onValueChange={v => setForm(p => ({ ...p, perfil_resistencia: v }))}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="sensivel">Sensível</SelectItem>
              <SelectItem value="resistente">Resistente</SelectItem>
              <SelectItem value="multirresistente">Multirresistente</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Observações</Label>
        <Textarea value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} />
      </div>
      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? 'Salvando...' : 'Registrar IRAS'}
      </Button>
    </form>
  );
}
