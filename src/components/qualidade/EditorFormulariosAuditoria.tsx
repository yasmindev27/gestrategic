import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Pencil, Trash2, Save, ChevronLeft, Settings2,
  ClipboardList, FileText, ToggleLeft, AlignLeft, Hash,
  GripVertical, CircleDot
} from "lucide-react";
import { LoadingState } from "@/components/ui/loading-state";
import { cn } from "@/lib/utils";

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

type TipoPergunta = "multipla_escolha" | "sim_nao" | "escala" | "texto_livre";

const TIPO_PERGUNTA_INFO: Record<TipoPergunta, { label: string; icon: React.ReactNode; desc: string }> = {
  multipla_escolha: { label: "Múltipla Escolha", icon: <CircleDot className="h-4 w-4" />, desc: "Selecionar uma entre várias opções" },
  sim_nao: { label: "Sim / Não", icon: <ToggleLeft className="h-4 w-4" />, desc: "Resposta binária com opções padrão" },
  escala: { label: "Escala Numérica", icon: <Hash className="h-4 w-4" />, desc: "Escala de 0 a 9 para avaliações qualitativas" },
  texto_livre: { label: "Texto Livre", icon: <AlignLeft className="h-4 w-4" />, desc: "Campo aberto para o auditor escrever" },
};

const PRESET_OPCOES: Record<TipoPergunta, string[]> = {
  multipla_escolha: ["conforme", "nao_conforme", "nao_aplica"],
  sim_nao: ["sim", "nao", "nao_aplica"],
  escala: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "nao_aplica"],
  texto_livre: ["__texto_livre__"],
};

const OPCOES_LABELS: Record<string, string> = {
  conforme: "Conforme", nao_conforme: "Não Conforme", nao_aplica: "Não se aplica",
  sim: "Sim", nao: "Não", __texto_livre__: "Campo de texto aberto",
};

const getOpcaoLabel = (opt: string) => OPCOES_LABELS[opt] || opt.replace(/_/g, " ");

const detectTipoPergunta = (opcoes: string[]): TipoPergunta => {
  if (opcoes.includes("__texto_livre__")) return "texto_livre";
  if (opcoes.some(o => o === "0" || o === "9")) return "escala";
  if (opcoes.includes("sim") && !opcoes.some(o => o.startsWith("conforme"))) return "sim_nao";
  return "multipla_escolha";
};

