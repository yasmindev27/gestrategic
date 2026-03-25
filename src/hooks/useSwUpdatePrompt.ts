import { useEffect, useState } from "react";
import { useToast } from "./use-toast";

/**
 * Hook para gerenciar atualizações do Service Worker
 * Mostra um toast quando uma nova versão está disponível
 * Permite ao usuário decidir quando atualizar
 */
export const useSwUpdatePrompt = () => {
  const { toast } = useToast();
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);

  useEffect(() => {
    // @ts-ignore - vite-plugin-pwa registra isso globalmente
    if (!window.__SW_MANIFEST) {
      return;
    }

    // Handler para quando há uma nova versão disponível
    const handleSWUpdated = () => {
      setNeedsRefresh(true);
      toast({
        title: "✨ Nova versão disponível",
        description: "Recarregue a página para atualizar a aplicação",
        duration: 0, // Não fecha automaticamente
      });
    };

    // Handler para quando está offline ready
    const handleOfflineReady = () => {
      setOfflineReady(true);
      toast({
        title: "✅ Pronto para usar offline",
        description: "A aplicação pode ser usada sem conexão",
        duration: 5000,
      });
    };

    // Escuta os eventos da PWA
    window.addEventListener("sw-updated", handleSWUpdated);
    window.addEventListener("sw-offline-ready", handleOfflineReady);

    return () => {
      window.removeEventListener("sw-updated", handleSWUpdated);
      window.removeEventListener("sw-offline-ready", handleOfflineReady);
    };
  }, [toast]);

  return { needsRefresh, offlineReady };
};
