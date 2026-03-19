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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Stethoscope, Plus, Search, CheckCircle2, Clock, Eye
} from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { toast } from 'sonner';
import { ExportDropdown } from '@/components/ui/export-dropdown';
import { exportToPDF, exportToExcel } from '@/lib/export-utils';

// ========== BRADEN ==========
const BRADEN_CATEGORIAS = [
  {
    nome: 'Percepção Sensorial',
    opcoes: [
      { valor: 1, label: 'Totalmente limitado' },
      { valor: 2, label: 'Muito limitado' },
      { valor: 3, label: 'Levemente limitado' },
      { valor: 4, label: 'Nenhuma limitação' },
    ],
  },
  {
    nome: 'Umidade',
    opcoes: [
      { valor: 1, label: 'Completamente molhado' },
      { valor: 2, label: 'Muito molhado' },
      { valor: 3, label: 'Ocasionalmente molhado' },
      { valor: 4, label: 'Raramente molhado' },
    ],
  },
  {
    nome: 'Atividade',
    opcoes: [
      { valor: 1, label: 'Acamado' },
      { valor: 2, label: 'Confinado a cadeira' },
      { valor: 3, label: 'Anda ocasionalmente' },
      { valor: 4, label: 'Anda frequentemente' },
    ],
  },
  {
    nome: 'Mobilidade',
    opcoes: [
      { valor: 1, label: 'Totalmente imóvel' },
      { valor: 2, label: 'Bastante limitado' },
      { valor: 3, label: 'Levemente limitado' },
      { valor: 4, label: 'Sem limitações' },
    ],
  },
  {
    nome: 'Nutrição',
    opcoes: [
      { valor: 1, label: 'Muito pobre' },
      { valor: 2, label: 'Provavelmente inadequada' },
      { valor: 3, label: 'Adequada' },
      { valor: 4, label: 'Excelente' },
    ],
  },
  {
    nome: 'Fricção e Cisalhamento',
    opcoes: [
      { valor: 1, label: 'Problema' },
      { valor: 2, label: 'Problema potencial' },
      { valor: 3, label: 'Nenhum problema' },
    ],
  },
];

const getBradenRisco = (total: number) => {
  if (total <= 11) return { label: 'Risco severo', color: 'bg-destructive' };
  if (total <= 14) return { label: 'Risco moderado', color: 'bg-yellow-500' };
  if (total <= 16) return { label: 'Risco brando', color: 'bg-yellow-300 text-foreground' };
  return { label: 'Sem risco', color: 'bg-green-600' };
};

// ========== MEWS ==========
const MEWS_PARAMS = [
  { nome: 'FC (bpm)', faixas: ['<40', '41-50', '51-100', '101-110', '111-129', '>130'], scores: [3, 2, 0, 1, 2, 3] },
  { nome: 'PA Sistólica', faixas: ['<70', '71-80', '81-100', '101-199', '>200'], scores: [3, 2, 1, 0, 2] },
  { nome: 'FR (irpm)', faixas: ['<9', '9-14', '15-20', '21-29', '>30'], scores: [2, 0, 1, 2, 3] },
  { nome: 'Temperatura', faixas: ['<35', '35-38.4', '>38.5'], scores: [2, 0, 2] },
  { nome: 'Nível Consciência', faixas: ['Alerta', 'Resposta verbal', 'Resposta dor', 'Sem resposta'], scores: [0, 1, 2, 3] },
];

const getMewsRisco = (total: number) => {
  if (total >= 5) return { label: 'Protocolo de sepse', color: 'bg-destructive' };
  if (total >= 4) return { label: 'Avise enfermeira', color: 'bg-orange-500' };
  if (total >= 3) return { label: 'Avise enfermeira acompanhamento', color: 'bg-yellow-500' };
  if (total >= 2) return { label: 'Acompanhamento SSVV 4/4h', color: 'bg-yellow-300 text-foreground' };
  if (total >= 1) return { label: 'Acompanhamento SSVV 6/6h', color: 'bg-blue-400' };
  return { label: 'Acompanhamento SSVV 2/2', color: 'bg-green-600' };
};

// ========== FLEBITE ==========
const FLEBITE_GRAUS = [
  { grau: 0, label: 'Sem sinais de flebite', descricao: 'Não há sinais clínicos de flebite. Observar o acesso venoso.' },
  { grau: 1, label: 'Possível início de flebite', descricao: 'Eritema ao redor do ponto de inserção, com ou sem dor.' },
  { grau: 2, label: 'Flebite em estágio inicial', descricao: 'Dor, eritema e/ou edema. Cordão venoso palpável.' },
  { grau: 3, label: 'Flebite em estágio moderado', descricao: 'Dor, eritema, endurecimento. Cordão venoso palpável > 2,5cm.' },
  { grau: 4, label: 'Flebite em estágio avançado', descricao: 'Trombose venosa com evolução. Início de necrose. Ação: retirar AVP.' },
  { grau: 5, label: 'Tromboflebite', descricao: 'Tromboflebite severa em evolução. Retirar AVP imediatamente.' },
];

