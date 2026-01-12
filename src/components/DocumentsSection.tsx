import { FileText, Download, Eye, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Document {
  id: number;
  title: string;
  type: string;
  date: string;
  size: string;
}

const mockDocuments: Document[] = [
  { id: 1, title: "Protocolo de Atendimento COVID-19", type: "PDF", date: "08/01/2026", size: "2.4 MB" },
  { id: 2, title: "Manual de Procedimentos", type: "PDF", date: "05/01/2026", size: "5.1 MB" },
  { id: 3, title: "Escala de Janeiro 2026", type: "XLSX", date: "02/01/2026", size: "156 KB" },
  { id: 4, title: "Relatório Mensal - Dezembro", type: "PDF", date: "01/01/2026", size: "1.8 MB" },
];

const DocumentsSection = () => {
  return (
    <Card className="shadow-sm border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2 text-foreground">
          <div className="p-1.5 bg-info/10 rounded-lg">
            <FileText className="h-4 w-4 text-info" />
          </div>
          Documentos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {mockDocuments.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors group"
          >
            <div className="p-2 bg-info/10 rounded-lg">
              <FileText className="h-4 w-4 text-info" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {doc.title}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium">{doc.type}</span>
                <span>•</span>
                <span>{doc.size}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {doc.date}
                </span>
              </div>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                <Eye className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default DocumentsSection;