import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Users, Plus, Upload, Search, Pencil, Trash2,
  UserCheck, MoreHorizontal, FileSpreadsheet, Download,
  ClipboardList, Briefcase,
} from "lucide-react";
import { ProfissionalPerfilDialog } from "./ProfissionalPerfilDialog";
import { useCargos } from "@/hooks/useProfissionais";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import * as XLSX from "xlsx";


interface Profissional {
  id: string;
  nome: string;
  tipo: string;
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

// Mapeamento de cargo para tipo legacy (necessário para compatibilidade com a coluna `tipo`)
const resolverTipo = (cargoNome: string): string => {
  const lower = cargoNome.toLowerCase();
  if (lower.includes("médico") || lower.includes("medico") || lower.includes("clínico") || lower.includes("clinico")) return "medico";
  if (lower.includes("enferm") || lower.includes("técnico") || lower.includes("tecnico") || lower.includes("auxiliar")) return "enfermagem";
  return "outros";
};


const ProfissionaisSaude = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCargo, setFilterCargo] = useState<string>("todos");
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [perfilOpen, setPerfilOpen] = useState(false);
  const [selectedProfissional, setSelectedProfissional] = useState<Profissional | null>(null);
  const [editingProfissional, setEditingProfissional] = useState<Profissional | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    tipo: "outros",
    especialidade: "", // cargo livre ou do banco
    registro_profissional: "",
    status: "ativo",
    telefone: "",
    email: "",
    observacoes: "",
  });

  const { data: cargosDb = [] } = useCargos();
  const cargosNomes = cargosDb.map((c) => c.nome);

  const { data: profissionais, isLoading } = useQuery({
    queryKey: ["profissionais_saude", filterStatus],
    queryFn: async () => {
      let query = supabase.from("profissionais_saude").select("*").order("nome");
      if (filterStatus !== "todos") query = query.eq("status", filterStatus);
      const { data, error } = await query;
      if (error) throw error;
      return data as Profissional[];
    },
  });


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
      const { error } = await supabase.from("profissionais_saude").update({
        nome: data.nome.toUpperCase(),
        tipo: data.tipo,
        registro_profissional: data.registro_profissional || null,
        especialidade: data.especialidade || null,
        status: data.status,
        telefone: data.telefone || null,
        email: data.email || null,
        observacoes: data.observacoes || null,
      }).eq("id", id);
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
      nome: "", tipo: "outros", especialidade: "", registro_profissional: "",
      status: "ativo", telefone: "", email: "", observacoes: "",
    });
    setEditingProfissional(null);
  };

  const handleEdit = (profissional: Profissional) => {
    setEditingProfissional(profissional);
    setFormData({
      nome: profissional.nome,
      tipo: profissional.tipo,
      especialidade: profissional.especialidade || "",
      registro_profissional: profissional.registro_profissional || "",
      status: profissional.status,
      telefone: profissional.telefone || "",
      email: profissional.email || "",
      observacoes: profissional.observacoes || "",
    });
    setDialogOpen(true);
  };

  const handleCargoBancoSelect = (cargoNome: string) => {
    setFormData((f) => ({
      ...f,
      especialidade: cargoNome,
      tipo: resolverTipo(cargoNome),
    }));
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

        const records = jsonData.map((row: any) => {
          const cargoRaw = (row.Cargo || row.cargo || row.CARGO || "").toString();
          const tipoRaw = (row["Tipo"] || row.TIPO || row.tipo || "").toString().toLowerCase();
          // Determina tipo a partir do cargo ou coluna tipo
          let tipo = "outros";
          const cargoLower = cargoRaw.toLowerCase();
          if (tipoRaw.includes("medico") || tipoRaw.includes("médico") || cargoLower.includes("médico") || cargoLower.includes("medico") || cargoLower.includes("clínico") || cargoLower.includes("clinico")) {
            tipo = "medico";
          } else if (tipoRaw.includes("enf") || tipoRaw.includes("téc") || tipoRaw.includes("tec") || cargoLower.includes("enferm") || cargoLower.includes("técnico") || cargoLower.includes("auxiliar")) {
            tipo = "enfermagem";
          }

          const situacao = (row["Situação do colaborador"] || row["Situacao do colaborador"] || row.Situacao || row.situacao || "").toString().toLowerCase();
          let status = "ativo";
          if (situacao.includes("inativ") || situacao.includes("demit")) status = "inativo";
          else if (situacao.includes("féri") || situacao.includes("feri")) status = "ferias";
          else if (situacao.includes("afast")) status = "afastado";

          return {
            nome: (row["Nome de exibição"] || row["Nome de exibicao"] || row.Nome || row.NOME || row.nome || "").toString().toUpperCase(),
            tipo,
            registro_profissional: (row["Matrícula"] || row.Matricula || row.matricula || "").toString() || null,
            especialidade: cargoRaw || null,
            status,
            telefone: null,
            email: null,
          };
        }).filter((r: any) => r.nome);

        if (records.length > 0) {
          importMutation.mutate(records);
        } else {
          toast({ title: "Erro", description: "Nenhum registro válido encontrado", variant: "destructive" });
        }
      } catch {
        toast({ title: "Erro", description: "Erro ao processar arquivo", variant: "destructive" });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const downloadTemplate = () => {
    const template = [
      { "Matrícula": "12345", "Nome de exibição": "JOÃO DA SILVA", "Data de admissão": "01/01/2020", "Data de demissão": "", "Cargo": "Clínico Geral", "Tipo": "medico", "Situação do colaborador": "Ativo" },
      { "Matrícula": "54321", "Nome de exibição": "MARIA SANTOS", "Data de admissão": "15/03/2021", "Data de demissão": "", "Cargo": "Enfermeira UTI", "Tipo": "enfermagem", "Situação do colaborador": "Ativo" },
      { "Matrícula": "98765", "Nome de exibição": "ANA COSTA", "Data de admissão": "10/06/2022", "Data de demissão": "", "Cargo": "Recepcionista", "Tipo": "outros", "Situação do colaborador": "Ativo" },
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Profissionais");
    XLSX.writeFile(wb, "modelo_importacao_profissionais.xlsx");
  };


  const filteredProfissionais = profissionais?.filter((p) => {
    const matchSearch = p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.registro_profissional?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.especialidade?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchCargo = filterCargo === "todos" ||
      p.especialidade?.toLowerCase() === filterCargo.toLowerCase() ||
      p.tipo === filterCargo;

    return matchSearch && matchCargo;
  });

  // Cargos únicos presentes nos profissionais cadastrados (para o filtro)
  const cargosUnicos = Array.from(new Set(
    profissionais?.map((p) => p.especialidade).filter(Boolean) ?? []
  )).sort() as string[];

  const stats = {
    total: profissionais?.length || 0,
    ativos: profissionais?.filter((p) => p.status === "ativo").length || 0,
    inativos: profissionais?.filter((p) => p.status === "inativo").length || 0,
    cargos: cargosUnicos.length,
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
            <p className="text-sm text-muted-foreground">Cadastro central — todos os cargos da unidade</p>
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
        {[
          { label: "Total", value: stats.total, icon: Users },
          { label: "Ativos", value: stats.ativos, icon: UserCheck },
          { label: "Inativos/Afastados", value: stats.inativos, icon: UserCheck },
          { label: "Cargos Distintos", value: stats.cargos, icon: Briefcase },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="text-2xl font-bold">{value}</p>
                </div>
                <Icon className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, registro ou cargo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterCargo} onValueChange={setFilterCargo}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por cargo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Cargos</SelectItem>
                {cargosUnicos.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
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
                  <TableHead>Matrícula</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProfissionais?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum profissional encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProfissionais?.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-muted-foreground">{p.registro_profissional || "-"}</TableCell>
                      <TableCell className="font-medium uppercase">{p.nome}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span>{p.especialidade || p.tipo || "-"}</span>
                        </div>
                      </TableCell>
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
                            <DropdownMenuItem onClick={() => { setSelectedProfissional(p); setPerfilOpen(true); }}>
                              <ClipboardList className="h-4 w-4 mr-2" />
                              Ver Perfil
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(p)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => { if (confirm("Deseja realmente excluir este profissional?")) deleteMutation.mutate(p.id); }}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
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
            <DialogTitle>{editingProfissional ? "Editar Profissional" : "Novo Profissional"}</DialogTitle>
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

              {/* Cargo — Select do banco + fallback livre */}
              <div className="col-span-2">
                <Label>Cargo *</Label>
                <Select
                  value={cargosNomes.includes(formData.especialidade) ? formData.especialidade : "__outro"}
                  onValueChange={(v) => {
                    if (v === "__outro") return;
                    handleCargoBancoSelect(v);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cargo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {cargosNomes.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                    <SelectItem value="__outro">Outro (digitar abaixo)</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  className="mt-2"
                  value={formData.especialidade}
                  onChange={(e) => setFormData({ ...formData, especialidade: e.target.value, tipo: resolverTipo(e.target.value) })}
                  placeholder="Ou digite o cargo manualmente..."
                />
              </div>

              <div>
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
                  placeholder="CRM / COREN / Matrícula"
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
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
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
            <Button variant="outline" onClick={downloadTemplate} className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Baixar Modelo
            </Button>
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
              <FileSpreadsheet className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground mb-2">Arraste um arquivo ou clique para selecionar</p>
              <Input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="cursor-pointer" />
            </div>
            <div className="text-xs text-muted-foreground">
              <p><strong>Colunas esperadas:</strong></p>
              <p>Matrícula, Nome de exibição, Data de admissão, Data de demissão, Cargo, Tipo, Situação do colaborador</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Perfil Dialog */}
      {selectedProfissional && (
        <ProfissionalPerfilDialog
          open={perfilOpen}
          onOpenChange={setPerfilOpen}
          profissionalId={selectedProfissional.id}
          profissionalNome={selectedProfissional.nome}
        />
      )}
    </div>
  );
};

export default ProfissionaisSaude;
