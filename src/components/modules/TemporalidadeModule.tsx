import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { format, differenceInHours, parseISO, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, Clock, FileText, ShieldCheck, ThermometerSun, CheckCircle2, XCircle, Plus, Eye } from "lucide-react";
import { ExportDropdown } from "@/components/ui/export-dropdown";
import { exportToCSV, exportToPDF } from "@/lib/export-utils";

// Limites de atraso por setor (em horas)
const LIMITES_SETOR: Record<string, number> = {
  "Faturamento": 24,
  "NIR": 12,
  "Farmácia": 6,
  "Manutenção": 48,
  "Enfermagem": 8,
  "Laboratório": 4,
  "Recepção": 2,
  "Qualidade": 72,
};

const SETORES = Object.keys(LIMITES_SETOR);

type AuditoriaRecord = {
  id: string;
  setor: string;
  modulo: string;
  descricao: string;
  data_fato: string;
  data_registro: string;
  delay_horas: number;
  limite_horas: number;
  justificado: boolean;
  created_at: string;
};

type Justificativa = {
  id: string;
  auditoria_id: string;
  responsavel_nome: string;
  motivo: string;
  acao_corretiva: string;
  prazo_correcao: string | null;
  status: string;
  aprovado_por_nome: string | null;
  observacao_gerencia: string | null;
  created_at: string;
};

type VigenciaRecord = {
  id: string;
  categoria: string;
  tipo_documento: string;
  descricao: string;
  referencia_nome: string | null;
  data_emissao: string | null;
  data_validade: string;
  setor_responsavel: string | null;
  bloqueio_operacional: boolean;
};

function getSemaforoVigencia(dataValidade: string) {
  const hoje = new Date();
  const validade = parseISO(dataValidade);
  const dias = differenceInHours(validade, hoje) / 24;
  if (dias < 0 || dias <= 30) return "vermelho";
  if (dias <= 60) return "amarelo";
  return "verde";
}

function SemaforoBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    verde: { label: "Em dia", className: "bg-green-500/20 text-green-400 border-green-500/30" },
    amarelo: { label: "Atenção", className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
    vermelho: { label: "Crítico", className: "bg-red-500/20 text-red-400 border-red-500/30" },
  };
  const c = config[status] || config.vermelho;
  return <Badge variant="outline" className={c.className}>{c.label}</Badge>;
}

