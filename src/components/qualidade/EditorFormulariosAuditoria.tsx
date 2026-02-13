import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, GripVertical, Save, ChevronLeft, Settings2 } from "lucide-react";
import { LoadingState } from "@/components/ui/loading-state";

interface FormularioConfig {
  id: string;
  tipo: string;
  nome: string;
  icone: string;
  ativo: boolean;
  ordem: number;
  setores: string[];
}

interface SecaoConfig {
  id: string;
  formulario_id: string;
  nome: string;
  ordem: number;
}

interface PerguntaConfig {
  id: string;
  secao_id: string;
  codigo: string;
  label: string;
  opcoes: string[];
  ativo: boolean;
  ordem: number;
}

const OPCOES_LABELS: Record<string, string> = {
  conforme: "Conforme",
  nao_conforme: "Não Conforme",
  nao_aplica: "Não se aplica",
  sim: "Sim",
  nao: "Não",
  sim_completo: "Sim, completo",
  parcial: "Parcialmente",
  parcial_sem_manchester: "Parcial (sem Manchester)",
  parcial_sem_sinais: "Parcial (sem sinais vitais)",
  sim_aberto: "Sim, foi aberto corretamente",
  sim_nao_aberto: "Sim, porém não foi aberto",
  nao_abriu_indevido: "Não, porém abriu protocolo",
  nao_aberto: "Não, não foi aberto",
};

const OPCOES_PRESET = [
  { label: "Conforme / Não Conforme / N/A", value: ["conforme", "nao_conforme", "nao_aplica"] },
  { label: "Conforme / Não Conforme", value: ["conforme", "nao_conforme"] },
  { label: "Sim / Não / N/A", value: ["sim", "nao", "nao_aplica"] },
  { label: "Sim / Não", value: ["sim", "nao"] },
  { label: "Escala 0-9 + N/A", value: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "nao_aplica"] },
];

