import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useSetoresNomes } from "@/hooks/useSetores";
import { 
  Barcode, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Trash2, 
  RotateCcw,
  Loader2,
  Package,
  AlertTriangle,
  User,
  Zap
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useDebounce } from "@/hooks/useDebounce";

interface Categoria {
  id: string;
  nome: string;
}

interface Item {
  id: string;
  codigo_barras: string;
  descricao: string | null;
  quantidade_atual: number;
  categoria_id: string;
  rouparia_categorias: Categoria;
}

interface Usuario {
  user_id: string;
  full_name: string;
}

interface Movimentacao {
  id: string;
  tipo_movimentacao: string;
  quantidade: number;
  quantidade_anterior: number;
  quantidade_nova: number;
  setor_destino: string | null;
  setor_origem: string | null;
  observacao: string | null;
  registrado_por_nome: string;
  responsavel_retirada: string | null;
  responsavel_devolucao: string | null;
  created_at: string;
  rouparia_itens: {
    codigo_barras: string;
    rouparia_categorias: Categoria;
  };
}

const TIPO_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  entrada: { label: "Entrada", color: "bg-green-500/10 text-green-600 border-green-200", icon: <ArrowDownCircle className="w-4 h-4" /> },
  saida: { label: "Saída", color: "bg-blue-500/10 text-blue-600 border-blue-200", icon: <ArrowUpCircle className="w-4 h-4" /> },
  descarte: { label: "Descarte", color: "bg-red-500/10 text-red-600 border-red-200", icon: <Trash2 className="w-4 h-4" /> },
  devolucao: { label: "Devolução", color: "bg-amber-500/10 text-amber-600 border-amber-200", icon: <RotateCcw className="w-4 h-4" /> },
};

// Mapeia o próximo tipo automático baseado no último movimento
const PROXIMO_TIPO: Record<string, string> = {
  entrada: "saida",
  saida: "devolucao",
  devolucao: "entrada",
  descarte: "entrada",
};

