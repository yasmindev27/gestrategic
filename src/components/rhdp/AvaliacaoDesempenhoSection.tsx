import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileText, BarChart3, Target, User, Calendar, Download } from "lucide-react";
import { format } from "date-fns";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from "recharts";
import { createStandardPdf, savePdfWithFooter } from "@/lib/export-utils";
import autoTable from "jspdf-autotable";

// ── Data structure ──
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

// ── Component ──
export const AvaliacaoDesempenhoSection = () => {
  const [activeTab, setActiveTab] = useState("avaliacao");

  // Header fields
  const [colaborador, setColaborador] = useState("");
  const [cargo, setCargo] = useState("");
  const [avaliador, setAvaliador] = useState("");
  const [dataAvaliacao, setDataAvaliacao] = useState(format(new Date(), "yyyy-MM-dd"));

  // Scores: { [itemId]: { atual: number, projetado: number } }
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

  const setScore = (id: string, field: "atual" | "projetado", value: number) => {
    setScores(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  // ── Computed averages ──
  const getCompetenciaMedia = (comp: Competencia, field: "atual" | "projetado") => {
    const vals = comp.itens.map(i => scores[i.id]?.[field]).filter(v => v !== undefined && v !== null) as number[];
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };

  const getCategoriaMedia = (cat: CategoriaCompetencia, field: "atual" | "projetado") => {
    const medias = cat.competencias.map(c => getCompetenciaMedia(c, field)).filter(v => v !== null) as number[];
    return medias.length > 0 ? medias.reduce((a, b) => a + b, 0) / medias.length : null;
  };

  const categoriasMedias = useMemo(() => {
    return CATEGORIAS.map(cat => ({
      nome: cat.nome.replace("Competências ", "").replace("Competências ", ""),
      atual: getCategoriaMedia(cat, "atual"),
      projetado: getCategoriaMedia(cat, "projetado"),
    }));
  }, [scores]);

  // Radar data per competência (for PDI chart)
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

  // ── PDF Export: Avaliação ──
  const handleExportAvaliacaoPDF = async () => {
    const { doc, logoImg } = await createStandardPdf("Avaliação de Desempenho por Competências", "portrait");
    const pageWidth = doc.internal.pageSize.width;
    let y = 32;

    // Info header
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Colaborador(a): ${colaborador}`, 14, y); y += 5;
    doc.text(`Cargo: ${cargo}`, 14, y); y += 5;
    doc.text(`Avaliador(a): ${avaliador}`, 14, y); y += 5;
    doc.text(`Data: ${dataAvaliacao ? format(new Date(dataAvaliacao + "T00:00:00"), "dd/MM/yyyy") : ""}`, 14, y); y += 3;

    // Legenda
    y += 4;
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("Legenda: 0=Nunca | 1=Raramente | 2=Poucas vezes | 3=Com frequência | 4=Muitas vezes | 5=Todas as vezes", 14, y);
    y += 5;

    // Each category as a table
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

    // Result table
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

  // ── PDF Export: PDI ──
  const handleExportPDIPDF = async () => {
    const { doc, logoImg } = await createStandardPdf("Plano de Desenvolvimento Individual", "portrait");
    const pageWidth = doc.internal.pageSize.width;
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

    // Ações de desenvolvimento
    const acoesFiltradas = acoes.filter(a => a.competencia || a.acao);
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
    }

    // Feedback
    if (feedback) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("FEEDBACK", 14, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      const splitFb = doc.splitTextToSize(feedback, pageWidth - 28);
      doc.text(splitFb, 14, y);
      y += splitFb.length * 4 + 8;
    }

    // Confidentiality notice
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

  // ── Score selector component ──
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
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="avaliacao" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Avaliação de Desempenho
          </TabsTrigger>
          <TabsTrigger value="pdi" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            PDI
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

              {/* Legenda */}
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
              </div>

              <Separator className="my-4" />
              <p className="text-xs text-muted-foreground italic">
                Este formulário destina-se à avaliação do desempenho por competência e deverá ser tratado de forma confidencial.
                Os resultados apresentados têm como finalidade dar suporte no desenvolvimento profissional e aprimoramento das práticas de gestão de desempenho da instituição.
              </p>

              <div className="mt-4">
                <Button onClick={handleExportAvaliacaoPDF} className="gap-2">
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

          {/* Confidentiality + Export */}
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground italic mb-4">
                Este formulário destina-se à avaliação do desempenho por competência e deverá ser tratado de forma confidencial.
                Os resultados apresentados têm como finalidade dar suporte no desenvolvimento profissional e aprimoramento das práticas de gestão de desempenho da instituição.
              </p>
              <Button onClick={handleExportPDIPDF} className="gap-2">
                <Download className="h-4 w-4" />
                Exportar PDI em PDF
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
