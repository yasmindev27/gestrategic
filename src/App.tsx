import { lazy, Suspense } from "react";
import { AuthProvider } from "./contexts/AuthContext";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Eager load critical pages
import Index from "./pages/Index";
import Auth from "./pages/Auth";

// Lazy load non-critical pages for code splitting
const DashboardShell = lazy(() => import("./pages/DashboardShell"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
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
const EnfermagemModule = lazy(() => import("@/components/modules/EnfermagemModule").then(m => ({ default: m.EnfermagemModule })));
const SalusModule = lazy(() => import("@/components/modules/SalusModule"));
const MedicosModule = lazy(() => import("@/components/modules/MedicosModule"));
const EquipeModule = lazy(() => import("@/components/modules/EquipeModule"));
const ColaboradorModule = lazy(() => import("@/components/modules/ColaboradorModule"));
const MapaLeitosModule = lazy(() => import("@/components/modules/MapaLeitosModule").then(m => ({ default: m.MapaLeitosModule })));
const AbrirChamadoModule = lazy(() => import("@/components/modules/AbrirChamadoModule").then(m => ({ default: m.AbrirChamadoModule })));
const TotemRefeicoes = lazy(() => import("./pages/TotemRefeicoes"));
// const ControleFichasPublico = lazy(() => import("./pages/ControleFichasPublico"));
const Transporte = lazy(() => import("./pages/Transporte"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PoliticaPrivacidade = lazy(() => import("./pages/PoliticaPrivacidade"));
const ModoTVPage = lazy(() => import("./pages/ModoTVPage"));


// (Removido PageLoader global)

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000, // 10 minutos: cache first
      gcTime: 1000 * 60 * 30,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: (failureCount, error: any) => {
        if (
          error?.message?.includes('WebSocket') ||
          error?.message?.includes('NetworkError') ||
          error?.message?.includes('403')
        ) return false;
        return failureCount < 2;
      },
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 10000),
    },
  },
});


// Layout estático fora do Suspense
// import Sidebar from "@/components/Sidebar";
// (Se houver Topbar, importar também)

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <ErrorBoundary moduleName="App">
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/totem" element={<TotemRefeicoes />} />
              <Route path="/terminal" element={<TotemRefeicoes />} />
              <Route path="/transporte" element={<Transporte />} />
              <Route path="/politica-privacidade" element={<PoliticaPrivacidade />} />
              <Route path="/modo-tv" element={<ModoTVPage />} />
              <Route path="/dashboard" element={<Navigate to="/dashboard/dashboard" replace />} />
              <Route path="/dashboard/*" element={<DashboardShell />}>
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="faturamento" element={<FaturamentoUnificadoModule />} />
                <Route path="saida_prontuarios" element={<FaturamentoUnificadoModule />} />
                <Route path="saida-prontuarios" element={<FaturamentoUnificadoModule />} />
                <Route path="controle-fichas" element={<ControleFichasModule />} />
                <Route path="equipe" element={<EquipeModule />} />
                <Route path="agenda" element={<AgendaModule />} />
                <Route path="admin" element={<AdminModule />} />
                <Route path="logs" element={<LogsAuditoriaModule />} />
                <Route path="tecnico-ti" element={<TecnicoModule setor="ti" />} />
                <Route path="tecnico-manutencao" element={<TecnicoModule setor="manutencao" />} />
                <Route path="tecnico-engenharia" element={<TecnicoModule setor="engenharia_clinica" />} />
                <Route path="nir" element={<NirModule />} />
                <Route path="dashboard-nir" element={<NirModule />} />
                <Route path="laboratorio" element={<LaboratorioModule />} />
                <Route path="restaurante" element={<RestauranteModule />} />
                <Route path="recepcao" element={<RecepcaoModule />} />
                <Route path="rhdp" element={<RHDPModule />} />
                <Route path="rouparia" element={<RoupariaModule />} />
                <Route path="seguranca-trabalho" element={<SegurancaTrabalhoModule />} />
                <Route path="assistencia-social" element={<AssistenciaSocialModule />} />
                <Route path="qualidade" element={<QualidadeModule />} />
                <Route path="reportar-incidente" element={<ReportarIncidenteDialog />} />
                <Route path="enfermagem" element={<EnfermagemModule />} />
                <Route path="mapa-leitos" element={<MapaLeitosModule />} />
                <Route path="chat" element={<ChatModule />} />
                <Route path="medicos" element={<MedicosModule />} />
                <Route path="profissionais-saude" element={<RHDPModule />} />
                <Route path="lms" element={<LMSModule />} />
                <Route path="reuniao" element={<ReuniaoModule />} />
                <Route path="salus" element={<SalusModule />} />
                <Route path="gerencia" element={<GerenciaModule />} />
                <Route path="painel-seguranca" element={<SegurancaPatrimonialModule />} />
                <Route path="seguranca-patrimonial" element={<SegurancaPatrimonialModule />} />
                <Route path="colaborador" element={<ColaboradorModule />} />
                <Route path="abrir-chamado" element={<AbrirChamadoModule />} />
                <Route path="documentos-interact" element={<Dashboard />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </ErrorBoundary>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