// ========== DOR ==========
const DOR_NIVEIS = [
  { valor: 0, label: 'Sem dor', emoji: '😊' },
  { valor: 2, label: 'Dor suave', emoji: '🙂' },
  { valor: 4, label: 'Dor moderada', emoji: '😐' },
  { valor: 6, label: 'Dor forte', emoji: '😟' },
  { valor: 8, label: 'Dor muito forte', emoji: '😫' },
  { valor: 10, label: 'Dor máxima', emoji: '😭' },
];

// ========== TYPES ==========
interface RegistroEscala {
  id: string;
  data: string;
  paciente: string;
  leito: string;
  tipo: 'braden' | 'mews' | 'flebite' | 'dor';
  score: number;
  classificacao: string;
  detalhes: Record<string, number | string>;
  responsavel: string;
  observacoes: string;
  dataRegistro: string;
}

interface Props {
  storageKey: string;
  setor: string;
}

export function EscalasClinicas({ storageKey, setor }: Props) {
  const [registros, setRegistros] = useLocalStorage<RegistroEscala[]>(storageKey, []);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tipoEscala, setTipoEscala] = useState<'braden' | 'mews' | 'flebite' | 'dor'>('braden');
  const [detalhe, setDetalhe] = useState<RegistroEscala | null>(null);
  const [busca, setBusca] = useState('');

  // Form state
  const [formBase, setFormBase] = useState({ data: new Date().toISOString().split('T')[0], paciente: '', leito: '', responsavel: '', observacoes: '' });
  const [bradenScores, setBradenScores] = useState<Record<string, number>>({});
  const [mewsScores, setMewsScores] = useState<Record<string, number>>({});
  const [flebiteGrau, setFlebiteGrau] = useState<number>(0);
  const [dorNivel, setDorNivel] = useState<number>(0);

  const bradenTotal = Object.values(bradenScores).reduce((a, b) => a + b, 0);
  const mewsTotal = Object.values(mewsScores).reduce((a, b) => a + b, 0);

  const handleSalvar = () => {
    if (!formBase.paciente || !formBase.responsavel) {
      toast.error('Paciente e responsável são obrigatórios');
      return;
    }

    let score = 0;
    let classificacao = '';
    let detalhes: Record<string, number | string> = {};

    if (tipoEscala === 'braden') {
      score = bradenTotal;
      classificacao = getBradenRisco(bradenTotal).label;
      detalhes = bradenScores;
    } else if (tipoEscala === 'mews') {
      score = mewsTotal;
      classificacao = getMewsRisco(mewsTotal).label;
      detalhes = mewsScores;
    } else if (tipoEscala === 'flebite') {
      score = flebiteGrau;
      classificacao = FLEBITE_GRAUS[flebiteGrau]?.label || '';
      detalhes = { grau: flebiteGrau };
    } else {
      score = dorNivel;
      classificacao = DOR_NIVEIS.find(d => d.valor === dorNivel)?.label || '';
      detalhes = { nivel: dorNivel };
    }

    const novo: RegistroEscala = {
      id: crypto.randomUUID(),
      data: formBase.data,
      paciente: formBase.paciente,
      leito: formBase.leito,
      tipo: tipoEscala,
      score,
      classificacao,
      detalhes,
      responsavel: formBase.responsavel,
      observacoes: formBase.observacoes,
      dataRegistro: new Date().toLocaleString('pt-BR'),
    };

    setRegistros([novo, ...registros]);
    setFormBase({ data: new Date().toISOString().split('T')[0], paciente: '', leito: '', responsavel: '', observacoes: '' });
    setBradenScores({});
    setMewsScores({});
    setFlebiteGrau(0);
    setDorNivel(0);
    setDialogOpen(false);
    toast.success(`Escala ${tipoEscala.toUpperCase()} registrada`);
  };

  const filtrados = registros.filter(r =>
    r.paciente.toLowerCase().includes(busca.toLowerCase()) ||
    r.tipo.includes(busca.toLowerCase()) ||
    r.data.includes(busca)
  );

  const tipoLabel = (t: string) => {
    switch (t) { case 'braden': return 'Braden'; case 'mews': return 'MEWS'; case 'flebite': return 'Flebite'; case 'dor': return 'Dor'; default: return t; }
  };

  const scoreBadgeClass = (r: RegistroEscala) => {
    if (r.tipo === 'braden') return getBradenRisco(r.score).color;
    if (r.tipo === 'mews') return getMewsRisco(r.score).color;
    if (r.tipo === 'flebite') return r.score >= 3 ? 'bg-destructive' : r.score >= 1 ? 'bg-yellow-500' : 'bg-green-600';
    return r.score >= 7 ? 'bg-destructive' : r.score >= 4 ? 'bg-yellow-500' : 'bg-green-600';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" />
            Escalas Clínicas de Avaliação
          </h3>
          <p className="text-sm text-muted-foreground">{setor} — Braden, MEWS, Flebite e Dor</p>
        </div>
        <ExportDropdown
          onExportPDF={() => exportToPDF({ title: `Escalas Clínicas — ${setor}`, headers: ['Data', 'Paciente', 'Leito', 'Tipo', 'Score', 'Classificação', 'Responsável'], rows: registros.map(r => [r.data, r.paciente, r.leito, r.tipo, r.score, r.classificacao, r.responsavel]), fileName: `escalas_clinicas_${setor}` })}
          onExportExcel={() => exportToExcel({ title: `Escalas Clínicas — ${setor}`, headers: ['Data', 'Paciente', 'Leito', 'Tipo', 'Score', 'Classificação', 'Responsável'], rows: registros.map(r => [r.data, r.paciente, r.leito, r.tipo, r.score, r.classificacao, r.responsavel]), fileName: `escalas_clinicas_${setor}` })}
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {(['braden', 'mews', 'flebite', 'dor'] as const).map(t => (
          <Card key={t}><CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-primary opacity-70" />
            <div>
              <p className="text-sm text-muted-foreground">{tipoLabel(t)}</p>
              <p className="text-2xl font-bold">{registros.filter(r => r.tipo === t).length}</p>
            </div>
          </CardContent></Card>
        ))}
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar paciente, tipo ou data..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9" />
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" />Nova Avaliação</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-primary" />
                Avaliação Clínica — {setor}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Cabeçalho */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div><Label>Data</Label><Input type="date" value={formBase.data} onChange={e => setFormBase(p => ({ ...p, data: e.target.value }))} /></div>
                <div><Label>Paciente</Label><Input value={formBase.paciente} onChange={e => setFormBase(p => ({ ...p, paciente: e.target.value }))} /></div>
                <div><Label>Leito</Label><Input value={formBase.leito} onChange={e => setFormBase(p => ({ ...p, leito: e.target.value }))} /></div>
                <div><Label>Responsável</Label><Input value={formBase.responsavel} onChange={e => setFormBase(p => ({ ...p, responsavel: e.target.value }))} /></div>
              </div>

              {/* Tipo de escala */}
              <Tabs value={tipoEscala} onValueChange={v => setTipoEscala(v as typeof tipoEscala)}>
                <TabsList className="w-full">
                  <TabsTrigger value="braden" className="flex-1">Braden</TabsTrigger>
                  <TabsTrigger value="mews" className="flex-1">MEWS</TabsTrigger>
                  <TabsTrigger value="flebite" className="flex-1">Flebite</TabsTrigger>
                  <TabsTrigger value="dor" className="flex-1">Dor</TabsTrigger>
                </TabsList>

                {/* BRADEN */}
                <TabsContent value="braden" className="space-y-3 mt-3">
                  {BRADEN_CATEGORIAS.map(cat => (
                    <div key={cat.nome} className="border rounded-md p-3">
                      <p className="font-semibold text-sm mb-2">{cat.nome}</p>
                      <RadioGroup value={String(bradenScores[cat.nome] || '')} onValueChange={v => setBradenScores(p => ({ ...p, [cat.nome]: Number(v) }))}>
                        <div className="grid grid-cols-2 gap-1">
                          {cat.opcoes.map(op => (
                            <div key={op.valor} className="flex items-center gap-2">
                              <RadioGroupItem value={String(op.valor)} id={`braden-${cat.nome}-${op.valor}`} />
                              <Label htmlFor={`braden-${cat.nome}-${op.valor}`} className="text-xs cursor-pointer">
                                ({op.valor}) {op.label}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </RadioGroup>
                    </div>
                  ))}
                  <Card><CardContent className="p-3 flex items-center justify-between">
                    <span className="font-semibold">Total Braden: {bradenTotal}</span>
                    <Badge className={getBradenRisco(bradenTotal).color}>{getBradenRisco(bradenTotal).label}</Badge>
                  </CardContent></Card>
                </TabsContent>

                {/* MEWS */}
                <TabsContent value="mews" className="space-y-3 mt-3">
                  {MEWS_PARAMS.map(param => (
                    <div key={param.nome} className="border rounded-md p-3">
                      <p className="font-semibold text-sm mb-2">{param.nome}</p>
                      <RadioGroup value={String(mewsScores[param.nome] ?? '')} onValueChange={v => setMewsScores(p => ({ ...p, [param.nome]: Number(v) }))}>
                        <div className="flex flex-wrap gap-2">
                          {param.faixas.map((faixa, i) => (
                            <div key={faixa} className="flex items-center gap-1">
                              <RadioGroupItem value={String(param.scores[i])} id={`mews-${param.nome}-${i}`} />
                              <Label htmlFor={`mews-${param.nome}-${i}`} className="text-xs cursor-pointer">
                                {faixa} ({param.scores[i]})
                              </Label>
                            </div>
                          ))}
                        </div>
                      </RadioGroup>
                    </div>
                  ))}
                  <Card><CardContent className="p-3 flex items-center justify-between">
                    <span className="font-semibold">Score MEWS: {mewsTotal}</span>
                    <Badge className={getMewsRisco(mewsTotal).color}>{getMewsRisco(mewsTotal).label}</Badge>
                  </CardContent></Card>
                </TabsContent>

                {/* FLEBITE */}
                <TabsContent value="flebite" className="space-y-3 mt-3">
                  <RadioGroup value={String(flebiteGrau)} onValueChange={v => setFlebiteGrau(Number(v))}>
                    {FLEBITE_GRAUS.map(g => (
                      <div key={g.grau} className={`border rounded-md p-3 cursor-pointer transition-colors ${flebiteGrau === g.grau ? 'border-primary bg-primary/5' : ''}`}>
                        <div className="flex items-start gap-2">
                          <RadioGroupItem value={String(g.grau)} id={`flebite-${g.grau}`} className="mt-1" />
                          <div>
                            <Label htmlFor={`flebite-${g.grau}`} className="font-semibold text-sm cursor-pointer">
                              Grau {g.grau} — {g.label}
                            </Label>
                            <p className="text-xs text-muted-foreground">{g.descricao}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </RadioGroup>
                </TabsContent>

                {/* DOR */}
                <TabsContent value="dor" className="space-y-3 mt-3">
                  <RadioGroup value={String(dorNivel)} onValueChange={v => setDorNivel(Number(v))}>
                    <div className="grid grid-cols-3 gap-3">
                      {DOR_NIVEIS.map(d => (
                        <div key={d.valor} className={`border rounded-md p-4 text-center cursor-pointer transition-colors ${dorNivel === d.valor ? 'border-primary bg-primary/5' : ''}`}>
                          <RadioGroupItem value={String(d.valor)} id={`dor-${d.valor}`} className="sr-only" />
                          <Label htmlFor={`dor-${d.valor}`} className="cursor-pointer flex flex-col items-center gap-1">
                            <span className="text-3xl">{d.emoji}</span>
                            <span className="font-bold text-lg">{d.valor}</span>
                            <span className="text-xs text-muted-foreground">{d.label}</span>
                          </Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                </TabsContent>
              </Tabs>

              <div><Label>Observações</Label><Textarea value={formBase.observacoes} onChange={e => setFormBase(p => ({ ...p, observacoes: e.target.value }))} /></div>

              <Button onClick={handleSalvar} className="w-full" size="lg">
                <CheckCircle2 className="h-4 w-4 mr-2" />Registrar Avaliação
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Detalhe */}
      <Dialog open={!!detalhe} onOpenChange={() => setDetalhe(null)}>
        <DialogContent className="max-w-lg">
          {detalhe && (
            <>
              <DialogHeader>
                <DialogTitle>{tipoLabel(detalhe.tipo)} — {detalhe.paciente.toUpperCase()} — Leito {detalhe.leito}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{detalhe.data}</span>
                  <Badge className={scoreBadgeClass(detalhe)}>Score: {detalhe.score} — {detalhe.classificacao}</Badge>
                </div>
                <div className="text-sm"><span className="text-muted-foreground">Responsável:</span> {detalhe.responsavel}</div>
                {detalhe.observacoes && <div className="p-3 bg-muted rounded-md text-sm">{detalhe.observacoes}</div>}
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
              <TableHead>Escala</TableHead>
              <TableHead>Paciente</TableHead>
              <TableHead>Leito</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Classificação</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtrados.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhuma avaliação registrada</TableCell></TableRow>
            ) : filtrados.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-mono">{r.data}</TableCell>
                <TableCell><Badge variant="outline">{tipoLabel(r.tipo)}</Badge></TableCell>
                <TableCell className="font-medium uppercase">{r.paciente}</TableCell>
                <TableCell>{r.leito || '—'}</TableCell>
                <TableCell className="font-bold">{r.score}</TableCell>
                <TableCell><Badge className={scoreBadgeClass(r)}>{r.classificacao}</Badge></TableCell>
                <TableCell>{r.responsavel}</TableCell>
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
