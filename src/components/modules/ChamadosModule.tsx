import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useLogAccess } from "@/hooks/useLogAccess";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { 
  Ticket, 
  Plus, 
  Search,
  Loader2,
  BarChart3,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  MessageSquare,
  Eye,
  LayoutDashboard,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChamadosDashboard } from "@/components/chamados";

interface ChamadosModuleProps {
  setor: 'ti' | 'manutencao' | 'engenharia_clinica';
}

interface Chamado {
  id: string;
  numero_chamado: string;
  titulo: string;
  descricao: string;
  categoria: string;
  prioridade: string;
  status: string;
  solicitante_id: string;
  solicitante_nome: string;
  solicitante_setor: string | null;
  atribuido_para: string | null;
  data_abertura: string;
  data_resolucao: string | null;
  solucao: string | null;
}

interface Comentario {
  id: string;
  chamado_id: string;
  usuario_id: string;
  usuario_nome: string;
  comentario: string;
  created_at: string;
}

const setorLabels: Record<string, string> = {
  ti: "TI",
  manutencao: "Manutenção",
  engenharia_clinica: "Engenharia Clínica",
};

const prioridadeColors: Record<string, string> = {
  baixa: "bg-green-500 text-white",
  media: "bg-yellow-500 text-black",
  alta: "bg-orange-500 text-white",
  urgente: "bg-red-500 text-white",
};

const statusColors: Record<string, string> = {
  aberto: "bg-blue-500 text-white",
  em_andamento: "bg-yellow-500 text-black",
  pendente: "bg-orange-500 text-white",
  resolvido: "bg-green-500 text-white",
  cancelado: "bg-gray-500 text-white",
};

const statusLabels: Record<string, string> = {
  aberto: "Aberto",
  em_andamento: "Em Andamento",
  pendente: "Pendente",
  resolvido: "Resolvido",
  cancelado: "Cancelado",
};

