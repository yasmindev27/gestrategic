import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare, X } from "lucide-react";
import { ChatCorporativo } from "./ChatCorporativo";
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
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 hover:scale-110 transition-transform"
          size="icon"
        >
          {isOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <MessageSquare className="h-6 w-6" />
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
