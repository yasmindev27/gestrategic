import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Upload, Loader2, AlertCircle, Check, FileSpreadsheet, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

interface ImportarSaidasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onImportComplete: () => void;
}

interface ImportRow {
  paciente_nome: string;
  data_atendimento: string;
  nascimento_mae?: string;
  observacao?: string;
}

interface PreviewRow extends ImportRow {
  status: "novo" | "duplicado" | "erro";
  motivo?: string;
}

export const ImportarSaidasDialog = ({
  open,
  onOpenChange,
  userId,
  onImportComplete,
}: ImportarSaidasDialogProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [fileName, setFileName] = useState("");

  const resetState = () => {
    setPreview([]);
    setFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = (v: boolean) => {
    if (!v) resetState();
    onOpenChange(v);
  };

  const parseDate = (val: unknown): string | null => {
    if (!val) return null;
    if (typeof val === "number") {
      // Excel serial date
      const d = XLSX.SSF.parse_date_code(val);
      if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
    }
    const s = String(val).trim();
    // dd/mm/yyyy
    const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    // yyyy-mm-dd
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    return null;
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setIsAnalyzing(true);

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

      if (raw.length === 0) {
        toast({ title: "Planilha vazia", variant: "destructive" });
        setIsAnalyzing(false);
        return;
      }

      // Map columns (flexible header matching)
      const rows: ImportRow[] = raw.map((r) => {
        const keys = Object.keys(r);
        const find = (terms: string[]) =>
          keys.find((k) => terms.some((t) => k.toLowerCase().includes(t))) || "";

        const nomeKey = find(["paciente", "nome"]);
        const dataKey = find(["atendimento", "data"]);
        const maeKey = find(["mae", "mãe", "nascimento"]);
        const obsKey = find(["obs", "observa"]);

        return {
          paciente_nome: String(r[nomeKey] || "").trim(),
          data_atendimento: parseDate(r[dataKey]) || "",
          nascimento_mae: String(r[maeKey] || "").trim() || undefined,
          observacao: String(r[obsKey] || "").trim() || undefined,
        };
      }).filter((r) => r.paciente_nome);

      if (rows.length === 0) {
        toast({ title: "Nenhum registro válido encontrado", description: "Verifique se a planilha tem coluna 'Paciente' ou 'Nome'.", variant: "destructive" });
        setIsAnalyzing(false);
        return;
      }

      // Check duplicates against DB in batch
      const nomes = rows.map((r) => r.paciente_nome.toUpperCase());
      const { data: existentes } = await supabase
        .from("saida_prontuarios")
        .select("paciente_nome, data_atendimento")
        .in("paciente_nome", nomes)
        .eq("is_folha_avulsa", false);

      const existSet = new Set(
        (existentes || []).map((e: { paciente_nome: string | null; data_atendimento: string | null }) =>
          `${(e.paciente_nome || "").toUpperCase()}|${e.data_atendimento || ""}`
        )
      );

      // Also detect duplicates within the file itself
      const seenInFile = new Set<string>();

      const previewRows: PreviewRow[] = rows.map((r) => {
        if (!r.data_atendimento) {
          return { ...r, status: "erro" as const, motivo: "Data de atendimento inválida" };
        }
        const key = `${r.paciente_nome.toUpperCase()}|${r.data_atendimento}`;
        if (existSet.has(key)) {
          return { ...r, status: "duplicado" as const, motivo: "Já existe no sistema" };
        }
        if (seenInFile.has(key)) {
          return { ...r, status: "duplicado" as const, motivo: "Duplicado na planilha" };
        }
        seenInFile.add(key);
        return { ...r, status: "novo" as const };
      });

      setPreview(previewRows);
    } catch (err) {
      console.error(err);
      toast({ title: "Erro ao ler planilha", variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const novos = preview.filter((r) => r.status === "novo");
  const duplicados = preview.filter((r) => r.status === "duplicado");
  const erros = preview.filter((r) => r.status === "erro");

  const handleImport = async () => {
    if (novos.length === 0) return;
    setIsImporting(true);

    try {
      const BATCH = 200;
      let inserted = 0;

      for (let i = 0; i < novos.length; i += BATCH) {
        const batch = novos.slice(i, i + BATCH).map((r) => ({
          paciente_nome: r.paciente_nome.trim(),
          nascimento_mae: r.nascimento_mae || null,
          data_atendimento: r.data_atendimento,
          observacao_classificacao: r.observacao || null,
          registrado_recepcao_por: userId,
          registrado_recepcao_em: new Date().toISOString(),
          status: "aguardando_classificacao",
          is_folha_avulsa: false,
        }));

        const { error } = await supabase.from("saida_prontuarios").insert(batch);
        if (error) throw error;
        inserted += batch.length;
      }

      toast({
        title: "Importação concluída",
        description: `${inserted} registros importados com sucesso. ${duplicados.length} duplicados ignorados.`,
      });

      onImportComplete();
      handleClose(false);
    } catch (err) {
      console.error(err);
      toast({ title: "Erro na importação", variant: "destructive" });
    } finally {
      setIsImporting(false);
    }
  };

  const handleDownloadModelo = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["Paciente", "Data Atendimento", "Nascimento Mãe", "Observação"],
      ["JOÃO DA SILVA", "01/01/2026", "Maria da Silva", ""],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Modelo");
    XLSX.writeFile(wb, "modelo-importacao-saida-prontuarios.xlsx");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importação em Massa — Saída de Prontuários
          </DialogTitle>
        </DialogHeader>

        {preview.length === 0 ? (
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Envie uma planilha (.xlsx ou .csv) com as colunas: <strong>Paciente</strong>, <strong>Data Atendimento</strong>, Nascimento Mãe (opcional), Observação (opcional).
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleDownloadModelo}>
                <Download className="h-4 w-4 mr-2" />
                Baixar Modelo
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFile}
            />
            <Button
              className="w-full h-24 border-dashed border-2"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
              ) : (
                <Upload className="h-6 w-6 mr-2" />
              )}
              {isAnalyzing ? "Analisando planilha..." : "Selecionar Planilha"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Arquivo: <strong>{fileName}</strong>
            </p>

            <div className="flex gap-3 flex-wrap">
              <Badge variant="default" className="bg-success text-success-foreground">
                <Check className="h-3 w-3 mr-1" /> {novos.length} novos
              </Badge>
              {duplicados.length > 0 && (
                <Badge variant="secondary" className="bg-warning text-warning-foreground">
                  <AlertCircle className="h-3 w-3 mr-1" /> {duplicados.length} duplicados
                </Badge>
              )}
              {erros.length > 0 && (
                <Badge variant="destructive">
                  <AlertCircle className="h-3 w-3 mr-1" /> {erros.length} com erro
                </Badge>
              )}
            </div>

            <div className="max-h-[40vh] overflow-auto border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Data Atend.</TableHead>
                    <TableHead>Motivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.map((r, i) => (
                    <TableRow key={i} className={r.status === "duplicado" ? "opacity-50" : r.status === "erro" ? "bg-destructive/10" : ""}>
                      <TableCell>
                        {r.status === "novo" && <Badge className="bg-success text-success-foreground">Novo</Badge>}
                        {r.status === "duplicado" && <Badge variant="secondary">Duplicado</Badge>}
                        {r.status === "erro" && <Badge variant="destructive">Erro</Badge>}
                      </TableCell>
                      <TableCell className="font-medium">{r.paciente_nome}</TableCell>
                      <TableCell>{r.data_atendimento}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.motivo || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={resetState}>
                Nova planilha
              </Button>
              <Button onClick={handleImport} disabled={novos.length === 0 || isImporting}>
                {isImporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                Importar {novos.length} registros
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
