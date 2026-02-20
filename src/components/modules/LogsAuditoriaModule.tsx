import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  CalendarIcon,
  Filter,
  FileText,
  Loader2,
  RefreshCw,
  Eye,
  User,
  Activity,
  Clock,
  Download,
  FileSpreadsheet,
  ShieldCheck,
  UserCheck,
  Pencil,
  Trash2,
  LogIn,
  LogOut,
  Plus,
  AlertTriangle,
  Info,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

// ── Sanitização XSS ──────────────────────────────────────────────────────────
const escapeHtml = (text: string | null | undefined): string => {
  if (text == null) return "";
  const div = document.createElement("div");
  div.textContent = String(text);
  return div.innerHTML;
};
const escapeJson = (obj: unknown): string => {
  if (obj == null) return "-";
  return escapeHtml(JSON.stringify(obj));
};

// ── Tipos ────────────────────────────────────────────────────────────────────
interface LogEntry {
  id: string;
  user_id: string | null;
  acao: string;
  modulo: string;
  detalhes: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  user_name?: string;
  user_matricula?: string | null;
}

// Trilha de auditoria derivada dos logs
interface TrilhaEntry {
  id: string;
  quem: string;
  quem_id: string | null;
  o_que: string;
  em_qual: string;
  modulo: string;
  data_hora: string;
  impacto: "baixo" | "medio" | "alto";
  detalhes: Record<string, unknown> | null;
  acao_raw: string;
}

// ── Mapa de ações ─────────────────────────────────────────────────────────────
const acaoConfig: Record<string, {
  label: string;
  descricao: string;
  color: string;
  icon: React.ElementType;
  impacto: TrilhaEntry["impacto"];
}> = {
  acesso:        { label: "Acesso",        descricao: "Visualizou módulo",           color: "bg-blue-500/10 text-blue-600 border-blue-200",       icon: Info,       impacto: "baixo" },
  criar:         { label: "Criar",         descricao: "Criou novo registro",          color: "bg-emerald-500/10 text-emerald-600 border-emerald-200", icon: Plus,       impacto: "medio" },
  editar:        { label: "Editar",        descricao: "Editou registro existente",    color: "bg-amber-500/10 text-amber-600 border-amber-200",    icon: Pencil,     impacto: "medio" },
  excluir:       { label: "Excluir",       descricao: "Removeu registro",             color: "bg-destructive/10 text-destructive border-destructive/20", icon: Trash2,  impacto: "alto"  },
  login:         { label: "Login",         descricao: "Autenticou no sistema",        color: "bg-primary/10 text-primary border-primary/20",       icon: LogIn,      impacto: "baixo" },
  logout:        { label: "Logout",        descricao: "Encerrou sessão",              color: "bg-muted text-muted-foreground border-border",        icon: LogOut,     impacto: "baixo" },
  alterar_role:  { label: "Alterar Perfil", descricao: "Alterou perfil de acesso",   color: "bg-purple-500/10 text-purple-600 border-purple-200", icon: UserCheck,  impacto: "alto"  },
  exportar:      { label: "Exportar",      descricao: "Exportou dados",               color: "bg-orange-500/10 text-orange-600 border-orange-200", icon: Download,   impacto: "medio" },
};

const getAcaoConfig = (acao: string) =>
  acaoConfig[acao] ?? { label: acao, descricao: acao, color: "bg-muted text-muted-foreground border-border", icon: Activity, impacto: "baixo" as const };

const impactoConfig: Record<TrilhaEntry["impacto"], { label: string; color: string }> = {
  baixo: { label: "Baixo",  color: "bg-emerald-500/10 text-emerald-600 border-emerald-200" },
  medio: { label: "Médio",  color: "bg-amber-500/10 text-amber-600 border-amber-200" },
  alto:  { label: "Alto",   color: "bg-destructive/10 text-destructive border-destructive/20" },
};

