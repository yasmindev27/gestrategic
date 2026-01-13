import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Loader2, Users, Search, Calendar, ClipboardList, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { NovoItemDialog } from "./NovoItemDialog";

interface Colaborador {
  user_id: string;
  full_name: string;
  cargo: string | null;
  setor: string | null;
}

interface AgendaItem {
  id: string;
  tipo: string;
  titulo: string;
  data_inicio: string;
  status: string;
  prioridade: string;
}

interface Props {
  onAtribuirTarefa?: () => void;
}

const statusLabels: Record<string, string> = {
  pendente: "Pendente",
  em_andamento: "Em Andamento",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

const statusColors: Record<string, string> = {
  pendente: "bg-orange-500 text-white",
  em_andamento: "bg-blue-500 text-white",
  concluida: "bg-green-500 text-white",
  cancelada: "bg-gray-500 text-white",
};

export const AgendaColaboradores = ({ onAtribuirTarefa }: Props) => {
  const { toast } = useToast();
  const { userId, isAdmin, canViewAgendaColaboradores, canAtribuirTarefas } = useUserRole();
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [colaboradorItems, setColaboradorItems] = useState<Record<string, AgendaItem[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedColaborador, setSelectedColaborador] = useState<Colaborador | null>(null);
  const [novoItemDialogOpen, setNovoItemDialogOpen] = useState(false);

  useEffect(() => {
    if (canViewAgendaColaboradores) {
      fetchColaboradores();
    }
  }, [userId, isAdmin, canViewAgendaColaboradores]);

  const fetchColaboradores = async () => {
    setIsLoading(true);
    try {
      let colaboradoresList: Colaborador[] = [];

      if (isAdmin) {
        // Admin sees all users
        const { data, error } = await supabase
          .from("profiles")
          .select("user_id, full_name, cargo, setor")
          .order("full_name");

        if (error) throw error;
        colaboradoresList = data || [];
      } else {
        // Gestor sees only users under their management
        const { data, error } = await supabase.rpc("get_usuarios_sob_gestao", {
          _gestor_id: userId
        });

        if (error) throw error;
        colaboradoresList = data || [];
      }

      setColaboradores(colaboradoresList);

      // Fetch agenda items for each colaborador
      const itemsMap: Record<string, AgendaItem[]> = {};
      
      for (const colab of colaboradoresList) {
        const { data: destData } = await supabase
          .from("agenda_destinatarios")
          .select("agenda_item_id")
          .eq("usuario_id", colab.user_id);

        if (destData && destData.length > 0) {
          const itemIds = destData.map(d => d.agenda_item_id);
          const { data: itemsData } = await supabase
            .from("agenda_items")
            .select("id, tipo, titulo, data_inicio, status, prioridade")
            .in("id", itemIds)
            .order("data_inicio", { ascending: true })
            .limit(5);

          itemsMap[colab.user_id] = itemsData || [];
        } else {
          itemsMap[colab.user_id] = [];
        }
      }

      setColaboradorItems(itemsMap);
    } catch (error) {
      console.error("Error fetching colaboradores:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar colaboradores.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAtribuirTarefa = (colaborador: Colaborador) => {
    setSelectedColaborador(colaborador);
    setNovoItemDialogOpen(true);
  };

  const handleItemCreated = () => {
    setNovoItemDialogOpen(false);
    setSelectedColaborador(null);
    fetchColaboradores();
    toast({ title: "Sucesso", description: "Tarefa atribuída com sucesso!" });
  };

  const filteredColaboradores = colaboradores.filter(c =>
    c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.cargo?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
    (c.setor?.toLowerCase() || "").includes(searchTerm.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Agenda de Colaboradores
            </CardTitle>
            <CardDescription>
              Visualize a agenda dos colaboradores sob sua gestão
            </CardDescription>
          </div>
        </div>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, cargo ou setor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredColaboradores.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum colaborador encontrado sob sua gestão.</p>
            <p className="text-sm mt-2">
              Configure as vinculações de gestor no módulo de Administração.
            </p>
          </div>
        ) : (
          <Accordion type="single" collapsible className="w-full">
            {filteredColaboradores.map((colaborador) => {
              const items = colaboradorItems[colaborador.user_id] || [];
              const pendentes = items.filter(i => i.status === "pendente").length;

              return (
                <AccordionItem key={colaborador.user_id} value={colaborador.user_id}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-primary font-medium">
                            {colaborador.full_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="text-left">
                          <p className="font-medium">{colaborador.full_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {colaborador.cargo || "-"} • {colaborador.setor || "-"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {pendentes > 0 && (
                          <Badge variant="destructive">{pendentes} pendente(s)</Badge>
                        )}
                        <Badge variant="outline">{items.length} itens</Badge>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pl-12 space-y-4">
                      {canAtribuirTarefas && (
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            onClick={() => handleAtribuirTarefa(colaborador)}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Atribuir Tarefa
                          </Button>
                        </div>
                      )}

                      {items.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4">
                          Nenhum item na agenda deste colaborador.
                        </p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Tipo</TableHead>
                              <TableHead>Título</TableHead>
                              <TableHead>Data</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {items.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell className="capitalize">{item.tipo}</TableCell>
                                <TableCell>{item.titulo}</TableCell>
                                <TableCell>
                                  {format(new Date(item.data_inicio), "dd/MM/yy", { locale: ptBR })}
                                </TableCell>
                                <TableCell>
                                  <Badge className={statusColors[item.status]}>
                                    {statusLabels[item.status]}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </CardContent>

      <NovoItemDialog
        open={novoItemDialogOpen}
        onOpenChange={setNovoItemDialogOpen}
        onSuccess={handleItemCreated}
        preSelectedUser={selectedColaborador}
      />
    </Card>
  );
};
