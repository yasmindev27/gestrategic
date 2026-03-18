import { DISCQuestion } from "@/data/discQuestions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface DISCQuestionCardProps {
  question: DISCQuestion;
  selectedAnswer?: 'a' | 'b' | 'c' | 'd';
  onAnswer: (answer: 'a' | 'b' | 'c' | 'd') => void;
  questionNumber: number;
  totalQuestions: number;
}

export function DISCQuestionCard({ question, selectedAnswer, onAnswer, questionNumber, totalQuestions }: DISCQuestionCardProps) {
  const options = ['a', 'b', 'c', 'd'] as const;

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">
            Pergunta {questionNumber} de {totalQuestions}
          </span>
          <span className="text-sm text-muted-foreground">Bloco {question.block}</span>
        </div>
        <CardTitle className="text-lg leading-relaxed">{question.question}</CardTitle>
      </CardHeader>
      <CardContent>
        <RadioGroup value={selectedAnswer || ""} onValueChange={(value) => onAnswer(value as 'a' | 'b' | 'c' | 'd')} className="space-y-3">
          {options.map((option) => (
            <div
              key={option}
              className={cn(
                "relative flex items-start space-x-3 p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer hover:border-primary/50 hover:bg-accent/50",
                selectedAnswer === option ? "border-primary bg-primary/5" : "border-border bg-card"
              )}
              onClick={() => onAnswer(option)}
            >
              <RadioGroupItem value={option} id={`${question.id}-${option}`} className="mt-0.5" />
              <Label htmlFor={`${question.id}-${option}`} className="text-sm cursor-pointer leading-relaxed flex-1">
                <span className="font-semibold text-primary mr-2">{option.toUpperCase()})</span>
                {question.options[option]}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </CardContent>
    </Card>
  );
}
