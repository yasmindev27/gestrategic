import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle } from "lucide-react";
import * as XLSX from "xlsx";

interface ImportarDISCResultadosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

interface DISCRecord {
  nome_completo: string;
  cargo_atual: string;
  setor: string;
  tempo_atuacao: string;
  formacao: string;
  experiencia_lideranca: string;
  score_d: number;
  score_i: number;
  score_s: number;
  score_c: number;
  perfil_predominante: string;
  perfil_secundario: string;
  leadership_score: number;
}

export function ImportarDISCResultadosDialog({ 
  open, 
  onOpenChange, 
  onImportComplete 
}: ImportarDISCResultadosDialogProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [records, setRecords] = useState<DISCRecord[]>([]);
  const [fileName, setFileName] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ inserted: number; errors?: string[] } | null>(null);

  const normalizeText = (text: string): string => {
    return String(text || "").trim();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setResult(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array", raw: false });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      
      // Parse as text with delimiter ";" for CSV import
      const json = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false }) as any[];

      const parsed: DISCRecord[] = [];
      const validSetores = [
        "Administrativo",
        "Internação",
        "UPA",
        "Raio X",
        "Farmácia",
        "Recepção/Acolhimento",
        "Corpo clinico",
        "Sala de Emergência/Reanimação",
        "Radiologia/Imagem",
        "Liderança",
        "Líder",
        "Líder noturno",
      ];

      for (const row of json) {
        if (!row || !row.nome_completo) continue;

        const nomeCompleto = normalizeText(row.nome_completo);
        if (!nomeCompleto || nomeCompleto.length < 3) continue;

        const scoreD = Number(row.score_d) || 0;
        const scoreI = Number(row.score_i) || 0;
        const scoreS = Number(row.score_s) || 0;
        const scoreC = Number(row.score_c) || 0;
        const leadershipScore = Number(row.leadership_score) || 0;

        // Validate score ranges
        if (scoreD < 0 || scoreD > 24) continue;
        if (scoreI < 0 || scoreI > 24) continue;
        if (scoreS < 0 || scoreS > 24) continue;
        if (scoreC < 0 || scoreC > 24) continue;
        if (leadershipScore < 10 || leadershipScore > 50) continue;

        parsed.push({
          nome_completo: nomeCompleto,
          cargo_atual: normalizeText(row.cargo_atual),
          setor: normalizeText(row.setor),
          tempo_atuacao: normalizeText(row.tempo_atuacao),
          formacao: normalizeText(row.formacao),
          experiencia_lideranca: normalizeText(row.experiencia_lideranca),
          score_d: scoreD,
          score_i: scoreI,
          score_s: scoreS,
          score_c: scoreC,
          perfil_predominante: normalizeText(row.perfil_predominante),
          perfil_secundario: normalizeText(row.perfil_secundario),
          leadership_score: leadershipScore,
        });
      }

      setRecords(parsed);
      toast({
        title: "Arquivo processado",
        description: `${parsed.length} registros DISC encontrados para importação`,
      });
    } catch (error) {
      toast({
        title: "Erro ao ler arquivo",
        description: "Verifique se o arquivo está no formato correto (.xlsx ou .csv)",
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

      // Insert records directly into disc_results table
      const { error } = await supabase
        .from("disc_results")
        .insert(records.map(record => ({
          ...record,
          created_by: session.user.id,
        })));

      setProgress(90);

      if (error) {
        throw new Error(error.message);
      }

      setResult({ inserted: records.length });
      setProgress(100);

      toast({
        title: "Importação concluída com sucesso",
        description: `${records.length} resultados DISC importados`,
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
            Importar Resultados DISC
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
                Clique para selecionar o arquivo .xlsx ou .csv
              </p>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          {/* Preview */}
          {records.length > 0 && !result && (
            <div className="text-sm space-y-2 p-3 bg-muted rounded-lg">
              <p className="font-medium">Amostra dos registros:</p>
              <div className="max-h-48 overflow-y-auto text-xs">
                {records.slice(0, 3).map((record, idx) => (
                  <div key={idx} className="border-b last:border-0 pb-2 mb-2">
                    <p>
                      <strong>{record.nome_completo}</strong> - {record.cargo_atual}
                    </p>
                    <p className="text-muted-foreground">
                      Scores: D={record.score_d}, I={record.score_i}, S={record.score_s}, C={record.score_c} | Leadership: {record.leadership_score}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Progress */}
          {isImporting && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-xs text-muted-foreground text-center">{progress}%</p>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-green-900">
                  {result.inserted} resultados importados com sucesso
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Fechar
          </Button>
          {!result && (
            <Button
              onClick={handleImport}
              disabled={records.length === 0 || isImporting}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              {isImporting ? "Importando..." : "Importar"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
