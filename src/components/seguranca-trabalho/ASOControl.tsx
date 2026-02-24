import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, FileText, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ASO {
  id: string;
  colaborador_nome: string;
  tipo_aso: string;
  data_exame: string;
  data_validade: string | null;
  resultado: string;
  medico_nome: string | null;
  crm: string | null;
  cargo_atual: string | null;
  cargo_novo: string | null;
  setor: string | null;
  riscos_ocupacionais: string | null;
  exames_realizados: string | null;
  restricoes: string | null;
  observacoes: string | null;
  status: string;
  registrado_por_nome: string;
  created_at: string;
}

const TIPO_ASO_LABELS: Record<string, string> = {
  admissional: "Admissional",
  periodico: "Periódico",
  retorno_trabalho: "Retorno ao Trabalho",
  mudanca_funcao: "Mudança de Função",
  demissional: "Demissional",
};

const RESULTADO_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  apto: { label: "Apto", color: "bg-green-100 text-green-800 border-green-300", icon: CheckCircle },
  inapto: { label: "Inapto", color: "bg-red-100 text-red-800 border-red-300", icon: XCircle },
  apto_com_restricao: { label: "Apto c/ Restrição", color: "bg-yellow-100 text-yellow-800 border-yellow-300", icon: AlertTriangle },
};

