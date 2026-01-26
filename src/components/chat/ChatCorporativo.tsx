import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { 
  Send, 
  MessageSquare, 
  Users, 
  Plus, 
  AlertTriangle,
  Loader2,
  Hash,
  Search,
  Shield
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Conversa {
  id: string;
  nome: string;
  descricao: string | null;
  tipo: string;
  criado_por: string;
  created_at: string;
}

interface Mensagem {
  id: string;
  conversa_id: string;
  remetente_id: string;
  conteudo: string;
  tipo: string;
  created_at: string;
  excluido: boolean;
  remetente_nome?: string;
}

interface Participante {
  id: string;
  user_id: string;
  conversa_id: string;
  nome?: string;
}

const CANAL_GERAL_ID = "00000000-0000-0000-0000-000000000001";

export const ChatCorporativo = () => {
  const [conversaSelecionada, setConversaSelecionada] = useState<string | null>(null);
  const [novaMensagem, setNovaMensagem] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [novaConversaNome, setNovaConversaNome] = useState("");
  const [novaConversaDescricao, setNovaConversaDescricao] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [enviando, setEnviando] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Buscar usuário atual
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", user.id)
          .single();
        if (profile) {
          setUserName(profile.full_name);
        }
      }
    };
    getUser();
  }, []);

  // Auto-join no canal geral
  useEffect(() => {
    const joinCanalGeral = async () => {
      if (!userId) return;
      
      // Verificar se já é participante
      const { data: existente } = await supabase
        .from("chat_participantes")
        .select("id")
        .eq("conversa_id", CANAL_GERAL_ID)
        .eq("user_id", userId)
        .single();

      if (!existente) {
        await supabase.from("chat_participantes").insert({
          conversa_id: CANAL_GERAL_ID,
          user_id: userId
        });
      }
    };
    joinCanalGeral();
  }, [userId]);

  // Buscar conversas do usuário
  const { data: conversas = [], isLoading: loadingConversas } = useQuery({
    queryKey: ["chat-conversas", userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data: participacoes } = await supabase
        .from("chat_participantes")
        .select("conversa_id")
        .eq("user_id", userId);

      if (!participacoes || participacoes.length === 0) return [];

      const conversaIds = participacoes.map(p => p.conversa_id);
      
      const { data, error } = await supabase
        .from("chat_conversas")
        .select("*")
        .in("id", conversaIds)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Conversa[];
    },
    enabled: !!userId,
  });

  // Buscar mensagens da conversa selecionada
  const { data: mensagens = [], isLoading: loadingMensagens } = useQuery({
    queryKey: ["chat-mensagens", conversaSelecionada],
    queryFn: async () => {
      if (!conversaSelecionada) return [];

      const { data, error } = await supabase
        .from("chat_mensagens")
        .select("*")
        .eq("conversa_id", conversaSelecionada)
        .eq("excluido", false)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Buscar nomes dos remetentes
      const remetenteIds = [...new Set((data as Mensagem[]).map(m => m.remetente_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", remetenteIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

      return (data as Mensagem[]).map(m => ({
        ...m,
        remetente_nome: profileMap.get(m.remetente_id) || "Usuário"
      }));
    },
    enabled: !!conversaSelecionada,
    refetchInterval: 3000, // Polling a cada 3 segundos
  });

  // Realtime para mensagens
  useEffect(() => {
    if (!conversaSelecionada) return;

    const channel = supabase
      .channel(`chat-${conversaSelecionada}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_mensagens',
          filter: `conversa_id=eq.${conversaSelecionada}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["chat-mensagens", conversaSelecionada] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversaSelecionada, queryClient]);

  // Scroll para última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens]);

  // Enviar mensagem com moderação
  const enviarMensagem = async () => {
    if (!novaMensagem.trim() || !conversaSelecionada || !userId || enviando) return;

    setEnviando(true);
    try {
      const { data, error } = await supabase.functions.invoke("moderar-mensagem", {
        body: {
          conteudo: novaMensagem.trim(),
          tipo: "texto",
          conversa_id: conversaSelecionada
        }
      });

      if (error) throw error;

      if (!data.approved) {
        toast({
          title: "Mensagem bloqueada",
          description: data.reason,
          variant: "destructive",
        });
        return;
      }

      setNovaMensagem("");
      queryClient.invalidateQueries({ queryKey: ["chat-mensagens", conversaSelecionada] });
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar a mensagem",
        variant: "destructive",
      });
    } finally {
      setEnviando(false);
    }
  };

  // Criar nova conversa
  const criarConversa = async () => {
    if (!novaConversaNome.trim() || !userId) return;

    try {
      const { data: conversa, error } = await supabase
        .from("chat_conversas")
        .insert({
          nome: novaConversaNome.trim(),
          descricao: novaConversaDescricao.trim() || null,
          tipo: "grupo",
          criado_por: userId
        })
        .select()
        .single();

      if (error) throw error;

      // Adicionar criador como participante
      await supabase.from("chat_participantes").insert({
        conversa_id: conversa.id,
        user_id: userId
      });

      toast({
        title: "Canal criado",
        description: `O canal "${novaConversaNome}" foi criado com sucesso`,
      });

      setNovaConversaNome("");
      setNovaConversaDescricao("");
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["chat-conversas"] });
    } catch (error) {
      console.error("Erro ao criar conversa:", error);
      toast({
        title: "Erro",
        description: "Não foi possível criar o canal",
        variant: "destructive",
      });
    }
  };

  const conversasFiltradas = conversas.filter(c => 
    c.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const conversaAtual = conversas.find(c => c.id === conversaSelecionada);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <div className="flex h-[calc(100vh-200px)] gap-4">
      {/* Lista de Conversas */}
      <Card className="w-80 flex flex-col">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Chat Corporativo
            </CardTitle>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Novo Canal</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-sm font-medium">Nome do Canal</label>
                    <Input
                      value={novaConversaNome}
                      onChange={(e) => setNovaConversaNome(e.target.value)}
                      placeholder="Ex: Projetos, Marketing..."
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Descrição (opcional)</label>
                    <Input
                      value={novaConversaDescricao}
                      onChange={(e) => setNovaConversaDescricao(e.target.value)}
                      placeholder="Sobre o que é este canal?"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={criarConversa} disabled={!novaConversaNome.trim()}>
                    Criar Canal
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar canais..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="flex-1 p-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-2 space-y-1">
              {loadingConversas ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : conversasFiltradas.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum canal encontrado
                </p>
              ) : (
                conversasFiltradas.map((conversa) => (
                  <button
                    key={conversa.id}
                    onClick={() => setConversaSelecionada(conversa.id)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      conversaSelecionada === conversa.id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Hash className="h-4 w-4" />
                      <span className="font-medium truncate">{conversa.nome}</span>
                    </div>
                    {conversa.descricao && (
                      <p className={`text-xs truncate mt-1 ${
                        conversaSelecionada === conversa.id
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground"
                      }`}>
                        {conversa.descricao}
                      </p>
                    )}
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Área de Mensagens */}
      <Card className="flex-1 flex flex-col">
        {conversaSelecionada ? (
          <>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Hash className="h-5 w-5" />
                    {conversaAtual?.nome}
                  </CardTitle>
                  {conversaAtual?.descricao && (
                    <p className="text-sm text-muted-foreground">
                      {conversaAtual.descricao}
                    </p>
                  )}
                </div>
                <Badge variant="outline" className="gap-1">
                  <Shield className="h-3 w-3" />
                  Moderado
                </Badge>
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="flex-1 p-0 overflow-hidden">
              <ScrollArea className="h-full p-4">
                {loadingMensagens ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : mensagens.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mb-2" />
                    <p>Nenhuma mensagem ainda</p>
                    <p className="text-sm">Seja o primeiro a enviar uma mensagem!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {mensagens.map((msg, index) => {
                      const isOwn = msg.remetente_id === userId;
                      const showAvatar = index === 0 || 
                        mensagens[index - 1].remetente_id !== msg.remetente_id;
                      
                      return (
                        <div
                          key={msg.id}
                          className={`flex gap-3 ${isOwn ? "flex-row-reverse" : ""}`}
                        >
                          {showAvatar ? (
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className={isOwn ? "bg-primary text-primary-foreground" : ""}>
                                {getInitials(msg.remetente_nome || "U")}
                              </AvatarFallback>
                            </Avatar>
                          ) : (
                            <div className="w-8" />
                          )}
                          <div className={`flex flex-col ${isOwn ? "items-end" : ""}`}>
                            {showAvatar && (
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium">
                                  {isOwn ? "Você" : msg.remetente_nome}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(msg.created_at), "HH:mm", { locale: ptBR })}
                                </span>
                              </div>
                            )}
                            <div
                              className={`rounded-lg px-3 py-2 max-w-md ${
                                isOwn
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted"
                              }`}
                            >
                              <p className="text-sm whitespace-pre-wrap break-words">
                                {msg.conteudo}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>
            </CardContent>
            <Separator />
            <div className="p-4">
              <div className="flex gap-2">
                <Input
                  value={novaMensagem}
                  onChange={(e) => setNovaMensagem(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      enviarMensagem();
                    }
                  }}
                  disabled={enviando}
                />
                <Button onClick={enviarMensagem} disabled={enviando || !novaMensagem.trim()}>
                  {enviando ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <AlertTriangle className="h-3 w-3" />
                <span>
                  Mensagens são moderadas automaticamente. Conteúdo ofensivo, discriminatório ou inadequado será bloqueado.
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <MessageSquare className="h-16 w-16 mb-4" />
            <h3 className="text-lg font-medium">Chat Corporativo</h3>
            <p className="text-sm text-center max-w-sm mt-2">
              Selecione um canal à esquerda para começar a conversar com seus colegas
            </p>
            <div className="mt-4 p-4 bg-muted rounded-lg max-w-sm">
              <h4 className="font-medium flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Regras de Uso
              </h4>
              <ul className="text-xs mt-2 space-y-1">
                <li>• Mantenha o respeito e profissionalismo</li>
                <li>• Não envie conteúdo ofensivo ou discriminatório</li>
                <li>• Imagens inadequadas são proibidas</li>
                <li>• Violações serão registradas e reportadas</li>
              </ul>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
