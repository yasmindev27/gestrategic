import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateProtocoloAtendimento, useProtocoloSettings } from '@/hooks/useProtocoloAtendimentos';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

interface Props { onBack: () => void; }

export const FormDorToracica = ({ onBack }: Props) => {
  const create = useCreateProtocoloAtendimento();
  const { data: settings } = useProtocoloSettings('dor_toracica');
  const meta = settings?.meta_minutos || 10;

  const [competency, setCompetency] = useState(format(new Date(), 'yyyy-MM'));
  const [recordNumber, setRecordNumber] = useState('');
  const [patientName, setPatientName] = useState('');
  const [sex, setSex] = useState('');
  const [age, setAge] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [ecgTime, setEcgTime] = useState('');
  const [riskClass, setRiskClass] = useState('');
  const [firstDoctorTime, setFirstDoctorTime] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [delayReason, setDelayReason] = useState('');
  const [actionPlan, setActionPlan] = useState('');
  // Pain
  const [painLocation, setPainLocation] = useState('');
  const [painCharacteristic, setPainCharacteristic] = useState('');
  const [painIrradiation, setPainIrradiation] = useState('');
  const [painAssociation, setPainAssociation] = useState('');
  const [painOnsetDate, setPainOnsetDate] = useState('');
  const [painOnsetTime, setPainOnsetTime] = useState('');
  const [painDuration, setPainDuration] = useState('');
  // Condutas
  const [conducts, setConducts] = useState<Record<string, boolean>>({});
  // Troponin
  const [trop1Time, setTrop1Time] = useState('');
  const [trop1Result, setTrop1Result] = useState('');
  const [trop1Collector, setTrop1Collector] = useState('');
  // Thrombolysis
  const [thromboTime, setThromboTime] = useState('');
  const [thromboType, setThromboType] = useState('');

  const [portaEcg, setPortaEcg] = useState<number | null>(null);
  const [withinTarget, setWithinTarget] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (arrivalTime && ecgTime) {
      const diff = Math.round((new Date(ecgTime).getTime() - new Date(arrivalTime).getTime()) / 60000);
      if (diff >= 0) { setPortaEcg(diff); setWithinTarget(diff <= meta); }
      else { setPortaEcg(null); setWithinTarget(null); }
    } else { setPortaEcg(null); setWithinTarget(null); }
  }, [arrivalTime, ecgTime, meta]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordNumber || !arrivalTime || !ecgTime) {
      toast.error('Preencha prontuário, horário de chegada e ECG.');
      return;
    }
    setSaving(true);
    try {
      await create.mutateAsync({
        tipo_protocolo: 'dor_toracica',
        competency,
        record_number: recordNumber,
        patient_name: patientName || null,
        sex: sex || null,
        age: age ? parseInt(age) : null,
        arrival_time: new Date(arrivalTime).toISOString(),
        ecg_time: new Date(ecgTime).toISOString(),
        porta_ecg_minutes: portaEcg || 0,
        within_target: withinTarget || false,
        risk_classification: riskClass || null,
        first_doctor_time: firstDoctorTime ? new Date(firstDoctorTime).toISOString() : null,
        initial_diagnosis: diagnosis || null,
        delay_reason: delayReason || null,
        action_plan: actionPlan || null,
        pain_location: painLocation || null,
        pain_characteristic: painCharacteristic || null,
        pain_irradiation: painIrradiation || null,
        pain_association: painAssociation || null,
        pain_onset_date: painOnsetDate || null,
        pain_onset_time: painOnsetTime || null,
        pain_duration: painDuration || null,
        conduct_medication: conducts.medication || false,
        conduct_oxygen: conducts.oxygen || false,
        conduct_monitoring: conducts.monitoring || false,
        conduct_referral: conducts.referral || false,
        conduct_observation: conducts.observation || false,
        conduct_transfer: conducts.transfer || false,
        troponin_sample1_collection_time: trop1Time ? new Date(trop1Time).toISOString() : null,
        troponin_sample1_result: trop1Result || null,
        troponin_sample1_collector: trop1Collector || null,
        thrombolysis_time: thromboTime ? new Date(thromboTime).toISOString() : null,
        thrombolysis_type: thromboType || null,
      });
      toast.success('Atendimento registrado com sucesso!');
      onBack();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar.');
    } finally { setSaving(false); }
  };

  const toggleConduct = (key: string) => setConducts(p => ({ ...p, [key]: !p[key] }));

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <h2 className="text-xl font-bold">Protocolo Dor Torácica</h2>
          <p className="text-sm text-muted-foreground">Registrar novo atendimento • Meta: ≤ {meta} min</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Competência + Prontuário */}
        <Card>
          <CardHeader><CardTitle className="text-base">Identificação</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><Label>Competência</Label><Input type="month" value={competency} onChange={e => setCompetency(e.target.value)} /></div>
            <div><Label>Nº Prontuário *</Label><Input value={recordNumber} onChange={e => setRecordNumber(e.target.value)} placeholder="Ex: 123456" required /></div>
            <div><Label>Nome do Paciente</Label><Input value={patientName} onChange={e => setPatientName(e.target.value)} /></div>
            <div><Label>Sexo</Label>
              <Select value={sex} onValueChange={setSex}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="masculino">Masculino</SelectItem>
                  <SelectItem value="feminino">Feminino</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Idade</Label><Input type="number" value={age} onChange={e => setAge(e.target.value)} /></div>
            <div><Label>Classificação de Risco</Label>
              <Select value={riskClass} onValueChange={setRiskClass}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="vermelho">🔴 Vermelho</SelectItem>
                  <SelectItem value="laranja">🟠 Laranja</SelectItem>
                  <SelectItem value="amarelo">🟡 Amarelo</SelectItem>
                  <SelectItem value="verde">🟢 Verde</SelectItem>
                  <SelectItem value="azul">🔵 Azul</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tempo Porta-ECG */}
        <Card>
          <CardHeader><CardTitle className="text-base">Tempo Porta-ECG</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><Label>Horário Chegada *</Label><Input type="datetime-local" value={arrivalTime} onChange={e => setArrivalTime(e.target.value)} required /></div>
              <div><Label>Horário ECG *</Label><Input type="datetime-local" value={ecgTime} onChange={e => setEcgTime(e.target.value)} required /></div>
              <div><Label>1º Atend. Médico</Label><Input type="datetime-local" value={firstDoctorTime} onChange={e => setFirstDoctorTime(e.target.value)} /></div>
            </div>
            {portaEcg !== null && (
              <div className={`p-4 rounded-lg flex items-center gap-3 ${withinTarget ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                {withinTarget ? <CheckCircle2 className="h-6 w-6 text-emerald-600" /> : <AlertCircle className="h-6 w-6 text-destructive" />}
                <div>
                  <p className="font-bold text-lg">{portaEcg} minutos</p>
                  <p className="text-sm">{withinTarget ? `✓ Dentro da meta (≤ ${meta} min)` : `✗ Fora da meta (> ${meta} min)`}</p>
                </div>
              </div>
            )}
            {withinTarget === false && (
              <div><Label>Motivo do Atraso</Label><Textarea value={delayReason} onChange={e => setDelayReason(e.target.value)} placeholder="Descreva o motivo..." /></div>
            )}
          </CardContent>
        </Card>

        {/* Avaliação da Dor */}
        <Card>
          <CardHeader><CardTitle className="text-base">Avaliação da Dor</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Localização</Label><Input value={painLocation} onChange={e => setPainLocation(e.target.value)} placeholder="Ex: Precordial" /></div>
            <div><Label>Característica</Label><Input value={painCharacteristic} onChange={e => setPainCharacteristic(e.target.value)} placeholder="Ex: Opressiva" /></div>
            <div><Label>Irradiação</Label><Input value={painIrradiation} onChange={e => setPainIrradiation(e.target.value)} placeholder="Ex: MSE, mandíbula" /></div>
            <div><Label>Associação</Label><Input value={painAssociation} onChange={e => setPainAssociation(e.target.value)} placeholder="Ex: Sudorese, náusea" /></div>
            <div><Label>Data Início</Label><Input type="date" value={painOnsetDate} onChange={e => setPainOnsetDate(e.target.value)} /></div>
            <div><Label>Hora Início</Label><Input type="time" value={painOnsetTime} onChange={e => setPainOnsetTime(e.target.value)} /></div>
            <div><Label>Duração</Label><Input value={painDuration} onChange={e => setPainDuration(e.target.value)} placeholder="Ex: 30 minutos" /></div>
          </CardContent>
        </Card>

        {/* Condutas */}
        <Card>
          <CardHeader><CardTitle className="text-base">Condutas</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { key: 'medication', label: 'Medicação' },
              { key: 'oxygen', label: 'Oxigênio' },
              { key: 'monitoring', label: 'Monitorização' },
              { key: 'referral', label: 'Encaminhamento' },
              { key: 'observation', label: 'Observação' },
              { key: 'transfer', label: 'Transferência' },
            ].map(c => (
              <div key={c.key} className="flex items-center gap-2">
                <Checkbox checked={conducts[c.key] || false} onCheckedChange={() => toggleConduct(c.key)} id={`c-${c.key}`} />
                <label htmlFor={`c-${c.key}`} className="text-sm cursor-pointer">{c.label}</label>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Troponina */}
        <Card>
          <CardHeader><CardTitle className="text-base">Troponina - 1ª Amostra</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><Label>Horário Coleta</Label><Input type="datetime-local" value={trop1Time} onChange={e => setTrop1Time(e.target.value)} /></div>
            <div><Label>Resultado</Label><Input value={trop1Result} onChange={e => setTrop1Result(e.target.value)} placeholder="Ex: 0.04 ng/mL" /></div>
            <div><Label>Coletado por</Label><Input value={trop1Collector} onChange={e => setTrop1Collector(e.target.value)} /></div>
          </CardContent>
        </Card>

        {/* Diagnóstico */}
        <Card>
          <CardHeader><CardTitle className="text-base">Diagnóstico e Plano de Ação</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Diagnóstico Inicial</Label><Textarea value={diagnosis} onChange={e => setDiagnosis(e.target.value)} /></div>
            <div><Label>Plano de Ação</Label><Textarea value={actionPlan} onChange={e => setActionPlan(e.target.value)} /></div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2 pb-4">
          <Button type="button" variant="outline" onClick={onBack}>Cancelar</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar Atendimento'}</Button>
        </div>
      </form>
    </div>
  );
};
