import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileText, BarChart3, Target, User, Calendar, Download, Save, List, Eye } from "lucide-react";
import { format } from "date-fns";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from "recharts";
import { createStandardPdf, savePdfWithFooter } from "@/lib/export-utils";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface CompetenciaItem {
  id: string;
  descricao: string;
}

interface Competencia {
  nome: string;
  itens: CompetenciaItem[];
}

interface CategoriaCompetencia {
  nome: string;
  competencias: Competencia[];
}

const GRAU_LEGENDA = [
  { valor: 0, label: "Nunca (0%)" },
  { valor: 1, label: "Raramente (20%)" },
  { valor: 2, label: "Poucas vezes (40%)" },
  { valor: 3, label: "Com frequência (60%)" },
  { valor: 4, label: "Muitas vezes (80%)" },
  { valor: 5, label: "Todas as vezes (100%)" },
];

const CATEGORIAS: CategoriaCompetencia[] = [
  {
    nome: "Competências Técnicas e Operacionais",
    competencias: [
      { nome: "Conhecimento Especializado", itens: [{ id: "ce1", descricao: "Demonstra domínio consistente sobre normas, metodologias e legislações vigentes." }] },
      { nome: "Competências Operacionais", itens: [{ id: "co1", descricao: "Conhece em profundidade os fluxos e rotinas da instituição." }] },
    ],
  },
  {
    nome: "Competências Comportamentais",
    competencias: [
      { nome: "Comunicação", itens: [
        { id: "com1", descricao: "Expressa-se de forma clara e objetiva." },
        { id: "com2", descricao: "Estimula o diálogo aberto e tem uma escuta ativa." },
      ]},
      { nome: "Liderança", itens: [
        { id: "lid1", descricao: "Motiva a equipe por meio do exemplo, reconhecimento e incentivo ao crescimento." },
        { id: "lid2", descricao: "Promove um ambiente de confiança, respeito e cooperação." },
      ]},
      { nome: "Resolução de Problemas", itens: [
        { id: "rp1", descricao: "Toma decisões assertivas mesmo em situações de pressão." },
      ]},
      { nome: "Adaptabilidade", itens: [
        { id: "ad1", descricao: "Apoia sua equipe no processo de adaptação às mudanças, promovendo um ambiente de estabilidade." },
        { id: "ad2", descricao: "Ajusta suas prioridades de acordo com as novas demandas organizacionais." },
      ]},
    ],
  },
  {
    nome: "Competências Organizacionais",
    competencias: [
      { nome: "Compromisso com a excelência", itens: [
        { id: "exc1", descricao: "Busca melhorar continuamente a produtividade e a excelência das entregas." },
        { id: "exc2", descricao: "Estabelece metas claras e monitora constantemente os resultados." },
      ]},
      { nome: "Visão Estratégica", itens: [
        { id: "ve1", descricao: "Identifica oportunidades de melhoria alinhadas ao planejamento estratégico." },
        { id: "ve2", descricao: "É capaz de antecipar e reverter situações de crise." },
      ]},
      { nome: "Gestão de Mudanças", itens: [
        { id: "gm1", descricao: "Ajuda a equipe a compreender e aceitar mudanças organizacionais." },
        { id: "gm2", descricao: "Atua como agente de transformação, promovendo a inovação nos métodos de trabalho." },
      ]},
      { nome: "Ética e Responsabilidade Social", itens: [
        { id: "et1", descricao: "Age com transparência, respeito e integridade em todas as situações." },
        { id: "et2", descricao: "Respeita as normas e condutas da instituição." },
      ]},
    ],
  },
  {
    nome: "Competências Pessoais",
    competencias: [
      { nome: "Resiliência", itens: [
        { id: "res1", descricao: "Mantém uma atitude positiva diante de situações difíceis ou desafiadoras." },
        { id: "res2", descricao: "Recupera-se rapidamente de falhas ou frustrações, buscando aprendizado." },
        { id: "res3", descricao: "Inspira confiança e serenidade à equipe em momentos de crise." },
      ]},
      { nome: "Empatia", itens: [
        { id: "emp1", descricao: "Escuta com atenção e sem julgamentos, promovendo relações saudáveis." },
        { id: "emp2", descricao: "Considera diferentes perspectivas ao tomar decisões que afetam a equipe." },
      ]},
      { nome: "Desenvolvimento Pessoal", itens: [
        { id: "dp1", descricao: "Busca oportunidades de aprendizado e crescimento contínuo." },
      ]},
      { nome: "Autogestão", itens: [
        { id: "ag1", descricao: "Organiza seu tempo e tarefas com autonomia e responsabilidade." },
        { id: "ag2", descricao: "Cumpre suas entregas com consistência." },
      ]},
    ],
  },
];

// PDI
interface AcaoDesenvolvimento {
  competencia: string;
  acao: string;
  prazo: string;
}

interface AvaliacaoSalva {
  id: string;
  colaborador: string;
  cargo: string;
  avaliador: string;
  data_avaliacao: string;
  nota_geral: number;
  scores: Record<string, { atual: number; projetado: number }>;
  pontos_fortes: string;
  oportunidades: string;
  feedback: string;
  acoes_desenvolvimento: AcaoDesenvolvimento[];
  medias_categorias: any;
  created_at: string;
}

