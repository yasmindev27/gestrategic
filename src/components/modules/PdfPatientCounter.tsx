import { useState, useRef } from 'react';
import { FileUp, FileText, Users, Loader2, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface PatientInfo {
  name: string;
  lineNumber: number;
}

export function PdfPatientCounter() {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [patients, setPatients] = useState<PatientInfo[]>([]);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const extractTextFromPdf = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }

    return fullText;
  };

  const extractPatients = (text: string): PatientInfo[] => {
    const lines = text.split('\n');
    const patients: PatientInfo[] = [];
    const processedNames = new Set<string>();

    // Patterns to identify patient names
    // Looking for lines that contain "Paciente:" or similar patterns
    const patientPatterns = [
      /paciente[:\s]+([A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ][A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇa-záéíóúâêîôûãõç\s]+)/gi,
      /nome[:\s]+([A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ][A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇa-záéíóúâêîôûãõç\s]+)/gi,
    ];

    lines.forEach((line, index) => {
      patientPatterns.forEach(pattern => {
        const matches = line.matchAll(pattern);
        for (const match of matches) {
          const name = match[1]?.trim();
          if (name && name.length > 3 && !processedNames.has(name.toLowerCase())) {
            // Filter out common non-name words
            const excludeWords = ['data', 'hora', 'setor', 'leito', 'cid', 'prontuario', 'registro', 'idade', 'sexo'];
            const isValidName = !excludeWords.some(word => 
              name.toLowerCase().includes(word)
            );
            
            if (isValidName) {
              processedNames.add(name.toLowerCase());
              patients.push({
                name: name,
                lineNumber: index + 1
              });
            }
          }
        }
      });
    });

    // If no patterns matched, try to find table-like structure
    if (patients.length === 0) {
      // Look for capitalized names in lines (typical of patient lists)
      const nameRegex = /([A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ][A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ\s]{5,50})/g;
      
      lines.forEach((line, index) => {
        const matches = line.matchAll(nameRegex);
        for (const match of matches) {
          const potentialName = match[1]?.trim();
          if (potentialName && potentialName.split(' ').length >= 2) {
            const normalizedName = potentialName.toLowerCase();
            if (!processedNames.has(normalizedName)) {
              processedNames.add(normalizedName);
              patients.push({
                name: potentialName,
                lineNumber: index + 1
              });
            }
          }
        }
      });
    }

    return patients;
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Por favor, selecione um arquivo PDF.');
      toast({
        title: 'Erro',
        description: 'O arquivo deve ser um PDF.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    setError(null);
    setFileName(file.name);
    setPatients([]);

    try {
      const text = await extractTextFromPdf(file);
      const extractedPatients = extractPatients(text);
      
      setPatients(extractedPatients);
      
      if (extractedPatients.length === 0) {
        setError('Nenhum paciente encontrado no PDF. Verifique se o arquivo contém uma coluna "Paciente" ou "Nome".');
      } else {
        toast({
          title: 'PDF processado!',
          description: `${extractedPatients.length} paciente(s) encontrado(s).`,
        });
      }
    } catch (err) {
      console.error('Error processing PDF:', err);
      setError('Erro ao processar o PDF. Verifique se o arquivo está correto.');
      toast({
        title: 'Erro',
        description: 'Erro ao processar o PDF.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleReset = () => {
    setPatients([]);
    setFileName('');
    setError(null);
  };

  const handleClose = () => {
    setIsOpen(false);
    handleReset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) handleReset();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileUp className="h-4 w-4 mr-2" />
          Importar PDF
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Contagem de Pacientes - PDF
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* File Upload Area */}
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 transition-colors hover:border-primary/50">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
              id="pdf-upload"
            />
            <label
              htmlFor="pdf-upload"
              className="flex flex-col items-center justify-center cursor-pointer w-full"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-10 w-10 text-primary animate-spin mb-2" />
                  <p className="text-sm text-muted-foreground">Processando PDF...</p>
                </>
              ) : (
                <>
                  <FileUp className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">Clique para selecionar um arquivo PDF</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    O sistema irá extrair automaticamente os nomes da coluna "Paciente"
                  </p>
                </>
              )}
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Results */}
          {fileName && patients.length > 0 && (
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                      {fileName}
                    </span>
                  </div>
                  <Badge className="bg-primary text-primary-foreground">
                    <Users className="h-3 w-3 mr-1" />
                    {patients.length} paciente(s)
                  </Badge>
                </div>

                <ScrollArea className="h-[250px] pr-4">
                  <div className="space-y-2">
                    {patients.map((patient, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                      >
                        <span className="text-sm font-medium">{patient.name}</span>
                        <Badge variant="outline" className="text-xs">
                          Linha {patient.lineNumber}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          {patients.length > 0 && (
            <Button variant="ghost" onClick={handleReset}>
              <X className="h-4 w-4 mr-2" />
              Limpar
            </Button>
          )}
          <Button variant="outline" onClick={handleClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
