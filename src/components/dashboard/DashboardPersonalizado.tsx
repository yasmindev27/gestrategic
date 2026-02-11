import React, { useState, useEffect } from "react";
import { 
  Users, ClipboardList, AlertTriangle, Calendar, Ticket, 
  FileText, CheckCircle2, Clock, Wrench, BarChart3, 
  Building2, FlaskConical, RefreshCw, TrendingUp
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Skeleton } from "@/components/ui/skeleton";

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
}

const colorClasses = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  info: "bg-info/10 text-info",
  destructive: "bg-destructive/10 text-destructive",
};

const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  ({ title, value, description, icon: Icon, color, trend, loading, urgent }, ref) => (
    <Card ref={ref} className={`shadow-sm hover:shadow-md transition-all border-border relative overflow-hidden ${urgent ? "border-l-4 border-l-warning ring-1 ring-warning/20" : ""}`}>
      {urgent && (
        <div className="absolute top-0 right-0 w-0 h-0 border-t-[24px] border-t-warning/80 border-l-[24px] border-l-transparent" />
      )}
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            {loading ? (
              <Skeleton className="h-8 w-16 mt-1" />
            ) : (
              <p className={`text-2xl font-bold mt-1 ${urgent ? "text-warning" : "text-foreground"}`}>{value}</p>
            )}
            {description && (
              <p className={`text-xs mt-1 ${trend === "up" ? "text-success" : trend === "down" ? "text-destructive" : "text-muted-foreground"}`}>
                {description}
              </p>
            )}
          </div>
          <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
);
StatCard.displayName = "StatCard";

const DashboardPersonalizado = () => {
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
      const [chamadosData, tarefasData, prontuariosData, produtosData, escalasData] = await Promise.all([
        // Chamados
        supabase.from("chamados").select("status, data_abertura", { count: "exact" }),
        // Tarefas da agenda
        supabase.rpc("get_tarefas_pendentes_count", { _user_id: userId }),
        // Prontuários pendentes (saida_prontuarios)
        supabase.from("saida_prontuarios").select("status", { count: "exact" }),
        // Produtos com estoque baixo
        supabase.from("produtos").select("id", { count: "exact" }).filter("quantidade_atual", "lte", "quantidade_minima"),
        // Escalas de hoje
        supabase.from("escalas_laboratorio").select("id", { count: "exact" })
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
      const prontuarios = prontuariosData.data || [];
      const prontuariosPendentes = prontuarios.filter(p => 
        p.status === "pendente_classificacao" || p.status === "pendente_nir"
      ).length;
      const prontuariosAvaliados = prontuarios.filter(p => p.status === "concluido").length;

      setStats({
        chamadosAbertos,
        chamadosPendentes,
        chamadosHoje,
        chamadosResolvidos,
        tarefasPendentes: tarefasData.data || 0,
        tarefasHoje: agendaHojeData?.length || 0,
        prontuariosPendentes,
        prontuariosAvaliados,
        produtosEstoqueBaixo: produtosData.count || 0,
        escalasHoje: escalasData.count || 0,
        colaboradoresSobGestao,
        logsHoje,
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
        },
        {
          title: "Materiais Baixo Estoque",
          value: stats.produtosEstoqueBaixo,
          description: "Precisam reposição",
          icon: AlertTriangle,
          color: "destructive",
          loading,
          urgent: stats.produtosEstoqueBaixo > 0,
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
        },
        {
          title: "Prontuários Concluídos",
          value: stats.prontuariosAvaliados,
          description: "Processados com sucesso",
          icon: CheckCircle2,
          color: "success",
          loading,
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
          <div className="p-2 rounded-lg bg-primary/10">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Dashboard Personalizado</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm text-muted-foreground">Seu perfil:</span>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                {role ? roleLabels[role] || role : "Carregando..."}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-muted/50 p-0.5 rounded-lg">
            {([["hoje", "Hoje"], ["7dias", "7 dias"], ["30dias", "30 dias"]] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setPeriodo(key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                  periodo === key
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, index) => (
          <StatCard key={index} {...card} />
        ))}
      </div>
    </div>
  );
};

export default DashboardPersonalizado;
