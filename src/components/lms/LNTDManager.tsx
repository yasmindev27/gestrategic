import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Link, Plus, FileText, Video, Pencil, Trash2, Upload, Eye, Loader2 } from "lucide-react";
import { ExportDropdown } from "@/components/ui/export-dropdown";
import { exportToPDF } from "@/lib/export-utils";
import { Treinamento, Material } from "./types";
import * as XLSX from "xlsx";

export default function LNTDManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedTreinamento, setSelectedTreinamento] = useState<string | null>(null);
  const [materialForm, setMaterialForm] = useState({ titulo: "", tipo: "pdf", descricao: "" });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [viewingUrl, setViewingUrl] = useState<string | null>(null);
  const [viewingTitle, setViewingTitle] = useState("");
  const [editDialog, setEditDialog] = useState(false);
  const [editForm, setEditForm] = useState({
    id: "",
    titulo: "",
    metodo_identificacao: "",
    competencia: "",
    indicador_competencia: "",
    setores_alvo: "",
  });

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

  const handleUploadMaterial = async () => {
    if (!selectedTreinamento || !materialForm.titulo || !selectedFile) return;
    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const fileExt = selectedFile.name.split(".").pop();
      const filePath = `${user.id}/${selectedTreinamento}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("lms-materiais")
        .upload(filePath, selectedFile);
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from("lms_materiais").insert({
        treinamento_id: selectedTreinamento,
        titulo: materialForm.titulo,
        tipo: materialForm.tipo,
        url: filePath,
        descricao: materialForm.descricao,
        criado_por: user.id,
      });
      if (dbError) throw dbError;

      queryClient.invalidateQueries({ queryKey: ["lms-materiais"] });
      toast({ title: "Material enviado com sucesso!" });
      setMaterialForm({ titulo: "", tipo: "pdf", descricao: "" });
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      toast({ title: "Erro ao enviar material", description: err.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleViewMaterial = async (material: Material) => {
    if (!material.url) return;
    try {
      const { data, error } = await supabase.storage
        .from("lms-materiais")
        .createSignedUrl(material.url, 3600);
      if (error) throw error;
      setViewingTitle(material.titulo);
      setViewingUrl(data.signedUrl);
    } catch {
      toast({ title: "Erro ao abrir material", variant: "destructive" });
    }
  };

  const deleteMaterialMutation = useMutation({
    mutationFn: async (material: Material) => {
      if (material.url) {
        await supabase.storage.from("lms-materiais").remove([material.url]);
      }
      const { error } = await supabase.from("lms_materiais").delete().eq("id", material.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lms-materiais"] });
      toast({ title: "Material removido!" });
    },
  });

  const updateLNTDMutation = useMutation({
    mutationFn: async (data: typeof editForm) => {
      const { error } = await supabase.from("lms_treinamentos").update({
        metodo_identificacao: data.metodo_identificacao || null,
        competencia: data.competencia || null,
        indicador_competencia: data.indicador_competencia || null,
        setores_alvo: data.setores_alvo.split(",").map(s => s.trim()).filter(Boolean),
      }).eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lms-treinamentos"] });
      toast({ title: "LNTD atualizada!" });
      setEditDialog(false);
    },
    onError: () => toast({ title: "Erro ao atualizar", variant: "destructive" }),
  });

  const deleteTreinamentoMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lms_treinamentos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lms-treinamentos"] });
      if (selectedTreinamento) setSelectedTreinamento(null);
      toast({ title: "Treinamento excluído!" });
    },
    onError: () => toast({ title: "Erro ao excluir (pode haver dados vinculados)", variant: "destructive" }),
  });

  const openEditLNTD = (t: Treinamento) => {
    setEditForm({
      id: t.id,
      titulo: t.titulo,
      metodo_identificacao: t.metodo_identificacao || "",
      competencia: t.competencia || "",
      indicador_competencia: t.indicador_competencia || "",
      setores_alvo: t.setores_alvo?.join(", ") || "",
    });
    setEditDialog(true);
  };

  const selected = treinamentos.find(t => t.id === selectedTreinamento);

  const exportHeaders = ["Tema", "Método", "Competência", "Indicador", "Setores Alvo"];
  const exportRows = treinamentos.map(t => [
    t.titulo,
    t.metodo_identificacao || "-",
    t.competencia || "-",
    t.indicador_competencia || "-",
    t.setores_alvo?.join(", ") || "-",
  ]);

  const handleExportPDF = () => {
    exportToPDF({ title: "LNTD - Necessidades de Treinamento", headers: exportHeaders, rows: exportRows, fileName: "lntd_treinamentos", orientation: "landscape" });
  };

  const handleExportExcel = () => {
    const ws = XLSX.utils.aoa_to_sheet([exportHeaders, ...exportRows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "LNTD");
    XLSX.writeFile(wb, "lntd_treinamentos.xlsx");
  };

  const getFileIcon = (tipo: string) => {
    if (tipo === "video") return <Video className="h-5 w-5 text-red-500" />;
    return <FileText className="h-5 w-5 text-blue-500" />;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5" /> Necessidades de Treinamento (LNTD)</CardTitle>
            <ExportDropdown onExportPDF={handleExportPDF} onExportExcel={handleExportExcel} disabled={treinamentos.length === 0} />
          </div>
        </CardHeader>
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
                  <TableHead>Ações</TableHead>
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
                      <Badge variant="secondary" className="cursor-pointer" onClick={() => setSelectedTreinamento(t.id)}>
                        <Link className="h-3 w-3 mr-1" />Vincular
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditLNTD(t)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => { if (confirm("Excluir este treinamento e todos os dados vinculados?")) deleteTreinamentoMutation.mutate(t.id); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant={selectedTreinamento === t.id ? "default" : "outline"} onClick={() => setSelectedTreinamento(t.id)}>
                          Gerenciar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit LNTD Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Editar LNTD: {editForm.titulo}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>Método de Identificação</Label><Input value={editForm.metodo_identificacao} onChange={e => setEditForm(p => ({ ...p, metodo_identificacao: e.target.value }))} /></div>
            <div><Label>Competência</Label><Input value={editForm.competencia} onChange={e => setEditForm(p => ({ ...p, competencia: e.target.value }))} /></div>
            <div><Label>Indicador de Competência</Label><Textarea value={editForm.indicador_competencia} onChange={e => setEditForm(p => ({ ...p, indicador_competencia: e.target.value }))} /></div>
            <div><Label>Setores Alvo (separados por vírgula)</Label><Input value={editForm.setores_alvo} onChange={e => setEditForm(p => ({ ...p, setores_alvo: e.target.value }))} /></div>
            <Button onClick={() => updateLNTDMutation.mutate(editForm)} disabled={updateLNTDMutation.isPending}>
              {updateLNTDMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Material Dialog (internal viewer) */}
      <Dialog open={!!viewingUrl} onOpenChange={() => setViewingUrl(null)}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader><DialogTitle>{viewingTitle}</DialogTitle></DialogHeader>
          <div className="flex-1 h-full min-h-0">
            {viewingUrl && (
              <iframe
                src={viewingUrl}
                className="w-full h-[calc(80vh-80px)] rounded-lg border"
                title={viewingTitle}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

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
                      {getFileIcon(m.tipo)}
                      <div>
                        <p className="font-medium text-sm">{m.titulo}</p>
                        {m.descricao && <p className="text-xs text-muted-foreground">{m.descricao}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="outline" onClick={() => handleViewMaterial(m)}>
                        <Eye className="h-4 w-4 mr-1" /> Visualizar
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteMaterialMutation.mutate(m)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">Nenhum material vinculado ainda.</p>
            )}

            <div className="border-t pt-4 space-y-3">
              <p className="font-medium text-sm flex items-center gap-2"><Plus className="h-4 w-4" /> Enviar Material</p>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Título *</Label><Input value={materialForm.titulo} onChange={e => setMaterialForm(p => ({ ...p, titulo: e.target.value }))} /></div>
                <div>
                  <Label>Tipo</Label>
                  <Select value={materialForm.tipo} onValueChange={v => setMaterialForm(p => ({ ...p, tipo: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="video">Vídeo</SelectItem>
                      <SelectItem value="documento">Documento</SelectItem>
                      <SelectItem value="apresentacao">Apresentação</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Descrição (opcional)</Label><Input value={materialForm.descricao} onChange={e => setMaterialForm(p => ({ ...p, descricao: e.target.value }))} placeholder="Breve descrição do material" /></div>
              <div>
                <Label>Arquivo *</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.mp4,.webm"
                    onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                  />
                </div>
                {selectedFile && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>
              <Button onClick={handleUploadMaterial} disabled={!materialForm.titulo || !selectedFile || isUploading}>
                {isUploading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando...</>
                ) : (
                  <><Upload className="h-4 w-4 mr-2" /> Enviar Material</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