export const ChamadosModule = ({ setor }: ChamadosModuleProps) => {
  const { role } = useUserRole();
  const { logAction } = useLogAccess();
  const { toast } = useToast();
  
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  
  const [createDialog, setCreateDialog] = useState(false);
  const [detailsDialog, setDetailsDialog] = useState(false);
  const [selectedChamado, setSelectedChamado] = useState<Chamado | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [chamadoForm, setChamadoForm] = useState({
    titulo: "",
    descricao: "",
    prioridade: "media",
  });

  const [novoComentario, setNovoComentario] = useState("");
  const [novoStatus, setNovoStatus] = useState("");
  const [solucao, setSolucao] = useState("");

  const isResponsavel = role === 'admin' || role === setor;

  useEffect(() => {
    fetchChamados();
    logAction("acesso", `chamados_${setor}`);
  }, [setor]);

  const fetchChamados = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("chamados")
        .select("*")
        .eq("categoria", setor)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setChamados(data || []);
    } catch (error) {
      console.error("Error fetching chamados:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar chamados.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchComentarios = async (chamadoId: string) => {
    try {
      const { data, error } = await supabase
        .from("chamados_comentarios")
        .select("*")
        .eq("chamado_id", chamadoId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setComentarios(data || []);
    } catch (error) {
      console.error("Error fetching comentarios:", error);
    }
  };

  const handleCreateChamado = async () => {
    if (!chamadoForm.titulo || !chamadoForm.descricao) {
      toast({
        title: "Erro",
        description: "Título e descrição são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, setor")
        .eq("user_id", user?.id)
        .single();
      
      // Gerar número do chamado
      const numeroChamado = `CH-${setor.toUpperCase()}-${Date.now()}`;
      
      const { error } = await supabase
        .from("chamados")
        .insert({
          numero_chamado: numeroChamado,
          titulo: chamadoForm.titulo,
          descricao: chamadoForm.descricao,
          prioridade: chamadoForm.prioridade,
          categoria: setor,
          solicitante_id: user?.id,
          solicitante_nome: profile?.full_name || user?.email || "Usuário",
          solicitante_setor: profile?.setor,
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Chamado aberto com sucesso.",
      });

      await logAction("abrir_chamado", `chamados_${setor}`, { titulo: chamadoForm.titulo });
      
      setCreateDialog(false);
      setChamadoForm({ titulo: "", descricao: "", prioridade: "media" });
      fetchChamados();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Erro",
        description: "Erro ao abrir chamado.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddComentario = async () => {
    if (!novoComentario.trim() || !selectedChamado) return;

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user?.id)
        .single();
      
      const { error } = await supabase
        .from("chamados_comentarios")
        .insert({
          chamado_id: selectedChamado.id,
          usuario_id: user?.id!,
          usuario_nome: profile?.full_name || user?.email || "Usuário",
          comentario: novoComentario,
        });

      if (error) throw error;

      setNovoComentario("");
      fetchComentarios(selectedChamado.id);
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar comentário.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!novoStatus || !selectedChamado) return;

    setIsSubmitting(true);
    try {
      const updateData: Record<string, unknown> = { status: novoStatus };
      
      if (novoStatus === 'resolvido') {
        updateData.data_resolucao = new Date().toISOString();
        updateData.solucao = solucao;
      }

      const { error } = await supabase
        .from("chamados")
        .update(updateData)
        .eq("id", selectedChamado.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Status atualizado com sucesso.",
      });

      await logAction("atualizar_chamado", `chamados_${setor}`, { 
        chamado: selectedChamado.numero_chamado,
        status: novoStatus,
      });

      setDetailsDialog(false);
      setSelectedChamado(null);
      setNovoStatus("");
      setSolucao("");
      fetchChamados();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar status.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDetails = (chamado: Chamado) => {
    setSelectedChamado(chamado);
    setNovoStatus(chamado.status);
    setSolucao(chamado.solucao || "");
    fetchComentarios(chamado.id);
    setDetailsDialog(true);
  };

  const filteredChamados = chamados.filter(c => {
    const matchesSearch = c.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.numero_chamado.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "todos" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: chamados.length,
    abertos: chamados.filter(c => c.status === 'aberto').length,
    emAndamento: chamados.filter(c => c.status === 'em_andamento').length,
    resolvidos: chamados.filter(c => c.status === 'resolvido').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Chamados - {setorLabels[setor]}</h2>
          <p className="text-muted-foreground">Central de atendimento e suporte</p>
        </div>
        <Button onClick={() => setCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Chamado
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Ticket className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total de chamados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <Clock className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.abertos}</p>
                <p className="text-sm text-muted-foreground">Abertos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-500/10 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.emAndamento}</p>
                <p className="text-sm text-muted-foreground">Em andamento</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.resolvidos}</p>
                <p className="text-sm text-muted-foreground">Resolvidos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="chamados">
        <TabsList>
          <TabsTrigger value="chamados">
            <Ticket className="h-4 w-4 mr-2" />
            Chamados
          </TabsTrigger>
          <TabsTrigger value="dashboard">
            <BarChart3 className="h-4 w-4 mr-2" />
            Dashboard Simples
          </TabsTrigger>
          <TabsTrigger value="analitico">
            <LayoutDashboard className="h-4 w-4 mr-2" />
            Dashboard Analítico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chamados" className="space-y-4 mt-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por título ou número..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filtrar por status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="aberto">Abertos</SelectItem>
                    <SelectItem value="em_andamento">Em Andamento</SelectItem>
                    <SelectItem value="pendente">Pendentes</SelectItem>
                    <SelectItem value="resolvido">Resolvidos</SelectItem>
                    <SelectItem value="cancelado">Cancelados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Lista de Chamados</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredChamados.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum chamado encontrado.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Título</TableHead>
                      <TableHead>Solicitante</TableHead>
                      <TableHead>Prioridade</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Abertura</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredChamados.map((chamado) => (
                      <TableRow key={chamado.id}>
                        <TableCell className="font-mono">{chamado.numero_chamado}</TableCell>
                        <TableCell className="font-medium max-w-xs truncate">{chamado.titulo}</TableCell>
                        <TableCell>{chamado.solicitante_nome}</TableCell>
                        <TableCell>
                          <Badge className={prioridadeColors[chamado.prioridade]}>
                            {chamado.prioridade.charAt(0).toUpperCase() + chamado.prioridade.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[chamado.status]}>
                            {statusLabels[chamado.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(chamado.data_abertura), "dd/MM/yy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => openDetails(chamado)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dashboard" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Dashboard de Chamados</CardTitle>
              <CardDescription>Visão geral dos chamados</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-4">Por Prioridade</h4>
                  {['urgente', 'alta', 'media', 'baixa'].map(prioridade => {
                    const count = chamados.filter(c => c.prioridade === prioridade).length;
                    return (
                      <div key={prioridade} className="flex justify-between items-center p-2 border-b">
                        <Badge className={prioridadeColors[prioridade]}>
                          {prioridade.charAt(0).toUpperCase() + prioridade.slice(1)}
                        </Badge>
                        <span className="font-bold">{count}</span>
                      </div>
                    );
                  })}
                </div>
                <div>
                  <h4 className="font-semibold mb-4">Por Status</h4>
                  {Object.entries(statusLabels).map(([status, label]) => {
                    const count = chamados.filter(c => c.status === status).length;
                    return (
                      <div key={status} className="flex justify-between items-center p-2 border-b">
                        <Badge className={statusColors[status]}>{label}</Badge>
                        <span className="font-bold">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analitico" className="mt-4">
          <ChamadosDashboard />
        </TabsContent>
      </Tabs>

      {/* Create Chamado Dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Chamado</DialogTitle>
            <DialogDescription>Abra um novo chamado para {setorLabels[setor]}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input
                value={chamadoForm.titulo}
                onChange={(e) => setChamadoForm({ ...chamadoForm, titulo: e.target.value })}
                placeholder="Resumo do problema"
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Textarea
                value={chamadoForm.descricao}
                onChange={(e) => setChamadoForm({ ...chamadoForm, descricao: e.target.value })}
                placeholder="Descreva o problema em detalhes"
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select 
                value={chamadoForm.prioridade}
                onValueChange={(v) => setChamadoForm({ ...chamadoForm, prioridade: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateChamado} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Abrir Chamado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={detailsDialog} onOpenChange={setDetailsDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chamado {selectedChamado?.numero_chamado}</DialogTitle>
          </DialogHeader>
          {selectedChamado && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="mt-1">
                    <Badge className={statusColors[selectedChamado.status]}>
                      {statusLabels[selectedChamado.status]}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Prioridade</Label>
                  <div className="mt-1">
                    <Badge className={prioridadeColors[selectedChamado.prioridade]}>
                      {selectedChamado.prioridade.charAt(0).toUpperCase() + selectedChamado.prioridade.slice(1)}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div>
                <Label className="text-muted-foreground">Título</Label>
                <p className="font-medium">{selectedChamado.titulo}</p>
              </div>
              
              <div>
                <Label className="text-muted-foreground">Descrição</Label>
                <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded">{selectedChamado.descricao}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Solicitante</Label>
                  <p>{selectedChamado.solicitante_nome}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Setor</Label>
                  <p>{selectedChamado.solicitante_setor || "-"}</p>
                </div>
              </div>

              {selectedChamado.solucao && (
                <div>
                  <Label className="text-muted-foreground">Solução</Label>
                  <p className="text-sm whitespace-pre-wrap bg-green-50 p-3 rounded border border-green-200">
                    {selectedChamado.solucao}
                  </p>
                </div>
              )}

              {/* Comentários */}
              <div>
                <Label className="text-muted-foreground flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Comentários
                </Label>
                <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                  {comentarios.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum comentário.</p>
                  ) : (
                    comentarios.map((c) => (
                      <div key={c.id} className="bg-muted p-2 rounded text-sm">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span className="font-medium">{c.usuario_nome}</span>
                          <span>{format(new Date(c.created_at), "dd/MM HH:mm")}</span>
                        </div>
                        <p>{c.comentario}</p>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="Adicionar comentário..."
                    value={novoComentario}
                    onChange={(e) => setNovoComentario(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddComentario()}
                  />
                  <Button size="sm" onClick={handleAddComentario} disabled={isSubmitting}>
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Atualizar Status (apenas para responsáveis) */}
              {isResponsavel && selectedChamado.status !== 'resolvido' && selectedChamado.status !== 'cancelado' && (
                <div className="border-t pt-4">
                  <Label>Atualizar Status</Label>
                  <div className="flex gap-2 mt-2">
                    <Select value={novoStatus} onValueChange={setNovoStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aberto">Aberto</SelectItem>
                        <SelectItem value="em_andamento">Em Andamento</SelectItem>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="resolvido">Resolvido</SelectItem>
                        <SelectItem value="cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {novoStatus === 'resolvido' && (
                    <div className="mt-2">
                      <Label>Solução</Label>
                      <Textarea
                        value={solucao}
                        onChange={(e) => setSolucao(e.target.value)}
                        placeholder="Descreva a solução aplicada"
                        rows={3}
                      />
                    </div>
                  )}
                  <Button 
                    className="mt-2" 
                    onClick={handleUpdateStatus} 
                    disabled={isSubmitting || novoStatus === selectedChamado.status}
                  >
                    {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Atualizar
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
