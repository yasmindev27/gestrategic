import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Upload, File, AlertCircle, CheckCircle2, Loader } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';

interface ImportDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: () => void;
}

interface FileData {
  name: string;
  type: 'suppliers' | 'invoices' | 'dre';
  file: File;
  preview?: string;
}

export const ImportDataDialog: React.FC<ImportDataDialogProps> = ({ 
  open, 
  onOpenChange,
  onImportComplete 
}) => {
  const { toast } = useToast();
  const [files, setFiles] = useState<FileData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importStatus, setImportStatus] = useState<{
    [key: string]: 'pending' | 'loading' | 'success' | 'error';
  }>({});
  const [importMessages, setImportMessages] = useState<{
    [key: string]: string;
  }>({});

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'suppliers' | 'invoices' | 'dre') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      toast({
        title: 'Erro',
        description: 'Por favor, selecione um arquivo CSV válido',
        variant: 'destructive',
      });
      return;
    }

    // Check if file type already exists
    const existingIndex = files.findIndex(f => f.type === type);
    if (existingIndex >= 0) {
      const newFiles = [...files];
      newFiles[existingIndex] = {
        name: file.name,
        type,
        file,
        preview: `${file.name} (${(file.size / 1024).toFixed(2)} KB)`,
      };
      setFiles(newFiles);
    } else {
      setFiles([
        ...files,
        {
          name: file.name,
          type,
          file,
          preview: `${file.name} (${(file.size / 1024).toFixed(2)} KB)`,
        },
      ]);
    }
  };

  const parseCSV = (content: string): any[] => {
    const lines = content.trim().split('\n');
    const headers = lines[0].split(';').map(h => h.trim());
    
    const data: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const values = lines[i].split(';');
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index]?.trim() || '';
      });
      data.push(row);
    }
    
    return data;
  };

  const importSuppliers = async (data: any[]) => {
    const supplierData = data.map(row => ({
      id: row.id,
      nome: row.name,
      cnpj: row.cnpj,
      ativo: row.ativo === 'true' || row.ativo === true,
      created_at: row.created_at,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('gerencia_fornecedores')
      .upsert(supplierData, { onConflict: 'id' });

    if (error) throw error;
    return `${supplierData.length} fornecedores importados`;
  };

  const importInvoices = async (data: any[]) => {
    const invoiceData = data.map(row => ({
      id: row.id,
      fornecedor_id: row.fornecedor_id,
      fornecedor_nome: row.fornecedor_nome,
      cnpj: row.cnpj,
      competencia: row.competencia,
      numero_nf: row.numero_nf,
      data_recebimento: row.data_recebimento,
      status: row.status,
      data_envio: row.data_envio || null,
      status_pagamento: row.status_pagamento,
      valor_nota: parseFloat(row.valor_nota) || 0,
      ano: parseInt(row.ano) || new Date().getFullYear(),
      created_at: row.created_at,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('gerencia_notas_fiscais')
      .upsert(invoiceData, { onConflict: 'id' });

    if (error) throw error;
    return `${invoiceData.length} notas fiscais importadas`;
  };

  const importDRE = async (data: any[]) => {
    const dreData = data.map(row => ({
      id: row.id,
      rubrica: row.rubrica,
      categoria_pai: row.categoria_pai || null,
      mes: row.mes,
      ano: parseInt(row.ano) || new Date().getFullYear(),
      valor_realizado: parseFloat(row.valor_realizado) || 0,
      valor_previsto: parseFloat(row.valor_previsto) || 0,
      created_at: row.created_at,
      updated_at: new Date().toISOString(),
    }));

    try {
      // Try to upsert using any() to bypass type checking
      const { error } = await (supabase
        .from('gerencia_dre_entries' as any)
        .upsert(dreData, { onConflict: 'id' }) as any);

      if (error) throw error;
      return `${dreData.length} lançamentos DRE importados`;
    } catch (error) {
      // If upsert fails, try insert
      const { error: insertError } = await (supabase
        .from('gerencia_dre_entries' as any)
        .insert(dreData) as any);

      if (insertError && insertError.code !== '23505') { // 23505 = unique violation
        throw insertError;
      }
      return `${dreData.length} lançamentos DRE processados`;
    }
  };

  const handleImport = async () => {
    if (files.length === 0) {
      toast({
        title: 'Erro',
        description: 'Selecione pelo menos um arquivo para importar',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setProgress(0);
    const newStatus: { [key: string]: 'pending' | 'loading' | 'success' | 'error' } = {};
    const newMessages: { [key: string]: string } = {};

    // Initialize status
    files.forEach(f => {
      newStatus[f.type] = 'pending';
    });
    setImportStatus(newStatus);

    try {
      let completed = 0;

      for (const fileData of files) {
        try {
          const newStatusCopy = { ...newStatus };
          newStatusCopy[fileData.type] = 'loading';
          setImportStatus(newStatusCopy);

          const content = await fileData.file.text();
          const parsedData = parseCSV(content);

          let message = '';
          if (fileData.type === 'suppliers') {
            message = await importSuppliers(parsedData);
          } else if (fileData.type === 'invoices') {
            message = await importInvoices(parsedData);
          } else if (fileData.type === 'dre') {
            message = await importDRE(parsedData);
          }

          newStatus[fileData.type] = 'success';
          newMessages[fileData.type] = message;

          completed++;
          setProgress((completed / files.length) * 100);
        } catch (error) {
          newStatus[fileData.type] = 'error';
          newMessages[fileData.type] = error instanceof Error ? error.message : 'Erro desconhecido';
          console.error(`Erro ao importar ${fileData.type}:`, error);
        }
      }

      setImportStatus(newStatus);
      setImportMessages(newMessages);

      const allSuccess = Object.values(newStatus).every(s => s === 'success');
      if (allSuccess) {
        toast({
          title: 'Sucesso',
          description: 'Todos os dados foram importados com sucesso!',
        });
        onImportComplete?.();
        setTimeout(() => {
          onOpenChange(false);
          setFiles([]);
          setImportStatus({});
          setImportMessages({});
          setProgress(0);
        }, 2000);
      } else {
        toast({
          title: 'Importação Parcial',
          description: 'Alguns arquivos falharam na importação',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao importar dados',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const removeFile = (type: 'suppliers' | 'invoices' | 'dre') => {
    setFiles(files.filter(f => f.type !== type));
  };

  const getFileLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      suppliers: 'Fornecedores (suppliers-export)',
      invoices: 'Notas Fiscais (invoices-export)',
      dre: 'Lançamentos DRE (dre_entries-export)',
    };
    return labels[type] || type;
  };

  const getStatusIcon = (status: 'pending' | 'loading' | 'success' | 'error') => {
    switch (status) {
      case 'loading':
        return <Loader className="w-4 h-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <File className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar Dados</DialogTitle>
          <DialogDescription>
            Selecione os arquivos CSV para importar fornecedores, notas fiscais e lançamentos DRE
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* File Upload Section */}
          {!isLoading && Object.keys(importStatus).length === 0 && (
            <div className="space-y-4">
              {/* Suppliers */}
              <div className="space-y-2">
                <Label className="font-semibold">
                  {getFileLabel('suppliers')}
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept=".csv"
                    onChange={(e) => handleFileChange(e, 'suppliers')}
                    className="flex-1"
                    disabled={isLoading}
                  />
                  {files.find(f => f.type === 'suppliers') && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeFile('suppliers')}
                    >
                      Remover
                    </Button>
                  )}
                </div>
                {files.find(f => f.type === 'suppliers') && (
                  <p className="text-xs text-gray-500">{files.find(f => f.type === 'suppliers')?.preview}</p>
                )}
              </div>

              {/* Invoices */}
              <div className="space-y-2">
                <Label className="font-semibold">
                  {getFileLabel('invoices')}
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept=".csv"
                    onChange={(e) => handleFileChange(e, 'invoices')}
                    className="flex-1"
                    disabled={isLoading}
                  />
                  {files.find(f => f.type === 'invoices') && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeFile('invoices')}
                    >
                      Remover
                    </Button>
                  )}
                </div>
                {files.find(f => f.type === 'invoices') && (
                  <p className="text-xs text-gray-500">{files.find(f => f.type === 'invoices')?.preview}</p>
                )}
              </div>

              {/* DRE */}
              <div className="space-y-2">
                <Label className="font-semibold">
                  {getFileLabel('dre')}
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept=".csv"
                    onChange={(e) => handleFileChange(e, 'dre')}
                    className="flex-1"
                    disabled={isLoading}
                  />
                  {files.find(f => f.type === 'dre') && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeFile('dre')}
                    >
                      Remover
                    </Button>
                  )}
                </div>
                {files.find(f => f.type === 'dre') && (
                  <p className="text-xs text-gray-500">{files.find(f => f.type === 'dre')?.preview}</p>
                )}
              </div>
            </div>
          )}

          {/* Loading/Status Section */}
          {(isLoading || Object.keys(importStatus).length > 0) && (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Progresso da importação</p>
                <Progress value={progress} className="w-full" />
              </div>

              <div className="space-y-2">
                {(['suppliers', 'invoices', 'dre'] as const).map(type => {
                  const fileExists = files.some(f => f.type === type);
                  const status = importStatus[type];
                  if (!fileExists) return null;

                  return (
                    <div key={type} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                      {getStatusIcon(status || 'pending')}
                      <div className="flex-1">
                        <p className="text-sm font-medium">{getFileLabel(type)}</p>
                        {importMessages[type] && (
                          <p className="text-xs text-gray-600">{importMessages[type]}</p>
                        )}
                      </div>
                      {status && (
                        <Badge
                          variant={
                            status === 'success'
                              ? 'default'
                              : status === 'error'
                              ? 'destructive'
                              : 'secondary'
                          }
                        >
                          {status === 'loading' ? 'Importando...' : status}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleImport}
            disabled={files.length === 0 || isLoading}
            className="gap-2"
          >
            <Upload className="w-4 h-4" />
            {isLoading ? 'Importando...' : 'Importar Dados'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
