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
import {
  BedDouble, ClipboardList, UserCheck, AlertTriangle, Plus, Search,
  Clock, ThermometerSun, Pill, Activity, FileText, CheckCircle2, ShieldAlert
} from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { ChecklistCarrinhoInternacao } from './ChecklistCarrinhoInternacao';
import { toast } from 'sonner';

interface PacienteInternado {
  id: string;
  nome: string;
  leito: string;
  setor: string;
  diagnostico: string;
  dataInternacao: string;
  medico: string;
  risco: 'baixo' | 'moderado' | 'alto' | 'critico';
  observacoes: string;
}

interface PassagemPlantaoItem {
  id: string;
  data: string;
  turno: string;
  paciente: string;
  leito: string;
  informacoes: string;
  pendencias: string;
  registradoPor: string;
}

interface ChecklistCuidado {
  id: string;
  descricao: string;
  categoria: string;
  concluido: boolean;
  horario?: string;
}

const CHECKLIST_PADRAO: Omit<ChecklistCuidado, 'id' | 'concluido' | 'horario'>[] = [
  { descricao: 'Verificar sinais vitais', categoria: 'Monitoramento' },
  { descricao: 'Conferir pulseira de identificação', categoria: 'Segurança do Paciente' },
  { descricao: 'Checar prescrição médica', categoria: 'Medicação' },
  { descricao: 'Avaliar risco de queda (Morse)', categoria: 'Segurança do Paciente' },
  { descricao: 'Avaliar risco de LPP (Braden)', categoria: 'Segurança do Paciente' },
  { descricao: 'Verificar acesso venoso', categoria: 'Procedimentos' },
  { descricao: 'Higienização das mãos', categoria: 'Infecção' },
  { descricao: 'Cabeceira elevada 30-45°', categoria: 'Pneumonia Zero' },
  { descricao: 'Conferir dieta prescrita', categoria: 'Nutrição' },
  { descricao: 'Registrar balanço hídrico', categoria: 'Monitoramento' },
];

