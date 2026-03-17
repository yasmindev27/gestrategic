import { useState, useEffect } from "react";
import { MapPin, ShieldAlert, Users, Construction, FileText, Bell } from "lucide-react";
import {
  RondasPatrimoniais,
  GestaoConflitos,
  ControleVisitantes,
  MapaDanos,
  PassagemPlantao,
} from "@/components/seguranca-patrimonial";
import { PainelSeguranca } from "@/components/seguranca";
import { useLogAccess } from "@/hooks/useLogAccess";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { id: 'painel', label: 'Painel', icon: Bell },
  { id: 'rondas', label: 'Rondas', icon: MapPin },
  { id: 'conflitos', label: 'Conflitos', icon: ShieldAlert },
  { id: 'visitantes', label: 'Visitantes', icon: Users },
  { id: 'danos', label: 'Danos', icon: Construction },
  { id: 'passagem', label: 'Plantão', icon: FileText },
];

export function SegurancaPatrimonialModule() {
  const [activeTab, setActiveTab] = useState("painel");
  const { logAction } = useLogAccess();

  useEffect(() => {
    logAction("acesso_modulo", "seguranca_patrimonial");
  }, [logAction]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    logAction("navegacao_aba", "seguranca_patrimonial", { aba: value });
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'painel': return <PainelSeguranca />;
      case 'rondas': return <RondasPatrimoniais />;
      case 'conflitos': return <GestaoConflitos />;
      case 'visitantes': return <ControleVisitantes />;
      case 'danos': return <MapaDanos />;
      case 'passagem': return <PassagemPlantao />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Segurança Patrimonial</h1>
        <p className="text-muted-foreground">
          Vigilância desarmada, prevenção e controle patrimonial da UPA
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