import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Pencil, Trash2, Save, ChevronLeft, Settings2,
  ClipboardList, FileText, ToggleLeft, List, AlignLeft, Hash
} from "lucide-react";
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

// Tipo de pergunta: controla como as opções são geradas
type TipoPergunta = "multipla_escolha" | "sim_nao" | "escala" | "texto_livre";

const TIPO_PERGUNTA_INFO: Record<TipoPergunta, { label: string; icon: React.ReactNode; desc: string }> = {
  multipla_escolha: {
    label: "Múltipla Escolha",
    icon: <List className="h-4 w-4" />,
    desc: "Selecionar uma entre várias opções",
  },
  sim_nao: {
    label: "Sim / Não",
    icon: <ToggleLeft className="h-4 w-4" />,
    desc: "Resposta binária com opções padrão",
  },
  escala: {
    label: "Escala Numérica",
    icon: <Hash className="h-4 w-4" />,
    desc: "Escala de 0 a 9 para avaliações qualitativas",
  },
  texto_livre: {
    label: "Texto Livre",
    icon: <AlignLeft className="h-4 w-4" />,
    desc: "Campo aberto para o auditor escrever a resposta",
  },
};

const PRESET_OPCOES: Record<TipoPergunta, string[]> = {
  multipla_escolha: ["conforme", "nao_conforme", "nao_aplica"],
  sim_nao: ["sim", "nao", "nao_aplica"],
  escala: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "nao_aplica"],
  texto_livre: ["__texto_livre__"],
};

const OPCOES_LABELS: Record<string, string> = {
  conforme: "Conforme",
  nao_conforme: "Não Conforme",
  nao_aplica: "Não se aplica",
  sim: "Sim",
  nao: "Não",
  sim_completo: "Sim, completo",
  parcial: "Parcialmente",
  __texto_livre__: "Campo de texto aberto",
};

const getOpcaoLabel = (opt: string) => OPCOES_LABELS[opt] || opt.replace(/_/g, " ");

const detectTipoPergunta = (opcoes: string[]): TipoPergunta => {
  if (opcoes.includes("__texto_livre__")) return "texto_livre";
  if (opcoes.some(o => o === "0" || o === "9")) return "escala";
  if (opcoes.includes("sim") && !opcoes.some(o => o.startsWith("conforme"))) return "sim_nao";
  return "multipla_escolha";
};

