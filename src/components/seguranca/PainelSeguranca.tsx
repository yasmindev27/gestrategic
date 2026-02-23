import { useState, useEffect, useRef, useCallback } from "react";
import { ShieldAlert, CheckCircle2, Clock, Volume2, VolumeX } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Alerta {
  id: string;
  tipo: string;
  setor: string;
  usuario_nome: string;
  observacao: string | null;
  status: string;
  atendido_por_nome: string | null;
  desfecho: string | null;
  atendido_em: string | null;
  created_at: string;
}

export function PainelSeguranca() {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(true);
  const [somAtivo, setSomAtivo] = useState(true);
  const [atenderDialog, setAtenderDialog] = useState<Alerta | null>(null);
  const [desfecho, setDesfecho] = useState("");
  const [saving, setSaving] = useState(false);
  const [filtro, setFiltro] = useState<"pendente" | "atendido" | "todos">("pendente");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  const fetchAlertas = useCallback(async () => {
    let query = supabase
      .from("alertas_seguranca")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (filtro === "pendente") query = query.in("status", ["pendente", "em_atendimento"]);
    if (filtro === "atendido") query = query.eq("status", "atendido");

    const { data, error } = await query;
    if (!error && data) {
      setAlertas(data);
    }
    setLoading(false);
  }, [filtro]);

  useEffect(() => {
    fetchAlertas();

    const channel = supabase
      .channel("alertas-seguranca-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "alertas_seguranca" }, () => {
        fetchAlertas();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchAlertas]);

  // Toque de radinho em loop enquanto houver alertas pendentes
  useEffect(() => {
    const pendentes = alertas.filter(a => a.status === "pendente").length;

    if (pendentes > 0 && somAtivo) {
      if (!audioRef.current) {
        audioRef.current = new Audio("/assets/toque-seguranca.mp3");
        audioRef.current.loop = true;
        audioRef.current.volume = 0.7;
      }
      audioRef.current.play().catch(() => {});
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, [alertas, somAtivo]);

  const handleAtender = async () => {
    if (!atenderDialog) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from("profiles").select("full_name").eq("user_id", user!.id).single();

      const { error } = await supabase
        .from("alertas_seguranca")
        .update({
          status: "atendido",
          atendido_por: user!.id,
          atendido_por_nome: profile?.full_name || user!.email,
          desfecho: desfecho.trim() || "Atendido sem observações",
          atendido_em: new Date().toISOString(),
        })
        .eq("id", atenderDialog.id);

      if (error) throw error;
      toast({ title: "Chamado atendido", description: "O alerta foi encerrado com sucesso." });
      setAtenderDialog(null);
      setDesfecho("");
      fetchAlertas();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const pendentesCount = alertas.filter(a => a.status === "pendente").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-destructive" />
            Painel de Segurança
          </h1>
          <p className="text-muted-foreground">Alertas de segurança em tempo real</p>
        </div>
        <div className="flex items-center gap-2">
          {pendentesCount > 0 && (
            <Badge variant="destructive" className="text-lg px-3 py-1 animate-pulse">
              {pendentesCount} pendente{pendentesCount > 1 ? "s" : ""}
            </Badge>
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSomAtivo(!somAtivo)}
            title={somAtivo ? "Desativar som" : "Ativar som"}
          >
            {somAtivo ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        {(["pendente", "atendido", "todos"] as const).map(f => (
          <Button
            key={f}
            variant={filtro === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFiltro(f)}
          >
            {f === "pendente" ? "Pendentes" : f === "atendido" ? "Atendidos" : "Todos"}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando alertas...</div>
      ) : alertas.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Nenhum alerta encontrado.</div>
      ) : (
        <div className="grid gap-3">
          {alertas.map(alerta => (
            <Card
              key={alerta.id}
              className={cn(
                "transition-all",
                alerta.status === "pendente" && alerta.tipo === "urgente" && "border-destructive border-2 bg-destructive/5 shadow-lg shadow-destructive/10 animate-pulse",
                alerta.status === "pendente" && alerta.tipo === "apoio" && "border-warning border-2 bg-warning/5",
                alerta.status === "atendido" && "opacity-70 border-success/30"
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={alerta.tipo === "urgente" ? "destructive" : "outline"} className={alerta.tipo === "apoio" ? "bg-warning/15 text-warning border-warning/30" : ""}>
                        {alerta.tipo === "urgente" ? "🔴 URGENTE" : "🟡 APOIO"}
                      </Badge>
                      <Badge variant="outline">{alerta.setor}</Badge>
                      <Badge variant={alerta.status === "atendido" ? "default" : "secondary"} className={alerta.status === "atendido" ? "bg-success text-success-foreground" : ""}>
                        {alerta.status === "pendente" ? "Pendente" : alerta.status === "em_atendimento" ? "Em atendimento" : "Atendido"}
                      </Badge>
                    </div>
                    <p className="text-sm">
                      <span className="font-medium">{alerta.usuario_nome}</span>
                      {" · "}
                      <span className="text-muted-foreground">
                        {format(new Date(alerta.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </span>
                    </p>
                    {alerta.observacao && (
                      <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded mt-1">
                        {alerta.observacao}
                      </p>
                    )}
                    {alerta.status === "atendido" && (
                      <div className="text-xs text-success mt-1 space-y-0.5">
                        <p>✅ Atendido por: {alerta.atendido_por_nome}</p>
                        {alerta.desfecho && <p>Desfecho: {alerta.desfecho}</p>}
                        {alerta.atendido_em && <p>{format(new Date(alerta.atendido_em), "dd/MM HH:mm")}</p>}
                      </div>
                    )}
                  </div>
                  {alerta.status !== "atendido" && (
                    <Button
                      size="sm"
                      className="gap-1 bg-success hover:bg-success/90 text-success-foreground"
                      onClick={() => { setAtenderDialog(alerta); setDesfecho(""); }}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Atender
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!atenderDialog} onOpenChange={(o) => !o && setAtenderDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Atendimento</DialogTitle>
          </DialogHeader>
          <div>
            <Label>Desfecho / Observação</Label>
            <Textarea
              value={desfecho}
              onChange={(e) => setDesfecho(e.target.value)}
              placeholder="Descreva brevemente o que foi feito..."
              maxLength={1000}
              rows={3}
              className="mt-1"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAtenderDialog(null)}>Cancelar</Button>
            <Button onClick={handleAtender} disabled={saving} className="bg-success hover:bg-success/90 text-success-foreground">
              {saving ? "Salvando..." : "Confirmar Atendimento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
