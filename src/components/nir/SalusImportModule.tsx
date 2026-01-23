import { useState, useRef } from 'react';
import { FileUp, FileText, Users, Loader2, CheckCircle, XCircle, Calendar } from 'lucide-react';
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
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { format } from 'date-fns';

interface PatientResult {
  nome: string;
  prontuario: string | null;
  linha: number;
  existeNoSistema: boolean;
  status: 'encontrado' | 'faltando' | 'cadastrado';
  dataSaida?: string;
}

interface ImportResult {
  success: boolean;
  totalPdf: number;
  totalExistentes: number;
  totalCadastrados: number;
  pacientes: PatientResult[];
  error?: string;
}

export function SalusImportModule() {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState<string | null>(null);
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

      // Call the edge function to process PDF
      const { data, error: fnError } = await supabase.functions.invoke('processar-pdf-salus', {
        body: formData,
      });

      if (fnError) {
        throw new Error(fnError.message || 'Erro ao processar PDF');
      }

      if (!data.success) {
        throw new Error(data.error || 'Erro ao analisar PDF');
      }

      // Process results and auto-register missing patients
      const pacientesProcessados: PatientResult[] = [];
      let cadastrados = 0;
      let existentes = 0;
      const dataSaidaAtual = new Date().toISOString();

      for (const paciente of data.pacientes) {
        if (paciente.status === 'encontrado') {
          // Patient already exists - mark with check
          existentes++;
          pacientesProcessados.push({
            ...paciente,
            status: 'encontrado',
          });
        } else {
          // Patient not found - auto-register with "Falta prontuário físico" status
          try {
            const { error: insertError } = await supabase
              .from('saida_prontuarios')
              .insert({
                paciente_nome: paciente.nome,
                numero_prontuario: paciente.prontuario || `SALUS-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                status: 'pendente',
                observacao_classificacao: 'Falta prontuário físico - Importado via Salus',
                registrado_recepcao_por: userId,
                registrado_recepcao_em: dataSaidaAtual,
              });

            if (insertError) {
              console.error('Erro ao cadastrar paciente:', insertError);
              pacientesProcessados.push({
                ...paciente,
                status: 'faltando',
              });
            } else {
              cadastrados++;
              pacientesProcessados.push({
                ...paciente,
                status: 'cadastrado',
                dataSaida: dataSaidaAtual,
              });
            }
          } catch (err) {
            console.error('Erro ao cadastrar paciente:', err);
            pacientesProcessados.push({
              ...paciente,
              status: 'faltando',
            });
          }
        }
      }

      const importResult: ImportResult = {
        success: true,
        totalPdf: data.totalPdf,
        totalExistentes: existentes,
        totalCadastrados: cadastrados,
        pacientes: pacientesProcessados,
      };

      setResult(importResult);

      toast({
        title: 'Importação concluída!',
        description: `${existentes} já existiam. ${cadastrados} foram cadastrados automaticamente.`,
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

  const handleReset = () => {
    setResult(null);
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
        <Button variant="default" className="gap-2">
          <FileUp className="h-4 w-4" />
          Importar Lista Salus
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Importar Lista do Salus - Cadastro Automático
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
              id="salus-pdf-upload"
              disabled={isProcessing}
            />
            <label
              htmlFor="salus-pdf-upload"
              className={`flex flex-col items-center justify-center cursor-pointer w-full ${isProcessing ? 'pointer-events-none' : ''}`}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-10 w-10 text-primary animate-spin mb-2" />
                  <p className="text-sm text-muted-foreground">Processando e cadastrando automaticamente...</p>
                  <p className="text-xs text-muted-foreground mt-1">Isso pode levar alguns segundos</p>
                </>
              ) : (
                <>
                  <FileUp className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">Clique para selecionar o PDF do Salus</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Pacientes faltantes serão cadastrados automaticamente
                  </p>
                </>
              )}
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
              <XCircle className="h-4 w-4 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Results Summary */}
          {result && result.success && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <Card className="bg-muted/50">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-foreground">{result.totalPdf}</p>
                    <p className="text-xs text-muted-foreground">Total no PDF</p>
                  </CardContent>
                </Card>
                <Card className="bg-success/10">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-success">{result.totalExistentes}</p>
                    <p className="text-xs text-muted-foreground">Já Existiam</p>
                  </CardContent>
                </Card>
                <Card className="bg-primary/10">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-primary">{result.totalCadastrados}</p>
                    <p className="text-xs text-muted-foreground">Cadastrados</p>
                  </CardContent>
                </Card>
              </div>

              {/* Patient List */}
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
                      {result.pacientes.length} paciente(s)
                    </Badge>
                  </div>

                  <ScrollArea className="h-[300px] pr-4">
                    <div className="space-y-2">
                      {result.pacientes.map((patient, index) => (
                        <div
                          key={index}
                          className={`flex items-center justify-between p-3 rounded-md ${
                            patient.status === 'encontrado' 
                              ? 'bg-success/10 border border-success/20' 
                              : patient.status === 'cadastrado'
                              ? 'bg-primary/10 border border-primary/20'
                              : 'bg-destructive/10 border border-destructive/20'
                          }`}
                        >
                          <div className="flex-1">
                            <span className="text-sm font-medium">{index + 1}. {patient.nome}</span>
                            {patient.prontuario && (
                              <span className="text-xs text-muted-foreground ml-2">
                                (Prontuário: {patient.prontuario})
                              </span>
                            )}
                            {patient.status === 'cadastrado' && patient.dataSaida && (
                              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                Data de Saída: {format(new Date(patient.dataSaida), 'dd/MM/yyyy HH:mm')}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {patient.status === 'encontrado' ? (
                              <Badge className="bg-success text-success-foreground flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Existe
                              </Badge>
                            ) : patient.status === 'cadastrado' ? (
                              <Badge className="bg-primary text-primary-foreground flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Cadastrado
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="flex items-center gap-1">
                                <XCircle className="h-3 w-3" />
                                Erro
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                      {result.pacientes.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          Nenhum paciente encontrado no PDF
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Legend */}
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-success/50"></div>
                  <span>Já existia no sistema</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-primary/50"></div>
                  <span>Cadastrado com status "Falta prontuário físico"</span>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex justify-between gap-2 flex-wrap">
          {result && (
            <Button variant="ghost" onClick={handleReset}>
              Nova Importação
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
