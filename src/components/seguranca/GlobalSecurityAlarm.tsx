import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Global component that monitors pending security alerts and plays
 * the alarm sound + vibration continuously until all alerts are attended,
 * regardless of which page/module the user is viewing.
 */

// Flag global para liberar vibração só após interação do usuário
let vibrationAllowed = false;
function enableVibrationOnUserInteraction() {
  if (!vibrationAllowed) {
    vibrationAllowed = true;
    window.removeEventListener('pointerdown', enableVibrationOnUserInteraction);
  }
}
if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', enableVibrationOnUserInteraction, { once: true });
}

export function GlobalSecurityAlarm() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const vibrationInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingRef = useRef(0);

  const safeVibrate = (pattern: number | number[]) => {
    if (!vibrationAllowed) return;
    try {
      if (navigator.vibrate) {
        navigator.vibrate(pattern);
      }
    } catch (e) {
      // Silencia qualquer erro de bloqueio
    }
  };

  const startAlarm = useCallback(() => {
    // Sound
    if (!audioRef.current) {
      audioRef.current = new Audio("/assets/toque-seguranca.mp3");
      audioRef.current.loop = true;
      audioRef.current.volume = 0.7;
    }
    audioRef.current.play().catch(() => {});

    // Vibration (continuous pattern every 2s, só após interação do usuário)
    if (!vibrationInterval.current && vibrationAllowed) {
      safeVibrate([500, 300, 500]);
      vibrationInterval.current = setInterval(() => {
        safeVibrate([500, 300, 500]);
      }, 2000);
    }
  }, []);

  const stopAlarm = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (vibrationInterval.current) {
      clearInterval(vibrationInterval.current);
      vibrationInterval.current = null;
    }
    safeVibrate(0);
  }, []);

  const checkPending = useCallback(async () => {
    const { count } = await supabase
      .from("alertas_seguranca")
      .select("*", { count: "exact", head: true })
      .eq("status", "pendente");

    const pending = count ?? 0;
    pendingRef.current = pending;

    if (pending > 0) {
      startAlarm();
    } else {
      stopAlarm();
    }
  }, [startAlarm, stopAlarm]);

  useEffect(() => {
    checkPending();

    const channel = supabase
      .channel("global-security-alarm")
      .on("postgres_changes", { event: "*", schema: "public", table: "alertas_seguranca" }, () => {
        checkPending();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      stopAlarm();
    };
  }, [checkPending, stopAlarm]);

  return null; // Renderless component
}
