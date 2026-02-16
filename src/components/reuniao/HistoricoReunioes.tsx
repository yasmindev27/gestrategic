import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SearchInput } from "@/components/ui/search-input";
import {
  History,
  ChevronDown,
  ChevronRight,
  Clock,
  Users,
  CheckCircle2,
  AlertCircle,
  Timer,
  ArrowLeft,
} from "lucide-react";
import { format, parseISO, isPast, parse } from "date-fns";
import { ptBR } from "date-fns/locale";

interface HistoricoReunioesProps {
  onBack: () => void;
}

interface PlanoAcaoItem {
  tarefa: string;
  responsavel: string;
  prazo: string;
}

interface AtaData {
  resumo_executivo?: string;
  decisoes_tomadas?: string[];
  plano_acao?: PlanoAcaoItem[];
}

type StatusFilter = "todos" | "pendente" | "atrasado" | "em_andamento" | "concluido";

const statusConfig: Record<string, { label: string; className: string }> = {
  pendente: { label: "Pendente", className: "bg-amber-100 text-amber-800 border-amber-200" },
  atrasado: { label: "Atrasado", className: "bg-red-100 text-red-800 border-red-200" },
  em_andamento: { label: "Em Andamento", className: "bg-blue-100 text-blue-800 border-blue-200" },
  concluido: { label: "Concluído", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
};

const getActionStatus = (item: PlanoAcaoItem, agendaStatuses: Map<string, string>): string => {
  // Try to find matching agenda item status
  const agendaStatus = agendaStatuses.get(item.tarefa.toLowerCase().trim());
  
  if (agendaStatus === "concluida" || agendaStatus === "concluído" || agendaStatus === "concluido") {
    return "concluido";
  }
  if (agendaStatus === "em_andamento") {
    return "em_andamento";
  }

  // Check if overdue based on prazo
  if (item.prazo && item.prazo !== "A definir") {
    try {
      // Try common date formats
      const prazoDate = parsePrazo(item.prazo);
      if (prazoDate && isPast(prazoDate)) {
        return "atrasado";
      }
    } catch {}
  }

  return "pendente";
};

const parsePrazo = (prazo: string): Date | null => {
  if (!prazo) return null;
  // Try dd/MM/yyyy
  try {
    const d = parse(prazo, "dd/MM/yyyy", new Date());
    if (!isNaN(d.getTime())) return d;
  } catch {}
  // Try yyyy-MM-dd
  try {
    const d = parseISO(prazo);
    if (!isNaN(d.getTime())) return d;
  } catch {}
  return null;
};

const HistoricoReunioes = ({ onBack }: HistoricoReunioesProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");

  // Fetch encerradas meetings
  const { data: reunioes } = useQuery({
    queryKey: ["reunioes_historico"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reunioes")
        .select("*")
        .eq("status", "encerrada")
        .order("hora_encerramento", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  // Fetch agenda items that came from meetings (description contains "Ação da reunião")
  const { data: agendaItems } = useQuery({
    queryKey: ["agenda_items_reunioes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agenda_items")
        .select("id, titulo, descricao, status")
        .like("descricao", "%Ação da reunião%");
      if (error) throw error;
      return data || [];
    },
  });

  // Build a map: lowercase task title -> agenda status
  const agendaStatusMap = useMemo(() => {
    const map = new Map<string, string>();
    agendaItems?.forEach((item) => {
      map.set(item.titulo.toLowerCase().trim(), item.status || "pendente");
    });
    return map;
  }, [agendaItems]);

  // Compute status summary for each meeting
  const reunioesWithStatus = useMemo(() => {
    if (!reunioes) return [];

    return reunioes.map((r) => {
      const ata = r.ata_gerada as AtaData | null;
      const plano = ata?.plano_acao || [];

      const statusCounts = { pendente: 0, atrasado: 0, em_andamento: 0, concluido: 0 };
      const enrichedPlano = plano.map((item) => {
        const status = getActionStatus(item, agendaStatusMap);
        statusCounts[status as keyof typeof statusCounts]++;
        return { ...item, status };
      });

      return { ...r, enrichedPlano, statusCounts, totalAcoes: plano.length };
    });
  }, [reunioes, agendaStatusMap]);

  // Filter
  const filtered = useMemo(() => {
    let result = reunioesWithStatus;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((r) => r.titulo?.toLowerCase().includes(q));
    }

    if (statusFilter !== "todos") {
      result = result.filter((r) => r.statusCounts[statusFilter as keyof typeof r.statusCounts] > 0);
    }

    return result;
  }, [reunioesWithStatus, search, statusFilter]);

  const formatTime = (iso: string | null) => {
    if (!iso) return "—";
    try {
      return format(parseISO(iso), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return "—";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <History className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              Histórico de Reuniões
            </h2>
            <p className="text-sm text-muted-foreground">
              Consulte reuniões realizadas e acompanhe o plano de ação
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <SearchInput
            placeholder="Buscar por título da reunião..."
            value={search}
            onChange={setSearch}
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as StatusFilter)}
        >
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="pendente">Com ações Pendentes</SelectItem>
            <SelectItem value="atrasado">Com ações Atrasadas</SelectItem>
            <SelectItem value="em_andamento">Com ações Em Andamento</SelectItem>
            <SelectItem value="concluido">Com ações Concluídas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <History className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">
              Nenhuma reunião encontrada com os filtros selecionados
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const isExpanded = expandedId === r.id;

            return (
              <Collapsible
                key={r.id}
                open={isExpanded}
                onOpenChange={() =>
                  setExpandedId(isExpanded ? null : r.id)
                }
              >
                <Card className="overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <CardContent className="p-4 cursor-pointer hover:bg-muted/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          )}
                          <div className="min-w-0">
                            <h3 className="font-medium text-foreground truncate">
                              {r.titulo}
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                              <Clock className="h-3 w-3" />
                              {formatTime(r.hora_encerramento || r.created_at)}
                            </div>
                          </div>
                        </div>

                        {/* Status summary badges */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {r.totalAcoes === 0 ? (
                            <span className="text-xs text-muted-foreground">
                              Sem plano de ação
                            </span>
                          ) : (
                            <>
                              {r.statusCounts.concluido > 0 && (
                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  {r.statusCounts.concluido} Concluída{r.statusCounts.concluido > 1 ? "s" : ""}
                                </Badge>
                              )}
                              {r.statusCounts.em_andamento > 0 && (
                                <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100">
                                  <Timer className="h-3 w-3 mr-1" />
                                  {r.statusCounts.em_andamento} Em Andamento
                                </Badge>
                              )}
                              {r.statusCounts.pendente > 0 && (
                                <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  {r.statusCounts.pendente} Pendente{r.statusCounts.pendente > 1 ? "s" : ""}
                                </Badge>
                              )}
                              {r.statusCounts.atrasado > 0 && (
                                <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  {r.statusCounts.atrasado} Atrasada{r.statusCounts.atrasado > 1 ? "s" : ""}
                                </Badge>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="border-t px-4 py-4">
                      {r.enrichedPlano.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Nenhuma ação registrada no plano de ação desta reunião.
                        </p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Ação</TableHead>
                              <TableHead>Responsável</TableHead>
                              <TableHead>Prazo</TableHead>
                              <TableHead className="text-right">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {r.enrichedPlano.map(
                              (item: PlanoAcaoItem & { status: string }, i: number) => {
                                const cfg = statusConfig[item.status] || statusConfig.pendente;
                                return (
                                  <TableRow key={i}>
                                    <TableCell className="font-medium max-w-xs">
                                      {item.tarefa}
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-1.5">
                                        <Users className="h-3 w-3 text-muted-foreground" />
                                        {item.responsavel}
                                      </div>
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">
                                      {item.prazo || "A definir"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <Badge className={`${cfg.className} hover:${cfg.className}`}>
                                        {cfg.label}
                                      </Badge>
                                    </TableCell>
                                  </TableRow>
                                );
                              }
                            )}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default HistoricoReunioes;
