import React, { useState, useEffect } from "react";
import { SECTORS } from "@/types/bed";
import {
  BedDouble, AlertTriangle, Wrench, ClipboardCheck,
  TrendingUp, RefreshCw, Calendar, GraduationCap,
  Users, BarChart3, FileText, FlaskConical, Ticket
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSync, REALTIME_PRESETS } from "@/hooks/useRealtimeSync";
import { useUserRole } from "@/hooks/useUserRole";
import { Skeleton } from "@/components/ui/skeleton";
import { MetricasSegurancaWidget } from "@/components/seguranca";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts";
import { ScrollArea } from "@/components/ui/scroll-area";

// ── Types ──
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
  leitosOcupados: number;
  totalLeitos: number;
  incidentesCriticos: number;
  chamadosManutencao: number;
  conformidadeDietas: number;
}

interface AuditLogEntry {
  id: string;
  created_at: string;
  acao: string;
  modulo: string;
  user_id: string;
}

// ── Governance KPI Card ──
interface KPICardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ElementType;
  variant: "primary" | "destructive" | "warning" | "success";
  loading?: boolean;
  onClick?: () => void;
}

const variantStyles = {
  primary: "border-l-primary bg-primary/5",
  destructive: "border-l-destructive bg-destructive/5",
  warning: "border-l-warning bg-warning/5",
  success: "border-l-success bg-success/5",
};

const variantIconStyles = {
  primary: "text-primary",
  destructive: "text-destructive",
  warning: "text-warning",
  success: "text-success",
};

