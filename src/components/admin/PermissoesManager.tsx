import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Shield, Search, ChevronRight, ChevronDown, Plus, Copy, Trash2, 
  Eye, EyeOff, Lock, Check, X, Users, Loader2
} from "lucide-react";
import { 
  usePerfis, useModulos, useFerramentas, usePermissoesPerfil,
  useSalvarPermissaoModulo, useSalvarPermissaoFerramenta,
  useCriarPerfil, useExcluirPerfil, useMarcarTodasPermissoes,
  type PerfilSistema, type ModuloSistema, type FerramentaModulo
} from "@/hooks/usePermissoes";

// Mapeamento de categorias para labels
const CATEGORIAS: Record<string, { label: string; cor: string }> = {
  assistencial: { label: "Assistencial", cor: "bg-green-100 text-green-800" },
  administrativo: { label: "Administrativo", cor: "bg-blue-100 text-blue-800" },
  suporte: { label: "Suporte", cor: "bg-orange-100 text-orange-800" },
  utilidades: { label: "Utilidades", cor: "bg-gray-100 text-gray-800" },
};

export function PermissoesManager() {
  const [perfilSelecionado, setPerfilSelecionado] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  const [novoPerfilOpen, setNovoPerfilOpen] = useState(false);
  const [novoPerfilNome, setNovoPerfilNome] = useState("");
  const [novoPerfilDescricao, setNovoPerfilDescricao] = useState("");
  const [novoPerfilCor, setNovoPerfilCor] = useState("#6b7280");
  const [clonarDe, setClonarDe] = useState<string>("");
  
  const { data: perfis, isLoading: loadingPerfis } = usePerfis();
  const { data: modulos, isLoading: loadingModulos } = useModulos();
  const { data: ferramentas, isLoading: loadingFerramentas } = useFerramentas();
  const { data: permissoes, isLoading: loadingPermissoes } = usePermissoesPerfil(perfilSelecionado);
  
  const salvarPermissaoModulo = useSalvarPermissaoModulo();
  const salvarPermissaoFerramenta = useSalvarPermissaoFerramenta();
  const criarPerfil = useCriarPerfil();
  const excluirPerfil = useExcluirPerfil();
  const marcarTodas = useMarcarTodasPermissoes();

  const perfilAtual = perfis?.find(p => p.id === perfilSelecionado);

  // Agrupar módulos por categoria
  const modulosPorCategoria = useMemo(() => {
    if (!modulos) return {};
    
    const filtrados = busca
      ? modulos.filter(m => 
          m.nome.toLowerCase().includes(busca.toLowerCase()) ||
          m.codigo.toLowerCase().includes(busca.toLowerCase())
        )
      : modulos;
    
    return filtrados.reduce((acc, modulo) => {
      const cat = modulo.categoria || "utilidades";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(modulo);
      return acc;
    }, {} as Record<string, ModuloSistema[]>);
  }, [modulos, busca]);

  // Agrupar ferramentas por módulo
  const ferramentasPorModulo = useMemo(() => {
    if (!ferramentas) return {};
    return ferramentas.reduce((acc, f) => {
      if (!acc[f.modulo_id]) acc[f.modulo_id] = [];
      acc[f.modulo_id].push(f);
      return acc;
    }, {} as Record<string, FerramentaModulo[]>);
  }, [ferramentas]);

  // Obter permissão de um módulo
  const getPermissaoModulo = (moduloId: string) => {
    return permissoes?.modulos.find(p => p.modulo_id === moduloId) || {
      pode_visualizar: false,
      pode_acessar: false,
      comportamento_sem_acesso: "ocultar" as const,
    };
  };

  // Obter permissão de uma ferramenta
  const getPermissaoFerramenta = (ferramentaId: string) => {
    return permissoes?.ferramentas.find(p => p.ferramenta_id === ferramentaId)?.permitido ?? false;
  };

  // Toggle expandir módulo
  const toggleExpandir = (moduloId: string) => {
    const novos = new Set(expandidos);
    if (novos.has(moduloId)) {
      novos.delete(moduloId);
    } else {
      novos.add(moduloId);
    }
    setExpandidos(novos);
  };

  // Criar novo perfil
  const handleCriarPerfil = async () => {
    if (!novoPerfilNome.trim()) return;
    
    await criarPerfil.mutateAsync({
      nome: novoPerfilNome,
      descricao: novoPerfilDescricao,
      cor: novoPerfilCor,
      clonarDe: clonarDe || undefined,
    });
    
    setNovoPerfilOpen(false);
    setNovoPerfilNome("");
    setNovoPerfilDescricao("");
    setNovoPerfilCor("#6b7280");
    setClonarDe("");
  };

  const isLoading = loadingPerfis || loadingModulos || loadingFerramentas;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Painel de Permissões
          </h2>
          <p className="text-muted-foreground">
            Configure o que cada perfil pode visualizar e acessar
          </p>
        </div>
        
        <Dialog open={novoPerfilOpen} onOpenChange={setNovoPerfilOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Perfil
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Perfil</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome do Perfil</Label>
                <Input 
                  value={novoPerfilNome}
                  onChange={(e) => setNovoPerfilNome(e.target.value)}
                  placeholder="Ex: Coordenador de Enfermagem"
                />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea 
                  value={novoPerfilDescricao}
                  onChange={(e) => setNovoPerfilDescricao(e.target.value)}
                  placeholder="Descreva as responsabilidades deste perfil"
                />
              </div>
              <div className="space-y-2">
                <Label>Cor</Label>
                <div className="flex gap-2">
                  <Input 
                    type="color"
                    value={novoPerfilCor}
                    onChange={(e) => setNovoPerfilCor(e.target.value)}
                    className="w-16 h-10 p-1"
                  />
                  <Input 
                    value={novoPerfilCor}
                    onChange={(e) => setNovoPerfilCor(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Clonar permissões de</Label>
                <Select value={clonarDe} onValueChange={setClonarDe}>
                  <SelectTrigger>
                    <SelectValue placeholder="Nenhum (começar do zero)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum (começar do zero)</SelectItem>
                    {perfis?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: p.cor }}
                          />
                          {p.nome}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNovoPerfilOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleCriarPerfil}
                disabled={!novoPerfilNome.trim() || criarPerfil.isPending}
              >
                {criarPerfil.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Criar Perfil
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Lista de Perfis */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Perfis</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              <div className="space-y-1 p-3">
                {perfis?.map((perfil) => (
                  <button
                    key={perfil.id}
                    onClick={() => setPerfilSelecionado(perfil.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all ${
                      perfilSelecionado === perfil.id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-secondary"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: perfil.cor }}
                      />
                      <span className="font-medium">{perfil.nome}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {perfil.is_master && (
                        <Badge variant="secondary" className="text-xs">
                          Master
                        </Badge>
                      )}
                      {perfil.is_sistema && (
                        <Lock className="h-3 w-3 opacity-50" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Configuração de Permissões */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  {perfilAtual ? (
                    <>
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: perfilAtual.cor }}
                      />
                      Permissões: {perfilAtual.nome}
                    </>
                  ) : (
                    "Selecione um perfil"
                  )}
                </CardTitle>
                {perfilAtual?.descricao && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {perfilAtual.descricao}
                  </p>
                )}
              </div>
              
              {perfilAtual && !perfilAtual.is_sistema && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (confirm("Tem certeza que deseja excluir este perfil?")) {
                      excluirPerfil.mutate(perfilAtual.id);
                      setPerfilSelecionado(null);
                    }
                  }}
                  disabled={excluirPerfil.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Excluir
                </Button>
              )}
            </div>
            
            {perfilSelecionado && (
              <div className="mt-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar módulo ou ferramenta..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            )}
          </CardHeader>
          
          <CardContent>
            {!perfilSelecionado ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <Users className="h-12 w-12 mb-4 opacity-50" />
                <p>Selecione um perfil para configurar suas permissões</p>
              </div>
            ) : loadingPermissoes ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ScrollArea className="h-[450px] pr-4">
                <div className="space-y-6">
                  {Object.entries(CATEGORIAS).map(([catKey, catInfo]) => {
                    const modulosCat = modulosPorCategoria[catKey];
                    if (!modulosCat?.length) return null;
                    
                    return (
                      <div key={catKey} className="space-y-3">
                        <h3 className="font-semibold flex items-center gap-2">
                          <Badge className={catInfo.cor}>{catInfo.label}</Badge>
                        </h3>
                        
                        <div className="space-y-2">
                          {modulosCat.map((modulo) => {
                            const permModulo = getPermissaoModulo(modulo.id);
                            const ferramentasModulo = ferramentasPorModulo[modulo.id] || [];
                            const isExpanded = expandidos.has(modulo.id);
                            
                            return (
                              <Collapsible
                                key={modulo.id}
                                open={isExpanded}
                                onOpenChange={() => toggleExpandir(modulo.id)}
                              >
                                <div className="border rounded-lg overflow-hidden">
                                  <div className="flex items-center justify-between p-3 bg-muted/30">
                                    <CollapsibleTrigger className="flex items-center gap-2 hover:text-primary transition-colors">
                                      {isExpanded ? (
                                        <ChevronDown className="h-4 w-4" />
                                      ) : (
                                        <ChevronRight className="h-4 w-4" />
                                      )}
                                      <span className="font-medium">{modulo.nome}</span>
                                    </CollapsibleTrigger>
                                    
                                    <div className="flex items-center gap-4">
                                      {/* Toggle Visualizar */}
                                      <div className="flex items-center gap-2">
                                        <Eye className="h-4 w-4 text-muted-foreground" />
                                        <Switch
                                          checked={permModulo.pode_visualizar}
                                          onCheckedChange={(checked) => {
                                            salvarPermissaoModulo.mutate({
                                              perfilId: perfilSelecionado,
                                              moduloId: modulo.id,
                                              podeVisualizar: checked,
                                              podeAcessar: checked ? permModulo.pode_acessar : false,
                                              comportamento: permModulo.comportamento_sem_acesso,
                                            });
                                          }}
                                        />
                                      </div>
                                      
                                      {/* Toggle Acessar */}
                                      <div className="flex items-center gap-2">
                                        <Lock className="h-4 w-4 text-muted-foreground" />
                                        <Switch
                                          checked={permModulo.pode_acessar}
                                          disabled={!permModulo.pode_visualizar}
                                          onCheckedChange={(checked) => {
                                            salvarPermissaoModulo.mutate({
                                              perfilId: perfilSelecionado,
                                              moduloId: modulo.id,
                                              podeVisualizar: permModulo.pode_visualizar,
                                              podeAcessar: checked,
                                              comportamento: permModulo.comportamento_sem_acesso,
                                            });
                                          }}
                                        />
                                      </div>
                                      
                                      {/* Comportamento */}
                                      <Select
                                        value={permModulo.comportamento_sem_acesso}
                                        onValueChange={(value: "ocultar" | "desabilitar") => {
                                          salvarPermissaoModulo.mutate({
                                            perfilId: perfilSelecionado,
                                            moduloId: modulo.id,
                                            podeVisualizar: permModulo.pode_visualizar,
                                            podeAcessar: permModulo.pode_acessar,
                                            comportamento: value,
                                          });
                                        }}
                                      >
                                        <SelectTrigger className="w-32 h-8">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="ocultar">
                                            <div className="flex items-center gap-2">
                                              <EyeOff className="h-3 w-3" />
                                              Ocultar
                                            </div>
                                          </SelectItem>
                                          <SelectItem value="desabilitar">
                                            <div className="flex items-center gap-2">
                                              <Lock className="h-3 w-3" />
                                              Desabilitar
                                            </div>
                                          </SelectItem>
                                        </SelectContent>
                                      </Select>
                                      
                                      {/* Marcar/Desmarcar tudo */}
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          const todasMarcadas = ferramentasModulo.every(
                                            f => getPermissaoFerramenta(f.id)
                                          );
                                          marcarTodas.mutate({
                                            perfilId: perfilSelecionado,
                                            moduloId: modulo.id,
                                            marcar: !todasMarcadas,
                                          });
                                        }}
                                        disabled={marcarTodas.isPending}
                                      >
                                        {marcarTodas.isPending ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          <>
                                            <Check className="h-4 w-4 mr-1" />
                                            Tudo
                                          </>
                                        )}
                                      </Button>
                                    </div>
                                  </div>
                                  
                                  <CollapsibleContent>
                                    {ferramentasModulo.length > 0 && (
                                      <div className="p-3 pt-0 space-y-2">
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pt-3 border-t">
                                          {ferramentasModulo.map((ferramenta) => {
                                            const permitido = getPermissaoFerramenta(ferramenta.id);
                                            
                                            return (
                                              <div
                                                key={ferramenta.id}
                                                className={`flex items-center justify-between p-2 rounded-md border ${
                                                  permitido ? "bg-green-50 border-green-200" : "bg-muted/30"
                                                }`}
                                              >
                                                <span className="text-sm">{ferramenta.nome}</span>
                                                <Switch
                                                  checked={permitido}
                                                  disabled={!permModulo.pode_acessar}
                                                  onCheckedChange={(checked) => {
                                                    salvarPermissaoFerramenta.mutate({
                                                      perfilId: perfilSelecionado,
                                                      ferramentaId: ferramenta.id,
                                                      permitido: checked,
                                                    });
                                                  }}
                                                />
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}
                                  </CollapsibleContent>
                                </div>
                              </Collapsible>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
