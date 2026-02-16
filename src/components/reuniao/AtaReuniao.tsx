import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { FileText, Download, Loader2, Sparkles, CheckCircle, ListTodo, ClipboardList } from "lucide-react";
import { createStandardPdf, savePdfWithFooter } from "@/lib/export-utils";

interface AtaReuniaoProps {
  reuniaoId: string;
  transcricao: string;
  titulo?: string;
  onBack: () => void;
}

interface AtaData {
  resumo_executivo: string;
  decisoes_tomadas: string[];
  plano_acao: { tarefa: string; responsavel: string; prazo: string }[];
}

const AtaReuniao = ({ reuniaoId, transcricao, titulo = "Reunião", onBack }: AtaReuniaoProps) => {
  const { toast } = useToast();
  const [ata, setAta] = useState<AtaData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateAta = async () => {
    if (!transcricao.trim()) {
      toast({ title: "Aviso", description: "Nenhuma transcrição disponível para gerar a ata.", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("gerar-ata-reuniao", {
        body: { transcricao, titulo, reuniaoId },
      });

      if (error) throw error;

      const ataResult: AtaData = data.ata;
      setAta(ataResult);

      // Save to database
      await supabase.from("reunioes").update({ ata_gerada: ataResult as any }).eq("id", reuniaoId);

      toast({ title: "Ata gerada", description: "A ata da reunião foi gerada com sucesso!" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message || "Falha ao gerar ata.", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const exportPdf = async () => {
    if (!ata) return;

    const { doc, logoImg } = await createStandardPdf(`Ata - ${titulo}`);
    let y = 35;

    // Resumo Executivo
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Resumo Executivo", 14, y);
    y += 7;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const resumoLines = doc.splitTextToSize(ata.resumo_executivo, 180);
    doc.text(resumoLines, 14, y);
    y += resumoLines.length * 4.5 + 8;

    // Decisões Tomadas
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Decisões Tomadas", 14, y);
    y += 7;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    ata.decisoes_tomadas.forEach((d, i) => {
      const lines = doc.splitTextToSize(`${i + 1}. ${d}`, 175);
      doc.text(lines, 16, y);
      y += lines.length * 4.5 + 2;
    });
    y += 6;

    // Plano de Ação
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Plano de Ação", 14, y);
    y += 7;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    ata.plano_acao.forEach((item, i) => {
      const text = `${i + 1}. ${item.tarefa} — Responsável: ${item.responsavel} | Prazo: ${item.prazo}`;
      const lines = doc.splitTextToSize(text, 175);
      doc.text(lines, 16, y);
      y += lines.length * 4.5 + 2;
    });

    savePdfWithFooter(doc, `Ata - ${titulo}`, `ata_reuniao_${reuniaoId.slice(0, 8)}`, logoImg);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Ata da Reunião</h2>
            <p className="text-sm text-muted-foreground">{titulo}</p>
          </div>
        </div>
        <Button variant="outline" onClick={onBack}>Voltar</Button>
      </div>

      {!ata ? (
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <Sparkles className="h-12 w-12 mx-auto text-primary" />
            <div>
              <h3 className="font-semibold text-foreground">Gerar Ata com IA</h3>
              <p className="text-sm text-muted-foreground mt-1">
                A inteligência artificial processará a transcrição e gerará um relatório estruturado.
              </p>
            </div>
            <Button onClick={generateAta} disabled={isGenerating} size="lg">
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Gerando ata...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" /> Gerar Ata
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="h-4 w-4" /> Resumo Executivo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground leading-relaxed">{ata.resumo_executivo}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle className="h-4 w-4" /> Decisões Tomadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {ata.decisoes_tomadas.map((d, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="bg-primary/10 text-primary rounded-full h-5 w-5 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-foreground">{d}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ListTodo className="h-4 w-4" /> Plano de Ação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {ata.plano_acao.map((item, i) => (
                  <div key={i} className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-foreground">{item.tarefa}</p>
                    <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                      <span>Responsável: {item.responsavel}</span>
                      <span>Prazo: {item.prazo}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Button onClick={exportPdf} className="w-full" variant="outline">
            <Download className="h-4 w-4 mr-2" /> Exportar PDF
          </Button>
        </>
      )}
    </div>
  );
};

export default AtaReuniao;
