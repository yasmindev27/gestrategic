import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Truck, MapPin, Clock, CheckCircle2, LogOut, Navigation, ChevronRight, Play } from "lucide-react";
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

  const handleAceitarMissao = async (missaoId: string) => {
    setActionLoading(missaoId);
    try {
      const { error } = await supabase
        .from("transferencia_solicitacoes")
        .update({
          status: "em_transporte",
          motorista_nome: userName,
          hora_saida: new Date().toISOString(),
        })
        .eq("id", missaoId);
      if (error) throw error;
      toast({ title: "Missão aceita! Boa viagem." });
      setSelectedMissao(null);
      loadMissoes(userName);
    } catch (err: any) {
      toast({ title: "Erro ao aceitar missão", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleFinalizarMissao = async (missaoId: string) => {
    setActionLoading(missaoId);
    try {
      const { error } = await supabase
        .from("transferencia_solicitacoes")
        .update({
          status: "concluida",
          hora_chegada: new Date().toISOString(),
        })
        .eq("id", missaoId);
      if (error) throw error;
      toast({ title: "Missão finalizada com sucesso!" });
      setSelectedMissao(null);
      loadMissoes(userName);
    } catch (err: any) {
      toast({ title: "Erro ao finalizar", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
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
        <h2 className="font-semibold text-foreground flex items-center gap-2">
          <Truck className="h-5 w-5 text-primary" />
          Missões de Transporte
        </h2>

        {missoes.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <Navigation className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p>Nenhuma missão no momento</p>
            </CardContent>
          </Card>
        ) : (
          missoes.map((m) => (
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
                      <Badge variant={m.status === "pendente" ? "outline" : m.status === "em_transporte" ? "default" : "secondary"} className="text-xs">
                        {m.status === "pendente" ? "Pendente" : m.status === "em_transporte" ? "Em Rota" : m.status === "concluida" ? "Concluída" : m.status}
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
                          handleAceitarMissao(m.id);
                        }}
                      >
                        {actionLoading === m.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                        Aceitar Missão
                      </Button>
                    )}
                    {m.status === "em_transporte" && (
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
                            handleFinalizarMissao(m.id);
                          }}
                        >
                          {actionLoading === m.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                          Finalizar
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Bottom nav */}
      <nav className="bg-card border-t sticky bottom-0 grid grid-cols-3 text-center py-2">
        <button className="flex flex-col items-center gap-0.5 text-primary">
          <Truck className="h-5 w-5" />
          <span className="text-[10px] font-medium">Missões</span>
        </button>
        <button className="flex flex-col items-center gap-0.5 text-muted-foreground">
          <MapPin className="h-5 w-5" />
          <span className="text-[10px]">Checklist</span>
        </button>
        <button className="flex flex-col items-center gap-0.5 text-muted-foreground">
          <Clock className="h-5 w-5" />
          <span className="text-[10px]">Histórico</span>
        </button>
      </nav>
    </div>
  );
};

export default Transporte;
