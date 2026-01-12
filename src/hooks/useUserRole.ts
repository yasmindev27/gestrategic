import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

export const useUserRole = () => {
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsLoading(false);
          return;
        }
        
        setUserId(user.id);

        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Error fetching user role:", error);
        } else if (data) {
          setRole(data.role);
        }
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserRole();
  }, []);

  const hasRole = (checkRole: AppRole): boolean => {
    return role === checkRole;
  };

  const hasAnyRole = (roles: AppRole[]): boolean => {
    return role !== null && roles.includes(role);
  };

  const isAdmin = hasRole("admin");
  const isGestor = hasRole("gestor");
  const isRecepcao = hasRole("recepcao");
  const isClassificacao = hasRole("classificacao");
  const isNir = hasRole("nir");
  const isFaturamento = hasRole("faturamento");

  return {
    role,
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
  };
};
