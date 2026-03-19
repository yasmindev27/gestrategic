import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SearchableSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  items: { value: string; label: string }[];
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  allOption?: { value: string; label: string };
}

export function SearchableSelect({
  value,
  onValueChange,
  items,
  placeholder = "Selecione...",
  searchPlaceholder = "Buscar colaborador...",
  className,
  allOption,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedLabel = allOption && value === allOption.value
    ? allOption.label
    : items.find((i) => i.value === value)?.label;

  const filtered = items.filter((item) =>
    item.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal", className)}
        >
          <span className="truncate">{selectedLabel || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <div className="p-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="pl-10 h-9 text-sm"
              autoFocus
            />
          </div>
        </div>
        <ScrollArea className="max-h-60">
          <div className="p-1">
            {allOption && (
              <button
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent cursor-pointer",
                  value === allOption.value && "bg-accent"
                )}
                onClick={() => { onValueChange(allOption.value); setOpen(false); setSearch(""); }}
              >
                <Check className={cn("h-4 w-4", value === allOption.value ? "opacity-100" : "opacity-0")} />
                {allOption.label}
              </button>
            )}
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum resultado</p>
            ) : (
              filtered.map((item) => (
                <button
                  key={item.value}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent cursor-pointer",
                    value === item.value && "bg-accent"
                  )}
                  onClick={() => { onValueChange(item.value); setOpen(false); setSearch(""); }}
                >
                  <Check className={cn("h-4 w-4", value === item.value ? "opacity-100" : "opacity-0")} />
                  <span className="truncate">{item.label}</span>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
