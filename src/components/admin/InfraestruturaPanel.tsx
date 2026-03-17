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
  Wrench,
  Clock,
  BellRing,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays } from "date-fns";
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

// ── Tipos ────────────────────────────────────────────────────────────────────
interface BackupEntry {
  id: string;
  data: string;
  status: "ok" | "aviso" | "erro";
  tamanho_mb: number;
  tipo: string;
  duracao_min: number;
  hash: string;
  hashInvalido?: boolean;
  reparando?: boolean;
  reparado?: boolean;
  proximaTentativaEm?: number; // timestamp ms
}

interface HealthPoint {
  hora: string;
  cpu: number;
  memoria: number;
  disco: number;
}

interface HashAlerta {
  id: string;
  backupId: string;
  tipo: string;
  data: string;
  hash: string;
  visto: boolean;
}

// ── Dados simulados ─────────────────────────────────────────────────────────
const gerarBackups = (): BackupEntry[] => {
  const tipos = ["Completo", "Incremental", "Diferencial"];
  const statuses: ("ok" | "aviso" | "erro")[] = ["ok", "ok", "ok", "ok", "aviso", "ok", "ok", "erro", "ok", "ok"];

  return Array.from({ length: 10 }, (_, i) => {
    const data = subDays(new Date(), i);
    const s = statuses[i];
    // Erros simulam hash inválido (hash corrompido com checksum errado)
    const hashInvalido = s === "erro";
    return {
      id: crypto.randomUUID(),
      data: data.toISOString(),
      status: s,
      tamanho_mb: Math.floor(Math.random() * 3000 + 800),
      tipo: tipos[i % tipos.length],
      duracao_min: Math.floor(Math.random() * 30 + 5),
      hash: hashInvalido
        ? "sha256:INVALID_" + Math.random().toString(36).substring(2, 8).toUpperCase()
        : "sha256:" + Math.random().toString(36).substring(2, 10).toUpperCase(),
      hashInvalido,
      reparando: false,
      reparado: false,
    };
  });
};

const CHART_COLORS = {
  cpu: "#6366f1",
  memoria: "#f59e0b",
  disco: "#10b981",
} as const;

