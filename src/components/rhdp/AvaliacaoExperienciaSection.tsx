import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, FileDown, Eye, ClipboardCheck, Pencil, Trash2 } from "lucide-react";
import { createStandardPdf, savePdfWithFooter } from "@/lib/export-utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const COMPETENCIAS = [
  {
    id: "assiduidade",
    titulo: "1. ASSIDUIDADE",
    opcoes: [
      { value: "excelente", label: "Excelente", desc: "Sempre presente e pontual, nunca ultrapassa os horários estabelecidos." },
      { value: "bom", label: "Bom", desc: "Geralmente cumpre o horário com poucas ou nenhuma falta ou atraso justificado." },
      { value: "regular", label: "Regular", desc: "Apresenta ausências ou atrasos ocasionais, mas sem comprometer as atividades." },
      { value: "insatisfatorio", label: "Insatisfatório", desc: "Frequentemente ausente ou atrasado, comprometendo o andamento das atividades." },
    ],
  },
  {
    id: "disciplina",
    titulo: "2. DISCIPLINA",
    opcoes: [
      { value: "excelente", label: "Excelente", desc: "Cumpre rigorosamente todas as normas e procedimentos, além de influenciar positivamente os colegas." },
      { value: "bom", label: "Bom", desc: "Respeita as normas e procedimentos da instituição de forma satisfatória." },
      { value: "regular", label: "Regular", desc: "Demonstra alguma dificuldade em seguir normas e procedimentos de forma consistente." },
      { value: "insatisfatorio", label: "Insatisfatório", desc: "Frequentemente descumpre normas e procedimentos, gerando impacto negativo." },
    ],
  },
  {
    id: "iniciativa",
    titulo: "3. INICIATIVA",
    descricao: "Avalie a capacidade do colaborador em adotar providências adequadas em situações não definidas pela chefia ou não previstas nos procedimentos estabelecidos.",
    opcoes: [
      { value: "excelente", label: "Excelente", desc: "Sempre toma iniciativa, busca soluções inovadoras e se antecipa às necessidades do setor." },
      { value: "bom", label: "Bom", desc: "Demonstra proatividade e resolve problemas quando necessário, mesmo sem orientação direta." },
      { value: "regular", label: "Regular", desc: "Tem iniciativa limitada, geralmente age apenas com supervisão." },
      { value: "insatisfatorio", label: "Insatisfatório", desc: "Não toma iniciativa, aguardando sempre orientações para resolver problemas." },
    ],
  },
  {
    id: "produtividade",
    titulo: "4. PRODUTIVIDADE",
    descricao: "Avalie o volume e a qualidade do trabalho do colaborador dentro do intervalo de tempo estabelecido, considerando prazos e resultados.",
    opcoes: [
      { value: "excelente", label: "Excelente", desc: "Supera as expectativas em volume e qualidade, entregando antes do prazo." },
      { value: "bom", label: "Bom", desc: "Atende aos prazos e padrões de qualidade com regularidade." },
      { value: "regular", label: "Regular", desc: "Cumpre o volume de trabalho, mas com qualidade ou prazos abaixo do esperado." },
      { value: "insatisfatorio", label: "Insatisfatório", desc: "Não atinge o volume ou qualidade esperados, impactando as metas da unidade." },
    ],
  },
  {
    id: "responsabilidade",
    titulo: "5. RESPONSABILIDADE",
    descricao: "Avalie o comprometimento do colaborador com suas tarefas e com as metas estabelecidas pela Direção, demonstrando a responsabilidade pelo cumprimento dos objetivos.",
    opcoes: [
      { value: "excelente", label: "Excelente", desc: "Sempre demonstra alto nível de comprometimento, cumpre prazos rigorosamente e excede as expectativas ao alinhar suas ações com as metas da Direção." },
      { value: "bom", label: "Bom", desc: "Demonstra comprometimento consistente, cumpre prazos e alinha suas ações com as metas da Direção na maioria das vezes." },
      { value: "regular", label: "Regular", desc: "Demonstra algum nível de comprometimento, mas ocasionalmente não cumpre prazos ou precisa de ajustes para alinhar suas ações com as metas da Direção." },
      { value: "insatisfatorio", label: "Insatisfatório", desc: "Comprometimento insuficiente, frequentemente não cumpre prazos e não alinha suas ações com as metas da Direção." },
    ],
  },
];

