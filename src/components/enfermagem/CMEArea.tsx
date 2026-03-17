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
  ShieldCheck, Droplets, Sparkles, Plus, Package, Clock, AlertTriangle, CheckCircle2, Search, ArrowRight, RotateCcw, Eye, Scissors, Beaker, SprayCan, FlaskConical, CircleDot, ClipboardCheck, Ban, ShoppingCart, BoxSelect
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { toast } from 'sonner';

// === Interfaces ===

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

interface RegistroAlmotolia {
  id: string;
  produto: string;
  dataFracionar: string;
  quantidade: number;
  setor: string;
  lote: string;
  validade: string;
  observacao: string;
  responsavel: string;
  dataRegistro: string;
}

interface RegistroDesinfeccao {
  id: string;
  data: string;
  metodo: string;
  quantidade: string;
  validade: string;
  responsavel: string;
  coren: string;
  dataRegistro: string;
}

interface ItemDiluicao {
  solucao: string;
  volume: string;
  lote: string;
  validade: string;
}

interface RegistroDiluicao {
  id: string;
  categoria: 'respiratorio' | 'cirurgico';
  itens: ItemDiluicao[];
  data: string;
  horario: string;
  responsavel: string;
  dataRegistro: string;
}

interface RegistroOlivas {
  id: string;
  dataDesinfeccao: string;
  tipoMaterial: string;
  validade: string;
  metodo: string;
  quantidade: string;
  responsavel: string;
  coren: string;
  dataRegistro: string;
}

interface RegistroConferencia {
  id: string;
  data: string;
  setor: string;
  materiaisRespiratorios: boolean;
  materiaisCirurgicos: boolean;
  inconformidade: boolean;
  inconformidadeDescricao: string;
  responsavel: string;
  coren: string;
  dataRegistro: string;
}

interface RegistroDanificado {
  id: string;
  material: string;
  setor: string;
  data: string;
  motivo: string;
  conduta: string;
  reposicao: string;
  responsavel: string;
  dataRegistro: string;
}

interface SolicitacaoMaterial {
  id: string;
  data: string;
  setor: string;
  centroCusto: string;
  material: string;
  quantidade: string;
  solicitante: string;
  observacao: string;
  dataRegistro: string;
}

interface ControleMaterialKit {
  id: string;
  data: string;
  kit: string;
  descricaoItens: string;
  qtdSaidaEsterilizacao: string;
  qtdRetornoEsterilizacao: string;
  totalEstoqueCME: string;
  responsavel: string;
  observacoes: string;
  dataRegistro: string;
}

// === Constants ===

const TIPOS_PINCA = [
  'Porta Agulha', 'Tesoura', 'Dente de Rato', 'Hemostática Curva',
  'Dissecção', 'Hemostática Reta',
] as const;

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
  'Observação Infantil', 'Sala de Curativos', 'CME', 'Outros',
];

const PRODUTOS_ALMOTOLIA = [
  'Álcool 70%', 'Clorexidina Alcoólica', 'Clorexidina Degermante', 'PVPI Tópico',
  'PVPI Degermante', 'Álcool Gel', 'Outro',
];

const METODOS_DESINFECCAO = [
  'Água / Sabão / Fricção Mecânica',
  'Hipoclorito de Sódio 1%',
  'Álcool 70%',
  'Quaternário de Amônio',
  'Outro',
];

// === Component ===

