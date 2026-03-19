import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Pencil, Trash2, Save, ChevronLeft, Settings2,
  ClipboardList, FileText, ToggleLeft, AlignLeft, Hash,
  GripVertical, CircleDot, Eye, Copy, MoreVertical,
  ChevronDown, ChevronUp, LayoutList, X, Check
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

const TIPO_PERGUNTA_INFO: Record<TipoPergunta, { label: string; icon: React.ReactNode; desc: string; color: string }> = {
  multipla_escolha: { label: "Múltipla Escolha", icon: <CircleDot className="h-4 w-4" />, desc: "Opções personalizáveis", color: "text-blue-600" },
  sim_nao: { label: "Sim / Não", icon: <ToggleLeft className="h-4 w-4" />, desc: "Resposta binária", color: "text-emerald-600" },
  escala: { label: "Escala 0-9", icon: <Hash className="h-4 w-4" />, desc: "Avaliação numérica", color: "text-amber-600" },
  texto_livre: { label: "Texto Livre", icon: <AlignLeft className="h-4 w-4" />, desc: "Campo aberto", color: "text-purple-600" },
};

const PRESET_OPCOES: Record<TipoPergunta, string[]> = {
  multipla_escolha: ["conforme", "nao_conforme", "nao_aplica"],
  sim_nao: ["sim", "nao", "nao_aplica"],
  escala: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "nao_aplica"],
  texto_livre: ["__texto_livre__"],
};

const OPCOES_LABELS: Record<string, string> = {
  conforme: "Conforme", nao_conforme: "Não Conforme", nao_aplica: "N/A",
  sim: "Sim", nao: "Não", __texto_livre__: "Texto aberto",
};

const getOpcaoLabel = (opt: string) => OPCOES_LABELS[opt] || opt.replace(/_/g, " ");

const detectTipoPergunta = (opcoes: string[]): TipoPergunta => {
  if (opcoes.includes("__texto_livre__")) return "texto_livre";
  if (opcoes.some(o => o === "0" || o === "9")) return "escala";
  if (opcoes.includes("sim") && !opcoes.some(o => o.startsWith("conforme"))) return "sim_nao";
  return "multipla_escolha";
};

