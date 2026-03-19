import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Gauge, Plus, Search, CheckCircle2, Clock, CalendarDays
} from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { toast } from 'sonner';
import { ExportDropdown } from '@/components/ui/export-dropdown';
import { exportToPDF, exportToExcel } from '@/lib/export-utils';

interface RegistroFluxBomba {
  id: string;
  data: string;
  plantao: 'diurno' | 'noturno';
  qtdFluxometros: number;
  qtdBombasInfusao: number;
  metodo: string;
  responsavel: string;
  coren: string;
  observacoes: string;
  dataRegistro: string;
}

interface Props {
  storageKey: string;
  setor: string;
}

export function ChecklistFluxometrosBombas({ storageKey, setor }: Props) {
  const [registros, setRegistros] = useLocalStorage<RegistroFluxBomba[]>(storageKey, []);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busca, setBusca] = useState('');

  const [form, setForm] = useState({
    data: new Date().toISOString().split('T')[0],
    plantao: 'diurno' as 'diurno' | 'noturno',
    qtdFluxometros: 0,
    qtdBombasInfusao: 0,
    metodo: '',
    responsavel: '',
    coren: '',
    observacoes: '',
  });

  const handleSalvar = () => {
    if (!form.responsavel) {
      toast.error('Informe o responsável');
      return;
    }
    const novo: RegistroFluxBomba = {
      id: crypto.randomUUID(),
      ...form,
      dataRegistro: new Date().toLocaleString('pt-BR'),
    };
    setRegistros([novo, ...registros]);
    setForm({
      data: new Date().toISOString().split('T')[0],
      plantao: 'diurno', qtdFluxometros: 0, qtdBombasInfusao: 0,
      metodo: '', responsavel: '', coren: '', observacoes: '',
    });
    setDialogOpen(false);
    toast.success('Checklist de fluxômetros e bombas registrado');
  };

  const registrosFiltrados = registros.filter(r =>
    r.responsavel.toLowerCase().includes(busca.toLowerCase()) ||
    r.data.includes(busca)
  );

  const totalFlux = registros.reduce((a, r) => a + r.qtdFluxometros, 0);
  const totalBombas = registros.reduce((a, r) => a + r.qtdBombasInfusao, 0);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Gauge className="h-5 w-5 text-primary" />
          Checklist de Fluxômetros e Bombas de Infusão
        </h3>
        <p className="text-sm text-muted-foreground">{setor} — Controle por plantão diurno e noturno</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <CheckCircle2 className="h-8 w-8 text-primary opacity-70" />
          <div><p className="text-sm text-muted-foreground">Registros</p><p className="text-2xl font-bold">{registros.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Clock className="h-8 w-8 text-primary opacity-70" />
          <div><p className="text-sm text-muted-foreground">Ultimo Registro</p><p className="text-sm font-medium">{registros[0]?.dataRegistro || '—'}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Gauge className="h-8 w-8 text-primary opacity-70" />
          <div><p className="text-sm text-muted-foreground">Total Fluxômetros</p><p className="text-2xl font-bold">{totalFlux}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <CalendarDays className="h-8 w-8 text-primary opacity-70" />
          <div><p className="text-sm text-muted-foreground">Total Bombas</p><p className="text-2xl font-bold">{totalBombas}</p></div>
        </CardContent></Card>
      </div>

      {/* Ações */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por responsável ou data..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9" />
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" />Novo Registro</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Gauge className="h-5 w-5 text-primary" />
                Fluxômetros e Bombas — {setor}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Data</Label>
                      <Input type="date" value={form.data} onChange={e => setForm(p => ({ ...p, data: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Plantão</Label>
                      <Select value={form.plantao} onValueChange={v => setForm(p => ({ ...p, plantao: v as 'diurno' | 'noturno' }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="diurno">Diurno</SelectItem>
                          <SelectItem value="noturno">Noturno</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="border rounded-md p-3 space-y-3">
                    <p className="font-semibold text-sm text-primary">Bombas de Infusão — Plantão {form.plantao === 'diurno' ? 'Diurno' : 'Noturno'}</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Qtd. Fluxômetros</Label>
                        <Input type="number" min={0} value={form.qtdFluxometros} onChange={e => setForm(p => ({ ...p, qtdFluxometros: Number(e.target.value) }))} />
                      </div>
                      <div>
                        <Label>Qtd. Bombas de Infusão</Label>
                        <Input type="number" min={0} value={form.qtdBombasInfusao} onChange={e => setForm(p => ({ ...p, qtdBombasInfusao: Number(e.target.value) }))} />
                      </div>
                    </div>
                    <div>
                      <Label>Método de Limpeza</Label>
                      <Input value={form.metodo} onChange={e => setForm(p => ({ ...p, metodo: e.target.value }))} placeholder="Ex: Álcool 70%" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Responsável</Label>
                      <Input value={form.responsavel} onChange={e => setForm(p => ({ ...p, responsavel: e.target.value }))} />
                    </div>
                    <div>
                      <Label>COREN</Label>
                      <Input value={form.coren} onChange={e => setForm(p => ({ ...p, coren: e.target.value }))} placeholder="COREN/Nº" />
                    </div>
                  </div>

                  <div>
                    <Label>Observações</Label>
                    <Textarea value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} />
                  </div>
                </CardContent>
              </Card>

              <Button onClick={handleSalvar} className="w-full" size="lg">
                <CheckCircle2 className="h-4 w-4 mr-2" />Registrar Checklist
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Histórico */}
      <div className="rounded-md border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Plantão</TableHead>
              <TableHead>Fluxômetros</TableHead>
              <TableHead>Bombas</TableHead>
              <TableHead>Método</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>COREN</TableHead>
              <TableHead>Observações</TableHead>
              <TableHead>Registrado em</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {registrosFiltrados.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Nenhum registro</TableCell></TableRow>
            ) : registrosFiltrados.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-mono">{r.data}</TableCell>
                <TableCell><Badge variant={r.plantao === 'diurno' ? 'default' : 'secondary'}>{r.plantao === 'diurno' ? 'Diurno' : 'Noturno'}</Badge></TableCell>
                <TableCell className="text-center font-bold">{r.qtdFluxometros}</TableCell>
                <TableCell className="text-center font-bold">{r.qtdBombasInfusao}</TableCell>
                <TableCell>{r.metodo || '—'}</TableCell>
                <TableCell className="font-medium">{r.responsavel}</TableCell>
                <TableCell className="text-sm">{r.coren || '—'}</TableCell>
                <TableCell className="max-w-[180px] truncate">{r.observacoes || '—'}</TableCell>
                <TableCell className="text-sm">{r.dataRegistro}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
