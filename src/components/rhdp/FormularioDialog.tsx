import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  Users, 
  Building2, 
  Briefcase, 
  Globe,
  X,
  Save,
  Loader2
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Campo {
  id?: string;
  tipo: string;
  label: string;
  obrigatorio: boolean;
  opcoes: string[];
  ordem: number;
}

interface Permissao {
  tipo_permissao: "usuario" | "cargo" | "setor" | "todos";
  valor: string | null;
}

interface Profile {
  user_id: string;
  full_name: string;
}

interface Cargo {
  id: string;
  nome: string;
}

interface Setor {
  id: string;
  nome: string;
}

interface Formulario {
  id?: string;
  titulo: string;
  descricao: string;
  prazo: string;
  status: string;
}

interface FormularioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formulario?: Formulario | null;
  onSuccess: () => void;
}

const tiposCampo = [
  { value: "texto", label: "Texto curto" },
  { value: "texto_longo", label: "Texto longo" },
  { value: "numero", label: "Número" },
  { value: "data", label: "Data" },
  { value: "selecao", label: "Seleção única" },
  { value: "multipla_escolha", label: "Múltipla escolha" },
  { value: "sim_nao", label: "Sim/Não" },
];

export const FormularioDialog = ({ open, onOpenChange, formulario, onSuccess }: FormularioDialogProps) => {
  const [activeTab, setActiveTab] = useState("info");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form data
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [prazo, setPrazo] = useState("");
  const [status, setStatus] = useState("rascunho");
  
  // Campos
  const [campos, setCampos] = useState<Campo[]>([]);
  const [novoCampoTipo, setNovoCampoTipo] = useState("texto");
  const [novoCampoLabel, setNovoCampoLabel] = useState("");
  const [novoCampoObrigatorio, setNovoCampoObrigatorio] = useState(false);
  const [novoCampoOpcoes, setNovoCampoOpcoes] = useState("");
  
  // Permissões
  const [permissoes, setPermissoes] = useState<Permissao[]>([]);
  const [tipoPermissao, setTipoPermissao] = useState<"usuario" | "cargo" | "setor" | "todos">("todos");
  const [valorPermissao, setValorPermissao] = useState("");
  
  // Listas auxiliares
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);

  useEffect(() => {
    if (open) {
      loadAuxiliaryData();
      if (formulario?.id) {
        loadFormularioData();
      } else {
        resetForm();
      }
    }
  }, [open, formulario]);

  const resetForm = () => {
    setTitulo("");
    setDescricao("");
    setPrazo("");
    setStatus("rascunho");
    setCampos([]);
    setPermissoes([]);
    setActiveTab("info");
  };

  const loadAuxiliaryData = async () => {
    try {
      const [profilesRes, cargosRes, setoresRes] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name").order("full_name"),
        supabase.from("cargos").select("id, nome").eq("ativo", true).order("nome"),
        supabase.from("setores").select("id, nome").eq("ativo", true).order("nome")
      ]);

      if (profilesRes.data) setProfiles(profilesRes.data);
      if (cargosRes.data) setCargos(cargosRes.data);
      if (setoresRes.data) setSetores(setoresRes.data);
    } catch (error) {
      console.error("Erro ao carregar dados auxiliares:", error);
    }
  };

  const loadFormularioData = async () => {
    if (!formulario?.id) return;
    
    setIsLoading(true);
    try {
      setTitulo(formulario.titulo);
      setDescricao(formulario.descricao || "");
      setPrazo(formulario.prazo || "");
      setStatus(formulario.status);

      // Carregar campos
      const { data: camposData } = await supabase
        .from("formulario_campos")
        .select("*")
        .eq("formulario_id", formulario.id)
        .order("ordem");

      if (camposData) {
        setCampos(camposData.map(c => ({
          id: c.id,
          tipo: c.tipo,
          label: c.label,
          obrigatorio: c.obrigatorio || false,
          opcoes: c.opcoes || [],
          ordem: c.ordem
        })));
      }

      // Carregar permissões
      const { data: permissoesData } = await supabase
        .from("formulario_permissoes")
        .select("*")
        .eq("formulario_id", formulario.id);

      if (permissoesData) {
        setPermissoes(permissoesData.map(p => ({
          tipo_permissao: p.tipo_permissao as "usuario" | "cargo" | "setor" | "todos",
          valor: p.valor
        })));
      }
    } catch (error) {
      console.error("Erro ao carregar formulário:", error);
      toast.error("Erro ao carregar dados do formulário");
    } finally {
      setIsLoading(false);
    }
  };

  const adicionarCampo = () => {
    if (!novoCampoLabel.trim()) {
      toast.error("Informe o nome do campo");
      return;
    }

    const needsOptions = ["selecao", "multipla_escolha"].includes(novoCampoTipo);
    if (needsOptions && !novoCampoOpcoes.trim()) {
      toast.error("Informe as opções separadas por vírgula");
      return;
    }

    const novoCampo: Campo = {
      tipo: novoCampoTipo,
      label: novoCampoLabel.trim(),
      obrigatorio: novoCampoObrigatorio,
      opcoes: needsOptions ? novoCampoOpcoes.split(",").map(o => o.trim()).filter(Boolean) : [],
      ordem: campos.length
    };

    setCampos([...campos, novoCampo]);
    setNovoCampoLabel("");
    setNovoCampoOpcoes("");
    setNovoCampoObrigatorio(false);
    toast.success("Campo adicionado");
  };

  const removerCampo = (index: number) => {
    setCampos(campos.filter((_, i) => i !== index));
  };

  const adicionarPermissao = () => {
    if (tipoPermissao === "todos") {
      if (permissoes.some(p => p.tipo_permissao === "todos")) {
        toast.error("Permissão 'Todos' já adicionada");
        return;
      }
      setPermissoes([...permissoes, { tipo_permissao: "todos", valor: null }]);
    } else {
      if (!valorPermissao) {
        toast.error("Selecione um valor");
        return;
      }
      if (permissoes.some(p => p.tipo_permissao === tipoPermissao && p.valor === valorPermissao)) {
        toast.error("Permissão já adicionada");
        return;
      }
      setPermissoes([...permissoes, { tipo_permissao: tipoPermissao, valor: valorPermissao }]);
    }
    setValorPermissao("");
  };

  const removerPermissao = (index: number) => {
    setPermissoes(permissoes.filter((_, i) => i !== index));
  };

  const getPermissaoLabel = (permissao: Permissao) => {
    if (permissao.tipo_permissao === "todos") return "Todos os usuários";
    if (permissao.tipo_permissao === "usuario") {
      const profile = profiles.find(p => p.user_id === permissao.valor);
      return profile?.full_name || permissao.valor;
    }
    if (permissao.tipo_permissao === "cargo") {
      const cargo = cargos.find(c => c.nome === permissao.valor);
      return cargo?.nome || permissao.valor;
    }
    if (permissao.tipo_permissao === "setor") {
      const setor = setores.find(s => s.nome === permissao.valor);
      return setor?.nome || permissao.valor;
    }
    return permissao.valor;
  };

  const handleSubmit = async () => {
    if (!titulo.trim()) {
      toast.error("Informe o título do formulário");
      return;
    }

    setIsSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Usuário não autenticado");

      let formularioId = formulario?.id;

      if (formularioId) {
        // Update
        const { error } = await supabase
          .from("formularios")
          .update({
            titulo: titulo.trim(),
            descricao: descricao.trim() || null,
            prazo: prazo || null,
            status
          })
          .eq("id", formularioId);

        if (error) throw error;

        // Deletar campos e permissões existentes
        await Promise.all([
          supabase.from("formulario_campos").delete().eq("formulario_id", formularioId),
          supabase.from("formulario_permissoes").delete().eq("formulario_id", formularioId)
        ]);
      } else {
        // Create
        const { data, error } = await supabase
          .from("formularios")
          .insert({
            titulo: titulo.trim(),
            descricao: descricao.trim() || null,
            prazo: prazo || null,
            status,
            criado_por: userData.user.id
          })
          .select("id")
          .single();

        if (error) throw error;
        formularioId = data.id;
      }

      // Inserir campos
      if (campos.length > 0) {
        const camposInsert = campos.map((campo, index) => ({
          formulario_id: formularioId,
          tipo: campo.tipo,
          label: campo.label,
          obrigatorio: campo.obrigatorio,
          opcoes: campo.opcoes.length > 0 ? campo.opcoes : null,
          ordem: index
        }));

        const { error: camposError } = await supabase
          .from("formulario_campos")
          .insert(camposInsert);

        if (camposError) throw camposError;
      }

      // Inserir permissões
      if (permissoes.length > 0) {
        const permissoesInsert = permissoes.map(p => ({
          formulario_id: formularioId,
          tipo_permissao: p.tipo_permissao,
          valor: p.valor
        }));

        const { error: permError } = await supabase
          .from("formulario_permissoes")
          .insert(permissoesInsert);

        if (permError) throw permError;
      }

      toast.success(formulario?.id ? "Formulário atualizado!" : "Formulário criado!");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      toast.error(error.message || "Erro ao salvar formulário");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {formulario?.id ? "Editar Formulário" : "Novo Formulário"}
          </DialogTitle>
          <DialogDescription>
            Configure as informações, campos e permissões do formulário
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="info">Informações</TabsTrigger>
                <TabsTrigger value="campos">Campos ({campos.length})</TabsTrigger>
                <TabsTrigger value="permissoes">Permissões ({permissoes.length})</TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1 mt-4">
                <TabsContent value="info" className="mt-0 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="titulo">Título *</Label>
                    <Input
                      id="titulo"
                      value={titulo}
                      onChange={(e) => setTitulo(e.target.value)}
                      placeholder="Ex: Pesquisa de Clima Organizacional"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="descricao">Descrição</Label>
                    <Textarea
                      id="descricao"
                      value={descricao}
                      onChange={(e) => setDescricao(e.target.value)}
                      placeholder="Descreva o objetivo do formulário..."
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="prazo">Prazo</Label>
                      <Input
                        id="prazo"
                        type="date"
                        value={prazo}
                        onChange={(e) => setPrazo(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="rascunho">Rascunho</SelectItem>
                          <SelectItem value="ativo">Ativo</SelectItem>
                          <SelectItem value="encerrado">Encerrado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="campos" className="mt-0 space-y-4">
                  <Card>
                    <CardContent className="pt-4 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Tipo do campo</Label>
                          <Select value={novoCampoTipo} onValueChange={setNovoCampoTipo}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {tiposCampo.map(tipo => (
                                <SelectItem key={tipo.value} value={tipo.value}>
                                  {tipo.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Nome do campo</Label>
                          <Input
                            value={novoCampoLabel}
                            onChange={(e) => setNovoCampoLabel(e.target.value)}
                            placeholder="Ex: Qual sua avaliação?"
                          />
                        </div>
                      </div>

                      {["selecao", "multipla_escolha"].includes(novoCampoTipo) && (
                        <div className="space-y-2">
                          <Label>Opções (separadas por vírgula)</Label>
                          <Input
                            value={novoCampoOpcoes}
                            onChange={(e) => setNovoCampoOpcoes(e.target.value)}
                            placeholder="Ex: Ótimo, Bom, Regular, Ruim"
                          />
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="obrigatorio"
                            checked={novoCampoObrigatorio}
                            onCheckedChange={(checked) => setNovoCampoObrigatorio(checked as boolean)}
                          />
                          <Label htmlFor="obrigatorio" className="cursor-pointer">
                            Campo obrigatório
                          </Label>
                        </div>

                        <Button onClick={adicionarCampo} size="sm">
                          <Plus className="h-4 w-4 mr-1" />
                          Adicionar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {campos.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhum campo adicionado. Adicione campos acima.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {campos.map((campo, index) => (
                        <Card key={index}>
                          <CardContent className="py-3 flex items-center gap-3">
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                            <div className="flex-1">
                              <p className="font-medium">{campo.label}</p>
                              <p className="text-sm text-muted-foreground">
                                {tiposCampo.find(t => t.value === campo.tipo)?.label}
                                {campo.obrigatorio && " • Obrigatório"}
                                {campo.opcoes.length > 0 && ` • ${campo.opcoes.length} opções`}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removerCampo(index)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="permissoes" className="mt-0 space-y-4">
                  <Card>
                    <CardContent className="pt-4 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Tipo de permissão</Label>
                          <Select 
                            value={tipoPermissao} 
                            onValueChange={(v) => {
                              setTipoPermissao(v as any);
                              setValorPermissao("");
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="todos">
                                <div className="flex items-center gap-2">
                                  <Globe className="h-4 w-4" />
                                  Todos
                                </div>
                              </SelectItem>
                              <SelectItem value="usuario">
                                <div className="flex items-center gap-2">
                                  <Users className="h-4 w-4" />
                                  Usuário específico
                                </div>
                              </SelectItem>
                              <SelectItem value="cargo">
                                <div className="flex items-center gap-2">
                                  <Briefcase className="h-4 w-4" />
                                  Por Cargo
                                </div>
                              </SelectItem>
                              <SelectItem value="setor">
                                <div className="flex items-center gap-2">
                                  <Building2 className="h-4 w-4" />
                                  Por Setor
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {tipoPermissao !== "todos" && (
                          <div className="space-y-2">
                            <Label>
                              {tipoPermissao === "usuario" && "Selecione o usuário"}
                              {tipoPermissao === "cargo" && "Selecione o cargo"}
                              {tipoPermissao === "setor" && "Selecione o setor"}
                            </Label>
                            <Select value={valorPermissao} onValueChange={setValorPermissao}>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione..." />
                              </SelectTrigger>
                              <SelectContent>
                                {tipoPermissao === "usuario" && profiles.map(p => (
                                  <SelectItem key={p.user_id} value={p.user_id}>
                                    {p.full_name}
                                  </SelectItem>
                                ))}
                                {tipoPermissao === "cargo" && cargos.map(c => (
                                  <SelectItem key={c.id} value={c.nome}>
                                    {c.nome}
                                  </SelectItem>
                                ))}
                                {tipoPermissao === "setor" && setores.map(s => (
                                  <SelectItem key={s.id} value={s.nome}>
                                    {s.nome}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end">
                        <Button onClick={adicionarPermissao} size="sm">
                          <Plus className="h-4 w-4 mr-1" />
                          Adicionar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {permissoes.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhuma permissão configurada. O formulário só será visível para RH/DP e Admin.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {permissoes.map((perm, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="flex items-center gap-1 py-1.5 px-3"
                        >
                          {perm.tipo_permissao === "todos" && <Globe className="h-3 w-3" />}
                          {perm.tipo_permissao === "usuario" && <Users className="h-3 w-3" />}
                          {perm.tipo_permissao === "cargo" && <Briefcase className="h-3 w-3" />}
                          {perm.tipo_permissao === "setor" && <Building2 className="h-3 w-3" />}
                          {getPermissaoLabel(perm)}
                          <button
                            onClick={() => removerPermissao(index)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </ScrollArea>
            </Tabs>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
