import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  HelpCircle, 
  Activity, 
  LogOut, 
  ChevronLeft, 
  ChevronRight,
  FileOutput, 
  ClipboardX, 
  Receipt, 
  Shield,
  Monitor,
  Wrench,
  Stethoscope,
  Ticket,
  FlaskConical,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const bottomItems = [
  { icon: Settings, label: "Configurações", id: "configuracoes" },
  { icon: HelpCircle, label: "Ajuda", id: "ajuda" },
];
const Sidebar = ({
  activeSection,
  onSectionChange
}: SidebarProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { role, isAdmin, isTI, isManutencao, isEngenhariaCinica, isLaboratorio, isTecnico } = useUserRole();
  const [userName, setUserName] = useState<string>("Usuário");
  const [userEmail, setUserEmail] = useState<string>("");
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Menu items baseado no role do usuário
  const getMenuItems = () => {
    const items: { icon: typeof LayoutDashboard; label: string; id: string }[] = [];

    // Dashboard e Abrir Chamado - NÃO mostrar para Manutenção, Engenharia Clínica e Laboratório puros
    if (!isManutencao && !isEngenhariaCinica && !isLaboratorio) {
      items.push(
        { icon: LayoutDashboard, label: "Dashboard", id: "dashboard" },
        { icon: Ticket, label: "Abrir Chamado", id: "abrir-chamado" },
      );
    }

    // Itens específicos para técnicos - mostrar apenas seu módulo
    if (isTI || isAdmin) {
      items.push({ icon: Monitor, label: "TI", id: "tecnico-ti" });
    }
    if (isManutencao || isAdmin) {
      items.push({ icon: Wrench, label: "Manutenção", id: "tecnico-manutencao" });
    }
    if (isEngenhariaCinica || isAdmin) {
      items.push({ icon: Stethoscope, label: "Eng. Clínica", id: "tecnico-engenharia" });
    }
    if (isLaboratorio || isAdmin) {
      items.push({ icon: FlaskConical, label: "Laboratório", id: "laboratorio" });
    }

    // Itens gerais (esconder para técnicos puros, mostrar para admin e outros)
    if (!isTecnico || isAdmin) {
      items.push(
        { icon: FileOutput, label: "Faturamento", id: "faturamento" },
        { icon: ClipboardX, label: "Controle de Fichas", id: "controle-fichas" },
        { icon: Receipt, label: "Prontuários", id: "prontuarios" },
        { icon: Users, label: "Equipe", id: "equipe" },
      );
    }

    // Admin sempre tem acesso à administração
    if (isAdmin) {
      items.push({ icon: Shield, label: "Administração", id: "admin" });
    }

    return items;
  };

  const menuItems = getMenuItems();

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || "");
        const fullName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Usuário";
        setUserName(fullName);
      }
    };
    fetchUserData();
  }, []);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao sair. Tente novamente.",
        variant: "destructive"
      });
    } else {
      navigate("/");
    }
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };
  return <aside className={cn("bg-card border-r border-border h-screen flex flex-col sticky top-0 transition-all duration-300", isCollapsed ? "w-20" : "w-64")}>
      {/* Logo & Brand */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary rounded-xl flex-shrink-0">
            <Activity className="h-6 w-6 text-primary-foreground" />
          </div>
          {!isCollapsed && <div className="overflow-hidden">
              <h1 className="font-bold text-lg text-foreground truncate">UPA Sistema</h1>
              <p className="text-xs text-muted-foreground">Tecnologia em Saúde</p>
            </div>}
        </div>
      </div>

      {/* Collapse Toggle */}
      <button onClick={() => setIsCollapsed(!isCollapsed)} className="absolute -right-3 top-20 bg-card border border-border rounded-full p-1 shadow-sm hover:bg-secondary transition-colors z-10">
        {isCollapsed ? <ChevronRight className="h-4 w-4 text-muted-foreground" /> : <ChevronLeft className="h-4 w-4 text-muted-foreground" />}
      </button>

      {/* Navigation */}
      <nav className="flex-1 p-3 overflow-y-auto">
        <ul className="space-y-1">
          {menuItems.map(item => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return <li key={item.id}>
                <button onClick={() => onSectionChange(item.id)} className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all", isActive ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary hover:text-foreground", isCollapsed && "justify-center px-2")} title={isCollapsed ? item.label : undefined}>
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {!isCollapsed && <span className="font-medium truncate">{item.label}</span>}
                </button>
              </li>;
        })}
        </ul>
      </nav>

      {/* Bottom Section */}
      <div className="p-3 border-t border-border space-y-2">
        {/* Bottom Menu Items */}
        <ul className="space-y-1">
          {bottomItems.map(item => {
          const Icon = item.icon;
          return <li key={item.id}>
                <button onClick={() => onSectionChange(item.id)} className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors", isCollapsed && "justify-center px-2")} title={isCollapsed ? item.label : undefined}>
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {!isCollapsed && <span className="font-medium text-sm truncate">{item.label}</span>}
                </button>
              </li>;
        })}
        </ul>

        <Separator className="my-2" />

        {/* User Profile & Logout */}
        <div className={cn("flex items-center gap-3 p-2 rounded-lg bg-secondary/50", isCollapsed && "justify-center")}>
          <Avatar className="h-9 w-9 flex-shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
              {getInitials(userName)}
            </AvatarFallback>
          </Avatar>
          {!isCollapsed && <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{userName}</p>
              <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
            </div>}
        </div>

        <Button variant="ghost" onClick={handleLogout} className={cn("w-full text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors", isCollapsed ? "px-2" : "justify-start")} title={isCollapsed ? "Sair" : undefined}>
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!isCollapsed && <span className="ml-2 font-medium">Sair</span>}
        </Button>
      </div>
    </aside>;
};
export default Sidebar;