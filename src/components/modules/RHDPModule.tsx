import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, FileText, ShieldX, ClipboardList, Users, UserCog, AlertTriangle, Stethoscope, BarChart3, UserCheck, CalendarDays, Radio, Building2, Pill } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { useLogAccess } from "@/hooks/useLogAccess";
import { BancoHorasSection } from "@/components/rhdp/BancoHorasSection";
import { CentralAtestadosSection } from "@/components/rhdp/CentralAtestadosSection";
import { FormulariosSection } from "@/components/rhdp/FormulariosSection";
import { MovimentacoesDisciplinarSection } from "@/components/rhdp/MovimentacoesDisciplinarSection";
import { ProfissionaisSaude } from "@/components/rh";
import { ASOControl } from "@/components/seguranca-trabalho";
import { AvaliacaoDesempenhoSection } from "@/components/rhdp/AvaliacaoDesempenhoSection";
import { AvaliacaoExperienciaSection } from "@/components/rhdp/AvaliacaoExperienciaSection";
import { EscalaTecEnfermagem } from "@/components/enfermagem";
import { cn } from "@/lib/utils";

const RHDP_NAV_ITEMS = [
  { id: 'banco-horas', label: 'Banco de Horas', icon: Clock },
  { id: 'atestados', label: 'Atestados', icon: FileText },
  { id: 'aso', label: 'ASO', icon: Stethoscope },
  { id: 'escalas', label: 'Escalas', icon: CalendarDays },
  { id: 'formularios', label: 'Formulários', icon: ClipboardList },
  { id: 'disciplinar', label: 'Disciplinar', icon: AlertTriangle },
  { id: 'profissionais', label: 'Profissionais', icon: Users },
  { id: 'avaliacao', label: 'Avaliação/PDI', icon: BarChart3 },
  { id: 'experiencia', label: 'Av. Experiência', icon: UserCheck },
];

const ESCALAS_SUB_ITEMS = [
  { id: 'tecnicos', label: 'Escala Técnicos', icon: ClipboardList },
  { id: 'enfermeiros', label: 'Escala Enfermeiros', icon: Stethoscope },
  { id: 'radiologia', label: 'Escala Radiologia', icon: Radio },
  { id: 'administrativa', label: 'Escala Administrativa', icon: Building2 },
  { id: 'farmacia', label: 'Escala Farmácia', icon: Pill },
  { id: 'recepcao', label: 'Escala Recepção', icon: ClipboardList },
];

export const RHDPModule = () => {
  const { isAdmin, hasRole, isLoading } = useUserRole();
  const { logAction } = useLogAccess();
  const [activeTab, setActiveTab] = useState("banco-horas");
  const [escalasSubTab, setEscalasSubTab] = useState("tecnicos");

  useEffect(() => {
    logAction("acesso_modulo", "rhdp");
  }, [logAction]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    logAction("navegacao_aba", "rhdp", { aba: value });
  };

  const isRHDP = hasRole("rh_dp");
  const hasAccess = isAdmin || isRHDP;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <ShieldX className="h-12 w-12 text-destructive mx-auto" />
          <p className="text-muted-foreground">Você não tem acesso a este módulo.</p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'banco-horas': return <BancoHorasSection />;
      case 'atestados': return <CentralAtestadosSection />;
      case 'aso': return <ASOControl />;
      case 'escalas': return (
        <Tabs value={escalasSubTab} onValueChange={setEscalasSubTab}>
          <TabsList className="flex flex-wrap h-auto gap-1">
            {ESCALAS_SUB_ITEMS.map(item => (
              <TabsTrigger key={item.id} value={item.id} className="gap-2">
                <item.icon className="h-4 w-4" />
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {ESCALAS_SUB_ITEMS.map(item => (
            <TabsContent key={item.id} value={item.id} className="mt-4">
              <EscalaTecEnfermagem tipo={item.id as any} />
            </TabsContent>
          ))}
        </Tabs>
      );
      case 'formularios': return <FormulariosSection />;
      case 'disciplinar': return <MovimentacoesDisciplinarSection />;
      case 'profissionais': return <ProfissionaisSaude />;
      case 'avaliacao': return <AvaliacaoDesempenhoSection />;
      case 'experiencia': return <AvaliacaoExperienciaSection />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="h-6 w-6 text-primary" />
            Recursos Humanos / Departamento Pessoal
          </CardTitle>
          <CardDescription>
            Central de gestão de pessoas, cadastros, escalas, banco de horas e atestados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <nav className="w-48 flex-shrink-0 space-y-0.5 border-r pr-3">
              {RHDP_NAV_ITEMS.map(item => {
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
        </CardContent>
      </Card>
    </div>
  );
};