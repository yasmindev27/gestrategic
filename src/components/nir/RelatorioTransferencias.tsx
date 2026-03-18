import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInDays, differenceInHours } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, Search, ArrowRightLeft, Clock, Building2 } from "lucide-react";
import { ExportDropdown } from "@/components/ui/export-dropdown";
import { createStandardPdf, applyPdfHeaderFooter } from "@/lib/export-utils";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast";

interface TransferenciaRecord {
  id: string;
  patient_name: string;
  sector: string;
  data_internacao: string | null;
  data_alta: string | null;
  created_at: string;
  estabelecimento_transferencia: string | null;
  hipotese_diagnostica: string | null;
  shift_date: string;
}

const getSectorLabel = (sector: string) => {
  const map: Record<string, string> = {
    "enfermaria-masculina": "Enf. Masculina",
    "enfermaria-feminina": "Enf. Feminina",
    pediatria: "Pediatria",
    isolamento: "Isolamento",
    urgencia: "Urgência",
  };
  return map[sector] || sector;
};

const calcPermanencia = (record: TransferenciaRecord) => {
  const entrada = record.created_at ? new Date(record.created_at) : record.data_internacao ? new Date(record.data_internacao) : null;
  const saida = record.data_alta ? new Date(record.data_alta) : null;
  if (!entrada || !saida) return "—";

  const dias = differenceInDays(saida, entrada);
  const horas = differenceInHours(saida, entrada) % 24;

  if (dias === 0) return `${horas}h`;
  return `${dias}d ${horas}h`;
};

export const RelatorioTransferencias = () => {
  const { toast } = useToast();
  const [records, setRecords] = useState<TransferenciaRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("bed_records")
        .select("id, patient_name, sector, data_internacao, data_alta, created_at, estabelecimento_transferencia, hipotese_diagnostica, shift_date")
        .eq("motivo_alta", "transferencia")
        .gte("shift_date", dateFrom)
        .lte("shift_date", dateTo)
        .not("patient_name", "is", null)
        .order("data_alta", { ascending: false });

      if (error) throw error;
      setRecords((data || []) as TransferenciaRecord[]);
    } catch (err) {
      console.error("Erro ao carregar transferências:", err);
    } finally {
      setIsLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = records.filter(
    (r) =>
      !search ||
      r.patient_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.estabelecimento_transferencia?.toLowerCase().includes(search.toLowerCase()) ||
      getSectorLabel(r.sector).toLowerCase().includes(search.toLowerCase())
  );

  const exportRows = filtered.map((r) => ({
    paciente: r.patient_name || "—",
    setor: getSectorLabel(r.sector),
    diagnostico: r.hipotese_diagnostica || "—",
    internacao: r.data_internacao ? format(new Date(r.data_internacao), "dd/MM/yyyy") : "—",
    alta: r.data_alta ? format(new Date(r.data_alta), "dd/MM/yyyy") : "—",
    permanencia: calcPermanencia(r),
    destino: r.estabelecimento_transferencia || "Não informado",
  }));

  const handleExportPdf = async () => {
    const { doc, logoImg } = await createStandardPdf("Relatório de Transferências por Alta");
    let y = 34;

    doc.setFontSize(9);
    doc.text(`Período: ${format(new Date(dateFrom), "dd/MM/yyyy")} a ${format(new Date(dateTo), "dd/MM/yyyy")}  |  Total: ${filtered.length}`, 14, y);
    y += 8;

    autoTable(doc, {
      startY: y,
      head: [["Paciente", "Setor", "Diagnóstico", "Internação", "Alta", "Permanência", "Destino"]],
      body: exportRows.map((r) => [r.paciente, r.setor, r.diagnostico, r.internacao, r.alta, r.permanencia, r.destino]),
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [45, 125, 210], textColor: 255, fontStyle: "bold" },
      margin: { left: 14, right: 14, top: 32, bottom: 30 },
    });

    applyPdfHeaderFooter(doc, "Relatório de Transferências por Alta", logoImg);
    doc.save(`relatorio-transferencias_${format(new Date(), "yyyy-MM-dd")}.pdf`);
    toast({ title: "PDF exportado com sucesso!" });
  };

  const handleExportExcel = () => {
    const rows = exportRows.map((r) => ({
      Paciente: r.paciente,
      Setor: r.setor,
      "Hipótese Diagnóstica": r.diagnostico,
      "Data Internação": r.internacao,
      "Data Alta": r.alta,
      "Tempo Permanência": r.permanencia,
      Destino: r.destino,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transferências");
    XLSX.writeFile(wb, `relatorio-transferencias_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    toast({ title: "Excel exportado com sucesso!" });
  };

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-full">
              <ArrowRightLeft className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{filtered.length}</p>
              <p className="text-xs text-muted-foreground">Total de Transferências</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-full">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {(() => {
                  if (filtered.length === 0) return "—";
                  const totalHoras = filtered.reduce((sum, r) => {
                    const entrada = r.created_at ? new Date(r.created_at) : r.data_internacao ? new Date(r.data_internacao) : null;
                    const saida = r.data_alta ? new Date(r.data_alta) : null;
                    if (!entrada || !saida) return sum;
                    return sum + differenceInHours(saida, entrada);
                  }, 0);
                  const media = Math.round(totalHoras / filtered.length);
                  const dias = Math.floor(media / 24);
                  const horas = media % 24;
                  return dias > 0 ? `${dias}d ${horas}h` : `${horas}h`;
                })()}
              </p>
              <p className="text-xs text-muted-foreground">Permanência Média</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-full">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {new Set(filtered.map((r) => r.estabelecimento_transferencia).filter(Boolean)).size}
              </p>
              <p className="text-xs text-muted-foreground">Destinos Distintos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4 text-primary" />
              Pacientes Transferidos
            </CardTitle>
            <ExportDropdown onExportPDF={handleExportPdf} onExportExcel={handleExportExcel} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Label className="text-xs whitespace-nowrap">De:</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-8 w-36 text-xs" />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs whitespace-nowrap">Até:</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-8 w-36 text-xs" />
            </div>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar paciente, destino ou setor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-8 text-xs"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma transferência encontrada no período.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Setor</TableHead>
                    <TableHead>Hipótese Diagnóstica</TableHead>
                    <TableHead>Internação</TableHead>
                    <TableHead>Alta</TableHead>
                    <TableHead>Permanência</TableHead>
                    <TableHead>Destino</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.patient_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{getSectorLabel(r.sector)}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate text-sm text-muted-foreground">
                        {r.hipotese_diagnostica || "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {r.data_internacao ? format(new Date(r.data_internacao), "dd/MM/yyyy") : "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {r.data_alta ? format(new Date(r.data_alta), "dd/MM/yyyy") : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-mono text-xs">
                          {calcPermanencia(r)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        {r.estabelecimento_transferencia || <span className="text-muted-foreground italic">Não informado</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
