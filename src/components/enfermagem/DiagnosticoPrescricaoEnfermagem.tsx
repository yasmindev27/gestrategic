import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ClipboardList, Plus, Search, Eye, Clock, CheckCircle2, Users
} from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { toast } from 'sonner';
import { ExportDropdown } from '@/components/ui/export-dropdown';
import { exportToPDF, exportToExcel } from '@/lib/export-utils';

// ===== Categorias de Prescrição baseadas no formulário =====
interface PrescricaoItem {
  codigo: string;
  descricao: string;
  marcado: boolean;
  horarios: string;
}

interface CategoriaRisco {
  titulo: string;
  itens: Omit<PrescricaoItem, 'marcado' | 'horarios'>[];
}

const CATEGORIAS_PRESCRICAO: CategoriaRisco[] = [
  {
    titulo: 'Risco de Queda',
    itens: [
      { codigo: 'RQ01', descricao: 'Manter grades do leito elevadas' },
      { codigo: 'RQ02', descricao: 'Manter pertences próximos ao paciente e quarto iluminado' },
      { codigo: 'RQ03', descricao: 'Avaliar marcha do paciente' },
      { codigo: 'RQ04', descricao: 'Manter acompanhante junto ao paciente' },
      { codigo: 'RQ05', descricao: 'Avaliar nível de consciência' },
    ],
  },
  {
    titulo: 'Risco de Infecção',
    itens: [
      { codigo: 'RI01', descricao: 'Promover autocuidado (Banho diário)' },
      { codigo: 'RI02', descricao: 'Seguir medidas de precaução e Isolamento' },
      { codigo: 'RI03', descricao: 'Monitorar dispositivos invasivos e/ou periférico (avaliar sinais flogísticos)' },
      { codigo: 'RI04', descricao: 'Manter o sistema de drenagem de diurese (SVD) abaixo do nível da bexiga' },
      { codigo: 'RI05', descricao: 'Esvaziar o sistema de drenagem e anotar volume em prontuário' },
      { codigo: 'RI06', descricao: 'Estimular/Realizar higiene Oral' },
    ],
  },
  {
    titulo: 'Risco de Aspiração',
    itens: [
      { codigo: 'RA01', descricao: 'Avaliar reflexo de tosse' },
      { codigo: 'RA02', descricao: 'Manter cabeceira do leito de 30° a 45°' },
      { codigo: 'RA03', descricao: 'Aspirar vias aéreas superiores' },
      { codigo: 'RA04', descricao: 'Avaliar dieta do paciente' },
    ],
  },
  {
    titulo: 'Risco de Sangramento',
    itens: [
      { codigo: 'RS01', descricao: 'Avaliar sinais de sangramento (Petéquias, Hematêmese etc.)' },
      { codigo: 'RS02', descricao: 'Avaliar Sinais de Hipotensão' },
    ],
  },
  {
    titulo: 'Risco de Integridade da Pele Prejudicada',
    itens: [
      { codigo: 'RP01', descricao: 'Realizar hidratação da pele do paciente' },
      { codigo: 'RP02', descricao: 'Observar integridade da pele durante o banho' },
      { codigo: 'RP03', descricao: 'Realizar mudança decúbito de 2 em 2 horas' },
    ],
  },
  {
    titulo: 'Evasão',
    itens: [
      { codigo: 'EV01', descricao: 'Avaliar ansiedade do paciente' },
      { codigo: 'EV02', descricao: 'Verificar necessidade de acompanhante' },
    ],
  },
  {
    titulo: 'Padrão Respiratório Prejudicado',
    itens: [
      { codigo: 'PR01', descricao: 'Avaliar padrão respiratório' },
      { codigo: 'PR02', descricao: 'Avaliar uso de Cateter Nasal / Máscara facial' },
      { codigo: 'PR03', descricao: 'Conferência de parâmetros ventilatórios de VM' },
      { codigo: 'PR04', descricao: 'Aspirar Vias aéreas superiores conforme necessidade do paciente' },
      { codigo: 'PR05', descricao: 'Manter cabeceira elevada entre 30° a 45°' },
    ],
  },
];

interface RegistroPrescricao {
  id: string;
  data: string;
  pacienteNome: string;
  dataNascimento: string;
  leito: string;
  categorias: {
    titulo: string;
    ativo: boolean;
    itens: PrescricaoItem[];
  }[];
  enfermeiroResponsavel: string;
  coren: string;
  observacoes: string;
  dataRegistro: string;
}

