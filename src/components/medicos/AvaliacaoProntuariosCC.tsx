import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExportDropdown } from "@/components/ui/export-dropdown";
import { useToast } from "@/hooks/use-toast";
import {
  ClipboardCheck, BarChart3, FileText, Plus, TrendingUp,
  TrendingDown, Minus, Eye
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, LineChart, Line, Legend, PieChart, Pie, Cell
} from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { exportToCSV, createStandardPdf, savePdfWithFooter } from "@/lib/export-utils";
import autoTable from "jspdf-autotable";

// Scale labels 0-9
const SCALE_OPTIONS = [
  { value: "0", label: "0 - Registro inexistente", short: "Inexistente", tooltip: "Não há nenhum dado referente ao item avaliado no prontuário. Totalmente ausente." },
  { value: "1", label: "1 - Registro insuficiente", short: "Insuficiente", tooltip: "Palavras soltas ou termos sem sentido, impossíveis de interpretar. Sem utilidade clínica." },
  { value: "2", label: "2 - Registro muito ruim", short: "Muito ruim", tooltip: "Incompleto, confuso e sem relação clara com o quadro clínico. Compromete a segurança do paciente." },
  { value: "3", label: "3 - Registro ruim", short: "Ruim", tooltip: "Informação pobre, muito genérica ou apenas parcialmente relacionada ao caso. Não atende às exigências mínimas legais." },
  { value: "4", label: "4 - Registro insatisfatório", short: "Insatisfatório", tooltip: "Contém algum dado útil, mas ainda há grandes lacunas e não fornece segurança para a conduta ou auditoria." },
  { value: "5", label: "5 - Registro medíocre (mínimo aceitável)", short: "Medíocre", tooltip: "Contém as informações básicas necessárias, mas superficial, sem detalhes ou sem integração entre os dados. Atende apenas parcialmente às boas práticas." },
  { value: "6", label: "6 - Registro regular", short: "Regular", tooltip: "Relativamente bem feito, mas com algumas omissões importantes ou falta de detalhamento em pontos críticos. Pode dificultar a continuidade do cuidado." },
  { value: "7", label: "7 - Registro satisfatório", short: "Satisfatório", tooltip: "Cumpre os requisitos essenciais, com linguagem adequada e informações claras, mas ainda pode melhorar em completude e padronização." },
  { value: "8", label: "8 - Registro bom", short: "Bom", tooltip: "Completo na maior parte, claro, coerente e suficiente para a assistência e auditoria. Eventuais falhas menores de forma ou detalhes." },
  { value: "9", label: "9 - Registro muito bom", short: "Muito bom", tooltip: "Completo, organizado, claro, sem inconsistências, com boa lógica clínica e rastreabilidade. Apenas pequenas imperfeições formais." },
];

const SCALE_WITH_NA = [...SCALE_OPTIONS, { value: "na", label: "Não se aplica", short: "N/A", tooltip: "Este item não se aplica ao prontuário avaliado." }];

const UNIDADES = [
  "Emergência (observação vermelha)",
  "Internação (observação amarela)",
  "Observação sem leito",
];

const QUESTION_SHORT_LABELS: Record<string, string> = {
  proveniencia: "Proveniência",
  hpp: "HPP",
  exame_fisico: "Exame Físico",
  plano_terapeutico: "Plano Terapêutico",
  metas_terapeuticas: "Metas Terapêuticas",
  plano_alta: "Plano de Alta",
};

