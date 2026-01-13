import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  Clock
} from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface LogEntry {
  id: string;
  user_id: string | null;
  acao: string;
  modulo: string;
  detalhes: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  user_name?: string;
}

const acaoLabels: Record<string, { label: string; color: string }> = {
  acesso: { label: "Acesso", color: "bg-blue-500/10 text-blue-600 border-blue-200" },
  criar: { label: "Criar", color: "bg-green-500/10 text-green-600 border-green-200" },
  editar: { label: "Editar", color: "bg-yellow-500/10 text-yellow-600 border-yellow-200" },
  excluir: { label: "Excluir", color: "bg-red-500/10 text-red-600 border-red-200" },
  login: { label: "Login", color: "bg-primary/10 text-primary border-primary/20" },
  logout: { label: "Logout", color: "bg-muted text-muted-foreground border-border" },
};

export const LogsAuditoriaModule = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedModulo, setSelectedModulo] = useState<string>("todos");
  const [selectedAcao, setSelectedAcao] = useState<string>("todos");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(subDays(new Date(), 7));
  const [dateTo, setDateTo] = useState<Date | undefined>(new Date());
  const [modulos, setModulos] = useState<string[]>([]);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("logs_acesso")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      if (dateFrom) {
        query = query.gte("created_at", startOfDay(dateFrom).toISOString());
      }
      if (dateTo) {
        query = query.lte("created_at", endOfDay(dateTo).toISOString());
      }
      if (selectedModulo !== "todos") {
        query = query.eq("modulo", selectedModulo);
      }
      if (selectedAcao !== "todos") {
        query = query.eq("acao", selectedAcao);
      }

      // Pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      // Fetch user names for each unique user_id
      const userIds = [...new Set((data || []).map(l => l.user_id).filter(Boolean))] as string[];
      
      let userMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", userIds);
        
        if (profiles) {
          userMap = profiles.reduce((acc, p) => {
            acc[p.user_id] = p.full_name;
            return acc;
          }, {} as Record<string, string>);
        }
      }

      const logsWithNames = (data || []).map(log => ({
        ...log,
        user_name: log.user_id ? userMap[log.user_id] || "Usuário removido" : "Sistema",
        detalhes: log.detalhes as Record<string, unknown> | null
      }));

      setLogs(logsWithNames);
      setTotalCount(count || 0);
    } catch (error) {
      console.error("Erro ao buscar logs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchModulos = async () => {
    try {
      const { data } = await supabase
        .from("logs_acesso")
        .select("modulo")
        .order("modulo");
      
      if (data) {
        const uniqueModulos = [...new Set(data.map(d => d.modulo))];
        setModulos(uniqueModulos);
      }
    } catch (error) {
      console.error("Erro ao buscar módulos:", error);
    }
  };

  useEffect(() => {
    fetchModulos();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [selectedModulo, selectedAcao, dateFrom, dateTo, page]);

  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      log.user_name?.toLowerCase().includes(search) ||
      log.modulo.toLowerCase().includes(search) ||
      log.acao.toLowerCase().includes(search)
    );
  });

  const getAcaoBadge = (acao: string) => {
    const config = acaoLabels[acao] || { label: acao, color: "bg-muted text-muted-foreground" };
    return (
      <Badge variant="outline" className={cn("font-medium", config.color)}>
        {config.label}
      </Badge>
    );
  };

  const formatModulo = (modulo: string) => {
    return modulo
      .split("_")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Logs de Auditoria</h2>
          <p className="text-muted-foreground">Monitoramento de ações e acessos do sistema</p>
        </div>
        <Button onClick={fetchLogs} variant="outline" disabled={isLoading}>
          <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
          Atualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalCount}</p>
                <p className="text-sm text-muted-foreground">Total de Registros</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <Activity className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{modulos.length}</p>
                <p className="text-sm text-muted-foreground">Módulos Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <User className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {new Set(logs.map(l => l.user_id)).size}
                </p>
                <p className="text-sm text-muted-foreground">Usuários na Página</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-500/10 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {logs[0] ? format(new Date(logs[0].created_at), "HH:mm", { locale: ptBR }) : "--:--"}
                </p>
                <p className="text-sm text-muted-foreground">Último Registro</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por usuário ou módulo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={selectedModulo} onValueChange={setSelectedModulo}>
              <SelectTrigger>
                <SelectValue placeholder="Módulo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os módulos</SelectItem>
                {modulos.map(m => (
                  <SelectItem key={m} value={m}>{formatModulo(m)}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedAcao} onValueChange={setSelectedAcao}>
              <SelectTrigger>
                <SelectValue placeholder="Ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as ações</SelectItem>
                <SelectItem value="acesso">Acesso</SelectItem>
                <SelectItem value="criar">Criar</SelectItem>
                <SelectItem value="editar">Editar</SelectItem>
                <SelectItem value="excluir">Excluir</SelectItem>
                <SelectItem value="login">Login</SelectItem>
                <SelectItem value="logout">Logout</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="flex-1 justify-start">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {dateFrom ? format(dateFrom, "dd/MM", { locale: ptBR }) : "De"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="flex-1 justify-start">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {dateTo ? format(dateTo, "dd/MM", { locale: ptBR }) : "Até"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <FileText className="h-12 w-12 mb-4 opacity-50" />
                <p>Nenhum log encontrado</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Data/Hora</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Módulo</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead className="text-right">Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-muted/50">
                      <TableCell className="font-mono text-sm">
                        {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-xs font-medium text-primary">
                              {log.user_name?.slice(0, 2).toUpperCase() || "??"}
                            </span>
                          </div>
                          <span className="font-medium">{log.user_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{formatModulo(log.modulo)}</Badge>
                      </TableCell>
                      <TableCell>{getAcaoBadge(log.acao)}</TableCell>
                      <TableCell className="text-right">
                        {log.detalhes && Object.keys(log.detalhes).length > 0 ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedLog(log)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <p className="text-sm text-muted-foreground">
                Mostrando {((page - 1) * pageSize) + 1} a {Math.min(page * pageSize, totalCount)} de {totalCount}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Próximo
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes do Log</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Usuário</p>
                  <p className="font-medium">{selectedLog.user_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data/Hora</p>
                  <p className="font-medium">
                    {format(new Date(selectedLog.created_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Módulo</p>
                  <Badge variant="secondary">{formatModulo(selectedLog.modulo)}</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ação</p>
                  {getAcaoBadge(selectedLog.acao)}
                </div>
                {selectedLog.ip_address && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">IP</p>
                    <p className="font-mono text-sm">{selectedLog.ip_address}</p>
                  </div>
                )}
              </div>
              {selectedLog.detalhes && Object.keys(selectedLog.detalhes).length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Dados Adicionais</p>
                  <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto max-h-48">
                    {JSON.stringify(selectedLog.detalhes, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
