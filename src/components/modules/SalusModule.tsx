import { useState } from "react";
import { 
  Stethoscope, 
  BarChart3, 
  ExternalLink, 
  FileUp, 
  Activity,
  Link2,
  Settings
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
import { SalusImportModule } from "@/components/nir/SalusImportModule";
import SalusPanels from "@/components/SalusPanels";

const SalusModule = () => {
  const { toast } = useToast();
  const [dashboardUrl, setDashboardUrl] = useState(() => 
    localStorage.getItem("salus_dashboard_url") || ""
  );
  const [urlInput, setUrlInput] = useState(dashboardUrl);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

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

  const openExternalLink = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

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
            Acesse o sistema Salus, dashboards e ferramentas de importação
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Acessar Salus */}
        <Card className="card-hover cursor-pointer" onClick={() => openExternalLink("https://novaserrana.sistemasalus.com.br/")}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Stethoscope className="h-5 w-5 text-primary" />
              </div>
              Acessar Salus
            </CardTitle>
            <CardDescription>
              Abrir o sistema Salus em nova aba
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
                  onClick={() => openExternalLink(dashboardUrl)}
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

        {/* Importar Lista Salus */}
        <Card className="card-hover">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="p-2 bg-success/10 rounded-lg">
                <FileUp className="h-5 w-5 text-success" />
              </div>
              Importar Lista
            </CardTitle>
            <CardDescription>
              Importar pacientes do PDF do Salus
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SalusImportModule />
          </CardContent>
        </Card>
      </div>

      {/* Painéis Salus */}
      <SalusPanels />
    </div>
  );
};

export default SalusModule;
