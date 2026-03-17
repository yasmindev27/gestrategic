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
  HeartPulse, Plus, Search, CheckCircle2, Clock, Eye
} from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { toast } from 'sonner';

interface RegistroSVOxigenio {
  id: string;
  data: string;
  dataAdmissao: string;
  nomePaciente: string;
  leito: string;
  ra: string;
  unidadeInternacao: string;
  // Sinais vitais por hora (chave = hora)
  registros: Record<string, {
    fc: string;
    tc: string;
    fr: string;
    pa: string;
    dor: string;
    gc: string;
    satO2: string;
    fluxoO2: string;
    tipoO2: string;
    mews: string;
    via: string;
    vol: string;
    agua: string;
  }>;
  // Balanço
  ganhos: string;
  perdas: string;
  // Eliminações
  banho: string;
  soro: string;
  medIV: string;
  sne: string;
  diu: string;
  svd: string;
  evac: string;
  diurese: string;
  observacoes: string;
  dataRegistro: string;
}

const HORAS = ['07','08','09','10','11','12','13','14','15','16','17','18','19','20','21','22','23','24','01','02','03','04','05','06'];

const CAMPOS_VITAIS = [
  { key: 'fc', label: 'FC' },
  { key: 'tc', label: 'T°C' },
  { key: 'fr', label: 'FR' },
  { key: 'pa', label: 'PA' },
  { key: 'dor', label: 'DOR' },
  { key: 'gc', label: 'GC' },
  { key: 'satO2', label: 'SAT C/O2' },
  { key: 'fluxoO2', label: 'FLUXO O2' },
  { key: 'tipoO2', label: 'TIPO' },
  { key: 'mews', label: 'MEWS' },
];

interface Props {
  storageKey: string;
  setor: string;
}