interface Props {
  storageKey: string;
  setor: string;
}

const buildEmptyCategories = () =>
  CATEGORIAS_PRESCRICAO.map(cat => ({
    titulo: cat.titulo,
    ativo: false,
    itens: cat.itens.map(it => ({ ...it, marcado: false, horarios: '' })),
  }));

export function DiagnosticoPrescricaoEnfermagem({ storageKey, setor }: Props) {
  const [registros, setRegistros] = useLocalStorage<RegistroPrescricao[]>(storageKey, []);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detalhe, setDetalhe] = useState<RegistroPrescricao | null>(null);
  const [busca, setBusca] = useState('');

  const [formData, setFormData] = useState({
    data: new Date().toISOString().split('T')[0],
    pacienteNome: '',
    dataNascimento: '',
    leito: '',
    enfermeiroResponsavel: '',
    coren: '',
    observacoes: '',
  });
  const [categorias, setCategorias] = useState(buildEmptyCategories());

  const toggleCategoria = (idx: number) => {
    setCategorias(prev => prev.map((c, i) => i === idx ? { ...c, ativo: !c.ativo } : c));
  };

  const toggleItem = (catIdx: number, itemIdx: number) => {
    setCategorias(prev => prev.map((c, ci) =>
      ci === catIdx ? {
        ...c,
        itens: c.itens.map((it, ii) => ii === itemIdx ? { ...it, marcado: !it.marcado } : it)
      } : c
    ));
  };

  const setHorarios = (catIdx: number, itemIdx: number, value: string) => {
    setCategorias(prev => prev.map((c, ci) =>
      ci === catIdx ? {
        ...c,
        itens: c.itens.map((it, ii) => ii === itemIdx ? { ...it, horarios: value } : it)
      } : c
    ));
  };

  const handleSalvar = () => {
    if (!formData.pacienteNome || !formData.enfermeiroResponsavel) {
      toast.error('Paciente e enfermeiro responsável são obrigatórios');
      return;
    }
    const novo: RegistroPrescricao = {
      id: crypto.randomUUID(),
      ...formData,
      categorias,
      dataRegistro: new Date().toLocaleString('pt-BR'),
    };
    setRegistros([novo, ...registros]);
    setFormData({ data: new Date().toISOString().split('T')[0], pacienteNome: '', dataNascimento: '', leito: '', enfermeiroResponsavel: '', coren: '', observacoes: '' });
    setCategorias(buildEmptyCategories());
    setDialogOpen(false);
    toast.success('Prescrição de enfermagem registrada');
  };

  const filtrados = registros.filter(r =>
    r.pacienteNome.toLowerCase().includes(busca.toLowerCase()) ||
    r.leito.includes(busca) ||
    r.data.includes(busca)
  );

  const totalPrescricoes = (r: RegistroPrescricao) =>
    r.categorias.reduce((acc, c) => acc + c.itens.filter(it => it.marcado).length, 0);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          Diagnósticos e Prescrições de Enfermagem — Paciente Adulto e Idoso
        </h3>
        <p className="text-sm text-muted-foreground">{setor}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <ClipboardList className="h-8 w-8 text-primary opacity-70" />
          <div><p className="text-sm text-muted-foreground">Total Prescrições</p><p className="text-2xl font-bold">{registros.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <CheckCircle2 className="h-8 w-8 text-primary opacity-70" />
          <div><p className="text-sm text-muted-foreground">Itens Prescritos (últ.)</p><p className="text-2xl font-bold">{registros[0] ? totalPrescricoes(registros[0]) : 0}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Users className="h-8 w-8 text-primary opacity-70" />
          <div><p className="text-sm text-muted-foreground">Pacientes</p><p className="text-2xl font-bold">{new Set(registros.map(r => r.pacienteNome.toLowerCase())).size}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Clock className="h-8 w-8 text-primary opacity-70" />
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
            <Button><Plus className="h-4 w-4 mr-1" />Nova Prescrição</Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" />
                Diagnósticos e Prescrições de Enfermagem — {setor}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Cabeçalho do paciente */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div><Label>Paciente</Label><Input value={formData.pacienteNome} onChange={e => setFormData(p => ({ ...p, pacienteNome: e.target.value }))} placeholder="Nome completo" /></div>
                <div><Label>DN</Label><Input type="date" value={formData.dataNascimento} onChange={e => setFormData(p => ({ ...p, dataNascimento: e.target.value }))} /></div>
                <div><Label>Leito</Label><Input value={formData.leito} onChange={e => setFormData(p => ({ ...p, leito: e.target.value }))} /></div>
                <div><Label>Data</Label><Input type="date" value={formData.data} onChange={e => setFormData(p => ({ ...p, data: e.target.value }))} /></div>
              </div>

              {/* Prescrição de Enfermagem por categoria */}
              <div className="space-y-3">
                <h4 className="font-semibold text-base">Prescrição de Enfermagem</h4>
                {categorias.map((cat, catIdx) => (
                  <Card key={cat.titulo} className={`transition-colors ${cat.ativo ? 'border-primary/40' : 'border-muted'}`}>
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`cat-${catIdx}`}
                          checked={cat.ativo}
                          onCheckedChange={() => toggleCategoria(catIdx)}
                        />
                        <Label htmlFor={`cat-${catIdx}`} className="font-semibold text-sm cursor-pointer">{cat.titulo}</Label>
                      </div>
                      {cat.ativo && (
                        <div className="ml-4 space-y-1">
                          {cat.itens.map((item, itemIdx) => (
                            <div key={item.codigo} className="flex items-center gap-2 py-1">
                              <Checkbox
                                id={`item-${catIdx}-${itemIdx}`}
                                checked={item.marcado}
                                onCheckedChange={() => toggleItem(catIdx, itemIdx)}
                              />
                              <Label htmlFor={`item-${catIdx}-${itemIdx}`} className="text-sm flex-1 cursor-pointer">
                                {item.descricao}
                              </Label>
                              {item.marcado && (
                                <Input
                                  value={item.horarios}
                                  onChange={e => setHorarios(catIdx, itemIdx, e.target.value)}
                                  placeholder="Horários (ex: 08 14 20)"
                                  className="w-40 h-8 text-xs"
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Observações */}
              <div><Label>Observações</Label><Textarea value={formData.observacoes} onChange={e => setFormData(p => ({ ...p, observacoes: e.target.value }))} rows={2} /></div>

              {/* Enfermeiro */}
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Enfermeiro(a) Responsável</Label><Input value={formData.enfermeiroResponsavel} onChange={e => setFormData(p => ({ ...p, enfermeiroResponsavel: e.target.value }))} /></div>
                <div><Label>COREN</Label><Input value={formData.coren} onChange={e => setFormData(p => ({ ...p, coren: e.target.value }))} /></div>
              </div>

              <Button onClick={handleSalvar} className="w-full" size="lg">
                <CheckCircle2 className="h-4 w-4 mr-2" />Registrar Prescrição
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
                <DialogTitle>Prescrição — {detalhe.pacienteNome.toUpperCase()} — Leito {detalhe.leito}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="flex gap-2 flex-wrap">
                  <Badge>{detalhe.data}</Badge>
                  <Badge variant="outline">DN: {detalhe.dataNascimento}</Badge>
                </div>
                {detalhe.categorias.filter(c => c.ativo).map(cat => (
                  <div key={cat.titulo} className="border rounded-md p-3">
                    <p className="font-semibold mb-1">{cat.titulo}</p>
                    <div className="space-y-1">
                      {cat.itens.filter(it => it.marcado).map(it => (
                        <div key={it.codigo} className="flex justify-between text-sm">
                          <span>{it.descricao}</span>
                          {it.horarios && <Badge variant="outline" className="text-xs">{it.horarios}</Badge>}
                        </div>
                      ))}
                      {cat.itens.filter(it => it.marcado).length === 0 && (
                        <p className="text-xs text-muted-foreground">Nenhum item marcado</p>
                      )}
                    </div>
                  </div>
                ))}
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
              <TableHead>Paciente</TableHead>
              <TableHead>Leito</TableHead>
              <TableHead>Itens Prescritos</TableHead>
              <TableHead>Enfermeiro(a)</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtrados.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma prescrição registrada</TableCell></TableRow>
            ) : filtrados.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-mono">{r.data}</TableCell>
                <TableCell className="font-medium uppercase">{r.pacienteNome}</TableCell>
                <TableCell>{r.leito || '—'}</TableCell>
                <TableCell><Badge variant="outline">{totalPrescricoes(r)} itens</Badge></TableCell>
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