const InlineQuestionCard = ({
  pergunta, index, isSelected, onSelect, onSave, onDelete,
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
    if (t !== "multipla_escolha") setOpcoes(PRESET_OPCOES[t]);
    setDirty(true);
  };

  const handleSave = () => {
    const finalOpcoes = currentTipo === "texto_livre" ? ["__texto_livre__"] : opcoes;
    onSave({ label, opcoes: finalOpcoes });
    setDirty(false);
  };

  const addOpcao = () => {
    if (novaOpcao.trim()) {
      setOpcoes([...opcoes, novaOpcao.trim()]);
      setNovaOpcao("");
      setDirty(true);
    }
  };

  if (!isSelected) {
    return (
      <div
        className="group flex items-center gap-3 px-4 py-3 rounded-lg border bg-card hover:bg-accent/30 hover:border-primary/30 cursor-pointer transition-all"
        onClick={onSelect}
      >
        <span className="text-xs font-mono text-muted-foreground w-5 text-right shrink-0">{index + 1}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{pergunta.label || <span className="italic text-muted-foreground">Sem título — clique para editar</span>}</p>
        </div>
        <Badge variant="outline" className={cn("text-[10px] gap-1 shrink-0", info.color)}>
          {info.icon}
          {info.label}
        </Badge>
      </div>
    );
  }

  return (
    <Card className="ring-2 ring-primary border-primary shadow-lg relative overflow-hidden" onClick={e => e.stopPropagation()}>
      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary" />

      <CardContent className="p-5 pl-7 space-y-4">
        {/* Question label */}
        <div className="flex items-start gap-3">
          <span className="text-sm font-bold text-primary mt-2.5 w-6 shrink-0">{index + 1}.</span>
          <div className="flex-1">
            <Input
              value={label}
              onChange={(e) => { setLabel(e.target.value); setDirty(true); }}
              placeholder="Digite o texto da pergunta..."
              className="text-base font-medium border-0 border-b-2 border-muted-foreground/20 rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary bg-transparent h-auto py-2"
              autoFocus
            />
          </div>
        </div>

        {/* Type selector - horizontal pills */}
        <div className="flex flex-wrap gap-1.5">
          {(Object.entries(TIPO_PERGUNTA_INFO) as [TipoPergunta, typeof TIPO_PERGUNTA_INFO[TipoPergunta]][]).map(([key, inf]) => (
            <button
              key={key}
              type="button"
              onClick={() => handleChangeTipo(key)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
                currentTipo === key
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:border-border"
              )}
            >
              {inf.icon}
              {inf.label}
            </button>
          ))}
        </div>

        {/* Options preview/editor */}
        {currentTipo === "multipla_escolha" && (
          <div className="space-y-3 bg-muted/20 rounded-lg p-3 border">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Opções de Resposta</Label>
            <div className="flex flex-wrap gap-2">
              {opcoes.map((opt, i) => (
                <div key={`${opt}-${i}`} className="flex items-center gap-1 bg-background border rounded-full pl-3 pr-1 py-1 text-sm group/opt">
                  <span className="text-xs">{getOpcaoLabel(opt)}</span>
                  <button
                    onClick={() => { setOpcoes(opcoes.filter((_, idx) => idx !== i)); setDirty(true); }}
                    className="h-5 w-5 rounded-full flex items-center justify-center hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={novaOpcao}
                onChange={e => setNovaOpcao(e.target.value)}
                placeholder="Adicionar opção..."
                className="text-sm h-8"
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addOpcao(); } }}
              />
              <Button variant="secondary" size="sm" className="h-8 shrink-0" onClick={addOpcao} disabled={!novaOpcao.trim()}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="flex gap-1.5">
              {[
                { label: "Conforme / Não Conforme / N/A", v: ["conforme", "nao_conforme", "nao_aplica"] },
                { label: "Sim / Não / N/A", v: ["sim", "nao", "nao_aplica"] },
              ].map(p => (
                <Button key={p.label} variant="ghost" size="sm" className="text-[11px] h-7 text-primary hover:text-primary px-2" onClick={() => { setOpcoes(p.v); setDirty(true); }}>
                  <Copy className="h-3 w-3 mr-1" />
                  {p.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {currentTipo === "sim_nao" && (
          <div className="flex items-center gap-2 p-3 rounded-lg border bg-emerald-50/50 dark:bg-emerald-950/10">
            <ToggleLeft className="h-4 w-4 text-emerald-600" />
            <span className="text-sm text-muted-foreground">Opções automáticas: <strong>Sim</strong>, <strong>Não</strong> e <strong>N/A</strong></span>
          </div>
        )}
        {currentTipo === "escala" && (
          <div className="p-3 rounded-lg border bg-amber-50/50 dark:bg-amber-950/10">
            <div className="flex items-center gap-2 mb-2">
              <Hash className="h-4 w-4 text-amber-600" />
              <span className="text-sm text-muted-foreground">Escala numérica de <strong>0 a 9</strong> + N/A</span>
            </div>
            <div className="flex gap-1">
              {[0,1,2,3,4,5,6,7,8,9].map(n => (
                <div key={n} className="h-7 w-7 rounded border bg-background flex items-center justify-center text-xs font-mono text-muted-foreground">{n}</div>
              ))}
              <div className="h-7 px-2 rounded border bg-background flex items-center justify-center text-[10px] text-muted-foreground">N/A</div>
            </div>
          </div>
        )}
        {currentTipo === "texto_livre" && (
          <div className="p-3 rounded-lg border bg-purple-50/50 dark:bg-purple-950/10">
            <div className="flex items-center gap-2 mb-2">
              <AlignLeft className="h-4 w-4 text-purple-600" />
              <span className="text-sm text-muted-foreground">O auditor poderá escrever livremente</span>
            </div>
            <div className="border rounded bg-background p-2">
              <div className="h-12 border-b border-dashed border-muted-foreground/20" />
              <div className="h-4 border-b border-dashed border-muted-foreground/20 mt-2" />
            </div>
          </div>
        )}

        {/* Action bar */}
        <Separator />
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" /> Excluir
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onSelect} className="gap-1.5">
              <X className="h-3.5 w-3.5" /> Fechar
            </Button>
            {dirty && (
              <Button size="sm" onClick={handleSave} className="gap-1.5">
                <Check className="h-3.5 w-3.5" /> Salvar Alterações
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const EditorFormulariosAuditoria = () => {
  const { toast } = useToast();
  const [formularios, setFormularios] = useState<FormularioConfig[]>([]);
  const [secoes, setSecoes] = useState<SecaoConfig[]>([]);
  const [perguntas, setPerguntas] = useState<PerguntaConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFormulario, setSelectedFormulario] = useState<FormularioConfig | null>(null);

  const [editSecaoDialog, setEditSecaoDialog] = useState(false);
  const [editingSecao, setEditingSecao] = useState<SecaoConfig | null>(null);
  const [selectedPerguntaId, setSelectedPerguntaId] = useState<string | null>(null);
  const [addingToSecaoId, setAddingToSecaoId] = useState<string | null>(null);
  const [secaoNome, setSecaoNome] = useState("");
  const [expandedSecoes, setExpandedSecoes] = useState<Set<string>>(new Set());

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setIsLoading(true);
    const [fRes, sRes, pRes] = await Promise.all([
      supabase.from("auditoria_formularios_config").select("*").order("ordem"),
      supabase.from("auditoria_secoes_config").select("*").order("ordem"),
      supabase.from("auditoria_perguntas_config").select("*").order("ordem"),
    ]);
    if (fRes.data) setFormularios(fRes.data as FormularioConfig[]);
    if (sRes.data) {
      setSecoes(sRes.data as SecaoConfig[]);
      // Auto-expand all sections on first load
      if (expandedSecoes.size === 0) {
        setExpandedSecoes(new Set((sRes.data as SecaoConfig[]).map(s => s.id)));
      }
    }
    if (pRes.data) setPerguntas(pRes.data as PerguntaConfig[]);
    setIsLoading(false);
  };

  const toggleSecao = (id: string) => {
    setExpandedSecoes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
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
    const { error } = await supabase.from("auditoria_perguntas_config").update({ label: updates.label, opcoes: updates.opcoes }).eq("id", id);
    if (error) { toast({ title: "Erro", description: "Falha ao salvar", variant: "destructive" }); return; }
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
    if (!secaoNome.trim()) { toast({ title: "Campo obrigatório", variant: "destructive" }); return; }
    if (editingSecao) {
      await supabase.from("auditoria_secoes_config").update({ nome: secaoNome }).eq("id", editingSecao.id);
      toast({ title: "Seção renomeada!" });
    } else {
      const formSecoes = secoes.filter(s => s.formulario_id === selectedFormulario!.id);
      const maxOrdem = formSecoes.length > 0 ? Math.max(...formSecoes.map(s => s.ordem)) : 0;
      const { data } = await supabase.from("auditoria_secoes_config").insert({ formulario_id: selectedFormulario!.id, nome: secaoNome, ordem: maxOrdem + 1 }).select("id").single();
      if (data) setExpandedSecoes(prev => new Set([...prev, data.id]));
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

  // ---- Formulário ----
  const criarFormularioRapido = async () => {
    const maxOrdem = formularios.length > 0 ? Math.max(...formularios.map(f => f.ordem ?? 0)) : 0;
    const { data: formData, error: formError } = await supabase
      .from("auditoria_formularios_config")
      .insert({ nome: "Novo Formulário", tipo: `custom_${Date.now()}`, icone: "clipboard-check", setores: ["Todos"], ordem: maxOrdem + 1, ativo: true })
      .select("*").single();

    if (formError || !formData) { toast({ title: "Erro", variant: "destructive" }); return; }

    const { data: secData } = await supabase.from("auditoria_secoes_config").insert({ formulario_id: formData.id, nome: "Seção 1", ordem: 1 }).select("id").single();
    if (secData) setExpandedSecoes(new Set([secData.id]));
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

  if (!selectedFormulario) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <LayoutList className="h-5 w-5 text-primary" />
              Formulários de Auditoria
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">Selecione um formulário para editar ou crie um novo</p>
          </div>
          <Button onClick={criarFormularioRapido} className="gap-2">
            <Plus className="h-4 w-4" /> Novo Formulário
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {formularios.filter(f => f.ativo).map(f => {
            const fSecoes = secoes.filter(s => s.formulario_id === f.id);
            const fPerguntas = fSecoes.flatMap(s => perguntas.filter(p => p.secao_id === s.id));
            return (
              <Card key={f.id} className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group overflow-hidden" onClick={() => setSelectedFormulario(f)}>
                <div className="h-1.5 bg-primary/20 group-hover:bg-primary transition-colors" />
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                      <ClipboardList className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold truncate group-hover:text-primary transition-colors">{f.nome}</h4>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-xs text-muted-foreground">{fSecoes.length} seç{fSecoes.length === 1 ? "ão" : "ões"}</span>
                        <span className="text-xs text-muted-foreground">{fPerguntas.length} pergunta{fPerguntas.length !== 1 ? "s" : ""}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {formularios.filter(f => f.ativo).length === 0 && (
            <Card className="col-span-full">
              <CardContent className="py-16 text-center text-muted-foreground">
                <div className="h-16 w-16 mx-auto mb-4 rounded-2xl bg-muted/50 flex items-center justify-center">
                  <FileText className="h-8 w-8 opacity-30" />
                </div>
                <p className="font-medium">Nenhum formulário cadastrado</p>
                <p className="text-sm mt-1 mb-4">Crie seu primeiro formulário de auditoria</p>
                <Button onClick={criarFormularioRapido} className="gap-2">
                  <Plus className="h-4 w-4" /> Criar Formulário
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  const formSecoes = secoes.filter(s => s.formulario_id === selectedFormulario.id).sort((a, b) => a.ordem - b.ordem);
  const totalPerguntas = formSecoes.reduce((acc, s) => acc + perguntas.filter(p => p.secao_id === s.id).length, 0);

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Header Card */}
      <Card className="overflow-hidden">
        <div className="h-2 bg-primary" />
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelectedFormulario(null)} className="gap-1.5 text-muted-foreground hover:text-foreground -ml-2">
              <ChevronLeft className="h-4 w-4" /> Voltar
            </Button>
            <div className="flex-1" />
            <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive border-destructive/30 hover:border-destructive/60" onClick={deleteFormulario}>
              <Trash2 className="h-3.5 w-3.5" /> Excluir
            </Button>
          </div>

          <Input
            value={selectedFormulario.nome}
            onChange={(e) => setSelectedFormulario({ ...selectedFormulario, nome: e.target.value })}
            onBlur={async () => {
              await supabase.from("auditoria_formularios_config").update({ nome: selectedFormulario.nome }).eq("id", selectedFormulario.id);
              loadAll();
            }}
            placeholder="Título do formulário"
            className="text-2xl font-bold border-0 border-b-2 border-transparent focus-visible:border-primary rounded-none px-0 bg-transparent focus-visible:ring-0 h-auto py-1"
          />

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <LayoutList className="h-4 w-4" />
              {formSecoes.length} seç{formSecoes.length === 1 ? "ão" : "ões"}
            </span>
            <span className="flex items-center gap-1.5">
              <ClipboardList className="h-4 w-4" />
              {totalPerguntas} pergunta{totalPerguntas !== 1 ? "s" : ""}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Seções */}
      {formSecoes.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <div className="h-14 w-14 mx-auto mb-4 rounded-xl bg-muted/50 flex items-center justify-center">
              <LayoutList className="h-7 w-7 opacity-30" />
            </div>
            <p className="font-medium">Nenhuma seção criada</p>
            <p className="text-sm mt-1 mb-4">Seções agrupam perguntas relacionadas</p>
            <Button onClick={openAddSecao} className="gap-2"><Plus className="h-4 w-4" /> Criar Primeira Seção</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {formSecoes.map(secao => {
            const secaoPerguntas = perguntas.filter(p => p.secao_id === secao.id).sort((a, b) => a.ordem - b.ordem);
            const isExpanded = expandedSecoes.has(secao.id);

            return (
              <Card key={secao.id} className="overflow-hidden">
                {/* Section header */}
                <div
                  className="flex items-center gap-3 px-5 py-3.5 bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors border-b"
                  onClick={() => toggleSecao(secao.id)}
                >
                  <button className="shrink-0 text-muted-foreground">
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4 rotate-180" />}
                  </button>
                  <h4 className="font-semibold text-sm flex-1">{secao.nome}</h4>
                  <Badge variant="secondary" className="text-xs">{secaoPerguntas.length}</Badge>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="icon-sm" onClick={() => openEditSecao(secao)} title="Renomear seção">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive" onClick={() => deleteSecao(secao.id)} title="Excluir seção">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Section content */}
                {isExpanded && (
                  <CardContent className="p-4 space-y-2">
                    {secaoPerguntas.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">Nenhuma pergunta nesta seção</p>
                    )}

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

                    {/* Add question area */}
                    {addingToSecaoId === secao.id ? (
                      <div className="border-2 border-dashed border-primary/30 rounded-xl p-4 bg-primary/5 space-y-3">
                        <p className="text-sm font-medium text-center">Escolha o tipo de pergunta</p>
                        <div className="grid grid-cols-2 gap-2">
                          {(Object.entries(TIPO_PERGUNTA_INFO) as [TipoPergunta, typeof TIPO_PERGUNTA_INFO[TipoPergunta]][]).map(([key, inf]) => (
                            <button
                              key={key}
                              type="button"
                              onClick={() => addPergunta(secao.id, key)}
                              className="flex items-center gap-2.5 p-3 rounded-lg border bg-background text-left hover:border-primary hover:shadow-sm transition-all group"
                            >
                              <span className={cn("shrink-0", inf.color)}>{inf.icon}</span>
                              <div>
                                <p className="text-sm font-medium">{inf.label}</p>
                                <p className="text-[11px] text-muted-foreground">{inf.desc}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                        <div className="text-center">
                          <Button variant="ghost" size="sm" onClick={() => setAddingToSecaoId(null)}>Cancelar</Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-dashed mt-1 text-muted-foreground hover:text-primary hover:border-primary/40"
                        onClick={() => setAddingToSecaoId(secao.id)}
                      >
                        <Plus className="h-4 w-4 mr-1.5" /> Adicionar Pergunta
                      </Button>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}

          {/* Add section button */}
          <Button variant="outline" size="sm" className="w-full border-dashed gap-2" onClick={openAddSecao}>
            <Plus className="h-4 w-4" /> Nova Seção
          </Button>
        </div>
      )}

      {/* Dialog: Seção */}
      <Dialog open={editSecaoDialog} onOpenChange={setEditSecaoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSecao ? "Renomear Seção" : "Nova Seção"}</DialogTitle>
            <DialogDescription>Seções agrupam perguntas relacionadas no formulário de auditoria</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Nome da Seção *</Label>
            <Input
              value={secaoNome}
              onChange={e => setSecaoNome(e.target.value)}
              placeholder="Ex: Identificação do Paciente"
              onKeyDown={e => e.key === "Enter" && saveSecao()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSecaoDialog(false)}>Cancelar</Button>
            <Button onClick={saveSecao} className="gap-1.5"><Save className="h-4 w-4" /> Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EditorFormulariosAuditoria;
