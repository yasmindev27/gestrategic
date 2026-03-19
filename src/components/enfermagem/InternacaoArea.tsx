import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  BedDouble, ClipboardList, AlertTriangle, Plus, Search,
  CheckCircle2, ShieldAlert, Thermometer, Shirt, Shield, SprayCanIcon, Gauge, ClipboardPen, Activity, Stethoscope, FileText, ShieldCheck, HeartPulse, Pill, Loader2, RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { ChecklistCarrinhoInternacao } from './ChecklistCarrinhoInternacao';
import { ChecklistSinaisVitais } from './ChecklistSinaisVitais';
import { ProtocoloEvasaoRouparia } from './ProtocoloEvasaoRouparia';
import { ChecklistGeralNSP } from './ChecklistGeralNSP';
import { ChecklistLimpezaConcorrente } from './ChecklistLimpezaConcorrente';
import { ChecklistFluxometrosBombas } from './ChecklistFluxometrosBombas';
import { PassagemPlantaoTecEnfermagem } from './PassagemPlantaoTecEnfermagem';
import { ControleSinaisVitaisOxigenio } from './ControleSinaisVitaisOxigenio';
import { EscalasClinicas } from './EscalasClinicas';
import { PassagemPlantaoSBAR } from './PassagemPlantaoSBAR';
import { DiagnosticoPrescricaoEnfermagem } from './DiagnosticoPrescricaoEnfermagem';
import { TermoConsentimentoRiscos } from './TermoConsentimentoRiscos';
import { SAEAdulto } from './SAEAdulto';
import { SAEPediatrico } from './SAEPediatrico';
import { TermoGuardaMedicamento } from './TermoGuardaMedicamento';
import { ExportDropdown } from '@/components/ui/export-dropdown';
import { exportToPDF, exportToExcel } from '@/lib/export-utils';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getBrasiliaDate, getBrasiliaDateString } from '@/lib/brasilia-time';

interface PacienteInternado {
  id: string;
  nome: string;
  leito: string;
  setor: string;
  diagnostico: string;
  dataInternacao: string;
  medico: string;
  risco: string;
  observacoes: string;
}

interface PassagemPlantaoItem {
  id: string;
  data: string;
  turno: string;
  paciente: string;
  leito: string;
  informacoes: string;
  pendencias: string;
  registradoPor: string;
}

interface ChecklistCuidado {
  id: string;
  descricao: string;
  categoria: string;
  concluido: boolean;
  horario?: string;
}

const CHECKLIST_PADRAO: Omit<ChecklistCuidado, 'id' | 'concluido' | 'horario'>[] = [
  { descricao: 'Verificar sinais vitais', categoria: 'Monitoramento' },
  { descricao: 'Conferir pulseira de identificação', categoria: 'Segurança do Paciente' },
  { descricao: 'Checar prescrição médica', categoria: 'Medicação' },
  { descricao: 'Avaliar risco de queda (Morse)', categoria: 'Segurança do Paciente' },
  { descricao: 'Avaliar risco de LPP (Braden)', categoria: 'Segurança do Paciente' },
  { descricao: 'Verificar acesso venoso', categoria: 'Procedimentos' },
  { descricao: 'Higienização das mãos', categoria: 'Infecção' },
  { descricao: 'Cabeceira elevada 30-45°', categoria: 'Pneumonia Zero' },
  { descricao: 'Conferir dieta prescrita', categoria: 'Nutrição' },
  { descricao: 'Registrar balanço hídrico', categoria: 'Monitoramento' },
];

/** Calcula o turno atual baseado no horário de Brasília */
function getCurrentShift(): { date: string; type: 'diurno' | 'noturno' } {
  const now = getBrasiliaDate();
  const hours = now.getHours();
  
  // Diurno: 7h-18h59 | Noturno: 19h-6h59
  if (hours >= 7 && hours < 19) {
    return { date: getBrasiliaDateString(), type: 'diurno' };
  } else {
    // Se for após meia-noite (0h-6h59), o turno noturno pertence ao dia anterior
    if (hours < 7) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const y = yesterday.getFullYear();
      const m = (yesterday.getMonth() + 1).toString().padStart(2, '0');
      const d = yesterday.getDate().toString().padStart(2, '0');
      return { date: `${y}-${m}-${d}`, type: 'noturno' };
    }
    return { date: getBrasiliaDateString(), type: 'noturno' };
  }
}

