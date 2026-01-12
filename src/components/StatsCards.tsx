import { Users, ClipboardList, AlertTriangle, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Task {
  id: number;
  title: string;
  sector: string;
  status: "pendente" | "concluida";
}

interface AgendaItem {
  id: number;
  title: string;
  type: "reuniao" | "relatorio" | "nota_fiscal";
  date: string;
  time: string;
}

const sectors = [
  "Recepção",
  "Triagem",
  "Enfermagem",
  "Médico",
  "Farmácia",
  "Administrativo",
  "Limpeza",
  "Segurança",
];

const initialTasks: Task[] = [
  { id: 1, title: "Revisar prontuários", sector: "Enfermagem", status: "pendente" },
  { id: 2, title: "Atualizar escalas", sector: "Administrativo", status: "pendente" },
  { id: 3, title: "Conferir estoque", sector: "Farmácia", status: "concluida" },
];

const agendaItems: AgendaItem[] = [
  { id: 1, title: "Reunião de equipe", type: "reuniao", date: "Hoje", time: "14:00" },
  { id: 2, title: "Relatório mensal", type: "relatorio", date: "Hoje", time: "17:00" },
  { id: 3, title: "NF Fornecedor ABC", type: "nota_fiscal", date: "Amanhã", time: "10:00" },
  { id: 4, title: "Reunião com gestor", type: "reuniao", date: "Amanhã", time: "15:00" },
];

const typeLabels = {
  reuniao: { label: "Reunião", className: "bg-primary/10 text-primary border-primary/20" },
  relatorio: { label: "Relatório", className: "bg-info/10 text-info border-info/20" },
  nota_fiscal: { label: "Nota Fiscal", className: "bg-warning/10 text-warning border-warning/20" },
};

const StatsCards = () => {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskSector, setNewTaskSector] = useState("");
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isAgendaDialogOpen, setIsAgendaDialogOpen] = useState(false);

  const pendingTasks = tasks.filter(t => t.status === "pendente").length;
  const totalTasks = tasks.length;

  const handleAddTask = () => {
    if (newTaskTitle && newTaskSector) {
      setTasks([
        ...tasks,
        {
          id: Date.now(),
          title: newTaskTitle,
          sector: newTaskSector,
          status: "pendente",
        },
      ]);
      setNewTaskTitle("");
      setNewTaskSector("");
    }
  };

  const toggleTaskStatus = (id: number) => {
    setTasks(tasks.map(t => 
      t.id === id 
        ? { ...t, status: t.status === "pendente" ? "concluida" : "pendente" }
        : t
    ));
  };

  const stats = [
    {
      label: "Funcionários Hoje",
      value: "24",
      change: "+2",
      trend: "up",
      icon: Users,
      color: "primary",
      clickable: false,
    },
    {
      label: "Tarefas Atribuídas",
      value: `${pendingTasks}/${totalTasks}`,
      change: `${pendingTasks} pendentes`,
      trend: "up",
      icon: ClipboardList,
      color: "success",
      clickable: true,
      dialogType: "tasks",
    },
    {
      label: "Alertas Pendentes",
      value: "5",
      change: "-3",
      trend: "down",
      icon: AlertTriangle,
      color: "warning",
      clickable: false,
    },
    {
      label: "Agenda",
      value: `${agendaItems.length}`,
      change: "itens hoje",
      trend: "up",
      icon: Calendar,
      color: "info",
      clickable: true,
      dialogType: "agenda",
    },
  ];

  const colorClasses = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    info: "bg-info/10 text-info",
  };

  const renderTasksDialog = () => (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle className="text-foreground">Tarefas Atribuídas</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-3 border border-border rounded-lg p-4 bg-secondary/30">
          <Label className="text-sm font-medium text-foreground">Nova Tarefa</Label>
          <Input
            placeholder="Título da tarefa"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            className="bg-background"
          />
          <Select value={newTaskSector} onValueChange={setNewTaskSector}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Selecione o setor" />
            </SelectTrigger>
            <SelectContent>
              {sectors.map((sector) => (
                <SelectItem key={sector} value={sector}>
                  {sector}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleAddTask} className="w-full bg-primary hover:bg-primary/90" size="sm">
            Atribuir Tarefa
          </Button>
        </div>

        <ScrollArea className="h-[250px]">
          <div className="space-y-2">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors"
                onClick={() => toggleTaskStatus(task.id)}
              >
                <div className="flex-1">
                  <p className={`font-medium text-sm ${task.status === "concluida" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                    {task.title}
                  </p>
                  <p className="text-xs text-muted-foreground">{task.sector}</p>
                </div>
                <Badge 
                  variant="outline"
                  className={task.status === "concluida" 
                    ? "bg-success/10 text-success border-success/20" 
                    : "bg-warning/10 text-warning border-warning/20"
                  }
                >
                  {task.status === "concluida" ? "Concluída" : "Pendente"}
                </Badge>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </DialogContent>
  );

  const renderAgendaDialog = () => (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle className="text-foreground">Agenda</DialogTitle>
      </DialogHeader>
      <ScrollArea className="h-[350px]">
        <div className="space-y-3">
          {agendaItems.map((item) => {
            const typeInfo = typeLabels[item.type];
            return (
              <div
                key={item.id}
                className="p-3 border border-border rounded-lg hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-sm text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.date} às {item.time}
                    </p>
                  </div>
                  <Badge variant="outline" className={typeInfo.className}>
                    {typeInfo.label}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </DialogContent>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        const colorClass = colorClasses[stat.color as keyof typeof colorClasses];

        const cardContent = (
          <Card 
            className={`shadow-sm hover:shadow-md transition-all border-border ${stat.clickable ? "cursor-pointer hover:border-primary/30" : ""}`}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
                  <p className={`text-xs mt-1 ${stat.trend === "up" ? "text-success" : "text-info"}`}>
                    {stat.change}
                  </p>
                </div>
                <div className={`p-3 rounded-xl ${colorClass}`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        );

        if (stat.clickable) {
          return (
            <Dialog 
              key={index} 
              open={stat.dialogType === "tasks" ? isTaskDialogOpen : isAgendaDialogOpen}
              onOpenChange={stat.dialogType === "tasks" ? setIsTaskDialogOpen : setIsAgendaDialogOpen}
            >
              <DialogTrigger asChild>
                {cardContent}
              </DialogTrigger>
              {stat.dialogType === "tasks" ? renderTasksDialog() : renderAgendaDialog()}
            </Dialog>
          );
        }

        return <div key={index}>{cardContent}</div>;
      })}
    </div>
  );
};

export default StatsCards;