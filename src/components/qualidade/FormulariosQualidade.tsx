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
  const [incidentes, setIncidentes] = useState<any[]>([]);
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
    const [formRes, regRes, incRes] = await Promise.all([
      supabase.from("auditoria_formularios_config").select("*").eq("ativo", true).order("ordem"),
      supabase.from("auditorias_seguranca_paciente").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("incidentes_nsp").select("*").order("data_ocorrencia", { ascending: false }),
    ]);
    if (formRes.data) setFormularios(formRes.data);
    if (regRes.data) setRegistros(regRes.data as any);
    if (incRes.data) setIncidentes(incRes.data);
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

    // Build monthly columns from BOTH incidentes and auditorias
    const monthSet = new Set<string>();
    incidentes.forEach(i => monthSet.add(format(new Date(i.data_ocorrencia), "yyyy-MM")));
    tipoRegistros.forEach(r => monthSet.add(format(new Date(r.data_auditoria), "yyyy-MM")));
    const months = [...monthSet].sort();
    const monthLabels = months.map(m => {
      const d = new Date(m + "-01");
      return format(d, "MMM/yy", { locale: ptBR }).replace(/^./, c => c.toUpperCase());
    });

    // Helper: get incidentes for a month
    const incByMonth = (month: string) => incidentes.filter(i => format(new Date(i.data_ocorrencia), "yyyy-MM") === month);
    const calcAvg = (vals: number[]) => vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : "";
    const calcPct = (num: number, den: number) => den > 0 ? ((num / den) * 100).toFixed(1) : "";

    // Normalize setor_origem for procedência
    const normalizeProcedencia = (setor: string) => {
      const s = (setor || "").toLowerCase().trim();
      if (/intern/i.test(s)) return "Unidade de Internação";
      if (/emerg|urg|sala.*verm/i.test(s)) return "Emergência";
      if (/recep|acolh/i.test(s)) return "Recepção";
      if (/raio|rx/i.test(s)) return "Raio-x";
      if (/labor|villac/i.test(s)) return "Laboratório";
      if (/farm/i.test(s)) return "Farmácia";
      if (/admin|ti$|tecnolog/i.test(s)) return "Áreas Administrativas";
      if (/corpo.*cl|m[eé]dic[oa]|cl[ií]n/i.test(s)) return "Corpo Clínico";
      if (/apoio|manut|cozin|sesmt|roup/i.test(s)) return "Áreas de Apoio";
      if (/classif/i.test(s)) return "Classificação";
      if (/medica[çc]/i.test(s)) return "Medicação";
      if (/observa/i.test(s)) return "Observação";
      if (/qualidade|nsp|scir|scih|ouvi|psico|líder|lider|enfer|assist/i.test(s)) return "Áreas de Apoio";
      return "Outros";
    };

    // Normalize incidente for tipo OMS based on descricao + setor since categoria_operacional is null
    const normalizeTipoOMS = (inc: any) => {
      const d = ((inc.descricao || "") + " " + (inc.categoria_operacional || "")).toLowerCase();
      if (/medica[çcm]|prescri|dose|droga|omiss[aã]o.*medic|via.*errada|horário|diluição|alergia.*medic|medicamento/i.test(d)) return "Medicação";
      if (/queda|escorr|tropeç/i.test(d)) return "Comportamento";
      if (/infra|instala|vazam|goter|energia|ar.*condic|manut|estrut|telhad|lamp|piso/i.test(d)) return "Infraestrutura / Instalações";
      if (/equip|monitor|bomba.*infus|ventilador|maca|cadeira.*rodas|desfibrilador|oxímetro/i.test(d)) return "Equipamentos Médicos";
      if (/prontuário|document|registr|evolu[çc]|identif.*paciente|pulseira|nome.*errado/i.test(d)) return "Documentação";
      if (/rh |escala|falt.*profiss|dimens|recurso.*human|gestão/i.test(d)) return "Recursos / Gestão Organizacional";
      if (/agress|conflito|ameaça|violênc|fuga|evasão|recusa|comporta/i.test(d)) return "Comportamento";
      return "Administração Clínica / Processo";
    };

    // Section rendering helper
    const renderSection = (title: string, rows: { label: string; unit: string; values: (string | number)[]; avg: string | number }[]) => (
      <Card key={title}>
        <CardHeader className="pb-1 bg-[hsl(210,70%,20%)] rounded-t-lg">
          <CardTitle className="text-sm text-white font-bold">{title}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[220px] text-xs">Indicador</TableHead>
                  <TableHead className="text-center text-xs w-[40px]">Un.</TableHead>
                  {monthLabels.map(ml => <TableHead key={ml} className="text-center text-xs min-w-[55px]">{ml}</TableHead>)}
                  <TableHead className="text-center text-xs min-w-[55px] font-bold bg-muted/50">Média</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, ri) => (
                  <TableRow key={ri} className={row.unit === "%" ? "bg-muted/20" : ""}>
                    <TableCell className="text-xs py-1.5">{row.label}</TableCell>
                    <TableCell className="text-center text-xs text-muted-foreground py-1.5">{row.unit}</TableCell>
                    {row.values.map((v, vi) => (
                      <TableCell key={vi} className="text-center text-xs font-medium py-1.5">
                        {row.unit === "%" && typeof v === "string" && v !== "" && v !== "-" ? (
                          <span className={`font-bold ${parseFloat(v) >= 80 ? "text-green-600" : parseFloat(v) >= 60 ? "text-yellow-600" : "text-red-600"}`}>{v}%</span>
                        ) : (v || "-")}
                      </TableCell>
                    ))}
                    <TableCell className="text-center text-xs font-bold py-1.5 bg-muted/30">
                      {row.unit === "%" && row.avg !== "" && row.avg !== "-" ? (
                        <span className={`font-bold ${parseFloat(String(row.avg)) >= 80 ? "text-green-600" : parseFloat(String(row.avg)) >= 60 ? "text-yellow-600" : "text-red-600"}`}>{row.avg}%</span>
                      ) : (row.avg || "-")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    );

    // ── 1. INDICADORES DE ESTRUTURA ──
    const estruturaRows = [
      {
        label: "Número Total de Notificações de Incidentes",
        unit: "Nº",
        values: months.map(m => incByMonth(m).length || ""),
        avg: calcAvg(months.map(m => incByMonth(m).length).filter(v => v > 0)),
      },
    ];

    // ── 2. INDICADORES DE PROCESSO ──
    const classCounts = (month: string, tipo: string) => incByMonth(month).filter(i => i.tipo_incidente === tipo).length;
    const riscoCounts = (month: string, risco: string) => incByMonth(month).filter(i => i.classificacao_risco === risco).length;

    const processoRows = [
      { label: "Número Total de Notificações", unit: "Nº", values: months.map(m => incByMonth(m).length || ""), avg: calcAvg(months.map(m => incByMonth(m).length).filter(v => v > 0)) },
      { label: "Sem Dano", unit: "Nº", values: months.map(m => classCounts(m, "incidente_sem_dano") || ""), avg: calcAvg(months.map(m => classCounts(m, "incidente_sem_dano")).filter(v => v > 0)) },
      { label: "", unit: "%", values: months.map(m => calcPct(classCounts(m, "incidente_sem_dano"), incByMonth(m).length)), avg: "" },
      { label: "Quase Erro \"Near Miss\"", unit: "Nº", values: months.map(m => classCounts(m, "quase_erro") || ""), avg: calcAvg(months.map(m => classCounts(m, "quase_erro")).filter(v => v > 0)) },
      { label: "", unit: "%", values: months.map(m => calcPct(classCounts(m, "quase_erro"), incByMonth(m).length)), avg: "" },
      { label: "Com Dano / Evento Adverso", unit: "Nº", values: months.map(m => classCounts(m, "evento_adverso") || ""), avg: calcAvg(months.map(m => classCounts(m, "evento_adverso")).filter(v => v > 0)) },
      { label: "", unit: "%", values: months.map(m => calcPct(classCounts(m, "evento_adverso"), incByMonth(m).length)), avg: "" },
      { label: "  Dano Leve", unit: "Nº", values: months.map(m => riscoCounts(m, "leve") || ""), avg: calcAvg(months.map(m => riscoCounts(m, "leve")).filter(v => v > 0)) },
      { label: "  Dano Moderado", unit: "Nº", values: months.map(m => riscoCounts(m, "moderado") || ""), avg: calcAvg(months.map(m => riscoCounts(m, "moderado")).filter(v => v > 0)) },
      { label: "  Dano Grave", unit: "Nº", values: months.map(m => riscoCounts(m, "grave") || ""), avg: calcAvg(months.map(m => riscoCounts(m, "grave")).filter(v => v > 0)) },
      { label: "  Catastrófico", unit: "Nº", values: months.map(m => riscoCounts(m, "catastrofico") || ""), avg: calcAvg(months.map(m => riscoCounts(m, "catastrofico")).filter(v => v > 0)) },
    ];

    // ── 2.2 PROCEDÊNCIA DAS NOTIFICAÇÕES ──
    const PROCEDENCIAS = ["Unidade de Internação", "Emergência", "Recepção", "Raio-x", "Laboratório", "Farmácia", "Áreas Administrativas", "Corpo Clínico", "Áreas de Apoio", "Classificação", "Medicação", "Observação", "Outros"];
    const procCount = (month: string, proc: string) => incByMonth(month).filter(i => normalizeProcedencia(i.setor_origem || i.setor) === proc).length;
    const procedenciaRows: typeof processoRows = [];
    PROCEDENCIAS.forEach(proc => {
      const vals = months.map(m => procCount(m, proc));
      if (vals.some(v => v > 0)) {
        procedenciaRows.push({ label: proc, unit: "Nº", values: vals.map(v => v || ""), avg: calcAvg(vals.filter(v => v > 0)) });
        procedenciaRows.push({ label: "", unit: "%", values: months.map((m, i) => calcPct(vals[i], incByMonth(m).length)), avg: "" });
      }
    });

    // ── 2.2 TIPO DE INCIDENTES - OMS ──
    const TIPOS_OMS = ["Administração Clínica / Processo", "Documentação", "Medicação", "Comportamento", "Infraestrutura / Instalações", "Recursos / Gestão Organizacional", "Equipamentos Médicos", "Outros"];
    const omsCount = (month: string, tipo: string) => incByMonth(month).filter(i => normalizeTipoOMS(i) === tipo).length;
    const omsRows: typeof processoRows = [];
    TIPOS_OMS.forEach((tipo, idx) => {
      const vals = months.map(m => omsCount(m, tipo));
      omsRows.push({ label: `2.2.${idx + 1} ${tipo}`, unit: "Nº", values: vals.map(v => v || ""), avg: calcAvg(vals.filter(v => v > 0)) });
      omsRows.push({ label: "", unit: "%", values: months.map((m, i) => calcPct(vals[i], incByMonth(m).length)), avg: "" });
    });

    // ── AUDITORIAS DE SEGURANÇA DO PACIENTE ──
    const META_SECTIONS = [
      { prefix: "M1_", label: "Identificação Correta do Paciente" },
      { prefix: "M2_", label: "Comunicação Efetiva" },
      { prefix: "M3_", label: "Segurança da Cadeia Medicamentosa" },
      { prefix: "M4_", label: "Prevenção de Queda" },
      { prefix: "M5_", label: "Higiene das Mãos" },
      { prefix: "M6_", label: "Prevenção Lesão por Pressão" },
    ];

    const getMetaMonthData = (prefix: string, month: string) => {
      const monthRegs = tipoRegistros.filter(r => format(new Date(r.data_auditoria), "yyyy-MM") === month);
      let avaliados = 0, conformes = 0;
      monthRegs.forEach(r => {
        if (!r.respostas || typeof r.respostas !== "object") return;
        const entries = Object.entries(r.respostas as Record<string, string>).filter(([k]) => k.startsWith(prefix));
        if (entries.length === 0) return;
        avaliados++;
        const mc = entries.filter(([, v]) => v === "conforme" || v === "sim").length;
        const ma = entries.filter(([, v]) => v !== "nao_aplica").length;
        if (ma > 0 && mc === ma) conformes++;
      });
      return { avaliados, conformes, pct: avaliados > 0 ? ((conformes / avaliados) * 100).toFixed(1) : "" };
    };

    const auditRows: typeof processoRows = [];
    META_SECTIONS.forEach(meta => {
      auditRows.push({ label: meta.label, unit: "", values: months.map(() => ""), avg: "" }); // section header row
      const avVals = months.map(m => getMetaMonthData(meta.prefix, m).avaliados);
      const confVals = months.map(m => getMetaMonthData(meta.prefix, m).conformes);
      const pctVals = months.map(m => getMetaMonthData(meta.prefix, m).pct);
      auditRows.push({ label: "Número de pacientes avaliados", unit: "Nº", values: avVals.map(v => v || ""), avg: calcAvg(avVals.filter(v => v > 0)) });
      auditRows.push({ label: "Conformidade", unit: "Nº", values: confVals.map(v => v || ""), avg: calcAvg(confVals.filter(v => v > 0)) });
      auditRows.push({ label: "", unit: "%", values: pctVals as any, avg: (() => { const v = pctVals.filter(p => p !== ""); return v.length > 0 ? (v.reduce((a, b) => a + parseFloat(b as string), 0) / v.length).toFixed(1) : ""; })() });
    });

    // ── 4. INDICADORES DE RESULTADO ──
    const RESULTADO_ITEMS = [
      { label: "4.1 Taxa de incidentes - Identificação do Paciente", filter: (i: any) => /identifi.*paciente|pulseira|nome.*errado|troca.*paciente|paciente.*errad/i.test((i.descricao || "") + " " + (i.categoria_operacional || "")) },
      { label: "4.2 Taxa de incidentes - Comunicação Efetiva", filter: (i: any) => /comunica|repasse|inform.*incomplet|passagem.*plant[aã]o/i.test((i.descricao || "") + " " + (i.categoria_operacional || "")) },
      { label: "4.3 Taxa de incidentes - Medicamentos", filter: (i: any) => /medica[çcm]|prescri|dose|droga|omiss[aã]o.*medic|via.*errada|horário|diluição|alergia.*medic|medicamento/i.test((i.descricao || "") + " " + (i.categoria_operacional || "")) },
      { label: "4.4 Taxa de incidentes - Cirurgia Segura", filter: (i: any) => /cirurg|cirúrg|procediment.*cirúrg|bloco/i.test((i.descricao || "") + " " + (i.categoria_operacional || "")) },
      { label: "4.5 Taxa de incidentes - Higiene das Mãos", filter: (i: any) => /higien.*m[aã]o|lavagem.*m[aã]o|alcool.*gel|antissep/i.test((i.descricao || "") + " " + (i.categoria_operacional || "")) },
      { label: "4.6 Taxa de incidentes - Quedas", filter: (i: any) => /queda|ca[ií]u|escorr/i.test((i.descricao || "") + " " + (i.categoria_operacional || "")) },
      { label: "4.7 Taxa de incidentes - Retirada não programada de Dispositivos", filter: (i: any) => /retir.*dispos|extuba|perda.*acesso|arrancou.*sonda|retirada.*cateter/i.test((i.descricao || "") + " " + (i.categoria_operacional || "")) },
      { label: "4.8 Taxa de incidentes - Lesão de Pele / LPP", filter: (i: any) => /les[aã]o.*p(ele|ress)|lpp|úlcera.*press|escara/i.test((i.descricao || "") + " " + (i.categoria_operacional || "")) },
      { label: "4.9 Taxa de incidentes - Flebite", filter: (i: any) => /flebit|flebite|inflam.*veia|acesso.*venoso.*inflam/i.test((i.descricao || "") + " " + (i.categoria_operacional || "")) },
      { label: "4.10 Taxa de incidentes - Farmacovigilância", filter: (i: any) => /farmaco|rea[çc][aã]o.*advers|efeito.*advers|anafilax/i.test((i.descricao || "") + " " + (i.categoria_operacional || "")) },
      { label: "4.11 Taxa de incidentes - Tecnovigilância", filter: (i: any) => /tecno|equip.*defeito|equip.*quebr|monitor.*falh|bomba.*infus.*falh/i.test((i.descricao || "") + " " + (i.categoria_operacional || "")) },
      { label: "4.12 Taxa de incidentes - Outros", filter: (_: any) => true },
    ];

    const specificFilters = RESULTADO_ITEMS.filter(it => it.label !== "4.12 Taxa de incidentes - Outros");
    const resultadoRows: typeof processoRows = [];
    specificFilters.forEach(item => {
      const vals = months.map(m => incByMonth(m).filter(item.filter).length);
      resultadoRows.push({ label: item.label, unit: "Nº", values: vals.map(v => v || ""), avg: calcAvg(vals.filter(v => v > 0)) });
      resultadoRows.push({ label: "", unit: "%", values: months.map((m, i) => calcPct(vals[i], incByMonth(m).length)), avg: "" });
    });
    // "Outros" = incidents not matching any specific filter
    const outrosVals = months.map(m => {
      const all = incByMonth(m);
      const matched = new Set<string>();
      specificFilters.forEach(item => all.filter(item.filter).forEach(i => matched.add(i.id)));
      return all.length - matched.size;
    });
    resultadoRows.push({ label: "4.12 Taxa de incidentes - Outros", unit: "Nº", values: outrosVals.map(v => v || ""), avg: calcAvg(outrosVals.filter(v => v > 0)) });
    resultadoRows.push({ label: "", unit: "%", values: months.map((m, i) => calcPct(outrosVals[i], incByMonth(m).length)), avg: "" });

    // Export
    const exportConsolidadoExcel = () => {
      const allSections = [
        { title: "1. INDICADORES DE ESTRUTURA", rows: estruturaRows },
        { title: "2. INDICADORES DE PROCESSO", rows: processoRows },
        { title: "2.1 Procedência das Notificações", rows: procedenciaRows },
        { title: "2.2 Tipo de Incidentes - OMS", rows: omsRows },
        { title: "3. AUDITORIAS DE SEGURANÇA DO PACIENTE", rows: auditRows },
        { title: "4. INDICADORES DE RESULTADO", rows: resultadoRows },
      ];
      const data: any[] = [];
      allSections.forEach(sec => {
        data.push({ Indicador: sec.title });
        sec.rows.forEach(r => {
          const row: any = { Indicador: r.label, "Un.": r.unit };
          months.forEach((_, i) => { row[monthLabels[i]] = r.values[i] || ""; });
          row["Média"] = r.avg;
          data.push(row);
        });
        data.push({});
      });
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Consolidado NSP");
      XLSX.writeFile(wb, `consolidado-nsp-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    };

    const exportConsolidadoPDF = () => {
      const doc = new jsPDF({ orientation: "landscape" });
      doc.setFontSize(11);
      doc.text("UNIDADE DE NEGÓCIO - NÚCLEO DE SEGURANÇA DO PACIENTE", 14, 12);
      doc.setFontSize(8);
      doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy")}`, 14, 17);
      let startY = 22;

      const renderPdfSection = (title: string, rows: typeof processoRows) => {
        if (startY > 170) { doc.addPage(); startY = 15; }
        autoTable(doc, {
          startY,
          head: [[{ content: title, colSpan: months.length + 3, styles: { halign: "left", fillColor: [30, 58, 95], textColor: 255, fontSize: 8 } }]],
          body: rows.map(r => [r.label, r.unit, ...r.values.map(v => String(v)), String(r.avg)]),
          styles: { fontSize: 6, cellPadding: 1.5 },
          headStyles: { fontSize: 7 },
          theme: "grid",
          margin: { bottom: 10 },
        });
        startY = (doc as any).lastAutoTable.finalY + 3;
      };

      renderPdfSection("1. INDICADORES DE ESTRUTURA", estruturaRows);
      renderPdfSection("2. INDICADORES DE PROCESSO", processoRows);
      renderPdfSection("2.1 Procedência das Notificações", procedenciaRows);
      renderPdfSection("2.2 Tipo de Incidentes - OMS", omsRows);
      renderPdfSection("3. AUDITORIAS DE SEGURANÇA DO PACIENTE", auditRows);
      renderPdfSection("4. INDICADORES DE RESULTADO", resultadoRows);

      doc.save(`consolidado-nsp-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    };

    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setView("home")} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>

        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Consolidado Mensal – Núcleo de Segurança do Paciente
          </h2>
          <ExportDropdown onExportPDF={exportConsolidadoPDF} onExportExcel={exportConsolidadoExcel} />
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold">{incidentes.length}</p>
            <p className="text-xs text-muted-foreground">Total Notificações</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold">{tipoRegistros.length}</p>
            <p className="text-xs text-muted-foreground">Auditorias Realizadas</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold">{months.length}</p>
            <p className="text-xs text-muted-foreground">Meses com Dados</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold">{incidentes.filter(i => i.tipo_incidente === "evento_adverso").length}</p>
            <p className="text-xs text-muted-foreground">Eventos Adversos</p>
          </CardContent></Card>
        </div>

        {renderSection("1. INDICADORES DE ESTRUTURA", estruturaRows)}
        {renderSection("2. INDICADORES DE PROCESSO", processoRows)}
        {renderSection("2.1 Procedência das Notificações", procedenciaRows)}
        {renderSection("2.2 Tipo de Incidentes - OMS", omsRows)}
        {renderSection("AUDITORIAS DE SEGURANÇA DO PACIENTE", auditRows)}
        {renderSection("4. INDICADORES DE RESULTADO", resultadoRows)}
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
