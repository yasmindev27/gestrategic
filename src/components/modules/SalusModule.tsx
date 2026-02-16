import { useState } from "react";
import { 
  Stethoscope, 
  BarChart3, 
  ExternalLink, 
  Activity,
  Link2,
  Settings,
  Loader2,
  AlertTriangle,
  Maximize2,
  X
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const getProxiedUrl = async (targetUrl: string): Promise<string> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return targetUrl;
  
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const encoded = encodeURIComponent(targetUrl);
  return `https://${projectId}.supabase.co/functions/v1/proxy-iframe?url=${encoded}`;
};

const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return {};
  return { Authorization: `Bearer ${session.access_token}` };
};

interface SalusModuleProps {
  onOpenExternal?: (url: string, title: string) => void;
}

const SalusModule = ({ onOpenExternal }: SalusModuleProps) => {
  const { toast } = useToast();
  const [dashboardUrl, setDashboardUrl] = useState(() => 
    localStorage.getItem("salus_dashboard_url") || ""
  );
  const [urlInput, setUrlInput] = useState(dashboardUrl);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [activeView, setActiveView] = useState<{ url: string; originalUrl: string; title: string } | null>(null);
  const [iframeLoading, setIframeLoading] = useState(false);
  const [iframeError, setIframeError] = useState(false);

  const handleSaveUrl = () => {
    if (urlInput.trim()) {
      localStorage.setItem("salus_dashboard_url", urlInput.trim());
      setDashboardUrl(urlInput.trim());
      setIsConfigOpen(false);
      toast({
        title: "URL salva",
        description: "URL do dashboard Salus configurada com sucesso.",
      });
    }
  };

  const handleClearUrl = () => {
    localStorage.removeItem("salus_dashboard_url");
    setDashboardUrl("");
    setUrlInput("");
    toast({
      title: "URL removida",
      description: "Configuração do dashboard foi limpa.",
    });
  };

  const openInline = async (url: string, title: string) => {
    setIframeLoading(true);
    setIframeError(false);
    try {
      const proxiedUrl = await getProxiedUrl(url);
      setActiveView({ url: proxiedUrl, originalUrl: url, title });
    } catch {
      setActiveView({ url, originalUrl: url, title });
    }
  };

  const closeInline = () => {
    setActiveView(null);
    setIframeLoading(false);
    setIframeError(false);
  };

  // If an inline view is active, show the embedded viewer
  if (activeView) {
    return (
      <div className="flex flex-col h-[calc(100vh-8rem)] w-full">
        {/* Viewer header */}
        <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border rounded-t-lg gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Stethoscope className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm font-medium truncate">{activeView.title}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => {
                if (onOpenExternal) {
                  onOpenExternal(activeView.originalUrl, activeView.title);
                  closeInline();
                } else {
                  window.open(activeView.originalUrl, "_blank", "noopener,noreferrer");
                }
              }}
            >
              <Maximize2 className="h-3 w-3 mr-1" />
              Tela cheia
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => window.open(activeView.originalUrl, "_blank", "noopener,noreferrer")}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Nova aba
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={closeInline}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Iframe area */}
        <div className="flex-1 relative min-h-0 border border-t-0 rounded-b-lg overflow-hidden">
          {iframeLoading && !iframeError && (
            <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Carregando painel Salus...</span>
              </div>
            </div>
          )}

          {iframeError ? (
            <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
              <div className="flex flex-col items-center gap-4 text-center p-8 max-w-md">
                <AlertTriangle className="h-12 w-12 text-amber-500" />
                <h3 className="text-lg font-semibold">O painel do Salus está pronto</h3>
                <p className="text-sm text-muted-foreground">
                  Para sua segurança, clique no botão abaixo para visualizar em tela cheia.
                </p>
                <Button onClick={() => window.open(activeView.originalUrl, "_blank", "noopener,noreferrer")}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Abrir Painel Salus
                </Button>
              </div>
            </div>
          ) : (
            <iframe
              src={activeView.url}
              className="w-full h-full border-0"
              title={activeView.title}
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
              onLoad={() => setIframeLoading(false)}
              onError={() => {
                setIframeLoading(false);
                setIframeError(true);
              }}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="module-header">
        <div>
          <h1 className="module-title flex items-center gap-2">
            <div className="icon-container icon-container-primary">
              <Stethoscope className="h-6 w-6" />
            </div>
            Sistema Salus
          </h1>
          <p className="module-subtitle">
            Acesse o sistema Salus e dashboards
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Acessar Salus */}
        <Card className="card-hover cursor-pointer" onClick={() => window.open("https://novaserrana.sistemasalus.com.br/", "_blank", "noopener,noreferrer")}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Stethoscope className="h-5 w-5 text-primary" />
              </div>
              Acessar Salus
            </CardTitle>
            <CardDescription>
              Visualizar o sistema Salus integrado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full gap-2">
              <ExternalLink className="h-4 w-4" />
              Abrir Sistema
            </Button>
          </CardContent>
        </Card>

        {/* Dashboard Configurável */}
        <Card className="card-hover">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="p-2 bg-info/10 rounded-lg">
                <BarChart3 className="h-5 w-5 text-info" />
              </div>
              Dashboard Salus
            </CardTitle>
            <CardDescription>
              {dashboardUrl ? "Dashboard configurado" : "Configure a URL do dashboard"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {dashboardUrl ? (
              <div className="flex gap-2">
                <Button 
                  variant="default" 
                  className="flex-1 gap-2"
                  onClick={() => openInline(dashboardUrl, "Dashboard Salus")}
                >
                  <ExternalLink className="h-4 w-4" />
                  Abrir Dashboard
                </Button>
                <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="icon">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Configurar Dashboard Salus</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="dashboard-url">URL do Dashboard</Label>
                        <Input
                          id="dashboard-url"
                          placeholder="https://dashboard-appolus.streamlit.app/"
                          value={urlInput}
                          onChange={(e) => setUrlInput(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Cole a URL completa do dashboard que deseja acessar
                        </p>
                      </div>
                    </div>
                    <DialogFooter className="flex justify-between">
                      <Button variant="ghost" onClick={handleClearUrl}>
                        Limpar
                      </Button>
                      <Button onClick={handleSaveUrl}>
                        Salvar
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            ) : (
              <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full gap-2">
                    <Link2 className="h-4 w-4" />
                    Configurar URL
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Configurar Dashboard Salus</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="dashboard-url-new">URL do Dashboard</Label>
                      <Input
                        id="dashboard-url-new"
                        placeholder="https://dashboard-appolus.streamlit.app/"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Cole a URL completa do dashboard que deseja acessar
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleSaveUrl}>
                      Salvar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Visão Geral da Unidade */}
      <Card className="shadow-sm border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2 text-foreground">
            <div className="p-1.5 bg-info/10 rounded-lg">
              <Activity className="h-4 w-4 text-info" />
            </div>
            Painéis Salus
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="w-full h-auto p-4 flex items-center gap-4 justify-start transition-all border-border hover:bg-info hover:text-info-foreground hover:border-info"
            onClick={() => openInline("https://dashboard-appolus.streamlit.app/#painel-entrada-por-classificacao", "Visão Geral da Unidade")}
          >
            <div className="p-2 rounded-lg bg-info/10 text-info">
              <Activity className="h-5 w-5" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-foreground">Visão Geral da Unidade</p>
              <p className="text-xs text-muted-foreground font-normal">Panorama completo do funcionamento da unidade</p>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SalusModule;
