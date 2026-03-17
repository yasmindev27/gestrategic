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
import {
  ShieldCheck, Droplets, Sparkles, Plus, Package, Clock, AlertTriangle, CheckCircle2, Search, ArrowRight, RotateCcw, Eye, Scissors
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { toast } from 'sonner';

interface ItemCME {
  id: string;
  descricao: string;
  tipo: string;
  quantidade: number;
  setor_destino: string;
  etapa: 'recebimento' | 'lavagem' | 'secagem' | 'preparo' | 'esterilizacao' | 'armazenamento' | 'distribuicao';
  dataRegistro: string;
  horaRegistro: string;
  responsavel: string;
  lote?: string;
  indicadorBiologico?: 'aprovado' | 'reprovado' | 'pendente';
  observacoes?: string;
}

interface DevolucaoMaterial {
  id: string;
  material: string;
  setor: string;
  centroCusto: string;
  data: string;
  quantidade: number;
  tempoEmersaoInicio: string;
  tempoEmersaoFim: string;
  assinatura: string;
  observacao: string;
  dataRegistro: string;
}

const TIPOS_PINCA = [
  'Porta Agulha', 'Tesoura', 'Dente de Rato', 'Hemostática Curva',
  'Dissecção', 'Hemostática Reta',
] as const;

interface PincaItem {
  tipo: string;
  quantidade: number;
  checked: boolean;
}

interface RegistroPincas {
  id: string;
  data: string;
  pincas: PincaItem[];
  outra: string;
  outraQuantidade: number;
  total: number;
  enfermagem: string;
  dataRegistro: string;
}

const ETAPAS_SUJA = ['recebimento', 'lavagem', 'secagem'] as const;
const ETAPAS_LIMPA = ['preparo', 'esterilizacao', 'armazenamento', 'distribuicao'] as const;

const ETAPA_LABELS: Record<string, { label: string; cor: string }> = {
  recebimento: { label: 'Recebimento', cor: 'bg-red-100 text-red-800' },
  lavagem: { label: 'Lavagem', cor: 'bg-orange-100 text-orange-800' },
  secagem: { label: 'Secagem', cor: 'bg-yellow-100 text-yellow-800' },
  preparo: { label: 'Preparo', cor: 'bg-blue-100 text-blue-800' },
  esterilizacao: { label: 'Esterilização', cor: 'bg-purple-100 text-purple-800' },
  armazenamento: { label: 'Armazenamento', cor: 'bg-green-100 text-green-800' },
  distribuicao: { label: 'Distribuição', cor: 'bg-emerald-100 text-emerald-800' },
};

const TIPOS_MATERIAL = [
  'Instrumental Cirúrgico', 'Pacotes de Curativo', 'Caixas Cirúrgicas',
  'Material Termorresistente', 'Material Termossensível', 'Rouparia',
  'Acessórios de Ventilação', 'Outros',
];

const SETORES = [
  'Urgência', 'Internação', 'Medicação', 'Sala de Procedimentos', 'Observação Adulto',
  'Observação Infantil', 'Sala de Curativos', 'Outros',
];

export function CMEArea() {
  const [tab, setTab] = useState('area-suja');
  const [itens, setItens] = useLocalStorage<ItemCME[]>('enf-cme-itens', []);
  const [devolucoes, setDevolucoes] = useLocalStorage<DevolucaoMaterial[]>('enf-cme-devolucoes', []);
  const [pincasRegistros, setPincasRegistros] = useLocalStorage<RegistroPincas[]>('enf-cme-pincas', []);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogDevOpen, setDialogDevOpen] = useState(false);
  const [dialogPincasOpen, setDialogPincasOpen] = useState(false);
  const [detalhePinca, setDetalhePinca] = useState<RegistroPincas | null>(null);
  const [detalhe, setDetalhe] = useState<DevolucaoMaterial | null>(null);
  const [busca, setBusca] = useState('');
  const [buscaDev, setBuscaDev] = useState('');
  const [buscaPincas, setBuscaPincas] = useState('');
  const [form, setForm] = useState({
    descricao: '', tipo: 'Instrumental Cirúrgico', quantidade: 1, setor_destino: '',
    etapa: 'recebimento' as ItemCME['etapa'], responsavel: '', lote: '', observacoes: ''
  });
  const [formDev, setFormDev] = useState({
    material: '', setor: '', centroCusto: '', data: new Date().toISOString().split('T')[0],
    quantidade: 1, tempoEmersaoInicio: '', tempoEmersaoFim: '', assinatura: '', observacao: '',
  });
  const [formPincas, setFormPincas] = useState({
    data: new Date().toISOString().split('T')[0],
    pincas: TIPOS_PINCA.map(t => ({ tipo: t, quantidade: 0, checked: false })) as PincaItem[],
    outra: '',
    outraQuantidade: 0,
    enfermagem: '',
  });

  const itensSuja = itens.filter(i => (ETAPAS_SUJA as readonly string[]).includes(i.etapa));
  const itensLimpa = itens.filter(i => (ETAPAS_LIMPA as readonly string[]).includes(i.etapa));

  const handleAdd = () => {
    if (!form.descricao || !form.responsavel) {
      toast.error('Descrição e responsável são obrigatórios');
      return;
    }
    const now = new Date();
    const novo: ItemCME = {
      id: crypto.randomUUID(),
      ...form,
      dataRegistro: now.toISOString().split('T')[0],
      horaRegistro: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };
    setItens([novo, ...itens]);
    setForm({ descricao: '', tipo: 'Instrumental Cirúrgico', quantidade: 1, setor_destino: '', etapa: 'recebimento', responsavel: '', lote: '', observacoes: '' });
    setDialogOpen(false);
    toast.success('Item registrado na CME');
  };

  const handleAddPincas = () => {
    if (!formPincas.enfermagem) {
      toast.error('Enfermagem (assinatura) é obrigatória');
      return;
    }
    const checkedPincas = formPincas.pincas.filter(p => p.checked && p.quantidade > 0);
    const totalPincas = checkedPincas.reduce((s, p) => s + p.quantidade, 0) + (formPincas.outra ? formPincas.outraQuantidade : 0);
    if (totalPincas === 0) {
      toast.error('Selecione ao menos uma pinça com quantidade');
      return;
    }
    const novo: RegistroPincas = {
      id: crypto.randomUUID(),
      data: formPincas.data,
      pincas: checkedPincas,
      outra: formPincas.outra,
      outraQuantidade: formPincas.outra ? formPincas.outraQuantidade : 0,
      total: totalPincas,
      enfermagem: formPincas.enfermagem,
      dataRegistro: new Date().toLocaleString('pt-BR'),
    };
    setPincasRegistros([novo, ...pincasRegistros]);
    setFormPincas({
      data: new Date().toISOString().split('T')[0],
      pincas: TIPOS_PINCA.map(t => ({ tipo: t, quantidade: 0, checked: false })),
      outra: '', outraQuantidade: 0, enfermagem: '',
    });
    setDialogPincasOpen(false);
    toast.success('Registro de pinças salvo');
  };
  };

  const handleAddDevolucao = () => {
    if (!formDev.material || !formDev.setor || !formDev.assinatura) {
      toast.error('Material, setor e assinatura são obrigatórios');
      return;
    }
    const novo: DevolucaoMaterial = {
      id: crypto.randomUUID(),
      ...formDev,
      dataRegistro: new Date().toLocaleString('pt-BR'),
    };
    setDevolucoes([novo, ...devolucoes]);
    setFormDev({ material: '', setor: '', centroCusto: '', data: new Date().toISOString().split('T')[0], quantidade: 1, tempoEmersaoInicio: '', tempoEmersaoFim: '', assinatura: '', observacao: '' });
    setDialogDevOpen(false);
    toast.success('Devolução registrada com sucesso');
  };

  const avancarEtapa = (id: string) => {
    const ordem: ItemCME['etapa'][] = ['recebimento', 'lavagem', 'secagem', 'preparo', 'esterilizacao', 'armazenamento', 'distribuicao'];
    setItens(prev => prev.map(i => {
      if (i.id !== id) return i;
      const idx = ordem.indexOf(i.etapa);
      if (idx < ordem.length - 1) {
        return { ...i, etapa: ordem[idx + 1] };
      }
      return i;
    }));
    toast.success('Item avançado para próxima etapa');
  };

  const renderTabela = (items: ItemCME[], area: string) => {
    const filtrados = items.filter(i =>
      i.descricao.toLowerCase().includes(busca.toLowerCase()) ||
      i.tipo.toLowerCase().includes(busca.toLowerCase())
    );

    return (
      <div className="space-y-4">
        <div className="rounded-md border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Qtd</TableHead>
                <TableHead>Etapa</TableHead>
                <TableHead>Lote</TableHead>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhum item na {area}</TableCell></TableRow>
              ) : filtrados.map(i => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.descricao}</TableCell>
                  <TableCell>{i.tipo}</TableCell>
                  <TableCell>{i.quantidade}</TableCell>
                  <TableCell><Badge className={ETAPA_LABELS[i.etapa].cor}>{ETAPA_LABELS[i.etapa].label}</Badge></TableCell>
                  <TableCell className="font-mono">{i.lote || '—'}</TableCell>
                  <TableCell className="text-sm">{i.dataRegistro} {i.horaRegistro}</TableCell>
                  <TableCell>{i.responsavel}</TableCell>
                  <TableCell>
                    {i.etapa !== 'distribuicao' && (
                      <Button size="sm" variant="outline" onClick={() => avancarEtapa(i.id)} className="gap-1">
                        <ArrowRight className="h-3 w-3" />Avançar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  const devFiltradas = devolucoes.filter(d =>
    d.material.toLowerCase().includes(buscaDev.toLowerCase()) ||
    d.setor.toLowerCase().includes(buscaDev.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            CME — Central de Material Esterilizado
          </h2>
          <p className="text-sm text-muted-foreground">Controle de processamento de materiais: recebimento, limpeza, esterilização e distribuição</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Droplets className="h-8 w-8 text-destructive opacity-70" />
          <div><p className="text-sm text-muted-foreground">Área Suja</p><p className="text-2xl font-bold">{itensSuja.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Sparkles className="h-8 w-8 text-primary opacity-70" />
          <div><p className="text-sm text-muted-foreground">Área Limpa</p><p className="text-2xl font-bold">{itensLimpa.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Package className="h-8 w-8 text-success opacity-70" />
          <div><p className="text-sm text-muted-foreground">Distribuídos Hoje</p><p className="text-2xl font-bold">{itens.filter(i => i.etapa === 'distribuicao' && i.dataRegistro === new Date().toISOString().split('T')[0]).length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <RotateCcw className="h-8 w-8 text-warning opacity-70" />
          <div><p className="text-sm text-muted-foreground">Devoluções Hoje</p><p className="text-2xl font-bold">{devolucoes.filter(d => d.data === new Date().toISOString().split('T')[0]).length}</p></div>
        </CardContent></Card>
      </div>

      {/* Fluxo visual */}
      <Card>
        <CardContent className="p-4">
          <p className="text-sm font-medium mb-3">Fluxo de Processamento</p>
          <div className="flex flex-wrap items-center gap-1 text-xs">
            {Object.entries(ETAPA_LABELS).map(([key, val], idx) => (
              <div key={key} className="flex items-center gap-1">
                <Badge className={val.cor}>{val.label} ({itens.filter(i => i.etapa === key).length})</Badge>
                {idx < Object.keys(ETAPA_LABELS).length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Ações */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar..." value={tab === 'devolucao' ? buscaDev : tab === 'pincas' ? buscaPincas : busca} onChange={e => tab === 'devolucao' ? setBuscaDev(e.target.value) : tab === 'pincas' ? setBuscaPincas(e.target.value) : setBusca(e.target.value)} className="pl-9" />
        </div>
        {tab === 'pincas' ? (
          <Dialog open={dialogPincasOpen} onOpenChange={setDialogPincasOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" />Registrar Pinças</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Controle de Pinças — CME</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Data</Label><Input type="date" value={formPincas.data} onChange={e => setFormPincas(p => ({ ...p, data: e.target.value }))} /></div>
                <div className="space-y-2">
                  <Label className="font-semibold">Tipos de Pinça</Label>
                  {formPincas.pincas.map((pinca, idx) => (
                    <div key={pinca.tipo} className="flex items-center gap-3 p-2 border rounded">
                      <Checkbox checked={pinca.checked} onCheckedChange={v => {
                        const updated = [...formPincas.pincas];
                        updated[idx] = { ...updated[idx], checked: !!v };
                        setFormPincas(p => ({ ...p, pincas: updated }));
                      }} id={`pinca-${idx}`} />
                      <Label htmlFor={`pinca-${idx}`} className="flex-1 cursor-pointer text-sm">{pinca.tipo}</Label>
                      <Input type="number" min={0} className="w-20" placeholder="Qtd" value={pinca.quantidade || ''} onChange={e => {
                        const updated = [...formPincas.pincas];
                        updated[idx] = { ...updated[idx], quantidade: parseInt(e.target.value) || 0, checked: true };
                        setFormPincas(p => ({ ...p, pincas: updated }));
                      }} />
                    </div>
                  ))}
                  <div className="flex items-center gap-3 p-2 border rounded border-dashed">
                    <Label className="text-sm text-muted-foreground whitespace-nowrap">Outra:</Label>
                    <Input value={formPincas.outra} onChange={e => setFormPincas(p => ({ ...p, outra: e.target.value }))} placeholder="Qual?" className="flex-1" />
                    <Input type="number" min={0} className="w-20" placeholder="Qtd" value={formPincas.outraQuantidade || ''} onChange={e => setFormPincas(p => ({ ...p, outraQuantidade: parseInt(e.target.value) || 0 }))} />
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 bg-muted rounded">
                  <span className="text-sm font-semibold">Total:</span>
                  <span className="text-lg font-bold">{formPincas.pincas.filter(p => p.checked).reduce((s, p) => s + p.quantidade, 0) + (formPincas.outra ? formPincas.outraQuantidade : 0)}</span>
                </div>
                <div><Label>Enfermagem (Assinatura)</Label><Input value={formPincas.enfermagem} onChange={e => setFormPincas(p => ({ ...p, enfermagem: e.target.value }))} placeholder="Nome do(a) enfermeiro(a)" /></div>
                <Button onClick={handleAddPincas} className="w-full"><CheckCircle2 className="h-4 w-4 mr-2" />Registrar Pinças</Button>
              </div>
            </DialogContent>
          </Dialog>
        ) : tab === 'devolucao' ? (
          <Dialog open={dialogDevOpen} onOpenChange={setDialogDevOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" />Registrar Devolução</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Controle de Devolução de Materiais Utilizados</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Material</Label><Input value={formDev.material} onChange={e => setFormDev(p => ({ ...p, material: e.target.value }))} placeholder="Ex: Ambu adulto + máscara infantil" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Setor</Label>
                    <Select value={formDev.setor} onValueChange={v => setFormDev(p => ({ ...p, setor: v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{SETORES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Centro de Custo</Label><Input value={formDev.centroCusto} onChange={e => setFormDev(p => ({ ...p, centroCusto: e.target.value }))} placeholder="Ex: Medicação" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Data</Label><Input type="date" value={formDev.data} onChange={e => setFormDev(p => ({ ...p, data: e.target.value }))} /></div>
                  <div><Label>Quantidade</Label><Input type="number" min={1} value={formDev.quantidade} onChange={e => setFormDev(p => ({ ...p, quantidade: parseInt(e.target.value) || 1 }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Tempo de Emersão — Início</Label><Input type="time" value={formDev.tempoEmersaoInicio} onChange={e => setFormDev(p => ({ ...p, tempoEmersaoInicio: e.target.value }))} /></div>
                  <div><Label>Tempo de Emersão — Fim</Label><Input type="time" value={formDev.tempoEmersaoFim} onChange={e => setFormDev(p => ({ ...p, tempoEmersaoFim: e.target.value }))} /></div>
                </div>
                <div><Label>Assinatura (Responsável)</Label><Input value={formDev.assinatura} onChange={e => setFormDev(p => ({ ...p, assinatura: e.target.value }))} placeholder="Nome do responsável pela devolução" /></div>
                <div><Label>Observação</Label><Textarea value={formDev.observacao} onChange={e => setFormDev(p => ({ ...p, observacao: e.target.value }))} rows={2} /></div>
                <Button onClick={handleAddDevolucao} className="w-full"><CheckCircle2 className="h-4 w-4 mr-2" />Registrar Devolução</Button>
              </div>
            </DialogContent>
          </Dialog>
        ) : (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" />Registrar Material</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Registrar Material na CME</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Descrição do Material</Label><Input value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Tipo</Label>
                    <Select value={form.tipo} onValueChange={v => setForm(p => ({ ...p, tipo: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{TIPOS_MATERIAL.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Quantidade</Label><Input type="number" min={1} value={form.quantidade} onChange={e => setForm(p => ({ ...p, quantidade: parseInt(e.target.value) || 1 }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Etapa Inicial</Label>
                    <Select value={form.etapa} onValueChange={v => setForm(p => ({ ...p, etapa: v as ItemCME['etapa'] }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(ETAPA_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Lote</Label><Input value={form.lote} onChange={e => setForm(p => ({ ...p, lote: e.target.value }))} placeholder="Opcional" /></div>
                </div>
                <div><Label>Setor Destino</Label><Input value={form.setor_destino} onChange={e => setForm(p => ({ ...p, setor_destino: e.target.value }))} /></div>
                <div><Label>Responsável</Label><Input value={form.responsavel} onChange={e => setForm(p => ({ ...p, responsavel: e.target.value }))} /></div>
                <div><Label>Observações</Label><Textarea value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} /></div>
                <Button onClick={handleAdd} className="w-full">Registrar</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="area-suja" className="gap-1"><Droplets className="h-4 w-4" />Área Suja</TabsTrigger>
          <TabsTrigger value="area-limpa" className="gap-1"><Sparkles className="h-4 w-4" />Área Limpa</TabsTrigger>
          <TabsTrigger value="devolucao" className="gap-1"><RotateCcw className="h-4 w-4" />Devolução</TabsTrigger>
        </TabsList>
        <TabsContent value="area-suja" className="mt-4">
          {renderTabela(itensSuja, 'Área Suja')}
        </TabsContent>
        <TabsContent value="area-limpa" className="mt-4">
          {renderTabela(itensLimpa, 'Área Limpa')}
        </TabsContent>
        <TabsContent value="devolucao" className="mt-4">
          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>Centro de Custo</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Qtd</TableHead>
                  <TableHead>Emersão (Início/Fim)</TableHead>
                  <TableHead>Assinatura</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devFiltradas.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhuma devolução registrada</TableCell></TableRow>
                ) : devFiltradas.map(d => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.material}</TableCell>
                    <TableCell>{d.setor}</TableCell>
                    <TableCell>{d.centroCusto || '—'}</TableCell>
                    <TableCell>{d.data}</TableCell>
                    <TableCell>{d.quantidade}</TableCell>
                    <TableCell className="text-sm font-mono">{d.tempoEmersaoInicio || '—'} / {d.tempoEmersaoFim || '—'}</TableCell>
                    <TableCell>{d.assinatura}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={() => setDetalhe(d)}><Eye className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog detalhe devolução */}
      <Dialog open={!!detalhe} onOpenChange={() => setDetalhe(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Detalhes da Devolução</DialogTitle></DialogHeader>
          {detalhe && (
            <div className="space-y-2 text-sm">
              <div><span className="text-muted-foreground">Material:</span> <strong>{detalhe.material}</strong></div>
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Setor:</span> {detalhe.setor}</div>
                <div><span className="text-muted-foreground">Centro de Custo:</span> {detalhe.centroCusto || '—'}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Data:</span> {detalhe.data}</div>
                <div><span className="text-muted-foreground">Quantidade:</span> {detalhe.quantidade}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Emersão Início:</span> {detalhe.tempoEmersaoInicio || '—'}</div>
                <div><span className="text-muted-foreground">Emersão Fim:</span> {detalhe.tempoEmersaoFim || '—'}</div>
              </div>
              <div><span className="text-muted-foreground">Assinatura:</span> {detalhe.assinatura}</div>
              {detalhe.observacao && <div><span className="text-muted-foreground">Observação:</span> {detalhe.observacao}</div>}
              <p className="text-xs text-muted-foreground pt-2">Registrado em: {detalhe.dataRegistro}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}