export function ASOControl() {
  const [asos, setAsos] = useState<ASO[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroResultado, setFiltroResultado] = useState("todos");
  const [nomeUsuario, setNomeUsuario] = useState("Sistema");
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        supabase.from("profiles").select("full_name").eq("user_id", data.session.user.id).single()
          .then(({ data: p }) => { if (p?.full_name) setNomeUsuario(p.full_name); });
      }
    });
  }, []);

  const [form, setForm] = useState({
    colaborador_nome: "",
    tipo_aso: "periodico",
    data_exame: "",
    data_validade: "",
    resultado: "apto",
    medico_nome: "",
    crm: "",
    cargo_atual: "",
    cargo_novo: "",
    setor: "",
    riscos_ocupacionais: "",
    exames_realizados: "",
    restricoes: "",
    observacoes: "",
  });

  const fetchASOs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("asos_seguranca")
      .select("*")
      .order("data_exame", { ascending: false });

    if (error) {
      toast({ title: "Erro ao carregar ASOs", description: error.message, variant: "destructive" });
    } else {
      setAsos((data as unknown as ASO[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchASOs(); }, []);

  const handleSubmit = async () => {
    if (!form.colaborador_nome || !form.data_exame) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }

    const payload = {
      colaborador_nome: form.colaborador_nome,
      tipo_aso: form.tipo_aso,
      data_exame: form.data_exame,
      data_validade: form.data_validade || null,
      resultado: form.resultado,
      medico_nome: form.medico_nome || null,
      crm: form.crm || null,
      cargo_atual: form.cargo_atual || null,
      cargo_novo: form.cargo_novo || null,
      setor: form.setor || null,
      riscos_ocupacionais: form.riscos_ocupacionais || null,
      exames_realizados: form.exames_realizados || null,
      restricoes: form.restricoes || null,
      observacoes: form.observacoes || null,
      registrado_por_nome: nomeUsuario,
    };

    const { error } = await supabase.from("asos_seguranca").insert(payload as any);

    if (error) {
      toast({ title: "Erro ao registrar ASO", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "ASO registrado com sucesso" });
      setDialogOpen(false);
      setForm({
        colaborador_nome: "", tipo_aso: "periodico", data_exame: "", data_validade: "",
        resultado: "apto", medico_nome: "", crm: "", cargo_atual: "", cargo_novo: "",
        setor: "", riscos_ocupacionais: "", exames_realizados: "", restricoes: "", observacoes: "",
      });
      fetchASOs();
    }
  };

  const getValidadeStatus = (dataValidade: string | null) => {
    if (!dataValidade) return null;
    const dias = differenceInDays(parseISO(dataValidade), new Date());
    if (dias < 0) return { label: "Vencido", className: "bg-red-100 text-red-800" };
    if (dias <= 30) return { label: `Vence em ${dias}d`, className: "bg-yellow-100 text-yellow-800" };
    return { label: "Vigente", className: "bg-green-100 text-green-800" };
  };

  const filtered = asos.filter((a) => {
    const matchSearch = a.colaborador_nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchTipo = filtroTipo === "todos" || a.tipo_aso === filtroTipo;
    const matchResultado = filtroResultado === "todos" || a.resultado === filtroResultado;
    return matchSearch && matchTipo && matchResultado;
  });

  // Stats
  const totalVigentes = asos.filter(a => {
    if (!a.data_validade) return a.status === "vigente";
    return differenceInDays(parseISO(a.data_validade), new Date()) >= 0;
  }).length;
  const totalVencidos = asos.filter(a => a.data_validade && differenceInDays(parseISO(a.data_validade), new Date()) < 0).length;
  const proximosVencer = asos.filter(a => {
    if (!a.data_validade) return false;
    const dias = differenceInDays(parseISO(a.data_validade), new Date());
    return dias >= 0 && dias <= 30;
  }).length;
  const inaptos = asos.filter(a => a.resultado === "inapto").length;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <FileText className="h-6 w-6 mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold">{totalVigentes}</p>
            <p className="text-xs text-muted-foreground">ASOs Vigentes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-6 w-6 mx-auto text-yellow-500 mb-1" />
            <p className="text-2xl font-bold">{proximosVencer}</p>
            <p className="text-xs text-muted-foreground">Próximos a Vencer</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <XCircle className="h-6 w-6 mx-auto text-destructive mb-1" />
            <p className="text-2xl font-bold">{totalVencidos}</p>
            <p className="text-xs text-muted-foreground">Vencidos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <XCircle className="h-6 w-6 mx-auto text-red-600 mb-1" />
            <p className="text-2xl font-bold">{inaptos}</p>
            <p className="text-xs text-muted-foreground">Inaptos</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters + Add */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar colaborador..." className="pl-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Tipos</SelectItem>
              {Object.entries(TIPO_ASO_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filtroResultado} onValueChange={setFiltroResultado}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos Resultados</SelectItem>
              <SelectItem value="apto">Apto</SelectItem>
              <SelectItem value="inapto">Inapto</SelectItem>
              <SelectItem value="apto_com_restricao">Apto c/ Restrição</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Novo ASO</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Registrar ASO</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label>Colaborador *</Label>
                <Input value={form.colaborador_nome} onChange={(e) => setForm({ ...form, colaborador_nome: e.target.value })} />
              </div>
              <div>
                <Label>Tipo de ASO *</Label>
                <Select value={form.tipo_aso} onValueChange={(v) => setForm({ ...form, tipo_aso: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TIPO_ASO_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Resultado *</Label>
                <Select value={form.resultado} onValueChange={(v) => setForm({ ...form, resultado: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="apto">Apto</SelectItem>
                    <SelectItem value="inapto">Inapto</SelectItem>
                    <SelectItem value="apto_com_restricao">Apto c/ Restrição</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Data do Exame *</Label>
                <Input type="date" value={form.data_exame} onChange={(e) => setForm({ ...form, data_exame: e.target.value })} />
              </div>
              <div>
                <Label>Data de Validade</Label>
                <Input type="date" value={form.data_validade} onChange={(e) => setForm({ ...form, data_validade: e.target.value })} />
              </div>
              <div>
                <Label>Médico Responsável</Label>
                <Input value={form.medico_nome} onChange={(e) => setForm({ ...form, medico_nome: e.target.value })} />
              </div>
              <div>
                <Label>CRM</Label>
                <Input value={form.crm} onChange={(e) => setForm({ ...form, crm: e.target.value })} />
              </div>
              <div>
                <Label>Cargo Atual</Label>
                <Input value={form.cargo_atual} onChange={(e) => setForm({ ...form, cargo_atual: e.target.value })} />
              </div>
              {form.tipo_aso === "mudanca_funcao" && (
                <div>
                  <Label>Cargo Novo</Label>
                  <Input value={form.cargo_novo} onChange={(e) => setForm({ ...form, cargo_novo: e.target.value })} />
                </div>
              )}
              <div>
                <Label>Setor</Label>
                <Input value={form.setor} onChange={(e) => setForm({ ...form, setor: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <Label>Riscos Ocupacionais</Label>
                <Textarea value={form.riscos_ocupacionais} onChange={(e) => setForm({ ...form, riscos_ocupacionais: e.target.value })} placeholder="Ex: Ruído, agentes biológicos..." />
              </div>
              <div className="md:col-span-2">
                <Label>Exames Realizados</Label>
                <Textarea value={form.exames_realizados} onChange={(e) => setForm({ ...form, exames_realizados: e.target.value })} placeholder="Ex: Hemograma, audiometria..." />
              </div>
              {form.resultado === "apto_com_restricao" && (
                <div className="md:col-span-2">
                  <Label>Restrições</Label>
                  <Textarea value={form.restricoes} onChange={(e) => setForm({ ...form, restricoes: e.target.value })} />
                </div>
              )}
              <div className="md:col-span-2">
                <Label>Observações</Label>
                <Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
              </div>
              <div className="md:col-span-2 flex justify-end">
                <Button onClick={handleSubmit}>Salvar ASO</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Data Exame</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead>Resultado</TableHead>
                <TableHead>Médico</TableHead>
                <TableHead>Setor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum ASO encontrado</TableCell></TableRow>
              ) : (
                filtered.map((aso) => {
                  const valStatus = getValidadeStatus(aso.data_validade);
                  const resConfig = RESULTADO_CONFIG[aso.resultado];
                  return (
                    <TableRow key={aso.id}>
                      <TableCell className="font-medium">{aso.colaborador_nome}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{TIPO_ASO_LABELS[aso.tipo_aso] || aso.tipo_aso}</Badge>
                      </TableCell>
                      <TableCell>{format(parseISO(aso.data_exame), "dd/MM/yyyy")}</TableCell>
                      <TableCell>
                        {aso.data_validade ? (
                          <div className="flex flex-col gap-1">
                            <span className="text-sm">{format(parseISO(aso.data_validade), "dd/MM/yyyy")}</span>
                            {valStatus && <Badge className={valStatus.className}>{valStatus.label}</Badge>}
                          </div>
                        ) : <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>
                        <Badge className={resConfig?.color || ""}>{resConfig?.label || aso.resultado}</Badge>
                      </TableCell>
                      <TableCell>{aso.medico_nome || "-"}</TableCell>
                      <TableCell>{aso.setor || "-"}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
