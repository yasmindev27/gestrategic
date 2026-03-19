import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Thermometer, Plus, Search, Clock, CheckCircle2, Package
} from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { toast } from 'sonner';
import { ExportDropdown } from '@/components/ui/export-dropdown';
import { exportToPDF, exportToExcel } from '@/lib/export-utils';

interface RegistroSinaisVitais {
  id: string;
  data: string;
  itensVerificados: Record<string, boolean>;
  recebidoPor: string;
  entreguePor: string;
  observacao: string;
  dataRegistro: string;
}

const KIT_SINAIS_VITAIS = [
  { codigo: 'TERM', descricao: 'Termômetro' },
  { codigo: 'OXIM', descricao: 'Oxímetro' },
  { codigo: 'ESTE', descricao: 'Estetoscópio' },
  { codigo: 'GLIC', descricao: 'Glicosímetro' },
  { codigo: 'APPA', descricao: 'Aparelho de PA' },
];

interface ChecklistSinaisVitaisProps {
  storageKey: string;
  setor: string;
}

export function ChecklistSinaisVitais({ storageKey, setor }: ChecklistSinaisVitaisProps) {
  const [registros, setRegistros] = useLocalStorage<RegistroSinaisVitais[]>(storageKey, []);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busca, setBusca] = useState('');

  const [form, setForm] = useState({
    data: new Date().toISOString().split('T')[0],
    itensVerificados: {} as Record<string, boolean>,
    recebidoPor: '',
    entreguePor: '',
    observacao: '',
  });

  const totalItens = KIT_SINAIS_VITAIS.length;
  const itensChecados = Object.values(form.itensVerificados).filter(Boolean).length;

  const handleMarcarTodos = () => {
    const novos = { ...form.itensVerificados };
    const todosJaMarcados = KIT_SINAIS_VITAIS.every(i => novos[i.codigo]);
    KIT_SINAIS_VITAIS.forEach(i => { novos[i.codigo] = !todosJaMarcados; });
    setForm(p => ({ ...p, itensVerificados: novos }));
  };

  const handleSalvar = () => {
    if (!form.recebidoPor || !form.entreguePor) {
      toast.error('Campos "Recebido por" e "Entregue por" são obrigatórios');
      return;
    }
    if (itensChecados === 0) {
      toast.error('Marque pelo menos um item do kit');
      return;
    }
    const novo: RegistroSinaisVitais = {
      id: crypto.randomUUID(),
      ...form,
      dataRegistro: new Date().toLocaleString('pt-BR'),
    };
    setRegistros([novo, ...registros]);
    setForm({
      data: new Date().toISOString().split('T')[0],
      itensVerificados: {},
      recebidoPor: '',
      entreguePor: '',
      observacao: '',
    });
    setDialogOpen(false);
    toast.success('Checklist de sinais vitais registrado');
  };

  const registrosFiltrados = registros.filter(r =>
    r.recebidoPor.toLowerCase().includes(busca.toLowerCase()) ||
    r.entreguePor.toLowerCase().includes(busca.toLowerCase()) ||
    r.data.includes(busca)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Thermometer className="h-5 w-5 text-primary" />
            Checklist de Sinais Vitais
          </h3>
          <p className="text-sm text-muted-foreground">Setor de Enfermagem — {setor} — Controle de Kit de Sinais Vitais</p>
        </div>
        <ExportDropdown
          onExportPDF={() => exportToPDF({ title: `Checklist Sinais Vitais — ${setor}`, headers: ['Data', 'Recebido por', 'Entregue por', 'Observação', 'Data Registro'], rows: registros.map(r => [r.data, r.recebidoPor, r.entreguePor, r.observacao, r.dataRegistro]), fileName: `checklist_sinais_vitais_${setor}` })}
          onExportExcel={() => exportToExcel({ title: `Checklist Sinais Vitais — ${setor}`, headers: ['Data', 'Recebido por', 'Entregue por', 'Observação', 'Data Registro'], rows: registros.map(r => [r.data, r.recebidoPor, r.entreguePor, r.observacao, r.dataRegistro]), fileName: `checklist_sinais_vitais_${setor}` })}
        />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <CheckCircle2 className="h-8 w-8 text-primary opacity-70" />
          <div><p className="text-sm text-muted-foreground">Total Registros</p><p className="text-2xl font-bold">{registros.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Clock className="h-8 w-8 text-primary opacity-70" />
          <div><p className="text-sm text-muted-foreground">Ultimo Registro</p><p className="text-sm font-medium">{registros[0]?.dataRegistro || '—'}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Package className="h-8 w-8 text-muted-foreground opacity-70" />
          <div><p className="text-sm text-muted-foreground">Itens no Kit</p><p className="text-2xl font-bold">{totalItens}</p></div>
        </CardContent></Card>
      </div>

      {/* Ações */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome ou data..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9" />
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" />Novo Registro</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Thermometer className="h-5 w-5 text-primary" />
                Checklist de Sinais Vitais — {setor}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Data</Label>
                <Input type="date" value={form.data} onChange={e => setForm(p => ({ ...p, data: e.target.value }))} />
              </div>

              {/* Kit sinais vitais */}
              <Card>
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Kit Sinais Vitais</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant={itensChecados === totalItens ? 'default' : 'secondary'} className={itensChecados === totalItens ? 'bg-green-600' : ''}>
                        {itensChecados}/{totalItens}
                      </Badge>
                      <Button size="sm" variant="outline" onClick={handleMarcarTodos} className="text-xs h-7">
                        {itensChecados === totalItens ? 'Desmarcar' : 'Marcar todos'}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  <div className="space-y-2">
                    {KIT_SINAIS_VITAIS.map(item => (
                      <div key={item.codigo} className="flex items-center gap-3 p-2 rounded hover:bg-muted/50">
                        <Checkbox
                          checked={!!form.itensVerificados[item.codigo]}
                          onCheckedChange={() => {
                            setForm(p => ({
                              ...p,
                              itensVerificados: { ...p.itensVerificados, [item.codigo]: !p.itensVerificados[item.codigo] }
                            }));
                          }}
                        />
                        <span className={`flex-1 text-sm ${form.itensVerificados[item.codigo] ? 'text-muted-foreground line-through' : ''}`}>
                          {item.descricao}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-3">
                <div><Label>Recebido por</Label><Input value={form.recebidoPor} onChange={e => setForm(p => ({ ...p, recebidoPor: e.target.value }))} /></div>
                <div><Label>Entregue por</Label><Input value={form.entreguePor} onChange={e => setForm(p => ({ ...p, entreguePor: e.target.value }))} /></div>
              </div>
              <div><Label>Observação</Label><Textarea value={form.observacao} onChange={e => setForm(p => ({ ...p, observacao: e.target.value }))} placeholder="COREN, observações gerais..." /></div>
              <Button onClick={handleSalvar} className="w-full" size="lg">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Registrar Checklist
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
              <TableHead>Kit Sinais Vitais</TableHead>
              <TableHead>Recebido por</TableHead>
              <TableHead>Entregue por</TableHead>
              <TableHead>Observação</TableHead>
              <TableHead>Registro em</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {registrosFiltrados.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum registro encontrado</TableCell></TableRow>
            ) : registrosFiltrados.map(r => {
              const checados = Object.values(r.itensVerificados).filter(Boolean).length;
              const itensNomes = KIT_SINAIS_VITAIS
                .filter(i => r.itensVerificados[i.codigo])
                .map(i => i.descricao)
                .join(', ');
              return (
                <TableRow key={r.id}>
                  <TableCell className="font-mono">{r.data}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge className={checados === totalItens ? 'bg-green-600' : 'bg-yellow-500'}>
                        {checados}/{totalItens}
                      </Badge>
                      <span className="text-xs text-muted-foreground max-w-[200px] truncate">{itensNomes}</span>
                    </div>
                  </TableCell>
                  <TableCell>{r.recebidoPor}</TableCell>
                  <TableCell>{r.entreguePor}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{r.observacao || '—'}</TableCell>
                  <TableCell className="text-sm">{r.dataRegistro}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
