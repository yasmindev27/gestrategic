import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Building2, Plus, Pencil, Trash2, Loader2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

interface Setor {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  created_at: string;
}

export const SetoresManager = () => {
  const { toast } = useToast();
  const [setores, setSetores] = useState<Setor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSetor, setSelectedSetor] = useState<Setor | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    ativo: true,
  });

  useEffect(() => {
    fetchSetores();
  }, []);

  const fetchSetores = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("setores")
        .select("*")
        .order("nome");

      if (error) throw error;
      setSetores(data || []);
    } catch (error) {
      console.error("Error fetching setores:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar setores.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.nome.trim()) {
      toast({
        title: "Erro",
        description: "O nome do setor é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (selectedSetor) {
        // Update
        const { error } = await supabase
          .from("setores")
          .update({
            nome: formData.nome,
            descricao: formData.descricao || null,
            ativo: formData.ativo,
          })
          .eq("id", selectedSetor.id);

        if (error) throw error;
        toast({ title: "Sucesso", description: "Setor atualizado com sucesso." });
      } else {
        // Insert
        const { error } = await supabase
          .from("setores")
          .insert({
            nome: formData.nome,
            descricao: formData.descricao || null,
            ativo: formData.ativo,
          });

        if (error) throw error;
        toast({ title: "Sucesso", description: "Setor criado com sucesso." });
      }

      setDialogOpen(false);
      resetForm();
      fetchSetores();
    } catch (error: unknown) {
      console.error("Error:", error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao salvar setor.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedSetor) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("setores")
        .delete()
        .eq("id", selectedSetor.id);

      if (error) throw error;
      toast({ title: "Sucesso", description: "Setor excluído com sucesso." });
      setDeleteDialogOpen(false);
      setSelectedSetor(null);
      fetchSetores();
    } catch (error: unknown) {
      console.error("Error:", error);
      toast({
        title: "Erro",
        description: "Erro ao excluir setor. Verifique se não há usuários vinculados.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({ nome: "", descricao: "", ativo: true });
    setSelectedSetor(null);
  };

  const openEditDialog = (setor: Setor) => {
    setSelectedSetor(setor);
    setFormData({
      nome: setor.nome,
      descricao: setor.descricao || "",
      ativo: setor.ativo,
    });
    setDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Setores
            </CardTitle>
            <CardDescription>Gerencie os setores disponíveis no sistema</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchSetores} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button size="sm" onClick={() => { resetForm(); setDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Setor
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : setores.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum setor cadastrado.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {setores.map((setor) => (
                <TableRow key={setor.id}>
                  <TableCell className="font-medium">{setor.nome}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {setor.descricao || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={setor.ativo ? "default" : "secondary"}>
                      {setor.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="outline" onClick={() => openEditDialog(setor)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => {
                          setSelectedSetor(setor);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedSetor ? "Editar Setor" : "Novo Setor"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="setor-nome">Nome *</Label>
              <Input
                id="setor-nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Nome do setor"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="setor-descricao">Descrição</Label>
              <Textarea
                id="setor-descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descrição do setor"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="setor-ativo">Ativo</Label>
              <Switch
                id="setor-ativo"
                checked={formData.ativo}
                onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Setor</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o setor <strong>{selectedSetor?.nome}</strong>?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
