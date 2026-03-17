import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Ambulance, LayoutDashboard, BedDouble, ExternalLink, Truck, Navigation, BarChart3, FileOutput, Search, Eye, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NirDashboardModule } from "./NirDashboardModule";
import { MapaLeitosModule } from "./MapaLeitosModule";
import { EntregaProntuariosDialog } from "./EntregaProntuariosDialog";

import { TransferenciasModule } from "@/components/nir/TransferenciasModule";
import { NucleoTrackerModule } from "@/components/nir/nucleo-tracker/NucleoTrackerModule";
import { useLogAccess } from "@/hooks/useLogAccess";
import { useRealtimeSync, REALTIME_PRESETS } from "@/hooks/useRealtimeSync";
import { supabase } from "@/integrations/supabase/client";
import logoSusFacil from "@/assets/logo-susfacil.png";

type NirView = "menu" | "dashboard" | "mapa-leitos" | "transferencias" | "relatorio" | "entregas";

interface NirModuleProps {
  onOpenExternal?: (url: string, title: string) => void;
}

interface EntregaRecord {
  id: string;
  data_hora: string;
  entregador_nome: string;
  responsavel_recebimento_nome: string;
  setor_origem: string;
  setor_destino: string;
  observacao: string | null;
  created_at: string;
}

interface EntregaItem {
  id: string;
  saida_prontuario_id: string;
  saida_prontuarios?: {
    paciente_nome: string | null;
    numero_prontuario: string | null;
  } | null;
}