export function RoupariaMovimentacao() {
  const { toast } = useToast();
  const { data: SETORES = [] } = useSetoresNomes();
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [codigoBarras, setCodigoBarras] = useState("");
  const [tipoMovimentacao, setTipoMovimentacao] = useState<string>("entrada");
  const [modoAutomatico, setModoAutomatico] = useState(true);
  const [quantidade, setQuantidade] = useState(1);
  const [setorDestino, setSetorDestino] = useState("");
  const [setorOrigem, setSetorOrigem] = useState("");
  const [observacao, setObservacao] = useState("");
  const [responsavelRetirada, setResponsavelRetirada] = useState("");
  const [responsavelDevolucao, setResponsavelDevolucao] = useState("");
  const [itemEncontrado, setItemEncontrado] = useState<Item | null>(null);
  const [ultimaMovimentacao, setUltimaMovimentacao] = useState<string | null>(null);
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [userName, setUserName] = useState("");
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);

  const debouncedCodigo = useDebounce(codigoBarras, 300);

  // Buscar nome do usuário e lista de usuários
  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", user.id)
          .single();
        if (profile) {
          setUserName(profile.full_name);
          // Pré-selecionar o usuário logado como responsável
          setResponsavelRetirada(profile.full_name);
          setResponsavelDevolucao(profile.full_name);
        }
      }

      // Buscar todos os usuários para o seletor
      const { data: allProfiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .order("full_name");
      
      if (allProfiles) {
        setUsuarios(allProfiles);
      }
    };
    fetchData();
  }, []);

  // Buscar movimentações recentes
  const fetchMovimentacoes = useCallback(async () => {
    const { data, error } = await supabase
      .from("rouparia_movimentacoes")
      .select(`
        *,
        rouparia_itens (
          codigo_barras,
          rouparia_categorias (id, nome)
        )
      `)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!error && data) {
      setMovimentacoes(data as unknown as Movimentacao[]);
    }
  }, []);

  useEffect(() => {
    fetchMovimentacoes();
  }, [fetchMovimentacoes]);

  // Buscar item e última movimentação quando código de barras mudar
  useEffect(() => {
    const searchItem = async () => {
      if (!debouncedCodigo || debouncedCodigo.length < 3) {
        setItemEncontrado(null);
        setUltimaMovimentacao(null);
        return;
      }

      setIsSearching(true);
      
      // Buscar item
      const { data: itemData, error: itemError } = await supabase
        .from("rouparia_itens")
        .select(`
          *,
          rouparia_categorias (id, nome)
        `)
        .eq("codigo_barras", debouncedCodigo)
        .eq("ativo", true)
        .single();

      if (!itemError && itemData) {
        setItemEncontrado(itemData as unknown as Item);
        
        // Buscar última movimentação deste item para sugerir o tipo automaticamente
        const { data: ultimaMov } = await supabase
          .from("rouparia_movimentacoes")
          .select("tipo_movimentacao")
          .eq("item_id", itemData.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (ultimaMov && modoAutomatico) {
          const ultimoTipo = ultimaMov.tipo_movimentacao;
          setUltimaMovimentacao(ultimoTipo);
          // Sugerir o próximo tipo baseado no último
          const proximoTipo = PROXIMO_TIPO[ultimoTipo] || "entrada";
          setTipoMovimentacao(proximoTipo);
        } else {
          setUltimaMovimentacao(null);
        }
      } else {
        setItemEncontrado(null);
        setUltimaMovimentacao(null);
      }

      setIsSearching(false);
    };

    searchItem();
  }, [debouncedCodigo, modoAutomatico]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!itemEncontrado) {
      toast({
        title: "Item não encontrado",
        description: "Bipe um código de barras válido",
        variant: "destructive",
      });
      return;
    }

    if (quantidade <= 0) {
      toast({
        title: "Quantidade inválida",
        description: "A quantidade deve ser maior que zero",
        variant: "destructive",
      });
      return;
    }

    if ((tipoMovimentacao === "saida" || tipoMovimentacao === "descarte") && 
        quantidade > itemEncontrado.quantidade_atual) {
      toast({
        title: "Estoque insuficiente",
        description: `Disponível: ${itemEncontrado.quantidade_atual} unidades`,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Validar campos obrigatórios
    if (tipoMovimentacao === "saida" && !responsavelRetirada.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Informe quem está retirando o item",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    if (tipoMovimentacao === "devolucao" && !responsavelDevolucao.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Informe quem está devolvendo o item",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    const { error } = await supabase
      .from("rouparia_movimentacoes")
      .insert({
        item_id: itemEncontrado.id,
        tipo_movimentacao: tipoMovimentacao,
        quantidade,
        quantidade_anterior: 0, // Será preenchido pelo trigger
        quantidade_nova: 0, // Será preenchido pelo trigger
        setor_destino: tipoMovimentacao === "saida" ? setorDestino : null,
        setor_origem: tipoMovimentacao === "devolucao" ? setorOrigem : null,
        observacao: observacao || null,
        registrado_por: user.id,
        registrado_por_nome: userName,
        responsavel_retirada: tipoMovimentacao === "saida" ? responsavelRetirada.trim() : null,
        responsavel_devolucao: tipoMovimentacao === "devolucao" ? responsavelDevolucao.trim() : null,
      });

    setIsLoading(false);

    if (error) {
      toast({
        title: "Erro ao registrar movimentação",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Movimentação registrada",
      description: `${TIPO_LABELS[tipoMovimentacao].label} de ${quantidade} ${itemEncontrado.rouparia_categorias.nome}`,
    });

    // Limpar formulário
    setCodigoBarras("");
    setQuantidade(1);
    setSetorDestino("");
    setSetorOrigem("");
    setObservacao("");
    setResponsavelRetirada("");
    setResponsavelDevolucao("");
    setItemEncontrado(null);
    setUltimaMovimentacao(null);
    fetchMovimentacoes();
    
    // Focar no campo de código de barras
    barcodeInputRef.current?.focus();
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Formulário de Movimentação */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Barcode className="h-5 w-5" />
            Registrar Movimentação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Modo Automático Toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-2">
                <Zap className={`h-4 w-4 ${modoAutomatico ? "text-primary" : "text-muted-foreground"}`} />
                <div>
                  <p className="text-sm font-medium">Modo Inteligente</p>
                  <p className="text-xs text-muted-foreground">
                    Detecta automaticamente entrada/saída/devolução
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant={modoAutomatico ? "default" : "outline"}
                size="sm"
                onClick={() => setModoAutomatico(!modoAutomatico)}
              >
                {modoAutomatico ? "Ativo" : "Inativo"}
              </Button>
            </div>

            {/* Tipo de Movimentação */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Tipo de Movimentação
                {ultimaMovimentacao && modoAutomatico && (
                  <Badge variant="outline" className="text-xs">
                    Última: {TIPO_LABELS[ultimaMovimentacao]?.label}
                  </Badge>
                )}
              </Label>
              <div className="grid grid-cols-4 gap-2">
                {Object.entries(TIPO_LABELS).map(([key, { label, icon }]) => (
                  <Button
                    key={key}
                    type="button"
                    variant={tipoMovimentacao === key ? "default" : "outline"}
                    size="sm"
                    className="flex items-center gap-1"
                    onClick={() => {
                      setTipoMovimentacao(key);
                      if (modoAutomatico) setModoAutomatico(false);
                    }}
                  >
                    {icon}
                    <span className="hidden sm:inline">{label}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Código de Barras */}
            <div className="space-y-2">
              <Label htmlFor="codigo">Código de Barras</Label>
              <div className="relative">
                <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={barcodeInputRef}
                  id="codigo"
                  value={codigoBarras}
                  onChange={(e) => setCodigoBarras(e.target.value)}
                  placeholder="Bipe ou digite o código"
                  className="pl-10"
                  autoFocus
                  autoComplete="off"
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
            </div>

            {/* Item Encontrado */}
            {itemEncontrado && (
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{itemEncontrado.rouparia_categorias.nome}</span>
                  <Badge variant="outline">
                    <Package className="w-3 h-3 mr-1" />
                    {itemEncontrado.quantidade_atual} un.
                  </Badge>
                </div>
                {itemEncontrado.descricao && (
                  <p className="text-sm text-muted-foreground">{itemEncontrado.descricao}</p>
                )}
                {(tipoMovimentacao === "saida" || tipoMovimentacao === "descarte") && 
                 itemEncontrado.quantidade_atual < 10 && (
                  <div className="flex items-center gap-1 text-amber-600 text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    Estoque baixo
                  </div>
                )}
              </div>
            )}

            {codigoBarras && !itemEncontrado && !isSearching && (
              <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20 text-destructive text-sm">
                Item não encontrado. Verifique o código ou cadastre o item.
              </div>
            )}

            {/* Quantidade */}
            <div className="space-y-2">
              <Label htmlFor="quantidade">Quantidade</Label>
              <Input
                id="quantidade"
                type="number"
                min={1}
                value={quantidade}
                onChange={(e) => setQuantidade(parseInt(e.target.value) || 1)}
              />
            </div>

            {/* Setor Destino e Responsável pela Retirada (para saída) */}
            {tipoMovimentacao === "saida" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="responsavel-retirada" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Quem está retirando? *
                  </Label>
                  <Select value={responsavelRetirada} onValueChange={setResponsavelRetirada}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o usuário" />
                    </SelectTrigger>
                    <SelectContent>
                      {usuarios.map((usuario) => (
                        <SelectItem key={usuario.user_id} value={usuario.full_name}>
                          {usuario.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="setor-destino">Setor Destino</Label>
                  <Select value={setorDestino} onValueChange={setSetorDestino}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o setor" />
                    </SelectTrigger>
                    <SelectContent>
                      {SETORES.map((setor) => (
                        <SelectItem key={setor} value={setor}>
                          {setor}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Setor Origem e Responsável pela Devolução (para devolução) */}
            {tipoMovimentacao === "devolucao" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="responsavel-devolucao" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Quem está devolvendo? *
                  </Label>
                  <Select value={responsavelDevolucao} onValueChange={setResponsavelDevolucao}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o usuário" />
                    </SelectTrigger>
                    <SelectContent>
                      {usuarios.map((usuario) => (
                        <SelectItem key={usuario.user_id} value={usuario.full_name}>
                          {usuario.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="setor-origem">Setor de Origem</Label>
                  <Select value={setorOrigem} onValueChange={setSetorOrigem}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o setor" />
                    </SelectTrigger>
                    <SelectContent>
                      {SETORES.map((setor) => (
                        <SelectItem key={setor} value={setor}>
                          {setor}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Observação */}
            <div className="space-y-2">
              <Label htmlFor="observacao">Observação (opcional)</Label>
              <Textarea
                id="observacao"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Motivo do descarte, condição do item, etc."
                rows={2}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || !itemEncontrado}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registrando...
                </>
              ) : (
                <>Registrar {TIPO_LABELS[tipoMovimentacao].label}</>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Histórico Recente */}
      <Card>
        <CardHeader>
          <CardTitle>Movimentações Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-center">Qtd</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Hora</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movimentacoes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Nenhuma movimentação registrada
                    </TableCell>
                  </TableRow>
                ) : (
                  movimentacoes.map((mov) => {
                    const tipoInfo = TIPO_LABELS[mov.tipo_movimentacao];
                    const responsavel = mov.responsavel_retirada || mov.responsavel_devolucao || mov.registrado_por_nome;
                    return (
                      <TableRow key={mov.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">
                              {mov.rouparia_itens.rouparia_categorias.nome}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {mov.rouparia_itens.codigo_barras}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={tipoInfo.color} variant="outline">
                            {tipoInfo.icon}
                            <span className="ml-1">{tipoInfo.label}</span>
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {mov.quantidade}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p className="font-medium">{responsavel}</p>
                            {(mov.responsavel_retirada || mov.responsavel_devolucao) && (
                              <p className="text-xs text-muted-foreground">
                                por {mov.registrado_por_nome}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(mov.created_at), "HH:mm", { locale: ptBR })}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
