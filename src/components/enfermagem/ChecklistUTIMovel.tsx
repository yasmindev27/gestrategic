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
  Ambulance, Plus, Search, CheckCircle2, Clock, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { toast } from 'sonner';
import { ExportDropdown } from '@/components/ui/export-dropdown';
import { exportToPDF, exportToExcel } from '@/lib/export-utils';

type StatusItem = 'ok' | 'falha' | 'na';

const ITENS_UTI_MOVEL = [
  'Desfibrilador (testar funcionamento)',
  'Ventilador (testar funcionamento)',
  'Monitor (testar funcionamento)',
  'Kit traqueostomia adulto (1 unidade)',
  'Ambu adulto (1 unidade)',
  'Ambu infantil (1 unidade)',
  'Oxigênio (mín. volume mín. 200)',
  'Látex (1 unidade)',
  'Umidificador (1 unidade)',
  'Cateter nasal adulto (1 unidade)',
  'Cateter nasal infantil (1 unidade)',
  'Luva de procedimento M (caixa)',
];

interface RegistroUTIMovel {
  id: string;
  dia: number;
  mes: number;
  ano: number;
  plantao: 'diurno' | 'noturno';
  responsavel: string;
  itens: Record<string, StatusItem>;
  observacoes: string;
  dataRegistro: string;
}

interface Props {
  storageKey: string;
  setor: string;
}

