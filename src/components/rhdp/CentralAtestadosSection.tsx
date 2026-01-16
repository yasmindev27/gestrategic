import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, FileText, Calendar, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Atestado {
  id: string;
  funcionario_user_id: string;
  funcionario_nome: string;
  data_inicio: string;
  data_fim: string;
  dias_afastamento: number;
  tipo: string;
  cid: string | null;
  medico_nome: string | null;
  crm: string | null;
  observacao: string | null;
  status: string;
  created_at: string;
}

interface Profile {
  user_id: string;
  full_name: string;
}

export const CentralAtestadosSection = () => {
  const { toast } = useToast();
  const [atestados, setAtestados] = useState<Atestado[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [filterTipo, setFilterTipo] = useState("todos");

  // Form state
  const [formData, setFormData] = useState({
    funcionario_user_id: "",
    data_inicio: format(new Date(), "yyyy-MM-dd"),
    data_fim: format(new Date(), "yyyy-MM-dd"),
    tipo: "medico",
    cid: "",
    medico_nome: "",
    crm: "",
    observacao: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [atestadosRes, profilesRes] = await Promise.all([
        supabase
          .from("atestados")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("user_id, full_name")
          .order("full_name"),
      ]);

      if (atestadosRes.error) throw atestadosRes.error;
      if (profilesRes.error) throw profilesRes.error;

      setAtestados(atestadosRes.data || []);
      setProfiles(profilesRes.data || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateDays = (inicio: string, fim: string) => {
    return differenceInDays(new Date(fim), new Date(inicio)) + 1;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const selectedProfile = profiles.find(p => p.user_id === formData.funcionario_user_id);
    if (!selectedProfile) {
      toast({
        title: "Erro",
        description: "Selecione um colaborador.",
        variant: "destructive",
      });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const diasAfastamento = calculateDays(formData.data_inicio, formData.data_fim);

    const { error } = await supabase.from("atestados").insert({
      funcionario_user_id: formData.funcionario_user_id,
      funcionario_nome: selectedProfile.full_name,
      data_inicio: formData.data_inicio,
      data_fim: formData.data_fim,
      dias_afastamento: diasAfastamento,
      tipo: formData.tipo,
      cid: formData.cid || null,
      medico_nome: formData.medico_nome || null,
      crm: formData.crm || null,
      observacao: formData.observacao || null,
      registrado_por: user.id,
      status: "validado",
    });

    if (error) {
      console.error("Erro ao salvar:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o atestado.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Sucesso",
      description: "Atestado registrado com sucesso.",
    });

    setIsDialogOpen(false);
    setFormData({
      funcionario_user_id: "",
      data_inicio: format(new Date(), "yyyy-MM-dd"),
      data_fim: format(new Date(), "yyyy-MM-dd"),
      tipo: "medico",
      cid: "",
      medico_nome: "",
      crm: "",
      observacao: "",
    });
    loadData();
  };

  const filteredAtestados = atestados.filter(a => {
    const matchesSearch = a.funcionario_nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "todos" || a.status === filterStatus;
    const matchesTipo = filterTipo === "todos" || a.tipo === filterTipo;
    return matchesSearch && matchesStatus && matchesTipo;
  });

  const totalDiasAfastamento = atestados
    .filter(a => a.status === "validado")
    .reduce((sum, a) => sum + a.dias_afastamento, 0);

  const atestadosPendentes = atestados.filter(a => a.status === "pendente").length;
  const atestadosValidados = atestados.filter(a => a.status === "validado").length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "validado":
        return <Badge className="bg-green-500">Validado</Badge>;
      case "pendente":
        return <Badge variant="secondary">Pendente</Badge>;
      case "rejeitado":
        return <Badge variant="destructive">Rejeitado</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getTipoBadge = (tipo: string) => {
    switch (tipo) {
      case "medico":
        return <Badge variant="outline">Atestado Médico</Badge>;
      case "acompanhante":
        return <Badge variant="outline">Acompanhante</Badge>;
      case "declaracao":
        return <Badge variant="outline">Declaração</Badge>;
      default:
        return <Badge variant="outline">{tipo}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Atestados</CardTitle>
            <FileText className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{atestados.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Dias Afastamento</CardTitle>
            <Calendar className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDiasAfastamento}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Validados</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{atestadosValidados}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{atestadosPendentes}</div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de ações */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex flex-1 gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar colaborador..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos Status</SelectItem>
              <SelectItem value="validado">Validado</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="rejeitado">Rejeitado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos Tipos</SelectItem>
              <SelectItem value="medico">Atestado Médico</SelectItem>
              <SelectItem value="acompanhante">Acompanhante</SelectItem>
              <SelectItem value="declaracao">Declaração</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Atestado
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Registrar Atestado</DialogTitle>
              <DialogDescription>
                Registre um novo atestado ou declaração de afastamento.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="funcionario">Colaborador</Label>
                <Select
                  value={formData.funcionario_user_id}
                  onValueChange={(value) => setFormData({ ...formData, funcionario_user_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o colaborador" />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles.map((profile) => (
                      <SelectItem key={profile.user_id} value={profile.user_id}>
                        {profile.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value) => setFormData({ ...formData, tipo: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="medico">Atestado Médico</SelectItem>
                    <SelectItem value="acompanhante">Acompanhante</SelectItem>
                    <SelectItem value="declaracao">Declaração</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="data_inicio">Data Início</Label>
                  <Input
                    id="data_inicio"
                    type="date"
                    value={formData.data_inicio}
                    onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="data_fim">Data Fim</Label>
                  <Input
                    id="data_fim"
                    type="date"
                    value={formData.data_fim}
                    onChange={(e) => setFormData({ ...formData, data_fim: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cid">CID (opcional)</Label>
                  <Input
                    id="cid"
                    value={formData.cid}
                    onChange={(e) => setFormData({ ...formData, cid: e.target.value })}
                    placeholder="Ex: J11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="crm">CRM (opcional)</Label>
                  <Input
                    id="crm"
                    value={formData.crm}
                    onChange={(e) => setFormData({ ...formData, crm: e.target.value })}
                    placeholder="CRM do médico"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="medico_nome">Nome do Médico (opcional)</Label>
                <Input
                  id="medico_nome"
                  value={formData.medico_nome}
                  onChange={(e) => setFormData({ ...formData, medico_nome: e.target.value })}
                  placeholder="Dr(a). Nome"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacao">Observação</Label>
                <Textarea
                  id="observacao"
                  value={formData.observacao}
                  onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
                  placeholder="Observações adicionais..."
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Registrar</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabela */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Colaborador</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Período</TableHead>
              <TableHead>Dias</TableHead>
              <TableHead>CID</TableHead>
              <TableHead>Médico</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                </TableCell>
              </TableRow>
            ) : filteredAtestados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Nenhum atestado encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filteredAtestados.map((atestado) => (
                <TableRow key={atestado.id}>
                  <TableCell className="font-medium">{atestado.funcionario_nome}</TableCell>
                  <TableCell>{getTipoBadge(atestado.tipo)}</TableCell>
                  <TableCell>
                    {format(new Date(atestado.data_inicio), "dd/MM/yyyy", { locale: ptBR })} -{" "}
                    {format(new Date(atestado.data_fim), "dd/MM/yyyy", { locale: ptBR })}
                  </TableCell>
                  <TableCell className="font-medium">{atestado.dias_afastamento} dia(s)</TableCell>
                  <TableCell>{atestado.cid || "-"}</TableCell>
                  <TableCell>
                    {atestado.medico_nome ? (
                      <span className="text-sm">
                        {atestado.medico_nome}
                        {atestado.crm && <span className="text-muted-foreground"> ({atestado.crm})</span>}
                      </span>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(atestado.status)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
