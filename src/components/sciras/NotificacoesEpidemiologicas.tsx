import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SearchInput } from '@/components/ui/search-input';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingState } from '@/components/ui/loading-state';
import { StatusBadge } from '@/components/ui/status-badge';
import { toast } from 'sonner';
import { Plus, Bell, ShieldAlert, CheckCircle, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { TIPOS_NOTIFICACAO_EPI } from './types';
import type { NotificacaoEpidemiologica } from './types';
import { NotificacaoCompulsoriaPrefeitura } from './NotificacaoCompulsoriaPrefeitura';

interface Props {
  userId: string;
  userName: string;
}

export function NotificacoesEpidemiologicas({ userId, userName }: Props) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data: notificacoes = [], isLoading } = useQuery({
    queryKey: ['sciras-notificacoes-epi'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sciras_notificacoes_epidemiologicas')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as NotificacaoEpidemiologica[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (form: any) => {
      const { error } = await supabase.from('sciras_notificacoes_epidemiologicas').insert({
        ...form,
        numero_notificacao: 'temp',
        notificador_id: userId,
        notificador_nome: userName,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sciras-notificacoes-epi'] });
      setDialogOpen(false);
      toast.success('Notificação registrada com sucesso');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const filtered = notificacoes.filter(n =>
    !search || n.doenca_agravo.toLowerCase().includes(search.toLowerCase()) ||
    n.numero_notificacao.toLowerCase().includes(search.toLowerCase()) ||
    n.paciente_nome?.toLowerCase().includes(search.toLowerCase())
  );

  const statusMap: Record<string, 'success' | 'warning' | 'error' | 'info' | 'pending' | 'processing' | 'default'> = {
    aberta: 'warning',
    em_investigacao: 'processing',
    encerrada: 'success',
  };

  const tipoLabels: Record<string, string> = {
    surto: 'Surto',
    doenca_compulsoria: 'Doença Compulsória',
    evento_sentinela: 'Evento Sentinela',
  };

  if (isLoading) return <LoadingState message="Carregando notificações..." />;

  return (
    <Tabs defaultValue="listagem" className="space-y-4">
      <TabsList>
        <TabsTrigger value="listagem">
          <Bell className="h-4 w-4 mr-2" /> Notificações
        </TabsTrigger>
        <TabsTrigger value="compulsoria">
          <FileText className="h-4 w-4 mr-2" /> Notif. Compulsória (Prefeitura)
        </TabsTrigger>
      </TabsList>

      <TabsContent value="compulsoria">
        <NotificacaoCompulsoriaPrefeitura userId={userId} userName={userName} />
      </TabsContent>

      <TabsContent value="listagem" className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <SearchInput placeholder="Buscar doença/agravo..." value={search} onChange={setSearch} className="flex-1" />
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Nova Notificação</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Notificação Epidemiológica</DialogTitle>
              </DialogHeader>
              <NovaNotificacaoForm onSubmit={(f) => createMutation.mutate(f)} isLoading={createMutation.isPending} />
            </DialogContent>
          </Dialog>
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon={Bell} title="Nenhuma notificação" description="Nenhuma notificação epidemiológica registrada." />
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nº</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Doença/Agravo</TableHead>
                    <TableHead>Setor</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>ANVISA</TableHead>
                    <TableHead>Vig. Municipal</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(n => (
                    <TableRow key={n.id}>
                      <TableCell className="font-mono text-xs">{n.numero_notificacao}</TableCell>
                      <TableCell>
                        <Badge variant={n.tipo === 'surto' ? 'destructive' : 'outline'}>
                          {tipoLabels[n.tipo] || n.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{n.doenca_agravo}</TableCell>
                      <TableCell>{n.setor}</TableCell>
                      <TableCell>{format(new Date(n.data_notificacao), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>
                        {n.notificado_anvisa ? <CheckCircle className="h-4 w-4 text-success" /> : <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>
                        {n.notificado_vigilancia_municipal ? <CheckCircle className="h-4 w-4 text-success" /> : <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={statusMap[n.status] || 'default'} label={n.status.replace('_', ' ')} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </TabsContent>
    </Tabs>
  );
}

function NovaNotificacaoForm({ onSubmit, isLoading }: { onSubmit: (f: any) => void; isLoading: boolean }) {
  const [form, setForm] = useState({
    tipo: '',
    doenca_agravo: '',
    data_notificacao: format(new Date(), 'yyyy-MM-dd'),
    paciente_nome: '',
    numero_prontuario: '',
    setor: '',
    descricao: '',
    medidas_controle: '',
    notificado_anvisa: false,
    notificado_vigilancia_municipal: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.tipo || !form.doenca_agravo || !form.setor || !form.descricao) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Tipo *</Label>
          <Select value={form.tipo} onValueChange={v => setForm(p => ({ ...p, tipo: v }))}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {TIPOS_NOTIFICACAO_EPI.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Doença/Agravo *</Label>
          <Input value={form.doenca_agravo} onChange={e => setForm(p => ({ ...p, doenca_agravo: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Setor *</Label>
          <Input value={form.setor} onChange={e => setForm(p => ({ ...p, setor: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Data</Label>
          <Input type="date" value={form.data_notificacao} onChange={e => setForm(p => ({ ...p, data_notificacao: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Paciente</Label>
          <Input value={form.paciente_nome} onChange={e => setForm(p => ({ ...p, paciente_nome: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Prontuário</Label>
          <Input value={form.numero_prontuario} onChange={e => setForm(p => ({ ...p, numero_prontuario: e.target.value }))} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Descrição *</Label>
        <Textarea value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} />
      </div>
      <div className="space-y-2">
        <Label>Medidas de Controle</Label>
        <Textarea value={form.medidas_controle} onChange={e => setForm(p => ({ ...p, medidas_controle: e.target.value }))} />
      </div>
      <div className="flex gap-6">
        <div className="flex items-center gap-2">
          <Checkbox checked={form.notificado_anvisa} onCheckedChange={(v) => setForm(p => ({ ...p, notificado_anvisa: !!v }))} />
          <Label>Notificado ANVISA</Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox checked={form.notificado_vigilancia_municipal} onCheckedChange={(v) => setForm(p => ({ ...p, notificado_vigilancia_municipal: !!v }))} />
          <Label>Notificado Vig. Municipal</Label>
        </div>
      </div>
      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? 'Salvando...' : 'Registrar Notificação'}
      </Button>
    </form>
  );
}
