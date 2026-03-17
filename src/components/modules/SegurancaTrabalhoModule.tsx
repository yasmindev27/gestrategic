import { useState, useEffect } from "react";
import { Shirt, HardHat, Syringe, ClipboardCheck, Bell } from "lucide-react";
import {
  UniformesControl,
  EPIsControl,
  VacinasControl,
  RondasControl,
  NotificacoesControl
} from "@/components/seguranca-trabalho";
import { useLogAccess } from "@/hooks/useLogAccess";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { id: 'uniformes', label: 'Uniformes', icon: Shirt },
  { id: 'epis', label: 'EPIs', icon: HardHat },
  { id: 'vacinas', label: 'Vacinação', icon: Syringe },
  { id: 'rondas', label: 'Rondas', icon: ClipboardCheck },
  { id: 'notificacoes', label: 'Notificações', icon: Bell },
];

export function SegurancaTrabalhoModule() {
  const [activeTab, setActiveTab] = useState("uniformes");
  const { logAction } = useLogAccess();

  useEffect(() => {
    logAction("acesso_modulo", "seguranca_trabalho");
  }, [logAction]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    logAction("navegacao_aba", "seguranca_trabalho", { aba: value });
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'uniformes': return <UniformesControl />;
      case 'epis': return <EPIsControl />;
      case 'vacinas': return <VacinasControl />;
      case 'rondas': return <RondasControl />;
      case 'notificacoes': return <NotificacoesControl />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Segurança do Trabalho</h1>
        <p className="text-muted-foreground">
          Gestão de uniformes, EPIs, vacinação e rondas de segurança
        </p>
      </div>

      <div className="flex gap-4">
        <nav className="w-48 flex-shrink-0 space-y-0.5 border-r pr-3">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-md text-left text-sm transition-colors",
                  isActive ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="flex-1 min-w-0">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}