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
  ClipboardPen, Plus, Search, CheckCircle2, Clock, Users
} from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { toast } from 'sonner';
import { ExportDropdown } from '@/components/ui/export-dropdown';
import { exportToPDF, exportToExcel } from '@/lib/export-utils';

interface RegistroPassagem {
  id: string;
  data: string;
  plantao: 'diurno' | 'noturno';
  profissionais: string;
  relatorio: string;
  responsavel: string;
  coren: string;
  dataRegistro: string;
}

interface Props {
  storageKey: string;
  setor: string;
}

export function PassagemPlantaoTecEnfermagem({ storageKey, setor }: Props) {
  const [registros, setRegistros] = useLocalStorage<RegistroPassagem[]>(storageKey, []);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busca, setBusca] = useState('');
  const [detalheAberto, setDetalheAberto] = useState<RegistroPassagem | null>(null);

  const [form, setForm] = useState({
    data: new Date().toISOString().split('T')[0],
    plantao: 'diurno' as 'diurno' | 'noturno',
    profissionais: '',
    relatorio: '',
    responsavel: '',
    coren: '',
  });

  const handleSalvar = () => {
    if (!form.responsavel || !form.relatorio) {
      toast.error('Responsável e relatório são obrigatórios');
      return;
    }
    const novo: RegistroPassagem = {
      id: crypto.randomUUID(),
      ...form,
      dataRegistro: new Date().toLocaleString('pt-BR'),
    };
    setRegistros([novo, ...registros]);
    setForm({
      data: new Date().toISOString().split('T')[0],
      plantao: 'diurno', profissionais: '', relatorio: '',
      responsavel: '', coren: '',
    });
    setDialogOpen(false);
    toast.success('Passagem de plantão registrada');
  };

  const registrosFiltrados = registros.filter(r =>
    r.responsavel.toLowerCase().includes(busca.toLowerCase()) ||
    r.profissionais.toLowerCase().includes(busca.toLowerCase()) ||
    r.data.includes(busca)
  );

  const diurnos = registros.filter(r => r.plantao === 'diurno').length;
  const noturnos = registros.filter(r => r.plantao === 'noturno').length;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <ClipboardPen className="h-5 w-5 text-primary" />
          Passagem de Plantão — Técnico de Enfermagem
        </h3>
        <p className="text-sm text-muted-foreground">{setor} — Registro de relatórios por plantão diurno e noturno</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <CheckCircle2 className="h-8 w-8 text-primary opacity-70" />
          <div><p className="text-sm text-muted-foreground">Total Registros</p><p className="text-2xl font-bold">{registros.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Clock className="h-8 w-8 text-primary opacity-70" />
          <div><p className="text-sm text-muted-foreground">Ultimo Registro</p><p className="text-sm font-medium">{registros[0]?.dataRegistro || '—'}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Users className="h-8 w-8 text-primary opacity-70" />
          <div><p className="text-sm text-muted-foreground">Diurnos</p><p className="text-2xl font-bold">{diurnos}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Users className="h-8 w-8 text-muted-foreground opacity-70" />
          <div><p className="text-sm text-muted-foreground">Noturnos</p><p className="text-2xl font-bold">{noturnos}</p></div>
        </CardContent></Card>
      </div>

      {/* Ações */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por responsável, profissionais ou data..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9" />
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" />Nova Passagem</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ClipboardPen className="h-5 w-5 text-primary" />
                Passagem de Plantão — Técnico de Enfermagem — {setor}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
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

              <div>
                <Label>Profissionais do Plantão</Label>
                <Input value={form.profissionais} onChange={e => setForm(p => ({ ...p, profissionais: e.target.value }))} placeholder="Nomes dos profissionais separados por vírgula" />
              </div>

              <div>
                <Label>Relatório da Passagem de Plantão</Label>
                <Textarea
                  value={form.relatorio}
                  onChange={e => setForm(p => ({ ...p, relatorio: e.target.value }))}
                  placeholder="Descreva as ocorrências, pendências, estado dos pacientes, intercorrências..."
                  className="min-h-[200px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Responsável</Label>
                  <Input value={form.responsavel} onChange={e => setForm(p => ({ ...p, responsavel: e.target.value }))} />
                </div>
                <div>
                  <Label>COREN</Label>
                  <Input value={form.coren} onChange={e => setForm(p => ({ ...p, coren: e.target.value }))} placeholder="COREN/Nº - TE" />
                </div>
              </div>

              <Button onClick={handleSalvar} className="w-full" size="lg">
                <CheckCircle2 className="h-4 w-4 mr-2" />Registrar Passagem de Plantão
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Detalhe */}
      <Dialog open={!!detalheAberto} onOpenChange={() => setDetalheAberto(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {detalheAberto && (
            <>
              <DialogHeader>
                <DialogTitle>Passagem de Plantão — {detalheAberto.data} — {detalheAberto.plantao === 'diurno' ? 'Diurno' : 'Noturno'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-muted-foreground text-xs">Responsável</Label><p className="font-medium">{detalheAberto.responsavel}</p></div>
                  <div><Label className="text-muted-foreground text-xs">COREN</Label><p className="font-medium">{detalheAberto.coren || '—'}</p></div>
                </div>
                <div><Label className="text-muted-foreground text-xs">Profissionais</Label><p className="text-sm">{detalheAberto.profissionais || '—'}</p></div>
                <div>
                  <Label className="text-muted-foreground text-xs">Relatório</Label>
                  <div className="mt-1 p-3 bg-muted rounded-md whitespace-pre-wrap text-sm">{detalheAberto.relatorio}</div>
                </div>
                <p className="text-xs text-muted-foreground">Registrado em: {detalheAberto.dataRegistro}</p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Histórico */}
      <div className="rounded-md border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Plantão</TableHead>
              <TableHead>Profissionais</TableHead>
              <TableHead>Relatório</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>COREN</TableHead>
              <TableHead>Registrado em</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {registrosFiltrados.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhuma passagem registrada</TableCell></TableRow>
            ) : registrosFiltrados.map(r => (
              <TableRow key={r.id} className="cursor-pointer hover:bg-muted/70" onClick={() => setDetalheAberto(r)}>
                <TableCell className="font-mono">{r.data}</TableCell>
                <TableCell><Badge variant={r.plantao === 'diurno' ? 'default' : 'secondary'}>{r.plantao === 'diurno' ? 'Diurno' : 'Noturno'}</Badge></TableCell>
                <TableCell className="max-w-[150px] truncate">{r.profissionais || '—'}</TableCell>
                <TableCell className="max-w-[250px] truncate">{r.relatorio}</TableCell>
                <TableCell className="font-medium">{r.responsavel}</TableCell>
                <TableCell className="text-sm">{r.coren || '—'}</TableCell>
                <TableCell className="text-sm">{r.dataRegistro}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
