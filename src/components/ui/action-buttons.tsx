import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Eye, 
  Check, 
  X, 
  Search,
  Filter,
  RefreshCw,
  Download,
  Upload,
  LucideIcon 
} from "lucide-react";

type ActionType = 
  | "add" 
  | "edit" 
  | "delete" 
  | "view" 
  | "confirm" 
  | "cancel" 
  | "search"
  | "filter"
  | "refresh"
  | "download"
  | "upload";

interface ActionButtonProps {
  type: ActionType;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  label?: string;
  showLabel?: boolean;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "outline" | "ghost" | "secondary" | "destructive";
  className?: string;
}

const actionConfig: Record<ActionType, { 
  icon: LucideIcon; 
  label: string;
  defaultVariant: "default" | "outline" | "ghost" | "secondary" | "destructive";
}> = {
  add: { icon: Plus, label: "Novo", defaultVariant: "default" },
  edit: { icon: Pencil, label: "Editar", defaultVariant: "ghost" },
  delete: { icon: Trash2, label: "Excluir", defaultVariant: "ghost" },
  view: { icon: Eye, label: "Visualizar", defaultVariant: "outline" },
  confirm: { icon: Check, label: "Confirmar", defaultVariant: "default" },
  cancel: { icon: X, label: "Cancelar", defaultVariant: "outline" },
  search: { icon: Search, label: "Buscar", defaultVariant: "outline" },
  filter: { icon: Filter, label: "Filtrar", defaultVariant: "outline" },
  refresh: { icon: RefreshCw, label: "Atualizar", defaultVariant: "outline" },
  download: { icon: Download, label: "Baixar", defaultVariant: "outline" },
  upload: { icon: Upload, label: "Enviar", defaultVariant: "outline" },
};

export function ActionButton({
  type,
  onClick,
  disabled = false,
  loading = false,
  label,
  showLabel = true,
  size = "sm",
  variant,
  className,
}: ActionButtonProps) {
  const config = actionConfig[type];
  const Icon = config.icon;
  const buttonVariant = variant || config.defaultVariant;
  const displayLabel = label || config.label;

  return (
    <Button
      variant={buttonVariant}
      size={size}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        type === "delete" && "text-destructive hover:text-destructive",
        className
      )}
    >
      <Icon className={cn(
        "h-4 w-4",
        showLabel && "mr-2",
        loading && type === "refresh" && "animate-spin"
      )} />
      {showLabel && displayLabel}
    </Button>
  );
}

// Botões de ação em linha para tabelas
interface TableActionsProps {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
}

export function TableActions({ onView, onEdit, onDelete, className }: TableActionsProps) {
  return (
    <div className={cn("flex gap-1 justify-end", className)}>
      {onView && (
        <ActionButton type="view" onClick={onView} showLabel={false} size="icon" />
      )}
      {onEdit && (
        <ActionButton type="edit" onClick={onEdit} showLabel={false} size="icon" />
      )}
      {onDelete && (
        <ActionButton type="delete" onClick={onDelete} showLabel={false} size="icon" />
      )}
    </div>
  );
}

// Componente para header de seção com título e ações
interface SectionHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export function SectionHeader({ title, description, children, className }: SectionHeaderProps) {
  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4", className)}>
      <div>
        <h2 className="text-2xl font-bold text-foreground">{title}</h2>
        {description && (
          <p className="text-muted-foreground">{description}</p>
        )}
      </div>
      {children && (
        <div className="flex flex-wrap items-center gap-2">
          {children}
        </div>
      )}
    </div>
  );
}
