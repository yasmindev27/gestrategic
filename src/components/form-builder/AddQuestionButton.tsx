import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { QUESTION_TYPES, type QuestionData } from "./QuestionCard";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AddQuestionButtonProps {
  onAdd: (question: QuestionData) => void;
  currentCount: number;
  variant?: "full" | "compact" | "floating";
}

export const AddQuestionButton = ({ onAdd, currentCount, variant = "full" }: AddQuestionButtonProps) => {
  const handleAdd = (tipo: string) => {
    let opcoes: string[] = [];
    if (tipo === "selecao" || tipo === "multipla_escolha") {
      opcoes = ["Opção 1"];
    } else if (tipo === "sim_nao") {
      opcoes = ["Sim", "Não"];
    } else if (tipo === "escala") {
      opcoes = ["1", "2", "3", "4", "5"];
    }

    onAdd({
      tipo,
      label: "",
      obrigatorio: false,
      opcoes,
      ordem: currentCount,
    });
  };

  if (variant === "floating") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            className="h-12 w-12 rounded-full shadow-lg fixed bottom-6 right-6 z-50"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {QUESTION_TYPES.map(t => (
            <DropdownMenuItem key={t.value} onClick={() => handleAdd(t.value)} className="gap-2">
              {t.icon}
              {t.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (variant === "compact") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="border-dashed w-full">
            <Plus className="h-4 w-4 mr-1" /> Adicionar pergunta
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-52">
          {QUESTION_TYPES.map(t => (
            <DropdownMenuItem key={t.value} onClick={() => handleAdd(t.value)} className="gap-2">
              {t.icon}
              {t.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="border-2 border-dashed border-muted-foreground/20 rounded-xl p-6 text-center hover:border-primary/40 transition-colors">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            Adicionar pergunta
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-52">
          {QUESTION_TYPES.map(t => (
            <DropdownMenuItem key={t.value} onClick={() => handleAdd(t.value)} className="gap-2">
              {t.icon}
              {t.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
