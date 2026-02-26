import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateProtocoloAtendimento, useProtocoloAtendimentos, useDeleteProtocoloAtendimento, useProtocoloSettings } from '@/hooks/useProtocoloAtendimentos';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, AlertCircle, CheckCircle2, Search, X, UserSearch, Trash2 } from 'lucide-react';
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

// Competency selector inline
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

interface Props { onBack: () => void; }

const PARAMETROS_PEDIATRICOS = [
  { grupo: '0 dias a 1 mês', temp: '< 36 ou > 38', taqui: '> 205', bradi: '< 85', fr: '> 60' },
  { grupo: '1 a 3 meses', temp: '< 36 ou > 38', taqui: '> 205', bradi: '< 85', fr: '> 60' },
  { grupo: '3 meses a 1 ano', temp: '< 36 ou > 38,5', taqui: '> 190', bradi: '< 100', fr: '> 60' },
  { grupo: '1 a 2 anos', temp: '< 36 ou > 38,5', taqui: '> 190', bradi: '-', fr: '> 40' },
  { grupo: '2 a 4 anos', temp: '< 36 ou > 38,5', taqui: '> 140', bradi: '-', fr: '> 40' },
  { grupo: '4 a 6 anos', temp: '< 36 ou > 38,5', taqui: '> 140', bradi: '-', fr: '> 34' },
  { grupo: '6 a 11 anos', temp: '< 36 ou > 38,5', taqui: '> 140', bradi: '-', fr: '> 30' },
];

const ACHADOS_CLINICOS = [
  'Desidratação', 'Dor abdominal', 'Disúria', 'Feridas cutâneas',
  'Desaturação', 'Alteração de perfusão', 'Palidez cutânea'
];

const ACHADOS_NEUROLOGICOS = [
  'Irritabilidade', 'Agitação', 'Choro inapropriado',
  'Sonolência', 'Pobre interação com familiares', 'Letargia'
];