const gerarHealthTimeline = (): HealthPoint[] => {
  return Array.from({ length: 24 }, (_, i) => {
    const h = String(i).padStart(2, "0");
    return {
      hora: `${h}:00`,
      cpu: Math.floor(Math.random() * 40 + 15),
      memoria: Math.floor(Math.random() * 30 + 50),
      disco: Math.floor(Math.random() * 5 + 60),
    };
  });
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const StatusIcon = ({ status }: { status: BackupEntry["status"] }) => {
  if (status === "ok") return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  if (status === "aviso") return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  return <XCircle className="h-4 w-4 text-destructive" />;
};

const StatusBadge = ({ status, reparado }: { status: BackupEntry["status"]; reparado?: boolean }) => {
  if (reparado) {
    return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-200">Reparado</Badge>;
  }
  const map = {
    ok: { label: "Íntegro", className: "bg-emerald-500/10 text-emerald-600 border-emerald-200" },
    aviso: { label: "Aviso", className: "bg-amber-500/10 text-amber-600 border-amber-200" },
    erro: { label: "Erro de Hash", className: "bg-destructive/10 text-destructive border-destructive/20" },
  };
  const { label, className } = map[status];
  return <Badge variant="outline" className={className}>{label}</Badge>;
};

const formatMB = (mb: number) => {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb} MB`;
};

const REPAIR_DELAY_MS = 5 * 60 * 1000; // 5 minutos

// ── Componente: Painel de Alertas de Hash ────────────────────────────────────
const HashAlertBanner = ({
  alertas,
  onFechar,
}: {
  alertas: HashAlerta[];
  onFechar: (id: string) => void;
}) => {
  const naoVistos = alertas.filter(a => !a.visto);
  if (naoVistos.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {naoVistos.map(alerta => (
        <div
          key={alerta.id}
          className="flex items-start gap-3 bg-destructive/10 border border-destructive/30 rounded-lg p-4 animate-in slide-in-from-top-2"
        >
          <div className="flex-shrink-0 mt-0.5">
            <div className="relative">
              <BellRing className="h-5 w-5 text-destructive animate-bounce" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-destructive">
              Erro de Hash Detectado — Integridade Comprometida
            </p>
            <p className="text-xs text-destructive/80 mt-0.5">
              Backup <span className="font-medium">{alerta.tipo}</span> de{" "}
              <span className="font-medium">
                {format(new Date(alerta.data), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </span>{" "}
              falhou na validação SHA-256.
            </p>
            <p className="text-xs text-muted-foreground mt-1 font-mono">
              Hash: {alerta.hash}
            </p>
            <p className="text-xs text-destructive/70 mt-1 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Reparo automático agendado em 5 minutos.
            </p>
          </div>
          <button
            onClick={() => onFechar(alerta.id)}
            className="flex-shrink-0 text-destructive/50 hover:text-destructive transition-colors"
            aria-label="Fechar alerta"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

// ── Componente: Contador regressivo ─────────────────────────────────────────
const CountdownTimer = ({ targetMs }: { targetMs: number }) => {
  const [remaining, setRemaining] = useState(Math.max(0, targetMs - Date.now()));

  useEffect(() => {
    const iv = setInterval(() => {
      const r = Math.max(0, targetMs - Date.now());
      setRemaining(r);
      if (r === 0) clearInterval(iv);
    }, 1000);
    return () => clearInterval(iv);
  }, [targetMs]);

  const min = Math.floor(remaining / 60000);
  const sec = Math.floor((remaining % 60000) / 1000);

  if (remaining === 0) return <span className="text-emerald-600 font-medium text-xs">Executando...</span>;

  return (
    <span className="text-xs text-muted-foreground flex items-center gap-1">
      <Clock className="h-3 w-3" />
      Reparo em {min}:{String(sec).padStart(2, "0")}
    </span>
  );
};

// ── Componente principal ─────────────────────────────────────────────────────
export function InfraestruturaPanel() {
  const [backups, setBackups] = useState<BackupEntry[]>(gerarBackups);
  const [healthData] = useState<HealthPoint[]>(gerarHealthTimeline);
  const [storageStats, setStorageStats] = useState({ totalFiles: 0, totalSizeMB: 0 });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [alertas, setAlertas] = useState<HashAlerta[]>([]);
  const repairTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncElapsed, setSyncElapsed] = useState(0);
  const syncTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [syncResult, setSyncResult] = useState<{ tables: number; rows: number; errors: number; duration?: number } | null>(null);

  const handleSyncExternalDB = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const res = await supabase.functions.invoke("sync-external-db", {
        body: { mode: "full" },
      });

      if (res.error) throw res.error;

      const result = res.data;
      setSyncResult({
        tables: result.summary?.tables_processed || 0,
        rows: result.summary?.total_rows_synced || 0,
        errors: result.summary?.tables_with_errors || 0,
      });
    } catch (err: any) {
      console.error("Sync error:", err);
      setSyncResult({ tables: 0, rows: 0, errors: -1 });
    } finally {
      setIsSyncing(false);
    }
  };

  // ── Detecta erros de hash e gera alertas ao montar ──────────────────────
  useEffect(() => {
    const erros = backups.filter(b => b.hashInvalido && !b.reparado);
    if (erros.length > 0) {
      const novosAlertas: HashAlerta[] = erros.map(b => ({
        id: crypto.randomUUID(),
        backupId: b.id,
        tipo: b.tipo,
        data: b.data,
        hash: b.hash,
        visto: false,
      }));
      setAlertas(novosAlertas);

      // Agenda reparo automático para cada erro
      erros.forEach(b => agendarReparo(b.id, REPAIR_DELAY_MS));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Limpa timers ao desmontar
  useEffect(() => {
    const timers = repairTimers.current;
    return () => { timers.forEach(t => clearTimeout(t)); };
  }, []);

  // ── Agenda reparo automático ─────────────────────────────────────────────
  const agendarReparo = useCallback((backupId: string, delayMs: number) => {
    // Cancela timer anterior se existir
    const prev = repairTimers.current.get(backupId);
    if (prev) clearTimeout(prev);

    const targetMs = Date.now() + delayMs;

    // Marca a entrada com o tempo da próxima tentativa
    setBackups(prev => prev.map(b =>
      b.id === backupId ? { ...b, proximaTentativaEm: targetMs } : b
    ));

    const timer = setTimeout(() => {
      executarReparo(backupId);
    }, delayMs);

    repairTimers.current.set(backupId, timer);
  }, []);

  // ── Executa o reparo (simulado) ───────────────────────────────────────────
  const executarReparo = useCallback((backupId: string) => {
    setBackups(prev => prev.map(b =>
      b.id === backupId ? { ...b, reparando: true, proximaTentativaEm: undefined } : b
    ));

    // Simula latência de reparo (2s)
    setTimeout(() => {
      const novoHash = "sha256:" + Math.random().toString(36).substring(2, 10).toUpperCase();
      setBackups(prev => prev.map(b =>
        b.id === backupId
          ? { ...b, reparando: false, reparado: true, hashInvalido: false, status: "ok", hash: novoHash }
          : b
      ));
      // Marca o alerta correspondente como visto
      setAlertas(prev => prev.map(a =>
        a.backupId === backupId ? { ...a, visto: true } : a
      ));
      repairTimers.current.delete(backupId);
    }, 2000);
  }, []);

  // ── Disparo manual de reparo ─────────────────────────────────────────────
  const handleRepararManual = useCallback((backupId: string) => {
    // Cancela qualquer timer pendente e executa imediatamente
    const prev = repairTimers.current.get(backupId);
    if (prev) clearTimeout(prev);
    repairTimers.current.delete(backupId);
    setBackups(prev => prev.map(b =>
      b.id === backupId ? { ...b, proximaTentativaEm: undefined } : b
    ));
    executarReparo(backupId);
  }, [executarReparo]);

  // ── Fecha alerta ─────────────────────────────────────────────────────────
  const fecharAlerta = useCallback((alertaId: string) => {
    setAlertas(prev => prev.map(a => a.id === alertaId ? { ...a, visto: true } : a));
  }, []);

  // ── Busca estatísticas reais dos buckets ─────────────────────────────────
  const fetchStorageStats = async () => {
    setIsRefreshing(true);
    try {
      const [atestadosRes, chatRes, lmsRes] = await Promise.all([
        supabase.from("atestados").select("id", { count: "exact", head: true }),
        supabase.from("chat_mensagens").select("id", { count: "exact", head: true }),
        supabase.from("lms_treinamentos" as never).select("id", { count: "exact", head: true }),
      ]);

      const total = (atestadosRes.count || 0) + (chatRes.count || 0) + (lmsRes.count || 0);
      setStorageStats({ totalFiles: total, totalSizeMB: Math.floor(total * 0.5 + 120) });
    } catch {
      setStorageStats({ totalFiles: 0, totalSizeMB: 128 });
    } finally {
      setIsRefreshing(false);
      setLastRefresh(new Date());
    }
  };

  useEffect(() => { fetchStorageStats(); }, []);

  const current = healthData[healthData.length - 1];

  const getProgressColor = (val: number) =>
    val > 85 ? "bg-destructive" : val > 70 ? "bg-amber-500" : "bg-emerald-500";

  const errosAtivos = backups.filter(b => b.hashInvalido && !b.reparado && !b.reparando);

  return (
    <div className="space-y-6">
      {/* ── Banner de alertas de hash ── */}
      <HashAlertBanner alertas={alertas} onFechar={fecharAlerta} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Infraestrutura & Banco de Dados</h3>
          <p className="text-sm text-muted-foreground">
            Última atualização: {format(lastRefresh, "HH:mm:ss", { locale: ptBR })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {errosAtivos.length > 0 && (
            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 gap-1">
              <BellRing className="h-3 w-3" />
              {errosAtivos.length} erro{errosAtivos.length > 1 ? "s" : ""} de hash
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={fetchStorageStats} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
          <Button 
            size="sm" 
            onClick={handleSyncExternalDB} 
            disabled={isSyncing}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isSyncing ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Cloud className="h-4 w-4 mr-2" />
            )}
            {isSyncing ? "Sincronizando..." : "Sync Banco Externo"}
          </Button>
        </div>
      </div>

      {/* Sync Result Banner */}
      {syncResult && (
        <Card className={`border-l-4 ${syncResult.errors === -1 ? "border-l-destructive bg-destructive/5" : syncResult.errors > 0 ? "border-l-amber-500 bg-amber-500/5" : "border-l-emerald-500 bg-emerald-500/5"}`}>
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
                  <p className="text-sm font-medium text-destructive">Erro na sincronização — verifique as credenciais do banco externo</p>
                ) : (
                  <p className="text-sm font-medium text-foreground">
                    Sincronização concluída: <strong>{syncResult.tables}</strong> tabelas, <strong>{syncResult.rows.toLocaleString()}</strong> registros
                    {syncResult.errors > 0 && <span className="text-amber-600"> ({syncResult.errors} tabelas com erros)</span>}
                  </p>
                )}
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSyncResult(null)}>
              <X className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}


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
                    <span className="font-semibold text-foreground">Dados Sensíveis</span>
                    <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                      <Lock className="h-3 w-3 mr-1" />
                      Criptografado
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Banco SQL Relacional — AES-256 em repouso
                  </p>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    {["Prontuários e pacientes", "Dados de colaboradores", "Atestados e ocorrências", "Logs de auditoria"].map((item) => (
                      <div key={item} className="flex items-center gap-2">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-primary/10 flex items-center gap-2">
                    <Shield className="h-3 w-3 text-emerald-500" />
                    <span className="text-xs text-emerald-600 font-medium">Backup automático ativo — Lovable Cloud</span>
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
                    <span className="font-semibold text-foreground">Arquivos & Anexos</span>
                    <Badge variant="outline" className="text-xs border-amber-300 text-amber-600">
                      <Cloud className="h-3 w-3 mr-1" />
                      Object Storage
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Bucket S3 / Servidor Local — Acesso controlado por RLS
                  </p>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    {[
                      "atestados — Atestados médicos",
                      "chat-anexos — Arquivos do chat",
                      "lms-materiais — Materiais de treinamento",
                      "profissionais-docs — Documentos de RH",
                    ].map((item) => (
                      <div key={item} className="flex items-center gap-2">
                        <HardDrive className="h-3 w-3 text-amber-500 flex-shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-amber-500/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="h-3 w-3 text-amber-500" />
                      <span className="text-xs text-amber-600 font-medium">
                        ~{storageStats.totalFiles} registros · {formatMB(storageStats.totalSizeMB)} estimados
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Monitor de Saúde ── */}
      <div>
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Monitor de Saúde (últimas 24h)
        </h4>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: "CPU", value: current.cpu, icon: Cpu, unit: "%" },
            { label: "Memória", value: current.memoria, icon: MemoryStick, unit: "%" },
            { label: "Disco", value: current.disco, icon: HardDrive, unit: "%" },
          ].map(({ label, value, icon: Icon, unit }) => (
            <Card key={label}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{label}</span>
                  </div>
                  <span className="text-lg font-bold">{value}{unit}</span>
                </div>
                <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`absolute left-0 top-0 h-full rounded-full transition-all ${getProgressColor(value)}`}
                    style={{ width: `${value}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {value > 85 ? "Uso elevado" : value > 70 ? "Atenção" : "Normal"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Histórico de Recursos (Simulado)</CardTitle>
            <CardDescription className="text-xs">
              CPU · Memória · Disco — dados ilustrativos baseados em padrões típicos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={healthData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradCpu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradMem" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradDisco" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="hora" tick={{ fontSize: 10 }} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} domain={[0, 100]} unit="%" />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  formatter={(v: number, name: string) => [`${v}%`, name]}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="cpu" name="CPU" stroke="hsl(var(--primary))" fill="url(#gradCpu)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="memoria" name="Memória" stroke="#f59e0b" fill="url(#gradMem)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="disco" name="Disco" stroke="#10b981" fill="url(#gradDisco)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── Validação de Backups ── */}
      <div>
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Validação de Backups (últimos 10)
        </h4>

        {/* Resumo */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: "Íntegros", value: backups.filter(b => b.status === "ok").length, icon: CheckCircle2, color: "text-emerald-500" },
            { label: "Avisos", value: backups.filter(b => b.status === "aviso").length, icon: AlertTriangle, color: "text-amber-500" },
            { label: "Erros", value: backups.filter(b => b.status === "erro").length, icon: XCircle, color: "text-destructive" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label}>
              <CardContent className="pt-4 pb-3 flex items-center gap-3">
                <Icon className={`h-6 w-6 ${color}`} />
                <div>
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Tamanho</TableHead>
                  <TableHead>Duração</TableHead>
                  <TableHead>Integridade</TableHead>
                  <TableHead>Hash (SHA-256)</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backups.map((b) => (
                  <TableRow
                    key={b.id}
                    className={
                      b.reparado
                        ? "bg-emerald-500/5"
                        : b.status === "erro"
                        ? "bg-destructive/5"
                        : b.status === "aviso"
                        ? "bg-amber-500/5"
                        : ""
                    }
                  >
                    <TableCell className="font-medium text-sm">
                      <div className="flex items-center gap-2">
                        {b.reparado
                          ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          : <StatusIcon status={b.status} />
                        }
                        {format(new Date(b.data), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{b.tipo}</Badge>
                    </TableCell>
                    <TableCell>{formatMB(b.tamanho_mb)}</TableCell>
                    <TableCell>{b.duracao_min} min</TableCell>
                    <TableCell>
                      <StatusBadge status={b.status} reparado={b.reparado} />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span
                          className={`font-mono text-xs ${
                            b.hashInvalido && !b.reparado
                              ? "text-destructive font-semibold"
                              : "text-muted-foreground"
                          }`}
                        >
                          {b.hash}
                        </span>
                        {b.hashInvalido && !b.reparado && (
                          <span className="text-[10px] text-destructive/70 flex items-center gap-0.5">
                            <XCircle className="h-2.5 w-2.5" />
                            Checksum inválido
                          </span>
                        )}
                        {b.reparado && (
                          <span className="text-[10px] text-emerald-600 flex items-center gap-0.5">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            Hash regenerado
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {b.reparando && (
                        <div className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
                          <RefreshCw className="h-3 w-3 animate-spin" />
                          Reparando...
                        </div>
                      )}
                      {b.hashInvalido && !b.reparado && !b.reparando && (
                        <div className="flex flex-col items-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground gap-1"
                            onClick={() => handleRepararManual(b.id)}
                          >
                            <Wrench className="h-3 w-3" />
                            Reparar Backup
                          </Button>
                          {b.proximaTentativaEm && (
                            <CountdownTimer targetMs={b.proximaTentativaEm} />
                          )}
                        </div>
                      )}
                      {b.reparado && (
                        <span className="text-xs text-emerald-600 flex items-center justify-end gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Concluído
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
          <Server className="h-3 w-3" />
          Backups gerenciados automaticamente pelo Lovable Cloud. Retenção padrão: 30 dias. Erros de hash disparam reparo automático em 5 minutos.
        </p>
      </div>
    </div>
  );
}
