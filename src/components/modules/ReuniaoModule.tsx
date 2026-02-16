import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SetupReuniao, SalaReuniao, AtaReuniao, HistoricoReunioes } from "@/components/reuniao";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Video, Plus, Clock, FileText, LogIn, History } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

type View = "list" | "setup" | "sala" | "ata" | "historico";

const ReuniaoModule = () => {
  const [view, setView] = useState<View>("list");
  const [activeReuniaoId, setActiveReuniaoId] = useState<string>("");
  const [activeTranscricao, setActiveTranscricao] = useState<string>("");
  const [activeTitulo, setActiveTitulo] = useState<string>("");
  const [isHost, setIsHost] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setCurrentUserId(data.user.id);
    });
  }, []);

  const { data: reunioes, refetch } = useQuery({
    queryKey: ["reunioes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reunioes")
        .select("*")
        .in("status", ["agendada", "em_andamento"])
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const handleStartMeeting = (reuniaoId: string) => {
    setActiveReuniaoId(reuniaoId);
    setIsHost(true);
    setView("sala");
  };

  const handleRejoinMeeting = (reuniao: any) => {
    setActiveReuniaoId(reuniao.id);
    setIsHost(reuniao.criado_por === currentUserId);
    setView("sala");
  };

  const handleLeaveMeeting = () => {
    setView("list");
    refetch();
  };

  const handleEndMeeting = (transcricao: string) => {
    setActiveTranscricao(transcricao);
    setView("ata");
    refetch();
  };

  const handleViewAta = (reuniao: any) => {
    setActiveReuniaoId(reuniao.id);
    setActiveTranscricao(reuniao.transcricao || "");
    setActiveTitulo(reuniao.titulo);
    setIsHost(reuniao.criado_por === currentUserId);
    setView("ata");
  };

  if (view === "setup") {
    return <SetupReuniao onStart={handleStartMeeting} />;
  }

  if (view === "sala") {
    return (
      <SalaReuniao
        reuniaoId={activeReuniaoId}
        isHost={isHost}
        onEnd={handleEndMeeting}
        onLeave={handleLeaveMeeting}
      />
    );
  }

  if (view === "ata") {
    return (
      <AtaReuniao
        reuniaoId={activeReuniaoId}
        transcricao={activeTranscricao}
        titulo={activeTitulo}
        isHost={isHost}
        onBack={() => { setView("list"); refetch(); }}
      />
    );
  }

  if (view === "historico") {
    return <HistoricoReunioes onBack={() => setView("list")} />;
  }

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
      agendada: { label: "Agendada", variant: "secondary" },
      em_andamento: { label: "Em andamento", variant: "default" },
      encerrada: { label: "Encerrada", variant: "destructive" },
    };
    const cfg = map[status] || map.agendada;
    return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Video className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Reuniões Virtuais</h2>
            <p className="text-sm text-muted-foreground">Gerencie reuniões e atas com IA</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setView("historico")}>
            <History className="h-4 w-4 mr-2" /> Histórico
          </Button>
          <Button onClick={() => setView("setup")}>
            <Plus className="h-4 w-4 mr-2" /> Nova Reunião
          </Button>
        </div>
      </div>

      {!reunioes || reunioes.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Video className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">Nenhuma reunião registrada</p>
            <Button variant="outline" className="mt-4" onClick={() => setView("setup")}>
              <Plus className="h-4 w-4 mr-2" /> Criar Reunião
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reunioes.map((r: any) => (
            <Card key={r.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-muted">
                    <Video className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">{r.titulo}</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <Clock className="h-3 w-3" />
                      {format(parseISO(r.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {statusBadge(r.status)}
                  {r.status === "em_andamento" && (
                    <Button variant="default" size="sm" onClick={() => handleRejoinMeeting(r)}>
                      <LogIn className="h-4 w-4 mr-1" /> Entrar Novamente
                    </Button>
                  )}
                  {r.status === "encerrada" && (
                    <Button variant="outline" size="sm" onClick={() => handleViewAta(r)}>
                      <FileText className="h-4 w-4 mr-1" /> Ata
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReuniaoModule;
