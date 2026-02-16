export interface IdentificationData {
  nomeCompleto: string;
  cargoAtual: string;
  setor: string;
  setorOutro?: string;
  tempoAtuacao: string;
  formacao: string;
  experienciaLideranca: string;
}

export interface DISCAnswer {
  questionId: number;
  answer: 'a' | 'b' | 'c' | 'd';
}

export interface LeadershipAnswer {
  questionId: number;
  score: 1 | 2 | 3 | 4 | 5;
}

export interface DISCScores {
  D: number;
  I: number;
  S: number;
  C: number;
}

export interface DISCResult {
  scores: DISCScores;
  primaryProfile: 'D' | 'I' | 'S' | 'C';
  secondaryProfile: 'D' | 'I' | 'S' | 'C';
  leadershipScore: number;
  identification: IdentificationData;
}

export interface DISCProfileInfo {
  letter: 'D' | 'I' | 'S' | 'C';
  name: string;
  subtitle: string;
  characteristics: string[];
  potentialUPA: string;
  cargosCompativeis: string[];
  color: string;
}

export const SECTORS = [
  "Recepção/Acolhimento",
  "Classificação de Risco",
  "Consultórios Médicos",
  "Sala de Medicação/Procedimentos",
  "Sala de Observação",
  "Sala de Emergência/Reanimação",
  "Farmácia",
  "Laboratório",
  "Radiologia/Imagem",
  "Administrativo",
  "Higienização/Apoio",
] as const;

export const TIME_OPTIONS = [
  "Menos de 6 meses",
  "6 meses a 1 ano",
  "1 a 2 anos",
  "2 a 5 anos",
  "Mais de 5 anos",
] as const;

export const LEADERSHIP_EXPERIENCE = [
  "Sim, em função formal (coordenação, supervisão, chefia)",
  "Sim, de forma informal (referência técnica, preceptoria)",
  "Não, mas tenho interesse",
  "Não tenho experiência nem interesse no momento",
] as const;
