import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { Plus, Calendar, Filter, Pencil, Trash2, ChevronsUpDown, Check } from "lucide-react";
import { ExportDropdown } from "@/components/ui/export-dropdown";
import { exportToPDF } from "@/lib/export-utils";
import { Treinamento } from "./types";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";

const statusColors: Record<string, string> = {
  planejado: "bg-blue-100 text-blue-800",
  em_andamento: "bg-yellow-100 text-yellow-800",
  realizado: "bg-green-100 text-green-800",
  cancelado: "bg-red-100 text-red-800",
  postergado: "bg-orange-100 text-orange-800",
};

const statusLabels: Record<string, string> = {
  planejado: "Planejado",
  em_andamento: "Em Andamento",
  realizado: "Realizado",
  cancelado: "Cancelado",
  postergado: "Postergado",
};

interface FormState {
  titulo: string;
  objetivo: string;
  tipo_treinamento: string;
  instrutor: string;
  setor_responsavel: string;
  publico_alvo: string;
  carga_horaria: string;
  data_limite: string;
  setores_alvo: string[];
}

const emptyForm: FormState = {
  titulo: "", objetivo: "", tipo_treinamento: "Conhecimento", instrutor: "",
  setor_responsavel: "", publico_alvo: "", carga_horaria: "", data_limite: "",
  setores_alvo: [],
};

export default function CronogramaAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [openDialog, setOpenDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [instrutorOpen, setInstrutorOpen] = useState(false);
  const [instrutorSearch, setInstrutorSearch] = useState("");

  // Fetch colaboradores for Instrutor select
  const { data: colaboradores = [] } = useQuery({
    queryKey: ["profiles-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("user_id, full_name, cargo, setor").order("full_name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch setores from official list
  const { data: setores = [] } = useQuery({
    queryKey: ["setores-ativos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("setores").select("id, nome").eq("ativo", true).order("nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: treinamentos = [], isLoading } = useQuery({
    queryKey: ["lms-treinamentos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lms_treinamentos")
        .select("*")
        .order("data_limite", { ascending: true });
      if (error) throw error;
      return data as Treinamento[];
    },
  });

  const filteredColaboradores = useMemo(() => {
    if (!instrutorSearch) return colaboradores;
    const q = instrutorSearch.toLowerCase();
    return colaboradores.filter(c => c.full_name?.toLowerCase().includes(q) || c.cargo?.toLowerCase().includes(q));
  }, [colaboradores, instrutorSearch]);

  const createMutation = useMutation({
    mutationFn: async (newTraining: FormState) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("lms_treinamentos").insert({
        titulo: newTraining.titulo,
        objetivo: newTraining.objetivo,
        tipo_treinamento: newTraining.tipo_treinamento,
        instrutor: newTraining.instrutor,
        setor_responsavel: newTraining.setor_responsavel,
        publico_alvo: newTraining.publico_alvo,
        carga_horaria: newTraining.carga_horaria,
        data_limite: newTraining.data_limite || null,
        setores_alvo: newTraining.setores_alvo,
        criado_por: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lms-treinamentos"] });
      toast({ title: "Treinamento criado com sucesso!" });
      closeDialog();
    },
    onError: () => toast({ title: "Erro ao criar treinamento", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: FormState }) => {
      const { error } = await supabase.from("lms_treinamentos").update({
        titulo: data.titulo,
        objetivo: data.objetivo,
        tipo_treinamento: data.tipo_treinamento,
        instrutor: data.instrutor,
        setor_responsavel: data.setor_responsavel,
        publico_alvo: data.publico_alvo,
        carga_horaria: data.carga_horaria,
        data_limite: data.data_limite || null,
        setores_alvo: data.setores_alvo,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lms-treinamentos"] });
      toast({ title: "Treinamento atualizado!" });
      closeDialog();
    },
    onError: () => toast({ title: "Erro ao atualizar", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lms_treinamentos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lms-treinamentos"] });
      toast({ title: "Treinamento excluído!" });
    },
    onError: () => toast({ title: "Erro ao excluir", variant: "destructive" }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("lms_treinamentos").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lms-treinamentos"] });
      toast({ title: "Status atualizado!" });
    },
  });

  const closeDialog = () => {
    setOpenDialog(false);
    setEditingId(null);
    setForm(emptyForm);
    setInstrutorSearch("");
  };

  const openEdit = (t: Treinamento) => {
    setEditingId(t.id);
    setForm({
      titulo: t.titulo,
      objetivo: t.objetivo || "",
      tipo_treinamento: t.tipo_treinamento,
      instrutor: t.instrutor || "",
      setor_responsavel: t.setor_responsavel || "",
      publico_alvo: t.publico_alvo || "",
      carga_horaria: t.carga_horaria || "",
      data_limite: t.data_limite || "",
      setores_alvo: t.setores_alvo || [],
    });
    setOpenDialog(true);
  };

  const handleSave = () => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const toggleSetorAlvo = (setorNome: string) => {
    setForm(p => ({
      ...p,
      setores_alvo: p.setores_alvo.includes(setorNome)
        ? p.setores_alvo.filter(s => s !== setorNome)
        : [...p.setores_alvo, setorNome],
    }));
  };

  const filtered = filterStatus === "todos" ? treinamentos : treinamentos.filter(t => t.status === filterStatus);

  const exportHeaders = ["Tema", "Tipo", "Setor Resp.", "Público Alvo", "Instrutor", "Data Limite", "Status"];
  const exportRows = filtered.map(t => [
    t.titulo,
    t.tipo_treinamento,
    t.setor_responsavel || "-",
    t.publico_alvo || "-",
    t.instrutor || "-",
    t.data_limite ? new Date(t.data_limite).toLocaleDateString("pt-BR") : "-",
    statusLabels[t.status] || t.status,
  ]);

  const handleExportPDF = () => {
    exportToPDF({ title: "Cronograma de Treinamentos", headers: exportHeaders, rows: exportRows, fileName: "cronograma_treinamentos", orientation: "landscape" });
  };

  const handleExportExcel = () => {
    const ws = XLSX.utils.aoa_to_sheet([exportHeaders, ...exportRows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cronograma");
    XLSX.writeFile(wb, "cronograma_treinamentos.xlsx");
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="planejado">Planejado</SelectItem>
              <SelectItem value="em_andamento">Em Andamento</SelectItem>
              <SelectItem value="realizado">Realizado</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <ExportDropdown onExportPDF={handleExportPDF} onExportExcel={handleExportExcel} disabled={filtered.length === 0} />
          <Dialog open={openDialog} onOpenChange={(v) => { if (!v) closeDialog(); else setOpenDialog(true); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Novo Treinamento</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editingId ? "Editar Treinamento" : "Novo Treinamento"}</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <div><Label>Título *</Label><Input value={form.titulo} onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))} /></div>
                <div><Label>Objetivo</Label><Textarea value={form.objetivo} onChange={e => setForm(p => ({ ...p, objetivo: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Tipo</Label>
                    <Select value={form.tipo_treinamento} onValueChange={v => setForm(p => ({ ...p, tipo_treinamento: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Conhecimento">Conhecimento</SelectItem>
                        <SelectItem value="Habilidade (Técnico)">Habilidade</SelectItem>
                        <SelectItem value="Atitude (Comportamental)">Atitude</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Instrutor</Label>
                    <Popover open={instrutorOpen} onOpenChange={setInstrutorOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" className="w-full justify-between font-normal h-10">
                          <span className="truncate">{form.instrutor || "Selecionar instrutor..."}</span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Buscar colaborador..." value={instrutorSearch} onValueChange={setInstrutorSearch} />
                          <CommandList>
                            <CommandEmpty>Nenhum colaborador encontrado.</CommandEmpty>
                            <CommandGroup>
                              {filteredColaboradores.map(c => (
                                <CommandItem
                                  key={c.user_id}
                                  value={c.full_name || ""}
                                  onSelect={() => {
                                    setForm(p => ({ ...p, instrutor: c.full_name || "" }));
                                    setInstrutorOpen(false);
                                    setInstrutorSearch("");
                                  }}
                                >
                                  <Check className={cn("mr-2 h-4 w-4", form.instrutor === c.full_name ? "opacity-100" : "opacity-0")} />
                                  <div>
                                    <p className="text-sm">{c.full_name}</p>
                                    <p className="text-xs text-muted-foreground">{c.cargo || "—"} • {c.setor || "—"}</p>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Setor Responsável</Label>
                    <Select value={form.setor_responsavel} onValueChange={v => setForm(p => ({ ...p, setor_responsavel: v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecionar setor..." /></SelectTrigger>
                      <SelectContent>
                        {setores.map(s => (
                          <SelectItem key={s.id} value={s.nome}>{s.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Público Alvo</Label><Input value={form.publico_alvo} onChange={e => setForm(p => ({ ...p, publico_alvo: e.target.value }))} placeholder="Ex: Todos os colaboradores" /></div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Carga Horária</Label><Input value={form.carga_horaria} onChange={e => setForm(p => ({ ...p, carga_horaria: e.target.value }))} /></div>
                  <div><Label>Data Limite</Label><Input type="date" value={form.data_limite} onChange={e => setForm(p => ({ ...p, data_limite: e.target.value }))} /></div>
                </div>

                {/* Setores Alvo - Multi-select with checkboxes */}
                <div>
                  <Label>Setores Alvo *</Label>
                  <p className="text-xs text-muted-foreground mb-2">O treinamento aparecerá apenas para colaboradores destes setores</p>
                  <div className="border rounded-lg p-3 max-h-[200px] overflow-y-auto space-y-2">
                    {setores.map(s => (
                      <div key={s.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`setor-${s.id}`}
                          checked={form.setores_alvo.includes(s.nome)}
                          onCheckedChange={() => toggleSetorAlvo(s.nome)}
                        />
                        <label htmlFor={`setor-${s.id}`} className="text-sm cursor-pointer">{s.nome}</label>
                      </div>
                    ))}
                    {setores.length === 0 && <p className="text-xs text-muted-foreground">Nenhum setor cadastrado.</p>}
                  </div>
                  {form.setores_alvo.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {form.setores_alvo.map(s => (
                        <Badge key={s} variant="secondary" className="text-xs cursor-pointer" onClick={() => toggleSetorAlvo(s)}>
                          {s} ✕
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <Button onClick={handleSave} disabled={!form.titulo || isSaving}>
                  {isSaving ? "Salvando..." : editingId ? "Salvar Alterações" : "Criar Treinamento"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" /> Cronograma de Treinamentos</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Carregando...</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tema</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Setor Resp.</TableHead>
                    <TableHead>Público Alvo</TableHead>
                    <TableHead>Instrutor</TableHead>
                    <TableHead>Setores Alvo</TableHead>
                    <TableHead>Data Limite</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(t => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium max-w-[180px] truncate">{t.titulo}</TableCell>
                      <TableCell><Badge variant="outline">{t.tipo_treinamento}</Badge></TableCell>
                      <TableCell>{t.setor_responsavel || "-"}</TableCell>
                      <TableCell>{t.publico_alvo || "-"}</TableCell>
                      <TableCell>{t.instrutor || "-"}</TableCell>
                      <TableCell className="max-w-[150px]">
                        <div className="flex flex-wrap gap-1">
                          {t.setores_alvo?.slice(0, 2).map(s => (
                            <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                          ))}
                          {(t.setores_alvo?.length || 0) > 2 && (
                            <Badge variant="outline" className="text-xs">+{(t.setores_alvo?.length || 0) - 2}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{t.data_limite ? new Date(t.data_limite).toLocaleDateString("pt-BR") : "-"}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[t.status] || ""}>{statusLabels[t.status] || t.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Select value={t.status} onValueChange={v => updateStatusMutation.mutate({ id: t.id, status: v })}>
                            <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="planejado">Planejado</SelectItem>
                              <SelectItem value="em_andamento">Em Andamento</SelectItem>
                              <SelectItem value="realizado">Realizado</SelectItem>
                              <SelectItem value="cancelado">Cancelado</SelectItem>
                              <SelectItem value="postergado">Postergado</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(t)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => { if (confirm("Excluir este treinamento?")) deleteMutation.mutate(t.id); }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
