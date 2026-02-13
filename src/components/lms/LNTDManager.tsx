import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Link, Plus, FileText, Video } from "lucide-react";
import { Treinamento, Material } from "./types";

export default function LNTDManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTreinamento, setSelectedTreinamento] = useState<string | null>(null);
  const [materialForm, setMaterialForm] = useState({ titulo: "", tipo: "pdf", url: "", descricao: "" });

  const { data: treinamentos = [] } = useQuery({
    queryKey: ["lms-treinamentos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("lms_treinamentos").select("*").order("data_limite");
      if (error) throw error;
      return data as Treinamento[];
    },
  });

  const { data: materiais = [] } = useQuery({
    queryKey: ["lms-materiais", selectedTreinamento],
    queryFn: async () => {
      if (!selectedTreinamento) return [];
      const { data, error } = await supabase.from("lms_materiais").select("*").eq("treinamento_id", selectedTreinamento).order("ordem");
      if (error) throw error;
      return data as Material[];
    },
    enabled: !!selectedTreinamento,
  });

  const addMaterialMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTreinamento) return;
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("lms_materiais").insert({
        treinamento_id: selectedTreinamento,
        titulo: materialForm.titulo,
        tipo: materialForm.tipo,
        url: materialForm.url,
        descricao: materialForm.descricao,
        criado_por: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lms-materiais"] });
      toast({ title: "Material adicionado!" });
      setMaterialForm({ titulo: "", tipo: "pdf", url: "", descricao: "" });
    },
    onError: () => toast({ title: "Erro ao adicionar material", variant: "destructive" }),
  });

  const deleteMaterialMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lms_materiais").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lms-materiais"] });
      toast({ title: "Material removido!" });
    },
  });

  const selected = treinamentos.find(t => t.id === selectedTreinamento);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5" /> Necessidades de Treinamento (LNTD)</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tema</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Competência</TableHead>
                  <TableHead>Indicador</TableHead>
                  <TableHead>Setores Alvo</TableHead>
                  <TableHead>Materiais</TableHead>
                  <TableHead>Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {treinamentos.map(t => (
                  <TableRow key={t.id} className={selectedTreinamento === t.id ? "bg-primary/5" : ""}>
                    <TableCell className="font-medium max-w-[180px] truncate">{t.titulo}</TableCell>
                    <TableCell><Badge variant="outline">{t.metodo_identificacao || "-"}</Badge></TableCell>
                    <TableCell className="text-sm">{t.competencia || "-"}</TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">{t.indicador_competencia || "-"}</TableCell>
                    <TableCell>{t.setores_alvo?.join(", ") || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        <Link className="h-3 w-3 mr-1" />Vincular
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant={selectedTreinamento === t.id ? "default" : "outline"} onClick={() => setSelectedTreinamento(t.id)}>
                        Gerenciar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {selected && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Materiais: {selected.titulo}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {materiais.length > 0 ? (
              <div className="space-y-2">
                {materiais.map(m => (
                  <div key={m.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {m.tipo === "video" ? <Video className="h-5 w-5 text-red-500" /> : <FileText className="h-5 w-5 text-blue-500" />}
                      <div>
                        <p className="font-medium text-sm">{m.titulo}</p>
                        {m.url && <a href={m.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">{m.url}</a>}
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteMaterialMutation.mutate(m.id)}>Remover</Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">Nenhum material vinculado ainda.</p>
            )}

            <div className="border-t pt-4 space-y-3">
              <p className="font-medium text-sm flex items-center gap-2"><Plus className="h-4 w-4" /> Adicionar Material</p>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Título *</Label><Input value={materialForm.titulo} onChange={e => setMaterialForm(p => ({ ...p, titulo: e.target.value }))} /></div>
                <div>
                  <Label>Tipo</Label>
                  <Select value={materialForm.tipo} onValueChange={v => setMaterialForm(p => ({ ...p, tipo: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="video">Vídeo</SelectItem>
                      <SelectItem value="link">Link</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>URL do Material</Label><Input value={materialForm.url} onChange={e => setMaterialForm(p => ({ ...p, url: e.target.value }))} placeholder="https://..." /></div>
              <Button onClick={() => addMaterialMutation.mutate()} disabled={!materialForm.titulo || addMaterialMutation.isPending}>
                Adicionar Material
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
