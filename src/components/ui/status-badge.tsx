import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckCircle, Clock, AlertCircle, XCircle, Loader2, LucideIcon } from "lucide-react";

type StatusType = 
  | "success" 
  | "warning" 
  | "error" 
  | "info" 
  | "pending" 
  | "processing" 
  | "default";

interface StatusBadgeProps {
  status: StatusType;
  label: string;
  showIcon?: boolean;
  className?: string;
}

const statusConfig: Record<StatusType, { 
  className: string; 
  icon: LucideIcon;
}> = {
  success: {
    className: "bg-success/10 text-success border-success/20 hover:bg-success/20",
    icon: CheckCircle,
  },
  warning: {
    className: "bg-warning/10 text-warning border-warning/20 hover:bg-warning/20",
    icon: AlertCircle,
  },
  error: {
    className: "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20",
    icon: XCircle,
  },
  info: {
    className: "bg-info/10 text-info border-info/20 hover:bg-info/20",
    icon: Clock,
  },
  pending: {
    className: "bg-muted text-muted-foreground border-muted-foreground/20 hover:bg-muted/80",
    icon: Clock,
  },
  processing: {
    className: "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20",
    icon: Loader2,
  },
  default: {
    className: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    icon: Clock,
  },
};

export function StatusBadge({ 
  status, 
  label, 
  showIcon = true, 
  className 
}: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.default;
  const Icon = config.icon;

  return (
    <Badge 
      variant="outline" 
      className={cn("flex items-center gap-1", config.className, className)}
    >
      {showIcon && (
        <Icon className={cn(
          "h-3 w-3",
          status === "processing" && "animate-spin"
        )} />
      )}
      {label}
    </Badge>
  );
}

// Utilitário para mapear status do sistema para tipo de status visual
export function mapStatusToType(status: string): StatusType {
  const statusMap: Record<string, StatusType> = {
    // Sucesso
    concluido: "success",
    resolvido: "success",
    ativo: "success",
    completo: "success",
    aprovado: "success",
    em_uso: "success",
    
    // Aviso
    aguardando_classificacao: "warning",
    pendente: "warning",
    com_pendencias: "warning",
    alerta: "warning",
    
    // Erro
    cancelado: "error",
    incompleto: "error",
    vencido: "error",
    danificado: "error",
    atrasado: "error",
    
    // Info
    aguardando_nir: "info",
    aguardando_faturamento: "info",
    em_avaliacao: "info",
    devolvido: "info",
    
    // Processando
    em_andamento: "processing",
    
    // Aberto/Pendente
    aberto: "pending",
  };
  
  return statusMap[status.toLowerCase()] || "default";
}

// Labels padrão para status comuns
export const statusLabels: Record<string, string> = {
  aguardando_classificacao: "Aguardando Classificação",
  aguardando_nir: "Aguardando NIR",
  aguardando_faturamento: "Aguardando Faturamento",
  em_avaliacao: "Em Avaliação",
  concluido: "Concluído",
  pendente: "Pendente",
  aberto: "Aberto",
  em_andamento: "Em Andamento",
  resolvido: "Resolvido",
  cancelado: "Cancelado",
  ativo: "Ativo",
  inativo: "Inativo",
  completo: "Completo",
  com_pendencias: "Com Pendências",
  incompleto: "Incompleto",
  em_uso: "Em Uso",
  devolvido: "Devolvido",
  vencido: "Vencido",
  danificado: "Danificado",
};

export function getStatusLabel(status: string): string {
  return statusLabels[status.toLowerCase()] || status;
}
