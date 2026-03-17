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
  ClipboardList, Plus, CheckCircle2, Clock, Calendar
} from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { toast } from 'sonner';

// Equipamentos/materiais conforme formulário da UPA
const ITENS_SETOR = [
  { nome: 'Ambu adulto', qtd: 2 },
  { nome: 'Ambu infantil e neonatal', qtd: 2 },
  { nome: 'Vácuo', qtd: 4 },
  { nome: 'Traqueia adulto', qtd: 2 },
  { nome: 'Traqueia infantil', qtd: 1 },
  { nome: 'MFR adulto', qtd: 2 },
  { nome: 'MFR infantil', qtd: 2 },
  { nome: 'Látex', qtd: 5 },
  { nome: 'Espaçador adulto', qtd: 2 },
  { nome: 'Espaçador infantil', qtd: 2 },
  { nome: 'Umidificador + CN (vários)', qtd: 8 },
  { nome: 'Fio guia metálico + Bougie', qtd: 2 },
  { nome: 'Teleneuro (consultório 3)', qtd: 1 },
  { nome: 'Ventilador mecânico', qtd: 4 },
  { nome: 'Monitor multiparâmetro', qtd: 4 },
  { nome: 'BIC', qtd: 9 },
  { nome: 'Foco portátil + Sonar', qtd: 3 },
  { nome: 'ECG', qtd: 1 },
  { nome: 'Desfibrilador (teste)', qtd: 1 },
  { nome: 'Inogen (oxigênio portátil)', qtd: 1 },
  { nome: 'Kit sutura (instrumental)', qtd: 5 },
  { nome: 'Caixa de pequena cirurgia', qtd: 1 },
  { nome: 'Negatoscópio', qtd: 1 },
  { nome: 'Kit sinais vitais', qtd: 1 },
  { nome: 'Kit laringo adulto (cabo, lâminas curvas nº 3, 4 e 5)', qtd: 2 },
  { nome: 'Kit laringo infantil (cabo, lâminas curvas nº 0, 1 e 2)', qtd: 1 },
  { nome: 'Kit laringo infantil (cabo, lâminas retas nº 0, 1 e 3)', qtd: 1 },
  { nome: 'Carrinho de urgência (número do lacre)', qtd: 1 },
];

type StatusItem = 'ok' | 'falta' | 'manutencao' | '';

