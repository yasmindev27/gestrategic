import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { useUserRole } from "@/hooks/useUserRole";
import { 
  Send, 
  MessageSquare, 
  Users, 
  Plus, 
  Loader2,
  Hash,
  Search,
  Shield,
  UserPlus,
  Settings,
  X,
  Trash2,
  User,
  Paperclip,
  FileText,
  Image,
  AlertTriangle
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
  arquivo_url?: string | null;
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
  const { isAdmin } = useUserRole();
  const [conversaSelecionada, setConversaSelecionada] = useState<string | null>(null);
  const [novaMensagem, setNovaMensagem] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [novaConversaNome, setNovaConversaNome] = useState("");
  const [novaConversaDescricao, setNovaConversaDescricao] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [privateChatDialogOpen, setPrivateChatDialogOpen] = useState(false);
  const [membrosDialogOpen, setMembrosDialogOpen] = useState(false);
  const [deleteConversaDialogOpen, setDeleteConversaDialogOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [enviando, setEnviando] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedPrivateUser, setSelectedPrivateUser] = useState<string | null>(null);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  // Buscar todos os usuários
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
        .order("updated_at", { ascending: false });

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
  });

  // Realtime para mensagens
  useEffect(() => {
    if (!conversaSelecionada) return;

    const channel = supabase
      .channel(`chat-${conversaSelecionada}`)
      .on(
        'postgres_changes',
        {
          event: '*',
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNovaMensagem(value);

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

  const insertMention = (name: string, isAll: boolean = false) => {
    const lastAtIndex = novaMensagem.lastIndexOf('@');
    const beforeAt = novaMensagem.substring(0, lastAtIndex);
    const mention = isAll ? "@todos" : `@${name}`;
    setNovaMensagem(beforeAt + mention + " ");
    setShowMentions(false);
    setMentionSearch("");
    inputRef.current?.focus();
  };

  const usuariosFiltrados = participantes.filter(p => 
    p.full_name?.toLowerCase().includes(mentionSearch)
  );

  // Enviar mensagem
  const enviarMensagem = useCallback(async () => {
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
  }, [novaMensagem, conversaSelecionada, userId, enviando, queryClient]);

  // Upload e envio de arquivo
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !conversaSelecionada || !userId) return;

    // Validar tamanho (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O tamanho máximo permitido é 10MB",
        variant: "destructive",
      });
      return;
    }

    setUploadingFile(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chat-anexos')
        .upload(fileName, file);

      if (uploadError) {
        // Se bucket não existe, criar
        if (uploadError.message.includes('not found')) {
          toast({
            title: "Configuração necessária",
            description: "O bucket de anexos precisa ser configurado pelo administrador",
            variant: "destructive",
          });
          return;
        }
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('chat-anexos')
        .getPublicUrl(fileName);

      // Enviar mensagem com arquivo
      const { data, error } = await supabase.functions.invoke("moderar-mensagem", {
        body: {
          conteudo: file.name,
          tipo: "arquivo",
          conversa_id: conversaSelecionada,
          arquivo_url: publicUrl
        }
      });

      if (error) throw error;

      if (!data.approved) {
        // Deletar arquivo se rejeitado
        await supabase.storage.from('chat-anexos').remove([fileName]);
        toast({
          title: "Arquivo bloqueado",
          description: data.reason,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Arquivo enviado",
        description: "Arquivo anexado com sucesso",
      });

      queryClient.invalidateQueries({ queryKey: ["chat-mensagens", conversaSelecionada] });
    } catch (error) {
      console.error("Erro ao enviar arquivo:", error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar o arquivo",
        variant: "destructive",
      });
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Criar canal de grupo
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

      await supabase.from("chat_participantes").insert({
        conversa_id: conversa.id,
        user_id: userId
      });

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

      toast({ title: "Canal criado", description: `O canal "${novaConversaNome}" foi criado` });

      setNovaConversaNome("");
      setNovaConversaDescricao("");
      setSelectedUsers([]);
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["chat-conversas"] });
    } catch (error) {
      console.error("Erro ao criar conversa:", error);
      toast({ title: "Erro", description: "Não foi possível criar o canal", variant: "destructive" });
    }
  };

  // Criar chat privado
  const criarChatPrivado = async () => {
    if (!selectedPrivateUser || !userId) return;

    try {
      // Verificar se já existe chat privado com esse usuário
      const { data: minhasConversas } = await supabase
        .from("chat_participantes")
        .select("conversa_id")
        .eq("user_id", userId);

      if (minhasConversas) {
        for (const conv of minhasConversas) {
          const { data: outroParticipante } = await supabase
            .from("chat_participantes")
            .select("user_id")
            .eq("conversa_id", conv.conversa_id)
            .eq("user_id", selectedPrivateUser)
            .single();

          if (outroParticipante) {
            const { data: conversaExistente } = await supabase
              .from("chat_conversas")
              .select("*")
              .eq("id", conv.conversa_id)
              .eq("tipo", "privado")
              .single();

            if (conversaExistente) {
              toast({ title: "Chat já existe", description: "Abrindo conversa existente" });
              setConversaSelecionada(conversaExistente.id);
              setPrivateChatDialogOpen(false);
              setSelectedPrivateUser(null);
              return;
            }
          }
        }
      }

      const outroUsuario = todosUsuarios.find(u => u.user_id === selectedPrivateUser);
      const nomeConversa = `Chat com ${outroUsuario?.full_name || 'Usuário'}`;

      const { data: conversa, error } = await supabase
        .from("chat_conversas")
        .insert({
          nome: nomeConversa,
          tipo: "privado",
          criado_por: userId
        })
        .select()
        .single();

      if (error) throw error;

      await supabase.from("chat_participantes").insert([
        { conversa_id: conversa.id, user_id: userId },
        { conversa_id: conversa.id, user_id: selectedPrivateUser, adicionado_por: userId }
      ]);

      toast({ title: "Chat privado criado", description: `Conversa com ${outroUsuario?.full_name} iniciada` });

      setSelectedPrivateUser(null);
      setPrivateChatDialogOpen(false);
      setConversaSelecionada(conversa.id);
      queryClient.invalidateQueries({ queryKey: ["chat-conversas"] });
    } catch (error) {
      console.error("Erro ao criar chat privado:", error);
      toast({ title: "Erro", description: "Não foi possível criar o chat privado", variant: "destructive" });
    }
  };

  // Adicionar membros
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

        toast({ title: "Membros adicionados", description: `${novosMembros.length} membro(s) adicionado(s)` });
        queryClient.invalidateQueries({ queryKey: ["chat-participantes", conversaSelecionada] });
      }

      setSelectedUsers([]);
      setMembrosDialogOpen(false);
    } catch (error) {
      console.error("Erro ao adicionar membros:", error);
      toast({ title: "Erro", description: "Não foi possível adicionar os membros", variant: "destructive" });
    }
  };

  // Remover membro
  const removerMembro = async (participanteId: string, participanteUserId: string) => {
    if (!conversaSelecionada) return;
    
    if (participanteUserId === userId && !isAdmin) {
      toast({ title: "Ação não permitida", description: "Você não pode se remover do canal", variant: "destructive" });
      return;
    }

    try {
      const { error } = await supabase.from("chat_participantes").delete().eq("id", participanteId);
      if (error) throw error;

      toast({ title: "Membro removido" });
      queryClient.invalidateQueries({ queryKey: ["chat-participantes", conversaSelecionada] });
    } catch (error) {
      console.error("Erro ao remover membro:", error);
      toast({ title: "Erro", description: "Não foi possível remover o membro", variant: "destructive" });
    }
  };

  // Excluir mensagem (admin only)
  const excluirMensagem = async (mensagemId: string) => {
    if (!isAdmin) return;

    try {
      const { error } = await supabase
        .from("chat_mensagens")
        .update({ excluido: true })
        .eq("id", mensagemId);

      if (error) throw error;

      toast({ title: "Mensagem excluída" });
      queryClient.invalidateQueries({ queryKey: ["chat-mensagens", conversaSelecionada] });
    } catch (error) {
      console.error("Erro ao excluir mensagem:", error);
      toast({ title: "Erro", description: "Não foi possível excluir a mensagem", variant: "destructive" });
    }
  };

  // Excluir conversa (admin only)
  const excluirConversa = async () => {
    if (!isAdmin || !conversaSelecionada) return;

    try {
      // Primeiro excluir mensagens
      await supabase.from("chat_mensagens").delete().eq("conversa_id", conversaSelecionada);
      
      // Depois participantes
      await supabase.from("chat_participantes").delete().eq("conversa_id", conversaSelecionada);
      
      // Por fim a conversa
      const { error } = await supabase.from("chat_conversas").delete().eq("id", conversaSelecionada);
      if (error) throw error;

      toast({ title: "Conversa excluída" });
      setConversaSelecionada(null);
      setDeleteConversaDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["chat-conversas"] });
    } catch (error) {
      console.error("Erro ao excluir conversa:", error);
      toast({ title: "Erro", description: "Não foi possível excluir a conversa", variant: "destructive" });
    }
  };

  const conversasFiltradas = conversas.filter(c => 
    c.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const conversaAtual = conversas.find(c => c.id === conversaSelecionada);
  const isCreator = conversaAtual?.criado_por === userId;
  const canManage = isCreator || isAdmin;

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
  };

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

  const getFileIcon = (url: string) => {
    const ext = url.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
      return <Image className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  return (
    <div className="flex h-[calc(100vh-200px)] gap-4">
      {/* Lista de Conversas */}
      <Card className="w-80 flex flex-col">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Chat
            </CardTitle>
            <div className="flex gap-1">
              {/* Novo Chat Privado */}
              <Dialog open={privateChatDialogOpen} onOpenChange={setPrivateChatDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" title="Novo Chat Privado">
                    <User className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Novo Chat Privado</DialogTitle>
                    <DialogDescription>Selecione um usuário para iniciar uma conversa</DialogDescription>
                  </DialogHeader>
                  <ScrollArea className="h-64 border rounded-md p-2">
                    {todosUsuarios.filter(u => u.user_id !== userId).map((usuario) => (
                      <button
                        key={usuario.user_id}
                        onClick={() => setSelectedPrivateUser(usuario.user_id)}
                        className={`w-full text-left flex items-center gap-2 p-2 rounded-md transition-colors ${
                          selectedPrivateUser === usuario.user_id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                        }`}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">{getInitials(usuario.full_name)}</AvatarFallback>
                        </Avatar>
                        <span>{usuario.full_name}</span>
                      </button>
                    ))}
                  </ScrollArea>
                  <DialogFooter>
                    <Button onClick={criarChatPrivado} disabled={!selectedPrivateUser}>
                      Iniciar Conversa
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Novo Canal */}
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" title="Novo Canal">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Novo Canal</DialogTitle>
                    <DialogDescription>Crie um canal e adicione membros</DialogDescription>
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
                          <div key={usuario.user_id} className="flex items-center gap-2 py-2 hover:bg-muted rounded px-2">
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
                              <AvatarFallback className="text-xs">{getInitials(usuario.full_name)}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{usuario.full_name}</span>
                          </div>
                        ))}
                      </ScrollArea>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={criarConversa} disabled={!novaConversaNome.trim()}>Criar Canal</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
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
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma conversa</p>
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
                      {conversa.tipo === "privado" ? (
                        <User className="h-4 w-4" />
                      ) : (
                        <Hash className="h-4 w-4" />
                      )}
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
                    {conversaAtual?.tipo === "privado" ? <User className="h-5 w-5" /> : <Hash className="h-5 w-5" />}
                    {conversaAtual?.nome}
                  </CardTitle>
                  {conversaAtual?.descricao && (
                    <p className="text-sm text-muted-foreground">{conversaAtual.descricao}</p>
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
                  
                  {/* Gerenciar membros (apenas para canais de grupo) */}
                  {conversaAtual?.tipo === "grupo" && (
                    <Dialog open={membrosDialogOpen} onOpenChange={setMembrosDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" title="Gerenciar Membros">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Gerenciar Membros</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div>
                            <label className="text-sm font-medium mb-2 block">Membros Atuais ({participantes.length})</label>
                            <ScrollArea className="h-32 border rounded-md">
                              {participantes.map((p) => (
                                <div key={p.id} className="flex items-center justify-between py-2 px-3 hover:bg-muted">
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6">
                                      <AvatarFallback className="text-xs">{getInitials(p.full_name || "U")}</AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm">
                                      {p.full_name}
                                      {p.user_id === userId && " (você)"}
                                    </span>
                                  </div>
                                  {canManage && p.user_id !== userId && (
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removerMembro(p.id, p.user_id)}>
                                      <X className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </ScrollArea>
                          </div>

                          <div>
                            <label className="text-sm font-medium mb-2 block">Adicionar Novos Membros</label>
                            <ScrollArea className="h-40 border rounded-md p-2">
                              {todosUsuarios
                                .filter(u => !participantes.some(p => p.user_id === u.user_id))
                                .map((usuario) => (
                                  <div key={usuario.user_id} className="flex items-center gap-2 py-2 hover:bg-muted rounded px-2">
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
                                      <AvatarFallback className="text-xs">{getInitials(usuario.full_name)}</AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm">{usuario.full_name}</span>
                                  </div>
                                ))}
                            </ScrollArea>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button onClick={adicionarMembros} disabled={selectedUsers.length === 0}>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Adicionar ({selectedUsers.length})
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}

                  {/* Excluir conversa (admin only) */}
                  {isAdmin && conversaSelecionada !== CANAL_GERAL_ID && (
                    <Dialog open={deleteConversaDialogOpen} onOpenChange={setDeleteConversaDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" title="Excluir Conversa" className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-destructive" />
                            Excluir Conversa
                          </DialogTitle>
                          <DialogDescription>
                            Esta ação não pode ser desfeita. Todas as mensagens serão excluídas permanentemente.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setDeleteConversaDialogOpen(false)}>Cancelar</Button>
                          <Button variant="destructive" onClick={excluirConversa}>Excluir</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
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
                      const showAvatar = index === 0 || mensagens[index - 1].remetente_id !== msg.remetente_id;
                      
                      return (
                        <div key={msg.id} className={`flex gap-3 group ${isOwn ? "flex-row-reverse" : ""}`}>
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
                            <div className={`rounded-lg px-3 py-2 max-w-md relative ${
                              isOwn ? "bg-primary text-primary-foreground" : "bg-muted"
                            }`}>
                              {msg.tipo === "arquivo" && msg.arquivo_url ? (
                                <a 
                                  href={msg.arquivo_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 hover:underline"
                                >
                                  {getFileIcon(msg.arquivo_url)}
                                  <span className="text-sm">{msg.conteudo}</span>
                                </a>
                              ) : (
                                <p className="text-sm whitespace-pre-wrap break-words">
                                  {renderMensagemComMencoes(msg.conteudo)}
                                </p>
                              )}
                              
                              {/* Botão excluir para admin */}
                              {isAdmin && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5 absolute -right-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-destructive"
                                  onClick={() => excluirMensagem(msg.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
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
                    <span className="text-xs text-muted-foreground">Mencionar todos</span>
                  </button>
                  <Separator />
                  {usuariosFiltrados.map((p) => (
                    <button
                      key={p.user_id}
                      className="w-full text-left px-3 py-2 hover:bg-muted flex items-center gap-2"
                      onClick={() => insertMention(p.full_name || "Usuário")}
                    >
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-xs">{getInitials(p.full_name || "U")}</AvatarFallback>
                      </Avatar>
                      <span>{p.full_name}</span>
                    </button>
                  ))}
                </div>
              )}
              
              <div className="flex gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif,.webp"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFile}
                  title="Anexar arquivo"
                >
                  {uploadingFile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                </Button>
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
                <Button onClick={enviarMensagem} disabled={!novaMensagem.trim() || enviando}>
                  {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Selecione uma conversa</p>
              <p className="text-sm">Escolha um canal ou inicie um chat privado</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
