import { useMemo, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserRoleData {
  roles: AppRole[];
  primaryRole: AppRole | null;
  userId: string | null;
}

const resolvePrimaryRole = (roles: AppRole[]): AppRole | null => {
  if (roles.length === 0) return null;
  if (roles.includes("admin")) return "admin";
  if (roles.includes("gestor")) return "gestor";
  return roles[0];
};

const fetchUserRoles = async (): Promise<UserRoleData> => {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  if (!user) {
    return { roles: [], primaryRole: null, userId: null };
  }

  // 1) Try direct read from table (when RLS allows)
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  if (!error && data && data.length > 0) {
    const roles = data.map((r) => r.role);
    return { roles, primaryRole: resolvePrimaryRole(roles), userId: user.id };
  }

  // 2) Fallback: use RPC
  const { data: role, error: rpcError } = await supabase.rpc("get_user_role", { _user_id: user.id });

  if (!rpcError && role) {
    const roles: AppRole[] = [role];
    return { roles, primaryRole: resolvePrimaryRole(roles), userId: user.id };
  }

  if (error) console.error("Error fetching user roles:", error);
  if (rpcError) console.error("Error fetching user role via RPC:", rpcError);
  return { roles: [], primaryRole: null, userId: user.id };
};

export const useUserRole = () => {
  const queryClient = useQueryClient();

  // Invalidate role cache on auth state change (login/logout)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      queryClient.invalidateQueries({ queryKey: ["user-role"] });
    });
    return () => subscription.unsubscribe();
  }, [queryClient]);

  const { data, isLoading } = useQuery({
    queryKey: ["user-role"],
    queryFn: fetchUserRoles,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const roles = data?.roles ?? [];
  const primaryRole = data?.primaryRole ?? null;
  const userId = data?.userId ?? null;

  const hasRole = useCallback((checkRole: AppRole): boolean => {
    return roles.includes(checkRole);
  }, [roles]);

  const hasAnyRole = useCallback((checkRoles: AppRole[]): boolean => {
    return roles.some(r => checkRoles.includes(r));
  }, [roles]);

  const isAdmin = roles.includes("admin");
  const isGestor = roles.includes("gestor");
  const isRecepcao = roles.includes("recepcao");
  const isClassificacao = roles.includes("classificacao");
  const isNir = roles.includes("nir");
  const isFaturamento = roles.includes("faturamento");
  const isTI = roles.includes("ti");
  const isManutencao = roles.includes("manutencao");
  const isEngenhariaCinica = roles.includes("engenharia_clinica");
  const isLaboratorio = roles.includes("laboratorio");
  const isRestaurante = roles.includes("restaurante");
  const isRHDP = roles.includes("rh_dp");
  const isAssistenciaSocial = roles.includes("assistencia_social");
  const isQualidade = roles.includes("qualidade");
  const isNSP = roles.includes("nsp");
  const isMedicos = roles.includes("medicos");
  const isEnfermagem = roles.includes("enfermagem");
  const isSeguranca = roles.includes("seguranca");
  const isTecnico = isTI || isManutencao || isEngenhariaCinica || isLaboratorio;

  const canAccessSaidaProntuarios = isAdmin || isRecepcao || isClassificacao || isNir || isFaturamento;
  const canAccessControleFichas = isAdmin || isRecepcao;
  const canAccessAvaliacaoProntuarios = isAdmin || isFaturamento;
  const canAccessEquipe = isAdmin || isGestor;
  const canAtribuirTarefas = isAdmin || isGestor;
  const canViewAgendaColaboradores = isAdmin || isGestor;

  return {
    role: primaryRole,
    roles,
    userId,
    isLoading,
    hasRole,
    hasAnyRole,
    isAdmin,
    isGestor,
    isRecepcao,
    isClassificacao,
    isNir,
    isFaturamento,
    isTI,
    isManutencao,
    isEngenhariaCinica,
    isLaboratorio,
    isRestaurante,
    isRHDP,
    isAssistenciaSocial,
    isQualidade,
    isNSP,
    isMedicos,
    isEnfermagem,
    isSeguranca,
    isTecnico,
    canAccessSaidaProntuarios,
    canAccessControleFichas,
    canAccessAvaliacaoProntuarios,
    canAccessEquipe,
    canAtribuirTarefas,
    canViewAgendaColaboradores,
  };
};
