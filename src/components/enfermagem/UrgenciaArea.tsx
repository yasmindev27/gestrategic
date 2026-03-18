import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Siren, Clock, Users, Plus, HeartPulse, Thermometer, Search, ShieldAlert, ClipboardList, Shirt, Shield, SprayCanIcon, Gauge, ClipboardPen, Ambulance, Activity, Stethoscope, FileText, ShieldCheck, Pill
} from 'lucide-react';
import { ChecklistCarrinhoUrgencia } from './ChecklistCarrinhoUrgencia';
import { ChecklistSinaisVitais } from './ChecklistSinaisVitais';
import { ChecklistSetorUrgencia } from './ChecklistSetorUrgencia';
import { ProtocoloEvasaoRouparia } from './ProtocoloEvasaoRouparia';
import { ChecklistGeralNSP } from './ChecklistGeralNSP';
import { ChecklistLimpezaConcorrente } from './ChecklistLimpezaConcorrente';
import { ChecklistFluxometrosBombas } from './ChecklistFluxometrosBombas';
import { PassagemPlantaoTecEnfermagem } from './PassagemPlantaoTecEnfermagem';
import { ChecklistUTIMovel } from './ChecklistUTIMovel';
import { ControleSinaisVitaisOxigenio } from './ControleSinaisVitaisOxigenio';
import { EscalasClinicas } from './EscalasClinicas';
import { PassagemPlantaoSBAR } from './PassagemPlantaoSBAR';
import { DiagnosticoPrescricaoEnfermagem } from './DiagnosticoPrescricaoEnfermagem';
import { TermoConsentimentoRiscos } from './TermoConsentimentoRiscos';
import { SAEAdulto } from './SAEAdulto';
import { SAEPediatrico } from './SAEPediatrico';
import { TermoGuardaMedicamento } from './TermoGuardaMedicamento';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AtendimentoUrgencia {
  id: string;
  paciente: string;
  classificacao: string;
  horaChegada: string;
  horaAtendimento?: string;
  sala: string;
  queixaPrincipal: string;
  status: 'aguardando' | 'em_atendimento' | 'observacao' | 'alta' | 'transferido';
  medico?: string;
  enfermeiro?: string;
}

const CLASSIFICACAO_CORES: Record<string, string> = {
  vermelho: 'bg-red-600 text-white',
  laranja: 'bg-orange-500 text-white',
  amarelo: 'bg-yellow-400 text-yellow-900',
  verde: 'bg-green-500 text-white',
  azul: 'bg-blue-500 text-white',
};

const STATUS_LABELS: Record<string, { label: string; cor: string }> = {
  aguardando: { label: 'Aguardando', cor: 'bg-yellow-100 text-yellow-800' },
  em_atendimento: { label: 'Em Atendimento', cor: 'bg-blue-100 text-blue-800' },
  observacao: { label: 'Observação', cor: 'bg-purple-100 text-purple-800' },
  alta: { label: 'Alta', cor: 'bg-green-100 text-green-800' },
  transferido: { label: 'Transferido', cor: 'bg-gray-100 text-gray-800' },
};

const SUB_NAV_ITEMS = [
  { id: 'atendimentos', label: 'Atendimentos', icon: Siren },
  { id: 'checklist-setor', label: 'Checklist Setor', icon: ClipboardList },
  { id: 'carrinho', label: 'Carrinho de Urgência', icon: ShieldAlert },
  { id: 'sinais-vitais', label: 'Sinais Vitais', icon: Thermometer },
  { id: 'evasao-rouparia', label: 'Evasão Rouparia', icon: Shirt },
  { id: 'nsp', label: 'NSP', icon: Shield },
  { id: 'limpeza', label: 'Limpeza Concorrente', icon: SprayCanIcon },
  { id: 'fluxometros', label: 'Fluxômetros/Bombas', icon: Gauge },
  { id: 'passagem-plantao', label: 'Passagem Plantão', icon: ClipboardPen },
  { id: 'uti-movel', label: 'UTI Móvel', icon: Ambulance },
  { id: 'sv-oxigenio', label: 'SV/Oxigenioterapia', icon: Activity },
  { id: 'escalas', label: 'Escalas Clínicas', icon: Stethoscope },
  { id: 'sbar', label: 'SBAR Enfermeiros', icon: FileText },
  { id: 'prescricao', label: 'Prescrição Enf.', icon: ClipboardList },
  { id: 'termo', label: 'Termo Riscos', icon: ShieldCheck },
  { id: 'sae', label: 'SAE Adulto', icon: HeartPulse },
  { id: 'sae-ped', label: 'SAE Pediátrico', icon: HeartPulse },
  { id: 'guarda-med', label: 'Guarda Medicamento', icon: Pill },
];

