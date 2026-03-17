import { useState, useEffect, lazy, Suspense, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import ExternalViewer from "@/components/ExternalViewer";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import DashboardLayout, { PageLoader } from "@/components/layout/DashboardLayout";
import CookieBanner from "@/components/CookieBanner";
import { Loader2 } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";

// Lazy load ALL modules for optimal code splitting
const DashboardPersonalizado = lazy(() => import("@/components/dashboard/DashboardPersonalizado"));
const FaturamentoUnificadoModule = lazy(() => import("@/components/modules/FaturamentoUnificadoModule").then(m => ({ default: m.FaturamentoUnificadoModule })));
const ControleFichasModule = lazy(() => import("@/components/modules/ControleFichasModule").then(m => ({ default: m.ControleFichasModule })));
const AdminModule = lazy(() => import("@/components/modules/AdminModule").then(m => ({ default: m.AdminModule })));
const TecnicoModule = lazy(() => import("@/components/modules/TecnicoModule").then(m => ({ default: m.TecnicoModule })));
const LaboratorioModule = lazy(() => import("@/components/modules/LaboratorioModule").then(m => ({ default: m.LaboratorioModule })));
const AgendaModule = lazy(() => import("@/components/agenda").then(m => ({ default: m.AgendaModule })));
const LogsAuditoriaModule = lazy(() => import("@/components/modules/LogsAuditoriaModule").then(m => ({ default: m.LogsAuditoriaModule })));
const RestauranteModule = lazy(() => import("@/components/modules/RestauranteModule").then(m => ({ default: m.RestauranteModule })));
const NirModule = lazy(() => import("@/components/modules/NirModule").then(m => ({ default: m.NirModule })));
const RecepcaoModule = lazy(() => import("@/components/modules/RecepcaoModule").then(m => ({ default: m.RecepcaoModule })));
const RHDPModule = lazy(() => import("@/components/modules/RHDPModule").then(m => ({ default: m.RHDPModule })));
const ChatModule = lazy(() => import("@/components/modules/ChatModule").then(m => ({ default: m.ChatModule })));
const RoupariaModule = lazy(() => import("@/components/modules/RoupariaModule").then(m => ({ default: m.RoupariaModule })));
const SegurancaTrabalhoModule = lazy(() => import("@/components/modules/SegurancaTrabalhoModule").then(m => ({ default: m.SegurancaTrabalhoModule })));
const SegurancaPatrimonialModule = lazy(() => import("@/components/modules/SegurancaPatrimonialModule").then(m => ({ default: m.SegurancaPatrimonialModule })));
const AssistenciaSocialModule = lazy(() => import("@/components/modules/AssistenciaSocialModule").then(m => ({ default: m.AssistenciaSocialModule })));
const QualidadeModule = lazy(() => import("@/components/modules/QualidadeModule").then(m => ({ default: m.QualidadeModule })));
const ReportarIncidenteDialog = lazy(() => import("@/components/gestao-incidentes").then(m => ({ default: m.ReportarIncidenteDialog })));
const LMSModule = lazy(() => import("@/components/lms/LMSModule"));
const ReuniaoModule = lazy(() => import("@/components/modules/ReuniaoModule"));
const GerenciaModule = lazy(() => import("@/components/modules/GerenciaModule").then(m => ({ default: m.GerenciaModule })));
const EnfermagemModule = lazy(() => import("@/components/modules/EnfermagemModule"));
const SalusModule = lazy(() => import("@/components/modules/SalusModule"));
const MedicosModule = lazy(() => import("@/components/modules/MedicosModule"));
const EquipeModule = lazy(() => import("@/components/modules/EquipeModule"));
const ColaboradorModule = lazy(() => import("@/components/modules/ColaboradorModule"));
const MapaLeitosModule = lazy(() => import("@/components/modules/MapaLeitosModule").then(m => ({ default: m.MapaLeitosModule })));

// Module loading fallback
const ModuleLoader = () => (
  <div className="flex items-center justify-center h-64">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("");
  const [externalUrl, setExternalUrl] = useState<{ url: string; title: string } | null>(null);
  const { isNir, isRecepcao, isFaturamento, isClassificacao, isTI, isManutencao, isEngenhariaCinica, isLaboratorio, isLoading: isLoadingRole } = useUserRole();

  // Segurança: logout automático por inatividade (15 min) — LGPD / UPA
  useSessionTimeout(15);

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

  // Render active module content - all wrapped in Suspense for lazy loading
  const renderContent = () => {
    const content = (() => {
      switch (activeSection) {
        case "dashboard":
          return <DashboardPersonalizado onNavigate={handleSectionChange} />;
        case "faturamento":
          return <FaturamentoUnificadoModule />;
        case "controle-fichas":
          return <ControleFichasModule />;
        case "equipe":
          return <EquipeModule />;
        case "agenda":
          return <AgendaModule />;
        case "admin":
          return <AdminModule />;
        case "logs":
          return <LogsAuditoriaModule />;
        case "tecnico-ti":
          return <TecnicoModule setor="ti" onOpenExternal={handleOpenExternal} />;
        case "tecnico-manutencao":
          return <TecnicoModule setor="manutencao" onOpenExternal={handleOpenExternal} />;
        case "tecnico-engenharia":
          return <TecnicoModule setor="engenharia_clinica" onOpenExternal={handleOpenExternal} />;
        case "nir":
        case "dashboard-nir":
          return <NirModule onOpenExternal={handleOpenExternal} />;
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
          return <EnfermagemModule />;
        case "mapa-leitos":
          return <MapaLeitosModule />;
        case "chat":
          return <ChatModule />;
        case "medicos":
          return <MedicosModule onOpenExternal={handleOpenExternal} />;
        case "profissionais-saude":
          return <RHDPModule />;
        case "lms":
          return <LMSModule />;
        case "reuniao":
          return <ReuniaoModule />;
        case "salus":
          return <SalusModule onOpenExternal={handleOpenExternal} />;
        case "gerencia":
          return <GerenciaModule />;
        case "painel-seguranca":
        case "seguranca-patrimonial":
          return <SegurancaPatrimonialModule />;
        case "colaborador":
          return <ColaboradorModule />;
        default:
          return <DashboardPersonalizado onNavigate={handleSectionChange} />;
      }
    })();

    return <Suspense fallback={<ModuleLoader />}>{content}</Suspense>;
  };

  return (
    <DashboardLayout
      activeSection={activeSection}
      onSectionChange={handleSectionChange}
      onOpenExternal={handleOpenExternal}
      fullContent={!!externalUrl}
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
      <CookieBanner />
    </DashboardLayout>
  );
};

export default Dashboard;
