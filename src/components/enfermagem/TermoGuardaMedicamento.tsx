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
  Pill, Plus, Search, Eye, Clock, CheckCircle2, Trash2
} from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { toast } from 'sonner';

interface MedicamentoItem {
  medicamento: string;
  dose: string;
  posologia: string;
  naoPadrao: 'sim' | 'nao';
  recolhido: 'sim' | 'nao';
  prescrito: 'sim' | 'nao';
  prescritoComAlteracao: 'sim' | 'nao';
  suspenso: 'sim' | 'nao';
}

interface RegistroTermo {
  id: string;
  data: string;
  hora: string;
  pacienteNome: string;
  prontuario: string;
  leito: string;
  dataNascimento: string;
  unidade: string;
  medicamentos: MedicamentoItem[];
  condicoes: {
    lacreInviolado: boolean;
    dentroValidade: boolean;
    identificacaoClara: boolean;
    semLacre: boolean;
  };
  aceitaRecolhimento: 'aceita' | 'recusa';
  acompanhanteNome: string;
  acompanhanteParentesco: string;
  enfermeiroResponsavel: string;
  coren: string;
  farmaceuticoResponsavel: string;
  observacoes: string;
  // Devolução — Alta Médica
  devolucao: {
    realizada: boolean;
    dataAlta: string;
    medicamentoQuantidadeDevolvida: string;
    farmaceuticoClinicoDevolucao: string;
    enfermeiroDevolucao: string;
  };
  dataRegistro: string;
}

interface Props {
  storageKey: string;
  setor: string;
}

const emptyMedicamento = (): MedicamentoItem => ({
  medicamento: '', dose: '', posologia: '',
  naoPadrao: 'nao', recolhido: 'nao', prescrito: 'nao',
  prescritoComAlteracao: 'nao', suspenso: 'nao',
});

const emptyForm = (): Omit<RegistroTermo, 'id' | 'dataRegistro'> => ({
  data: new Date().toISOString().split('T')[0],
  hora: new Date().toTimeString().slice(0, 5),
  pacienteNome: '', prontuario: '', leito: '', dataNascimento: '', unidade: '',
  medicamentos: [emptyMedicamento()],
  condicoes: { lacreInviolado: false, dentroValidade: false, identificacaoClara: false, semLacre: false },
  aceitaRecolhimento: 'aceita',
  acompanhanteNome: '', acompanhanteParentesco: '',
  enfermeiroResponsavel: '', coren: '', farmaceuticoResponsavel: '',
  observacoes: '',
  devolucao: { realizada: false, dataAlta: '', medicamentoQuantidadeDevolvida: '', farmaceuticoClinicoDevolucao: '', enfermeiroDevolucao: '' },
});

