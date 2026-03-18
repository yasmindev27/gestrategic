import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { CheckCircle2, XCircle, FileText } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  atendimento: any;
  tipo: string;
}

function formatDt(val: string | null | undefined) {
  if (!val) return '-';
  try { return format(new Date(val.includes("T") ? val : `${val}T12:00:00`), 'dd/MM/yyyy HH:mm'); } catch { return val; }
}

function InfoField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value || '-'}</p>
    </div>
  );
}

function SectionCard({ title, badge, children }: { title: string; badge?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {badge}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function ItemRow({ label, value, variant }: { label: string; value: string; variant?: 'success' | 'destructive' | 'outline' }) {
  const badgeVariant = variant === 'success' ? 'default' : variant === 'destructive' ? 'destructive' : 'outline';
  return (
    <div className="flex items-center justify-between py-1.5 border-b last:border-b-0">
      <span className="text-sm text-foreground">{label}</span>
      <Badge variant={badgeVariant} className="text-xs">{value}</Badge>
    </div>
  );
}

function BoolItem({ value, label }: { value: boolean | null | undefined; label: string }) {
  if (value === null || value === undefined) return null;
  return <ItemRow label={label} value={value ? 'Sim' : 'Nao'} variant={value ? 'success' : 'outline'} />;
}

export const ProtocoloDetailDialog = ({ open, onOpenChange, atendimento, tipo }: Props) => {
  if (!atendimento) return null;
  const a = atendimento;

  // Count condutas
  const condutaFields = [
    a.conduct_medication, a.conduct_oxygen, a.conduct_monitoring,
    a.conduct_referral, a.conduct_observation, a.conduct_transfer,
    a.conduct_high_risk, a.conduct_moderate_risk, a.conduct_low_risk,
    a.necessidade_uti, a.kit_sepse_coletado,
  ].filter(v => v !== null && v !== undefined);
  const condutasSim = condutaFields.filter(Boolean).length;

  // Count SIRS
  const sirsFields = [
    a.sirs_temp_alta, a.sirs_temp_baixa, a.sirs_fc_alta, a.sirs_fr_alta,
    a.sirs_leucocitose, a.sirs_leucopenia, a.sirs_celulas_jovens,
    a.sirs_plaquetas, a.sirs_lactato, a.sirs_bilirrubina, a.sirs_creatinina,
    a.disfuncao_pa_baixa, a.disfuncao_sato2_baixa, a.disfuncao_consciencia,
  ].filter(v => v !== null && v !== undefined);
  const sirsSim = sirsFields.filter(Boolean).length;

  const focoFields = [
    a.foco_pulmonar, a.foco_urinario, a.foco_abdominal,
    a.foco_pele_partes_moles, a.foco_corrente_sanguinea_cateter, a.foco_sem_foco_definido,
  ].filter(v => v !== null && v !== undefined);
  const focoSim = focoFields.filter(Boolean).length;

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
          <div className="space-y-4">

            {/* === Banner de Meta === */}
            <Card className={`border-2 ${a.within_target ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {a.within_target
                      ? <CheckCircle2 className="h-10 w-10 text-green-600" />
                      : <XCircle className="h-10 w-10 text-red-600" />}
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Status da Meta</p>
                      <p className={`text-2xl font-bold ${a.within_target ? 'text-green-700' : 'text-red-700'}`}>
                        {a.within_target ? 'Dentro da Meta' : 'Fora da Meta'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    {a.porta_ecg_minutes != null && (
                      <p className={`text-xl font-bold ${a.within_target ? 'text-green-700' : 'text-red-700'}`}>
                        {a.porta_ecg_minutes} min
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {tipo === 'dor_toracica' ? 'Porta-ECG' : 'Porta-ATB'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* === Identificação do Paciente (grid) === */}
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-3 gap-4">
                  <InfoField label="Data de Chegada" value={formatDt(a.arrival_time)} />
                  <InfoField label="Classificação de Risco" value={a.risk_classification} />
                  <InfoField label="Competência" value={a.competency} />

                  <InfoField label="Paciente" value={a.patient_name} />
                  <InfoField label="Prontuário" value={a.record_number} />
                  <InfoField label="Sexo" value={a.sex === 'M' ? 'Masculino' : a.sex === 'F' ? 'Feminino' : a.sex || '-'} />

                  <InfoField label="Idade" value={a.age != null ? `${a.age} anos` : '-'} />
                  {tipo === 'dor_toracica' && (
                    <>
                      <InfoField label="Hora do ECG" value={formatDt(a.ecg_time)} />
                      <InfoField label="1o Atendimento Medico" value={formatDt(a.first_doctor_time)} />
                    </>
                  )}
                  {(tipo === 'sepse_adulto' || tipo === 'sepse_pediatrico') && (
                    <>
                      <InfoField label="Abertura do Protocolo" value={formatDt(a.protocol_opened_at)} />
                      <InfoField label="Setor que Abriu" value={a.protocol_opened_by_sector} />
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* === Dor Torácica - Caracterização === */}
            {tipo === 'dor_toracica' && (a.pain_location || a.pain_characteristic || a.pain_onset_date) && (
              <SectionCard title="Caracterização da Dor">
                <div className="grid grid-cols-3 gap-4">
                  <InfoField label="Localização" value={a.pain_location} />
                  <InfoField label="Característica" value={a.pain_characteristic} />
                  <InfoField label="Irradiação" value={a.pain_irradiation} />
                  <InfoField label="Associação" value={a.pain_association} />
                  <InfoField label="Data de Início" value={a.pain_onset_date} />
                  <InfoField label="Hora de Início" value={a.pain_onset_time} />
                  <InfoField label="Duração" value={a.pain_duration} />
                  <InfoField label="Referência" value={a.pain_referral} />
                </div>
              </SectionCard>
            )}

            {/* === Sinais Vitais === */}
            {(a.vital_pa || a.vital_fc || a.vital_fr || a.vital_spo2 || a.vital_temperatura) && (
              <SectionCard title="Sinais Vitais">
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
                  <InfoField label="PA" value={a.vital_pa} />
                  <InfoField label="FC" value={a.vital_fc != null ? `${a.vital_fc} bpm` : '-'} />
                  <InfoField label="FR" value={a.vital_fr != null ? `${a.vital_fr} irpm` : '-'} />
                  <InfoField label="SpO2" value={a.vital_spo2 != null ? `${a.vital_spo2}%` : '-'} />
                  <InfoField label="Temp" value={a.vital_temperatura != null ? `${a.vital_temperatura} C` : '-'} />
                </div>
              </SectionCard>
            )}

            {/* === SIRS / Disfunção === */}
            {(tipo === 'sepse_adulto' || tipo === 'sepse_pediatrico') && sirsFields.length > 0 && (
              <SectionCard
                title="Critérios SIRS / Disfunção Orgânica"
                badge={<Badge variant="outline">{sirsSim}/{sirsFields.length} positivos</Badge>}
              >
                <div className="space-y-0">
                  <BoolItem value={a.sirs_temp_alta} label="Temperatura maior que 38 C" />
                  <BoolItem value={a.sirs_temp_baixa} label="Temperatura menor que 36 C" />
                  <BoolItem value={a.sirs_fc_alta} label="FC Elevada" />
                  <BoolItem value={a.sirs_fr_alta} label="FR Elevada" />
                  <BoolItem value={a.sirs_leucocitose} label="Leucocitose" />
                  <BoolItem value={a.sirs_leucopenia} label="Leucopenia" />
                  <BoolItem value={a.sirs_celulas_jovens} label="Células Jovens" />
                  <BoolItem value={a.sirs_plaquetas} label="Plaquetas" />
                  <BoolItem value={a.sirs_lactato} label="Lactato" />
                  <BoolItem value={a.sirs_bilirrubina} label="Bilirrubina" />
                  <BoolItem value={a.sirs_creatinina} label="Creatinina" />
                  <BoolItem value={a.disfuncao_pa_baixa} label="PA Baixa" />
                  <BoolItem value={a.disfuncao_sato2_baixa} label="SatO2 Baixa" />
                  <BoolItem value={a.disfuncao_consciencia} label="Alteração de Consciência" />
                </div>
              </SectionCard>
            )}

            {/* === Foco Infeccioso === */}
            {(tipo === 'sepse_adulto' || tipo === 'sepse_pediatrico') && focoFields.length > 0 && (
              <SectionCard
                title="Foco Infeccioso"
                badge={<Badge variant="outline">{focoSim}/{focoFields.length} identificados</Badge>}
              >
                <div className="space-y-0">
                  <BoolItem value={a.foco_pulmonar} label="Pulmonar" />
                  <BoolItem value={a.foco_urinario} label="Urinário" />
                  <BoolItem value={a.foco_abdominal} label="Abdominal" />
                  <BoolItem value={a.foco_pele_partes_moles} label="Pele / Partes Moles" />
                  <BoolItem value={a.foco_corrente_sanguinea_cateter} label="Corrente Sanguínea / Cateter" />
                  <BoolItem value={a.foco_sem_foco_definido} label="Sem Foco Definido" />
                </div>
              </SectionCard>
            )}

            {/* === Condutas === */}
            {condutaFields.length > 0 && (
              <SectionCard
                title="Condutas"
                badge={<Badge variant="outline">{condutasSim}/{condutaFields.length} aplicadas</Badge>}
              >
                <div className="space-y-0">
                  <BoolItem value={a.conduct_medication} label="Medicação" />
                  <BoolItem value={a.conduct_oxygen} label="Oxigênio" />
                  <BoolItem value={a.conduct_monitoring} label="Monitorização" />
                  <BoolItem value={a.conduct_referral} label="Encaminhamento" />
                  <BoolItem value={a.conduct_observation} label="Observação" />
                  <BoolItem value={a.conduct_transfer} label="Transferência" />
                  <BoolItem value={a.conduct_high_risk} label="Alto Risco" />
                  <BoolItem value={a.conduct_moderate_risk} label="Risco Moderado" />
                  <BoolItem value={a.conduct_low_risk} label="Baixo Risco" />
                  <BoolItem value={a.necessidade_uti} label="Necessidade UTI" />
                  <BoolItem value={a.kit_sepse_coletado} label="Kit Sepse Coletado" />
                </div>
              </SectionCard>
            )}

            {/* === Antibioticoterapia === */}
            {(tipo === 'sepse_adulto' || tipo === 'sepse_pediatrico') && (a.atb1_nome || a.atb2_nome) && (
              <SectionCard title="Antibioticoterapia">
                {a.atb1_nome && (
                  <div className="rounded-lg bg-muted/50 p-3 space-y-1">
                    <p className="text-xs text-muted-foreground font-medium">ATB 1</p>
                    <p className="text-sm font-medium">{a.atb1_nome} - {a.atb1_dose}</p>
                    <p className="text-xs text-muted-foreground">Via: {a.atb1_via} | Início: {a.atb1_data} {a.atb1_hora}</p>
                  </div>
                )}
                {a.atb2_nome && (
                  <div className="rounded-lg bg-muted/50 p-3 space-y-1">
                    <p className="text-xs text-muted-foreground font-medium">ATB 2</p>
                    <p className="text-sm font-medium">{a.atb2_nome} - {a.atb2_dose}</p>
                    <p className="text-xs text-muted-foreground">Via: {a.atb2_via} | Início: {a.atb2_data} {a.atb2_hora}</p>
                  </div>
                )}
              </SectionCard>
            )}

            {/* === Trombólise (Dor Torácica) === */}
            {tipo === 'dor_toracica' && (a.thrombolysis_time || a.thrombolysis_type) && (
              <SectionCard title="Trombólise">
                <div className="grid grid-cols-2 gap-4">
                  <InfoField label="Horário" value={formatDt(a.thrombolysis_time)} />
                  <InfoField label="Tipo" value={a.thrombolysis_type} />
                  <InfoField label="Conduta" value={a.thrombolysis_conduct} />
                  <InfoField label="Hospital Destino" value={a.destination_hospital} />
                  <InfoField label="Chegada SAMU" value={formatDt(a.samu_arrival_time)} />
                </div>
                <BoolItem value={a.thrombolysis_complication} label="Complicação" />
              </SectionCard>
            )}

            {/* === Lab Sepse === */}
            {(tipo === 'sepse_adulto' || tipo === 'sepse_pediatrico') && (a.lab_villac_horario_chamado || a.lab_villac_horario_coleta) && (
              <SectionCard title="Laboratório">
                <div className="grid grid-cols-2 gap-4">
                  <InfoField label="Horário Chamado Lab" value={formatDt(a.lab_villac_horario_chamado)} />
                  <InfoField label="Horário Coleta Lab" value={formatDt(a.lab_villac_horario_coleta)} />
                </div>
              </SectionCard>
            )}

            {/* === Suspeita Sepse === */}
            {(tipo === 'sepse_adulto' || tipo === 'sepse_pediatrico') && a.sepse_suspeita && (
              <SectionCard title="Suspeita de Sepse">
                <div className="grid grid-cols-2 gap-4">
                  <InfoField label="Motivo" value={a.sepse_motivo} />
                  <InfoField label="Horário" value={formatDt(a.sepse_horario)} />
                  <InfoField label="Médico" value={a.sepse_medico} />
                </div>
                <BoolItem value={a.sepse_suspeita} label="Confirmada" />
              </SectionCard>
            )}

            {/* === Diagnóstico e Observações === */}
            {(a.initial_diagnosis || a.medical_report || a.action_plan || a.admin_observations) && (
              <SectionCard title="Diagnóstico e Observações">
                <div className="space-y-3">
                  {a.initial_diagnosis && (
                    <div><p className="text-xs text-muted-foreground">Diagnóstico Inicial</p><p className="text-sm">{a.initial_diagnosis}</p></div>
                  )}
                  {a.medical_report && (
                    <div><p className="text-xs text-muted-foreground">Relatório Médico</p><p className="text-sm">{a.medical_report}</p></div>
                  )}
                  {a.action_plan && (
                    <div><p className="text-xs text-muted-foreground">Plano de Ação</p><p className="text-sm">{a.action_plan}</p></div>
                  )}
                  {a.admin_observations && (
                    <div><p className="text-xs text-muted-foreground">Observações</p><p className="text-sm">{a.admin_observations}</p></div>
                  )}
                </div>
              </SectionCard>
            )}

            {/* === Enfermagem === */}
            {(a.enfermeiro_responsavel || a.enfermeiro_coren) && (
              <SectionCard title="Enfermagem">
                <div className="grid grid-cols-3 gap-4">
                  <InfoField label="Enfermeiro Responsável" value={a.enfermeiro_responsavel} />
                  <InfoField label="COREN" value={a.enfermeiro_coren} />
                  <InfoField label="Setor" value={a.enfermeiro_setor} />
                </div>
              </SectionCard>
            )}

          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
