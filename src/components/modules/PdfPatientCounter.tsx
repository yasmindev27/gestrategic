import { useState, useRef } from 'react';
import { FileUp, FileText, Users, Loader2, X, AlertCircle, Download } from 'lucide-react';
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
  const [rawText, setRawText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const extractPatients = (text: string): PatientInfo[] => {
    const lines = text.split('\n');
    const patients: PatientInfo[] = [];
    const processedNames = new Set<string>();

    // Patterns to identify patient names
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

    // Fallback: Look for capitalized names in lines
    if (patients.length === 0) {
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

    // Accept both PDF and TXT files
    const validTypes = ['application/pdf', 'text/plain'];
    if (!validTypes.includes(file.type) && !file.name.endsWith('.txt')) {
      setError('Por favor, selecione um arquivo PDF ou TXT.');
      toast({
        title: 'Erro',
        description: 'O arquivo deve ser PDF ou TXT.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    setError(null);
    setFileName(file.name);
    setPatients([]);
    setRawText('');

    try {
      let text = '';
      
      if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        // Read TXT file directly
        text = await file.text();
      } else {
        // For PDF, we'll inform the user to convert first
        setError('Para arquivos PDF, por favor copie o conteúdo e cole em um arquivo TXT, ou exporte como texto primeiro.');
        setIsProcessing(false);
        return;
      }

      setRawText(text);
      const extractedPatients = extractPatients(text);
      
      setPatients(extractedPatients);
      
      if (extractedPatients.length === 0) {
        setError('Nenhum paciente encontrado. Verifique se o arquivo contém uma coluna "Paciente" ou "Nome".');
      } else {
        toast({
          title: 'Arquivo processado!',
          description: `${extractedPatients.length} paciente(s) encontrado(s).`,
        });
      }
    } catch (err) {
      console.error('Error processing file:', err);
      setError('Erro ao processar o arquivo. Verifique se o arquivo está correto.');
      toast({
        title: 'Erro',
        description: 'Erro ao processar o arquivo.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExportPatients = () => {
    if (patients.length === 0) return;

    const csvContent = [
      'Número,Nome do Paciente',
      ...patients.map((p, i) => `${i + 1},"${p.name}"`)
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `pacientes_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    toast({
      title: 'Exportado!',
      description: `${patients.length} paciente(s) exportado(s) para CSV.`,
    });
  };

  const handleReset = () => {
    setPatients([]);
    setFileName('');
    setError(null);
    setRawText('');
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
          Importar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Contagem de Pacientes - Importar Arquivo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* File Upload Area */}
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 transition-colors hover:border-primary/50">
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.csv"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="flex flex-col items-center justify-center cursor-pointer w-full"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-10 w-10 text-primary animate-spin mb-2" />
                  <p className="text-sm text-muted-foreground">Processando arquivo...</p>
                </>
              ) : (
                <>
                  <FileUp className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">Clique para selecionar um arquivo TXT</p>
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
                        <span className="text-sm font-medium">{index + 1}. {patient.name}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="flex justify-between gap-2">
          {patients.length > 0 && (
            <>
              <Button variant="outline" onClick={handleExportPatients}>
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
              <Button variant="ghost" onClick={handleReset}>
                <X className="h-4 w-4 mr-2" />
                Limpar
              </Button>
            </>
          )}
          <Button variant="outline" onClick={handleClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
