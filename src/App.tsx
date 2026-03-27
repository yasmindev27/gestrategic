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


// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

// Optimized QueryClient with better caching defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (previously cacheTime)
      refetchOnWindowFocus: false,
      // Retry apenas se não for erro de rede/socket/403
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <ErrorBoundary moduleName="App">
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
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
            </Suspense>
          </BrowserRouter>
        </ErrorBoundary>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
