import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useSetoresNomes } from "@/hooks/useSetores";
import { useCargos, useColaboradores } from "@/hooks/useProfissionais";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle, ArrowRightLeft, ChevronDown, ChevronLeft, ChevronRight,
  Download, Eye, EyeOff, FileSpreadsheet, FileText, Plus, Search, ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { format, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { exportToPDF, exportToCSV } from "@/lib/export-utils";
import * as XLSX from "xlsx";
import { sanitizeText, sanitizeName, sanitizeSearchQuery } from "@/lib/sanitize";
import { maskMatricula, maskSensitiveText } from "@/lib/data-mask";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Movimentacao {
  id: string;
  colaborador_nome: string;
  colaborador_matricula: string | null;
  cargo: string;
  setor_anterior: string;
  setor_novo: string;
  data_mudanca: string;
  motivo: string | null;
  observacoes: string | null;
  registrado_por_nome: string;
  created_at: string;
}

interface Ocorrencia {
  id: string;
  colaborador_nome: string;
  colaborador_matricula: string | null;
  cargo: string | null;
  setor: string | null;
  tipo_ocorrencia: string;
  data_ocorrencia: string;
  motivo_clt: string;
  descricao: string | null;
  status_assinatura: string;
  dias_suspensao: number | null;
  testemunha_1: string | null;
  testemunha_2: string | null;
  registrado_por_nome: string;
  created_at: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TIPOS_OCORRENCIA = [
  { value: "advertencia_verbal", label: "Advertência Verbal" },
  { value: "advertencia_escrita", label: "Advertência Escrita" },
  { value: "suspensao", label: "Suspensão" },
];

const MOTIVOS_CLT = [
  "Desídia/Atrasos",
  "Insubordinação",
  "Conduta Ética",
  "Abandono de Posto",
  "Uso de Celular Indevido",
  "Desrespeito a Colegas",
  "Descumprimento de Normas",
  "Negligência no Atendimento",
  "Outros",
];

// Cargos são carregados dinamicamente do banco via useCargos()

const STATUS_ASSINATURA = [
  { value: "assinado", label: "Assinado", variant: "success" as const },
  { value: "pendente", label: "Pendente", variant: "warning" as const },
  { value: "recusado_testemunhas", label: "Recusado c/ Testemunhas", variant: "destructive" as const },
];

const tipoLabel = (t: string) => TIPOS_OCORRENCIA.find((x) => x.value === t)?.label ?? t;

const statusBadge = (status: string) => {
  const map: Record<string, { label: string; className: string }> = {
    assinado: { label: "Assinado", className: "bg-green-100 text-green-800 border-green-200" },
    pendente: { label: "Pendente", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
    recusado_testemunhas: { label: "Recusado c/ Testemunhas", className: "bg-red-100 text-red-800 border-red-200" },
  };
  const s = map[status] ?? { label: status, className: "" };
  return <Badge variant="outline" className={s.className}>{s.label}</Badge>;
};

// ─── Main Component ───────────────────────────────────────────────────────────

export function MovimentacoesDisciplinarSection() {
  const { userId, role } = useUserRole();
  const isAdmin = role === "admin" || role === "rh_dp";
  const queryClient = useQueryClient();
  const { data: setoresData = [] } = useSetoresNomes();
  const { data: cargosDb = [] } = useCargos();
  const { data: colaboradoresData = [] } = useColaboradores();
  const CARGOS = cargosDb.map((c) => c.nome);

  // Filtro de colaboradores para seleção
  const [ocColabSearch, setOcColabSearch] = useState("");
  const [transColabSearch, setTransColabSearch] = useState("");

  const filteredColabForOc = useMemo(() => {
    if (!ocColabSearch || ocColabSearch.length < 2) return [];
    const term = ocColabSearch.toLowerCase();
    return colaboradoresData.filter(c =>
      c.full_name?.toLowerCase().includes(term)
    ).slice(0, 10);
  }, [ocColabSearch, colaboradoresData]);

  const filteredColabForTrans = useMemo(() => {
    if (!transColabSearch || transColabSearch.length < 2) return [];
    const term = transColabSearch.toLowerCase();
    return colaboradoresData.filter(c =>
      c.full_name?.toLowerCase().includes(term)
    ).slice(0, 10);
  }, [transColabSearch, colaboradoresData]);
  // Controle de revelação de dados sensíveis
  const [revealSensitive, setRevealSensitive] = useState(false);

  // Filtros globais
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));

  // Paginação
  const PAGE_SIZE = 20;
  const [ocPage, setOcPage] = useState(1);
  const [movPage, setMovPage] = useState(1);

  // Modals
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showOcorrenciaModal, setShowOcorrenciaModal] = useState(false);

  // Forms
  const emptyTransfer = {
    colaborador_nome: "", colaborador_matricula: "", cargo: "",
    setor_anterior: "", setor_novo: "", data_mudanca: format(new Date(), "yyyy-MM-dd"),
    motivo: "", observacoes: "",
  };
  const emptyOcorrencia = {
    colaborador_nome: "", colaborador_matricula: "", cargo: "", setor: "",
    tipo_ocorrencia: "", data_ocorrencia: format(new Date(), "yyyy-MM-dd"),
    motivo_clt: "", descricao: "", status_assinatura: "pendente",
    dias_suspensao: "", testemunha_1: "", testemunha_2: "",
  };
  const [transferForm, setTransferForm] = useState(emptyTransfer);
  const [ocorrenciaForm, setOcorrenciaForm] = useState(emptyOcorrencia);

  // ── Queries ──────────────────────────────────────────────────────────────

  const { data: movimentacoes = [], isLoading: loadingMov } = useQuery({
    queryKey: ["rh_movimentacoes", dateFrom, dateTo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rh_movimentacoes_setor")
        .select("*")
        .gte("data_mudanca", dateFrom)
        .lte("data_mudanca", dateTo)
        .order("data_mudanca", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Movimentacao[];
    },
  });

  const { data: ocorrencias = [], isLoading: loadingOc } = useQuery({
    queryKey: ["rh_ocorrencias", dateFrom, dateTo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rh_ocorrencias_disciplinares")
        .select("*")
        .gte("data_ocorrencia", dateFrom)
        .lte("data_ocorrencia", dateTo)
        .order("data_ocorrencia", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Ocorrencia[];
    },
  });

  // ── Mutations ─────────────────────────────────────────────────────────────

  const insertTransfer = useMutation({
    mutationFn: async (form: typeof transferForm) => {
      const { error } = await supabase.from("rh_movimentacoes_setor").insert({
        colaborador_nome: form.colaborador_nome,
        colaborador_matricula: form.colaborador_matricula || null,
        cargo: form.cargo,
        setor_anterior: form.setor_anterior,
        setor_novo: form.setor_novo,
        data_mudanca: form.data_mudanca,
        motivo: form.motivo || null,
        observacoes: form.observacoes || null,
        registrado_por: userId ?? null,
        registrado_por_nome: "Sistema",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rh_movimentacoes"] });
      queryClient.invalidateQueries({ queryKey: ["gestao_talentos_profiles"] });
      setShowTransferModal(false);
      setTransferForm(emptyTransfer);
      setTransColabSearch("");
      toast.success("Transferência registrada com sucesso!");
    },
    onError: () => toast.error("Erro ao registrar transferência."),
  });

  const insertOcorrencia = useMutation({
    mutationFn: async (form: typeof ocorrenciaForm) => {
      const { error } = await supabase.from("rh_ocorrencias_disciplinares").insert({
        colaborador_nome: form.colaborador_nome,
        colaborador_matricula: form.colaborador_matricula || null,
        cargo: form.cargo || null,
        setor: form.setor || null,
        tipo_ocorrencia: form.tipo_ocorrencia,
        data_ocorrencia: form.data_ocorrencia,
        motivo_clt: form.motivo_clt,
        descricao: form.descricao || null,
        status_assinatura: form.status_assinatura,
        dias_suspensao: form.tipo_ocorrencia === "suspensao" && form.dias_suspensao ? Number(form.dias_suspensao) : null,
        testemunha_1: form.testemunha_1 || null,
        testemunha_2: form.testemunha_2 || null,
        registrado_por: userId ?? null,
        registrado_por_nome: "Sistema",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rh_ocorrencias"] });
      // Atualizar gestão de talentos na gerência
      queryClient.invalidateQueries({ queryKey: ["gestao_talentos_profiles"] });
      queryClient.invalidateQueries({ queryKey: ["gestao_talentos_atestados"] });
      setShowOcorrenciaModal(false);
      setOcorrenciaForm(emptyOcorrencia);
      setOcColabSearch("");
      toast.success("Ocorrência lançada com sucesso!");
    },
    onError: () => toast.error("Erro ao lançar ocorrência."),
  });

  // ── Filtros locais (com sanitização de busca) ─────────────────────────────

  const cleanSearch = sanitizeSearchQuery(search);

  const filteredMov = movimentacoes.filter((m) => {
    const q = cleanSearch.toLowerCase();
    return !q || m.colaborador_nome.toLowerCase().includes(q) || (m.colaborador_matricula ?? "").includes(q);
  });

  const filteredOc = ocorrencias.filter((o) => {
    const q = cleanSearch.toLowerCase();
    return !q || o.colaborador_nome.toLowerCase().includes(q) || (o.colaborador_matricula ?? "").includes(q);
  });

  // Paginação
  const paginatedOc  = filteredOc.slice((ocPage - 1) * PAGE_SIZE, ocPage * PAGE_SIZE);
  const paginatedMov = filteredMov.slice((movPage - 1) * PAGE_SIZE, movPage * PAGE_SIZE);
  const totalOcPages  = Math.max(1, Math.ceil(filteredOc.length / PAGE_SIZE));
  const totalMovPages = Math.max(1, Math.ceil(filteredMov.length / PAGE_SIZE));

  // Alerta: colaboradores com >2 ocorrências no mês filtrado
  const ocorrenciasPorColaborador: Record<string, number> = {};
  filteredOc.forEach((o) => {
    ocorrenciasPorColaborador[o.colaborador_nome] = (ocorrenciasPorColaborador[o.colaborador_nome] ?? 0) + 1;
  });
  const alertaCritico = Object.entries(ocorrenciasPorColaborador).filter(([, count]) => count > 2);

  // ── Exportações ───────────────────────────────────────────────────────────

  const exportPDF = () => {
    exportToPDF({
      title: "Dossiê Disciplinar — Histórico de Ocorrências",
      headers: ["Colaborador", "Cargo", "Tipo", "Data", "Motivo CLT", "Status"],
      rows: filteredOc.map((o) => [
        o.colaborador_nome,
        o.cargo ?? "-",
        tipoLabel(o.tipo_ocorrencia),
        format(parseISO(o.data_ocorrencia), "dd/MM/yyyy"),
        o.motivo_clt,
        STATUS_ASSINATURA.find((s) => s.value === o.status_assinatura)?.label ?? o.status_assinatura,
      ]),
      fileName: "dossie-disciplinar",
    });
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      filteredOc.map((o) => ({
        Colaborador: o.colaborador_nome,
        Matrícula: o.colaborador_matricula ?? "",
        Cargo: o.cargo ?? "",
        Setor: o.setor ?? "",
        "Tipo Ocorrência": tipoLabel(o.tipo_ocorrencia),
        "Data Ocorrência": format(parseISO(o.data_ocorrencia), "dd/MM/yyyy"),
        "Motivo CLT": o.motivo_clt,
        "Status Assinatura": STATUS_ASSINATURA.find((s) => s.value === o.status_assinatura)?.label ?? o.status_assinatura,
        "Dias Suspensão": o.dias_suspensao ?? "",
        Descrição: o.descricao ?? "",
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ocorrências");
    XLSX.writeFile(wb, `ocorrencias-disciplinares_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  const exportCSV = () => {
    const rows = [
      ["Colaborador", "Matricula", "Cargo", "Tipo", "Data", "Motivo CLT", "Status"],
      ...filteredOc.map((o) => [
        o.colaborador_nome,
        o.colaborador_matricula ?? "",
        o.cargo ?? "",
        tipoLabel(o.tipo_ocorrencia),
        o.data_ocorrencia,
        o.motivo_clt,
        o.status_assinatura,
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "ocorrencias.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Alerta Crítico */}
      {alertaCritico.length > 0 && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-destructive text-sm">Alerta Crítico — Mais de 2 Ocorrências no Período</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {alertaCritico.map(([nome, count]) => (
                    <Badge key={nome} variant="destructive" className="text-xs">
                      {nome} — {count} ocorrências
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros + Ações */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar nome ou matrícula..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setOcPage(1); setMovPage(1); }}
              className="pl-9"
              maxLength={100}
            />
          </div>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Botão revelar dados sensíveis — apenas admin/rh_dp */}
          {isAdmin && (
            <Button
              variant={revealSensitive ? "default" : "outline"}
              size="sm"
              className="gap-2"
              onClick={() => setRevealSensitive((v) => !v)}
              title="Revelar dados sensíveis (matrícula, motivo)"
            >
              {revealSensitive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {revealSensitive ? "Ocultar dados" : "Revelar dados"}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setShowTransferModal(true)} className="gap-2">
            <ArrowRightLeft className="h-4 w-4" />
            + Transferir Setor
          </Button>
          <Button size="sm" onClick={() => setShowOcorrenciaModal(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            + Lançar Ocorrência
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                Exportar Relatório
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={exportPDF} className="gap-2">
                <FileText className="h-4 w-4 text-destructive" />
                PDF — Dossiê do Colaborador
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportExcel} className="gap-2">
                <FileSpreadsheet className="h-4 w-4 text-primary" />
                Excel — Gerencial
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportCSV} className="gap-2">
                <Download className="h-4 w-4 text-accent-foreground" />
                CSV — Integração Folha
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="ocorrencias">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="ocorrencias" className="gap-2">
            <ShieldAlert className="h-4 w-4" />
            Advertências e Ocorrências
            {filteredOc.length > 0 && (
              <Badge variant="secondary" className="ml-1">{filteredOc.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="movimentacoes" className="gap-2">
            <ArrowRightLeft className="h-4 w-4" />
            Movimentações de Setor
            {filteredMov.length > 0 && (
              <Badge variant="secondary" className="ml-1">{filteredMov.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tab: Ocorrências */}
        <TabsContent value="ocorrencias" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Tabela Disciplinar</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Colaborador</TableHead>
                      <TableHead>Cargo / Setor</TableHead>
                      <TableHead>Tipo de Ocorrência</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Motivo CLT</TableHead>
                      <TableHead>Status Assinatura</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingOc ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Carregando...
                        </TableCell>
                      </TableRow>
                    ) : paginatedOc.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Nenhuma ocorrência registrada no período.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedOc.map((o) => {
                        const isCritico = (ocorrenciasPorColaborador[o.colaborador_nome] ?? 0) > 2;
                        return (
                          <TableRow
                            key={o.id}
                            className={isCritico ? "bg-destructive/5 border-l-4 border-l-destructive" : ""}
                          >
                            <TableCell>
                              <div className="font-medium uppercase">{o.colaborador_nome}</div>
                              {o.colaborador_matricula && (
                                <div className="text-xs text-muted-foreground font-mono">
                                  Mat: {maskMatricula(o.colaborador_matricula, revealSensitive)}
                                </div>
                              )}
                              {isCritico && (
                                <Badge variant="destructive" className="text-xs mt-1">Crítico</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div>{o.cargo ?? "-"}</div>
                              {o.setor && <div className="text-xs text-muted-foreground">{o.setor}</div>}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{tipoLabel(o.tipo_ocorrencia)}{o.tipo_ocorrencia === "suspensao" && o.dias_suspensao ? ` (${o.dias_suspensao}d)` : ""}</Badge>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {format(parseISO(o.data_ocorrencia), "dd/MM/yyyy")}
                            </TableCell>
                            <TableCell>
                              <span className="font-mono text-sm">
                                {maskSensitiveText(o.motivo_clt, revealSensitive, 12)}
                              </span>
                            </TableCell>
                            <TableCell>{statusBadge(o.status_assinatura)}</TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
              {/* Paginação Ocorrências */}
              {totalOcPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                  <span className="text-xs text-muted-foreground">
                    Pág. {ocPage} de {totalOcPages} — {filteredOc.length} registros
                  </span>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" disabled={ocPage <= 1} onClick={() => setOcPage((p) => p - 1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" disabled={ocPage >= totalOcPages} onClick={() => setOcPage((p) => p + 1)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Movimentações */}
        <TabsContent value="movimentacoes" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Relatório de Movimentação de Setores</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Colaborador</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Setor Anterior</TableHead>
                      <TableHead>Novo Setor</TableHead>
                      <TableHead>Data da Mudança</TableHead>
                      <TableHead>Motivo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingMov ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell>
                      </TableRow>
                    ) : paginatedMov.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Nenhuma movimentação registrada no período.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedMov.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell>
                            <div className="font-medium uppercase">{m.colaborador_nome}</div>
                            {m.colaborador_matricula && (
                              <div className="text-xs text-muted-foreground font-mono">
                                Mat: {maskMatricula(m.colaborador_matricula, revealSensitive)}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>{m.cargo}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-muted/50">{m.setor_anterior}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                              {m.setor_novo}
                            </Badge>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {format(parseISO(m.data_mudanca), "dd/MM/yyyy")}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                            {maskSensitiveText(m.motivo ?? undefined, revealSensitive, 20)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {/* Paginação Movimentações */}
              {totalMovPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                  <span className="text-xs text-muted-foreground">
                    Pág. {movPage} de {totalMovPages} — {filteredMov.length} registros
                  </span>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" disabled={movPage <= 1} onClick={() => setMovPage((p) => p - 1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" disabled={movPage >= totalMovPages} onClick={() => setMovPage((p) => p + 1)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal: Transferir Setor */}
      <Dialog open={showTransferModal} onOpenChange={setShowTransferModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-primary" />
              Registrar Transferência de Setor
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1">
              <Label>Colaborador *</Label>
              <div className="relative">
                <Input
                  value={transferForm.colaborador_nome || transColabSearch}
                  onChange={(e) => {
                    setTransColabSearch(e.target.value);
                    setTransferForm((f) => ({ ...f, colaborador_nome: "", colaborador_matricula: "", cargo: "", setor_anterior: "" }));
                  }}
                  placeholder="Buscar colaborador..."
                />
                {filteredColabForTrans.length > 0 && !transferForm.colaborador_nome && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {filteredColabForTrans.map((c) => (
                      <button
                        key={c.user_id}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                        onClick={() => {
                          setTransferForm((f) => ({
                            ...f,
                            colaborador_nome: c.full_name || "",
                            cargo: c.cargo || "",
                            setor_anterior: c.setor || "",
                          }));
                          setTransColabSearch("");
                        }}
                      >
                        <span className="font-medium">{c.full_name}</span>
                        {c.cargo && <span className="text-xs text-muted-foreground ml-2">— {c.cargo}</span>}
                        {c.setor && <span className="text-xs text-muted-foreground ml-1">({c.setor})</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {transferForm.colaborador_nome && (
                <p className="text-xs text-muted-foreground mt-1">
                  ✓ {transferForm.colaborador_nome} {transferForm.cargo && `— ${transferForm.cargo}`}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Cargo *</Label>
              <Select value={transferForm.cargo} onValueChange={(v) => setTransferForm((f) => ({ ...f, cargo: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {CARGOS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Setor de Origem *</Label>
                <Select value={transferForm.setor_anterior} onValueChange={(v) => setTransferForm((f) => ({ ...f, setor_anterior: v }))}>
                  <SelectTrigger><SelectValue placeholder="Setor atual..." /></SelectTrigger>
                  <SelectContent>
                    {setoresData.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Setor de Destino *</Label>
                <Select value={transferForm.setor_novo} onValueChange={(v) => setTransferForm((f) => ({ ...f, setor_novo: v }))}>
                  <SelectTrigger><SelectValue placeholder="Novo setor..." /></SelectTrigger>
                  <SelectContent>
                    {setoresData.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Data da Mudança *</Label>
              <Input type="date" value={transferForm.data_mudanca} onChange={(e) => setTransferForm((f) => ({ ...f, data_mudanca: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Motivo</Label>
              <Input
                value={transferForm.motivo}
                onChange={(e) => setTransferForm((f) => ({ ...f, motivo: e.target.value }))}
                placeholder="Ex: Necessidade operacional, pedido do colaborador..."
              />
            </div>
            <div className="space-y-1">
              <Label>Observações</Label>
              <Textarea
                value={transferForm.observacoes}
                onChange={(e) => setTransferForm((f) => ({ ...f, observacoes: e.target.value }))}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransferModal(false)}>Cancelar</Button>
            <Button
              onClick={() => insertTransfer.mutate(transferForm)}
              disabled={insertTransfer.isPending || !transferForm.colaborador_nome || !transferForm.cargo || !transferForm.setor_anterior || !transferForm.setor_novo}
            >
              {insertTransfer.isPending ? "Salvando..." : "Registrar Transferência"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Lançar Ocorrência */}
      <Dialog open={showOcorrenciaModal} onOpenChange={setShowOcorrenciaModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              Lançar Ocorrência Disciplinar
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1">
              <Label>Colaborador *</Label>
              <div className="relative">
                <Input
                  value={ocorrenciaForm.colaborador_nome || ocColabSearch}
                  onChange={(e) => {
                    setOcColabSearch(e.target.value);
                    setOcorrenciaForm((f) => ({ ...f, colaborador_nome: "", colaborador_matricula: "", cargo: "", setor: "" }));
                  }}
                  placeholder="Buscar colaborador..."
                />
                {filteredColabForOc.length > 0 && !ocorrenciaForm.colaborador_nome && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {filteredColabForOc.map((c) => (
                      <button
                        key={c.user_id}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                        onClick={() => {
                          setOcorrenciaForm((f) => ({
                            ...f,
                            colaborador_nome: c.full_name || "",
                            cargo: c.cargo || "",
                            setor: c.setor || "",
                          }));
                          setOcColabSearch("");
                        }}
                      >
                        <span className="font-medium">{c.full_name}</span>
                        {c.cargo && <span className="text-xs text-muted-foreground ml-2">— {c.cargo}</span>}
                        {c.setor && <span className="text-xs text-muted-foreground ml-1">({c.setor})</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {ocorrenciaForm.colaborador_nome && (
                <p className="text-xs text-muted-foreground mt-1">
                  ✓ {ocorrenciaForm.colaborador_nome} {ocorrenciaForm.cargo && `— ${ocorrenciaForm.cargo}`} {ocorrenciaForm.setor && `(${ocorrenciaForm.setor})`}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Cargo</Label>
                <Select value={ocorrenciaForm.cargo} onValueChange={(v) => setOcorrenciaForm((f) => ({ ...f, cargo: v }))}>
                  <SelectTrigger><SelectValue placeholder="Cargo..." /></SelectTrigger>
                  <SelectContent>
                    {CARGOS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Setor</Label>
                <Select value={ocorrenciaForm.setor} onValueChange={(v) => setOcorrenciaForm((f) => ({ ...f, setor: v }))}>
                  <SelectTrigger><SelectValue placeholder="Setor..." /></SelectTrigger>
                  <SelectContent>
                    {setoresData.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Tipo de Ocorrência *</Label>
              <Select value={ocorrenciaForm.tipo_ocorrencia} onValueChange={(v) => setOcorrenciaForm((f) => ({ ...f, tipo_ocorrencia: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {TIPOS_OCORRENCIA.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {ocorrenciaForm.tipo_ocorrencia === "suspensao" && (
              <div className="space-y-1">
                <Label>Dias de Suspensão *</Label>
                <Input
                  type="number" min={1}
                  value={ocorrenciaForm.dias_suspensao}
                  onChange={(e) => setOcorrenciaForm((f) => ({ ...f, dias_suspensao: e.target.value }))}
                  placeholder="Ex: 3"
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Data da Ocorrência *</Label>
                <Input type="date" value={ocorrenciaForm.data_ocorrencia} onChange={(e) => setOcorrenciaForm((f) => ({ ...f, data_ocorrencia: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Motivo CLT *</Label>
                <Select value={ocorrenciaForm.motivo_clt} onValueChange={(v) => setOcorrenciaForm((f) => ({ ...f, motivo_clt: v }))}>
                  <SelectTrigger><SelectValue placeholder="Motivo..." /></SelectTrigger>
                  <SelectContent>
                    {MOTIVOS_CLT.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Status de Assinatura *</Label>
              <Select value={ocorrenciaForm.status_assinatura} onValueChange={(v) => setOcorrenciaForm((f) => ({ ...f, status_assinatura: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_ASSINATURA.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {ocorrenciaForm.status_assinatura === "recusado_testemunhas" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Testemunha 1</Label>
                  <Input value={ocorrenciaForm.testemunha_1} onChange={(e) => setOcorrenciaForm((f) => ({ ...f, testemunha_1: e.target.value }))} placeholder="Nome" />
                </div>
                <div className="space-y-1">
                  <Label>Testemunha 2</Label>
                  <Input value={ocorrenciaForm.testemunha_2} onChange={(e) => setOcorrenciaForm((f) => ({ ...f, testemunha_2: e.target.value }))} placeholder="Nome" />
                </div>
              </div>
            )}
            <div className="space-y-1">
              <Label>Descrição / Relatório</Label>
              <Textarea
                value={ocorrenciaForm.descricao}
                onChange={(e) => setOcorrenciaForm((f) => ({ ...f, descricao: e.target.value }))}
                rows={3}
                placeholder="Descreva os fatos..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOcorrenciaModal(false)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => insertOcorrencia.mutate(ocorrenciaForm)}
              disabled={
                insertOcorrencia.isPending ||
                !ocorrenciaForm.colaborador_nome ||
                !ocorrenciaForm.tipo_ocorrencia ||
                !ocorrenciaForm.motivo_clt
              }
            >
              {insertOcorrencia.isPending ? "Salvando..." : "Lançar Ocorrência"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
