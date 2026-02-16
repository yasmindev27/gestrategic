import { useState } from "react";
import { LeadershipAnswer } from "@/types/disc";
import { LEADERSHIP_QUESTIONS } from "@/data/discQuestions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";

interface LeadershipAssessmentProps {
  onSubmit: (answers: LeadershipAnswer[]) => void;
  onBack: () => void;
  isSubmitting?: boolean;
}

export function LeadershipAssessment({ onSubmit, onBack, isSubmitting = false }: LeadershipAssessmentProps) {
  const [answers, setAnswers] = useState<Record<number, number>>({});

  const handleScoreChange = (questionId: number, score: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: score }));
  };

  const isComplete = Object.keys(answers).length === LEADERSHIP_QUESTIONS.length;

  const handleSubmit = () => {
    if (isComplete) {
      const formattedAnswers: LeadershipAnswer[] = Object.entries(answers).map(
        ([id, score]) => ({ questionId: parseInt(id), score: score as 1 | 2 | 3 | 4 | 5 })
      );
      onSubmit(formattedAnswers);
    }
  };

  const scaleLabels = ["Discordo totalmente", "Discordo", "Neutro", "Concordo", "Concordo totalmente"];

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-2xl font-semibold">Autopercepção de Liderança</CardTitle>
        <CardDescription>Avalie seu nível de concordância com cada afirmação (1 a 5)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap justify-center gap-2 pb-4 border-b">
          {scaleLabels.map((label, index) => (
            <div key={index} className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="font-bold text-primary">{index + 1}</span>
              <span>= {label}</span>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          {LEADERSHIP_QUESTIONS.map((question, index) => (
            <div key={index} className="p-4 rounded-lg bg-accent/30 border">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1">
                  <span className="text-sm font-semibold text-primary mr-2">{index + 1}.</span>
                  <span className="text-sm">{question}</span>
                </div>
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((score) => (
                    <button
                      key={score}
                      type="button"
                      onClick={() => handleScoreChange(index + 1, score)}
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200",
                        answers[index + 1] === score
                          ? "bg-primary text-primary-foreground scale-110 shadow-lg"
                          : "bg-card border-2 text-muted-foreground hover:border-primary hover:text-primary"
                      )}
                    >
                      {score}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center text-sm text-muted-foreground">
          {Object.keys(answers).length} de {LEADERSHIP_QUESTIONS.length} questões respondidas
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button variant="outline" onClick={onBack} className="flex-1">Voltar</Button>
          <Button onClick={handleSubmit} disabled={!isComplete || isSubmitting} className="flex-1">
            <Star className="w-4 h-4 mr-2" />
            {isSubmitting ? "Enviando..." : "Enviar Avaliação"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
