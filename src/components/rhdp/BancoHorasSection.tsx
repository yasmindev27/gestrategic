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
import { Plus, Search, Clock, TrendingUp, TrendingDown, CheckCircle, XCircle, Filter } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface BancoHora {
  id: string;
  funcionario_user_id: string;
  funcionario_nome: string;
  data: string;
  tipo: string;
  horas: number;
  motivo: string | null;
  observacao: string | null;
  status: string;
  created_at: string;
}

interface Profile {
  user_id: string;
  full_name: string;
}

export const BancoHorasSection = () => {
  const { toast } = useToast();
  const [registros, setRegistros] = useState<BancoHora[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [filterTipo, setFilterTipo] = useState("todos");

  // Form state
  const [formData, setFormData] = useState({
    funcionario_user_id: "",
    data: format(new Date(), "yyyy-MM-dd"),
    tipo: "credito",
    horas: "",
    motivo: "",
    observacao: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [registrosRes, profilesRes] = await Promise.all([
        supabase
          .from("banco_horas")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("user_id, full_name")
          .order("full_name"),
      ]);

      if (registrosRes.error) throw registrosRes.error;
      if (profilesRes.error) throw profilesRes.error;

      setRegistros(registrosRes.data || []);
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

    const { error } = await supabase.from("banco_horas").insert({
      funcionario_user_id: formData.funcionario_user_id,
      funcionario_nome: selectedProfile.full_name,
      data: formData.data,
      tipo: formData.tipo,
      horas: parseFloat(formData.horas),
      motivo: formData.motivo || null,
      observacao: formData.observacao || null,
      registrado_por: user.id,
      status: "aprovado",
    });

    if (error) {
      console.error("Erro ao salvar:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o registro.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Sucesso",
      description: "Registro de horas salvo com sucesso.",
    });

    setIsDialogOpen(false);
    setFormData({
      funcionario_user_id: "",
      data: format(new Date(), "yyyy-MM-dd"),
      tipo: "credito",
      horas: "",
      motivo: "",
      observacao: "",
    });
    loadData();
  };

  const calcularSaldo = (funcionarioId: string) => {
    const registrosFuncionario = registros.filter(
      r => r.funcionario_user_id === funcionarioId && r.status === "aprovado"
    );
    
    let saldo = 0;
    registrosFuncionario.forEach(r => {
      if (r.tipo === "credito") {
        saldo += Number(r.horas);
      } else {
        saldo -= Number(r.horas);
      }
    });
    
    return saldo;
  };

  const filteredRegistros = registros.filter(r => {
    const matchesSearch = r.funcionario_nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "todos" || r.status === filterStatus;
    const matchesTipo = filterTipo === "todos" || r.tipo === filterTipo;
    return matchesSearch && matchesStatus && matchesTipo;
  });

  const totalCreditos = registros
    .filter(r => r.tipo === "credito" && r.status === "aprovado")
    .reduce((sum, r) => sum + Number(r.horas), 0);

  const totalDebitos = registros
    .filter(r => r.tipo === "debito" && r.status === "aprovado")
    .reduce((sum, r) => sum + Number(r.horas), 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "aprovado":
        return <Badge className="bg-green-500">Aprovado</Badge>;
      case "pendente":
        return <Badge variant="secondary">Pendente</Badge>;
      case "rejeitado":
        return <Badge variant="destructive">Rejeitado</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Créditos</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">+{totalCreditos.toFixed(1)}h</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Débitos</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">-{totalDebitos.toFixed(1)}h</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Saldo Geral</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalCreditos - totalDebitos >= 0 ? "text-green-600" : "text-red-600"}`}>
              {(totalCreditos - totalDebitos).toFixed(1)}h
            </div>
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
              <SelectItem value="aprovado">Aprovado</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="rejeitado">Rejeitado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos Tipos</SelectItem>
              <SelectItem value="credito">Crédito</SelectItem>
              <SelectItem value="debito">Débito</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Registro
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Registro de Horas</DialogTitle>
              <DialogDescription>
                Registre crédito ou débito de horas para um colaborador.
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="data">Data</Label>
                  <Input
                    id="data"
                    type="date"
                    value={formData.data}
                    onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                    required
                  />
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
                      <SelectItem value="credito">Crédito (+)</SelectItem>
                      <SelectItem value="debito">Débito (-)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="horas">Horas</Label>
                <Input
                  id="horas"
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={formData.horas}
                  onChange={(e) => setFormData({ ...formData, horas: e.target.value })}
                  placeholder="Ex: 2.5"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="motivo">Motivo</Label>
                <Input
                  id="motivo"
                  value={formData.motivo}
                  onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                  placeholder="Hora extra, compensação, etc."
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
                <Button type="submit">Salvar</Button>
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
              <TableHead>Data</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Horas</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Saldo Atual</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                </TableCell>
              </TableRow>
            ) : filteredRegistros.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Nenhum registro encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filteredRegistros.map((registro) => (
                <TableRow key={registro.id}>
                  <TableCell className="font-medium">{registro.funcionario_nome}</TableCell>
                  <TableCell>
                    {format(new Date(registro.data), "dd/MM/yyyy", { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    <Badge variant={registro.tipo === "credito" ? "default" : "secondary"}>
                      {registro.tipo === "credito" ? (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      ) : (
                        <TrendingDown className="h-3 w-3 mr-1" />
                      )}
                      {registro.tipo === "credito" ? "Crédito" : "Débito"}
                    </Badge>
                  </TableCell>
                  <TableCell className={registro.tipo === "credito" ? "text-green-600" : "text-red-600"}>
                    {registro.tipo === "credito" ? "+" : "-"}{Number(registro.horas).toFixed(1)}h
                  </TableCell>
                  <TableCell>{registro.motivo || "-"}</TableCell>
                  <TableCell>{getStatusBadge(registro.status)}</TableCell>
                  <TableCell className="font-medium">
                    {calcularSaldo(registro.funcionario_user_id).toFixed(1)}h
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
