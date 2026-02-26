import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateProtocoloAtendimento } from '@/hooks/useProtocoloAtendimentos';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle2, AlertCircle, Clock, Loader2, UserSearch, Search, X, Edit, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props { onBack: () => void; }

export const FormDorToracica = ({ onBack }: Props) => {
  const createAttendance = useCreateProtocoloAtendimento();
  const meta = 10;

  const [competency, setCompetency] = useState(format(new Date(), 'yyyy-MM'));
  const [arrivalTime, setArrivalTime] = useState('');
  const [ecgTime, setEcgTime] = useState('');
  const [portaEcgMinutes, setPortaEcgMinutes] = useState<number | null>(null);
  const [withinTarget, setWithinTarget] = useState<boolean | null>(null);
  const [riskClassification, setRiskClassification] = useState('');
  const [actionPlan, setActionPlan] = useState('');

  // Troponin samples state
  const emptySample = { collectionTime: '', result: '', releaseTime: '', collector: '' };
  const [troponinSample1, setTroponinSample1] = useState(emptySample);
  const [troponinSample2, setTroponinSample2] = useState(emptySample);
  const [troponinSample3, setTroponinSample3] = useState(emptySample);
  const [thrombolysisTime, setThrombolysisTime] = useState('');
  const [thrombolysisComplication, setThrombolysisComplication] = useState(false);
  const [thrombolysisConduct, setThrombolysisConduct] = useState('');
  const [samuArrivalTime, setSamuArrivalTime] = useState('');
  const [destinationHospital, setDestinationHospital] = useState('');
  const [thrombolysisType, setThrombolysisType] = useState<'unidade' | 'samu' | ''>('');

  const toISOString = (val: string) => val ? new Date(val).toISOString() : undefined;

  useEffect(() => {
    if (arrivalTime && ecgTime) {
      const diff = Math.round((new Date(ecgTime).getTime() - new Date(arrivalTime).getTime()) / 60000);
      if (diff >= 0) { setPortaEcgMinutes(diff); setWithinTarget(diff <= meta); }
      else { setPortaEcgMinutes(null); setWithinTarget(null); }
    } else { setPortaEcgMinutes(null); setWithinTarget(null); }
  }, [arrivalTime, ecgTime, meta]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    if (!arrivalTime || !ecgTime) {
      toast.error('Preencha os horários de chegada e ECG.');
      return;
    }
    if (portaEcgMinutes !== null && portaEcgMinutes < 0) {
      toast.error('O horário do ECG deve ser posterior à chegada.');
      return;
    }

    const data: Record<string, any> = {
      tipo_protocolo: 'dor_toracica',
      competency,
      record_number: formData.get('record_number') as string,
      patient_name: (formData.get('patient_name') as string) || null,
      sex: (formData.get('sex') as string) || null,
      age: formData.get('age') ? parseInt(formData.get('age') as string) : null,
      arrival_time: new Date(arrivalTime).toISOString(),
      ecg_time: new Date(ecgTime).toISOString(),
      porta_ecg_minutes: portaEcgMinutes || 0,
      within_target: withinTarget || false,
      delay_reason: (formData.get('delay_reason') as string) || null,
      delay_reason_other: (formData.get('delay_reason_other') as string) || null,
      conduct_medication: formData.get('conduct_medication') === 'on',
      conduct_oxygen: formData.get('conduct_oxygen') === 'on',
      conduct_monitoring: formData.get('conduct_monitoring') === 'on',
      conduct_referral: formData.get('conduct_referral') === 'on',
      conduct_observation: formData.get('conduct_observation') === 'on',
      conduct_transfer: formData.get('conduct_transfer') === 'on',
      conduct_high_risk: formData.get('conduct_high_risk') === 'on',
      conduct_moderate_risk: formData.get('conduct_moderate_risk') === 'on',
      conduct_low_risk: formData.get('conduct_low_risk') === 'on',
      risk_classification: riskClassification || null,
      first_doctor_time: formData.get('first_doctor_time') ? new Date(formData.get('first_doctor_time') as string).toISOString() : null,
      initial_diagnosis: (formData.get('initial_diagnosis') as string) || null,
      medical_report: (formData.get('medical_report') as string) || null,
      action_plan: actionPlan || null,
      pain_location: (formData.get('pain_location') as string) || null,
      pain_characteristic: (formData.get('pain_characteristic') as string) || null,
      pain_irradiation: (formData.get('pain_irradiation') as string) || null,
      pain_association: (formData.get('pain_association') as string) || null,
      pain_onset_date: (formData.get('pain_onset_date') as string) || null,
      pain_onset_time: (formData.get('pain_onset_time') as string) || null,
      pain_duration: (formData.get('pain_duration') as string) || null,
      pain_referral: (formData.get('pain_referral') as string) || null,
      troponin_sample1_collection_time: toISOString(troponinSample1.collectionTime),
      troponin_sample1_result: troponinSample1.result || null,
      troponin_sample1_release_time: toISOString(troponinSample1.releaseTime),
      troponin_sample1_collector: troponinSample1.collector || null,
      troponin_sample2_collection_time: toISOString(troponinSample2.collectionTime),
      troponin_sample2_result: troponinSample2.result || null,
      troponin_sample2_release_time: toISOString(troponinSample2.releaseTime),
      troponin_sample2_collector: troponinSample2.collector || null,
      troponin_sample3_collection_time: toISOString(troponinSample3.collectionTime),
      troponin_sample3_result: troponinSample3.result || null,
      troponin_sample3_release_time: toISOString(troponinSample3.releaseTime),
      troponin_sample3_collector: troponinSample3.collector || null,
      thrombolysis_time: toISOString(thrombolysisTime),
      thrombolysis_complication: thrombolysisComplication,
      thrombolysis_conduct: thrombolysisConduct || null,
      samu_arrival_time: toISOString(samuArrivalTime),
      destination_hospital: destinationHospital || null,
      thrombolysis_type: thrombolysisType || null,
    };

    try {
      await createAttendance.mutateAsync(data);
      toast.success('Atendimento registrado com sucesso.');
      onBack();
    } catch {
      toast.error('Não foi possível registrar o atendimento.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Cadastrar Atendimento</h1>
            <p className="text-muted-foreground">Registre um novo atendimento de dor torácica</p>
          </div>
        </div>
      </div>

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
              <Input type="month" value={competency} onChange={e => setCompetency(e.target.value)} />
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

        {/* Tempos - Protocolo Dor Torácica */}
        <Card className={cn(
          'transition-colors',
          withinTarget === true && 'border-emerald-500/50 bg-emerald-50/50',
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
                <Input type="datetime-local" value={arrivalTime} onChange={e => setArrivalTime(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>PASSO 2: Hora do ECG *</Label>
                <Input type="datetime-local" value={ecgTime} onChange={e => setEcgTime(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Tempo Porta-ECG</Label>
                <div className={cn(
                  'flex items-center justify-center h-10 rounded-md font-bold text-lg',
                  portaEcgMinutes === null && 'bg-muted text-muted-foreground',
                  withinTarget === true && 'bg-emerald-500 text-white',
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

            {withinTarget === false && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-destructive/20">
                <div className="space-y-2">
                  <Label htmlFor="delay_reason">Motivo do Atraso</Label>
                  <Textarea id="delay_reason" name="delay_reason" placeholder="Descreva o motivo do atraso..." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="delay_reason_other">Detalhe (se "Outros")</Label>
                  <Input id="delay_reason_other" name="delay_reason_other" placeholder="Especifique" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Classificação e Condutas */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Classificação e Condutas</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Classificação de Risco</Label>
                <Select value={riskClassification} onValueChange={setRiskClassification}>
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2"><Label htmlFor="pain_onset_date">Início da Dor - Data</Label><Input id="pain_onset_date" name="pain_onset_date" type="date" /></div>
                <div className="space-y-2"><Label htmlFor="pain_onset_time">Início da Dor - Hora</Label><Input id="pain_onset_time" name="pain_onset_time" type="time" /></div>
                <div className="space-y-2"><Label htmlFor="pain_duration">Tempo de Dor</Label><Input id="pain_duration" name="pain_duration" placeholder="Ex: 2 horas" /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Local</Label>
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
                  <Label>Característica</Label>
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
                  <Label>Irradiação</Label>
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
                  <Label>Associações</Label>
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
                <Input id="pain_referral" name="pain_referral" defaultValue="Imediatamente sala vermelha e realizar ECG" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Troponina */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Amostras de Troponina</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            {[
              { label: '1ª Amostra', sample: troponinSample1, setSample: setTroponinSample1 },
              { label: '2ª Amostra', sample: troponinSample2, setSample: setTroponinSample2 },
              { label: '3ª Amostra', sample: troponinSample3, setSample: setTroponinSample3 },
            ].map((s, i) => (
              <div key={i} className="space-y-2">
                <p className="font-medium text-sm">{s.label}</p>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1"><Label>Horário Coleta</Label><Input type="datetime-local" value={s.sample.collectionTime} onChange={e => s.setSample({...s.sample, collectionTime: e.target.value})} /></div>
                  <div className="space-y-1"><Label>Resultado</Label><Input value={s.sample.result} onChange={e => s.setSample({...s.sample, result: e.target.value})} placeholder="Ex: 0.04 ng/mL" /></div>
                  <div className="space-y-1"><Label>Horário Liberação</Label><Input type="datetime-local" value={s.sample.releaseTime} onChange={e => s.setSample({...s.sample, releaseTime: e.target.value})} /></div>
                  <div className="space-y-1"><Label>Coletado por</Label><Input value={s.sample.collector} onChange={e => s.setSample({...s.sample, collector: e.target.value})} /></div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Trombólise */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Trombólise</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={thrombolysisType} onValueChange={(v) => setThrombolysisType(v as any)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unidade">Na Unidade</SelectItem>
                    <SelectItem value="samu">SAMU</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Horário Trombólise</Label><Input type="datetime-local" value={thrombolysisTime} onChange={e => setThrombolysisTime(e.target.value)} /></div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox checked={thrombolysisComplication} onCheckedChange={(c) => setThrombolysisComplication(c === true)} id="thromb_comp" />
              <Label htmlFor="thromb_comp" className="font-normal">Complicação na Trombólise</Label>
            </div>
            {thrombolysisComplication && (
              <div className="space-y-2"><Label>Conduta</Label><Textarea value={thrombolysisConduct} onChange={e => setThrombolysisConduct(e.target.value)} /></div>
            )}
            {thrombolysisType === 'samu' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Horário Chegada SAMU</Label><Input type="datetime-local" value={samuArrivalTime} onChange={e => setSamuArrivalTime(e.target.value)} /></div>
                <div className="space-y-2"><Label>Hospital de Destino</Label><Input value={destinationHospital} onChange={e => setDestinationHospital(e.target.value)} /></div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Diagnóstico e Relatório */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Informações Clínicas</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label htmlFor="initial_diagnosis">Diagnóstico Inicial</Label><Input id="initial_diagnosis" name="initial_diagnosis" placeholder="Ex: Dor torácica a esclarecer" /></div>
            <div className="space-y-2"><Label htmlFor="medical_report">Relatório Médico</Label><Textarea id="medical_report" name="medical_report" rows={6} placeholder="Descreva o quadro clínico, exames realizados, condutas e evolução..." /></div>
          </CardContent>
        </Card>

        {/* Botões */}
        <div className="flex justify-end gap-4 pb-6">
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
