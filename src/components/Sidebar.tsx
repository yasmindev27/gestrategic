import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { LayoutDashboard, Users, Settings, HelpCircle, LogOut, ChevronLeft, ChevronRight, ClipboardX, Receipt, Shield, ShieldAlert, Monitor, Wrench, Stethoscope, FlaskConical, Calendar, UtensilsCrossed, Ambulance, FileText, UserCog, Shirt, HardHat, Heart, AlertTriangle, Syringe, ExternalLink, MessageSquare, Ticket, GraduationCap, Video, Building2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { AlertaSegurancaButton } from "@/components/seguranca";

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  onOpenExternal?: (url: string, title: string) => void;
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

// Badge config — IDs that can show notification badges
// In the future, connect these to real counts from the database
const BADGE_IDS = new Set(["qualidade", "reportar-incidente", "laboratorio", "chat"]);

const Sidebar = ({
  activeSection,
  onSectionChange,
  onOpenExternal
}: SidebarProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    role, isAdmin, isGestor, isTI, isManutencao, isEngenhariaCinica,
    isLaboratorio, isTecnico, isRecepcao, isClassificacao, isNir,
    isFaturamento, isRHDP, isQualidade, isNSP, isMedicos, isEnfermagem,
    isSeguranca
  } = useUserRole();
  const [userName, setUserName] = useState<string>("Usuário");
  const [userEmail, setUserEmail] = useState<string>("");
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Placeholder badge counts — replace with real queries later
  const [badgeCounts] = useState<Record<string, number>>({});

  type MenuItem = {
    icon: typeof LayoutDashboard;
    label: string;
    id: string;
    category?: "dashboard" | "assistencial" | "apoio" | "logistica" | "administrativo" | "integracao";
  };

  const getMenuItems = (): MenuItem[] => {
    const items: MenuItem[] = [];

    if (isAdmin) {
      items.push(
        { icon: LayoutDashboard, label: "Dashboard", id: "dashboard", category: "dashboard" },
        { icon: Building2, label: "Gerência", id: "gerencia", category: "dashboard" },
        { icon: Ambulance, label: "NIR", id: "nir", category: "assistencial" },
        { icon: Stethoscope, label: "Médicos", id: "medicos", category: "assistencial" },
        { icon: Syringe, label: "Enfermagem", id: "enfermagem", category: "assistencial" },
        { icon: Heart, label: "Assist. Social", id: "assistencia-social", category: "assistencial" },
        { icon: FlaskConical, label: "Laboratório", id: "laboratorio", category: "apoio" },
        { icon: AlertTriangle, label: "Qualidade/NSP", id: "qualidade", category: "apoio" },
        { icon: HardHat, label: "Seg. Trabalho", id: "seguranca-trabalho", category: "apoio" },
        { icon: Shirt, label: "Rouparia", id: "rouparia", category: "logistica" },
        { icon: UtensilsCrossed, label: "Restaurante", id: "restaurante", category: "logistica" },
        { icon: Receipt, label: "Faturamento", id: "faturamento", category: "administrativo" },
        { icon: UserCog, label: "RH/DP", id: "rhdp", category: "administrativo" },
        { icon: ClipboardX, label: "Controle de Fichas", id: "controle-fichas", category: "administrativo" },
        { icon: Monitor, label: "TI", id: "tecnico-ti", category: "administrativo" },
        { icon: Wrench, label: "Manutenção", id: "tecnico-manutencao", category: "administrativo" },
        { icon: Stethoscope, label: "Eng. Clínica", id: "tecnico-engenharia", category: "administrativo" },
        { icon: Calendar, label: "Agenda", id: "agenda", category: "administrativo" },
        { icon: GraduationCap, label: "Capacitação", id: "lms", category: "administrativo" },
        { icon: Shield, label: "Administração", id: "admin", category: "administrativo" },
        { icon: Shield, label: "Seg. Patrimonial", id: "seguranca-patrimonial", category: "apoio" },
        { icon: Video, label: "Reuniões", id: "reuniao", category: "administrativo" },
        { icon: FileText, label: "Docs Interact", id: "documentos-interact", category: "integracao" },
        { icon: Stethoscope, label: "Sistema Salus", id: "salus", category: "integracao" }
      );
      return items;
    }

    if (isGestor) {
      items.push(
        { icon: LayoutDashboard, label: "Dashboard", id: "dashboard" },
        { icon: Stethoscope, label: "Médicos", id: "medicos" },
        { icon: Syringe, label: "Enfermagem", id: "enfermagem" },
        { icon: FlaskConical, label: "Resultados Exames", id: "laboratorio" },
        { icon: Calendar, label: "Agenda", id: "agenda" },
        { icon: UserCog, label: "Equipe", id: "equipe" },
        { icon: FileText, label: "Docs Interact", id: "documentos-interact", category: "integracao" },
        { icon: Stethoscope, label: "Sistema Salus", id: "salus", category: "integracao" }
      );
      return items;
    }
    if (isEnfermagem) {
      items.push(
        { icon: LayoutDashboard, label: "Dashboard", id: "dashboard" },
        { icon: Syringe, label: "Enfermagem", id: "enfermagem" },
        { icon: Calendar, label: "Agenda", id: "agenda" }
      );
      return items;
    }
    if (isRecepcao) {
      items.push(
        { icon: LayoutDashboard, label: "Dashboard", id: "dashboard" },
        { icon: ClipboardX, label: "Recepção", id: "recepcao" },
        { icon: Receipt, label: "Faturamento", id: "faturamento" },
        { icon: Calendar, label: "Agenda", id: "agenda" }
      );
      return items;
    }
    if (isClassificacao) {
      items.push(
        { icon: LayoutDashboard, label: "Dashboard", id: "dashboard" },
        { icon: Receipt, label: "Faturamento", id: "faturamento" },
        { icon: Calendar, label: "Agenda", id: "agenda" }
      );
      return items;
    }
    if (isNir) {
      items.push(
        { icon: Ambulance, label: "NIR", id: "nir" },
        { icon: Receipt, label: "Faturamento", id: "faturamento" },
        { icon: Calendar, label: "Agenda", id: "agenda" }
      );
      return items;
    }
    if (isFaturamento) {
      items.push(
        { icon: LayoutDashboard, label: "Dashboard", id: "dashboard" },
        { icon: Receipt, label: "Faturamento", id: "faturamento" },
        { icon: Calendar, label: "Agenda", id: "agenda" }
      );
      return items;
    }
    if (isTI) {
      items.push(
        { icon: Monitor, label: "TI", id: "tecnico-ti" },
        { icon: Calendar, label: "Agenda", id: "agenda" }
      );
      return items;
    }
    if (isManutencao) {
      items.push(
        { icon: Wrench, label: "Manutenção", id: "tecnico-manutencao" },
        { icon: Calendar, label: "Agenda", id: "agenda" }
      );
      return items;
    }
    if (isEngenhariaCinica) {
      items.push(
        { icon: Stethoscope, label: "Eng. Clínica", id: "tecnico-engenharia" },
        { icon: Calendar, label: "Agenda", id: "agenda" }
      );
      return items;
    }
    if (isMedicos) {
      items.push(
        { icon: LayoutDashboard, label: "Dashboard", id: "dashboard" },
        { icon: Stethoscope, label: "Médicos", id: "medicos" },
        { icon: FlaskConical, label: "Resultados Exames", id: "laboratorio" },
        { icon: Calendar, label: "Agenda", id: "agenda" }
      );
      return items;
    }
    if (isLaboratorio) {
      items.push(
        { icon: FlaskConical, label: "Laboratório", id: "laboratorio" },
        { icon: Calendar, label: "Agenda", id: "agenda" }
      );
      return items;
    }
    if (isRHDP) {
      items.push(
        { icon: LayoutDashboard, label: "Dashboard", id: "dashboard" },
        { icon: UserCog, label: "RH/DP", id: "rhdp" },
        { icon: Calendar, label: "Agenda", id: "agenda" }
      );
      return items;
    }
    if (isQualidade || isNSP) {
      items.push(
        { icon: LayoutDashboard, label: "Dashboard", id: "dashboard" },
        { icon: AlertTriangle, label: "Qualidade/NSP", id: "qualidade" },
        { icon: Calendar, label: "Agenda", id: "agenda" }
      );
      return items;
    }
    if (isSeguranca) {
      items.push(
        { icon: LayoutDashboard, label: "Dashboard", id: "dashboard" },
        { icon: Shield, label: "Seg. Patrimonial", id: "seguranca-patrimonial" },
        { icon: HardHat, label: "Seg. Trabalho", id: "seguranca-trabalho" },
        { icon: Calendar, label: "Agenda", id: "agenda" }
      );
      return items;
    }

    items.push(
      { icon: LayoutDashboard, label: "Dashboard", id: "dashboard" },
      { icon: Calendar, label: "Agenda", id: "agenda" },
      { icon: UtensilsCrossed, label: "Restaurante", id: "restaurante" }
    );
    return items;
  };

  const addCommonMenuItems = (items: MenuItem[]): MenuItem[] => {
    if (!isAdmin && !items.some(item => item.id === "reportar-incidente")) {
      items.push({ icon: AlertTriangle, label: "Reportar Incidente", id: "reportar-incidente" });
    }
    if (!isAdmin && !items.some(item => item.id === "abrir-chamado")) {
      items.push({ icon: Ticket, label: "Abrir Chamado", id: "abrir-chamado" });
    }
    if (!items.some(item => item.id === "chat")) {
      items.push({ icon: MessageSquare, label: "Chat", id: "chat" });
    }
    if (!items.some(item => item.id === "restaurante")) {
      items.push({ icon: UtensilsCrossed, label: "Restaurante", id: "restaurante" });
    }
    if (!items.some(item => item.id === "lms")) {
      items.push({ icon: GraduationCap, label: "Treinamentos", id: "lms" });
    }
    return items;
  };

  const menuItems = addCommonMenuItems(getMenuItems());

  // Reusable menu button content
  const MenuButtonContent = ({ item, isActive }: { item: MenuItem; isActive: boolean }) => {
    const Icon = item.icon;
    const badgeCount = badgeCounts[item.id];
    const hasBadge = BADGE_IDS.has(item.id) && badgeCount && badgeCount > 0;

    return (
      <>
        <div className="relative flex-shrink-0">
          <Icon className="h-[18px] w-[18px]" />
          {hasBadge && (
            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 ring-2 ring-[#0d2137]">
              {badgeCount > 99 ? "99+" : badgeCount}
            </span>
          )}
        </div>
        {!isCollapsed && <span className="font-medium truncate">{item.label}</span>}
      </>
    );
  };

  // Menu item with tooltip wrapper
  const MenuItemRender = ({ item }: { item: MenuItem }) => {
    const Icon = item.icon;
    const isActive = activeSection === item.id;
    const isExternalLink = item.id === "documentos-interact";

    const buttonClasses = cn(
      "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm relative",
      isActive
        ? "bg-[#2d7dd2]/15 text-white font-semibold before:absolute before:left-0 before:top-1 before:bottom-1 before:w-[3px] before:rounded-full before:bg-[#2d7dd2] before:shadow-[0_0_8px_rgba(45,125,210,0.6)]"
        : "text-[#8baec8] hover:bg-white/5 hover:text-white",
      isCollapsed && "justify-center px-2"
    );

    const content = (
      <MenuButtonContent item={item} isActive={isActive} />
    );

    // Wrap with tooltip
    const withTooltip = (trigger: React.ReactNode) => (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{trigger}</TooltipTrigger>
        <TooltipContent side="right" className="bg-[#1a3a5c] text-white border-[#2d7dd2]/30 text-xs font-medium shadow-lg">
          {item.label}
          {isExternalLink && <ExternalLink className="inline ml-1 h-3 w-3 opacity-60" />}
        </TooltipContent>
      </Tooltip>
    );

    if (isExternalLink) {
      const externalUrl = item.id === "abrir-chamado"
        ? "https://suporte.santacasachavantes.org/index.php"
        : "https://santacasachavantes.interact.com.br/sa/custom/webdocuments/anonymous/list.jsp?unit=%2334";

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        toast({ title: "Redirecionando", description: "Acessando ambiente seguro do parceiro..." });
        // Try window.open first; if blocked (e.g. in sandboxed iframe), use direct navigation
        const newWindow = window.open(externalUrl, "_blank", "noopener,noreferrer");
        if (!newWindow || newWindow.closed) {
          // Fallback: create a temporary anchor to force navigation
          const a = document.createElement("a");
          a.href = externalUrl;
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
      };

      const link = (
        <li>
          <a
            href={externalUrl}
            onClick={handleClick}
            className={cn(buttonClasses, "text-[#8baec8] hover:bg-white/5 hover:text-white")}
          >
            {content}
            {!isCollapsed && <ExternalLink className="h-3 w-3 opacity-60 ml-auto flex-shrink-0" />}
          </a>
        </li>
      );
      return isCollapsed ? <li>{withTooltip(
        <a href={externalUrl} onClick={handleClick} className={cn(buttonClasses, "text-[#8baec8] hover:bg-white/5 hover:text-white")}>
          {content}
        </a>
      )}</li> : link;
    }

    const button = (
      <button
        onClick={() => onSectionChange(item.id)}
        className={buttonClasses}
      >
        {content}
      </button>
    );

    return (
      <li>
        {isCollapsed ? withTooltip(button) : button}
      </li>
    );
  };

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
      toast({ title: "Erro", description: "Erro ao sair. Tente novamente.", variant: "destructive" });
    } else {
      navigate("/");
    }
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  // Category groups for collapsed mode dividers
  const categories: Array<{ key: string; label: string }> = [
    { key: "dashboard", label: "" },
    { key: "assistencial", label: "Assistencial" },
    { key: "apoio", label: "Apoio" },
    { key: "logistica", label: "Logística" },
    { key: "administrativo", label: "Administrativo" },
    { key: "integracao", label: "Integrações" },
  ];

  const renderCategorizedMenu = () => {
    if (!isAdmin) {
      // Non-admin: simple list
      return (
        <ul className="space-y-1">
          {menuItems.map(item => (
            <MenuItemRender key={item.id} item={item} />
          ))}
        </ul>
      );
    }

    if (isCollapsed) {
      // Admin collapsed: icons with thin dividers between groups
      return (
        <div className="space-y-1">
          {categories.map((cat, catIdx) => {
            const items = menuItems.filter(i => i.category === cat.key);
            if (items.length === 0) return null;
            return (
              <div key={cat.key}>
                {catIdx > 0 && (
                  <div className="my-2 mx-2">
                    <div className="h-px bg-white/10" />
                  </div>
                )}
                <ul className="space-y-1">
                  {items.map(item => (
                    <MenuItemRender key={item.id} item={item} />
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      );
    }

    // Admin expanded: full category headers
    return (
      <div className="space-y-4">
        {categories.map(cat => {
          const items = menuItems.filter(i => i.category === cat.key);
          if (items.length === 0) return null;
          return (
            <div key={cat.key}>
              {cat.label && (
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#5a7a9a] px-3 mb-1.5">{cat.label}</p>
              )}
              <ul className="space-y-0.5">
                {items.map(item => (
                  <MenuItemRender key={item.id} item={item} />
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <TooltipProvider delayDuration={0}>
      <aside className={cn(
        "bg-[#0d2137] h-screen flex flex-col sticky top-0 transition-all duration-300 shadow-lg",
        isCollapsed ? "w-20" : "w-64"
      )}>
        {/* Logo & Brand */}
        <div className="p-4 border-b border-white/10">
          <button onClick={() => onSectionChange("dashboard")} className="flex items-center gap-3 w-full text-left hover:opacity-80 transition-opacity">
            <img src="/assets/logo-upa-24h.png" alt="UPA 24h" className="h-10 w-auto flex-shrink-0" />
            {!isCollapsed && (
              <div className="overflow-hidden">
                <h1 className="font-bold text-base text-white truncate">Gestrategic</h1>
                <p className="text-[11px] text-[#7eb8e0]">Tecnologia em Saúde</p>
              </div>
            )}
          </button>
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-16 bg-[#0d2137] border border-[#2d7dd2]/30 rounded-full p-1 shadow-md hover:bg-[#1a3a5c] transition-colors z-10"
        >
          {isCollapsed ? <ChevronRight className="h-3.5 w-3.5 text-[#7eb8e0]" /> : <ChevronLeft className="h-3.5 w-3.5 text-[#7eb8e0]" />}
        </button>

        {/* Navigation */}
        <nav className="flex-1 p-3 overflow-y-auto scrollbar-thin">
          {renderCategorizedMenu()}
          {/* Botão de Alerta de Segurança — acessível em qualquer tela */}
          <div className="mt-4 px-1">
            <AlertaSegurancaButton collapsed={isCollapsed} />
          </div>
        </nav>

        {/* Bottom Section */}
        <div className="p-3 border-t border-white/10 space-y-2">
          <ul className="space-y-0.5">
            {bottomItems.map(item => {
              const Icon = item.icon;
              const btn = (
                <button
                  onClick={() => onSectionChange(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[#8baec8] hover:bg-white/5 hover:text-white transition-colors text-sm",
                    isCollapsed && "justify-center px-2"
                  )}
                >
                  <Icon className="h-[18px] w-[18px] flex-shrink-0" />
                  {!isCollapsed && <span className="font-medium text-sm truncate">{item.label}</span>}
                </button>
              );
              return (
                <li key={item.id}>
                  {isCollapsed ? (
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>{btn}</TooltipTrigger>
                      <TooltipContent side="right" className="bg-[#1a3a5c] text-white border-[#2d7dd2]/30 text-xs font-medium shadow-lg">
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  ) : btn}
                </li>
              );
            })}
          </ul>

          <Separator className="my-2 bg-white/10" />

          {/* User Profile & Logout */}
          <div className={cn("flex items-center gap-3 p-2 rounded-lg bg-white/5", isCollapsed && "justify-center")}>
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarFallback className="bg-[#2d7dd2]/20 text-[#5ba3d9] text-xs font-semibold">
                {getInitials(userName)}
              </AvatarFallback>
            </Avatar>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{userName}</p>
                <p className="text-[11px] text-[#5a7a9a] truncate">{userEmail}</p>
              </div>
            )}
          </div>

          <Button
            variant="ghost"
            onClick={handleLogout}
            className={cn(
              "w-full text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors h-9 text-sm",
              isCollapsed ? "px-2" : "justify-start"
            )}
            title={isCollapsed ? "Sair" : undefined}
          >
            <LogOut className="h-[18px] w-[18px] flex-shrink-0" />
            {!isCollapsed && <span className="ml-2 font-medium">Sair</span>}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  );
};

export default Sidebar;
