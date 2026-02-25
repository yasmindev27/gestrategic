import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Plus, 
  Users, 
  Building2, 
  Briefcase, 
  Globe,
  X,
  Save,
  Loader2,
  FileText
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { QuestionCard, AddQuestionButton, type QuestionData } from "@/components/form-builder";

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

export const FormularioDialog = ({ open, onOpenChange, formulario, onSuccess }: FormularioDialogProps) => {
  const [activeTab, setActiveTab] = useState("campos");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form data
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [prazo, setPrazo] = useState("");
  const [status, setStatus] = useState("rascunho");
  
  // Campos (questions)
  const [campos, setCampos] = useState<QuestionData[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  
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
    setActiveTab("campos");
    setSelectedIndex(null);
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

  // Question handlers
  const handleAddQuestion = (question: QuestionData) => {
    const newCampos = [...campos, { ...question, ordem: campos.length }];
    setCampos(newCampos);
    setSelectedIndex(newCampos.length - 1);
  };

  const handleUpdateQuestion = (index: number, updated: QuestionData) => {
    const newCampos = [...campos];
    newCampos[index] = updated;
    setCampos(newCampos);
  };

  const handleDeleteQuestion = (index: number) => {
    setCampos(campos.filter((_, i) => i !== index));
    setSelectedIndex(null);
  };

  const handleDuplicateQuestion = (index: number) => {
    const copy = { ...campos[index], id: undefined, ordem: campos.length };
    const newCampos = [...campos];
    newCampos.splice(index + 1, 0, copy);
    setCampos(newCampos);
    setSelectedIndex(index + 1);
  };

  // Permissões
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
    if (permissao.tipo_permissao === "cargo") return permissao.valor;
    if (permissao.tipo_permissao === "setor") return permissao.valor;
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
        const { error } = await supabase
          .from("formularios")
          .update({ titulo: titulo.trim(), descricao: descricao.trim() || null, prazo: prazo || null, status })
          .eq("id", formularioId);
        if (error) throw error;

        await Promise.all([
          supabase.from("formulario_campos").delete().eq("formulario_id", formularioId),
          supabase.from("formulario_permissoes").delete().eq("formulario_id", formularioId)
        ]);
      } else {
        const { data, error } = await supabase
          .from("formularios")
          .insert({ titulo: titulo.trim(), descricao: descricao.trim() || null, prazo: prazo || null, status, criado_por: userData.user.id })
          .select("id")
          .single();
        if (error) throw error;
        formularioId = data.id;
      }

      if (campos.length > 0) {
        const camposInsert = campos.map((campo, index) => ({
          formulario_id: formularioId,
          tipo: campo.tipo,
          label: campo.label,
          obrigatorio: campo.obrigatorio,
          opcoes: campo.opcoes.length > 0 ? campo.opcoes : null,
          ordem: index
        }));
        const { error: camposError } = await supabase.from("formulario_campos").insert(camposInsert);
        if (camposError) throw camposError;
      }

      if (permissoes.length > 0) {
        const permissoesInsert = permissoes.map(p => ({
          formulario_id: formularioId,
          tipo_permissao: p.tipo_permissao,
          valor: p.valor
        }));
        const { error: permError } = await supabase.from("formulario_permissoes").insert(permissoesInsert);
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
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-hidden flex flex-col p-0">
        {/* Header styled like Google Forms */}
        <div className="bg-primary/5 border-b p-6 space-y-3">
          <Input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Título do formulário"
            className="text-2xl font-bold border-0 border-b-2 border-transparent focus-visible:border-primary rounded-none px-0 bg-transparent focus-visible:ring-0 h-auto py-1"
          />
          <Textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Descrição do formulário (opcional)"
            className="border-0 border-b border-transparent focus-visible:border-primary rounded-none px-0 bg-transparent focus-visible:ring-0 resize-none text-sm text-muted-foreground min-h-0"
            rows={1}
          />
          <div className="flex gap-3 items-center flex-wrap">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">Prazo:</Label>
              <Input
                type="date"
                value={prazo}
                onChange={(e) => setPrazo(e.target.value)}
                className="h-8 w-auto text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Status:</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-8 w-auto text-xs">
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
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
              <div className="px-6 pt-2">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="campos" className="gap-1">
                    <FileText className="h-4 w-4" />
                    Perguntas ({campos.length})
                  </TabsTrigger>
                  <TabsTrigger value="permissoes" className="gap-1">
                    <Users className="h-4 w-4" />
                    Permissões ({permissoes.length})
                  </TabsTrigger>
                </TabsList>
              </div>

              <ScrollArea className="flex-1 px-6 pb-4">
                <TabsContent value="campos" className="mt-4 space-y-3">
                  {campos.length === 0 ? (
                    <div className="py-8">
                      <AddQuestionButton
                        onAdd={handleAddQuestion}
                        currentCount={campos.length}
                        variant="full"
                      />
                    </div>
                  ) : (
                    <>
                      {campos.map((campo, index) => (
                        <QuestionCard
                          key={`${campo.id || index}-${index}`}
                          question={campo}
                          index={index}
                          isSelected={selectedIndex === index}
                          onSelect={() => setSelectedIndex(selectedIndex === index ? null : index)}
                          onChange={(updated) => handleUpdateQuestion(index, updated)}
                          onDelete={() => handleDeleteQuestion(index)}
                          onDuplicate={() => handleDuplicateQuestion(index)}
                        />
                      ))}
                      <AddQuestionButton
                        onAdd={handleAddQuestion}
                        currentCount={campos.length}
                        variant="compact"
                      />
                    </>
                  )}
                </TabsContent>

                <TabsContent value="permissoes" className="mt-4 space-y-4">
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
                              <SelectItem value="todos"><div className="flex items-center gap-2"><Globe className="h-4 w-4" />Todos</div></SelectItem>
                              <SelectItem value="usuario"><div className="flex items-center gap-2"><Users className="h-4 w-4" />Usuário específico</div></SelectItem>
                              <SelectItem value="cargo"><div className="flex items-center gap-2"><Briefcase className="h-4 w-4" />Por Cargo</div></SelectItem>
                              <SelectItem value="setor"><div className="flex items-center gap-2"><Building2 className="h-4 w-4" />Por Setor</div></SelectItem>
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
                                  <SelectItem key={p.user_id} value={p.user_id}>{p.full_name}</SelectItem>
                                ))}
                                {tipoPermissao === "cargo" && cargos.map(c => (
                                  <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>
                                ))}
                                {tipoPermissao === "setor" && setores.map(s => (
                                  <SelectItem key={s.id} value={s.nome}>{s.nome}</SelectItem>
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
                        <Badge key={index} variant="secondary" className="flex items-center gap-1 py-1.5 px-3">
                          {perm.tipo_permissao === "todos" && <Globe className="h-3 w-3" />}
                          {perm.tipo_permissao === "usuario" && <Users className="h-3 w-3" />}
                          {perm.tipo_permissao === "cargo" && <Briefcase className="h-3 w-3" />}
                          {perm.tipo_permissao === "setor" && <Building2 className="h-3 w-3" />}
                          {getPermissaoLabel(perm)}
                          <button onClick={() => removerPermissao(index)} className="ml-1 hover:text-destructive">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </ScrollArea>
            </Tabs>

            <div className="flex justify-end gap-2 p-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={isSaving}>
                {isSaving ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</>
                ) : (
                  <><Save className="h-4 w-4 mr-2" />Salvar</>
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
