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
  BarChart,
  Bar,
} from "recharts";
import { ScrollArea } from "@/components/ui/scroll-area";
import { subDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getBrasiliaDate, getBrasiliaDateString } from "@/lib/brasilia-time";

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

interface RiskChartPoint {
  day: string;
  nearMiss: number;
  adverseEvents: number;
  quality: number;
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

// ── Risk Chart (dados reais) ──
const RiskChart = ({ data, loading }: { data: RiskChartPoint[]; loading: boolean }) => (
  <Card className="shadow-sm h-full">
    <CardHeader className="pb-2 pt-4 px-4">
      <CardTitle className="text-sm font-bold text-foreground">Gestão de Riscos (Últimos 7 Dias)</CardTitle>
    </CardHeader>
    <CardContent className="px-2 pb-4">
      {loading ? (
        <Skeleton className="h-[220px] w-full" />
      ) : data.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-16">Sem dados no período</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
            <RechartsTooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
            <Legend wrapperStyle={{ fontSize: "11px" }} />
            <Bar dataKey="nearMiss" name="Near Misses" fill="hsl(var(--info))" radius={[2, 2, 0, 0]} />
            <Bar dataKey="adverseEvents" name="Eventos Adversos" fill="hsl(var(--destructive))" radius={[2, 2, 0, 0]} />
            <Bar dataKey="quality" name="Auditorias" fill="hsl(var(--success))" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </CardContent>
  </Card>
);

// ── Resumo Operacional (substitui StatusMatrix) ──
interface OperationalSummary {
  chamadosAbertos: number;
  incidentesAbertos: number;
  auditoriasAndamento: number;
  alertasAtivos: number;
}

const OperationalStatusCard = ({ data, loading }: { data: OperationalSummary; loading: boolean }) => (
  <Card className="shadow-sm h-full">
    <CardHeader className="pb-3 pt-4 px-4">
      <CardTitle className="text-sm font-bold text-foreground">Resumo Operacional</CardTitle>
    </CardHeader>
    <CardContent className="px-4 pb-4">
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-8 w-full" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {[
            { label: "Chamados Abertos", value: data.chamadosAbertos, color: "bg-primary", max: 50 },
            { label: "Incidentes NSP Abertos", value: data.incidentesAbertos, color: "bg-destructive", max: 20 },
            { label: "Auditorias em Andamento", value: data.auditoriasAndamento, color: "bg-warning", max: 10 },
            { label: "Alertas de Segurança Ativos", value: data.alertasAtivos, color: "bg-destructive", max: 10 },
          ].map(({ label, value, color, max }) => (
            <div key={label}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-muted-foreground">{label}</span>
                <span className="text-sm font-bold text-foreground">{value}</span>
              </div>
              <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`absolute left-0 top-0 h-full rounded-full transition-all ${color}`}
                  style={{ width: `${Math.min((value / max) * 100, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
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
  const [riskChartData, setRiskChartData] = useState<RiskChartPoint[]>([]);
  const [operationalSummary, setOperationalSummary] = useState<OperationalSummary>({
    chamadosAbertos: 0, incidentesAbertos: 0, auditoriasAndamento: 0, alertasAtivos: 0,
  });
  const {
    role, userId, isAdmin, isGestor, isTI, isManutencao,
    isEngenhariaCinica, isLaboratorio, isFaturamento,
    isRecepcao, isClassificacao, isNir, isTecnico
  } = useUserRole();
  useRealtimeSync(REALTIME_PRESETS.dashboard);

  // ── Busca dados do gráfico de risco (últimos 7 dias, dados reais) ──
  const fetchRiskChart = async () => {
    try {
      const days: RiskChartPoint[] = [];
      const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

      for (let i = 6; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const dateStr = format(date, "yyyy-MM-dd");
        const dayName = dayNames[date.getDay()];

        const [incidentes, auditorias] = await Promise.all([
          supabase.from("incidentes_nsp").select("classificacao_risco")
            .gte("created_at", `${dateStr}T00:00:00`)
            .lt("created_at", `${dateStr}T23:59:59`),
          supabase.from("auditorias_qualidade").select("id", { count: "exact", head: true })
            .gte("created_at", `${dateStr}T00:00:00`)
            .lt("created_at", `${dateStr}T23:59:59`),
        ]);

        const incData = incidentes.data || [];
        const nearMiss = incData.filter(i => 
          i.classificacao_risco?.toLowerCase().includes("near") || 
          i.classificacao_risco?.toLowerCase().includes("quase")
        ).length;
        const adverseEvents = incData.filter(i => 
          !i.classificacao_risco?.toLowerCase().includes("near") && 
          !i.classificacao_risco?.toLowerCase().includes("quase")
        ).length;

        days.push({
          day: `${dayName} ${format(date, "dd/MM")}`,
          nearMiss,
          adverseEvents,
          quality: auditorias.count || 0,
        });
      }
      setRiskChartData(days);
    } catch (err) {
      console.error("Erro ao buscar dados de risco:", err);
    }
  };

  // ── Busca resumo operacional ──
  const fetchOperationalSummary = async () => {
    try {
      const [chamados, incidentes, auditorias, alertas] = await Promise.all([
        supabase.from("chamados").select("id", { count: "exact", head: true }).eq("status", "aberto"),
        supabase.from("incidentes_nsp").select("id", { count: "exact", head: true }).eq("status", "aberto"),
        supabase.from("auditorias_qualidade").select("id", { count: "exact", head: true }).eq("status", "em_andamento"),
        supabase.from("alertas_seguranca").select("id", { count: "exact", head: true }).eq("status", "ativo"),
      ]);
      setOperationalSummary({
        chamadosAbertos: chamados.count || 0,
        incidentesAbertos: incidentes.count || 0,
        auditoriasAndamento: auditorias.count || 0,
        alertasAtivos: alertas.count || 0,
      });
    } catch (err) {
      console.error("Erro ao buscar resumo operacional:", err);
    }
  };

  const fetchStats = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const hojeStr = getBrasiliaDateString();

      // Detect current shift in Brasília timezone (system standard)
      const brasiliaNow = getBrasiliaDate();
      const hour = brasiliaNow.getHours();
      const isNoturno = hour >= 19 || hour < 7;
      const shiftDate = new Date(brasiliaNow);
      if (isNoturno && hour < 7) {
        shiftDate.setDate(shiftDate.getDate() - 1);
      }
      const shiftDateStr = `${shiftDate.getFullYear()}-${String(shiftDate.getMonth() + 1).padStart(2, "0")}-${String(shiftDate.getDate()).padStart(2, "0")}`;
      const shiftType = isNoturno ? "noturno" : "diurno";

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
        supabase.from("bed_records").select("id, bed_id, bed_number, sector, patient_name, motivo_alta, data_alta", { count: "exact" })
          .eq("shift_date", shiftDateStr)
          .eq("shift_type", shiftType),
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

      // Leitos ocupados — plantão atual + sem alta + deduplicado por leito
      const TOTAL_BEDS_CAPACITY = SECTORS.reduce((sum, s) => sum + s.beds.length + (s.extraBeds?.length || 0), 0);
      const occupiedBedKeys = new Set(
        (leitosData.data || [])
          .filter(r => r.patient_name && r.patient_name.trim() !== "" && !r.motivo_alta && !r.data_alta)
          .map(r => r.bed_id || `${r.sector ?? "setor"}:${r.bed_number ?? r.id}`)
      );
      const leitosOcupados = occupiedBedKeys.size;

      // Conformidade de dietas — calcular baseado em registros reais
      let conformidadeDietas = 0;
      try {
        const { count: totalRefeicoes } = await supabase
          .from("refeicoes_registros")
          .select("id", { count: "exact", head: true })
          .gte("created_at", `${hojeStr}T00:00:00`);
        // Se há registros hoje, conformidade = 100%, senão 0
        // Em cenário real, poderia comparar com expectativa de dietas programadas
        conformidadeDietas = (totalRefeicoes || 0) > 0 ? 100 : 0;
      } catch {
        conformidadeDietas = 0;
      }

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
        totalLeitos: TOTAL_BEDS_CAPACITY,
        incidentesCriticos: incidentesData.count || 0,
        chamadosManutencao: chamadosManutData.count || 0,
        conformidadeDietas,
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
      fetchRiskChart();
      fetchOperationalSummary();
    }
  }, [userId, role]);

  const occupancyRate = stats.totalLeitos > 0 ? Math.round((stats.leitosOcupados / stats.totalLeitos) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Section Title */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Governança Hospitalar</h2>
        <Button variant="outline" size="sm" onClick={() => { fetchStats(); fetchRiskChart(); fetchOperationalSummary(); }} disabled={loading}>
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
          value={stats.conformidadeDietas > 0 ? `${stats.conformidadeDietas}%` : "—"}
          subtitle="Meta: 95%"
          icon={ClipboardCheck}
          variant={stats.conformidadeDietas >= 95 ? "success" : stats.conformidadeDietas > 0 ? "warning" : "primary"}
          loading={loading}
          onClick={() => onNavigate?.("restaurante")}
        />
      </div>

      {/* Management Dashboard */}
      <h3 className="text-lg font-bold text-foreground">Painel de Gestão</h3>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <RiskChart data={riskChartData} loading={loading} />
        </div>
        <OperationalStatusCard data={operationalSummary} loading={loading} />
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
