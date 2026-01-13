import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, FileText, Download, X } from "lucide-react";

interface RelatorioIADialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  relatorio: string;
  isLoading: boolean;
  onExportPDF: () => void;
}

export const RelatorioIADialog = ({
  open,
  onOpenChange,
  relatorio,
  isLoading,
  onExportPDF,
}: RelatorioIADialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Relatório de Produtividade com IA
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Gerando relatório inteligente...</p>
            <p className="text-xs text-muted-foreground">
              Analisando dados e identificando padrões...
            </p>
          </div>
        ) : (
          <>
            <ScrollArea className="h-[60vh] pr-4">
              <div className="prose prose-sm max-w-none dark:prose-invert">
                {relatorio.split("\n").map((line, index) => {
                  // Handle headings
                  if (line.startsWith("# ")) {
                    return (
                      <h1 key={index} className="text-2xl font-bold text-foreground mt-6 mb-4">
                        {line.replace("# ", "")}
                      </h1>
                    );
                  }
                  if (line.startsWith("## ")) {
                    return (
                      <h2 key={index} className="text-xl font-semibold text-foreground mt-5 mb-3 border-b pb-2">
                        {line.replace("## ", "")}
                      </h2>
                    );
                  }
                  if (line.startsWith("### ")) {
                    return (
                      <h3 key={index} className="text-lg font-medium text-foreground mt-4 mb-2">
                        {line.replace("### ", "")}
                      </h3>
                    );
                  }
                  // Handle bullet points
                  if (line.startsWith("- ") || line.startsWith("• ")) {
                    return (
                      <li key={index} className="ml-4 text-foreground/90">
                        {line.replace(/^[-•] /, "")}
                      </li>
                    );
                  }
                  // Handle numbered lists
                  if (/^\d+\. /.test(line)) {
                    return (
                      <li key={index} className="ml-4 text-foreground/90 list-decimal">
                        {line.replace(/^\d+\. /, "")}
                      </li>
                    );
                  }
                  // Handle bold text with **
                  if (line.includes("**")) {
                    const parts = line.split(/\*\*(.*?)\*\*/g);
                    return (
                      <p key={index} className="text-foreground/90 my-2">
                        {parts.map((part, i) => 
                          i % 2 === 1 ? <strong key={i}>{part}</strong> : part
                        )}
                      </p>
                    );
                  }
                  // Empty lines
                  if (line.trim() === "") {
                    return <br key={index} />;
                  }
                  // Regular paragraphs
                  return (
                    <p key={index} className="text-foreground/90 my-2">
                      {line}
                    </p>
                  );
                })}
              </div>
            </ScrollArea>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                <X className="h-4 w-4 mr-2" />
                Fechar
              </Button>
              <Button onClick={onExportPDF}>
                <Download className="h-4 w-4 mr-2" />
                Exportar PDF
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
