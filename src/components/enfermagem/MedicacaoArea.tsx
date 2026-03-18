import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Pill, Plus, Search, Clock, CheckCircle2, AlertTriangle, FileText,
  Syringe, Droplets, ShieldAlert, CalendarClock, User, Thermometer
} from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { toast } from 'sonner';
import { ChecklistSinaisVitais } from './ChecklistSinaisVitais';

// ── Tipos ──
interface PrescricaoMedicamento {
  id: string;
  paciente: string;
  leito: string;
  medicamento: string;
  dose: string;
  via: string;
  horario: string;
  frequencia: string;
  status: 'pendente' | 'administrado' | 'suspenso' | 'adiado';
  administradoPor: string;
  administradoEm: string;
  observacao: string;
  registradoPor: string;
  dataRegistro: string;
}

interface ControleEstoque {
  id: string;
  medicamento: string;
  lote: string;
  validade: string;
  quantidade: number;
  setor: string;
  tipo: 'entrada' | 'saida' | 'devolucao';
  registradoPor: string;
  dataRegistro: string;
  observacao: string;
}

interface EventoAdverso {
  id: string;
  paciente: string;
  medicamento: string;
  descricao: string;
  gravidade: 'leve' | 'moderada' | 'grave';
  conduta: string;
  registradoPor: string;
  dataRegistro: string;
}

const VIAS = ['VO', 'IV', 'IM', 'SC', 'SL', 'Retal', 'Tópica', 'Inalatória', 'Nasal', 'Oftálmica'];
const FREQUENCIAS = ['1x/dia', '2x/dia', '3x/dia', '4x/dia', '6/6h', '8/8h', '12/12h', 'SOS', 'ACM', 'Dose única'];