export const EditorFormulariosAuditoria = () => {
  const { toast } = useToast();
  const [formularios, setFormularios] = useState<FormularioConfig[]>([]);
  const [secoes, setSecoes] = useState<SecaoConfig[]>([]);
  const [perguntas, setPerguntas] = useState<PerguntaConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFormulario, setSelectedFormulario] = useState<FormularioConfig | null>(null);

  // Dialogs
  const [editPerguntaDialog, setEditPerguntaDialog] = useState(false);
  const [editSecaoDialog, setEditSecaoDialog] = useState(false);
  const [editFormularioDialog, setEditFormularioDialog] = useState(false);
  const [editingPergunta, setEditingPergunta] = useState<PerguntaConfig | null>(null);
  const [editingSecao, setEditingSecao] = useState<SecaoConfig | null>(null);
  const [isCreatingFormulario, setIsCreatingFormulario] = useState(false);

  // Pergunta form
  const [perguntaLabel, setPerguntaLabel] = useState("");
  const [tipoPergunta, setTipoPergunta] = useState<TipoPergunta>("multipla_escolha");
  const [customOpcoes, setCustomOpcoes] = useState<string[]>(["conforme", "nao_conforme", "nao_aplica"]);
  const [novaOpcao, setNovaOpcao] = useState("");
  const [tempSecaoId, setTempSecaoId] = useState("");
  const [tempOrdem, setTempOrdem] = useState(1);

  // Seção form
  const [secaoNome, setSecaoNome] = useState("");

  // Formulário form
  const [formularioForm, setFormularioForm] = useState({ nome: "", setores: "", destino: "seg_paciente" });

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

  // ---- Helpers tipo pergunta ----
  const handleChangeTipo = (tipo: TipoPergunta) => {
    setTipoPergunta(tipo);
    if (tipo !== "multipla_escolha") {
      setCustomOpcoes(PRESET_OPCOES[tipo]);
    }
  };

  const addNovaOpcao = () => {
    const val = novaOpcao.trim();
    if (!val) return;
    if (!customOpcoes.includes(val)) {
      setCustomOpcoes(prev => [...prev, val]);
    }
    setNovaOpcao("");
  };

  const removeOpcao = (opt: string) => {
    setCustomOpcoes(prev => prev.filter(o => o !== opt));
  };

  // ---- Pergunta CRUD ----
  const openAddPergunta = (secaoId: string) => {
    const secaoPerguntas = perguntas.filter(p => p.secao_id === secaoId);
    const maxOrdem = secaoPerguntas.length > 0 ? Math.max(...secaoPerguntas.map(p => p.ordem)) : 0;
    setEditingPergunta(null);
    setPerguntaLabel("");
    setTipoPergunta("multipla_escolha");
    setCustomOpcoes(PRESET_OPCOES["multipla_escolha"]);
    setNovaOpcao("");
    setTempSecaoId(secaoId);
    setTempOrdem(maxOrdem + 1);
    setEditPerguntaDialog(true);
  };

  const openEditPergunta = (pergunta: PerguntaConfig) => {
    const tipo = detectTipoPergunta(pergunta.opcoes);
    setEditingPergunta(pergunta);
    setPerguntaLabel(pergunta.label);
    setTipoPergunta(tipo);
    setCustomOpcoes([...pergunta.opcoes]);
    setNovaOpcao("");
    setTempSecaoId(pergunta.secao_id);
    setTempOrdem(pergunta.ordem);
    setEditPerguntaDialog(true);
  };

  const savePergunta = async () => {
    if (!perguntaLabel.trim()) {
      toast({ title: "Campo obrigatório", description: "Digite o texto da pergunta.", variant: "destructive" });
      return;
    }

    const opcoesFinal = tipoPergunta === "texto_livre"
      ? ["__texto_livre__"]
      : customOpcoes;

    if (tipoPergunta !== "texto_livre" && opcoesFinal.length < 2) {
      toast({ title: "Atenção", description: "Adicione pelo menos 2 opções de resposta.", variant: "destructive" });
      return;
    }

    const codigo = `item_${Date.now()}`;

    if (editingPergunta) {
      const { error } = await supabase
        .from("auditoria_perguntas_config")
        .update({ label: perguntaLabel, opcoes: opcoesFinal })
        .eq("id", editingPergunta.id);
      if (error) { toast({ title: "Erro", description: "Falha ao atualizar pergunta", variant: "destructive" }); return; }
      toast({ title: "Pergunta atualizada!" });
    } else {
      const { error } = await supabase
        .from("auditoria_perguntas_config")
        .insert({ secao_id: tempSecaoId, codigo, label: perguntaLabel, opcoes: opcoesFinal, ordem: tempOrdem });
      if (error) { toast({ title: "Erro", description: "Falha ao salvar pergunta", variant: "destructive" }); return; }
      toast({ title: "Pergunta adicionada!" });
    }
    setEditPerguntaDialog(false);
    loadAll();
  };

  const deletePergunta = async (id: string) => {
    if (!confirm("Excluir esta pergunta?")) return;
    await supabase.from("auditoria_perguntas_config").delete().eq("id", id);
    toast({ title: "Pergunta excluída" });
    loadAll();
  };

  // ---- Seção CRUD ----
  const openAddSecao = () => {
    setEditingSecao(null);
    setSecaoNome("");
    setEditSecaoDialog(true);
  };

  const openEditSecao = (secao: SecaoConfig) => {
    setEditingSecao(secao);
    setSecaoNome(secao.nome);
    setEditSecaoDialog(true);
  };

  const saveSecao = async () => {
    if (!secaoNome.trim()) {
      toast({ title: "Campo obrigatório", description: "Digite o nome da seção.", variant: "destructive" });
      return;
    }
    if (editingSecao) {
      await supabase.from("auditoria_secoes_config").update({ nome: secaoNome }).eq("id", editingSecao.id);
      toast({ title: "Seção renomeada!" });
    } else {
      const formSecoes = secoes.filter(s => s.formulario_id === selectedFormulario!.id);
      const maxOrdem = formSecoes.length > 0 ? Math.max(...formSecoes.map(s => s.ordem)) : 0;
      await supabase.from("auditoria_secoes_config").insert({ formulario_id: selectedFormulario!.id, nome: secaoNome, ordem: maxOrdem + 1 });
      toast({ title: "Seção criada!" });
    }
    setEditSecaoDialog(false);
    loadAll();
  };

  const deleteSecao = async (id: string) => {
    if (!confirm("Excluir esta seção e todas as suas perguntas?")) return;
    await supabase.from("auditoria_secoes_config").delete().eq("id", id);
    toast({ title: "Seção excluída" });
    loadAll();
  };

  // ---- Formulário CRUD ----
  const saveFormulario = async () => {
    if (!formularioForm.nome.trim()) {
      toast({ title: "Campo obrigatório", description: "Digite o nome do formulário.", variant: "destructive" });
      return;
    }
    const setoresArr = formularioForm.setores.split(",").map(s => s.trim()).filter(Boolean);

    if (isCreatingFormulario) {
      const maxOrdem = formularios.length > 0 ? Math.max(...formularios.map(f => f.ordem ?? 0)) : 0;
      await supabase.from("auditoria_formularios_config").insert({
        nome: formularioForm.nome,
        tipo: `custom_${Date.now()}`,
        icone: "clipboard-check",
        setores: setoresArr.length > 0 ? setoresArr : ["Todos"],
        ordem: maxOrdem + 1,
        ativo: true,
      });
      toast({ title: "Formulário criado!" });
    } else if (selectedFormulario) {
      await supabase.from("auditoria_formularios_config")
        .update({ nome: formularioForm.nome, setores: setoresArr })
        .eq("id", selectedFormulario.id);
      toast({ title: "Formulário atualizado!" });
    }
    setEditFormularioDialog(false);
    loadAll();
  };

  if (isLoading) return <LoadingState message="Carregando formulários..." />;

  // ───────────────── LIST VIEW ─────────────────
  if (!selectedFormulario) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg">Formulários de Auditoria</h3>
            <p className="text-sm text-muted-foreground mt-0.5">Clique em um formulário para editar suas seções e perguntas</p>
          </div>
          <Button onClick={() => { setIsCreatingFormulario(true); setFormularioForm({ nome: "", setores: "", destino: "seg_paciente" }); setEditFormularioDialog(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Novo Formulário
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {formularios.filter(f => f.ativo).map(f => {
            const fSecoes = secoes.filter(s => s.formulario_id === f.id);
            const fPerguntas = fSecoes.flatMap(s => perguntas.filter(p => p.secao_id === s.id));
            return (
              <Card key={f.id} className="cursor-pointer hover:border-primary hover:shadow-sm transition-all group" onClick={() => setSelectedFormulario(f)}>
                <CardContent className="flex items-center gap-4 py-5">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <ClipboardList className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{f.nome}</h4>
                    <p className="text-sm text-muted-foreground">
                      {fSecoes.length} {fSecoes.length === 1 ? "seção" : "seções"} · {fPerguntas.length} {fPerguntas.length === 1 ? "pergunta" : "perguntas"}
                    </p>
                  </div>
                  <Settings2 className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </CardContent>
              </Card>
            );
          })}
          {formularios.filter(f => f.ativo).length === 0 && (
            <Card className="col-span-2">
              <CardContent className="py-12 text-center text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>Nenhum formulário cadastrado.</p>
                <p className="text-sm">Clique em "Novo Formulário" para começar.</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Dialog novo formulário */}
        <Dialog open={editFormularioDialog} onOpenChange={setEditFormularioDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Formulário</DialogTitle>
              <DialogDescription>Configure o nome e onde este formulário estará disponível</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nome do Formulário *</Label>
                <Input value={formularioForm.nome} onChange={e => setFormularioForm(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: Checklist de Higienização" />
              </div>
              <div className="space-y-1.5">
                <Label>Destino</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={formularioForm.destino}
                  onChange={e => setFormularioForm(p => ({ ...p, destino: e.target.value }))}
                >
                  <option value="seg_paciente">Auditorias de Segurança do Paciente</option>
                  <option value="auditoria">Auditorias da Qualidade</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Setores <span className="text-muted-foreground text-xs">(separados por vírgula, ou deixe vazio para todos)</span></Label>
                <Input value={formularioForm.setores} onChange={e => setFormularioForm(p => ({ ...p, setores: e.target.value }))} placeholder="Internação, Urgência, Laboratório" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditFormularioDialog(false)}>Cancelar</Button>
              <Button onClick={saveFormulario}><Save className="h-4 w-4 mr-1" /> Criar Formulário</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ───────────────── DETAIL VIEW ─────────────────
  const formSecoes = secoes.filter(s => s.formulario_id === selectedFormulario.id).sort((a, b) => a.ordem - b.ordem);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => setSelectedFormulario(null)}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
        <div className="flex-1">
          <h3 className="font-semibold text-lg">{selectedFormulario.nome}</h3>
          <p className="text-xs text-muted-foreground">{formSecoes.length} seções · {formSecoes.flatMap(s => perguntas.filter(p => p.secao_id === s.id)).length} perguntas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { setIsCreatingFormulario(false); setFormularioForm({ nome: selectedFormulario.nome, setores: selectedFormulario.setores.join(", "), destino: selectedFormulario.tipo }); setEditFormularioDialog(true); }}>
            <Pencil className="h-4 w-4 mr-1" /> Editar Nome
          </Button>
          <Button size="sm" onClick={openAddSecao}>
            <Plus className="h-4 w-4 mr-1" /> Nova Seção
          </Button>
        </div>
      </div>

      {/* Seções */}
      {formSecoes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Nenhuma seção ainda.</p>
            <Button className="mt-4" onClick={openAddSecao}><Plus className="h-4 w-4 mr-1" /> Criar primeira seção</Button>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" defaultValue={formSecoes.map(s => s.id)} className="space-y-3">
          {formSecoes.map(secao => {
            const secaoPerguntas = perguntas.filter(p => p.secao_id === secao.id).sort((a, b) => a.ordem - b.ordem);
            return (
              <AccordionItem key={secao.id} value={secao.id} className="border rounded-xl overflow-hidden">
                <AccordionTrigger className="px-5 py-4 hover:no-underline bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3 flex-1 text-left">
                    <span className="font-semibold">{secao.nome}</span>
                    <Badge variant="secondary">{secaoPerguntas.length} pergunta{secaoPerguntas.length !== 1 ? "s" : ""}</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-5 py-4 space-y-4">
                  {/* Ações da seção */}
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEditSecao(secao)}>
                      <Pencil className="h-3 w-3 mr-1" /> Renomear
                    </Button>
                    <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => deleteSecao(secao.id)}>
                      <Trash2 className="h-3 w-3 mr-1" /> Excluir Seção
                    </Button>
                  </div>

                  {/* Perguntas */}
                  <div className="space-y-2">
                    {secaoPerguntas.map((p, idx) => {
                      const tipo = detectTipoPergunta(p.opcoes);
                      const info = TIPO_PERGUNTA_INFO[tipo];
                      return (
                        <div key={p.id} className="flex items-start gap-3 p-4 bg-background border rounded-lg group hover:border-primary/30 transition-colors">
                          <span className="text-sm font-bold text-muted-foreground mt-0.5 w-6 shrink-0">{idx + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium leading-relaxed">{p.label}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className="text-xs flex items-center gap-1">
                                {info.icon}
                                {info.label}
                              </Badge>
                              {tipo !== "texto_livre" && p.opcoes.slice(0, 4).map(opt => (
                                <span key={opt} className="text-xs text-muted-foreground border rounded px-1.5 py-0.5 bg-muted/40">
                                  {getOpcaoLabel(opt)}
                                </span>
                              ))}
                              {tipo !== "texto_livre" && p.opcoes.length > 4 && (
                                <span className="text-xs text-muted-foreground">+{p.opcoes.length - 4}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditPergunta(p)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deletePergunta(p.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <Button variant="outline" size="sm" className="w-full border-dashed" onClick={() => openAddPergunta(secao.id)}>
                    <Plus className="h-4 w-4 mr-1" /> Adicionar Pergunta
                  </Button>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      {/* ───── Dialog: Pergunta ───── */}
      <Dialog open={editPerguntaDialog} onOpenChange={setEditPerguntaDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingPergunta ? "Editar Pergunta" : "Nova Pergunta"}</DialogTitle>
            <DialogDescription>Defina o texto e o tipo de resposta esperada</DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            {/* Texto */}
            <div className="space-y-1.5">
              <Label>Texto da Pergunta *</Label>
              <Textarea
                value={perguntaLabel}
                onChange={e => setPerguntaLabel(e.target.value)}
                placeholder="Ex: O paciente está identificado com pulseira e leito?"
                rows={2}
                className="resize-none"
              />
            </div>

            {/* Tipo de pergunta */}
            <div className="space-y-2">
              <Label>Tipo de Resposta</Label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(TIPO_PERGUNTA_INFO) as [TipoPergunta, typeof TIPO_PERGUNTA_INFO[TipoPergunta]][]).map(([key, info]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleChangeTipo(key)}
                    className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
                      tipoPergunta === key
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-primary/40 hover:bg-muted/30"
                    }`}
                  >
                    <span className={`mt-0.5 ${tipoPergunta === key ? "text-primary" : "text-muted-foreground"}`}>{info.icon}</span>
                    <div>
                      <p className="text-sm font-medium">{info.label}</p>
                      <p className="text-xs text-muted-foreground">{info.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Opções (apenas se não for texto livre) */}
            {tipoPergunta !== "texto_livre" && tipoPergunta === "multipla_escolha" && (
              <div className="space-y-2">
                <Label>Opções de Resposta</Label>
                <div className="flex flex-wrap gap-1.5 min-h-[40px] p-2.5 border rounded-lg bg-muted/20">
                  {customOpcoes.map(opt => (
                    <Badge key={opt} variant="secondary" className="gap-1 pr-1 cursor-pointer hover:bg-destructive/10" onClick={() => removeOpcao(opt)}>
                      {getOpcaoLabel(opt)}
                      <span className="text-destructive font-bold">×</span>
                    </Badge>
                  ))}
                  {customOpcoes.length === 0 && <span className="text-xs text-muted-foreground">Nenhuma opção — adicione abaixo</span>}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={novaOpcao}
                    onChange={e => setNovaOpcao(e.target.value)}
                    placeholder="Digitar nova opção e pressionar Enter..."
                    className="text-sm"
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addNovaOpcao(); } }}
                  />
                  <Button variant="outline" size="sm" onClick={addNovaOpcao} disabled={!novaOpcao.trim()}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {/* Atalhos comuns */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    { label: "+ Conforme / Não Conforme / N/A", v: ["conforme", "nao_conforme", "nao_aplica"] },
                    { label: "+ Sim / Não / N/A", v: ["sim", "nao", "nao_aplica"] },
                    { label: "+ Sim / Não", v: ["sim", "nao"] },
                  ].map(p => (
                    <Button key={p.label} variant="ghost" size="sm" className="text-xs h-7 text-primary" onClick={() => setCustomOpcoes(p.v)}>
                      {p.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {tipoPergunta === "sim_nao" && (
              <div className="p-3 rounded-lg border bg-muted/20 text-sm text-muted-foreground">
                As opções <strong>Sim, Não e Não se aplica</strong> serão adicionadas automaticamente.
              </div>
            )}
            {tipoPergunta === "escala" && (
              <div className="p-3 rounded-lg border bg-muted/20 text-sm text-muted-foreground">
                Escala <strong>0 a 9 + Não se aplica</strong> será usada para avaliação qualitativa.
              </div>
            )}
            {tipoPergunta === "texto_livre" && (
              <div className="p-3 rounded-lg border bg-primary/5 text-sm text-muted-foreground">
                O auditor poderá <strong>escrever livremente</strong> a resposta durante a auditoria.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPerguntaDialog(false)}>Cancelar</Button>
            <Button onClick={savePergunta}>
              <Save className="h-4 w-4 mr-1" /> Salvar Pergunta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ───── Dialog: Seção ───── */}
      <Dialog open={editSecaoDialog} onOpenChange={setEditSecaoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSecao ? "Renomear Seção" : "Nova Seção"}</DialogTitle>
            <DialogDescription>As seções agrupam perguntas relacionadas no formulário</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Nome da Seção *</Label>
            <Input
              value={secaoNome}
              onChange={e => setSecaoNome(e.target.value)}
              placeholder="Ex: Identificação do Paciente"
              onKeyDown={e => e.key === "Enter" && saveSecao()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSecaoDialog(false)}>Cancelar</Button>
            <Button onClick={saveSecao}><Save className="h-4 w-4 mr-1" /> Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ───── Dialog: Formulário ───── */}
      <Dialog open={editFormularioDialog} onOpenChange={setEditFormularioDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isCreatingFormulario ? "Novo Formulário" : "Editar Formulário"}</DialogTitle>
            <DialogDescription>Altere as configurações básicas do formulário</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome do Formulário *</Label>
              <Input value={formularioForm.nome} onChange={e => setFormularioForm(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: Checklist de Higienização" />
            </div>
            {isCreatingFormulario && (
              <div className="space-y-1.5">
                <Label>Destino</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={formularioForm.destino}
                  onChange={e => setFormularioForm(p => ({ ...p, destino: e.target.value }))}
                >
                  <option value="seg_paciente">Auditorias de Segurança do Paciente</option>
                  <option value="auditoria">Auditorias da Qualidade</option>
                </select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Setores <span className="text-muted-foreground text-xs">(separados por vírgula)</span></Label>
              <Input value={formularioForm.setores} onChange={e => setFormularioForm(p => ({ ...p, setores: e.target.value }))} placeholder="Internação, Urgência, Laboratório" />
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
