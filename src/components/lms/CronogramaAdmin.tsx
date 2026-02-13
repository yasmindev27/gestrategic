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
import { Plus, Calendar, Filter } from "lucide-react";
import { Treinamento } from "./types";

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

export default function CronogramaAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [openDialog, setOpenDialog] = useState(false);
  const [form, setForm] = useState({
    titulo: "", objetivo: "", tipo_treinamento: "Conhecimento", instrutor: "",
    setor_responsavel: "", publico_alvo: "", carga_horaria: "", data_limite: "",
    setores_alvo: "",
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
      setOpenDialog(false);
      setForm({ titulo: "", objetivo: "", tipo_treinamento: "Conhecimento", instrutor: "", setor_responsavel: "", publico_alvo: "", carga_horaria: "", data_limite: "", setores_alvo: "" });
    },
    onError: () => toast({ title: "Erro ao criar treinamento", variant: "destructive" }),
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

  const filtered = filterStatus === "todos" ? treinamentos : treinamentos.filter(t => t.status === filterStatus);

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

        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Novo Treinamento</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Novo Treinamento</DialogTitle></DialogHeader>
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
              <Button onClick={() => createMutation.mutate(form)} disabled={!form.titulo || createMutation.isPending}>
                {createMutation.isPending ? "Salvando..." : "Criar Treinamento"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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
                        <Select value={t.status} onValueChange={v => updateStatusMutation.mutate({ id: t.id, status: v })}>
                          <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="planejado">Planejado</SelectItem>
                            <SelectItem value="em_andamento">Em Andamento</SelectItem>
                            <SelectItem value="realizado">Realizado</SelectItem>
                            <SelectItem value="cancelado">Cancelado</SelectItem>
                            <SelectItem value="postergado">Postergado</SelectItem>
                          </SelectContent>
                        </Select>
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
