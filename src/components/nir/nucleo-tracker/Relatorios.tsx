import { useState, useMemo } from "react";
import { RegistroProducao, Colaborador, ATIVIDADES } from "./types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileDown, BarChart3, Users, User } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";

interface Props {
  registros: RegistroProducao[];
  colaboradores: Colaborador[];
}

export function Relatorios({ registros, colaboradores }: Props) {
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [selectedColab, setSelectedColab] = useState("todos");

  const filtered = useMemo(() => {
    return registros.filter((r) => {
      if (selectedColab !== "todos" && r.colaborador !== selectedColab) return false;
      if (dataInicio && r.data < dataInicio) return false;
      if (dataFim && r.data > dataFim) return false;
      return true;
    });
  }, [registros, selectedColab, dataInicio, dataFim]);

  const resumoPorColaborador = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    filtered.forEach((r) => {
      if (!map[r.colaborador]) map[r.colaborador] = {};
      map[r.colaborador][r.atividade] = (map[r.colaborador][r.atividade] || 0) + r.quantidade;
    });
    return Object.entries(map).map(([nome, atividades]) => ({
      nome,
      atividades,
      total: Object.values(atividades).reduce((a, b) => a + b, 0),
    })).sort((a, b) => b.total - a.total);
  }, [filtered]);

  const totalGeral = resumoPorColaborador.reduce((s, c) => s + c.total, 0);

  const COLORS = [
    "hsl(var(--primary))",
    "hsl(160 45% 40%)",
    "hsl(210, 80%, 55%)",
    "hsl(30, 85%, 55%)",
    "hsl(340, 70%, 55%)",
    "hsl(160, 60%, 45%)",
    "hsl(270, 60%, 55%)",
    "hsl(50, 80%, 50%)",
  ];

  const chartDataColaboradores = useMemo(() => {
    return resumoPorColaborador.map((c) => ({
      nome: c.nome.split(" ")[0],
      ...ATIVIDADES.reduce((acc, a) => ({ ...acc, [a]: c.atividades[a] || 0 }), {}),
      total: c.total,
    }));
  }, [resumoPorColaborador]);

  const chartDataAtividades = useMemo(() => {
    return ATIVIDADES.map((a) => ({
      name: a.split(" ")[0],
      fullName: a,
      value: resumoPorColaborador.reduce((s, c) => s + (c.atividades[a] || 0), 0),
    })).filter((d) => d.value > 0);
  }, [resumoPorColaborador]);

  const chartDataRadar = useMemo(() => {
    return ATIVIDADES.map((a) => {
      const entry: Record<string, any> = { atividade: a.split(" ")[0] };
      resumoPorColaborador.forEach((c) => {
        entry[c.nome.split(" ")[0]] = c.atividades[a] || 0;
      });
      return entry;
    });
  }, [resumoPorColaborador]);

  const periodoLabel = () => {
    if (dataInicio && dataFim) return `${formatDate(dataInicio)} a ${formatDate(dataFim)}`;
    if (dataInicio) return `A partir de ${formatDate(dataInicio)}`;
    if (dataFim) return `Até ${formatDate(dataFim)}`;
    return "Todo o período";
  };

  const formatDate = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("pt-BR");

  const exportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("NIR — Relatório de Tarefas", pageWidth / 2, 20, { align: "center" });

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Período: ${periodoLabel()}`, pageWidth / 2, 28, { align: "center" });
    doc.text(`Colaborador: ${selectedColab === "todos" ? "Todos" : selectedColab}`, pageWidth / 2, 34, { align: "center" });
    doc.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}`, pageWidth / 2, 40, { align: "center" });

    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Resumo por Colaborador", 14, 52);

    const summaryRows = resumoPorColaborador.map((c) => [
      c.nome,
      ...ATIVIDADES.map((a) => String(c.atividades[a] || 0)),
      String(c.total),
    ]);

    summaryRows.push([
      "TOTAL GERAL",
      ...ATIVIDADES.map((a) =>
        String(resumoPorColaborador.reduce((s, c) => s + (c.atividades[a] || 0), 0))
      ),
      String(totalGeral),
    ]);

    autoTable(doc, {
      startY: 56,
      head: [["Colaborador", ...ATIVIDADES.map((a) => a.split(" ")[0]), "Total"]],
      body: summaryRows,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [0, 105, 148], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 248, 250] },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 100;
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Registros Detalhados", 14, finalY + 12);

    const detailRows = filtered.map((r) => [
      formatDate(r.data),
      r.colaborador,
      r.atividade,
      String(r.quantidade),
      r.observacao || "—",
    ]);

    autoTable(doc, {
      startY: finalY + 16,
      head: [["Data", "Colaborador", "Atividade", "Qtd", "Observação"]],
      body: detailRows,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [0, 105, 148], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 248, 250] },
    });

    doc.setFontSize(7);
    doc.text("Documento confidencial - LGPD. Uso restrito à equipe NIR.", 14, doc.internal.pageSize.height - 10);

    doc.save(`relatorio-nir-${dataInicio || "inicio"}-${dataFim || "fim"}.pdf`);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5 text-primary" />
            Filtros do Relatório
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Colaborador</Label>
              <Select value={selectedColab} onValueChange={setSelectedColab}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os colaboradores</SelectItem>
                  {(colaboradores ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data Início</Label>
              <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Data Fim</Label>
              <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button onClick={exportPDF} className="gap-2 w-full" disabled={filtered.length === 0}>
                <FileDown className="h-4 w-4" />
                Exportar PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {resumoPorColaborador.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-primary" />
                Desempenho por Colaborador
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={chartDataColaboradores} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="nome" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))" }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {ATIVIDADES.map((a, i) => (
                    <Bar key={a} dataKey={a} stackId="a" fill={COLORS[i % COLORS.length]} name={a.split(" ")[0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Distribuição Total por Atividade
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={chartDataAtividades} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} outerRadius={100} dataKey="value">
                      {chartDataAtividades.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number, _name: string, props: any) => [value, props.payload.fullName]} contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))" }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {resumoPorColaborador.length > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <User className="h-5 w-5 text-primary" />
                    Comparativo entre Colaboradores
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={chartDataRadar}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="atividade" tick={{ fontSize: 10 }} />
                      <PolarRadiusAxis tick={{ fontSize: 10 }} />
                      {resumoPorColaborador.map((c, i) => (
                        <Radar key={c.nome} name={c.nome.split(" ")[0]} dataKey={c.nome.split(" ")[0]} stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.15} />
                      ))}
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))" }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Resumo — {periodoLabel()} {selectedColab !== "todos" && `(${selectedColab})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {resumoPorColaborador.length === 0 ? (
            <p className="text-muted-foreground text-center py-6">Nenhum registro encontrado para o período selecionado.</p>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Colaborador</TableHead>
                    {ATIVIDADES.map((a) => (
                      <TableHead key={a} className="font-semibold text-center text-xs">{a}</TableHead>
                    ))}
                    <TableHead className="font-semibold text-center">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resumoPorColaborador.map((c) => (
                    <TableRow key={c.nome} className="hover:bg-muted/30">
                      <TableCell className="font-medium">{c.nome}</TableCell>
                      {ATIVIDADES.map((a) => (
                        <TableCell key={a} className="text-center">{c.atividades[a] || 0}</TableCell>
                      ))}
                      <TableCell className="text-center font-bold">{c.total}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell>TOTAL GERAL</TableCell>
                    {ATIVIDADES.map((a) => (
                      <TableCell key={a} className="text-center">
                        {resumoPorColaborador.reduce((s, c) => s + (c.atividades[a] || 0), 0)}
                      </TableCell>
                    ))}
                    <TableCell className="text-center">{totalGeral}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {filtered.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Registros Detalhados ({filtered.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Data</TableHead>
                    <TableHead className="font-semibold">Colaborador</TableHead>
                    <TableHead className="font-semibold">Atividade</TableHead>
                    <TableHead className="font-semibold text-center">Qtd</TableHead>
                    <TableHead className="font-semibold">Observação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.id} className="hover:bg-muted/30">
                      <TableCell>{formatDate(r.data)}</TableCell>
                      <TableCell>{r.colaborador}</TableCell>
                      <TableCell>{r.atividade}</TableCell>
                      <TableCell className="text-center font-semibold">{r.quantidade}</TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate">{r.observacao || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
