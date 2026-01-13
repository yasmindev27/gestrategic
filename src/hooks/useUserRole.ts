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
    
    const fetchUserRoles = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !isMounted) {
          if (isMounted) {
            setState(prev => ({ ...prev, isLoading: false }));
          }
          return;
        }

        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);

        if (!isMounted) return;

        if (error) {
          console.error("Error fetching user roles:", error);
          setState(prev => ({ ...prev, isLoading: false, userId: user.id }));
        } else if (data && data.length > 0) {
          const userRoles = data.map(r => r.role);
          // Define role primário (prioridade: admin > gestor > outros)
          let primary: AppRole;
          if (userRoles.includes("admin")) {
            primary = "admin";
          } else if (userRoles.includes("gestor")) {
            primary = "gestor";
          } else {
            primary = userRoles[0];
          }
          setState({
            roles: userRoles,
            primaryRole: primary,
            userId: user.id,
            isLoading: false,
          });
        } else {
          setState(prev => ({ ...prev, isLoading: false, userId: user.id }));
        }
      } catch (error) {
        console.error("Error:", error);
        if (isMounted) {
          setState(prev => ({ ...prev, isLoading: false }));
        }
      }
    };

    fetchUserRoles();
    
    return () => {
      isMounted = false;
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
