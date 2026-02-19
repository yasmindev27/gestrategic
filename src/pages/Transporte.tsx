import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Truck, MapPin, Clock, CheckCircle2, LogOut, Navigation, ChevronRight, Play, AlertTriangle, LocateFixed, FileWarning } from "lucide-react";
import logoGestrategic from "@/assets/logo-gestrategic.jpg";

type Solicitacao = {
  id: string;
  paciente_nome: string;
  setor_origem: string;
  destino: string;
  prioridade: string;
  status: string;
  created_at: string;
  motorista_nome: string | null;
  veiculo_tipo: string | null;
  solicitado_por_nome: string | null;
};

const prioridadeColors: Record<string, string> = {
  baixa: "bg-green-100 text-green-800 border-green-300",
  normal: "bg-blue-100 text-blue-800 border-blue-300",
  alta: "bg-orange-100 text-orange-800 border-orange-300",
  urgente: "bg-red-100 text-red-800 border-red-300",
};

const Transporte = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);
  const [missoes, setMissoes] = useState<Solicitacao[]>([]);
  const [selectedMissao, setSelectedMissao] = useState<Solicitacao | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingMissaoId, setPendingMissaoId] = useState<string | null>(null);
  const [pendingMissaoMotorista, setPendingMissaoMotorista] = useState<string | null>(null);
  const [preAcceptOpen, setPreAcceptOpen] = useState(false);
  const [preAcceptMissaoId, setPreAcceptMissaoId] = useState<string | null>(null);
  const [kmInicial, setKmInicial] = useState("");
  const [locAtiva, setLocAtiva] = useState(false);
  const [locLoading, setLocLoading] = useState(false);
  const [locError, setLocError] = useState("");
  const [finalizarOpen, setFinalizarOpen] = useState(false);
  const [finalizarMissaoId, setFinalizarMissaoId] = useState<string | null>(null);
  const [kmFinal, setKmFinal] = useState("");
  const [intercorrenciaOpen, setIntercorrenciaOpen] = useState(false);
  const [intercorrenciaMissaoId, setIntercorrenciaMissaoId] = useState<string | null>(null);
  const [intercorrenciaTexto, setIntercorrenciaTexto] = useState("");
  const [intercorrenciaLoading, setIntercorrenciaLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"missoes" | "historico">("missoes");

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      setUser(user);
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .single();
      setUserName(profile?.full_name || user.email || "Motorista");
      loadMissoes(profile?.full_name || user.email || "");
    };
    checkAuth();
  }, [navigate]);

  const loadMissoes = useCallback(async (nome: string) => {
    setLoading(true);
    const { data } = await supabase
      .from("transferencia_solicitacoes")
      .select("*")
      .or(`motorista_nome.ilike.%${nome}%,status.eq.pendente`)
      .order("created_at", { ascending: false })
      .limit(50);
    setMissoes((data as Solicitacao[]) || []);
    setLoading(false);
  }, []);

  const tentarAceitarMissao = (missao: Solicitacao) => {
    const motoristaAtribuido = missao.motorista_nome?.trim();
    if (motoristaAtribuido && motoristaAtribuido.toLowerCase() !== userName.toLowerCase()) {
      setPendingMissaoId(missao.id);
      setPendingMissaoMotorista(motoristaAtribuido);
      setConfirmDialogOpen(true);
    } else {
      abrirPreAccept(missao.id);
    }
  };

  const abrirPreAccept = (missaoId: string) => {
    setPreAcceptMissaoId(missaoId);
    setKmInicial("");
    setLocAtiva(false);
    setLocError("");
    setPreAcceptOpen(true);
  };

  const ativarLocalizacao = () => {
    if (!navigator.geolocation) {
      setLocError("Geolocalização não suportada neste dispositivo.");
      return;
    }
    setLocLoading(true);
    setLocError("");
    navigator.geolocation.getCurrentPosition(
      () => {
        setLocAtiva(true);
        setLocLoading(false);
      },
      (err) => {
        setLocError("Permissão negada. Ative a localização nas configurações do navegador.");
        setLocLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const confirmarPreAccept = () => {
    if (!locAtiva) {
      toast({ title: "Ative a localização antes de aceitar", variant: "destructive" });
      return;
    }
    if (!kmInicial.trim() || isNaN(Number(kmInicial))) {
      toast({ title: "Informe a km atual da ambulância", variant: "destructive" });
      return;
    }
    setPreAcceptOpen(false);
    if (preAcceptMissaoId) executarAceitarMissao(preAcceptMissaoId, Number(kmInicial));
  };

  const executarAceitarMissao = async (missaoId: string, km?: number) => {
    setConfirmDialogOpen(false);
    setActionLoading(missaoId);
    try {
      const updateData: any = {
        status: "em_transporte",
        motorista_nome: userName,
        hora_saida: new Date().toISOString(),
      };
      if (km !== undefined) updateData.km_rodados = km;
      const { error } = await supabase
        .from("transferencia_solicitacoes")
        .update(updateData)
        .eq("id", missaoId);
      if (error) throw error;
      toast({ title: "Missão aceita! Boa viagem." });
      setSelectedMissao(null);
      loadMissoes(userName);
    } catch (err: any) {
      toast({ title: "Erro ao aceitar missão", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
      setPendingMissaoId(null);
      setPendingMissaoMotorista(null);
    }
  };

  const abrirFinalizar = (missaoId: string) => {
    setFinalizarMissaoId(missaoId);
    setKmFinal("");
    setFinalizarOpen(true);
  };

  const confirmarFinalizar = async () => {
    if (!kmFinal.trim() || isNaN(Number(kmFinal))) {
      toast({ title: "Informe a km final da ambulância", variant: "destructive" });
      return;
    }
    setFinalizarOpen(false);
    if (!finalizarMissaoId) return;
    setActionLoading(finalizarMissaoId);
    try {
      // Get current km_rodados (km inicial) to calculate total
      const { data: sol } = await supabase
        .from("transferencia_solicitacoes")
        .select("km_rodados")
        .eq("id", finalizarMissaoId)
        .single();
      const kmInicial = (sol as any)?.km_rodados || 0;
      const kmTotal = Math.max(0, Number(kmFinal) - kmInicial);

      const { error } = await supabase
        .from("transferencia_solicitacoes")
        .update({
          status: "concluida",
          hora_chegada: new Date().toISOString(),
          km_rodados: kmTotal,
        })
        .eq("id", finalizarMissaoId);
      if (error) throw error;
      toast({ title: `Missão finalizada! ${kmTotal} km percorridos.` });
      setSelectedMissao(null);
      loadMissoes(userName);
    } catch (err: any) {
      toast({ title: "Erro ao finalizar", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
      setFinalizarMissaoId(null);
    }
  };

  const abrirIntercorrencia = (missaoId: string) => {
    setIntercorrenciaMissaoId(missaoId);
    setIntercorrenciaTexto("");
    setIntercorrenciaOpen(true);
  };

  const salvarIntercorrencia = async () => {
    if (!intercorrenciaTexto.trim()) {
      toast({ title: "Descreva a intercorrência", variant: "destructive" });
      return;
    }
    setIntercorrenciaLoading(true);
    try {
      const { error } = await supabase.from("transferencia_intercorrencias").insert({
        solicitacao_id: intercorrenciaMissaoId!,
        descricao: intercorrenciaTexto.trim(),
        registrado_por: user?.id,
        registrado_por_nome: userName,
      });
      if (error) throw error;
      toast({ title: "Intercorrência registrada!" });
      setIntercorrenciaOpen(false);
    } catch (err: any) {
      toast({ title: "Erro ao registrar", description: err.message, variant: "destructive" });
    } finally {
      setIntercorrenciaLoading(false);
    }
  };

  const handleNavegar = (destino: string) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destino)}`;
    window.open(url, "_blank");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
    } catch { return d; }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <header className="bg-primary text-primary-foreground p-4 flex items-center justify-between sticky top-0 z-10 shadow-md">
        <div className="flex items-center gap-3">
          <img src={logoGestrategic} alt="Logo" className="h-8 w-8 rounded-full object-cover" />
          <div>
            <h1 className="text-lg font-bold leading-tight">Transporte</h1>
            <p className="text-xs opacity-80">{userName}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={handleLogout} className="text-primary-foreground hover:bg-primary-foreground/20">
          <LogOut className="h-5 w-5" />
        </Button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 p-4">
        <Card className="text-center">
          <CardContent className="p-3">
            <p className="text-2xl font-bold text-orange-600">{missoes.filter(m => m.status === "pendente").length}</p>
            <p className="text-xs text-muted-foreground">Pendentes</p>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-3">
            <p className="text-2xl font-bold text-blue-600">{missoes.filter(m => m.status === "em_transporte").length}</p>
            <p className="text-xs text-muted-foreground">Em Rota</p>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-3">
            <p className="text-2xl font-bold text-green-600">{missoes.filter(m => m.status === "concluida").length}</p>
            <p className="text-xs text-muted-foreground">Concluídas</p>
          </CardContent>
        </Card>
      </div>

      {/* Mission List */}
      <div className="flex-1 px-4 pb-4 space-y-3">
        {activeTab === "missoes" && (
          <>
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              Missões de Transporte
            </h2>

            {missoes.filter(m => m.status !== "concluida").length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Navigation className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <p>Nenhuma missão no momento</p>
                </CardContent>
              </Card>
            ) : (
              missoes.filter(m => m.status !== "concluida").map((m) => (
                <Card 
                  key={m.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98]"
                  onClick={() => setSelectedMissao(selectedMissao?.id === m.id ? null : m)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={`text-xs ${prioridadeColors[m.prioridade] || "bg-muted"}`}>
                            {m.prioridade?.toUpperCase()}
                          </Badge>
                          <Badge variant={m.status === "pendente" ? "outline" : "default"} className="text-xs">
                            {m.status === "pendente" ? "Pendente" : "Em Rota"}
                          </Badge>
                        </div>
                        <p className="font-semibold text-sm truncate">{m.paciente_nome}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">{m.setor_origem} → {m.destino}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <Clock className="h-3 w-3 shrink-0" />
                          <span>{formatDate(m.created_at)}</span>
                        </div>
                      </div>
                      <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform ${selectedMissao?.id === m.id ? "rotate-90" : ""}`} />
                    </div>

                    {selectedMissao?.id === m.id && (
                      <div className="mt-3 pt-3 border-t space-y-2">
                        <div className="text-xs space-y-1">
                          <p><span className="font-medium">Regulador:</span> {m.solicitado_por_nome || "—"}</p>
                          <p><span className="font-medium">Veículo:</span> {m.veiculo_tipo || "Não definido"}</p>
                          <p><span className="font-medium">Motorista:</span> {m.motorista_nome || "Não atribuído"}</p>
                        </div>
                        {m.status === "pendente" && (
                          <Button 
                            size="sm" 
                            className="w-full mt-2 gap-2" 
                            disabled={actionLoading === m.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              tentarAceitarMissao(m);
                            }}
                          >
                            {actionLoading === m.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                            Aceitar Missão
                          </Button>
                        )}
                        {m.status === "em_transporte" && (
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs" onClick={(e) => {
                                e.stopPropagation();
                                handleNavegar(m.destino);
                              }}>
                                <Navigation className="h-3 w-3" />
                                Navegar
                              </Button>
                              <Button 
                                size="sm" 
                                className="flex-1 gap-1 text-xs"
                                disabled={actionLoading === m.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  abrirFinalizar(m.id);
                                }}
                              >
                                {actionLoading === m.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                                Finalizar
                              </Button>
                            </div>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="w-full gap-1 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                abrirIntercorrencia(m.id);
                              }}
                            >
                              <FileWarning className="h-3 w-3" />
                              Registrar Intercorrência
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </>
        )}

        {activeTab === "historico" && (
          <>
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Histórico de Missões
            </h2>

            {missoes.filter(m => m.status === "concluida").length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <p>Nenhuma missão concluída</p>
                </CardContent>
              </Card>
            ) : (
              missoes.filter(m => m.status === "concluida").map((m) => (
                <Card key={m.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={`text-xs ${prioridadeColors[m.prioridade] || "bg-muted"}`}>
                            {m.prioridade?.toUpperCase()}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">Concluída</Badge>
                        </div>
                        <p className="font-semibold text-sm truncate">{m.paciente_nome}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">{m.setor_origem} → {m.destino}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <Clock className="h-3 w-3 shrink-0" />
                          <span>{formatDate(m.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </>
        )}
      </div>

      {/* Bottom nav */}
      <nav className="bg-card border-t sticky bottom-0 grid grid-cols-2 text-center py-2">
        <button 
          className={`flex flex-col items-center gap-0.5 ${activeTab === "missoes" ? "text-primary" : "text-muted-foreground"}`}
          onClick={() => setActiveTab("missoes")}
        >
          <Truck className="h-5 w-5" />
          <span className="text-[10px] font-medium">Missões</span>
        </button>
        <button 
          className={`flex flex-col items-center gap-0.5 ${activeTab === "historico" ? "text-primary" : "text-muted-foreground"}`}
          onClick={() => setActiveTab("historico")}
        >
          <Clock className="h-5 w-5" />
          <span className="text-[10px]">Histórico</span>
        </button>
      </nav>

      {/* Confirm dialog when driver name doesn't match */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Atenção
            </DialogTitle>
            <DialogDescription className="pt-2">
              Esta missão está atribuída para <span className="font-semibold text-foreground">{pendingMissaoMotorista}</span>, mas você está logado como <span className="font-semibold text-foreground">{userName}</span>. Deseja aceitar mesmo assim?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button variant="outline" className="flex-1" onClick={() => {
              setConfirmDialogOpen(false);
              setPendingMissaoId(null);
              setPendingMissaoMotorista(null);
            }}>
              Voltar
            </Button>
            <Button className="flex-1" onClick={() => {
              setConfirmDialogOpen(false);
              if (pendingMissaoId) abrirPreAccept(pendingMissaoId);
            }}>
              Aceitar mesmo assim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pre-accept dialog: location + km */}
      <Dialog open={preAcceptOpen} onOpenChange={setPreAcceptOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              Iniciar Missão
            </DialogTitle>
            <DialogDescription>
              Ative sua localização e informe a km atual do veículo para prosseguir.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Location */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Localização</Label>
              {locAtiva ? (
                <div className="flex items-center gap-2 p-3 rounded-md bg-green-50 border border-green-200 text-green-800 text-sm">
                  <LocateFixed className="h-4 w-4 shrink-0" />
                  Localização ativada
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  disabled={locLoading}
                  onClick={ativarLocalizacao}
                >
                  {locLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
                  Ativar Localização
                </Button>
              )}
              {locError && <p className="text-xs text-destructive">{locError}</p>}
            </div>

            {/* KM */}
            <div className="space-y-2">
              <Label htmlFor="km-inicial" className="text-sm font-medium">Km atual da ambulância</Label>
              <Input
                id="km-inicial"
                type="number"
                inputMode="numeric"
                placeholder="Ex: 45230"
                value={kmInicial}
                onChange={(e) => setKmInicial(e.target.value)}
                className="text-lg"
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setPreAcceptOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="flex-1 gap-2"
              disabled={!locAtiva || !kmInicial.trim()}
              onClick={confirmarPreAccept}
            >
              <Play className="h-4 w-4" />
              Confirmar Saída
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Finalizar dialog: km final */}
      <Dialog open={finalizarOpen} onOpenChange={setFinalizarOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Finalizar Missão
            </DialogTitle>
            <DialogDescription>
              Informe a km atual da ambulância para calcular a distância percorrida.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="km-final" className="text-sm font-medium">Km final da ambulância</Label>
            <Input
              id="km-final"
              type="number"
              inputMode="numeric"
              placeholder="Ex: 45280"
              value={kmFinal}
              onChange={(e) => setKmFinal(e.target.value)}
              className="text-lg"
            />
          </div>
          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setFinalizarOpen(false)}>
              Cancelar
            </Button>
            <Button className="flex-1 gap-2" disabled={!kmFinal.trim()} onClick={confirmarFinalizar}>
              <CheckCircle2 className="h-4 w-4" />
              Confirmar Chegada
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Intercorrência dialog */}
      <Dialog open={intercorrenciaOpen} onOpenChange={setIntercorrenciaOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <FileWarning className="h-5 w-5" />
              Registrar Intercorrência
            </DialogTitle>
            <DialogDescription>
              Descreva o que aconteceu durante o transporte.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="intercorrencia" className="text-sm font-medium">Descrição</Label>
            <textarea
              id="intercorrencia"
              className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Descreva a intercorrência..."
              value={intercorrenciaTexto}
              onChange={(e) => setIntercorrenciaTexto(e.target.value)}
            />
          </div>
          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setIntercorrenciaOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              className="flex-1 gap-2"
              disabled={!intercorrenciaTexto.trim() || intercorrenciaLoading}
              onClick={salvarIntercorrencia}
            >
              {intercorrenciaLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileWarning className="h-4 w-4" />}
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Transporte;