// ==================== DASHBOARD DE ATRASOS ====================
function DashboardAtrasos() {
  const { data: registros = [], isLoading } = useQuery({
    queryKey: ["auditoria_temporalidade"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("auditoria_temporalidade")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as AuditoriaRecord[];
    },
  });

  const atrasados = registros.filter((r) => r.delay_horas > r.limite_horas);
  const naoJustificados = atrasados.filter((r) => !r.justificado);

  // Atrasos por setor
  const atrasosPorSetor = SETORES.map((setor) => {
    const doSetor = registros.filter((r) => r.setor === setor);
    const atrasosSetor = doSetor.filter((r) => r.delay_horas > r.limite_horas);
    return {
      setor,
      total: doSetor.length,
      atrasos: atrasosSetor.length,
      percentual: doSetor.length > 0 ? Math.round((atrasosSetor.length / doSetor.length) * 100) : 0,
    };
  }).filter((s) => s.total > 0);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10"><Clock className="h-5 w-5 text-blue-500" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Total Registros</p>
                <p className="text-2xl font-bold">{registros.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10"><AlertTriangle className="h-5 w-5 text-red-500" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Em Atraso</p>
                <p className="text-2xl font-bold text-red-500">{atrasados.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10"><FileText className="h-5 w-5 text-yellow-500" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Sem Justificativa</p>
                <p className="text-2xl font-bold text-yellow-500">{naoJustificados.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10"><CheckCircle2 className="h-5 w-5 text-green-500" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Conformidade</p>
                <p className="text-2xl font-bold text-green-500">
                  {registros.length > 0 ? Math.round(((registros.length - atrasados.length) / registros.length) * 100) : 100}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Termômetro por Setor */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Termômetro de Atrasos por Setor</CardTitle></CardHeader>
        <CardContent>
          {atrasosPorSetor.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">Nenhum registro de temporalidade encontrado. Os atrasos serão exibidos aqui conforme os módulos registrarem eventos.</p>
          ) : (
            <div className="space-y-3">
              {atrasosPorSetor.map((s) => (
                <div key={s.setor} className="flex items-center gap-4">
                  <span className="w-28 text-sm font-medium truncate">{s.setor}</span>
                  <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${s.percentual > 50 ? "bg-red-500" : s.percentual > 20 ? "bg-yellow-500" : "bg-green-500"}`}
                      style={{ width: `${Math.max(s.percentual, 2)}%` }}
                    />
                  </div>
                  <span className={`text-sm font-bold w-12 text-right ${s.percentual > 50 ? "text-red-500" : s.percentual > 20 ? "text-yellow-500" : "text-green-500"}`}>
                    {s.percentual}%
                  </span>
                  <span className="text-xs text-muted-foreground w-20">{s.atrasos}/{s.total}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== LISTA DE ATRASOS ====================
function ListaAtrasos() {
  const queryClient = useQueryClient();
  const { isAdmin, isGestor } = useUserRole();
  const [selectedAuditoria, setSelectedAuditoria] = useState<AuditoriaRecord | null>(null);
  const [justificativaOpen, setJustificativaOpen] = useState(false);
  const [filtroSetor, setFiltroSetor] = useState("todos");
  const [userName, setUserName] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserName(data.user?.user_metadata?.full_name || data.user?.email || "");
    });
  }, []);

  const { data: registros = [], isLoading } = useQuery({
    queryKey: ["auditoria_temporalidade"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("auditoria_temporalidade")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as AuditoriaRecord[];
    },
  });

  const atrasados = registros
    .filter((r) => r.delay_horas > r.limite_horas)
    .filter((r) => filtroSetor === "todos" || r.setor === filtroSetor);

  const justificarMutation = useMutation({
    mutationFn: async (data: { auditoria_id: string; motivo: string; acao_corretiva: string; prazo: string }) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const { error: e1 } = await supabase.from("justificativas_atraso").insert({
        auditoria_id: data.auditoria_id,
        responsavel_nome: userName,
        responsavel_id: userId,
        motivo: data.motivo,
        acao_corretiva: data.acao_corretiva,
        prazo_correcao: data.prazo || null,
      });
      if (e1) throw e1;
      const { error: e2 } = await supabase
        .from("auditoria_temporalidade")
        .update({ justificado: true })
        .eq("id", data.auditoria_id);
      if (e2) throw e2;
    },
    onSuccess: () => {
      toast.success("Justificativa registrada com sucesso");
      queryClient.invalidateQueries({ queryKey: ["auditoria_temporalidade"] });
      setJustificativaOpen(false);
      setSelectedAuditoria(null);
    },
    onError: () => toast.error("Erro ao registrar justificativa"),
  });

  const [formJust, setFormJust] = useState({ motivo: "", acao_corretiva: "", prazo: "" });

  const csvHeaders = ["Setor", "Módulo", "Descrição", "Data do Fato", "Data do Registro", "Atraso (h)", "Justificado"];
  const csvRows = atrasados.map((r) => [
    r.setor, r.modulo, r.descricao,
    format(parseISO(r.data_fato), "dd/MM/yyyy HH:mm"),
    format(parseISO(r.data_registro), "dd/MM/yyyy HH:mm"),
    Math.round(r.delay_horas), r.justificado ? "Sim" : "Não",
  ]);

  const handleExportCSV = () => {
    exportToCSV({ title: "Atrasos", headers: csvHeaders, rows: csvRows as (string | number)[][], fileName: "atrasos_temporalidade" });
  };

  const handleExportPDF = () => {
    exportToPDF({
      title: "Relatório de Atrasos de Temporalidade",
      headers: ["Setor", "Módulo", "Atraso (h)", "Justificado"],
      rows: atrasados.map((r) => [r.setor, r.modulo, Math.round(r.delay_horas), r.justificado ? "Sim" : "Não"]),
      fileName: "atrasos_temporalidade",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Select value={filtroSetor} onValueChange={setFiltroSetor}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Filtrar por setor" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os setores</SelectItem>
            {SETORES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <ExportDropdown onExportCSV={handleExportCSV} onExportPDF={handleExportPDF} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Setor</TableHead>
                <TableHead>Módulo</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Data do Fato</TableHead>
                <TableHead>Data do Registro</TableHead>
                <TableHead>Atraso</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {atrasados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nenhum atraso registrado {filtroSetor !== "todos" ? `para ${filtroSetor}` : ""}
                  </TableCell>
                </TableRow>
              ) : atrasados.map((r) => (
                <TableRow key={r.id} className={!r.justificado ? "bg-red-500/5" : ""}>
                  <TableCell className="font-medium">{r.setor}</TableCell>
                  <TableCell>{r.modulo}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{r.descricao}</TableCell>
                  <TableCell className="text-xs">{format(parseISO(r.data_fato), "dd/MM/yy HH:mm")}</TableCell>
                  <TableCell className="text-xs">{format(parseISO(r.data_registro), "dd/MM/yy HH:mm")}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30">
                      {Math.round(r.delay_horas)}h
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {r.justificado ? (
                      <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">Justificado</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30">Pendente</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {!r.justificado && (
                      <Button size="sm" variant="outline" onClick={() => {
                        setSelectedAuditoria(r);
                        setFormJust({ motivo: "", acao_corretiva: "", prazo: "" });
                        setJustificativaOpen(true);
                      }}>
                        Justificar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog de Justificativa 5W2H */}
      <Dialog open={justificativaOpen} onOpenChange={setJustificativaOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Justificativa de Atraso (5W2H)</DialogTitle>
          </DialogHeader>
          {selectedAuditoria && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
                <p><strong>Setor:</strong> {selectedAuditoria.setor}</p>
                <p><strong>Atraso:</strong> {Math.round(selectedAuditoria.delay_horas)}h (limite: {selectedAuditoria.limite_horas}h)</p>
                <p><strong>Descrição:</strong> {selectedAuditoria.descricao}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Por quê? (Motivo do atraso) *</label>
                <Textarea value={formJust.motivo} onChange={(e) => setFormJust({ ...formJust, motivo: e.target.value })} placeholder="Descreva o motivo do atraso..." />
              </div>
              <div>
                <label className="text-sm font-medium">O quê? (Ação corretiva) *</label>
                <Textarea value={formJust.acao_corretiva} onChange={(e) => setFormJust({ ...formJust, acao_corretiva: e.target.value })} placeholder="Qual ação será tomada para corrigir..." />
              </div>
              <div>
                <label className="text-sm font-medium">Quando? (Prazo de correção)</label>
                <Input type="date" value={formJust.prazo} onChange={(e) => setFormJust({ ...formJust, prazo: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setJustificativaOpen(false)}>Cancelar</Button>
            <Button
              disabled={!formJust.motivo || !formJust.acao_corretiva || justificarMutation.isPending}
              onClick={() => selectedAuditoria && justificarMutation.mutate({
                auditoria_id: selectedAuditoria.id,
                motivo: formJust.motivo,
                acao_corretiva: formJust.acao_corretiva,
                prazo: formJust.prazo,
              })}
            >
              {justificarMutation.isPending ? "Salvando..." : "Registrar Justificativa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== CENTRAL DE VIGÊNCIA ====================
function CentralVigencia() {
  const queryClient = useQueryClient();
  const [novoOpen, setNovoOpen] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState("todos");

  const { data: documentos = [] } = useQuery({
    queryKey: ["controle_vigencia"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("controle_vigencia")
        .select("*")
        .order("data_validade", { ascending: true });
      if (error) throw error;
      return (data || []) as VigenciaRecord[];
    },
  });

  const [form, setForm] = useState({
    categoria: "institucional" as string,
    tipo_documento: "",
    descricao: "",
    referencia_nome: "",
    data_emissao: "",
    data_validade: "",
    setor_responsavel: "",
    bloqueio_operacional: false,
  });

  const criarMutation = useMutation({
    mutationFn: async () => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const { error } = await supabase.from("controle_vigencia").insert({
        ...form,
        data_emissao: form.data_emissao || null,
        referencia_nome: form.referencia_nome || null,
        setor_responsavel: form.setor_responsavel || null,
        created_by: userId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Documento cadastrado");
      queryClient.invalidateQueries({ queryKey: ["controle_vigencia"] });
      setNovoOpen(false);
      setForm({ categoria: "institucional", tipo_documento: "", descricao: "", referencia_nome: "", data_emissao: "", data_validade: "", setor_responsavel: "", bloqueio_operacional: false });
    },
    onError: () => toast.error("Erro ao cadastrar documento"),
  });

  const filtrados = documentos.filter((d) => filtroCategoria === "todos" || d.categoria === filtroCategoria);

  const resumo = {
    verde: documentos.filter((d) => getSemaforoVigencia(d.data_validade) === "verde").length,
    amarelo: documentos.filter((d) => getSemaforoVigencia(d.data_validade) === "amarelo").length,
    vermelho: documentos.filter((d) => getSemaforoVigencia(d.data_validade) === "vermelho").length,
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="pt-6 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-500/10"><CheckCircle2 className="h-5 w-5 text-green-500" /></div>
          <div><p className="text-sm text-muted-foreground">Em dia (90+ dias)</p><p className="text-2xl font-bold text-green-500">{resumo.verde}</p></div>
        </CardContent></Card>
        <Card><CardContent className="pt-6 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-yellow-500/10"><AlertTriangle className="h-5 w-5 text-yellow-500" /></div>
          <div><p className="text-sm text-muted-foreground">Atenção (30-60 dias)</p><p className="text-2xl font-bold text-yellow-500">{resumo.amarelo}</p></div>
        </CardContent></Card>
        <Card><CardContent className="pt-6 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-500/10"><XCircle className="h-5 w-5 text-red-500" /></div>
          <div><p className="text-sm text-muted-foreground">Crítico / Vencido</p><p className="text-2xl font-bold text-red-500">{resumo.vermelho}</p></div>
        </CardContent></Card>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
          <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas as categorias</SelectItem>
            <SelectItem value="institucional">Institucional</SelectItem>
            <SelectItem value="equipamento">Equipamento</SelectItem>
            <SelectItem value="pessoa">Pessoa</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => setNovoOpen(true)}><Plus className="h-4 w-4 mr-2" />Novo Documento</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoria</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Referência</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Bloqueio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum documento cadastrado</TableCell></TableRow>
              ) : filtrados.map((d) => (
                <TableRow key={d.id} className={getSemaforoVigencia(d.data_validade) === "vermelho" ? "bg-red-500/5" : ""}>
                  <TableCell className="capitalize">{d.categoria}</TableCell>
                  <TableCell>{d.tipo_documento}</TableCell>
                  <TableCell>{d.descricao}</TableCell>
                  <TableCell>{d.referencia_nome || "-"}</TableCell>
                  <TableCell>{format(parseISO(d.data_validade), "dd/MM/yyyy")}</TableCell>
                  <TableCell><SemaforoBadge status={getSemaforoVigencia(d.data_validade)} /></TableCell>
                  <TableCell>{d.bloqueio_operacional ? <Badge variant="destructive">Sim</Badge> : <Badge variant="outline">Não</Badge>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog Novo Documento */}
      <Dialog open={novoOpen} onOpenChange={setNovoOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Cadastrar Documento / Certidão</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Categoria *</label>
              <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="institucional">Institucional (Alvará, Licença)</SelectItem>
                  <SelectItem value="equipamento">Equipamento (Calibração, Preventiva)</SelectItem>
                  <SelectItem value="pessoa">Pessoa (CRM, COREN, Treinamento)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Tipo do Documento *</label>
              <Input value={form.tipo_documento} onChange={(e) => setForm({ ...form, tipo_documento: e.target.value })} placeholder="Ex: Alvará Sanitário, Certificado de Calibração" />
            </div>
            <div>
              <label className="text-sm font-medium">Descrição *</label>
              <Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Descrição do documento" />
            </div>
            <div>
              <label className="text-sm font-medium">Referência (Nome do profissional/equipamento)</label>
              <Input value={form.referencia_nome} onChange={(e) => setForm({ ...form, referencia_nome: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Data de Emissão</label>
                <Input type="date" value={form.data_emissao} onChange={(e) => setForm({ ...form, data_emissao: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">Data de Validade *</label>
                <Input type="date" value={form.data_validade} onChange={(e) => setForm({ ...form, data_validade: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Setor Responsável</label>
              <Input value={form.setor_responsavel} onChange={(e) => setForm({ ...form, setor_responsavel: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.bloqueio_operacional} onChange={(e) => setForm({ ...form, bloqueio_operacional: e.target.checked })} />
              <label className="text-sm">Gerar bloqueio operacional quando vencido</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNovoOpen(false)}>Cancelar</Button>
            <Button
              disabled={!form.tipo_documento || !form.descricao || !form.data_validade || criarMutation.isPending}
              onClick={() => criarMutation.mutate()}
            >
              {criarMutation.isPending ? "Salvando..." : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== JUSTIFICATIVAS (GERÊNCIA) ====================
function AprovacaoJustificativas() {
  const queryClient = useQueryClient();

  const { data: justificativas = [] } = useQuery({
    queryKey: ["justificativas_atraso"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("justificativas_atraso")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Justificativa[];
    },
  });

  const aprovarMutation = useMutation({
    mutationFn: async ({ id, status, obs }: { id: string; status: string; obs: string }) => {
      const user = (await supabase.auth.getUser()).data.user;
      const { error } = await supabase.from("justificativas_atraso").update({
        status,
        observacao_gerencia: obs || null,
        aprovado_por: user?.id,
        aprovado_por_nome: user?.user_metadata?.full_name || user?.email || "",
        aprovado_em: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Justificativa atualizada");
      queryClient.invalidateQueries({ queryKey: ["justificativas_atraso"] });
    },
  });

  const pendentes = justificativas.filter((j) => j.status === "pendente");
  const resolvidas = justificativas.filter((j) => j.status !== "pendente");

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">Justificativas Pendentes ({pendentes.length})</h3>
      {pendentes.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nenhuma justificativa pendente de aprovação.</p>
      ) : pendentes.map((j) => (
        <Card key={j.id}>
          <CardContent className="pt-4 space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><strong>Responsável:</strong> {j.responsavel_nome}</div>
              <div><strong>Data:</strong> {format(parseISO(j.created_at), "dd/MM/yyyy HH:mm")}</div>
            </div>
            <div className="text-sm"><strong>Motivo:</strong> {j.motivo}</div>
            <div className="text-sm"><strong>Ação Corretiva:</strong> {j.acao_corretiva}</div>
            {j.prazo_correcao && <div className="text-sm"><strong>Prazo:</strong> {format(parseISO(j.prazo_correcao), "dd/MM/yyyy")}</div>}
            <div className="flex gap-2">
              <Button size="sm" onClick={() => aprovarMutation.mutate({ id: j.id, status: "aprovada", obs: "" })} className="bg-green-600 hover:bg-green-700">
                <CheckCircle2 className="h-4 w-4 mr-1" /> Aprovar
              </Button>
              <Button size="sm" variant="destructive" onClick={() => aprovarMutation.mutate({ id: j.id, status: "rejeitada", obs: "" })}>
                <XCircle className="h-4 w-4 mr-1" /> Rejeitar
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {resolvidas.length > 0 && (
        <>
          <h3 className="font-semibold text-lg mt-6">Histórico ({resolvidas.length})</h3>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Aprovado por</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resolvidas.map((j) => (
                    <TableRow key={j.id}>
                      <TableCell>{j.responsavel_nome}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{j.motivo}</TableCell>
                      <TableCell>
                        <Badge variant={j.status === "aprovada" ? "default" : "destructive"}>
                          {j.status === "aprovada" ? "Aprovada" : "Rejeitada"}
                        </Badge>
                      </TableCell>
                      <TableCell>{j.aprovado_por_nome || "-"}</TableCell>
                      <TableCell>{format(parseISO(j.created_at), "dd/MM/yy")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ==================== MÓDULO PRINCIPAL ====================
export function TemporalidadeModule() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-orange-500/10">
          <ThermometerSun className="h-6 w-6 text-orange-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Gestão de Temporalidade & Vigência</h2>
          <p className="text-sm text-muted-foreground">Auditoria de conformidade ONA — Controle de prazos e vigências</p>
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard"><ThermometerSun className="h-4 w-4 mr-2" />Dashboard</TabsTrigger>
          <TabsTrigger value="atrasos"><Clock className="h-4 w-4 mr-2" />Atrasos</TabsTrigger>
          <TabsTrigger value="vigencia"><ShieldCheck className="h-4 w-4 mr-2" />Vigência</TabsTrigger>
          <TabsTrigger value="aprovacoes"><FileText className="h-4 w-4 mr-2" />Aprovações</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard"><DashboardAtrasos /></TabsContent>
        <TabsContent value="atrasos"><ListaAtrasos /></TabsContent>
        <TabsContent value="vigencia"><CentralVigencia /></TabsContent>
        <TabsContent value="aprovacoes"><AprovacaoJustificativas /></TabsContent>
      </Tabs>
    </div>
  );
}