interface RegistroDiario {
  id: string;
  mes: string;
  dia: string;
  itens: Record<string, StatusItem>;
  enfermeiroResponsavel: string;
  observacoes: string;
  dataRegistro: string;
}

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export function ChecklistSetorUrgencia() {
  const [registros, setRegistros] = useLocalStorage<RegistroDiario[]>('enf-checklist-setor-urgencia', []);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mesFiltro, setMesFiltro] = useState(MESES[new Date().getMonth()]);

  const hoje = new Date();
  const [form, setForm] = useState({
    mes: MESES[hoje.getMonth()],
    dia: String(hoje.getDate()),
    itens: {} as Record<string, StatusItem>,
    enfermeiroResponsavel: '',
    observacoes: '',
  });

  const totalItens = ITENS_SETOR.length;
  const itensPreenchidos = Object.values(form.itens).filter(v => v !== '').length;

  const setItemStatus = (nome: string, status: StatusItem) => {
    setForm(p => ({ ...p, itens: { ...p.itens, [nome]: p.itens[nome] === status ? '' : status } }));
  };

  const handleMarcarTodosOk = () => {
    const novos: Record<string, StatusItem> = {};
    const todosOk = ITENS_SETOR.every(i => form.itens[i.nome] === 'ok');
    ITENS_SETOR.forEach(i => { novos[i.nome] = todosOk ? '' : 'ok'; });
    setForm(p => ({ ...p, itens: novos }));
  };

  const handleSalvar = () => {
    if (!form.enfermeiroResponsavel) {
      toast.error('Enfermeiro responsável é obrigatório');
      return;
    }
    if (itensPreenchidos === 0) {
      toast.error('Preencha o status de pelo menos um item');
      return;
    }
    const novo: RegistroDiario = {
      id: crypto.randomUUID(),
      ...form,
      dataRegistro: new Date().toLocaleString('pt-BR'),
    };
    setRegistros([novo, ...registros]);
    setForm({
      mes: MESES[hoje.getMonth()],
      dia: String(hoje.getDate()),
      itens: {},
      enfermeiroResponsavel: '',
      observacoes: '',
    });
    setDialogOpen(false);
    toast.success('Checklist do setor registrado');
  };

  const registrosFiltrados = registros.filter(r => r.mes === mesFiltro);

  // Agrupar por dia para visualização em grade
  const diasDoMes = Array.from({ length: 31 }, (_, i) => String(i + 1));
  const registrosPorDia = new Map<string, RegistroDiario>();
  registrosFiltrados.forEach(r => { registrosPorDia.set(r.dia, r); });

  const statusIcon = (s: StatusItem) => {
    switch (s) {
      case 'ok': return <span className="text-green-600 font-bold text-xs">OK</span>;
      case 'falta': return <span className="text-destructive font-bold text-xs">F</span>;
      case 'manutencao': return <span className="text-yellow-600 font-bold text-xs">M</span>;
      default: return <span className="text-muted-foreground text-xs">—</span>;
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          Checklist Setor da Urgência
        </h3>
        <p className="text-sm text-muted-foreground">Controle diário de equipamentos e materiais — Enfermagem</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <CheckCircle2 className="h-8 w-8 text-primary opacity-70" />
          <div><p className="text-sm text-muted-foreground">Registros no Mês</p><p className="text-2xl font-bold">{registrosFiltrados.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Clock className="h-8 w-8 text-primary opacity-70" />
          <div><p className="text-sm text-muted-foreground">Ultimo Registro</p><p className="text-sm font-medium">{registros[0]?.dataRegistro || '—'}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <ClipboardList className="h-8 w-8 text-muted-foreground opacity-70" />
          <div><p className="text-sm text-muted-foreground">Total Equipamentos</p><p className="text-2xl font-bold">{totalItens}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Calendar className="h-8 w-8 text-primary opacity-70" />
          <div><p className="text-sm text-muted-foreground">Dias Preenchidos</p><p className="text-2xl font-bold">{registrosFiltrados.length}/31</p></div>
        </CardContent></Card>
      </div>

      {/* Ações */}
      <div className="flex gap-2 flex-wrap">
        <Select value={mesFiltro} onValueChange={setMesFiltro}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>{MESES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
        </Select>

        <div className="flex gap-2 ml-auto">
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-600 inline-block" /> OK</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-destructive inline-block" /> Falta</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-500 inline-block" /> Manutenção</span>
          </div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" />Novo Registro Diário</Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" />
                Checklist Setor da Urgência — Registro Diário
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Mês</Label>
                  <Select value={form.mes} onValueChange={v => setForm(p => ({ ...p, mes: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{MESES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Dia</Label>
                  <Input type="number" min={1} max={31} value={form.dia} onChange={e => setForm(p => ({ ...p, dia: e.target.value }))} />
                </div>
                <div className="flex items-end">
                  <Button variant="outline" onClick={handleMarcarTodosOk} className="w-full">
                    {ITENS_SETOR.every(i => form.itens[i.nome] === 'ok') ? 'Desmarcar todos' : 'Marcar todos OK'}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm">Itens preenchidos: {itensPreenchidos}/{totalItens}</p>
                <div className="h-2 w-48 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${totalItens > 0 ? (itensPreenchidos / totalItens) * 100 : 0}%` }} />
                </div>
              </div>

              <div className="rounded-md border overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[300px]">Equipamento / Material</TableHead>
                      <TableHead className="text-center w-16">QTD</TableHead>
                      <TableHead className="text-center">OK</TableHead>
                      <TableHead className="text-center">Falta</TableHead>
                      <TableHead className="text-center">Manutenção</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ITENS_SETOR.map(item => (
                      <TableRow key={item.nome}>
                        <TableCell className="text-sm font-medium">{item.nome}</TableCell>
                        <TableCell className="text-center font-mono">{item.qtd}</TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm" variant={form.itens[item.nome] === 'ok' ? 'default' : 'outline'}
                            className={`h-7 w-14 text-xs ${form.itens[item.nome] === 'ok' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                            onClick={() => setItemStatus(item.nome, 'ok')}
                          >OK</Button>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm" variant={form.itens[item.nome] === 'falta' ? 'default' : 'outline'}
                            className={`h-7 w-14 text-xs ${form.itens[item.nome] === 'falta' ? 'bg-destructive hover:bg-destructive/90' : ''}`}
                            onClick={() => setItemStatus(item.nome, 'falta')}
                          >F</Button>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm" variant={form.itens[item.nome] === 'manutencao' ? 'default' : 'outline'}
                            className={`h-7 w-14 text-xs ${form.itens[item.nome] === 'manutencao' ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : ''}`}
                            onClick={() => setItemStatus(item.nome, 'manutencao')}
                          >M</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div><Label>Enfermeiro Responsável</Label><Input value={form.enfermeiroResponsavel} onChange={e => setForm(p => ({ ...p, enfermeiroResponsavel: e.target.value }))} /></div>
                <div><Label>Observações</Label><Textarea value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} /></div>
              </div>
              <Button onClick={handleSalvar} className="w-full" size="lg">
                <CheckCircle2 className="h-4 w-4 mr-2" />Registrar Checklist do Dia
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Grade mensal */}
      <div className="rounded-md border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-background z-10 w-[220px]">Equipamento / Material</TableHead>
              <TableHead className="text-center w-10">QTD</TableHead>
              {diasDoMes.map(d => (
                <TableHead key={d} className={`text-center w-8 text-xs px-1 ${registrosPorDia.has(d) ? '' : 'text-muted-foreground/40'}`}>{d}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {ITENS_SETOR.map(item => (
              <TableRow key={item.nome}>
                <TableCell className="sticky left-0 bg-background z-10 text-xs font-medium whitespace-nowrap">{item.nome}</TableCell>
                <TableCell className="text-center font-mono text-xs">{item.qtd}</TableCell>
                {diasDoMes.map(d => {
                  const reg = registrosPorDia.get(d);
                  const status = reg?.itens[item.nome] || '';
                  return (
                    <TableCell key={d} className="text-center px-1">
                      {statusIcon(status)}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
            <TableRow className="border-t-2">
              <TableCell className="sticky left-0 bg-background z-10 text-xs font-semibold">Enfermeiro Responsável</TableCell>
              <TableCell />
              {diasDoMes.map(d => {
                const reg = registrosPorDia.get(d);
                return (
                  <TableCell key={d} className="text-center px-1">
                    <span className="text-[9px] text-muted-foreground">{reg?.enfermeiroResponsavel?.split(' ')[0] || ''}</span>
                  </TableCell>
                );
              })}
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
