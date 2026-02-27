import { RegistroProducao, Colaborador } from "./types";

const STORAGE_KEY = "nir-producao-registros";
const COLAB_KEY = "nir-colaboradores";

export function getRegistros(): RegistroProducao[] {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

export function salvarRegistro(registro: RegistroProducao) {
  const registros = getRegistros();
  registros.unshift(registro);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(registros));
}

export function excluirRegistro(id: string) {
  const registros = getRegistros().filter((r) => r.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(registros));
}

export function getColaboradores(): Colaborador[] {
  const data = localStorage.getItem(COLAB_KEY);
  return data ? JSON.parse(data) : [];
}

export function getColaboradoresAtivos(): Colaborador[] {
  return getColaboradores().filter((c) => c.ativo);
}

export function salvarColaborador(colab: Colaborador) {
  const list = getColaboradores();
  list.push(colab);
  localStorage.setItem(COLAB_KEY, JSON.stringify(list));
}

export function toggleColaboradorAtivo(id: string) {
  const list = getColaboradores().map((c) =>
    c.id === id ? { ...c, ativo: !c.ativo } : c
  );
  localStorage.setItem(COLAB_KEY, JSON.stringify(list));
}
