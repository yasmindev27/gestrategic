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
import { Plus, Trash2, HelpCircle } from "lucide-react";
import { Treinamento, QuizPergunta } from "./types";

export default function QuizManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTreinamento, setSelectedTreinamento] = useState<string>("");
  const [form, setForm] = useState({
    pergunta: "", opcao_a: "", opcao_b: "", opcao_c: "", opcao_d: "", resposta_correta: "a",
  });

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

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><HelpCircle className="h-5 w-5" /> Gerenciar Avaliações (Quiz)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Selecione o Treinamento</Label>
            <Select value={selectedTreinamento} onValueChange={setSelectedTreinamento}>
              <SelectTrigger><SelectValue placeholder="Escolha um treinamento..." /></SelectTrigger>
              <SelectContent>
                {treinamentos.map(t => <SelectItem key={t.id} value={t.id}>{t.titulo}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {selectedTreinamento && (
            <>
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

              {/* Add new question */}
              <div className="border-t pt-4 space-y-3">
                <p className="font-medium text-sm flex items-center gap-2"><Plus className="h-4 w-4" /> Nova Pergunta</p>
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
