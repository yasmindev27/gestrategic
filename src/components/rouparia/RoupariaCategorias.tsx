import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogTrigger,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Loader2, Shirt, Trash2 } from "lucide-react";

interface Categoria {
  id: string;
  nome: string;
  descricao: string | null;
  estoque_minimo: number;
  ativo: boolean;
}

interface RoupariaCategoriasProps {
  canManage: boolean;
  isAdmin?: boolean;
}

export function RoupariaCategorias({ canManage, isAdmin }: RoupariaCategoriasProps) {
  const { toast } = useToast();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState<Categoria | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    estoque_minimo: 0,
  });

  const fetchCategorias = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("rouparia_categorias")
      .select("*")
      .order("nome");

    if (!error && data) {
      setCategorias(data);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchCategorias();
  }, [fetchCategorias]);

  const resetForm = () => {
    setFormData({ nome: "", descricao: "", estoque_minimo: 0 });
    setEditingCategoria(null);
  };

  const handleOpenDialog = (categoria?: Categoria) => {
    if (categoria) {
      setEditingCategoria(categoria);
      setFormData({
        nome: categoria.nome,
        descricao: categoria.descricao || "",
        estoque_minimo: categoria.estoque_minimo,
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome.trim()) {
      toast({
        title: "Erro",
        description: "O nome é obrigatório",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    if (editingCategoria) {
      const { error } = await supabase
        .from("rouparia_categorias")
        .update({
          nome: formData.nome.trim(),
          descricao: formData.descricao.trim() || null,
          estoque_minimo: formData.estoque_minimo,
        })
        .eq("id", editingCategoria.id);

      setIsSaving(false);

      if (error) {
        toast({
          title: "Erro ao atualizar",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Categoria atualizada com sucesso" });
    } else {
      const { error } = await supabase
        .from("rouparia_categorias")
        .insert({
          nome: formData.nome.trim(),
          descricao: formData.descricao.trim() || null,
          estoque_minimo: formData.estoque_minimo,
        });

      setIsSaving(false);

      if (error) {
        if (error.code === "23505") {
          toast({
            title: "Categoria já existe",
            description: "Já existe uma categoria com esse nome",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Erro ao cadastrar",
            description: error.message,
            variant: "destructive",
          });
        }
        return;
      }

      toast({ title: "Categoria cadastrada com sucesso" });
    }

    setDialogOpen(false);
    resetForm();
    fetchCategorias();
  };

  const toggleAtivo = async (categoria: Categoria) => {
    const { error } = await supabase
      .from("rouparia_categorias")
      .update({ ativo: !categoria.ativo })
      .eq("id", categoria.id);

    if (error) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    fetchCategorias();
  };

  const handleDeleteCategoria = async (categoria: Categoria) => {
    const { error } = await supabase
      .from("rouparia_categorias")
      .delete()
      .eq("id", categoria.id);

    if (error) {
      toast({
        title: "Erro ao excluir categoria",
        description: error.code === "23503" 
          ? "Esta categoria possui itens vinculados. Remova os itens primeiro." 
          : error.message,
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Categoria excluída com sucesso" });
    fetchCategorias();
  };

  if (!canManage) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Shirt className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Você não tem permissão para gerenciar categorias.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-semibold">Categorias de Itens</h3>
          <p className="text-sm text-muted-foreground">
            Gerencie os tipos de itens da rouparia
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Categoria
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCategoria ? "Editar Categoria" : "Nova Categoria"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Lençol Casal"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Input
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Descrição opcional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estoque_minimo">Estoque Mínimo</Label>
                <Input
                  id="estoque_minimo"
                  type="number"
                  min={0}
                  value={formData.estoque_minimo}
                  onChange={(e) => setFormData({ ...formData, estoque_minimo: parseInt(e.target.value) || 0 })}
                />
                <p className="text-xs text-muted-foreground">
                  Alerta quando o estoque atingir este valor
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : editingCategoria ? (
                    "Atualizar"
                  ) : (
                    "Cadastrar"
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="text-center">Estoque Mínimo</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : categorias.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Nenhuma categoria cadastrada
                </TableCell>
              </TableRow>
            ) : (
              categorias.map((cat) => (
                <TableRow key={cat.id} className={!cat.ativo ? "opacity-50" : ""}>
                  <TableCell className="font-medium">{cat.nome}</TableCell>
                  <TableCell className="text-muted-foreground">{cat.descricao || "-"}</TableCell>
                  <TableCell className="text-center">{cat.estoque_minimo}</TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleAtivo(cat)}
                      className={cat.ativo ? "text-green-600" : "text-muted-foreground"}
                    >
                      {cat.ativo ? "Ativo" : "Inativo"}
                    </Button>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenDialog(cat)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {isAdmin && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir categoria?</AlertDialogTitle>
                            <AlertDialogDescription>
                              A categoria "{cat.nome}" será removida permanentemente. Se houver itens vinculados, a exclusão será impedida.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteCategoria(cat)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