const QUESTIONS = [
  {
    id: "proveniencia",
    number: 5,
    title: "No prontuário do paciente está descrita a sua proveniência (SAMU, COBOM, Polícia Militar, Concessionária Way, transferência de outra unidade hospitalar ou encaminhamento do PSF)?",
    description: "",
    criteria: [],
    example: "",
    hasNA: true,
  },
  {
    id: "hpp",
    number: 6,
    title: "Como você avalia a descrição da História Patológica Pregressa (HPP):",
    description: "",
    criteria: [
      "Se há registro de doenças crônicas (hipertensão, diabetes, cardiopatias, nefropatias, etc.).",
      "Se há histórico de cirurgias ou internações anteriores.",
      "Uso atual de medicamentos e alergias.",
      "Histórico ginecológico/obstétrico (quando aplicável).",
      "Comportamentos de risco (tabagismo, etilismo, uso de drogas, etc.) e história familiar relevante.",
    ],
    example: "\"HAS e DM2 há 10 anos. Uso regular de metformina e losartana. Alergia a dipirona. Tabagista até 2018.\"",
    hasNA: false,
  },
  {
    id: "exame_fisico",
    number: 7,
    title: "Como você avalia a descrição do exame físico:",
    description: "",
    criteria: [
      "Todos os sistemas pertinentes à queixa e HDA foram devidamente examinados.",
      "O exame físico está coerente com os dados da anamnese (por exemplo, se há dor torácica, deve haver avaliação cardíaca e pulmonar).",
      "Se há ausência de contradições entre sinais vitais e estado geral (ex.: PA gravemente alterada sem qualquer outra observação).",
      "Se as alterações encontradas no exame foram descritas com precisão (tipo, localização, intensidade).",
    ],
    example: "\"Paciente consciente, orientado. PA: 130x85 mmHg, FC: 88 bpm, SpO₂: 96% em ar ambiente. Pulmões com murmúrio vesicular diminuído em base direita. Abdome flácido, doloroso em FID, sem sinais de irritação peritoneal.\"",
    hasNA: false,
  },
  {
    id: "plano_terapeutico",
    number: 8,
    title: "Como você avalia a descrição do Plano Terapêutico:",
    description: "",
    criteria: [
      "O plano proposto está alinhado à hipótese diagnóstica confirmada ou em investigação.",
      "O tratamento é compatível com a gravidade do caso e com os achados do exame clínico/laboratorial.",
      "Se há justificativas clínicas para condutas terapêuticas específicas (ex: uso de antibióticos, suporte ventilatório, hemodiálise etc.).",
    ],
    example: "\"Iniciar ceftriaxona 1g 12/12h por 7 dias, considerando diagnóstico de pneumonia comunitária. Suporte hídrico e analgesia conforme dor.\"",
    hasNA: true,
  },
  {
    id: "metas_terapeuticas",
    number: 9,
    title: "Como você avalia a descrição das Metas Terapêuticas:",
    description: "O plano descreve objetivos clínicos mensuráveis, como:",
    criteria: [
      "Controle glicêmico (ex: manter glicemia < 180 mg/dL)",
      "Estabilização hemodinâmica",
      "Redução de marcadores inflamatórios",
      "Melhora da função respiratória",
      "Se o acompanhamento é descrito, com previsão de reavaliações clínicas ou laboratoriais.",
    ],
    example: "\"Objetivo: redução da PCR e febre em 48h; reavaliar antibiótico após nova radiografia.\"",
    hasNA: true,
  },
  {
    id: "plano_alta",
    number: 10,
    title: "Como você avalia a descrição do Plano de alta médica:",
    description: "",
    criteria: [
      "O plano descreve os critérios clínicos que justificaram a alta (ex: estabilidade clínica, conclusão do tratamento, ausência de febre há 48h, função renal controlada).",
      "Se há resumo do tratamento realizado durante a internação, facilitando a continuidade do cuidado.",
    ],
    example: "\"Paciente em estabilidade clínica, sem febre há 72h, com boa aceitação de dieta oral e controle de PA. Concluiu antibiótico por 10 dias.\"",
    hasNA: false,
  },
];

const SATISFACAO_OPTIONS = Array.from({ length: 10 }, (_, i) => ({
  value: String(i + 1),
  label: String(i + 1),
}));