export function CMEArea() {
  const [tab, setTab] = useState('area-suja');
  const [itens, setItens] = useLocalStorage<ItemCME[]>('enf-cme-itens', []);
  const [devolucoes, setDevolucoes] = useLocalStorage<DevolucaoMaterial[]>('enf-cme-devolucoes', []);
  const [pincasRegistros, setPincasRegistros] = useLocalStorage<RegistroPincas[]>('enf-cme-pincas', []);
  const [almotolias, setAlmotolias] = useLocalStorage<RegistroAlmotolia[]>('enf-cme-almotolias', []);
  const [desinfeccoes, setDesinfeccoes] = useLocalStorage<RegistroDesinfeccao[]>('enf-cme-desinfeccao', []);
  const [diluicoes, setDiluicoes] = useLocalStorage<RegistroDiluicao[]>('enf-cme-diluicao', []);
  const [olivas, setOlivas] = useLocalStorage<RegistroOlivas[]>('enf-cme-olivas', []);
  const [conferencias, setConferencias] = useLocalStorage<RegistroConferencia[]>('enf-cme-conferencia', []);
  const [danificados, setDanificados] = useLocalStorage<RegistroDanificado[]>('enf-cme-danificados', []);
  const [solicitacoes, setSolicitacoes] = useLocalStorage<SolicitacaoMaterial[]>('enf-cme-solicitacoes', []);
  const [controleMateriais, setControleMateriais] = useLocalStorage<ControleMaterialKit[]>('enf-cme-controle-material', []);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogDevOpen, setDialogDevOpen] = useState(false);
  const [dialogPincasOpen, setDialogPincasOpen] = useState(false);
  const [dialogAlmotoliaOpen, setDialogAlmotoliaOpen] = useState(false);
  const [dialogDesinfeccaoOpen, setDialogDesinfeccaoOpen] = useState(false);
  const [dialogDiluicaoOpen, setDialogDiluicaoOpen] = useState(false);
  const [dialogOlivasOpen, setDialogOlivasOpen] = useState(false);
  const [dialogConferenciaOpen, setDialogConferenciaOpen] = useState(false);
  const [dialogDanificadoOpen, setDialogDanificadoOpen] = useState(false);
  const [dialogSolicitacaoOpen, setDialogSolicitacaoOpen] = useState(false);
  const [dialogControleMatOpen, setDialogControleMatOpen] = useState(false);
  const [detalhePinca, setDetalhePinca] = useState<RegistroPincas | null>(null);
  const [detalhe, setDetalhe] = useState<DevolucaoMaterial | null>(null);
  const [detalheAlmotolia, setDetalheAlmotolia] = useState<RegistroAlmotolia | null>(null);
  const [detalheDesinfeccao, setDetalheDesinfeccao] = useState<RegistroDesinfeccao | null>(null);
  const [detalheDiluicao, setDetalheDiluicao] = useState<RegistroDiluicao | null>(null);
  const [detalheOliva, setDetalheOliva] = useState<RegistroOlivas | null>(null);
  const [detalheConferencia, setDetalheConferencia] = useState<RegistroConferencia | null>(null);
  const [detalheDanificado, setDetalheDanificado] = useState<RegistroDanificado | null>(null);
  const [detalheSolicitacao, setDetalheSolicitacao] = useState<SolicitacaoMaterial | null>(null);
  const [detalheControleMat, setDetalheControleMat] = useState<ControleMaterialKit | null>(null);
  const [busca, setBusca] = useState('');
  const [buscaDev, setBuscaDev] = useState('');
  const [buscaPincas, setBuscaPincas] = useState('');
  const [buscaAlmotolia, setBuscaAlmotolia] = useState('');
  const [buscaDesinfeccao, setBuscaDesinfeccao] = useState('');
  const [buscaDiluicao, setBuscaDiluicao] = useState('');
  const [buscaOlivas, setBuscaOlivas] = useState('');
  const [buscaConferencia, setBuscaConferencia] = useState('');
  const [buscaDanificado, setBuscaDanificado] = useState('');
  const [buscaSolicitacao, setBuscaSolicitacao] = useState('');
  const [buscaControleMat, setBuscaControleMat] = useState('');

  const KITS_CME = [
    { nome: 'Kit Sutura', descricao: 'Tesoura Mayo reta 16 cm / Pinça Hemostática reta 16 cm / Porta-agulha / Pinça dente de rato / Cuba rim' },
    { nome: 'Kit Cateterismo Vesical', descricao: 'Tesoura Metzenbaum 16 cm curva / Tesoura Mayo reta 17 cm / 2 Pinças Hemostática reta 16 cm / Porta-agulha / Pinça dente de rato 16 cm' },
    { nome: 'Kit Pequena Cirurgia', descricao: 'Bandeja / Pinça Pozzi / Pinça Cheron / Pinça Backhaus / Pinça Allis / Cabo de bisturi / 2 Afastadores Farabeuf / Pinça dente de rato / Tesoura' },
    { nome: 'Kit Parto', descricao: 'Tesoura Mayo reta 16 cm / Pinça Hemostática reta 16 cm / Cuba rim / Porta-agulha / Pinça Pean ou Coração' },
    { nome: 'Kit Traqueostomia', descricao: 'Circuito alto e infantil' },
  ];

  const [formControleMat, setFormControleMat] = useState({
    data: new Date().toISOString().split('T')[0], kit: '', descricaoItens: '',
    qtdSaidaEsterilizacao: '', qtdRetornoEsterilizacao: '', totalEstoqueCME: '',
    responsavel: '', observacoes: '',
  });


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
    outra: '', outraQuantidade: 0, enfermagem: '',
  });
  const [formDesinfeccao, setFormDesinfeccao] = useState({
    data: new Date().toISOString().split('T')[0],
    metodo: 'Água / Sabão / Fricção Mecânica',
    quantidade: 'UT',
    validade: '',
    responsavel: '',
    coren: '',
  });
  const [formAlmotolia, setFormAlmotolia] = useState({
    produto: 'Álcool 70%', dataFracionar: new Date().toISOString().split('T')[0],
    quantidade: 1, setor: '', lote: '', validade: '', observacao: '', responsavel: '',
  });
  const emptyDiluicaoItem = (): ItemDiluicao => ({ solucao: '', volume: '', lote: '', validade: '' });
  const [formDiluicao, setFormDiluicao] = useState({
    categoria: 'respiratorio' as 'respiratorio' | 'cirurgico',
    itens: [emptyDiluicaoItem(), emptyDiluicaoItem(), emptyDiluicaoItem()],
    data: new Date().toISOString().split('T')[0],
    horario: '',
    responsavel: '',
  });
  const [formOlivas, setFormOlivas] = useState({
    dataDesinfeccao: new Date().toISOString().split('T')[0],
    tipoMaterial: '', validade: '', metodo: 'S/ Condição de uso',
    quantidade: '', responsavel: '', coren: '',
  });
  const [formConferencia, setFormConferencia] = useState({
    data: new Date().toISOString().split('T')[0], setor: '',
    materiaisRespiratorios: false, materiaisCirurgicos: false,
    inconformidade: false, inconformidadeDescricao: '', responsavel: '', coren: '',
  });
  const [formDanificado, setFormDanificado] = useState({
    material: '', setor: '', data: new Date().toISOString().split('T')[0],
    motivo: '', conduta: '', reposicao: '', responsavel: '',
  });
  const [formSolicitacao, setFormSolicitacao] = useState({
    data: new Date().toISOString().split('T')[0], setor: '', centroCusto: 'Enfermagem',
    material: '', quantidade: '', solicitante: '', observacao: '',
  });

  const itensSuja = itens.filter(i => (ETAPAS_SUJA as readonly string[]).includes(i.etapa));
  const itensLimpa = itens.filter(i => (ETAPAS_LIMPA as readonly string[]).includes(i.etapa));

  // === Handlers ===

  const handleAdd = () => {
    if (!form.descricao || !form.responsavel) { toast.error('Descrição e responsável são obrigatórios'); return; }
    const now = new Date();
    const novo: ItemCME = {
      id: crypto.randomUUID(), ...form,
      dataRegistro: now.toISOString().split('T')[0],
      horaRegistro: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };
    setItens([novo, ...itens]);
    setForm({ descricao: '', tipo: 'Instrumental Cirúrgico', quantidade: 1, setor_destino: '', etapa: 'recebimento', responsavel: '', lote: '', observacoes: '' });
    setDialogOpen(false);
    toast.success('Item registrado na CME');
  };

  const handleAddDevolucao = () => {
    if (!formDev.material || !formDev.setor || !formDev.assinatura) { toast.error('Material, setor e assinatura são obrigatórios'); return; }
    const novo: DevolucaoMaterial = { id: crypto.randomUUID(), ...formDev, dataRegistro: new Date().toLocaleString('pt-BR') };
    setDevolucoes([novo, ...devolucoes]);
    setFormDev({ material: '', setor: '', centroCusto: '', data: new Date().toISOString().split('T')[0], quantidade: 1, tempoEmersaoInicio: '', tempoEmersaoFim: '', assinatura: '', observacao: '' });
    setDialogDevOpen(false);
    toast.success('Devolução registrada com sucesso');
  };

  const handleAddPincas = () => {
    if (!formPincas.enfermagem) { toast.error('Enfermagem (assinatura) é obrigatória'); return; }
    const checkedPincas = formPincas.pincas.filter(p => p.checked && p.quantidade > 0);
    const totalPincas = checkedPincas.reduce((s, p) => s + p.quantidade, 0) + (formPincas.outra ? formPincas.outraQuantidade : 0);
    if (totalPincas === 0) { toast.error('Selecione ao menos uma pinça com quantidade'); return; }
    const novo: RegistroPincas = {
      id: crypto.randomUUID(), data: formPincas.data, pincas: checkedPincas,
      outra: formPincas.outra, outraQuantidade: formPincas.outra ? formPincas.outraQuantidade : 0,
      total: totalPincas, enfermagem: formPincas.enfermagem, dataRegistro: new Date().toLocaleString('pt-BR'),
    };
    setPincasRegistros([novo, ...pincasRegistros]);
    setFormPincas({ data: new Date().toISOString().split('T')[0], pincas: TIPOS_PINCA.map(t => ({ tipo: t, quantidade: 0, checked: false })), outra: '', outraQuantidade: 0, enfermagem: '' });
    setDialogPincasOpen(false);
    toast.success('Registro de pinças salvo');
  };

  const handleAddAlmotolia = () => {
    if (!formAlmotolia.produto || !formAlmotolia.setor || !formAlmotolia.responsavel) { toast.error('Produto, setor e responsável são obrigatórios'); return; }
    const novo: RegistroAlmotolia = { id: crypto.randomUUID(), ...formAlmotolia, dataRegistro: new Date().toLocaleString('pt-BR') };
    setAlmotolias([novo, ...almotolias]);
    setFormAlmotolia({ produto: 'Álcool 70%', dataFracionar: new Date().toISOString().split('T')[0], quantidade: 1, setor: '', lote: '', validade: '', observacao: '', responsavel: '' });
    setDialogAlmotoliaOpen(false);
    toast.success('Fracionamento registrado com sucesso');
  };

  const handleAddDesinfeccao = () => {
    if (!formDesinfeccao.responsavel || !formDesinfeccao.metodo) { toast.error('Responsável e método são obrigatórios'); return; }
    const novo: RegistroDesinfeccao = { id: crypto.randomUUID(), ...formDesinfeccao, dataRegistro: new Date().toLocaleString('pt-BR') };
    setDesinfeccoes([novo, ...desinfeccoes]);
    setFormDesinfeccao({ data: new Date().toISOString().split('T')[0], metodo: 'Água / Sabão / Fricção Mecânica', quantidade: 'UT', validade: '', responsavel: '', coren: '' });
    setDialogDesinfeccaoOpen(false);
    toast.success('Desinfecção registrada com sucesso');
  };

  const handleAddDiluicao = () => {
    if (!formDiluicao.responsavel) { toast.error('Responsável é obrigatório'); return; }
    const itensPreenchidos = formDiluicao.itens.filter(i => i.solucao.trim());
    if (itensPreenchidos.length === 0) { toast.error('Preencha ao menos uma solução'); return; }
    const novo: RegistroDiluicao = {
      id: crypto.randomUUID(), categoria: formDiluicao.categoria, itens: itensPreenchidos,
      data: formDiluicao.data, horario: formDiluicao.horario, responsavel: formDiluicao.responsavel,
      dataRegistro: new Date().toLocaleString('pt-BR'),
    };
    setDiluicoes([novo, ...diluicoes]);
    setFormDiluicao({ categoria: 'respiratorio', itens: [emptyDiluicaoItem(), emptyDiluicaoItem(), emptyDiluicaoItem()], data: new Date().toISOString().split('T')[0], horario: '', responsavel: '' });
    setDialogDiluicaoOpen(false);
    toast.success('Diluição registrada com sucesso');
  };

  const handleAddOlivas = () => {
    if (!formOlivas.responsavel || !formOlivas.tipoMaterial) { toast.error('Tipo de material e responsável são obrigatórios'); return; }
    const novo: RegistroOlivas = { id: crypto.randomUUID(), ...formOlivas, dataRegistro: new Date().toLocaleString('pt-BR') };
    setOlivas([novo, ...olivas]);
    setFormOlivas({ dataDesinfeccao: new Date().toISOString().split('T')[0], tipoMaterial: '', validade: '', metodo: 'S/ Condição de uso', quantidade: '', responsavel: '', coren: '' });
    setDialogOlivasOpen(false);
    toast.success('Desinfecção de olivas registrada');
  };

  const handleAddConferencia = () => {
    if (!formConferencia.setor || !formConferencia.responsavel) { toast.error('Setor e responsável são obrigatórios'); return; }
    if (!formConferencia.materiaisRespiratorios && !formConferencia.materiaisCirurgicos) { toast.error('Selecione ao menos um tipo de material'); return; }
    const novo: RegistroConferencia = { id: crypto.randomUUID(), ...formConferencia, dataRegistro: new Date().toLocaleString('pt-BR') };
    setConferencias([novo, ...conferencias]);
    setFormConferencia({ data: new Date().toISOString().split('T')[0], setor: '', materiaisRespiratorios: false, materiaisCirurgicos: false, inconformidade: false, inconformidadeDescricao: '', responsavel: '', coren: '' });
    setDialogConferenciaOpen(false);
    toast.success('Conferência registrada com sucesso');
  };

  const handleAddDanificado = () => {
    if (!formDanificado.material || !formDanificado.setor || !formDanificado.responsavel) { toast.error('Material, setor e responsável são obrigatórios'); return; }
    const novo: RegistroDanificado = { id: crypto.randomUUID(), ...formDanificado, dataRegistro: new Date().toLocaleString('pt-BR') };
    setDanificados([novo, ...danificados]);
    setFormDanificado({ material: '', setor: '', data: new Date().toISOString().split('T')[0], motivo: '', conduta: '', reposicao: '', responsavel: '' });
    setDialogDanificadoOpen(false);
    toast.success('Material danificado registrado');
  };

  const handleAddSolicitacao = () => {
    if (!formSolicitacao.material || !formSolicitacao.setor || !formSolicitacao.solicitante) { toast.error('Material, setor e solicitante são obrigatórios'); return; }
    const novo: SolicitacaoMaterial = { id: crypto.randomUUID(), ...formSolicitacao, dataRegistro: new Date().toLocaleString('pt-BR') };
    setSolicitacoes([novo, ...solicitacoes]);
    setFormSolicitacao({ data: new Date().toISOString().split('T')[0], setor: '', centroCusto: 'Enfermagem', material: '', quantidade: '', solicitante: '', observacao: '' });
    setDialogSolicitacaoOpen(false);
    toast.success('Solicitação registrada');
  };

  const avancarEtapa = (id: string) => {
    const ordem: ItemCME['etapa'][] = ['recebimento', 'lavagem', 'secagem', 'preparo', 'esterilizacao', 'armazenamento', 'distribuicao'];
    setItens(prev => prev.map(i => {
      if (i.id !== id) return i;
      const idx = ordem.indexOf(i.etapa);
      if (idx < ordem.length - 1) return { ...i, etapa: ordem[idx + 1] };
      return i;
    }));
    toast.success('Item avançado para próxima etapa');
  };

  // === Render helpers ===

  const renderTabela = (items: ItemCME[], area: string) => {
    const filtrados = items.filter(i =>
      i.descricao.toLowerCase().includes(busca.toLowerCase()) ||
      i.tipo.toLowerCase().includes(busca.toLowerCase())
    );
    return (
      <div className="rounded-md border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Material</TableHead><TableHead>Tipo</TableHead><TableHead>Qtd</TableHead>
              <TableHead>Etapa</TableHead><TableHead>Lote</TableHead><TableHead>Data/Hora</TableHead>
              <TableHead>Responsável</TableHead><TableHead>Ações</TableHead>
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
    );
  };

  const devFiltradas = devolucoes.filter(d =>
    d.material.toLowerCase().includes(buscaDev.toLowerCase()) || d.setor.toLowerCase().includes(buscaDev.toLowerCase())
  );
  const almotoliasFiltradas = almotolias.filter(a =>
    a.produto.toLowerCase().includes(buscaAlmotolia.toLowerCase()) || a.setor.toLowerCase().includes(buscaAlmotolia.toLowerCase()) || a.responsavel.toLowerCase().includes(buscaAlmotolia.toLowerCase())
  );
  const desinfeccoesFiltradas = desinfeccoes.filter(d =>
    d.metodo.toLowerCase().includes(buscaDesinfeccao.toLowerCase()) || d.responsavel.toLowerCase().includes(buscaDesinfeccao.toLowerCase())
  );
  const diluicoesFiltradas = diluicoes.filter(d =>
    d.responsavel.toLowerCase().includes(buscaDiluicao.toLowerCase()) || d.itens.some(i => i.solucao.toLowerCase().includes(buscaDiluicao.toLowerCase()))
  );
  const olivasFiltradas = olivas.filter(o =>
    o.tipoMaterial.toLowerCase().includes(buscaOlivas.toLowerCase()) || o.responsavel.toLowerCase().includes(buscaOlivas.toLowerCase())
  );
  const danificadosFiltrados = danificados.filter(d =>
    d.material.toLowerCase().includes(buscaDanificado.toLowerCase()) || d.responsavel.toLowerCase().includes(buscaDanificado.toLowerCase()) || d.setor.toLowerCase().includes(buscaDanificado.toLowerCase())
  );
  const solicitacoesFiltradas = solicitacoes.filter(s =>
    s.material.toLowerCase().includes(buscaSolicitacao.toLowerCase()) || s.setor.toLowerCase().includes(buscaSolicitacao.toLowerCase()) || s.solicitante.toLowerCase().includes(buscaSolicitacao.toLowerCase())
  );
  const controleMatFiltrados = controleMateriais.filter(c =>
    c.kit.toLowerCase().includes(buscaControleMat.toLowerCase()) || c.responsavel.toLowerCase().includes(buscaControleMat.toLowerCase())
  );

  const getBusca = () => {
    if (tab === 'devolucao') return buscaDev;
    if (tab === 'pincas') return buscaPincas;
    if (tab === 'almotolias') return buscaAlmotolia;
    if (tab === 'desinfeccao') return buscaDesinfeccao;
    if (tab === 'diluicao') return buscaDiluicao;
    if (tab === 'olivas') return buscaOlivas;
    if (tab === 'conferencia') return buscaConferencia;
    if (tab === 'danificados') return buscaDanificado;
    if (tab === 'solicitacao') return buscaSolicitacao;
    if (tab === 'controle-material') return buscaControleMat;
    return busca;
  };
  const setBuscaAtual = (v: string) => {
    if (tab === 'devolucao') setBuscaDev(v);
    else if (tab === 'pincas') setBuscaPincas(v);
    else if (tab === 'almotolias') setBuscaAlmotolia(v);
    else if (tab === 'desinfeccao') setBuscaDesinfeccao(v);
    else if (tab === 'diluicao') setBuscaDiluicao(v);
    else if (tab === 'olivas') setBuscaOlivas(v);
    else if (tab === 'conferencia') setBuscaConferencia(v);
    else if (tab === 'danificados') setBuscaDanificado(v);
    else if (tab === 'solicitacao') setBuscaSolicitacao(v);
    else if (tab === 'controle-material') setBuscaControleMat(v);
    else setBusca(v);
  };

  // === Render action button ===
  const renderActionButton = () => {
    if (tab === 'controle-material') return (
      <Dialog open={dialogControleMatOpen} onOpenChange={setDialogControleMatOpen}>
        <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Registrar Controle</Button></DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Controle de Material — Kits CME</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Data</Label><Input type="date" value={formControleMat.data} onChange={e => setFormControleMat(p => ({ ...p, data: e.target.value }))} /></div>
              <div><Label>Kit</Label>
                <Select value={formControleMat.kit} onValueChange={v => {
                  const kit = KITS_CME.find(k => k.nome === v);
                  setFormControleMat(p => ({ ...p, kit: v, descricaoItens: kit?.descricao || '' }));
                }}>
                  <SelectTrigger><SelectValue placeholder="Selecione o Kit" /></SelectTrigger>
                  <SelectContent>{KITS_CME.map(k => <SelectItem key={k.nome} value={k.nome}>{k.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            {formControleMat.descricaoItens && (
              <div className="p-2 bg-muted rounded text-xs text-muted-foreground"><strong>Itens:</strong> {formControleMat.descricaoItens}</div>
            )}
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Saída p/ Esterilização</Label><Input value={formControleMat.qtdSaidaEsterilizacao} onChange={e => setFormControleMat(p => ({ ...p, qtdSaidaEsterilizacao: e.target.value }))} placeholder="Qtd" /></div>
              <div><Label>Retorno Esterilização</Label><Input value={formControleMat.qtdRetornoEsterilizacao} onChange={e => setFormControleMat(p => ({ ...p, qtdRetornoEsterilizacao: e.target.value }))} placeholder="Qtd" /></div>
              <div><Label>Total Estoque (CME)</Label><Input value={formControleMat.totalEstoqueCME} onChange={e => setFormControleMat(p => ({ ...p, totalEstoqueCME: e.target.value }))} placeholder="Qtd" /></div>
            </div>
            <div><Label>Responsável</Label><Input value={formControleMat.responsavel} onChange={e => setFormControleMat(p => ({ ...p, responsavel: e.target.value }))} /></div>
            <div><Label>Observações</Label><Textarea value={formControleMat.observacoes} onChange={e => setFormControleMat(p => ({ ...p, observacoes: e.target.value }))} rows={2} /></div>
            <Button onClick={handleAddControleMat} className="w-full"><CheckCircle2 className="h-4 w-4 mr-2" />Registrar</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
    if (tab === 'solicitacao') return (
      <Dialog open={dialogSolicitacaoOpen} onOpenChange={setDialogSolicitacaoOpen}>
        <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Nova Solicitação</Button></DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Controle de Solicitação de Material</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Data</Label><Input type="date" value={formSolicitacao.data} onChange={e => setFormSolicitacao(p => ({ ...p, data: e.target.value }))} /></div>
              <div><Label>Setor</Label>
                <Select value={formSolicitacao.setor} onValueChange={v => setFormSolicitacao(p => ({ ...p, setor: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{SETORES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Centro de Custo</Label>
                <Select value={formSolicitacao.centroCusto} onValueChange={v => setFormSolicitacao(p => ({ ...p, centroCusto: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Enfermagem">Enfermagem</SelectItem>
                    <SelectItem value="Médico">Médico</SelectItem>
                    <SelectItem value="Administrativo">Administrativo</SelectItem>
                    <SelectItem value="Manutenção">Manutenção</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Quantidade</Label><Input value={formSolicitacao.quantidade} onChange={e => setFormSolicitacao(p => ({ ...p, quantidade: e.target.value }))} placeholder="Ex: 10" /></div>
            </div>
            <div><Label>Material</Label><Input value={formSolicitacao.material} onChange={e => setFormSolicitacao(p => ({ ...p, material: e.target.value }))} placeholder="Ex: Ambu, Máscara, Luva..." /></div>
            <div><Label>Solicitante (Assinatura)</Label><Input value={formSolicitacao.solicitante} onChange={e => setFormSolicitacao(p => ({ ...p, solicitante: e.target.value }))} /></div>
            <div><Label>Observação</Label><Textarea value={formSolicitacao.observacao} onChange={e => setFormSolicitacao(p => ({ ...p, observacao: e.target.value }))} rows={2} /></div>
            <Button onClick={handleAddSolicitacao} className="w-full"><CheckCircle2 className="h-4 w-4 mr-2" />Registrar Solicitação</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
    if (tab === 'danificados') return (
      <Dialog open={dialogDanificadoOpen} onOpenChange={setDialogDanificadoOpen}>
        <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Registrar Material Danificado</Button></DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Controle de Materiais Danificados</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Material</Label><Input value={formDanificado.material} onChange={e => setFormDanificado(p => ({ ...p, material: e.target.value }))} placeholder="Ex: Traqueia, Ambu, Máscara" /></div>
              <div><Label>Setor</Label>
                <Select value={formDanificado.setor} onValueChange={v => setFormDanificado(p => ({ ...p, setor: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{SETORES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Data</Label><Input type="date" value={formDanificado.data} onChange={e => setFormDanificado(p => ({ ...p, data: e.target.value }))} /></div>
              <div><Label>Motivo</Label>
                <Select value={formDanificado.motivo} onValueChange={v => setFormDanificado(p => ({ ...p, motivo: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Estragado">Estragado</SelectItem>
                    <SelectItem value="Quebrado">Quebrado</SelectItem>
                    <SelectItem value="Desgastado">Desgastado</SelectItem>
                    <SelectItem value="Contaminado">Contaminado</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Conduta</Label><Input value={formDanificado.conduta} onChange={e => setFormDanificado(p => ({ ...p, conduta: e.target.value }))} placeholder="Ex: Comunicado RT" /></div>
              <div><Label>Reposição</Label>
                <Select value={formDanificado.reposicao} onValueChange={v => setFormDanificado(p => ({ ...p, reposicao: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sim">Sim</SelectItem>
                    <SelectItem value="Não">Não</SelectItem>
                    <SelectItem value="Pendente">Pendente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Responsável</Label><Input value={formDanificado.responsavel} onChange={e => setFormDanificado(p => ({ ...p, responsavel: e.target.value }))} /></div>
            <Button onClick={handleAddDanificado} className="w-full"><CheckCircle2 className="h-4 w-4 mr-2" />Registrar</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
    if (tab === 'conferencia') return (
      <Dialog open={dialogConferenciaOpen} onOpenChange={setDialogConferenciaOpen}>
        <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Registrar Conferência</Button></DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Conferência e Controle de Qualidade de Materiais Setoriais</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Data</Label><Input type="date" value={formConferencia.data} onChange={e => setFormConferencia(p => ({ ...p, data: e.target.value }))} /></div>
              <div><Label>Setor</Label>
                <Select value={formConferencia.setor} onValueChange={v => setFormConferencia(p => ({ ...p, setor: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{SETORES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="font-semibold">Material</Label>
              <div className="flex gap-4 mt-2">
                <div className="flex items-center gap-2">
                  <Checkbox checked={formConferencia.materiaisRespiratorios} onCheckedChange={v => setFormConferencia(p => ({ ...p, materiaisRespiratorios: !!v }))} id="mat-resp" />
                  <Label htmlFor="mat-resp" className="cursor-pointer text-sm">Materiais Respiratórios</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={formConferencia.materiaisCirurgicos} onCheckedChange={v => setFormConferencia(p => ({ ...p, materiaisCirurgicos: !!v }))} id="mat-cir" />
                  <Label htmlFor="mat-cir" className="cursor-pointer text-sm">Materiais Cirúrgicos</Label>
                </div>
              </div>
            </div>
            <div>
              <Label className="font-semibold">Inconformidade</Label>
              <div className="flex gap-4 mt-2">
                <div className="flex items-center gap-2">
                  <Checkbox checked={!formConferencia.inconformidade} onCheckedChange={() => setFormConferencia(p => ({ ...p, inconformidade: false, inconformidadeDescricao: '' }))} id="inc-nao" />
                  <Label htmlFor="inc-nao" className="cursor-pointer text-sm">Não</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={formConferencia.inconformidade} onCheckedChange={() => setFormConferencia(p => ({ ...p, inconformidade: true }))} id="inc-sim" />
                  <Label htmlFor="inc-sim" className="cursor-pointer text-sm">Sim</Label>
                </div>
              </div>
              {formConferencia.inconformidade && (
                <div className="mt-2"><Label>Qual?</Label><Input value={formConferencia.inconformidadeDescricao} onChange={e => setFormConferencia(p => ({ ...p, inconformidadeDescricao: e.target.value }))} placeholder="Descreva a inconformidade" /></div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Responsável</Label><Input value={formConferencia.responsavel} onChange={e => setFormConferencia(p => ({ ...p, responsavel: e.target.value }))} /></div>
              <div><Label>COREN</Label><Input value={formConferencia.coren} onChange={e => setFormConferencia(p => ({ ...p, coren: e.target.value }))} placeholder="Ex: MG 000.000 - TE" /></div>
            </div>
            <Button onClick={handleAddConferencia} className="w-full"><CheckCircle2 className="h-4 w-4 mr-2" />Registrar Conferência</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
    if (tab === 'olivas') return (
      <Dialog open={dialogOlivasOpen} onOpenChange={setDialogOlivasOpen}>
        <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Registrar Olivas</Button></DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Controle de Desinfecção de Olivas</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Data da Desinfecção</Label><Input type="date" value={formOlivas.dataDesinfeccao} onChange={e => setFormOlivas(p => ({ ...p, dataDesinfeccao: e.target.value }))} /></div>
              <div><Label>Tipo de Material</Label><Input value={formOlivas.tipoMaterial} onChange={e => setFormOlivas(p => ({ ...p, tipoMaterial: e.target.value }))} placeholder="Ex: Bravo / Soprano" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Validade</Label><Input type="date" value={formOlivas.validade} onChange={e => setFormOlivas(p => ({ ...p, validade: e.target.value }))} /></div>
              <div><Label>Método</Label><Input value={formOlivas.metodo} onChange={e => setFormOlivas(p => ({ ...p, metodo: e.target.value }))} placeholder="Ex: S/ Condição de uso" /></div>
            </div>
            <div><Label>Quantidade</Label><Input value={formOlivas.quantidade} onChange={e => setFormOlivas(p => ({ ...p, quantidade: e.target.value }))} placeholder="Ex: 02" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Responsável (Enfermagem)</Label><Input value={formOlivas.responsavel} onChange={e => setFormOlivas(p => ({ ...p, responsavel: e.target.value }))} /></div>
              <div><Label>COREN</Label><Input value={formOlivas.coren} onChange={e => setFormOlivas(p => ({ ...p, coren: e.target.value }))} placeholder="Ex: MG 000.000 - TE" /></div>
            </div>
            <Button onClick={handleAddOlivas} className="w-full"><CheckCircle2 className="h-4 w-4 mr-2" />Registrar Desinfecção</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
    if (tab === 'diluicao') return (
      <Dialog open={dialogDiluicaoOpen} onOpenChange={setDialogDiluicaoOpen}>
        <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Registrar Diluição</Button></DialogTrigger>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Controle e Preparo da Diluição</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Categoria</Label>
              <Select value={formDiluicao.categoria} onValueChange={v => setFormDiluicao(p => ({ ...p, categoria: v as 'respiratorio' | 'cirurgico' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="respiratorio">Materiais Respiratórios</SelectItem>
                  <SelectItem value="cirurgico">Materiais Cirúrgicos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">Soluções</Label>
              {formDiluicao.itens.map((item, idx) => (
                <div key={idx} className="grid grid-cols-4 gap-2 p-2 border rounded">
                  <Input placeholder="Solução" value={item.solucao} onChange={e => {
                    const updated = [...formDiluicao.itens]; updated[idx] = { ...updated[idx], solucao: e.target.value };
                    setFormDiluicao(p => ({ ...p, itens: updated }));
                  }} />
                  <Input placeholder="Volume" value={item.volume} onChange={e => {
                    const updated = [...formDiluicao.itens]; updated[idx] = { ...updated[idx], volume: e.target.value };
                    setFormDiluicao(p => ({ ...p, itens: updated }));
                  }} />
                  <Input placeholder="Lote" value={item.lote} onChange={e => {
                    const updated = [...formDiluicao.itens]; updated[idx] = { ...updated[idx], lote: e.target.value };
                    setFormDiluicao(p => ({ ...p, itens: updated }));
                  }} />
                  <Input type="date" placeholder="Validade" value={item.validade} onChange={e => {
                    const updated = [...formDiluicao.itens]; updated[idx] = { ...updated[idx], validade: e.target.value };
                    setFormDiluicao(p => ({ ...p, itens: updated }));
                  }} />
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setFormDiluicao(p => ({ ...p, itens: [...p.itens, emptyDiluicaoItem()] }))}>
                <Plus className="h-3 w-3 mr-1" />Adicionar linha
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Data</Label><Input type="date" value={formDiluicao.data} onChange={e => setFormDiluicao(p => ({ ...p, data: e.target.value }))} /></div>
              <div><Label>Horário</Label><Input type="time" value={formDiluicao.horario} onChange={e => setFormDiluicao(p => ({ ...p, horario: e.target.value }))} /></div>
            </div>
            <div><Label>Responsável</Label><Input value={formDiluicao.responsavel} onChange={e => setFormDiluicao(p => ({ ...p, responsavel: e.target.value }))} placeholder="Nome do responsável" /></div>
            <Button onClick={handleAddDiluicao} className="w-full"><CheckCircle2 className="h-4 w-4 mr-2" />Registrar Diluição</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
    if (tab === 'desinfeccao') return (
      <Dialog open={dialogDesinfeccaoOpen} onOpenChange={setDialogDesinfeccaoOpen}>
        <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Registrar Desinfecção</Button></DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Desinfecção e Envasamento de Almotolias</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Data</Label><Input type="date" value={formDesinfeccao.data} onChange={e => setFormDesinfeccao(p => ({ ...p, data: e.target.value }))} /></div>
            <div><Label>Método</Label>
              <Select value={formDesinfeccao.metodo} onValueChange={v => setFormDesinfeccao(p => ({ ...p, metodo: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{METODOS_DESINFECCAO.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Quantidade</Label><Input value={formDesinfeccao.quantidade} onChange={e => setFormDesinfeccao(p => ({ ...p, quantidade: e.target.value }))} placeholder="Ex: UT, 06" /></div>
              <div><Label>Validade</Label><Input type="date" value={formDesinfeccao.validade} onChange={e => setFormDesinfeccao(p => ({ ...p, validade: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Responsável</Label><Input value={formDesinfeccao.responsavel} onChange={e => setFormDesinfeccao(p => ({ ...p, responsavel: e.target.value }))} /></div>
              <div><Label>COREN</Label><Input value={formDesinfeccao.coren} onChange={e => setFormDesinfeccao(p => ({ ...p, coren: e.target.value }))} placeholder="Ex: MG 000.000.000 - TE" /></div>
            </div>
            <Button onClick={handleAddDesinfeccao} className="w-full"><CheckCircle2 className="h-4 w-4 mr-2" />Registrar Desinfecção</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
    if (tab === 'almotolias') return (
      <Dialog open={dialogAlmotoliaOpen} onOpenChange={setDialogAlmotoliaOpen}>
        <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Registrar Fracionamento</Button></DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Controle de Fracionamento e Envasamento de Almotolias</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Produto</Label>
              <Select value={formAlmotolia.produto} onValueChange={v => setFormAlmotolia(p => ({ ...p, produto: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PRODUTOS_ALMOTOLIA.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Data Fracionar</Label><Input type="date" value={formAlmotolia.dataFracionar} onChange={e => setFormAlmotolia(p => ({ ...p, dataFracionar: e.target.value }))} /></div>
              <div><Label>Quantidade</Label><Input type="number" min={1} value={formAlmotolia.quantidade} onChange={e => setFormAlmotolia(p => ({ ...p, quantidade: parseInt(e.target.value) || 1 }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Setor</Label>
                <Select value={formAlmotolia.setor} onValueChange={v => setFormAlmotolia(p => ({ ...p, setor: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{SETORES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Lote</Label><Input value={formAlmotolia.lote} onChange={e => setFormAlmotolia(p => ({ ...p, lote: e.target.value }))} /></div>
            </div>
            <div><Label>Validade</Label><Input type="date" value={formAlmotolia.validade} onChange={e => setFormAlmotolia(p => ({ ...p, validade: e.target.value }))} /></div>
            <div><Label>Responsável</Label><Input value={formAlmotolia.responsavel} onChange={e => setFormAlmotolia(p => ({ ...p, responsavel: e.target.value }))} /></div>
            <div><Label>Observação</Label><Textarea value={formAlmotolia.observacao} onChange={e => setFormAlmotolia(p => ({ ...p, observacao: e.target.value }))} rows={2} /></div>
            <Button onClick={handleAddAlmotolia} className="w-full"><CheckCircle2 className="h-4 w-4 mr-2" />Registrar Fracionamento</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
    if (tab === 'pincas') return (
      <Dialog open={dialogPincasOpen} onOpenChange={setDialogPincasOpen}>
        <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Registrar Pinças</Button></DialogTrigger>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Controle de Pinças — CME</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Data</Label><Input type="date" value={formPincas.data} onChange={e => setFormPincas(p => ({ ...p, data: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label className="font-semibold">Tipos de Pinça</Label>
              {formPincas.pincas.map((pinca, idx) => (
                <div key={pinca.tipo} className="flex items-center gap-3 p-2 border rounded">
                  <Checkbox checked={pinca.checked} onCheckedChange={v => {
                    const updated = [...formPincas.pincas]; updated[idx] = { ...updated[idx], checked: !!v };
                    setFormPincas(p => ({ ...p, pincas: updated }));
                  }} id={`pinca-${idx}`} />
                  <Label htmlFor={`pinca-${idx}`} className="flex-1 cursor-pointer text-sm">{pinca.tipo}</Label>
                  <Input type="number" min={0} className="w-20" placeholder="Qtd" value={pinca.quantidade || ''} onChange={e => {
                    const updated = [...formPincas.pincas]; updated[idx] = { ...updated[idx], quantidade: parseInt(e.target.value) || 0, checked: true };
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
    );
    if (tab === 'devolucao') return (
      <Dialog open={dialogDevOpen} onOpenChange={setDialogDevOpen}>
        <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Registrar Devolução</Button></DialogTrigger>
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
            <div><Label>Assinatura (Responsável)</Label><Input value={formDev.assinatura} onChange={e => setFormDev(p => ({ ...p, assinatura: e.target.value }))} placeholder="Nome do responsável" /></div>
            <div><Label>Observação</Label><Textarea value={formDev.observacao} onChange={e => setFormDev(p => ({ ...p, observacao: e.target.value }))} rows={2} /></div>
            <Button onClick={handleAddDevolucao} className="w-full"><CheckCircle2 className="h-4 w-4 mr-2" />Registrar Devolução</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
    return (
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Registrar Material</Button></DialogTrigger>
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
                  <SelectContent>{Object.entries(ETAPA_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
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
    );
  };

  // === Main Render ===
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
          <Input placeholder="Buscar..." value={getBusca()} onChange={e => setBuscaAtual(e.target.value)} className="pl-9" />
        </div>
        {renderActionButton()}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="area-suja" className="gap-1"><Droplets className="h-4 w-4" />Área Suja</TabsTrigger>
          <TabsTrigger value="area-limpa" className="gap-1"><Sparkles className="h-4 w-4" />Área Limpa</TabsTrigger>
          <TabsTrigger value="devolucao" className="gap-1"><RotateCcw className="h-4 w-4" />Devolução</TabsTrigger>
          <TabsTrigger value="pincas" className="gap-1"><Scissors className="h-4 w-4" />Pinças</TabsTrigger>
          <TabsTrigger value="almotolias" className="gap-1"><Beaker className="h-4 w-4" />Almotolias</TabsTrigger>
          <TabsTrigger value="desinfeccao" className="gap-1"><SprayCan className="h-4 w-4" />Desinfecção</TabsTrigger>
          <TabsTrigger value="diluicao" className="gap-1"><FlaskConical className="h-4 w-4" />Diluição</TabsTrigger>
          <TabsTrigger value="olivas" className="gap-1"><CircleDot className="h-4 w-4" />Olivas</TabsTrigger>
          <TabsTrigger value="conferencia" className="gap-1"><ClipboardCheck className="h-4 w-4" />Conferência</TabsTrigger>
          <TabsTrigger value="danificados" className="gap-1"><Ban className="h-4 w-4" />Danificados</TabsTrigger>
          <TabsTrigger value="solicitacao" className="gap-1"><ShoppingCart className="h-4 w-4" />Solicitação</TabsTrigger>
          <TabsTrigger value="controle-material" className="gap-1"><BoxSelect className="h-4 w-4" />Controle Material</TabsTrigger>
        </TabsList>

        <TabsContent value="area-suja" className="mt-4">{renderTabela(itensSuja, 'Área Suja')}</TabsContent>
        <TabsContent value="area-limpa" className="mt-4">{renderTabela(itensLimpa, 'Área Limpa')}</TabsContent>

        <TabsContent value="devolucao" className="mt-4">
          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Material</TableHead><TableHead>Setor</TableHead><TableHead>Centro de Custo</TableHead>
                <TableHead>Data</TableHead><TableHead>Qtd</TableHead><TableHead>Emersão (Início/Fim)</TableHead>
                <TableHead>Assinatura</TableHead><TableHead>Ações</TableHead>
              </TableRow></TableHeader>
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
                    <TableCell><Button size="sm" variant="ghost" onClick={() => setDetalhe(d)}><Eye className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="pincas" className="mt-4">
          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Data</TableHead><TableHead>Pinças</TableHead><TableHead>Total</TableHead>
                <TableHead>Enfermagem</TableHead><TableHead>Ações</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {pincasRegistros.filter(p => p.enfermagem.toLowerCase().includes(buscaPincas.toLowerCase()) || p.pincas.some(pi => pi.tipo.toLowerCase().includes(buscaPincas.toLowerCase()))).length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum registro de pinças</TableCell></TableRow>
                ) : pincasRegistros.filter(p => p.enfermagem.toLowerCase().includes(buscaPincas.toLowerCase()) || p.pincas.some(pi => pi.tipo.toLowerCase().includes(buscaPincas.toLowerCase()))).map(p => (
                  <TableRow key={p.id}>
                    <TableCell>{p.data}</TableCell>
                    <TableCell className="text-sm">{p.pincas.map(pi => `${pi.tipo} (${pi.quantidade})`).join(', ')}{p.outra ? `, ${p.outra} (${p.outraQuantidade})` : ''}</TableCell>
                    <TableCell><Badge variant="secondary" className="font-bold">{p.total}</Badge></TableCell>
                    <TableCell>{p.enfermagem}</TableCell>
                    <TableCell><Button size="sm" variant="ghost" onClick={() => setDetalhePinca(p)}><Eye className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="almotolias" className="mt-4">
          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Produto</TableHead><TableHead>Data Fracionar</TableHead><TableHead>Qtd</TableHead>
                <TableHead>Setor</TableHead><TableHead>Lote</TableHead><TableHead>Validade</TableHead>
                <TableHead>Responsável</TableHead><TableHead>Ações</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {almotoliasFiltradas.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhum fracionamento registrado</TableCell></TableRow>
                ) : almotoliasFiltradas.map(a => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.produto}</TableCell>
                    <TableCell>{a.dataFracionar}</TableCell>
                    <TableCell>{a.quantidade}</TableCell>
                    <TableCell>{a.setor}</TableCell>
                    <TableCell className="font-mono">{a.lote || '—'}</TableCell>
                    <TableCell>{a.validade || '—'}</TableCell>
                    <TableCell>{a.responsavel}</TableCell>
                    <TableCell><Button size="sm" variant="ghost" onClick={() => setDetalheAlmotolia(a)}><Eye className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="desinfeccao" className="mt-4">
          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Data</TableHead><TableHead>Método</TableHead><TableHead>Quantidade</TableHead>
                <TableHead>Validade</TableHead><TableHead>Responsável</TableHead><TableHead>COREN</TableHead><TableHead>Ações</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {desinfeccoesFiltradas.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhuma desinfecção registrada</TableCell></TableRow>
                ) : desinfeccoesFiltradas.map(d => (
                  <TableRow key={d.id}>
                    <TableCell>{d.data}</TableCell>
                    <TableCell className="font-medium">{d.metodo}</TableCell>
                    <TableCell>{d.quantidade}</TableCell>
                    <TableCell>{d.validade || '—'}</TableCell>
                    <TableCell>{d.responsavel}</TableCell>
                    <TableCell className="font-mono text-sm">{d.coren || '—'}</TableCell>
                    <TableCell><Button size="sm" variant="ghost" onClick={() => setDetalheDesinfeccao(d)}><Eye className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="diluicao" className="mt-4">
          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Data</TableHead><TableHead>Horário</TableHead><TableHead>Categoria</TableHead>
                <TableHead>Soluções</TableHead><TableHead>Responsável</TableHead><TableHead>Ações</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {diluicoesFiltradas.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma diluição registrada</TableCell></TableRow>
                ) : diluicoesFiltradas.map(d => (
                  <TableRow key={d.id}>
                    <TableCell>{d.data}</TableCell>
                    <TableCell>{d.horario || '—'}</TableCell>
                    <TableCell><Badge variant={d.categoria === 'respiratorio' ? 'default' : 'secondary'}>{d.categoria === 'respiratorio' ? 'Respiratório' : 'Cirúrgico'}</Badge></TableCell>
                    <TableCell className="text-sm">{d.itens.map(i => i.solucao).join(', ')}</TableCell>
                    <TableCell>{d.responsavel}</TableCell>
                    <TableCell><Button size="sm" variant="ghost" onClick={() => setDetalheDiluicao(d)}><Eye className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="olivas" className="mt-4">
          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Data Desinf.</TableHead><TableHead>Tipo Material</TableHead><TableHead>Validade</TableHead>
                <TableHead>Método</TableHead><TableHead>Qtd</TableHead><TableHead>Responsável</TableHead><TableHead>COREN</TableHead><TableHead>Ações</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {olivasFiltradas.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhuma desinfecção de olivas registrada</TableCell></TableRow>
                ) : olivasFiltradas.map(o => (
                  <TableRow key={o.id}>
                    <TableCell>{o.dataDesinfeccao}</TableCell>
                    <TableCell className="font-medium">{o.tipoMaterial}</TableCell>
                    <TableCell>{o.validade || '—'}</TableCell>
                    <TableCell>{o.metodo}</TableCell>
                    <TableCell>{o.quantidade}</TableCell>
                    <TableCell>{o.responsavel}</TableCell>
                    <TableCell className="font-mono text-sm">{o.coren || '—'}</TableCell>
                    <TableCell><Button size="sm" variant="ghost" onClick={() => setDetalheOliva(o)}><Eye className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="conferencia" className="mt-4">
          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Data</TableHead><TableHead>Setor</TableHead><TableHead>Material</TableHead>
                <TableHead>Inconformidade</TableHead><TableHead>Responsável</TableHead><TableHead>COREN</TableHead><TableHead>Ações</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {conferenciasFiltradas.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhuma conferência registrada</TableCell></TableRow>
                ) : conferenciasFiltradas.map(c => (
                  <TableRow key={c.id}>
                    <TableCell>{c.data}</TableCell>
                    <TableCell className="font-medium">{c.setor}</TableCell>
                    <TableCell className="text-sm">{[c.materiaisRespiratorios && 'Respiratórios', c.materiaisCirurgicos && 'Cirúrgicos'].filter(Boolean).join(', ')}</TableCell>
                    <TableCell>
                      <Badge variant={c.inconformidade ? 'destructive' : 'default'}>{c.inconformidade ? 'Sim' : 'Não'}</Badge>
                      {c.inconformidade && c.inconformidadeDescricao && <span className="text-xs text-muted-foreground ml-1">({c.inconformidadeDescricao})</span>}
                    </TableCell>
                    <TableCell>{c.responsavel}</TableCell>
                    <TableCell className="font-mono text-sm">{c.coren || '—'}</TableCell>
                    <TableCell><Button size="sm" variant="ghost" onClick={() => setDetalheConferencia(c)}><Eye className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="danificados" className="mt-4">
          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Material</TableHead><TableHead>Setor</TableHead><TableHead>Data</TableHead>
                <TableHead>Motivo</TableHead><TableHead>Conduta</TableHead><TableHead>Reposição</TableHead><TableHead>Responsável</TableHead><TableHead>Ações</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {danificadosFiltrados.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhum material danificado registrado</TableCell></TableRow>
                ) : danificadosFiltrados.map(d => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.material}</TableCell>
                    <TableCell>{d.setor}</TableCell>
                    <TableCell>{d.data}</TableCell>
                    <TableCell><Badge variant="outline">{d.motivo || '—'}</Badge></TableCell>
                    <TableCell>{d.conduta || '—'}</TableCell>
                    <TableCell><Badge variant={d.reposicao === 'Sim' ? 'default' : d.reposicao === 'Pendente' ? 'secondary' : 'destructive'}>{d.reposicao || '—'}</Badge></TableCell>
                    <TableCell>{d.responsavel}</TableCell>
                    <TableCell><Button size="sm" variant="ghost" onClick={() => setDetalheDanificado(d)}><Eye className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="solicitacao" className="mt-4">
          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Data</TableHead><TableHead>Setor</TableHead><TableHead>Centro Custo</TableHead>
                <TableHead>Material</TableHead><TableHead>Qtd</TableHead><TableHead>Solicitante</TableHead><TableHead>Obs</TableHead><TableHead>Ações</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {solicitacoesFiltradas.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhuma solicitação registrada</TableCell></TableRow>
                ) : solicitacoesFiltradas.map(s => (
                  <TableRow key={s.id}>
                    <TableCell>{s.data}</TableCell>
                    <TableCell className="font-medium">{s.setor}</TableCell>
                    <TableCell><Badge variant="outline">{s.centroCusto}</Badge></TableCell>
                    <TableCell>{s.material}</TableCell>
                    <TableCell>{s.quantidade || '—'}</TableCell>
                    <TableCell>{s.solicitante}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">{s.observacao || '—'}</TableCell>
                    <TableCell><Button size="sm" variant="ghost" onClick={() => setDetalheSolicitacao(s)}><Eye className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog detalhe pinças */}
      <Dialog open={!!detalhePinca} onOpenChange={() => setDetalhePinca(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Detalhes — Registro de Pinças</DialogTitle></DialogHeader>
          {detalhePinca && (
            <div className="space-y-2 text-sm">
              <div><span className="text-muted-foreground">Data:</span> <strong>{detalhePinca.data}</strong></div>
              <div className="space-y-1">
                {detalhePinca.pincas.map((p, i) => (
                  <div key={i} className="flex justify-between border-b pb-1">
                    <span>{p.tipo}</span><Badge variant="outline">{p.quantidade}</Badge>
                  </div>
                ))}
                {detalhePinca.outra && (
                  <div className="flex justify-between border-b pb-1">
                    <span>Outra: {detalhePinca.outra}</span><Badge variant="outline">{detalhePinca.outraQuantidade}</Badge>
                  </div>
                )}
              </div>
              <div className="flex justify-between font-semibold pt-1"><span>Total</span><span>{detalhePinca.total}</span></div>
              <div><span className="text-muted-foreground">Enfermagem:</span> {detalhePinca.enfermagem}</div>
              <p className="text-xs text-muted-foreground pt-2">Registrado em: {detalhePinca.dataRegistro}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

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

      {/* Dialog detalhe almotolia */}
      <Dialog open={!!detalheAlmotolia} onOpenChange={() => setDetalheAlmotolia(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Detalhes — Fracionamento de Almotolia</DialogTitle></DialogHeader>
          {detalheAlmotolia && (
            <div className="space-y-2 text-sm">
              <div><span className="text-muted-foreground">Produto:</span> <strong>{detalheAlmotolia.produto}</strong></div>
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Data Fracionar:</span> {detalheAlmotolia.dataFracionar}</div>
                <div><span className="text-muted-foreground">Quantidade:</span> {detalheAlmotolia.quantidade}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Setor:</span> {detalheAlmotolia.setor}</div>
                <div><span className="text-muted-foreground">Lote:</span> {detalheAlmotolia.lote || '—'}</div>
              </div>
              <div><span className="text-muted-foreground">Validade:</span> {detalheAlmotolia.validade || '—'}</div>
              <div><span className="text-muted-foreground">Responsável:</span> {detalheAlmotolia.responsavel}</div>
              {detalheAlmotolia.observacao && <div><span className="text-muted-foreground">Observação:</span> {detalheAlmotolia.observacao}</div>}
              <p className="text-xs text-muted-foreground pt-2">Registrado em: {detalheAlmotolia.dataRegistro}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog detalhe desinfecção */}
      <Dialog open={!!detalheDesinfeccao} onOpenChange={() => setDetalheDesinfeccao(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Detalhes — Desinfecção de Almotolia</DialogTitle></DialogHeader>
          {detalheDesinfeccao && (
            <div className="space-y-2 text-sm">
              <div><span className="text-muted-foreground">Data:</span> <strong>{detalheDesinfeccao.data}</strong></div>
              <div><span className="text-muted-foreground">Método:</span> {detalheDesinfeccao.metodo}</div>
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Quantidade:</span> {detalheDesinfeccao.quantidade}</div>
                <div><span className="text-muted-foreground">Validade:</span> {detalheDesinfeccao.validade || '—'}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Responsável:</span> {detalheDesinfeccao.responsavel}</div>
                <div><span className="text-muted-foreground">COREN:</span> {detalheDesinfeccao.coren || '—'}</div>
              </div>
              <p className="text-xs text-muted-foreground pt-2">Registrado em: {detalheDesinfeccao.dataRegistro}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog detalhe diluição */}
      <Dialog open={!!detalheDiluicao} onOpenChange={() => setDetalheDiluicao(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Detalhes — Preparo da Diluição</DialogTitle></DialogHeader>
          {detalheDiluicao && (
            <div className="space-y-2 text-sm">
              <div className="flex gap-4">
                <div><span className="text-muted-foreground">Data:</span> <strong>{detalheDiluicao.data}</strong></div>
                <div><span className="text-muted-foreground">Horário:</span> {detalheDiluicao.horario || '—'}</div>
              </div>
              <div><span className="text-muted-foreground">Categoria:</span> <Badge variant={detalheDiluicao.categoria === 'respiratorio' ? 'default' : 'secondary'}>{detalheDiluicao.categoria === 'respiratorio' ? 'Materiais Respiratórios' : 'Materiais Cirúrgicos'}</Badge></div>
              <div className="space-y-1 pt-1">
                <p className="font-semibold text-xs text-muted-foreground uppercase">Soluções</p>
                {detalheDiluicao.itens.map((item, i) => (
                  <div key={i} className="grid grid-cols-4 gap-2 border-b pb-1">
                    <span><strong>{item.solucao}</strong></span>
                    <span>Vol: {item.volume || '—'}</span>
                    <span>Lote: {item.lote || '—'}</span>
                    <span>Val: {item.validade || '—'}</span>
                  </div>
                ))}
              </div>
              <div><span className="text-muted-foreground">Responsável:</span> {detalheDiluicao.responsavel}</div>
              <p className="text-xs text-muted-foreground pt-2">Registrado em: {detalheDiluicao.dataRegistro}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog detalhe olivas */}
      <Dialog open={!!detalheOliva} onOpenChange={() => setDetalheOliva(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Detalhes — Desinfecção de Olivas</DialogTitle></DialogHeader>
          {detalheOliva && (
            <div className="space-y-2 text-sm">
              <div><span className="text-muted-foreground">Data Desinfecção:</span> <strong>{detalheOliva.dataDesinfeccao}</strong></div>
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Tipo Material:</span> {detalheOliva.tipoMaterial}</div>
                <div><span className="text-muted-foreground">Validade:</span> {detalheOliva.validade || '—'}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Método:</span> {detalheOliva.metodo}</div>
                <div><span className="text-muted-foreground">Quantidade:</span> {detalheOliva.quantidade}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Responsável:</span> {detalheOliva.responsavel}</div>
                <div><span className="text-muted-foreground">COREN:</span> {detalheOliva.coren || '—'}</div>
              </div>
              <p className="text-xs text-muted-foreground pt-2">Registrado em: {detalheOliva.dataRegistro}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog detalhe conferência */}
      <Dialog open={!!detalheConferencia} onOpenChange={() => setDetalheConferencia(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Detalhes — Conferência de Materiais Setoriais</DialogTitle></DialogHeader>
          {detalheConferencia && (
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Data:</span> <strong>{detalheConferencia.data}</strong></div>
                <div><span className="text-muted-foreground">Setor:</span> {detalheConferencia.setor}</div>
              </div>
              <div><span className="text-muted-foreground">Material:</span> {[detalheConferencia.materiaisRespiratorios && 'Materiais Respiratórios', detalheConferencia.materiaisCirurgicos && 'Materiais Cirúrgicos'].filter(Boolean).join(', ')}</div>
              <div>
                <span className="text-muted-foreground">Inconformidade:</span>{' '}
                <Badge variant={detalheConferencia.inconformidade ? 'destructive' : 'default'}>{detalheConferencia.inconformidade ? 'Sim' : 'Não'}</Badge>
                {detalheConferencia.inconformidade && detalheConferencia.inconformidadeDescricao && (
                  <p className="mt-1 text-sm">{detalheConferencia.inconformidadeDescricao}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Responsável:</span> {detalheConferencia.responsavel}</div>
                <div><span className="text-muted-foreground">COREN:</span> {detalheConferencia.coren || '—'}</div>
              </div>
              <p className="text-xs text-muted-foreground pt-2">Registrado em: {detalheConferencia.dataRegistro}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog detalhe danificado */}
      <Dialog open={!!detalheDanificado} onOpenChange={() => setDetalheDanificado(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Detalhes — Material Danificado</DialogTitle></DialogHeader>
          {detalheDanificado && (
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Material:</span> <strong>{detalheDanificado.material}</strong></div>
                <div><span className="text-muted-foreground">Setor:</span> {detalheDanificado.setor}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Data:</span> {detalheDanificado.data}</div>
                <div><span className="text-muted-foreground">Motivo:</span> <Badge variant="outline">{detalheDanificado.motivo || '—'}</Badge></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Conduta:</span> {detalheDanificado.conduta || '—'}</div>
                <div><span className="text-muted-foreground">Reposição:</span> <Badge variant={detalheDanificado.reposicao === 'Sim' ? 'default' : 'destructive'}>{detalheDanificado.reposicao || '—'}</Badge></div>
              </div>
              <div><span className="text-muted-foreground">Responsável:</span> {detalheDanificado.responsavel}</div>
              <p className="text-xs text-muted-foreground pt-2">Registrado em: {detalheDanificado.dataRegistro}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog detalhe solicitação */}
      <Dialog open={!!detalheSolicitacao} onOpenChange={() => setDetalheSolicitacao(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Detalhes — Solicitação de Material</DialogTitle></DialogHeader>
          {detalheSolicitacao && (
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Data:</span> <strong>{detalheSolicitacao.data}</strong></div>
                <div><span className="text-muted-foreground">Setor:</span> {detalheSolicitacao.setor}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Centro de Custo:</span> <Badge variant="outline">{detalheSolicitacao.centroCusto}</Badge></div>
                <div><span className="text-muted-foreground">Quantidade:</span> {detalheSolicitacao.quantidade || '—'}</div>
              </div>
              <div><span className="text-muted-foreground">Material:</span> {detalheSolicitacao.material}</div>
              <div><span className="text-muted-foreground">Solicitante:</span> {detalheSolicitacao.solicitante}</div>
              {detalheSolicitacao.observacao && <div><span className="text-muted-foreground">Observação:</span> {detalheSolicitacao.observacao}</div>}
              <p className="text-xs text-muted-foreground pt-2">Registrado em: {detalheSolicitacao.dataRegistro}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
