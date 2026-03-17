import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Shirt, Plus, Search, CheckCircle2, Clock, AlertTriangle, Phone
} from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { toast } from 'sonner';

type StatusEvasao = 'devolvido' | 'contato' | 'sumiu';

interface RegistroEvasao {
  id: string;
  data: string;
  nomePaciente: string;
  item: string;
  codigoItem: string;
  responsavelDevolucao: string;
  contato: string;
  responsavelRegistro: string;
  status: StatusEvasao;
  observacao: string;
  dataRegistro: string;
}

const ITENS_ROUPARIA = [
  'Lençol branco',
  'Lençol verde',
  'Cobertor',
  'Camisola',
  'Toalha de banho',
];

interface ProtocoloEvasaoRoupariaProps {
  storageKey: string;
  setor: string;
}

export function ProtocoloEvasaoRouparia({ storageKey, setor }: ProtocoloEvasaoRoupariaProps) {
  const [registros, setRegistros] = useLocalStorage<RegistroEvasao[]>(storageKey, []);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busca, setBusca] = useState('');

  const [form, setForm] = useState({
    data: new Date().toISOString().split('T')[0],
    nomePaciente: '',
    item: ITENS_ROUPARIA[0],
    codigoItem: '',
    responsavelDevolucao: '',
    contato: '',
    responsavelRegistro: '',
    status: 'devolvido' as StatusEvasao,
    observacao: '',
  });

  const handleSalvar = () => {
    if (!form.nomePaciente || !form.item || !form.responsavelRegistro) {
      toast.error('Paciente, item e responsável pelo registro são obrigatórios');
      return;
    }
    const novo: RegistroEvasao = {
      id: crypto.randomUUID(),
      ...form,
      nomePaciente: form.nomePaciente.toUpperCase(),
      dataRegistro: new Date().toLocaleString('pt-BR'),
    };
    setRegistros([novo, ...registros]);
    setForm({
      data: new Date().toISOString().split('T')[0],
      nomePaciente: '', item: ITENS_ROUPARIA[0], codigoItem: '',
      responsavelDevolucao: '', contato: '', responsavelRegistro: '',
      status: 'devolvido', observacao: '',
    });
    setDialogOpen(false);
    toast.success('Registro de evasão de rouparia salvo');
  };

  const registrosFiltrados = registros.filter(r =>
    r.nomePaciente.toLowerCase().includes(busca.toLowerCase()) ||
    r.codigoItem.includes(busca) ||
    r.item.toLowerCase().includes(busca.toLowerCase())
  );

  const statusConfig: Record<StatusEvasao, { label: string; className: string }> = {
    devolvido: { label: 'Devolvido', className: 'bg-green-600' },
    contato: { label: 'Contato', className: 'bg-yellow-500' },
    sumiu: { label: 'Sumiu', className: 'bg-destructive' },
  };

  const devolvidos = registros.filter(r => r.status === 'devolvido').length;
  const sumidos = registros.filter(r => r.status === 'sumiu').length;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Shirt className="h-5 w-5 text-primary" />
          Protocolo de Controle de Evasão de Rouparia em Transferência
        </h3>
        <p className="text-sm text-muted-foreground">{setor} — Controle de itens de rouparia em transferências de pacientes</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Shirt className="h-8 w-8 text-primary opacity-70" />
          <div><p className="text-sm text-muted-foreground">Total Registros</p><p className="text-2xl font-bold">{registros.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <CheckCircle2 className="h-8 w-8 text-primary opacity-70" />
          <div><p className="text-sm text-muted-foreground">Devolvidos</p><p className="text-2xl font-bold">{devolvidos}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <AlertTriangle className="h-8 w-8 text-destructive opacity-70" />
          <div><p className="text-sm text-muted-foreground">Sumiu</p><p className="text-2xl font-bold">{sumidos}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Phone className="h-8 w-8 text-muted-foreground opacity-70" />
          <div><p className="text-sm text-muted-foreground">Em Contato</p><p className="text-2xl font-bold">{registros.filter(r => r.status === 'contato').length}</p></div>
        </CardContent></Card>
      </div>

      {/* Ações */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por paciente, item ou código..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9" />
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" />Novo Registro</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shirt className="h-5 w-5 text-primary" />
                Registro de Evasão de Rouparia — {setor}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Data</Label><Input type="date" value={form.data} onChange={e => setForm(p => ({ ...p, data: e.target.value }))} /></div>
                <div><Label>Nome do Paciente</Label><Input value={form.nomePaciente} onChange={e => setForm(p => ({ ...p, nomePaciente: e.target.value }))} className="uppercase" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Item</Label>
                  <Select value={form.item} onValueChange={v => setForm(p => ({ ...p, item: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{ITENS_ROUPARIA.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Código do Item</Label><Input value={form.codigoItem} onChange={e => setForm(p => ({ ...p, codigoItem: e.target.value }))} placeholder="Ex: 018415" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Resp. Devolução</Label><Input value={form.responsavelDevolucao} onChange={e => setForm(p => ({ ...p, responsavelDevolucao: e.target.value }))} /></div>
                <div><Label>Contato</Label><Input value={form.contato} onChange={e => setForm(p => ({ ...p, contato: e.target.value }))} placeholder="Telefone" /></div>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v as StatusEvasao }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="devolvido">Devolvido</SelectItem>
                    <SelectItem value="contato">Contato</SelectItem>
                    <SelectItem value="sumiu">Sumiu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Responsável pelo Registro (COREN)</Label><Input value={form.responsavelRegistro} onChange={e => setForm(p => ({ ...p, responsavelRegistro: e.target.value }))} placeholder="Nome — COREN" /></div>
              <div><Label>Observação</Label><Textarea value={form.observacao} onChange={e => setForm(p => ({ ...p, observacao: e.target.value }))} /></div>
              <Button onClick={handleSalvar} className="w-full" size="lg">
                <CheckCircle2 className="h-4 w-4 mr-2" />Registrar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabela */}
      <div className="rounded-md border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Paciente</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Resp. Devolução</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {registrosFiltrados.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhum registro encontrado</TableCell></TableRow>
            ) : registrosFiltrados.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-sm">{r.data}</TableCell>
                <TableCell className="font-medium uppercase">{r.nomePaciente}</TableCell>
                <TableCell>{r.item}</TableCell>
                <TableCell className="font-mono">{r.codigoItem || '—'}</TableCell>
                <TableCell>{r.responsavelDevolucao || '—'}</TableCell>
                <TableCell className="text-sm">{r.contato || '—'}</TableCell>
                <TableCell className="text-sm">{r.responsavelRegistro}</TableCell>
                <TableCell>
                  <Badge className={statusConfig[r.status].className}>{statusConfig[r.status].label}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
