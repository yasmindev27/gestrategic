import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, ArrowRightLeft, AlertTriangle, Search, CheckCircle2, Sun, Moon } from "lucide-react";

interface PassagemRecord {
  id: string;
  shift_date: string;
  shift_type: string;
  colaborador_saida_nome: string;
  data_hora_conclusao: string;
  colaborador_entrada_nome: string | null;
  data_hora_assuncao: string | null;
  tempo_troca_minutos: number | null;
  justificativa: string | null;
  pendencias: string | null;
  pendencias_encontradas: string | null;
  pendencias_resolvidas: string | null;
}

function countPendencias(text: string | null): number {
  if (!text || !text.trim()) return 0;
  const lines = text.split('\n').filter(l => l.trim().length > 0);
  return Math.max(lines.length, 1);
}

function parsePendencias(text: string | null): string[] {
  if (!text || !text.trim()) return [];
  return text.split('\n').filter(l => l.trim().length > 0).map(l => l.trim());
}

type PendenciaType = "recebidas" | "encontradas" | "resolvidas";

const PENDENCIA_CONFIG: Record<PendenciaType, { label: string; field: keyof PassagemRecord; colorClass: string; icon: typeof AlertTriangle }> = {
  recebidas: { label: "Pendências Recebidas", field: "pendencias", colorClass: "text-amber-600 bg-amber-100", icon: AlertTriangle },
  encontradas: { label: "Pendências Encontradas", field: "pendencias_encontradas", colorClass: "text-blue-600 bg-blue-100", icon: Search },
  resolvidas: { label: "Pendências Resolvidas", field: "pendencias_resolvidas", colorClass: "text-green-600 bg-green-100", icon: CheckCircle2 },
};

