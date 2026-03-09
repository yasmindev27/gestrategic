import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { CheckCircle2, XCircle, Clock, User, FileText, Activity, Thermometer, Heart, Beaker, Ambulance } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  atendimento: any;
  tipo: string;
}

function InfoRow({ label, value, icon }: { label: string; value: React.ReactNode; icon?: React.ReactNode }) {
  if (value === null || value === undefined || value === '' || value === '-') return null;
  return (
    <div className="flex items-start gap-3 py-2">
      {icon && <div className="mt-0.5 text-muted-foreground">{icon}</div>}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
        <p className="text-sm text-foreground mt-0.5">{typeof value === 'string' ? value : value}</p>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <h3 className="text-sm font-semibold text-primary flex items-center gap-2 pt-3 pb-1">{title}</h3>
      <Separator className="mb-2" />
      <div className="space-y-0">{children}</div>
    </div>
  );
}

function BoolBadge({ value, label }: { value: boolean | null | undefined; label: string }) {
  if (value === null || value === undefined) return null;
  return (
    <Badge variant={value ? 'default' : 'outline'} className="text-xs mr-1 mb-1">
      {value ? '✓' : '✗'} {label}
    </Badge>
  );
}

function formatDt(val: string | null | undefined) {
  if (!val) return null;
  try { return format(new Date(val), 'dd/MM/yyyy HH:mm'); } catch { return val; }
}

