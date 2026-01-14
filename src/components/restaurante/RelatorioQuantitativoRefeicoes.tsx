import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Loader2,
  Coffee,
  Sun,
  Cookie,
  Moon,
  FileSpreadsheet,
  FileDown,
  Filter,
  BarChart3,
  TrendingUp,
  UtensilsCrossed,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface RegistroRefeicao {
  id: string;
  tipo_pessoa: string;
  colaborador_nome: string;
  tipo_refeicao: string;
  data_registro: string;
  hora_registro: string;
}

interface SolicitacaoDieta {
  id: string;
  horarios_refeicoes: string[] | null;
  data_inicio: string;
  data_fim: string | null;
  status: string;
  tem_acompanhante: boolean | null;
}

interface DailyQuantitativo {
  data: string;
  cafe: number;
  almoco: number;
  lanche: number;
  jantar: number;
  totalRefeicoes: number;
  dietasCafe: number;
  dietasAlmoco: number;
  dietasLanche: number;
  dietasJantar: number;
  totalDietas: number;
  totalGeral: number;
}

const tipoRefeicaoLabels: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  cafe: { label: "Café", icon: <Coffee className="h-4 w-4" />, color: "bg-amber-500" },
  almoco: { label: "Almoço", icon: <Sun className="h-4 w-4" />, color: "bg-orange-500" },
  lanche: { label: "Lanche", icon: <Cookie className="h-4 w-4" />, color: "bg-pink-500" },
  jantar: { label: "Jantar", icon: <Moon className="h-4 w-4" />, color: "bg-indigo-500" },
};

