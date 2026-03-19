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
  SprayCanIcon, Plus, Search, CheckCircle2, Clock, CalendarDays, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { toast } from 'sonner';
import { ExportDropdown } from '@/components/ui/export-dropdown';
import { exportToPDF, exportToExcel } from '@/lib/export-utils';

type StatusItem = 'ok' | 'pendente' | 'na';

const ITENS_LIMPEZA = [
  'Respirador mecânico 01-02-03',
  'Bomba de infusão 1,2,3,4,5,6,7',
  'Carrinho de Urgência',
  'Mesa de computador',
  'Pia de procedimentos',
  'Armário da pia',
  'Suporte de soro',
  'Armário beira leito',
  'Armário de equipamentos',
  'Monitor 01-02-03-04',
  'Aparelho e suporte de ECG',
  'Pia de higienização das mãos',
];

interface RegistroLimpeza {
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

export function ChecklistLimpezaConcorrente({ storageKey, setor }: Props) {
  const [registros, setRegistros] = useLocalStorage<RegistroLimpeza[]>(storageKey, []);
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
    ITENS_LIMPEZA.forEach(item => { novos[item] = 'ok'; });
    setForm(p => ({ ...p, itens: novos }));
  };

  const handleSalvar = () => {
    if (!form.responsavel) {
      toast.error('Informe o enfermeiro responsável');
      return;
    }
    const novo: RegistroLimpeza = {
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
    toast.success('Limpeza concorrente registrada');
  };

  const registrosMes = registros.filter(r => r.mes === mesSelecionado && r.ano === anoSelecionado);

  const getStatusDia = (dia: number, item: string, plantao: 'diurno' | 'noturno'): StatusItem | null => {
    const reg = registrosMes.find(r => r.dia === dia && r.plantao === plantao);
    return reg?.itens[item] || null;
  };

  const statusCell = (s: StatusItem | null) => {
    if (!s) return <span className="text-muted-foreground text-[10px]">—</span>;
    if (s === 'ok') return <span className="text-green-600 font-bold text-[10px]">OK</span>;
    if (s === 'pendente') return <span className="text-destructive font-bold text-[10px]">P</span>;
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

  const totalMes = registrosMes.length;
  const totalOkMes = registrosMes.reduce((acc, r) => {
    return acc + Object.values(r.itens).filter(v => v === 'ok').length;
  }, 0);
  const totalItensMes = registrosMes.reduce((acc, r) => {
    return acc + Object.values(r.itens).filter(v => v !== 'na').length;
  }, 0);
  const conformidade = totalItensMes > 0 ? Math.round((totalOkMes / totalItensMes) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <SprayCanIcon className="h-5 w-5 text-primary" />
            Checklist de Limpeza Concorrente
          </h3>
          <p className="text-sm text-muted-foreground">{setor} — Controle diário de limpeza por plantão</p>
        </div>
        <ExportDropdown
          onExportPDF={() => exportToPDF({ title: `Limpeza Concorrente — ${setor}`, headers: ['Dia', 'Plantão', 'Responsável', 'Observações', 'Data Registro'], rows: registros.map(r => [r.dia, r.plantao, r.responsavel, r.observacoes, r.dataRegistro]), fileName: `limpeza_concorrente_${setor}` })}
          onExportExcel={() => exportToExcel({ title: `Limpeza Concorrente — ${setor}`, headers: ['Dia', 'Plantão', 'Responsável', 'Observações', 'Data Registro'], rows: registros.map(r => [r.dia, r.plantao, r.responsavel, r.observacoes, r.dataRegistro]), fileName: `limpeza_concorrente_${setor}` })}
        />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <CheckCircle2 className="h-8 w-8 text-primary opacity-70" />
          <div><p className="text-sm text-muted-foreground">Registros no mês</p><p className="text-2xl font-bold">{totalMes}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Clock className="h-8 w-8 text-primary opacity-70" />
          <div><p className="text-sm text-muted-foreground">Ultimo Registro</p><p className="text-sm font-medium">{registros[0]?.dataRegistro || '—'}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <SprayCanIcon className="h-8 w-8 text-primary opacity-70" />
          <div><p className="text-sm text-muted-foreground">Conformidade</p><p className="text-2xl font-bold">{conformidade}%</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <CalendarDays className="h-8 w-8 text-primary opacity-70" />
          <div><p className="text-sm text-muted-foreground">Itens auditados</p><p className="text-2xl font-bold">{ITENS_LIMPEZA.length}</p></div>
        </CardContent></Card>
      </div>

      {/* Ações */}
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
                <SprayCanIcon className="h-5 w-5 text-primary" />
                Limpeza Concorrente — {setor}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
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
              </div>
              <div>
                <Label>Enfermeiro Responsável</Label>
                <Input value={form.responsavel} onChange={e => setForm(p => ({ ...p, responsavel: e.target.value }))} />
              </div>

              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={marcarTodosOK}>Marcar todos OK</Button>
              </div>

              <div className="space-y-2">
                {ITENS_LIMPEZA.map(item => (
                  <div key={item} className="flex items-center justify-between p-2 border rounded-md">
                    <span className="text-sm font-medium flex-1">{item}</span>
                    <Select value={form.itens[item] || ''} onValueChange={v => setForm(p => ({ ...p, itens: { ...p.itens, [item]: v as StatusItem } }))}>
                      <SelectTrigger className="w-[100px]"><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ok">OK</SelectItem>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="na">N/A</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              <div><Label>Observações</Label><Textarea value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} /></div>

              <Button onClick={handleSalvar} className="w-full" size="lg">
                <CheckCircle2 className="h-4 w-4 mr-2" />Registrar Limpeza
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
                {ITENS_LIMPEZA.map(item => (
                  <TableRow key={item}>
                    <TableCell className="sticky left-0 bg-background z-10 text-xs font-medium">{item}</TableCell>
                    {Array.from({ length: diasNoMes }, (_, i) => i + 1).map(d => {
                      const diurno = getStatusDia(d, item, 'diurno');
                      const noturno = getStatusDia(d, item, 'noturno');
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
                {/* Linha de responsáveis */}
                <TableRow>
                  <TableCell className="sticky left-0 bg-background z-10 text-xs font-semibold text-primary">Responsável</TableCell>
                  {Array.from({ length: diasNoMes }, (_, i) => i + 1).map(d => {
                    const regDiurno = registrosMes.find(r => r.dia === d && r.plantao === 'diurno');
                    const regNoturno = registrosMes.find(r => r.dia === d && r.plantao === 'noturno');
                    return (
                      <TableCell key={d} className="text-center px-0.5 py-1">
                        <div className="flex flex-col items-center text-[9px] leading-tight">
                          <span className="text-primary truncate max-w-[40px]" title={regDiurno?.responsavel}>{regDiurno?.responsavel?.split(' ')[0] || ''}</span>
                          {regNoturno && <span className="text-muted-foreground truncate max-w-[40px]" title={regNoturno?.responsavel}>{regNoturno?.responsavel?.split(' ')[0] || ''}</span>}
                        </div>
                      </TableCell>
                    );
                  })}
                </TableRow>
              </TableBody>
            </Table>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">Linha superior = plantão diurno | Linha inferior = plantão noturno</p>
        </CardContent>
      </Card>

      {/* Histórico recente */}
      <div className="rounded-md border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Dia</TableHead>
              <TableHead>Plantão</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Conformidade</TableHead>
              <TableHead>Observações</TableHead>
              <TableHead>Registrado em</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(busca ? registros.filter(r => r.responsavel.toLowerCase().includes(busca.toLowerCase())) : registros).slice(0, 30).map(r => {
              const totalR = Object.values(r.itens).filter(v => v !== 'na').length;
              const okR = Object.values(r.itens).filter(v => v === 'ok').length;
              const pct = totalR > 0 ? Math.round((okR / totalR) * 100) : 0;
              return (
                <TableRow key={r.id}>
                  <TableCell className="font-mono">{String(r.dia).padStart(2, '0')}/{String(r.mes + 1).padStart(2, '0')}/{r.ano}</TableCell>
                  <TableCell><Badge variant={r.plantao === 'diurno' ? 'default' : 'secondary'}>{r.plantao === 'diurno' ? 'Diurno' : 'Noturno'}</Badge></TableCell>
                  <TableCell className="font-medium">{r.responsavel}</TableCell>
                  <TableCell>
                    <Badge className={pct >= 80 ? 'bg-green-600' : pct >= 50 ? 'bg-yellow-500' : 'bg-destructive'}>{pct}%</Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">{r.observacoes || '—'}</TableCell>
                  <TableCell className="text-sm">{r.dataRegistro}</TableCell>
                </TableRow>
              );
            })}
            {registros.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum registro de limpeza</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