const NOTA_MAP: Record<string, number> = { excelente: 4, bom: 3, regular: 2, insatisfatorio: 1 };
const LABEL_MAP: Record<string, string> = { excelente: "Excelente", bom: "Bom", regular: "Regular", insatisfatorio: "Insatisfatório" };

interface AvaliacaoExperiencia {
  id: string;
  periodo_avaliacao: string;
  colaborador_nome: string;
  setor: string | null;
  funcao: string | null;
  data_admissao: string;
  data_termino_experiencia: string | null;
  data_avaliacao: string;
  avaliador_nome: string;
  assiduidade: string;
  disciplina: string;
  iniciativa: string;
  produtividade: string;
  responsabilidade: string;
  competencias_destaque: string | null;
  competencias_ajustes: string | null;
  acoes_adequacao: string | null;
  outros_comentarios: string | null;
  resultado: string;
  created_at: string;
}

// ==================== PDF EXPORT (fidedigno ao FORM.RH.009) ====================

const addFormHeader = (doc: jsPDF, pageNum: number, totalPages: number, logoImg: HTMLImageElement | null) => {
  const pw = doc.internal.pageSize.width;
  const margin = 14;

  // Border rectangle for header
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.rect(margin, 8, pw - margin * 2, 22);

  // Logo area (left)
  if (logoImg) {
    try {
      doc.addImage(logoImg, 'JPEG', margin + 2, 10, 28, 14);
    } catch {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('GRUPO CHAVANTES', margin + 4, 18);
    }
  } else {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('GRUPO CHAVANTES', margin + 4, 18);
  }

  // Vertical lines
  doc.line(margin + 32, 8, margin + 32, 30);
  doc.line(pw - margin - 50, 8, pw - margin - 50, 30);

  // Center: document info
  const centerX = (margin + 32 + pw - margin - 50) / 2;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Tipo do documento: Formulários / Impressos', centerX, 14, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('FORM.RH.009 - AVALIAÇÃO DE EXPERIÊNCIA', centerX, 20, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Título do documento', centerX, 26, { align: 'center' });

  // Right: version info
  const rightX = pw - margin - 25;
  doc.setFontSize(7);
  doc.text('UPA.NS.FOR.IMP.0046', rightX, 13, { align: 'center' });
  doc.text(`Página ${pageNum} de ${totalPages}`, rightX, 18, { align: 'center' });
  doc.text('Emissão: 30/07/2025', rightX, 23, { align: 'center' });
  doc.text('Versão: 1', rightX, 28, { align: 'center' });
};

