import { useState, useEffect, lazy, Suspense, useMemo, useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";
import ExternalViewer from "@/components/ExternalViewer";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import DashboardLayout, { PageLoader } from "@/components/layout/DashboardLayout";
import DashboardPersonalizado from "@/components/dashboard/DashboardPersonalizado";
import TeamSection from "@/components/TeamSection";
import { FaturamentoUnificadoModule } from "@/components/modules/FaturamentoUnificadoModule";
import { ControleFichasModule } from "@/components/modules/ControleFichasModule";
import { AdminModule } from "@/components/modules/AdminModule";
import { TecnicoModule } from "@/components/modules/TecnicoModule";
import { AbrirChamadoModule } from "@/components/modules/AbrirChamadoModule";
import { LaboratorioModule } from "@/components/modules/LaboratorioModule";
import { AgendaModule } from "@/components/agenda";
import { LogsAuditoriaModule } from "@/components/modules/LogsAuditoriaModule";
import { RestauranteModule } from "@/components/modules/RestauranteModule";
import { MapaLeitosModule } from "@/components/modules/MapaLeitosModule";
import { NirModule } from "@/components/modules/NirModule";
import { RecepcaoModule } from "@/components/modules/RecepcaoModule";
import { RHDPModule } from "@/components/modules/RHDPModule";
import { ChatModule } from "@/components/modules/ChatModule";
import { RoupariaModule } from "@/components/modules/RoupariaModule";
import { SegurancaTrabalhoModule } from "@/components/modules/SegurancaTrabalhoModule";
import { AssistenciaSocialModule } from "@/components/modules/AssistenciaSocialModule";
import { QualidadeModule } from "@/components/modules/QualidadeModule";
import { ReportarIncidenteDialog } from "@/components/gestao-incidentes";
import { ProfissionaisSaude } from "@/components/rh";
import LMSModule from "@/components/lms/LMSModule";
import { Loader2 } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";

// Lazy load heavy modules
const EnfermagemModule = lazy(() => import("@/components/modules/EnfermagemModule"));
const SalusModule = lazy(() => import("@/components/modules/SalusModule"));
const MedicosModule = lazy(() => import("@/components/modules/MedicosModule"));
const EquipeModule = lazy(() => import("@/components/modules/EquipeModule"));

// Memoized module components for performance
const MemoizedTecnicoModule = memo(TecnicoModule);
const MemoizedDashboardPersonalizado = memo(DashboardPersonalizado);

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("");
  const [externalUrl, setExternalUrl] = useState<{ url: string; title: string } | null>(null);
  const { isNir, isRecepcao, isLoading: isLoadingRole } = useUserRole();

  useEffect(() => {
    let isMounted = true;

    const handleAuthChange = (session: Session | null) => {
      if (!isMounted) return;
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
      setIsLoading(false);
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_, session) => handleAuthChange(session)
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthChange(session);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  // Set initial section based on user role
  useEffect(() => {
    if (!isLoadingRole && activeSection === "") {
      if (isNir) {
        setActiveSection("nir");
      } else if (isRecepcao) {
        setActiveSection("recepcao");
      } else {
        setActiveSection("dashboard");
      }
    }
  }, [isLoadingRole, isNir, isRecepcao, activeSection]);

  // Memoized section change handler
  const handleSectionChange = useCallback((section: string) => {
    setExternalUrl(null);
    setActiveSection(section);
  }, []);

  const handleOpenExternal = useCallback((url: string, title: string) => {
    setExternalUrl({ url, title });
  }, []);

  // Loading state
  if (isLoading || isLoadingRole || activeSection === "") {
    return <PageLoader />;
  }

  if (!user) {
    return null;
  }

  // Render active module content
  const renderContent = () => {
    switch (activeSection) {
      case "dashboard":
        return <MemoizedDashboardPersonalizado />;
      case "abrir-chamado":
        return <AbrirChamadoModule />;
      case "faturamento":
        return <FaturamentoUnificadoModule />;
      case "controle-fichas":
        return <ControleFichasModule />;
      case "equipe":
        return (
          <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <EquipeModule />
          </Suspense>
        );
      case "agenda":
        return <AgendaModule />;
      case "admin":
        return <AdminModule />;
      case "logs":
        return <LogsAuditoriaModule />;
      case "tecnico-ti":
        return <MemoizedTecnicoModule setor="ti" />;
      case "tecnico-manutencao":
        return <MemoizedTecnicoModule setor="manutencao" />;
      case "tecnico-engenharia":
        return <MemoizedTecnicoModule setor="engenharia_clinica" />;
      case "nir":
      case "dashboard-nir":
        return <NirModule />;
      case "mapa-leitos":
        return <MapaLeitosModule />;
      case "laboratorio":
        return <LaboratorioModule />;
      case "restaurante":
        return <RestauranteModule />;
      case "recepcao":
        return <RecepcaoModule />;
      case "rhdp":
        return <RHDPModule />;
      case "rouparia":
        return <RoupariaModule />;
      case "seguranca-trabalho":
        return <SegurancaTrabalhoModule />;
      case "assistencia-social":
        return <AssistenciaSocialModule />;
      case "qualidade":
        return <QualidadeModule />;
      case "reportar-incidente":
        return <ReportarIncidenteDialog onSectionChange={handleSectionChange} />;
      case "enfermagem":
        return (
          <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <EnfermagemModule />
          </Suspense>
        );
      case "chat":
        return <ChatModule />;
      case "medicos":
        return (
          <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <MedicosModule />
          </Suspense>
        );
      case "profissionais-saude":
        return <ProfissionaisSaude />;
      case "lms":
        return <LMSModule />;
      case "salus":
        return (
          <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <SalusModule />
          </Suspense>
        );
      default:
        return <MemoizedDashboardPersonalizado />;
    }
  };

  return (
    <DashboardLayout
      activeSection={activeSection}
      onSectionChange={handleSectionChange}
      onOpenExternal={handleOpenExternal}
    >
      {externalUrl ? (
        <ExternalViewer
          url={externalUrl.url}
          title={externalUrl.title}
          onClose={() => setExternalUrl(null)}
        />
      ) : (
        renderContent()
      )}
    </DashboardLayout>
  );
};

export default Dashboard;
