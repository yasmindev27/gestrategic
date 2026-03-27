import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Shield, Plus, Search, CheckCircle2, Clock, AlertTriangle
} from 'lucide-react';
// import { useLocalStorage } from '@/hooks/useLocalStorage';
import { toast } from 'sonner';
import { ExportDropdown } from '@/components/ui/export-dropdown';
import { exportToPDF, exportToExcel } from '@/lib/export-utils';

type Resposta = 'sim' | 'nao' | 'na';

const ITENS_CHECKLIST = [
  'Breas a serem auditadas',
  'Pulseira de identificação',
  'Pulseira de risco de queda',
  'Pulseira de risco de alergia',
  'Placa de identificação completa',
  'Cabeceira elevada conforme necessidade clínica',
  'Grades laterais elevadas (quando indicado)',
  'AVP identificado',
];

// Locais padrão para auditoria
const LOCAIS_PADRAO = [
  'Leito 18', 'Leito 19', 'Leito 20',
  'Maca de suporte', 'Extra sutura', 'Extra sutura 2', 'Extra',
];

interface RegistroNSP {
  id: string;
  data: string;
  responsavel: string;
  coren: string;
  setorUnidade: string;
  locais: string[];
  respostas: Record<string, Record<string, Resposta>>; // local -> item -> resposta
  observacoes: string;
  dataRegistro: string;
}

interface ChecklistNSPProps {
  storageKey: string;
  setor: string;
}