export function ChecklistUTIMovel({ storageKey, setor }: Props) {
  const [registros, setRegistros] = useLocalStorage<RegistroUTIMovel[]>(storageKey, []);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busca, setBusca] = useState('');

  const hoje = new Date();
  const [mesSelecionado, setMesSelecionado] = useState(hoje.getMonth());
  const [anoSelecionado, setAnoSelecionado] = useState(hoje.getFullYear());
  const diasNoMes = new Date(anoSelecionado, mesSelecionado + 1, 0).getDate();
  const nomeMes = new Date(anoSelecionado, mesSelecionado).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const [form, setForm] = useState({
    dia: hoje.getDate(),
    plantao: 'diurno' as 'diurno' | 'noturno',
    responsavel: '',
    itens: {} as Record<string, StatusItem>,
    observacoes: '',
  });

  const marcarTodosOK = () => {
    const novos: Record<string, StatusItem> = {};
    ITENS_UTI_MOVEL.forEach(item => { novos[item] = 'ok'; });
    setForm(p => ({ ...p, itens: novos }));
  };

  const handleSalvar = () => {
    if (!form.responsavel) {
      toast.error('Informe o enfermeiro responsável');
      return;
    }
    const novo: RegistroUTIMovel = {
      id: crypto.randomUUID(),
      dia: form.dia,
      mes: mesSelecionado,
      ano: anoSelecionado,
      plantao: form.plantao,
      responsavel: form.responsavel,
      itens: form.itens,
      observacoes: form.observacoes,
      dataRegistro: new Date().toLocaleString('pt-BR'),
    };
    setRegistros([novo, ...registros]);
    setForm({ dia: hoje.getDate(), plantao: 'diurno', responsavel: '', itens: {}, observacoes: '' });
    setDialogOpen(false);
    toast.success('Checklist UTI Móvel registrado');
  };

  const registrosMes = registros.filter(r => r.mes === mesSelecionado && r.ano === anoSelecionado);

  const getStatus = (dia: number, item: string, plantao: 'diurno' | 'noturno'): StatusItem | null => {
    const reg = registrosMes.find(r => r.dia === dia && r.plantao === plantao);
    return reg?.itens[item] || null;
  };

  const statusCell = (s: StatusItem | null) => {
    if (!s) return <span className="text-muted-foreground text-[10px]">—</span>;
    if (s === 'ok') return <span className="text-green-600 font-bold text-[10px]">OK</span>;
    if (s === 'falha') return <span className="text-destructive font-bold text-[10px]">F</span>;
    return <span className="text-muted-foreground text-[10px]">N/A</span>;
  };

  const mesAnterior = () => {
    if (mesSelecionado === 0) { setMesSelecionado(11); setAnoSelecionado(a => a - 1); }
    else setMesSelecionado(m => m - 1);
  };
  const mesProximo = () => {
    if (mesSelecionado === 11) { setMesSelecionado(0); setAnoSelecionado(a => a + 1); }
    else setMesSelecionado(m => m + 1);
  };

  const totalOk = registrosMes.reduce((a, r) => a + Object.values(r.itens).filter(v => v === 'ok').length, 0);
  const totalItens = registrosMes.reduce((a, r) => a + Object.values(r.itens).filter(v => v !== 'na').length, 0);
  const conformidade = totalItens > 0 ? Math.round((totalOk / totalItens) * 100) : 0;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Ambulance className="h-5 w-5 text-primary" />
          Checklist UTI Móvel
        </h3>
        <p className="text-sm text-muted-foreground">{setor} — Controle diário de equipamentos por plantão</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <CheckCircle2 className="h-8 w-8 text-primary opacity-70" />
          <div><p className="text-sm text-muted-foreground">Registros no mês</p><p className="text-2xl font-bold">{registrosMes.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Clock className="h-8 w-8 text-primary opacity-70" />
          <div><p className="text-sm text-muted-foreground">Ultimo Registro</p><p className="text-sm font-medium">{registros[0]?.dataRegistro || '—'}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Ambulance className="h-8 w-8 text-primary opacity-70" />
          <div><p className="text-sm text-muted-foreground">Conformidade</p><p className="text-2xl font-bold">{conformidade}%</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Ambulance className="h-8 w-8 text-muted-foreground opacity-70" />
          <div><p className="text-sm text-muted-foreground">Itens auditados</p><p className="text-2xl font-bold">{ITENS_UTI_MOVEL.length}</p></div>
        </CardContent></Card>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por responsável..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9" />
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" />Novo Registro</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Ambulance className="h-5 w-5 text-primary" />
                Checklist UTI Móvel — {setor}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Dia</Label>
                  <Select value={String(form.dia)} onValueChange={v => setForm(p => ({ ...p, dia: Number(v) }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: diasNoMes }, (_, i) => i + 1).map(d => (
                        <SelectItem key={d} value={String(d)}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                <div>
                  <Label>Responsável</Label>
                  <Input value={form.responsavel} onChange={e => setForm(p => ({ ...p, responsavel: e.target.value }))} />
                </div>
              </div>

              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={marcarTodosOK}>Marcar todos OK</Button>
              </div>

              <div className="space-y-2">
                {ITENS_UTI_MOVEL.map(item => (
                  <div key={item} className="flex items-center justify-between p-2 border rounded-md">
                    <span className="text-sm font-medium flex-1">{item}</span>
                    <Select value={form.itens[item] || ''} onValueChange={v => setForm(p => ({ ...p, itens: { ...p.itens, [item]: v as StatusItem } }))}>
                      <SelectTrigger className="w-[100px]"><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ok">OK</SelectItem>
                        <SelectItem value="falha">Falha</SelectItem>
                        <SelectItem value="na">N/A</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              <div><Label>Observações</Label><Textarea value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} /></div>

              <Button onClick={handleSalvar} className="w-full" size="lg">
                <CheckCircle2 className="h-4 w-4 mr-2" />Registrar Checklist
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Grade mensal */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <Button variant="ghost" size="icon" onClick={mesAnterior}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="font-semibold capitalize">{nomeMes}</span>
            <Button variant="ghost" size="icon" onClick={mesProximo}><ChevronRight className="h-4 w-4" /></Button>
          </div>
          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background z-10 w-[220px]">Item</TableHead>
                  {Array.from({ length: diasNoMes }, (_, i) => i + 1).map(d => (
                    <TableHead key={d} className="text-center min-w-[32px] text-xs px-1">{d}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {ITENS_UTI_MOVEL.map(item => (
                  <TableRow key={item}>
                    <TableCell className="sticky left-0 bg-background z-10 text-xs font-medium">{item}</TableCell>
                    {Array.from({ length: diasNoMes }, (_, i) => i + 1).map(d => {
                      const diurno = getStatus(d, item, 'diurno');
                      const noturno = getStatus(d, item, 'noturno');
                      return (
                        <TableCell key={d} className="text-center px-1 py-1">
                          <div className="flex flex-col items-center leading-none gap-0.5">
                            {statusCell(diurno)}
                            {noturno && <span className="border-t border-muted-foreground/20 w-full" />}
                            {statusCell(noturno)}
                          </div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell className="sticky left-0 bg-background z-10 text-xs font-semibold text-primary">Responsável</TableCell>
                  {Array.from({ length: diasNoMes }, (_, i) => i + 1).map(d => {
                    const rD = registrosMes.find(r => r.dia === d && r.plantao === 'diurno');
                    const rN = registrosMes.find(r => r.dia === d && r.plantao === 'noturno');
                    return (
                      <TableCell key={d} className="text-center px-0.5 py-1">
                        <div className="flex flex-col items-center text-[9px] leading-tight">
                          <span className="text-primary truncate max-w-[40px]" title={rD?.responsavel}>{rD?.responsavel?.split(' ')[0] || ''}</span>
                          {rN && <span className="text-muted-foreground truncate max-w-[40px]" title={rN?.responsavel}>{rN?.responsavel?.split(' ')[0] || ''}</span>}
                        </div>
                      </TableCell>
                    );
                  })}
                </TableRow>
              </TableBody>
            </Table>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">Linha superior = diurno | Linha inferior = noturno</p>
        </CardContent>
      </Card>
    </div>
  );
}
