/**
 * Gestrategic — Filtro de período reutilizável
 * Componente compartilhado para filtros de data em relatórios/dashboards.
 */

import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface DateRangeFilterProps {
  from: Date;
  to: Date;
  onRangeChange: (from: Date, to: Date) => void;
  className?: string;
}

export const SharedDateRangeFilter = ({ from, to, onRangeChange, className }: DateRangeFilterProps) => {
  const [open, setOpen] = useState(false);

  const presets = [
    { label: "Hoje", days: 0 },
    { label: "7 dias", days: 7 },
    { label: "30 dias", days: 30 },
    { label: "90 dias", days: 90 },
  ];

  const applyPreset = (days: number) => {
    const now = new Date();
    const start = new Date();
    start.setDate(now.getDate() - days);
    onRangeChange(start, now);
  };

  return (
    <div className={cn("flex items-center gap-2 flex-wrap", className)}>
      {presets.map((p) => (
        <Button
          key={p.label}
          variant="outline"
          size="sm"
          onClick={() => applyPreset(p.days)}
          className="text-xs"
        >
          {p.label}
        </Button>
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 text-xs">
            <CalendarIcon className="h-3.5 w-3.5" />
            {format(from, "dd/MM", { locale: ptBR })} – {format(to, "dd/MM", { locale: ptBR })}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={{ from, to }}
            onSelect={(range) => {
              if (range?.from && range?.to) {
                onRangeChange(range.from, range.to);
                setOpen(false);
              }
            }}
            locale={ptBR}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default SharedDateRangeFilter;
