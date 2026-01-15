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
  Droplets,
  Save,
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

interface CafeLitroDiario {
  id: string;
  data: string;
  quantidade_litros: number;
  observacao: string | null;
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
  cafeLitro: number;
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
  const [cafeLitroRegistros, setCafeLitroRegistros] = useState<CafeLitroDiario[]>([]);
  const [cafeLitroInputs, setCafeLitroInputs] = useState<Record<string, string>>({});
  const [savingCafeLitro, setSavingCafeLitro] = useState<string | null>(null);

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

      // Buscar registros de café litro no período
      const { data: cafeLitro, error: cafeLitroError } = await supabase
        .from("cafe_litro_diario")
        .select("id, data, quantidade_litros, observacao")
        .gte("data", dataInicio)
        .lte("data", dataFim)
        .order("data", { ascending: true });

      if (cafeLitroError) throw cafeLitroError;
      setCafeLitroRegistros(cafeLitro || []);

      // Inicializar inputs de café litro com valores existentes
      const inputsIniciais: Record<string, string> = {};
      (cafeLitro || []).forEach(cl => {
        inputsIniciais[cl.data] = String(cl.quantidade_litros);
      });
      setCafeLitroInputs(inputsIniciais);

      // Processar quantitativos por dia
      processarQuantitativos(refeicoes || [], dietasNoPeriodo, cafeLitro || []);
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


