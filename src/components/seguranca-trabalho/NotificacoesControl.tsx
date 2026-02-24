import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Bell, Eye, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface Notificacao {
  id: string;
  ronda_id: string | null;
  tipo_notificacao: string;
  descricao: string;
  setor: string;
  responsavel_notificado: string | null;
  prioridade: string;
  status: string;
  resolvido_em: string | null;
  resolvido_por_nome: string | null;
  created_at: string;
}

export function NotificacoesControl() {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedNotificacao, setSelectedNotificacao] = useState<Notificacao | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data, error } = await supabase
        .from("notificacoes_seguranca")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotificacoes(data || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as notificações.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja excluir esta notificação?")) return;
    
    try {
      const { error } = await supabase
        .from("notificacoes_seguranca")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast({ title: "Sucesso", description: "Notificação excluída!" });
      fetchData();
    } catch (error) {
      console.error("Erro ao excluir:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir.",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pendente: "destructive",
      em_andamento: "outline",
      resolvida: "default"
    };
    const labels: Record<string, string> = {
      pendente: "Pendente",
      em_andamento: "Em Andamento",
      resolvida: "Resolvida"
    };
    return <Badge variant={variants[status] || "default"}>{labels[status] || status}</Badge>;
  };

  const getPrioridadeBadge = (prioridade: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      baixa: "secondary",
      media: "outline",
      alta: "default",
      critica: "destructive"
    };
    const labels: Record<string, string> = {
      baixa: "Baixa",
      media: "Média",
      alta: "Alta",
      critica: "Crítica"
    };
    return <Badge variant={variants[prioridade] || "outline"}>{labels[prioridade] || prioridade}</Badge>;
  };

  const filteredNotificacoes = notificacoes.filter(n => {
    if (filterStatus === "todos") return true;
    return n.status === filterStatus;
  });

  const stats = {
    pendentes: notificacoes.filter(n => n.status === "pendente").length,
    emAndamento: notificacoes.filter(n => n.status === "em_andamento").length,
    resolvidas: notificacoes.filter(n => n.status === "resolvida").length
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-600">{stats.pendentes}</div>
            <div className="text-sm text-red-600">Pendentes</div>
          </CardContent>
        </Card>
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.emAndamento}</div>
            <div className="text-sm text-yellow-600">Em Andamento</div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{stats.resolvidas}</div>
            <div className="text-sm text-green-600">Resolvidas</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notificações de Segurança
          </CardTitle>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="pendente">Pendentes</SelectItem>
              <SelectItem value="em_andamento">Em Andamento</SelectItem>
              <SelectItem value="resolvida">Resolvidas</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {filteredNotificacoes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma notificação encontrada.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Setor</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredNotificacoes.map((notificacao) => (
                    <TableRow key={notificacao.id}>
                      <TableCell>
                        {format(new Date(notificacao.created_at), "dd/MM/yyyy HH:mm")}
                      </TableCell>
                      <TableCell className="font-medium">{notificacao.tipo_notificacao}</TableCell>
                      <TableCell>{notificacao.setor}</TableCell>
                      <TableCell>{getPrioridadeBadge(notificacao.prioridade)}</TableCell>
                      <TableCell>{getStatusBadge(notificacao.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setSelectedNotificacao(notificacao);
                              setViewDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDelete(notificacao.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes da Notificação</DialogTitle>
          </DialogHeader>
          {selectedNotificacao && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Data:</span>{" "}
                  {format(new Date(selectedNotificacao.created_at), "dd/MM/yyyy HH:mm")}
                </div>
                <div>
                  <span className="font-medium">Setor:</span>{" "}
                  {selectedNotificacao.setor}
                </div>
                <div>
                  <span className="font-medium">Tipo:</span>{" "}
                  {selectedNotificacao.tipo_notificacao}
                </div>
                <div>
                  <span className="font-medium">Prioridade:</span>{" "}
                  {getPrioridadeBadge(selectedNotificacao.prioridade)}
                </div>
              </div>
              <div>
                <span className="font-medium">Status:</span>{" "}
                {getStatusBadge(selectedNotificacao.status)}
              </div>
              {selectedNotificacao.responsavel_notificado && (
                <div>
                  <span className="font-medium">Responsável:</span>{" "}
                  {selectedNotificacao.responsavel_notificado}
                </div>
              )}
              <div>
                <span className="font-medium">Descrição:</span>
                <p className="mt-1 p-3 bg-muted rounded-lg text-sm">
                  {selectedNotificacao.descricao}
                </p>
              </div>
              {selectedNotificacao.resolvido_em && (
                <div className="pt-2 border-t">
                  <span className="font-medium text-green-600">Resolvida em:</span>{" "}
                  {format(new Date(selectedNotificacao.resolvido_em), "dd/MM/yyyy HH:mm")}
                  {selectedNotificacao.resolvido_por_nome && (
                    <span className="ml-2">por {selectedNotificacao.resolvido_por_nome}</span>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
