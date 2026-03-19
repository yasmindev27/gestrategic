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
      try {
        // 1) Try direct read from table (when RLS allows) - PARALELO com RPC
        const [{ data, error }, { data: rpcData, error: rpcError }] = await Promise.allSettled([
          supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", userId)
            .then(res => ({ ...res, data: res.data || [] })),
          supabase.rpc("get_user_role", { _user_id: userId })
            .then(res => ({ data: res.data, error: res.error }))
        ]).then(results => {
          const [directResult, rpcResult] = results;
          return [
            directResult.status === 'fulfilled' ? directResult.value : { data: [], error: new Error('Query failed') },
            rpcResult.status === 'fulfilled' ? rpcResult.value : { data: null, error: new Error('RPC failed') }
          ] as any[];
        });

        // 2) Use direct query se conseguir (múltiplas roles), senão RPC (fallback)
        if (!error && data && data.length > 0) {
          const roles = data.map((r) => r.role);
          const primaryRole = resolvePrimaryRole(roles);
          if (!isMounted) return;
          setState({ roles, primaryRole, userId, isLoading: false });
          return;
        }

        // 3) Fallback para RPC (apenas UMA role, melhor que nada)
        if (!rpcError && rpcData) {
          const roles: AppRole[] = [rpcData];
          const primaryRole = resolvePrimaryRole(roles);
          if (!isMounted) return;
          setState({ roles, primaryRole, userId, isLoading: false });
          return;
        }

        // 4) Nenhuma fonte funcionou - usuário sem roles
        if (!isMounted) return;
        console.warn("[useUserRole] Nenhuma fonte de roles disponível para:", {
          userId,
          directError: error?.message,
          rpcError: rpcError?.message
        });
        setState((prev) => ({ ...prev, roles: [], primaryRole: null, userId, isLoading: false }));
      } catch (err) {
        if (!isMounted) return;
        console.error("[useUserRole] Erro crítico ao obter roles:", err instanceof Error ? err.message : String(err));
        setState((prev) => ({ ...prev, roles: [], primaryRole: null, userId, isLoading: false }));
      }
    };

    const refresh = async () => {
      setLoading(true);
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("[useUserRole] Erro ao obter sessão:", sessionError.message);
          if (!isMounted) return;
          setState({ roles: [], primaryRole: null, userId: null, isLoading: false });
          return;
        }
        
        const user = session?.user ?? null;

        if (!user) {
          if (!isMounted) return;
          setState({ roles: [], primaryRole: null, userId: null, isLoading: false });
          return;
        }

        await fetchRolesForUser(user.id);
      } catch (error) {
        console.error("[useUserRole] Erro crítico ao atualizar roles:", error instanceof Error ? error.message : String(error));
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
  const isAssistenciaSocial = state.roles.includes("assistencia_social");
  const isQualidade = state.roles.includes("qualidade");
  const isNSP = state.roles.includes("nsp");
  const isMedicos = state.roles.includes("medicos");
  const isEnfermagem = state.roles.includes("enfermagem");
  const isSeguranca = state.roles.includes("seguranca");
  const isRouparia = state.roles.includes("rouparia");
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
    isAssistenciaSocial,
    isQualidade,
    isNSP,
    isMedicos,
    isEnfermagem,
    isSeguranca,
    isRouparia,
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