export const NirModule = ({ onOpenExternal }: NirModuleProps) => {
  const [currentView, setCurrentView] = useState<NirView>("menu");
  const { logAction } = useLogAccess();
  useRealtimeSync(REALTIME_PRESETS.nir);

  // Entregas state
  const [entregas, setEntregas] = useState<EntregaRecord[]>([]);
  const [loadingEntregas, setLoadingEntregas] = useState(false);
  const [buscaEntrega, setBuscaEntrega] = useState("");
  const [entregaDialogOpen, setEntregaDialogOpen] = useState(false);
  const [detalheEntrega, setDetalheEntrega] = useState<EntregaRecord | null>(null);
  const [detalheItens, setDetalheItens] = useState<EntregaItem[]>([]);
  const [loadingItens, setLoadingItens] = useState(false);

  useEffect(() => {
    logAction("acesso_modulo", "nir");
  }, [logAction]);

  const handleViewChange = (view: NirView) => {
    setCurrentView(view);
    logAction("navegacao_view", "nir", { view });
    if (view === "entregas") fetchEntregas();
  };

  const fetchEntregas = async () => {
    setLoadingEntregas(true);
    try {
      const { data, error } = await supabase
        .from("entregas_prontuarios")
        .select("*")
        .order("data_hora", { ascending: false })
        .limit(200);
      if (error) throw error;
      setEntregas(data || []);
    } catch (err) {
      console.error("Erro ao carregar entregas:", err);
    } finally {
      setLoadingEntregas(false);
    }
  };

  const fetchDetalheItens = async (entregaId: string) => {
    setLoadingItens(true);
    try {
      const { data, error } = await supabase
        .from("entregas_prontuarios_itens")
        .select("id, saida_prontuario_id, saida_prontuarios(paciente_nome, numero_prontuario)")
        .eq("entrega_id", entregaId);
      if (error) throw error;
      setDetalheItens((data as any) || []);
    } catch (err) {
      console.error("Erro ao carregar itens:", err);
    } finally {
      setLoadingItens(false);
    }
  };

  const openDetalhe = (entrega: EntregaRecord) => {
    setDetalheEntrega(entrega);
    fetchDetalheItens(entrega.id);
  };

  const entregasFiltradas = entregas.filter(e =>
    e.entregador_nome.toLowerCase().includes(buscaEntrega.toLowerCase()) ||
    e.responsavel_recebimento_nome.toLowerCase().includes(buscaEntrega.toLowerCase()) ||
    e.setor_origem.toLowerCase().includes(buscaEntrega.toLowerCase()) ||
    e.setor_destino.toLowerCase().includes(buscaEntrega.toLowerCase())
  );

  if (currentView === "dashboard") {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => handleViewChange("menu")} className="mb-2">
          ← Voltar ao NIR
        </Button>
        <NirDashboardModule />
      </div>
    );
  }

  if (currentView === "mapa-leitos") {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => handleViewChange("menu")} className="mb-2">
          ← Voltar ao NIR
        </Button>
        <MapaLeitosModule />
      </div>
    );
  }

  if (currentView === "transferencias") {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => handleViewChange("menu")} className="mb-2">
          ← Voltar ao NIR
        </Button>
        <TransferenciasModule />
      </div>
    );
  }

  if (currentView === "relatorio") {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => handleViewChange("menu")} className="mb-2">
          ← Voltar ao NIR
        </Button>
        <NucleoTrackerModule />
      </div>
    );
  }

  if (currentView === "entregas") {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => handleViewChange("menu")} className="mb-2">
          ← Voltar ao NIR
        </Button>

        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <FileOutput className="h-6 w-6 text-primary" />
              Entrega de Prontuários
            </h2>
            <p className="text-muted-foreground">Registros de entrega entre setores</p>
          </div>
          <Button onClick={() => setEntregaDialogOpen(true)}>
            <FileOutput className="h-4 w-4 mr-2" />
            Nova Entrega
          </Button>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome, setor..." value={buscaEntrega} onChange={e => setBuscaEntrega(e.target.value)} className="pl-9" />
          </div>
        </div>

        {loadingEntregas ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Entregador</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Destino</TableHead>
                  <TableHead>Recebido por</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entregasFiltradas.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum registro de entrega encontrado</TableCell></TableRow>
                ) : entregasFiltradas.map(e => (
                  <TableRow key={e.id}>
                    <TableCell className="whitespace-nowrap">{new Date(e.data_hora).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</TableCell>
                    <TableCell>{e.entregador_nome}</TableCell>
                    <TableCell><Badge variant="outline">{e.setor_origem}</Badge></TableCell>
                    <TableCell><Badge variant="secondary">{e.setor_destino}</Badge></TableCell>
                    <TableCell>{e.responsavel_recebimento_nome}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={() => openDetalhe(e)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <EntregaProntuariosDialog
          open={entregaDialogOpen}
          onOpenChange={setEntregaDialogOpen}
          onSuccess={() => fetchEntregas()}
        />

        {/* Dialog detalhes */}
        <Dialog open={!!detalheEntrega} onOpenChange={() => { setDetalheEntrega(null); setDetalheItens([]); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Detalhes da Entrega</DialogTitle></DialogHeader>
            {detalheEntrega && (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-muted-foreground">Data/Hora:</span><br /><strong>{new Date(detalheEntrega.data_hora).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</strong></div>
                  <div><span className="text-muted-foreground">Entregador:</span><br /><strong>{detalheEntrega.entregador_nome}</strong></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-muted-foreground">Origem:</span> <Badge variant="outline">{detalheEntrega.setor_origem}</Badge></div>
                  <div><span className="text-muted-foreground">Destino:</span> <Badge variant="secondary">{detalheEntrega.setor_destino}</Badge></div>
                </div>
                <div><span className="text-muted-foreground">Recebido por:</span> {detalheEntrega.responsavel_recebimento_nome}</div>
                {detalheEntrega.observacao && <div><span className="text-muted-foreground">Obs:</span> {detalheEntrega.observacao}</div>}

                <div className="pt-2 border-t">
                  <p className="font-medium mb-2">Prontuários ({detalheItens.length})</p>
                  {loadingItens ? (
                    <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                  ) : detalheItens.length === 0 ? (
                    <p className="text-muted-foreground text-xs">Nenhum prontuário vinculado</p>
                  ) : (
                    <div className="space-y-1 max-h-48 overflow-auto">
                      {detalheItens.map(item => (
                        <div key={item.id} className="flex items-center justify-between p-2 bg-muted rounded text-xs">
                          <span>{(item as any).saida_prontuarios?.paciente_nome || "—"}</span>
                          <Badge variant="outline" className="text-xs">{(item as any).saida_prontuarios?.numero_prontuario || "S/N"}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Ambulance className="h-6 w-6 text-primary" />
            Núcleo Interno de Regulação
          </h2>
          <p className="text-muted-foreground">Gestão de leitos e regulação hospitalar</p>
        </div>
        
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card 
          className="cursor-pointer hover:border-primary hover:shadow-lg transition-all group"
          onClick={() => handleViewChange("dashboard")}
        >
          <CardHeader className="text-center pb-2">
            <div className="mx-auto p-4 bg-primary/10 rounded-full w-fit group-hover:bg-primary/20 transition-colors">
              <LayoutDashboard className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="mt-4">Dashboard</CardTitle>
            <CardDescription>
              Métricas e indicadores de ocupação hospitalar
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button variant="outline" className="w-full">
              Acessar Dashboard
            </Button>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:border-primary hover:shadow-lg transition-all group"
          onClick={() => handleViewChange("mapa-leitos")}
        >
          <CardHeader className="text-center pb-2">
            <div className="mx-auto p-4 bg-primary/10 rounded-full w-fit group-hover:bg-primary/20 transition-colors">
              <BedDouble className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="mt-4">Mapa de Leitos</CardTitle>
            <CardDescription>
              Visualização e gestão de leitos por setor
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button variant="outline" className="w-full">
              Acessar Mapa
            </Button>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:border-primary hover:shadow-lg transition-all group"
          onClick={() => handleViewChange("transferencias")}
        >
          <CardHeader className="text-center pb-2">
            <div className="mx-auto p-4 bg-primary/10 rounded-full w-fit group-hover:bg-primary/20 transition-colors">
              <Truck className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="mt-4">Transferências</CardTitle>
            <CardDescription>
              Solicitação e acompanhamento de transferências
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button variant="outline" className="w-full">
              Acessar Transferências
            </Button>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:border-primary hover:shadow-lg transition-all group"
          onClick={() => handleViewChange("entregas")}
        >
          <CardHeader className="text-center pb-2">
            <div className="mx-auto p-4 bg-primary/10 rounded-full w-fit group-hover:bg-primary/20 transition-colors">
              <FileOutput className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="mt-4">Entrega de Prontuários</CardTitle>
            <CardDescription>
              Registrar e consultar entregas entre setores
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button variant="outline" className="w-full">
              Acessar Entregas
            </Button>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:border-primary hover:shadow-lg transition-all group"
          onClick={() => window.open("/transporte", "_blank")}
        >
          <CardHeader className="text-center pb-2">
            <div className="mx-auto p-4 bg-primary/10 rounded-full w-fit group-hover:bg-primary/20 transition-colors">
              <Navigation className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="mt-4">Área do Motorista</CardTitle>
            <CardDescription>
              Painel mobile para motoristas em rota
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button variant="outline" className="w-full gap-2">
              <ExternalLink className="h-4 w-4" />
              Abrir Painel
            </Button>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:border-primary hover:shadow-lg transition-all group"
          onClick={() => {
            const url = "https://www.susfacil.mg.gov.br/administrativo/seguranca/GEN/gen_acesso.php?ini=1";
            window.open(url, "_blank", "noopener,noreferrer");
          }}
        >
          <CardHeader className="text-center pb-2">
            <div className="mx-auto p-4 bg-white rounded-lg w-fit group-hover:shadow-md transition-all">
              <img src={logoSusFacil} alt="SUS Fácil MG" className="h-16 w-auto" />
            </div>
            <CardTitle className="mt-4">SUS Fácil MG</CardTitle>
            <CardDescription>
              Central de Regulação - Portal Oficial
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button variant="outline" className="w-full gap-2">
              <ExternalLink className="h-4 w-4" />
              Acessar Portal
            </Button>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:border-primary hover:shadow-lg transition-all group"
          onClick={() => handleViewChange("relatorio")}
        >
          <CardHeader className="text-center pb-2">
            <div className="mx-auto p-4 bg-primary/10 rounded-full w-fit group-hover:bg-primary/20 transition-colors">
              <BarChart3 className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="mt-4">Relatório</CardTitle>
            <CardDescription>
              Produtividade e indicadores da equipe NIR
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button variant="outline" className="w-full">
              Acessar Relatório
            </Button>
          </CardContent>
        </Card>
      </div>

    </div>
  );
};
