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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Baby, Plus, Search, Eye, Clock, CheckCircle2, Users
} from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { toast } from 'sonner';
import { ExportDropdown } from '@/components/ui/export-dropdown';
import { exportToPDF, exportToExcel } from '@/lib/export-utils';

interface SinaisVitaisPed {
  fc: string; fr: string; pa: string; temperatura: string; spo2: string; glicemiaCapilar: string; peso: string; altura: string; perimetroCefalico: string;
}

interface CondicoesGeraisPed {
  nivelConsciencia: string;
  fontanela: string;
  choro: string;
  estadoEmocional: string;
  pupilas: string;
  pele: string;
  mucosas: string;
  turgorCutaneo: string;
  edema: string;
  edemaLocal: string;
  aceitacaoDieta: string;
  tipoDieta: string;
  amamentacao: string;
  abdome: string;
  eliminacoesVesicais: string;
  eliminacoesIntestinais: string;
  aspectoFezes: string;
  dispositivosInvasivos: string[];
  acessoVenoso: string;
  localAcesso: string;
  oxigenoterapia: string;
  tipoO2: string;
  fluxoO2: string;
  mobilidade: string;
  higieneCorporal: string;
  coroParidade: string;
  dorEscala: string;
}

interface RegistroSAEPed {
  id: string;
  data: string;
  hora: string;
  turno: 'diurno' | 'noturno';
  pacienteNome: string;
  dataNascimento: string;
  idadeMeses: string;
  faixaEtaria: string;
  leito: string;
  dataAdmissao: string;
  queixaPrincipal: string;
  acompanhante: string;
  parentesco: string;
  alergia: string;
  alergiaDesc: string;
  medicacaoEmUso: string;
  medicacaoDesc: string;
  vacinacaoEmDia: string;
  doencasPrevias: string;
  prematuridade: string;
  idadeGestacional: string;
  sinaisVitais: SinaisVitaisPed;
  condicoesGerais: CondicoesGeraisPed;
  enfermeiroResponsavel: string;
  coren: string;
  observacoes: string;
  dataRegistro: string;
}

interface Props {
  storageKey: string;
  setor: string;
}

const DISPOSITIVOS_INVASIVOS_PED = ['AVP', 'CVC', 'PICC', 'SVD', 'SNG', 'SNE', 'Dreno', 'IOT', 'Traqueostomia', 'Gastrostomia', 'Cistostomia'];

const FAIXAS_ETARIAS = ['Neonato (0-28 dias)', 'Lactente (29d-2a)', 'Pré-escolar (2-6a)', 'Escolar (6-12a)', 'Adolescente (12-18a)'];

const emptyForm = () => ({
  data: new Date().toISOString().split('T')[0],
  hora: new Date().toTimeString().slice(0, 5),
  turno: (new Date().getHours() >= 7 && new Date().getHours() < 19 ? 'diurno' : 'noturno') as 'diurno' | 'noturno',
  pacienteNome: '', dataNascimento: '', idadeMeses: '', faixaEtaria: '', leito: '', dataAdmissao: '',
  queixaPrincipal: '', acompanhante: '', parentesco: '',
  alergia: 'nao', alergiaDesc: '',
  medicacaoEmUso: 'nao', medicacaoDesc: '',
  vacinacaoEmDia: 'sim', doencasPrevias: '',
  prematuridade: 'nao', idadeGestacional: '',
  sinaisVitais: { fc: '', fr: '', pa: '', temperatura: '', spo2: '', glicemiaCapilar: '', peso: '', altura: '', perimetroCefalico: '' },
  condicoesGerais: {
    nivelConsciencia: '', fontanela: '', choro: '', estadoEmocional: '', pupilas: '',
    pele: '', mucosas: '', turgorCutaneo: '', edema: 'ausente', edemaLocal: '',
    aceitacaoDieta: '', tipoDieta: '', amamentacao: '',
    abdome: '', eliminacoesVesicais: '', eliminacoesIntestinais: '', aspectoFezes: '',
    dispositivosInvasivos: [] as string[],
    acessoVenoso: '', localAcesso: '',
    oxigenoterapia: 'nao', tipoO2: '', fluxoO2: '',
    mobilidade: '', higieneCorporal: '',
    coroParidade: '', dorEscala: '',
  },
  enfermeiroResponsavel: '', coren: '', observacoes: '',
});