/** Mapeia classificação de risco do mapa de leitos */
function mapRisco(record: any): string {
  // Tentar inferir risco pelo setor
  const sector = (record.sector || '').toLowerCase();
  if (sector.includes('vermelha') || sector.includes('uti')) return 'critico';
  if (sector.includes('amarela')) return 'alto';
  return 'moderado';
}

const SUB_NAV_ITEMS = [
  { id: 'pacientes', label: 'Pacientes', icon: BedDouble },
  { id: 'passagem-plantao', label: 'Passagem de Plantão', icon: ClipboardPen },
  { id: 'checklist', label: 'Checklist Cuidados', icon: CheckCircle2 },
  { id: 'carrinho', label: 'Carrinho de Internação', icon: ShieldAlert },
  { id: 'sinais-vitais', label: 'Sinais Vitais', icon: Thermometer },
  { id: 'evasao-rouparia', label: 'Evasão Rouparia', icon: Shirt },
  { id: 'nsp', label: 'NSP', icon: Shield },
  { id: 'limpeza', label: 'Limpeza Concorrente', icon: SprayCanIcon },
  { id: 'fluxometros', label: 'Fluxômetros/Bombas', icon: Gauge },
  { id: 'sv-oxigenio', label: 'SV/Oxigenioterapia', icon: Activity },
  { id: 'escalas', label: 'Escalas Clínicas', icon: Stethoscope },
  { id: 'sbar', label: 'SBAR Enfermeiros', icon: FileText },
  { id: 'prescricao', label: 'Prescrição Enf.', icon: ClipboardList },
  { id: 'termo', label: 'Termo Riscos', icon: ShieldCheck },
  { id: 'sae', label: 'SAE Adulto', icon: HeartPulse },
  { id: 'sae-ped', label: 'SAE Pediátrico', icon: HeartPulse },
  { id: 'guarda-med', label: 'Guarda Medicamento', icon: Pill },
];

