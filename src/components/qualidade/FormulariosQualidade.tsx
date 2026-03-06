import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ShieldCheck, ClipboardPlus, FileText, BarChart3, Eye,
  ClipboardCheck, ArrowLeft, CheckCircle2, AlertTriangle, Clock,
  Target, Users, Pill, Scissors, Hand, PersonStanding
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { SearchInput } from "@/components/ui/search-input";
import { ExportDropdown } from "@/components/ui/export-dropdown";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

interface FormularioConfig {
  id: string;
  nome: string;
  tipo: string;
  ativo: boolean;
  ordem: number | null;
  setores: string[] | null;
  icone: string | null;
  created_at: string;
}

interface SecaoConfig {
  id: string;
  formulario_id: string;
  nome: string;
  ordem: number | null;
}

interface PerguntaConfig {
  id: string;
  secao_id: string;
  codigo: string;
  label: string;
  opcoes: string[];
  ativo: boolean;
  ordem: number | null;
}

interface AuditoriaRegistro {
  id: string;
  tipo: string;
  setor: string;
  auditor_nome: string;
  auditor_id: string;
  data_auditoria: string;
  respostas: any;
  observacoes: string | null;
  numero_prontuario: string | null;
  paciente_iniciais: string | null;
  unidade_atendimento: string | null;
  created_at: string;
}

type View = "home" | "form" | "historico" | "consolidado";

const OPCAO_LABELS: Record<string, string> = {
  conforme: "C", nao_conforme: "NC", nao_aplica: "N/A",
  sim: "Sim", nao: "Não",
};
const OPCAO_FULL: Record<string, string> = {
  conforme: "Conforme", nao_conforme: "Não Conforme", nao_aplica: "N/A",
  sim: "Sim", nao: "Não",
};

const META_ICONS = [Target, Users, Pill, PersonStanding, Hand, ShieldCheck];