export function SAEPediatrico({ storageKey, setor }: Props) {
  const [registros, setRegistros] = useLocalStorage<RegistroSAEPed[]>(storageKey, []);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detalhe, setDetalhe] = useState<RegistroSAEPed | null>(null);
  const [busca, setBusca] = useState('');
  const [form, setForm] = useState(emptyForm());

  const f = (field: string, value: any) => setForm(p => ({ ...p, [field]: value }));
  const fSV = (field: string, value: string) => setForm(p => ({ ...p, sinaisVitais: { ...p.sinaisVitais, [field]: value } }));
  const fCG = (field: string, value: any) => setForm(p => ({ ...p, condicoesGerais: { ...p.condicoesGerais, [field]: value } }));

  const toggleDispositivo = (d: string) => {
    setForm(p => ({
      ...p,
      condicoesGerais: {
        ...p.condicoesGerais,
        dispositivosInvasivos: p.condicoesGerais.dispositivosInvasivos.includes(d)
          ? p.condicoesGerais.dispositivosInvasivos.filter(x => x !== d)
          : [...p.condicoesGerais.dispositivosInvasivos, d]
      }
    }));
  };

  const handleSalvar = () => {
    if (!form.pacienteNome || !form.enfermeiroResponsavel) {
      toast.error('Paciente e enfermeiro responsável são obrigatórios');
      return;
    }
    const novo: RegistroSAEPed = { ...form, id: crypto.randomUUID(), dataRegistro: new Date().toLocaleString('pt-BR') };
    setRegistros([novo, ...registros]);
    setForm(emptyForm());
    setDialogOpen(false);
    toast.success('SAE Pediátrico registrado');
  };

  const filtrados = registros.filter(r =>
    r.pacienteNome.toLowerCase().includes(busca.toLowerCase()) ||
    r.leito.includes(busca) || r.data.includes(busca)
  );

  const SimNao = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
    <div>
      <Label className="text-sm">{label}</Label>
      <RadioGroup value={value} onValueChange={onChange} className="flex gap-3 mt-1">
        <div className="flex items-center gap-1"><RadioGroupItem value="sim" id={`ped-${label}-s`} /><Label htmlFor={`ped-${label}-s`} className="text-sm cursor-pointer">Sim</Label></div>
        <div className="flex items-center gap-1"><RadioGroupItem value="nao" id={`ped-${label}-n`} /><Label htmlFor={`ped-${label}-n`} className="text-sm cursor-pointer">Não</Label></div>
      </RadioGroup>
    </div>
  );

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Baby className="h-5 w-5 text-primary" />
          SAE Pediátrico — Sistematização da Assistência de Enfermagem
        </h3>
        <p className="text-sm text-muted-foreground">{setor}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Baby className="h-8 w-8 text-primary opacity-70" />
          <div><p className="text-sm text-muted-foreground">Total SAE Ped.</p><p className="text-2xl font-bold">{registros.length}</p></div>
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
          <div><p className="text-sm text-muted-foreground">Último</p><p className="text-sm font-medium">{registros[0]?.dataRegistro || '—'}</p></div>
        </CardContent></Card>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar paciente, leito ou data..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9" />
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" />Novo SAE Pediátrico</Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Baby className="h-5 w-5 text-primary" />
                SAE Pediátrico — {setor}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-5">

              {/* Cabeçalho */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div><Label>Data</Label><Input type="date" value={form.data} onChange={e => f('data', e.target.value)} /></div>
                <div><Label>Hora</Label><Input type="time" value={form.hora} onChange={e => f('hora', e.target.value)} /></div>
                <div className="col-span-2">
                  <Label>Plantão</Label>
                  <Select value={form.turno} onValueChange={v => f('turno', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="diurno">Diurno</SelectItem>
                      <SelectItem value="noturno">Noturno</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Identificação da Criança */}
              <Card className="border-primary/30">
                <CardContent className="p-4 space-y-3">
                  <Badge className="bg-primary">Identificação da Criança</Badge>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="md:col-span-2"><Label>Nome Completo</Label><Input value={form.pacienteNome} onChange={e => f('pacienteNome', e.target.value)} /></div>
                    <div><Label>Idade (meses/anos)</Label><Input value={form.idadeMeses} onChange={e => f('idadeMeses', e.target.value)} placeholder="Ex: 3m, 2a5m" /></div>
                    <div><Label>Leito</Label><Input value={form.leito} onChange={e => f('leito', e.target.value)} /></div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div><Label>Data de Nascimento</Label><Input type="date" value={form.dataNascimento} onChange={e => f('dataNascimento', e.target.value)} /></div>
                    <div><Label>Data da Admissão</Label><Input type="date" value={form.dataAdmissao} onChange={e => f('dataAdmissao', e.target.value)} /></div>
                    <div>
                      <Label>Faixa Etária</Label>
                      <Select value={form.faixaEtaria} onValueChange={v => f('faixaEtaria', v)}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {FAIXAS_ETARIAS.map(fe => <SelectItem key={fe} value={fe}>{fe}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div><Label>Queixa Principal / Motivo da Internação</Label><Textarea value={form.queixaPrincipal} onChange={e => f('queixaPrincipal', e.target.value)} rows={2} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Acompanhante</Label><Input value={form.acompanhante} onChange={e => f('acompanhante', e.target.value)} /></div>
                    <div><Label>Parentesco</Label><Input value={form.parentesco} onChange={e => f('parentesco', e.target.value)} placeholder="Mãe, Pai, Avó..." /></div>
                  </div>
                </CardContent>
              </Card>

              {/* Histórico */}
              <Card>
                <CardContent className="p-4 space-y-3">
                  <Badge variant="outline">Histórico / Antecedentes</Badge>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <SimNao label="Alergia" value={form.alergia} onChange={v => f('alergia', v)} />
                    {form.alergia === 'sim' && <div className="col-span-2"><Label>Qual</Label><Input value={form.alergiaDesc} onChange={e => f('alergiaDesc', e.target.value)} /></div>}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <SimNao label="Medicação em Uso" value={form.medicacaoEmUso} onChange={v => f('medicacaoEmUso', v)} />
                    {form.medicacaoEmUso === 'sim' && <div className="col-span-2"><Label>Quais</Label><Input value={form.medicacaoDesc} onChange={e => f('medicacaoDesc', e.target.value)} /></div>}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <SimNao label="Vacinação em dia" value={form.vacinacaoEmDia} onChange={v => f('vacinacaoEmDia', v)} />
                    <SimNao label="Prematuridade" value={form.prematuridade} onChange={v => f('prematuridade', v)} />
                    {form.prematuridade === 'sim' && <div><Label>IG (semanas)</Label><Input value={form.idadeGestacional} onChange={e => f('idadeGestacional', e.target.value)} placeholder="Ex: 32s" /></div>}
                  </div>
                  <div><Label>Doenças Prévias / Cirurgias</Label><Input value={form.doencasPrevias} onChange={e => f('doencasPrevias', e.target.value)} /></div>
                </CardContent>
              </Card>

              {/* Sinais Vitais + Antropometria */}
              <Card>
                <CardContent className="p-4 space-y-3">
                  <Badge variant="outline">Sinais Vitais e Antropometria</Badge>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                    <div><Label>FC (bpm)</Label><Input value={form.sinaisVitais.fc} onChange={e => fSV('fc', e.target.value)} /></div>
                    <div><Label>FR (irpm)</Label><Input value={form.sinaisVitais.fr} onChange={e => fSV('fr', e.target.value)} /></div>
                    <div><Label>PA (mmHg)</Label><Input value={form.sinaisVitais.pa} onChange={e => fSV('pa', e.target.value)} placeholder="90/60" /></div>
                    <div><Label>T (°C)</Label><Input value={form.sinaisVitais.temperatura} onChange={e => fSV('temperatura', e.target.value)} /></div>
                    <div><Label>SPO2 (%)</Label><Input value={form.sinaisVitais.spo2} onChange={e => fSV('spo2', e.target.value)} /></div>
                    <div><Label>Glicemia</Label><Input value={form.sinaisVitais.glicemiaCapilar} onChange={e => fSV('glicemiaCapilar', e.target.value)} /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div><Label>Peso (kg)</Label><Input value={form.sinaisVitais.peso} onChange={e => fSV('peso', e.target.value)} /></div>
                    <div><Label>Altura/Comp. (cm)</Label><Input value={form.sinaisVitais.altura} onChange={e => fSV('altura', e.target.value)} /></div>
                    <div><Label>PC (cm)</Label><Input value={form.sinaisVitais.perimetroCefalico} onChange={e => fSV('perimetroCefalico', e.target.value)} placeholder="Perímetro cefálico" /></div>
                  </div>
                </CardContent>
              </Card>

              {/* Condições Gerais */}
              <Card>
                <CardContent className="p-4 space-y-3">
                  <Badge variant="outline">Avaliação da Criança</Badge>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <Label>Nível de Consciência</Label>
                      <Select value={form.condicoesGerais.nivelConsciencia} onValueChange={v => fCG('nivelConsciencia', v)}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {['Alerta/Ativo', 'Sonolento', 'Hipoativo', 'Letárgico', 'Irritável', 'Torporoso', 'Sedado', 'Comatoso'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Fontanela (lactentes)</Label>
                      <Select value={form.condicoesGerais.fontanela} onValueChange={v => fCG('fontanela', v)}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {['Normotensa', 'Abaulada', 'Deprimida', 'Fechada', 'N/A'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Choro</Label>
                      <Select value={form.condicoesGerais.choro} onValueChange={v => fCG('choro', v)}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {['Forte', 'Fraco', 'Gemência', 'Ausente', 'Choro inconsolável'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Estado Emocional</Label>
                      <Select value={form.condicoesGerais.estadoEmocional} onValueChange={v => fCG('estadoEmocional', v)}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {['Calmo', 'Ansioso', 'Agitado', 'Choroso', 'Apático', 'Irritado', 'Cooperativo'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Pupilas</Label>
                      <Select value={form.condicoesGerais.pupilas} onValueChange={v => fCG('pupilas', v)}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {['Isocóricas', 'Anisocóricas', 'Midríase', 'Miose', 'Fotorreagentes', 'Não fotorreagentes'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Escala de Dor</Label>
                      <Select value={form.condicoesGerais.dorEscala} onValueChange={v => fCG('dorEscala', v)}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {['0 - Sem dor', '1-3 Leve', '4-6 Moderada', '7-10 Intensa', 'NIPS/FLACC aplicada'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <Label>Pele</Label>
                      <Select value={form.condicoesGerais.pele} onValueChange={v => fCG('pele', v)}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {['Íntegra', 'Lesão', 'Ressecada', 'Úmida', 'Cianótica', 'Ictérica', 'Hiperemiada', 'Descamativa', 'Marmórea'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Mucosas</Label>
                      <Select value={form.condicoesGerais.mucosas} onValueChange={v => fCG('mucosas', v)}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {['Coradas', 'Hipocoradas', 'Descoradas', 'Hidratadas', 'Desidratadas'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Turgor Cutâneo</Label>
                      <Select value={form.condicoesGerais.turgorCutaneo} onValueChange={v => fCG('turgorCutaneo', v)}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {['Normal', 'Diminuído', 'Pastoso'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <Label>Edema</Label>
                      <Select value={form.condicoesGerais.edema} onValueChange={v => fCG('edema', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {['Ausente', '+/4+', '++/4+', '+++/4+', '++++/4+'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    {form.condicoesGerais.edema !== 'ausente' && form.condicoesGerais.edema !== 'Ausente' && <div><Label>Local</Label><Input value={form.condicoesGerais.edemaLocal} onChange={e => fCG('edemaLocal', e.target.value)} /></div>}
                    <div>
                      <Label>Aceitação da Dieta</Label>
                      <Select value={form.condicoesGerais.aceitacaoDieta} onValueChange={v => fCG('aceitacaoDieta', v)}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {['Boa', 'Regular', 'Recusa', 'Jejum', 'NPO'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div><Label>Tipo de Dieta</Label><Input value={form.condicoesGerais.tipoDieta} onChange={e => fCG('tipoDieta', e.target.value)} placeholder="Leite materno, fórmula, pastosa..." /></div>
                    <div>
                      <Label>Amamentação</Label>
                      <Select value={form.condicoesGerais.amamentacao} onValueChange={v => fCG('amamentacao', v)}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {['Exclusiva', 'Complementar', 'Não amamenta', 'N/A'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Abdome</Label>
                      <Select value={form.condicoesGerais.abdome} onValueChange={v => fCG('abdome', v)}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {['Plano', 'Globoso', 'Distendido', 'Flácido', 'Doloroso à palpação', 'RHA presentes', 'RHA ausentes'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <Label>Eliminações Vesicais</Label>
                      <Select value={form.condicoesGerais.eliminacoesVesicais} onValueChange={v => fCG('eliminacoesVesicais', v)}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {['Espontânea', 'Fralda', 'SVD', 'Oligúria', 'Anúria', 'Poliúria'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Eliminações Intestinais</Label>
                      <Select value={form.condicoesGerais.eliminacoesIntestinais} onValueChange={v => fCG('eliminacoesIntestinais', v)}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {['Presente', 'Ausente', 'Diarréia', 'Constipação', 'Melena'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Aspecto das Fezes</Label>
                      <Select value={form.condicoesGerais.aspectoFezes} onValueChange={v => fCG('aspectoFezes', v)}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {['Normal', 'Líquida', 'Pastosa', 'Aquosa', 'Com muco', 'Com sangue', 'Mecônio'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Dispositivos Invasivos */}
                  <div>
                    <Label className="font-semibold">Dispositivos Invasivos</Label>
                    <div className="flex flex-wrap gap-3 mt-1">
                      {DISPOSITIVOS_INVASIVOS_PED.map(d => (
                        <div key={d} className="flex items-center gap-1">
                          <Checkbox id={`ped-disp-${d}`} checked={form.condicoesGerais.dispositivosInvasivos.includes(d)} onCheckedChange={() => toggleDispositivo(d)} />
                          <Label htmlFor={`ped-disp-${d}`} className="text-sm cursor-pointer">{d}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Acesso Venoso</Label>
                      <Select value={form.condicoesGerais.acessoVenoso} onValueChange={v => fCG('acessoVenoso', v)}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {['Periférico', 'Central', 'PICC', 'Scalp', 'Não possui'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Local do Acesso</Label><Input value={form.condicoesGerais.localAcesso} onChange={e => fCG('localAcesso', e.target.value)} /></div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <SimNao label="Oxigenoterapia" value={form.condicoesGerais.oxigenoterapia} onChange={v => fCG('oxigenoterapia', v)} />
                    {form.condicoesGerais.oxigenoterapia === 'sim' && (
                      <>
                        <div><Label>Tipo</Label><Input value={form.condicoesGerais.tipoO2} onChange={e => fCG('tipoO2', e.target.value)} placeholder="CN, Máscara, Hood, CPAP" /></div>
                        <div><Label>Fluxo (L/min)</Label><Input value={form.condicoesGerais.fluxoO2} onChange={e => fCG('fluxoO2', e.target.value)} /></div>
                      </>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Mobilidade / Desenvolvimento</Label>
                      <Select value={form.condicoesGerais.mobilidade} onValueChange={v => fCG('mobilidade', v)}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {['Ativo/Reativo', 'Hipoativo', 'Deambula', 'Engatinha', 'Acamado', 'Restrito ao berço/leito', 'Adequado para idade', 'Atraso no desenvolvimento'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Higiene Corporal</Label>
                      <Select value={form.condicoesGerais.higieneCorporal} onValueChange={v => fCG('higieneCorporal', v)}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {['Satisfatória', 'Insatisfatória', 'Banho no leito', 'Banho de aspersão', 'Banho de imersão'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div><Label>Coto Umbilical / Paridade (se aplicável)</Label><Input value={form.condicoesGerais.coroParidade} onChange={e => fCG('coroParidade', e.target.value)} placeholder="Coto mumificado, sem sinais de infecção..." /></div>
                </CardContent>
              </Card>

              {/* Observações e Enfermeiro */}
              <div><Label>Observações</Label><Textarea value={form.observacoes} onChange={e => f('observacoes', e.target.value)} rows={2} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Enfermeiro(a) Responsável</Label><Input value={form.enfermeiroResponsavel} onChange={e => f('enfermeiroResponsavel', e.target.value)} /></div>
                <div><Label>COREN</Label><Input value={form.coren} onChange={e => f('coren', e.target.value)} /></div>
              </div>

              <Button onClick={handleSalvar} className="w-full" size="lg">
                <CheckCircle2 className="h-4 w-4 mr-2" />Registrar SAE Pediátrico
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
                <DialogTitle>SAE Pediátrico — {detalhe.pacienteNome.toUpperCase()} — Leito {detalhe.leito}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="flex gap-2 flex-wrap">
                  <Badge>{detalhe.data} {detalhe.hora}</Badge>
                  <Badge variant="outline">{detalhe.turno === 'diurno' ? 'Diurno' : 'Noturno'}</Badge>
                  <Badge variant="outline">Idade: {detalhe.idadeMeses}</Badge>
                  <Badge variant="outline">{detalhe.faixaEtaria}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-muted-foreground">Acompanhante:</span> {detalhe.acompanhante} ({detalhe.parentesco})</div>
                  <div><span className="text-muted-foreground">Prematuridade:</span> {detalhe.prematuridade === 'sim' ? `Sim — IG: ${detalhe.idadeGestacional}` : 'Não'}</div>
                </div>
                <div><span className="text-muted-foreground">Queixa:</span> {detalhe.queixaPrincipal}</div>
                <div className="grid grid-cols-3 gap-2">
                  <div><span className="text-muted-foreground">Alergia:</span> {detalhe.alergia === 'sim' ? detalhe.alergiaDesc : 'Não'}</div>
                  <div><span className="text-muted-foreground">Vacinação:</span> {detalhe.vacinacaoEmDia === 'sim' ? 'Em dia' : 'Atrasada'}</div>
                  <div><span className="text-muted-foreground">Doenças:</span> {detalhe.doencasPrevias || 'Nenhuma'}</div>
                </div>
                <div className="border rounded p-2">
                  <p className="font-semibold mb-1">Sinais Vitais e Antropometria</p>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-center">
                    <div><p className="text-xs text-muted-foreground">FC</p><p className="font-mono font-bold">{detalhe.sinaisVitais.fc}</p></div>
                    <div><p className="text-xs text-muted-foreground">FR</p><p className="font-mono font-bold">{detalhe.sinaisVitais.fr}</p></div>
                    <div><p className="text-xs text-muted-foreground">PA</p><p className="font-mono font-bold">{detalhe.sinaisVitais.pa}</p></div>
                    <div><p className="text-xs text-muted-foreground">T</p><p className="font-mono font-bold">{detalhe.sinaisVitais.temperatura}</p></div>
                    <div><p className="text-xs text-muted-foreground">SPO2</p><p className="font-mono font-bold">{detalhe.sinaisVitais.spo2}</p></div>
                    <div><p className="text-xs text-muted-foreground">Glic.</p><p className="font-mono font-bold">{detalhe.sinaisVitais.glicemiaCapilar}</p></div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center mt-2">
                    <div><p className="text-xs text-muted-foreground">Peso</p><p className="font-mono font-bold">{detalhe.sinaisVitais.peso} kg</p></div>
                    <div><p className="text-xs text-muted-foreground">Altura</p><p className="font-mono font-bold">{detalhe.sinaisVitais.altura} cm</p></div>
                    <div><p className="text-xs text-muted-foreground">PC</p><p className="font-mono font-bold">{detalhe.sinaisVitais.perimetroCefalico} cm</p></div>
                  </div>
                </div>
                <div className="border rounded p-2 space-y-1">
                  <p className="font-semibold">Avaliação da Criança</p>
                  <div className="grid grid-cols-2 gap-1">
                    {detalhe.condicoesGerais.nivelConsciencia && <div><span className="text-muted-foreground">Consciência:</span> {detalhe.condicoesGerais.nivelConsciencia}</div>}
                    {detalhe.condicoesGerais.fontanela && <div><span className="text-muted-foreground">Fontanela:</span> {detalhe.condicoesGerais.fontanela}</div>}
                    {detalhe.condicoesGerais.choro && <div><span className="text-muted-foreground">Choro:</span> {detalhe.condicoesGerais.choro}</div>}
                    {detalhe.condicoesGerais.dorEscala && <div><span className="text-muted-foreground">Dor:</span> {detalhe.condicoesGerais.dorEscala}</div>}
                    {detalhe.condicoesGerais.pele && <div><span className="text-muted-foreground">Pele:</span> {detalhe.condicoesGerais.pele}</div>}
                    {detalhe.condicoesGerais.turgorCutaneo && <div><span className="text-muted-foreground">Turgor:</span> {detalhe.condicoesGerais.turgorCutaneo}</div>}
                    {detalhe.condicoesGerais.mobilidade && <div><span className="text-muted-foreground">Mobilidade:</span> {detalhe.condicoesGerais.mobilidade}</div>}
                    {detalhe.condicoesGerais.amamentacao && <div><span className="text-muted-foreground">Amamentação:</span> {detalhe.condicoesGerais.amamentacao}</div>}
                  </div>
                  {detalhe.condicoesGerais.dispositivosInvasivos.length > 0 && (
                    <div className="flex gap-1 flex-wrap"><span className="text-muted-foreground">Dispositivos:</span> {detalhe.condicoesGerais.dispositivosInvasivos.map(d => <Badge key={d} variant="outline" className="text-xs">{d}</Badge>)}</div>
                  )}
                  {detalhe.condicoesGerais.coroParidade && <div><span className="text-muted-foreground">Coto/Paridade:</span> {detalhe.condicoesGerais.coroParidade}</div>}
                </div>
                {detalhe.observacoes && <div className="p-2 bg-muted rounded">{detalhe.observacoes}</div>}
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
              <TableHead>Idade</TableHead>
              <TableHead>Leito</TableHead>
              <TableHead>Faixa Etária</TableHead>
              <TableHead>Enfermeiro(a)</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtrados.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhum SAE Pediátrico registrado</TableCell></TableRow>
            ) : filtrados.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-mono">{r.data}</TableCell>
                <TableCell><Badge variant="outline">{r.turno === 'diurno' ? 'D' : 'N'}</Badge></TableCell>
                <TableCell className="font-medium uppercase">{r.pacienteNome}</TableCell>
                <TableCell>{r.idadeMeses}</TableCell>
                <TableCell>{r.leito || '—'}</TableCell>
                <TableCell className="text-xs">{r.faixaEtaria}</TableCell>
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
