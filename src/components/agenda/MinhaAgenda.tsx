import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, CheckCircle2, Clock, Calendar, FileText, Users2, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ItemDetailsDialog } from "./ItemDetailsDialog";

interface AgendaItem {
  id: string;
  tipo: string;
  titulo: string;
  descricao: string | null;
  data_inicio: string;
  data_fim: string | null;
  hora: string | null;
  prioridade: string;
  status: string;
  criado_por: string;
  created_at: string;
  criador_nome?: string;
}

const tipoIcons: Record<string, React.ReactNode> = {
  tarefa: <CheckCircle2 className="h-4 w-4" />,
  reuniao: <Users2 className="h-4 w-4" />,
  anotacao: <FileText className="h-4 w-4" />,
};

const tipoLabels: Record<string, string> = {
  tarefa: "Tarefa",
  reuniao: "Reunião",
  anotacao: "Anotação",
};

const statusColors: Record<string, string> = {
  pendente: "bg-orange-500 text-white",
  em_andamento: "bg-blue-500 text-white",
  concluida: "bg-green-500 text-white",
  cancelada: "bg-gray-500 text-white",
};

const statusLabels: Record<string, string> = {
  pendente: "Pendente",
  em_andamento: "Em Andamento",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

const prioridadeColors: Record<string, string> = {
  baixa: "bg-gray-200 text-gray-700",
  media: "bg-yellow-200 text-yellow-800",
  alta: "bg-orange-200 text-orange-800",
  urgente: "bg-red-500 text-white",
};

export const MinhaAgenda = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterTipo, setFilterTipo] = useState<string>("all");
  const [selectedItem, setSelectedItem] = useState<AgendaItem | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      // Get user's agenda items (items they created or are destinatários of)
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Fetch items where user is destinatário
      const { data: destinatarios, error: destError } = await supabase
        .from("agenda_destinatarios")
        .select("agenda_item_id")
        .eq("usuario_id", user.user.id);

      if (destError) throw destError;

      const itemIds = destinatarios?.map(d => d.agenda_item_id) || [];

      // Fetch all relevant items
      let query = supabase
        .from("agenda_items")
        .select("*")
        .order("data_inicio", { ascending: true });

      if (itemIds.length > 0) {
        query = query.or(`criado_por.eq.${user.user.id},id.in.(${itemIds.join(",")})`);
      } else {
        query = query.eq("criado_por", user.user.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch creator names
      if (data && data.length > 0) {
        const creatorIds = [...new Set(data.map(item => item.criado_por))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", creatorIds);

        const itemsWithNames = data.map(item => ({
          ...item,
          criador_nome: profiles?.find(p => p.user_id === item.criado_por)?.full_name || "Desconhecido"
        }));

        setItems(itemsWithNames);
      } else {
        setItems([]);
      }
    } catch (error) {
      console.error("Error fetching items:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar agenda.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (itemId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("agenda_items")
        .update({ status: newStatus })
        .eq("id", itemId);

      if (error) throw error;

      toast({ title: "Sucesso", description: "Status atualizado!" });
      fetchItems();
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar status.",
        variant: "destructive",
      });
    }
  };

  const filteredItems = items.filter(item => {
    if (filterStatus !== "all" && item.status !== filterStatus) return false;
    if (filterTipo !== "all" && item.tipo !== filterTipo) return false;
    return true;
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Minha Agenda
          </CardTitle>
          <div className="flex gap-2">
            <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="tarefa">Tarefas</SelectItem>
                <SelectItem value="reuniao">Reuniões</SelectItem>
                <SelectItem value="anotacao">Anotações</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="em_andamento">Em Andamento</SelectItem>
                <SelectItem value="concluida">Concluída</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum item na sua agenda.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criado por</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {tipoIcons[item.tipo]}
                      <span className="text-sm">{tipoLabels[item.tipo]}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{item.titulo}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <Clock className="h-3 w-3" />
                      {format(new Date(item.data_inicio), "dd/MM/yy", { locale: ptBR })}
                      {item.hora && ` ${item.hora}`}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={prioridadeColors[item.prioridade]}>
                      {item.prioridade}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={item.status}
                      onValueChange={(value) => handleUpdateStatus(item.id, value)}
                    >
                      <SelectTrigger className="w-32 h-8">
                        <Badge className={statusColors[item.status]}>
                          {statusLabels[item.status]}
                        </Badge>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="em_andamento">Em Andamento</SelectItem>
                        <SelectItem value="concluida">Concluída</SelectItem>
                        <SelectItem value="cancelada">Cancelada</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.criador_nome}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedItem(item);
                        setDetailsOpen(true);
                      }}
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

      <ItemDetailsDialog
        item={selectedItem}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
    </Card>
  );
};