export const AvaliacaoDesempenhoSection = () => {
  const [activeTab, setActiveTab] = useState("avaliacao");

  // Header fields
  const [colaborador, setColaborador] = useState("");
  const [cargo, setCargo] = useState("");
  const [avaliador, setAvaliador] = useState("");
  const [dataAvaliacao, setDataAvaliacao] = useState(format(new Date(), "yyyy-MM-dd"));

  // Scores
  const [scores, setScores] = useState<Record<string, { atual: number; projetado: number }>>({});

  // PDI fields
  const [pontosFortes, setPontosFortes] = useState("");
  const [oportunidades, setOportunidades] = useState("");
  const [feedback, setFeedback] = useState("");
  const [acoes, setAcoes] = useState<AcaoDesenvolvimento[]>([
    { competencia: "", acao: "", prazo: "" },
    { competencia: "", acao: "", prazo: "" },
    { competencia: "", acao: "", prazo: "" },
  ]);

  // History
  const [historico, setHistorico] = useState<AvaliacaoSalva[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewingAvaliacao, setViewingAvaliacao] = useState<AvaliacaoSalva | null>(null);

  const setScore = (id: string, field: "atual" | "projetado", value: number) => {
    setScores(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const getCompetenciaMedia = (comp: Competencia, field: "atual" | "projetado", customScores?: Record<string, { atual: number; projetado: number }>) => {
    const s = customScores || scores;
    const vals = comp.itens.map(i => s[i.id]?.[field]).filter(v => v !== undefined && v !== null) as number[];
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };

  const getCategoriaMedia = (cat: CategoriaCompetencia, field: "atual" | "projetado", customScores?: Record<string, { atual: number; projetado: number }>) => {
    const medias = cat.competencias.map(c => getCompetenciaMedia(c, field, customScores)).filter(v => v !== null) as number[];
    return medias.length > 0 ? medias.reduce((a, b) => a + b, 0) / medias.length : null;
  };

  const categoriasMedias = useMemo(() => {
    return CATEGORIAS.map(cat => ({
      nome: cat.nome.replace("Competências ", "").replace("Competências ", ""),
      atual: getCategoriaMedia(cat, "atual"),
      projetado: getCategoriaMedia(cat, "projetado"),
    }));
  }, [scores]);

  const notaGeral = useMemo(() => {
    const medias = categoriasMedias.filter(c => c.atual !== null).map(c => c.atual!);
    return medias.length > 0 ? medias.reduce((a, b) => a + b, 0) / medias.length : null;
  }, [categoriasMedias]);

  const radarData = useMemo(() => {
    const data: { competencia: string; atual: number; projetado: number }[] = [];
    CATEGORIAS.forEach(cat => {
      cat.competencias.forEach(comp => {
        const atual = getCompetenciaMedia(comp, "atual");
        const projetado = getCompetenciaMedia(comp, "projetado");
        data.push({
          competencia: comp.nome.length > 18 ? comp.nome.substring(0, 16) + "…" : comp.nome,
          atual: atual ?? 0,
          projetado: projetado ?? 0,
        });
      });
    });
    return data;
  }, [scores]);

  const fmtNum = (n: number | null) => (n !== null ? n.toFixed(2) : "—");

  const fetchHistorico = async () => {
    setLoadingHistorico(true);
    try {
      const { data, error } = await supabase
        .from("avaliacoes_desempenho")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setHistorico((data || []) as unknown as AvaliacaoSalva[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistorico(false);
    }
  };

  useEffect(() => {
    fetchHistorico();
  }, []);

  const handleSalvar = async () => {
    if (!colaborador.trim()) {
      toast.error("Informe o nome do colaborador.");
      return;
    }
    if (!avaliador.trim()) {
      toast.error("Informe o nome do avaliador.");
      return;
    }

    const hasAnyScore = Object.keys(scores).length > 0;
    if (!hasAnyScore) {
      toast.error("Preencha ao menos uma competência antes de salvar.");
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const mediasObj: Record<string, { atual: number | null; projetado: number | null }> = {};
      CATEGORIAS.forEach(cat => {
        mediasObj[cat.nome] = {
          atual: getCategoriaMedia(cat, "atual"),
          projetado: getCategoriaMedia(cat, "projetado"),
        };
      });

      const { error } = await supabase.from("avaliacoes_desempenho").insert({
        colaborador: colaborador.trim(),
        cargo: cargo.trim() || null,
        avaliador: avaliador.trim(),
        data_avaliacao: dataAvaliacao,
        scores: scores as any,
        pontos_fortes: pontosFortes || null,
        oportunidades: oportunidades || null,
        feedback: feedback || null,
        acoes_desenvolvimento: acoes.filter(a => a.competencia || a.acao) as any,
        medias_categorias: mediasObj as any,
        nota_geral: notaGeral,
        registrado_por: user?.id || null,
      });

      if (error) throw error;
      toast.success("Avaliação salva com sucesso!");
      fetchHistorico();
      
      // Reset form
      setColaborador("");
      setCargo("");
      setAvaliador("");
      setDataAvaliacao(format(new Date(), "yyyy-MM-dd"));
      setScores({});
      setPontosFortes("");
      setOportunidades("");
      setFeedback("");
      setAcoes([
        { competencia: "", acao: "", prazo: "" },
        { competencia: "", acao: "", prazo: "" },
        { competencia: "", acao: "", prazo: "" },
      ]);
    } catch (err: any) {
      toast.error("Erro ao salvar: " + (err.message || "Tente novamente."));
    } finally {
      setSaving(false);
    }
  };

  const handleExportAvaliacaoPDF = async () => {
    const { doc, logoImg } = await createStandardPdf("Avaliação de Desempenho por Competências", "portrait");
    const pageWidth = doc.internal.pageSize.width;
    let y = 32;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Colaborador(a): ${colaborador}`, 14, y); y += 5;
    doc.text(`Cargo: ${cargo}`, 14, y); y += 5;
    doc.text(`Avaliador(a): ${avaliador}`, 14, y); y += 5;
    doc.text(`Data: ${dataAvaliacao ? format(new Date(dataAvaliacao + "T00:00:00"), "dd/MM/yyyy") : ""}`, 14, y); y += 3;

    y += 4;
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("Legenda: 0=Nunca | 1=Raramente | 2=Poucas vezes | 3=Com frequência | 4=Muitas vezes | 5=Todas as vezes", 14, y);
    y += 5;

    CATEGORIAS.forEach(cat => {
      const rows: (string | number)[][] = [];
      cat.competencias.forEach(comp => {
        comp.itens.forEach((item, idx) => {
          const s = scores[item.id];
          const media = idx === comp.itens.length - 1 ? getCompetenciaMedia(comp, "atual") : null;
          const mediaP = idx === comp.itens.length - 1 ? getCompetenciaMedia(comp, "projetado") : null;
          rows.push([
            idx === 0 ? comp.nome : "",
            item.descricao,
            s?.atual !== undefined ? String(s.atual) : "",
            s?.projetado !== undefined ? String(s.projetado) : "",
            media !== null ? fmtNum((media + (mediaP ?? 0)) / 2) : "",
          ]);
        });
      });

      const catMedia = getCategoriaMedia(cat, "atual");
      const catMediaP = getCategoriaMedia(cat, "projetado");
      rows.push(["Desempenho Médio", "", fmtNum(catMedia), fmtNum(catMediaP), fmtNum(catMedia !== null && catMediaP !== null ? (catMedia + catMediaP) / 2 : null)]);

      autoTable(doc, {
        head: [[cat.nome, "Descrição", "Atual", "Projetado", "Média"]],
        body: rows,
        startY: y,
        styles: { fontSize: 7, cellPadding: 1.5 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: "bold", fontSize: 7 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { top: 32, bottom: 28 },
        columnStyles: {
          0: { cellWidth: 35 },
          2: { halign: "center", cellWidth: 16 },
          3: { halign: "center", cellWidth: 18 },
          4: { halign: "center", cellWidth: 16 },
        },
      });
      y = (doc as any).lastAutoTable.finalY + 4;

      if (y > doc.internal.pageSize.height - 40) {
        doc.addPage();
        y = 32;
      }
    });

    doc.addPage();
    y = 32;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("RESULTADO FINAL", 14, y);
    y += 6;

    const resultRows = categoriasMedias.map(c => [c.nome, fmtNum(c.atual), fmtNum(c.projetado)]);
    autoTable(doc, {
      head: [["Categoria", "Atual", "Projetado"]],
      body: resultRows,
      startY: y,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: "bold" },
      columnStyles: { 1: { halign: "center" }, 2: { halign: "center" } },
      margin: { bottom: 28 },
    });

    y = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(7);
    doc.setFont("helvetica", "italic");
    doc.text("Este formulário destina-se à avaliação do desempenho por competência e deverá ser tratado de forma confidencial.", 14, y);

    y += 14;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`DATA: ${dataAvaliacao ? format(new Date(dataAvaliacao + "T00:00:00"), "dd/MM/yyyy") : ""}`, 14, y);
    y += 12;
    doc.line(14, y, 80, y);
    doc.text("Líder avaliador", 30, y + 5);
    doc.line(pageWidth - 80, y, pageWidth - 14, y);
    doc.text("Colaborador(a)", pageWidth - 60, y + 5);

    savePdfWithFooter(doc, "Avaliação de Desempenho", "avaliacao_desempenho", logoImg);
  };

  const handleExportPDIPDF = async () => {
    const { doc, logoImg } = await createStandardPdf("Plano de Desenvolvimento Individual", "portrait");
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    let y = 32;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Colaborador(a): ${colaborador}`, 14, y); y += 5;
    doc.text(`Cargo: ${cargo}`, 14, y); y += 5;
    doc.text(`Avaliador(a): ${avaliador}`, 14, y); y += 5;
    doc.text(`Data: ${dataAvaliacao ? format(new Date(dataAvaliacao + "T00:00:00"), "dd/MM/yyyy") : ""}`, 14, y); y += 8;

    // Resultado final table
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("RESULTADO FINAL", 14, y);
    y += 6;

    const resultRows: string[][] = [];
    CATEGORIAS.forEach(cat => {
      cat.competencias.forEach((comp, idx) => {
        const atual = getCompetenciaMedia(comp, "atual");
        const projetado = getCompetenciaMedia(comp, "projetado");
        resultRows.push([
          idx === 0 ? cat.nome.replace("Competências ", "") : "",
          comp.nome,
          fmtNum(atual),
          fmtNum(projetado),
        ]);
      });
    });

    autoTable(doc, {
      head: [["Categoria", "Competência", "Atual", "Projetado"]],
      body: resultRows,
      startY: y,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: "bold" },
      columnStyles: { 2: { halign: "center" }, 3: { halign: "center" } },
      margin: { bottom: 28 },
    });
    y = (doc as any).lastAutoTable.finalY + 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`NOTA GERAL DA AVALIAÇÃO: ${fmtNum(notaGeral)}`, 14, y);
    y += 8;

    try {
      const chartCanvas = document.createElement("canvas");
      chartCanvas.width = 600;
      chartCanvas.height = 500;
      const ctx = chartCanvas.getContext("2d");
      if (ctx && radarData.length > 0) {
        const cx = 300, cy = 230, maxR = 180;
        const n = radarData.length;
        const angleStep = (2 * Math.PI) / n;
        const maxVal = 5;

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, 600, 500);

        ctx.fillStyle = "#1a1a1a";
        ctx.font = "bold 18px Arial";
        ctx.textAlign = "center";
        ctx.fillText("RODA DAS COMPETÊNCIAS – ATUAL E PROJETADA", cx, 24);

        for (let level = 1; level <= 5; level++) {
          const r = (level / maxVal) * maxR;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, 2 * Math.PI);
          ctx.strokeStyle = "#ddd";
          ctx.lineWidth = 0.8;
          ctx.stroke();
          ctx.fillStyle = "#999";
          ctx.font = "11px Arial";
          ctx.textAlign = "left";
          ctx.fillText(String(level), cx + 3, cy - r + 4);
        }

        ctx.font = "11px Arial";
        ctx.fillStyle = "#333";
        radarData.forEach((d, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const x2 = cx + maxR * Math.cos(angle);
          const y2 = cy + maxR * Math.sin(angle);
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(x2, y2);
          ctx.strokeStyle = "#ccc";
          ctx.lineWidth = 0.6;
          ctx.stroke();
          const lx = cx + (maxR + 18) * Math.cos(angle);
          const ly = cy + (maxR + 18) * Math.sin(angle);
          ctx.textAlign = Math.cos(angle) < -0.1 ? "right" : Math.cos(angle) > 0.1 ? "left" : "center";
          ctx.textBaseline = "middle";
          ctx.fillText(d.competencia, lx, ly);
        });

        const drawPoly = (field: "atual" | "projetado", color: string, fillColor: string) => {
          ctx.beginPath();
          radarData.forEach((d, i) => {
            const angle = i * angleStep - Math.PI / 2;
            const r = (d[field] / maxVal) * maxR;
            const x = cx + r * Math.cos(angle);
            const yy = cy + r * Math.sin(angle);
            if (i === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
          });
          ctx.closePath();
          ctx.fillStyle = fillColor;
          ctx.fill();
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.stroke();

          radarData.forEach((d, i) => {
            const angle = i * angleStep - Math.PI / 2;
            const r = (d[field] / maxVal) * maxR;
            ctx.beginPath();
            ctx.arc(cx + r * Math.cos(angle), cy + r * Math.sin(angle), 3, 0, 2 * Math.PI);
            ctx.fillStyle = color;
            ctx.fill();
          });
        };

        drawPoly("atual", "#2563eb", "rgba(37,99,235,0.15)");
        drawPoly("projetado", "#16a34a", "rgba(22,163,74,0.15)");

        const legY = cy + maxR + 40;
        ctx.fillStyle = "#2563eb";
        ctx.fillRect(cx - 80, legY, 12, 12);
        ctx.fillStyle = "#333";
        ctx.font = "13px Arial";
        ctx.textAlign = "left";
        ctx.fillText("Atual", cx - 64, legY + 10);
        ctx.fillStyle = "#16a34a";
        ctx.fillRect(cx + 10, legY, 12, 12);
        ctx.fillStyle = "#333";
        ctx.fillText("Projetado", cx + 26, legY + 10);

        if (y + 90 > pageHeight - 40) {
          doc.addPage();
          y = 32;
        }

        const imgData = chartCanvas.toDataURL("image/png");
        const chartW = pageWidth - 28;
        const chartH = chartW * (500 / 600);
        doc.addImage(imgData, "PNG", 14, y, chartW, chartH);
        y += chartH + 8;
      }
    } catch (e) {
      console.warn("Não foi possível gerar gráfico radar no PDF:", e);
    }

    // Check page space
    if (y + 40 > pageHeight - 40) {
      doc.addPage();
      y = 32;
    }

    // Pontos fortes & oportunidades
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("PONTOS FORTES", 14, y);
    doc.text("OPORTUNIDADES DE DESENVOLVIMENTO", pageWidth / 2 + 4, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const splitFortes = doc.splitTextToSize(pontosFortes || "—", pageWidth / 2 - 20);
    const splitOp = doc.splitTextToSize(oportunidades || "—", pageWidth / 2 - 20);
    doc.text(splitFortes, 14, y);
    doc.text(splitOp, pageWidth / 2 + 4, y);
    y += Math.max(splitFortes.length, splitOp.length) * 4 + 6;

    // Competência-Alvo / Ação de Desenvolvimento
    if (y + 20 > pageHeight - 40) { doc.addPage(); y = 32; }

    const acoesFiltradas = acoes.filter(a => a.competencia || a.acao);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("COMPETÊNCIAS-ALVO / AÇÕES DE DESENVOLVIMENTO", 14, y);
    y += 6;

    if (acoesFiltradas.length > 0) {
      autoTable(doc, {
        head: [["Competência-Alvo", "Ação de Desenvolvimento", "Prazo"]],
        body: acoesFiltradas.map(a => [a.competencia, a.acao, a.prazo]),
        startY: y,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: "bold" },
        margin: { bottom: 28 },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    } else {
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("Nenhuma ação de desenvolvimento registrada.", 14, y);
      y += 6;
    }

    // Feedback
    if (y + 20 > pageHeight - 40) { doc.addPage(); y = 32; }
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("FEEDBACK", 14, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const splitFb = doc.splitTextToSize(feedback || "—", pageWidth - 28);
    doc.text(splitFb, 14, y);
    y += splitFb.length * 4 + 8;

    // Confidentiality notice
    if (y + 30 > pageHeight - 40) { doc.addPage(); y = 32; }
    doc.setFontSize(7);
    doc.setFont("helvetica", "italic");
    doc.text("Este formulário destina-se à avaliação do desempenho por competência e deverá ser tratado de forma confidencial.", 14, y);
    y += 10;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`DATA: ${dataAvaliacao ? format(new Date(dataAvaliacao + "T00:00:00"), "dd/MM/yyyy") : ""}`, 14, y);
    y += 12;
    doc.line(14, y, 80, y);
    doc.text("Líder avaliador", 30, y + 5);
    doc.line(pageWidth - 80, y, pageWidth - 14, y);
    doc.text("Colaborador(a)", pageWidth - 60, y + 5);

    savePdfWithFooter(doc, "Plano de Desenvolvimento Individual", "pdi", logoImg);
  };

  const handleExportRelatorioAvaliacoes = async () => {
    if (historico.length === 0) {
      toast.error("Nenhuma avaliação salva para gerar relatório.");
      return;
    }
    const { doc, logoImg } = await createStandardPdf("Relatório de Avaliações Aplicadas", "landscape");
    let y = 32;

    const rows = historico.map(h => [
      h.colaborador,
      h.cargo || "—",
      h.avaliador,
      h.data_avaliacao ? format(new Date(h.data_avaliacao + "T00:00:00"), "dd/MM/yyyy") : "—",
      h.nota_geral !== null && h.nota_geral !== undefined ? Number(h.nota_geral).toFixed(2) : "—",
    ]);

    autoTable(doc, {
      head: [["Colaborador", "Cargo", "Avaliador", "Data", "Nota Geral"]],
      body: rows,
      startY: y,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: "bold" },
      columnStyles: { 4: { halign: "center", fontStyle: "bold" } },
      margin: { bottom: 28 },
    });

    savePdfWithFooter(doc, "Relatório de Avaliações Aplicadas", "relatorio_avaliacoes", logoImg);
  };

  const handleExportRelatorioCompleto = async (av: AvaliacaoSalva) => {
    const { doc, logoImg } = await createStandardPdf("Relatório Completo – Avaliação de Desempenho e PDI", "portrait");
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    let y = 32;

    const savedScores = av.scores || {};
    const fmtN = (n: number | null | undefined) => (n !== null && n !== undefined ? Number(n).toFixed(2) : "—");

    // Header info
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Colaborador(a): ${av.colaborador}`, 14, y); y += 5;
    doc.text(`Cargo: ${av.cargo || "—"}`, 14, y); y += 5;
    doc.text(`Avaliador(a): ${av.avaliador}`, 14, y); y += 5;
    doc.text(`Data: ${av.data_avaliacao ? format(new Date(av.data_avaliacao + "T00:00:00"), "dd/MM/yyyy") : "—"}`, 14, y); y += 3;

    y += 4;
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("Legenda: 0=Nunca | 1=Raramente | 2=Poucas vezes | 3=Com frequência | 4=Muitas vezes | 5=Todas as vezes", 14, y);
    y += 5;

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("AVALIAÇÃO DE DESEMPENHO POR COMPETÊNCIAS", 14, y); y += 6;

    CATEGORIAS.forEach(cat => {
      const rows: (string | number)[][] = [];
      cat.competencias.forEach(comp => {
        comp.itens.forEach((item, idx) => {
          const s = savedScores[item.id];
          const media = idx === comp.itens.length - 1 ? getCompetenciaMedia(comp, "atual", savedScores) : null;
          const mediaP = idx === comp.itens.length - 1 ? getCompetenciaMedia(comp, "projetado", savedScores) : null;
          rows.push([
            idx === 0 ? comp.nome : "",
            item.descricao,
            s?.atual !== undefined ? String(s.atual) : "",
            s?.projetado !== undefined ? String(s.projetado) : "",
            media !== null ? fmtN((media + (mediaP ?? 0)) / 2) : "",
          ]);
        });
      });

      const catMedia = getCategoriaMedia(cat, "atual", savedScores);
      const catMediaP = getCategoriaMedia(cat, "projetado", savedScores);
      rows.push(["Desempenho Médio", "", fmtN(catMedia), fmtN(catMediaP), fmtN(catMedia !== null && catMediaP !== null ? (catMedia + catMediaP) / 2 : null)]);

      autoTable(doc, {
        head: [[cat.nome, "Descrição", "Atual", "Proj.", "Média"]],
        body: rows,
        startY: y,
        styles: { fontSize: 7, cellPadding: 1.5 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: "bold", fontSize: 7 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { top: 32, bottom: 28 },
        columnStyles: { 0: { cellWidth: 35 }, 2: { halign: "center", cellWidth: 14 }, 3: { halign: "center", cellWidth: 14 }, 4: { halign: "center", cellWidth: 14 } },
      });
      y = (doc as any).lastAutoTable.finalY + 4;
      if (y > pageHeight - 40) { doc.addPage(); y = 32; }
    });

    // Resultado Final
    doc.addPage(); y = 32;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("RESULTADO FINAL", 14, y); y += 6;

    const mediasFromDB = av.medias_categorias as Record<string, { atual: number | null; projetado: number | null }> | null;
    const resultRows: string[][] = [];
    if (mediasFromDB) {
      Object.entries(mediasFromDB).forEach(([cat, val]) => {
        resultRows.push([cat.replace("Competências ", ""), fmtN(val?.atual), fmtN(val?.projetado)]);
      });
    }

    autoTable(doc, {
      head: [["Categoria", "Atual", "Projetado"]],
      body: resultRows,
      startY: y,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: "bold" },
      columnStyles: { 1: { halign: "center" }, 2: { halign: "center" } },
      margin: { bottom: 28 },
    });
    y = (doc as any).lastAutoTable.finalY + 6;

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`NOTA GERAL DA AVALIAÇÃO: ${fmtN(av.nota_geral)}`, 14, y); y += 10;

    if (y + 20 > pageHeight - 40) { doc.addPage(); y = 32; }
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("PLANO DE DESENVOLVIMENTO INDIVIDUAL (PDI)", 14, y); y += 8;

    // Radar chart
    try {
      const chartCanvas = document.createElement("canvas");
      chartCanvas.width = 600;
      chartCanvas.height = 500;
      const ctx = chartCanvas.getContext("2d");
      if (ctx) {
        const chartData: { competencia: string; atual: number; projetado: number }[] = [];
        CATEGORIAS.forEach(cat => {
          cat.competencias.forEach(comp => {
            chartData.push({
              competencia: comp.nome.length > 18 ? comp.nome.substring(0, 16) + "…" : comp.nome,
              atual: getCompetenciaMedia(comp, "atual", savedScores) ?? 0,
              projetado: getCompetenciaMedia(comp, "projetado", savedScores) ?? 0,
            });
          });
        });

        const cx = 300, cy = 230, maxR = 180, n = chartData.length;
        const angleStep = (2 * Math.PI) / n;

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, 600, 500);
        ctx.fillStyle = "#1a1a1a";
        ctx.font = "bold 18px Arial";
        ctx.textAlign = "center";
        ctx.fillText("RODA DAS COMPETÊNCIAS – ATUAL E PROJETADA", cx, 24);

        for (let level = 1; level <= 5; level++) {
          const r = (level / 5) * maxR;
          ctx.beginPath(); ctx.arc(cx, cy, r, 0, 2 * Math.PI);
          ctx.strokeStyle = "#ddd"; ctx.lineWidth = 0.8; ctx.stroke();
          ctx.fillStyle = "#999"; ctx.font = "11px Arial"; ctx.textAlign = "left";
          ctx.fillText(String(level), cx + 3, cy - r + 4);
        }

        ctx.font = "11px Arial"; ctx.fillStyle = "#333";
        chartData.forEach((d, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const x2 = cx + maxR * Math.cos(angle), y2 = cy + maxR * Math.sin(angle);
          ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x2, y2);
          ctx.strokeStyle = "#ccc"; ctx.lineWidth = 0.6; ctx.stroke();
          const lx = cx + (maxR + 18) * Math.cos(angle), ly = cy + (maxR + 18) * Math.sin(angle);
          ctx.textAlign = Math.cos(angle) < -0.1 ? "right" : Math.cos(angle) > 0.1 ? "left" : "center";
          ctx.textBaseline = "middle";
          ctx.fillText(d.competencia, lx, ly);
        });

        const drawPoly = (field: "atual" | "projetado", color: string, fill: string) => {
          ctx.beginPath();
          chartData.forEach((d, i) => {
            const angle = i * angleStep - Math.PI / 2;
            const r = (d[field] / 5) * maxR;
            const x = cx + r * Math.cos(angle), yy = cy + r * Math.sin(angle);
            if (i === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
          });
          ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
          ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
          chartData.forEach((d, i) => {
            const angle = i * angleStep - Math.PI / 2;
            const r = (d[field] / 5) * maxR;
            ctx.beginPath(); ctx.arc(cx + r * Math.cos(angle), cy + r * Math.sin(angle), 3, 0, 2 * Math.PI);
            ctx.fillStyle = color; ctx.fill();
          });
        };

        drawPoly("atual", "#2563eb", "rgba(37,99,235,0.15)");
        drawPoly("projetado", "#16a34a", "rgba(22,163,74,0.15)");

        const legY = cy + maxR + 40;
        ctx.fillStyle = "#2563eb"; ctx.fillRect(cx - 80, legY, 12, 12);
        ctx.fillStyle = "#333"; ctx.font = "13px Arial"; ctx.textAlign = "left"; ctx.fillText("Atual", cx - 64, legY + 10);
        ctx.fillStyle = "#16a34a"; ctx.fillRect(cx + 10, legY, 12, 12);
        ctx.fillStyle = "#333"; ctx.fillText("Projetado", cx + 26, legY + 10);

        if (y + 90 > pageHeight - 40) { doc.addPage(); y = 32; }
        const imgData = chartCanvas.toDataURL("image/png");
        const chartW = pageWidth - 28;
        const chartH = chartW * (500 / 600);
        doc.addImage(imgData, "PNG", 14, y, chartW, chartH);
        y += chartH + 8;
      }
    } catch (e) { console.warn("Erro no gráfico radar:", e); }

    // Pontos fortes & oportunidades
    if (y + 30 > pageHeight - 40) { doc.addPage(); y = 32; }
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("PONTOS FORTES", 14, y);
    doc.text("OPORTUNIDADES DE DESENVOLVIMENTO", pageWidth / 2 + 4, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const splitF = doc.splitTextToSize(av.pontos_fortes || "—", pageWidth / 2 - 20);
    const splitO = doc.splitTextToSize(av.oportunidades || "—", pageWidth / 2 - 20);
    doc.text(splitF, 14, y);
    doc.text(splitO, pageWidth / 2 + 4, y);
    y += Math.max(splitF.length, splitO.length) * 4 + 6;

    // Competências-alvo
    if (y + 20 > pageHeight - 40) { doc.addPage(); y = 32; }
    const acoesSalvas = (av.acoes_desenvolvimento || []) as AcaoDesenvolvimento[];
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("COMPETÊNCIAS-ALVO / AÇÕES DE DESENVOLVIMENTO", 14, y); y += 6;

    if (acoesSalvas.length > 0) {
      autoTable(doc, {
        head: [["Competência-Alvo", "Ação de Desenvolvimento", "Prazo"]],
        body: acoesSalvas.map(a => [a.competencia, a.acao, a.prazo]),
        startY: y,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: "bold" },
        margin: { bottom: 28 },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    } else {
      doc.setFontSize(8); doc.setFont("helvetica", "normal");
      doc.text("Nenhuma ação de desenvolvimento registrada.", 14, y); y += 6;
    }

    // Feedback
    if (y + 20 > pageHeight - 40) { doc.addPage(); y = 32; }
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("FEEDBACK", 14, y); y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const splitFb = doc.splitTextToSize(av.feedback || "—", pageWidth - 28);
    doc.text(splitFb, 14, y); y += splitFb.length * 4 + 8;

    // Signatures
    if (y + 30 > pageHeight - 40) { doc.addPage(); y = 32; }
    doc.setFontSize(7);
    doc.setFont("helvetica", "italic");
    doc.text("Este formulário destina-se à avaliação do desempenho por competência e deverá ser tratado de forma confidencial.", 14, y);
    y += 10;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`DATA: ${av.data_avaliacao ? format(new Date(av.data_avaliacao + "T00:00:00"), "dd/MM/yyyy") : ""}`, 14, y);
    y += 12;
    doc.line(14, y, 80, y);
    doc.text("Líder avaliador", 30, y + 5);
    doc.line(pageWidth - 80, y, pageWidth - 14, y);
    doc.text("Colaborador(a)", pageWidth - 60, y + 5);

    savePdfWithFooter(doc, "Relatório Completo – Avaliação e PDI", `relatorio_completo_${av.colaborador.replace(/\s+/g, "_")}`, logoImg);
  };

  const handleViewAvaliacao = (av: AvaliacaoSalva) => {
    setViewingAvaliacao(av);
  };

  const ScoreSelect = ({ itemId, field }: { itemId: string; field: "atual" | "projetado" }) => (
    <Select
      value={scores[itemId]?.[field]?.toString() ?? ""}
      onValueChange={(v) => setScore(itemId, field, Number(v))}
    >
      <SelectTrigger className="w-20 h-8 text-xs">
        <SelectValue placeholder="—" />
      </SelectTrigger>
      <SelectContent>
        {GRAU_LEGENDA.map(g => (
          <SelectItem key={g.valor} value={String(g.valor)}>
            {g.valor}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="avaliacao" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Avaliação de Desempenho</span>
            <span className="sm:hidden">Avaliação</span>
          </TabsTrigger>
          <TabsTrigger value="pdi" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            PDI
          </TabsTrigger>
          <TabsTrigger value="historico" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            <span className="hidden sm:inline">Avaliações Aplicadas</span>
            <span className="sm:hidden">Histórico</span>
          </TabsTrigger>
        </TabsList>

        {/* ─── AVALIAÇÃO ─── */}
        <TabsContent value="avaliacao" className="mt-6 space-y-6">
          {/* Header */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Avaliação de Desempenho por Competências
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Colaborador(a)</Label>
                  <Input value={colaborador} onChange={e => setColaborador(e.target.value)} placeholder="Nome do colaborador" />
                </div>
                <div className="space-y-2">
                  <Label>Cargo</Label>
                  <Input value={cargo} onChange={e => setCargo(e.target.value)} placeholder="Cargo" />
                </div>
                <div className="space-y-2">
                  <Label>Avaliador(a)</Label>
                  <Input value={avaliador} onChange={e => setAvaliador(e.target.value)} placeholder="Nome do avaliador" />
                </div>
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Input type="date" value={dataAvaliacao} onChange={e => setDataAvaliacao(e.target.value)} />
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs font-semibold mb-2">Legenda de Graus</p>
                <div className="flex flex-wrap gap-2">
                  {GRAU_LEGENDA.map(g => (
                    <Badge key={g.valor} variant="outline" className="text-xs">
                      {g.valor} - {g.label}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Competency categories */}
          {CATEGORIAS.map((cat, catIdx) => (
            <Card key={catIdx}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-primary">{cat.nome}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 pr-2 w-40">Competência</th>
                        <th className="text-left py-2 pr-2">Descrição</th>
                        <th className="text-center py-2 w-24">Atual</th>
                        <th className="text-center py-2 w-24">Projetado</th>
                        <th className="text-center py-2 w-20">Média</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cat.competencias.map((comp, compIdx) => (
                        <>
                          {comp.itens.map((item, itemIdx) => (
                            <tr key={item.id} className="border-b border-muted/50">
                              <td className="py-2 pr-2 font-medium text-xs">
                                {itemIdx === 0 ? comp.nome : ""}
                              </td>
                              <td className="py-2 pr-2 text-xs text-muted-foreground">{item.descricao}</td>
                              <td className="py-2 text-center">
                                <ScoreSelect itemId={item.id} field="atual" />
                              </td>
                              <td className="py-2 text-center">
                                <ScoreSelect itemId={item.id} field="projetado" />
                              </td>
                              <td className="py-2 text-center text-xs font-medium">
                                {scores[item.id]?.atual !== undefined && scores[item.id]?.projetado !== undefined
                                  ? ((scores[item.id].atual + scores[item.id].projetado) / 2).toFixed(2)
                                  : "—"}
                              </td>
                            </tr>
                          ))}
                          {comp.itens.length > 1 && (
                            <tr key={`media-${compIdx}`} className="bg-muted/30">
                              <td colSpan={2} className="py-1 px-2 text-xs font-semibold text-right">Média da CHA =</td>
                              <td className="py-1 text-center text-xs font-bold">{fmtNum(getCompetenciaMedia(comp, "atual"))}</td>
                              <td className="py-1 text-center text-xs font-bold">{fmtNum(getCompetenciaMedia(comp, "projetado"))}</td>
                              <td className="py-1 text-center text-xs font-bold">
                                {getCompetenciaMedia(comp, "atual") !== null && getCompetenciaMedia(comp, "projetado") !== null
                                  ? fmtNum((getCompetenciaMedia(comp, "atual")! + getCompetenciaMedia(comp, "projetado")!) / 2)
                                  : "—"}
                              </td>
                            </tr>
                          )}
                        </>
                      ))}
                      <tr className="bg-primary/10 font-bold">
                        <td colSpan={2} className="py-2 px-2 text-xs">Desempenho Médio da Competência:</td>
                        <td className="py-2 text-center text-xs">{fmtNum(getCategoriaMedia(cat, "atual"))}</td>
                        <td className="py-2 text-center text-xs">{fmtNum(getCategoriaMedia(cat, "projetado"))}</td>
                        <td className="py-2 text-center text-xs">
                          {getCategoriaMedia(cat, "atual") !== null && getCategoriaMedia(cat, "projetado") !== null
                            ? fmtNum((getCategoriaMedia(cat, "atual")! + getCategoriaMedia(cat, "projetado")!) / 2)
                            : "—"}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Resultado Final */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">RESULTADO FINAL</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {categoriasMedias.map((c, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-muted/50">
                    <span className="text-sm font-medium">Média {CATEGORIAS[i].nome}</span>
                    <div className="flex gap-6">
                      <Badge variant="outline">Atual: {fmtNum(c.atual)}</Badge>
                      <Badge variant="outline">Projetado: {fmtNum(c.projetado)}</Badge>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between py-3 bg-primary/5 rounded-lg px-3 mt-2">
                  <span className="text-sm font-bold">NOTA GERAL DA AVALIAÇÃO</span>
                  <Badge className="text-base px-4 py-1">{fmtNum(notaGeral)}</Badge>
                </div>
              </div>

              <Separator className="my-4" />
              <p className="text-xs text-muted-foreground italic">
                Este formulário destina-se à avaliação do desempenho por competência e deverá ser tratado de forma confidencial.
              </p>

              <div className="mt-4 flex gap-3 flex-wrap">
                <Button onClick={handleExportAvaliacaoPDF} variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  Exportar Avaliação em PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── PDI ─── */}
        <TabsContent value="pdi" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Plano de Desenvolvimento Individual
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Colaborador(a)</Label>
                  <Input value={colaborador} disabled className="bg-muted/30" />
                </div>
                <div className="space-y-2">
                  <Label>Cargo</Label>
                  <Input value={cargo} disabled className="bg-muted/30" />
                </div>
                <div className="space-y-2">
                  <Label>Avaliador(a)</Label>
                  <Input value={avaliador} disabled className="bg-muted/30" />
                </div>
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Input value={dataAvaliacao ? format(new Date(dataAvaliacao + "T00:00:00"), "dd/MM/yyyy") : ""} disabled className="bg-muted/30" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resultado Final Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">RESULTADO FINAL</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 w-52">Categoria</th>
                      <th className="text-left py-2">Competência</th>
                      <th className="text-center py-2 w-28">Atual</th>
                      <th className="text-center py-2 w-28">Projetado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CATEGORIAS.map((cat, catIdx) =>
                      cat.competencias.map((comp, compIdx) => (
                        <tr key={`${catIdx}-${compIdx}`} className="border-b border-muted/50">
                          <td className="py-2 text-xs font-medium">{compIdx === 0 ? cat.nome.replace("Competências ", "") : ""}</td>
                          <td className="py-2 text-xs">{comp.nome}</td>
                          <td className="py-2 text-center text-xs font-medium">{fmtNum(getCompetenciaMedia(comp, "atual"))}</td>
                          <td className="py-2 text-center text-xs font-medium">{fmtNum(getCompetenciaMedia(comp, "projetado"))}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between py-3 bg-primary/5 rounded-lg px-3 mt-4">
                <span className="text-sm font-bold">NOTA GERAL</span>
                <Badge className="text-base px-4 py-1">{fmtNum(notaGeral)}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Radar Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Roda das Competências - Atual e Projetada</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                    <PolarGrid />
                    <PolarAngleAxis dataKey="competencia" tick={{ fontSize: 9 }} />
                    <PolarRadiusAxis angle={90} domain={[0, 5]} tick={{ fontSize: 8 }} />
                    <Radar name="Atual" dataKey="atual" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                    <Radar name="Projetado" dataKey="projetado" stroke="hsl(var(--success))" fill="hsl(var(--success))" fillOpacity={0.2} />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Pontos Fortes & Oportunidades */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Pontos Fortes</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea value={pontosFortes} onChange={e => setPontosFortes(e.target.value)} rows={4} placeholder="Descreva os pontos fortes do colaborador..." />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Oportunidades de Desenvolvimento</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea value={oportunidades} onChange={e => setOportunidades(e.target.value)} rows={4} placeholder="Descreva as oportunidades de desenvolvimento..." />
              </CardContent>
            </Card>
          </div>

          {/* Ações de Desenvolvimento */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Competência-Alvo / Ação de Desenvolvimento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {acoes.map((acao, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Input
                      placeholder="Competência-alvo"
                      value={acao.competencia}
                      onChange={e => {
                        const next = [...acoes];
                        next[idx].competencia = e.target.value;
                        setAcoes(next);
                      }}
                    />
                    <Input
                      placeholder="Ação de desenvolvimento"
                      value={acao.acao}
                      onChange={e => {
                        const next = [...acoes];
                        next[idx].acao = e.target.value;
                        setAcoes(next);
                      }}
                    />
                    <Input
                      placeholder="Prazo"
                      value={acao.prazo}
                      onChange={e => {
                        const next = [...acoes];
                        next[idx].prazo = e.target.value;
                        setAcoes(next);
                      }}
                    />
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAcoes([...acoes, { competencia: "", acao: "", prazo: "" }])}
                >
                  + Adicionar Ação
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Feedback */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Feedback</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea value={feedback} onChange={e => setFeedback(e.target.value)} rows={4} placeholder="Feedback geral..." />
            </CardContent>
          </Card>

          {/* Confidentiality + Save + Export */}
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground italic mb-4">
                Este formulário destina-se à avaliação do desempenho por competência e deverá ser tratado de forma confidencial.
              </p>
              <div className="flex gap-3 flex-wrap">
                <Button onClick={handleSalvar} disabled={saving} variant="success" className="gap-2">
                  <Save className="h-4 w-4" />
                  {saving ? "Salvando..." : "Salvar Avaliação"}
                </Button>
                <Button onClick={handleExportPDIPDF} variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  Exportar PDI em PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── HISTÓRICO ─── */}
        <TabsContent value="historico" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <List className="h-5 w-5 text-primary" />
                Avaliações Aplicadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-end mb-4">
                <Button onClick={handleExportRelatorioAvaliacoes} variant="outline" size="sm" className="gap-2">
                  <Download className="h-4 w-4" />
                  Exportar Relatório PDF
                </Button>
              </div>

              {loadingHistorico ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : historico.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhuma avaliação salva.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Colaborador</th>
                        <th className="text-left py-2">Cargo</th>
                        <th className="text-left py-2">Avaliador</th>
                        <th className="text-center py-2">Data</th>
                        <th className="text-center py-2">Nota Geral</th>
                        <th className="text-center py-2">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historico.map(h => (
                        <tr key={h.id} className="border-b border-muted/50 hover:bg-muted/30">
                          <td className="py-2 font-medium">{h.colaborador}</td>
                          <td className="py-2 text-muted-foreground">{h.cargo || "—"}</td>
                          <td className="py-2">{h.avaliador}</td>
                          <td className="py-2 text-center">
                            {h.data_avaliacao ? format(new Date(h.data_avaliacao + "T00:00:00"), "dd/MM/yyyy") : "—"}
                          </td>
                          <td className="py-2 text-center">
                            <Badge variant={
                              h.nota_geral !== null && h.nota_geral !== undefined
                                ? Number(h.nota_geral) >= 4 ? "default" : Number(h.nota_geral) >= 2.5 ? "secondary" : "destructive"
                                : "outline"
                            }>
                              {h.nota_geral !== null && h.nota_geral !== undefined ? Number(h.nota_geral).toFixed(2) : "—"}
                            </Badge>
                          </td>
                          <td className="py-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button variant="ghost" size="icon-sm" onClick={() => handleViewAvaliacao(h)} title="Visualizar">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon-sm" onClick={() => handleExportRelatorioCompleto(h)} title="Exportar Relatório Completo PDF">
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Dialog de detalhes da avaliação salva ── */}
      <Dialog open={!!viewingAvaliacao} onOpenChange={() => setViewingAvaliacao(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Avaliação - {viewingAvaliacao?.colaborador}</DialogTitle>
          </DialogHeader>
          {viewingAvaliacao && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><strong>Colaborador:</strong> {viewingAvaliacao.colaborador}</div>
                <div><strong>Cargo:</strong> {viewingAvaliacao.cargo || "—"}</div>
                <div><strong>Avaliador:</strong> {viewingAvaliacao.avaliador}</div>
                <div><strong>Data:</strong> {viewingAvaliacao.data_avaliacao ? format(new Date(viewingAvaliacao.data_avaliacao + "T00:00:00"), "dd/MM/yyyy") : "—"}</div>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold mb-2">Médias por Categoria</h4>
                {viewingAvaliacao.medias_categorias && typeof viewingAvaliacao.medias_categorias === "object" && (
                  <div className="space-y-1">
                    {Object.entries(viewingAvaliacao.medias_categorias as Record<string, any>).map(([cat, val]: [string, any]) => (
                      <div key={cat} className="flex justify-between text-sm border-b border-muted/30 py-1">
                        <span>{cat.replace("Competências ", "")}</span>
                        <div className="flex gap-4">
                          <span>Atual: {val?.atual !== null ? Number(val.atual).toFixed(2) : "—"}</span>
                          <span>Proj.: {val?.projetado !== null ? Number(val.projetado).toFixed(2) : "—"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex justify-between font-bold mt-2 text-sm bg-primary/5 rounded px-2 py-1">
                  <span>NOTA GERAL</span>
                  <span>{viewingAvaliacao.nota_geral !== null ? Number(viewingAvaliacao.nota_geral).toFixed(2) : "—"}</span>
                </div>
              </div>

              {viewingAvaliacao.pontos_fortes && (
                <div>
                  <h4 className="font-semibold text-sm">Pontos Fortes</h4>
                  <p className="text-sm text-muted-foreground">{viewingAvaliacao.pontos_fortes}</p>
                </div>
              )}

              {viewingAvaliacao.oportunidades && (
                <div>
                  <h4 className="font-semibold text-sm">Oportunidades de Desenvolvimento</h4>
                  <p className="text-sm text-muted-foreground">{viewingAvaliacao.oportunidades}</p>
                </div>
              )}

              {viewingAvaliacao.acoes_desenvolvimento && Array.isArray(viewingAvaliacao.acoes_desenvolvimento) && viewingAvaliacao.acoes_desenvolvimento.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm">Competências-Alvo / Ações</h4>
                  <div className="space-y-1">
                    {(viewingAvaliacao.acoes_desenvolvimento as AcaoDesenvolvimento[]).map((a, i) => (
                      <div key={i} className="text-sm border-b border-muted/30 py-1">
                        <strong>{a.competencia}</strong> → {a.acao} {a.prazo && `(Prazo: ${a.prazo})`}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {viewingAvaliacao.feedback && (
                <div>
                  <h4 className="font-semibold text-sm">Feedback</h4>
                  <p className="text-sm text-muted-foreground">{viewingAvaliacao.feedback}</p>
                </div>
              )}

              <Separator />
              <Button onClick={() => handleExportRelatorioCompleto(viewingAvaliacao)} variant="outline" className="gap-2 w-full">
                <Download className="h-4 w-4" />
                Exportar Relatório Completo (Avaliação + PDI)
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