// ──────── Inline Question Card ────────
const InlineQuestionCard = ({
  pergunta,
  index,
  isSelected,
  onSelect,
  onSave,
  onDelete,
}: {
  pergunta: PerguntaConfig;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onSave: (updated: { label: string; opcoes: string[] }) => void;
  onDelete: () => void;
}) => {
  const tipo = detectTipoPergunta(pergunta.opcoes);
  const info = TIPO_PERGUNTA_INFO[tipo];
  const [label, setLabel] = useState(pergunta.label);
  const [currentTipo, setCurrentTipo] = useState(tipo);
  const [opcoes, setOpcoes] = useState([...pergunta.opcoes]);
  const [novaOpcao, setNovaOpcao] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setLabel(pergunta.label);
    setCurrentTipo(detectTipoPergunta(pergunta.opcoes));
    setOpcoes([...pergunta.opcoes]);
    setDirty(false);
  }, [pergunta]);

  const handleChangeTipo = (t: TipoPergunta) => {
    setCurrentTipo(t);
    if (t !== "multipla_escolha") {
      setOpcoes(PRESET_OPCOES[t]);
    }
    setDirty(true);
  };

  const handleSave = () => {
    const finalOpcoes = currentTipo === "texto_livre" ? ["__texto_livre__"] : opcoes;
    onSave({ label, opcoes: finalOpcoes });
    setDirty(false);
  };

  return (
    <Card
      className={cn(
        "transition-all cursor-pointer group relative",
        isSelected ? "ring-2 ring-primary border-primary shadow-md" : "hover:shadow-sm hover:border-primary/30"
      )}
      onClick={onSelect}
    >
      {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l-xl" />}

      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="mt-2 cursor-grab opacity-30 group-hover:opacity-60">
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>
          <span className="text-sm font-bold text-muted-foreground mt-2 w-6 shrink-0">{index + 1}</span>

          <div className="flex-1 min-w-0">
            {isSelected ? (
              <>
                <Input
                  value={label}
                  onChange={(e) => { setLabel(e.target.value); setDirty(true); }}
                  placeholder="Texto da pergunta"
                  className="flex-1 text-base font-medium border-0 border-b-2 border-muted rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary bg-transparent mb-3"
                  onClick={e => e.stopPropagation()}
                />

                <div className="grid grid-cols-2 gap-2 mb-3">
                  {(Object.entries(TIPO_PERGUNTA_INFO) as [TipoPergunta, typeof TIPO_PERGUNTA_INFO[TipoPergunta]][]).map(([key, inf]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleChangeTipo(key); }}
                      className={cn(
                        "flex items-start gap-2 p-2.5 rounded-lg border text-left transition-all text-sm",
                        currentTipo === key ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/40"
                      )}
                    >
                      <span className={cn("mt-0.5", currentTipo === key ? "text-primary" : "text-muted-foreground")}>{inf.icon}</span>
                      <p className="font-medium text-xs">{inf.label}</p>
                    </button>
                  ))}
                </div>

                {currentTipo === "multipla_escolha" && (
                  <div className="space-y-2" onClick={e => e.stopPropagation()}>
                    <div className="flex flex-wrap gap-1.5 min-h-[36px] p-2 border rounded-lg bg-muted/20">
                      {opcoes.map(opt => (
                        <Badge key={opt} variant="secondary" className="gap-1 pr-1 cursor-pointer hover:bg-destructive/10" onClick={() => { setOpcoes(opcoes.filter(o => o !== opt)); setDirty(true); }}>
                          {getOpcaoLabel(opt)}
                          <span className="text-destructive font-bold">×</span>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={novaOpcao}
                        onChange={e => setNovaOpcao(e.target.value)}
                        placeholder="Nova opção..."
                        className="text-sm"
                        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); if (novaOpcao.trim()) { setOpcoes([...opcoes, novaOpcao.trim()]); setNovaOpcao(""); setDirty(true); } } }}
                      />
                      <Button variant="outline" size="sm" onClick={() => { if (novaOpcao.trim()) { setOpcoes([...opcoes, novaOpcao.trim()]); setNovaOpcao(""); setDirty(true); } }}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { label: "Conforme/Não Conforme", v: ["conforme", "nao_conforme", "nao_aplica"] },
                        { label: "Sim/Não/N/A", v: ["sim", "nao", "nao_aplica"] },
                      ].map(p => (
                        <Button key={p.label} variant="ghost" size="sm" className="text-xs h-7 text-primary" onClick={() => { setOpcoes(p.v); setDirty(true); }}>
                          + {p.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {currentTipo === "sim_nao" && (
                  <div className="p-3 rounded-lg border bg-muted/20 text-sm text-muted-foreground">
                    Opções: <strong>Sim, Não e Não se aplica</strong>
                  </div>
                )}
                {currentTipo === "escala" && (
                  <div className="p-3 rounded-lg border bg-muted/20 text-sm text-muted-foreground">
                    Escala <strong>0 a 9 + Não se aplica</strong>
                  </div>
                )}
                {currentTipo === "texto_livre" && (
                  <div className="p-3 rounded-lg border bg-primary/5 text-sm text-muted-foreground">
                    Campo de <strong>texto aberto</strong>
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t mt-3" onClick={e => e.stopPropagation()}>
                  <div className="flex gap-1">
                    {dirty && (
                      <Button size="sm" onClick={handleSave}>
                        <Save className="h-3.5 w-3.5 mr-1" /> Salvar
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={onDelete}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm font-medium leading-relaxed">{pergunta.label || <span className="text-muted-foreground italic">Sem título</span>}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-xs flex items-center gap-1">
                    {info.icon}
                    {info.label}
                  </Badge>
                  {tipo !== "texto_livre" && pergunta.opcoes.slice(0, 4).map(opt => (
                    <span key={opt} className="text-xs text-muted-foreground border rounded px-1.5 py-0.5 bg-muted/40">
                      {getOpcaoLabel(opt)}
                    </span>
                  ))}
                  {tipo !== "texto_livre" && pergunta.opcoes.length > 4 && (
                    <span className="text-xs text-muted-foreground">+{pergunta.opcoes.length - 4}</span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ──────── Main Component ────────
export const EditorFormulariosAuditoria = () => {
  const { toast } = useToast();
  const [formularios, setFormularios] = useState<FormularioConfig[]>([]);
  const [secoes, setSecoes] = useState<SecaoConfig[]>([]);
  const [perguntas, setPerguntas] = useState<PerguntaConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFormulario, setSelectedFormulario] = useState<FormularioConfig | null>(null);

  // Dialogs
  const [editSecaoDialog, setEditSecaoDialog] = useState(false);
  const [editingSecao, setEditingSecao] = useState<SecaoConfig | null>(null);

  // Inline editing
  const [selectedPerguntaId, setSelectedPerguntaId] = useState<string | null>(null);
  const [addingToSecaoId, setAddingToSecaoId] = useState<string | null>(null);

  // Seção form
  const [secaoNome, setSecaoNome] = useState("");

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
  const addPergunta = async (secaoId: string, tipo: TipoPergunta) => {
    const secaoPerguntas = perguntas.filter(p => p.secao_id === secaoId);
    const maxOrdem = secaoPerguntas.length > 0 ? Math.max(...secaoPerguntas.map(p => p.ordem)) : 0;
    const opcoes = PRESET_OPCOES[tipo];
    const codigo = `item_${Date.now()}`;

    const { data, error } = await supabase
      .from("auditoria_perguntas_config")
      .insert({ secao_id: secaoId, codigo, label: "", opcoes, ordem: maxOrdem + 1 })
      .select("id")
      .single();

    if (error) {
      toast({ title: "Erro", description: "Falha ao criar pergunta", variant: "destructive" });
      return;
    }

    await loadAll();
    if (data) setSelectedPerguntaId(data.id);
    setAddingToSecaoId(null);
  };

  const savePergunta = async (id: string, updates: { label: string; opcoes: string[] }) => {
    const { error } = await supabase
      .from("auditoria_perguntas_config")
      .update({ label: updates.label, opcoes: updates.opcoes })
      .eq("id", id);
    if (error) {
      toast({ title: "Erro", description: "Falha ao salvar", variant: "destructive" });
      return;
    }
    toast({ title: "Pergunta salva!" });
    loadAll();
  };

  const deletePergunta = async (id: string) => {
    if (!confirm("Excluir esta pergunta?")) return;
    await supabase.from("auditoria_perguntas_config").delete().eq("id", id);
    toast({ title: "Pergunta excluída" });
    setSelectedPerguntaId(null);
    loadAll();
  };

  // ---- Seção CRUD ----
  const openAddSecao = () => { setEditingSecao(null); setSecaoNome(""); setEditSecaoDialog(true); };
  const openEditSecao = (secao: SecaoConfig) => { setEditingSecao(secao); setSecaoNome(secao.nome); setEditSecaoDialog(true); };

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

  // ---- Formulário: criação rápida (1 click) ----
  const criarFormularioRapido = async () => {
    const maxOrdem = formularios.length > 0 ? Math.max(...formularios.map(f => f.ordem ?? 0)) : 0;
    const { data: formData, error: formError } = await supabase
      .from("auditoria_formularios_config")
      .insert({
        nome: "Novo Formulário", tipo: `custom_${Date.now()}`, icone: "clipboard-check",
        setores: ["Todos"], ordem: maxOrdem + 1, ativo: true,
      })
      .select("*")
      .single();

    if (formError || !formData) {
      toast({ title: "Erro", description: "Falha ao criar formulário", variant: "destructive" });
      return;
    }

    // Auto-create a default first section
    await supabase
      .from("auditoria_secoes_config")
      .insert({ formulario_id: formData.id, nome: "Seção 1", ordem: 1 });

    toast({ title: "Formulário criado!", description: "Edite o título e adicione suas perguntas." });
    await loadAll();
    setSelectedFormulario(formData as FormularioConfig);
  };

  const deleteFormulario = async () => {
    if (!selectedFormulario) return;
    if (!confirm("Excluir este formulário e todo seu conteúdo?")) return;
    await supabase.from("auditoria_formularios_config").delete().eq("id", selectedFormulario.id);
    toast({ title: "Formulário excluído" });
    setSelectedFormulario(null);
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
            <p className="text-sm text-muted-foreground mt-0.5">Clique em um formulário para editar</p>
          </div>
          <Button onClick={criarFormularioRapido}>
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
                <p className="text-sm mt-1">Clique em "Novo Formulário" para começar.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // ───────────────── DETAIL VIEW (Google Forms-like) ─────────────────
  const formSecoes = secoes.filter(s => s.formulario_id === selectedFormulario.id).sort((a, b) => a.ordem - b.ordem);

  return (
    <div className="space-y-5">
      {/* Header */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setSelectedFormulario(null)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
            <div className="flex-1" />
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={deleteFormulario}>
              <Trash2 className="h-4 w-4 mr-1" /> Excluir
            </Button>
            <Button size="sm" onClick={openAddSecao}>
              <Plus className="h-4 w-4 mr-1" /> Nova Seção
            </Button>
          </div>
          <Input
            value={selectedFormulario.nome}
            onChange={(e) => {
              setSelectedFormulario({ ...selectedFormulario, nome: e.target.value });
            }}
            onBlur={async () => {
              await supabase.from("auditoria_formularios_config").update({ nome: selectedFormulario.nome }).eq("id", selectedFormulario.id);
              loadAll();
            }}
            placeholder="Título do formulário"
            className="text-xl font-bold border-0 border-b-2 border-transparent focus-visible:border-primary rounded-none px-0 bg-transparent focus-visible:ring-0 h-auto py-1"
          />
          <p className="text-xs text-muted-foreground">{formSecoes.length} seções · {formSecoes.flatMap(s => perguntas.filter(p => p.secao_id === s.id)).length} perguntas</p>
        </CardContent>
      </Card>

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
                <AccordionContent className="px-5 py-4 space-y-3">
                  <div className="flex gap-2 mb-2">
                    <Button variant="outline" size="sm" onClick={() => openEditSecao(secao)}>
                      <Pencil className="h-3 w-3 mr-1" /> Renomear
                    </Button>
                    <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => deleteSecao(secao.id)}>
                      <Trash2 className="h-3 w-3 mr-1" /> Excluir Seção
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {secaoPerguntas.map((p, idx) => (
                      <InlineQuestionCard
                        key={p.id}
                        pergunta={p}
                        index={idx}
                        isSelected={selectedPerguntaId === p.id}
                        onSelect={() => setSelectedPerguntaId(selectedPerguntaId === p.id ? null : p.id)}
                        onSave={(updates) => savePergunta(p.id, updates)}
                        onDelete={() => deletePergunta(p.id)}
                      />
                    ))}
                  </div>

                  {/* Add question */}
                  {addingToSecaoId === secao.id ? (
                    <Card className="border-2 border-dashed border-primary/30 bg-primary/5">
                      <CardContent className="p-4 space-y-3">
                        <p className="text-sm font-medium">Escolha o tipo de pergunta:</p>
                        <div className="grid grid-cols-2 gap-2">
                          {(Object.entries(TIPO_PERGUNTA_INFO) as [TipoPergunta, typeof TIPO_PERGUNTA_INFO[TipoPergunta]][]).map(([key, inf]) => (
                            <button
                              key={key}
                              type="button"
                              onClick={() => addPergunta(secao.id, key)}
                              className="flex items-start gap-2 p-3 rounded-lg border bg-background text-left hover:border-primary hover:shadow-sm transition-all"
                            >
                              <span className="text-primary mt-0.5">{inf.icon}</span>
                              <div>
                                <p className="text-sm font-medium">{inf.label}</p>
                                <p className="text-xs text-muted-foreground">{inf.desc}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setAddingToSecaoId(null)}>Cancelar</Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-dashed"
                      onClick={() => setAddingToSecaoId(secao.id)}
                    >
                      <Plus className="h-4 w-4 mr-1" /> Adicionar Pergunta
                    </Button>
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      {/* Dialog: Seção */}
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
    </div>
  );
};

export default EditorFormulariosAuditoria;