export function InternacaoArea() {
  const [tab, setTab] = useState('pacientes');
  const [pacientes, setPacientes] = useLocalStorage<PacienteInternado[]>('enf-internacao-pacientes', []);
  const [passagens, setPassagens] = useLocalStorage<PassagemPlantaoItem[]>('enf-internacao-passagens', []);
  const [checklist, setChecklist] = useState<ChecklistCuidado[]>(
    CHECKLIST_PADRAO.map((c, i) => ({ ...c, id: `ck-${i}`, concluido: false }))
  );
  const [novoDialogOpen, setNovoDialogOpen] = useState(false);
  const [passagemDialogOpen, setPassagemDialogOpen] = useState(false);
  const [busca, setBusca] = useState('');

  const [formPaciente, setFormPaciente] = useState({
    nome: '', leito: '', setor: 'Observação', diagnostico: '', medico: '', risco: 'moderado' as PacienteInternado['risco'], observacoes: ''
  });

  const [formPassagem, setFormPassagem] = useState({
    turno: 'diurno', paciente: '', leito: '', informacoes: '', pendencias: '', registradoPor: ''
  });

  const pacientesFiltrados = pacientes.filter(p =>
    p.nome.toLowerCase().includes(busca.toLowerCase()) ||
    p.leito.toLowerCase().includes(busca.toLowerCase())
  );

  const handleAddPaciente = () => {
    if (!formPaciente.nome || !formPaciente.leito) {
      toast.error('Nome e leito são obrigatórios');
      return;
    }
    const novo: PacienteInternado = {
      id: crypto.randomUUID(),
      ...formPaciente,
      dataInternacao: new Date().toISOString().split('T')[0],
    };
    setPacientes([...pacientes, novo]);
    setFormPaciente({ nome: '', leito: '', setor: 'Observação', diagnostico: '', medico: '', risco: 'moderado', observacoes: '' });
    setNovoDialogOpen(false);
    toast.success('Paciente registrado com sucesso');
  };

  const handleAddPassagem = () => {
    if (!formPassagem.paciente || !formPassagem.informacoes) {
      toast.error('Paciente e informações são obrigatórios');
      return;
    }
    const nova: PassagemPlantaoItem = {
      id: crypto.randomUUID(),
      data: new Date().toISOString().split('T')[0],
      ...formPassagem,
    };
    setPassagens([nova, ...passagens]);
    setFormPassagem({ turno: 'diurno', paciente: '', leito: '', informacoes: '', pendencias: '', registradoPor: '' });
    setPassagemDialogOpen(false);
    toast.success('Passagem de plantão registrada');
  };

  const toggleChecklist = (id: string) => {
    setChecklist(prev => prev.map(c =>
      c.id === id ? { ...c, concluido: !c.concluido, horario: !c.concluido ? new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : undefined } : c
    ));
  };

  const riscoColor = (risco: string) => {
    switch (risco) {
      case 'baixo': return 'bg-green-100 text-green-800';
      case 'moderado': return 'bg-yellow-100 text-yellow-800';
      case 'alto': return 'bg-orange-100 text-orange-800';
      case 'critico': return 'bg-red-100 text-red-800';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const checklistCompletos = checklist.filter(c => c.concluido).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <BedDouble className="h-5 w-5 text-primary" />
            Internação
          </h2>
          <p className="text-sm text-muted-foreground">Gestão de pacientes internados, passagem de plantão e checklists de cuidados</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <BedDouble className="h-8 w-8 text-primary opacity-70" />
          <div><p className="text-sm text-muted-foreground">Pacientes</p><p className="text-2xl font-bold">{pacientes.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <AlertTriangle className="h-8 w-8 text-destructive opacity-70" />
          <div><p className="text-sm text-muted-foreground">Risco Alto/Crítico</p><p className="text-2xl font-bold">{pacientes.filter(p => p.risco === 'alto' || p.risco === 'critico').length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <ClipboardList className="h-8 w-8 text-warning opacity-70" />
          <div><p className="text-sm text-muted-foreground">Passagens Hoje</p><p className="text-2xl font-bold">{passagens.filter(p => p.data === new Date().toISOString().split('T')[0]).length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <CheckCircle2 className="h-8 w-8 text-success opacity-70" />
          <div><p className="text-sm text-muted-foreground">Checklist</p><p className="text-2xl font-bold">{checklistCompletos}/{checklist.length}</p></div>
        </CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pacientes" className="gap-1"><BedDouble className="h-4 w-4" />Pacientes</TabsTrigger>
          <TabsTrigger value="passagem" className="gap-1"><ClipboardList className="h-4 w-4" />Passagem de Plantão</TabsTrigger>
          <TabsTrigger value="checklist" className="gap-1"><CheckCircle2 className="h-4 w-4" />Checklist</TabsTrigger>
        </TabsList>

        <TabsContent value="pacientes" className="mt-4 space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por nome ou leito..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9" />
            </div>
            <Dialog open={novoDialogOpen} onOpenChange={setNovoDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-1" />Novo Paciente</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Registrar Paciente Internado</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Nome</Label><Input value={formPaciente.nome} onChange={e => setFormPaciente(p => ({ ...p, nome: e.target.value }))} /></div>
                    <div><Label>Leito</Label><Input value={formPaciente.leito} onChange={e => setFormPaciente(p => ({ ...p, leito: e.target.value }))} placeholder="Ex: 01A" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Setor</Label>
                      <Select value={formPaciente.setor} onValueChange={v => setFormPaciente(p => ({ ...p, setor: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Observação">Observação</SelectItem>
                          <SelectItem value="Sala Amarela">Sala Amarela</SelectItem>
                          <SelectItem value="Sala Vermelha">Sala Vermelha</SelectItem>
                          <SelectItem value="Pediatria">Pediatria</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Risco</Label>
                      <Select value={formPaciente.risco} onValueChange={v => setFormPaciente(p => ({ ...p, risco: v as any }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="baixo">Baixo</SelectItem>
                          <SelectItem value="moderado">Moderado</SelectItem>
                          <SelectItem value="alto">Alto</SelectItem>
                          <SelectItem value="critico">Crítico</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div><Label>Diagnóstico</Label><Input value={formPaciente.diagnostico} onChange={e => setFormPaciente(p => ({ ...p, diagnostico: e.target.value }))} /></div>
                  <div><Label>Médico Responsável</Label><Input value={formPaciente.medico} onChange={e => setFormPaciente(p => ({ ...p, medico: e.target.value }))} /></div>
                  <div><Label>Observações</Label><Textarea value={formPaciente.observacoes} onChange={e => setFormPaciente(p => ({ ...p, observacoes: e.target.value }))} /></div>
                  <Button onClick={handleAddPaciente} className="w-full">Registrar</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Leito</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>Diagnóstico</TableHead>
                  <TableHead>Médico</TableHead>
                  <TableHead>Risco</TableHead>
                  <TableHead>Internação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pacientesFiltrados.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum paciente internado registrado</TableCell></TableRow>
                ) : pacientesFiltrados.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono font-semibold">{p.leito}</TableCell>
                    <TableCell className="font-medium">{p.nome}</TableCell>
                    <TableCell>{p.setor}</TableCell>
                    <TableCell>{p.diagnostico}</TableCell>
                    <TableCell>{p.medico}</TableCell>
                    <TableCell><Badge className={riscoColor(p.risco)}>{p.risco}</Badge></TableCell>
                    <TableCell>{p.dataInternacao}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="passagem" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Dialog open={passagemDialogOpen} onOpenChange={setPassagemDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-1" />Nova Passagem</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Passagem de Plantão</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Turno</Label>
                      <Select value={formPassagem.turno} onValueChange={v => setFormPassagem(p => ({ ...p, turno: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="diurno">Diurno (7h-19h)</SelectItem>
                          <SelectItem value="noturno">Noturno (19h-7h)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Leito</Label><Input value={formPassagem.leito} onChange={e => setFormPassagem(p => ({ ...p, leito: e.target.value }))} /></div>
                  </div>
                  <div><Label>Paciente</Label><Input value={formPassagem.paciente} onChange={e => setFormPassagem(p => ({ ...p, paciente: e.target.value }))} /></div>
                  <div><Label>Informações Clínicas</Label><Textarea value={formPassagem.informacoes} onChange={e => setFormPassagem(p => ({ ...p, informacoes: e.target.value }))} placeholder="Estado geral, medicações, procedimentos realizados..." /></div>
                  <div><Label>Pendências</Label><Textarea value={formPassagem.pendencias} onChange={e => setFormPassagem(p => ({ ...p, pendencias: e.target.value }))} placeholder="Exames, medicações, procedimentos pendentes..." /></div>
                  <div><Label>Registrado por</Label><Input value={formPassagem.registradoPor} onChange={e => setFormPassagem(p => ({ ...p, registradoPor: e.target.value }))} /></div>
                  <Button onClick={handleAddPassagem} className="w-full">Registrar Passagem</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {passagens.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">
              <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p>Nenhuma passagem de plantão registrada</p>
            </CardContent></Card>
          ) : passagens.map(p => (
            <Card key={p.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{p.paciente} — Leito {p.leito}</CardTitle>
                  <div className="flex gap-2">
                    <Badge variant="outline">{p.data}</Badge>
                    <Badge className={p.turno === 'diurno' ? 'bg-yellow-100 text-yellow-800' : 'bg-indigo-100 text-indigo-800'}>{p.turno === 'diurno' ? 'Diurno' : 'Noturno'}</Badge>
                  </div>
                </div>
                <CardDescription>Registrado por: {p.registradoPor}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div><span className="text-sm font-medium">Informações:</span><p className="text-sm text-muted-foreground">{p.informacoes}</p></div>
                {p.pendencias && <div><span className="text-sm font-medium text-warning">Pendências:</span><p className="text-sm text-muted-foreground">{p.pendencias}</p></div>}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="checklist" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Checklist de Cuidados — Turno Atual</CardTitle>
              <CardDescription>Baseado nas Metas Internacionais de Segurança do Paciente (ONA)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {checklist.map(item => (
                  <div key={item.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/50">
                    <Checkbox checked={item.concluido} onCheckedChange={() => toggleChecklist(item.id)} />
                    <div className="flex-1">
                      <span className={item.concluido ? 'line-through text-muted-foreground' : ''}>{item.descricao}</span>
                      <Badge variant="outline" className="ml-2 text-xs">{item.categoria}</Badge>
                    </div>
                    {item.horario && <span className="text-xs text-muted-foreground">{item.horario}</span>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
