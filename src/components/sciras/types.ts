export interface VigilanciaIRAS {
  id: string;
  numero_notificacao: string;
  paciente_nome: string;
  numero_prontuario?: string;
  data_nascimento?: string;
  setor: string;
  leito?: string;
  data_internacao?: string;
  data_infeccao: string;
  sitio_infeccao: string;
  tipo_iras: string;
  dispositivo_invasivo?: string;
  data_instalacao_dispositivo?: string;
  data_remocao_dispositivo?: string;
  microrganismo?: string;
  perfil_resistencia?: string;
  classificacao_gravidade: string;
  status: string;
  observacoes?: string;
  notificador_id?: string;
  notificador_nome?: string;
  created_at: string;
  updated_at: string;
}

export interface IndicadorDiario {
  id: string;
  data_registro: string;
  setor: string;
  pacientes_dia: number;
  cvc_dia: number;
  svd_dia: number;
  vm_dia: number;
  ipcs_novas: number;
  itu_novas: number;
  pav_novas: number;
  registrado_por: string;
  registrado_por_nome: string;
  created_at: string;
  updated_at: string;
}

export interface CulturaMicrobiologica {
  id: string;
  vigilancia_iras_id?: string;
  paciente_nome: string;
  numero_prontuario?: string;
  setor: string;
  data_coleta: string;
  tipo_material: string;
  microrganismo_isolado?: string;
  perfil_sensibilidade?: Record<string, string>;
  multirresistente: boolean;
  mecanismo_resistencia?: string;
  resultado: string;
  observacoes?: string;
  registrado_por: string;
  registrado_por_nome: string;
  created_at: string;
  updated_at: string;
}

export interface Antimicrobiano {
  id: string;
  paciente_nome: string;
  numero_prontuario?: string;
  setor: string;
  antimicrobiano: string;
  dose: string;
  via_administracao: string;
  data_inicio: string;
  data_fim?: string;
  dias_uso?: number;
  indicacao?: string;
  justificativa?: string;
  cultura_id?: string;
  status: string;
  prescrito_por?: string;
  registrado_por: string;
  registrado_por_nome: string;
  created_at: string;
  updated_at: string;
}

export interface NotificacaoEpidemiologica {
  id: string;
  numero_notificacao: string;
  tipo: string;
  doenca_agravo: string;
  data_notificacao: string;
  paciente_nome?: string;
  numero_prontuario?: string;
  setor: string;
  descricao: string;
  medidas_controle?: string;
  notificado_anvisa: boolean;
  notificado_vigilancia_municipal: boolean;
  data_notificacao_externa?: string;
  status: string;
  desfecho?: string;
  notificador_id: string;
  notificador_nome: string;
  created_at: string;
  updated_at: string;
}

export const SITIOS_INFECCAO = [
  { value: 'ipcs', label: 'IPCS - Infecção Primária de Corrente Sanguínea' },
  { value: 'itu', label: 'ITU - Infecção do Trato Urinário' },
  { value: 'pav', label: 'PAV - Pneumonia Associada à Ventilação' },
  { value: 'isc', label: 'ISC - Infecção de Sítio Cirúrgico' },
  { value: 'pele_partes_moles', label: 'Pele e Partes Moles' },
  { value: 'gastrointestinal', label: 'Gastrointestinal' },
  { value: 'outros', label: 'Outros' },
] as const;

export const DISPOSITIVOS_INVASIVOS = [
  { value: 'cvc', label: 'CVC - Cateter Venoso Central' },
  { value: 'svd', label: 'SVD - Sonda Vesical de Demora' },
  { value: 'vm', label: 'VM - Ventilação Mecânica' },
  { value: 'picc', label: 'PICC - Cateter Central de Inserção Periférica' },
  { value: 'avp', label: 'AVP - Acesso Venoso Periférico' },
  { value: 'sne', label: 'SNE - Sonda Nasoenteral' },
  { value: 'traqueostomia', label: 'Traqueostomia' },
  { value: 'nenhum', label: 'Nenhum' },
] as const;

export const TIPOS_MATERIAL_CULTURA = [
  { value: 'hemocultura', label: 'Hemocultura' },
  { value: 'urocultura', label: 'Urocultura' },
  { value: 'secrecao_traqueal', label: 'Secreção Traqueal' },
  { value: 'secrecao_ferida', label: 'Secreção de Ferida' },
  { value: 'liquor', label: 'Líquor' },
  { value: 'ponta_cateter', label: 'Ponta de Cateter' },
  { value: 'swab_retal', label: 'Swab Retal' },
  { value: 'swab_nasal', label: 'Swab Nasal' },
  { value: 'outros', label: 'Outros' },
] as const;

export const MECANISMOS_RESISTENCIA = [
  { value: 'mrsa', label: 'MRSA' },
  { value: 'vre', label: 'VRE' },
  { value: 'kpc', label: 'KPC' },
  { value: 'esbl', label: 'ESBL' },
  { value: 'ndm', label: 'NDM' },
  { value: 'oxa', label: 'OXA-48' },
  { value: 'outros', label: 'Outros' },
] as const;

export const TIPOS_NOTIFICACAO_EPI = [
  { value: 'surto', label: 'Surto' },
  { value: 'doenca_compulsoria', label: 'Doença de Notificação Compulsória' },
  { value: 'evento_sentinela', label: 'Evento Sentinela' },
] as const;

export const ANTIMICROBIANOS_COMUNS = [
  'Amicacina', 'Amoxicilina', 'Amoxicilina + Clavulanato', 'Ampicilina',
  'Azitromicina', 'Cefazolina', 'Cefepime', 'Ceftazidima', 'Ceftriaxona',
  'Ciprofloxacino', 'Clindamicina', 'Daptomicina', 'Ertapenem',
  'Gentamicina', 'Imipenem', 'Levofloxacino', 'Linezolida',
  'Meropenem', 'Metronidazol', 'Oxacilina', 'Piperacilina + Tazobactam',
  'Polimixina B', 'Sulfametoxazol + Trimetoprima', 'Teicoplanina',
  'Tigeciclina', 'Vancomicina',
] as const;
