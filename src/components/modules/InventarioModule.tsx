import { useState, useEffect, useMemo } from "react";
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
  AlertCircle,
  ArrowUpCircle,
  ArrowDownCircle,
  BarChart3,
  History,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, subDays, parseISO } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ptBR } from "date-fns/locale";
import { SectionHeader, ActionButton } from "@/components/ui/action-buttons";
import { StatCard } from "@/components/ui/stat-card";
import { SearchInput } from "@/components/ui/search-input";
import { LoadingState, LoadingSpinner } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";

interface InventarioModuleProps {
  setor: 'ti' | 'manutencao' | 'engenharia_clinica' | 'laboratorio' | 'nir' | 'seguranca_uniformes' | 'seguranca_epis';
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
  usuario_id: string;
  created_at: string;
  produtos?: { nome: string };
  usuario_nome?: string;
}

const setorLabels: Record<string, string> = {
  ti: "TI",
  manutencao: "Manutenção",
  engenharia_clinica: "Engenharia Clínica",
  laboratorio: "Laboratório",
  nir: "NIR",
  seguranca_uniformes: "Uniformes",
  seguranca_epis: "EPIs",
};

const isSegurancaSetor = (s: string) => s === 'seguranca_uniformes' || s === 'seguranca_epis';

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

  // Colaborador selection for uniformes
  const [colaboradores, setColaboradores] = useState<{ user_id: string; full_name: string }[]>([]);
  const [buscaColab, setBuscaColab] = useState("");
  const [showColabList, setShowColabList] = useState(false);
  const [selectedColab, setSelectedColab] = useState<{ user_id: string; full_name: string } | null>(null);
  
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

  const hasAccess = role === 'admin' || role === setor || (isSegurancaSetor(setor) && role === 'seguranca');

  useEffect(() => {
    fetchProdutos();
    fetchMovimentacoes();
    if (isSegurancaSetor(setor)) fetchColaboradores();
    logAction("acesso", `inventario_${setor}`);
  }, [setor]);

  const fetchColaboradores = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .order("full_name");
    if (data) setColaboradores(data);
  };

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
      
      // Fetch user names for movimentações
      const userIds = [...new Set((data || []).map(m => m.usuario_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);
      
      const nameMap = new Map((profiles || []).map(p => [p.user_id, p.full_name]));
      const enriched = (data || []).map(m => ({ ...m, usuario_nome: nameMap.get(m.usuario_id) || "-" }));
      
      setMovimentacoes(enriched);
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
      
      const insertData = isSegurancaSetor(setor) 
        ? {
            ...productForm,
            unidade_medida: "UN",
            localizacao: "Armário de Uniformes",
            quantidade_minima: 0,
            setor_responsavel: setor,
            created_by: user?.id,
          }
        : {
            ...productForm,
            setor_responsavel: setor,
            created_by: user?.id,
          };

      const { error } = await supabase
        .from("produtos")
        .insert(insertData);

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

      // Build observacao with collaborator name for seguranca setors
      let obsText = movForm.observacao || "";
      if (isSegurancaSetor(setor) && selectedColab) {
        obsText = `[COLAB:${selectedColab.full_name}]${obsText ? ' ' + obsText : ''}`;
      }

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
          observacao: obsText,
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
      setSelectedColab(null);
      setBuscaColab("");
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
    return <LoadingState message="Carregando permissões..." />;
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
      <SectionHeader 
        title={`Inventário - ${setorLabels[setor]}`}
        description="Controle de estoque e movimentações"
      >
        <ActionButton type="add" label="Novo Produto" onClick={() => setAddProductDialog(true)} />
      </SectionHeader>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard
          title="Produtos cadastrados"
          value={totalProdutos}
          icon={Package}
          variant="primary"
        />
        <StatCard
          title="Movimentações recentes"
          value={movimentacoes.length}
          icon={History}
          variant="success"
        />
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
              <SearchInput
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Buscar por nome ou código..."
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Produtos em Estoque</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <LoadingState message="Carregando produtos..." />
              ) : filteredProdutos.length === 0 ? (
                <EmptyState
                  icon={Package}
                  title="Nenhum produto encontrado"
                  description="Cadastre produtos para começar a gerenciar o estoque"
                  action={{ label: "Novo Produto", onClick: () => setAddProductDialog(true) }}
                />
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
                      <TableHead>Colaborador</TableHead>
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
                        <TableCell>{mov.usuario_nome || "-"}</TableCell>
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
              <CardTitle>Evolução de Entradas e Saídas</CardTitle>
              <CardDescription>Movimentações dos últimos 30 dias</CardDescription>
            </CardHeader>
            <CardContent>
              {(() => {
                const last30 = Array.from({ length: 30 }, (_, i) => {
                  const d = subDays(new Date(), 29 - i);
                  const key = format(d, "yyyy-MM-dd");
                  const label = format(d, "dd/MM");
                  const entradas = movimentacoes
                    .filter(m => m.tipo === 'entrada' && m.created_at.startsWith(key))
                    .reduce((sum, m) => sum + m.quantidade, 0);
                  const saidas = movimentacoes
                    .filter(m => m.tipo === 'saida' && m.created_at.startsWith(key))
                    .reduce((sum, m) => sum + m.quantidade, 0);
                  return { data: label, Entradas: entradas, Saídas: saidas };
                });

                return (
                  <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={last30}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="data" fontSize={12} />
                      <YAxis fontSize={12} allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="Entradas" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="Saídas" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                );
              })()}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Estoque por Produto</CardTitle>
            </CardHeader>
            <CardContent>
              {produtos.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">Nenhum produto cadastrado.</p>
              ) : (
                <div className="space-y-2">
                  {produtos
                    .sort((a, b) => (b.quantidade_atual || 0) - (a.quantidade_atual || 0))
                    .map(p => (
                      <div key={p.id} className="flex justify-between items-center p-3 rounded-lg border">
                        <span className="font-medium">{p.nome}</span>
                        <Badge variant="secondary">{p.quantidade_atual || 0} {p.unidade_medida || "UN"}</Badge>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Product Dialog */}
      <Dialog open={addProductDialog} onOpenChange={setAddProductDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isSegurancaSetor(setor) ? (setor === 'seguranca_epis' ? 'Novo Item de EPI' : 'Novo Item de Uniforme') : 'Novo Produto'}</DialogTitle>
            <DialogDescription>
              {isSegurancaSetor(setor) 
                ? 'Cadastre um novo item no inventário.' 
                : 'Cadastre um novo produto no inventário.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {isSegurancaSetor(setor) ? (
              <>
                <div className="space-y-2">
                  <Label>Nome do Item *</Label>
                  <Input
                    value={productForm.nome}
                    onChange={(e) => setProductForm({ ...productForm, nome: e.target.value })}
                    placeholder="Ex: Camisa P, Calça G, Jaleco M..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Quantidade Inicial</Label>
                  <Input
                    type="number"
                    value={productForm.quantidade_atual}
                    onChange={(e) => setProductForm({ ...productForm, quantidade_atual: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddProductDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddProduct} disabled={isSubmitting}>
              {isSubmitting && <LoadingSpinner className="mr-2" />}
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
            {isSegurancaSetor(setor) && (
              <div className="space-y-2 relative">
                <Label>Colaborador *</Label>
                <Input
                  value={buscaColab}
                  onChange={(e) => {
                    setBuscaColab(e.target.value);
                    setShowColabList(true);
                    if (!e.target.value) setSelectedColab(null);
                  }}
                  onFocus={() => buscaColab && setShowColabList(true)}
                  placeholder="Digite o nome do colaborador..."
                />
                {showColabList && buscaColab.length >= 2 && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {colaboradores
                      .filter(c => c.full_name.toLowerCase().includes(buscaColab.toLowerCase()))
                      .slice(0, 10)
                      .map((c) => (
                        <button
                          key={c.user_id}
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
                          onClick={() => {
                            setSelectedColab(c);
                            setBuscaColab(c.full_name);
                            setShowColabList(false);
                          }}
                        >
                          {c.full_name}
                        </button>
                      ))}
                    {colaboradores.filter(c => c.full_name.toLowerCase().includes(buscaColab.toLowerCase())).length === 0 && (
                      <div className="px-3 py-2 text-sm text-muted-foreground">Nenhum colaborador encontrado</div>
                    )}
                  </div>
                )}
              </div>
            )}
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
              {isSubmitting && <LoadingSpinner className="mr-2" />}
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
