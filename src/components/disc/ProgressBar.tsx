import { Progress } from "@/components/ui/progress";

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  blockTitles?: string[];
  currentBlock?: number;
}

export function ProgressBar({ currentStep, totalSteps, blockTitles, currentBlock }: ProgressBarProps) {
  const percentage = (currentStep / totalSteps) * 100;

  return (
    <div className="w-full max-w-3xl mx-auto space-y-2">
      <div className="flex justify-between items-center text-sm">
        <span className="text-muted-foreground">Progresso: {currentStep} de {totalSteps}</span>
        {blockTitles && currentBlock !== undefined && currentBlock > 0 && (
          <span className="text-primary font-medium">Bloco {currentBlock}: {blockTitles[currentBlock - 1]}</span>
        )}
      </div>
      <Progress value={percentage} className="h-2" />
    </div>
  );
}
