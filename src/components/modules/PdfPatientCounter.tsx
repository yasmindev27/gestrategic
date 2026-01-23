import { useState, useRef } from 'react';
import { FileUp, FileText, Users, Loader2, X, AlertCircle, Download, CheckCircle, XCircle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { exportToCSV, exportToPDF } from '@/lib/export-utils';
import { useUserRole } from '@/hooks/useUserRole';

export interface PatientResult {
  nome: string;
  prontuario: string | null;
  linha: number;
  existeNoSistema: boolean;
  status: 'encontrado' | 'faltando';
}

export interface AnalysisResult {
  success: boolean;
  totalPdf: number;
  totalSistema: number;
  encontrados: number;
  faltando: number;
  pacientes: PatientResult[];
  error?: string;
}

interface PdfPatientCounterProps {
  onAnalysisComplete?: (result: AnalysisResult | null) => void;
  onLaunchComplete?: () => void;
}

export function PdfPatientCounter({ onAnalysisComplete, onLaunchComplete }: PdfPatientCounterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('todos');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { userId } = useUserRole();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Accept PDF files
    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      setError('Por favor, selecione um arquivo PDF.');
      toast({
        title: 'Erro',
        description: 'O arquivo deve ser PDF.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    setError(null);
    setFileName(file.name);
    setResult(null);

    try {
      // Create FormData with the file
      const formData = new FormData();
      formData.append('file', file);

      // Call the edge function
      const { data, error: fnError } = await supabase.functions.invoke('processar-pdf-salus', {
        body: formData,
      });

      if (fnError) {
        throw new Error(fnError.message || 'Erro ao processar PDF');
      }

      if (!data.success) {
        throw new Error(data.error || 'Erro ao analisar PDF');
      }

      const analysisResult = data as AnalysisResult;
      setResult(analysisResult);
      onAnalysisComplete?.(analysisResult);
      
      toast({
        title: 'Análise concluída!',
        description: `${data.totalPdf} paciente(s) no PDF. ${data.faltando} faltando no sistema.`,
      });
    } catch (err) {
      console.error('Error processing file:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro ao processar o arquivo';
      setError(errorMessage);
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExportMissingCSV = () => {
    if (!result || result.faltando === 0) return;

    const faltando = result.pacientes.filter(p => p.status === 'faltando');
    
    exportToCSV({
      title: 'Pacientes Faltando no Sistema',
      headers: ['Nº', 'Nome do Paciente', 'Prontuário'],
      rows: faltando.map((p, i) => [i + 1, p.nome, p.prontuario || '-']),
      fileName: 'pacientes_faltando',
    });

    toast({
      title: 'Exportado!',
      description: `${faltando.length} paciente(s) faltando exportado(s) para CSV.`,
    });
  };

  const handleExportMissingPDF = () => {
    if (!result || result.faltando === 0) return;

    const faltando = result.pacientes.filter(p => p.status === 'faltando');
    
    exportToPDF({
      title: 'Pacientes Faltando no Sistema',
      headers: ['Nº', 'Nome do Paciente', 'Prontuário'],
      rows: faltando.map((p, i) => [i + 1, p.nome, p.prontuario || '-']),
      fileName: 'pacientes_faltando',
      orientation: 'portrait',
    });

    toast({
      title: 'Exportado!',
      description: `${faltando.length} paciente(s) faltando exportado(s) para PDF.`,
    });
  };

  const handleLaunchMissing = async () => {
    if (!result || result.faltando === 0 || !userId) return;

    setIsLaunching(true);
    try {
      const faltando = result.pacientes.filter(p => p.status === 'faltando');
      
      // Insert all missing patients
      const inserts = faltando.map(p => ({
        paciente_nome: p.nome,
        numero_prontuario: p.prontuario || `SALUS-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        registrado_recepcao_por: userId,
        registrado_recepcao_em: new Date().toISOString(),
        status: 'pendente',
        observacao_classificacao: 'Falta prontuário físico - Importado via Salus',
      }));

      const { error: insertError } = await supabase
        .from('saida_prontuarios')
        .insert(inserts);

      if (insertError) throw insertError;

      toast({
        title: 'Lançamento concluído!',
        description: `${faltando.length} paciente(s) faltante(s) foram adicionados à lista de prontuários faltantes.`,
      });

      // Notify parent to refresh data
      onLaunchComplete?.();

      // Close dialog and reset
      handleClose();
    } catch (err) {
      console.error('Error launching missing:', err);
      toast({
        title: 'Erro',
        description: 'Erro ao lançar pacientes faltantes.',
        variant: 'destructive',
      });
    } finally {
      setIsLaunching(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setFileName('');
    setError(null);
    setActiveTab('todos');
    onAnalysisComplete?.(null);
  };

  const handleClose = () => {
    setIsOpen(false);
    handleReset();
  };

  const getFilteredPatients = () => {
    if (!result) return [];
    switch (activeTab) {
      case 'faltando':
        return result.pacientes.filter(p => p.status === 'faltando');
      case 'encontrados':
        return result.pacientes.filter(p => p.status === 'encontrado');
      default:
        return result.pacientes;
    }
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
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Importar Lista do Salus - Análise de Pacientes
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* File Upload Area */}
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 transition-colors hover:border-primary/50">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileChange}
              className="hidden"
              id="pdf-upload"
              disabled={isProcessing}
            />
            <label
              htmlFor="pdf-upload"
              className={`flex flex-col items-center justify-center cursor-pointer w-full ${isProcessing ? 'pointer-events-none' : ''}`}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-10 w-10 text-primary animate-spin mb-2" />
                  <p className="text-sm text-muted-foreground">Processando PDF via IA...</p>
                  <p className="text-xs text-muted-foreground mt-1">Isso pode levar alguns segundos</p>
                </>
              ) : (
                <>
                  <FileUp className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">Clique para selecionar o PDF do Salus</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    O sistema irá extrair os pacientes e comparar com os registros existentes
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

          {/* Results Summary */}
          {result && result.success && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="bg-muted/50">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-foreground">{result.totalPdf}</p>
                    <p className="text-xs text-muted-foreground">Total no PDF</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/50">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-foreground">{result.totalSistema}</p>
                    <p className="text-xs text-muted-foreground">No Sistema</p>
                  </CardContent>
                </Card>
                <Card className="bg-success/10">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-success">{result.encontrados}</p>
                    <p className="text-xs text-muted-foreground">Encontrados</p>
                  </CardContent>
                </Card>
                <Card className="bg-destructive/10">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-destructive">{result.faltando}</p>
                    <p className="text-xs text-muted-foreground">Faltando</p>
                  </CardContent>
                </Card>
              </div>

              {/* Tabs for filtering */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="todos">
                    Todos ({result.totalPdf})
                  </TabsTrigger>
                  <TabsTrigger value="faltando" className="text-destructive data-[state=active]:text-destructive">
                    Faltando ({result.faltando})
                  </TabsTrigger>
                  <TabsTrigger value="encontrados" className="text-success data-[state=active]:text-success">
                    Encontrados ({result.encontrados})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="mt-4">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {fileName}
                          </span>
                        </div>
                        <Badge variant="secondary">
                          <Users className="h-3 w-3 mr-1" />
                          {getFilteredPatients().length} paciente(s)
                        </Badge>
                      </div>

                      <ScrollArea className="h-[250px] pr-4">
                        <div className="space-y-2">
                          {getFilteredPatients().map((patient, index) => (
                            <div
                              key={index}
                              className={`flex items-center justify-between p-3 rounded-md ${
                                patient.status === 'faltando' 
                                  ? 'bg-destructive/10 border border-destructive/20' 
                                  : 'bg-success/10 border border-success/20'
                              }`}
                            >
                              <div className="flex-1">
                                <span className="text-sm font-medium">{index + 1}. {patient.nome}</span>
                                {patient.prontuario && (
                                  <span className="text-xs text-muted-foreground ml-2">
                                    (Prontuário: {patient.prontuario})
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {patient.status === 'faltando' ? (
                                  <Badge variant="destructive" className="flex items-center gap-1">
                                    <XCircle className="h-3 w-3" />
                                    Faltando
                                  </Badge>
                                ) : (
                                  <Badge className="bg-success text-success-foreground flex items-center gap-1">
                                    <CheckCircle className="h-3 w-3" />
                                    OK
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))}
                          {getFilteredPatients().length === 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                              Nenhum paciente nesta categoria
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>

        <DialogFooter className="flex justify-between gap-2 flex-wrap">
          <div className="flex gap-2 flex-wrap">
            {result && result.faltando > 0 && (
              <>
                <Button 
                  variant="default" 
                  onClick={handleLaunchMissing}
                  disabled={isLaunching}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  {isLaunching ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Lançar Faltando ({result.faltando})
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Exportar
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={handleExportMissingCSV}>
                      <FileText className="h-4 w-4 mr-2" />
                      Exportar CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportMissingPDF}>
                      <FileText className="h-4 w-4 mr-2" />
                      Exportar PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
          <div className="flex gap-2">
            {result && (
              <Button variant="ghost" onClick={handleReset}>
                <X className="h-4 w-4 mr-2" />
                Nova Análise
              </Button>
            )}
            <Button variant="outline" onClick={handleClose}>
              Fechar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