export function UrgenciaArea() {
  const [activeTab, setActiveTab] = useState('atendimentos');
  const [atendimentos, setAtendimentos] = useLocalStorage<AtendimentoUrgencia[]>('enf-urgencia-atendimentos', []);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busca, setBusca] = useState('');
  const [form, setForm] = useState({
    paciente: '', classificacao: 'verde', sala: 'Sala de Espera', queixaPrincipal: '', medico: '', enfermeiro: ''
  });

  const ativos = atendimentos.filter(a => a.status !== 'alta' && a.status !== 'transferido');
  const filtrados = ativos.filter(a =>
    a.paciente.toLowerCase().includes(busca.toLowerCase()) ||
    a.classificacao.toLowerCase().includes(busca.toLowerCase())
  );

  const handleAdd = () => {
    if (!form.paciente || !form.queixaPrincipal) {
      toast.error('Paciente e queixa principal são obrigatórios');
      return;
    }
    const novo: AtendimentoUrgencia = {
      id: crypto.randomUUID(),
      ...form,
      horaChegada: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      status: 'aguardando',
    };
    setAtendimentos([novo, ...atendimentos]);
    setForm({ paciente: '', classificacao: 'verde', sala: 'Sala de Espera', queixaPrincipal: '', medico: '', enfermeiro: '' });
    setDialogOpen(false);
    toast.success('Atendimento registrado');
  };

  const updateStatus = (id: string, status: AtendimentoUrgencia['status']) => {
    setAtendimentos(prev => prev.map(a => {
      if (a.id !== id) return a;
      const updated = { ...a, status };
      if (status === 'em_atendimento' && !a.horaAtendimento) {
        updated.horaAtendimento = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      }
      return updated;
    }));
    toast.success('Status atualizado');
  };

  const countByClassificacao = (cor: string) => ativos.filter(a => a.classificacao === cor).length;

  const renderContent = () => {
    switch (activeTab) {
      case 'atendimentos':
        return (
          <div className="space-y-4">
            {/* Painel de classificação */}
            <div className="grid grid-cols-5 gap-2">
              {Object.entries(CLASSIFICACAO_CORES).map(([cor, classe]) => (
                <Card key={cor} className="overflow-hidden">
                  <div className={`${classe} p-3 text-center`}>
                    <p className="text-xs font-semibold uppercase">{cor}</p>
                    <p className="text-3xl font-bold">{countByClassificacao(cor)}</p>
                  </div>
                </Card>
              ))}
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Card><CardContent className="p-4 flex items-center gap-3">
                <Users className="h-8 w-8 text-primary opacity-70" />
                <div><p className="text-sm text-muted-foreground">Ativos</p><p className="text-2xl font-bold">{ativos.length}</p></div>
              </CardContent></Card>
              <Card><CardContent className="p-4 flex items-center gap-3">
                <Clock className="h-8 w-8 text-warning opacity-70" />
                <div><p className="text-sm text-muted-foreground">Aguardando</p><p className="text-2xl font-bold">{ativos.filter(a => a.status === 'aguardando').length}</p></div>
              </CardContent></Card>
              <Card><CardContent className="p-4 flex items-center gap-3">
                <HeartPulse className="h-8 w-8 text-info opacity-70" />
                <div><p className="text-sm text-muted-foreground">Em Atendimento</p><p className="text-2xl font-bold">{ativos.filter(a => a.status === 'em_atendimento').length}</p></div>
              </CardContent></Card>
              <Card><CardContent className="p-4 flex items-center gap-3">
                <Thermometer className="h-8 w-8 text-secondary opacity-70" />
                <div><p className="text-sm text-muted-foreground">Observação</p><p className="text-2xl font-bold">{ativos.filter(a => a.status === 'observacao').length}</p></div>
              </CardContent></Card>
            </div>

            {/* Lista */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar paciente..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9" />
              </div>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button><Plus className="h-4 w-4 mr-1" />Novo Atendimento</Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader><DialogTitle>Registrar Atendimento de Urgência</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Paciente</Label><Input value={form.paciente} onChange={e => setForm(p => ({ ...p, paciente: e.target.value }))} /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Classificação Manchester</Label>
                        <Select value={form.classificacao} onValueChange={v => setForm(p => ({ ...p, classificacao: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="vermelho">Vermelho — Emergência</SelectItem>
                            <SelectItem value="laranja">Laranja — Muito Urgente</SelectItem>
                            <SelectItem value="amarelo">Amarelo — Urgente</SelectItem>
                            <SelectItem value="verde">Verde — Pouco Urgente</SelectItem>
                            <SelectItem value="azul">Azul — Não Urgente</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div><Label>Sala</Label>
                        <Select value={form.sala} onValueChange={v => setForm(p => ({ ...p, sala: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Sala de Espera">Sala de Espera</SelectItem>
                            <SelectItem value="Sala Vermelha">Sala Vermelha</SelectItem>
                            <SelectItem value="Sala Amarela">Sala Amarela</SelectItem>
                            <SelectItem value="Box Emergência">Box Emergência</SelectItem>
                            <SelectItem value="Medicação">Medicação</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div><Label>Queixa Principal</Label><Textarea value={form.queixaPrincipal} onChange={e => setForm(p => ({ ...p, queixaPrincipal: e.target.value }))} /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Médico</Label><Input value={form.medico} onChange={e => setForm(p => ({ ...p, medico: e.target.value }))} /></div>
                      <div><Label>Enfermeiro</Label><Input value={form.enfermeiro} onChange={e => setForm(p => ({ ...p, enfermeiro: e.target.value }))} /></div>
                    </div>
                    <Button onClick={handleAdd} className="w-full">Registrar</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="rounded-md border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Classificação</TableHead>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Chegada</TableHead>
                    <TableHead>Atendimento</TableHead>
                    <TableHead>Sala</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtrados.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum atendimento ativo</TableCell></TableRow>
                  ) : filtrados.map(a => (
                    <TableRow key={a.id}>
                      <TableCell><Badge className={CLASSIFICACAO_CORES[a.classificacao]}>{a.classificacao}</Badge></TableCell>
                      <TableCell className="font-medium">{a.paciente}</TableCell>
                      <TableCell className="font-mono">{a.horaChegada}</TableCell>
                      <TableCell className="font-mono">{a.horaAtendimento || '—'}</TableCell>
                      <TableCell>{a.sala}</TableCell>
                      <TableCell><Badge className={STATUS_LABELS[a.status].cor}>{STATUS_LABELS[a.status].label}</Badge></TableCell>
                      <TableCell>
                        <Select value={a.status} onValueChange={v => updateStatus(a.id, v as AtendimentoUrgencia['status'])}>
                          <SelectTrigger className="h-8 w-[140px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="aguardando">Aguardando</SelectItem>
                            <SelectItem value="em_atendimento">Em Atendimento</SelectItem>
                            <SelectItem value="observacao">Observação</SelectItem>
                            <SelectItem value="alta">Alta</SelectItem>
                            <SelectItem value="transferido">Transferido</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        );
      case 'checklist-setor':
        return <ChecklistSetorUrgencia />;
      case 'carrinho':
        return <ChecklistCarrinhoUrgencia />;
      case 'sinais-vitais':
        return <ChecklistSinaisVitais storageKey="enf-sinais-vitais-urgencia" setor="Urgência" />;
      case 'evasao-rouparia':
        return <ProtocoloEvasaoRouparia storageKey="enf-evasao-rouparia-urgencia" setor="Urgência" />;
      case 'nsp':
        return <ChecklistGeralNSP storageKey="enf-nsp-urgencia" setor="Urgência" />;
      case 'limpeza':
        return <ChecklistLimpezaConcorrente storageKey="enf-limpeza-concorrente-urgencia" setor="Urgência" />;
      case 'fluxometros':
        return <ChecklistFluxometrosBombas storageKey="enf-fluxometros-bombas-urgencia" setor="Urgência" />;
      case 'passagem-plantao':
        return <PassagemPlantaoTecEnfermagem storageKey="enf-passagem-plantao-tec-urgencia" setor="Urgência" />;
      case 'uti-movel':
        return <ChecklistUTIMovel storageKey="enf-uti-movel-urgencia" setor="Urgência" />;
      case 'sv-oxigenio':
        return <ControleSinaisVitaisOxigenio storageKey="enf-sv-oxigenio-urgencia" setor="Urgência" />;
      case 'escalas':
        return <EscalasClinicas storageKey="enf-escalas-clinicas-urgencia" setor="Urgência" />;
      case 'sbar':
        return <PassagemPlantaoSBAR storageKey="enf-sbar-urgencia" setor="Urgência" />;
      case 'prescricao':
        return <DiagnosticoPrescricaoEnfermagem storageKey="enf-prescricao-urgencia" setor="Urgência" />;
      case 'termo':
        return <TermoConsentimentoRiscos storageKey="enf-termo-riscos-urgencia" setor="Urgência" />;
      case 'sae':
        return <SAEAdulto storageKey="enf-sae-adulto-urgencia" setor="Urgência" />;
      case 'sae-ped':
        return <SAEPediatrico storageKey="enf-sae-ped-urgencia" setor="Urgência" />;
      case 'guarda-med':
        return <TermoGuardaMedicamento storageKey="enf-guarda-med-urgencia" setor="Urgência" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Siren className="h-5 w-5 text-destructive" />
          Urgência
        </h2>
        <p className="text-sm text-muted-foreground">Controle de fluxo de atendimentos de urgência e tempos assistenciais</p>
      </div>

      <div className="flex gap-4">
        {/* Vertical sub-navigation */}
        <nav className="w-52 flex-shrink-0 space-y-0.5 border-r pr-3">
          {SUB_NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-md text-left text-sm transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Content area */}
        <div className="flex-1 min-w-0">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}