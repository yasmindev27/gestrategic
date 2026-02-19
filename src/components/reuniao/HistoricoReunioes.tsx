import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Download,
  FileText,
  Pencil,
  Trash2,
  Save,
  X,
  Video,
  RefreshCw,
  Loader2,
  Sparkles,
  Edit3,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { format, parseISO, isPast, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { createStandardPdf, savePdfWithFooter } from "@/lib/export-utils";
import { Document, Packer, Paragraph, TextRun, Table as DocxTable, TableRow as DocxTableRow, TableCell as DocxTableCell, WidthType, HeadingLevel } from "docx";
import { saveAs } from "file-saver";

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
  const { isAdmin } = useUserRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [editAtaReuniao, setEditAtaReuniao] = useState<any | null>(null);
  const [editAtaResumo, setEditAtaResumo] = useState("");
  const [editAtaDecisoes, setEditAtaDecisoes] = useState("");
  const [savingAta, setSavingAta] = useState(false);

  const openEditAta = (reuniao: any) => {
    const ata = typeof reuniao.ata_gerada === "string" ? JSON.parse(reuniao.ata_gerada) : reuniao.ata_gerada;
    setEditAtaResumo(ata?.resumo_executivo || "");
    setEditAtaDecisoes((ata?.decisoes_tomadas || []).join("\n"));
    setEditAtaReuniao(reuniao);
  };

  const saveEditAta = async () => {
    if (!editAtaReuniao) return;
    setSavingAta(true);
    try {
      const currentAta = typeof editAtaReuniao.ata_gerada === "string"
        ? JSON.parse(editAtaReuniao.ata_gerada)
        : editAtaReuniao.ata_gerada || {};
      const updatedAta = {
        ...currentAta,
        resumo_executivo: editAtaResumo,
        decisoes_tomadas: editAtaDecisoes.split("\n").filter((l: string) => l.trim()),
      };
      await supabase.from("reunioes").update({ ata_gerada: updatedAta } as any).eq("id", editAtaReuniao.id);
      queryClient.invalidateQueries({ queryKey: ["reunioes_historico"] });
      toast({ title: "Ata atualizada", description: "As alterações foram salvas." });
      setEditAtaReuniao(null);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message || "Falha ao salvar.", variant: "destructive" });
    } finally {
      setSavingAta(false);
    }
  };

  const regenerateAta = async (reuniao: any) => {
    if (!reuniao.transcricao?.trim()) {
      toast({ title: "Erro", description: "Sem transcrição disponível para gerar a ata.", variant: "destructive" });
      return;
    }
    setRegeneratingId(reuniao.id);
    try {
      const { data, error } = await supabase.functions.invoke("gerar-ata-reuniao", {
        body: { transcricao: reuniao.transcricao, titulo: reuniao.titulo, reuniaoId: reuniao.id },
      });
      if (error) throw error;
      if (data?.ata) {
        await supabase.from("reunioes").update({ ata_gerada: data.ata } as any).eq("id", reuniao.id);
        queryClient.invalidateQueries({ queryKey: ["reunioes_historico"] });
        toast({ title: "Ata regenerada", description: "A ata foi refeita com sucesso." });
      } else {
        throw new Error("Resposta sem ata");
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message || "Falha ao regenerar ata.", variant: "destructive" });
    } finally {
      setRegeneratingId(null);
    }
  };

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

  const handleEditSave = async (id: string) => {
    if (!editTitle.trim()) return;
    const { error } = await supabase.from("reunioes").update({ titulo: editTitle } as any).eq("id", id);
    if (error) {
      toast({ title: "Erro", description: "Falha ao atualizar título.", variant: "destructive" });
    } else {
      toast({ title: "Atualizado", description: "Título da reunião atualizado." });
      queryClient.invalidateQueries({ queryKey: ["reunioes_historico"] });
    }
    setEditingId(null);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("reunioes").delete().eq("id", deleteId);
    if (error) {
      toast({ title: "Erro", description: "Falha ao excluir reunião.", variant: "destructive" });
    } else {
      toast({ title: "Excluída", description: "Reunião removida com sucesso." });
      queryClient.invalidateQueries({ queryKey: ["reunioes_historico"] });
    }
    setDeleteId(null);
  };

  const formatTime = (iso: string | null) => {
    if (!iso) return "—";
    try {
      return format(parseISO(iso), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return "—";
    }
  };

  const exportAtaPdf = async (r: any) => {
    const ata = r.ata_gerada as AtaData | null;
    if (!ata) return;
    const { doc, logoImg } = await createStandardPdf(`Ata - ${r.titulo}`);
    let y = 35;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Encerramento: ${formatTime(r.hora_encerramento)}`, 14, y); y += 8;

    if (ata.resumo_executivo) {
      doc.setFontSize(12); doc.setFont("helvetica", "bold");
      doc.text("Resumo Executivo", 14, y); y += 7;
      doc.setFontSize(9); doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(ata.resumo_executivo, 180);
      doc.text(lines, 14, y); y += lines.length * 4.5 + 8;
    }

    if (ata.decisoes_tomadas?.length) {
      doc.setFontSize(12); doc.setFont("helvetica", "bold");
      doc.text("Decisões Tomadas", 14, y); y += 7;
      doc.setFontSize(9); doc.setFont("helvetica", "normal");
      ata.decisoes_tomadas.forEach((d, i) => {
        const lines = doc.splitTextToSize(`${i + 1}. ${d}`, 175);
        doc.text(lines, 16, y); y += lines.length * 4.5 + 2;
      });
      y += 6;
    }

    if (ata.plano_acao?.length) {
      doc.setFontSize(12); doc.setFont("helvetica", "bold");
      doc.text("Plano de Ação", 14, y); y += 7;
      doc.setFontSize(9); doc.setFont("helvetica", "normal");
      ata.plano_acao.forEach((item, i) => {
        const text = `${i + 1}. ${item.tarefa} — Responsável: ${item.responsavel} | Prazo: ${item.prazo}`;
        const lines = doc.splitTextToSize(text, 175);
        doc.text(lines, 16, y); y += lines.length * 4.5 + 2;
      });
    }

    savePdfWithFooter(doc, `Ata - ${r.titulo}`, `ata_${r.id.slice(0, 8)}`, logoImg);
  };

  const exportAtaWord = async (r: any) => {
    const ata = r.ata_gerada as AtaData | null;
    if (!ata) return;

    const children: any[] = [
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: `Ata - ${r.titulo}`, bold: true })] }),
      new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: `Encerramento: ${formatTime(r.hora_encerramento)}`, size: 20 })] }),
    ];

    if (ata.resumo_executivo) {
      children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "Resumo Executivo", bold: true })] }));
      children.push(new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: ata.resumo_executivo, size: 22 })] }));
    }

    if (ata.decisoes_tomadas?.length) {
      children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "Decisões Tomadas", bold: true })] }));
      ata.decisoes_tomadas.forEach((d, i) => {
        children.push(new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: `${i + 1}. ${d}`, size: 22 })] }));
      });
    }

    if (ata.plano_acao?.length) {
      children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 200 }, children: [new TextRun({ text: "Plano de Ação", bold: true })] }));
      children.push(new DocxTable({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new DocxTableRow({
            children: ["#", "Tarefa", "Responsável", "Prazo"].map(h =>
              new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 20 })] })] })
            ),
          }),
          ...ata.plano_acao.map((item, i) =>
            new DocxTableRow({
              children: [
                new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(i + 1), size: 20 })] })] }),
                new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.tarefa, size: 20 })] })] }),
                new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.responsavel, size: 20 })] })] }),
                new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.prazo, size: 20 })] })] }),
              ],
            })
          ),
        ],
      }));
    }

    children.push(new Paragraph({ spacing: { before: 400 }, children: [new TextRun({ text: "Documento gerado em conformidade com a LGPD (Lei nº 13.709/2018).", size: 14, color: "888888", italics: true })] }));

    const docx = new Document({ sections: [{ properties: {}, children }] });
    const blob = await Packer.toBlob(docx);
    saveAs(blob, `ata_${r.id.slice(0, 8)}.docx`);
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
                          <div className="min-w-0 flex-1">
                            {editingId === r.id ? (
                              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                <Input
                                  value={editTitle}
                                  onChange={(e) => setEditTitle(e.target.value)}
                                  onKeyDown={(e) => e.key === "Enter" && handleEditSave(r.id)}
                                  className="h-7 text-sm"
                                  autoFocus
                                />
                                <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => handleEditSave(r.id)}>
                                  <Save className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => setEditingId(null)}>
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ) : (
                              <h3 className="font-medium text-foreground truncate">
                                {r.titulo}
                              </h3>
                            )}
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                              <Clock className="h-3 w-3" />
                              {formatTime(r.hora_encerramento || r.created_at)}
                            </div>
                          </div>
                          {isAdmin && editingId !== r.id && (
                            <div className="flex gap-1 flex-shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingId(r.id); setEditTitle(r.titulo || ""); }}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(r.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
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
                      {(r.ata_gerada || r.gravacao_url || r.transcricao) && (
                        <div className="flex gap-2 mt-4 pt-3 border-t">
                          {r.ata_gerada && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" onClick={(e) => e.stopPropagation()}>
                                  <Download className="h-4 w-4 mr-2" /> Baixar Ata
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start">
                                <DropdownMenuItem onClick={() => exportAtaPdf(r)}>
                                  <FileText className="h-4 w-4 mr-2 text-red-500" /> PDF
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => exportAtaWord(r)}>
                                  <FileText className="h-4 w-4 mr-2 text-blue-500" /> Word (.docx)
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                          {r.gravacao_url && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async (e) => {
                                e.stopPropagation();
                                const { data, error } = await supabase.storage
                                  .from("reunioes")
                                  .createSignedUrl(r.gravacao_url, 3600);
                                if (data?.signedUrl) {
                                  window.open(data.signedUrl, "_blank");
                                } else {
                                  toast({ title: "Erro", description: "Não foi possível acessar a gravação.", variant: "destructive" });
                                  console.error("Erro ao gerar URL da gravação:", error);
                                }
                              }}
                            >
                              <Video className="h-4 w-4 mr-2" /> Ver Gravação
                            </Button>
                          )}
                          {(r.ata_gerada || r.transcricao) && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" disabled={regeneratingId === r.id} onClick={(e) => e.stopPropagation()}>
                                  {regeneratingId === r.id ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  ) : (
                                    <Pencil className="h-4 w-4 mr-2" />
                                  )}
                                  {regeneratingId === r.id ? "Gerando..." : "Editar Ata"}
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start">
                                {r.transcricao && (
                                  <DropdownMenuItem onClick={() => regenerateAta(r)}>
                                    <Sparkles className="h-4 w-4 mr-2" /> Refazer com IA
                                  </DropdownMenuItem>
                                )}
                                {r.ata_gerada && (
                                  <DropdownMenuItem onClick={() => openEditAta(r)}>
                                    <Edit3 className="h-4 w-4 mr-2" /> Editar existente
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      )}
      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir reunião?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. A reunião e sua ata serão permanentemente removidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Ata Dialog */}
      <Dialog open={!!editAtaReuniao} onOpenChange={() => setEditAtaReuniao(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Ata</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Resumo Executivo</label>
              <Textarea
                value={editAtaResumo}
                onChange={(e) => setEditAtaResumo(e.target.value)}
                rows={6}
                placeholder="Resumo da reunião..."
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Decisões Tomadas (uma por linha)</label>
              <Textarea
                value={editAtaDecisoes}
                onChange={(e) => setEditAtaDecisoes(e.target.value)}
                rows={5}
                placeholder="Uma decisão por linha..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditAtaReuniao(null)}>Cancelar</Button>
            <Button onClick={saveEditAta} disabled={savingAta}>
              {savingAta ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HistoricoReunioes;
