import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, HelpCircle, Sparkles, Save, Loader2, Pencil } from "lucide-react";
import { Treinamento, QuizPergunta } from "./types";

interface PerguntaPreview {
  pergunta: string;
  opcao_a: string;
  opcao_b: string;
  opcao_c: string;
  opcao_d: string;
  resposta_correta: string;
}

export default function QuizManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTreinamento, setSelectedTreinamento] = useState<string>("");
  const [form, setForm] = useState({
    pergunta: "", opcao_a: "", opcao_b: "", opcao_c: "", opcao_d: "", resposta_correta: "a",
  });
  const [generatedQuestions, setGeneratedQuestions] = useState<PerguntaPreview[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingAll, setIsSavingAll] = useState(false);

  const { data: treinamentos = [] } = useQuery({
    queryKey: ["lms-treinamentos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("lms_treinamentos").select("*").order("titulo");
      if (error) throw error;
      return data as Treinamento[];
    },
  });

  const { data: perguntas = [] } = useQuery({
    queryKey: ["lms-quiz-admin", selectedTreinamento],
    queryFn: async () => {
      if (!selectedTreinamento) return [];
      const { data, error } = await supabase.from("lms_quiz_perguntas").select("*").eq("treinamento_id", selectedTreinamento).order("ordem");
      if (error) throw error;
      return data as QuizPergunta[];
    },
    enabled: !!selectedTreinamento,
  });

  const selectedTraining = treinamentos.find(t => t.id === selectedTreinamento);

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("lms_quiz_perguntas").insert({
        treinamento_id: selectedTreinamento,
        ...form,
        ordem: perguntas.length,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lms-quiz-admin"] });
      toast({ title: "Pergunta adicionada!" });
      setForm({ pergunta: "", opcao_a: "", opcao_b: "", opcao_c: "", opcao_d: "", resposta_correta: "a" });
    },
    onError: () => toast({ title: "Erro ao adicionar pergunta", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lms_quiz_perguntas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lms-quiz-admin"] });
      toast({ title: "Pergunta removida!" });
    },
  });

  const handleGenerateQuiz = async () => {
    if (!selectedTraining) return;
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("gerar-quiz-ia", {
        body: {
          tema: selectedTraining.titulo,
          objetivo: selectedTraining.objetivo,
          tipo_treinamento: selectedTraining.tipo_treinamento,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.perguntas && Array.isArray(data.perguntas)) {
        setGeneratedQuestions(data.perguntas);
        toast({ title: `✨ ${data.perguntas.length} perguntas geradas com IA!`, description: "Revise e edite antes de salvar." });
      } else {
        throw new Error("Resposta inválida da IA");
      }
    } catch (err: any) {
      console.error("Erro ao gerar quiz:", err);
      toast({ title: "Erro ao gerar quiz", description: err.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveAllGenerated = async () => {
    if (generatedQuestions.length === 0) return;
    setIsSavingAll(true);
    try {
      const rows = generatedQuestions.map((q, i) => ({
        treinamento_id: selectedTreinamento,
        pergunta: q.pergunta,
        opcao_a: q.opcao_a,
        opcao_b: q.opcao_b,
        opcao_c: q.opcao_c,
        opcao_d: q.opcao_d,
        resposta_correta: q.resposta_correta,
        ordem: perguntas.length + i,
      }));
      const { error } = await supabase.from("lms_quiz_perguntas").insert(rows);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["lms-quiz-admin"] });
      toast({ title: `${generatedQuestions.length} perguntas salvas com sucesso!` });
      setGeneratedQuestions([]);
    } catch {
      toast({ title: "Erro ao salvar perguntas", variant: "destructive" });
    } finally {
      setIsSavingAll(false);
    }
  };

  const updateGenerated = (index: number, field: keyof PerguntaPreview, value: string) => {
    setGeneratedQuestions(prev => prev.map((q, i) => i === index ? { ...q, [field]: value } : q));
  };

  const removeGenerated = (index: number) => {
    setGeneratedQuestions(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><HelpCircle className="h-5 w-5" /> Gerenciar Avaliações (Quiz)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Selecione o Treinamento</Label>
            <Select value={selectedTreinamento} onValueChange={(v) => { setSelectedTreinamento(v); setGeneratedQuestions([]); setEditingIndex(null); }}>
              <SelectTrigger><SelectValue placeholder="Escolha um treinamento..." /></SelectTrigger>
              <SelectContent>
                {treinamentos.map(t => <SelectItem key={t.id} value={t.id}>{t.titulo}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {selectedTreinamento && (
            <>
              {/* AI Generation Button */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 rounded-lg border border-dashed border-primary/40 bg-primary/5">
                <Sparkles className="h-5 w-5 text-primary shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Geração Automática com IA</p>
                  <p className="text-xs text-muted-foreground">Gere 15 perguntas baseadas no tema "{selectedTraining?.titulo}". Você poderá editar antes de salvar.</p>
                </div>
                <Button
                  onClick={handleGenerateQuiz}
                  disabled={isGenerating}
                  className="shrink-0"
                >
                  {isGenerating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Gerando...</> : <>✨ Gerar Quiz Automaticamente</>}
                </Button>
              </div>

              {/* Generated Questions Preview */}
              {generatedQuestions.length > 0 && (
                <Card className="border-primary/30">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        {generatedQuestions.length} Perguntas Geradas — Revise antes de salvar
                      </CardTitle>
                      <Button onClick={handleSaveAllGenerated} disabled={isSavingAll || generatedQuestions.length === 0}>
                        {isSavingAll ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...</> : <><Save className="h-4 w-4 mr-2" /> Salvar Todas</>}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 max-h-[500px] overflow-y-auto">
                    {generatedQuestions.map((q, i) => (
                      <div key={i} className="p-3 border rounded-lg space-y-2">
                        <div className="flex items-start gap-2">
                          <span className="text-sm font-bold text-muted-foreground shrink-0">{i + 1}.</span>
                          {editingIndex === i ? (
                            <div className="flex-1 space-y-2">
                              <Textarea value={q.pergunta} onChange={e => updateGenerated(i, "pergunta", e.target.value)} className="text-sm" />
                              <div className="grid grid-cols-2 gap-2">
                                <div><Label className="text-xs">A)</Label><Input value={q.opcao_a} onChange={e => updateGenerated(i, "opcao_a", e.target.value)} className="text-sm h-8" /></div>
                                <div><Label className="text-xs">B)</Label><Input value={q.opcao_b} onChange={e => updateGenerated(i, "opcao_b", e.target.value)} className="text-sm h-8" /></div>
                                <div><Label className="text-xs">C)</Label><Input value={q.opcao_c} onChange={e => updateGenerated(i, "opcao_c", e.target.value)} className="text-sm h-8" /></div>
                                <div><Label className="text-xs">D)</Label><Input value={q.opcao_d} onChange={e => updateGenerated(i, "opcao_d", e.target.value)} className="text-sm h-8" /></div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Label className="text-xs">Correta:</Label>
                                <Select value={q.resposta_correta} onValueChange={v => updateGenerated(i, "resposta_correta", v)}>
                                  <SelectTrigger className="w-[80px] h-8 text-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="a">A</SelectItem>
                                    <SelectItem value="b">B</SelectItem>
                                    <SelectItem value="c">C</SelectItem>
                                    <SelectItem value="d">D</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Button size="sm" variant="outline" onClick={() => setEditingIndex(null)}>OK</Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex-1">
                              <p className="text-sm font-medium">{q.pergunta}</p>
                              <div className="grid grid-cols-2 gap-1 mt-1 text-xs text-muted-foreground">
                                <span className={q.resposta_correta === "a" ? "text-green-600 font-medium" : ""}>A) {q.opcao_a}</span>
                                <span className={q.resposta_correta === "b" ? "text-green-600 font-medium" : ""}>B) {q.opcao_b}</span>
                                <span className={q.resposta_correta === "c" ? "text-green-600 font-medium" : ""}>C) {q.opcao_c}</span>
                                <span className={q.resposta_correta === "d" ? "text-green-600 font-medium" : ""}>D) {q.opcao_d}</span>
                              </div>
                            </div>
                          )}
                          <div className="flex gap-1 shrink-0">
                            <Button size="sm" variant="ghost" onClick={() => setEditingIndex(editingIndex === i ? null : i)}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeGenerated(i)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Existing questions */}
              {perguntas.length > 0 && (
                <div className="space-y-2">
                  <p className="font-medium text-sm">{perguntas.length} pergunta(s) cadastrada(s)</p>
                  {perguntas.map((p, i) => (
                    <div key={p.id} className="flex items-start gap-3 p-3 border rounded-lg">
                      <span className="text-sm font-bold text-muted-foreground">{i + 1}.</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{p.pergunta}</p>
                        <div className="grid grid-cols-2 gap-1 mt-1 text-xs text-muted-foreground">
                          <span className={p.resposta_correta === "a" ? "text-green-600 font-medium" : ""}>A) {p.opcao_a}</span>
                          <span className={p.resposta_correta === "b" ? "text-green-600 font-medium" : ""}>B) {p.opcao_b}</span>
                          <span className={p.resposta_correta === "c" ? "text-green-600 font-medium" : ""}>C) {p.opcao_c}</span>
                          <span className={p.resposta_correta === "d" ? "text-green-600 font-medium" : ""}>D) {p.opcao_d}</span>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteMutation.mutate(p.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new question manually */}
              <div className="border-t pt-4 space-y-3">
                <p className="font-medium text-sm flex items-center gap-2"><Plus className="h-4 w-4" /> Nova Pergunta Manual</p>
                <div><Label>Pergunta *</Label><Textarea value={form.pergunta} onChange={e => setForm(p => ({ ...p, pergunta: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>A)</Label><Input value={form.opcao_a} onChange={e => setForm(p => ({ ...p, opcao_a: e.target.value }))} /></div>
                  <div><Label>B)</Label><Input value={form.opcao_b} onChange={e => setForm(p => ({ ...p, opcao_b: e.target.value }))} /></div>
                  <div><Label>C)</Label><Input value={form.opcao_c} onChange={e => setForm(p => ({ ...p, opcao_c: e.target.value }))} /></div>
                  <div><Label>D)</Label><Input value={form.opcao_d} onChange={e => setForm(p => ({ ...p, opcao_d: e.target.value }))} /></div>
                </div>
                <div>
                  <Label>Resposta Correta</Label>
                  <Select value={form.resposta_correta} onValueChange={v => setForm(p => ({ ...p, resposta_correta: v }))}>
                    <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="a">A</SelectItem>
                      <SelectItem value="b">B</SelectItem>
                      <SelectItem value="c">C</SelectItem>
                      <SelectItem value="d">D</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={() => addMutation.mutate()} disabled={!form.pergunta || !form.opcao_a || !form.opcao_b || !form.opcao_c || !form.opcao_d || addMutation.isPending}>
                  Adicionar Pergunta
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
