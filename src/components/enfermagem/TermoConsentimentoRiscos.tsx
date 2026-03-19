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
  ShieldCheck, Plus, Search, Eye, Clock, CheckCircle2, Users
} from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { toast } from 'sonner';
import { ExportDropdown } from '@/components/ui/export-dropdown';
import { exportToPDF, exportToExcel } from '@/lib/export-utils';

// ===== Conteúdo do termo baseado no formulário =====
const ORIENTACOES_RISCO_QUEDA = [
  'Não manipular o paciente sozinho, solicitar presença da enfermagem',
  'Usar calçados antiderrapantes',
  'Orientar o paciente a utilizar as barras de segurança no banheiro',
  'Acompanhar o paciente quando sair da cama, inclusive ao banheiro ou chamar a enfermagem',
  'Manter a área de circulação do paciente livre de obstáculos e seus pertences o mais próximo',
  'Manter as grades de proteção da cama e/ou berço sempre elevadas',
  'Não se levantar subitamente devido ao risco de hipotensão postural e tontura',
  'Conhecer os efeitos dos medicamentos em uso',
  'Não deixar o paciente sozinho',
  'Caso o paciente se encontre contido (amarrado) no leito, NÃO o solte — procedimento para segurança do paciente',
  'Cuidado ao segurar o bebê, principalmente ao andar no quarto',
  'Não deixar a criança sozinha',
  'Crianças não podem correr pelas dependências da unidade',
];

const ORIENTACOES_PELE = [
  'Monitorar se a enfermagem está realizando a Mudança de Decúbito e auxiliar sempre que necessário',
  'Evitar arrastar o paciente na cama ao movimentar',
  'Monitorar se os lençóis estão secos e sem dobras',
  'Manter os coxins para auxiliar na mudança de decúbito',
  'Evitar o contato direto das proeminências ósseas',
  'Encorajar o paciente a ingesta dietética de acordo com as orientações médicas',
];

const ORIENTACOES_NAO_CONFORMIDADE = [
  'Conferir os dados contidos na identificação sobre o leito e na pulseira de identificação do paciente',
  'Utilizar a pulseira durante todo o período de internação',
  'Certificar se a equipe multiprofissional faz a devida conferência do paciente antes da execução de qualquer procedimento',
];

const ORIENTACOES_ALERGIAS = [
  'Informar corretamente histórico de alergias',
  'Fazer uso apenas dos medicamentos administrados pela equipe de enfermagem',
];

const MOMENTOS_HIGIENE_MAOS = [
  '1. Antes de contato com um paciente',
  '2. Antes da realização de procedimentos assépticos',
  '3. Após risco de exposição a fluidos corporais',
  '4. Após contato com um paciente',
  '5. Após contato com as áreas próximas ao PACIENTE',
];

const ITENS_NECESSARIOS = [
  'Documentos (documento com foto, cartão SUS)',
  'Itens de higiene (sabonete, escova de dentes, roupas, etc)',
  'Receita de medicamentos de uso coletivo',
  'Traga apenas o necessário',
];

const PROIBIDO = [
  'Tirar foto, filmar ou gravar dentro da unidade',
  'Trazer qualquer tipo de alimento',
  'Transitar nos corredores ou nas enfermarias',
];

interface RegistroTermo {
  id: string;
  data: string;
  pacienteNome: string;
  dataNascimento: string;
  leito: string;
  riscoQuedaAceito: boolean;
  riscoPeleAceito: boolean;
  riscoIdentificacaoAceito: boolean;
  riscoAlergiasAceito: boolean;
  higieneMaosAceito: boolean;
  itensNecessariosAceito: boolean;
  proibidoAceito: boolean;
  nomeResponsavel: string;
  parentesco: string;
  telefoneContato: string;
  enfermeiroResponsavel: string;
  coren: string;
  observacoes: string;
  dataRegistro: string;
}

interface Props {
  storageKey: string;
  setor: string;
}

