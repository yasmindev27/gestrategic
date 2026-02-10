import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
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
import { Plus, Pill, AlertTriangle } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ANTIMICROBIANOS_COMUNS } from './types';
import type { Antimicrobiano } from './types';

interface Props {
  userId: string;
  userName: string;
}

export function ControleAntimicrobianos({ userId, userName }: Props) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');

  const { data: registros = [], isLoading } = useQuery({
    queryKey: ['sciras-antimicrobianos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sciras_antimicrobianos')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Antimicrobiano[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (form: any) => {
      const { error } = await supabase.from('sciras_antimicrobianos').insert({
        ...form,
        registrado_por: userId,
        registrado_por_nome: userName,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sciras-antimicrobianos'] });
      setDialogOpen(false);
      toast.success('Antimicrobiano registrado com sucesso');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const filtered = registros.filter(r => {
    const matchSearch = !search || r.paciente_nome.toLowerCase().includes(search.toLowerCase()) ||
      r.antimicrobiano.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'todos' || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statusMap: Record<string, 'success' | 'warning' | 'error' | 'info' | 'pending' | 'processing' | 'default'> = {
    em_uso: 'processing',
    suspenso: 'warning',
    concluido: 'success',
    ajustado: 'info',
  };

  if (isLoading) return <LoadingState message="Carregando antimicrobianos..." />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-1 w-full sm:w-auto">
          <SearchInput placeholder="Buscar..." value={search} onChange={setSearch} className="flex-1" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="em_uso">Em Uso</SelectItem>
              <SelectItem value="suspenso">Suspenso</SelectItem>
              <SelectItem value="concluido">Concluído</SelectItem>
              <SelectItem value="ajustado">Ajustado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Novo Registro</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Registrar Antimicrobiano</DialogTitle>
            </DialogHeader>
            <NovoAntimicrobianoForm onSubmit={(f) => createMutation.mutate(f)} isLoading={createMutation.isPending} />
          </DialogContent>
        </Dialog>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Pill} title="Nenhum registro" description="Nenhum antimicrobiano registrado." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Antimicrobiano</TableHead>
                  <TableHead>Dose</TableHead>
                  <TableHead>Via</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead>Dias</TableHead>
                  <TableHead>Indicação</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(r => {
                  const dias = r.dias_uso || differenceInDays(
                    r.data_fim ? new Date(r.data_fim) : new Date(),
                    new Date(r.data_inicio)
                  );
                  const usoProlong = dias > 14;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.paciente_nome}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {r.antimicrobiano}
                          {usoProlong && (
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{r.dose}</TableCell>
                      <TableCell>{r.via_administracao}</TableCell>
                      <TableCell>{format(new Date(r.data_inicio), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>
                        <Badge variant={usoProlong ? 'destructive' : 'secondary'}>{dias}d</Badge>
                      </TableCell>
                      <TableCell className="capitalize">{r.indicacao || '-'}</TableCell>
                      <TableCell>
                        <StatusBadge status={statusMap[r.status] || 'default'} label={r.status.replace('_', ' ')} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function NovoAntimicrobianoForm({ onSubmit, isLoading }: { onSubmit: (f: any) => void; isLoading: boolean }) {
  const [form, setForm] = useState({
    paciente_nome: '',
    numero_prontuario: '',
    setor: '',
    antimicrobiano: '',
    dose: '',
    via_administracao: 'IV',
    data_inicio: format(new Date(), 'yyyy-MM-dd'),
    data_fim: '',
    indicacao: 'terapeutico',
    justificativa: '',
    prescrito_por: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.paciente_nome || !form.setor || !form.antimicrobiano || !form.dose) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }
    const payload = {
      ...form,
      data_fim: form.data_fim || null,
    };
    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
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
          <Label>Antimicrobiano *</Label>
          <Select value={form.antimicrobiano} onValueChange={v => setForm(p => ({ ...p, antimicrobiano: v }))}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {ANTIMICROBIANOS_COMUNS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Dose *</Label>
          <Input value={form.dose} onChange={e => setForm(p => ({ ...p, dose: e.target.value }))} placeholder="Ex: 1g 8/8h" />
        </div>
        <div className="space-y-2">
          <Label>Via</Label>
          <Select value={form.via_administracao} onValueChange={v => setForm(p => ({ ...p, via_administracao: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="IV">Intravenosa (IV)</SelectItem>
              <SelectItem value="VO">Via Oral (VO)</SelectItem>
              <SelectItem value="IM">Intramuscular (IM)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Data Início *</Label>
          <Input type="date" value={form.data_inicio} onChange={e => setForm(p => ({ ...p, data_inicio: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Data Fim</Label>
          <Input type="date" value={form.data_fim} onChange={e => setForm(p => ({ ...p, data_fim: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Indicação</Label>
          <Select value={form.indicacao} onValueChange={v => setForm(p => ({ ...p, indicacao: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="terapeutico">Terapêutico</SelectItem>
              <SelectItem value="profilatico">Profilático</SelectItem>
              <SelectItem value="empirico">Empírico</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Prescrito por</Label>
          <Input value={form.prescrito_por} onChange={e => setForm(p => ({ ...p, prescrito_por: e.target.value }))} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Justificativa</Label>
        <Textarea value={form.justificativa} onChange={e => setForm(p => ({ ...p, justificativa: e.target.value }))} />
      </div>
      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? 'Salvando...' : 'Registrar'}
      </Button>
    </form>
  );
}