const addElaboradorFooter = (doc: jsPDF) => {
  const pw = doc.internal.pageSize.width;
  const ph = doc.internal.pageSize.height;
  const y = ph - 25;
  const margin = 14;
  const colW = (pw - margin * 2) / 3;

  doc.setDrawColor(0);
  doc.setLineWidth(0.3);
  doc.rect(margin, y, pw - margin * 2, 18);
  doc.line(margin + colW, y, margin + colW, y + 18);
  doc.line(margin + colW * 2, y, margin + colW * 2, y + 18);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('Elaborador:', margin + 3, y + 5);
  doc.text('Revisor:', margin + colW + 3, y + 5);
  doc.text('Aprovador:', margin + colW * 2 + 3, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.text('Nayara Isabel Campos Ribeiro', margin + 3, y + 11);
  doc.text('Camilla Thaysa de Mesquita', margin + colW + 3, y + 11);
  doc.text('Máximo Lima', margin + colW * 2 + 3, y + 11);
};

const handleExportPDFFidedigno = async (av: AvaliacaoExperiencia) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.width;
  const ph = doc.internal.pageSize.height;
  const margin = 12;
  const contentWidth = pw - margin * 2;

  // Load logo
  const logoImg = await new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = '/assets/logo-gestrategic.jpg';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
  });

  const totalPages = 2;

  // ===================== PAGE 1 (FRENTE) =====================
  addFormHeader(doc, 1, totalPages, logoImg);

  let y = 34;

  // Title
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('FORM.RH.009 - AVALIAÇÃO DE EXPERIÊNCIA', pw / 2, y, { align: 'center' });
  y += 6;

  // Período
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  const periodo45 = av.periodo_avaliacao === '45_dias' ? '(X)' : '(  )';
  const periodo90 = av.periodo_avaliacao === '90_dias' ? '(X)' : '(  )';
  doc.text(`PERÍODO DE AVALIAÇÃO: ${periodo45} 45 DIAS    ${periodo90} 90 DIAS`, margin, y);
  y += 6;

  // Dados do colaborador - compact fields
  doc.setLineWidth(0.3);
  doc.setDrawColor(0);

  const drawField = (label: string, value: string, x: number, yPos: number, width: number, h: number = 8) => {
    doc.rect(x, yPos, width, h);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.text(label, x + 1.5, yPos + 3);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(value || '', x + 1.5, yPos + 6.5);
  };

  // Row 1: Nome / Setor / Função
  const col1W = contentWidth * 0.5;
  const col2W = contentWidth * 0.25;
  const col3W = contentWidth * 0.25;
  drawField('Nome do Colaborador:', av.colaborador_nome, margin, y, col1W);
  drawField('Setor:', av.setor || '', margin + col1W, y, col2W);
  drawField('Função:', av.funcao || '', margin + col1W + col2W, y, col3W);
  y += 8;

  // Row 2: Datas
  const col3EqW = contentWidth / 3;
  drawField('Data de Admissão:', format(new Date(av.data_admissao + 'T12:00:00'), 'dd/MM/yyyy'), margin, y, col3EqW);
  drawField('Término Experiência:', av.data_termino_experiencia ? format(new Date(av.data_termino_experiencia + 'T12:00:00'), 'dd/MM/yyyy') : '', margin + col3EqW, y, col3EqW);
  drawField('Data da Avaliação:', format(new Date(av.data_avaliacao + 'T12:00:00'), 'dd/MM/yyyy'), margin + col3EqW * 2, y, col3EqW);
  y += 8;

  // Row 3: Avaliador
  drawField('Nome do Avaliador:', av.avaliador_nome, margin, y, contentWidth);
  y += 10;

  // Intro text - compact
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  const introText = 'A presente avaliação tem por finalidade subsidiar ações de gestão, feedback e desenvolvimento do novo colaborador em seu período de experiência. O instrumento consiste em itens que compõem as competências individuais, comportamentais e institucionais essenciais para trabalhar na UPA Antonio Jose dos Santos. Os itens serão avaliados com os seguintes critérios: Excelente, Bom, Regular e Insatisfatório.';
  const introLines = doc.splitTextToSize(introText, contentWidth);
  doc.text(introLines, margin, y);
  y += introLines.length * 3 + 4;

  // Compact competency drawing for all 5 on page 1
  const drawCompetenciaCompact = (comp: typeof COMPETENCIAS[0], selectedValue: string, startY: number): number => {
    let cy = startY;

    // Title
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(comp.titulo, margin, cy);
    cy += 4;

    // Description if exists - compact
    if (comp.descricao) {
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'italic');
      const descLines = doc.splitTextToSize(comp.descricao, contentWidth);
      doc.text(descLines, margin, cy);
      cy += descLines.length * 2.8 + 1;
    }

    // Options - inline compact
    doc.setFontSize(7);
    for (const op of comp.opcoes) {
      const marker = op.value === selectedValue ? '(X)' : '(  )';
      doc.setFont('helvetica', 'bold');
      const optText = `${marker} ${op.label}: `;
      doc.text(optText, margin, cy);
      const optTextWidth = doc.getTextWidth(optText);
      doc.setFont('helvetica', 'normal');
      const descLines = doc.splitTextToSize(op.desc, contentWidth - optTextWidth - 2);
      doc.text(descLines, margin + optTextWidth, cy);
      cy += descLines.length * 2.8 + 1.2;
    }

    return cy + 2;
  };

  // All 5 competencies on page 1
  for (const comp of COMPETENCIAS) {
    y = drawCompetenciaCompact(comp, (av as any)[comp.id], y);
  }

  // Footer page 1
  addElaboradorFooter(doc);

  // ===================== PAGE 2 (VERSO) =====================
  doc.addPage();
  addFormHeader(doc, 2, totalPages, logoImg);
  y = 34;

  // Title
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('FORM.RH.009 - AVALIAÇÃO DE EXPERIÊNCIA', pw / 2, y, { align: 'center' });
  y += 8;

  // Open-ended questions with boxes - compact
  const drawOpenQuestion = (question: string, answer: string, startY: number, boxHeight: number = 18): number => {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    const qLines = doc.splitTextToSize(question, contentWidth);
    doc.text(qLines, margin, startY);
    startY += qLines.length * 3.5 + 1;
    doc.setDrawColor(0);
    doc.setLineWidth(0.3);
    doc.rect(margin, startY, contentWidth, boxHeight);
    if (answer) {
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(answer, contentWidth - 4);
      doc.text(lines, margin + 2, startY + 4);
    }
    return startY + boxHeight + 4;
  };

  y = drawOpenQuestion('Qual(is) as competências ou aspectos de destaque do colaborador(a)?', av.competencias_destaque || '', y, 20);
  y = drawOpenQuestion('Qual(is) competências ou aspectos com necessidade de ajustes/melhorias do colaborador(a)?', av.competencias_ajustes || '', y, 20);
  y = drawOpenQuestion('O que deve ser realizado para que o colaborador(a) possa se adequar as competências da instituição?', av.acoes_adequacao || '', y, 20);
  y = drawOpenQuestion('Outros comentários e sugestões:', av.outros_comentarios || '', y, 20);

  // Resultado
  y += 2;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  const aprovadoMark = av.resultado === 'aprovado' ? '(X)' : '(  )';
  const reprovadoMark = av.resultado === 'reprovado' ? '(X)' : '(  )';
  doc.text('A AVALIAÇÃO DE EXPERIÊNCIA DO COLABORADOR FOI CONSIDERADA APROVADA?', margin, y);
  y += 6;
  doc.setFontSize(9);
  doc.text(`${aprovadoMark} APROVADO        ${reprovadoMark} REPROVADO`, margin, y);
  y += 12;

  // Signatures
  const sigWidth = 70;
  const sigLeftX = margin + 8;
  const sigRightX = pw - margin - sigWidth - 8;

  doc.setLineWidth(0.4);
  doc.line(sigLeftX, y, sigLeftX + sigWidth, y);
  doc.line(sigRightX, y, sigRightX + sigWidth, y);
  y += 4;

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('Assinatura do(a) Avaliador(a)', sigLeftX, y);
  doc.text('Assinatura do Avaliado(a)', sigRightX, y);
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.text(av.avaliador_nome, sigLeftX, y);
  doc.text(av.colaborador_nome, sigRightX, y);

  // Footer page 2
  addElaboradorFooter(doc);

  // LGPD footer on all pages
  const pageCount = doc.getNumberOfPages();
  const lgpdText = 'Este relatório contém dados tratados em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018). O conteúdo é estritamente confidencial e destinado apenas ao uso autorizado.';
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    const splitLgpd = doc.splitTextToSize(lgpdText, contentWidth);
    doc.text(splitLgpd, margin, ph - 7);
    doc.setTextColor(0, 0, 0);
  }

  doc.save(`FORM_RH_009_${av.colaborador_nome.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};

// ==================== COMPONENT ====================

export const AvaliacaoExperienciaSection = () => {
  const [subTab, setSubTab] = useState("formulario");
  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoExperiencia[]>([]);
  const [selectedAv, setSelectedAv] = useState<AvaliacaoExperiencia | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleteConfirmAv, setDeleteConfirmAv] = useState<AvaliacaoExperiencia | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [periodo, setPeriodo] = useState("");
  const [colaborador, setColaborador] = useState("");
  const [setor, setSetor] = useState("");
  const [funcao, setFuncao] = useState("");
  const [dataAdmissao, setDataAdmissao] = useState("");
  const [dataTermino, setDataTermino] = useState("");
  const [dataAvaliacao, setDataAvaliacao] = useState(format(new Date(), "yyyy-MM-dd"));
  const [avaliador, setAvaliador] = useState("");
  const [scores, setScores] = useState<Record<string, string>>({});
  const [destaque, setDestaque] = useState("");
  const [ajustes, setAjustes] = useState("");
  const [acoes, setAcoes] = useState("");
  const [comentarios, setComentarios] = useState("");
  const [resultado, setResultado] = useState("");

  const fetchAvaliacoes = async () => {
    const { data } = await supabase
      .from("avaliacoes_experiencia")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setAvaliacoes(data as unknown as AvaliacaoExperiencia[]);
  };

  useEffect(() => {
    fetchAvaliacoes();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setPeriodo(""); setColaborador(""); setSetor(""); setFuncao("");
    setDataAdmissao(""); setDataTermino(""); setDataAvaliacao(format(new Date(), "yyyy-MM-dd"));
    setAvaliador(""); setScores({}); setDestaque(""); setAjustes("");
    setAcoes(""); setComentarios(""); setResultado("");
  };

  const loadForEdit = (av: AvaliacaoExperiencia) => {
    setEditingId(av.id);
    setPeriodo(av.periodo_avaliacao);
    setColaborador(av.colaborador_nome);
    setSetor(av.setor || "");
    setFuncao(av.funcao || "");
    setDataAdmissao(av.data_admissao);
    setDataTermino(av.data_termino_experiencia || "");
    setDataAvaliacao(av.data_avaliacao);
    setAvaliador(av.avaliador_nome);
    setScores({
      assiduidade: av.assiduidade,
      disciplina: av.disciplina,
      iniciativa: av.iniciativa,
      produtividade: av.produtividade,
      responsabilidade: av.responsabilidade,
    });
    setDestaque(av.competencias_destaque || "");
    setAjustes(av.competencias_ajustes || "");
    setAcoes(av.acoes_adequacao || "");
    setComentarios(av.outros_comentarios || "");
    setResultado(av.resultado);
    setSelectedAv(null);
    setSubTab("formulario");
  };

  const allCompetenciasFilled = COMPETENCIAS.every(c => scores[c.id]);

  const handleSalvar = async () => {
    if (!periodo || !colaborador || !dataAdmissao || !avaliador || !allCompetenciasFilled || !resultado) {
      toast.error("Preencha todos os campos obrigatórios e todas as competências.");
      return;
    }
    setLoading(true);

    const payload = {
      periodo_avaliacao: periodo,
      colaborador_nome: colaborador,
      setor: setor || null,
      funcao: funcao || null,
      data_admissao: dataAdmissao,
      data_termino_experiencia: dataTermino || null,
      data_avaliacao: dataAvaliacao,
      avaliador_nome: avaliador,
      assiduidade: scores.assiduidade,
      disciplina: scores.disciplina,
      iniciativa: scores.iniciativa,
      produtividade: scores.produtividade,
      responsabilidade: scores.responsabilidade,
      competencias_destaque: destaque || null,
      competencias_ajustes: ajustes || null,
      acoes_adequacao: acoes || null,
      outros_comentarios: comentarios || null,
      resultado,
    } as any;

    let error;
    if (editingId) {
      ({ error } = await supabase.from("avaliacoes_experiencia").update(payload).eq("id", editingId));
    } else {
      ({ error } = await supabase.from("avaliacoes_experiencia").insert(payload));
    }

    setLoading(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      toast.success(editingId ? "Avaliação atualizada com sucesso!" : "Avaliação de experiência salva com sucesso!");
      resetForm();
      fetchAvaliacoes();
      setSubTab("historico");
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmAv) return;
    setIsDeleting(true);
    const { error } = await supabase.from("avaliacoes_experiencia").delete().eq("id", deleteConfirmAv.id);
    setIsDeleting(false);
    if (error) {
      toast.error("Erro ao excluir: " + error.message);
    } else {
      toast.success("Avaliação excluída com sucesso!");
      setDeleteConfirmAv(null);
      fetchAvaliacoes();
    }
  };

  return (
    <div className="space-y-4">
      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="formulario" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            {editingId ? "Editando Avaliação" : "Nova Avaliação"}
          </TabsTrigger>
          <TabsTrigger value="historico" className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" />
            Avaliações Realizadas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="formulario" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {editingId ? "Editar Avaliação de Experiência" : "FORM.RH.009 - AVALIAÇÃO DE EXPERIÊNCIA"}
                </CardTitle>
                {editingId && (
                  <Button variant="outline" size="sm" onClick={resetForm}>Cancelar Edição</Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Dados do colaborador */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label>Período de Avaliação *</Label>
                  <Select value={periodo} onValueChange={setPeriodo}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="45_dias">45 Dias</SelectItem>
                      <SelectItem value="90_dias">90 Dias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Nome do Colaborador *</Label>
                  <Input value={colaborador} onChange={e => setColaborador(e.target.value)} />
                </div>
                <div>
                  <Label>Setor</Label>
                  <Input value={setor} onChange={e => setSetor(e.target.value)} />
                </div>
                <div>
                  <Label>Função</Label>
                  <Input value={funcao} onChange={e => setFuncao(e.target.value)} />
                </div>
                <div>
                  <Label>Data de Admissão *</Label>
                  <Input type="date" value={dataAdmissao} onChange={e => setDataAdmissao(e.target.value)} />
                </div>
                <div>
                  <Label>Data Término Experiência</Label>
                  <Input type="date" value={dataTermino} onChange={e => setDataTermino(e.target.value)} />
                </div>
                <div>
                  <Label>Data da Avaliação *</Label>
                  <Input type="date" value={dataAvaliacao} onChange={e => setDataAvaliacao(e.target.value)} />
                </div>
                <div>
                  <Label>Nome do Avaliador *</Label>
                  <Input value={avaliador} onChange={e => setAvaliador(e.target.value)} />
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                A presente avaliação tem por finalidade subsidiar ações de gestão, feedback e desenvolvimento do novo colaborador em seu período de experiência. O instrumento consiste em itens que compõem as competências individuais, comportamentais e institucionais essenciais para trabalhar na UPA Antonio Jose dos Santos. Os itens serão avaliados com os seguintes critérios: Excelente, Bom, Regular e Insatisfatório.
              </p>

              {/* Competências */}
              {COMPETENCIAS.map(comp => (
                <Card key={comp.id} className="border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">{comp.titulo}</CardTitle>
                    {comp.descricao && <p className="text-xs text-muted-foreground">{comp.descricao}</p>}
                  </CardHeader>
                  <CardContent>
                    <RadioGroup
                      value={scores[comp.id] || ""}
                      onValueChange={v => setScores(prev => ({ ...prev, [comp.id]: v }))}
                      className="space-y-2"
                    >
                      {comp.opcoes.map(op => (
                        <div key={op.value} className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50">
                          <RadioGroupItem value={op.value} id={`${comp.id}-${op.value}`} className="mt-1" />
                          <Label htmlFor={`${comp.id}-${op.value}`} className="cursor-pointer text-sm leading-relaxed">
                            <span className="font-medium">{op.label}:</span> {op.desc}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </CardContent>
                </Card>
              ))}

              {/* Campos descritivos */}
              <div className="space-y-4">
                <div>
                  <Label>Qual(is) as competências ou aspectos de destaque do colaborador(a)?</Label>
                  <Textarea value={destaque} onChange={e => setDestaque(e.target.value)} rows={3} />
                </div>
                <div>
                  <Label>Qual(is) competências ou aspectos com necessidade de ajustes/melhorias do colaborador(a)?</Label>
                  <Textarea value={ajustes} onChange={e => setAjustes(e.target.value)} rows={3} />
                </div>
                <div>
                  <Label>O que deve ser realizado para que o colaborador(a) possa se adequar às competências da instituição?</Label>
                  <Textarea value={acoes} onChange={e => setAcoes(e.target.value)} rows={3} />
                </div>
                <div>
                  <Label>Outros comentários e sugestões:</Label>
                  <Textarea value={comentarios} onChange={e => setComentarios(e.target.value)} rows={3} />
                </div>
              </div>

              {/* Resultado */}
              <Card className="border-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">A AVALIAÇÃO DE EXPERIÊNCIA DO COLABORADOR FOI CONSIDERADA APROVADA? *</CardTitle>
                </CardHeader>
                <CardContent>
                  <RadioGroup value={resultado} onValueChange={setResultado} className="flex gap-6">
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="aprovado" id="resultado-aprovado" />
                      <Label htmlFor="resultado-aprovado" className="cursor-pointer font-semibold text-green-600">APROVADO</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="reprovado" id="resultado-reprovado" />
                      <Label htmlFor="resultado-reprovado" className="cursor-pointer font-semibold text-destructive">REPROVADO</Label>
                    </div>
                  </RadioGroup>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button onClick={handleSalvar} disabled={loading} size="lg">
                  {loading ? "Salvando..." : editingId ? "Atualizar Avaliação" : "Salvar Avaliação"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historico" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Avaliações de Experiência Realizadas</CardTitle>
            </CardHeader>
            <CardContent>
              {avaliacoes.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Nenhuma avaliação registrada.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Colaborador</TableHead>
                        <TableHead>Período</TableHead>
                        <TableHead>Setor</TableHead>
                        <TableHead>Avaliador</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Resultado</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {avaliacoes.map(av => (
                        <TableRow key={av.id}>
                          <TableCell className="font-medium">{av.colaborador_nome}</TableCell>
                          <TableCell>{av.periodo_avaliacao === "45_dias" ? "45 Dias" : "90 Dias"}</TableCell>
                          <TableCell>{av.setor || "-"}</TableCell>
                          <TableCell>{av.avaliador_nome}</TableCell>
                          <TableCell>{format(new Date(av.data_avaliacao + "T12:00:00"), "dd/MM/yyyy")}</TableCell>
                          <TableCell>
                            <Badge variant={av.resultado === "aprovado" ? "default" : "destructive"}>
                              {av.resultado.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon-sm" onClick={() => setSelectedAv(av)} title="Visualizar">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon-sm" onClick={() => handleExportPDFFidedigno(av)} title="Exportar PDF">
                                <FileDown className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon-sm" onClick={() => loadForEdit(av)} title="Editar">
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon-sm" onClick={() => setDeleteConfirmAv(av)} title="Excluir" className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de detalhes */}
      <Dialog open={!!selectedAv} onOpenChange={() => setSelectedAv(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Avaliação de Experiência - {selectedAv?.colaborador_nome}</DialogTitle>
          </DialogHeader>
          {selectedAv && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><strong>Período:</strong> {selectedAv.periodo_avaliacao === "45_dias" ? "45 Dias" : "90 Dias"}</div>
                <div><strong>Setor:</strong> {selectedAv.setor || "-"}</div>
                <div><strong>Função:</strong> {selectedAv.funcao || "-"}</div>
                <div><strong>Avaliador:</strong> {selectedAv.avaliador_nome}</div>
                <div><strong>Data Admissão:</strong> {format(new Date(selectedAv.data_admissao + "T12:00:00"), "dd/MM/yyyy")}</div>
                <div><strong>Data Avaliação:</strong> {format(new Date(selectedAv.data_avaliacao + "T12:00:00"), "dd/MM/yyyy")}</div>
              </div>

              <div className="space-y-2">
                {COMPETENCIAS.map(c => {
                  const selectedValue = (selectedAv as any)[c.id];
                  const selectedOption = c.opcoes.find(o => o.value === selectedValue);
                  return (
                    <div key={c.id} className="border rounded-md p-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium text-sm">{c.titulo}</span>
                        <Badge variant="outline">{LABEL_MAP[selectedValue]}</Badge>
                      </div>
                      {selectedOption && (
                        <p className="text-xs text-muted-foreground">{selectedOption.desc}</p>
                      )}
                    </div>
                  );
                })}
              </div>

              {selectedAv.competencias_destaque && (
                <div><strong className="text-sm">Competências de Destaque:</strong><p className="text-sm text-muted-foreground mt-1">{selectedAv.competencias_destaque}</p></div>
              )}
              {selectedAv.competencias_ajustes && (
                <div><strong className="text-sm">Necessidade de Ajustes:</strong><p className="text-sm text-muted-foreground mt-1">{selectedAv.competencias_ajustes}</p></div>
              )}
              {selectedAv.acoes_adequacao && (
                <div><strong className="text-sm">Ações para Adequação:</strong><p className="text-sm text-muted-foreground mt-1">{selectedAv.acoes_adequacao}</p></div>
              )}
              {selectedAv.outros_comentarios && (
                <div><strong className="text-sm">Outros Comentários:</strong><p className="text-sm text-muted-foreground mt-1">{selectedAv.outros_comentarios}</p></div>
              )}

              <div className="text-center pt-4">
                <Badge variant={selectedAv.resultado === "aprovado" ? "default" : "destructive"} className="text-lg px-6 py-2">
                  {selectedAv.resultado.toUpperCase()}
                </Badge>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { loadForEdit(selectedAv); }} className="flex items-center gap-2">
                  <Pencil className="h-4 w-4" /> Editar
                </Button>
                <Button onClick={() => handleExportPDFFidedigno(selectedAv)} className="flex items-center gap-2">
                  <FileDown className="h-4 w-4" /> Exportar PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={!!deleteConfirmAv} onOpenChange={() => setDeleteConfirmAv(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Avaliação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a avaliação de experiência de <strong>{deleteConfirmAv?.colaborador_nome}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