export const EditorFormulariosAuditoria = () => {
  const { toast } = useToast();
  const [formularios, setFormularios] = useState<FormularioConfig[]>([]);
  const [secoes, setSecoes] = useState<SecaoConfig[]>([]);
  const [perguntas, setPerguntas] = useState<PerguntaConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFormulario, setSelectedFormulario] = useState<FormularioConfig | null>(null);

  // Dialog states
  const [editPerguntaDialog, setEditPerguntaDialog] = useState(false);
  const [editSecaoDialog, setEditSecaoDialog] = useState(false);
  const [editFormularioDialog, setEditFormularioDialog] = useState(false);
  const [editingPergunta, setEditingPergunta] = useState<PerguntaConfig | null>(null);
  const [editingSecao, setEditingSecao] = useState<SecaoConfig | null>(null);

  // Form states
  const [perguntaForm, setPerguntaForm] = useState({ codigo: "", label: "", opcoes: ["conforme", "nao_conforme", "nao_aplica"] as string[] });
  const [secaoForm, setSecaoForm] = useState({ nome: "" });
  const [formularioForm, setFormularioForm] = useState({ nome: "", setores: "", destino: "seg_paciente" as string });
  const [isCreatingFormulario, setIsCreatingFormulario] = useState(false);
  const [customOpcao, setCustomOpcao] = useState("");

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setIsLoading(true);
    const [fRes, sRes, pRes] = await Promise.all([
      supabase.from("auditoria_formularios_config").select("*").order("ordem"),
      supabase.from("auditoria_secoes_config").select("*").order("ordem"),
      supabase.from("auditoria_perguntas_config").select("*").order("ordem"),
    ]);
    if (fRes.data) setFormularios(fRes.data as FormularioConfig[]);
    if (sRes.data) setSecoes(sRes.data as SecaoConfig[]);
    if (pRes.data) setPerguntas(pRes.data as PerguntaConfig[]);
    setIsLoading(false);
  };

  // ---- Pergunta CRUD ----
  const openAddPergunta = (secaoId: string) => {
    const secaoPerguntas = perguntas.filter(p => p.secao_id === secaoId);
    const maxOrdem = secaoPerguntas.length > 0 ? Math.max(...secaoPerguntas.map(p => p.ordem)) : 0;
    setEditingPergunta(null);
    setPerguntaForm({ codigo: `item_${Date.now()}`, label: "", opcoes: ["conforme", "nao_conforme", "nao_aplica"] });
    setEditPerguntaDialog(true);
    // Store secaoId in a temp
    (window as any).__tempSecaoId = secaoId;
    (window as any).__tempOrdem = maxOrdem + 1;
  };

  const openEditPergunta = (pergunta: PerguntaConfig) => {
    setEditingPergunta(pergunta);
    setPerguntaForm({ codigo: pergunta.codigo, label: pergunta.label, opcoes: [...pergunta.opcoes] });
    setEditPerguntaDialog(true);
    (window as any).__tempSecaoId = pergunta.secao_id;
    (window as any).__tempOrdem = pergunta.ordem;
  };

  const savePergunta = async () => {
    if (!perguntaForm.label.trim()) {
      toast({ title: "Erro", description: "A pergunta não pode estar vazia", variant: "destructive" });
      return;
    }
    if (perguntaForm.opcoes.length < 2) {
      toast({ title: "Erro", description: "Adicione pelo menos 2 opções de resposta", variant: "destructive" });
      return;
    }

    const secaoId = (window as any).__tempSecaoId;
    const ordem = (window as any).__tempOrdem;

    if (editingPergunta) {
      const { error } = await supabase
        .from("auditoria_perguntas_config")
        .update({ label: perguntaForm.label, opcoes: perguntaForm.opcoes, codigo: perguntaForm.codigo })
        .eq("id", editingPergunta.id);
      if (error) { toast({ title: "Erro", description: "Falha ao atualizar pergunta", variant: "destructive" }); return; }
      toast({ title: "Sucesso", description: "Pergunta atualizada" });
    } else {
      const { error } = await supabase
        .from("auditoria_perguntas_config")
        .insert({ secao_id: secaoId, codigo: perguntaForm.codigo, label: perguntaForm.label, opcoes: perguntaForm.opcoes, ordem });
      if (error) { toast({ title: "Erro", description: "Falha ao adicionar pergunta", variant: "destructive" }); return; }
      toast({ title: "Sucesso", description: "Pergunta adicionada" });
    }
    setEditPerguntaDialog(false);
    loadAll();
  };

  const deletePergunta = async (id: string) => {
    const { error } = await supabase.from("auditoria_perguntas_config").delete().eq("id", id);
    if (error) { toast({ title: "Erro", description: "Falha ao excluir", variant: "destructive" }); return; }
    toast({ title: "Pergunta excluída" });
    loadAll();
  };

  // ---- Seção CRUD ----
  const openAddSecao = () => {
    if (!selectedFormulario) return;
    setEditingSecao(null);
    setSecaoForm({ nome: "" });
    setEditSecaoDialog(true);
  };

  const openEditSecao = (secao: SecaoConfig) => {
    setEditingSecao(secao);
    setSecaoForm({ nome: secao.nome });
    setEditSecaoDialog(true);
  };

  const saveSecao = async () => {
    if (!secaoForm.nome.trim()) {
      toast({ title: "Erro", description: "Nome da seção é obrigatório", variant: "destructive" });
      return;
    }

    if (editingSecao) {
      const { error } = await supabase
        .from("auditoria_secoes_config")
        .update({ nome: secaoForm.nome })
        .eq("id", editingSecao.id);
      if (error) { toast({ title: "Erro", description: "Falha ao atualizar seção", variant: "destructive" }); return; }
      toast({ title: "Sucesso", description: "Seção atualizada" });
    } else {
      const formSecoes = secoes.filter(s => s.formulario_id === selectedFormulario!.id);
      const maxOrdem = formSecoes.length > 0 ? Math.max(...formSecoes.map(s => s.ordem)) : 0;
      const { error } = await supabase
        .from("auditoria_secoes_config")
        .insert({ formulario_id: selectedFormulario!.id, nome: secaoForm.nome, ordem: maxOrdem + 1 });
      if (error) { toast({ title: "Erro", description: "Falha ao criar seção", variant: "destructive" }); return; }
      toast({ title: "Sucesso", description: "Seção criada" });
    }
    setEditSecaoDialog(false);
    loadAll();
  };

  const deleteSecao = async (id: string) => {
    const { error } = await supabase.from("auditoria_secoes_config").delete().eq("id", id);
    if (error) { toast({ title: "Erro", description: "Falha ao excluir seção", variant: "destructive" }); return; }
    toast({ title: "Seção excluída" });
    loadAll();
  };

  // ---- Formulário CRUD ----
  const openEditFormulario = () => {
    if (!selectedFormulario) return;
    setIsCreatingFormulario(false);
    setFormularioForm({ nome: selectedFormulario.nome, setores: selectedFormulario.setores.join(", "), destino: selectedFormulario.tipo });
    setEditFormularioDialog(true);
  };

  const openNewFormulario = () => {
    setIsCreatingFormulario(true);
    setFormularioForm({ nome: "", setores: "", destino: "seg_paciente" });
    setEditFormularioDialog(true);
  };

  const saveFormulario = async () => {
    if (!formularioForm.nome.trim()) {
      toast({ title: "Erro", description: "Nome do formulário é obrigatório", variant: "destructive" });
      return;
    }
    const setoresArr = formularioForm.setores.split(",").map(s => s.trim()).filter(Boolean);

    if (isCreatingFormulario) {
      const maxOrdem = formularios.length > 0 ? Math.max(...formularios.map(f => f.ordem ?? 0)) : 0;
      const tipo = `custom_${Date.now()}`;
      const { error } = await supabase
        .from("auditoria_formularios_config")
        .insert({
          nome: formularioForm.nome,
          tipo,
          icone: "clipboard-check",
          setores: setoresArr.length > 0 ? setoresArr : ["Todos"],
          ordem: maxOrdem + 1,
          ativo: true,
        });
      if (error) { toast({ title: "Erro", description: "Falha ao criar formulário", variant: "destructive" }); return; }
      toast({ title: "Sucesso", description: "Formulário criado com sucesso" });
    } else {
      if (!selectedFormulario) return;
      const { error } = await supabase
        .from("auditoria_formularios_config")
        .update({ nome: formularioForm.nome, setores: setoresArr })
        .eq("id", selectedFormulario.id);
      if (error) { toast({ title: "Erro", description: "Falha ao atualizar formulário", variant: "destructive" }); return; }
      toast({ title: "Sucesso", description: "Formulário atualizado" });
    }
    setEditFormularioDialog(false);
    loadAll();
  };

  // ---- Opções helpers ----
  const addOpcaoToForm = (opcao: string) => {
    if (!perguntaForm.opcoes.includes(opcao)) {
      setPerguntaForm(prev => ({ ...prev, opcoes: [...prev.opcoes, opcao] }));
    }
  };

  const removeOpcaoFromForm = (opcao: string) => {
    setPerguntaForm(prev => ({ ...prev, opcoes: prev.opcoes.filter(o => o !== opcao) }));
  };

  const applyPreset = (preset: string[]) => {
    setPerguntaForm(prev => ({ ...prev, opcoes: [...preset] }));
  };

  const addCustomOpcao = () => {
    const val = customOpcao.trim().toLowerCase().replace(/\s+/g, "_");
    if (val && !perguntaForm.opcoes.includes(val)) {
      setPerguntaForm(prev => ({ ...prev, opcoes: [...prev.opcoes, val] }));
      setCustomOpcao("");
    }
  };

  if (isLoading) return <LoadingState message="Carregando configurações..." />;

  // List view
  if (!selectedFormulario) {
    const formularioDialog = (
      <Dialog open={editFormularioDialog} onOpenChange={setEditFormularioDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Formulário</DialogTitle>
            <DialogDescription>Configure o nome, destino e os setores disponíveis</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome do Formulário *</Label>
              <Input
                value={formularioForm.nome}
                onChange={e => setFormularioForm(prev => ({ ...prev, nome: e.target.value }))}
                placeholder="Ex: Checklist de Higienização"
              />
            </div>
            <div>
              <Label>Destino (onde o formulário aparecerá)</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={formularioForm.destino}
                onChange={e => setFormularioForm(prev => ({ ...prev, destino: e.target.value }))}
              >
                <option value="seg_paciente">Auditorias de Segurança do Paciente</option>
                <option value="auditoria">Auditorias da Qualidade</option>
              </select>
            </div>
            <div>
              <Label>Setores (separados por vírgula)</Label>
              <Input
                value={formularioForm.setores}
                onChange={e => setFormularioForm(prev => ({ ...prev, setores: e.target.value }))}
                placeholder="Internação, Urgência, Laboratório"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditFormularioDialog(false)}>Cancelar</Button>
            <Button onClick={saveFormulario}><Save className="h-4 w-4 mr-1" /> Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );

    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Gerencie as perguntas, seções e opções de resposta de cada formulário de auditoria.
        </p>
      <div className="flex justify-end">
        <Button onClick={openNewFormulario}>
          <Plus className="h-4 w-4 mr-1" /> Novo Formulário
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {formularios.filter(f => f.ativo).map(f => {
            const fSecoes = secoes.filter(s => s.formulario_id === f.id);
            const fPerguntas = fSecoes.flatMap(s => perguntas.filter(p => p.secao_id === s.id));
            return (
              <Card
                key={f.id}
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => setSelectedFormulario(f)}
              >
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <h4 className="font-medium">{f.nome}</h4>
                    <p className="text-sm text-muted-foreground">
                      {fSecoes.length} seções · {fPerguntas.length} perguntas
                    </p>
                  </div>
                  <Settings2 className="h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Card>
            );
          })}
        </div>
        {formularioDialog}
      </div>
    );
  }

  // Detail view
  const formSecoes = secoes.filter(s => s.formulario_id === selectedFormulario.id).sort((a, b) => a.ordem - b.ordem);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => setSelectedFormulario(null)}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
        <h3 className="font-semibold text-lg flex-1">{selectedFormulario.nome}</h3>
        <Button variant="outline" size="sm" onClick={openEditFormulario}>
          <Pencil className="h-4 w-4 mr-1" /> Editar Formulário
        </Button>
        <Button size="sm" onClick={openAddSecao}>
          <Plus className="h-4 w-4 mr-1" /> Nova Seção
        </Button>
      </div>

      {formSecoes.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhuma seção cadastrada</CardContent></Card>
      ) : (
        <Accordion type="multiple" defaultValue={formSecoes.map(s => s.id)} className="space-y-3">
          {formSecoes.map(secao => {
            const secaoPerguntas = perguntas
              .filter(p => p.secao_id === secao.id)
              .sort((a, b) => a.ordem - b.ordem);

            return (
              <AccordionItem key={secao.id} value={secao.id} className="border rounded-lg">
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <div className="flex items-center gap-2 flex-1 text-left">
                    <span className="font-medium">{secao.nome}</span>
                    <Badge variant="secondary" className="ml-2">{secaoPerguntas.length} perguntas</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="flex gap-2 mb-3">
                    <Button variant="outline" size="sm" onClick={() => openEditSecao(secao)}>
                      <Pencil className="h-3 w-3 mr-1" /> Renomear
                    </Button>
                    <Button variant="outline" size="sm" className="text-destructive" onClick={() => {
                      if (confirm("Excluir esta seção e todas as perguntas?")) deleteSecao(secao.id);
                    }}>
                      <Trash2 className="h-3 w-3 mr-1" /> Excluir Seção
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {secaoPerguntas.map((p, idx) => (
                      <div key={p.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg group">
                        <span className="text-xs text-muted-foreground font-mono mt-1 w-6 shrink-0">{idx + 1}.</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm leading-relaxed">{p.label}</p>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {p.opcoes.map(opt => (
                              <Badge key={opt} variant="outline" className="text-xs">
                                {OPCOES_LABELS[opt] || opt}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditPergunta(p)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => {
                            if (confirm("Excluir esta pergunta?")) deletePergunta(p.id);
                          }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button variant="outline" size="sm" className="mt-3 w-full border-dashed" onClick={() => openAddPergunta(secao.id)}>
                    <Plus className="h-4 w-4 mr-1" /> Adicionar Pergunta
                  </Button>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      {/* Pergunta Dialog */}
      <Dialog open={editPerguntaDialog} onOpenChange={setEditPerguntaDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingPergunta ? "Editar Pergunta" : "Nova Pergunta"}</DialogTitle>
            <DialogDescription>Configure a pergunta e as opções de resposta</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Texto da Pergunta *</Label>
              <Input
                value={perguntaForm.label}
                onChange={e => setPerguntaForm(prev => ({ ...prev, label: e.target.value }))}
                placeholder="Digite a pergunta..."
              />
            </div>
            <div>
              <Label>Código (identificador interno)</Label>
              <Input
                value={perguntaForm.codigo}
                onChange={e => setPerguntaForm(prev => ({ ...prev, codigo: e.target.value.replace(/\s/g, "_").toLowerCase() }))}
                placeholder="ex: avaliacao_item_1"
                className="font-mono text-sm"
              />
            </div>
            <div>
              <Label className="mb-2 block">Opções de Resposta</Label>
              <div className="flex flex-wrap gap-2 mb-3">
                {OPCOES_PRESET.map(preset => (
                  <Button
                    key={preset.label}
                    variant="outline"
                    size="sm"
                    onClick={() => applyPreset(preset.value)}
                    className="text-xs"
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5 mb-3 min-h-[32px] p-2 border rounded-md bg-background">
                {perguntaForm.opcoes.map(opt => (
                  <Badge key={opt} variant="secondary" className="gap-1 cursor-pointer" onClick={() => removeOpcaoFromForm(opt)}>
                    {OPCOES_LABELS[opt] || opt}
                    <span className="text-destructive ml-1">×</span>
                  </Badge>
                ))}
                {perguntaForm.opcoes.length === 0 && (
                  <span className="text-xs text-muted-foreground">Nenhuma opção selecionada</span>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  value={customOpcao}
                  onChange={e => setCustomOpcao(e.target.value)}
                  placeholder="Adicionar opção personalizada..."
                  className="text-sm"
                  onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addCustomOpcao())}
                />
                <Button variant="outline" size="sm" onClick={addCustomOpcao} disabled={!customOpcao.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPerguntaDialog(false)}>Cancelar</Button>
            <Button onClick={savePergunta}>
              <Save className="h-4 w-4 mr-1" /> Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Seção Dialog */}
      <Dialog open={editSecaoDialog} onOpenChange={setEditSecaoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSecao ? "Editar Seção" : "Nova Seção"}</DialogTitle>
            <DialogDescription>Defina o nome da seção do formulário</DialogDescription>
          </DialogHeader>
          <div>
            <Label>Nome da Seção *</Label>
            <Input
              value={secaoForm.nome}
              onChange={e => setSecaoForm({ nome: e.target.value })}
              placeholder="Ex: Avaliação com Paciente"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSecaoDialog(false)}>Cancelar</Button>
            <Button onClick={saveSecao}><Save className="h-4 w-4 mr-1" /> Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Formulário Dialog */}
      <Dialog open={editFormularioDialog} onOpenChange={setEditFormularioDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isCreatingFormulario ? "Novo Formulário" : "Editar Formulário"}</DialogTitle>
            <DialogDescription>Configure o nome, destino e os setores disponíveis</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome do Formulário *</Label>
              <Input
                value={formularioForm.nome}
                onChange={e => setFormularioForm(prev => ({ ...prev, nome: e.target.value }))}
                placeholder="Ex: Checklist de Higienização"
              />
            </div>
            {isCreatingFormulario && (
              <div>
                <Label>Destino (onde o formulário aparecerá)</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={formularioForm.destino}
                  onChange={e => setFormularioForm(prev => ({ ...prev, destino: e.target.value }))}
                >
                  <option value="seg_paciente">Auditorias de Segurança do Paciente</option>
                  <option value="auditoria">Auditorias da Qualidade</option>
                </select>
              </div>
            )}
            <div>
              <Label>Setores (separados por vírgula)</Label>
              <Input
                value={formularioForm.setores}
                onChange={e => setFormularioForm(prev => ({ ...prev, setores: e.target.value }))}
                placeholder="Internação, Urgência, Laboratório"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditFormularioDialog(false)}>Cancelar</Button>
            <Button onClick={saveFormulario}><Save className="h-4 w-4 mr-1" /> Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EditorFormulariosAuditoria;
