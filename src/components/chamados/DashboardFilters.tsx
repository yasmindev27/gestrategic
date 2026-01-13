import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  Filter, 
  CalendarIcon, 
  X,
  Download,
  FileText,
  FileSpreadsheet,
  Sparkles,
} from "lucide-react";
import { format, subDays, startOfMonth, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { DashboardFilters as Filters, statusLabels, categoriaLabels } from "./types";

interface DashboardFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  atendentes: { id: string; nome: string }[];
  categorias: string[];
  onExportPDF: () => void;
  onExportExcel: () => void;
  onGerarRelatorioIA: () => void;
  isExporting: boolean;
  isGeneratingReport: boolean;
}

const periodoOptions = [
  { value: "hoje", label: "Hoje" },
  { value: "7dias", label: "Últimos 7 dias" },
  { value: "30dias", label: "Últimos 30 dias" },
  { value: "mes_atual", label: "Mês atual" },
  { value: "personalizado", label: "Período personalizado" },
];

export const DashboardFiltersComponent = ({
  filters,
  onFiltersChange,
  atendentes,
  categorias,
  onExportPDF,
  onExportExcel,
  onGerarRelatorioIA,
  isExporting,
  isGeneratingReport,
}: DashboardFiltersProps) => {
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handlePeriodoChange = (value: string) => {
    const today = new Date();
    let dataInicio: Date | null = null;
    let dataFim: Date | null = today;

    switch (value) {
      case "hoje":
        dataInicio = today;
        break;
      case "7dias":
        dataInicio = subDays(today, 7);
        break;
      case "30dias":
        dataInicio = subDays(today, 30);
        break;
      case "mes_atual":
        dataInicio = startOfMonth(today);
        break;
      case "personalizado":
        dataInicio = filters.dataInicio;
        dataFim = filters.dataFim;
        setShowDatePicker(true);
        break;
    }

    onFiltersChange({
      ...filters,
      periodo: value,
      dataInicio,
      dataFim,
    });
  };

  const clearFilters = () => {
    const today = new Date();
    onFiltersChange({
      periodo: "30dias",
      dataInicio: subDays(today, 30),
      dataFim: today,
      atendente: "todos",
      categoria: "todos",
      status: "todos",
    });
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-wrap gap-4 items-end">
          {/* Período */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Período</Label>
            <Select value={filters.periodo} onValueChange={handlePeriodoChange}>
              <SelectTrigger className="w-[180px]">
                <CalendarIcon className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {periodoOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Pickers for Custom Period */}
          {filters.periodo === "personalizado" && (
            <>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">De</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dataInicio ? format(filters.dataInicio, "dd/MM/yyyy") : "Selecionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filters.dataInicio || undefined}
                      onSelect={(date) => onFiltersChange({ ...filters, dataInicio: date || null })}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Até</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dataFim ? format(filters.dataFim, "dd/MM/yyyy") : "Selecionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filters.dataFim || undefined}
                      onSelect={(date) => onFiltersChange({ ...filters, dataFim: date || null })}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </>
          )}

          {/* Atendente */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Atendente</Label>
            <Select 
              value={filters.atendente} 
              onValueChange={(v) => onFiltersChange({ ...filters, atendente: v })}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {atendentes.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Categoria */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Categoria</Label>
            <Select 
              value={filters.categoria} 
              onValueChange={(v) => onFiltersChange({ ...filters, categoria: v })}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                {categorias.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {categoriaLabels[cat] || cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select 
              value={filters.status} 
              onValueChange={(v) => onFiltersChange({ ...filters, status: v })}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {Object.entries(statusLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Clear Filters */}
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            Limpar
          </Button>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Export Buttons */}
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onExportPDF}
              disabled={isExporting}
            >
              <FileText className="h-4 w-4 mr-2" />
              PDF
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onExportExcel}
              disabled={isExporting}
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Excel
            </Button>
            <Button 
              variant="default" 
              size="sm" 
              onClick={onGerarRelatorioIA}
              disabled={isGeneratingReport}
              className="bg-gradient-to-r from-primary to-accent"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Relatório IA
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
