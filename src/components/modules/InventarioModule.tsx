import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useLogAccess } from "@/hooks/useLogAccess";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { 
  Package, 
  Plus, 
  Minus, 
  Search,
  AlertCircle,
  Loader2,
  ArrowUpCircle,
  ArrowDownCircle,
  BarChart3,
  History,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface InventarioModuleProps {
  setor: 'ti' | 'manutencao' | 'engenharia_clinica' | 'laboratorio' | 'nir';
}

interface Produto {
  id: string;
  nome: string;
  descricao: string | null;
  codigo: string | null;
  categoria: string | null;
  unidade_medida: string | null;
  quantidade_minima: number | null;
  quantidade_atual: number | null;
  localizacao: string | null;
  setor_responsavel: string;
  ativo: boolean | null;
}

interface Movimentacao {
  id: string;
  produto_id: string;
  tipo: string;
  quantidade: number;
  quantidade_anterior: number;
  quantidade_nova: number;
  motivo: string | null;
  observacao: string | null;
  setor: string;
  created_at: string;
  produtos?: { nome: string };
}

const setorLabels: Record<string, string> = {
  ti: "TI",
  manutencao: "Manutenção",
  engenharia_clinica: "Engenharia Clínica",
  laboratorio: "Laboratório",
  nir: "NIR",
};

export const InventarioModule = ({ setor }: InventarioModuleProps) => {
  const { role, isLoading: isLoadingRole } = useUserRole();
  const { logAction } = useLogAccess();
  const { toast } = useToast();
  
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [addProductDialog, setAddProductDialog] = useState(false);
  const [movimentacaoDialog, setMovimentacaoDialog] = useState(false);
  const [selectedProduto, setSelectedProduto] = useState<Produto | null>(null);
  const [movimentacaoTipo, setMovimentacaoTipo] = useState<'entrada' | 'saida'>('entrada');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [productForm, setProductForm] = useState({
    nome: "",
    descricao: "",
    codigo: "",
    categoria: "",
    unidade_medida: "UN",
    quantidade_minima: 0,
    quantidade_atual: 0,
    localizacao: "",
  });

  const [movForm, setMovForm] = useState({
    quantidade: 1,
    motivo: "",
    observacao: "",
  });

  const hasAccess = role === 'admin' || role === setor;

  useEffect(() => {
    fetchProdutos();
    fetchMovimentacoes();
    logAction("acesso", `inventario_${setor}`);
  }, [setor]);

  const fetchProdutos = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("produtos")
        .select("*")
        .eq("setor_responsavel", setor)
        .eq("ativo", true)
        .order("nome");

      if (error) throw error;
      setProdutos(data || []);
    } catch (error) {
      console.error("Error fetching produtos:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar produtos.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMovimentacoes = async () => {
    try {
      const { data, error } = await supabase
        .from("movimentacoes_estoque")
        .select("*, produtos(nome)")
        .eq("setor", setor)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setMovimentacoes(data || []);
    } catch (error) {
      console.error("Error fetching movimentacoes:", error);
    }
  };

  const handleAddProduct = async () => {
    if (!productForm.nome) {
      toast({
        title: "Erro",
        description: "Nome do produto é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("produtos")
        .insert({
          ...productForm,
          setor_responsavel: setor,
          created_by: user?.id,
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Produto cadastrado com sucesso.",
      });

      await logAction("cadastrar_produto", `inventario_${setor}`, { produto: productForm.nome });
      
      setAddProductDialog(false);
      setProductForm({
        nome: "",
        descricao: "",
        codigo: "",
        categoria: "",
        unidade_medida: "UN",
        quantidade_minima: 0,
        quantidade_atual: 0,
        localizacao: "",
      });
      fetchProdutos();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Erro",
        description: "Erro ao cadastrar produto.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMovimentacao = async () => {
    if (!selectedProduto || movForm.quantidade <= 0) {
      toast({
        title: "Erro",
        description: "Quantidade deve ser maior que zero.",
        variant: "destructive",
      });
      return;
    }

    const quantidadeAtual = selectedProduto.quantidade_atual || 0;
    
    if (movimentacaoTipo === 'saida' && movForm.quantidade > quantidadeAtual) {
      toast({
        title: "Erro",
        description: "Quantidade insuficiente em estoque.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const novaQuantidade = movimentacaoTipo === 'entrada' 
        ? quantidadeAtual + movForm.quantidade
        : quantidadeAtual - movForm.quantidade;

      // Insert movimentação
      const { error: movError } = await supabase
        .from("movimentacoes_estoque")
        .insert({
          produto_id: selectedProduto.id,
          tipo: movimentacaoTipo,
          quantidade: movForm.quantidade,
          quantidade_anterior: quantidadeAtual,
          quantidade_nova: novaQuantidade,
          motivo: movForm.motivo,
          observacao: movForm.observacao,
          usuario_id: user?.id,
          setor: setor,
        });

      if (movError) throw movError;

      // Update produto quantidade
      const { error: updateError } = await supabase
        .from("produtos")
        .update({ quantidade_atual: novaQuantidade })
        .eq("id", selectedProduto.id);

      if (updateError) throw updateError;

      toast({
        title: "Sucesso",
        description: `${movimentacaoTipo === 'entrada' ? 'Entrada' : 'Saída'} registrada com sucesso.`,
      });

      await logAction(`movimentacao_${movimentacaoTipo}`, `inventario_${setor}`, { 
        produto: selectedProduto.nome,
        quantidade: movForm.quantidade,
      });
      
      setMovimentacaoDialog(false);
      setSelectedProduto(null);
      setMovForm({ quantidade: 1, motivo: "", observacao: "" });
      fetchProdutos();
      fetchMovimentacoes();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Erro",
        description: "Erro ao registrar movimentação.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProdutos = produtos.filter(p => 
    p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.codigo?.toLowerCase() || "").includes(searchTerm.toLowerCase())
  );

  const totalProdutos = produtos.length;
  const produtosBaixoEstoque = produtos.filter(p => 
    (p.quantidade_atual || 0) <= (p.quantidade_minima || 0)
  ).length;

  if (isLoadingRole) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span>Você não tem permissão para acessar este módulo.</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Inventário - {setorLabels[setor]}</h2>
          <p className="text-muted-foreground">Controle de estoque e movimentações</p>
        </div>
        <Button onClick={() => setAddProductDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Produto
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalProdutos}</p>
                <p className="text-sm text-muted-foreground">Produtos cadastrados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-500/10 rounded-lg">
                <AlertCircle className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{produtosBaixoEstoque}</p>
                <p className="text-sm text-muted-foreground">Estoque baixo</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <History className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{movimentacoes.length}</p>
                <p className="text-sm text-muted-foreground">Movimentações recentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="produtos">
        <TabsList>
          <TabsTrigger value="produtos">
            <Package className="h-4 w-4 mr-2" />
            Produtos
          </TabsTrigger>
          <TabsTrigger value="movimentacoes">
            <History className="h-4 w-4 mr-2" />
            Movimentações
          </TabsTrigger>
          <TabsTrigger value="dashboard">
            <BarChart3 className="h-4 w-4 mr-2" />
            Dashboard
          </TabsTrigger>
        </TabsList>

        <TabsContent value="produtos" className="space-y-4 mt-4">
          <Card>
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Produtos em Estoque</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredProdutos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum produto encontrado.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Qtd. Atual</TableHead>
                      <TableHead>Qtd. Mínima</TableHead>
                      <TableHead>Localização</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProdutos.map((produto) => {
                      const baixoEstoque = (produto.quantidade_atual || 0) <= (produto.quantidade_minima || 0);
                      return (
                        <TableRow key={produto.id}>
                          <TableCell className="font-mono">{produto.codigo || "-"}</TableCell>
                          <TableCell className="font-medium">{produto.nome}</TableCell>
                          <TableCell>{produto.categoria || "-"}</TableCell>
                          <TableCell>
                            <Badge variant={baixoEstoque ? "destructive" : "secondary"}>
                              {produto.quantidade_atual || 0} {produto.unidade_medida}
                            </Badge>
                          </TableCell>
                          <TableCell>{produto.quantidade_minima || 0}</TableCell>
                          <TableCell>{produto.localizacao || "-"}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="text-green-600"
                                onClick={() => {
                                  setSelectedProduto(produto);
                                  setMovimentacaoTipo('entrada');
                                  setMovimentacaoDialog(true);
                                }}
                              >
                                <ArrowUpCircle className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="text-red-600"
                                onClick={() => {
                                  setSelectedProduto(produto);
                                  setMovimentacaoTipo('saida');
                                  setMovimentacaoDialog(true);
                                }}
                              >
                                <ArrowDownCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movimentacoes" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Movimentações</CardTitle>
              <CardDescription>Últimas 50 movimentações registradas</CardDescription>
            </CardHeader>
            <CardContent>
              {movimentacoes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma movimentação registrada.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Quantidade</TableHead>
                      <TableHead>Estoque Anterior</TableHead>
                      <TableHead>Estoque Novo</TableHead>
                      <TableHead>Motivo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movimentacoes.map((mov) => (
                      <TableRow key={mov.id}>
                        <TableCell>
                          {format(new Date(mov.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="font-medium">{mov.produtos?.nome || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={mov.tipo === 'entrada' ? 'default' : 'destructive'}>
                            {mov.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                          </Badge>
                        </TableCell>
                        <TableCell>{mov.quantidade}</TableCell>
                        <TableCell>{mov.quantidade_anterior}</TableCell>
                        <TableCell>{mov.quantidade_nova}</TableCell>
                        <TableCell className="max-w-xs truncate">{mov.motivo || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dashboard" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Dashboard do Inventário</CardTitle>
              <CardDescription>Visão geral do estoque</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-4">Produtos com Estoque Baixo</h4>
                  {produtos.filter(p => (p.quantidade_atual || 0) <= (p.quantidade_minima || 0)).length === 0 ? (
                    <p className="text-muted-foreground text-sm">Nenhum produto com estoque baixo.</p>
                  ) : (
                    <ul className="space-y-2">
                      {produtos
                        .filter(p => (p.quantidade_atual || 0) <= (p.quantidade_minima || 0))
                        .map(p => (
                          <li key={p.id} className="flex justify-between items-center p-2 bg-destructive/10 rounded">
                            <span>{p.nome}</span>
                            <Badge variant="destructive">{p.quantidade_atual || 0} {p.unidade_medida}</Badge>
                          </li>
                        ))
                      }
                    </ul>
                  )}
                </div>
                <div>
                  <h4 className="font-semibold mb-4">Por Categoria</h4>
                  {Object.entries(
                    produtos.reduce((acc, p) => {
                      const cat = p.categoria || 'Sem categoria';
                      acc[cat] = (acc[cat] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([cat, count]) => (
                    <div key={cat} className="flex justify-between items-center p-2 border-b">
                      <span>{cat}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Product Dialog */}
      <Dialog open={addProductDialog} onOpenChange={setAddProductDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Produto</DialogTitle>
            <DialogDescription>Cadastre um novo produto no inventário.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={productForm.nome}
                  onChange={(e) => setProductForm({ ...productForm, nome: e.target.value })}
                  placeholder="Nome do produto"
                />
              </div>
              <div className="space-y-2">
                <Label>Código</Label>
                <Input
                  value={productForm.codigo}
                  onChange={(e) => setProductForm({ ...productForm, codigo: e.target.value })}
                  placeholder="Código"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={productForm.descricao}
                onChange={(e) => setProductForm({ ...productForm, descricao: e.target.value })}
                placeholder="Descrição do produto"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Input
                  value={productForm.categoria}
                  onChange={(e) => setProductForm({ ...productForm, categoria: e.target.value })}
                  placeholder="Categoria"
                />
              </div>
              <div className="space-y-2">
                <Label>Unidade</Label>
                <Select 
                  value={productForm.unidade_medida}
                  onValueChange={(v) => setProductForm({ ...productForm, unidade_medida: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UN">Unidade</SelectItem>
                    <SelectItem value="CX">Caixa</SelectItem>
                    <SelectItem value="PC">Peça</SelectItem>
                    <SelectItem value="KG">Quilograma</SelectItem>
                    <SelectItem value="L">Litro</SelectItem>
                    <SelectItem value="M">Metro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Qtd. Inicial</Label>
                <Input
                  type="number"
                  value={productForm.quantidade_atual}
                  onChange={(e) => setProductForm({ ...productForm, quantidade_atual: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Qtd. Mínima</Label>
                <Input
                  type="number"
                  value={productForm.quantidade_minima}
                  onChange={(e) => setProductForm({ ...productForm, quantidade_minima: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Localização</Label>
              <Input
                value={productForm.localizacao}
                onChange={(e) => setProductForm({ ...productForm, localizacao: e.target.value })}
                placeholder="Ex: Almoxarifado A, Prateleira 3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddProductDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddProduct} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Cadastrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Movimentação Dialog */}
      <Dialog open={movimentacaoDialog} onOpenChange={setMovimentacaoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {movimentacaoTipo === 'entrada' ? 'Entrada de Produto' : 'Saída de Produto'}
            </DialogTitle>
            <DialogDescription>
              Produto: <strong>{selectedProduto?.nome}</strong>
              <br />
              Estoque atual: <strong>{selectedProduto?.quantidade_atual || 0} {selectedProduto?.unidade_medida}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Quantidade *</Label>
              <Input
                type="number"
                min="1"
                value={movForm.quantidade}
                onChange={(e) => setMovForm({ ...movForm, quantidade: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Motivo</Label>
              <Input
                value={movForm.motivo}
                onChange={(e) => setMovForm({ ...movForm, motivo: e.target.value })}
                placeholder="Ex: Compra, Requisição, Devolução"
              />
            </div>
            <div className="space-y-2">
              <Label>Observação</Label>
              <Textarea
                value={movForm.observacao}
                onChange={(e) => setMovForm({ ...movForm, observacao: e.target.value })}
                placeholder="Observações adicionais"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMovimentacaoDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleMovimentacao} 
              disabled={isSubmitting}
              variant={movimentacaoTipo === 'entrada' ? 'default' : 'destructive'}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {movimentacaoTipo === 'entrada' ? (
                <><ArrowUpCircle className="h-4 w-4 mr-2" />Registrar Entrada</>
              ) : (
                <><ArrowDownCircle className="h-4 w-4 mr-2" />Registrar Saída</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
