import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchableCheckboxListProps {
  items: { id: string; label: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
  columns?: number;
}

export function SearchableCheckboxList({
  items,
  selected,
  onChange,
  placeholder = "Buscar...",
  className,
  columns = 3,
}: SearchableCheckboxListProps) {
  const [search, setSearch] = useState("");

  const filtered = items.filter((item) =>
    item.label.toLowerCase().includes(search.toLowerCase())
  );

  const gridClass =
    columns === 1 ? "grid-cols-1" :
    columns === 2 ? "grid-cols-1 sm:grid-cols-2" :
    "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <div className={cn("space-y-2", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={placeholder}
          className="pl-10 h-9 text-sm"
        />
      </div>
      <div className={cn("max-h-48 overflow-y-auto border rounded-md p-2 bg-background grid gap-1", gridClass)}>
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground col-span-full text-center py-2">Nenhum resultado encontrado</p>
        ) : (
          filtered.map((item) => (
            <label key={item.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted cursor-pointer text-sm">
              <Checkbox
                checked={selected.includes(item.id)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    onChange([...selected, item.id]);
                  } else {
                    onChange(selected.filter((id) => id !== item.id));
                  }
                }}
              />
              <span className="truncate">{item.label}</span>
            </label>
          ))
        )}
      </div>
    </div>
  );
}
