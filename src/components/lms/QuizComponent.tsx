import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Award, CheckCircle2, XCircle, ArrowRight, Loader2 } from "lucide-react";
import { Treinamento, QuizPergunta } from "./types";

type QuizPerguntaAluno = Omit<QuizPergunta, 'resposta_correta'>;

interface QuizProps {
  treinamento: Treinamento;
  inscricaoId: string;
  userId: string;
  onComplete: () => void;
}

export default function QuizComponent({ treinamento, inscricaoId, userId, onComplete }: QuizProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<{ acertos: number; total: number; nota: number; aprovado: boolean } | null>(null);

  const { data: perguntas = [], isLoading } = useQuery({
    queryKey: ["lms-quiz", treinamento.id],
    queryFn: async () => {
      // Use the view that excludes correct answers for security
      const { data, error } = await supabase.from("lms_quiz_perguntas_aluno").select("id, treinamento_id, pergunta, opcao_a, opcao_b, opcao_c, opcao_d, ordem, created_at").eq("treinamento_id", treinamento.id).order("ordem");
      if (error) throw error;
      return data as QuizPerguntaAluno[];
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      // Use server-side grading function (answers are never sent to client)
      const { data: gradeData, error: gradeError } = await supabase.rpc("corrigir_quiz", {
        _respostas: answers,
        _treinamento_id: treinamento.id,
      });
      if (gradeError) throw gradeError;

      const { acertos, total, nota } = gradeData[0];
      const aprovado = nota >= (treinamento.nota_minima_aprovacao || 70);

      // Save attempt
      const { error: attemptError } = await supabase.from("lms_tentativas_quiz").insert({
        inscricao_id: inscricaoId,
        treinamento_id: treinamento.id,
        usuario_id: userId,
        respostas: answers,
        acertos,
        total_perguntas: total,
        nota,
        aprovado,
      });
      if (attemptError) throw attemptError;

      // Update enrollment status
      if (aprovado) {
        const { error: updateError } = await supabase.from("lms_inscricoes").update({
          status: "capacitado",
          nota,
          data_conclusao: new Date().toISOString(),
        }).eq("id", inscricaoId);
        if (updateError) throw updateError;

        await supabase.from("lms_treinamentos").update({ status: "realizado" }).eq("id", treinamento.id).eq("status", "planejado");
      } else {
        await supabase.from("lms_inscricoes").update({
          status: "reprovado",
          nota,
        }).eq("id", inscricaoId);
      }

      return { acertos, total, nota, aprovado };
    },
    onSuccess: (data) => {
      setResult(data);
      setShowResult(true);
      queryClient.invalidateQueries({ queryKey: ["lms-inscricoes"] });
      queryClient.invalidateQueries({ queryKey: ["lms-treinamentos"] });
    },
    onError: () => toast({ title: "Erro ao enviar avaliação", variant: "destructive" }),
  });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (perguntas.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground mb-4">Nenhuma pergunta cadastrada para este treinamento.</p>
          <Button onClick={onComplete}>Voltar</Button>
        </CardContent>
      </Card>
    );
  }

  if (showResult && result) {
    return (
      <Card className={`border-2 ${result.aprovado ? "border-green-400" : "border-red-400"}`}>
        <CardContent className="py-12 text-center space-y-4">
          {result.aprovado ? (
            <>
              <Award className="h-16 w-16 text-green-500 mx-auto" />
              <h2 className="text-2xl font-bold text-green-700">Parabéns! Você foi aprovado!</h2>
              <p className="text-lg">Nota: <strong>{result.nota}%</strong> ({result.acertos}/{result.total} acertos)</p>
              <p className="text-muted-foreground">Seu status foi atualizado para <strong>Capacitado</strong>.</p>
            </>
          ) : (
            <>
              <XCircle className="h-16 w-16 text-red-500 mx-auto" />
              <h2 className="text-2xl font-bold text-red-700">Não aprovado</h2>
              <p className="text-lg">Nota: <strong>{result.nota}%</strong> ({result.acertos}/{result.total} acertos)</p>
              <p className="text-muted-foreground">Nota mínima: {treinamento.nota_minima_aprovacao}%. Revise o material e tente novamente.</p>
            </>
          )}
          <Button onClick={onComplete} className="mt-4">Voltar ao Portal</Button>
        </CardContent>
      </Card>
    );
  }

  const pergunta = perguntas[currentIndex];
  const isLast = currentIndex === perguntas.length - 1;
  const allAnswered = perguntas.every(p => answers[p.id]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Avaliação: {treinamento.titulo}</CardTitle>
          <span className="text-sm text-muted-foreground">Pergunta {currentIndex + 1} de {perguntas.length}</span>
        </div>
        {/* Progress bar */}
        <div className="w-full bg-muted rounded-full h-2 mt-2">
          <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${((currentIndex + 1) / perguntas.length) * 100}%` }} />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <h3 className="text-base font-medium">{pergunta.pergunta}</h3>

        <RadioGroup value={answers[pergunta.id] || ""} onValueChange={v => setAnswers(prev => ({ ...prev, [pergunta.id]: v }))}>
          {[
            { key: "a", label: pergunta.opcao_a },
            { key: "b", label: pergunta.opcao_b },
            { key: "c", label: pergunta.opcao_c },
            { key: "d", label: pergunta.opcao_d },
          ].map(opt => (
            <div key={opt.key} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent transition-colors cursor-pointer">
              <RadioGroupItem value={opt.key} id={`${pergunta.id}-${opt.key}`} />
              <Label htmlFor={`${pergunta.id}-${opt.key}`} className="flex-1 cursor-pointer">{opt.label}</Label>
            </div>
          ))}
        </RadioGroup>

        <div className="flex justify-between">
          <Button variant="outline" disabled={currentIndex === 0} onClick={() => setCurrentIndex(i => i - 1)}>
            Anterior
          </Button>
          {isLast ? (
            <Button onClick={() => submitMutation.mutate()} disabled={!allAnswered || submitMutation.isPending}>
              {submitMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Enviar Avaliação
            </Button>
          ) : (
            <Button onClick={() => setCurrentIndex(i => i + 1)} disabled={!answers[pergunta.id]}>
              Próxima <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