export function FormulariosQualidade() {
  const { toast } = useToast();
  const [formularios, setFormularios] = useState<FormularioConfig[]>([]);
  const [registros, setRegistros] = useState<AuditoriaRegistro[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<View>("home");
  const [selectedForm, setSelectedForm] = useState<FormularioConfig | null>(null);

  // Form state
  const [secoes, setSecoes] = useState<SecaoConfig[]>([]);
  const [perguntas, setPerguntas] = useState<PerguntaConfig[]>([]);
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [auditoriaForm, setAuditoriaForm] = useState({ setor: "", observacoes: "", prontuario: "", paciente: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Historico state
  const [searchTerm, setSearchTerm] = useState("");
  const [detalhesDialog, setDetalhesDialog] = useState(false);
  const [registroSelecionado, setRegistroSelecionado] = useState<AuditoriaRegistro | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [formRes, regRes] = await Promise.all([
      supabase.from("auditoria_formularios_config").select("*").eq("ativo", true).order("ordem"),
      supabase.from("auditorias_seguranca_paciente").select("*").order("created_at", { ascending: false }).limit(200),
    ]);
    if (formRes.data) setFormularios(formRes.data);
    if (regRes.data) setRegistros(regRes.data as any);
    setIsLoading(false);
  };

  const handleOpenForm = async (form: FormularioConfig) => {
    setSelectedForm(form);
    setRespostas({});
    setAuditoriaForm({ setor: "", observacoes: "", prontuario: "", paciente: "" });
    const [secRes, pergRes] = await Promise.all([
      supabase.from("auditoria_secoes_config").select("*").eq("formulario_id", form.id).order("ordem"),
      supabase.from("auditoria_perguntas_config").select("*").eq("ativo", true).order("ordem"),
    ]);
    if (secRes.data) setSecoes(secRes.data);
    if (pergRes.data) {
      const secIds = new Set((secRes.data || []).map((s: any) => s.id));
      setPerguntas((pergRes.data as PerguntaConfig[]).filter(p => secIds.has(p.secao_id)));
    }
    setView("form");
  };

  const handleSubmit = async () => {
    if (!selectedForm || !auditoriaForm.setor) {
      toast({ title: "Erro", description: "Preencha o setor auditado", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      const { data: profile } = await supabase.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle();

      const { error } = await supabase.from("auditorias_seguranca_paciente").insert({
        tipo: selectedForm.tipo,
        setor: auditoriaForm.setor,
        auditor_id: user.id,
        auditor_nome: profile?.full_name || user.email || "",
        data_auditoria: new Date().toISOString().split("T")[0],
        respostas,
        observacoes: auditoriaForm.observacoes || null,
        numero_prontuario: auditoriaForm.prontuario || null,
        paciente_iniciais: auditoriaForm.paciente || null,
        unidade_atendimento: auditoriaForm.setor,
      });
      if (error) throw error;
      toast({ title: "Sucesso", description: "Auditoria registrada com sucesso!" });
      setView("home");
      loadData();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  const calcConformidade = (resp: any): { conformes: number; total: number; pct: number } => {
    if (!resp || typeof resp !== "object") return { conformes: 0, total: 0, pct: 0 };
    const entries = Object.entries(resp as Record<string, string>);
    const avaliadas = entries.filter(([, v]) => v !== "nao_aplica");
    const conformes = avaliadas.filter(([, v]) => v === "conforme" || v === "sim").length;
    return { conformes, total: avaliadas.length, pct: avaliadas.length > 0 ? Math.round((conformes / avaliadas.length) * 100) : 0 };
  };

  const filteredRegistros = registros.filter(r => {
    if (!selectedForm) return true;
    const matchTipo = r.tipo === selectedForm.tipo;
    const matchSearch = !searchTerm ||
      r.setor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.auditor_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.numero_prontuario || "").toLowerCase().includes(searchTerm.toLowerCase());
    return matchTipo && matchSearch;
  });

  // Consolidado stats
  const getConsolidadoData = () => {
    const tipoRegistros = registros.filter(r => r.tipo === selectedForm?.tipo);
    const totalAuditorias = tipoRegistros.length;
    const avgConf = totalAuditorias > 0 ? Math.round(tipoRegistros.reduce((a, r) => a + calcConformidade(r.respostas).pct, 0) / totalAuditorias) : 0;

    // Per-question stats
    const questionStats: Record<string, { conforme: number; nao_conforme: number; na: number; total: number }> = {};
    tipoRegistros.forEach(r => {
      if (!r.respostas || typeof r.respostas !== "object") return;
      Object.entries(r.respostas as Record<string, string>).forEach(([code, val]) => {
        if (!questionStats[code]) questionStats[code] = { conforme: 0, nao_conforme: 0, na: 0, total: 0 };
        questionStats[code].total++;
        if (val === "conforme" || val === "sim") questionStats[code].conforme++;
        else if (val === "nao_conforme" || val === "nao") questionStats[code].nao_conforme++;
        else questionStats[code].na++;
      });
    });

    // Per-sector
    const sectorStats: Record<string, { total: number; avgPct: number }> = {};
    tipoRegistros.forEach(r => {
      if (!sectorStats[r.setor]) sectorStats[r.setor] = { total: 0, avgPct: 0 };
      sectorStats[r.setor].total++;
      sectorStats[r.setor].avgPct += calcConformidade(r.respostas).pct;
    });
    Object.keys(sectorStats).forEach(k => {
      sectorStats[k].avgPct = Math.round(sectorStats[k].avgPct / sectorStats[k].total);
    });

    return { totalAuditorias, avgConf, questionStats, sectorStats };
  };

  const exportPDF = () => {
    if (!selectedForm) return;
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(selectedForm.nome + " - Histórico", 14, 20);
    autoTable(doc, {
      startY: 28,
      head: [["Data", "Setor", "Auditor", "Prontuário", "Conformidade"]],
      body: filteredRegistros.map(r => {
        const c = calcConformidade(r.respostas);
        return [
          format(new Date(r.data_auditoria), "dd/MM/yyyy"),
          r.setor, r.auditor_nome, r.numero_prontuario || "-", `${c.pct}% (${c.conformes}/${c.total})`
        ];
      }),
      styles: { fontSize: 8 },
    });
    doc.save(`${selectedForm.tipo}-historico.pdf`);
  };

  const exportExcel = () => {
    if (!selectedForm) return;
    const data = filteredRegistros.map(r => {
      const c = calcConformidade(r.respostas);
      return {
        Data: format(new Date(r.data_auditoria), "dd/MM/yyyy"),
        Setor: r.setor, Auditor: r.auditor_nome,
        Prontuário: r.numero_prontuario || "", Paciente: r.paciente_iniciais || "",
        "Conformidade %": c.pct, Conformes: c.conformes, Total: c.total,
        ...(r.respostas && typeof r.respostas === "object" ? r.respostas as Record<string, string> : {}),
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Auditorias");
    XLSX.writeFile(wb, `${selectedForm?.tipo || "auditoria"}-historico.xlsx`);
  };

  if (isLoading) return <LoadingState message="Carregando formulários..." />;

  // ─── VIEW: FORM (Cadastrar Auditoria) ───
  if (view === "form" && selectedForm) {
    return (
      <div className="space-y-4 max-w-3xl mx-auto">
        <Button variant="ghost" size="sm" onClick={() => setView("home")} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>

        <div className="rounded-2xl bg-gradient-to-r from-[hsl(210,70%,20%)] to-[hsl(210,60%,45%)] p-5 text-white">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Nova Auditoria</h1>
              <p className="text-sm text-white/70">{selectedForm.nome}</p>
            </div>
          </div>
        </div>

        {/* Identificação */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Identificação da Auditoria</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Setor Auditado *</Label>
              <Select value={auditoriaForm.setor} onValueChange={v => setAuditoriaForm(p => ({ ...p, setor: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione o setor" /></SelectTrigger>
                <SelectContent>
                  {(selectedForm.setores || ["Internação", "Urgência", "Medicação", "Classificação", "Observação"]).map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Nº Prontuário</Label>
              <Input value={auditoriaForm.prontuario} onChange={e => setAuditoriaForm(p => ({ ...p, prontuario: e.target.value }))} placeholder="Opcional" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Iniciais do Paciente</Label>
              <Input value={auditoriaForm.paciente} onChange={e => setAuditoriaForm(p => ({ ...p, paciente: e.target.value }))} placeholder="Ex: J.S." />
            </div>
          </CardContent>
        </Card>

        {/* Seções e Perguntas */}
        {secoes.map((secao, idx) => {
          const perguntasSecao = perguntas.filter(p => p.secao_id === secao.id);
          const Icon = META_ICONS[idx] || Target;
          return (
            <Card key={secao.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Icon className="h-4 w-4 text-primary" />
                  {secao.nome}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {perguntasSecao.map((p, pIdx) => (
                  <div key={p.id} className="space-y-2">
                    <Label className="text-sm font-normal">
                      <span className="font-semibold text-muted-foreground mr-1">{pIdx + 1}.</span>
                      {p.label}
                    </Label>
                    <RadioGroup
                      value={respostas[p.codigo] || ""}
                      onValueChange={v => setRespostas(prev => ({ ...prev, [p.codigo]: v }))}
                      className="flex flex-wrap gap-3"
                    >
                      {p.opcoes.map(opt => (
                        <div key={opt} className="flex items-center gap-1.5">
                          <RadioGroupItem value={opt} id={`${p.codigo}-${opt}`} />
                          <Label htmlFor={`${p.codigo}-${opt}`} className="text-sm cursor-pointer font-normal">
                            {OPCAO_FULL[opt] || opt}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}

        {/* Observações */}
        <Card>
          <CardContent className="pt-4">
            <Label className="text-xs">Observações Gerais</Label>
            <Textarea
              value={auditoriaForm.observacoes}
              onChange={e => setAuditoriaForm(p => ({ ...p, observacoes: e.target.value }))}
              placeholder="Observações adicionais da auditoria..."
              rows={3}
              className="mt-1"
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setView("home")}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : "Registrar Auditoria"}
          </Button>
        </div>
      </div>
    );
  }

  // ─── VIEW: HISTORICO ───
  if (view === "historico" && selectedForm) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setView("home")} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Relatórios – {selectedForm.nome}
          </h2>
          <div className="flex items-center gap-2">
            <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Buscar..." className="w-[200px]" />
            <ExportDropdown onExportPDF={exportPDF} onExportExcel={exportExcel} />
          </div>
        </div>

        {filteredRegistros.length === 0 ? (
          <EmptyState icon={ClipboardCheck} title="Nenhuma auditoria encontrada" description="Realize auditorias para ver os relatórios aqui." />
        ) : (
          <Card>
            <CardContent className="pt-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Setor</TableHead>
                      <TableHead>Auditor</TableHead>
                      <TableHead>Prontuário</TableHead>
                      <TableHead>Conformidade</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRegistros.map(r => {
                      const conf = calcConformidade(r.respostas);
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="whitespace-nowrap">{format(new Date(r.data_auditoria), "dd/MM/yyyy")}</TableCell>
                          <TableCell>{r.setor}</TableCell>
                          <TableCell>{r.auditor_nome}</TableCell>
                          <TableCell>{r.numero_prontuario || "-"}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${conf.pct >= 80 ? "bg-green-500" : conf.pct >= 60 ? "bg-yellow-500" : "bg-red-500"}`} />
                              <span className="text-sm font-medium">{conf.pct}%</span>
                              <span className="text-xs text-muted-foreground">({conf.conformes}/{conf.total})</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="outline" onClick={() => { setRegistroSelecionado(r); setDetalhesDialog(true); }}>
                              <Eye className="h-4 w-4 mr-1" /> Ver
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Detalhes Dialog */}
        <Dialog open={detalhesDialog} onOpenChange={setDetalhesDialog}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes da Auditoria</DialogTitle>
            </DialogHeader>
            {registroSelecionado && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><Label className="text-muted-foreground">Setor</Label><p className="font-medium">{registroSelecionado.setor}</p></div>
                  <div><Label className="text-muted-foreground">Data</Label><p className="font-medium">{format(new Date(registroSelecionado.data_auditoria), "dd/MM/yyyy")}</p></div>
                  <div><Label className="text-muted-foreground">Auditor</Label><p className="font-medium">{registroSelecionado.auditor_nome}</p></div>
                  <div><Label className="text-muted-foreground">Prontuário</Label><p className="font-medium">{registroSelecionado.numero_prontuario || "-"}</p></div>
                </div>
                {registroSelecionado.respostas && typeof registroSelecionado.respostas === "object" && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Respostas</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      {Object.entries(registroSelecionado.respostas as Record<string, string>).map(([key, val]) => (
                        <div key={key} className="flex items-center justify-between text-sm border-b pb-1 last:border-0">
                          <span className="text-muted-foreground">{key}</span>
                          <Badge variant={val === "conforme" || val === "sim" ? "default" : val === "nao_conforme" || val === "nao" ? "destructive" : "secondary"}>
                            {OPCAO_FULL[val] || val}
                          </Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
                {registroSelecionado.observacoes && (
                  <div><Label className="text-muted-foreground">Observações</Label><p className="text-sm whitespace-pre-wrap">{registroSelecionado.observacoes}</p></div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDetalhesDialog(false)}>Fechar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ─── VIEW: CONSOLIDADO ───
  if (view === "consolidado" && selectedForm) {
    const tipoRegistros = registros.filter(r => r.tipo === selectedForm.tipo);

    // Build monthly columns
    const monthSet = new Set<string>();
    tipoRegistros.forEach(r => {
      const d = new Date(r.data_auditoria);
      monthSet.add(format(d, "yyyy-MM"));
    });
    const months = [...monthSet].sort();
    const monthLabels = months.map(m => {
      const d = new Date(m + "-01");
      return format(d, "MMM/yy", { locale: ptBR }).replace(/^./, c => c.toUpperCase());
    });

    // Meta sections from question codes (M1_, M2_, etc.)
    const META_SECTIONS = [
      { prefix: "M1_", label: "Identificação Correta do Paciente" },
      { prefix: "M2_", label: "Comunicação Efetiva" },
      { prefix: "M3_", label: "Segurança da Cadeia Medicamentosa" },
      { prefix: "M4_", label: "Prevenção de Queda" },
      { prefix: "M5_", label: "Higiene das Mãos" },
      { prefix: "M6_", label: "Prevenção Lesão por Pressão" },
    ];

    // For each meta & month: count avaliados, conformes, %
    const getMetaMonthData = (prefix: string, month: string) => {
      const monthRegs = tipoRegistros.filter(r => format(new Date(r.data_auditoria), "yyyy-MM") === month);
      let avaliados = 0;
      let conformes = 0;
      monthRegs.forEach(r => {
        if (!r.respostas || typeof r.respostas !== "object") return;
        const entries = Object.entries(r.respostas as Record<string, string>).filter(([k]) => k.startsWith(prefix));
        if (entries.length === 0) return;
        avaliados++;
        const metaConformes = entries.filter(([, v]) => v === "conforme" || v === "sim").length;
        const metaAvaliadas = entries.filter(([, v]) => v !== "nao_aplica").length;
        if (metaAvaliadas > 0 && metaConformes === metaAvaliadas) conformes++;
      });
      const pct = avaliados > 0 ? Math.round((conformes / avaliados) * 100) : null;
      return { avaliados, conformes, pct };
    };

    // Global averages per meta
    const getMetaAvg = (prefix: string) => {
      const vals = months.map(m => getMetaMonthData(prefix, m)).filter(d => d.avaliados > 0);
      if (vals.length === 0) return null;
      return Math.round(vals.reduce((a, v) => a + (v.pct || 0), 0) / vals.length);
    };

    const totalAuditorias = tipoRegistros.length;

    const exportConsolidadoPDF = () => {
      const doc = new jsPDF({ orientation: "landscape" });
      doc.setFontSize(12);
      doc.text("AUDITORIAS DE SEGURANÇA DO PACIENTE - Consolidado Mensal", 14, 15);
      let startY = 22;

      META_SECTIONS.forEach(meta => {
        const head = [["", ...monthLabels, "Média"]];
        const avRow = ["Nº pacientes avaliados", ...months.map(m => String(getMetaMonthData(meta.prefix, m).avaliados || "")), ""];
        const confRow = ["Conformidade", ...months.map(m => String(getMetaMonthData(meta.prefix, m).conformes || "")), ""];
        const pctRow = ["%", ...months.map(m => {
          const d = getMetaMonthData(meta.prefix, m);
          return d.pct !== null ? `${d.pct}%` : "";
        }), getMetaAvg(meta.prefix) !== null ? `${getMetaAvg(meta.prefix)}%` : ""];

        autoTable(doc, {
          startY,
          head: [[{ content: meta.label, colSpan: months.length + 2, styles: { halign: "left", fillColor: [30, 58, 95], textColor: 255 } }]],
          body: [avRow, confRow, pctRow],
          styles: { fontSize: 7, cellPadding: 2 },
          theme: "grid",
          margin: { bottom: 10 },
        });
        startY = (doc as any).lastAutoTable.finalY + 4;
      });

      doc.save(`consolidado-auditorias-nsp-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    };

    const exportConsolidadoExcel = () => {
      const rows: any[] = [];
      META_SECTIONS.forEach(meta => {
        rows.push({ Indicador: meta.label });
        const avRow: any = { Indicador: "Nº pacientes avaliados" };
        const confRow: any = { Indicador: "Conformidade" };
        const pctRow: any = { Indicador: "%" };
        months.forEach((m, i) => {
          const d = getMetaMonthData(meta.prefix, m);
          avRow[monthLabels[i]] = d.avaliados || "";
          confRow[monthLabels[i]] = d.conformes || "";
          pctRow[monthLabels[i]] = d.pct !== null ? `${d.pct}%` : "";
        });
        avRow["Média"] = "";
        confRow["Média"] = "";
        pctRow["Média"] = getMetaAvg(meta.prefix) !== null ? `${getMetaAvg(meta.prefix)}%` : "";
        rows.push(avRow, confRow, pctRow, {});
      });
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Consolidado NSP");
      XLSX.writeFile(wb, `consolidado-auditorias-nsp-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    };

    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setView("home")} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Consolidado Mensal – Auditorias de Segurança do Paciente
          </h2>
          <ExportDropdown onExportPDF={exportConsolidadoPDF} onExportExcel={exportConsolidadoExcel} />
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold">{totalAuditorias}</p>
            <p className="text-xs text-muted-foreground">Auditorias Realizadas</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold">{months.length}</p>
            <p className="text-xs text-muted-foreground">Meses com Dados</p>
          </CardContent></Card>
          {META_SECTIONS.slice(0, 2).map(meta => {
            const avg = getMetaAvg(meta.prefix);
            return (
              <Card key={meta.prefix}><CardContent className="pt-4 pb-3 text-center">
                <p className={`text-2xl font-bold ${avg !== null && avg >= 80 ? "text-green-600" : avg !== null && avg >= 60 ? "text-yellow-600" : "text-red-600"}`}>
                  {avg !== null ? `${avg}%` : "-"}
                </p>
                <p className="text-xs text-muted-foreground truncate">{meta.label}</p>
              </CardContent></Card>
            );
          })}
        </div>

        {/* Monthly tables per meta — like the Excel */}
        {META_SECTIONS.map((meta, idx) => {
          const Icon = META_ICONS[idx] || Target;
          const avg = getMetaAvg(meta.prefix);
          return (
            <Card key={meta.prefix}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Icon className="h-4 w-4 text-primary" />
                  {meta.label}
                  {avg !== null && (
                    <Badge variant={avg >= 80 ? "default" : avg >= 60 ? "secondary" : "destructive"} className="ml-auto">
                      Média: {avg}%
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[180px]">Indicador</TableHead>
                        <TableHead className="text-center min-w-[50px]">Un.</TableHead>
                        {monthLabels.map(ml => (
                          <TableHead key={ml} className="text-center min-w-[60px]">{ml}</TableHead>
                        ))}
                        <TableHead className="text-center min-w-[60px] font-bold">Média</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* Row: Número de pacientes avaliados */}
                      <TableRow>
                        <TableCell className="text-sm">Número de pacientes avaliados</TableCell>
                        <TableCell className="text-center text-xs text-muted-foreground">Nº</TableCell>
                        {months.map(m => {
                          const d = getMetaMonthData(meta.prefix, m);
                          return <TableCell key={m} className="text-center font-medium">{d.avaliados || "-"}</TableCell>;
                        })}
                        <TableCell className="text-center font-bold">
                          {(() => {
                            const vals = months.map(m => getMetaMonthData(meta.prefix, m).avaliados).filter(v => v > 0);
                            return vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : "-";
                          })()}
                        </TableCell>
                      </TableRow>
                      {/* Row: Conformidade */}
                      <TableRow>
                        <TableCell className="text-sm">Conformidade</TableCell>
                        <TableCell className="text-center text-xs text-muted-foreground">Nº</TableCell>
                        {months.map(m => {
                          const d = getMetaMonthData(meta.prefix, m);
                          return <TableCell key={m} className="text-center font-medium">{d.conformes || "-"}</TableCell>;
                        })}
                        <TableCell className="text-center font-bold">
                          {(() => {
                            const vals = months.map(m => getMetaMonthData(meta.prefix, m).conformes).filter(v => v > 0);
                            return vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : "-";
                          })()}
                        </TableCell>
                      </TableRow>
                      {/* Row: % */}
                      <TableRow className="bg-muted/30">
                        <TableCell className="text-sm font-medium">Taxa de Conformidade</TableCell>
                        <TableCell className="text-center text-xs text-muted-foreground">%</TableCell>
                        {months.map(m => {
                          const d = getMetaMonthData(meta.prefix, m);
                          return (
                            <TableCell key={m} className="text-center">
                              {d.pct !== null ? (
                                <span className={`font-bold ${d.pct >= 80 ? "text-green-600" : d.pct >= 60 ? "text-yellow-600" : "text-red-600"}`}>
                                  {d.pct}%
                                </span>
                              ) : "-"}
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-center">
                          {avg !== null ? (
                            <span className={`font-bold ${avg >= 80 ? "text-green-600" : avg >= 60 ? "text-yellow-600" : "text-red-600"}`}>
                              {avg}%
                            </span>
                          ) : "-"}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  // ─── VIEW: HOME (hero + action cards) ───
  const activeForm = formularios[0]; // Currently only "Auditoria de Segurança do Paciente"
  const totalRegistros = registros.filter(r => activeForm && r.tipo === activeForm.tipo).length;
  const avgConf = totalRegistros > 0
    ? Math.round(registros.filter(r => activeForm && r.tipo === activeForm.tipo).reduce((a, r) => a + calcConformidade(r.respostas).pct, 0) / totalRegistros)
    : 0;

  if (!activeForm) {
    return <EmptyState icon={ShieldCheck} title="Nenhum formulário configurado" description="Configure formulários de auditoria no módulo administrativo." />;
  }

  return (
    <div className="space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center gap-6 border-b pb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <span className="font-semibold text-foreground">{activeForm.nome}</span>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">NSP</span>
        </div>
        <div className="flex items-center gap-4 ml-auto text-sm">
          <button onClick={() => { setSelectedForm(activeForm); handleOpenForm(activeForm); }} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
            <ClipboardPlus className="h-4 w-4" /> Cadastrar
          </button>
          <button onClick={() => { setSelectedForm(activeForm); setView("historico"); }} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
            <FileText className="h-4 w-4" /> Relatórios
          </button>
          <button onClick={() => { setSelectedForm(activeForm); setView("consolidado"); }} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
            <BarChart3 className="h-4 w-4" /> Consolidado
          </button>
        </div>
      </div>

      {/* Hero Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[hsl(210,70%,20%)] to-[hsl(210,60%,45%)] p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{activeForm.nome}</h1>
            <p className="text-sm text-white/70">Núcleo de Segurança do Paciente – UPA 24h</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl px-4 py-3 flex items-center gap-3 bg-white/20">
            <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center"><Target className="h-5 w-5" /></div>
            <div><p className="font-bold text-sm">6 Metas</p><p className="text-xs text-white/70">Segurança Paciente</p></div>
          </div>
          <div className="rounded-xl px-4 py-3 flex items-center gap-3 bg-white/10">
            <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center"><ClipboardCheck className="h-5 w-5" /></div>
            <div><p className="font-bold text-sm">{totalRegistros}</p><p className="text-xs text-white/70">Auditorias</p></div>
          </div>
          <div className="rounded-xl px-4 py-3 flex items-center gap-3 bg-white/10">
            <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center"><CheckCircle2 className="h-5 w-5" /></div>
            <div><p className="font-bold text-sm">{avgConf}%</p><p className="text-xs text-white/70">Conformidade</p></div>
          </div>
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow group border" onClick={() => handleOpenForm(activeForm)}>
          <CardContent className="p-6 space-y-3">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-primary/10 text-primary">
              <ClipboardPlus className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-foreground">Cadastrar Auditoria</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Preencha o checklist das 6 metas de segurança do paciente por setor.
            </p>
            <span className="text-sm text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">Acessar →</span>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow group border" onClick={() => { setSelectedForm(activeForm); setView("historico"); }}>
          <CardContent className="p-6 space-y-3">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
              <FileText className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-foreground">Relatórios</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Visualize e exporte relatórios individuais de cada auditoria realizada.
            </p>
            <span className="text-sm text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">Acessar →</span>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow group border" onClick={() => { setSelectedForm(activeForm); setView("consolidado"); }}>
          <CardContent className="p-6 space-y-3">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
              <BarChart3 className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-foreground">Consolidado</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Analise indicadores por setor, por item e exporte relatórios consolidados.
            </p>
            <span className="text-sm text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">Acessar →</span>
          </CardContent>
        </Card>
      </div>

      {/* About Section */}
      <Card>
        <CardContent className="p-6">
          <h2 className="font-semibold text-foreground mb-3">Sobre a Auditoria de Segurança do Paciente</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            A auditoria de segurança do paciente avalia a conformidade com as 6 Metas Internacionais de Segurança do Paciente
            estabelecidas pela OMS/ONA: identificação correta, comunicação efetiva, segurança de medicamentos de alta vigilância,
            cirurgia segura, prevenção de infecções e prevenção de quedas/lesão por pressão. Este módulo permite o registro
            padronizado, acompanhamento por setor e análise consolidada dos indicadores de conformidade.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
