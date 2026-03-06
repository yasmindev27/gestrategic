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
import { Loader2, Truck, MapPin, Clock, CheckCircle2, LogOut, Navigation, ChevronRight, Play, AlertTriangle, FileWarning, RefreshCw, Ambulance, Bell, BellOff } from "lucide-react";
import logoGestrategic from "@/assets/logo-gestrategic.jpg";
import { usePushNotifications } from "@/hooks/usePushNotifications";

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

const prioridadeConfig: Record<string, { label: string; bg: string; dot: string }> = {
  baixa: { label: "BAIXA", bg: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  normal: { label: "NORMAL", bg: "bg-sky-50 text-sky-700 border-sky-200", dot: "bg-sky-500" },
  alta: { label: "ALTA", bg: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  urgente: { label: "URGENTE", bg: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500" },
};

const Transporte = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [missoes, setMissoes] = useState<Solicitacao[]>([]);
  const [selectedMissao, setSelectedMissao] = useState<Solicitacao | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingMissaoId, setPendingMissaoId] = useState<string | null>(null);
  const [pendingMissaoMotorista, setPendingMissaoMotorista] = useState<string | null>(null);
  const [preAcceptOpen, setPreAcceptOpen] = useState(false);
  const [preAcceptMissaoId, setPreAcceptMissaoId] = useState<string | null>(null);
  const [kmInicial, setKmInicial] = useState("");
  const [finalizarOpen, setFinalizarOpen] = useState(false);
  const [finalizarMissaoId, setFinalizarMissaoId] = useState<string | null>(null);
  const [kmFinal, setKmFinal] = useState("");
  const [intercorrenciaOpen, setIntercorrenciaOpen] = useState(false);
  const [intercorrenciaMissaoId, setIntercorrenciaMissaoId] = useState<string | null>(null);
  const [intercorrenciaTexto, setIntercorrenciaTexto] = useState("");
  const [intercorrenciaLoading, setIntercorrenciaLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"missoes" | "historico">("missoes");
  const { isSupported: pushSupported, isSubscribed: pushSubscribed, isLoading: pushLoading, subscribe: pushSubscribe, unsubscribe: pushUnsubscribe } = usePushNotifications();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      setUser(user);
      const { data: profile } = await supabase.from("profiles").select("full_name").eq("user_id", user.id).single();
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

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadMissoes(userName);
    setRefreshing(false);
    toast({ title: "Lista atualizada!" });
  };

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
    setPreAcceptOpen(true);
  };

  const confirmarPreAccept = () => {
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
      const { error } = await supabase.from("transferencia_solicitacoes").update(updateData).eq("id", missaoId);
      if (error) throw error;
      toast({ title: "Transporte aceito! Boa viagem. 🚑" });
      setSelectedMissao(null);
      loadMissoes(userName);
    } catch (err: any) {
      toast({ title: "Erro ao aceitar transporte", description: err.message, variant: "destructive" });
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
      const { data: sol } = await supabase.from("transferencia_solicitacoes").select("km_rodados").eq("id", finalizarMissaoId).single();
      const kmIni = (sol as any)?.km_rodados || 0;
      const kmTotal = Math.max(0, Number(kmFinal) - kmIni);
      const { error } = await supabase.from("transferencia_solicitacoes").update({
        status: "concluida",
        hora_chegada: new Date().toISOString(),
        km_rodados: kmTotal,
      }).eq("id", finalizarMissaoId);
      if (error) throw error;
      toast({ title: `Transporte finalizado! ${kmTotal} km percorridos.` });
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
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destino)}`, "_blank");
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

  const pendentes = missoes.filter(m => m.status === "pendente");
  const emRota = missoes.filter(m => m.status === "em_transporte");
  const concluidas = missoes.filter(m => m.status === "concluida");
  const ativas = [...emRota, ...pendentes];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
        <Ambulance className="h-12 w-12 text-primary animate-pulse" />
        <p className="text-sm text-muted-foreground">Carregando transportes...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <header className="bg-gradient-to-r from-primary to-primary/85 text-primary-foreground px-4 py-5 sticky top-0 z-10 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img src={logoGestrategic} alt="Logo" className="h-10 w-10 rounded-xl object-cover ring-2 ring-white/20" />
              {emRota.length > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-primary animate-pulse" />
              )}
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Transporte</h1>
              <p className="text-xs opacity-75 truncate max-w-[180px]">{userName}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {pushSupported && (
              <Button
                variant="ghost"
                size="icon"
                onClick={pushSubscribed ? pushUnsubscribe : pushSubscribe}
                disabled={pushLoading}
                className="text-primary-foreground hover:bg-white/10"
                title={pushSubscribed ? "Desativar notificações" : "Ativar notificações"}
              >
                {pushSubscribed ? <Bell className="h-4.5 w-4.5" /> : <BellOff className="h-4.5 w-4.5" />}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={refreshing}
              className="text-primary-foreground hover:bg-white/10"
            >
              <RefreshCw className={`h-4.5 w-4.5 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-primary-foreground hover:bg-white/10">
              <LogOut className="h-4.5 w-4.5" />
            </Button>
          </div>
        </div>

        {/* Stats inline */}
        <div className="flex gap-3 mt-4">
          {[
            { count: pendentes.length, label: "Pendentes", color: "bg-amber-400/20 text-amber-100" },
            { count: emRota.length, label: "Em Rota", color: "bg-sky-400/20 text-sky-100" },
            { count: concluidas.length, label: "Concluídas", color: "bg-emerald-400/20 text-emerald-100" },
          ].map(({ count, label, color }) => (
            <div key={label} className={`flex-1 rounded-lg px-3 py-2 text-center ${color}`}>
              <p className="text-xl font-bold">{count}</p>
              <p className="text-[10px] font-medium opacity-80">{label}</p>
            </div>
          ))}
        </div>
      </header>

      {/* Active mission banner */}
      {emRota.length > 0 && activeTab === "missoes" && (
        <div className="mx-4 mt-3 p-3 rounded-xl bg-primary/5 border border-primary/15 flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Truck className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-primary">Transporte em andamento</p>
            <p className="text-xs text-muted-foreground truncate">{emRota[0].paciente_nome} → {emRota[0].destino}</p>
          </div>
          <Badge className="bg-primary text-primary-foreground shrink-0 text-[10px]">EM ROTA</Badge>
        </div>
      )}

      {/* Mission List */}
      <div className="flex-1 px-4 py-4 space-y-3 pb-20">
        {activeTab === "missoes" && (
          <>
            {ativas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="p-4 bg-muted rounded-full mb-4">
                  <Ambulance className="h-10 w-10 text-muted-foreground/50" />
                </div>
                <p className="font-medium text-foreground">Nenhum transporte no momento</p>
                <p className="text-sm text-muted-foreground mt-1">Puxe para baixo para atualizar</p>
              </div>
            ) : (
              ativas.map((m) => {
                const prio = prioridadeConfig[m.prioridade] || prioridadeConfig.normal;
                const isExpanded = selectedMissao?.id === m.id;
                const isEmRota = m.status === "em_transporte";

                return (
                  <Card
                    key={m.id}
                    className={`transition-all duration-200 active:scale-[0.98] overflow-hidden ${
                      isEmRota ? "ring-2 ring-primary/20 shadow-md" : "hover:shadow-md"
                    }`}
                    onClick={() => setSelectedMissao(isExpanded ? null : m)}
                  >
                    <CardContent className="p-0">
                      {/* Priority stripe */}
                      <div className={`h-1 ${isEmRota ? "bg-primary" : prio.dot}`} />

                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                              <Badge className={`text-[10px] font-semibold px-2 py-0.5 border ${prio.bg}`}>
                                {prio.label}
                              </Badge>
                              {isEmRota ? (
                                <Badge className="bg-primary text-primary-foreground text-[10px] px-2 py-0.5 gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                  Em Rota
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] px-2 py-0.5">Pendente</Badge>
                              )}
                            </div>
                            <p className="font-semibold text-sm truncate">{m.paciente_nome}</p>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1.5">
                              <MapPin className="h-3 w-3 shrink-0 text-primary/60" />
                              <span className="truncate">{m.setor_origem} → {m.destino}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                              <Clock className="h-3 w-3 shrink-0" />
                              <span>{formatDate(m.created_at)}</span>
                            </div>
                          </div>
                          <ChevronRight className={`h-5 w-5 text-muted-foreground/50 transition-transform duration-200 mt-1 ${isExpanded ? "rotate-90" : ""}`} />
                        </div>

                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-dashed space-y-3 animate-in slide-in-from-top-2 duration-200">
                            <div className="grid grid-cols-3 gap-2">
                              {[
                                { label: "Regulador", value: m.solicitado_por_nome || "—" },
                                { label: "Veículo", value: m.veiculo_tipo || "Não definido" },
                                { label: "Motorista", value: m.motorista_nome || "Não atribuído" },
                              ].map(({ label, value }) => (
                                <div key={label} className="bg-muted/50 rounded-lg p-2">
                                  <p className="text-[10px] text-muted-foreground font-medium">{label}</p>
                                  <p className="text-xs font-semibold truncate mt-0.5">{value}</p>
                                </div>
                              ))}
                            </div>

                            {m.status === "pendente" && (
                              <Button
                                size="sm"
                                className="w-full gap-2 h-10 font-semibold"
                                disabled={actionLoading === m.id}
                                onClick={(e) => { e.stopPropagation(); tentarAceitarMissao(m); }}
                              >
                                {actionLoading === m.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                                Aceitar Transporte
                              </Button>
                            )}

                            {isEmRota && (
                              <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-1.5 h-10"
                                    onClick={(e) => { e.stopPropagation(); handleNavegar(m.destino); }}
                                  >
                                    <Navigation className="h-4 w-4" />
                                    Navegar
                                  </Button>
                                  <Button
                                    size="sm"
                                    className="gap-1.5 h-10 font-semibold"
                                    disabled={actionLoading === m.id}
                                    onClick={(e) => { e.stopPropagation(); abrirFinalizar(m.id); }}
                                  >
                                    {actionLoading === m.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                    Finalizar
                                  </Button>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-full gap-1.5 h-9 text-destructive border-destructive/30 hover:bg-destructive/5"
                                  onClick={(e) => { e.stopPropagation(); abrirIntercorrencia(m.id); }}
                                >
                                  <FileWarning className="h-3.5 w-3.5" />
                                  Registrar Intercorrência
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </>
        )}

        {activeTab === "historico" && (
          <>
            {concluidas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="p-4 bg-muted rounded-full mb-4">
                  <CheckCircle2 className="h-10 w-10 text-muted-foreground/50" />
                </div>
                <p className="font-medium text-foreground">Nenhum transporte concluído</p>
                <p className="text-sm text-muted-foreground mt-1">Seus transportes finalizados aparecerão aqui</p>
              </div>
            ) : (
              concluidas.map((m) => {
                const prio = prioridadeConfig[m.prioridade] || prioridadeConfig.normal;
                return (
                  <Card key={m.id} className="overflow-hidden">
                    <CardContent className="p-0">
                      <div className="h-1 bg-emerald-500" />
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                              <Badge className={`text-[10px] font-semibold px-2 py-0.5 border ${prio.bg}`}>
                                {prio.label}
                              </Badge>
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] px-2 py-0.5 border">
                                ✓ Concluída
                              </Badge>
                            </div>
                            <p className="font-semibold text-sm truncate">{m.paciente_nome}</p>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1.5">
                              <MapPin className="h-3 w-3 shrink-0 text-primary/60" />
                              <span className="truncate">{m.setor_origem} → {m.destino}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                              <Clock className="h-3 w-3 shrink-0" />
                              <span>{formatDate(m.created_at)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </>
        )}
      </div>

      {/* Bottom navigation */}
      <nav className="bg-card border-t fixed bottom-0 left-0 right-0 max-w-lg mx-auto grid grid-cols-2 text-center py-2.5 z-10 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <button
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === "missoes" ? "text-primary" : "text-muted-foreground"}`}
          onClick={() => setActiveTab("missoes")}
        >
          <div className={`p-1.5 rounded-lg transition-colors ${activeTab === "missoes" ? "bg-primary/10" : ""}`}>
            <Truck className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-semibold">Transportes</span>
        </button>
        <button
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === "historico" ? "text-primary" : "text-muted-foreground"}`}
          onClick={() => setActiveTab("historico")}
        >
          <div className={`p-1.5 rounded-lg transition-colors ${activeTab === "historico" ? "bg-primary/10" : ""}`}>
            <Clock className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-semibold">Histórico</span>
        </button>
      </nav>

      {/* Confirm dialog: driver mismatch */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Atenção
            </DialogTitle>
            <DialogDescription className="pt-2">
              Este transporte está atribuído para <span className="font-semibold text-foreground">{pendingMissaoMotorista}</span>, mas você está logado como <span className="font-semibold text-foreground">{userName}</span>. Deseja aceitar mesmo assim?
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

      {/* Pre-accept dialog: km only */}
      <Dialog open={preAcceptOpen} onOpenChange={setPreAcceptOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              Iniciar Transporte
            </DialogTitle>
            <DialogDescription>
              Informe a km atual do veículo para prosseguir.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="km-inicial" className="text-sm font-medium">Km atual da ambulância</Label>
              <Input
                id="km-inicial"
                type="number"
                inputMode="numeric"
                placeholder="Ex: 45230"
                value={kmInicial}
                onChange={(e) => setKmInicial(e.target.value)}
                className="text-lg h-12"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setPreAcceptOpen(false)}>
              Cancelar
            </Button>
            <Button className="flex-1 gap-2" disabled={!kmInicial.trim()} onClick={confirmarPreAccept}>
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
              Finalizar Transporte
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
              className="text-lg h-12"
              autoFocus
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
