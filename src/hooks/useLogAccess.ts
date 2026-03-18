import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

type LogDetailsValue = string | number | boolean | null | undefined | LogDetailsObject;
interface LogDetailsObject {
  [key: string]: LogDetailsValue;
}

interface LogDetails {
  [key: string]: LogDetailsValue;
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
      // Log action failure handled silently
    }
  }, []);

  return { logAction };
};
