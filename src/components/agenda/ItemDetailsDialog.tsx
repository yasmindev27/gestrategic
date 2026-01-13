import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, Clock, User, FileText } from "lucide-react";

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

interface Props {
  item: AgendaItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const tipoLabels: Record<string, string> = {
  tarefa: "Tarefa",
  reuniao: "Reunião",
  anotacao: "Anotação",
};

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

const prioridadeColors: Record<string, string> = {
  baixa: "bg-gray-200 text-gray-700",
  media: "bg-yellow-200 text-yellow-800",
  alta: "bg-orange-200 text-orange-800",
  urgente: "bg-red-500 text-white",
};

export const ItemDetailsDialog = ({ item, open, onOpenChange }: Props) => {
  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Detalhes do Item
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{tipoLabels[item.tipo]}</Badge>
            <Badge className={statusColors[item.status]}>
              {statusLabels[item.status]}
            </Badge>
            <Badge className={prioridadeColors[item.prioridade]}>
              {item.prioridade}
            </Badge>
          </div>

          <div>
            <h3 className="text-lg font-semibold">{item.titulo}</h3>
          </div>

          {item.descricao && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Descrição</p>
              <p className="text-sm bg-muted p-3 rounded-md">{item.descricao}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Data
              </p>
              <p className="font-medium">
                {format(new Date(item.data_inicio), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            </div>

            {item.hora && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Hora
                </p>
                <p className="font-medium">{item.hora}</p>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <User className="h-3 w-3" />
              Criado por
            </p>
            <p className="font-medium">{item.criador_nome || "Desconhecido"}</p>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Criado em</p>
            <p className="text-sm">
              {format(new Date(item.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
