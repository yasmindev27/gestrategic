import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SearchInput } from '@/components/ui/search-input';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingState } from '@/components/ui/loading-state';
import { StatusBadge } from '@/components/ui/status-badge';
import { toast } from 'sonner';
import { Plus, FlaskConical } from 'lucide-react';
import { format } from 'date-fns';
import { TIPOS_MATERIAL_CULTURA, MECANISMOS_RESISTENCIA } from './types';
import type { CulturaMicrobiologica } from './types';

interface Props {
  userId: string;
  userName: string;
}

export function CulturasMicrobiologicas({ userId, userName }: Props) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data: culturas = [], isLoading } = useQuery({
    queryKey: ['sciras-culturas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sciras_culturas')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as CulturaMicrobiologica[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (form: any) => {
      const { error } = await supabase.from('sciras_culturas').insert({
        ...form,
        registrado_por: userId,
        registrado_por_nome: userName,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sciras-culturas'] });
      setDialogOpen(false);
      toast.success('Cultura registrada com sucesso');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const filtered = culturas.filter(c =>
    !search || c.paciente_nome.toLowerCase().includes(search.toLowerCase()) ||
    c.microrganismo_isolado?.toLowerCase().includes(search.toLowerCase())
  );

  const resultadoMap: Record<string, 'success' | 'warning' | 'error' | 'info' | 'pending' | 'processing' | 'default'> = {
    pendente: 'processing',
    positivo: 'error',
    negativo: 'success',
    contaminado: 'warning',
  };

  if (isLoading) return <LoadingState message="Carregando culturas..." />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <SearchInput placeholder="Buscar por paciente ou microrganismo..." value={search} onChange={setSearch} className="flex-1" />
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Nova Cultura</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Registrar Cultura Microbiológica</DialogTitle>
            </DialogHeader>
            <NovaCulturaForm onSubmit={(f) => createMutation.mutate(f)} isLoading={createMutation.isPending} />
          </DialogContent>
        </Dialog>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={FlaskConical} title="Nenhuma cultura" description="Nenhuma cultura registrada." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>Coleta</TableHead>
                  <TableHead>Microrganismo</TableHead>
                  <TableHead>MDR</TableHead>
                  <TableHead>Resultado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.paciente_nome}</TableCell>
                    <TableCell>{c.setor}</TableCell>
                    <TableCell>{TIPOS_MATERIAL_CULTURA.find(t => t.value === c.tipo_material)?.label || c.tipo_material}</TableCell>
                    <TableCell>{format(new Date(c.data_coleta), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>{c.microrganismo_isolado || '-'}</TableCell>
                    <TableCell>
                      {c.multirresistente ? (
                        <Badge variant="destructive">MDR</Badge>
                      ) : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={resultadoMap[c.resultado] || 'default'} label={c.resultado} />
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

function NovaCulturaForm({ onSubmit, isLoading }: { onSubmit: (f: any) => void; isLoading: boolean }) {
  const [form, setForm] = useState({
    paciente_nome: '',
    numero_prontuario: '',
    setor: '',
    data_coleta: format(new Date(), 'yyyy-MM-dd'),
    tipo_material: '',
    microrganismo_isolado: '',
    multirresistente: false,
    mecanismo_resistencia: '',
    resultado: 'pendente',
    observacoes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.paciente_nome || !form.setor || !form.tipo_material) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }
    onSubmit(form);
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
          <Label>Data Coleta *</Label>
          <Input type="date" value={form.data_coleta} onChange={e => setForm(p => ({ ...p, data_coleta: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Material *</Label>
          <Select value={form.tipo_material} onValueChange={v => setForm(p => ({ ...p, tipo_material: v }))}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {TIPOS_MATERIAL_CULTURA.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Resultado</Label>
          <Select value={form.resultado} onValueChange={v => setForm(p => ({ ...p, resultado: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="positivo">Positivo</SelectItem>
              <SelectItem value="negativo">Negativo</SelectItem>
              <SelectItem value="contaminado">Contaminado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Microrganismo Isolado</Label>
          <Input value={form.microrganismo_isolado} onChange={e => setForm(p => ({ ...p, microrganismo_isolado: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Mecanismo Resistência</Label>
          <Select value={form.mecanismo_resistencia} onValueChange={v => setForm(p => ({ ...p, mecanismo_resistencia: v }))}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {MECANISMOS_RESISTENCIA.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={form.multirresistente} onCheckedChange={v => setForm(p => ({ ...p, multirresistente: v }))} />
        <Label>Multirresistente (MDR)</Label>
      </div>
      <div className="space-y-2">
        <Label>Observações</Label>
        <Textarea value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} />
      </div>
      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? 'Salvando...' : 'Registrar Cultura'}
      </Button>
    </form>
  );
}
