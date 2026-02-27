import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  color: "primary" | "secondary" | "warning" | "info";
}

const colorMap = {
  primary: "bg-primary/10 text-primary",
  secondary: "bg-secondary/10 text-secondary",
  warning: "bg-amber-500/10 text-amber-600",
  info: "bg-blue-500/10 text-blue-600",
};

export function StatCard({ title, value, icon: Icon, color }: StatCardProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="flex items-center gap-4">
        <div className={`rounded-lg p-3 ${colorMap[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
        </div>
      </div>
    </div>
  );
}
