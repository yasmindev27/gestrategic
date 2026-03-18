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
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  ClipboardPen, Plus, Search, Eye, Clock, CheckCircle2, Users
} from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { toast } from 'sonner';

// ===== TIPOS =====
interface PassagemSBAR {
  id: string;
  data: string;
  turno: 'diurno' | 'noturno';
  // SITUAÇÃO
  pacienteNome: string;
  nascimento: string;
  hd: string;
  dataInternacao: string;
  horaInternacao: string;
  origem: string;
  medicoResponsavel: string;
  leito: string;
  tipoAtendimento: 'clinico' | 'cirurgico';
  // BREVE HISTÓRIA
  antecedentes: string;
  isolamentoPrecaucao: string;
  medicacoesEmUso: string;
  examRealizados: string;
  examRealizadosDr: string;
  examRealizadosHora: string;
  // AVALIAÇÃO
  neuroGlasgow: string;
  mucosas: string;
  respFAA: boolean;
  respCN: boolean;
  respNB: boolean;
  respIOT: boolean;
  o2LMin: string;
  nutricaoOral: boolean;
  nutricaoSNE: boolean;
  nutricaoNPP: boolean;
  dieta: string;
  vazao: string;
  jejum: string;
  peleIntegra: boolean;
  peleLPP: boolean;
  peleGrau: string;
  peleLocal: string;
  curativo: string;
  dreno: string;
  dispositivoDesc: string;
  dispositivoDt: string;
  dispositivoLocal: string;
  dispositivoHora: string;
  // RISCOS
  riscoTEV: boolean;
  riscoLPP: boolean;
  riscoQueda: boolean;
  riscoBroncoasp: boolean;
  riscoFlebite: boolean;
  riscoHipoglicemia: boolean;
  riscoAlergia: boolean;
  // PROTOCOLOS
  protTEV: boolean;
  protSepse: boolean;
  protDorToracica: boolean;
  protCVC: boolean;
  protCVD: boolean;
  // ESCALAS
  escalaMorse: string;
  escalaBraden: string;
  escalasOutros: string;
  // ELIMINAÇÕES
  elimDiurese: string;
  elimEvacuacao: string;
  elimCVD: boolean;
  // RECOMENDAÇÃO
  pendenciasAdmissao: string;
  // PASSAGEM
  passagens: PassagemRegistro[];
  // META
  enfermeiroResponsavel: string;
  coren: string;
  dataRegistro: string;
}

interface PassagemRegistro {
  descricao: string;
  dr: string;
  data: string;
  hora: string;
}

interface Props {
  storageKey: string;
  setor: string;
}

const emptyForm = (): Omit<PassagemSBAR, 'id' | 'dataRegistro'> => ({
  data: new Date().toISOString().split('T')[0],
  turno: new Date().getHours() >= 7 && new Date().getHours() < 19 ? 'diurno' : 'noturno',
  pacienteNome: '', nascimento: '', hd: '', dataInternacao: '', horaInternacao: '',
  origem: '', medicoResponsavel: '', leito: '', tipoAtendimento: 'clinico',
  antecedentes: '', isolamentoPrecaucao: '',
  medicacoesEmUso: '', examRealizados: '', examRealizadosDr: '', examRealizadosHora: '',
  neuroGlasgow: '', mucosas: '',
  respFAA: false, respCN: false, respNB: false, respIOT: false, o2LMin: '',
  nutricaoOral: false, nutricaoSNE: false, nutricaoNPP: false,
  dieta: '', vazao: '', jejum: '',
  peleIntegra: true, peleLPP: false, peleGrau: '', peleLocal: '',
  curativo: '', dreno: '',
  dispositivoDesc: '', dispositivoDt: '', dispositivoLocal: '', dispositivoHora: '',
  riscoTEV: false, riscoLPP: false, riscoQueda: false, riscoBroncoasp: false,
  riscoFlebite: false, riscoHipoglicemia: false, riscoAlergia: false,
  protTEV: false, protSepse: false, protDorToracica: false, protCVC: false, protCVD: false,
  escalaMorse: '', escalaBraden: '', escalasOutros: '',
  elimDiurese: '', elimEvacuacao: '', elimCVD: false,
  pendenciasAdmissao: '',
  passagens: [{ descricao: '', dr: '', data: '', hora: '' }],
  enfermeiroResponsavel: '', coren: '',
});

