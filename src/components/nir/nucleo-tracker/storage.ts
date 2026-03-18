import { supabase } from "@/integrations/supabase/client";
import { RegistroProducao, Colaborador } from "./types";

// ---- Helpers ----

export async function getCurrentUserInfo() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { userName: "", isAdmin: false, isPrivileged: false };

  const [profileRes, roleRes] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("user_id", user.id).single(),
    supabase.from("user_roles").select("role").eq("user_id", user.id),
  ]);

  const userName = profileRes.data?.full_name || "";
  const isAdmin = roleRes.data?.some((r: any) => r.role === "admin") || false;
  const nameLower = userName.toLowerCase();
  const isPrivileged = isAdmin || nameLower.includes("blendon") || nameLower.includes("maximo");

  return { userName, isAdmin, isPrivileged };
}

// ---- Registros de Produção ----

export async function getRegistrosDB(onlyOwn: boolean = true): Promise<RegistroProducao[]> {
  let query = supabase
    .from("nir_registros_producao")
    .select("*")
    .order("created_at", { ascending: false });

  if (onlyOwn) {
    const { userName } = await getCurrentUserInfo();
    if (userName) {
      query = query.eq("colaborador", userName);
    }
  }

  const { data, error } = await query;

  if (error) {
    // Error loading records - return empty array
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