// ============ FORM COMPONENT ============
const FormularioAvaliacao = ({ onSuccess }: { onSuccess: () => void }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState("");

  const [form, setForm] = useState({
    mes_avaliacao: "",
    paciente_iniciais: "",
    numero_prontuario: "",
    unidade_atendimento: "",
    respostas: {} as Record<string, string>,
    satisfacao_geral: "",
    observacoes: "",
  });

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", user.id)
          .single();
        if (profile) setUserName(profile.full_name || user.email || "");
      }
    };
    fetchUser();
  }, []);

  const submitMutation = useMutation({
    mutationFn: async () => {
      // Validate required fields
      if (!form.mes_avaliacao || !form.paciente_iniciais || !form.numero_prontuario || !form.unidade_atendimento) {
        throw new Error("Preencha todos os campos obrigatórios (mês, iniciais, prontuário e unidade).");
      }

      const questionIds = QUESTIONS.map(q => q.id);
      const missingQuestions = questionIds.filter(id => !form.respostas[id]);
      if (missingQuestions.length > 0) {
        throw new Error("Preencha todas as questões de avaliação (perguntas 5 a 10).");
      }
      if (!form.satisfacao_geral) {
        throw new Error("Informe o nível de satisfação geral.");
      }

      const { error } = await supabase.from("auditorias_seguranca_paciente").insert({
        tipo: "prontuario_qualitativa_cc",
        setor: form.unidade_atendimento,
        data_auditoria: new Date().toISOString().split("T")[0],
        auditor_id: userId,
        auditor_nome: userName,
        mes_avaliacao: form.mes_avaliacao,
        paciente_iniciais: form.paciente_iniciais,
        numero_prontuario: form.numero_prontuario,
        unidade_atendimento: form.unidade_atendimento,
        satisfacao_geral: parseInt(form.satisfacao_geral),
        observacoes: form.observacoes || null,
        respostas: form.respostas,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["avaliacoes_cc"] });
      toast({ title: "Sucesso", description: "Avaliação registrada com sucesso!" });
      setForm({
        mes_avaliacao: "",
        paciente_iniciais: "",
        numero_prontuario: "",
        unidade_atendimento: "",
        respostas: {},
        satisfacao_geral: "",
        observacoes: "",
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const setResposta = (questionId: string, value: string) => {
    setForm(prev => ({
      ...prev,
      respostas: { ...prev.respostas, [questionId]: value },
    }));
  };

  const getScaleColor = (value: string) => {
    const n = parseInt(value);
    if (isNaN(n)) return "bg-muted text-muted-foreground";
    if (n <= 2) return "bg-destructive/10 text-destructive border-destructive/30";
    if (n <= 4) return "bg-orange-500/10 text-orange-700 border-orange-500/30";
    if (n <= 6) return "bg-yellow-500/10 text-yellow-700 border-yellow-500/30";
    if (n <= 8) return "bg-emerald-500/10 text-emerald-700 border-emerald-500/30";
    return "bg-primary/10 text-primary border-primary/30";
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Novo Registro de Avaliação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Identification Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label>1. Mês de Avaliação *</Label>
              <Input
                type="month"
                value={form.mes_avaliacao}
                onChange={(e) => setForm({ ...form, mes_avaliacao: e.target.value })}
              />
            </div>
            <div>
              <Label>2. Iniciais do Paciente *</Label>
              <Input
                value={form.paciente_iniciais}
                onChange={(e) => setForm({ ...form, paciente_iniciais: e.target.value.toUpperCase() })}
                placeholder="Ex: J.S.O."
                maxLength={20}
              />
            </div>
            <div>
              <Label>3. Nº Prontuário *</Label>
              <Input
                value={form.numero_prontuario}
                onChange={(e) => setForm({ ...form, numero_prontuario: e.target.value })}
                placeholder="Número do prontuário"
              />
            </div>
            <div>
              <Label>4. Unidade de Atendimento *</Label>
              <Select
                value={form.unidade_atendimento}
                onValueChange={(v) => setForm({ ...form, unidade_atendimento: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {UNIDADES.map((u) => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Scale Questions */}
          {QUESTIONS.map((q) => {
            const options = q.hasNA ? SCALE_WITH_NA : SCALE_OPTIONS;
            const selected = form.respostas[q.id];

            return (
              <div key={q.id} className="border rounded-lg p-4 space-y-3">
                <div>
                  <h4 className="font-semibold text-foreground">
                    {q.number}. {q.title}
                  </h4>
                  {q.description && (
                    <p className="text-sm text-muted-foreground mt-1">{q.description}</p>
                  )}
                  {q.criteria && q.criteria.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Critérios de avaliação:</p>
                      <ul className="text-sm text-muted-foreground list-disc list-inside space-y-0.5">
                        {q.criteria.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {q.example && (
                    <p className="text-xs text-muted-foreground mt-2 italic border-l-2 border-muted pl-2">
                      <span className="font-medium not-italic">Exemplo: </span>{q.example}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {options.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setResposta(q.id, opt.value)}
                      className={`px-3 py-1.5 rounded-md border text-sm font-medium transition-all ${
                        selected === opt.value
                          ? getScaleColor(opt.value) + " ring-2 ring-offset-1 ring-current"
                          : "bg-background text-muted-foreground border-border hover:bg-accent"
                      }`}
                      title={opt.tooltip || opt.label}
                    >
                      {opt.value === "na" ? "N/A" : opt.value}
                    </button>
                  ))}
                </div>
                {selected && (
                  <p className="text-xs text-muted-foreground italic">
                    Selecionado: {options.find(o => o.value === selected)?.label}
                  </p>
                )}
              </div>
            );
          })}

          {/* Satisfaction */}
          <div className="border rounded-lg p-4 space-y-3">
            <h4 className="font-semibold text-foreground">
              11. No geral, qual é o seu nível de satisfação com a qualidade das informações deste prontuário?
            </h4>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Extremamente insatisfeito</span>
              <div className="flex gap-1">
                {SATISFACAO_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm({ ...form, satisfacao_geral: opt.value })}
                    className={`w-9 h-9 rounded-md border text-sm font-medium transition-all ${
                      form.satisfacao_geral === opt.value
                        ? getScaleColor(String(parseInt(opt.value) - 1)) + " ring-2 ring-offset-1 ring-current"
                        : "bg-background text-muted-foreground border-border hover:bg-accent"
                    }`}
                  >
                    {opt.value}
                  </button>
                ))}
              </div>
              <span className="text-xs text-muted-foreground">Extremamente satisfeito</span>
            </div>
          </div>

          {/* Observations */}
          <div>
            <Label>12. Observações relevantes</Label>
            <Textarea
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              placeholder="Registre quaisquer observações que considerar relevantes..."
              rows={3}
            />
          </div>

          {/* Evaluator */}
          <div className="border rounded-lg p-4 bg-muted/30">
            <Label>13. Responsável pela avaliação</Label>
            <p className="text-sm font-medium text-foreground mt-1">{userName || "Carregando..."}</p>
            <p className="text-xs text-muted-foreground">Identificado automaticamente pelo login do sistema</p>
          </div>

          <Button
            onClick={() => submitMutation.mutate()}
            disabled={submitMutation.isPending}
            className="w-full"
            size="lg"
          >
            <ClipboardCheck className="h-4 w-4 mr-2" />
            {submitMutation.isPending ? "Registrando..." : "Registrar Avaliação"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

// ============ INDICATORS / DASHBOARD ============
const CHART_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6"];

const IndicadoresDashboard = () => {
  const { data: avaliacoes = [], isLoading } = useQuery({
    queryKey: ["avaliacoes_cc"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("auditorias_seguranca_paciente")
        .select("*")
        .eq("tipo", "prontuario_qualitativa_cc")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando indicadores...</div>;
  }

  if (avaliacoes.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">Nenhuma avaliação registrada ainda.</p>
          <p className="text-sm text-muted-foreground">Preencha formulários para ver os indicadores.</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate metrics
  const questionLabels: Record<string, string> = {};
  QUESTIONS.forEach(q => { questionLabels[q.id] = q.title; });

  const questionAverages = QUESTIONS.map(q => {
    const values = avaliacoes
      .map(a => {
        const respostas = a.respostas as Record<string, string> | null;
        return respostas?.[q.id];
      })
      .filter(v => v && v !== "na")
      .map(v => parseInt(v!));
    const avg = values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : 0;
    const shortLabel = QUESTION_SHORT_LABELS[q.id] || q.title;
    return {
      name: shortLabel,
      fullName: q.title,
      media: parseFloat(avg.toFixed(1)),
      total: values.length,
    };
  });

  const satisfacaoValues = avaliacoes
    .map(a => a.satisfacao_geral)
    .filter(v => v !== null && v !== undefined) as number[];
  const avgSatisfacao = satisfacaoValues.length > 0
    ? (satisfacaoValues.reduce((s, v) => s + v, 0) / satisfacaoValues.length).toFixed(1)
    : "—";

  const overallScores = avaliacoes.map(a => {
    const respostas = a.respostas as Record<string, string> | null;
    if (!respostas) return null;
    const values = Object.values(respostas).filter(v => v !== "na").map(v => parseInt(v));
    return values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : null;
  }).filter(v => v !== null) as number[];

  const avgOverall = overallScores.length > 0
    ? (overallScores.reduce((s, v) => s + v, 0) / overallScores.length).toFixed(1)
    : "—";

  // Distribution by unidade
  const byUnidade = UNIDADES.map(u => ({
    name: u.split("(")[0].trim(),
    qtd: avaliacoes.filter(a => a.unidade_atendimento === u).length,
  }));

  // Radar data
  const radarData = QUESTIONS.map(q => {
    const values = avaliacoes
      .map(a => {
        const respostas = a.respostas as Record<string, string> | null;
        return respostas?.[q.id];
      })
      .filter(v => v && v !== "na")
      .map(v => parseInt(v!));
    const avg = values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : 0;
    return {
      subject: QUESTION_SHORT_LABELS[q.id] || q.title,
      score: parseFloat(avg.toFixed(1)),
      fullMark: 9,
    };
  });

  // Monthly trend
  const monthlyMap = new Map<string, { sum: number; count: number }>();
  avaliacoes.forEach(a => {
    const month = a.mes_avaliacao || a.data_auditoria?.substring(0, 7) || "";
    if (!month) return;
    const entry = monthlyMap.get(month) || { sum: 0, count: 0 };
    const respostas = a.respostas as Record<string, string> | null;
    if (respostas) {
      const values = Object.values(respostas).filter(v => v !== "na").map(v => parseInt(v));
      if (values.length > 0) {
        entry.sum += values.reduce((s, v) => s + v, 0) / values.length;
        entry.count += 1;
      }
    }
    monthlyMap.set(month, entry);
  });
  const monthlyTrend = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      mes: month,
      media: parseFloat((data.sum / data.count).toFixed(1)),
    }));

  const handleExportCSV = () => {
    const headers = ['Data', 'Iniciais', 'Prontuário', 'Unidade', 'Proveniência', 'HPP', 'Exame Físico', 'Plano Terapêutico', 'Metas Terapêuticas', 'Plano Alta', 'Satisfação', 'Avaliador'];
    const rows = avaliacoes.map(a => {
      const r = a.respostas as Record<string, string> | null;
      return [
        a.data_auditoria ? format(new Date(a.data_auditoria), 'dd/MM/yyyy') : '',
        a.paciente_iniciais || '', a.numero_prontuario || '',
        a.unidade_atendimento || '',
        r?.proveniencia || '', r?.hpp || '', r?.exame_fisico || '',
        r?.plano_terapeutico || '', r?.metas_terapeuticas || '', r?.plano_alta || '',
        a.satisfacao_geral?.toString() || '', a.auditor_nome || '',
      ];
    });
    exportToCSV({ title: 'Avaliação Prontuários CC', headers, rows, fileName: 'avaliacoes_prontuarios_cc' });
  };

  const handleExportPDF = async () => {
    const pdfTitle = 'Avaliação Qualitativa de Prontuários - Corpo Clínico';
    const { doc, logoImg } = await createStandardPdf(pdfTitle, 'landscape');

    // 1) KPIs
    autoTable(doc, {
      startY: 32,
      head: [['Avaliações', 'Média Geral', 'Satisfação Média']],
      body: [[avaliacoes.length, avgOverall, avgSatisfacao]],
      styles: { fontSize: 10, cellPadding: 3, halign: 'center' },
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
    });

    // 2) Radar - Média por critério
    let lastY = (doc as any).lastAutoTable?.finalY || 50;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Média por Critério de Avaliação', 14, lastY + 8);
    autoTable(doc, {
      startY: lastY + 12,
      head: [['Critério', 'Média (0-9)']],
      body: radarData.map(d => [d.subject, d.score]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [52, 152, 219], textColor: 255, fontStyle: 'bold' },
      margin: { top: 32, bottom: 28 },
    });

    // 3) Distribuição por Unidade
    const byUnidadeFiltered = byUnidade.filter(u => u.qtd > 0);
    if (byUnidadeFiltered.length > 0) {
      lastY = (doc as any).lastAutoTable?.finalY || 80;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Distribuição por Unidade', 14, lastY + 8);
      autoTable(doc, {
        startY: lastY + 12,
        head: [['Unidade', 'Quantidade']],
        body: byUnidadeFiltered.map(u => [u.name, u.qtd]),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [52, 152, 219], textColor: 255, fontStyle: 'bold' },
        margin: { top: 32, bottom: 28 },
      });
    }

    // 4) Tendência Mensal
    if (monthlyTrend.length > 0) {
      lastY = (doc as any).lastAutoTable?.finalY || 100;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Tendência Mensal', 14, lastY + 8);
      autoTable(doc, {
        startY: lastY + 12,
        head: [['Mês', 'Média']],
        body: monthlyTrend.map(t => [t.mes, t.media]),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [52, 152, 219], textColor: 255, fontStyle: 'bold' },
        margin: { top: 32, bottom: 28 },
      });
    }

    // 5) Tabela de avaliações individuais
    lastY = (doc as any).lastAutoTable?.finalY || 120;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Avaliações Individuais', 14, lastY + 8);
    autoTable(doc, {
      startY: lastY + 12,
      head: [['Data', 'Iniciais', 'Pront.', 'Unidade', 'Média', 'Satisfação', 'Avaliador']],
      body: avaliacoes.map(a => {
        const r = a.respostas as Record<string, string> | null;
        const values = r ? Object.values(r).filter(v => v !== 'na').map(v => parseInt(v)) : [];
        const avg = values.length > 0 ? (values.reduce((s, v) => s + v, 0) / values.length).toFixed(1) : '—';
        return [
          a.data_auditoria ? format(new Date(a.data_auditoria), 'dd/MM/yyyy') : '',
          a.paciente_iniciais || '', a.numero_prontuario || '',
          a.unidade_atendimento?.split('(')[0]?.trim() || '',
          avg, a.satisfacao_geral?.toString() || '—', a.auditor_nome || '',
        ];
      }),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { top: 32, bottom: 28 },
    });

    savePdfWithFooter(doc, pdfTitle, 'avaliacoes_prontuarios_cc', logoImg);
  };

  return (
    <div className="space-y-6">
      {/* Export */}
      <div className="flex justify-end">
        <ExportDropdown onExportCSV={handleExportCSV} onExportPDF={handleExportPDF} />
      </div>
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <FileText className="h-8 w-8 mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold">{avaliacoes.length}</p>
            <p className="text-sm text-muted-foreground">Avaliações Realizadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <BarChart3 className="h-8 w-8 mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold">{avgOverall}</p>
            <p className="text-sm text-muted-foreground">Média Geral (0-9)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            {parseFloat(avgSatisfacao as string) >= 7 ? (
              <TrendingUp className="h-8 w-8 mx-auto text-emerald-500 mb-1" />
            ) : parseFloat(avgSatisfacao as string) >= 5 ? (
              <Minus className="h-8 w-8 mx-auto text-yellow-500 mb-1" />
            ) : (
              <TrendingDown className="h-8 w-8 mx-auto text-destructive mb-1" />
            )}
            <p className="text-2xl font-bold">{avgSatisfacao}</p>
            <p className="text-sm text-muted-foreground">Satisfação Média (1-10)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Eye className="h-8 w-8 mx-auto text-muted-foreground mb-1" />
            <p className="text-2xl font-bold">
              {new Set(avaliacoes.map(a => a.auditor_nome)).size}
            </p>
            <p className="text-sm text-muted-foreground">Avaliadores Distintos</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar chart - averages per question */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Média por Critério</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={questionAverages} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 9]} />
                <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: number) => [value.toFixed(1), "Média"]}
                  labelFormatter={(label) => questionAverages.find(q => q.name === label)?.fullName || label}
                />
                <Bar dataKey="media" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Radar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Perfil de Qualidade</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                <PolarRadiusAxis domain={[0, 9]} tick={{ fontSize: 10 }} />
                <Radar
                  name="Média"
                  dataKey="score"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.3}
                />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly trend */}
        {monthlyTrend.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Evolução Mensal</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 9]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="media" stroke="hsl(var(--primary))" strokeWidth={2} dot />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Distribution by unit */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Avaliações por Unidade</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={byUnidade.filter(u => u.qtd > 0)}
                  dataKey="qtd"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, qtd }) => `${name}: ${qtd}`}
                >
                  {byUnidade.filter(u => u.qtd > 0).map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent evaluations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Últimas Avaliações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {avaliacoes.slice(0, 10).map((a) => {
              const respostas = a.respostas as Record<string, string> | null;
              const values = respostas
                ? Object.values(respostas).filter(v => v !== "na").map(v => parseInt(v))
                : [];
              const avg = values.length > 0 ? (values.reduce((s, v) => s + v, 0) / values.length).toFixed(1) : "—";

              return (
                <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="text-sm">
                      <span className="font-medium">{a.paciente_iniciais}</span>
                      <span className="text-muted-foreground ml-2">Pront. {a.numero_prontuario}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {a.unidade_atendimento?.split("(")[0]?.trim()}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground">
                      {a.data_auditoria ? format(new Date(a.data_auditoria), "dd/MM/yyyy") : ""}
                    </span>
                    <Badge className={parseFloat(avg) >= 7 ? "bg-emerald-500" : parseFloat(avg) >= 5 ? "bg-yellow-500" : "bg-destructive"}>
                      Média: {avg}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{a.auditor_nome}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ============ MAIN COMPONENT ============
const AvaliacaoProntuariosCC = () => {
  const [subTab, setSubTab] = useState("indicadores");

  return (
    <div className="space-y-6">
      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList>
          <TabsTrigger value="indicadores" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Indicadores
          </TabsTrigger>
          <TabsTrigger value="formulario" className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Avaliação
          </TabsTrigger>
        </TabsList>

        <TabsContent value="indicadores" className="mt-4">
          <IndicadoresDashboard />
        </TabsContent>

        <TabsContent value="formulario" className="mt-4">
          <FormularioAvaliacao onSuccess={() => setSubTab("indicadores")} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AvaliacaoProntuariosCC;
