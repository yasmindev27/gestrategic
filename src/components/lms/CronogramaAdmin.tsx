import { useState } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { Plus, Calendar, Filter, Pencil, Trash2 } from "lucide-react";
import { ExportDropdown } from "@/components/ui/export-dropdown";
import { exportToCSV, exportToPDF } from "@/lib/export-utils";
import { Treinamento } from "./types";
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

const emptyForm = {
  titulo: "", objetivo: "", tipo_treinamento: "Conhecimento", instrutor: "",
  setor_responsavel: "", publico_alvo: "", carga_horaria: "", data_limite: "",
  setores_alvo: "",
};

export default function CronogramaAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [openDialog, setOpenDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

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

  const createMutation = useMutation({
    mutationFn: async (newTraining: typeof form) => {
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
        setores_alvo: newTraining.setores_alvo.split(",").map(s => s.trim()).filter(Boolean),
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
    mutationFn: async ({ id, data }: { id: string; data: typeof form }) => {
      const { error } = await supabase.from("lms_treinamentos").update({
        titulo: data.titulo,
        objetivo: data.objetivo,
        tipo_treinamento: data.tipo_treinamento,
        instrutor: data.instrutor,
        setor_responsavel: data.setor_responsavel,
        publico_alvo: data.publico_alvo,
        carga_horaria: data.carga_horaria,
        data_limite: data.data_limite || null,
        setores_alvo: data.setores_alvo.split(",").map(s => s.trim()).filter(Boolean),
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
      setores_alvo: t.setores_alvo?.join(", ") || "",
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
            <DialogContent className="max-w-lg">
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
                  <div><Label>Instrutor</Label><Input value={form.instrutor} onChange={e => setForm(p => ({ ...p, instrutor: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Setor Responsável</Label><Input value={form.setor_responsavel} onChange={e => setForm(p => ({ ...p, setor_responsavel: e.target.value }))} /></div>
                  <div><Label>Público Alvo</Label><Input value={form.publico_alvo} onChange={e => setForm(p => ({ ...p, publico_alvo: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Carga Horária</Label><Input value={form.carga_horaria} onChange={e => setForm(p => ({ ...p, carga_horaria: e.target.value }))} /></div>
                  <div><Label>Data Limite</Label><Input type="date" value={form.data_limite} onChange={e => setForm(p => ({ ...p, data_limite: e.target.value }))} /></div>
                </div>
                <div><Label>Setores Alvo (separados por vírgula)</Label><Input value={form.setores_alvo} onChange={e => setForm(p => ({ ...p, setores_alvo: e.target.value }))} placeholder="Assistenciais, Administrativos" /></div>
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
                    <TableHead>Data Limite</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(t => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium max-w-[200px] truncate">{t.titulo}</TableCell>
                      <TableCell><Badge variant="outline">{t.tipo_treinamento}</Badge></TableCell>
                      <TableCell>{t.setor_responsavel}</TableCell>
                      <TableCell>{t.publico_alvo}</TableCell>
                      <TableCell>{t.instrutor}</TableCell>
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
