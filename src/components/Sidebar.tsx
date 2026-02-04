import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { LayoutDashboard, Users, Settings, HelpCircle, LogOut, ChevronLeft, ChevronRight, ClipboardX, Receipt, Shield, Monitor, Wrench, Stethoscope, FlaskConical, Calendar, ScrollText, UtensilsCrossed, Ambulance, FileText, UserCog, Shirt, HardHat, Heart, AlertTriangle, Syringe, ExternalLink, MessageSquare, Ticket } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const bottomItems = [{
  icon: Settings,
  label: "Configurações",
  id: "configuracoes"
}, {
  icon: HelpCircle,
  label: "Ajuda",
  id: "ajuda"
}];

const Sidebar = ({
  activeSection,
  onSectionChange
}: SidebarProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    role,
    isAdmin,
    isGestor,
    isTI,
    isManutencao,
    isEngenhariaCinica,
    isLaboratorio,
    isTecnico,
    isRecepcao,
    isClassificacao,
    isNir,
    isFaturamento,
    isRHDP
  } = useUserRole();
  const [userName, setUserName] = useState<string>("Usuário");
  const [userEmail, setUserEmail] = useState<string>("");
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Definição de categorias de menu
  type MenuItem = {
    icon: typeof LayoutDashboard;
    label: string;
    id: string;
    category?: "dashboard" | "assistencial" | "apoio" | "logistica" | "administrativo" | "integracao";
  };

  // Menu items baseado no perfil do usuário conforme escopo técnico
  const getMenuItems = (): MenuItem[] => {
    const items: MenuItem[] = [];

    // ADMINISTRADOR - acesso total (sem abrir chamado)
    if (isAdmin) {
      items.push(
        // === DASHBOARD ===
        {
          icon: LayoutDashboard,
          label: "Dashboard",
          id: "dashboard",
          category: "dashboard"
        },
        
        // === ASSISTENCIAIS ===
        {
          icon: Ambulance,
          label: "NIR",
          id: "nir",
          category: "assistencial"
        },
        {
          icon: Ambulance,
          label: "Mapa de Leitos",
          id: "mapa-leitos",
          category: "assistencial"
        },
        {
          icon: Stethoscope,
          label: "Médicos",
          id: "medicos",
          category: "assistencial"
        },
        {
          icon: Syringe,
          label: "Enfermagem",
          id: "enfermagem",
          category: "assistencial"
        },
        {
          icon: Heart,
          label: "Assist. Social",
          id: "assistencia-social",
          category: "assistencial"
        },
        
        // === APOIO ===
        {
          icon: FlaskConical,
          label: "Laboratório",
          id: "laboratorio",
          category: "apoio"
        },
        {
          icon: AlertTriangle,
          label: "Qualidade/NSP",
          id: "qualidade",
          category: "apoio"
        },
        {
          icon: AlertTriangle,
          label: "Incidentes",
          id: "gestao-incidentes",
          category: "apoio"
        },
        {
          icon: HardHat,
          label: "Seg. Trabalho",
          id: "seguranca-trabalho",
          category: "apoio"
        },
        
        // === LOGÍSTICA ===
        {
          icon: Shirt,
          label: "Rouparia",
          id: "rouparia",
          category: "logistica"
        },
        {
          icon: UtensilsCrossed,
          label: "Restaurante",
          id: "restaurante",
          category: "logistica"
        },
        
        // === ADMINISTRATIVOS ===
        {
          icon: Receipt,
          label: "Faturamento",
          id: "faturamento",
          category: "administrativo"
        },
        {
          icon: UserCog,
          label: "RH/DP",
          id: "rhdp",
          category: "administrativo"
        },
        {
          icon: Users,
          label: "Equipe",
          id: "equipe",
          category: "administrativo"
        },
        {
          icon: Users,
          label: "Profissionais",
          id: "profissionais-saude",
          category: "administrativo"
        },
        {
          icon: ClipboardX,
          label: "Controle de Fichas",
          id: "controle-fichas",
          category: "administrativo"
        },
        
        // === SUPORTE TÉCNICO ===
        {
          icon: Monitor,
          label: "TI",
          id: "tecnico-ti",
          category: "administrativo"
        },
        {
          icon: Wrench,
          label: "Manutenção",
          id: "tecnico-manutencao",
          category: "administrativo"
        },
        {
          icon: Stethoscope,
          label: "Eng. Clínica",
          id: "tecnico-engenharia",
          category: "administrativo"
        },
        
        // === UTILIDADES ===
        {
          icon: Calendar,
          label: "Agenda",
          id: "agenda",
          category: "administrativo"
        },
        {
          icon: ScrollText,
          label: "Logs",
          id: "logs",
          category: "administrativo"
        },
        {
          icon: Shield,
          label: "Administração",
          id: "admin",
          category: "administrativo"
        },
        
        // === INTEGRAÇÕES ===
        {
          icon: FileText,
          label: "Docs Interact",
          id: "documentos-interact",
          category: "integracao"
        },
        {
          icon: Stethoscope,
          label: "Sistema Salus",
          id: "salus",
          category: "integracao"
        }
      );
      return items;
    }

    // GESTOR - Agenda própria + Agenda colaboradores + Atribuir tarefas
    if (isGestor) {
      items.push({
        icon: LayoutDashboard,
        label: "Dashboard",
        id: "dashboard"
      }, {
        icon: Calendar,
        label: "Agenda",
        id: "agenda"
      }, {
        icon: Users,
        label: "Equipe",
        id: "equipe"
      });
      return items;
    }

    // RECEPÇÃO - Módulo próprio com Controle de Fichas interno
    if (isRecepcao) {
      items.push({
        icon: LayoutDashboard,
        label: "Dashboard",
        id: "dashboard"
      }, {
        icon: ClipboardX,
        label: "Recepção",
        id: "recepcao"
      }, {
        icon: Receipt,
        label: "Faturamento",
        id: "faturamento"
      }, {
        icon: Calendar,
        label: "Agenda",
        id: "agenda"
      });
      return items;
    }

    // CLASSIFICAÇÃO - Lista saída prontuários (validar existência)
    if (isClassificacao) {
      items.push({
        icon: LayoutDashboard,
        label: "Dashboard",
        id: "dashboard"
      }, {
        icon: Receipt,
        label: "Faturamento",
        id: "faturamento"
      }, {
        icon: Calendar,
        label: "Agenda",
        id: "agenda"
      });
      return items;
    }

    // NIR - Regulação Hospitalar (não é técnico)
    if (isNir) {
      items.push({
        icon: Ambulance,
        label: "NIR",
        id: "nir"
      }, {
        icon: Receipt,
        label: "Faturamento",
        id: "faturamento"
      }, {
        icon: Calendar,
        label: "Agenda",
        id: "agenda"
      });
      return items;
    }

    // FATURAMENTO - Lista prontuários + Prontuários faltantes + Avaliação
    if (isFaturamento) {
      items.push({
        icon: LayoutDashboard,
        label: "Dashboard",
        id: "dashboard"
      }, {
        icon: Receipt,
        label: "Faturamento",
        id: "faturamento"
      }, {
        icon: Calendar,
        label: "Agenda",
        id: "agenda"
      });
      return items;
    }

    // TÉCNICOS - apenas seus módulos específicos
    if (isTI) {
      items.push({
        icon: Monitor,
        label: "TI",
        id: "tecnico-ti"
      }, {
        icon: Calendar,
        label: "Agenda",
        id: "agenda"
      });
      return items;
    }
    if (isManutencao) {
      items.push({
        icon: Wrench,
        label: "Manutenção",
        id: "tecnico-manutencao"
      }, {
        icon: Calendar,
        label: "Agenda",
        id: "agenda"
      });
      return items;
    }
    if (isEngenhariaCinica) {
      items.push({
        icon: Stethoscope,
        label: "Eng. Clínica",
        id: "tecnico-engenharia"
      }, {
        icon: Calendar,
        label: "Agenda",
        id: "agenda"
      });
      return items;
    }
    if (isLaboratorio) {
      items.push({
        icon: FlaskConical,
        label: "Laboratório",
        id: "laboratorio"
      }, {
        icon: Calendar,
        label: "Agenda",
        id: "agenda"
      });
      return items;
    }

    // RH/DP - Banco de Horas + Central de Atestados
    if (isRHDP) {
      items.push({
        icon: LayoutDashboard,
        label: "Dashboard",
        id: "dashboard"
      }, {
        icon: UserCog,
        label: "RH/DP",
        id: "rhdp"
      }, {
        icon: Calendar,
        label: "Agenda",
        id: "agenda"
      });
      return items;
    }

    // FUNCIONÁRIO padrão - apenas Dashboard, Agenda e Restaurante
    items.push({
      icon: LayoutDashboard,
      label: "Dashboard",
      id: "dashboard"
    }, {
      icon: Calendar,
      label: "Agenda",
      id: "agenda"
    }, {
      icon: UtensilsCrossed,
      label: "Restaurante",
      id: "restaurante"
    });
    return items;
  };

  // Adicionar itens comuns a todos os menus
  const addCommonMenuItems = (items: MenuItem[]): MenuItem[] => {
    // Adicionar Abrir Chamado (GLPI) - exceto para admin
    if (!isAdmin && !items.some(item => item.id === "abrir-chamado")) {
      items.push({
        icon: Ticket,
        label: "Abrir Chamado",
        id: "abrir-chamado"
      });
    }
    // Adicionar Chat Corporativo
    if (!items.some(item => item.id === "chat")) {
      items.push({
        icon: MessageSquare,
        label: "Chat",
        id: "chat"
      });
    }
    // Adicionar Restaurante
    if (!items.some(item => item.id === "restaurante")) {
      items.push({
        icon: UtensilsCrossed,
        label: "Restaurante",
        id: "restaurante"
      });
    }
    return items;
  };
  const menuItems = addCommonMenuItems(getMenuItems());

  // Componente para renderizar item do menu
  const MenuItemRender = ({ item, activeSection, isCollapsed, onSectionChange }: {
    item: MenuItem;
    activeSection: string;
    isCollapsed: boolean;
    onSectionChange: (section: string) => void;
  }) => {
    const Icon = item.icon;
    const isActive = activeSection === item.id;
    const isExternalLink = item.id === "documentos-interact" || item.id === "abrir-chamado";
    
    if (isExternalLink) {
      const externalUrl = item.id === "abrir-chamado" 
        ? "https://suporte.santacasachavantes.org/index.php"
        : "https://santacasachavantes.interact.com.br/sa/custom/webdocuments/anonymous/list.jsp?unit=%2334";
      
      return (
        <li>
          <a
            href={externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-muted-foreground hover:bg-secondary hover:text-foreground",
              isCollapsed && "justify-center px-2"
            )}
            title={isCollapsed ? item.label : undefined}
          >
            <Icon className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && (
              <span className="font-medium truncate flex items-center gap-1">
                {item.label}
                <ExternalLink className="h-3 w-3 opacity-60" />
              </span>
            )}
          </a>
        </li>
      );
    }
    
    return (
      <li>
        <button
          onClick={() => onSectionChange(item.id)}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
            isActive ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            isCollapsed && "justify-center px-2"
          )}
          title={isCollapsed ? item.label : undefined}
        >
          <Icon className="h-5 w-5 flex-shrink-0" />
          {!isCollapsed && <span className="font-medium truncate">{item.label}</span>}
        </button>
      </li>
    );
  };
  useEffect(() => {
    const fetchUserData = async () => {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || "");
        const fullName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Usuário";
        setUserName(fullName);
      }
    };
    fetchUserData();
  }, []);
  const handleLogout = async () => {
    const {
      error
    } = await supabase.auth.signOut();
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
        <button onClick={() => onSectionChange("dashboard")} className="flex items-center gap-3 w-full text-left hover:opacity-80 transition-opacity">
          <img src="/assets/logo-upa-24h.png" alt="UPA 24h" className="h-12 w-auto flex-shrink-0" />
          {!isCollapsed && <div className="overflow-hidden">
              <h1 className="font-bold text-lg text-foreground truncate">​Gestrategic</h1>
              <p className="text-xs text-muted-foreground">Tecnologia em Saúde</p>
            </div>}
        </button>
      </div>

      {/* Collapse Toggle */}
      <button onClick={() => setIsCollapsed(!isCollapsed)} className="absolute -right-3 top-20 bg-card border border-border rounded-full p-1 shadow-sm hover:bg-secondary transition-colors z-10">
        {isCollapsed ? <ChevronRight className="h-4 w-4 text-muted-foreground" /> : <ChevronLeft className="h-4 w-4 text-muted-foreground" />}
      </button>

      {/* Navigation */}
      <nav className="flex-1 p-3 overflow-y-auto">
        {isAdmin && !isCollapsed ? (
          // Admin com categorias visuais
          <div className="space-y-4">
            {/* Dashboard */}
            <div>
              <ul className="space-y-1">
                {menuItems.filter(i => i.category === "dashboard").map(item => (
                  <MenuItemRender key={item.id} item={item} activeSection={activeSection} isCollapsed={isCollapsed} onSectionChange={onSectionChange} />
                ))}
              </ul>
            </div>

            {/* Assistencial */}
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground px-3 mb-2">Assistencial</p>
              <ul className="space-y-1">
                {menuItems.filter(i => i.category === "assistencial").map(item => (
                  <MenuItemRender key={item.id} item={item} activeSection={activeSection} isCollapsed={isCollapsed} onSectionChange={onSectionChange} />
                ))}
              </ul>
            </div>

            {/* Apoio */}
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground px-3 mb-2">Apoio</p>
              <ul className="space-y-1">
                {menuItems.filter(i => i.category === "apoio").map(item => (
                  <MenuItemRender key={item.id} item={item} activeSection={activeSection} isCollapsed={isCollapsed} onSectionChange={onSectionChange} />
                ))}
              </ul>
            </div>

            {/* Logística */}
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground px-3 mb-2">Logística</p>
              <ul className="space-y-1">
                {menuItems.filter(i => i.category === "logistica").map(item => (
                  <MenuItemRender key={item.id} item={item} activeSection={activeSection} isCollapsed={isCollapsed} onSectionChange={onSectionChange} />
                ))}
              </ul>
            </div>

            {/* Administrativo */}
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground px-3 mb-2">Administrativo</p>
              <ul className="space-y-1">
                {menuItems.filter(i => i.category === "administrativo").map(item => (
                  <MenuItemRender key={item.id} item={item} activeSection={activeSection} isCollapsed={isCollapsed} onSectionChange={onSectionChange} />
                ))}
              </ul>
            </div>

            {/* Integrações */}
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground px-3 mb-2">Integrações</p>
              <ul className="space-y-1">
                {menuItems.filter(i => i.category === "integracao").map(item => (
                  <MenuItemRender key={item.id} item={item} activeSection={activeSection} isCollapsed={isCollapsed} onSectionChange={onSectionChange} />
                ))}
              </ul>
            </div>
          </div>
        ) : (
          // Não-admin ou colapsado - lista simples
          <ul className="space-y-1">
            {menuItems.map(item => (
              <MenuItemRender key={item.id} item={item} activeSection={activeSection} isCollapsed={isCollapsed} onSectionChange={onSectionChange} />
            ))}
          </ul>
        )}
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