export function TermoConsentimentoRiscos({ storageKey, setor }: Props) {
  const [registros, setRegistros] = useLocalStorage<RegistroTermo[]>(storageKey, []);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detalhe, setDetalhe] = useState<RegistroTermo | null>(null);
  const [busca, setBusca] = useState('');

  const [form, setForm] = useState({
    data: new Date().toISOString().split('T')[0],
    pacienteNome: '', dataNascimento: '', leito: '',
    riscoQuedaAceito: false, riscoPeleAceito: false,
    riscoIdentificacaoAceito: false, riscoAlergiasAceito: false,
    higieneMaosAceito: false, itensNecessariosAceito: false, proibidoAceito: false,
    nomeResponsavel: '', parentesco: '', telefoneContato: '',
    enfermeiroResponsavel: '', coren: '', observacoes: '',
  });

  const f = (field: string, value: any) => setForm(p => ({ ...p, [field]: value }));
  const toggle = (field: string) => setForm(p => ({ ...p, [field]: !(p as any)[field] }));

  const todosAceitos = form.riscoQuedaAceito && form.riscoPeleAceito && form.riscoIdentificacaoAceito
    && form.riscoAlergiasAceito && form.higieneMaosAceito && form.itensNecessariosAceito && form.proibidoAceito;

  const handleSalvar = () => {
    if (!form.pacienteNome || !form.nomeResponsavel || !form.enfermeiroResponsavel) {
      toast.error('Paciente, responsável e enfermeiro são obrigatórios');
      return;
    }
    if (!todosAceitos) {
      toast.error('Todos os termos devem ser aceitos');
      return;
    }
    const novo: RegistroTermo = {
      ...form,
      id: crypto.randomUUID(),
      dataRegistro: new Date().toLocaleString('pt-BR'),
    };
    setRegistros([novo, ...registros]);
    setForm({
      data: new Date().toISOString().split('T')[0],
      pacienteNome: '', dataNascimento: '', leito: '',
      riscoQuedaAceito: false, riscoPeleAceito: false,
      riscoIdentificacaoAceito: false, riscoAlergiasAceito: false,
      higieneMaosAceito: false, itensNecessariosAceito: false, proibidoAceito: false,
      nomeResponsavel: '', parentesco: '', telefoneContato: '',
      enfermeiroResponsavel: '', coren: '', observacoes: '',
    });
    setDialogOpen(false);
    toast.success('Termo de consentimento registrado');
  };

  const filtrados = registros.filter(r =>
    r.pacienteNome.toLowerCase().includes(busca.toLowerCase()) ||
    r.leito.includes(busca) || r.data.includes(busca)
  );

  const SectionBlock = ({ titulo, itens, checkId, checked, onToggle }: {
    titulo: string; itens: string[]; checkId: string; checked: boolean; onToggle: () => void;
  }) => (
    <Card className={`transition-colors ${checked ? 'border-primary/40' : ''}`}>
      <CardContent className="p-4 space-y-2">
        <p className="font-semibold text-sm">{titulo}</p>
        <ul className="list-disc ml-5 space-y-1">
          {itens.map((item, i) => (
            <li key={i} className="text-sm text-muted-foreground">{item}</li>
          ))}
        </ul>
        <div className="flex items-center gap-2 pt-2 border-t">
          <Checkbox id={checkId} checked={checked} onCheckedChange={onToggle} />
          <Label htmlFor={checkId} className="text-sm cursor-pointer font-medium">
            Paciente/Acompanhante ciente e de acordo
          </Label>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Termo de Consentimento e Esclarecido — Riscos Assistenciais
        </h3>
        <p className="text-sm text-muted-foreground">{setor} — Núcleo de Segurança do Paciente</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <ShieldCheck className="h-8 w-8 text-primary opacity-70" />
          <div><p className="text-sm text-muted-foreground">Total Termos</p><p className="text-2xl font-bold">{registros.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Users className="h-8 w-8 text-primary opacity-70" />
          <div><p className="text-sm text-muted-foreground">Pacientes</p><p className="text-2xl font-bold">{new Set(registros.map(r => r.pacienteNome.toLowerCase())).size}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <CheckCircle2 className="h-8 w-8 text-primary opacity-70" />
          <div><p className="text-sm text-muted-foreground">Conformes</p><p className="text-2xl font-bold">{registros.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Clock className="h-8 w-8 text-primary opacity-70" />
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
            <Button><Plus className="h-4 w-4 mr-1" />Novo Termo</Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Termo de Consentimento — Riscos Assistenciais — {setor}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Estou ciente dos meus deveres como paciente e dos riscos assistenciais passíveis de ocorrência durante o período de internação e fui submetido(a) à avaliação e a orientação quanto as medidas para evitar a ocorrência dos mesmos durante a permanência na unidade.
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div><Label>Paciente</Label><Input value={form.pacienteNome} onChange={e => f('pacienteNome', e.target.value)} placeholder="Nome completo" /></div>
                <div><Label>Data Nasc.</Label><Input type="date" value={form.dataNascimento} onChange={e => f('dataNascimento', e.target.value)} /></div>
                <div><Label>Leito</Label><Input value={form.leito} onChange={e => f('leito', e.target.value)} /></div>
                <div><Label>Data</Label><Input type="date" value={form.data} onChange={e => f('data', e.target.value)} /></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SectionBlock titulo="Risco de Queda" itens={ORIENTACOES_RISCO_QUEDA} checkId="ck-queda" checked={form.riscoQuedaAceito} onToggle={() => toggle('riscoQuedaAceito')} />
                <SectionBlock titulo="Risco de Integridade da Pele Prejudicada" itens={ORIENTACOES_PELE} checkId="ck-pele" checked={form.riscoPeleAceito} onToggle={() => toggle('riscoPeleAceito')} />
                <SectionBlock titulo="Risco de Não Conformidade Relacionadas à Identificação do Paciente" itens={ORIENTACOES_NAO_CONFORMIDADE} checkId="ck-ident" checked={form.riscoIdentificacaoAceito} onToggle={() => toggle('riscoIdentificacaoAceito')} />
                <SectionBlock titulo="Alergias e Medicamentos" itens={ORIENTACOES_ALERGIAS} checkId="ck-alerg" checked={form.riscoAlergiasAceito} onToggle={() => toggle('riscoAlergiasAceito')} />
                <SectionBlock titulo="5 Momentos para Higienização das Mãos" itens={MOMENTOS_HIGIENE_MAOS} checkId="ck-maos" checked={form.higieneMaosAceito} onToggle={() => toggle('higieneMaosAceito')} />
                <SectionBlock titulo="Itens Necessários Durante a Internação" itens={ITENS_NECESSARIOS} checkId="ck-itens" checked={form.itensNecessariosAceito} onToggle={() => toggle('itensNecessariosAceito')} />
                <SectionBlock titulo="Proibido o Paciente/Acompanhante Fazer" itens={PROIBIDO} checkId="ck-proib" checked={form.proibidoAceito} onToggle={() => toggle('proibidoAceito')} />
              </div>

              <Card className="border-muted">
                <CardContent className="p-4 space-y-3">
                  <p className="font-semibold text-sm">Preenchimento do Paciente ou Acompanhante</p>
                  <p className="text-xs text-muted-foreground">Declaro que recebi as orientações relacionadas aos riscos e comprometo-me a seguir as instruções recebidas para contribuir e garantir uma assistência segura durante a internação.</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div><Label>Nome</Label><Input value={form.nomeResponsavel} onChange={e => f('nomeResponsavel', e.target.value)} /></div>
                    <div><Label>Parentesco</Label><Input value={form.parentesco} onChange={e => f('parentesco', e.target.value)} /></div>
                    <div><Label>Telefone de contato</Label><Input value={form.telefoneContato} onChange={e => f('telefoneContato', e.target.value)} /></div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-muted">
                <CardContent className="p-4 space-y-3">
                  <p className="font-semibold text-sm">Preenchimento Profissional de Enfermagem</p>
                  <p className="text-xs text-muted-foreground">Expliquei todas as orientações com relação aos riscos assistenciais durante o período de internação.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Enfermeiro(a)</Label><Input value={form.enfermeiroResponsavel} onChange={e => f('enfermeiroResponsavel', e.target.value)} /></div>
                    <div><Label>COREN</Label><Input value={form.coren} onChange={e => f('coren', e.target.value)} /></div>
                  </div>
                </CardContent>
              </Card>

              <div><Label>Observações</Label><Textarea value={form.observacoes} onChange={e => f('observacoes', e.target.value)} rows={2} /></div>

              <Button onClick={handleSalvar} className="w-full" size="lg" disabled={!todosAceitos}>
                <CheckCircle2 className="h-4 w-4 mr-2" />Registrar Termo de Consentimento
              </Button>
              {!todosAceitos && <p className="text-xs text-destructive text-center">Todos os termos devem ser aceitos para registrar</p>}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={!!detalhe} onOpenChange={() => setDetalhe(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {detalhe && (
            <>
              <DialogHeader>
                <DialogTitle>Termo — {detalhe.pacienteNome.toUpperCase()} — Leito {detalhe.leito}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="flex gap-2 flex-wrap">
                  <Badge>{detalhe.data}</Badge>
                  <Badge variant="outline">DN: {detalhe.dataNascimento}</Badge>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /><span>Risco de Queda — Aceito</span></div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /><span>Integridade da Pele — Aceito</span></div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /><span>Identificação do Paciente — Aceito</span></div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /><span>Alergias e Medicamentos — Aceito</span></div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /><span>Higienização das Mãos — Aceito</span></div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /><span>Itens Necessários — Aceito</span></div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /><span>Proibições — Aceito</span></div>
                </div>
                <div><span className="text-muted-foreground">Responsável:</span> {detalhe.nomeResponsavel} ({detalhe.parentesco})</div>
                <div><span className="text-muted-foreground">Telefone:</span> {detalhe.telefoneContato}</div>
                <div><span className="text-muted-foreground">Enfermeiro(a):</span> {detalhe.enfermeiroResponsavel} — COREN: {detalhe.coren}</div>
                {detalhe.observacoes && <div className="p-2 bg-muted rounded">{detalhe.observacoes}</div>}
                <p className="text-xs text-muted-foreground">Registrado em: {detalhe.dataRegistro}</p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <div className="rounded-md border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Paciente</TableHead>
              <TableHead>Leito</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Enfermeiro(a)</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtrados.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum termo registrado</TableCell></TableRow>
            ) : filtrados.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-mono">{r.data}</TableCell>
                <TableCell className="font-medium uppercase">{r.pacienteNome}</TableCell>
                <TableCell>{r.leito || '—'}</TableCell>
                <TableCell>{r.nomeResponsavel}</TableCell>
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