// ── Deriva trilha a partir dos logs ──────────────────────────────────────────
const derivarTrilha = (logs: LogEntry[]): TrilhaEntry[] =>
  logs.map((log): TrilhaEntry => {
    const cfg = getAcaoConfig(log.acao);
    const det = log.detalhes || {};

    // "Em qual registro" — tenta extrair do campo detalhes
    const emQual =
      (det.nome as string) ||
      (det.titulo as string) ||
      (det.numero_chamado as string) ||
      (det.numero_notificacao as string) ||
      (det.paciente_nome as string) ||
      (det.full_name as string) ||
      (det.registro_id as string) ||
      formatModulo(log.modulo);

    // "O que fez" — combina ação com módulo
    const oQue = `${cfg.descricao} em ${formatModulo(log.modulo)}`;

    return {
      id: log.id,
      quem: log.user_name || "Sistema",
      quem_id: log.user_id,
      o_que: oQue,
      em_qual: emQual,
      modulo: log.modulo,
      data_hora: log.created_at,
      impacto: cfg.impacto,
      detalhes: log.detalhes,
      acao_raw: log.acao,
    };
  });

// ── Helper ────────────────────────────────────────────────────────────────────
function formatModulo(modulo: string) {
  return modulo.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

// ── Componente principal ──────────────────────────────────────────────────────
export const LogsAuditoriaModule = () => {
  const [logs, setLogs]           = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedModulo, setSelectedModulo] = useState("todos");
  const [selectedAcao, setSelectedAcao]     = useState("todos");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(subDays(new Date(), 7));
  const [dateTo,   setDateTo]   = useState<Date | undefined>(new Date());
  const [modulos, setModulos]   = useState<string[]>([]);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [totalCount, setTotalCount]   = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 50;

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("logs_acesso")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      if (dateFrom) query = query.gte("created_at", startOfDay(dateFrom).toISOString());
      if (dateTo)   query = query.lte("created_at", endOfDay(dateTo).toISOString());
      if (selectedModulo !== "todos") query = query.eq("modulo", selectedModulo);
      if (selectedAcao   !== "todos") query = query.eq("acao", selectedAcao);

      const from = (page - 1) * pageSize;
      query = query.range(from, from + pageSize - 1);

      const { data, error, count } = await query;
      if (error) throw error;

      // Nomes e matrículas via profiles
      const userIds = [...new Set((data || []).map(l => l.user_id).filter(Boolean))] as string[];
      let userMap: Record<string, { name: string; matricula: string | null }> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, matricula")
          .in("user_id", userIds);
        if (profiles) {
          userMap = profiles.reduce((acc, p) => {
            acc[p.user_id] = { name: p.full_name, matricula: p.matricula };
            return acc;
          }, {} as Record<string, { name: string; matricula: string | null }>);
        }
      }

      const logsWithNames = (data || []).map(log => ({
        ...log,
        user_name: log.user_id ? userMap[log.user_id]?.name || "Usuário removido" : "Sistema",
        user_matricula: log.user_id ? userMap[log.user_id]?.matricula ?? null : null,
        detalhes: log.detalhes as Record<string, unknown> | null,
      }));

      setLogs(logsWithNames);
      setTotalCount(count || 0);
    } catch (err) {
      console.error("Erro ao buscar logs:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchModulos = async () => {
    const { data } = await supabase.from("logs_acesso").select("modulo").order("modulo");
    if (data) setModulos([...new Set(data.map(d => d.modulo))]);
  };

  useEffect(() => { fetchModulos(); }, []);
  useEffect(() => { fetchLogs(); }, [selectedModulo, selectedAcao, dateFrom, dateTo, page]);

  // ── Filtro local ──────────────────────────────────────────────────────────
  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      (log.user_name?.toLowerCase().includes(s)) ||
      log.modulo.toLowerCase().includes(s) ||
      log.acao.toLowerCase().includes(s)
    );
  });

  const trilha = derivarTrilha(filteredLogs);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const altosImpacto = trilha.filter(t => t.impacto === "alto").length;
  const usuariosUnicos = new Set(logs.map(l => l.user_id)).size;
  const ultimoEvento = logs[0]
    ? format(new Date(logs[0].created_at), "HH:mm", { locale: ptBR })
    : "--:--";

  // ── Export ────────────────────────────────────────────────────────────────
  const exportToCSV = () => {
    const headers = ["Data/Hora", "Quem fez", "O que fez", "Em qual registro", "Módulo", "Impacto", "Detalhes"];
    const rows = trilha.map(t => [
      format(new Date(t.data_hora), "dd/MM/yyyy HH:mm:ss"),
      t.quem,
      t.o_que,
      t.em_qual,
      formatModulo(t.modulo),
      impactoConfig[t.impacto].label,
      t.detalhes ? JSON.stringify(t.detalhes) : "",
    ]);
    const csv = [headers.join(";"), ...rows.map(r => r.map(c => `"${c}"`).join(";"))].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `trilha_auditoria_${format(new Date(), "yyyy-MM-dd_HH-mm")}.csv`;
    a.click();
  };

  const exportToPDF = () => {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head>
      <title>Trilha de Auditoria — ${format(new Date(), "dd/MM/yyyy HH:mm")}</title>
      <style>
        body{font-family:Arial,sans-serif;margin:20px;font-size:11px}
        h1{font-size:16px;margin-bottom:4px}
        p{color:#666;font-size:11px;margin:2px 0}
        table{width:100%;border-collapse:collapse;margin-top:16px}
        th,td{border:1px solid #ddd;padding:6px;text-align:left}
        th{background:#f5f5f5;font-weight:bold}
        tr:nth-child(even){background:#fafafa}
        .alto{color:#dc2626;font-weight:bold}
        .medio{color:#ca8a04}
        .baixo{color:#16a34a}
        @media print{body{margin:0}}
      </style></head><body>
      <h1>Trilha de Auditoria — LGPD/ONA Compliance</h1>
      <p>Gerado em: ${escapeHtml(format(new Date(), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR }))}</p>
      <p>Período: ${escapeHtml(dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Início")} até ${escapeHtml(dateTo ? format(dateTo, "dd/MM/yyyy") : "Hoje")}</p>
      <p>Total de eventos: ${filteredLogs.length}</p>
      <table><thead><tr>
        <th>Data/Hora</th><th>Quem fez</th><th>O que fez</th><th>Em qual registro</th><th>Impacto</th>
      </tr></thead><tbody>
      ${trilha.map(t => `<tr>
        <td>${escapeHtml(format(new Date(t.data_hora), "dd/MM/yyyy HH:mm:ss"))}</td>
        <td>${escapeHtml(t.quem)}</td>
        <td>${escapeHtml(t.o_que)}</td>
        <td>${escapeHtml(t.em_qual)}</td>
        <td class="${t.impacto}">${escapeHtml(impactoConfig[t.impacto].label)}</td>
      </tr>`).join("")}
      </tbody></table>
      <script>window.onload=function(){window.print()}</script>
    </body></html>`);
    win.document.close();
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Logs & Trilha de Auditoria</h2>
          <p className="text-muted-foreground text-sm">Conformidade LGPD · ONA · Rastreabilidade completa</p>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={filteredLogs.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={exportToCSV}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                CSV — Trilha de Auditoria
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToPDF}>
                <FileText className="h-4 w-4 mr-2" />
                PDF — Relatório LGPD
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={fetchLogs} variant="outline" disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total de Eventos",     value: totalCount,      icon: FileText,   bg: "bg-primary/10",          ico: "text-primary" },
          { label: "Ações Alto Impacto",   value: altosImpacto,    icon: AlertTriangle, bg: "bg-destructive/10", ico: "text-destructive" },
          { label: "Usuários Ativos",      value: usuariosUnicos,  icon: User,       bg: "bg-emerald-500/10",      ico: "text-emerald-600" },
          { label: "Último Evento",        value: ultimoEvento,    icon: Clock,      bg: "bg-amber-500/10",        ico: "text-amber-600" },
        ].map(({ label, value, icon: Icon, bg, ico }) => (
          <Card key={label}>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className={cn("p-2.5 rounded-lg", bg)}>
                  <Icon className={cn("h-5 w-5", ico)} />
                </div>
                <div>
                  <p className="text-xl font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por usuário, módulo ou ação..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedModulo} onValueChange={setSelectedModulo}>
              <SelectTrigger><SelectValue placeholder="Módulo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os módulos</SelectItem>
                {modulos.map(m => <SelectItem key={m} value={m}>{formatModulo(m)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={selectedAcao} onValueChange={setSelectedAcao}>
              <SelectTrigger><SelectValue placeholder="Ação" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as ações</SelectItem>
                {Object.entries(acaoConfig).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="flex-1 justify-start text-sm">
                    <CalendarIcon className="h-4 w-4 mr-1" />
                    {dateFrom ? format(dateFrom, "dd/MM", { locale: ptBR }) : "De"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} locale={ptBR} />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="flex-1 justify-start text-sm">
                    <CalendarIcon className="h-4 w-4 mr-1" />
                    {dateTo ? format(dateTo, "dd/MM", { locale: ptBR }) : "Até"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={dateTo} onSelect={setDateTo} locale={ptBR} />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="trilha">
        <TabsList>
          <TabsTrigger value="trilha" className="gap-2">
            <ShieldCheck className="h-4 w-4" />
            Trilha de Auditoria
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <Activity className="h-4 w-4" />
            Logs Brutos
          </TabsTrigger>
        </TabsList>

        {/* ── Trilha de Auditoria ── */}
        <TabsContent value="trilha" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Trilha de Auditoria — LGPD Compliance
              </CardTitle>
              <CardDescription>
                Registro imutável de "Quem fez", "O que fez", "Em qual registro" e "Data/Hora"
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[520px]">
                {isLoading ? (
                  <div className="flex items-center justify-center h-48">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : trilha.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                    <ShieldCheck className="h-10 w-10 mb-3 opacity-40" />
                    <p>Nenhum evento encontrado</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[160px]">Data/Hora</TableHead>
                        <TableHead>Usuário (Nome/Matrícula)</TableHead>
                        <TableHead>Ação Realizada</TableHead>
                        <TableHead>Módulo/Tabela</TableHead>
                        <TableHead>Registro Alvo (ID/Nome)</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trilha.map((t) => {
                        const cfg = getAcaoConfig(t.acao_raw);
                        const AcaoIcon = cfg.icon;
                        const log = logs.find(l => l.id === t.id);
                        return (
                          <TableRow
                            key={t.id}
                            className={cn(
                              "hover:bg-muted/40",
                              t.impacto === "alto" && "bg-destructive/5 hover:bg-destructive/10"
                            )}
                          >
                            {/* Data/Hora */}
                            <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                              {format(new Date(t.data_hora), "dd/MM/yy HH:mm:ss", { locale: ptBR })}
                            </TableCell>

                            {/* Usuário (Nome/Matrícula) */}
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                  <span className="text-xs font-semibold text-primary">
                                    {t.quem.slice(0, 2).toUpperCase()}
                                  </span>
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium leading-tight truncate">{t.quem}</p>
                                  {log?.user_matricula && (
                                    <p className="text-xs text-muted-foreground font-mono">{log.user_matricula}</p>
                                  )}
                                </div>
                              </div>
                            </TableCell>

                            {/* Ação Realizada */}
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                <AcaoIcon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                <Badge variant="outline" className={cn("text-xs font-medium", cfg.color)}>
                                  {cfg.label}
                                </Badge>
                              </div>
                            </TableCell>

                            {/* Módulo/Tabela */}
                            <TableCell>
                              <Badge variant="secondary" className="text-xs">
                                {formatModulo(t.modulo)}
                              </Badge>
                            </TableCell>

                            {/* Registro Alvo (ID/Nome) */}
                            <TableCell>
                              <span className="text-sm font-medium">{t.em_qual}</span>
                            </TableCell>

                            {/* Detalhes */}
                            <TableCell>
                              {t.detalhes && Object.keys(t.detalhes).length > 0 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={() => setSelectedLog(log || null)}
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </ScrollArea>

              {/* Paginação */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, totalCount)} de {totalCount} eventos
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Anterior</Button>
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Próximo</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Logs Brutos ── */}
        <TabsContent value="logs" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Logs Brutos do Sistema
              </CardTitle>
              <CardDescription>Registro técnico completo de todas as ações</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[520px]">
                {isLoading ? (
                  <div className="flex items-center justify-center h-48">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : filteredLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                    <FileText className="h-10 w-10 mb-3 opacity-40" />
                    <p>Nenhum log encontrado</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[160px]">Data/Hora</TableHead>
                        <TableHead>Usuário (Nome/Matrícula)</TableHead>
                        <TableHead>Ação Realizada</TableHead>
                        <TableHead>Módulo/Tabela</TableHead>
                        <TableHead>Registro Alvo (ID/Nome)</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLogs.map((log) => {
                        const cfg = getAcaoConfig(log.acao);
                        const AcaoIcon = cfg.icon;
                        const trilhaItem = derivarTrilha([log])[0];
                        return (
                          <TableRow key={log.id} className="hover:bg-muted/50">
                            {/* Data/Hora */}
                            <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                              {format(new Date(log.created_at), "dd/MM/yy HH:mm:ss", { locale: ptBR })}
                            </TableCell>

                            {/* Usuário (Nome/Matrícula) */}
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                  <span className="text-xs font-semibold text-primary">
                                    {log.user_name?.slice(0, 2).toUpperCase() || "??"}
                                  </span>
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium leading-tight truncate">{log.user_name}</p>
                                  {log.user_matricula && (
                                    <p className="text-xs text-muted-foreground font-mono">{log.user_matricula}</p>
                                  )}
                                </div>
                              </div>
                            </TableCell>

                            {/* Ação Realizada */}
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                <AcaoIcon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                <Badge variant="outline" className={cn("text-xs font-medium", cfg.color)}>
                                  {cfg.label}
                                </Badge>
                              </div>
                            </TableCell>

                            {/* Módulo/Tabela */}
                            <TableCell>
                              <Badge variant="secondary" className="text-xs">
                                {formatModulo(log.modulo)}
                              </Badge>
                            </TableCell>

                            {/* Registro Alvo */}
                            <TableCell>
                              <span className="text-sm font-medium">{trilhaItem.em_qual}</span>
                            </TableCell>

                            {/* Detalhes */}
                            <TableCell>
                              {log.detalhes && Object.keys(log.detalhes).length > 0 ? (
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setSelectedLog(log)}>
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                              ) : (
                                <span className="text-muted-foreground text-sm">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </ScrollArea>

              {totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, totalCount)} de {totalCount}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Anterior</Button>
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Próximo</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Detalhe do Evento
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (() => {
            const cfg = getAcaoConfig(selectedLog.acao);
            const trilhaItem = derivarTrilha([selectedLog])[0];
            return (
              <div className="space-y-4 pt-2">
                {/* Trilha */}
                <div className="grid grid-cols-2 gap-3 p-4 rounded-lg bg-muted/40 border">
                  {[
                    { label: "👤 Quem fez",       value: trilhaItem.quem },
                    { label: "⚡ O que fez",       value: trilhaItem.o_que },
                    { label: "📄 Em qual registro", value: trilhaItem.em_qual },
                    { label: "🕐 Data/Hora",       value: format(new Date(selectedLog.created_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR }) },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="text-sm font-medium mt-0.5">{value}</p>
                    </div>
                  ))}
                </div>

                {/* Badges */}
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs">
                    {formatModulo(selectedLog.modulo)}
                  </Badge>
                  <Badge variant="outline" className={cn("text-xs", cfg.color)}>
                    {cfg.label}
                  </Badge>
                  <Badge variant="outline" className={cn("text-xs", impactoConfig[trilhaItem.impacto].color)}>
                    Impacto {impactoConfig[trilhaItem.impacto].label}
                  </Badge>
                  {selectedLog.ip_address && (
                    <Badge variant="outline" className="text-xs font-mono">
                      IP: {selectedLog.ip_address}
                    </Badge>
                  )}
                </div>

                {/* Payload */}
                {selectedLog.detalhes && Object.keys(selectedLog.detalhes).length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Dados técnicos (payload)</p>
                    <pre className="bg-muted p-3 rounded-lg text-xs overflow-auto max-h-44 leading-relaxed">
                      {JSON.stringify(selectedLog.detalhes, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};