export const FormSepsePediatrico = ({ onBack }: Props) => {
  const createAttendance = useCreateProtocoloAtendimento();
  const deleteAttendance = useDeleteProtocoloAtendimento();
  const { data: settings } = useProtocoloSettings('sepse_pediatrico');
  const meta = settings?.meta_minutos || 10;

  const [competency, setCompetency] = useState(format(new Date(), 'yyyy-MM'));
  const [arrivalTime, setArrivalTime] = useState('');
  const [ecgTime, setEcgTime] = useState('');
  const [portaEcgMinutes, setPortaEcgMinutes] = useState<number | null>(null);
  const [withinTarget, setWithinTarget] = useState<boolean | null>(null);
  const [choqueSeptico, setChoqueSeptico] = useState(false);
  const [destinoPaciente, setDestinoPaciente] = useState('');

  // Troponin samples state
  const emptySample = { collectionTime: '', result: '', releaseTime: '', collector: '' };
  const [troponinSample1, setTroponinSample1] = useState(emptySample);
  const [troponinSample2, setTroponinSample2] = useState(emptySample);
  const [troponinSample3, setTroponinSample3] = useState(emptySample);
  const [focoPulmonar, setFocoPulmonar] = useState(false);
  const [focoUrinario, setFocoUrinario] = useState(false);
  const [focoAbdominal, setFocoAbdominal] = useState(false);
  const [focoPelePartesMoles, setFocoPelePartesMoles] = useState(false);
  const [focoCorrenteSanguineaCateter, setFocoCorrenteSanguineaCateter] = useState(false);
  const [focoSemFocoDefinido, setFocoSemFocoDefinido] = useState(false);
  const [necessidadeUti, setNecessidadeUti] = useState<boolean | null>(null);
  const [kitSepseColetado, setKitSepseColetado] = useState(false);
  const [labVillacHorarioChamado, setLabVillacHorarioChamado] = useState('');
  const [labVillacHorarioColeta, setLabVillacHorarioColeta] = useState('');
  const [sepseSuspeita, setSepseSuspeita] = useState(false);
  const [sepseMotivo, setSepseMotivo] = useState('');
  const [sepseHorario, setSepseHorario] = useState('');
  const [sepseMedico, setSepseMedico] = useState('');
  const [achadosClinicos, setAchadosClinicos] = useState<string[]>([]);
  const [achadosNeurologicos, setAchadosNeurologicos] = useState<string[]>([]);

  // Search functionality
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const { data: allAttendances, isLoading: searchLoading } = useProtocoloAtendimentos('sepse_pediatrico');

  const filteredAttendances = allAttendances?.filter((a: any) =>
    searchQuery.length >= 2 && (
      a.record_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.patient_name?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  // Calcular tempo Porta-ECG
  useEffect(() => {
    if (arrivalTime && ecgTime) {
      const arrival = new Date(arrivalTime);
      const ecg = new Date(ecgTime);
      const diffMs = ecg.getTime() - arrival.getTime();
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

  const toISOString = (dtl: string) => dtl ? new Date(dtl).toISOString() : undefined;

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
    if (!sepseMedico.trim()) {
      toast.error('Preencha o nome do médico.');
      return;
    }
    if (sepseSuspeita && (!sepseMotivo.trim() || !sepseHorario)) {
      toast.error('Preencha o motivo e horário quando há suspeita de sepse.');
      return;
    }

    const data = {
      tipo_protocolo: 'sepse_pediatrico',
      competency,
      record_number: formData.get('record_number') as string,
      patient_name: (formData.get('patient_name') as string) || null,
      sex: (formData.get('sex') as string) || null,
      age: formData.get('age') ? parseInt(formData.get('age') as string) : null,
      arrival_time: new Date(arrivalTime).toISOString(),
      ecg_time: new Date(ecgTime).toISOString(),
      porta_ecg_minutes: portaEcgMinutes || 0,
      within_target: withinTarget || false,
      risk_classification: (formData.get('risk_classification') as string) || null,
      first_doctor_time: formData.get('first_doctor_time') ? new Date(formData.get('first_doctor_time') as string).toISOString() : null,
      // Sinais Vitais
      vital_pa: (formData.get('vital_pa') as string) || null,
      vital_fc: formData.get('vital_fc') ? parseInt(formData.get('vital_fc') as string) : null,
      vital_fr: formData.get('vital_fr') ? parseInt(formData.get('vital_fr') as string) : null,
      vital_spo2: formData.get('vital_spo2') ? parseFloat(formData.get('vital_spo2') as string) : null,
      vital_temperatura: formData.get('vital_temperatura') ? parseFloat(formData.get('vital_temperatura') as string) : null,
      // Achados Clínicos e Neurológicos (JSONB)
      achados_clinicos: achadosClinicos,
      achados_neurologicos: achadosNeurologicos,
      // Foco Infeccioso
      foco_pulmonar: focoPulmonar,
      foco_urinario: focoUrinario,
      foco_abdominal: focoAbdominal,
      foco_pele_partes_moles: focoPelePartesMoles,
      foco_corrente_sanguinea_cateter: focoCorrenteSanguineaCateter,
      foco_sem_foco_definido: focoSemFocoDefinido,
      necessidade_uti: necessidadeUti,
      // Suspeita de Sepse
      sepse_suspeita: sepseSuspeita,
      sepse_motivo: sepseMotivo || null,
      sepse_horario: sepseHorario ? new Date(sepseHorario).toISOString() : null,
      sepse_medico: sepseMedico || null,
      // Troponin samples
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
      // Kit Sepse
      kit_sepse_coletado: kitSepseColetado,
      lab_villac_horario_chamado: labVillacHorarioChamado ? new Date(labVillacHorarioChamado).toISOString() : null,
      lab_villac_horario_coleta: labVillacHorarioColeta ? new Date(labVillacHorarioColeta).toISOString() : null,
      protocol_opened_at: formData.get('protocol_opened_at') ? new Date(formData.get('protocol_opened_at') as string).toISOString() : null,
      protocol_opened_by_sector: (formData.get('protocol_opened_by_sector') as string) || null,
      // ATB 1
      atb1_nome: (formData.get('atb1_nome') as string) || null,
      atb1_data: (formData.get('atb1_data') as string) || null,
      atb1_dose: (formData.get('atb1_dose') as string) || null,
      atb1_horario_inicio: formData.get('atb1_horario_inicio') ? new Date(formData.get('atb1_horario_inicio') as string).toISOString() : null,
      // ATB 2
      atb2_nome: (formData.get('atb2_nome') as string) || null,
      atb2_data: (formData.get('atb2_data') as string) || null,
      atb2_dose: (formData.get('atb2_dose') as string) || null,
      atb2_horario_inicio: formData.get('atb2_horario_inicio') ? new Date(formData.get('atb2_horario_inicio') as string).toISOString() : null,
      atb_profissional: (formData.get('atb_profissional') as string) || null,
      // Choque Séptico
      choque_septico: choqueSeptico,
      choque_reposicao_data_hora: formData.get('choque_reposicao_data_hora') ? new Date(formData.get('choque_reposicao_data_hora') as string).toISOString() : null,
      choque_reposicao_medicamento: (formData.get('choque_reposicao_medicamento') as string) || null,
      choque_vasopressor_data_hora: formData.get('choque_vasopressor_data_hora') ? new Date(formData.get('choque_vasopressor_data_hora') as string).toISOString() : null,
      choque_vasopressor_medicamento: (formData.get('choque_vasopressor_medicamento') as string) || null,
      choque_lactato2_data_hora: formData.get('choque_lactato2_data_hora') ? new Date(formData.get('choque_lactato2_data_hora') as string).toISOString() : null,
      choque_lactato3_necessita: formData.get('choque_lactato3_necessita') === 'on',
      choque_lactato3_data_hora: formData.get('choque_lactato3_data_hora') ? new Date(formData.get('choque_lactato3_data_hora') as string).toISOString() : null,
      choque_lactato3_medicamento_data_hora: formData.get('choque_lactato3_medicamento_data_hora') ? new Date(formData.get('choque_lactato3_medicamento_data_hora') as string).toISOString() : null,
      choque_lactato3_medicamento: (formData.get('choque_lactato3_medicamento') as string) || null,
      destino_paciente: destinoPaciente || null,
      destino_instituicao_nome: destinoPaciente === 'transferencia' ? (formData.get('destino_instituicao_nome') as string) || null : null,
      assinatura_enfermeiro: (formData.get('assinatura_enfermeiro') as string) || null,
      assinatura_medico: (formData.get('assinatura_medico') as string) || null,
      assinatura_farmacia: (formData.get('assinatura_farmacia') as string) || null,
    };

    try {
      await createAttendance.mutateAsync(data);
      toast.success('Atendimento registrado com sucesso!');
      onBack();
    } catch (error) {
      toast.error('Não foi possível registrar o atendimento.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cadastrar Atendimento</h1>
          <p className="text-muted-foreground">Registre um novo atendimento de sepse pediátrica</p>
        </div>
      </div>

      {/* Search Existing Patients */}
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
              <Input
                placeholder="Digite o nº do prontuário ou nome do paciente..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearch(e.target.value.length >= 2);
                }}
                className="pl-10"
              />
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
                  <div className="p-4 text-center text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                    Buscando...
                  </div>
                ) : filteredAttendances && filteredAttendances.length > 0 ? (
                  <div className="divide-y max-h-64 overflow-y-auto">
                    {filteredAttendances.map((attendance: any) => (
                      <div key={attendance.id} className="p-3 flex items-center justify-between hover:bg-muted/50 transition-colors">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{attendance.record_number}</span>
                            {attendance.risk_classification && <RiskBadge classification={attendance.risk_classification} />}
                            <StatusBadge withinTarget={attendance.within_target} minutes={attendance.porta_ecg_minutes} />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {attendance.patient_name || 'Paciente não identificado'}
                            {attendance.age && ` • ${attendance.age} anos`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(attendance.arrival_time), "dd/MM/yyyy 'às' HH:mm")}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir o atendimento do prontuário <strong>{attendance.record_number}</strong>?
                                  Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={async () => {
                                    try {
                                      await deleteAttendance.mutateAsync(attendance.id);
                                      toast.success('Atendimento excluído com sucesso.');
                                    } catch {
                                      toast.error('Não foi possível excluir o atendimento.');
                                    }
                                  }}
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-muted-foreground">
                    Nenhum paciente encontrado com "{searchQuery}"
                  </div>
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
            <div className="space-y-2">
              <Label htmlFor="protocol_opened_at">Data/Hora Abertura do Protocolo</Label>
              <Input id="protocol_opened_at" name="protocol_opened_at" type="datetime-local" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="protocol_opened_by_sector">Setor Responsável pela Abertura</Label>
              <Input id="protocol_opened_by_sector" name="protocol_opened_by_sector" placeholder="Ex: Recepção, Triagem..." />
            </div>
          </CardContent>
        </Card>

        {/* Sinais Vitais */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sinais Vitais</CardTitle>
            <CardDescription>Registre os sinais vitais do paciente na admissão</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vital_pa">Pressão Arterial (PA)</Label>
                <Input id="vital_pa" name="vital_pa" placeholder="Ex: 120/80 mmHg" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vital_fc">Frequência Cardíaca (FC)</Label>
                <Input id="vital_fc" name="vital_fc" type="number" min="0" max="300" placeholder="bpm" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vital_fr">Frequência Respiratória (FR)</Label>
                <Input id="vital_fr" name="vital_fr" type="number" min="0" max="100" placeholder="irpm" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vital_spo2">SpO₂</Label>
                <Input id="vital_spo2" name="vital_spo2" type="number" min="0" max="100" step="0.1" placeholder="%" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vital_temperatura">Temperatura</Label>
                <Input id="vital_temperatura" name="vital_temperatura" type="number" min="30" max="45" step="0.1" placeholder="°C" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Referência Pediátrica */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Avaliação da Enfermagem - Parâmetros Pediátricos</CardTitle>
            <CardDescription>Marque os sinais presentes (não obrigatório)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <h3 className="font-semibold text-base border-b pb-2">Tabela de Referência - Sinais Vitais por Faixa Etária</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-muted">
                    <th className="border border-border px-3 py-2 text-left font-semibold">Grupo Etário</th>
                    <th className="border border-border px-3 py-2 text-center font-semibold">Temperatura (°C)</th>
                    <th className="border border-border px-3 py-2 text-center font-semibold">FC (bpm) - Taquicardia</th>
                    <th className="border border-border px-3 py-2 text-center font-semibold">FC (bpm) - Bradicardia</th>
                    <th className="border border-border px-3 py-2 text-center font-semibold">FR (rpm)</th>
                  </tr>
                </thead>
                <tbody>
                  {PARAMETROS_PEDIATRICOS.map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/50'}>
                      <td className="border border-border px-3 py-2 font-medium">{row.grupo}</td>
                      <td className="border border-border px-3 py-2 text-center">{row.temp}</td>
                      <td className="border border-border px-3 py-2 text-center">{row.taqui}</td>
                      <td className="border border-border px-3 py-2 text-center">{row.bradi}</td>
                      <td className="border border-border px-3 py-2 text-center">{row.fr}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Achados Clínicos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Achados Clínicos (Marcar o que se aplica)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {ACHADOS_CLINICOS.map((item) => (
                <div key={item} className="flex items-center space-x-2">
                  <Checkbox
                    id={`achado_${item.toLowerCase().replace(/\s/g, '_')}`}
                    checked={achadosClinicos.includes(item)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setAchadosClinicos(prev => [...prev, item]);
                      } else {
                        setAchadosClinicos(prev => prev.filter(a => a !== item));
                      }
                    }}
                  />
                  <Label htmlFor={`achado_${item.toLowerCase().replace(/\s/g, '_')}`} className="text-sm">{item}</Label>
                </div>
              ))}
            </div>

            <Separator />

            <div className="space-y-3">
              <Label className="font-bold text-base">Mudança aguda do estado neurológico</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {ACHADOS_NEUROLOGICOS.map((item) => (
                  <div key={item} className="flex items-center space-x-2">
                    <Checkbox
                      id={`neuro_${item.toLowerCase().replace(/\s/g, '_')}`}
                      checked={achadosNeurologicos.includes(item)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setAchadosNeurologicos(prev => [...prev, item]);
                        } else {
                          setAchadosNeurologicos(prev => prev.filter(a => a !== item));
                        }
                      }}
                    />
                    <Label htmlFor={`neuro_${item.toLowerCase().replace(/\s/g, '_')}`} className="text-sm">{item}</Label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Avaliação Médica - Suspeita de Sepse */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Avaliação Médica</CardTitle>
            <CardDescription>Suspeita de sepse e biomarcadores</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-4">
                <Label className="font-semibold">Suspeita de Sepse?</Label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="sepse_suspeita_radio" checked={sepseSuspeita === true} onChange={() => setSepseSuspeita(true)} />
                    <span>Sim</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="sepse_suspeita_radio" checked={sepseSuspeita === false} onChange={() => setSepseSuspeita(false)} />
                    <span>Não</span>
                  </label>
                </div>
              </div>
              {sepseSuspeita && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-sm">Motivo da suspeita <span className="text-destructive">*</span></Label>
                    <Textarea value={sepseMotivo} onChange={e => setSepseMotivo(e.target.value)} placeholder="Descreva o motivo da suspeita..." className="text-sm" required />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm">Horário <span className="text-destructive">*</span></Label>
                    <Input type="datetime-local" value={sepseHorario} onChange={e => setSepseHorario(e.target.value)} className="text-sm" />
                  </div>
                </div>
              )}
              <div className="space-y-1">
                <Label className="text-sm">Médico <span className="text-destructive">*</span></Label>
                <Input type="text" value={sepseMedico} onChange={e => setSepseMedico(e.target.value)} placeholder="Nome do médico..." className="text-sm" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Foco Infeccioso */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Foco Infeccioso?</CardTitle>
            <CardDescription>Selecione o(s) foco(s) infeccioso(s) identificado(s)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {[
                { checked: focoPulmonar, onChange: setFocoPulmonar, id: 'foco_pulmonar', label: 'Pulmonar' },
                { checked: focoUrinario, onChange: setFocoUrinario, id: 'foco_urinario', label: 'Urinário' },
                { checked: focoAbdominal, onChange: setFocoAbdominal, id: 'foco_abdominal', label: 'Abdominal' },
                { checked: focoPelePartesMoles, onChange: setFocoPelePartesMoles, id: 'foco_pele_partes_moles', label: 'Pele e partes moles' },
                { checked: focoCorrenteSanguineaCateter, onChange: setFocoCorrenteSanguineaCateter, id: 'foco_corrente_sanguinea_cateter', label: 'Corrente Sanguínea associada ao cateter' },
                { checked: focoSemFocoDefinido, onChange: setFocoSemFocoDefinido, id: 'foco_sem_foco_definido', label: 'Sem foco definido' },
              ].map(item => (
                <div key={item.id} className="flex items-center space-x-2">
                  <Checkbox id={item.id} checked={item.checked} onCheckedChange={(checked) => item.onChange(checked === true)} />
                  <Label htmlFor={item.id} className="text-sm font-normal">{item.label}</Label>
                </div>
              ))}

              <div className="space-y-3 pt-4 border-t">
                <Label className="font-medium">Necessidade de UTI</Label>
                <div className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="necessidade_uti_sim"
                      checked={necessidadeUti === true}
                      onCheckedChange={(checked) => setNecessidadeUti(checked ? true : null)}
                    />
                    <Label htmlFor="necessidade_uti_sim" className="text-sm font-normal">SIM</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="necessidade_uti_nao"
                      checked={necessidadeUti === false}
                      onCheckedChange={(checked) => setNecessidadeUti(checked ? false : null)}
                    />
                    <Label htmlFor="necessidade_uti_nao" className="text-sm font-normal">NÃO</Label>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Kit Sepse */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Exames Kit Sepse</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Label className="font-medium">Coletado Kit Sepse?</Label>
              <div className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox id="kit_sepse_sim" checked={kitSepseColetado} onCheckedChange={(checked) => setKitSepseColetado(checked === true)} />
                  <Label htmlFor="kit_sepse_sim" className="text-sm font-normal">Sim</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="kit_sepse_nao" checked={!kitSepseColetado} onCheckedChange={(checked) => setKitSepseColetado(!(checked === true))} />
                  <Label htmlFor="kit_sepse_nao" className="text-sm font-normal">Não</Label>
                </div>
              </div>
            </div>

            <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
              <p className="font-semibold text-sm">Kit Sepse</p>
              <ol className="list-decimal list-inside text-sm space-y-1 text-muted-foreground">
                <li>Hemograma e plaqueta</li>
                <li>Ureia e creatinina</li>
                <li>Sódio e potássio</li>
                <li>Tempo de protrombina</li>
                <li>Hemocultura 2 pares de amostras</li>
                <li>Bilirrubinas totais e frações</li>
                <li>PCR</li>
                <li>Glicemia</li>
                <li>Lactato</li>
                <li>EAS - Gram</li>
              </ol>
              <div className="mt-3 space-y-1 text-xs text-muted-foreground border-t pt-2">
                <p>Raio X tórax se suspeita de PNM</p>
                <p>Gasometria só em caso de choque séptico ou insuficiência respiratória</p>
                <p className="italic">Obs: Culturas adicionais devem ser coletadas de outros sítios pertinentes</p>
              </div>
            </div>

            <div className="border-t pt-4 space-y-3">
              <p className="font-semibold text-sm">Laboratório Villac</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Horário do chamado</Label>
                  <Input type="datetime-local" value={labVillacHorarioChamado} onChange={e => setLabVillacHorarioChamado(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Horário da coleta</Label>
                  <Input type="datetime-local" value={labVillacHorarioColeta} onChange={e => setLabVillacHorarioColeta(e.target.value)} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Antibiótico(s) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Antibiótico(s) a ser administrado (conforme protocolo)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* ATB 1 */}
            <div className="space-y-3">
              <p className="font-medium text-sm">Antibiótico 1</p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="atb1_nome">Nome do ATB</Label>
                  <Input id="atb1_nome" name="atb1_nome" placeholder="Ex: Ceftriaxona" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="atb1_data">Data</Label>
                  <Input id="atb1_data" name="atb1_data" type="date" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="atb1_dose">Dose</Label>
                  <Input id="atb1_dose" name="atb1_dose" placeholder="Ex: 2g IV" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="atb1_horario_inicio">Horário de Início</Label>
                  <Input id="atb1_horario_inicio" name="atb1_horario_inicio" type="datetime-local" />
                </div>
              </div>
            </div>

            {/* ATB 2 */}
            <div className="space-y-3">
              <p className="font-medium text-sm">Antibiótico 2</p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="atb2_nome">Nome do ATB</Label>
                  <Input id="atb2_nome" name="atb2_nome" placeholder="Ex: Azitromicina" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="atb2_data">Data</Label>
                  <Input id="atb2_data" name="atb2_data" type="date" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="atb2_dose">Dose</Label>
                  <Input id="atb2_dose" name="atb2_dose" placeholder="Ex: 500mg IV" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="atb2_horario_inicio">Horário de Início</Label>
                  <Input id="atb2_horario_inicio" name="atb2_horario_inicio" type="datetime-local" />
                </div>
              </div>
            </div>

            {/* Profissional */}
            <div className="space-y-2">
              <Label htmlFor="atb_profissional">Nome do profissional que iniciou o antibiótico</Label>
              <Input id="atb_profissional" name="atb_profissional" placeholder="Nome do profissional" />
            </div>
          </CardContent>
        </Card>

        {/* Choque Séptico */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Choque Séptico</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label className="font-medium">Choque Séptico?</Label>
              <div className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox id="choque_septico_sim" checked={choqueSeptico} onCheckedChange={() => setChoqueSeptico(true)} />
                  <Label htmlFor="choque_septico_sim">Sim</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="choque_septico_nao" checked={!choqueSeptico} onCheckedChange={() => setChoqueSeptico(false)} />
                  <Label htmlFor="choque_septico_nao">Não</Label>
                </div>
              </div>
            </div>

            {choqueSeptico && (
              <div className="space-y-6 border-t pt-4">
                <h4 className="font-semibold text-sm">CHOQUE SÉPTICO - CONDUTA:</h4>

                {/* Reposição Volêmica */}
                <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
                  <p className="text-sm font-medium">Iniciar reposição volêmica (30ml/kg) com Ringer Lactato ou Soro Fisiológico (preferencialmente Ringer Lactato) ou registrar em prontuário o motivo pela opção em não realizar reposição volêmica.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="choque_reposicao_data_hora">Data e Hora</Label>
                      <Input id="choque_reposicao_data_hora" name="choque_reposicao_data_hora" type="datetime-local" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="choque_reposicao_medicamento">Medicamento e quantidade</Label>
                      <Input id="choque_reposicao_medicamento" name="choque_reposicao_medicamento" placeholder="Ex: Ringer Lactato 2000ml" />
                    </div>
                  </div>
                </div>

                {/* Vasopressor */}
                <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
                  <p className="text-sm font-medium">Iniciar vasopressor na 1ª hora da hipotensão</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="choque_vasopressor_data_hora">Data e Hora</Label>
                      <Input id="choque_vasopressor_data_hora" name="choque_vasopressor_data_hora" type="datetime-local" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="choque_vasopressor_medicamento">Medicamento e quantidade</Label>
                      <Input id="choque_vasopressor_medicamento" name="choque_vasopressor_medicamento" placeholder="Ex: Noradrenalina 0,1 mcg/kg/min" />
                    </div>
                  </div>
                </div>

                {/* Lactato 2ª amostra */}
                <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
                  <p className="text-sm font-medium">Coletar segunda amostra de lactato, após a reposição volêmica na 3ª hora após abertura do protocolo.</p>
                  <div className="space-y-1">
                    <Label htmlFor="choque_lactato2_data_hora">Data e Hora da coleta</Label>
                    <Input id="choque_lactato2_data_hora" name="choque_lactato2_data_hora" type="datetime-local" className="max-w-xs" />
                  </div>
                </div>

                {/* Lactato 3ª amostra */}
                <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
                  <p className="text-sm font-medium">Necessita de terceira coleta de lactato? (6ª hora)</p>
                  <div className="flex gap-4 mb-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="choque_lactato3_sim" name="choque_lactato3_necessita" />
                      <Label htmlFor="choque_lactato3_sim">Sim</Label>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="choque_lactato3_data_hora">Data e Hora da coleta</Label>
                    <Input id="choque_lactato3_data_hora" name="choque_lactato3_data_hora" type="datetime-local" className="max-w-xs" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                    <div className="space-y-1">
                      <Label htmlFor="choque_lactato3_medicamento_data_hora">Data e Hora</Label>
                      <Input id="choque_lactato3_medicamento_data_hora" name="choque_lactato3_medicamento_data_hora" type="datetime-local" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="choque_lactato3_medicamento">Medicamento e quantidade</Label>
                      <Input id="choque_lactato3_medicamento" name="choque_lactato3_medicamento" placeholder="Medicamento e quantidade" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Destino do Paciente */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Destino do Paciente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4">
              {[
                { value: 'enfermaria', label: 'Enfermaria' },
                { value: 'sala_vermelha', label: 'Encaminhado para Sala Vermelha' },
                { value: 'transferencia', label: 'Transferência para outras instituições' },
                { value: 'obito', label: 'Óbito' },
              ].map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`destino_${option.value}`}
                    checked={destinoPaciente === option.value}
                    onCheckedChange={(checked) => setDestinoPaciente(checked ? option.value : '')}
                  />
                  <Label htmlFor={`destino_${option.value}`}>{option.label}</Label>
                </div>
              ))}
            </div>
            {destinoPaciente === 'transferencia' && (
              <div className="space-y-2">
                <Label htmlFor="destino_instituicao_nome">Nome da Instituição</Label>
                <Input id="destino_instituicao_nome" name="destino_instituicao_nome" placeholder="Nome da instituição de destino" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Assinaturas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Assinaturas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="assinatura_enfermeiro">Enfermeiro Responsável</Label>
              <Input id="assinatura_enfermeiro" name="assinatura_enfermeiro" placeholder="Nome do enfermeiro responsável" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assinatura_medico">Médico Responsável</Label>
              <Input id="assinatura_medico" name="assinatura_medico" placeholder="Nome do médico responsável" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assinatura_farmacia">Farmácia</Label>
              <Input id="assinatura_farmacia" name="assinatura_farmacia" placeholder="Nome do responsável da farmácia" />
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
