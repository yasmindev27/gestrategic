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
const Dashboard = lazy(() => import("./pages/Dashboard"));
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
import Sidebar from "@/components/Sidebar";
// (Se houver Topbar, importar também)

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <ErrorBoundary moduleName="App">
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <div className="flex min-h-screen">
              <Sidebar />
              <main className="flex-1">
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/dashboard/*" element={<Dashboard />} />
                  <Route path="/totem" element={<TotemRefeicoes />} />
                  <Route path="/terminal" element={<TotemRefeicoes />} />
                  <Route path="/transporte" element={<Transporte />} />
                  <Route path="/politica-privacidade" element={<PoliticaPrivacidade />} />
                  <Route path="/modo-tv" element={<ModoTVPage />} />
                  {/* Renderiza o Dashboard diretamente para evitar loop de redirecionamento */}
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
            </div>
          </BrowserRouter>
        </ErrorBoundary>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
