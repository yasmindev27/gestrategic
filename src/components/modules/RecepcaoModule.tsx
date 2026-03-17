import { useState } from "react";
import { ClipboardList, ClipboardX, Calendar } from "lucide-react";
import { ControleFichasModule } from "./ControleFichasModule";
import { EscalaTecEnfermagem } from "@/components/enfermagem";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { id: "controle-fichas", label: "Controle de Fichas", icon: ClipboardX },
  { id: "escala-recepcao", label: "Escala Recepção", icon: Calendar },
];

export const RecepcaoModule = () => {
  const [activeTab, setActiveTab] = useState("controle-fichas");

  const renderContent = () => {
    switch (activeTab) {
      case "controle-fichas":
        return <ControleFichasModule />;
      case "escala-recepcao":
        return <EscalaTecEnfermagem tipo="administrativa" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          Recepção
        </h1>
        <p className="text-xs text-muted-foreground">Gestão de atendimento, controle de fichas e escalas</p>
      </div>

      <div className="flex gap-4">
        <nav className="w-48 shrink-0 space-y-0.5">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-left text-[13px] transition-colors",
                activeTab === id
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        <div className="flex-1 min-w-0">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};