export function ControleSinaisVitaisOxigenio({ storageKey, setor }: Props) {
  const [registros, setRegistros] = useLocalStorage<RegistroSVOxigenio[]>(storageKey, []);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detalhe, setDetalhe] = useState<RegistroSVOxigenio | null>(null);
  const [busca, setBusca] = useState('');

  const emptyRegistros = (): RegistroSVOxigenio['registros'] => {
    const r: RegistroSVOxigenio['registros'] = {};
    HORAS.forEach(h => {
      r[h] = { fc: '', tc: '', fr: '', pa: '', dor: '', gc: '', satO2: '', fluxoO2: '', tipoO2: '', mews: '', via: '', vol: '', agua: '' };
    });
    return r;
  };

  const [form, setForm] = useState({
    data: new Date().toISOString().split('T')[0],
    dataAdmissao: '',
    nomePaciente: '',
    leito: '',
    ra: '',
    unidadeInternacao: setor,
    registros: emptyRegistros(),
    ganhos: '', perdas: '',
    banho: '', soro: '', medIV: '', sne: '', diu: '', svd: '', evac: '', diurese: '',
    observacoes: '',
  });

  const setVital = (hora: string, campo: string, valor: string) => {
    setForm(p => ({
      ...p,
      registros: {
        ...p.registros,
        [hora]: { ...p.registros[hora], [campo]: valor },
      },
    }));
  };

  const handleSalvar = () => {
    if (!form.nomePaciente) {
      toast.error('Informe o nome do paciente');
      return;
    }
    const novo: RegistroSVOxigenio = {
      id: crypto.randomUUID(),
      ...form,
      dataRegistro: new Date().toLocaleString('pt-BR'),
    };
    setRegistros([novo, ...registros]);
    setForm({
      data: new Date().toISOString().split('T')[0],
      dataAdmissao: '', nomePaciente: '', leito: '', ra: '',
      unidadeInternacao: setor, registros: emptyRegistros(),
      ganhos: '', perdas: '',
      banho: '', soro: '', medIV: '', sne: '', diu: '', svd: '', evac: '', diurese: '',
      observacoes: '',
    });
    setDialogOpen(false);
    toast.success('Controle de sinais vitais registrado');
  };

  const filtrados = registros.filter(r =>
    r.nomePaciente.toLowerCase().includes(busca.toLowerCase()) ||
    r.leito.toLowerCase().includes(busca.toLowerCase()) ||
    r.data.includes(busca)
  );

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <HeartPulse className="h-5 w-5 text-primary" />
          Controle de Sinais Vitais e Oxigenioterapia
        </h3>
        <p className="text-sm text-muted-foreground">{setor} — Controle especial de unidade adulto</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <CheckCircle2 className="h-8 w-8 text-primary opacity-70" />
          <div><p className="text-sm text-muted-foreground">Registros</p><p className="text-2xl font-bold">{registros.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Clock className="h-8 w-8 text-primary opacity-70" />
          <div><p className="text-sm text-muted-foreground">Ultimo Registro</p><p className="text-sm font-medium">{registros[0]?.dataRegistro || '—'}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <HeartPulse className="h-8 w-8 text-primary opacity-70" />
          <div><p className="text-sm text-muted-foreground">Pacientes hoje</p><p className="text-2xl font-bold">{registros.filter(r => r.data === new Date().toISOString().split('T')[0]).length}</p></div>
        </CardContent></Card>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar paciente, leito ou data..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9" />
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" />Novo Controle</Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <HeartPulse className="h-5 w-5 text-primary" />
                Controle de Sinais Vitais e Oxigenioterapia — {setor}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Cabeçalho paciente */}
              <Card><CardContent className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div><Label>Data</Label><Input type="date" value={form.data} onChange={e => setForm(p => ({ ...p, data: e.target.value }))} /></div>
                  <div><Label>Nome do Paciente</Label><Input value={form.nomePaciente} onChange={e => setForm(p => ({ ...p, nomePaciente: e.target.value }))} /></div>
                  <div><Label>Leito</Label><Input value={form.leito} onChange={e => setForm(p => ({ ...p, leito: e.target.value }))} /></div>
                  <div><Label>RA</Label><Input value={form.ra} onChange={e => setForm(p => ({ ...p, ra: e.target.value }))} /></div>
                  <div><Label>Data Admissão</Label><Input type="date" value={form.dataAdmissao} onChange={e => setForm(p => ({ ...p, dataAdmissao: e.target.value }))} /></div>
                  <div><Label>Unidade Internação</Label><Input value={form.unidadeInternacao} onChange={e => setForm(p => ({ ...p, unidadeInternacao: e.target.value }))} /></div>
                </div>
              </CardContent></Card>

              {/* Grade de sinais vitais */}
              <div className="rounded-md border overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-background z-10 w-[100px]">HORA</TableHead>
                      {CAMPOS_VITAIS.map(c => (
                        <TableHead key={c.key} className="text-center min-w-[70px] text-xs">{c.label}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {HORAS.map(hora => (
                      <TableRow key={hora}>
                        <TableCell className="sticky left-0 bg-background z-10 font-mono font-bold text-sm">{hora}:00</TableCell>
                        {CAMPOS_VITAIS.map(c => (
                          <TableCell key={c.key} className="p-1">
                            <Input
                              value={form.registros[hora]?.[c.key] || ''}
                              onChange={e => setVital(hora, c.key, e.target.value)}
                              className="h-7 text-xs text-center w-[65px]"
                            />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Balanço e Eliminações */}
              <div className="grid grid-cols-2 gap-4">
                <Card><CardContent className="p-4 space-y-2">
                  <p className="font-semibold text-sm text-primary">Balanço Hídrico</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>Ganhos</Label><Input value={form.ganhos} onChange={e => setForm(p => ({ ...p, ganhos: e.target.value }))} /></div>
                    <div><Label>Perdas</Label><Input value={form.perdas} onChange={e => setForm(p => ({ ...p, perdas: e.target.value }))} /></div>
                  </div>
                </CardContent></Card>
                <Card><CardContent className="p-4 space-y-2">
                  <p className="font-semibold text-sm text-primary">Eliminações / Especiais</p>
                  <div className="grid grid-cols-4 gap-2">
                    <div><Label className="text-[10px]">Banho</Label><Input value={form.banho} onChange={e => setForm(p => ({ ...p, banho: e.target.value }))} className="h-7 text-xs" /></div>
                    <div><Label className="text-[10px]">Soro</Label><Input value={form.soro} onChange={e => setForm(p => ({ ...p, soro: e.target.value }))} className="h-7 text-xs" /></div>
                    <div><Label className="text-[10px]">MED IV</Label><Input value={form.medIV} onChange={e => setForm(p => ({ ...p, medIV: e.target.value }))} className="h-7 text-xs" /></div>
                    <div><Label className="text-[10px]">SNE</Label><Input value={form.sne} onChange={e => setForm(p => ({ ...p, sne: e.target.value }))} className="h-7 text-xs" /></div>
                    <div><Label className="text-[10px]">DIU</Label><Input value={form.diu} onChange={e => setForm(p => ({ ...p, diu: e.target.value }))} className="h-7 text-xs" /></div>
                    <div><Label className="text-[10px]">SVD</Label><Input value={form.svd} onChange={e => setForm(p => ({ ...p, svd: e.target.value }))} className="h-7 text-xs" /></div>
                    <div><Label className="text-[10px]">EVAC</Label><Input value={form.evac} onChange={e => setForm(p => ({ ...p, evac: e.target.value }))} className="h-7 text-xs" /></div>
                    <div><Label className="text-[10px]">Diurese</Label><Input value={form.diurese} onChange={e => setForm(p => ({ ...p, diurese: e.target.value }))} className="h-7 text-xs" /></div>
                  </div>
                </CardContent></Card>
              </div>

              <div><Label>Observações</Label><Textarea value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} /></div>

              <Button onClick={handleSalvar} className="w-full" size="lg">
                <CheckCircle2 className="h-4 w-4 mr-2" />Registrar Controle
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Detalhe */}
      <Dialog open={!!detalhe} onOpenChange={() => setDetalhe(null)}>
        <DialogContent className="max-w-[95vw] max-h-[85vh] overflow-y-auto">
          {detalhe && (
            <>
              <DialogHeader>
                <DialogTitle>Controle — {detalhe.nomePaciente.toUpperCase()} — Leito {detalhe.leito} — {detalhe.data}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-4 gap-2 text-sm">
                  <div><span className="text-muted-foreground">RA:</span> {detalhe.ra}</div>
                  <div><span className="text-muted-foreground">Admissão:</span> {detalhe.dataAdmissao}</div>
                  <div><span className="text-muted-foreground">Unidade:</span> {detalhe.unidadeInternacao}</div>
                  <div><span className="text-muted-foreground">Ganhos/Perdas:</span> {detalhe.ganhos || '—'}/{detalhe.perdas || '—'}</div>
                </div>
                <div className="rounded-md border overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[80px]">Hora</TableHead>
                        {CAMPOS_VITAIS.map(c => <TableHead key={c.key} className="text-center text-xs">{c.label}</TableHead>)}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {HORAS.filter(h => Object.values(detalhe.registros[h] || {}).some(v => v)).map(hora => (
                        <TableRow key={hora}>
                          <TableCell className="font-mono font-bold">{hora}:00</TableCell>
                          {CAMPOS_VITAIS.map(c => (
                            <TableCell key={c.key} className="text-center text-sm">{(detalhe.registros[hora] as Record<string, string>)?.[c.key] || '—'}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {detalhe.observacoes && <div className="p-3 bg-muted rounded-md text-sm">{detalhe.observacoes}</div>}
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
              <TableHead>Leito</TableHead>
              <TableHead>RA</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead>Registrado em</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtrados.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum controle registrado</TableCell></TableRow>
            ) : filtrados.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-mono">{r.data}</TableCell>
                <TableCell className="font-medium uppercase">{r.nomePaciente}</TableCell>
                <TableCell>{r.leito}</TableCell>
                <TableCell>{r.ra || '—'}</TableCell>
                <TableCell>{r.unidadeInternacao}</TableCell>
                <TableCell className="text-sm">{r.dataRegistro}</TableCell>
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
