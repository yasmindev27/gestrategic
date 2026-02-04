import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, Plus, Upload, Search, Filter, Pencil, Trash2, 
  UserCheck, UserX, Stethoscope, Syringe, MoreHorizontal,
  FileSpreadsheet, Download
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import * as XLSX from "xlsx";

interface Profissional {
  id: string;
  nome: string;
  tipo: "medico" | "enfermagem";
  registro_profissional: string | null;
  especialidade: string | null;
  status: string;
  telefone: string | null;
  email: string | null;
  user_id: string | null;
  observacoes: string | null;
  created_at: string;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  ativo: { label: "Ativo", variant: "default" },
  inativo: { label: "Inativo", variant: "destructive" },
  ferias: { label: "Férias", variant: "secondary" },
  afastado: { label: "Afastado", variant: "outline" },
};

const tipoConfig = {
  medico: { label: "Médico", icon: Stethoscope, color: "text-blue-600" },
  enfermagem: { label: "Enfermagem", icon: Syringe, color: "text-green-600" },
};

const ProfissionaisSaude = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTipo, setFilterTipo] = useState<string>("todos");
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editingProfissional, setEditingProfissional] = useState<Profissional | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    tipo: "medico" as "medico" | "enfermagem",
    registro_profissional: "",
    especialidade: "",
    status: "ativo",
    telefone: "",
    email: "",
    observacoes: "",
  });

  // Query profissionais
  const { data: profissionais, isLoading } = useQuery({
    queryKey: ["profissionais_saude", filterTipo, filterStatus],
    queryFn: async () => {
      let query = supabase
        .from("profissionais_saude")
        .select("*")
        .order("nome");

      if (filterTipo !== "todos") {
        query = query.eq("tipo", filterTipo);
      }
      if (filterStatus !== "todos") {
        query = query.eq("status", filterStatus);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Profissional[];
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("profissionais_saude").insert({
        nome: data.nome.toUpperCase(),
        tipo: data.tipo,
        registro_profissional: data.registro_profissional || null,
        especialidade: data.especialidade || null,
        status: data.status,
        telefone: data.telefone || null,
        email: data.email || null,
        observacoes: data.observacoes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profissionais_saude"] });
      toast({ title: "Sucesso", description: "Profissional cadastrado com sucesso!" });
      resetForm();
      setDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from("profissionais_saude")
        .update({
          nome: data.nome.toUpperCase(),
          tipo: data.tipo,
          registro_profissional: data.registro_profissional || null,
          especialidade: data.especialidade || null,
          status: data.status,
          telefone: data.telefone || null,
          email: data.email || null,
          observacoes: data.observacoes || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profissionais_saude"] });
      toast({ title: "Sucesso", description: "Profissional atualizado com sucesso!" });
      resetForm();
      setDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("profissionais_saude").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profissionais_saude"] });
      toast({ title: "Sucesso", description: "Profissional removido com sucesso!" });
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const importMutation = useMutation({
    mutationFn: async (records: any[]) => {
      const { error } = await supabase.from("profissionais_saude").insert(records);
      if (error) throw error;
      return records.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["profissionais_saude"] });
      toast({ title: "Sucesso", description: `${count} profissionais importados com sucesso!` });
      setImportDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Erro na importação", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      nome: "",
      tipo: "medico",
      registro_profissional: "",
      especialidade: "",
      status: "ativo",
      telefone: "",
      email: "",
      observacoes: "",
    });
    setEditingProfissional(null);
  };

  const handleEdit = (profissional: Profissional) => {
    setEditingProfissional(profissional);
    setFormData({
      nome: profissional.nome,
      tipo: profissional.tipo,
      registro_profissional: profissional.registro_profissional || "",
      especialidade: profissional.especialidade || "",
      status: profissional.status,
      telefone: profissional.telefone || "",
      email: profissional.email || "",
      observacoes: profissional.observacoes || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.nome.trim()) {
      toast({ title: "Erro", description: "Nome é obrigatório", variant: "destructive" });
      return;
    }

    if (editingProfissional) {
      updateMutation.mutate({ id: editingProfissional.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const records = jsonData.map((row: any) => ({
          nome: (row.Nome || row.NOME || row.nome || "").toString().toUpperCase(),
          tipo: (row.Tipo || row.TIPO || row.tipo || "medico").toString().toLowerCase(),
          registro_profissional: (row["Registro Profissional"] || row.CRM || row.COREN || row.registro || "").toString() || null,
          especialidade: (row.Especialidade || row.ESPECIALIDADE || "").toString() || null,
          status: "ativo",
          telefone: (row.Telefone || row.TELEFONE || "").toString() || null,
          email: (row.Email || row.EMAIL || "").toString() || null,
        })).filter((r: any) => r.nome);

        if (records.length > 0) {
          importMutation.mutate(records);
        } else {
          toast({ title: "Erro", description: "Nenhum registro válido encontrado", variant: "destructive" });
        }
      } catch (error) {
        toast({ title: "Erro", description: "Erro ao processar arquivo", variant: "destructive" });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const downloadTemplate = () => {
    const template = [
      { Nome: "JOÃO DA SILVA", Tipo: "medico", "Registro Profissional": "CRM 12345", Especialidade: "Clínico Geral", Telefone: "(14) 99999-9999", Email: "joao@email.com" },
      { Nome: "MARIA SANTOS", Tipo: "enfermagem", "Registro Profissional": "COREN 54321", Especialidade: "UTI", Telefone: "(14) 88888-8888", Email: "maria@email.com" },
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Profissionais");
    XLSX.writeFile(wb, "modelo_importacao_profissionais.xlsx");
  };

  const filteredProfissionais = profissionais?.filter((p) =>
    p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.registro_profissional?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.especialidade?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: profissionais?.length || 0,
    medicos: profissionais?.filter((p) => p.tipo === "medico").length || 0,
    enfermagem: profissionais?.filter((p) => p.tipo === "enfermagem").length || 0,
    ativos: profissionais?.filter((p) => p.status === "ativo").length || 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Profissionais de Saúde</h2>
            <p className="text-sm text-muted-foreground">Cadastro central de médicos e enfermagem</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Importar
          </Button>
          <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Médicos</p>
                <p className="text-2xl font-bold text-blue-600">{stats.medicos}</p>
              </div>
              <Stethoscope className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Enfermagem</p>
                <p className="text-2xl font-bold text-green-600">{stats.enfermagem}</p>
              </div>
              <Syringe className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ativos</p>
                <p className="text-2xl font-bold text-emerald-600">{stats.ativos}</p>
              </div>
              <UserCheck className="h-8 w-8 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, registro ou especialidade..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="medico">Médicos</SelectItem>
                <SelectItem value="enfermagem">Enfermagem</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="ativo">Ativos</SelectItem>
                <SelectItem value="inativo">Inativos</SelectItem>
                <SelectItem value="ferias">Férias</SelectItem>
                <SelectItem value="afastado">Afastados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Registro</TableHead>
                  <TableHead>Especialidade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProfissionais?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhum profissional encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProfissionais?.map((p) => {
                    const TipoIcon = tipoConfig[p.tipo].icon;
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.nome}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <TipoIcon className={`h-4 w-4 ${tipoConfig[p.tipo].color}`} />
                            <span>{tipoConfig[p.tipo].label}</span>
                          </div>
                        </TableCell>
                        <TableCell>{p.registro_profissional || "-"}</TableCell>
                        <TableCell>{p.especialidade || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={statusConfig[p.status]?.variant || "outline"}>
                            {statusConfig[p.status]?.label || p.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {p.telefone && <div>{p.telefone}</div>}
                            {p.email && <div className="text-muted-foreground">{p.email}</div>}
                            {!p.telefone && !p.email && "-"}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(p)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => {
                                  if (confirm("Deseja realmente excluir este profissional?")) {
                                    deleteMutation.mutate(p.id);
                                  }
                                }}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingProfissional ? "Editar Profissional" : "Novo Profissional"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Nome Completo *</Label>
                <Input
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Nome do profissional"
                />
              </div>
              <div>
                <Label>Tipo *</Label>
                <Select value={formData.tipo} onValueChange={(v) => setFormData({ ...formData, tipo: v as "medico" | "enfermagem" })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="medico">Médico</SelectItem>
                    <SelectItem value="enfermagem">Enfermagem</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                    <SelectItem value="ferias">Férias</SelectItem>
                    <SelectItem value="afastado">Afastado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Registro Profissional</Label>
                <Input
                  value={formData.registro_profissional}
                  onChange={(e) => setFormData({ ...formData, registro_profissional: e.target.value })}
                  placeholder="CRM / COREN"
                />
              </div>
              <div>
                <Label>Especialidade</Label>
                <Input
                  value={formData.especialidade}
                  onChange={(e) => setFormData({ ...formData, especialidade: e.target.value })}
                  placeholder="Ex: Clínico Geral, UTI"
                />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div className="col-span-2">
                <Label>Observações</Label>
                <Textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  placeholder="Informações adicionais..."
                  rows={2}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingProfissional ? "Salvar" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar Profissionais</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Faça upload de um arquivo Excel ou CSV com os dados dos profissionais.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={downloadTemplate} className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Baixar Modelo
              </Button>
            </div>
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
              <FileSpreadsheet className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground mb-2">
                Arraste um arquivo ou clique para selecionar
              </p>
              <Input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="cursor-pointer"
              />
            </div>
            <div className="text-xs text-muted-foreground">
              <p><strong>Colunas esperadas:</strong></p>
              <p>Nome, Tipo (medico/enfermagem), Registro Profissional, Especialidade, Telefone, Email</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfissionaisSaude;
