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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, FileDown, Eye, ClipboardCheck } from "lucide-react";
import { createStandardPdf, savePdfWithFooter } from "@/lib/export-utils";
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
    descricao: "Avalie o comprometimento do colaborador com suas tarefas e com as metas estabelecidas pela Direção.",
    opcoes: [
      { value: "excelente", label: "Excelente", desc: "Sempre demonstra alto nível de comprometimento, cumpre prazos rigorosamente e excede as expectativas." },
      { value: "bom", label: "Bom", desc: "Demonstra comprometimento consistente, cumpre prazos e alinha suas ações com as metas da Direção na maioria das vezes." },
      { value: "regular", label: "Regular", desc: "Demonstra algum nível de comprometimento, mas ocasionalmente não cumpre prazos." },
      { value: "insatisfatorio", label: "Insatisfatório", desc: "Comprometimento insuficiente, frequentemente não cumpre prazos." },
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

export const AvaliacaoExperienciaSection = () => {
  const [subTab, setSubTab] = useState("formulario");
  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoExperiencia[]>([]);
  const [selectedAv, setSelectedAv] = useState<AvaliacaoExperiencia | null>(null);
  const [loading, setLoading] = useState(false);

  // Form state
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
    setPeriodo(""); setColaborador(""); setSetor(""); setFuncao("");
    setDataAdmissao(""); setDataTermino(""); setDataAvaliacao(format(new Date(), "yyyy-MM-dd"));
    setAvaliador(""); setScores({}); setDestaque(""); setAjustes("");
    setAcoes(""); setComentarios(""); setResultado("");
  };

  const allCompetenciasFilled = COMPETENCIAS.every(c => scores[c.id]);

  const handleSalvar = async () => {
    if (!periodo || !colaborador || !dataAdmissao || !avaliador || !allCompetenciasFilled || !resultado) {
      toast.error("Preencha todos os campos obrigatórios e todas as competências.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("avaliacoes_experiencia").insert({
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
    } as any);
    setLoading(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      toast.success("Avaliação de experiência salva com sucesso!");
      resetForm();
      fetchAvaliacoes();
      setSubTab("historico");
    }
  };

  const handleExportPDF = async (av: AvaliacaoExperiencia) => {
    const { doc, logoImg } = await createStandardPdf("FORM.RH.009 - AVALIAÇÃO DE EXPERIÊNCIA", "portrait");
    let y = 30;

    // Cabeçalho info
    doc.setFontSize(9);
    doc.text(`Período: ${av.periodo_avaliacao === "45_dias" ? "45 Dias" : "90 Dias"}`, 14, y);
    doc.text(`Data da Avaliação: ${format(new Date(av.data_avaliacao + "T12:00:00"), "dd/MM/yyyy")}`, 120, y);
    y += 7;
    doc.text(`Colaborador: ${av.colaborador_nome}`, 14, y);
    doc.text(`Setor: ${av.setor || "-"}`, 120, y);
    y += 7;
    doc.text(`Função: ${av.funcao || "-"}`, 14, y);
    doc.text(`Avaliador: ${av.avaliador_nome}`, 120, y);
    y += 7;
    doc.text(`Data Admissão: ${format(new Date(av.data_admissao + "T12:00:00"), "dd/MM/yyyy")}`, 14, y);
    if (av.data_termino_experiencia) {
      doc.text(`Término Experiência: ${format(new Date(av.data_termino_experiencia + "T12:00:00"), "dd/MM/yyyy")}`, 120, y);
    }
    y += 10;

    // Tabela de competências
    const competenciaRows = COMPETENCIAS.map(c => [
      c.titulo.replace(/^\d+\.\s*/, ""),
      LABEL_MAP[(av as any)[c.id]] || (av as any)[c.id],
    ]);

    autoTable(doc, {
      startY: y,
      head: [["Competência", "Avaliação"]],
      body: competenciaRows,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [41, 128, 185] },
      margin: { left: 14, right: 14 },
    });

    y = (doc as any).lastAutoTable.finalY + 10;

    // Campos descritivos
    const descritivos = [
      { label: "Competências de Destaque", value: av.competencias_destaque },
      { label: "Competências com Necessidade de Ajustes", value: av.competencias_ajustes },
      { label: "Ações para Adequação", value: av.acoes_adequacao },
      { label: "Outros Comentários", value: av.outros_comentarios },
    ];

    for (const d of descritivos) {
      if (y > 260) { doc.addPage(); y = 20; }
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(d.label + ":", 14, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const lines = doc.splitTextToSize(d.value || "Não informado", 180);
      doc.text(lines, 14, y);
      y += lines.length * 5 + 6;
    }

    // Resultado
    if (y > 260) { doc.addPage(); y = 20; }
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    const corResultado = av.resultado === "aprovado" ? [39, 174, 96] : [231, 76, 60];
    doc.setTextColor(corResultado[0], corResultado[1], corResultado[2]);
    doc.text(`RESULTADO: ${av.resultado.toUpperCase()}`, 14, y);
    doc.setTextColor(0, 0, 0);
    y += 20;

    // Assinaturas
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.line(14, y, 90, y);
    doc.line(110, y, 196, y);
    y += 5;
    doc.text("Assinatura do(a) Avaliador(a)", 14, y);
    doc.text("Assinatura do(a) Avaliado(a)", 110, y);

    savePdfWithFooter(doc, "Avaliação de Experiência", `avaliacao_experiencia_${av.colaborador_nome}`, logoImg);
  };

  return (
    <div className="space-y-4">
      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="formulario" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nova Avaliação
          </TabsTrigger>
          <TabsTrigger value="historico" className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" />
            Avaliações Realizadas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="formulario" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">FORM.RH.009 - AVALIAÇÃO DE EXPERIÊNCIA</CardTitle>
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
                A presente avaliação tem por finalidade subsidiar ações de gestão, feedback e desenvolvimento do novo colaborador em seu período de experiência. Os itens serão avaliados com os seguintes critérios: Excelente, Bom, Regular e Insatisfatório.
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
                  <Label>Qual(is) competências ou aspectos com necessidade de ajustes/melhorias?</Label>
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
                  {loading ? "Salvando..." : "Salvar Avaliação"}
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
                              <Button variant="ghost" size="icon-sm" onClick={() => handleExportPDF(av)} title="Exportar PDF">
                                <FileDown className="h-4 w-4" />
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
                {COMPETENCIAS.map(c => (
                  <div key={c.id} className="flex justify-between items-center border-b py-2">
                    <span className="font-medium text-sm">{c.titulo}</span>
                    <Badge variant="outline">{LABEL_MAP[(selectedAv as any)[c.id]]}</Badge>
                  </div>
                ))}
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

              <div className="flex justify-end">
                <Button onClick={() => handleExportPDF(selectedAv)} className="flex items-center gap-2">
                  <FileDown className="h-4 w-4" /> Exportar PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
