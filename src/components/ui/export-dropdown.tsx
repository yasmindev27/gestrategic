import { Download, FileText, FileSpreadsheet, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ExportDropdownProps {
  onExportCSV?: () => void;
  onExportPDF?: () => void;
  onExportExcel?: () => void;
  onExportWord?: () => void;
  disabled?: boolean;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "outline" | "secondary" | "ghost";
  label?: string;
}

export function ExportDropdown({
  onExportCSV,
  onExportPDF,
  onExportExcel,
  onExportWord,
  disabled = false,
  size = "sm",
  variant = "outline",
  label = "Exportar",
}: ExportDropdownProps) {
  const hasOptions = onExportCSV || onExportPDF || onExportExcel || onExportWord;

  if (!hasOptions) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} disabled={disabled}>
          <Download className="h-4 w-4 mr-2" />
          {label}
          <ChevronDown className="h-3 w-3 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {onExportCSV && (
          <DropdownMenuItem onClick={onExportCSV}>
            <FileText className="h-4 w-4 mr-2" />
            CSV
          </DropdownMenuItem>
        )}
        {onExportExcel && (
          <DropdownMenuItem onClick={onExportExcel}>
            <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
            Excel
          </DropdownMenuItem>
        )}
        {onExportPDF && (
          <DropdownMenuItem onClick={onExportPDF}>
            <FileText className="h-4 w-4 mr-2 text-red-500" />
            PDF
          </DropdownMenuItem>
        )}
        {onExportWord && (
          <DropdownMenuItem onClick={onExportWord}>
            <FileText className="h-4 w-4 mr-2 text-blue-500" />
            Word (.docx)
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
