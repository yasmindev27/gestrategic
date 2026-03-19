import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Database,
  HardDrive,
  Server,
  Shield,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Cpu,
  MemoryStick,
  FolderOpen,
  Lock,
  Cloud,
  X,
  Activity,
  Users,
  FileText,
  ClipboardList,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface TableStat {
  name: string;
  label: string;
  count: number;
  icon: React.ElementType;
}

interface StorageBucketStat {
  name: string;
  label: string;
  fileCount: number;
}

interface DbHealthMetrics {
  totalRegistros: number;
  totalTabelas: number;
  buckets: StorageBucketStat[];
  tabelasPrincipais: TableStat[];
  replicacaoFila: { pendentes: number; falhas: number; concluidos: number };
}

export function InfraestruturaPanel() {
  const [metrics, setMetrics] = useState<DbHealthMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncElapsed, setSyncElapsed] = useState(0);
  const syncTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [syncResult, setSyncResult] = useState<{
    tables: number;
    rows: number;
    errors: number;
    duration?: number;
  } | null>(null);

  const fetchMetrics = useCallback(async () => {
    setIsLoading(true);
    try {
      // Consultas paralelas para contar registros das tabelas principais
      const tableQueries = [
        { name: "profiles", label: "Colaboradores", icon: Users },
        { name: "prontuarios", label: "Prontuários", icon: FileText },
        { name: "chamados", label: "Chamados", icon: ClipboardList },
        { name: "incidentes_nsp", label: "Incidentes NSP", icon: AlertTriangle },
        { name: "logs_acesso", label: "Logs de Acesso", icon: Activity },
        { name: "bed_records", label: "Registros de Leitos", icon: HardDrive },
        { name: "refeicoes_registros", label: "Refeições", icon: Database },
        { name: "alertas_seguranca", label: "Alertas Segurança", icon: Shield },
      ];

      const countPromises = tableQueries.map(async (tq) => {
        try {
          const { count } = await supabase
            .from(tq.name as any)
            .select("*", { count: "exact", head: true });
          return { ...tq, count: count || 0 };
        } catch {
          return { ...tq, count: 0 };
        }
      });

      // Fila de replicação
      const replicacaoPromise = Promise.all([
        supabase.from("replicacao_fila" as any).select("*", { count: "exact", head: true }).eq("status", "pendente"),
        supabase.from("replicacao_fila" as any).select("*", { count: "exact", head: true }).eq("status", "falha_permanente"),
        supabase.from("replicacao_fila" as any).select("*", { count: "exact", head: true }).eq("status", "concluido"),
      ]);

      const [tableCounts, replicacaoResults] = await Promise.all([
        Promise.all(countPromises),
        replicacaoPromise,
      ]);

      const totalRegistros = tableCounts.reduce((acc, t) => acc + t.count, 0);

      const buckets: StorageBucketStat[] = [
        { name: "atestados", label: "Atestados Médicos", fileCount: 0 },
        { name: "chat-anexos", label: "Anexos do Chat", fileCount: 0 },
        { name: "lms-materiais", label: "Materiais LMS", fileCount: 0 },
        { name: "profissionais-docs", label: "Docs de RH", fileCount: 0 },
        { name: "incidentes-evidencias", label: "Evidências NSP", fileCount: 0 },
        { name: "reunioes", label: "Reuniões", fileCount: 0 },
        { name: "assistencia-social-docs", label: "Assistência Social", fileCount: 0 },
        { name: "pedidos-compra-anexos", label: "Pedidos de Compra", fileCount: 0 },
      ];

      // Tentar listar arquivos dos buckets
      for (const bucket of buckets) {
        try {
          const { data } = await supabase.storage.from(bucket.name).list("", { limit: 1000 });
          bucket.fileCount = data?.length || 0;
        } catch {
          bucket.fileCount = 0;
        }
      }

      setMetrics({
        totalRegistros,
        totalTabelas: tableQueries.length,
        buckets,
        tabelasPrincipais: tableCounts,
        replicacaoFila: {
          pendentes: replicacaoResults[0].count || 0,
          falhas: replicacaoResults[1].count || 0,
          concluidos: replicacaoResults[2].count || 0,
        },
      });
    } catch (err) {
      console.error("Erro ao buscar métricas:", err);
    } finally {
      setIsLoading(false);
      setLastRefresh(new Date());
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const handleSyncExternalDB = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    setSyncElapsed(0);

    const start = Date.now();
    syncTimerRef.current = setInterval(() => {
      setSyncElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const res = await supabase.functions.invoke("sync-external-db", { body: {} });
      if (res.error) throw res.error;

      const result = res.data;
      setSyncResult({
        tables: result.summary?.tables_processed || 0,
        rows: result.summary?.total_rows_synced || 0,
        errors: result.summary?.tables_with_errors || 0,
        duration: result.summary?.duration_seconds || 0,
      });
      // Recarregar métricas após sync
      fetchMetrics();
    } catch (err: any) {
      console.error("Sync error:", err);
      setSyncResult({ tables: 0, rows: 0, errors: -1 });
    } finally {
      if (syncTimerRef.current) clearInterval(syncTimerRef.current);
      syncTimerRef.current = null;
      setIsSyncing(false);
    }
  };

  const getBarColor = (count: number) => {
    if (count > 10000) return "bg-primary";
    if (count > 1000) return "bg-amber-500";
    return "bg-emerald-500";
  };

  const maxCount = metrics
    ? Math.max(...metrics.tabelasPrincipais.map((t) => t.count), 1)
    : 1;

  const totalBucketFiles = metrics?.buckets.reduce((a, b) => a + b.fileCount, 0) || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Infraestrutura & Banco de Dados
          </h3>
          <p className="text-sm text-muted-foreground">
            Dados reais do sistema · Atualizado:{" "}
            {format(lastRefresh, "HH:mm:ss", { locale: ptBR })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchMetrics}
            disabled={isLoading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            Atualizar
          </Button>
          <Button
            size="sm"
            onClick={handleSyncExternalDB}
            disabled={isSyncing}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isSyncing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Sincronizando... {syncElapsed}s
              </>
            ) : (
              <>
                <Cloud className="h-4 w-4 mr-2" />
                Sync Banco Externo
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Sync Result Banner */}
      {syncResult && (
        <Card
          className={`border-l-4 ${
            syncResult.errors === -1
              ? "border-l-destructive bg-destructive/5"
              : syncResult.errors > 0
              ? "border-l-amber-500 bg-amber-500/5"
              : "border-l-emerald-500 bg-emerald-500/5"
          }`}
        >
          <CardContent className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {syncResult.errors === -1 ? (
                <XCircle className="h-5 w-5 text-destructive" />
              ) : syncResult.errors > 0 ? (
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              )}
              <div>
                {syncResult.errors === -1 ? (
                  <p className="text-sm font-medium text-destructive">
                    Erro na sincronização — verifique as credenciais do banco externo
                  </p>
                ) : (
                  <p className="text-sm font-medium text-foreground">
                    Sincronização concluída em{" "}
                    <strong>{syncResult.duration?.toFixed(1) || "?"}s</strong>:{" "}
                    <strong>{syncResult.tables}</strong> tabelas,{" "}
                    <strong>{syncResult.rows.toLocaleString()}</strong> registros
                    {syncResult.errors > 0 && (
                      <span className="text-amber-600">
                        {" "}
                        ({syncResult.errors} tabelas com erros)
                      </span>
                    )}
                  </p>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setSyncResult(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Cards de Resumo ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Database className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {metrics?.totalRegistros.toLocaleString() || "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Registros Totais
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <FolderOpen className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalBucketFiles}</p>
                <p className="text-xs text-muted-foreground">
                  Arquivos no Storage
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Activity className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {metrics?.replicacaoFila.pendentes || 0}
                </p>
                <p className="text-xs text-muted-foreground">
                  Replicações Pendentes
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <XCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {metrics?.replicacaoFila.falhas || 0}
                </p>
                <p className="text-xs text-muted-foreground">
                  Replicações com Falha
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Volumetria por Tabela ── */}
      <div>
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Volumetria das Tabelas Principais
        </h4>
        <Card>
          <CardContent className="pt-5">
            <div className="space-y-3">
              {metrics?.tabelasPrincipais.map((t) => {
                const Icon = t.icon;
                const pct = maxCount > 0 ? (t.count / maxCount) * 100 : 0;
                return (
                  <div key={t.name} className="flex items-center gap-3">
                    <div className="flex items-center gap-2 w-44 flex-shrink-0">
                      <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm truncate">{t.label}</span>
                    </div>
                    <div className="flex-1 relative h-6 rounded bg-muted overflow-hidden">
                      <div
                        className={`absolute left-0 top-0 h-full rounded transition-all ${getBarColor(t.count)}`}
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-foreground">
                        {t.count.toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Mapa de Armazenamento ── */}
      <div>
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Mapa de Armazenamento
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-l-4 border-l-primary bg-primary/5">
            <CardContent className="pt-5">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Database className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-foreground">
                      Dados Sensíveis
                    </span>
                    <Badge
                      variant="outline"
                      className="text-xs border-primary/30 text-primary"
                    >
                      <Lock className="h-3 w-3 mr-1" />
                      Criptografado
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Banco SQL Relacional — AES-256 em repouso
                  </p>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    {[
                      "Prontuários e pacientes",
                      "Dados de colaboradores",
                      "Atestados e ocorrências",
                      "Logs de auditoria",
                    ].map((item) => (
                      <div key={item} className="flex items-center gap-2">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-primary/10 flex items-center gap-2">
                    <Shield className="h-3 w-3 text-emerald-500" />
                    <span className="text-xs text-emerald-600 font-medium">
                      Backup automático ativo — Lovable Cloud
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500 bg-amber-500/5">
            <CardContent className="pt-5">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-amber-500/10">
                  <FolderOpen className="h-6 w-6 text-amber-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-foreground">
                      Arquivos & Anexos
                    </span>
                    <Badge
                      variant="outline"
                      className="text-xs border-amber-300 text-amber-600"
                    >
                      <Cloud className="h-3 w-3 mr-1" />
                      Object Storage
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Buckets com acesso controlado por RLS
                  </p>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    {metrics?.buckets.map((b) => (
                      <div
                        key={b.name}
                        className="flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2">
                          <HardDrive className="h-3 w-3 text-amber-500 flex-shrink-0" />
                          <span>{b.label}</span>
                        </div>
                        <span className="font-mono text-xs">
                          {b.fileCount} arquivo{b.fileCount !== 1 ? "s" : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-amber-500/10 flex items-center gap-2">
                    <Shield className="h-3 w-3 text-amber-500" />
                    <span className="text-xs text-amber-600 font-medium">
                      {totalBucketFiles} arquivos totais no storage
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Status da Replicação em Tempo Real ── */}
      <div>
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Replicação em Tempo Real
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="pt-4 pb-3 flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              <div>
                <p className="text-2xl font-bold">
                  {metrics?.replicacaoFila.concluidos || 0}
                </p>
                <p className="text-xs text-muted-foreground">Replicados com Sucesso</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="pt-4 pb-3 flex items-center gap-3">
              <RefreshCw className="h-6 w-6 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">
                  {metrics?.replicacaoFila.pendentes || 0}
                </p>
                <p className="text-xs text-muted-foreground">Aguardando Retry</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-destructive">
            <CardContent className="pt-4 pb-3 flex items-center gap-3">
              <XCircle className="h-6 w-6 text-destructive" />
              <div>
                <p className="text-2xl font-bold">
                  {metrics?.replicacaoFila.falhas || 0}
                </p>
                <p className="text-xs text-muted-foreground">Falhas Permanentes</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-medium text-foreground">
                  Tabelas com replicação ativa:
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  "assistencia_social_atendimentos",
                  "assistencia_social_pacientes",
                  "prontuarios",
                  "avaliacoes_prontuarios",
                  "logs_acesso",
                  "logs_permissoes",
                  "incidentes_nsp",
                  "chamados",
                ].map((t) => (
                  <Badge key={t} variant="outline" className="text-xs font-mono">
                    {t}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <Activity className="h-3 w-3" />
                Cada INSERT/UPDATE/DELETE dispara replicação imediata via pg_net → Edge Function.
                Retry automático a cada 5 minutos via cron job.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Segurança ── */}
      <div>
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Segurança & Conformidade
        </h4>
        <Card>
          <CardContent className="pt-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  title: "Criptografia",
                  items: [
                    "AES-256 em repouso (banco de dados)",
                    "TLS 1.3 em trânsito",
                    "Chaves gerenciadas pelo Lovable Cloud",
                  ],
                  icon: Lock,
                  color: "text-primary",
                },
                {
                  title: "Controle de Acesso",
                  items: [
                    "Row Level Security (RLS) em todas as tabelas",
                    "RBAC com perfis granulares",
                    "Logs imutáveis (LGPD Art. 37)",
                  ],
                  icon: Shield,
                  color: "text-emerald-500",
                },
              ].map(({ title, items, icon: Icon, color }) => (
                <div key={title}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`h-4 w-4 ${color}`} />
                    <span className="font-semibold text-sm">{title}</span>
                  </div>
                  <div className="space-y-1">
                    {items.map((item) => (
                      <div
                        key={item}
                        className="flex items-center gap-2 text-xs text-muted-foreground"
                      >
                        <CheckCircle2 className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
          <Server className="h-3 w-3" />
          Infraestrutura gerenciada pelo Lovable Cloud. Backups automáticos com retenção de 30 dias.
        </p>
      </div>
    </div>
  );
}