export function InternacaoArea() {
  const [activeTab, setActiveTab] = useState('pacientes');
  const [pacientes, setPacientes] = useState<PacienteInternado[]>([]);
  const [isLoadingPacientes, setIsLoadingPacientes] = useState(true);
  const [passagens, setPassagens] = useLocalStorage<PassagemPlantaoItem[]>('enf-internacao-passagens', []);
  const [checklistHistorico, setChecklistHistorico] = useLocalStorage<any[]>('enf-internacao-checklist-historico', []);
  const [checklist, setChecklist] = useState<ChecklistCuidado[]>(
    CHECKLIST_PADRAO.map((c, i) => ({ ...c, id: `ck-${i}`, concluido: false }))
  );
  const [passagemDialogOpen, setPassagemDialogOpen] = useState(false);
  const [busca, setBusca] = useState('');

  const [formPassagem, setFormPassagem] = useState({
    turno: 'diurno', paciente: '', leito: '', informacoes: '', pendencias: '', registradoPor: ''
  });

  // Buscar pacientes internados do mapa de leitos (bed_records)
  const fetchPacientesFromBedMap = async () => {
    setIsLoadingPacientes(true);
    try {
      const shift = getCurrentShift();
      
      const { data, error } = await supabase
        .from('bed_records')
        .select('*')
        .eq('shift_date', shift.date)
        .eq('shift_type', shift.type)
        .not('patient_name', 'is', null)
        .is('motivo_alta', null)
        .is('data_alta', null);

      if (error) throw error;

      // Deduplicar por nome do paciente (manter registro mais recente)
      const dedupMap = new Map<string, any>();
      (data || []).forEach(record => {
        const name = (record.patient_name || '').trim().toLowerCase();
        if (!name) return;
        const existing = dedupMap.get(name);
        if (!existing || (record.created_at && (!existing.created_at || record.created_at > existing.created_at))) {
          dedupMap.set(name, record);
        }
      });

      const mapped: PacienteInternado[] = Array.from(dedupMap.values()).map(record => ({
        id: record.id,
        nome: record.patient_name || '',
        leito: record.bed_number || '',
        setor: record.sector || '',
        diagnostico: record.hipotese_diagnostica || '',
        dataInternacao: record.data_internacao || record.shift_date || '',
        medico: record.medicos || '',
        risco: mapRisco(record),
        observacoes: record.observacao || '',
      }));

      // Ordenar por setor e leito
      mapped.sort((a, b) => a.setor.localeCompare(b.setor) || a.leito.localeCompare(b.leito));
      setPacientes(mapped);
    } catch (err) {
      console.error('[InternacaoArea] Erro ao buscar pacientes:', err);
      toast.error('Erro ao carregar pacientes do mapa de leitos');
    } finally {
      setIsLoadingPacientes(false);
    }
  };

  useEffect(() => {
    fetchPacientesFromBedMap();
  }, []);

  const pacientesFiltrados = pacientes.filter(p =>
    p.nome.toLowerCase().includes(busca.toLowerCase()) ||
    p.leito.toLowerCase().includes(busca.toLowerCase())
  );

  const handleAddPassagem = () => {
    if (!formPassagem.paciente || !formPassagem.informacoes) {
      toast.error('Paciente e informações são obrigatórios');
      return;
    }
    const nova: PassagemPlantaoItem = {
      id: crypto.randomUUID(),
      data: new Date().toISOString().split('T')[0],
      ...formPassagem,
    };
    setPassagens([nova, ...passagens]);
    setFormPassagem({ turno: 'diurno', paciente: '', leito: '', informacoes: '', pendencias: '', registradoPor: '' });
    setPassagemDialogOpen(false);
    toast.success('Passagem de plantão registrada');
  };

  const toggleChecklist = (id: string) => {
    setChecklist(prev => prev.map(c =>
      c.id === id ? { ...c, concluido: !c.concluido, horario: !c.concluido ? new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : undefined } : c
    ));
  };

  const riscoColor = (risco: string) => {
    switch (risco) {
      case 'baixo': return 'bg-green-100 text-green-800';
      case 'moderado': return 'bg-yellow-100 text-yellow-800';
      case 'alto': return 'bg-orange-100 text-orange-800';
      case 'critico': return 'bg-red-100 text-red-800';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const checklistCompletos = checklist.filter(c => c.concluido).length;

  const renderContent = () => {
    switch (activeTab) {
      case 'pacientes':
        return (
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar por nome ou leito..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9" />
              </div>
              <Button variant="outline" size="sm" onClick={fetchPacientesFromBedMap} disabled={isLoadingPacientes}>
                <RefreshCw className={cn("h-4 w-4 mr-1", isLoadingPacientes && "animate-spin")} />
                Atualizar
              </Button>
            </div>

            {isLoadingPacientes ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                <span className="text-muted-foreground">Carregando pacientes do mapa de leitos...</span>
              </div>
            ) : (
              <div className="rounded-md border overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Leito</TableHead>
                      <TableHead>Paciente</TableHead>
                      <TableHead>Setor</TableHead>
                      <TableHead>Diagnóstico</TableHead>
                      <TableHead>Médico</TableHead>
                      <TableHead>Risco</TableHead>
                      <TableHead>Internação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pacientesFiltrados.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum paciente internado no turno atual</TableCell></TableRow>
                    ) : pacientesFiltrados.map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono font-semibold">{p.leito}</TableCell>
                        <TableCell className="font-medium">{p.nome}</TableCell>
                        <TableCell>{p.setor}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{p.diagnostico || '—'}</TableCell>
                        <TableCell>{p.medico || '—'}</TableCell>
                        <TableCell><Badge className={riscoColor(p.risco)}>{p.risco}</Badge></TableCell>
                        <TableCell>{p.dataInternacao ? new Date(p.dataInternacao + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Dados sincronizados com o Mapa de Leitos (NIR) — Turno: {getCurrentShift().type === 'diurno' ? 'Diurno' : 'Noturno'} | {pacientes.length} paciente(s)
            </p>
          </div>
        );

      case 'passagem':
        return (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={passagemDialogOpen} onOpenChange={setPassagemDialogOpen}>
                <DialogTrigger asChild>
                  <Button><Plus className="h-4 w-4 mr-1" />Nova Passagem</Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader><DialogTitle>Passagem de Plantão</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Turno</Label>
                        <Select value={formPassagem.turno} onValueChange={v => setFormPassagem(p => ({ ...p, turno: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="diurno">Diurno (7h-19h)</SelectItem>
                            <SelectItem value="noturno">Noturno (19h-7h)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div><Label>Leito</Label><Input value={formPassagem.leito} onChange={e => setFormPassagem(p => ({ ...p, leito: e.target.value }))} /></div>
                    </div>
                    <div><Label>Paciente</Label><Input value={formPassagem.paciente} onChange={e => setFormPassagem(p => ({ ...p, paciente: e.target.value }))} /></div>
                    <div><Label>Informações Clínicas</Label><Textarea value={formPassagem.informacoes} onChange={e => setFormPassagem(p => ({ ...p, informacoes: e.target.value }))} placeholder="Estado geral, medicações, procedimentos realizados..." /></div>
                    <div><Label>Pendências</Label><Textarea value={formPassagem.pendencias} onChange={e => setFormPassagem(p => ({ ...p, pendencias: e.target.value }))} placeholder="Exames, medicações, procedimentos pendentes..." /></div>
                    <div><Label>Registrado por</Label><Input value={formPassagem.registradoPor} onChange={e => setFormPassagem(p => ({ ...p, registradoPor: e.target.value }))} /></div>
                    <Button onClick={handleAddPassagem} className="w-full">Registrar Passagem</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {passagens.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">
                <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p>Nenhuma passagem de plantão registrada</p>
              </CardContent></Card>
            ) : passagens.map(p => (
              <Card key={p.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{p.paciente} — Leito {p.leito}</CardTitle>
                    <div className="flex gap-2">
                      <Badge variant="outline">{p.data}</Badge>
                      <Badge className={p.turno === 'diurno' ? 'bg-yellow-100 text-yellow-800' : 'bg-indigo-100 text-indigo-800'}>{p.turno === 'diurno' ? 'Diurno' : 'Noturno'}</Badge>
                    </div>
                  </div>
                  <CardDescription>Registrado por: {p.registradoPor}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div><span className="text-sm font-medium">Informações:</span><p className="text-sm text-muted-foreground">{p.informacoes}</p></div>
                  {p.pendencias && <div><span className="text-sm font-medium text-warning">Pendências:</span><p className="text-sm text-muted-foreground">{p.pendencias}</p></div>}
                </CardContent>
              </Card>
            ))}
          </div>
        );

      case 'checklist':
        const handleRegistrarChecklist = () => {
          const concluidos = checklist.filter(c => c.concluido);
          if (concluidos.length === 0) {
            toast.error('Marque pelo menos um item antes de registrar');
            return;
          }
          const registro = {
            id: crypto.randomUUID(),
            data: new Date().toLocaleDateString('pt-BR'),
            hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            turno: getCurrentShift().type,
            itensTotal: checklist.length,
            itensConcluidos: concluidos.length,
            itens: checklist.map(c => ({ descricao: c.descricao, categoria: c.categoria, concluido: c.concluido, horario: c.horario })),
          };
          setChecklistHistorico([registro, ...checklistHistorico]);
          setChecklist(CHECKLIST_PADRAO.map((c, i) => ({ ...c, id: `ck-${i}`, concluido: false })));
          toast.success(`Checklist registrado com ${concluidos.length}/${checklist.length} itens concluídos`);
        };

        return (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Checklist de Cuidados — Turno Atual</CardTitle>
                    <CardDescription>Baseado nas Metas Internacionais de Segurança do Paciente (ONA)</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <ExportDropdown
                      onExportPDF={() => exportToPDF({ title: 'Checklist de Cuidados', headers: ['Item', 'Categoria', 'Status', 'Horário'], rows: checklist.map(c => [c.descricao, c.categoria, c.concluido ? 'Concluído' : 'Pendente', c.horario || '—']), fileName: 'checklist_cuidados' })}
                      onExportExcel={() => exportToExcel({ title: 'Checklist de Cuidados', headers: ['Item', 'Categoria', 'Status', 'Horário'], rows: checklist.map(c => [c.descricao, c.categoria, c.concluido ? 'Concluído' : 'Pendente', c.horario || '—']), fileName: 'checklist_cuidados' })}
                    />
                    <Button onClick={handleRegistrarChecklist} disabled={checklist.filter(c => c.concluido).length === 0}>
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Registrar Checklist
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {checklist.map(item => (
                    <div key={item.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/50">
                      <Checkbox checked={item.concluido} onCheckedChange={() => toggleChecklist(item.id)} />
                      <div className="flex-1">
                        <span className={item.concluido ? 'line-through text-muted-foreground' : ''}>{item.descricao}</span>
                        <Badge variant="outline" className="ml-2 text-xs">{item.categoria}</Badge>
                      </div>
                      {item.horario && <span className="text-xs text-muted-foreground">{item.horario}</span>}
                    </div>
                  ))}
                </div>
                <div className="mt-4 text-sm text-muted-foreground">
                  Progresso: {checklist.filter(c => c.concluido).length}/{checklist.length} itens concluídos
                </div>
              </CardContent>
            </Card>

            {checklistHistorico.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Histórico de Checklists Registrados</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Hora</TableHead>
                          <TableHead>Turno</TableHead>
                          <TableHead>Concluídos</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>%</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {checklistHistorico.slice(0, 20).map((h: any) => (
                          <TableRow key={h.id}>
                            <TableCell>{h.data}</TableCell>
                            <TableCell>{h.hora}</TableCell>
                            <TableCell><Badge variant="outline">{h.turno === 'diurno' ? 'Diurno' : 'Noturno'}</Badge></TableCell>
                            <TableCell className="font-medium">{h.itensConcluidos}</TableCell>
                            <TableCell>{h.itensTotal}</TableCell>
                            <TableCell>
                              <Badge className={h.itensConcluidos === h.itensTotal ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                                {Math.round((h.itensConcluidos / h.itensTotal) * 100)}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 'carrinho':
        return <ChecklistCarrinhoInternacao />;
      case 'sinais-vitais':
        return <ChecklistSinaisVitais storageKey="enf-sinais-vitais-internacao" setor="Internação" />;
      case 'evasao-rouparia':
        return <ProtocoloEvasaoRouparia storageKey="enf-evasao-rouparia-internacao" setor="Internação" />;
      case 'nsp':
        return <ChecklistGeralNSP storageKey="enf-nsp-internacao" setor="Internação" />;
      case 'limpeza':
        return <ChecklistLimpezaConcorrente storageKey="enf-limpeza-concorrente-internacao" setor="Internação" />;
      case 'fluxometros':
        return <ChecklistFluxometrosBombas storageKey="enf-fluxometros-bombas-internacao" setor="Internação" />;
      case 'passagem-plantao':
        return <PassagemPlantaoTecEnfermagem storageKey="enf-passagem-plantao-tec-internacao" setor="Internação" />;
      case 'sv-oxigenio':
        return <ControleSinaisVitaisOxigenio storageKey="enf-sv-oxigenio-internacao" setor="Internação" />;
      case 'escalas':
        return <EscalasClinicas storageKey="enf-escalas-clinicas-internacao" setor="Internação" />;
      case 'sbar':
        return <PassagemPlantaoSBAR storageKey="enf-sbar-internacao" setor="Internação" />;
      case 'prescricao':
        return <DiagnosticoPrescricaoEnfermagem storageKey="enf-prescricao-internacao" setor="Internação" />;
      case 'termo':
        return <TermoConsentimentoRiscos storageKey="enf-termo-riscos-internacao" setor="Internação" />;
      case 'sae':
        return <SAEAdulto storageKey="enf-sae-adulto-internacao" setor="Internação" />;
      case 'sae-ped':
        return <SAEPediatrico storageKey="enf-sae-ped-internacao" setor="Internação" />;
      case 'guarda-med':
        return <TermoGuardaMedicamento storageKey="enf-guarda-med-internacao" setor="Internação" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <BedDouble className="h-5 w-5 text-primary" />
            Internação
          </h2>
          <p className="text-sm text-muted-foreground">Gestão de pacientes internados, passagem de plantão e checklists de cuidados</p>
        </div>
        <ExportDropdown
          onExportPDF={() => exportToPDF({ title: 'Internação — Pacientes', headers: ['Leito', 'Paciente', 'Setor', 'Diagnóstico', 'Médico', 'Risco', 'Internação'], rows: pacientes.map(p => [p.leito, p.nome, p.setor, p.diagnostico || '', p.medico || '', p.risco, p.dataInternacao || '']), fileName: 'internacao_pacientes' })}
          onExportExcel={() => exportToExcel({ title: 'Internação — Pacientes', headers: ['Leito', 'Paciente', 'Setor', 'Diagnóstico', 'Médico', 'Risco', 'Internação'], rows: pacientes.map(p => [p.leito, p.nome, p.setor, p.diagnostico || '', p.medico || '', p.risco, p.dataInternacao || '']), fileName: 'internacao_pacientes' })}
        />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <BedDouble className="h-8 w-8 text-primary opacity-70" />
          <div><p className="text-sm text-muted-foreground">Pacientes</p><p className="text-2xl font-bold">{pacientes.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <AlertTriangle className="h-8 w-8 text-destructive opacity-70" />
          <div><p className="text-sm text-muted-foreground">Risco Alto/Crítico</p><p className="text-2xl font-bold">{pacientes.filter(p => p.risco === 'alto' || p.risco === 'critico').length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <ClipboardList className="h-8 w-8 text-warning opacity-70" />
          <div><p className="text-sm text-muted-foreground">Passagens Hoje</p><p className="text-2xl font-bold">{passagens.filter(p => p.data === new Date().toISOString().split('T')[0]).length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <CheckCircle2 className="h-8 w-8 text-success opacity-70" />
          <div><p className="text-sm text-muted-foreground">Checklist</p><p className="text-2xl font-bold">{checklistCompletos}/{checklist.length}</p></div>
        </CardContent></Card>
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