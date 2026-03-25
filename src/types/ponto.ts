export interface RegistroPonto {
  data: string;
  tipo: string;
  horario: string;
  localizacao: string;
  status: 'Aprovado' | 'Pendente';
}
