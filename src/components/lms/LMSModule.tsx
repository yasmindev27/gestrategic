import { useState } from "react";
import { useUserRole } from "@/hooks/useUserRole";
import { GraduationCap, Calendar, BookOpen, BarChart3, ClipboardList, HelpCircle, User } from "lucide-react";
import CronogramaAdmin from "./CronogramaAdmin";
import LNTDManager from "./LNTDManager";
import DashboardIndicadores from "./DashboardIndicadores";
import ListaPresenca from "./ListaPresenca";
import QuizManager from "./QuizManager";
import PortalAluno from "./PortalAluno";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { id: 'cronograma', label: 'Cronograma', icon: Calendar },
  { id: 'lntd', label: 'LNTD', icon: BookOpen },
  { id: 'quiz', label: 'Quiz', icon: HelpCircle },
  { id: 'indicadores', label: 'Indicadores', icon: BarChart3 },
  { id: 'presenca', label: 'Presença', icon: ClipboardList },
  { id: 'portal', label: 'Portal Aluno', icon: User },
];

export default function LMSModule() {
  const { isAdmin, isGestor, isRHDP, isQualidade, isSeguranca, isFaturamento } = useUserRole();
  const isManager = isAdmin || isGestor || isRHDP || isQualidade || isSeguranca || isFaturamento;
  const [activeTab, setActiveTab] = useState("cronograma");

  if (!isManager) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <GraduationCap className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Portal de Treinamentos</h1>
            <p className="text-muted-foreground text-sm">Acesse seus treinamentos e avaliações</p>
          </div>
        </div>
        <PortalAluno />
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'cronograma': return <CronogramaAdmin />;
      case 'lntd': return <LNTDManager />;
      case 'quiz': return <QuizManager />;
      case 'indicadores': return <DashboardIndicadores />;
      case 'presenca': return <ListaPresenca />;
      case 'portal': return <PortalAluno />;
      default: return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <GraduationCap className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Área de Aprendizado</h1>
          <p className="text-muted-foreground text-sm">Gerencie treinamentos, avaliações e capacitações</p>
        </div>
      </div>

      <div className="flex gap-4">
        <nav className="w-48 flex-shrink-0 space-y-0.5 border-r pr-3">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
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