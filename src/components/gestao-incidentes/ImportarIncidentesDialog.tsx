import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle } from "lucide-react";
import * as XLSX from "xlsx";

interface ImportarIncidentesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

interface ParsedRecord {
  data_abertura: string;
  paciente_nome: string;
  data_nascimento: string;
  prontuario: string;
  data_ocorrido: string;
  setor_notificante: string;
  setor_notificado: string;
  descricao: string;
  correcao: string;
  classificacao_evento: string;
  dano_qual: string;
  assinatura_notificante: string;
  assinatura_gestor: string;
}

export function ImportarIncidentesDialog({ open, onOpenChange, onImportComplete }: ImportarIncidentesDialogProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [records, setRecords] = useState<ParsedRecord[]>([]);
  const [fileName, setFileName] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ inserted: number; errors?: string[] } | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setResult(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

      // Skip header row, parse records
      const parsed: ParsedRecord[] = [];
      for (let i = 1; i < json.length; i++) {
        const row = json[i];
        if (!row || row.length < 9) continue;

        const descricao = String(row[8] || "").trim();
        if (!descricao || descricao.length < 5 || descricao === ".") continue;

        // Handle Excel serial dates
        const formatExcelDate = (val: any): string => {
          if (!val) return "";
          if (typeof val === "number") {
            // Excel serial date
            const date = XLSX.SSF.parse_date_code(val);
            if (date) {
              return `${date.d}/${date.m}/${date.y} ${date.H || 0}:${String(date.M || 0).padStart(2, "0")}`;
            }
          }
          return String(val);
        };

        parsed.push({
          data_abertura: formatExcelDate(row[1]),
          paciente_nome: String(row[2] || "").trim(),
          data_nascimento: formatExcelDate(row[3]),
          prontuario: String(row[4] || "").trim(),
          data_ocorrido: formatExcelDate(row[5]),
          setor_notificante: String(row[6] || "").trim(),
          setor_notificado: String(row[7] || "").trim(),
          descricao,
          correcao: String(row[9] || "").trim(),
          classificacao_evento: String(row[10] || "").trim(),
          dano_qual: String(row[11] || "").trim(),
          assinatura_notificante: String(row[12] || "").trim(),
          assinatura_gestor: String(row[13] || "").trim(),
        });
      }

      setRecords(parsed);
      toast({
        title: "Arquivo processado",
        description: `${parsed.length} registros encontrados para importação`,
      });
    } catch (error) {
      toast({
        title: "Erro ao ler arquivo",
        description: "Verifique se o arquivo está no formato correto (.xlsx)",
        variant: "destructive",
      });
    }
  };

  const handleImport = async () => {
    if (records.length === 0) return;

    setIsImporting(true);
    setProgress(10);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      setProgress(30);

      const response = await supabase.functions.invoke("importar-incidentes", {
        body: { records },
      });

      setProgress(90);

      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data;
      setResult({ inserted: data.inserted, errors: data.errors });
      setProgress(100);

      toast({
        title: "Importação concluída",
        description: `${data.inserted} de ${records.length} incidentes importados com sucesso`,
      });

      onImportComplete();
    } catch (error: any) {
      toast({
        title: "Erro na importação",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setRecords([]);
    setFileName("");
    setResult(null);
    setProgress(0);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Importar Incidentes (XLSX)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* File input */}
          <div
            className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <FileSpreadsheet className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            {fileName ? (
              <div>
                <p className="text-sm font-medium">{fileName}</p>
                <Badge variant="outline" className="mt-1">
                  {records.length} registros
                </Badge>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Clique para selecionar o arquivo .xlsx
              </p>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          {/* Preview */}
          {records.length > 0 && !result && (
            <div className="text-sm space-y-1 p-3 bg-muted rounded-lg">
              <p><strong>{records.length}</strong> incidentes prontos para importação</p>
              <p className="text-muted-foreground text-xs">
                Colunas: Data, Paciente, Setor, Descrição, Classificação, etc.
              </p>
            </div>
          )}

          {/* Progress */}
          {isImporting && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                Importando incidentes...
              </p>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="p-4 rounded-lg bg-green-50 border border-green-200 space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <p className="font-medium text-green-800">
                  {result.inserted} incidentes importados com sucesso
                </p>
              </div>
              {result.errors && result.errors.length > 0 && (
                <div className="flex items-start gap-2 mt-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div className="text-xs text-yellow-800">
                    {result.errors.map((e, i) => <p key={i}>{e}</p>)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {result ? "Fechar" : "Cancelar"}
          </Button>
          {!result && (
            <Button 
              onClick={handleImport} 
              disabled={records.length === 0 || isImporting}
            >
              {isImporting ? "Importando..." : `Importar ${records.length} Registros`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
