import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface LogDetails {
  [key: string]: string | number | boolean | null | undefined;
}

export const useLogAccess = () => {
  const logAction = useCallback(async (
    acao: string,
    modulo: string,
    detalhes?: LogDetails
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from("logs_acesso").insert({
        user_id: user.id,
        acao,
        modulo,
        detalhes: detalhes || null,
      });
    } catch (error) {
      console.error("Error logging action:", error);
    }
  }, []);

  return { logAction };
};