  const processarQuantitativos = (refeicoes: RegistroRefeicao[], dietas: SolicitacaoDieta[], cafeLitro: CafeLitroDiario[]) => {
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

      // Buscar café litro do dia
      const cafeLitroDoDia = cafeLitro.find(cl => cl.data === dataStr);
      const cafeLitroQtd = cafeLitroDoDia ? Number(cafeLitroDoDia.quantidade_litros) : 0;

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
        cafeLitro: cafeLitroQtd,
      };
    });

    // Remover dias sem nenhum registro
    const resultadoFiltrado = resultado.filter(r => r.totalGeral > 0 || r.cafeLitro > 0);
    setQuantitativos(resultadoFiltrado);
  };

  const saveCafeLitro = async (data: string, quantidade: string) => {
    if (!quantidade || isNaN(Number(quantidade))) return;
    
    setSavingCafeLitro(data);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const quantidadeNum = parseFloat(quantidade);
      
      // Verificar se já existe registro para a data
      const registroExistente = cafeLitroRegistros.find(cl => cl.data === data);
      
      if (registroExistente) {
        // Atualizar registro existente
        const { error } = await supabase
          .from("cafe_litro_diario")
          .update({ quantidade_litros: quantidadeNum })
          .eq("id", registroExistente.id);
        
        if (error) throw error;
      } else {
        // Inserir novo registro
        const { error } = await supabase
          .from("cafe_litro_diario")
          .insert({
            data,
            quantidade_litros: quantidadeNum,
            registrado_por: user.id,
          });
        
        if (error) throw error;
      }

      toast({ title: "Sucesso", description: `Café Litro salvo para ${format(parseISO(data), "dd/MM/yyyy")}` });
      fetchData(); // Recarregar dados
    } catch (error: any) {
      console.error("Erro ao salvar café litro:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar café litro.",
        variant: "destructive",
      });
    } finally {
      setSavingCafeLitro(null);
    }
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
    cafeLitro: quantitativos.reduce((acc, q) => acc + q.cafeLitro, 0),
  };

  const exportToExcel = () => {
    const data = quantitativos.map(q => ({
      "Data": format(parseISO(q.data), "dd/MM/yyyy"),
      "Dia": format(parseISO(q.data), "EEEE", { locale: ptBR }),
      "Café Litro": q.cafeLitro,
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
      "Café Litro": totaisGerais.cafeLitro,
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
    
    // Cores em RGB
    const azulTotem = [59, 130, 246]; // bg-blue-500
    const azulClaro = [219, 234, 254]; // bg-blue-100
    const laranjaDeita = [249, 115, 22]; // bg-orange-500
    const laranjaClaro = [255, 237, 213]; // bg-orange-100
    const verdeTotal = [5, 150, 105]; // bg-emerald-600
    const verdeClaro = [209, 250, 229]; // bg-emerald-100

    // Título
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Relatório Quantitativo de Refeições Diárias", 14, 15);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Período: ${format(parseISO(dataInicio), "dd/MM/yyyy")} a ${format(parseISO(dataFim), "dd/MM/yyyy")}`, 14, 23);
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 29);

    // Dashboard - KPIs
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Dashboard - Resumo por Tipo de Refeição", 14, 40);

    // Cards do Dashboard
    const cardWidth = 52;
    const cardHeight = 22;
    const cardStartY = 45;
    const cardGap = 4;

    // Card Café (Amber)
    doc.setFillColor(255, 243, 224);
    doc.roundedRect(14, cardStartY, cardWidth, cardHeight, 2, 2, "F");
    doc.setDrawColor(245, 158, 11);
    doc.setLineWidth(0.8);
    doc.line(14, cardStartY, 14, cardStartY + cardHeight);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120, 53, 15);
    doc.text("Total Cafe", 18, cardStartY + 6);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(String(totaisGerais.cafe + totaisGerais.dietasCafe), 18, cardStartY + 14);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(`Totem: ${totaisGerais.cafe} | Dietas: ${totaisGerais.dietasCafe}`, 18, cardStartY + 19);

    // Card Almoço (Orange)
    doc.setFillColor(255, 237, 213);
    doc.roundedRect(14 + cardWidth + cardGap, cardStartY, cardWidth, cardHeight, 2, 2, "F");
    doc.setDrawColor(249, 115, 22);
    doc.line(14 + cardWidth + cardGap, cardStartY, 14 + cardWidth + cardGap, cardStartY + cardHeight);
    doc.setFontSize(8);
    doc.setTextColor(154, 52, 18);
    doc.text("Total Almoco", 18 + cardWidth + cardGap, cardStartY + 6);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(String(totaisGerais.almoco + totaisGerais.dietasAlmoco), 18 + cardWidth + cardGap, cardStartY + 14);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(`Totem: ${totaisGerais.almoco} | Dietas: ${totaisGerais.dietasAlmoco}`, 18 + cardWidth + cardGap, cardStartY + 19);

    // Card Lanche (Pink)
    doc.setFillColor(252, 231, 243);
    doc.roundedRect(14 + (cardWidth + cardGap) * 2, cardStartY, cardWidth, cardHeight, 2, 2, "F");
    doc.setDrawColor(236, 72, 153);
    doc.line(14 + (cardWidth + cardGap) * 2, cardStartY, 14 + (cardWidth + cardGap) * 2, cardStartY + cardHeight);
    doc.setFontSize(8);
    doc.setTextColor(157, 23, 77);
    doc.text("Total Lanche", 18 + (cardWidth + cardGap) * 2, cardStartY + 6);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(String(totaisGerais.lanche + totaisGerais.dietasLanche), 18 + (cardWidth + cardGap) * 2, cardStartY + 14);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(`Totem: ${totaisGerais.lanche} | Dietas: ${totaisGerais.dietasLanche}`, 18 + (cardWidth + cardGap) * 2, cardStartY + 19);

    // Card Jantar (Indigo)
    doc.setFillColor(224, 231, 255);
    doc.roundedRect(14 + (cardWidth + cardGap) * 3, cardStartY, cardWidth, cardHeight, 2, 2, "F");
    doc.setDrawColor(99, 102, 241);
    doc.line(14 + (cardWidth + cardGap) * 3, cardStartY, 14 + (cardWidth + cardGap) * 3, cardStartY + cardHeight);
    doc.setFontSize(8);
    doc.setTextColor(55, 48, 163);
    doc.text("Total Jantar", 18 + (cardWidth + cardGap) * 3, cardStartY + 6);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(String(totaisGerais.jantar + totaisGerais.dietasJantar), 18 + (cardWidth + cardGap) * 3, cardStartY + 14);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(`Totem: ${totaisGerais.jantar} | Dietas: ${totaisGerais.dietasJantar}`, 18 + (cardWidth + cardGap) * 3, cardStartY + 19);

    // Card Total Geral (Emerald)
    doc.setFillColor(209, 250, 229);
    doc.roundedRect(14 + (cardWidth + cardGap) * 4, cardStartY, cardWidth, cardHeight, 2, 2, "F");
    doc.setDrawColor(5, 150, 105);
    doc.line(14 + (cardWidth + cardGap) * 4, cardStartY, 14 + (cardWidth + cardGap) * 4, cardStartY + cardHeight);
    doc.setFontSize(8);
    doc.setTextColor(6, 95, 70);
    doc.text("Total Geral", 18 + (cardWidth + cardGap) * 4, cardStartY + 6);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(String(totaisGerais.totalGeral), 18 + (cardWidth + cardGap) * 4, cardStartY + 14);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(`Totem: ${totaisGerais.totalRefeicoes} | Dietas: ${totaisGerais.totalDietas}`, 18 + (cardWidth + cardGap) * 4, cardStartY + 19);

    // Reset text color
    doc.setTextColor(0, 0, 0);

    // Tabela principal com cores
    const tableBody = quantitativos.map(q => [
      format(parseISO(q.data), "dd/MM") + " (" + format(parseISO(q.data), "EEE", { locale: ptBR }) + ")",
      q.cafeLitro > 0 ? q.cafeLitro.toFixed(1) + "L" : "-",
      q.cafe || "-",
      q.almoco || "-",
      q.lanche || "-",
      q.jantar || "-",
      q.totalRefeicoes,
      q.dietasCafe || "-",
      q.dietasAlmoco || "-",
      q.dietasLanche || "-",
      q.dietasJantar || "-",
      q.totalDietas,
      q.totalGeral,
    ]);

    // Adicionar linha de totais
    tableBody.push([
      "TOTAIS",
      totaisGerais.cafeLitro.toFixed(1) + "L",
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
      startY: 72,
      head: [
        [
          { content: "Data", rowSpan: 2, styles: { halign: "center", valign: "middle", fillColor: [229, 231, 235] } },
          { content: "Totem (Colaboradores/Visitantes)", colSpan: 6, styles: { halign: "center", fillColor: azulTotem as [number, number, number], textColor: 255 } },
          { content: "Dietas (Pacientes/Acompanhantes)", colSpan: 5, styles: { halign: "center", fillColor: laranjaDeita as [number, number, number], textColor: 255 } },
          { content: "Total", rowSpan: 2, styles: { halign: "center", valign: "middle", fillColor: verdeTotal as [number, number, number], textColor: 255 } },
        ],
        [
          { content: "Cafe Litro", styles: { halign: "center", fillColor: [147, 197, 253] as [number, number, number], textColor: [30, 58, 138], fontStyle: "bold" } },
          { content: "Cafe", styles: { halign: "center", fillColor: azulClaro as [number, number, number], textColor: [30, 64, 175] } },
          { content: "Almoco", styles: { halign: "center", fillColor: azulClaro as [number, number, number], textColor: [30, 64, 175] } },
          { content: "Lanche", styles: { halign: "center", fillColor: azulClaro as [number, number, number], textColor: [30, 64, 175] } },
          { content: "Jantar", styles: { halign: "center", fillColor: azulClaro as [number, number, number], textColor: [30, 64, 175] } },
          { content: "Subtotal", styles: { halign: "center", fillColor: [147, 197, 253] as [number, number, number], textColor: [30, 58, 138], fontStyle: "bold" } },
          { content: "Cafe", styles: { halign: "center", fillColor: laranjaClaro as [number, number, number], textColor: [154, 52, 18] } },
          { content: "Almoco", styles: { halign: "center", fillColor: laranjaClaro as [number, number, number], textColor: [154, 52, 18] } },
          { content: "Lanche", styles: { halign: "center", fillColor: laranjaClaro as [number, number, number], textColor: [154, 52, 18] } },
          { content: "Jantar", styles: { halign: "center", fillColor: laranjaClaro as [number, number, number], textColor: [154, 52, 18] } },
          { content: "Subtotal", styles: { halign: "center", fillColor: [253, 186, 116] as [number, number, number], textColor: [124, 45, 18], fontStyle: "bold" } },
        ],
      ],
      body: tableBody.slice(0, -1).map((row) => [
        { content: row[0], styles: { fillColor: [249, 250, 251] as [number, number, number] } },
        { content: row[1], styles: { halign: "center", fillColor: [147, 197, 253] as [number, number, number], fontStyle: "bold", textColor: [30, 58, 138] } },
        { content: row[2], styles: { halign: "center", fillColor: [239, 246, 255] as [number, number, number] } },
        { content: row[3], styles: { halign: "center", fillColor: [239, 246, 255] as [number, number, number] } },
        { content: row[4], styles: { halign: "center", fillColor: [239, 246, 255] as [number, number, number] } },
        { content: row[5], styles: { halign: "center", fillColor: [239, 246, 255] as [number, number, number] } },
        { content: row[6], styles: { halign: "center", fillColor: azulClaro as [number, number, number], fontStyle: "bold", textColor: [30, 64, 175] } },
        { content: row[7], styles: { halign: "center", fillColor: [255, 247, 237] as [number, number, number] } },
        { content: row[8], styles: { halign: "center", fillColor: [255, 247, 237] as [number, number, number] } },
        { content: row[9], styles: { halign: "center", fillColor: [255, 247, 237] as [number, number, number] } },
        { content: row[10], styles: { halign: "center", fillColor: [255, 247, 237] as [number, number, number] } },
        { content: row[11], styles: { halign: "center", fillColor: laranjaClaro as [number, number, number], fontStyle: "bold", textColor: [154, 52, 18] } },
        { content: row[12], styles: { halign: "center", fillColor: verdeClaro as [number, number, number], fontStyle: "bold", textColor: [6, 95, 70] } },
      ]),
      foot: [[
        { content: "TOTAIS", styles: { fillColor: [209, 213, 219] as [number, number, number], fontStyle: "bold" } },
        { content: String(totaisGerais.cafeLitro.toFixed(1) + "L"), styles: { halign: "center", fillColor: [147, 197, 253] as [number, number, number], fontStyle: "bold", textColor: [30, 58, 138] } },
        { content: String(totaisGerais.cafe), styles: { halign: "center", fillColor: azulClaro as [number, number, number], fontStyle: "bold", textColor: [30, 64, 175] } },
        { content: String(totaisGerais.almoco), styles: { halign: "center", fillColor: azulClaro as [number, number, number], fontStyle: "bold", textColor: [30, 64, 175] } },
        { content: String(totaisGerais.lanche), styles: { halign: "center", fillColor: azulClaro as [number, number, number], fontStyle: "bold", textColor: [30, 64, 175] } },
        { content: String(totaisGerais.jantar), styles: { halign: "center", fillColor: azulClaro as [number, number, number], fontStyle: "bold", textColor: [30, 64, 175] } },
        { content: String(totaisGerais.totalRefeicoes), styles: { halign: "center", fillColor: azulTotem as [number, number, number], fontStyle: "bold", textColor: 255 } },
        { content: String(totaisGerais.dietasCafe), styles: { halign: "center", fillColor: laranjaClaro as [number, number, number], fontStyle: "bold", textColor: [154, 52, 18] } },
        { content: String(totaisGerais.dietasAlmoco), styles: { halign: "center", fillColor: laranjaClaro as [number, number, number], fontStyle: "bold", textColor: [154, 52, 18] } },
        { content: String(totaisGerais.dietasLanche), styles: { halign: "center", fillColor: laranjaClaro as [number, number, number], fontStyle: "bold", textColor: [154, 52, 18] } },
        { content: String(totaisGerais.dietasJantar), styles: { halign: "center", fillColor: laranjaClaro as [number, number, number], fontStyle: "bold", textColor: [154, 52, 18] } },
        { content: String(totaisGerais.totalDietas), styles: { halign: "center", fillColor: laranjaDeita as [number, number, number], fontStyle: "bold", textColor: 255 } },
        { content: String(totaisGerais.totalGeral), styles: { halign: "center", fillColor: verdeTotal as [number, number, number], fontStyle: "bold", textColor: 255 } },
      ]],
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fontSize: 7 },
      footStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 28 },
      },
    });

    doc.save(`quantitativo_refeicoes_${format(new Date(), "yyyyMMdd_HHmm")}.pdf`);
    toast({ title: "Sucesso", description: "Arquivo PDF exportado com dashboard!" });
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
                        <TableHead colSpan={6} className="text-center border-r bg-blue-500 text-white">
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
                        <TableHead className="text-center bg-blue-200 text-blue-900 font-semibold">
                          <div className="flex items-center justify-center gap-1">
                            <Droplets className="h-3 w-3" />
                            Café Litro
                          </div>
                        </TableHead>
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
                          <TableCell className="text-center bg-blue-200">
                            <div className="flex items-center justify-center gap-1">
                              <Input
                                type="number"
                                step="0.1"
                                min="0"
                                placeholder="0"
                                value={cafeLitroInputs[q.data] || ""}
                                onChange={(e) => setCafeLitroInputs(prev => ({ ...prev, [q.data]: e.target.value }))}
                                className="w-16 h-7 text-center text-sm p-1"
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                onClick={() => saveCafeLitro(q.data, cafeLitroInputs[q.data] || "0")}
                                disabled={savingCafeLitro === q.data}
                              >
                                {savingCafeLitro === q.data ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Save className="h-3 w-3" />
                                )}
                              </Button>
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
                        <TableCell className="text-center bg-blue-200 text-blue-900 font-bold">
                          {totaisGerais.cafeLitro.toFixed(1)}L
                        </TableCell>
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
