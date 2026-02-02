import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

type StatVariant = "default" | "primary" | "success" | "warning" | "destructive" | "info";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  variant?: StatVariant;
  onClick?: () => void;
  className?: string;
  trend?: {
    value: number;
    label?: string;
  };
}

const variantStyles: Record<StatVariant, { container: string; icon: string }> = {
  default: {
    container: "bg-muted/50",
    icon: "bg-muted text-muted-foreground",
  },
  primary: {
    container: "bg-primary/5 border-l-4 border-l-primary",
    icon: "bg-primary/10 text-primary",
  },
  success: {
    container: "bg-success/5 border-l-4 border-l-success",
    icon: "bg-success/10 text-success",
  },
  warning: {
    container: "bg-warning/5 border-l-4 border-l-warning",
    icon: "bg-warning/10 text-warning",
  },
  destructive: {
    container: "bg-destructive/5 border-l-4 border-l-destructive",
    icon: "bg-destructive/10 text-destructive",
  },
  info: {
    container: "bg-info/5 border-l-4 border-l-info",
    icon: "bg-info/10 text-info",
  },
};

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  variant = "default",
  onClick,
  className,
  trend,
}: StatCardProps) {
  const styles = variantStyles[variant];

  return (
    <Card
      className={cn(
        styles.container,
        onClick && "cursor-pointer hover:shadow-md transition-shadow",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="pt-6">
        <div className="flex items-center gap-4">
          {Icon && (
            <div className={cn("p-3 rounded-lg", styles.icon)}>
              <Icon className="h-6 w-6" />
            </div>
          )}
          <div className="flex-1">
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-sm text-muted-foreground">{title}</p>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
            {trend && (
              <p className={cn(
                "text-xs mt-1",
                trend.value > 0 ? "text-success" : trend.value < 0 ? "text-destructive" : "text-muted-foreground"
              )}>
                {trend.value > 0 ? "+" : ""}{trend.value}% {trend.label || "vs período anterior"}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
