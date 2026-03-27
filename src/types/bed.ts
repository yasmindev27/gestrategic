export type MotivoAlta = 'alta-melhorada' | 'evasao' | 'transferencia' | 'obito' | '';

export interface Patient {
  nome: string;
  hipoteseDiagnostica: string;
  condutasOutros: string;
  observacao: string;
  dataNascimento: string;
  dataInternacao: string;
  susFacil: 'sim' | 'nao' | '';
  numeroSusFacil: string;
  cti: 'sim' | 'nao' | '';
  motivoAlta: MotivoAlta;
  estabelecimentoTransferencia: string;
  dataAlta?: string;
  registradoEm?: string;
}

export interface Bed {
  id: string;
  number: number | string;
  sector: Sector;
  patient: Patient | null;
}

export type Sector = 
  | 'enfermaria-masculina'
  | 'enfermaria-feminina'
  | 'pediatria'
  | 'isolamento'
  | 'urgencia';

export interface SectorConfig {
  id: Sector;
  name: string;
  beds: number[];
  extraBeds?: string[];
}

export interface ShiftInfo {
  tipo: 'noturno' | 'diurno';
  data: string;
  medicos: string;
  enfermeiros: string;
  reguladorNIR: string;
}

// ATENÇÃO: Não use dados hardcoded. Os setores e leitos devem ser buscados do banco de dados.
export const SECTORS: SectorConfig[] = [];
