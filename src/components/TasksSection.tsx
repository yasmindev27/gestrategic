import { CheckCircle2, Circle, Clock, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Task {
  id: number;
  title: string;
  status: "pending" | "in-progress" | "completed" | "urgent";
  time?: string;
}

const mockTasks: Task[] = [
  { id: 1, title: "Verificar estoque de medicamentos", status: "urgent", time: "08:00" },
  { id: 2, title: "Atualizar prontuários pendentes", status: "in-progress", time: "10:30" },
  { id: 3, title: "Reunião com equipe de enfermagem", status: "pending", time: "14:00" },
  { id: 4, title: "Revisar escalas de plantão", status: "completed", time: "09:00" },
  { id: 5, title: "Conferir equipamentos de emergência", status: "pending", time: "16:00" },
];

const statusConfig = {
  pending: {
    icon: Circle,
    label: "Pendente",
    className: "bg-muted text-muted-foreground border-muted",
    iconColor: "text-muted-foreground"
  },
  "in-progress": {
    icon: Clock,
    label: "Em andamento",
    className: "bg-warning/10 text-warning border-warning/20",
    iconColor: "text-warning"
  },
  completed: {
    icon: CheckCircle2,
    label: "Concluída",
    className: "bg-success/10 text-success border-success/20",
    iconColor: "text-success"
  },
  urgent: {
    icon: AlertCircle,
    label: "Urgente",
    className: "bg-destructive/10 text-destructive border-destructive/20",
    iconColor: "text-destructive"
  }
};

const TasksSection = () => {
  return (
    <Card className="shadow-sm border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2 text-foreground">
            <div className="p-1.5 bg-primary/10 rounded-lg">
              <CheckCircle2 className="h-4 w-4 text-primary" />
            </div>
            Minhas Tarefas
          </CardTitle>
          <Badge variant="secondary" className="font-normal bg-secondary text-secondary-foreground">
            {mockTasks.filter(t => t.status !== "completed").length} pendentes
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {mockTasks.map((task) => {
          const config = statusConfig[task.status];
          const Icon = config.icon;
          
          return (
            <div
              key={task.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer group"
            >
              <Icon className={`h-5 w-5 flex-shrink-0 ${config.iconColor}`} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${
                  task.status === "completed" ? "line-through text-muted-foreground" : "text-foreground"
                }`}>
                  {task.title}
                </p>
              </div>
              {task.time && (
                <span className="text-xs text-muted-foreground">{task.time}</span>
              )}
              <Badge variant="outline" className={`text-xs ${config.className}`}>
                {config.label}
              </Badge>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default TasksSection;