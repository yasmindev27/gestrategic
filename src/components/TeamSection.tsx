import { Users, Calendar, Clock, UserCheck, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const todayTeam = [
  { id: 1, name: "Dr. Carlos Silva", role: "Médico Plantonista", shift: "07:00 - 19:00", status: "active" },
  { id: 2, name: "Enf. Maria Santos", role: "Enfermeira Chefe", shift: "07:00 - 19:00", status: "active" },
  { id: 3, name: "Téc. João Oliveira", role: "Técnico de Enfermagem", shift: "07:00 - 19:00", status: "active" },
  { id: 4, name: "Dra. Ana Costa", role: "Médica", shift: "19:00 - 07:00", status: "upcoming" },
];

const menuOptions = [
  {
    title: "Verificar Escala",
    description: "Visualize a escala completa do mês",
    icon: Calendar,
    color: "primary"
  },
  {
    title: "Equipe de Plantão Hoje",
    description: "Confira quem está trabalhando agora",
    icon: UserCheck,
    color: "success"
  },
];

const colorClasses = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
};

const TeamSection = () => {
  return (
    <div className="space-y-6">
      {/* Menu Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {menuOptions.map((option, index) => {
          const Icon = option.icon;
          const colorClass = colorClasses[option.color as keyof typeof colorClasses];
          
          return (
            <Card 
              key={index} 
              className="shadow-sm hover:shadow-md transition-all cursor-pointer group hover:border-primary/30 border-border"
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${colorClass}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {option.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Today's Team */}
      <Card className="shadow-sm border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2 text-foreground">
              <div className="p-1.5 bg-success/10 rounded-lg">
                <Users className="h-4 w-4 text-success" />
              </div>
              Equipe de Plantão Hoje
            </CardTitle>
            <Badge variant="secondary" className="font-normal bg-secondary text-secondary-foreground">
              {todayTeam.filter(m => m.status === "active").length} em serviço
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {todayTeam.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
            >
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary font-medium text-sm">
                  {member.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {member.name}
                </p>
                <p className="text-xs text-muted-foreground">{member.role}</p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {member.shift}
                </div>
                <Badge 
                  variant="outline" 
                  className={member.status === "active" 
                    ? "bg-success/10 text-success border-success/20 text-xs mt-1" 
                    : "bg-muted text-muted-foreground text-xs mt-1"
                  }
                >
                  {member.status === "active" ? "Em serviço" : "Próximo turno"}
                </Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default TeamSection;