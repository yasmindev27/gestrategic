import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
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
import { 
  Plus, 
  Search, 
  AlertTriangle, 
  Package,
  Loader2,
  Pencil,
  Trash2
} from "lucide-react";

interface Categoria {
  id: string;
  nome: string;
  estoque_minimo: number;
}

interface Item {
  id: string;
  codigo_barras: string;
  descricao: string | null;
  quantidade_atual: number;
  categoria_id: string;
  ativo: boolean;
  rouparia_categorias: Categoria;
}

interface RoupariaEstoqueProps {
  canManage: boolean;
  isAdmin?: boolean;
}

export function RoupariaEstoque({ canManage, isAdmin }: RoupariaEstoqueProps) {
  const { toast } = useToast();
  const [itens, setItens] = useState<Item[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategoria, setFilterCategoria] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  
  // Dialog de novo item
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    codigo_barras: "",
    categoria_id: "",
    descricao: "",
    quantidade_atual: 0,
  });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    
    const [itensResult, categoriasResult] = await Promise.all([
      supabase
        .from("rouparia_itens")
        .select(`*, rouparia_categorias (id, nome, estoque_minimo)`)
        .eq("ativo", true)
        .order("created_at", { ascending: false }),
      supabase
        .from("rouparia_categorias")
        .select("*")
        .eq("ativo", true)
        .order("nome"),
    ]);

    if (itensResult.data) {
      setItens(itensResult.data as unknown as Item[]);
    }
    if (categoriasResult.data) {
      setCategorias(categoriasResult.data);
    }
    
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetForm = () => {
    setFormData({
      codigo_barras: "",
      categoria_id: "",
      descricao: "",
      quantidade_atual: 0,
    });
    setEditingItem(null);
  };

  const handleOpenDialog = (item?: Item) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        codigo_barras: item.codigo_barras,
        categoria_id: item.categoria_id,
        descricao: item.descricao || "",
        quantidade_atual: item.quantidade_atual,
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.codigo_barras || !formData.categoria_id) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    if (editingItem) {
      // Atualizar item existente
      const { error } = await supabase
        .from("rouparia_itens")
        .update({
          codigo_barras: formData.codigo_barras,
          categoria_id: formData.categoria_id,
          descricao: formData.descricao || null,
        })
        .eq("id", editingItem.id);

      setIsSaving(false);

      if (error) {
        toast({
          title: "Erro ao atualizar item",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Item atualizado com sucesso" });
    } else {
      // Criar novo item
      const { error } = await supabase
        .from("rouparia_itens")
        .insert({
          codigo_barras: formData.codigo_barras,
          categoria_id: formData.categoria_id,
          descricao: formData.descricao || null,
          quantidade_atual: formData.quantidade_atual,
        });

      setIsSaving(false);

      if (error) {
        if (error.code === "23505") {
          toast({
            title: "Código já existe",
            description: "Este código de barras já está cadastrado",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Erro ao cadastrar item",
            description: error.message,
            variant: "destructive",
          });
        }
        return;
      }

      toast({ title: "Item cadastrado com sucesso" });
    }

    setDialogOpen(false);
    resetForm();
    fetchData();
  };

  const handleDeleteItem = async (item: Item) => {
    const { error } = await supabase
      .from("rouparia_itens")
      .delete()
      .eq("id", item.id);

    if (error) {
      toast({
        title: "Erro ao excluir item",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Item excluído com sucesso" });
    fetchData();
  };

  const filteredItens = itens.filter((item) => {
    const matchesSearch =
      item.codigo_barras.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.rouparia_categorias.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);

    const matchesCategoria =
      filterCategoria === "all" || item.categoria_id === filterCategoria;

    const estoqueMinimo = item.rouparia_categorias.estoque_minimo;
    const isBaixoEstoque = item.quantidade_atual <= estoqueMinimo;
    
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "baixo" && isBaixoEstoque) ||
      (filterStatus === "normal" && !isBaixoEstoque);

    return matchesSearch && matchesCategoria && matchesStatus;
  });

  const itensComEstoqueBaixo = itens.filter(
    (item) => item.quantidade_atual <= item.rouparia_categorias.estoque_minimo
  );

  return (
    <div className="space-y-6">
      {/* Alerta de Estoque Baixo */}
      {itensComEstoqueBaixo.length > 0 && (
        <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-200">
              {itensComEstoqueBaixo.length} {itensComEstoqueBaixo.length === 1 ? "item" : "itens"} com estoque baixo
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              {itensComEstoqueBaixo.slice(0, 3).map((i) => i.rouparia_categorias.nome).join(", ")}
              {itensComEstoqueBaixo.length > 3 && ` e mais ${itensComEstoqueBaixo.length - 3}`}
            </p>
          </div>
        </div>
      )}

      {/* Filtros e Ações */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex flex-1 gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por código ou categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterCategoria} onValueChange={setFilterCategoria}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {categorias.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="baixo">Estoque baixo</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {canManage && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Item
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? "Editar Item" : "Cadastrar Novo Item"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="codigo">Código de Barras *</Label>
                  <Input
                    id="codigo"
                    value={formData.codigo_barras}
                    onChange={(e) => setFormData({ ...formData, codigo_barras: e.target.value })}
                    placeholder="Digite ou bipe o código"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="categoria">Categoria *</Label>
                  <Select 
                    value={formData.categoria_id} 
                    onValueChange={(v) => setFormData({ ...formData, categoria_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categorias.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="descricao">Descrição</Label>
                  <Input
                    id="descricao"
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    placeholder="Descrição adicional (opcional)"
                  />
                </div>
                {!editingItem && (
                  <div className="space-y-2">
                    <Label htmlFor="quantidade">Quantidade Inicial</Label>
                    <Input
                      id="quantidade"
                      type="number"
                      min={0}
                      value={formData.quantidade_atual}
                      onChange={(e) => setFormData({ ...formData, quantidade_atual: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                )}
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
                    ) : editingItem ? (
                      "Atualizar"
                    ) : (
                      "Cadastrar"
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Tabela de Itens */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="text-center">Estoque</TableHead>
              <TableHead className="text-center">Mínimo</TableHead>
              <TableHead className="text-center">Status</TableHead>
              {canManage && <TableHead className="text-right">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={canManage ? 7 : 6} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : filteredItens.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canManage ? 7 : 6} className="text-center py-8 text-muted-foreground">
                  Nenhum item encontrado
                </TableCell>
              </TableRow>
            ) : (
              filteredItens.map((item) => {
                const isBaixoEstoque = item.quantidade_atual <= item.rouparia_categorias.estoque_minimo;
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-sm">{item.codigo_barras}</TableCell>
                    <TableCell className="font-medium">{item.rouparia_categorias.nome}</TableCell>
                    <TableCell className="text-muted-foreground">{item.descricao || "-"}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={isBaixoEstoque ? "destructive" : "secondary"}>
                        <Package className="w-3 h-3 mr-1" />
                        {item.quantidade_atual}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {item.rouparia_categorias.estoque_minimo}
                    </TableCell>
                    <TableCell className="text-center">
                      {isBaixoEstoque ? (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-200">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Baixo
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">
                          Normal
                        </Badge>
                      )}
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(item)}
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
                                <AlertDialogTitle>Excluir item?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  O item "{item.codigo_barras}" será removido permanentemente. Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteItem(item)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