export function ChecklistGeralNSP({ storageKey, setor }: ChecklistNSPProps) {
  // TODO: Substituir por hook React Query/Supabase
  const [registros, setRegistros] = useState<RegistroNSP[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busca, setBusca] = useState('');

  const [form, setForm] = useState({
    data: new Date().toISOString().split('T')[0],
    responsavel: '',
    coren: '',
    setorUnidade: setor,
    locais: LOCAIS_PADRAO,
    respostas: {} as Record<string, Record<string, Resposta>>,
    observacoes: '',
  });

  const setResposta = (local: string, item: string, valor: Resposta) => {
    setForm(p => ({
      ...p,
      respostas: {
        ...p.respostas,
        [local]: { ...(p.respostas[local] || {}), [item]: valor },
      },
    }));
  };

  const totalCampos = form.locais.length * ITENS_CHECKLIST.length;
  const preenchidos = Object.values(form.respostas).reduce(
    (acc, localRespostas) => acc + Object.keys(localRespostas).length, 0
  );

  // TODO: Substituir por inserção no Supabase
  const handleSalvar = () => {
    if (!form.responsavel || !form.coren) {
      toast.error('Responsável e COREN são obrigatórios');
      return;
    }
    // Aqui será feita a chamada para o Supabase
    // Exemplo: await supabase.from('checklist_nsp').insert({ ...form })
    toast.success('Checklist NSP registrado (mock)');
    setDialogOpen(false);
  };

  // Calcular conformidade
  const calcConformidade = (registro: RegistroNSP) => {
    let total = 0, conforme = 0;
    Object.values(registro.respostas).forEach(localR => {
      Object.values(localR).forEach(r => {
        if (r !== 'na') { total++; if (r === 'sim') conforme++; }
      });
    });
    return total > 0 ? Math.round((conforme / total) * 100) : 0;
  };

  const registrosFiltrados = registros.filter(r =>
    r.responsavel.toLowerCase().includes(busca.toLowerCase()) ||
    r.data.includes(busca)
  );

  const respostaColor = (r: Resposta) => {
    switch (r) {
      case 'sim': return 'text-green-600 font-semibold';
      case 'nao': return 'text-destructive font-semibold';
      case 'na': return 'text-muted-foreground';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Checklist Geral — Nucleo de Segurança do Paciente
          </h3>
          <p className="text-sm text-muted-foreground">Setor/Unidade: {setor} — Auditoria de segurança por leito/local</p>
        </div>
        <ExportDropdown
          onExportPDF={() => exportToPDF({ title: `Checklist NSP — ${setor}`, headers: ['Data', 'Responsável', 'COREN', 'Setor', 'Observações', 'Data Registro'], rows: registros.map(r => [r.data, r.responsavel, r.coren, r.setorUnidade, r.observacoes, r.dataRegistro]), fileName: `checklist_nsp_${setor}` })}
          onExportExcel={() => exportToExcel({ title: `Checklist NSP — ${setor}`, headers: ['Data', 'Responsável', 'COREN', 'Setor', 'Observações', 'Data Registro'], rows: registros.map(r => [r.data, r.responsavel, r.coren, r.setorUnidade, r.observacoes, r.dataRegistro]), fileName: `checklist_nsp_${setor}` })}
        />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <CheckCircle2 className="h-8 w-8 text-primary opacity-70" />
          <div><p className="text-sm text-muted-foreground">Auditorias</p><p className="text-2xl font-bold">{registros.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Clock className="h-8 w-8 text-primary opacity-70" />
          <div><p className="text-sm text-muted-foreground">Ultima Auditoria</p><p className="text-sm font-medium">{registros[0]?.dataRegistro || '—'}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary opacity-70" />
          <div><p className="text-sm text-muted-foreground">Conformidade Média</p><p className="text-2xl font-bold">
            {registros.length > 0 ? Math.round(registros.reduce((a, r) => a + calcConformidade(r), 0) / registros.length) : 0}%
          </p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <AlertTriangle className="h-8 w-8 text-destructive opacity-70" />
          <div><p className="text-sm text-muted-foreground">Itens Auditados</p><p className="text-2xl font-bold">{ITENS_CHECKLIST.length}</p></div>
        </CardContent></Card>
      </div>

      {/* Ações */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por responsável ou data..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9" />
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" />Nova Auditoria</Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Checklist Geral — NSP — {setor}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Card>
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div><Label>Data</Label><Input type="date" value={form.data} onChange={e => setForm(p => ({ ...p, data: e.target.value }))} /></div>
                    <div><Label>Responsável pela Auditoria</Label><Input value={form.responsavel} onChange={e => setForm(p => ({ ...p, responsavel: e.target.value }))} /></div>
                    <div><Label>COREN</Label><Input value={form.coren} onChange={e => setForm(p => ({ ...p, coren: e.target.value }))} placeholder="COREN/Nº" /></div>
                    <div><Label>Setor/Unidade</Label><Input value={form.setorUnidade} onChange={e => setForm(p => ({ ...p, setorUnidade: e.target.value }))} /></div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm">Preenchido: {preenchidos}/{totalCampos}</p>
                <div className="h-2 w-48 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${totalCampos > 0 ? (preenchidos / totalCampos) * 100 : 0}%` }} />
                </div>
              </div>

              <div className="rounded-md border overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-background z-10 w-[260px]">Item</TableHead>
                      {form.locais.map(local => (
                        <TableHead key={local} className="text-center min-w-[100px] text-xs">{local}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ITENS_CHECKLIST.map(item => (
                      <TableRow key={item}>
                        <TableCell className="sticky left-0 bg-background z-10 text-sm font-medium">{item}</TableCell>
                        {form.locais.map(local => (
                          <TableCell key={local} className="text-center">
                            <RadioGroup
                              value={form.respostas[local]?.[item] || ''}
                              onValueChange={v => setResposta(local, item, v as Resposta)}
                              className="flex gap-2 justify-center"
                            >
                              <div className="flex items-center gap-0.5">
                                <RadioGroupItem value="sim" id={`${local}-${item}-sim`} className="h-3.5 w-3.5" />
                                <Label htmlFor={`${local}-${item}-sim`} className="text-[10px] cursor-pointer">Sim</Label>
                              </div>
                              <div className="flex items-center gap-0.5">
                                <RadioGroupItem value="nao" id={`${local}-${item}-nao`} className="h-3.5 w-3.5" />
                                <Label htmlFor={`${local}-${item}-nao`} className="text-[10px] cursor-pointer">Não</Label>
                              </div>
                              <div className="flex items-center gap-0.5">
                                <RadioGroupItem value="na" id={`${local}-${item}-na`} className="h-3.5 w-3.5" />
                                <Label htmlFor={`${local}-${item}-na`} className="text-[10px] cursor-pointer">N/A</Label>
                              </div>
                            </RadioGroup>
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div><Label>Observações</Label><Textarea value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} /></div>
              <Button onClick={handleSalvar} className="w-full" size="lg">
                <CheckCircle2 className="h-4 w-4 mr-2" />Registrar Auditoria NSP
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
              <TableHead>Responsável</TableHead>
              <TableHead>COREN</TableHead>
              <TableHead>Setor</TableHead>
              <TableHead>Conformidade</TableHead>
              <TableHead>Observações</TableHead>
              <TableHead>Registro em</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {registrosFiltrados.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhuma auditoria registrada</TableCell></TableRow>
            ) : registrosFiltrados.map(r => {
              const conf = calcConformidade(r);
              return (
                <TableRow key={r.id}>
                  <TableCell className="font-mono">{r.data}</TableCell>
                  <TableCell className="font-medium">{r.responsavel}</TableCell>
                  <TableCell className="text-sm">{r.coren}</TableCell>
                  <TableCell>{r.setorUnidade}</TableCell>
                  <TableCell>
                    <Badge className={conf >= 80 ? 'bg-green-600' : conf >= 50 ? 'bg-yellow-500' : 'bg-destructive'}>
                      {conf}%
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">{r.observacoes || '—'}</TableCell>
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
