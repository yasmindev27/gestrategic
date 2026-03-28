  // Exibe indicador discreto de atualização em background
  const BackgroundLoader = () => isFetching && !loading ? (
    <div className="fixed top-2 right-2 z-50 flex items-center gap-2 bg-card/80 px-3 py-1 rounded shadow text-xs text-muted-foreground">
      <span className="animate-spin mr-1 w-3 h-3 border-2 border-primary border-t-transparent rounded-full" />
      Atualizando dados…
    </div>
  ) : null;
import React, { useMemo } from "react";
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
import { useQuery } from "@tanstack/react-query";
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

export default DashboardPersonalizado;

interface RiskChartPoint {
  day: string;
  nearMiss: number;
  adverseEvents: number;
  quality: number;
}

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
          import React, { useMemo, useState, useCallback } from "react";
          import {
            BedDouble, AlertTriangle, Wrench, ClipboardCheck,
            RefreshCw, GraduationCap,
            Users, BarChart3, FileText,
          } from "lucide-react";
          import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
          import { Button } from "@/components/ui/button";
          import { supabase } from "@/integrations/supabase/client";
          import { useUserRole } from "@/hooks/useUserRole";
          import { Skeleton } from "@/components/ui/skeleton";
          import { MetricasSegurancaWidget } from "@/components/seguranca";
          import {
            TooltipProvider,
          } from "@/components/ui/tooltip";
          import {
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

          interface RiskChartPoint {
            day: string;
            nearMiss: number;
            adverseEvents: number;
            quality: number;
          }

          interface AuditLogEntry {
            id: string;
            created_at: string;
            user_id: string;
            acao: string;
            modulo: string;
          }

          interface OperationalSummary {
            chamadosAbertos: number;
            incidentesAbertos: number;
            auditoriasAndamento: number;
            alertasAtivos: number;
          }

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

          const MemoKPICard = React.memo(KPICard);

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

          const MemoAuditActivityLog = React.memo(AuditActivityLog);

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

          const MemoRiskChart = React.memo(RiskChart);

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

          const MemoOperationalStatusCard = React.memo(OperationalStatusCard);

          const defaultStats: DashboardStats = {
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
            leitosOcupados: 0,
            totalLeitos: 0,
            incidentesCriticos: 0,
            chamadosManutencao: 0,
            conformidadeDietas: 0,
          };

          const defaultOperationalSummary: OperationalSummary = {
            chamadosAbertos: 0,
            incidentesAbertos: 0,
            auditoriasAndamento: 0,
            alertasAtivos: 0,
          };

          const DashboardPersonalizado = React.memo(({ onNavigate }: { onNavigate?: (section: string) => void }) => {
            const { isAdmin, isGestor, isFaturamento, isRecepcao, isNir, isEnfermagem, isCoordenadorEnfermagem } = useUserRole();

            const [stats, setStats] = useState<DashboardStats>(defaultStats);
            const [riskChartData, setRiskChartData] = useState<RiskChartPoint[]>([]);
            const [operationalSummary, setOperationalSummary] = useState<OperationalSummary>(defaultOperationalSummary);
            const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
            const [loading, setLoading] = useState(true);
            const [isFetching, setIsFetching] = useState(false);

            const fetchStats = useCallback(async () => {
              try {
                const today = getBrasiliaDateString();
                const [
                  chamadosAbertos,
                  chamadosPendentes,
                  chamadosHoje,
                  chamadosResolvidos,
                  tarefasPendentes,
                  prontuariosPendentes,
                  produtosEstoqueBaixo,
                  escalasHoje,
                  logsHoje,
                  capacitacoesPendentes,
                  leitosOcupados,
                  totalLeitos,
                  incidentesCriticos,
                  chamadosManutencao,
                ] = await Promise.all([
                  supabase.from("chamados").select("id", { count: "exact", head: true }).eq("status", "aberto"),
                  supabase.from("chamados").select("id", { count: "exact", head: true }).eq("status", "pendente"),
                  supabase.from("chamados").select("id", { count: "exact", head: true }).gte("created_at", today),
                  supabase.from("chamados").select("id", { count: "exact", head: true }).eq("status", "resolvido"),
                  supabase.from("tarefas").select("id", { count: "exact", head: true }).eq("status", "pendente"),
                  supabase.from("prontuarios").select("id", { count: "exact", head: true }).eq("status", "pendente"),
                  supabase.from("produtos_estoque").select("id", { count: "exact", head: true }).eq("estoque_baixo", true),
                  supabase.from("escalas").select("id", { count: "exact", head: true }).eq("data", today),
                  supabase.from("audit_logs").select("id", { count: "exact", head: true }).gte("created_at", today),
                  supabase.from("capacitacoes").select("id", { count: "exact", head: true }).eq("status", "pendente"),
                  supabase.from("leitos").select("id", { count: "exact", head: true }).eq("status", "ocupado"),
                  supabase.from("leitos").select("id", { count: "exact", head: true }),
                  supabase.from("incidentes_nsp").select("id", { count: "exact", head: true }).eq("gravidade", "critico").gte("created_at", today),
                  supabase.from("chamados").select("id", { count: "exact", head: true }).eq("tipo", "manutencao").eq("status", "aberto"),
                ]);

                setStats({
                  chamadosAbertos: chamadosAbertos.count || 0,
                  chamadosPendentes: chamadosPendentes.count || 0,
                  chamadosHoje: chamadosHoje.count || 0,
                  chamadosResolvidos: chamadosResolvidos.count || 0,
                  tarefasPendentes: tarefasPendentes.count || 0,
                  tarefasHoje: 0,
                  prontuariosPendentes: prontuariosPendentes.count || 0,
                  prontuariosAvaliados: 0,
                  produtosEstoqueBaixo: produtosEstoqueBaixo.count || 0,
                  escalasHoje: escalasHoje.count || 0,
                  colaboradoresSobGestao: 0,
                  logsHoje: logsHoje.count || 0,
                  capacitacoesPendentes: capacitacoesPendentes.count || 0,
                  leitosOcupados: leitosOcupados.count || 0,
                  totalLeitos: totalLeitos.count || 0,
                  incidentesCriticos: incidentesCriticos.count || 0,
                  chamadosManutencao: chamadosManutencao.count || 0,
                  conformidadeDietas: 0,
                });
              } catch (err) {
                console.error("Erro ao buscar stats:", err);
              }
            }, []);

            const fetchRiskChart = useCallback(async () => {
              try {
                const days = Array.from({ length: 7 }, (_, i) => {
                  const d = subDays(getBrasiliaDate(), 6 - i);
                  return { date: format(d, "yyyy-MM-dd"), label: format(d, "EEE", { locale: ptBR }) };
                });

                const results = await Promise.all(
                  days.map(async ({ date, label }) => {
                    const nextDate = format(subDays(new Date(date), -1), "yyyy-MM-dd");
                    const [nearMiss, adverseEvents, quality] = await Promise.all([
                      supabase.from("incidentes_nsp").select("id", { count: "exact", head: true }).eq("tipo", "near_miss").gte("created_at", date).lt("created_at", nextDate),
                      supabase.from("incidentes_nsp").select("id", { count: "exact", head: true }).eq("tipo", "evento_adverso").gte("created_at", date).lt("created_at", nextDate),
                      supabase.from("auditorias_qualidade").select("id", { count: "exact", head: true }).gte("created_at", date).lt("created_at", nextDate),
                    ]);
                    return {
                      day: label,
                      nearMiss: nearMiss.count || 0,
                      adverseEvents: adverseEvents.count || 0,
                      quality: quality.count || 0,
                    };
                  })
                );
                setRiskChartData(results);
              } catch (err) {
                console.error("Erro ao buscar gráfico de riscos:", err);
              }
            }, []);

            const fetchOperationalSummary = useCallback(async () => {
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
            }, []);

            const fetchAuditLogs = useCallback(async () => {
              try {
                const { data, error } = await supabase
                  .from("audit_logs")
                  .select("id, created_at, user_id, acao, modulo")
                  .order("created_at", { ascending: false })
                  .limit(20);
                if (!error && data) {
                  setAuditLogs(data);
                }
              } catch (err) {
                console.error("Erro ao buscar audit logs:", err);
              }
            }, []);

            const fetchAll = useCallback(async (background = false) => {
              if (background) {
                setIsFetching(true);
              } else {
                setLoading(true);
              }
              await Promise.all([fetchStats(), fetchRiskChart(), fetchOperationalSummary(), fetchAuditLogs()]);
              setLoading(false);
              setIsFetching(false);
            }, [fetchStats, fetchRiskChart, fetchOperationalSummary, fetchAuditLogs]);

            React.useEffect(() => {
              fetchAll();
            }, [fetchAll]);

            const occupancyRate = stats.totalLeitos > 0
              ? Math.round((stats.leitosOcupados / stats.totalLeitos) * 100)
              : 0;

            const memoizedStats = useMemo(() => stats, [stats]);
            const memoizedRiskChartData = useMemo(() => riskChartData, [riskChartData]);
            const memoizedOperationalSummary = useMemo(() => operationalSummary, [operationalSummary]);
            const memoizedAuditLogs = useMemo(() => auditLogs, [auditLogs]);

            return (
              <div className="space-y-6">
                {isFetching && !loading && (
                  <div className="fixed top-2 right-2 z-50 flex items-center gap-2 bg-card/80 px-3 py-1 rounded shadow text-xs text-muted-foreground">
                    <span className="animate-spin mr-1 w-3 h-3 border-2 border-primary border-t-transparent rounded-full" />
                    Atualizando dados...
                  </div>
                )}

                {/* Section Title */}
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-foreground">Governança Hospitalar</h2>
                  <Button variant="outline" size="sm" onClick={() => fetchAll(true)} disabled={loading || isFetching}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${(loading || isFetching) ? "animate-spin" : ""}`} />
                    Atualizar
                  </Button>
                </div>

                {/* Governance KPI Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <MemoKPICard
                    title="Leitos Ocupados"
                    value={`${occupancyRate}%`}
                    subtitle={`${memoizedStats.leitosOcupados}/${memoizedStats.totalLeitos} leitos`}
                    icon={BedDouble}
                    variant="primary"
                    loading={loading}
                    onClick={() => onNavigate?.("mapa-leitos")}
                  />
                  <MemoKPICard
                    title="Incidentes Críticos (Hoje)"
                    value={String(memoizedStats.incidentesCriticos).padStart(2, "0")}
                    subtitle="NSP-triggered"
                    icon={AlertTriangle}
                    variant="destructive"
                    loading={loading}
                    onClick={() => onNavigate?.("qualidade")}
                  />
                  <MemoKPICard
                    title="Chamados de Manutenção"
                    value={String(memoizedStats.chamadosManutencao).padStart(2, "0")}
                    subtitle={`${memoizedStats.chamadosPendentes} em andamento`}
                    icon={Wrench}
                    variant="warning"
                    loading={loading}
                    onClick={() => onNavigate?.("abrir-chamado")}
                  />
                  <MemoKPICard
                    title="Conformidade Dietas"
                    value={memoizedStats.conformidadeDietas > 0 ? `${memoizedStats.conformidadeDietas}%` : "—"}
                    subtitle="Meta: 95%"
                    icon={ClipboardCheck}
                    variant={memoizedStats.conformidadeDietas >= 95 ? "success" : memoizedStats.conformidadeDietas > 0 ? "warning" : "primary"}
                    loading={loading}
                    onClick={() => onNavigate?.("restaurante")}
                  />
                </div>

                {/* Management Dashboard */}
                <h3 className="text-lg font-bold text-foreground">Painel de Gestão</h3>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2">
                    <MemoRiskChart data={memoizedRiskChartData} loading={loading} />
                  </div>
                  <MemoOperationalStatusCard data={memoizedOperationalSummary} loading={loading} />
                </div>

                <MemoAuditActivityLog logs={memoizedAuditLogs} loading={loading} />

                {/* Role-specific extra cards */}
                <TooltipProvider delayDuration={300}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {(isAdmin || isGestor) && (
                      <MemoKPICard
                        title="Colaboradores"
                        value={String(memoizedStats.colaboradoresSobGestao)}
                        subtitle="Sob sua gestão"
                        icon={Users}
                        variant="primary"
                        loading={loading}
                        onClick={() => onNavigate?.("equipe")}
                      />
                    )}
                    {isAdmin && (
                      <MemoKPICard
                        title="Logs do Sistema"
                        value={String(memoizedStats.logsHoje)}
                        subtitle="Ações registradas hoje"
                        icon={BarChart3}
                        variant="primary"
                        loading={loading}
                        onClick={() => onNavigate?.("logs")}
                      />
                    )}
                    {(isFaturamento || isRecepcao || isNir || isEnfermagem || isCoordenadorEnfermagem || isAdmin) && (
                      <MemoKPICard
                        title="Saídas Registradas"
                        value={String(memoizedStats.prontuariosPendentes)}
                        subtitle="Total de saídas"
                        icon={FileText}
                        variant="primary"
                        loading={loading}
                        onClick={() => onNavigate?.("faturamento")}
                      />
                    )}
                    <MemoKPICard
                      title="Capacitações"
                      value={String(memoizedStats.capacitacoesPendentes)}
                      subtitle={memoizedStats.capacitacoesPendentes > 0 ? "Pendentes" : "Tudo em dia"}
                      icon={GraduationCap}
                      variant={memoizedStats.capacitacoesPendentes > 0 ? "warning" : "success"}
                      loading={loading}
                      onClick={() => onNavigate?.("lms")}
                    />
                  </div>
                </TooltipProvider>

                {/* Security metrics for admin */}
                {isAdmin && <MetricasSegurancaWidget />}
              </div>
            );
          });

          DashboardPersonalizado.displayName = "DashboardPersonalizado";

          export default DashboardPersonalizado;
