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
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  FileText, Plus, Eye, ClipboardCheck, Search, 
  BarChart3, CheckCircle2, AlertTriangle, Clock 
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { SearchInput } from "@/components/ui/search-input";
import { StatusBadge } from "@/components/ui/status-badge";

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

interface AuditoriaRegistro {
  id: string;
  tipo: string;
  setor: string;
  auditor_nome: string;
  data_auditoria: string;
  respostas: any;
  observacoes: string | null;
  created_at: string;
}

export function FormulariosQualidade() {
  const { toast } = useToast();
  const [formularios, setFormularios] = useState<FormularioConfig[]>([]);
  const [registros, setRegistros] = useState<AuditoriaRegistro[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [tipoFilter, setTipoFilter] = useState("todos");
  const [novaAuditoriaDialog, setNovaAuditoriaDialog] = useState(false);
  const [formularioSelecionado, setFormularioSelecionado] = useState<FormularioConfig | null>(null);
  const [secoes, setSecoes] = useState<any[]>([]);
  const [perguntas, setPerguntas] = useState<any[]>([]);
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [auditoriaForm, setAuditoriaForm] = useState({
    setor: "",
    observacoes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [detalhesDialog, setDetalhesDialog] = useState(false);
  const [registroSelecionado, setRegistroSelecionado] = useState<AuditoriaRegistro | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [formRes, regRes] = await Promise.all([
      supabase.from("auditoria_formularios_config")
        .select("*")
        .eq("ativo", true)
        .order("ordem"),
      supabase.from("auditorias_seguranca_paciente")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    if (formRes.data) setFormularios(formRes.data);
    if (regRes.data) setRegistros(regRes.data);
    setIsLoading(false);
  };

  const handleOpenFormulario = async (form: FormularioConfig) => {
    setFormularioSelecionado(form);
    setRespostas({});
    setAuditoriaForm({ setor: "", observacoes: "" });

    // Load sections and questions
    const [secRes, pergRes] = await Promise.all([
      supabase.from("auditoria_secoes_config")
        .select("*")
        .eq("formulario_id", form.id)
        .order("ordem"),
      supabase.from("auditoria_perguntas_config")
        .select("*")
        .eq("ativo", true)
        .order("ordem"),
    ]);

    if (secRes.data) setSecoes(secRes.data);
    if (pergRes.data) setPerguntas(pergRes.data);
    setNovaAuditoriaDialog(true);
  };

  const handleSubmitAuditoria = async () => {
    if (!formularioSelecionado || !auditoriaForm.setor) {
      toast({ title: "Erro", description: "Preencha o setor", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { data: profile } = await supabase.from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .maybeSingle();

      const { error } = await supabase.from("auditorias_seguranca_paciente").insert({
        tipo: formularioSelecionado.tipo,
        setor: auditoriaForm.setor,
        auditor_id: user.id,
        auditor_nome: profile?.full_name || user.email || "",
        data_auditoria: new Date().toISOString().split("T")[0],
        respostas: respostas,
        observacoes: auditoriaForm.observacoes || null,
      });

      if (error) throw error;
      toast({ title: "Sucesso", description: "Auditoria registrada com sucesso" });
      setNovaAuditoriaDialog(false);
      loadData();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message || "Falha ao salvar", variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  const calcConformidade = (resp: any): { conformes: number; total: number; pct: number } => {
    if (!resp || typeof resp !== "object") return { conformes: 0, total: 0, pct: 0 };
    const entries = Object.entries(resp as Record<string, string>);
    const total = entries.length;
    const conformes = entries.filter(([, v]) => 
      v === "conforme" || v === "sim" || v === "sim_completo"
    ).length;
    return { conformes, total, pct: total > 0 ? Math.round((conformes / total) * 100) : 0 };
  };

  const filteredRegistros = registros.filter(r => {
    const matchSearch = !searchTerm || 
      r.setor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.auditor_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.tipo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchTipo = tipoFilter === "todos" || r.tipo === tipoFilter;
    return matchSearch && matchTipo;
  });

  // Stats
  const totalRegistros = registros.length;
  const avgConformidade = registros.length > 0
    ? Math.round(registros.reduce((acc, r) => acc + calcConformidade(r.respostas).pct, 0) / registros.length)
    : 0;
  const tiposUnicos = [...new Set(registros.map(r => r.tipo))];

  if (isLoading) {
    return <LoadingState message="Carregando formulários..." />;
  }

  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-foreground">{formularios.length}</p>
            <p className="text-xs text-muted-foreground">Formulários Ativos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-foreground">{totalRegistros}</p>
            <p className="text-xs text-muted-foreground">Auditorias Realizadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className={`text-2xl font-bold ${avgConformidade >= 80 ? "text-green-600" : avgConformidade >= 60 ? "text-yellow-600" : "text-red-600"}`}>
              {avgConformidade}%
            </p>
            <p className="text-xs text-muted-foreground">Conformidade Média</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-primary">{tiposUnicos.length}</p>
            <p className="text-xs text-muted-foreground">Tipos de Auditoria</p>
          </CardContent>
        </Card>
      </div>

      {/* Formulários disponíveis */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Formulários de Auditoria Disponíveis
          </CardTitle>
        </CardHeader>
        <CardContent>
          {formularios.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Nenhum formulário configurado"
              description="Configure formulários de auditoria no módulo administrativo"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {formularios.map(f => (
                <Card key={f.id} className="border hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleOpenFormulario(f)}>
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium truncate">{f.nome}</h4>
                        <Badge variant="outline" className="text-[10px] mt-1">{f.tipo}</Badge>
                        {f.setores && f.setores.length > 0 && (
                          <p className="text-[10px] text-muted-foreground mt-1 truncate">
                            Setores: {f.setores.join(", ")}
                          </p>
                        )}
                      </div>
                      <Button size="sm" variant="ghost" className="shrink-0">
                        <ClipboardCheck className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Histórico de Auditorias */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Auditorias Realizadas
            </CardTitle>
            <div className="flex items-center gap-2">
              <SearchInput
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Buscar..."
                className="w-[200px]"
              />
              <Select value={tipoFilter} onValueChange={setTipoFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {tiposUnicos.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredRegistros.length === 0 ? (
            <EmptyState
              icon={ClipboardCheck}
              title="Nenhuma auditoria encontrada"
              description="Realize auditorias usando os formulários acima"
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Setor</TableHead>
                    <TableHead>Auditor</TableHead>
                    <TableHead>Conformidade</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRegistros.map(r => {
                    const conf = calcConformidade(r.respostas);
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(r.data_auditoria), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{r.tipo}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{r.setor}</TableCell>
                        <TableCell className="text-sm">{r.auditor_nome}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${conf.pct >= 80 ? "bg-green-500" : conf.pct >= 60 ? "bg-yellow-500" : "bg-red-500"}`} />
                            <span className="text-sm font-medium">{conf.pct}%</span>
                            <span className="text-xs text-muted-foreground">({conf.conformes}/{conf.total})</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => {
                            setRegistroSelecionado(r);
                            setDetalhesDialog(true);
                          }}>
                            <Eye className="h-4 w-4 mr-1" />
                            Ver
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Preencher Formulário de Auditoria */}
      <Dialog open={novaAuditoriaDialog} onOpenChange={setNovaAuditoriaDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              {formularioSelecionado?.nome}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Setor Auditado *</Label>
              <Input
                value={auditoriaForm.setor}
                onChange={e => setAuditoriaForm({ ...auditoriaForm, setor: e.target.value })}
                placeholder="Ex: Internação, Urgência..."
              />
            </div>

            {/* Sections and questions */}
            {secoes.length > 0 ? (
              secoes.map(secao => {
                const perguntasSecao = perguntas.filter(p => p.secao_id === secao.id);
                return (
                  <Card key={secao.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{secao.nome}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {perguntasSecao.map(p => (
                        <div key={p.id} className="space-y-1">
                          <Label className="text-sm">{p.label}</Label>
                          <Select
                            value={respostas[p.codigo] || ""}
                            onValueChange={v => setRespostas({ ...respostas, [p.codigo]: v })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                              {(p.opcoes || ["conforme", "nao_conforme", "nao_aplicavel"]).map((opt: string) => (
                                <SelectItem key={opt} value={opt}>
                                  {opt === "conforme" ? "Conforme" :
                                    opt === "nao_conforme" ? "Não Conforme" :
                                    opt === "nao_aplicavel" ? "N/A" :
                                    opt === "sim" ? "Sim" :
                                    opt === "nao" ? "Não" :
                                    opt === "sim_completo" ? "Sim (Completo)" :
                                    opt === "parcial" ? "Parcial" :
                                    opt}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <Card className="bg-muted/30">
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground text-center">
                    Este formulário ainda não possui seções configuradas. Configure no Editor de Formulários.
                  </p>
                </CardContent>
              </Card>
            )}

            <div>
              <Label>Observações</Label>
              <Textarea
                value={auditoriaForm.observacoes}
                onChange={e => setAuditoriaForm({ ...auditoriaForm, observacoes: e.target.value })}
                placeholder="Observações gerais da auditoria..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNovaAuditoriaDialog(false)}>Cancelar</Button>
            <Button onClick={handleSubmitAuditoria} disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Registrar Auditoria"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Detalhes da Auditoria */}
      <Dialog open={detalhesDialog} onOpenChange={setDetalhesDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Auditoria</DialogTitle>
          </DialogHeader>
          {registroSelecionado && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <Label className="text-muted-foreground">Tipo</Label>
                  <p className="font-medium">{registroSelecionado.tipo}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Setor</Label>
                  <p className="font-medium">{registroSelecionado.setor}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Auditor</Label>
                  <p className="font-medium">{registroSelecionado.auditor_nome}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Data</Label>
                  <p className="font-medium">{format(new Date(registroSelecionado.data_auditoria), "dd/MM/yyyy")}</p>
                </div>
              </div>

              {/* Respostas */}
              {registroSelecionado.respostas && typeof registroSelecionado.respostas === "object" && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Respostas</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {Object.entries(registroSelecionado.respostas as Record<string, string>).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between text-sm border-b pb-1 last:border-0">
                        <span className="text-muted-foreground">{key}</span>
                        <Badge variant={value === "conforme" || value === "sim" ? "default" : value === "nao_conforme" || value === "nao" ? "destructive" : "secondary"}>
                          {value === "conforme" ? "Conforme" :
                            value === "nao_conforme" ? "Não Conforme" :
                            value === "sim" ? "Sim" :
                            value === "nao" ? "Não" :
                            value}
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {registroSelecionado.observacoes && (
                <div>
                  <Label className="text-muted-foreground">Observações</Label>
                  <p className="text-sm whitespace-pre-wrap">{registroSelecionado.observacoes}</p>
                </div>
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
