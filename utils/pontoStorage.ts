import { RegistroPonto } from '../types/ponto';

const STORAGE_KEY = 'registros_ponto';

export function getRegistrosPonto(): RegistroPonto[] {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

export function salvarRegistroPonto(registro: RegistroPonto) {
  const registros = getRegistrosPonto();
  registros.unshift(registro);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(registros));
}