export function PassagemPlantaoReport() {
  const [records, setRecords] = useState<PassagemRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [detailDialog, setDetailDialog] = useState<{ open: boolean; type: PendenciaType }>({ open: false, type: "recebidas" });

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("passagem_plantao")
      .select("*")
      .order("data_hora_conclusao", { ascending: false })
      .limit(100);

    if (!error && data) {
      setRecords(data as PassagemRecord[]);
    }
    setIsLoading(false);
  };

  const filtered = records.filter((r) => {
    if (dataInicio && r.shift_date < dataInicio) return false;
    if (dataFim && r.shift_date > dataFim) return false;
    return true;
  });

  const formatDateTime = (dt: string | null) => {
    if (!dt) return "—";
    try {
      return format(new Date(dt), "dd/MM/yyyy HH:mm", { locale: ptBR });
    } catch {
      return "—";
    }
  };

  const formatTempo = (minutos: number | null) => {
    if (minutos === null || minutos === undefined) return "Pendente";
    if (minutos < 60) return `${Math.round(minutos)} min`;
    const h = Math.floor(minutos / 60);
    const m = Math.round(minutos % 60);
    return `${h}h ${m}min`;
  };

  const totalRecebidas = filtered.reduce((sum, r) => sum + countPendencias(r.pendencias), 0);
  const totalEncontradas = filtered.reduce((sum, r) => sum + countPendencias(r.pendencias_encontradas), 0);
  const totalResolvidas = filtered.reduce((sum, r) => sum + countPendencias(r.pendencias_resolvidas), 0);

  const openDetail = (type: PendenciaType) => {
    setDetailDialog({ open: true, type });
  };

  const getDetailData = (type: PendenciaType) => {
    const config = PENDENCIA_CONFIG[type];
    return filtered
      .filter((r) => countPendencias(r[config.field] as string | null) > 0)
      .map((r) => ({
        id: r.id,
        date: r.shift_date,
        shiftType: r.shift_type,
        colaborador: r.colaborador_saida_nome,
        items: parsePendencias(r[config.field] as string | null),
      }));
  };

  const currentConfig = PENDENCIA_CONFIG[detailDialog.type];
  const detailData = detailDialog.open ? getDetailData(detailDialog.type) : [];

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
          <ArrowRightLeft className="h-5 w-5 text-primary" />
          Filtros
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <Label>Data Início</Label>
            <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Data Fim</Label>
            <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
          </div>
        </div>
      </div>

      {/* KPI Cards de Pendências - Clicáveis */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          className="bg-card border border-border rounded-lg p-5 flex items-center gap-4 cursor-pointer hover:border-amber-400 hover:shadow-md transition-all"
          onClick={() => openDetail("recebidas")}
          title="Clique para ver detalhes"
        >
          <div className="p-3 rounded-full bg-amber-100">
            <AlertTriangle className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Pendências Recebidas</p>
            <p className="text-2xl font-bold text-foreground">{totalRecebidas}</p>
            <p className="text-xs text-muted-foreground">Repassadas pelo regulador anterior</p>
          </div>
        </div>

        <div
          className="bg-card border border-border rounded-lg p-5 flex items-center gap-4 cursor-pointer hover:border-blue-400 hover:shadow-md transition-all"
          onClick={() => openDetail("encontradas")}
          title="Clique para ver detalhes"
        >
          <div className="p-3 rounded-full bg-blue-100">
            <Search className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Pendências Encontradas</p>
            <p className="text-2xl font-bold text-foreground">{totalEncontradas}</p>
            <p className="text-xs text-muted-foreground">Identificadas ao assumir o plantão</p>
          </div>
        </div>

        <div
          className="bg-card border border-border rounded-lg p-5 flex items-center gap-4 cursor-pointer hover:border-green-400 hover:shadow-md transition-all"
          onClick={() => openDetail("resolvidas")}
          title="Clique para ver detalhes"
        >
          <div className="p-3 rounded-full bg-green-100">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Pendências Resolvidas</p>
            <p className="text-2xl font-bold text-foreground">{totalResolvidas}</p>
            <p className="text-xs text-muted-foreground">Solucionadas durante o plantão</p>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
          <Clock className="h-5 w-5 text-primary" />
          Passagens de Plantão
        </h2>

        {isLoading ? (
          <p className="text-muted-foreground text-center py-8">Carregando...</p>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Nenhuma passagem de plantão registrada para o período selecionado.
          </p>
        ) : (
          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Plantão</TableHead>
                  <TableHead>Saiu</TableHead>
                  <TableHead>Conclusão</TableHead>
                  <TableHead>Assumiu</TableHead>
                  <TableHead>Assunção</TableHead>
                  <TableHead>Tempo Troca</TableHead>
                  <TableHead className="text-center">Recebidas</TableHead>
                  <TableHead className="text-center">Encontradas</TableHead>
                  <TableHead className="text-center">Resolvidas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => {
                  const recebidas = countPendencias(r.pendencias);
                  const encontradas = countPendencias(r.pendencias_encontradas);
                  const resolvidas = countPendencias(r.pendencias_resolvidas);

                  return (
                    <TableRow key={r.id}>
                      <TableCell>{r.shift_date ? format(new Date(r.shift_date + "T12:00:00"), "dd/MM/yyyy") : "—"}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          r.shift_type === "diurno" ? "bg-amber-100 text-amber-800" : "bg-indigo-100 text-indigo-800"
                        }`}>
                          {r.shift_type === "diurno" ? <Sun className="h-3 w-3" /> : <Moon className="h-3 w-3" />}
                          {r.shift_type === "diurno" ? "Diurno" : "Noturno"}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">{r.colaborador_saida_nome}</TableCell>
                      <TableCell>{formatDateTime(r.data_hora_conclusao)}</TableCell>
                      <TableCell className="font-medium">{r.colaborador_entrada_nome || "—"}</TableCell>
                      <TableCell>{formatDateTime(r.data_hora_assuncao)}</TableCell>
                      <TableCell>
                        <span className={`font-medium ${
                          r.tempo_troca_minutos !== null && r.tempo_troca_minutos > 30
                            ? "text-destructive"
                            : r.tempo_troca_minutos !== null
                              ? "text-green-600"
                              : "text-muted-foreground"
                        }`}>
                          {formatTempo(r.tempo_troca_minutos)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {recebidas > 0 ? (
                          <span className="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 cursor-pointer hover:bg-amber-200 transition-colors" title={r.pendencias || ''}>
                            {recebidas}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {encontradas > 0 ? (
                          <span className="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 cursor-pointer hover:bg-blue-200 transition-colors" title={r.pendencias_encontradas || ''}>
                            {encontradas}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {resolvidas > 0 ? (
                          <span className="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800 cursor-pointer hover:bg-green-200 transition-colors" title={r.pendencias_resolvidas || ''}>
                            {resolvidas}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">0</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Dialog de detalhes de pendências */}
      <Dialog open={detailDialog.open} onOpenChange={(open) => setDetailDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <currentConfig.icon className={`h-5 w-5 ${currentConfig.colorClass.split(' ')[0]}`} />
              {currentConfig.label}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {detailData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhuma pendência registrada no período.</p>
            ) : (
              <div className="space-y-4">
                {detailData.map((entry) => (
                  <div key={entry.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {format(new Date(entry.date + "T12:00:00"), "dd/MM/yyyy")}
                        </Badge>
                        <Badge variant="secondary" className="text-xs gap-1">
                          {entry.shiftType === "diurno" ? <Sun className="h-3 w-3" /> : <Moon className="h-3 w-3" />}
                          {entry.shiftType === "diurno" ? "Diurno" : "Noturno"}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">{entry.colaborador}</span>
                    </div>
                    <ul className="space-y-1 pl-1">
                      {entry.items.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${currentConfig.colorClass.split(' ')[1]}`} />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
