import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { LayoutDashboard, Users, Settings, HelpCircle, LogOut, ChevronLeft, ChevronRight, ClipboardX, Receipt, Shield, ShieldAlert, Monitor, Wrench, Stethoscope, FlaskConical, Calendar, UtensilsCrossed, Ambulance, FileText, UserCog, Shirt, HardHat, Heart, AlertTriangle, Syringe, ExternalLink, MessageSquare, Ticket, GraduationCap, Video, Building2, UserRound, BedDouble } from "lucide-react";
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
    isSeguranca, isAssistenciaSocial, isRestaurante, isRouparia,
    isGerenteAdministrativo, isFarmaceuticoRT, isCoordenadorMedico,
    isSupervisorOperacional, isCoordenadorEnfermagem
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
    category?: "dashboard" | "assistencial" | "apoio_logistica" | "governanca" | "administrativo" | "comunicacao";
  };

  const getMenuItems = (): MenuItem[] => {
    const items: MenuItem[] = [];

    if (isAdmin) {
      items.push(
        { icon: LayoutDashboard, label: "Dashboard", id: "dashboard", category: "dashboard" },
        { icon: Building2, label: "Gerência", id: "gerencia", category: "dashboard" },
        // Assistencial
        { icon: Ambulance, label: "NIR", id: "nir", category: "assistencial" },
        { icon: Stethoscope, label: "Médicos", id: "medicos", category: "assistencial" },
        { icon: Syringe, label: "Enfermagem", id: "enfermagem", category: "assistencial" },
        { icon: Heart, label: "Assist. Social/Psicologia", id: "assistencia-social", category: "assistencial" },
        { icon: Receipt, label: "Faturamento", id: "faturamento", category: "assistencial" },
        { icon: BedDouble, label: "Mapa de Leitos", id: "mapa-leitos", category: "assistencial" },
        // Apoio e Logística
        { icon: Shirt, label: "Rouparia", id: "rouparia", category: "apoio_logistica" },
        { icon: UtensilsCrossed, label: "Restaurante", id: "restaurante", category: "apoio_logistica" },
        { icon: Wrench, label: "Manutenção", id: "tecnico-manutencao", category: "apoio_logistica" },
        { icon: Stethoscope, label: "Eng. Clínica", id: "tecnico-engenharia", category: "apoio_logistica" },
        { icon: Shield, label: "Seg. Patrimonial", id: "seguranca-patrimonial", category: "apoio_logistica" },
        // Governança e Qualidade
        { icon: AlertTriangle, label: "Qualidade/NSP", id: "qualidade", category: "governanca" },
        { icon: HardHat, label: "Seg. Trabalho", id: "seguranca-trabalho", category: "governanca" },
        { icon: Video, label: "Reuniões", id: "reuniao", category: "governanca" },
        { icon: FileText, label: "Docs Interact", id: "documentos-interact", category: "governanca" },
        // Administrativo / RH
        { icon: UserCog, label: "RH/DP", id: "rhdp", category: "administrativo" },
        { icon: UserRound, label: "Colaborador", id: "colaborador", category: "administrativo" },
        { icon: GraduationCap, label: "Capacitação", id: "lms", category: "administrativo" },
        { icon: Monitor, label: "TI", id: "tecnico-ti", category: "administrativo" },
        { icon: ClipboardX, label: "Recepção", id: "controle-fichas", category: "administrativo" },
        { icon: Shield, label: "Administração", id: "admin", category: "administrativo" },
        // Comunicação / Apoio
        { icon: MessageSquare, label: "Chat", id: "chat", category: "comunicacao" },
        { icon: Ticket, label: "Abrir Chamado", id: "abrir-chamado", category: "comunicacao" },
        { icon: Calendar, label: "Agenda", id: "agenda", category: "comunicacao" },
        { icon: Stethoscope, label: "Sistema Salus", id: "salus", category: "comunicacao" }
      );
      return items;
    }

    if (isGestor) {
      items.push(
        { icon: LayoutDashboard, label: "Dashboard", id: "dashboard", category: "dashboard" },
        { icon: Stethoscope, label: "Médicos", id: "medicos", category: "assistencial" },
        { icon: Syringe, label: "Enfermagem", id: "enfermagem", category: "assistencial" },
        { icon: FlaskConical, label: "Resultados Exames", id: "laboratorio", category: "assistencial" },
        { icon: UserCog, label: "Equipe", id: "equipe", category: "administrativo" },
        { icon: Calendar, label: "Agenda", id: "agenda", category: "comunicacao" },
        { icon: FileText, label: "Docs Interact", id: "documentos-interact", category: "governanca" },
        { icon: Stethoscope, label: "Sistema Salus", id: "salus", category: "comunicacao" }
      );
      return items;
    }
    if (isEnfermagem) {
      items.push(
        { icon: LayoutDashboard, label: "Dashboard", id: "dashboard", category: "dashboard" },
        { icon: Syringe, label: "Enfermagem", id: "enfermagem", category: "assistencial" },
        { icon: Heart, label: "Assist. Social/Psicologia", id: "assistencia-social", category: "assistencial" },
        { icon: BedDouble, label: "Mapa de Leitos", id: "mapa-leitos", category: "assistencial" },
        { icon: UtensilsCrossed, label: "Restaurante", id: "restaurante", category: "apoio_logistica" },
        { icon: Calendar, label: "Agenda", id: "agenda", category: "comunicacao" },
        { icon: Ticket, label: "Abrir Chamado", id: "abrir-chamado", category: "comunicacao" },
        { icon: GraduationCap, label: "Treinamentos", id: "lms", category: "administrativo" },
        { icon: AlertTriangle, label: "Abrir Notificação", id: "reportar-incidente", category: "governanca" },
        { icon: MessageSquare, label: "Chat", id: "chat", category: "comunicacao" }
      );
      return items;
    }
    if (isRecepcao) {
      items.push(
        { icon: LayoutDashboard, label: "Dashboard", id: "dashboard", category: "dashboard" },
        { icon: ClipboardX, label: "Recepção", id: "recepcao", category: "assistencial" },
        { icon: Receipt, label: "Faturamento", id: "faturamento", category: "assistencial" },
        { icon: Calendar, label: "Agenda", id: "agenda", category: "comunicacao" }
      );
      return items;
    }
    if (isNir) {
      items.push(
        { icon: LayoutDashboard, label: "Dashboard", id: "dashboard", category: "dashboard" },
        { icon: Ambulance, label: "NIR", id: "nir", category: "assistencial" },
        { icon: BedDouble, label: "Mapa de Leitos", id: "mapa-leitos", category: "assistencial" },
        { icon: Receipt, label: "Faturamento", id: "faturamento", category: "assistencial" },
        { icon: Calendar, label: "Agenda", id: "agenda", category: "comunicacao" }
      );
      return items;
    }
    if (isFaturamento) {
      items.push(
        { icon: LayoutDashboard, label: "Dashboard", id: "dashboard", category: "dashboard" },
        { icon: Receipt, label: "Faturamento", id: "faturamento", category: "assistencial" },
        { icon: Calendar, label: "Agenda", id: "agenda", category: "comunicacao" }
      );
      return items;
    }
    if (isTI) {
      items.push(
        { icon: LayoutDashboard, label: "Dashboard", id: "dashboard", category: "dashboard" },
        { icon: Monitor, label: "TI", id: "tecnico-ti", category: "administrativo" },
        { icon: Calendar, label: "Agenda", id: "agenda", category: "comunicacao" }
      );
      return items;
    }
    if (isManutencao) {
      items.push(
        { icon: LayoutDashboard, label: "Dashboard", id: "dashboard", category: "dashboard" },
        { icon: Wrench, label: "Manutenção", id: "tecnico-manutencao", category: "apoio_logistica" },
        { icon: Calendar, label: "Agenda", id: "agenda", category: "comunicacao" }
      );
      return items;
    }
    if (isEngenhariaCinica) {
      items.push(
        { icon: LayoutDashboard, label: "Dashboard", id: "dashboard", category: "dashboard" },
        { icon: Stethoscope, label: "Eng. Clínica", id: "tecnico-engenharia", category: "apoio_logistica" },
        { icon: Calendar, label: "Agenda", id: "agenda", category: "comunicacao" }
      );
      return items;
    }
    if (isMedicos) {
      items.push(
        { icon: LayoutDashboard, label: "Dashboard", id: "dashboard", category: "dashboard" },
        { icon: Stethoscope, label: "Médicos", id: "medicos", category: "assistencial" },
        { icon: FlaskConical, label: "Resultados Exames", id: "laboratorio", category: "assistencial" },
        { icon: Calendar, label: "Agenda", id: "agenda", category: "comunicacao" }
      );
      return items;
    }
    if (isLaboratorio) {
      items.push(
        { icon: LayoutDashboard, label: "Dashboard", id: "dashboard", category: "dashboard" },
        { icon: FlaskConical, label: "Laboratório", id: "laboratorio", category: "assistencial" },
        { icon: Calendar, label: "Agenda", id: "agenda", category: "comunicacao" }
      );
      return items;
    }
    if (isRestaurante) {
      items.push(
        { icon: LayoutDashboard, label: "Dashboard", id: "dashboard", category: "dashboard" },
        { icon: UtensilsCrossed, label: "Restaurante", id: "restaurante", category: "apoio_logistica" },
        { icon: Calendar, label: "Agenda", id: "agenda", category: "comunicacao" }
      );
      return items;
    }
    if (isRHDP) {
      items.push(
        { icon: LayoutDashboard, label: "Dashboard", id: "dashboard", category: "dashboard" },
        { icon: UserCog, label: "RH/DP", id: "rhdp", category: "administrativo" },
        { icon: Calendar, label: "Agenda", id: "agenda", category: "comunicacao" }
      );
      return items;
    }
    if (isQualidade || isNSP) {
      items.push(
        { icon: LayoutDashboard, label: "Dashboard", id: "dashboard", category: "dashboard" },
        { icon: AlertTriangle, label: "Qualidade/NSP", id: "qualidade", category: "governanca" },
        { icon: Calendar, label: "Agenda", id: "agenda", category: "comunicacao" }
      );
      return items;
    }
    if (isAssistenciaSocial) {
      items.push(
        { icon: LayoutDashboard, label: "Dashboard", id: "dashboard", category: "dashboard" },
        { icon: Heart, label: "Assist. Social/Psicologia", id: "assistencia-social", category: "assistencial" },
        { icon: Calendar, label: "Agenda", id: "agenda", category: "comunicacao" },
        { icon: Ticket, label: "Abrir Chamado", id: "abrir-chamado", category: "comunicacao" },
        { icon: GraduationCap, label: "Treinamentos", id: "lms", category: "administrativo" },
        { icon: MessageSquare, label: "Chat", id: "chat", category: "comunicacao" }
      );
      return items;
    }
    if (isRouparia) {
      items.push(
        { icon: LayoutDashboard, label: "Dashboard", id: "dashboard", category: "dashboard" },
        { icon: Shirt, label: "Rouparia", id: "rouparia", category: "apoio_logistica" },
        { icon: Calendar, label: "Agenda", id: "agenda", category: "comunicacao" }
      );
      return items;
    }
    if (isSeguranca) {
      items.push(
        { icon: LayoutDashboard, label: "Dashboard", id: "dashboard", category: "dashboard" },
        { icon: Shield, label: "Seg. Patrimonial", id: "seguranca-patrimonial", category: "apoio_logistica" },
        { icon: HardHat, label: "Seg. Trabalho", id: "seguranca-trabalho", category: "governanca" },
        { icon: Calendar, label: "Agenda", id: "agenda", category: "comunicacao" }
      );
      return items;
    }

    // Gerente Administrativo
    if (isGerenteAdministrativo) {
      items.push(
        { icon: LayoutDashboard, label: "Dashboard", id: "dashboard", category: "dashboard" },
        { icon: Building2, label: "Gerência", id: "gerencia", category: "dashboard" },
        { icon: UserCog, label: "RH/DP", id: "rhdp", category: "administrativo" },
        { icon: Receipt, label: "Faturamento", id: "faturamento", category: "assistencial" },
        { icon: Users, label: "Equipe", id: "equipe", category: "administrativo" },
        { icon: Calendar, label: "Agenda", id: "agenda", category: "comunicacao" },
      );
      return items;
    }
    // Farmacêutico RT
    if (isFarmaceuticoRT) {
      items.push(
        { icon: LayoutDashboard, label: "Dashboard", id: "dashboard", category: "dashboard" },
        { icon: Syringe, label: "Enfermagem", id: "enfermagem", category: "assistencial" },
        { icon: AlertTriangle, label: "Qualidade/NSP", id: "qualidade", category: "governanca" },
        { icon: Calendar, label: "Agenda", id: "agenda", category: "comunicacao" },
      );
      return items;
    }
    // Coordenador Médico
    if (isCoordenadorMedico) {
      items.push(
        { icon: LayoutDashboard, label: "Dashboard", id: "dashboard", category: "dashboard" },
        { icon: Stethoscope, label: "Médicos", id: "medicos", category: "assistencial" },
        { icon: Ambulance, label: "NIR", id: "nir", category: "assistencial" },
        { icon: FlaskConical, label: "Resultados Exames", id: "laboratorio", category: "assistencial" },
        { icon: AlertTriangle, label: "Qualidade/NSP", id: "qualidade", category: "governanca" },
        { icon: Calendar, label: "Agenda", id: "agenda", category: "comunicacao" },
      );
      return items;
    }
    // Supervisor de Serviços Operacionais
    if (isSupervisorOperacional) {
      items.push(
        { icon: LayoutDashboard, label: "Dashboard", id: "dashboard", category: "dashboard" },
        { icon: Wrench, label: "Manutenção", id: "tecnico-manutencao", category: "apoio_logistica" },
        { icon: Shirt, label: "Rouparia", id: "rouparia", category: "apoio_logistica" },
        { icon: UtensilsCrossed, label: "Restaurante", id: "restaurante", category: "apoio_logistica" },
        { icon: Shield, label: "Seg. Patrimonial", id: "seguranca-patrimonial", category: "apoio_logistica" },
        { icon: HardHat, label: "Seg. Trabalho", id: "seguranca-trabalho", category: "governanca" },
        { icon: Calendar, label: "Agenda", id: "agenda", category: "comunicacao" },
      );
      return items;
    }
    // Coordenador de Enfermagem
    if (isCoordenadorEnfermagem) {
      items.push(
        { icon: LayoutDashboard, label: "Dashboard", id: "dashboard", category: "dashboard" },
        { icon: Syringe, label: "Enfermagem", id: "enfermagem", category: "assistencial" },
        { icon: Ambulance, label: "NIR", id: "nir", category: "assistencial" },
        { icon: Heart, label: "Assist. Social/Psicologia", id: "assistencia-social", category: "assistencial" },
        { icon: BedDouble, label: "Mapa de Leitos", id: "mapa-leitos", category: "assistencial" },
        { icon: UtensilsCrossed, label: "Restaurante", id: "restaurante", category: "apoio_logistica" },
        { icon: Calendar, label: "Agenda", id: "agenda", category: "comunicacao" },
      );
      return items;
    }

    // Funcionário padrão
    items.push(
      { icon: LayoutDashboard, label: "Dashboard", id: "dashboard", category: "dashboard" },
      { icon: UserRound, label: "Colaborador", id: "colaborador", category: "administrativo" },
      { icon: Calendar, label: "Agenda", id: "agenda", category: "comunicacao" },
      { icon: UtensilsCrossed, label: "Restaurante", id: "restaurante", category: "apoio_logistica" }
    );
    return items;
  };

  const addCommonMenuItems = (items: MenuItem[]): MenuItem[] => {
    if (!isAdmin && !items.some(item => item.id === "colaborador")) {
      items.push({ icon: UserRound, label: "Colaborador", id: "colaborador", category: "administrativo" });
    }
    if (!isAdmin && !items.some(item => item.id === "reportar-incidente")) {
      items.push({ icon: AlertTriangle, label: "Abrir Notificação", id: "reportar-incidente", category: "governanca" });
    }
    if (!isAdmin && !items.some(item => item.id === "abrir-chamado")) {
      items.push({ icon: Ticket, label: "Abrir Chamado", id: "abrir-chamado", category: "comunicacao" });
    }
    if (!items.some(item => item.id === "chat")) {
      items.push({ icon: MessageSquare, label: "Chat", id: "chat", category: "comunicacao" });
    }
    if (!items.some(item => item.id === "restaurante")) {
      items.push({ icon: UtensilsCrossed, label: "Restaurante", id: "restaurante", category: "apoio_logistica" });
    }
    if (!items.some(item => item.id === "lms")) {
      items.push({ icon: GraduationCap, label: "Treinamentos", id: "lms", category: "administrativo" });
    }
    if (!items.some(item => item.id === "documentos-interact")) {
      items.push({ icon: FileText, label: "Docs Interact", id: "documentos-interact", category: "governanca" });
    }
    if (!items.some(item => item.id === "salus")) {
      items.push({ icon: Stethoscope, label: "Sistema Salus", id: "salus", category: "comunicacao" });
    }
    if (isNir && !items.some(item => item.id === "faturamento")) {
      items.push({ icon: Receipt, label: "Faturamento", id: "faturamento", category: "assistencial" });
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
            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 ring-2 ring-sidebar">
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
    const isExternalLink = item.id === "documentos-interact" || item.id === "abrir-chamado";

    const buttonClasses = cn(
      "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm relative",
      isActive
        ? "bg-sidebar-primary/15 text-white font-semibold before:absolute before:left-0 before:top-1 before:bottom-1 before:w-[3px] before:rounded-full before:bg-sidebar-primary before:shadow-[0_0_8px_rgba(78,205,196,0.5)]"
        : "text-sidebar-foreground hover:bg-white/5 hover:text-white",
      isCollapsed && "justify-center px-2"
    );

    const content = (
      <MenuButtonContent item={item} isActive={isActive} />
    );

    // Wrap with tooltip
    const withTooltip = (trigger: React.ReactNode) => (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{trigger}</TooltipTrigger>
        <TooltipContent side="right" className="bg-sidebar-accent text-white border-sidebar-primary/30 text-xs font-medium shadow-lg">
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
            className={cn(buttonClasses, "text-sidebar-foreground hover:bg-white/5 hover:text-white")}
          >
            {content}
            {!isCollapsed && <ExternalLink className="h-3 w-3 opacity-60 ml-auto flex-shrink-0" />}
          </a>
        </li>
      );
      return isCollapsed ? <li>{withTooltip(
        <a href={externalUrl} onClick={handleClick} className={cn(buttonClasses, "text-sidebar-foreground hover:bg-white/5 hover:text-white")}>
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

  // Category groups
  const categories: Array<{ key: string; label: string }> = [
    { key: "dashboard", label: "" },
    { key: "assistencial", label: "Assistencial" },
    { key: "apoio_logistica", label: "Apoio e Logística" },
    { key: "governanca", label: "Governança e Qualidade" },
    { key: "administrativo", label: "Administrativo / RH" },
    { key: "comunicacao", label: "Comunicação / Apoio" },
  ];

  const renderCategorizedMenu = () => {
    // Check if there are multiple categories with items
    const populatedCategories = categories.filter(cat => menuItems.some(i => i.category === cat.key));
    const shouldGroup = populatedCategories.length > 2;

    if (!shouldGroup) {
      return (
        <ul className="space-y-1">
          {menuItems.map(item => (
            <MenuItemRender key={item.id} item={item} />
          ))}
        </ul>
      );
    }

    if (isCollapsed) {
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

    // Expanded: full category headers
    return (
      <div className="space-y-4">
        {categories.map(cat => {
          const items = menuItems.filter(i => i.category === cat.key);
          if (items.length === 0) return null;
          return (
            <div key={cat.key}>
              {cat.label && (
                <p className="text-[10px] font-bold uppercase tracking-wider text-sidebar-foreground/60 px-3 mb-1.5">{cat.label}</p>
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
        "bg-sidebar h-screen flex flex-col sticky top-0 transition-all duration-300 shadow-lg",
        isCollapsed ? "w-20" : "w-64"
      )}>
        {/* Logo & Brand */}
        <div className="p-4 border-b border-white/10">
          <button onClick={() => onSectionChange("dashboard")} className="flex items-center gap-3 w-full text-left hover:opacity-80 transition-opacity">
            <img src="/assets/logo-upa-24h.png" alt="UPA 24h" className="h-10 w-auto flex-shrink-0" />
            {!isCollapsed && (
              <div className="overflow-hidden">
                <h1 className="font-bold text-base text-white truncate">Gestrategic</h1>
                <p className="text-[11px] text-sidebar-foreground/70">Tecnologia em Saúde</p>
              </div>
            )}
          </button>
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-16 bg-sidebar border border-sidebar-primary/30 rounded-full p-1 shadow-md hover:bg-sidebar-accent transition-colors z-10"
        >
          {isCollapsed ? <ChevronRight className="h-3.5 w-3.5 text-sidebar-foreground" /> : <ChevronLeft className="h-3.5 w-3.5 text-sidebar-foreground" />}
        </button>

        {/* Navigation */}
        <nav className="flex-1 p-3 overflow-y-auto scrollbar-thin">
          {renderCategorizedMenu()}
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
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground hover:bg-white/5 hover:text-white transition-colors text-sm",
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
                      <TooltipContent side="right" className="bg-sidebar-accent text-white border-sidebar-primary/30 text-xs font-medium shadow-lg">
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
              <AvatarFallback className="bg-sidebar-primary/20 text-sidebar-primary text-xs font-semibold">
                {getInitials(userName)}
              </AvatarFallback>
            </Avatar>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{userName}</p>
                <p className="text-[11px] text-sidebar-foreground/60 truncate">{userEmail}</p>
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
