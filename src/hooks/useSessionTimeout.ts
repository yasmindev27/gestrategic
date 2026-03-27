import { useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Hook de Segurança — Timeout de Sessão por Inatividade
 * LGPD / Normas UPA: encerra a sessão automaticamente após 15 minutos sem uso.
 * Monitora mouse, teclado e touch para detectar atividade.
 */
export function useSessionTimeout(timeoutMinutes = 15) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeoutMs = timeoutMinutes * 60 * 1000;
  const warningMs = (timeoutMinutes - 2) * 60 * 1000; // avisa 2 min antes

  const navigate = useNavigate();
  const logout = useCallback(async () => {
    toast.error("Sessão encerrada por inatividade", {
      description: `Por segurança, a sessão foi encerrada após ${timeoutMinutes} minutos sem uso.`,
      duration: 6000,
    });
    await supabase.auth.signOut();
    // Redireciona via SPA
    navigate("/auth", { replace: true });
  }, [timeoutMinutes, navigate]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);

    // Aviso 2 min antes do logout
    warningRef.current = setTimeout(() => {
      toast.warning("Sessão prestes a expirar", {
        description: "Você será desconectado em 2 minutos por inatividade. Mova o mouse para continuar.",
        duration: 8000,
      });
    }, warningMs);

    // Logout automático
    timerRef.current = setTimeout(logout, timeoutMs);
  }, [logout, timeoutMs, warningMs]);

  useEffect(() => {
    // Eventos que reiniciam o timer
    const events = ["mousemove", "mousedown", "keypress", "touchstart", "scroll", "click"];

    const handleActivity = () => resetTimer();

    events.forEach((e) => window.addEventListener(e, handleActivity, { passive: true }));
    resetTimer(); // inicia o timer na montagem

    return () => {
      events.forEach((e) => window.removeEventListener(e, handleActivity));
      if (timerRef.current) clearTimeout(timerRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
    };
  }, [resetTimer]);
}
