/**
 * 💡 Componente StatusTooltip
 * Exibe status com tooltip informativo
 * Ex: "Pendente: Aguardando validação do RH"
 */

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge, BadgeProps } from "@/components/ui/badge";
import { LucideIcon, AlertCircle, CheckCircle, Clock, XCircle } from "lucide-react";

interface StatusTooltipProps {
  status: "pendente" | "aprovado" | "rejeitado" | "em_progresso" | "concluido";
  label?: string;
  tooltip: string;
  variant?: BadgeProps["variant"];
  showIcon?: boolean;
}

const statusConfig = {
  pendente: {
    label: "Pendente",
    icon: Clock,
    variant: "outline" as const,
    color: "text-yellow-600",
  },
  aprovado: {
    label: "Aprovado",
    icon: CheckCircle,
    variant: "default" as const,
    color: "text-green-600",
  },
  rejeitado: {
    label: "Rejeitado",
    icon: XCircle,
    variant: "destructive" as const,
    color: "text-red-600",
  },
  em_progresso: {
    label: "Em Progresso",
    icon: AlertCircle,
    variant: "secondary" as const,
    color: "text-blue-600",
  },
  concluido: {
    label: "Concluído",
    icon: CheckCircle,
    variant: "default" as const,
    color: "text-green-600",
  },
};

export function StatusTooltip({
  status,
  label,
  tooltip,
  variant,
  showIcon = true,
}: StatusTooltipProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={variant || config.variant} className="cursor-help">
            {showIcon && <Icon className="mr-1 h-3 w-3" />}
            {label || config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Componente simplificado para status genérico com tooltip
 */
export function InfoTooltip({
  children,
  tooltip,
  icon: Icon = AlertCircle,
}: {
  children: React.ReactNode;
  tooltip: string;
  icon?: LucideIcon;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="inline-flex items-center gap-1 cursor-help rounded hover:bg-gray-100 dark:hover:bg-gray-800 p-1">
            {children}
            <Icon className="h-4 w-4 text-gray-400" />
          </button>
        </TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Badge com tooltip para RH/Banco de Horas
 */
export function HRStatusTooltip({
  status,
}: {
  status: "pendente" | "aprovado" | "rejeitado" | "em_validacao";
}) {
  const tooltips = {
    pendente: "Aguardando validação do RH",
    aprovado: "Validado e registrado pelo RH",
    rejeitado: "Rejeitado - consulte o departamento de RH",
    em_validacao: "Sendo validado pelo supervisor",
  };

  const statusMap: Record<
    string,
    "pendente" | "aprovado" | "rejeitado" | "em_progresso"
  > = {
    pendente: "pendente",
    aprovado: "aprovado",
    rejeitado: "rejeitado",
    em_validacao: "em_progresso",
  };

  return (
    <StatusTooltip
      status={statusMap[status]}
      tooltip={tooltips[status as keyof typeof tooltips] || ""}
      showIcon={true}
    />
  );
}

/**
 * Badge com tooltip para Rouparia
 */
export function LaundryStatusTooltip({
  status,
}: {
  status: "disponivel" | "em_lavagem" | "em_reparo" | "descarte";
}) {
  const tooltips = {
    disponivel: "Pronto para uso - em estoque",
    em_lavagem: "Está sendo lavado",
    em_reparo: "Aguardando reparo",
    descarte: "Marcado para descarte de material",
  };

  const statusMap: Record<string, "concluido" | "em_progresso" | "pendente"> = {
    disponivel: "concluido",
    em_lavagem: "em_progresso",
    em_reparo: "pendente",
    descarte: "pendente",
  };

  return (
    <StatusTooltip
      status={statusMap[status] as any}
      label={status.charAt(0).toUpperCase() + status.slice(1).replace("_", " ")}
      tooltip={tooltips[status as keyof typeof tooltips] || ""}
    />
  );
}
