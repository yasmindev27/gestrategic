import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  message?: string;
  className?: string;
  size?: "sm" | "default" | "lg";
}

const sizeStyles = {
  sm: "h-4 w-4",
  default: "h-8 w-8",
  lg: "h-12 w-12",
};

export function LoadingState({
  message = "Carregando...",
  className,
  size = "default",
}: LoadingStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-12 gap-3",
      className
    )}>
      <Loader2 className={cn("animate-spin text-primary", sizeStyles[size])} />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

// Versão inline para uso em botões ou células de tabela
export function LoadingSpinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-4 w-4 animate-spin", className)} />;
}