export function MedicacaoArea() {
  const [tab, setTab] = useState('prescricoes');

  // ── Prescrições ──
  const [prescricoes, setPrescricoes] = useLocalStorage<PrescricaoMedicamento[]>('enf-medicacao-prescricoes', []);
  const [prescDialogOpen, setPrescDialogOpen] = useState(false);
  const [buscaPresc, setBuscaPresc] = useState('');
  const [formPresc, setFormPresc] = useState({
    paciente: '', leito: '', medicamento: '', dose: '', via: 'VO',
    horario: '', frequencia: '1x/dia', observacao: '', registradoPor: '',
  });

  // ── Estoque ──
  const [estoque, setEstoque] = useLocalStorage<ControleEstoque[]>('enf-medicacao-estoque', []);
  const [estoqueDialogOpen, setEstoqueDialogOpen] = useState(false);
  const [buscaEstoque, setBuscaEstoque] = useState('');
  const [formEstoque, setFormEstoque] = useState({
    medicamento: '', lote: '', validade: '', quantidade: 0, setor: '',
    tipo: 'entrada' as ControleEstoque['tipo'], registradoPor: '', observacao: '',
  });

  // ── Eventos Adversos ──
  const [eventos, setEventos] = useLocalStorage<EventoAdverso[]>('enf-medicacao-eventos', []);
  const [eventoDialogOpen, setEventoDialogOpen] = useState(false);
  const [formEvento, setFormEvento] = useState({
    paciente: '', medicamento: '', descricao: '', gravidade: 'leve' as EventoAdverso['gravidade'],
    conduta: '', registradoPor: '',
  });

  // ── Handlers Prescrição ──
  const handleAddPrescricao = () => {
    if (!formPresc.paciente || !formPresc.medicamento || !formPresc.registradoPor) {
      toast.error('Paciente, medicamento e responsável são obrigatórios');
      return;
    }
    const nova: PrescricaoMedicamento = {
      id: crypto.randomUUID(),
      ...formPresc,
      status: 'pendente',
      administradoPor: '',
      administradoEm: '',
      dataRegistro: new Date().toLocaleString('pt-BR'),
    };
    setPrescricoes([nova, ...prescricoes]);
    setFormPresc({ paciente: '', leito: '', medicamento: '', dose: '', via: 'VO', horario: '', frequencia: '1x/dia', observacao: '', registradoPor: '' });
    setPrescDialogOpen(false);
    toast.success('Prescrição registrada');
  };

  const handleAdministrar = (id: string) => {
    const nome = prompt('Nome de quem administrou:');
    if (!nome) return;
    setPrescricoes(prescricoes.map(p =>
      p.id === id ? { ...p, status: 'administrado', administradoPor: nome, administradoEm: new Date().toLocaleString('pt-BR') } : p
    ));
    toast.success('Medicamento administrado');
  };

  const handleSuspender = (id: string) => {
    setPrescricoes(prescricoes.map(p =>
      p.id === id ? { ...p, status: 'suspenso' } : p
    ));
    toast.info('Medicamento suspenso');
  };

  // ── Handlers Estoque ──
  const handleAddEstoque = () => {
    if (!formEstoque.medicamento || !formEstoque.registradoPor) {
      toast.error('Medicamento e responsável são obrigatórios');
      return;
    }
    const novo: ControleEstoque = {
      id: crypto.randomUUID(),
      ...formEstoque,
      dataRegistro: new Date().toLocaleString('pt-BR'),
    };
    setEstoque([novo, ...estoque]);
    setFormEstoque({ medicamento: '', lote: '', validade: '', quantidade: 0, setor: '', tipo: 'entrada', registradoPor: '', observacao: '' });
    setEstoqueDialogOpen(false);
    toast.success('Movimentação de estoque registrada');
  };

  // ── Handlers Eventos Adversos ──
  const handleAddEvento = () => {
    if (!formEvento.paciente || !formEvento.medicamento || !formEvento.descricao || !formEvento.registradoPor) {
      toast.error('Todos os campos obrigatórios devem ser preenchidos');
      return;
    }
    const novo: EventoAdverso = {
      id: crypto.randomUUID(),
      ...formEvento,
      dataRegistro: new Date().toLocaleString('pt-BR'),
    };
    setEventos([novo, ...eventos]);
    setFormEvento({ paciente: '', medicamento: '', descricao: '', gravidade: 'leve', conduta: '', registradoPor: '' });
    setEventoDialogOpen(false);
    toast.success('Evento adverso registrado');
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'administrado': return 'bg-green-600';
      case 'pendente': return 'bg-yellow-500';
      case 'suspenso': return 'bg-destructive';
      case 'adiado': return 'bg-orange-500';
      default: return 'bg-muted';
    }
  };

  const gravidadeColor = (g: string) => {
    switch (g) {
      case 'leve': return 'bg-yellow-500';
      case 'moderada': return 'bg-orange-500';
      case 'grave': return 'bg-destructive';
      default: return 'bg-muted';
    }
  };

  const pendentes = prescricoes.filter(p => p.status === 'pendente').length;
  const administrados = prescricoes.filter(p => p.status === 'administrado').length;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Pill className="h-5 w-5 text-primary" />
          Medicação
        </h2>
        <p className="text-sm text-muted-foreground">Controle de prescrições, administração, estoque e eventos adversos</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Clock className="h-8 w-8 text-primary opacity-70" />
          <div><p className="text-sm text-muted-foreground">Pendentes</p><p className="text-2xl font-bold">{pendentes}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <CheckCircle2 className="h-8 w-8 text-primary opacity-70" />
          <div><p className="text-sm text-muted-foreground">Administrados</p><p className="text-2xl font-bold">{administrados}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <AlertTriangle className="h-8 w-8 text-destructive opacity-70" />
          <div><p className="text-sm text-muted-foreground">Eventos Adversos</p><p className="text-2xl font-bold">{eventos.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Pill className="h-8 w-8 text-muted-foreground opacity-70" />
          <div><p className="text-sm text-muted-foreground">Movimentações</p><p className="text-2xl font-bold">{estoque.length}</p></div>
        </CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="prescricoes" className="gap-1"><FileText className="h-4 w-4" />Prescrições</TabsTrigger>
          <TabsTrigger value="estoque" className="gap-1"><Droplets className="h-4 w-4" />Estoque</TabsTrigger>
          <TabsTrigger value="eventos" className="gap-1"><ShieldAlert className="h-4 w-4" />Eventos Adversos</TabsTrigger>
          <TabsTrigger value="sinais-vitais" className="gap-1"><Thermometer className="h-4 w-4" />Sinais Vitais</TabsTrigger>
        </TabsList>

        {/* ── Prescrições ── */}
        <TabsContent value="prescricoes" className="mt-4 space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar paciente ou medicamento..." value={buscaPresc} onChange={e => setBuscaPresc(e.target.value)} className="pl-9" />
            </div>
            <Dialog open={prescDialogOpen} onOpenChange={setPrescDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-1" />Nova Prescrição</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle>Nova Prescrição de Medicamento</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Paciente</Label><Input value={formPresc.paciente} onChange={e => setFormPresc(p => ({ ...p, paciente: e.target.value }))} /></div>
                    <div><Label>Leito</Label><Input value={formPresc.leito} onChange={e => setFormPresc(p => ({ ...p, leito: e.target.value }))} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Medicamento</Label><Input value={formPresc.medicamento} onChange={e => setFormPresc(p => ({ ...p, medicamento: e.target.value }))} /></div>
                    <div><Label>Dose</Label><Input value={formPresc.dose} onChange={e => setFormPresc(p => ({ ...p, dose: e.target.value }))} placeholder="Ex: 500mg" /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label>Via</Label>
                      <Select value={formPresc.via} onValueChange={v => setFormPresc(p => ({ ...p, via: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{VIAS.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Horário</Label><Input type="time" value={formPresc.horario} onChange={e => setFormPresc(p => ({ ...p, horario: e.target.value }))} /></div>
                    <div>
                      <Label>Frequência</Label>
                      <Select value={formPresc.frequencia} onValueChange={v => setFormPresc(p => ({ ...p, frequencia: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{FREQUENCIAS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div><Label>Observação</Label><Textarea value={formPresc.observacao} onChange={e => setFormPresc(p => ({ ...p, observacao: e.target.value }))} /></div>
                  <div><Label>Registrado por</Label><Input value={formPresc.registradoPor} onChange={e => setFormPresc(p => ({ ...p, registradoPor: e.target.value }))} /></div>
                  <Button onClick={handleAddPrescricao} className="w-full">Registrar Prescrição</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Leito</TableHead>
                  <TableHead>Medicamento</TableHead>
                  <TableHead>Dose</TableHead>
                  <TableHead>Via</TableHead>
                  <TableHead>Horário</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prescricoes
                  .filter(p => p.paciente.toLowerCase().includes(buscaPresc.toLowerCase()) || p.medicamento.toLowerCase().includes(buscaPresc.toLowerCase()))
                  .length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhuma prescrição registrada</TableCell></TableRow>
                ) : prescricoes
                  .filter(p => p.paciente.toLowerCase().includes(buscaPresc.toLowerCase()) || p.medicamento.toLowerCase().includes(buscaPresc.toLowerCase()))
                  .map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.paciente}</TableCell>
                    <TableCell>{p.leito}</TableCell>
                    <TableCell>{p.medicamento}</TableCell>
                    <TableCell>{p.dose}</TableCell>
                    <TableCell><Badge variant="outline">{p.via}</Badge></TableCell>
                    <TableCell>{p.horario} <span className="text-xs text-muted-foreground">({p.frequencia})</span></TableCell>
                    <TableCell><Badge className={statusColor(p.status)}>{p.status}</Badge></TableCell>
                    <TableCell>
                      {p.status === 'pendente' && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => handleAdministrar(p.id)} className="text-xs h-7">Administrar</Button>
                          <Button size="sm" variant="ghost" onClick={() => handleSuspender(p.id)} className="text-xs h-7 text-destructive">Suspender</Button>
                        </div>
                      )}
                      {p.status === 'administrado' && (
                        <span className="text-xs text-muted-foreground">{p.administradoPor} — {p.administradoEm}</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ── Estoque ── */}
        <TabsContent value="estoque" className="mt-4 space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar medicamento ou lote..." value={buscaEstoque} onChange={e => setBuscaEstoque(e.target.value)} className="pl-9" />
            </div>
            <Dialog open={estoqueDialogOpen} onOpenChange={setEstoqueDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-1" />Nova Movimentação</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Movimentação de Estoque</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Medicamento</Label><Input value={formEstoque.medicamento} onChange={e => setFormEstoque(p => ({ ...p, medicamento: e.target.value }))} /></div>
                  <div className="grid grid-cols-3 gap-3">
                    <div><Label>Lote</Label><Input value={formEstoque.lote} onChange={e => setFormEstoque(p => ({ ...p, lote: e.target.value }))} /></div>
                    <div><Label>Validade</Label><Input type="date" value={formEstoque.validade} onChange={e => setFormEstoque(p => ({ ...p, validade: e.target.value }))} /></div>
                    <div><Label>Quantidade</Label><Input type="number" value={formEstoque.quantidade} onChange={e => setFormEstoque(p => ({ ...p, quantidade: Number(e.target.value) }))} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Setor</Label><Input value={formEstoque.setor} onChange={e => setFormEstoque(p => ({ ...p, setor: e.target.value }))} /></div>
                    <div>
                      <Label>Tipo</Label>
                      <Select value={formEstoque.tipo} onValueChange={v => setFormEstoque(p => ({ ...p, tipo: v as any }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="entrada">Entrada</SelectItem>
                          <SelectItem value="saida">Saída</SelectItem>
                          <SelectItem value="devolucao">Devolução</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div><Label>Observação</Label><Textarea value={formEstoque.observacao} onChange={e => setFormEstoque(p => ({ ...p, observacao: e.target.value }))} /></div>
                  <div><Label>Registrado por</Label><Input value={formEstoque.registradoPor} onChange={e => setFormEstoque(p => ({ ...p, registradoPor: e.target.value }))} /></div>
                  <Button onClick={handleAddEstoque} className="w-full">Registrar Movimentação</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medicamento</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead>Qtd</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {estoque
                  .filter(e => e.medicamento.toLowerCase().includes(buscaEstoque.toLowerCase()) || e.lote.includes(buscaEstoque))
                  .length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhuma movimentação registrada</TableCell></TableRow>
                ) : estoque
                  .filter(e => e.medicamento.toLowerCase().includes(buscaEstoque.toLowerCase()) || e.lote.includes(buscaEstoque))
                  .map(e => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.medicamento}</TableCell>
                    <TableCell className="font-mono text-sm">{e.lote}</TableCell>
                    <TableCell>{e.validade}</TableCell>
                    <TableCell className="font-bold">{e.quantidade}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        e.tipo === 'entrada' ? 'border-green-500 text-green-700' :
                        e.tipo === 'saida' ? 'border-destructive text-destructive' :
                        'border-primary text-primary'
                      }>
                        {e.tipo === 'entrada' ? 'Entrada' : e.tipo === 'saida' ? 'Saída' : 'Devolução'}
                      </Badge>
                    </TableCell>
                    <TableCell>{e.setor}</TableCell>
                    <TableCell>{e.registradoPor}</TableCell>
                    <TableCell className="text-sm">{e.dataRegistro}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ── Eventos Adversos ── */}
        <TabsContent value="eventos" className="mt-4 space-y-4">
          <div className="flex gap-2 justify-end">
            <Dialog open={eventoDialogOpen} onOpenChange={setEventoDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive"><Plus className="h-4 w-4 mr-1" />Registrar Evento Adverso</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Registrar Evento Adverso a Medicamento</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Paciente</Label><Input value={formEvento.paciente} onChange={e => setFormEvento(p => ({ ...p, paciente: e.target.value }))} /></div>
                    <div><Label>Medicamento</Label><Input value={formEvento.medicamento} onChange={e => setFormEvento(p => ({ ...p, medicamento: e.target.value }))} /></div>
                  </div>
                  <div><Label>Descrição do Evento</Label><Textarea value={formEvento.descricao} onChange={e => setFormEvento(p => ({ ...p, descricao: e.target.value }))} placeholder="Descreva a reação adversa observada..." /></div>
                  <div>
                    <Label>Gravidade</Label>
                    <Select value={formEvento.gravidade} onValueChange={v => setFormEvento(p => ({ ...p, gravidade: v as any }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="leve">Leve</SelectItem>
                        <SelectItem value="moderada">Moderada</SelectItem>
                        <SelectItem value="grave">Grave</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Conduta Adotada</Label><Textarea value={formEvento.conduta} onChange={e => setFormEvento(p => ({ ...p, conduta: e.target.value }))} /></div>
                  <div><Label>Registrado por</Label><Input value={formEvento.registradoPor} onChange={e => setFormEvento(p => ({ ...p, registradoPor: e.target.value }))} /></div>
                  <Button onClick={handleAddEvento} className="w-full" variant="destructive">Registrar Evento</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {eventos.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">
              <ShieldAlert className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p>Nenhum evento adverso registrado</p>
            </CardContent></Card>
          ) : (
            <div className="space-y-3">
              {eventos.map(ev => (
                <Card key={ev.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{ev.paciente} — {ev.medicamento}</CardTitle>
                      <div className="flex gap-2">
                        <Badge className={gravidadeColor(ev.gravidade)}>{ev.gravidade}</Badge>
                        <Badge variant="outline">{ev.dataRegistro}</Badge>
                      </div>
                    </div>
                    <CardDescription>Registrado por: {ev.registradoPor}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <div><span className="text-sm font-medium">Descrição:</span><p className="text-sm text-muted-foreground">{ev.descricao}</p></div>
                    {ev.conduta && <div><span className="text-sm font-medium">Conduta:</span><p className="text-sm text-muted-foreground">{ev.conduta}</p></div>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sinais-vitais" className="mt-4">
          <ChecklistSinaisVitais storageKey="enf-sinais-vitais-medicacao" setor="Medicação" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
