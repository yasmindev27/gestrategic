import { ClipboardList, ExternalLink, Clock, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Form {
  id: number;
  title: string;
  responses: number;
  deadline: string;
  status: "active" | "closing-soon" | "new";
}

const mockForms: Form[] = [
  { id: 1, title: "Avaliação de Satisfação do Paciente", responses: 45, deadline: "15/01/2026", status: "active" },
  { id: 2, title: "Checklist de Higienização", responses: 128, deadline: "Diário", status: "active" },
  { id: 3, title: "Pesquisa de Clima Organizacional", responses: 12, deadline: "10/01/2026", status: "closing-soon" },
  { id: 4, title: "Formulário de Notificação de Incidentes", responses: 3, deadline: "Contínuo", status: "new" },
];

const statusConfig = {
  active: {
    label: "Ativo",
    className: "bg-success/10 text-success border-success/20"
  },
  "closing-soon": {
    label: "Encerrando",
    className: "bg-warning/10 text-warning border-warning/20"
  },
  new: {
    label: "Novo",
    className: "bg-primary/10 text-primary border-primary/20"
  }
};

const FormsSection = () => {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <div className="p-1.5 bg-accent/20 rounded-lg">
            <ClipboardList className="h-4 w-4 text-accent" />
          </div>
          Formulários Ativos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {mockForms.map((form) => {
          const config = statusConfig[form.status];
          
          return (
            <div
              key={form.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors group"
            >
              <div className="p-2 bg-accent/10 rounded-lg">
                <ClipboardList className="h-4 w-4 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {form.title}
                </p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {form.responses} respostas
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {form.deadline}
                  </span>
                </div>
              </div>
              <Badge variant="outline" className={config.className}>
                {config.label}
              </Badge>
              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default FormsSection;
