import React, { useState, useEffect } from "react";
import { 
  Users, ClipboardList, AlertTriangle, Calendar, Ticket, 
  FileText, CheckCircle2, Clock, Wrench, BarChart3, 
  Building2, FlaskConical, RefreshCw, TrendingUp, GraduationCap
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Skeleton } from "@/components/ui/skeleton";
import { MetricasSegurancaWidget } from "@/components/seguranca";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DashboardStats {
  chamadosAbertos: number;
  chamadosPendentes: number;
  chamadosHoje: number;
  chamadosResolvidos: number;
  tarefasPendentes: number;
  tarefasHoje: number;
  prontuariosPendentes: number;
  prontuariosAvaliados: number;
  produtosEstoqueBaixo: number;
  escalasHoje: number;
  colaboradoresSobGestao: number;
  logsHoje: number;
  capacitacoesPendentes: number;
}

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ElementType;
  color: "primary" | "success" | "warning" | "info" | "destructive";
  trend?: "up" | "down";
  loading?: boolean;
  urgent?: boolean;
  tooltip?: string;
  onClick?: () => void;
}

const colorClasses = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  info: "bg-info/10 text-info",
  destructive: "bg-destructive/10 text-destructive",
};

const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  ({ title, value, description, icon: Icon, color, trend, loading, urgent, onClick }, ref) => (
    <Card ref={ref} onClick={onClick} className={`shadow-sm hover:shadow-lg transition-all duration-300 border-border relative overflow-hidden hover:-translate-y-0.5 group cursor-pointer hover:ring-1 hover:ring-primary/30 ${urgent ? "border-l-4 border-l-warning ring-1 ring-warning/20" : "hover:border-primary/20"}`}>
      {urgent && (
        <div className="absolute top-0 right-0 w-0 h-0 border-t-[24px] border-t-warning/80 border-l-[24px] border-l-transparent" />
      )}
      {/* Subtle gradient overlay on hover */}
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br ${
        color === "primary" ? "from-primary/3" : 
        color === "success" ? "from-success/3" : 
        color === "warning" ? "from-warning/3" : 
        color === "info" ? "from-info/3" : "from-destructive/3"
      } to-transparent pointer-events-none`} />
      <CardContent className="p-5 relative">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            {loading ? (
              <Skeleton className="h-8 w-16 mt-1.5" />
            ) : (
              <p className={`text-2xl font-bold mt-1.5 tracking-tight ${urgent ? "text-warning" : "text-foreground"}`}>{value}</p>
            )}
            {description && (
              <p className={`text-xs mt-1.5 font-medium ${trend === "up" ? "text-success" : trend === "down" ? "text-destructive" : "text-muted-foreground"}`}>
                {description}
              </p>
            )}
          </div>
          <div className={`p-3 rounded-xl ${colorClasses[color]} transition-transform duration-300 group-hover:scale-110`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
);
StatCard.displayName = "StatCard";

const DashboardPersonalizado = ({ onNavigate }: { onNavigate?: (section: string) => void }) => {
  const [stats, setStats] = useState<DashboardStats>({
    chamadosAbertos: 0,
    chamadosPendentes: 0,
    chamadosHoje: 0,
    chamadosResolvidos: 0,
    tarefasPendentes: 0,
    tarefasHoje: 0,
    prontuariosPendentes: 0,
    prontuariosAvaliados: 0,
    produtosEstoqueBaixo: 0,
    escalasHoje: 0,
    colaboradoresSobGestao: 0,
    logsHoje: 0,
    capacitacoesPendentes: 0,
  });
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState<"hoje" | "7dias" | "30dias">("hoje");
  const {
    role, userId, isAdmin, isGestor, isTI, isManutencao, 
    isEngenhariaCinica, isLaboratorio, isFaturamento, 
    isRecepcao, isClassificacao, isNir, isTecnico 
  } = useUserRole();

  const fetchStats = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const hoje = new Date();
      let dataInicio: string;
      if (periodo === "7dias") {
        const d = new Date(hoje);
        d.setDate(d.getDate() - 7);
        dataInicio = d.toISOString().split('T')[0];
      } else if (periodo === "30dias") {
        const d = new Date(hoje);
        d.setDate(d.getDate() - 30);
        dataInicio = d.toISOString().split('T')[0];
      } else {
        dataInicio = hoje.toISOString().split('T')[0];
      }
      const hojeStr = hoje.toISOString().split('T')[0];

      // Fetch chamados stats
      const [chamadosData, tarefasData, prontuariosPendentesData, prontuariosConcluidosData, escalasData] = await Promise.all([
        // Chamados
        supabase.from("chamados").select("status, data_abertura", { count: "exact" }),
        // Tarefas da agenda
        supabase.rpc("get_tarefas_pendentes_count", { _user_id: userId }),
        // Prontuários pendentes - use count with head:true instead of fetching all rows
        supabase.from("saida_prontuarios").select("id", { count: "exact", head: true })
          .in("status", ["pendente_classificacao", "pendente_nir", "aguardando_classificacao"]),
        // Prontuários concluídos - separate count query
        supabase.from("saida_prontuarios").select("id", { count: "exact", head: true })
          .eq("status", "concluido"),
        // Escalas de hoje
        supabase.from("escalas_laboratorio").select("id", { count: "exact", head: true })
          .eq("dia", new Date().getDate())
          .eq("mes", new Date().getMonth() + 1)
          .eq("ano", new Date().getFullYear()),
      ]);

      // Chamados por status
      const chamados = chamadosData.data || [];
      const chamadosAbertos = chamados.filter(c => c.status === "aberto").length;
      const chamadosPendentes = chamados.filter(c => c.status === "em_andamento").length;
      const chamadosResolvidos = chamados.filter(c => c.status === "resolvido").length;
      const chamadosHoje = chamados.filter(c => c.data_abertura?.startsWith(hojeStr)).length;

      // Agenda items hoje
      const { data: agendaHojeData } = await supabase
        .from("agenda_items")
        .select("id", { count: "exact" })
        .gte("data_inicio", dataInicio);

      // Colaboradores sob gestão (para gestores)
      let colaboradoresSobGestao = 0;
      if (isGestor || isAdmin) {
        const { data: colabData } = await supabase.rpc("get_usuarios_sob_gestao", { _gestor_id: userId });
        colaboradoresSobGestao = colabData?.length || 0;
      }

      // Logs de hoje (para admin)
      let logsHoje = 0;
      if (isAdmin) {
        const { count } = await supabase
          .from("logs_acesso")
          .select("id", { count: "exact", head: true })
          .gte("created_at", `${dataInicio}T00:00:00`);
        logsHoje = count || 0;
      }

      // Prontuários stats
      const prontuariosPendentes = prontuariosPendentesData.count || 0;
      const prontuariosAvaliados = prontuariosConcluidosData.count || 0;

      // Capacitações pendentes - treinamentos onde o usuário está inscrito mas não está capacitado
      let capacitacoesPendentes = 0;
      const { count: capCount } = await supabase
        .from("lms_inscricoes")
        .select("id", { count: "exact", head: true })
        .eq("usuario_id", userId)
        .neq("status", "capacitado");
      capacitacoesPendentes = capCount || 0;

      setStats({
        chamadosAbertos,
        chamadosPendentes,
        chamadosHoje,
        chamadosResolvidos,
        tarefasPendentes: tarefasData.data || 0,
        tarefasHoje: agendaHojeData?.length || 0,
        prontuariosPendentes,
        prontuariosAvaliados,
        produtosEstoqueBaixo: 0,
        escalasHoje: escalasData.count || 0,
        colaboradoresSobGestao,
        logsHoje,
        capacitacoesPendentes,
      });
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchStats();
    }
  }, [userId, role, periodo]);

  // Cards baseados no perfil do usuário
  const getCardsForRole = () => {
    const cards: StatCardProps[] = [];

    // Cards universais (todos os usuários)
    cards.push({
      title: "Minha Agenda",
      value: stats.tarefasPendentes,
      description: `${stats.tarefasHoje} itens hoje`,
      icon: Calendar,
      color: "info",
      loading,
      tooltip: "Mostra o total de compromissos e tarefas agendadas para o seu perfil no dia de hoje.",
      onClick: () => onNavigate?.("agenda"),
    });

    // Capacitações pendentes (universal)
    cards.push({
      title: "Capacitações Pendentes",
      value: stats.capacitacoesPendentes,
      description: stats.capacitacoesPendentes > 0 ? "Acesse a Área de Aprendizado" : "Tudo em dia!",
      icon: GraduationCap,
      color: stats.capacitacoesPendentes > 0 ? "warning" : "success",
      loading,
      urgent: stats.capacitacoesPendentes > 0,
      tooltip: "Número de treinamentos obrigatórios que ainda não foram iniciados ou concluídos pelos colaboradores.",
      onClick: () => onNavigate?.("capacitacao"),
    });

    // Admin - visão completa do sistema
    if (isAdmin) {
      cards.push(
        {
          title: "Logs do Sistema",
          value: stats.logsHoje,
          description: "Ações registradas hoje",
          icon: BarChart3,
          color: "primary",
          loading,
          tooltip: "Rastro digital de todas as ações realizadas na plataforma hoje para fins de auditoria e segurança.",
          onClick: () => onNavigate?.("logs"),
        }
      );
    }

    // Gestor - colaboradores e tarefas
    if (isGestor || isAdmin) {
      cards.push({
        title: "Colaboradores",
        value: stats.colaboradoresSobGestao,
        description: "Sob sua gestão",
        icon: Users,
        color: "primary",
        loading,
        tooltip: "Total de funcionários atualmente vinculados à sua unidade de gestão.",
        onClick: () => onNavigate?.("equipe"),
      });
    }

    // Técnicos (TI, Manutenção, Eng. Clínica) - chamados e materiais
    if (isTI || isManutencao || isEngenhariaCinica) {
      cards.push(
        {
          title: "Chamados em Andamento",
          value: stats.chamadosPendentes,
          description: "Aguardando resolução",
          icon: Wrench,
          color: "warning",
          loading,
          urgent: stats.chamadosPendentes > 0,
          onClick: () => onNavigate?.("chamados"),
        },
        {
          title: "Materiais Baixo Estoque",
          value: stats.produtosEstoqueBaixo,
          description: "Precisam reposição",
          icon: AlertTriangle,
          color: "destructive",
          loading,
          urgent: stats.produtosEstoqueBaixo > 0,
          onClick: () => onNavigate?.("inventario"),
        }
      );
    }

    // Laboratório - escalas
    if (isLaboratorio || isAdmin) {
      cards.push({
        title: "Escalas Hoje",
        value: stats.escalasHoje,
        description: "Funcionários escalados",
        icon: FlaskConical,
        color: "info",
        loading,
        tooltip: "Quantitativo de colaboradores ativos com escala confirmada para o turno atual.",
        onClick: () => onNavigate?.("escala-laboratorio"),
      });
    }

    // Faturamento, NIR, Classificação, Recepção - prontuários
    if (isFaturamento || isRecepcao || isClassificacao || isNir || isAdmin) {
      cards.push(
        {
          title: "Prontuários Pendentes",
          value: stats.prontuariosPendentes,
          description: "Aguardando processamento",
          icon: FileText,
          color: "warning",
          loading,
          urgent: stats.prontuariosPendentes > 0,
          tooltip: "Documentos que aguardam revisão, assinatura ou processamento para serem finalizados.",
          onClick: () => onNavigate?.("saida-prontuarios"),
        },
        {
          title: "Prontuários Concluídos",
          value: stats.prontuariosAvaliados,
          description: "Processados com sucesso",
          icon: CheckCircle2,
          color: "success",
          loading,
          tooltip: "Total de prontuários que já passaram por todas as etapas de validação e foram finalizados com sucesso.",
          onClick: () => onNavigate?.("saida-prontuarios"),
        }
      );
    }

    return cards;
  };

  const roleLabels: Record<string, string> = {
    admin: "Administrador",
    gestor: "Gestor",
    funcionario: "Funcionário",
    recepcao: "Recepção",
    classificacao: "Classificação",
    nir: "NIR",
    faturamento: "Faturamento",
    ti: "Tecnologia da Informação",
    manutencao: "Manutenção",
    engenharia_clinica: "Engenharia Clínica",
    laboratorio: "Laboratório",
  };

  const cards = getCardsForRole();

  return (
    <div className="space-y-6">
      {/* Header com perfil */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 shadow-sm">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground tracking-tight">Dashboard</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="outline" className="bg-primary/8 text-primary border-primary/20 text-xs font-medium">
                {role ? roleLabels[role] || role : "Carregando..."}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-muted/40 p-0.5 rounded-xl border border-border/50">
            {([["hoje", "Hoje"], ["7dias", "7 dias"], ["30dias", "30 dias"]] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setPeriodo(key)}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all duration-300 ${
                  periodo === key
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchStats}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <TooltipProvider delayDuration={300}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {cards.map((card, index) => (
            card.tooltip ? (
              <Tooltip key={index}>
                <TooltipTrigger asChild>
                  <StatCard {...card} />
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-xs">
                  {card.tooltip}
                </TooltipContent>
              </Tooltip>
            ) : (
              <StatCard key={index} {...card} />
            )
          ))}
        </div>
      </TooltipProvider>

      {/* Métricas de Segurança — apenas para admin */}
      {isAdmin && <MetricasSegurancaWidget />}
    </div>
  );
};

export default DashboardPersonalizado;