export function TermoGuardaMedicamento({ storageKey, setor }: Props) {
  const [registros, setRegistros] = useLocalStorage<RegistroTermo[]>(storageKey, []);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detalhe, setDetalhe] = useState<RegistroTermo | null>(null);
  const [busca, setBusca] = useState('');
  const [form, setForm] = useState(emptyForm());

  const f = (field: string, value: any) => setForm(p => ({ ...p, [field]: value }));

  const addMedicamento = () => setForm(p => ({ ...p, medicamentos: [...p.medicamentos, emptyMedicamento()] }));
  const removeMedicamento = (i: number) => setForm(p => ({ ...p, medicamentos: p.medicamentos.filter((_, idx) => idx !== i) }));
  const updateMed = (i: number, field: string, value: string) => {
    setForm(p => ({
      ...p,
      medicamentos: p.medicamentos.map((m, idx) => idx === i ? { ...m, [field]: value } : m)
    }));
  };

  const toggleCondicao = (key: keyof typeof form.condicoes) => {
    setForm(p => ({ ...p, condicoes: { ...p.condicoes, [key]: !p.condicoes[key] } }));
  };

  const handleSalvar = () => {
    if (!form.pacienteNome || !form.enfermeiroResponsavel) {
      toast.error('Paciente e enfermeiro responsável são obrigatórios');
      return;
    }
    if (form.medicamentos.length === 0 || !form.medicamentos[0].medicamento) {
      toast.error('Informe pelo menos um medicamento');
      return;
    }
    const novo: RegistroTermo = { ...form, id: crypto.randomUUID(), dataRegistro: new Date().toLocaleString('pt-BR') };
    setRegistros([novo, ...registros]);
    setForm(emptyForm());
    setDialogOpen(false);
    toast.success('Termo de guarda registrado');
  };

  const filtrados = registros.filter(r =>
    r.pacienteNome.toLowerCase().includes(busca.toLowerCase()) ||
    r.prontuario.includes(busca) || r.data.includes(busca)
  );

  const SimNaoInline = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <RadioGroup value={value} onValueChange={onChange} className="flex gap-2">
      <div className="flex items-center gap-1"><RadioGroupItem value="sim" /><span className="text-xs">S</span></div>
      <div className="flex items-center gap-1"><RadioGroupItem value="nao" /><span className="text-xs">N</span></div>
    </RadioGroup>
  );

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Pill className="h-5 w-5 text-primary" />
          Termo de Guarda e Recolhimento de Medicamento
        </h3>
        <p className="text-sm text-muted-foreground">Propriedade do paciente — {setor}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Pill className="h-8 w-8 text-primary opacity-70" />
          <div><p className="text-sm text-muted-foreground">Total Termos</p><p className="text-2xl font-bold">{registros.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <CheckCircle2 className="h-8 w-8 text-primary opacity-70" />
          <div><p className="text-sm text-muted-foreground">Aceitos</p><p className="text-2xl font-bold">{registros.filter(r => r.aceitaRecolhimento === 'aceita').length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Clock className="h-8 w-8 text-primary opacity-70" />
          <div><p className="text-sm text-muted-foreground">Recusados</p><p className="text-2xl font-bold">{registros.filter(r => r.aceitaRecolhimento === 'recusa').length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <CheckCircle2 className="h-8 w-8 text-primary opacity-70" />
          <div><p className="text-sm text-muted-foreground">Último</p><p className="text-sm font-medium">{registros[0]?.dataRegistro || '—'}</p></div>
        </CardContent></Card>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar paciente, prontuário ou data..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9" />
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" />Novo Termo</Button>
          </DialogTrigger>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pill className="h-5 w-5 text-primary" />
                Termo de Guarda e Recolhimento de Medicamento — {setor}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-5">

              {/* Texto declaratório */}
              <Card className="bg-muted/50">
                <CardContent className="p-4 text-xs text-muted-foreground space-y-2">
                  <p><strong>Declaro</strong> que os medicamentos listados abaixo são de propriedade do paciente e estão disponibilizados para meu uso durante a internação.</p>
                  <p>Fui esclarecido(a) sobre as condições de armazenamento dos(s) produto(s) e que, portanto, os medicamentos serão identificados pelo nome, data de validade e liberados para uso do paciente.</p>
                  <p>A instituição desconhece a procedência dos medicamentos, desde modo, a responsabilidade plena sobre a integridade dos produtos fornecidos é do paciente.</p>
                  <p>Durante a minha permanência nesta instituição o(s) produto(s) será(ão) armazenado(s) na Farmácia, sob a responsabilidade do(a) farmacêutico(a) do setor e o acompanhante deverá guardá-los.</p>
                  <p><strong>Afirmo</strong> que compreendo e concordo com as informações deste termo.</p>
                </CardContent>
              </Card>

              {/* Identificação */}
              <Card className="border-primary/30">
                <CardContent className="p-4 space-y-3">
                  <Badge className="bg-primary">Identificação do Paciente</Badge>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="md:col-span-2"><Label>Nome do Paciente</Label><Input value={form.pacienteNome} onChange={e => f('pacienteNome', e.target.value)} /></div>
                    <div><Label>Prontuário</Label><Input value={form.prontuario} onChange={e => f('prontuario', e.target.value)} /></div>
                    <div><Label>Leito</Label><Input value={form.leito} onChange={e => f('leito', e.target.value)} /></div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div><Label>Data de Nascimento</Label><Input type="date" value={form.dataNascimento} onChange={e => f('dataNascimento', e.target.value)} /></div>
                    <div><Label>Unidade</Label><Input value={form.unidade} onChange={e => f('unidade', e.target.value)} placeholder="Ex: Farmácia" /></div>
                    <div><Label>Data</Label><Input type="date" value={form.data} onChange={e => f('data', e.target.value)} /></div>
                    <div><Label>Hora</Label><Input type="time" value={form.hora} onChange={e => f('hora', e.target.value)} /></div>
                  </div>
                </CardContent>
              </Card>

              {/* Tabela de Medicamentos */}
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">Medicamentos do Paciente</Badge>
                    <Button size="sm" variant="outline" onClick={addMedicamento}><Plus className="h-3 w-3 mr-1" />Adicionar</Button>
                  </div>
                  <div className="rounded-md border overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[150px]">Medicamento</TableHead>
                          <TableHead className="min-w-[80px]">Dose</TableHead>
                          <TableHead className="min-w-[80px]">Posologia</TableHead>
                          <TableHead className="text-center min-w-[70px]">Não Padrão</TableHead>
                          <TableHead className="text-center min-w-[70px]">Recolhido</TableHead>
                          <TableHead className="text-center min-w-[70px]">Prescrito</TableHead>
                          <TableHead className="text-center min-w-[80px]">Prescrito c/ Alteração</TableHead>
                          <TableHead className="text-center min-w-[70px]">Suspenso</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {form.medicamentos.map((med, i) => (
                          <TableRow key={i}>
                            <TableCell><Input value={med.medicamento} onChange={e => updateMed(i, 'medicamento', e.target.value)} className="h-8" /></TableCell>
                            <TableCell><Input value={med.dose} onChange={e => updateMed(i, 'dose', e.target.value)} className="h-8" /></TableCell>
                            <TableCell><Input value={med.posologia} onChange={e => updateMed(i, 'posologia', e.target.value)} className="h-8" /></TableCell>
                            <TableCell className="text-center"><SimNaoInline value={med.naoPadrao} onChange={v => updateMed(i, 'naoPadrao', v)} /></TableCell>
                            <TableCell className="text-center"><SimNaoInline value={med.recolhido} onChange={v => updateMed(i, 'recolhido', v)} /></TableCell>
                            <TableCell className="text-center"><SimNaoInline value={med.prescrito} onChange={v => updateMed(i, 'prescrito', v)} /></TableCell>
                            <TableCell className="text-center"><SimNaoInline value={med.prescritoComAlteracao} onChange={v => updateMed(i, 'prescritoComAlteracao', v)} /></TableCell>
                            <TableCell className="text-center"><SimNaoInline value={med.suspenso} onChange={v => updateMed(i, 'suspenso', v)} /></TableCell>
                            <TableCell>
                              {form.medicamentos.length > 1 && (
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeMedicamento(i)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Condições do(s) medicamento(s) */}
              <Card>
                <CardContent className="p-4 space-y-3">
                  <Badge variant="outline">Condições do(s) Medicamento(s)</Badge>
                  <p className="text-xs text-muted-foreground">Recebi o(s) medicamento(s) nas seguintes condições:</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <Checkbox checked={form.condicoes.lacreInviolado} onCheckedChange={() => toggleCondicao('lacreInviolado')} id="lacre" />
                      <Label htmlFor="lacre" className="text-sm cursor-pointer">Lacre inviolado</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox checked={form.condicoes.dentroValidade} onCheckedChange={() => toggleCondicao('dentroValidade')} id="validade" />
                      <Label htmlFor="validade" className="text-sm cursor-pointer">Dentro do prazo de validade</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox checked={form.condicoes.identificacaoClara} onCheckedChange={() => toggleCondicao('identificacaoClara')} id="identificacao" />
                      <Label htmlFor="identificacao" className="text-sm cursor-pointer">Identificação clara</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox checked={form.condicoes.semLacre} onCheckedChange={() => toggleCondicao('semLacre')} id="semlacre" />
                      <Label htmlFor="semlacre" className="text-sm cursor-pointer">Sem lacre</Label>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Aceite / Recusa */}
              <Card>
                <CardContent className="p-4 space-y-3">
                  <Badge variant="outline">Decisão do Paciente / Acompanhante</Badge>
                  <RadioGroup value={form.aceitaRecolhimento} onValueChange={v => f('aceitaRecolhimento', v)} className="space-y-2">
                    <div className="flex items-start gap-2">
                      <RadioGroupItem value="aceita" id="aceita-rec" className="mt-1" />
                      <Label htmlFor="aceita-rec" className="text-sm cursor-pointer">
                        <strong>Aceita o Recolhimento</strong> — O paciente/acompanhante opta por permitir a guarda pela farmácia, ou mesmo se compromete a guardá-los.
                      </Label>
                    </div>
                    <div className="flex items-start gap-2">
                      <RadioGroupItem value="recusa" id="recusa-rec" className="mt-1" />
                      <Label htmlFor="recusa-rec" className="text-sm cursor-pointer">
                        <strong>Recusa o Recolhimento</strong> — Caso o paciente opte por não permitir a guarda pela enfermagem e na presença de um profissional de saúde são orientados sobre os riscos da administração por conta própria.
                      </Label>
                    </div>
                  </RadioGroup>
                </CardContent>
              </Card>

              {/* Acompanhante e Responsáveis */}
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Acompanhante</Label><Input value={form.acompanhanteNome} onChange={e => f('acompanhanteNome', e.target.value)} /></div>
                <div><Label>Parentesco</Label><Input value={form.acompanhanteParentesco} onChange={e => f('acompanhanteParentesco', e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Enfermeiro(a) Responsável</Label><Input value={form.enfermeiroResponsavel} onChange={e => f('enfermeiroResponsavel', e.target.value)} /></div>
                <div><Label>COREN</Label><Input value={form.coren} onChange={e => f('coren', e.target.value)} /></div>
                <div><Label>Farmacêutico(a)</Label><Input value={form.farmaceuticoResponsavel} onChange={e => f('farmaceuticoResponsavel', e.target.value)} /></div>
              </div>
              <div><Label>Observações</Label><Textarea value={form.observacoes} onChange={e => f('observacoes', e.target.value)} rows={2} /></div>

              {/* Devolução ao paciente — ALTA MÉDICA */}
              <Card className="border-orange-300">
                <CardContent className="p-4 space-y-3">
                  <Badge className="bg-orange-600">Devolução ao Paciente ou Responsável — ALTA MÉDICA</Badge>
                  <p className="text-xs text-muted-foreground">Declaro haver recebido o saldo remanescente do medicamento na alta hospitalar.</p>
                  <div className="flex items-center gap-2 mb-2">
                    <Checkbox checked={form.devolucao.realizada} onCheckedChange={v => f('devolucao', { ...form.devolucao, realizada: !!v })} id="dev-realizada" />
                    <Label htmlFor="dev-realizada" className="text-sm cursor-pointer font-semibold">Devolução realizada</Label>
                  </div>
                  {form.devolucao.realizada && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div><Label>Data da Alta</Label><Input type="date" value={form.devolucao.dataAlta} onChange={e => f('devolucao', { ...form.devolucao, dataAlta: e.target.value })} /></div>
                        <div><Label>Medicamento / Quantidade Devolvida</Label><Input value={form.devolucao.medicamentoQuantidadeDevolvida} onChange={e => f('devolucao', { ...form.devolucao, medicamentoQuantidadeDevolvida: e.target.value })} placeholder="Ex: Losartana 50mg — 10 comprimidos" /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><Label>Farmacêutico Clínico(a)</Label><Input value={form.devolucao.farmaceuticoClinicoDevolucao} onChange={e => f('devolucao', { ...form.devolucao, farmaceuticoClinicoDevolucao: e.target.value })} /></div>
                        <div><Label>Enfermeiro(a)</Label><Input value={form.devolucao.enfermeiroDevolucao} onChange={e => f('devolucao', { ...form.devolucao, enfermeiroDevolucao: e.target.value })} /></div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Button onClick={handleSalvar} className="w-full" size="lg">
                <CheckCircle2 className="h-4 w-4 mr-2" />Registrar Termo de Guarda
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Detalhe */}
      <Dialog open={!!detalhe} onOpenChange={() => setDetalhe(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {detalhe && (
            <>
              <DialogHeader>
                <DialogTitle>Termo de Guarda — {detalhe.pacienteNome.toUpperCase()} — Leito {detalhe.leito}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="flex gap-2 flex-wrap">
                  <Badge>{detalhe.data} {detalhe.hora}</Badge>
                  <Badge variant="outline">Prontuário: {detalhe.prontuario}</Badge>
                  <Badge variant={detalhe.aceitaRecolhimento === 'aceita' ? 'default' : 'destructive'}>
                    {detalhe.aceitaRecolhimento === 'aceita' ? 'Aceita Recolhimento' : 'Recusa Recolhimento'}
                  </Badge>
                </div>

                <div className="rounded-md border overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Medicamento</TableHead>
                        <TableHead>Dose</TableHead>
                        <TableHead>Posologia</TableHead>
                        <TableHead className="text-center">Não Padrão</TableHead>
                        <TableHead className="text-center">Recolhido</TableHead>
                        <TableHead className="text-center">Prescrito</TableHead>
                        <TableHead className="text-center">c/ Alteração</TableHead>
                        <TableHead className="text-center">Suspenso</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detalhe.medicamentos.map((m, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{m.medicamento}</TableCell>
                          <TableCell>{m.dose}</TableCell>
                          <TableCell>{m.posologia}</TableCell>
                          <TableCell className="text-center"><Badge variant="outline" className="text-xs">{m.naoPadrao === 'sim' ? 'S' : 'N'}</Badge></TableCell>
                          <TableCell className="text-center"><Badge variant="outline" className="text-xs">{m.recolhido === 'sim' ? 'S' : 'N'}</Badge></TableCell>
                          <TableCell className="text-center"><Badge variant="outline" className="text-xs">{m.prescrito === 'sim' ? 'S' : 'N'}</Badge></TableCell>
                          <TableCell className="text-center"><Badge variant="outline" className="text-xs">{m.prescritoComAlteracao === 'sim' ? 'S' : 'N'}</Badge></TableCell>
                          <TableCell className="text-center"><Badge variant="outline" className="text-xs">{m.suspenso === 'sim' ? 'S' : 'N'}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="border rounded p-2 space-y-1">
                  <p className="font-semibold">Condições</p>
                  <div className="flex gap-2 flex-wrap">
                    {detalhe.condicoes.lacreInviolado && <Badge variant="outline" className="text-xs">Lacre inviolado</Badge>}
                    {detalhe.condicoes.dentroValidade && <Badge variant="outline" className="text-xs">Dentro da validade</Badge>}
                    {detalhe.condicoes.identificacaoClara && <Badge variant="outline" className="text-xs">Identificação clara</Badge>}
                    {detalhe.condicoes.semLacre && <Badge variant="outline" className="text-xs">Sem lacre</Badge>}
                  </div>
                </div>

                {detalhe.acompanhanteNome && <div><span className="text-muted-foreground">Acompanhante:</span> {detalhe.acompanhanteNome} ({detalhe.acompanhanteParentesco})</div>}
                {detalhe.observacoes && <div className="p-2 bg-muted rounded">{detalhe.observacoes}</div>}
                <div><span className="text-muted-foreground">Enfermeiro(a):</span> {detalhe.enfermeiroResponsavel} — COREN: {detalhe.coren}</div>
                {detalhe.farmaceuticoResponsavel && <div><span className="text-muted-foreground">Farmacêutico(a):</span> {detalhe.farmaceuticoResponsavel}</div>}
                
                {detalhe.devolucao?.realizada && (
                  <div className="border rounded p-2 space-y-1">
                    <p className="font-semibold">Devolução — Alta Médica</p>
                    <div className="grid grid-cols-2 gap-1">
                      <div><span className="text-muted-foreground">Data da Alta:</span> {detalhe.devolucao.dataAlta}</div>
                      <div><span className="text-muted-foreground">Qtd. Devolvida:</span> {detalhe.devolucao.medicamentoQuantidadeDevolvida}</div>
                      {detalhe.devolucao.farmaceuticoClinicoDevolucao && <div><span className="text-muted-foreground">Farmacêutico:</span> {detalhe.devolucao.farmaceuticoClinicoDevolucao}</div>}
                      {detalhe.devolucao.enfermeiroDevolucao && <div><span className="text-muted-foreground">Enfermeiro:</span> {detalhe.devolucao.enfermeiroDevolucao}</div>}
                    </div>
                  </div>
                )}
                
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
              <TableHead>Paciente</TableHead>
              <TableHead>Prontuário</TableHead>
              <TableHead>Leito</TableHead>
              <TableHead>Medicamentos</TableHead>
              <TableHead>Decisão</TableHead>
              <TableHead>Enfermeiro(a)</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtrados.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhum termo registrado</TableCell></TableRow>
            ) : filtrados.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-mono">{r.data}</TableCell>
                <TableCell className="font-medium uppercase">{r.pacienteNome}</TableCell>
                <TableCell>{r.prontuario || '—'}</TableCell>
                <TableCell>{r.leito || '—'}</TableCell>
                <TableCell>{r.medicamentos.length} item(ns)</TableCell>
                <TableCell>
                  <Badge variant={r.aceitaRecolhimento === 'aceita' ? 'default' : 'destructive'} className="text-xs">
                    {r.aceitaRecolhimento === 'aceita' ? 'Aceito' : 'Recusado'}
                  </Badge>
                </TableCell>
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
