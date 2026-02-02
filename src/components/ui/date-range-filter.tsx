import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, subDays, startOfWeek, endOfWeek } from "date-fns";

interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onClear?: () => void;
  showPresets?: boolean;
  className?: string;
}

export function DateRangeFilter({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onClear,
  showPresets = true,
  className,
}: DateRangeFilterProps) {
  const setPreset = (preset: "today" | "week" | "month" | "last30") => {
    const today = new Date();
    
    switch (preset) {
      case "today":
        const todayStr = format(today, "yyyy-MM-dd");
        onStartDateChange(todayStr);
        onEndDateChange(todayStr);
        break;
      case "week":
        onStartDateChange(format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd"));
        onEndDateChange(format(endOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd"));
        break;
      case "month":
        onStartDateChange(format(startOfMonth(today), "yyyy-MM-dd"));
        onEndDateChange(format(endOfMonth(today), "yyyy-MM-dd"));
        break;
      case "last30":
        onStartDateChange(format(subDays(today, 30), "yyyy-MM-dd"));
        onEndDateChange(format(today, "yyyy-MM-dd"));
        break;
    }
  };

  const handleClear = () => {
    onStartDateChange("");
    onEndDateChange("");
    onClear?.();
  };

  return (
    <div className={cn("flex flex-wrap items-end gap-3", className)}>
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <div className="space-y-1">
          <Label className="text-xs">Data Início</Label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="w-[140px]"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Data Fim</Label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="w-[140px]"
          />
        </div>
        {(startDate || endDate) && (
          <Button variant="ghost" size="icon" onClick={handleClear} className="h-9 w-9">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      {showPresets && (
        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={() => setPreset("today")}>
            Hoje
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPreset("week")}>
            Semana
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPreset("month")}>
            Mês
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPreset("last30")}>
            30 dias
          </Button>
        </div>
      )}
    </div>
  );
}