export const ProtocoloDetailDialog = ({ open, onOpenChange, atendimento, tipo }: Props) => {
  if (!atendimento) return null;
  const a = atendimento;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-3">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-primary" />
            Detalhes do Atendimento
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-100px)] px-6 pb-6">
          <div className="space-y-2">
            {/* Meta Summary Banner */}
            <div className={`rounded-lg p-4 border ${a.within_target ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {a.within_target
                    ? <CheckCircle2 className="h-8 w-8 text-green-600" />
                    : <XCircle className="h-8 w-8 text-red-600" />}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status da Meta</p>
                    <p className={`text-xl font-bold ${a.within_target ? "text-green-700" : "text-red-700"}`}>
                      {a.within_target ? 'Dentro da Meta' : 'Fora da Meta'}
                    </p>
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <div className="flex items-center gap-2 justify-end">
                    <Badge variant="outline">{a.risk_classification || 'Sem classificação'}</Badge>
                    <Badge variant="secondary">{a.competency}</Badge>
                  </div>
                  {a.porta_ecg_minutes != null && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">Tempo: </span>
                      <span className={`font-bold ${a.within_target ? "text-green-700" : "text-red-700"}`}>
                        {a.porta_ecg_minutes} min
                      </span>
                    </p>
                  )}
                </div>
              </div>
            </div>
            {/* Identificação */}
            <Section title="Identificação do Paciente">
              <InfoRow label="Prontuário" value={a.record_number} icon={<FileText className="h-4 w-4" />} />
              <InfoRow label="Paciente" value={a.patient_name} icon={<User className="h-4 w-4" />} />
              <div className="flex gap-6">
                <InfoRow label="Sexo" value={a.sex === 'M' ? 'Masculino' : a.sex === 'F' ? 'Feminino' : a.sex} />
                <InfoRow label="Idade" value={a.age != null ? `${a.age} anos` : null} />
              </div>
            </Section>

            {/* Tempos */}
            <Section title="Tempos do Protocolo">
              <InfoRow label="Hora de Chegada" value={formatDt(a.arrival_time)} icon={<Clock className="h-4 w-4" />} />
              {tipo === 'dor_toracica' && (
                <>
                  <InfoRow label="Hora do ECG" value={formatDt(a.ecg_time)} icon={<Activity className="h-4 w-4" />} />
                  <InfoRow label="Tempo Porta-ECG" value={a.porta_ecg_minutes != null ? `${a.porta_ecg_minutes} minutos` : null} />
                  <InfoRow label="1º Atendimento Médico" value={formatDt(a.first_doctor_time)} />
                </>
              )}
              {(tipo === 'sepse_adulto' || tipo === 'sepse_pediatrico') && (
                <>
                  <InfoRow label="Abertura do Protocolo" value={formatDt(a.protocol_opened_at)} icon={<Activity className="h-4 w-4" />} />
                  <InfoRow label="Setor que Abriu" value={a.protocol_opened_by_sector} />
                  <InfoRow label="Tempo Porta-ATB" value={a.porta_ecg_minutes != null ? `${a.porta_ecg_minutes} minutos` : null} />
                </>
              )}
            </Section>

            {/* Dor Torácica - Detalhes */}
            {tipo === 'dor_toracica' && (a.pain_location || a.pain_characteristic || a.pain_onset_date) && (
              <Section title="Caracterização da Dor">
                <InfoRow label="Localização" value={a.pain_location} icon={<Heart className="h-4 w-4" />} />
                <InfoRow label="Característica" value={a.pain_characteristic} />
                <InfoRow label="Irradiação" value={a.pain_irradiation} />
                <InfoRow label="Associação" value={a.pain_association} />
                <InfoRow label="Data de Início" value={a.pain_onset_date} />
                <InfoRow label="Hora de Início" value={a.pain_onset_time} />
                <InfoRow label="Duração" value={a.pain_duration} />
                <InfoRow label="Referência" value={a.pain_referral} />
              </Section>
            )}

            {/* Sepse - Critérios SIRS */}
            {(tipo === 'sepse_adulto' || tipo === 'sepse_pediatrico') && (
              <Section title="Critérios SIRS / Disfunção Orgânica">
                <div className="flex flex-wrap gap-1 py-1">
                  <BoolBadge value={a.sirs_temp_alta} label="Temp > 38°C" />
                  <BoolBadge value={a.sirs_temp_baixa} label="Temp < 36°C" />
                  <BoolBadge value={a.sirs_fc_alta} label="FC Elevada" />
                  <BoolBadge value={a.sirs_fr_alta} label="FR Elevada" />
                  <BoolBadge value={a.sirs_leucocitose} label="Leucocitose" />
                  <BoolBadge value={a.sirs_leucopenia} label="Leucopenia" />
                  <BoolBadge value={a.sirs_celulas_jovens} label="Céls. Jovens" />
                  <BoolBadge value={a.sirs_plaquetas} label="Plaquetas" />
                  <BoolBadge value={a.sirs_lactato} label="Lactato" />
                  <BoolBadge value={a.sirs_bilirrubina} label="Bilirrubina" />
                  <BoolBadge value={a.sirs_creatinina} label="Creatinina" />
                </div>
                <div className="flex flex-wrap gap-1 py-1">
                  <BoolBadge value={a.disfuncao_pa_baixa} label="PA Baixa" />
                  <BoolBadge value={a.disfuncao_sato2_baixa} label="SatO2 Baixa" />
                  <BoolBadge value={a.disfuncao_consciencia} label="Alt. Consciência" />
                </div>
              </Section>
            )}

            {/* Sepse - Foco Infeccioso */}
            {(tipo === 'sepse_adulto' || tipo === 'sepse_pediatrico') && (
              <Section title="Foco Infeccioso">
                <div className="flex flex-wrap gap-1 py-1">
                  <BoolBadge value={a.foco_pulmonar} label="Pulmonar" />
                  <BoolBadge value={a.foco_urinario} label="Urinário" />
                  <BoolBadge value={a.foco_abdominal} label="Abdominal" />
                  <BoolBadge value={a.foco_pele_partes_moles} label="Pele/Partes Moles" />
                  <BoolBadge value={a.foco_corrente_sanguinea_cateter} label="Corrente Sanguínea/Cateter" />
                  <BoolBadge value={a.foco_sem_foco_definido} label="Sem Foco Definido" />
                </div>
              </Section>
            )}

            {/* Sinais Vitais */}
            {(a.vital_pa || a.vital_fc || a.vital_fr || a.vital_spo2 || a.vital_temperatura) && (
              <Section title="Sinais Vitais">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4">
                  <InfoRow label="PA" value={a.vital_pa} />
                  <InfoRow label="FC" value={a.vital_fc != null ? `${a.vital_fc} bpm` : null} />
                  <InfoRow label="FR" value={a.vital_fr != null ? `${a.vital_fr} irpm` : null} />
                  <InfoRow label="SpO2" value={a.vital_spo2 != null ? `${a.vital_spo2}%` : null} />
                  <InfoRow label="Temperatura" value={a.vital_temperatura != null ? `${a.vital_temperatura}°C` : null} />
                </div>
              </Section>
            )}

            {/* Condutas */}
            <Section title="Condutas">
              <div className="flex flex-wrap gap-1 py-1">
                <BoolBadge value={a.conduct_medication} label="Medicação" />
                <BoolBadge value={a.conduct_oxygen} label="Oxigênio" />
                <BoolBadge value={a.conduct_monitoring} label="Monitorização" />
                <BoolBadge value={a.conduct_referral} label="Encaminhamento" />
                <BoolBadge value={a.conduct_observation} label="Observação" />
                <BoolBadge value={a.conduct_transfer} label="Transferência" />
                <BoolBadge value={a.conduct_high_risk} label="Alto Risco" />
                <BoolBadge value={a.conduct_moderate_risk} label="Risco Moderado" />
                <BoolBadge value={a.conduct_low_risk} label="Baixo Risco" />
                <BoolBadge value={a.necessidade_uti} label="Necessidade UTI" />
                <BoolBadge value={a.kit_sepse_coletado} label="Kit Sepse Coletado" />
              </div>
            </Section>

            {/* Sepse - Antibioticoterapia */}
            {(tipo === 'sepse_adulto' || tipo === 'sepse_pediatrico') && (a.atb1_nome || a.atb2_nome) && (
              <Section title="Antibioticoterapia">
                {a.atb1_nome && (
                  <div className="bg-muted/50 rounded-lg p-3 mb-2">
                    <p className="text-xs font-medium text-muted-foreground">ATB 1</p>
                    <p className="text-sm">{a.atb1_nome} — {a.atb1_dose}</p>
                    <p className="text-xs text-muted-foreground">Via: {a.atb1_via} | Início: {a.atb1_data} {a.atb1_hora}</p>
                  </div>
                )}
                {a.atb2_nome && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs font-medium text-muted-foreground">ATB 2</p>
                    <p className="text-sm">{a.atb2_nome} — {a.atb2_dose}</p>
                    <p className="text-xs text-muted-foreground">Via: {a.atb2_via} | Início: {a.atb2_data} {a.atb2_hora}</p>
                  </div>
                )}
              </Section>
            )}

            {/* Trombólise (Dor Torácica) */}
            {tipo === 'dor_toracica' && (a.thrombolysis_time || a.thrombolysis_type) && (
              <Section title="Trombólise">
                <InfoRow label="Horário" value={formatDt(a.thrombolysis_time)} icon={<Ambulance className="h-4 w-4" />} />
                <InfoRow label="Tipo" value={a.thrombolysis_type} />
                <BoolBadge value={a.thrombolysis_complication} label="Complicação" />
                <InfoRow label="Conduta" value={a.thrombolysis_conduct} />
                <InfoRow label="Chegada SAMU" value={formatDt(a.samu_arrival_time)} />
                <InfoRow label="Hospital Destino" value={a.destination_hospital} />
              </Section>
            )}

            {/* Laboratório Sepse */}
            {(tipo === 'sepse_adulto' || tipo === 'sepse_pediatrico') && (a.lab_villac_horario_chamado || a.lab_villac_horario_coleta) && (
              <Section title="Laboratório">
                <InfoRow label="Horário Chamado Lab" value={formatDt(a.lab_villac_horario_chamado)} icon={<Beaker className="h-4 w-4" />} />
                <InfoRow label="Horário Coleta Lab" value={formatDt(a.lab_villac_horario_coleta)} />
              </Section>
            )}

            {/* Diagnóstico e Observações */}
            {(a.initial_diagnosis || a.medical_report || a.action_plan || a.admin_observations) && (
              <Section title="Diagnóstico e Observações">
                <InfoRow label="Diagnóstico Inicial" value={a.initial_diagnosis} />
                <InfoRow label="Relatório Médico" value={a.medical_report} />
                <InfoRow label="Plano de Ação" value={a.action_plan} />
                <InfoRow label="Observações Administrativas" value={a.admin_observations} />
              </Section>
            )}

            {/* Suspeita Sepse */}
            {(tipo === 'sepse_adulto' || tipo === 'sepse_pediatrico') && a.sepse_suspeita && (
              <Section title="Suspeita de Sepse">
                <BoolBadge value={a.sepse_suspeita} label="Confirmada" />
                <InfoRow label="Motivo" value={a.sepse_motivo} />
                <InfoRow label="Horário" value={formatDt(a.sepse_horario)} />
                <InfoRow label="Médico" value={a.sepse_medico} />
              </Section>
            )}

            {/* Enfermagem */}
            {(a.enfermeiro_responsavel || a.enfermeiro_coren || a.enfermeiro_setor) && (
              <Section title="Avaliação da Enfermagem">
                <InfoRow label="Enfermeiro Responsável" value={a.enfermeiro_responsavel} icon={<User className="h-4 w-4" />} />
                <InfoRow label="COREN" value={a.enfermeiro_coren} />
                <InfoRow label="Setor" value={a.enfermeiro_setor} />
              </Section>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