export function PassagemPlantaoSBAR({ storageKey, setor }: Props) {
  const [registros, setRegistros] = useLocalStorage<PassagemSBAR[]>(storageKey, []);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detalhe, setDetalhe] = useState<PassagemSBAR | null>(null);
  const [busca, setBusca] = useState('');
  const [form, setForm] = useState(emptyForm());

  const f = (field: string, value: any) => setForm(p => ({ ...p, [field]: value }));
  const toggle = (field: string) => setForm(p => ({ ...p, [field]: !(p as any)[field] }));

  const addPassagem = () => {
    setForm(p => ({ ...p, passagens: [...p.passagens, { descricao: '', dr: '', data: '', hora: '' }] }));
  };

  const updatePassagem = (idx: number, field: string, value: string) => {
    setForm(p => ({
      ...p,
      passagens: p.passagens.map((ps, i) => i === idx ? { ...ps, [field]: value } : ps)
    }));
  };

  const handleSalvar = () => {
    if (!form.pacienteNome || !form.enfermeiroResponsavel) {
      toast.error('Paciente e enfermeiro responsável são obrigatórios');
      return;
    }
    const novo: PassagemSBAR = {
      ...form,
      id: crypto.randomUUID(),
      dataRegistro: new Date().toLocaleString('pt-BR'),
    };
    setRegistros([novo, ...registros]);
    setForm(emptyForm());
    setDialogOpen(false);
    toast.success('Passagem de plantão SBAR registrada');
  };

  const filtrados = registros.filter(r =>
    r.pacienteNome.toLowerCase().includes(busca.toLowerCase()) ||
    r.leito.includes(busca) ||
    r.data.includes(busca)
  );

  const CheckboxField = ({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: () => void }) => (
    <div className="flex items-center gap-2">
      <Checkbox id={id} checked={checked} onCheckedChange={onChange} />
      <Label htmlFor={id} className="text-sm cursor-pointer">{label}</Label>
    </div>
  );

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <ClipboardPen className="h-5 w-5 text-primary" />
          Passagem de Plantão Enfermeiros — Método SBAR
        </h3>
        <p className="text-sm text-muted-foreground">{setor}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <ClipboardPen className="h-8 w-8 text-primary opacity-70" />
          <div><p className="text-sm text-muted-foreground">Total</p><p className="text-2xl font-bold">{registros.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Clock className="h-8 w-8 text-primary opacity-70" />
          <div><p className="text-sm text-muted-foreground">Diurno</p><p className="text-2xl font-bold">{registros.filter(r => r.turno === 'diurno').length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Users className="h-8 w-8 text-primary opacity-70" />
          <div><p className="text-sm text-muted-foreground">Noturno</p><p className="text-2xl font-bold">{registros.filter(r => r.turno === 'noturno').length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <CheckCircle2 className="h-8 w-8 text-primary opacity-70" />
          <div><p className="text-sm text-muted-foreground">Última</p><p className="text-sm font-medium">{registros[0]?.dataRegistro || '—'}</p></div>
        </CardContent></Card>
      </div>

      {/* Toolbar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar paciente, leito ou data..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9" />
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" />Nova Passagem SBAR</Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ClipboardPen className="h-5 w-5 text-primary" />
                Passagem de Plantão Enfermeiros (SBAR) — {setor}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Turno */}
              <div className="flex gap-4 items-center">
                <div className="flex-1"><Label>Data</Label><Input type="date" value={form.data} onChange={e => f('data', e.target.value)} /></div>
                <div className="flex-1">
                  <Label>Turno</Label>
                  <Select value={form.turno} onValueChange={v => f('turno', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="diurno">Diurno (07:00–18:59)</SelectItem>
                      <SelectItem value="noturno">Noturno (19:00–06:59)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* S — SITUAÇÃO */}
              <Card className="border-primary/30">
                <CardContent className="p-4 space-y-3">
                  <Badge className="bg-primary">S — Situação</Badge>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div><Label>Nome do Paciente</Label><Input value={form.pacienteNome} onChange={e => f('pacienteNome', e.target.value)} placeholder="Nome completo" /></div>
                    <div><Label>Nascimento</Label><Input type="date" value={form.nascimento} onChange={e => f('nascimento', e.target.value)} /></div>
                    <div><Label>Leito</Label><Input value={form.leito} onChange={e => f('leito', e.target.value)} /></div>
                    <div><Label>HD</Label><Input value={form.hd} onChange={e => f('hd', e.target.value)} placeholder="Hipótese diagnóstica" /></div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div><Label>Data Internação</Label><Input type="date" value={form.dataInternacao} onChange={e => f('dataInternacao', e.target.value)} /></div>
                    <div><Label>Hora</Label><Input type="time" value={form.horaInternacao} onChange={e => f('horaInternacao', e.target.value)} /></div>
                    <div><Label>Origem</Label><Input value={form.origem} onChange={e => f('origem', e.target.value)} /></div>
                    <div><Label>Médico</Label><Input value={form.medicoResponsavel} onChange={e => f('medicoResponsavel', e.target.value)} /></div>
                  </div>
                  <div>
                    <Label>Tipo de Atendimento</Label>
                    <RadioGroup value={form.tipoAtendimento} onValueChange={v => f('tipoAtendimento', v)} className="flex gap-4 mt-1">
                      <div className="flex items-center gap-1"><RadioGroupItem value="clinico" id="tipo-c" /><Label htmlFor="tipo-c" className="cursor-pointer">Clínico</Label></div>
                      <div className="flex items-center gap-1"><RadioGroupItem value="cirurgico" id="tipo-ci" /><Label htmlFor="tipo-ci" className="cursor-pointer">Cirúrgico</Label></div>
                    </RadioGroup>
                  </div>
                </CardContent>
              </Card>

              {/* B — BREVE HISTÓRIA */}
              <Card className="border-yellow-500/30">
                <CardContent className="p-4 space-y-3">
                  <Badge className="bg-yellow-600">B — Breve História</Badge>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div><Label>Antecedentes</Label><Textarea value={form.antecedentes} onChange={e => f('antecedentes', e.target.value)} rows={2} /></div>
                    <div><Label>Isolamento / Precaução</Label><Input value={form.isolamentoPrecaucao} onChange={e => f('isolamentoPrecaucao', e.target.value)} /></div>
                  </div>
                  <div><Label>Medicações em uso</Label><Textarea value={form.medicacoesEmUso} onChange={e => f('medicacoesEmUso', e.target.value)} rows={2} /></div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div><Label>Exames realizados</Label><Input value={form.examRealizados} onChange={e => f('examRealizados', e.target.value)} /></div>
                    <div><Label>Dr.</Label><Input value={form.examRealizadosDr} onChange={e => f('examRealizadosDr', e.target.value)} /></div>
                    <div><Label>Hora</Label><Input type="time" value={form.examRealizadosHora} onChange={e => f('examRealizadosHora', e.target.value)} /></div>
                  </div>
                </CardContent>
              </Card>

              {/* A — AVALIAÇÃO */}
              <Card className="border-green-500/30">
                <CardContent className="p-4 space-y-3">
                  <Badge className="bg-green-600">A — Avaliação</Badge>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div><Label>Neuro — Glasgow</Label><Input value={form.neuroGlasgow} onChange={e => f('neuroGlasgow', e.target.value)} placeholder="Ex: 15" /></div>
                    <div><Label>Mucosas</Label><Input value={form.mucosas} onChange={e => f('mucosas', e.target.value)} /></div>
                  </div>
                  {/* Respiração */}
                  <div>
                    <Label className="font-semibold">Respiração</Label>
                    <div className="flex flex-wrap gap-4 mt-1">
                      <CheckboxField id="respFAA" label="FAA" checked={form.respFAA} onChange={() => toggle('respFAA')} />
                      <CheckboxField id="respCN" label="CN" checked={form.respCN} onChange={() => toggle('respCN')} />
                      <CheckboxField id="respNB" label="NB" checked={form.respNB} onChange={() => toggle('respNB')} />
                      <CheckboxField id="respIOT" label="IOT" checked={form.respIOT} onChange={() => toggle('respIOT')} />
                      <div className="flex items-center gap-1"><Label className="text-sm whitespace-nowrap">O2 L/MIN:</Label><Input value={form.o2LMin} onChange={e => f('o2LMin', e.target.value)} className="w-20" /></div>
                    </div>
                  </div>
                  {/* Nutrição */}
                  <div>
                    <Label className="font-semibold">Nutrição</Label>
                    <div className="flex flex-wrap gap-4 mt-1">
                      <CheckboxField id="nutOral" label="Oral" checked={form.nutricaoOral} onChange={() => toggle('nutricaoOral')} />
                      <CheckboxField id="nutSNE" label="SNE" checked={form.nutricaoSNE} onChange={() => toggle('nutricaoSNE')} />
                      <CheckboxField id="nutNPP" label="NPP" checked={form.nutricaoNPP} onChange={() => toggle('nutricaoNPP')} />
                    </div>
                    <div className="grid grid-cols-3 gap-3 mt-2">
                      <div><Label>Dieta</Label><Input value={form.dieta} onChange={e => f('dieta', e.target.value)} /></div>
                      <div><Label>Vazão</Label><Input value={form.vazao} onChange={e => f('vazao', e.target.value)} /></div>
                      <div><Label>Jejum</Label><Input value={form.jejum} onChange={e => f('jejum', e.target.value)} /></div>
                    </div>
                  </div>
                  {/* Pele */}
                  <div>
                    <Label className="font-semibold">Pele</Label>
                    <div className="flex flex-wrap gap-4 mt-1">
                      <CheckboxField id="pIntegra" label="Íntegra" checked={form.peleIntegra} onChange={() => toggle('peleIntegra')} />
                      <CheckboxField id="pLPP" label="LPP" checked={form.peleLPP} onChange={() => toggle('peleLPP')} />
                      <div className="flex items-center gap-1"><Label className="text-sm">Grau:</Label><Input value={form.peleGrau} onChange={e => f('peleGrau', e.target.value)} className="w-16" /></div>
                      <div className="flex items-center gap-1"><Label className="text-sm">Local:</Label><Input value={form.peleLocal} onChange={e => f('peleLocal', e.target.value)} className="w-32" /></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Curativo</Label><Input value={form.curativo} onChange={e => f('curativo', e.target.value)} /></div>
                    <div><Label>Dreno</Label><Input value={form.dreno} onChange={e => f('dreno', e.target.value)} /></div>
                  </div>
                  {/* Dispositivos */}
                  <div>
                    <Label className="font-semibold">Dispositivo</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-1">
                      <div><Label>Descrição</Label><Input value={form.dispositivoDesc} onChange={e => f('dispositivoDesc', e.target.value)} /></div>
                      <div><Label>Data</Label><Input type="date" value={form.dispositivoDt} onChange={e => f('dispositivoDt', e.target.value)} /></div>
                      <div><Label>Local</Label><Input value={form.dispositivoLocal} onChange={e => f('dispositivoLocal', e.target.value)} /></div>
                      <div><Label>Hora</Label><Input type="time" value={form.dispositivoHora} onChange={e => f('dispositivoHora', e.target.value)} /></div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* RISCOS e PROTOCOLOS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-orange-500/30">
                  <CardContent className="p-4 space-y-2">
                    <Badge className="bg-orange-600">Riscos</Badge>
                    <div className="grid grid-cols-2 gap-2">
                      <CheckboxField id="rTEV" label="TEV" checked={form.riscoTEV} onChange={() => toggle('riscoTEV')} />
                      <CheckboxField id="rLPP" label="LPP" checked={form.riscoLPP} onChange={() => toggle('riscoLPP')} />
                      <CheckboxField id="rQueda" label="Queda" checked={form.riscoQueda} onChange={() => toggle('riscoQueda')} />
                      <CheckboxField id="rBronco" label="Broncoaspiração" checked={form.riscoBroncoasp} onChange={() => toggle('riscoBroncoasp')} />
                      <CheckboxField id="rFlebite" label="Flebite" checked={form.riscoFlebite} onChange={() => toggle('riscoFlebite')} />
                      <CheckboxField id="rHipo" label="Hipoglicemia" checked={form.riscoHipoglicemia} onChange={() => toggle('riscoHipoglicemia')} />
                      <CheckboxField id="rAlergia" label="Alergia" checked={form.riscoAlergia} onChange={() => toggle('riscoAlergia')} />
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-red-500/30">
                  <CardContent className="p-4 space-y-2">
                    <Badge className="bg-destructive">Protocolos Inseridos</Badge>
                    <div className="grid grid-cols-2 gap-2">
                      <CheckboxField id="pTEV" label="TEV" checked={form.protTEV} onChange={() => toggle('protTEV')} />
                      <CheckboxField id="pSepse" label="Sepse" checked={form.protSepse} onChange={() => toggle('protSepse')} />
                      <CheckboxField id="pDT" label="Dor Torácica" checked={form.protDorToracica} onChange={() => toggle('protDorToracica')} />
                      <CheckboxField id="pCVC" label="CVC" checked={form.protCVC} onChange={() => toggle('protCVC')} />
                      <CheckboxField id="pCVD" label="CVD" checked={form.protCVD} onChange={() => toggle('protCVD')} />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* ESCALAS */}
              <Card>
                <CardContent className="p-4 space-y-2">
                  <Badge variant="outline">Escalas</Badge>
                  <div className="grid grid-cols-3 gap-3">
                    <div><Label>Morse</Label><Input value={form.escalaMorse} onChange={e => f('escalaMorse', e.target.value)} /></div>
                    <div><Label>Braden</Label><Input value={form.escalaBraden} onChange={e => f('escalaBraden', e.target.value)} /></div>
                    <div><Label>Outros</Label><Input value={form.escalasOutros} onChange={e => f('escalasOutros', e.target.value)} /></div>
                  </div>
                </CardContent>
              </Card>

              {/* ELIMINAÇÕES */}
              <Card>
                <CardContent className="p-4 space-y-2">
                  <Badge variant="outline">Eliminações</Badge>
                  <div className="grid grid-cols-3 gap-3">
                    <div><Label>Diurese</Label><Input value={form.elimDiurese} onChange={e => f('elimDiurese', e.target.value)} /></div>
                    <div><Label>Evacuação</Label><Input value={form.elimEvacuacao} onChange={e => f('elimEvacuacao', e.target.value)} /></div>
                    <CheckboxField id="elimCVD" label="CVD" checked={form.elimCVD} onChange={() => toggle('elimCVD')} />
                  </div>
                </CardContent>
              </Card>

              {/* R — RECOMENDAÇÃO */}
              <Card className="border-blue-500/30">
                <CardContent className="p-4 space-y-3">
                  <Badge className="bg-blue-600">R — Recomendação</Badge>
                  <div><Label>Pendências Pós Admissão</Label><Textarea value={form.pendenciasAdmissao} onChange={e => f('pendenciasAdmissao', e.target.value)} rows={2} /></div>
                </CardContent>
              </Card>

              {/* Passagens de Plantão Intercorrências */}
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">Passagem de Plantão / Intercorrências / Observações</Badge>
                    <Button variant="outline" size="sm" onClick={addPassagem}><Plus className="h-3 w-3 mr-1" />Adicionar</Button>
                  </div>
                  {form.passagens.map((ps, i) => (
                    <div key={i} className="grid grid-cols-1 md:grid-cols-4 gap-2 border rounded-md p-2">
                      <div className="md:col-span-2"><Label>Descrição</Label><Textarea value={ps.descricao} onChange={e => updatePassagem(i, 'descricao', e.target.value)} rows={2} /></div>
                      <div><Label>Dr.</Label><Input value={ps.dr} onChange={e => updatePassagem(i, 'dr', e.target.value)} /></div>
                      <div className="grid grid-cols-2 gap-2">
                        <div><Label>Data</Label><Input type="date" value={ps.data} onChange={e => updatePassagem(i, 'data', e.target.value)} /></div>
                        <div><Label>Hora</Label><Input type="time" value={ps.hora} onChange={e => updatePassagem(i, 'hora', e.target.value)} /></div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Enfermeiro responsável */}
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Enfermeiro(a) Responsável</Label><Input value={form.enfermeiroResponsavel} onChange={e => f('enfermeiroResponsavel', e.target.value)} /></div>
                <div><Label>COREN</Label><Input value={form.coren} onChange={e => f('coren', e.target.value)} /></div>
              </div>

              <Button onClick={handleSalvar} className="w-full" size="lg">
                <CheckCircle2 className="h-4 w-4 mr-2" />Registrar Passagem SBAR
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Detalhe */}
      <Dialog open={!!detalhe} onOpenChange={() => setDetalhe(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {detalhe && (
            <>
              <DialogHeader>
                <DialogTitle>SBAR — {detalhe.pacienteNome.toUpperCase()} — Leito {detalhe.leito}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="flex gap-2 flex-wrap">
                  <Badge>{detalhe.data}</Badge>
                  <Badge variant="outline">{detalhe.turno === 'diurno' ? 'Diurno' : 'Noturno'}</Badge>
                  <Badge variant="outline">{detalhe.tipoAtendimento === 'clinico' ? 'Clínico' : 'Cirúrgico'}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-muted-foreground">HD:</span> {detalhe.hd}</div>
                  <div><span className="text-muted-foreground">Médico:</span> {detalhe.medicoResponsavel}</div>
                  <div><span className="text-muted-foreground">Internação:</span> {detalhe.dataInternacao} {detalhe.horaInternacao}</div>
                  <div><span className="text-muted-foreground">Origem:</span> {detalhe.origem}</div>
                </div>
                {detalhe.antecedentes && <div className="p-2 bg-muted rounded"><span className="font-semibold">Antecedentes:</span> {detalhe.antecedentes}</div>}
                {detalhe.medicacoesEmUso && <div className="p-2 bg-muted rounded"><span className="font-semibold">Medicações:</span> {detalhe.medicacoesEmUso}</div>}
                <div><span className="text-muted-foreground">Glasgow:</span> {detalhe.neuroGlasgow} | <span className="text-muted-foreground">Morse:</span> {detalhe.escalaMorse} | <span className="text-muted-foreground">Braden:</span> {detalhe.escalaBraden}</div>
                <div className="flex gap-1 flex-wrap">
                  {detalhe.riscoTEV && <Badge variant="destructive">TEV</Badge>}
                  {detalhe.riscoLPP && <Badge variant="destructive">LPP</Badge>}
                  {detalhe.riscoQueda && <Badge variant="destructive">Queda</Badge>}
                  {detalhe.riscoBroncoasp && <Badge variant="destructive">Broncoasp.</Badge>}
                  {detalhe.riscoFlebite && <Badge variant="destructive">Flebite</Badge>}
                  {detalhe.riscoHipoglicemia && <Badge variant="destructive">Hipoglicemia</Badge>}
                  {detalhe.riscoAlergia && <Badge variant="destructive">Alergia</Badge>}
                </div>
                {detalhe.pendenciasAdmissao && <div className="p-2 bg-muted rounded"><span className="font-semibold">Recomendação:</span> {detalhe.pendenciasAdmissao}</div>}
                <div><span className="text-muted-foreground">Enfermeiro(a):</span> {detalhe.enfermeiroResponsavel} — COREN: {detalhe.coren}</div>
                <p className="text-xs text-muted-foreground">Registrado em: {detalhe.dataRegistro}</p>
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
              <TableHead>Turno</TableHead>
              <TableHead>Paciente</TableHead>
              <TableHead>Leito</TableHead>
              <TableHead>HD</TableHead>
              <TableHead>Enfermeiro(a)</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtrados.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhuma passagem registrada</TableCell></TableRow>
            ) : filtrados.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-mono">{r.data}</TableCell>
                <TableCell><Badge variant="outline">{r.turno === 'diurno' ? 'D' : 'N'}</Badge></TableCell>
                <TableCell className="font-medium uppercase">{r.pacienteNome}</TableCell>
                <TableCell>{r.leito || '—'}</TableCell>
                <TableCell className="max-w-[150px] truncate">{r.hd || '—'}</TableCell>
                <TableCell>{r.enfermeiroResponsavel}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => setDetalhe(r)}><Eye className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
