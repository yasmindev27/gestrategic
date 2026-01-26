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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
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
  Shield,
  UserPlus,
  Settings,
  X
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
  full_name?: string;
}

interface Usuario {
  user_id: string;
  full_name: string;
}

const CANAL_GERAL_ID = "00000000-0000-0000-0000-000000000001";

export const ChatCorporativo = () => {
  const [conversaSelecionada, setConversaSelecionada] = useState<string | null>(null);
  const [novaMensagem, setNovaMensagem] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [novaConversaNome, setNovaConversaNome] = useState("");
  const [novaConversaDescricao, setNovaConversaDescricao] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [membrosDialogOpen, setMembrosDialogOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [enviando, setEnviando] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
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

  // Buscar todos os usuários para adicionar membros
  const { data: todosUsuarios = [] } = useQuery({
    queryKey: ["todos-usuarios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .order("full_name");
      
      if (error) throw error;
      return data as Usuario[];
    },
  });

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

  // Buscar participantes da conversa selecionada
  const { data: participantes = [] } = useQuery({
    queryKey: ["chat-participantes", conversaSelecionada],
    queryFn: async () => {
      if (!conversaSelecionada) return [];

      const { data, error } = await supabase
        .from("chat_participantes")
        .select("id, user_id, conversa_id")
        .eq("conversa_id", conversaSelecionada);

      if (error) throw error;

      // Buscar nomes dos participantes
      const userIds = data.map(p => p.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

      return data.map(p => ({
        ...p,
        full_name: profileMap.get(p.user_id) || "Usuário"
      })) as Participante[];
    },
    enabled: !!conversaSelecionada,
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
    refetchInterval: 3000,
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

  // Detectar @ para menções
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNovaMensagem(value);

    // Verificar se o último caractere é @ ou se há uma menção em progresso
    const lastAtIndex = value.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const afterAt = value.substring(lastAtIndex + 1);
      if (!afterAt.includes(' ')) {
        setShowMentions(true);
        setMentionSearch(afterAt.toLowerCase());
        return;
      }
    }
    setShowMentions(false);
    setMentionSearch("");
  };

  // Inserir menção
  const insertMention = (name: string, isAll: boolean = false) => {
    const lastAtIndex = novaMensagem.lastIndexOf('@');
    const beforeAt = novaMensagem.substring(0, lastAtIndex);
    const mention = isAll ? "@todos" : `@${name}`;
    setNovaMensagem(beforeAt + mention + " ");
    setShowMentions(false);
    setMentionSearch("");
    inputRef.current?.focus();
  };

  // Usuários filtrados para menção
  const usuariosFiltrados = participantes.filter(p => 
    p.full_name?.toLowerCase().includes(mentionSearch)
  );

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

      // Adicionar membros selecionados
      if (selectedUsers.length > 0) {
        const membrosParaAdicionar = selectedUsers
          .filter(uid => uid !== userId)
          .map(uid => ({
            conversa_id: conversa.id,
            user_id: uid,
            adicionado_por: userId
          }));

        if (membrosParaAdicionar.length > 0) {
          await supabase.from("chat_participantes").insert(membrosParaAdicionar);
        }
      }

      toast({
        title: "Canal criado",
        description: `O canal "${novaConversaNome}" foi criado com sucesso`,
      });

      setNovaConversaNome("");
      setNovaConversaDescricao("");
      setSelectedUsers([]);
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

  // Adicionar membros à conversa existente
  const adicionarMembros = async () => {
    if (!conversaSelecionada || selectedUsers.length === 0 || !userId) return;

    try {
      const participantesAtuais = participantes.map(p => p.user_id);
      const novosMembros = selectedUsers
        .filter(uid => !participantesAtuais.includes(uid))
        .map(uid => ({
          conversa_id: conversaSelecionada,
          user_id: uid,
          adicionado_por: userId
        }));

      if (novosMembros.length > 0) {
        const { error } = await supabase.from("chat_participantes").insert(novosMembros);
        if (error) throw error;

        toast({
          title: "Membros adicionados",
          description: `${novosMembros.length} membro(s) adicionado(s) ao canal`,
        });

        queryClient.invalidateQueries({ queryKey: ["chat-participantes", conversaSelecionada] });
      }

      setSelectedUsers([]);
      setMembrosDialogOpen(false);
    } catch (error) {
      console.error("Erro ao adicionar membros:", error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar os membros",
        variant: "destructive",
      });
    }
  };

  // Remover membro
  const removerMembro = async (participanteId: string, participanteUserId: string) => {
    if (!conversaSelecionada) return;
    
    // Não permitir remover a si mesmo
    if (participanteUserId === userId) {
      toast({
        title: "Ação não permitida",
        description: "Você não pode se remover do canal",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("chat_participantes")
        .delete()
        .eq("id", participanteId);

      if (error) throw error;

      toast({
        title: "Membro removido",
        description: "O membro foi removido do canal",
      });

      queryClient.invalidateQueries({ queryKey: ["chat-participantes", conversaSelecionada] });
    } catch (error) {
      console.error("Erro ao remover membro:", error);
      toast({
        title: "Erro",
        description: "Não foi possível remover o membro",
        variant: "destructive",
      });
    }
  };

  const conversasFiltradas = conversas.filter(c => 
    c.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const conversaAtual = conversas.find(c => c.id === conversaSelecionada);
  const isCreator = conversaAtual?.criado_por === userId;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  // Renderizar conteúdo com menções destacadas
  const renderMensagemComMencoes = (conteudo: string) => {
    const parts = conteudo.split(/(@\w+)/g);
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        return (
          <span key={index} className="bg-primary/20 text-primary font-medium rounded px-1">
            {part}
          </span>
        );
      }
      return part;
    });
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
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Novo Canal</DialogTitle>
                  <DialogDescription>
                    Crie um novo canal e adicione membros
                  </DialogDescription>
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
                  <div>
                    <label className="text-sm font-medium mb-2 block">Adicionar Membros</label>
                    <ScrollArea className="h-48 border rounded-md p-2">
                      {todosUsuarios.filter(u => u.user_id !== userId).map((usuario) => (
                        <div 
                          key={usuario.user_id} 
                          className="flex items-center gap-2 py-2 hover:bg-muted rounded px-2"
                        >
                          <Checkbox
                            checked={selectedUsers.includes(usuario.user_id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedUsers([...selectedUsers, usuario.user_id]);
                              } else {
                                setSelectedUsers(selectedUsers.filter(id => id !== usuario.user_id));
                              }
                            }}
                          />
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {getInitials(usuario.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{usuario.full_name}</span>
                        </div>
                      ))}
                    </ScrollArea>
                    {selectedUsers.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {selectedUsers.length} membro(s) selecionado(s)
                      </p>
                    )}
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
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="gap-1">
                    <Users className="h-3 w-3" />
                    {participantes.length}
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <Shield className="h-3 w-3" />
                    Moderado
                  </Badge>
                  {/* Botão de gerenciar membros */}
                  <Dialog open={membrosDialogOpen} onOpenChange={setMembrosDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" title="Gerenciar Membros">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Gerenciar Membros</DialogTitle>
                        <DialogDescription>
                          Adicione ou remova membros do canal
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        {/* Lista de membros atuais */}
                        <div>
                          <label className="text-sm font-medium mb-2 block">
                            Membros Atuais ({participantes.length})
                          </label>
                          <ScrollArea className="h-32 border rounded-md">
                            {participantes.map((p) => (
                              <div 
                                key={p.id} 
                                className="flex items-center justify-between py-2 px-3 hover:bg-muted"
                              >
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-6 w-6">
                                    <AvatarFallback className="text-xs">
                                      {getInitials(p.full_name || "U")}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm">
                                    {p.full_name}
                                    {p.user_id === userId && " (você)"}
                                  </span>
                                </div>
                                {isCreator && p.user_id !== userId && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => removerMembro(p.id, p.user_id)}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            ))}
                          </ScrollArea>
                        </div>

                        {/* Adicionar novos membros */}
                        <div>
                          <label className="text-sm font-medium mb-2 block">
                            Adicionar Novos Membros
                          </label>
                          <ScrollArea className="h-40 border rounded-md p-2">
                            {todosUsuarios
                              .filter(u => !participantes.some(p => p.user_id === u.user_id))
                              .map((usuario) => (
                                <div 
                                  key={usuario.user_id} 
                                  className="flex items-center gap-2 py-2 hover:bg-muted rounded px-2"
                                >
                                  <Checkbox
                                    checked={selectedUsers.includes(usuario.user_id)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setSelectedUsers([...selectedUsers, usuario.user_id]);
                                      } else {
                                        setSelectedUsers(selectedUsers.filter(id => id !== usuario.user_id));
                                      }
                                    }}
                                  />
                                  <Avatar className="h-6 w-6">
                                    <AvatarFallback className="text-xs">
                                      {getInitials(usuario.full_name)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm">{usuario.full_name}</span>
                                </div>
                              ))}
                          </ScrollArea>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button 
                          onClick={adicionarMembros} 
                          disabled={selectedUsers.length === 0}
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          Adicionar ({selectedUsers.length})
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
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
                                {renderMensagemComMencoes(msg.conteudo)}
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
            <div className="p-4 relative">
              {/* Dropdown de menções */}
              {showMentions && (
                <div className="absolute bottom-full left-4 right-4 mb-2 bg-card border rounded-lg shadow-lg max-h-48 overflow-auto z-10">
                  <button
                    className="w-full text-left px-3 py-2 hover:bg-muted flex items-center gap-2"
                    onClick={() => insertMention("todos", true)}
                  >
                    <Users className="h-4 w-4" />
                    <span className="font-medium">@todos</span>
                    <span className="text-xs text-muted-foreground">
                      Mencionar todos os membros
                    </span>
                  </button>
                  <Separator />
                  {usuariosFiltrados.map((p) => (
                    <button
                      key={p.user_id}
                      className="w-full text-left px-3 py-2 hover:bg-muted flex items-center gap-2"
                      onClick={() => insertMention(p.full_name || "Usuário")}
                    >
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-xs">
                          {getInitials(p.full_name || "U")}
                        </AvatarFallback>
                      </Avatar>
                      <span>{p.full_name}</span>
                    </button>
                  ))}
                  {usuariosFiltrados.length === 0 && mentionSearch && (
                    <p className="text-sm text-muted-foreground px-3 py-2">
                      Nenhum membro encontrado
                    </p>
                  )}
                </div>
              )}
              
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={novaMensagem}
                  onChange={handleInputChange}
                  placeholder="Digite sua mensagem... (use @ para mencionar)"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && !showMentions) {
                      e.preventDefault();
                      enviarMensagem();
                    }
                    if (e.key === "Escape") {
                      setShowMentions(false);
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
                  Mensagens são moderadas automaticamente. Conteúdo ofensivo será bloqueado.
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
                <li>• Use @nome ou @todos para mencionar pessoas</li>
                <li>• Violações serão registradas e reportadas</li>
              </ul>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