export const RelatorioQuantitativoRefeicoes = () => {
  const { toast } = useToast();
  const [dataInicio, setDataInicio] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [dataFim, setDataFim] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [isLoading, setIsLoading] = useState(false);
  const [quantitativos, setQuantitativos] = useState<DailyQuantitativo[]>([]);
  const [registrosRefeicoes, setRegistrosRefeicoes] = useState<RegistroRefeicao[]>([]);
  const [solicitacoesDieta, setSolicitacoesDieta] = useState<SolicitacaoDieta[]>([]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Buscar registros do totem
      const { data: refeicoes, error: refeicoesError } = await supabase
        .from("refeicoes_registros")
        .select("id, tipo_pessoa, colaborador_nome, tipo_refeicao, data_registro, hora_registro")
        .gte("data_registro", dataInicio)
        .lte("data_registro", dataFim)
        .order("data_registro", { ascending: true });

      if (refeicoesError) throw refeicoesError;
      setRegistrosRefeicoes(refeicoes || []);

      // Buscar solicitações de dieta aprovadas no período
      const { data: dietas, error: dietasError } = await supabase
        .from("solicitacoes_dieta")
        .select("id, horarios_refeicoes, data_inicio, data_fim, status, tem_acompanhante")
        .eq("status", "aprovada")
        .lte("data_inicio", dataFim)
        .order("data_inicio", { ascending: true });

      if (dietasError) throw dietasError;
      
      // Filtrar dietas que estão ativas no período selecionado
      const dietasNoPeriodo = (dietas || []).filter(d => {
        const inicio = d.data_inicio;
        const fim = d.data_fim || dataFim;
        return inicio <= dataFim && fim >= dataInicio;
      });
      
      setSolicitacoesDieta(dietasNoPeriodo);

      // Processar quantitativos por dia
      processarQuantitativos(refeicoes || [], dietasNoPeriodo);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados do relatório.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const processarQuantitativos = (refeicoes: RegistroRefeicao[], dietas: SolicitacaoDieta[]) => {
    const diasNoPeriodo = eachDayOfInterval({
      start: parseISO(dataInicio),
      end: parseISO(dataFim),
    });

    const resultado: DailyQuantitativo[] = diasNoPeriodo.map(dia => {
      const dataStr = format(dia, "yyyy-MM-dd");

      // Contar refeições do totem para cada tipo
      const refeicoesNoDia = refeicoes.filter(r => r.data_registro === dataStr);
      const cafe = refeicoesNoDia.filter(r => r.tipo_refeicao === "cafe").length;
      const almoco = refeicoesNoDia.filter(r => r.tipo_refeicao === "almoco").length;
      const lanche = refeicoesNoDia.filter(r => r.tipo_refeicao === "lanche").length;
      const jantar = refeicoesNoDia.filter(r => r.tipo_refeicao === "jantar").length;

      // Contar dietas ativas no dia para cada refeição
      const dietasAtivasNoDia = dietas.filter(d => {
        const inicio = d.data_inicio;
        const fim = d.data_fim || "9999-12-31";
        return dataStr >= inicio && dataStr <= fim;
      });

      let dietasCafe = 0;
      let dietasAlmoco = 0;
      let dietasLanche = 0;
      let dietasJantar = 0;

      dietasAtivasNoDia.forEach(d => {
        const horarios = d.horarios_refeicoes || ["cafe", "almoco", "lanche", "jantar"];
        const multiplicador = d.tem_acompanhante ? 2 : 1; // Se tem acompanhante, conta 2

        if (horarios.includes("cafe")) dietasCafe += multiplicador;
        if (horarios.includes("almoco")) dietasAlmoco += multiplicador;
        if (horarios.includes("lanche")) dietasLanche += multiplicador;
        if (horarios.includes("jantar")) dietasJantar += multiplicador;
      });

      const totalRefeicoes = cafe + almoco + lanche + jantar;
      const totalDietas = dietasCafe + dietasAlmoco + dietasLanche + dietasJantar;
      const totalGeral = totalRefeicoes + totalDietas;

      return {
        data: dataStr,
        cafe,
        almoco,
        lanche,
        jantar,
        totalRefeicoes,
        dietasCafe,
        dietasAlmoco,
        dietasLanche,
        dietasJantar,
        totalDietas,
        totalGeral,
      };
    });

    // Remover dias sem nenhum registro
    const resultadoFiltrado = resultado.filter(r => r.totalGeral > 0);
    setQuantitativos(resultadoFiltrado);
  };

  useEffect(() => {
    fetchData();
  }, [dataInicio, dataFim]);

  // Calcular totais gerais
  const totaisGerais = {
    cafe: quantitativos.reduce((acc, q) => acc + q.cafe, 0),
    almoco: quantitativos.reduce((acc, q) => acc + q.almoco, 0),
    lanche: quantitativos.reduce((acc, q) => acc + q.lanche, 0),
    jantar: quantitativos.reduce((acc, q) => acc + q.jantar, 0),
    totalRefeicoes: quantitativos.reduce((acc, q) => acc + q.totalRefeicoes, 0),
    dietasCafe: quantitativos.reduce((acc, q) => acc + q.dietasCafe, 0),
    dietasAlmoco: quantitativos.reduce((acc, q) => acc + q.dietasAlmoco, 0),
    dietasLanche: quantitativos.reduce((acc, q) => acc + q.dietasLanche, 0),
    dietasJantar: quantitativos.reduce((acc, q) => acc + q.dietasJantar, 0),
    totalDietas: quantitativos.reduce((acc, q) => acc + q.totalDietas, 0),
    totalGeral: quantitativos.reduce((acc, q) => acc + q.totalGeral, 0),
  };

  const exportToExcel = () => {
    const data = quantitativos.map(q => ({
      "Data": format(parseISO(q.data), "dd/MM/yyyy"),
      "Dia": format(parseISO(q.data), "EEEE", { locale: ptBR }),
      "Café (Totem)": q.cafe,
      "Almoço (Totem)": q.almoco,
      "Lanche (Totem)": q.lanche,
      "Jantar (Totem)": q.jantar,
      "Total Totem": q.totalRefeicoes,
      "Café (Dietas)": q.dietasCafe,
      "Almoço (Dietas)": q.dietasAlmoco,
      "Lanche (Dietas)": q.dietasLanche,
      "Jantar (Dietas)": q.dietasJantar,
      "Total Dietas": q.totalDietas,
      "TOTAL GERAL": q.totalGeral,
    }));

    // Adicionar linha de totais
    data.push({
      "Data": "TOTAIS",
      "Dia": "",
      "Café (Totem)": totaisGerais.cafe,
      "Almoço (Totem)": totaisGerais.almoco,
      "Lanche (Totem)": totaisGerais.lanche,
      "Jantar (Totem)": totaisGerais.jantar,
      "Total Totem": totaisGerais.totalRefeicoes,
      "Café (Dietas)": totaisGerais.dietasCafe,
      "Almoço (Dietas)": totaisGerais.dietasAlmoco,
      "Lanche (Dietas)": totaisGerais.dietasLanche,
      "Jantar (Dietas)": totaisGerais.dietasJantar,
      "Total Dietas": totaisGerais.totalDietas,
      "TOTAL GERAL": totaisGerais.totalGeral,
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Quantitativos");
    XLSX.writeFile(wb, `quantitativo_refeicoes_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`);
    toast({ title: "Sucesso", description: "Arquivo Excel exportado!" });
  };

  const exportToPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    
    doc.setFontSize(16);
    doc.text("Relatório Quantitativo de Refeições Diárias", 14, 15);
    doc.setFontSize(10);
    doc.text(`Período: ${format(parseISO(dataInicio), "dd/MM/yyyy")} a ${format(parseISO(dataFim), "dd/MM/yyyy")}`, 14, 22);
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 28);

    // Resumo geral
    doc.setFontSize(11);
    doc.text(`RESUMO: Totem: ${totaisGerais.totalRefeicoes} | Dietas: ${totaisGerais.totalDietas} | Total Geral: ${totaisGerais.totalGeral}`, 14, 36);

    // Tabela principal
    const tableBody = quantitativos.map(q => [
      format(parseISO(q.data), "dd/MM"),
      format(parseISO(q.data), "EEE", { locale: ptBR }),
      q.cafe,
      q.almoco,
      q.lanche,
      q.jantar,
      q.totalRefeicoes,
      q.dietasCafe,
      q.dietasAlmoco,
      q.dietasLanche,
      q.dietasJantar,
      q.totalDietas,
      q.totalGeral,
    ]);

    // Adicionar linha de totais
    tableBody.push([
      "TOTAIS",
      "",
      totaisGerais.cafe,
      totaisGerais.almoco,
      totaisGerais.lanche,
      totaisGerais.jantar,
      totaisGerais.totalRefeicoes,
      totaisGerais.dietasCafe,
      totaisGerais.dietasAlmoco,
      totaisGerais.dietasLanche,
      totaisGerais.dietasJantar,
      totaisGerais.totalDietas,
      totaisGerais.totalGeral,
    ]);

    autoTable(doc, {
      startY: 42,
      head: [[
        "Data", "Dia",
        "Café", "Almoço", "Lanche", "Jantar", "Tot.Totem",
        "Café", "Almoço", "Lanche", "Jantar", "Tot.Dieta",
        "TOTAL"
      ]],
      body: tableBody,
      styles: { fontSize: 7, cellPadding: 1 },
      headStyles: { fillColor: [59, 130, 246], fontSize: 7 },
      columnStyles: {
        0: { cellWidth: 18 },
        1: { cellWidth: 16 },
        6: { fillColor: [240, 240, 240], fontStyle: "bold" },
        11: { fillColor: [240, 240, 240], fontStyle: "bold" },
        12: { fillColor: [59, 130, 246], textColor: 255, fontStyle: "bold" },
      },
      foot: [["", "", "", "", "", "", "TOTEM", "", "", "", "", "DIETAS", "GERAL"]],
      footStyles: { fillColor: [200, 200, 200], fontSize: 6 },
    });

    doc.save(`quantitativo_refeicoes_${format(new Date(), "yyyyMMdd_HHmm")}.pdf`);
    toast({ title: "Sucesso", description: "Arquivo PDF exportado!" });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Relatório Quantitativo Diário
              </CardTitle>
              <CardDescription>
                Quantitativos de refeições por tipo, incluindo dietas aprovadas
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-[140px]"
              />
              <span className="text-muted-foreground">até</span>
              <Input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="w-[140px]"
              />
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={exportToExcel}
                  disabled={quantitativos.length === 0}
                >
                  <FileSpreadsheet className="h-4 w-4 mr-1" />
                  Excel
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={exportToPDF}
                  disabled={quantitativos.length === 0}
                >
                  <FileDown className="h-4 w-4 mr-1" />
                  PDF
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* KPIs Resumo Geral */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className="p-4 bg-amber-50 rounded-lg border-l-4 border-amber-500">
                  <div className="flex items-center gap-2 mb-1">
                    <Coffee className="h-4 w-4 text-amber-600" />
                    <p className="text-sm text-muted-foreground">Total Café</p>
                  </div>
                  <p className="text-2xl font-bold text-amber-700">
                    {totaisGerais.cafe + totaisGerais.dietasCafe}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Totem: {totaisGerais.cafe} | Dietas: {totaisGerais.dietasCafe}
                  </p>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg border-l-4 border-orange-500">
                  <div className="flex items-center gap-2 mb-1">
                    <Sun className="h-4 w-4 text-orange-600" />
                    <p className="text-sm text-muted-foreground">Total Almoço</p>
                  </div>
                  <p className="text-2xl font-bold text-orange-700">
                    {totaisGerais.almoco + totaisGerais.dietasAlmoco}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Totem: {totaisGerais.almoco} | Dietas: {totaisGerais.dietasAlmoco}
                  </p>
                </div>
                <div className="p-4 bg-pink-50 rounded-lg border-l-4 border-pink-500">
                  <div className="flex items-center gap-2 mb-1">
                    <Cookie className="h-4 w-4 text-pink-600" />
                    <p className="text-sm text-muted-foreground">Total Lanche</p>
                  </div>
                  <p className="text-2xl font-bold text-pink-700">
                    {totaisGerais.lanche + totaisGerais.dietasLanche}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Totem: {totaisGerais.lanche} | Dietas: {totaisGerais.dietasLanche}
                  </p>
                </div>
                <div className="p-4 bg-indigo-50 rounded-lg border-l-4 border-indigo-500">
                  <div className="flex items-center gap-2 mb-1">
                    <Moon className="h-4 w-4 text-indigo-600" />
                    <p className="text-sm text-muted-foreground">Total Jantar</p>
                  </div>
                  <p className="text-2xl font-bold text-indigo-700">
                    {totaisGerais.jantar + totaisGerais.dietasJantar}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Totem: {totaisGerais.jantar} | Dietas: {totaisGerais.dietasJantar}
                  </p>
                </div>
                <div className="p-4 bg-primary/10 rounded-lg border-l-4 border-primary">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <p className="text-sm text-muted-foreground">Total Geral</p>
                  </div>
                  <p className="text-2xl font-bold text-primary">
                    {totaisGerais.totalGeral}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Totem: {totaisGerais.totalRefeicoes} | Dietas: {totaisGerais.totalDietas}
                  </p>
                </div>
              </div>

              {/* Tabela de Quantitativos */}
              {quantitativos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <UtensilsCrossed className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum registro encontrado no período selecionado.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead rowSpan={2} className="border-r bg-muted">Data</TableHead>
                        <TableHead colSpan={5} className="text-center border-r bg-blue-500 text-white">
                          🖥️ Totem (Colaboradores/Visitantes)
                        </TableHead>
                        <TableHead colSpan={5} className="text-center border-r bg-orange-500 text-white">
                          🍽️ Dietas (Pacientes/Acompanhantes)
                        </TableHead>
                        <TableHead rowSpan={2} className="text-center bg-emerald-600 text-white font-bold">
                          Total
                        </TableHead>
                      </TableRow>
                      <TableRow>
                        <TableHead className="text-center bg-blue-100 text-blue-800">
                          <div className="flex items-center justify-center gap-1">
                            <Coffee className="h-3 w-3" />
                            Café
                          </div>
                        </TableHead>
                        <TableHead className="text-center bg-blue-100 text-blue-800">
                          <div className="flex items-center justify-center gap-1">
                            <Sun className="h-3 w-3" />
                            Almoço
                          </div>
                        </TableHead>
                        <TableHead className="text-center bg-blue-100 text-blue-800">
                          <div className="flex items-center justify-center gap-1">
                            <Cookie className="h-3 w-3" />
                            Lanche
                          </div>
                        </TableHead>
                        <TableHead className="text-center bg-blue-100 text-blue-800">
                          <div className="flex items-center justify-center gap-1">
                            <Moon className="h-3 w-3" />
                            Jantar
                          </div>
                        </TableHead>
                        <TableHead className="text-center border-r bg-blue-200 text-blue-900 font-semibold">Subtotal</TableHead>
                        <TableHead className="text-center bg-orange-100 text-orange-800">
                          <div className="flex items-center justify-center gap-1">
                            <Coffee className="h-3 w-3" />
                            Café
                          </div>
                        </TableHead>
                        <TableHead className="text-center bg-orange-100 text-orange-800">
                          <div className="flex items-center justify-center gap-1">
                            <Sun className="h-3 w-3" />
                            Almoço
                          </div>
                        </TableHead>
                        <TableHead className="text-center bg-orange-100 text-orange-800">
                          <div className="flex items-center justify-center gap-1">
                            <Cookie className="h-3 w-3" />
                            Lanche
                          </div>
                        </TableHead>
                        <TableHead className="text-center bg-orange-100 text-orange-800">
                          <div className="flex items-center justify-center gap-1">
                            <Moon className="h-3 w-3" />
                            Jantar
                          </div>
                        </TableHead>
                        <TableHead className="text-center border-r bg-orange-200 text-orange-900 font-semibold">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {quantitativos.map((q) => (
                        <TableRow key={q.data}>
                          <TableCell className="border-r font-medium bg-muted/30">
                            <div>
                              <span>{format(parseISO(q.data), "dd/MM")}</span>
                              <span className="text-xs text-muted-foreground ml-1">
                                ({format(parseISO(q.data), "EEE", { locale: ptBR })})
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center bg-blue-50">{q.cafe || "-"}</TableCell>
                          <TableCell className="text-center bg-blue-50">{q.almoco || "-"}</TableCell>
                          <TableCell className="text-center bg-blue-50">{q.lanche || "-"}</TableCell>
                          <TableCell className="text-center bg-blue-50">{q.jantar || "-"}</TableCell>
                          <TableCell className="text-center border-r bg-blue-100 font-semibold text-blue-800">
                            {q.totalRefeicoes}
                          </TableCell>
                          <TableCell className="text-center bg-orange-50">{q.dietasCafe || "-"}</TableCell>
                          <TableCell className="text-center bg-orange-50">{q.dietasAlmoco || "-"}</TableCell>
                          <TableCell className="text-center bg-orange-50">{q.dietasLanche || "-"}</TableCell>
                          <TableCell className="text-center bg-orange-50">{q.dietasJantar || "-"}</TableCell>
                          <TableCell className="text-center border-r bg-orange-100 font-semibold text-orange-800">
                            {q.totalDietas}
                          </TableCell>
                          <TableCell className="text-center bg-emerald-100 font-bold text-emerald-800">
                            {q.totalGeral}
                          </TableCell>
                        </TableRow>
                      ))}
                      {/* Linha de Totais */}
                      <TableRow className="font-bold border-t-2 border-gray-400">
                        <TableCell className="border-r bg-gray-200 text-gray-800">TOTAIS</TableCell>
                        <TableCell className="text-center bg-blue-100 text-blue-800">{totaisGerais.cafe}</TableCell>
                        <TableCell className="text-center bg-blue-100 text-blue-800">{totaisGerais.almoco}</TableCell>
                        <TableCell className="text-center bg-blue-100 text-blue-800">{totaisGerais.lanche}</TableCell>
                        <TableCell className="text-center bg-blue-100 text-blue-800">{totaisGerais.jantar}</TableCell>
                        <TableCell className="text-center border-r bg-blue-500 text-white">
                          {totaisGerais.totalRefeicoes}
                        </TableCell>
                        <TableCell className="text-center bg-orange-100 text-orange-800">{totaisGerais.dietasCafe}</TableCell>
                        <TableCell className="text-center bg-orange-100 text-orange-800">{totaisGerais.dietasAlmoco}</TableCell>
                        <TableCell className="text-center bg-orange-100 text-orange-800">{totaisGerais.dietasLanche}</TableCell>
                        <TableCell className="text-center bg-orange-100 text-orange-800">{totaisGerais.dietasJantar}</TableCell>
                        <TableCell className="text-center border-r bg-orange-500 text-white">
                          {totaisGerais.totalDietas}
                        </TableCell>
                        <TableCell className="text-center bg-emerald-600 text-white">
                          {totaisGerais.totalGeral}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
