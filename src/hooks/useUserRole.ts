import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserRoleState {
  roles: AppRole[];
  primaryRole: AppRole | null;
  userId: string | null;
  isLoading: boolean;
}

export const useUserRole = () => {
  const [state, setState] = useState<UserRoleState>({
    roles: [],
    primaryRole: null,
    userId: null,
    isLoading: true,
  });

  useEffect(() => {
    let isMounted = true;

    const setLoading = (loading: boolean) => {
      if (!isMounted) return;
      setState((prev) => ({ ...prev, isLoading: loading }));
    };

    const resolvePrimaryRole = (roles: AppRole[]): AppRole | null => {
      if (roles.length === 0) return null;
      if (roles.includes("admin")) return "admin";
      if (roles.includes("gestor")) return "gestor";
      return roles[0];
    };

    const fetchRolesForUser = async (userId: string) => {
      // 1) Try direct read from table (when RLS allows)
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      if (!error && data && data.length > 0) {
        const roles = data.map((r) => r.role);
        const primaryRole = resolvePrimaryRole(roles);
        if (!isMounted) return;
        setState({ roles, primaryRole, userId, isLoading: false });
        return;
      }

      // 2) Fallback: use RPC (works even when RLS blocks direct reads)
      const { data: role, error: rpcError } = await supabase.rpc("get_user_role", { _user_id: userId });

      if (!rpcError && role) {
        const roles: AppRole[] = [role];
        const primaryRole = resolvePrimaryRole(roles);
        if (!isMounted) return;
        setState({ roles, primaryRole, userId, isLoading: false });
        return;
      }

      // 3) No roles found / not allowed
      if (!isMounted) return;
      if (error) console.error("Error fetching user roles:", error);
      if (rpcError) console.error("Error fetching user role via RPC:", rpcError);
      setState((prev) => ({ ...prev, roles: [], primaryRole: null, userId, isLoading: false }));
    };

    const refresh = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user ?? null;

        if (!user) {
          if (!isMounted) return;
          setState({ roles: [], primaryRole: null, userId: null, isLoading: false });
          return;
        }

        await fetchRolesForUser(user.id);
      } catch (error) {
        console.error("Error:", error);
        if (!isMounted) return;
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    };

    // Initial load
    refresh();

    // Keep in sync on login/logout
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      refresh();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const hasRole = useCallback((checkRole: AppRole): boolean => {
    return state.roles.includes(checkRole);
  }, [state.roles]);

  const hasAnyRole = useCallback((checkRoles: AppRole[]): boolean => {
    return state.roles.some(r => checkRoles.includes(r));
  }, [state.roles]);

  const isAdmin = state.roles.includes("admin");
  const isGestor = state.roles.includes("gestor");
  const isRecepcao = state.roles.includes("recepcao");
  const isClassificacao = state.roles.includes("classificacao");
  const isNir = state.roles.includes("nir");
  const isFaturamento = state.roles.includes("faturamento");
  const isTI = state.roles.includes("ti");
  const isManutencao = state.roles.includes("manutencao");
  const isEngenhariaCinica = state.roles.includes("engenharia_clinica");
  const isLaboratorio = state.roles.includes("laboratorio");
  const isRestaurante = state.roles.includes("restaurante");
  const isRHDP = state.roles.includes("rh_dp");
  const isTecnico = isTI || isManutencao || isEngenhariaCinica || isLaboratorio;

  // Permissões específicas por módulo
  const canAccessSaidaProntuarios = isAdmin || isRecepcao || isClassificacao || isNir || isFaturamento;
  const canAccessControleFichas = isAdmin || isRecepcao;
  const canAccessAvaliacaoProntuarios = isAdmin || isFaturamento;
  const canAccessEquipe = isAdmin || isGestor;
  const canAtribuirTarefas = isAdmin || isGestor;
  const canViewAgendaColaboradores = isAdmin || isGestor;

  return {
    role: state.primaryRole,
    roles: state.roles,
    userId: state.userId,
    isLoading: state.isLoading,
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
    isTecnico,
    // Permissões de módulo
    canAccessSaidaProntuarios,
    canAccessControleFichas,
    canAccessAvaliacaoProntuarios,
    canAccessEquipe,
    canAtribuirTarefas,
    canViewAgendaColaboradores,
  };
};
