import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Hook de Segurança — Timeout de Sessão por Inatividade
 * LGPD / Normas UPA: encerra a sessão automaticamente após N minutos sem uso.
 * Usa debounce para evitar resets excessivos em mousemove.
 */
export function useSessionTimeout(timeoutMinutes = 15) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeoutMs = timeoutMinutes * 60 * 1000;
  const warningMs = (timeoutMinutes - 2) * 60 * 1000;

  const logout = useCallback(async () => {
    toast.error("Sessão encerrada por inatividade", {
      description: `Por segurança, a sessão foi encerrada após ${timeoutMinutes} minutos sem uso.`,
      duration: 6000,
    });
    await supabase.auth.signOut();
    window.location.href = "/auth";
  }, [timeoutMinutes]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);

    warningRef.current = setTimeout(() => {
      toast.warning("Sessão prestes a expirar", {
        description: "Você será desconectado em 2 minutos por inatividade. Mova o mouse para continuar.",
        duration: 8000,
      });
    }, warningMs);

    timerRef.current = setTimeout(logout, timeoutMs);
  }, [logout, timeoutMs, warningMs]);

  // Debounced reset — evita centenas de chamadas por segundo em mousemove
  const debouncedReset = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(resetTimer, 1000);
  }, [resetTimer]);

  useEffect(() => {
    const events = ["mousemove", "mousedown", "keypress", "touchstart", "scroll", "click"];

    events.forEach((e) => window.addEventListener(e, debouncedReset, { passive: true }));
    resetTimer(); // inicia o timer na montagem

    return () => {
      events.forEach((e) => window.removeEventListener(e, debouncedReset));
      if (timerRef.current) clearTimeout(timerRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [resetTimer, debouncedReset]);
}
