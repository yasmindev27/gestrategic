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

export const SECTORS: SectorConfig[] = [
  { id: 'enfermaria-masculina', name: 'Enfermaria Masculina', beds: [1, 2, 3, 4, 5], extraBeds: ['EXTRA'] },
  { id: 'enfermaria-feminina', name: 'Enfermaria Feminina', beds: [6, 7, 8, 9, 10], extraBeds: ['EXTRA'] },
  { id: 'pediatria', name: 'Pediatria', beds: [11, 12, 13, 14, 15], extraBeds: ['EXTRA'] },
  { id: 'isolamento', name: 'Isolamento', beds: [16, 17] },
  { id: 'urgencia', name: 'Urgência', beds: [18, 19, 20], extraBeds: ['DE APOIO', 'DE APOIO 2', 'MACA PCR'] },
];
