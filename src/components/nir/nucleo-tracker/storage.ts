import { supabase } from "@/integrations/supabase/client";
import { RegistroProducao, Colaborador } from "./types";

// ---- Registros de Produção ----

export async function getRegistrosDB(): Promise<RegistroProducao[]> {
  const { data, error } = await supabase
    .from("nir_registros_producao")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao carregar registros:", error);
    return [];
  }

  return (data || []).map((r) => ({
    id: r.id,
    colaborador: r.colaborador,
    atividade: r.atividade as RegistroProducao["atividade"],
    quantidade: r.quantidade,
    observacao: r.observacao || "",
    data: r.data,
    criadoEm: r.created_at,
  }));
}

export async function salvarRegistroDB(registro: RegistroProducao) {
  const { error } = await supabase.from("nir_registros_producao").insert({
    colaborador: registro.colaborador,
    atividade: registro.atividade,
    quantidade: registro.quantidade,
    observacao: registro.observacao,
    data: registro.data,
  });

  if (error) {
    console.error("Erro ao salvar registro:", error);
    throw error;
  }
}

export async function excluirRegistroDB(id: string) {
  const { error } = await supabase
    .from("nir_registros_producao")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Erro ao excluir registro:", error);
    throw error;
  }
}

// ---- Colaboradores ----

export async function getColaboradoresDB(): Promise<Colaborador[]> {
  const { data, error } = await supabase
    .from("nir_colaboradores")
    .select("*")
    .order("nome");

  if (error) {
    console.error("Erro ao carregar colaboradores:", error);
    return [];
  }

  return (data || []).map((c) => ({
    id: c.id,
    nome: c.nome,
    ativo: c.ativo,
    criadoEm: c.created_at,
  }));
}

export async function salvarColaboradorDB(nome: string) {
  const { error } = await supabase
    .from("nir_colaboradores")
    .insert({ nome });

  if (error) {
    console.error("Erro ao salvar colaborador:", error);
    throw error;
  }
}

export async function toggleColaboradorAtivoDB(id: string, ativo: boolean) {
  const { error } = await supabase
    .from("nir_colaboradores")
    .update({ ativo: !ativo })
    .eq("id", id);

  if (error) {
    console.error("Erro ao atualizar colaborador:", error);
    throw error;
  }
}

// Legacy localStorage functions kept for backward compat (deprecated)
export function getRegistros(): RegistroProducao[] {
  return [];
}
export function getColaboradores(): Colaborador[] {
  return [];
}
