import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateProtocoloAtendimento, useProtocoloAtendimentos, useDeleteProtocoloAtendimento, useProtocoloSettings } from '@/hooks/useProtocoloAtendimentos';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, AlertCircle, CheckCircle2, Clock, Search, X, UserSearch, Trash2, Beaker, Ambulance } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

// Competency selector
function CompetencySelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const options = [];
  const startDate = new Date(2025, 11, 1);
  for (let i = 0; i <= 12; i++) {
    const d = new Date(startDate);
    d.setMonth(d.getMonth() + i);
    const v = format(d, 'yyyy-MM');
    const l = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    options.push({ value: v, label: l.charAt(0).toUpperCase() + l.slice(1) });
  }
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Competência" />
      </SelectTrigger>
      <SelectContent>
        {options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

// Status badge
function StatusBadge({ withinTarget, minutes }: { withinTarget: boolean; minutes: number }) {
  return (
    <div className={cn(
      'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold',
      withinTarget ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    )}>
      <span className={cn('h-2 w-2 rounded-full', withinTarget ? 'bg-green-500' : 'bg-red-500')} />
      {minutes} min
    </div>
  );
}

// Risk badge
const riskConfig: Record<string, { label: string; className: string }> = {
  vermelho: { label: 'Vermelho', className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
  laranja: { label: 'Laranja', className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
  amarelo: { label: 'Amarelo', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
  verde: { label: 'Verde', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  azul: { label: 'Azul', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
};

function RiskBadge({ classification }: { classification: string }) {
  const config = riskConfig[classification] || { label: classification, className: 'bg-muted text-muted-foreground' };
  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', config.className)}>{config.label}</span>;
}

// Troponin Sample Fields
function SampleFields({ label, sample, onChange }: {
  label: string;
  sample: { collectionTime: string; result: string; releaseTime: string; collector: string };
  onChange: (s: typeof sample) => void;
}) {
  return (
    <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
      <h4 className="font-medium text-sm text-foreground">{label}</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Horário de Coleta</Label>
          <Input type="datetime-local" value={sample.collectionTime} onChange={(e) => onChange({ ...sample, collectionTime: e.target.value })} className="text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Resultado</Label>
          <Input value={sample.result} onChange={(e) => onChange({ ...sample, result: e.target.value })} placeholder="Ex: Positivo / Negativo / Valor" className="text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Horário de Liberação</Label>
          <Input type="datetime-local" value={sample.releaseTime} onChange={(e) => onChange({ ...sample, releaseTime: e.target.value })} className="text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Responsável pela Coleta</Label>
          <Input value={sample.collector} onChange={(e) => onChange({ ...sample, collector: e.target.value })} placeholder="Nome do responsável" className="text-sm" />
        </div>
      </div>
    </div>
  );
}

interface Props { onBack: () => void; }

export const FormDorToracica = ({ onBack }: Props) => {
  const createAttendance = useCreateProtocoloAtendimento();
  const deleteAttendance = useDeleteProtocoloAtendimento();
  const { data: settings } = useProtocoloSettings('dor_toracica');
  const meta = settings?.meta_minutos || 10;

  const [competency, setCompetency] = useState(format(new Date(), 'yyyy-MM'));
  const [arrivalTime, setArrivalTime] = useState('');
  const [ecgTime, setEcgTime] = useState('');
  const [portaEcgMinutes, setPortaEcgMinutes] = useState<number | null>(null);
  const [withinTarget, setWithinTarget] = useState<boolean | null>(null);
  const [riskClassification, setRiskClassification] = useState('');

  // Troponin samples
  const emptySample = { collectionTime: '', result: '', releaseTime: '', collector: '' };
  const [troponinSample1, setTroponinSample1] = useState(emptySample);
  const [troponinSample2, setTroponinSample2] = useState(emptySample);
  const [troponinSample3, setTroponinSample3] = useState(emptySample);

  // Thrombolysis
  const [thrombolysisTime, setThrombolysisTime] = useState('');
  const [thrombolysisComplication, setThrombolysisComplication] = useState(false);
  const [thrombolysisConduct, setThrombolysisConduct] = useState('');
  const [samuArrivalTime, setSamuArrivalTime] = useState('');
  const [destinationHospital, setDestinationHospital] = useState('');
  const [thrombolysisType, setThrombolysisType] = useState<'unidade' | 'samu' | null>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const { data: allAttendances, isLoading: searchLoading } = useProtocoloAtendimentos('dor_toracica');

  const filteredAttendances = allAttendances?.filter((a: any) =>
    searchQuery.length >= 2 && (
      a.record_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.patient_name?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  useEffect(() => {
    if (arrivalTime && ecgTime) {
      const diffMs = new Date(ecgTime).getTime() - new Date(arrivalTime).getTime();
      const diffMinutes = Math.round(diffMs / 60000);
      if (diffMinutes >= 0) {
        setPortaEcgMinutes(diffMinutes);
        setWithinTarget(diffMinutes <= meta);
      } else {
        setPortaEcgMinutes(null);
        setWithinTarget(null);
      }
    } else {
      setPortaEcgMinutes(null);
      setWithinTarget(null);
    }
  }, [arrivalTime, ecgTime, meta]);

  const toISO = (dtl: string) => dtl ? new Date(dtl).toISOString() : null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    if (!arrivalTime || !ecgTime) {
      toast.error('Preencha os horários de chegada e ECG.');
      return;
    }
    if (portaEcgMinutes !== null && portaEcgMinutes < 0) {
      toast.error('O horário do ECG deve ser posterior à chegada.');
      return;
    }

    const data = {
      tipo_protocolo: 'dor_toracica',
      competency,
      record_number: fd.get('record_number') as string,
      patient_name: (fd.get('patient_name') as string) || null,
      sex: (fd.get('sex') as string) || null,
      age: fd.get('age') ? parseInt(fd.get('age') as string) : null,
      arrival_time: new Date(arrivalTime).toISOString(),
      ecg_time: new Date(ecgTime).toISOString(),
      porta_ecg_minutes: portaEcgMinutes || 0,
      within_target: withinTarget || false,
      risk_classification: riskClassification || null,
      first_doctor_time: fd.get('first_doctor_time') ? new Date(fd.get('first_doctor_time') as string).toISOString() : null,
      // Condutas
      conduct_medication: fd.get('conduct_medication') === 'on',
      conduct_oxygen: fd.get('conduct_oxygen') === 'on',
      conduct_monitoring: fd.get('conduct_monitoring') === 'on',
      conduct_referral: fd.get('conduct_referral') === 'on',
      conduct_observation: fd.get('conduct_observation') === 'on',
      conduct_transfer: fd.get('conduct_transfer') === 'on',
      conduct_high_risk: fd.get('conduct_high_risk') === 'on',
      conduct_moderate_risk: fd.get('conduct_moderate_risk') === 'on',
      conduct_low_risk: fd.get('conduct_low_risk') === 'on',
      // Avaliação da Dor
      pain_location: (fd.get('pain_location') as string) || null,
      pain_characteristic: (fd.get('pain_characteristic') as string) || null,
      pain_irradiation: (fd.get('pain_irradiation') as string) || null,
      pain_association: (fd.get('pain_association') as string) || null,
      pain_onset_date: (fd.get('pain_onset_date') as string) || null,
      pain_onset_time: (fd.get('pain_onset_time') as string) || null,
      pain_duration: (fd.get('pain_duration') as string) || null,
      pain_referral: (fd.get('pain_referral') as string) || null,
      // Troponin samples
      troponin_sample1_collection_time: toISO(troponinSample1.collectionTime),
      troponin_sample1_result: troponinSample1.result || null,
      troponin_sample1_release_time: toISO(troponinSample1.releaseTime),
      troponin_sample1_collector: troponinSample1.collector || null,
      troponin_sample2_collection_time: toISO(troponinSample2.collectionTime),
      troponin_sample2_result: troponinSample2.result || null,
      troponin_sample2_release_time: toISO(troponinSample2.releaseTime),
      troponin_sample2_collector: troponinSample2.collector || null,
      troponin_sample3_collection_time: toISO(troponinSample3.collectionTime),
      troponin_sample3_result: troponinSample3.result || null,
      troponin_sample3_release_time: toISO(troponinSample3.releaseTime),
      troponin_sample3_collector: troponinSample3.collector || null,
      // Thrombolysis
      thrombolysis_time: toISO(thrombolysisTime),
      thrombolysis_complication: thrombolysisComplication,
      thrombolysis_conduct: thrombolysisConduct || null,
      samu_arrival_time: toISO(samuArrivalTime),
      destination_hospital: destinationHospital || null,
      thrombolysis_type: thrombolysisType || null,
      // Clínicos
      initial_diagnosis: (fd.get('initial_diagnosis') as string) || null,
      medical_report: (fd.get('medical_report') as string) || null,
    };

    try {
      await createAttendance.mutateAsync(data);
      toast.success('Atendimento registrado com sucesso!');
      onBack();
    } catch {
      toast.error('Não foi possível registrar o atendimento.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cadastrar Atendimento</h1>
          <p className="text-muted-foreground">Registre um novo atendimento de dor torácica</p>
        </div>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <UserSearch className="h-5 w-5" />
            Buscar Pacientes Cadastrados
          </CardTitle>
          <CardDescription>Pesquise por prontuário ou nome para visualizar atendimentos existentes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Digite o nº do prontuário ou nome do paciente..." value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setShowSearch(e.target.value.length >= 2); }}
                className="pl-10" />
              {searchQuery && (
                <Button type="button" variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => { setSearchQuery(''); setShowSearch(false); }}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {showSearch && (
              <div className="border rounded-lg overflow-hidden">
                {searchLoading ? (
                  <div className="p-4 text-center text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Buscando...</div>
                ) : filteredAttendances && filteredAttendances.length > 0 ? (
                  <div className="divide-y max-h-64 overflow-y-auto">
                    {filteredAttendances.map((att: any) => (
                      <div key={att.id} className="p-3 flex items-center justify-between hover:bg-muted/50 transition-colors">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{att.record_number}</span>
                            {att.risk_classification && <RiskBadge classification={att.risk_classification} />}
                            <StatusBadge withinTarget={att.within_target} minutes={att.porta_ecg_minutes} />
                          </div>
                          <p className="text-sm text-muted-foreground">{att.patient_name || 'Paciente não identificado'}{att.age && ` • ${att.age} anos`}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(att.arrival_time.includes("T") ? att.arrival_time : `${att.arrival_time}T12:00:00`), "dd/MM/yyyy 'às' HH:mm")}</p>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                              <AlertDialogDescription>Tem certeza que deseja excluir o atendimento do prontuário <strong>{att.record_number}</strong>? Esta ação não pode ser desfeita.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={async () => { try { await deleteAttendance.mutateAsync(att.id); toast.success('Excluído.'); } catch { toast.error('Erro ao excluir.'); } }}>
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-muted-foreground">Nenhum paciente encontrado com "{searchQuery}"</div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Identificação */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Identificação</CardTitle>
            <CardDescription>Dados do paciente e período</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Competência *</Label>
              <CompetencySelector value={competency} onChange={setCompetency} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="record_number">Nº Prontuário *</Label>
              <Input id="record_number" name="record_number" required placeholder="Ex: 12345" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="patient_name">Nome do Paciente</Label>
              <Input id="patient_name" name="patient_name" placeholder="Opcional" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sex">Sexo</Label>
              <Select name="sex">
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="masculino">Masculino</SelectItem>
                  <SelectItem value="feminino">Feminino</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="age">Idade</Label>
              <Input id="age" name="age" type="number" min="0" max="150" placeholder="Anos" />
            </div>
          </CardContent>
        </Card>

        {/* Indicador Porta-ECG */}
        <Card className={cn(
          'transition-colors',
          withinTarget === true && 'border-green-500/50 bg-green-50/50 dark:bg-green-950/20',
          withinTarget === false && 'border-destructive/50 bg-destructive/5'
        )}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Indicador Protocolo Dor Torácica
            </CardTitle>
            <CardDescription>Meta: ≤ {meta} minutos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>PASSO 1: Hora de Chegada *</Label>
                <Input type="datetime-local" value={arrivalTime} onChange={(e) => setArrivalTime(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>PASSO 2: Hora do ECG *</Label>
                <Input type="datetime-local" value={ecgTime} onChange={(e) => setEcgTime(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Tempo Porta-ECG</Label>
                <div className={cn(
                  'flex items-center justify-center h-10 rounded-md font-bold text-lg',
                  portaEcgMinutes === null && 'bg-muted text-muted-foreground',
                  withinTarget === true && 'bg-green-500 text-white',
                  withinTarget === false && 'bg-destructive text-destructive-foreground'
                )}>
                  {portaEcgMinutes !== null ? (
                    <span className="flex items-center gap-2">
                      {withinTarget ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                      {portaEcgMinutes} min
                    </span>
                  ) : '—'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Classificação e Condutas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Classificação e Condutas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Classificação de Risco</Label>
                <Select name="risk_classification" value={riskClassification} onValueChange={setRiskClassification}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vermelho"><span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-red-500" />Vermelho - Emergência</span></SelectItem>
                    <SelectItem value="laranja"><span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-orange-500" />Laranja - Muito Urgente</span></SelectItem>
                    <SelectItem value="amarelo"><span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-yellow-500" />Amarelo - Urgente</span></SelectItem>
                    <SelectItem value="verde"><span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-green-500" />Verde - Pouco Urgente</span></SelectItem>
                    <SelectItem value="azul"><span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-blue-500" />Azul - Não Urgente</span></SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="first_doctor_time">Horário Primeiro Médico</Label>
                <Input id="first_doctor_time" name="first_doctor_time" type="datetime-local" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Condutas Realizadas</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { id: 'conduct_medication', label: 'Medicação' },
                  { id: 'conduct_oxygen', label: 'Oxigênio' },
                  { id: 'conduct_monitoring', label: 'Monitorização' },
                  { id: 'conduct_referral', label: 'Encaminhamento' },
                  { id: 'conduct_observation', label: 'Observação' },
                  { id: 'conduct_transfer', label: 'Transferência' },
                ].map((item) => (
                  <div key={item.id} className="flex items-center space-x-2">
                    <Checkbox id={item.id} name={item.id} />
                    <Label htmlFor={item.id} className="font-normal cursor-pointer">{item.label}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Estratificação de Risco</Label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'conduct_high_risk', label: 'Alto Risco' },
                  { id: 'conduct_moderate_risk', label: 'Moderado Risco' },
                  { id: 'conduct_low_risk', label: 'Baixo Risco' },
                ].map((item) => (
                  <div key={item.id} className="flex items-center space-x-2">
                    <Checkbox id={item.id} name={item.id} />
                    <Label htmlFor={item.id} className="font-normal cursor-pointer">{item.label}</Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Avaliação da Dor */}
            <div className="space-y-4 pt-4 border-t">
              <Label className="text-base font-semibold">Avaliação da Dor</Label>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Classificação de Risco</Label>
                  <div className="flex items-center h-10 px-3 rounded-md border bg-muted/50">
                    {riskClassification ? <RiskBadge classification={riskClassification} /> : <span className="text-muted-foreground text-sm">Selecione acima</span>}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pain_onset_date">Início da Dor - Data</Label>
                  <Input id="pain_onset_date" name="pain_onset_date" type="date" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pain_onset_time">Início da Dor - Hora</Label>
                  <Input id="pain_onset_time" name="pain_onset_time" type="time" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pain_duration">Tempo de Dor</Label>
                  <Input id="pain_duration" name="pain_duration" placeholder="Ex: 2 horas, 30 minutos" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pain_location">Local</Label>
                  <Select name="pain_location">
                    <SelectTrigger><SelectValue placeholder="Selecione o local" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="precordial">Precordial</SelectItem>
                      <SelectItem value="retroesternal">Retroesternal</SelectItem>
                      <SelectItem value="epigastrica">Epigástrica</SelectItem>
                      <SelectItem value="todo_torax">Todo Tórax</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pain_characteristic">Característica</Label>
                  <Select name="pain_characteristic">
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aperto">Aperto</SelectItem>
                      <SelectItem value="pontada">Pontada</SelectItem>
                      <SelectItem value="compressao">Compressão</SelectItem>
                      <SelectItem value="queimacao">Queimação</SelectItem>
                      <SelectItem value="ao_respirar">Ao Respirar</SelectItem>
                      <SelectItem value="outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pain_irradiation">Irradiação</Label>
                  <Select name="pain_irradiation">
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mse">MSE</SelectItem>
                      <SelectItem value="msd">MSD</SelectItem>
                      <SelectItem value="mandibula">Mandíbula</SelectItem>
                      <SelectItem value="ombro">Ombro</SelectItem>
                      <SelectItem value="pescoco">Pescoço</SelectItem>
                      <SelectItem value="dorso">Dorso</SelectItem>
                      <SelectItem value="outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pain_association">Associações</Label>
                  <Select name="pain_association">
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nauseas">Náuseas</SelectItem>
                      <SelectItem value="sudorese">Sudorese</SelectItem>
                      <SelectItem value="tontura">Tontura</SelectItem>
                      <SelectItem value="falta_de_ar">Falta de Ar</SelectItem>
                      <SelectItem value="sincope">Síncope</SelectItem>
                      <SelectItem value="outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pain_referral">Encaminhamento</Label>
                <Input id="pain_referral" name="pain_referral" defaultValue="Imediatamente sala vermelha e realizar ECG" placeholder="Ex: Imediatamente sala vermelha e realizar ECG" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Biomarcadores - Troponina */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Beaker className="h-5 w-5" />
              Biomarcadores - Troponina
            </CardTitle>
            <CardDescription>Registro das amostras de troponina coletadas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <SampleFields label="1ª Amostra" sample={troponinSample1} onChange={setTroponinSample1} />
            <SampleFields label="2ª Amostra" sample={troponinSample2} onChange={setTroponinSample2} />
            <SampleFields label="3ª Amostra" sample={troponinSample3} onChange={setTroponinSample3} />
          </CardContent>
        </Card>

        {/* Transferência Imediata */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Ambulance className="h-5 w-5" />
              Transferência Imediata
            </CardTitle>
            <CardDescription>Informações sobre trombólise e transferência</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Horário da Trombólise</Label>
                <Input type="datetime-local" value={thrombolysisTime} onChange={(e) => setThrombolysisTime(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Horário de Chegada do SAMU</Label>
                <Input type="datetime-local" value={samuArrivalTime} onChange={(e) => setSamuArrivalTime(e.target.value)} />
              </div>
            </div>

            <div className="space-y-3">
              <Label>Tipo de Trombólise</Label>
              <div className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox id="thrombolysis_unidade" checked={thrombolysisType === 'unidade'} onCheckedChange={(checked) => setThrombolysisType(checked ? 'unidade' : null)} />
                  <Label htmlFor="thrombolysis_unidade" className="text-sm font-normal">Trombólise da Unidade</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="thrombolysis_samu" checked={thrombolysisType === 'samu'} onCheckedChange={(checked) => setThrombolysisType(checked ? 'samu' : null)} />
                  <Label htmlFor="thrombolysis_samu" className="text-sm font-normal">Trombólise do SAMU</Label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Hospital de Destino</Label>
              <Input value={destinationHospital} onChange={(e) => setDestinationHospital(e.target.value)} placeholder="Nome do hospital de transferência" />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="thrombolysis_complication" checked={thrombolysisComplication} onCheckedChange={(checked) => setThrombolysisComplication(checked === true)} />
              <Label htmlFor="thrombolysis_complication" className="text-sm font-normal">Houve intercorrência durante a trombólise?</Label>
            </div>

            {thrombolysisComplication && (
              <div className="space-y-2">
                <Label>Conduta / Observações da Intercorrência</Label>
                <Textarea value={thrombolysisConduct} onChange={(e) => setThrombolysisConduct(e.target.value)} placeholder="Descreva a intercorrência e a conduta adotada..." rows={3} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Informações Clínicas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informações Clínicas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="initial_diagnosis">Diagnóstico Inicial</Label>
              <Input id="initial_diagnosis" name="initial_diagnosis" placeholder="Ex: Dor torácica a esclarecer" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="medical_report">Relatório Médico</Label>
              <Textarea id="medical_report" name="medical_report" rows={6} placeholder="Descreva o quadro clínico, exames realizados, condutas e evolução..." />
            </div>
          </CardContent>
        </Card>

        {/* Botões */}
        <div className="flex justify-end gap-4 pb-4">
          <Button type="button" variant="outline" onClick={onBack}>Cancelar</Button>
          <Button type="submit" disabled={createAttendance.isPending}>
            {createAttendance.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Atendimento
          </Button>
        </div>
      </form>
    </div>
  );
};
