import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateProtocoloAtendimento, useProtocoloSettings } from '@/hooks/useProtocoloAtendimentos';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';

interface Props { onBack: () => void; }

export const FormSepseAdulto = ({ onBack }: Props) => {
  const create = useCreateProtocoloAtendimento();
  const { data: settings } = useProtocoloSettings('sepse_adulto');
  const meta = settings?.meta_minutos || 60;

  const [competency, setCompetency] = useState(format(new Date(), 'yyyy-MM'));
  const [recordNumber, setRecordNumber] = useState('');
  const [patientName, setPatientName] = useState('');
  const [sex, setSex] = useState('');
  const [age, setAge] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [ecgTime, setEcgTime] = useState('');
  const [riskClass, setRiskClass] = useState('');
  const [sepseMedico, setSepseMedico] = useState('');
  const [sepseSuspeita, setSepseSuspeita] = useState(false);
  const [sepseMotivo, setSepseMotivo] = useState('');
  const [sepseHorario, setSepseHorario] = useState('');
  const [protocolOpenedAt, setProtocolOpenedAt] = useState('');
  const [protocolSector, setProtocolSector] = useState('');
  // SIRS
  const [sirs, setSirs] = useState<Record<string, boolean>>({});
  // Foco
  const [foco, setFoco] = useState<Record<string, boolean>>({});
  // Vitals
  const [vitalPa, setVitalPa] = useState('');
  const [vitalFc, setVitalFc] = useState('');
  const [vitalFr, setVitalFr] = useState('');
  const [vitalSpo2, setVitalSpo2] = useState('');
  const [vitalTemp, setVitalTemp] = useState('');
  // ATB
  const [atb1Nome, setAtb1Nome] = useState('');
  const [atb1Dose, setAtb1Dose] = useState('');
  const [atb1Horario, setAtb1Horario] = useState('');
  const [atbProfissional, setAtbProfissional] = useState('');
  // Kit Sepse
  const [kitSepse, setKitSepse] = useState(false);
  const [labChamado, setLabChamado] = useState('');
  const [labColeta, setLabColeta] = useState('');
  // Choque
  const [choqueSeptico, setChoqueSeptico] = useState(false);
  const [choqueReposicao, setChoqueReposicao] = useState('');
  const [choqueVasopressor, setChoqueVasopressor] = useState('');
  // Destino
  const [destino, setDestino] = useState('');
  const [destinoInst, setDestinoInst] = useState('');
  // Assinaturas
  const [assEnf, setAssEnf] = useState('');
  const [assMed, setAssMed] = useState('');
  const [assFarm, setAssFarm] = useState('');

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

  const toggleSirs = (k: string) => setSirs(p => ({ ...p, [k]: !p[k] }));
  const toggleFoco = (k: string) => setFoco(p => ({ ...p, [k]: !p[k] }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordNumber || !arrivalTime) { toast.error('Preencha prontuário e horário.'); return; }
    if (!sepseMedico.trim()) { toast.error('Preencha o nome do médico.'); return; }
    setSaving(true);
    try {
      await create.mutateAsync({
        tipo_protocolo: 'sepse_adulto',
        competency, record_number: recordNumber, patient_name: patientName || null,
        sex: sex || null, age: age ? parseInt(age) : null,
        arrival_time: new Date(arrivalTime).toISOString(),
        ecg_time: ecgTime ? new Date(ecgTime).toISOString() : null,
        porta_ecg_minutes: portaEcg || 0, within_target: withinTarget || false,
        risk_classification: riskClass || null,
        sepse_medico: sepseMedico, sepse_suspeita: sepseSuspeita,
        sepse_motivo: sepseMotivo || null,
        sepse_horario: sepseHorario ? new Date(sepseHorario).toISOString() : null,
        protocol_opened_at: protocolOpenedAt ? new Date(protocolOpenedAt).toISOString() : null,
        protocol_opened_by_sector: protocolSector || null,
        sirs_temp_alta: sirs.temp_alta || false, sirs_temp_baixa: sirs.temp_baixa || false,
        sirs_fc_alta: sirs.fc_alta || false, sirs_fr_alta: sirs.fr_alta || false,
        sirs_leucocitose: sirs.leucocitose || false, sirs_leucopenia: sirs.leucopenia || false,
        sirs_celulas_jovens: sirs.celulas_jovens || false, sirs_plaquetas: sirs.plaquetas || false,
        sirs_lactato: sirs.lactato || false, sirs_bilirrubina: sirs.bilirrubina || false,
        sirs_creatinina: sirs.creatinina || false,
        disfuncao_pa_baixa: sirs.pa_baixa || false, disfuncao_sato2_baixa: sirs.sato2_baixa || false,
        disfuncao_consciencia: sirs.consciencia || false,
        foco_pulmonar: foco.pulmonar || false, foco_urinario: foco.urinario || false,
        foco_abdominal: foco.abdominal || false, foco_pele_partes_moles: foco.pele || false,
        foco_corrente_sanguinea_cateter: foco.cateter || false, foco_sem_foco_definido: foco.sem_foco || false,
        kit_sepse_coletado: kitSepse,
        lab_villac_horario_chamado: labChamado ? new Date(labChamado).toISOString() : null,
        lab_villac_horario_coleta: labColeta ? new Date(labColeta).toISOString() : null,
        vital_pa: vitalPa || null, vital_fc: vitalFc ? parseInt(vitalFc) : null,
        vital_fr: vitalFr ? parseInt(vitalFr) : null, vital_spo2: vitalSpo2 ? parseFloat(vitalSpo2) : null,
        vital_temperatura: vitalTemp ? parseFloat(vitalTemp) : null,
        atb1_nome: atb1Nome || null, atb1_dose: atb1Dose || null,
        atb1_horario_inicio: atb1Horario ? new Date(atb1Horario).toISOString() : null,
        atb_profissional: atbProfissional || null,
        choque_septico: choqueSeptico,
        choque_reposicao_data_hora: choqueReposicao ? new Date(choqueReposicao).toISOString() : null,
        choque_vasopressor_data_hora: choqueVasopressor ? new Date(choqueVasopressor).toISOString() : null,
        destino_paciente: destino || null, destino_instituicao_nome: destinoInst || null,
        assinatura_enfermeiro: assEnf || null, assinatura_medico: assMed || null,
        assinatura_farmacia: assFarm || null,
      });
      toast.success('Atendimento de sepse adulto registrado!');
      onBack();
    } catch (err: any) { toast.error(err.message || 'Erro ao salvar.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <h2 className="text-xl font-bold">Protocolo de Sepse Adulto</h2>
          <p className="text-sm text-muted-foreground">Registrar novo atendimento • Meta ATB: ≤ {meta} min</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Identificação */}
        <Card><CardHeader><CardTitle className="text-base">Identificação</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><Label>Competência</Label><Input type="month" value={competency} onChange={e => setCompetency(e.target.value)} /></div>
            <div><Label>Nº Prontuário *</Label><Input value={recordNumber} onChange={e => setRecordNumber(e.target.value)} required /></div>
            <div><Label>Paciente</Label><Input value={patientName} onChange={e => setPatientName(e.target.value)} /></div>
            <div><Label>Sexo</Label><Select value={sex} onValueChange={setSex}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent><SelectItem value="masculino">Masculino</SelectItem><SelectItem value="feminino">Feminino</SelectItem></SelectContent></Select></div>
            <div><Label>Idade</Label><Input type="number" value={age} onChange={e => setAge(e.target.value)} /></div>
            <div><Label>Médico *</Label><Input value={sepseMedico} onChange={e => setSepseMedico(e.target.value)} required /></div>
          </CardContent>
        </Card>

        {/* Abertura protocolo */}
        <Card><CardHeader><CardTitle className="text-base">Abertura do Protocolo</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><Label>Horário Chegada *</Label><Input type="datetime-local" value={arrivalTime} onChange={e => setArrivalTime(e.target.value)} required /></div>
            <div><Label>Abertura Protocolo</Label><Input type="datetime-local" value={protocolOpenedAt} onChange={e => setProtocolOpenedAt(e.target.value)} /></div>
            <div><Label>Setor Abertura</Label><Input value={protocolSector} onChange={e => setProtocolSector(e.target.value)} /></div>
            <div className="flex items-center gap-2 md:col-span-3"><Checkbox checked={sepseSuspeita} onCheckedChange={v => setSepseSuspeita(!!v)} id="susp" /><label htmlFor="susp" className="text-sm font-medium cursor-pointer">Suspeita de Sepse</label></div>
            {sepseSuspeita && (<><div><Label>Motivo</Label><Input value={sepseMotivo} onChange={e => setSepseMotivo(e.target.value)} /></div><div><Label>Horário Suspeita</Label><Input type="datetime-local" value={sepseHorario} onChange={e => setSepseHorario(e.target.value)} /></div></>)}
          </CardContent>
        </Card>

        {/* SIRS */}
        <Card><CardHeader><CardTitle className="text-base">Critérios SIRS / Disfunção Orgânica</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { k: 'temp_alta', l: 'Temperatura > 38°C' }, { k: 'temp_baixa', l: 'Temperatura < 36°C' },
              { k: 'fc_alta', l: 'FC > 90 bpm' }, { k: 'fr_alta', l: 'FR > 20 irpm' },
              { k: 'leucocitose', l: 'Leucocitose > 12.000' }, { k: 'leucopenia', l: 'Leucopenia < 4.000' },
              { k: 'celulas_jovens', l: '> 10% cél. jovens' }, { k: 'plaquetas', l: 'Plaquetas < 100.000' },
              { k: 'lactato', l: 'Lactato > 2' }, { k: 'bilirrubina', l: 'Bilirrubina > 2' },
              { k: 'creatinina', l: 'Creatinina > 2' }, { k: 'pa_baixa', l: 'PA sistólica < 90' },
              { k: 'sato2_baixa', l: 'SatO₂ < 90%' }, { k: 'consciencia', l: 'Rebaixamento consciência' },
            ].map(c => (<div key={c.k} className="flex items-center gap-2"><Checkbox checked={sirs[c.k] || false} onCheckedChange={() => toggleSirs(c.k)} id={`s-${c.k}`} /><label htmlFor={`s-${c.k}`} className="text-sm cursor-pointer">{c.l}</label></div>))}
          </CardContent>
        </Card>

        {/* Sinais Vitais */}
        <Card><CardHeader><CardTitle className="text-base">Sinais Vitais</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div><Label>PA</Label><Input value={vitalPa} onChange={e => setVitalPa(e.target.value)} placeholder="120/80" /></div>
            <div><Label>FC</Label><Input type="number" value={vitalFc} onChange={e => setVitalFc(e.target.value)} /></div>
            <div><Label>FR</Label><Input type="number" value={vitalFr} onChange={e => setVitalFr(e.target.value)} /></div>
            <div><Label>SpO₂ (%)</Label><Input type="number" step="0.1" value={vitalSpo2} onChange={e => setVitalSpo2(e.target.value)} /></div>
            <div><Label>Temp (°C)</Label><Input type="number" step="0.1" value={vitalTemp} onChange={e => setVitalTemp(e.target.value)} /></div>
          </CardContent>
        </Card>

        {/* Foco Infeccioso */}
        <Card><CardHeader><CardTitle className="text-base">Foco Infeccioso</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { k: 'pulmonar', l: 'Pulmonar' }, { k: 'urinario', l: 'Urinário' },
              { k: 'abdominal', l: 'Abdominal' }, { k: 'pele', l: 'Pele/Partes Moles' },
              { k: 'cateter', l: 'Corrente Sanguínea/Cateter' }, { k: 'sem_foco', l: 'Sem foco definido' },
            ].map(c => (<div key={c.k} className="flex items-center gap-2"><Checkbox checked={foco[c.k] || false} onCheckedChange={() => toggleFoco(c.k)} id={`f-${c.k}`} /><label htmlFor={`f-${c.k}`} className="text-sm cursor-pointer">{c.l}</label></div>))}
          </CardContent>
        </Card>

        {/* Kit Sepse + Lab */}
        <Card><CardHeader><CardTitle className="text-base">Kit Sepse e Laboratório</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2"><Checkbox checked={kitSepse} onCheckedChange={v => setKitSepse(!!v)} id="kit" /><label htmlFor="kit" className="text-sm font-medium cursor-pointer">Kit Sepse Coletado</label></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>Lab Villac - Horário Chamado</Label><Input type="datetime-local" value={labChamado} onChange={e => setLabChamado(e.target.value)} /></div>
              <div><Label>Lab Villac - Horário Coleta</Label><Input type="datetime-local" value={labColeta} onChange={e => setLabColeta(e.target.value)} /></div>
            </div>
          </CardContent>
        </Card>

        {/* ATB */}
        <Card><CardHeader><CardTitle className="text-base">Antibioticoterapia</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div><Label>ATB Nome</Label><Input value={atb1Nome} onChange={e => setAtb1Nome(e.target.value)} /></div>
            <div><Label>Dose</Label><Input value={atb1Dose} onChange={e => setAtb1Dose(e.target.value)} /></div>
            <div><Label>Horário Início</Label><Input type="datetime-local" value={atb1Horario} onChange={e => setAtb1Horario(e.target.value)} /></div>
            <div><Label>Profissional</Label><Input value={atbProfissional} onChange={e => setAtbProfissional(e.target.value)} /></div>
          </CardContent>
        </Card>

        {/* Choque Séptico */}
        <Card><CardHeader><CardTitle className="text-base">Choque Séptico</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2"><Checkbox checked={choqueSeptico} onCheckedChange={v => setChoqueSeptico(!!v)} id="choque" /><label htmlFor="choque" className="text-sm font-medium cursor-pointer">Choque Séptico</label></div>
            {choqueSeptico && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>Reposição Volêmica - Data/Hora</Label><Input type="datetime-local" value={choqueReposicao} onChange={e => setChoqueReposicao(e.target.value)} /></div>
                <div><Label>Vasopressor - Data/Hora</Label><Input type="datetime-local" value={choqueVasopressor} onChange={e => setChoqueVasopressor(e.target.value)} /></div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Destino + Assinaturas */}
        <Card><CardHeader><CardTitle className="text-base">Destino e Assinaturas</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>Destino</Label><Select value={destino} onValueChange={setDestino}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent><SelectItem value="alta">Alta</SelectItem><SelectItem value="internacao">Internação</SelectItem><SelectItem value="uti">UTI</SelectItem><SelectItem value="transferencia">Transferência</SelectItem><SelectItem value="obito">Óbito</SelectItem></SelectContent></Select></div>
              {destino === 'transferencia' && <div><Label>Instituição</Label><Input value={destinoInst} onChange={e => setDestinoInst(e.target.value)} /></div>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><Label>Enfermeiro(a)</Label><Input value={assEnf} onChange={e => setAssEnf(e.target.value)} /></div>
              <div><Label>Médico(a)</Label><Input value={assMed} onChange={e => setAssMed(e.target.value)} /></div>
              <div><Label>Farmacêutico(a)</Label><Input value={assFarm} onChange={e => setAssFarm(e.target.value)} /></div>
            </div>
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
