import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare, X } from "lucide-react";
import { ChatCorporativo } from "./ChatCorporativo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface FloatingChatButtonProps {
  showOnModules?: string[];
  currentModule?: string;
}

export const FloatingChatButton = ({ showOnModules, currentModule }: FloatingChatButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  // Buscar usuário atual
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    getUser();
  }, []);

  // Escutar novas mensagens em tempo real
  useEffect(() => {
    if (!userId) return;

    // Buscar as conversas do usuário para escutar
    const setupRealtimeListeners = async () => {
      const { data: participacoes } = await supabase
        .from("chat_participantes")
        .select("conversa_id")
        .eq("user_id", userId);

      if (!participacoes || participacoes.length === 0) return;

      const conversaIds = participacoes.map(p => p.conversa_id);

      const channel = supabase
        .channel("chat-notifications")
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_mensagens'
          },
          async (payload) => {
            const newMessage = payload.new as { 
              conversa_id: string; 
              remetente_id: string; 
              conteudo: string;
            };
            
            // Verificar se a mensagem é de uma conversa que o usuário participa
            if (!conversaIds.includes(newMessage.conversa_id)) return;
            
            // Não notificar mensagens próprias
            if (newMessage.remetente_id === userId) return;

            // Se o chat está fechado, mostrar notificação
            if (!isOpen) {
              setHasNewMessage(true);
              setUnreadCount(prev => prev + 1);

              // Buscar nome do remetente
              const { data: profile } = await supabase
                .from("profiles")
                .select("full_name")
                .eq("user_id", newMessage.remetente_id)
                .single();

              const remetenteName = profile?.full_name || "Alguém";
              
              // Mostrar toast de notificação
              toast({
                title: `💬 Nova mensagem de ${remetenteName}`,
                description: newMessage.conteudo.substring(0, 50) + (newMessage.conteudo.length > 50 ? "..." : ""),
              });
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    const cleanup = setupRealtimeListeners();
    return () => {
      cleanup.then(fn => fn?.());
    };
  }, [userId, isOpen]);

  // Limpar notificações quando abrir o chat
  useEffect(() => {
    if (isOpen) {
      setHasNewMessage(false);
      setUnreadCount(0);
    }
  }, [isOpen]);

  // Não mostrar no próprio módulo de chat
  if (currentModule === "chat") return null;

  // Se showOnModules está definido, verificar se o módulo atual está na lista
  if (showOnModules && currentModule && !showOnModules.includes(currentModule)) {
    return null;
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          className={`fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 hover:scale-110 transition-transform ${
            hasNewMessage ? "animate-pulse ring-2 ring-primary ring-offset-2" : ""
          }`}
          size="icon"
        >
          {isOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <>
              <MessageSquare className={`h-6 w-6 ${hasNewMessage ? "animate-bounce" : ""}`} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-3xl p-0 overflow-hidden">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Chat Corporativo
          </SheetTitle>
        </SheetHeader>
        <div className="h-[calc(100vh-80px)] overflow-hidden">
          <div className="h-full p-4">
            <ChatCorporativo />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};