const KPICard = ({ title, value, subtitle, icon: Icon, variant, loading, onClick }: KPICardProps) => (
  <Card
    onClick={onClick}
    className={`border-l-4 ${variantStyles[variant]} shadow-sm hover:shadow-md transition-all cursor-pointer group`}
  >
    <CardContent className="p-4 flex items-center gap-4">
      <div className={`p-2.5 rounded-lg bg-card ${variantIconStyles[variant]}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{title}</p>
        {loading ? (
          <Skeleton className="h-8 w-16 mt-1" />
        ) : (
          <p className="text-2xl font-bold text-foreground tracking-tight">{value}</p>
        )}
        <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>
      </div>
    </CardContent>
  </Card>
);

// ── Mock risk chart data ──
const riskChartData = [
  { day: "Dom", nearMiss: 2, adverseEvents: 1, quality: 4 },
  { day: "Seg", nearMiss: 17, adverseEvents: 3, quality: 8 },
  { day: "Ter", nearMiss: 16, adverseEvents: 1, quality: 55 },
  { day: "Qua", nearMiss: 13, adverseEvents: 1, quality: 26 },
  { day: "Qui", nearMiss: 5, adverseEvents: 1, quality: 37 },
  { day: "Sex", nearMiss: 16, adverseEvents: 3, quality: 16 },
  { day: "Sáb", nearMiss: 6, adverseEvents: 1, quality: 6 },
];

// ── Status Matrix ──
const statusCategories = ["Assistencial", "Logística", "Administração", "Governança", "Qualidade"];
const statusAreas = ["Assistencial", "Administração", "Qualidade"];

type StatusLevel = "ok" | "attention" | "urgent";

const getStatusColor = (level: StatusLevel) => {
  switch (level) {
    case "ok": return "bg-primary text-primary-foreground";
    case "attention": return "bg-warning text-warning-foreground";
    case "urgent": return "bg-destructive text-destructive-foreground";
  }
};

// Generate pseudo-random but deterministic status for visual
const getModuleStatus = (catIdx: number, areaIdx: number, modIdx: number): StatusLevel => {
  const seed = (catIdx * 37 + areaIdx * 13 + modIdx * 7) % 10;
  if (seed < 6) return "ok";
  if (seed < 8) return "attention";
  return "urgent";
};

const StatusMatrix = () => (
  <Card className="shadow-sm h-full">
    <CardHeader className="pb-3 pt-4 px-4">
      <div className="flex items-center justify-between">
        <CardTitle className="text-sm font-bold text-foreground">Status dos Módulos</CardTitle>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-primary" /> OK</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-warning" /> Atenção</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-destructive" /> Urgente</span>
        </div>
      </div>
    </CardHeader>
    <CardContent className="px-4 pb-4">
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-1.5 pr-2 text-muted-foreground font-medium" />
              {statusAreas.map(a => (
                <th key={a} className="text-center py-1.5 px-1 text-muted-foreground font-medium">{a}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {statusCategories.map((cat, catIdx) => (
              <tr key={cat} className="border-b border-border/50 last:border-0">
                <td className="py-1.5 pr-2 font-medium text-foreground whitespace-nowrap">{cat}</td>
                {statusAreas.map((_, areaIdx) => (
                  <td key={areaIdx} className="py-1.5 px-1">
                    <div className="flex justify-center gap-0.5">
                      {Array.from({ length: 4 }, (_, modIdx) => (
                        <span
                          key={modIdx}
                          className={`w-5 h-5 rounded-sm flex items-center justify-center text-[9px] font-bold ${getStatusColor(getModuleStatus(catIdx, areaIdx, modIdx))}`}
                        >
                          {catIdx * 10 + areaIdx * 4 + modIdx + 1}
                        </span>
                      ))}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CardContent>
  </Card>
);

// ── Audit Activity Log ──
const AuditActivityLog = ({ logs, loading }: { logs: AuditLogEntry[]; loading: boolean }) => (
  <Card className="shadow-sm">
    <CardHeader className="pb-2 pt-4 px-4">
      <CardTitle className="text-sm font-bold text-foreground">Atividade Recente de Auditoria</CardTitle>
    </CardHeader>
    <CardContent className="px-4 pb-4">
      <ScrollArea className="h-[140px]">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-5 w-full" />)}
          </div>
        ) : logs.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Nenhum log recente</p>
        ) : (
          <div className="space-y-1">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-2 py-1 text-[11px] font-mono text-muted-foreground border-b border-border/30 last:border-0">
                <span className="text-foreground/70 shrink-0">
                  {new Date(log.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </span>
                <span className="truncate">
                  {log.user_id.substring(0, 8)} — {log.acao} ({log.modulo})
                </span>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </CardContent>
  </Card>
);

// ── Risk Chart ──
const RiskChart = () => (
  <Card className="shadow-sm h-full">
    <CardHeader className="pb-2 pt-4 px-4">
      <CardTitle className="text-sm font-bold text-foreground">Gestão de Riscos (Últimos 7 Dias)</CardTitle>
    </CardHeader>
    <CardContent className="px-2 pb-4">
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={riskChartData}>
          <defs>
            <linearGradient id="gradNearMiss" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--info))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--info))" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradAdverse" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradQuality" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
          <RechartsTooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: "12px",
            }}
          />
          <Legend wrapperStyle={{ fontSize: "11px" }} />
          <Area type="monotone" dataKey="nearMiss" name="Near Misses" stroke="hsl(var(--info))" fill="url(#gradNearMiss)" strokeWidth={2} />
          <Area type="monotone" dataKey="adverseEvents" name="Eventos Adversos" stroke="hsl(var(--primary))" fill="url(#gradAdverse)" strokeWidth={2} />
          <Area type="monotone" dataKey="quality" name="Indicadores Qualidade" stroke="hsl(var(--success))" fill="url(#gradQuality)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </CardContent>
  </Card>
);

// ── Main Dashboard ──
const DashboardPersonalizado = ({ onNavigate }: { onNavigate?: (section: string) => void }) => {
  const [stats, setStats] = useState<DashboardStats>({
    chamadosAbertos: 0, chamadosPendentes: 0, chamadosHoje: 0, chamadosResolvidos: 0,
    tarefasPendentes: 0, tarefasHoje: 0, prontuariosPendentes: 0, prontuariosAvaliados: 0,
    produtosEstoqueBaixo: 0, escalasHoje: 0, colaboradoresSobGestao: 0, logsHoje: 0,
    capacitacoesPendentes: 0, leitosOcupados: 0, totalLeitos: 0,
    incidentesCriticos: 0, chamadosManutencao: 0, conformidadeDietas: 0,
  });
  const [loading, setLoading] = useState(true);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const {
    role, userId, isAdmin, isGestor, isTI, isManutencao,
    isEngenhariaCinica, isLaboratorio, isFaturamento,
    isRecepcao, isClassificacao, isNir, isTecnico
  } = useUserRole();
  useRealtimeSync(REALTIME_PRESETS.dashboard);

  const fetchStats = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const hojeStr = new Date().toISOString().split("T")[0];

      const [chamadosData, tarefasData, saidasData, escalasData, incidentesData, chamadosManutData, leitosData] = await Promise.all([
        supabase.from("chamados").select("status, data_abertura", { count: "exact" }),
        supabase.rpc("get_tarefas_pendentes_count", { _user_id: userId }),
        supabase.from("saida_prontuarios").select("id", { count: "exact", head: true }).eq("is_folha_avulsa", false),
        supabase.from("escalas_laboratorio").select("id", { count: "exact", head: true })
          .eq("dia", new Date().getDate()).eq("mes", new Date().getMonth() + 1).eq("ano", new Date().getFullYear()),
        supabase.from("incidentes_nsp").select("id", { count: "exact", head: true })
          .eq("status", "aberto").gte("created_at", `${hojeStr}T00:00:00`),
        supabase.from("chamados").select("id", { count: "exact", head: true })
          .eq("categoria", "manutencao").neq("status", "resolvido"),
        supabase.from("bed_records").select("id, patient_name", { count: "exact" })
          .not("patient_name", "is", null),
      ]);

      const chamados = chamadosData.data || [];
      const chamadosAbertos = chamados.filter(c => c.status === "aberto").length;
      const chamadosPendentes = chamados.filter(c => c.status === "em_andamento").length;
      const chamadosResolvidos = chamados.filter(c => c.status === "resolvido").length;
      const chamadosHoje = chamados.filter(c => c.data_abertura?.startsWith(hojeStr)).length;

      const { data: agendaData } = await supabase.from("agenda_items").select("id", { count: "exact" }).gte("data_inicio", hojeStr);

      let colaboradoresSobGestao = 0;
      if (isGestor || isAdmin) {
        const { data: colabData } = await supabase.rpc("get_usuarios_sob_gestao", { _gestor_id: userId });
        colaboradoresSobGestao = colabData?.length || 0;
      }

      let logsHoje = 0;
      if (isAdmin) {
        const { count } = await supabase.from("logs_acesso").select("id", { count: "exact", head: true }).gte("created_at", `${hojeStr}T00:00:00`);
        logsHoje = count || 0;
      }

      let capacitacoesPendentes = 0;
      const { count: capCount } = await supabase.from("lms_inscricoes").select("id", { count: "exact", head: true })
        .eq("usuario_id", userId).neq("status", "capacitado");
      capacitacoesPendentes = capCount || 0;

      // Leitos ocupados
      const leitosOcupados = leitosData.data?.filter(r => r.patient_name && r.patient_name.trim() !== "").length || 0;

      setStats({
        chamadosAbertos, chamadosPendentes, chamadosHoje, chamadosResolvidos,
        tarefasPendentes: tarefasData.data || 0,
        tarefasHoje: agendaData?.length || 0,
        prontuariosPendentes: saidasData.count || 0,
        prontuariosAvaliados: 0,
        produtosEstoqueBaixo: 0,
        escalasHoje: escalasData.count || 0,
        colaboradoresSobGestao,
        logsHoje,
        capacitacoesPendentes,
        leitosOcupados,
        totalLeitos: 50,
        incidentesCriticos: incidentesData.count || 0,
        chamadosManutencao: chamadosManutData.count || 0,
        conformidadeDietas: 98,
      });
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    const { data } = await supabase
      .from("logs_acesso")
      .select("id, created_at, acao, modulo, user_id")
      .order("created_at", { ascending: false })
      .limit(10);
    if (data) setAuditLogs(data as AuditLogEntry[]);
  };

  useEffect(() => {
    if (userId) {
      fetchStats();
      fetchAuditLogs();
    }
  }, [userId, role]);

  const occupancyRate = stats.totalLeitos > 0 ? Math.round((stats.leitosOcupados / stats.totalLeitos) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Section Title */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Governança Hospitalar</h2>
        <Button variant="outline" size="sm" onClick={fetchStats} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {/* Governance KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Leitos Ocupados"
          value={`${occupancyRate}%`}
          subtitle={`${stats.leitosOcupados}/${stats.totalLeitos} leitos`}
          icon={BedDouble}
          variant="primary"
          loading={loading}
          onClick={() => onNavigate?.("mapa-leitos")}
        />
        <KPICard
          title="Incidentes Críticos (Hoje)"
          value={String(stats.incidentesCriticos).padStart(2, "0")}
          subtitle="NSP-triggered"
          icon={AlertTriangle}
          variant="destructive"
          loading={loading}
          onClick={() => onNavigate?.("qualidade")}
        />
        <KPICard
          title="Chamados de Manutenção"
          value={String(stats.chamadosManutencao).padStart(2, "0")}
          subtitle={`${stats.chamadosPendentes} em andamento`}
          icon={Wrench}
          variant="warning"
          loading={loading}
          onClick={() => onNavigate?.("abrir-chamado")}
        />
        <KPICard
          title="Conformidade Dietas"
          value={`${stats.conformidadeDietas}%`}
          subtitle="Meta: 95%"
          icon={ClipboardCheck}
          variant="success"
          loading={loading}
          onClick={() => onNavigate?.("restaurante")}
        />
      </div>

      {/* Management Dashboard */}
      <h3 className="text-lg font-bold text-foreground">Painel de Gestão</h3>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <RiskChart />
        </div>
        <StatusMatrix />
      </div>

      <AuditActivityLog logs={auditLogs} loading={loading} />

      {/* Role-specific extra cards */}
      <TooltipProvider delayDuration={300}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {(isAdmin || isGestor) && (
            <KPICard
              title="Colaboradores"
              value={String(stats.colaboradoresSobGestao)}
              subtitle="Sob sua gestão"
              icon={Users}
              variant="primary"
              loading={loading}
              onClick={() => onNavigate?.("equipe")}
            />
          )}
          {isAdmin && (
            <KPICard
              title="Logs do Sistema"
              value={String(stats.logsHoje)}
              subtitle="Ações registradas hoje"
              icon={BarChart3}
              variant="primary"
              loading={loading}
              onClick={() => onNavigate?.("logs")}
            />
          )}
          {(isFaturamento || isRecepcao || isClassificacao || isNir || isAdmin) && (
            <KPICard
              title="Saídas Registradas"
              value={String(stats.prontuariosPendentes)}
              subtitle="Total de saídas"
              icon={FileText}
              variant="primary"
              loading={loading}
              onClick={() => onNavigate?.("saida-prontuarios")}
            />
          )}
          <KPICard
            title="Capacitações"
            value={String(stats.capacitacoesPendentes)}
            subtitle={stats.capacitacoesPendentes > 0 ? "Pendentes" : "Tudo em dia"}
            icon={GraduationCap}
            variant={stats.capacitacoesPendentes > 0 ? "warning" : "success"}
            loading={loading}
            onClick={() => onNavigate?.("lms")}
          />
        </div>
      </TooltipProvider>

      {/* Security metrics for admin */}
      {isAdmin && <MetricasSegurancaWidget />}
    </div>
  );
};

export default DashboardPersonalizado;
