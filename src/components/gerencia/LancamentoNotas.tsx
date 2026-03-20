import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  FileText, Plus, Pencil, Trash2, Search, DollarSign, CheckCircle,
  Clock, Wallet, TrendingUp, Save, Users as UsersIcon, Upload
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExportDropdown } from '@/components/ui/export-dropdown';
import { ImportDataDialog } from '@/components/gerencia/ImportDataDialog';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import { format } from 'date-fns';
import { exportToPDF } from '@/lib/export-utils';
import * as XLSX from 'xlsx';

const MESES = [
  'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
  'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO',
];

const INVOICE_STATUS = [
  'LANÇADO', 'CORREÇÃO OU DOCUMENTAÇÃO PENDENTE', 'AGUARDANDO VALIDAÇÃO DO GESTOR',
  'ENVIADO', 'NÃO RECEBIDO',
];

const PAYMENT_STATUS = [
  'PENDENTE', 'EM ANÁLISE', 'VALIDADO', 'REJEITADO', 'PAGA TOTALMENTE', 'AGUARDANDO FORNECEDOR',
];

const YEARS = [2025, 2026, 2027, 2028, 2029, 2030];

interface Fornecedor {
  id: string;
  nome: string;
  cnpj: string;
  ativo: boolean;
}

interface NotaFiscal {
  id: string;
  fornecedor_id: string | null;
  fornecedor_nome: string;
  cnpj: string;
  competencia: string;
  ano: number;
  numero_nf: string;
  data_recebimento: string | null;
  status: string;
  data_envio: string | null;
  status_pagamento: string;
  valor_nota: number;
  observacao: string | null;
  created_at: string;
}

const statusColor = (s: string) => {
  if (s === 'LANÇADO' || s === 'ENVIADO') return 'bg-emerald-500/15 text-emerald-700 border-emerald-300';
  if (s.includes('PENDENTE') || s.includes('AGUARDANDO')) return 'bg-amber-500/15 text-amber-700 border-amber-300';
  if (s === 'NÃO RECEBIDO' || s === 'REJEITADO') return 'bg-red-500/15 text-red-700 border-red-300';
  if (s === 'VALIDADO' || s === 'PAGA TOTALMENTE') return 'bg-emerald-500/15 text-emerald-700 border-emerald-300';
  if (s === 'EM ANÁLISE') return 'bg-blue-500/15 text-blue-700 border-blue-300';
  return 'bg-muted text-muted-foreground';
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export function LancamentoNotas() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { userId } = useUserRole();
  const [selectedMonth, setSelectedMonth] = useState('TODOS');
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [editingNota, setEditingNota] = useState<NotaFiscal | null>(null);

  const [notaForm, setNotaForm] = useState({
    fornecedor_id: '', fornecedor_nome: '', cnpj: '', competencia: MESES[0],
    ano: 2026, numero_nf: '', data_recebimento: '', status: 'LANÇADO',
    data_envio: '', status_pagamento: 'PENDENTE', valor_nota: 0, observacao: '',
  });

  const [supplierForm, setSupplierForm] = useState({ nome: '', cnpj: '' });
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importingFile, setImportingFile] = useState<File | null>(null);

  // Queries
  const { data: fornecedores = [] } = useQuery({
    queryKey: ['gerencia_fornecedores'],
    queryFn: async () => {
      const { data, error } = await supabase.from('gerencia_fornecedores')
        .select('*').eq('ativo', true).order('nome');
      if (error) throw error;
      return data as Fornecedor[];
    },
  });

  const { data: notas = [], isLoading } = useQuery({
    queryKey: ['gerencia_notas_fiscais'],
    queryFn: async () => {
      const { data, error } = await supabase.from('gerencia_notas_fiscais')
        .select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as NotaFiscal[];
    },
  });

  // Mutations
  const addNotaMutation = useMutation({
    mutationFn: async (form: typeof notaForm) => {
      const { error } = await supabase.from('gerencia_notas_fiscais').insert({
        fornecedor_id: form.fornecedor_id || null,
        fornecedor_nome: form.fornecedor_nome,
        cnpj: form.cnpj,
        competencia: form.competencia,
        ano: form.ano,
        numero_nf: form.numero_nf,
        data_recebimento: form.data_recebimento || null,
        status: form.status,
        data_envio: form.data_envio || null,
        status_pagamento: form.status_pagamento,
        valor_nota: form.valor_nota,
        observacao: form.observacao || null,
        created_by: userId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gerencia_notas_fiscais'] });
      toast({ title: 'Nota fiscal adicionada!' });
      setDialogOpen(false);
      resetNotaForm();
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const updateNotaMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<NotaFiscal> }) => {
      const { error } = await supabase.from('gerencia_notas_fiscais').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gerencia_notas_fiscais'] });
      toast({ title: 'Nota atualizada!' });
      setDialogOpen(false);
      setEditingNota(null);
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const deleteNotaMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('gerencia_notas_fiscais').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gerencia_notas_fiscais'] });
      toast({ title: 'Nota removida' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const addSupplierMutation = useMutation({
    mutationFn: async (form: typeof supplierForm) => {
      const { error } = await supabase.from('gerencia_fornecedores').insert({
        nome: form.nome, cnpj: form.cnpj, created_by: userId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gerencia_fornecedores'] });
      toast({ title: 'Fornecedor adicionado!' });
      setSupplierDialogOpen(false);
      setSupplierForm({ nome: '', cnpj: '' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const resetNotaForm = () => {
    setNotaForm({
      fornecedor_id: '', fornecedor_nome: '', cnpj: '', competencia: MESES[0],
      ano: 2026, numero_nf: '', data_recebimento: '', status: 'LANÇADO',
      data_envio: '', status_pagamento: 'PENDENTE', valor_nota: 0, observacao: '',
    });
    setEditingNota(null);
  };

  const handleSelectFornecedor = (id: string) => {
    const f = fornecedores.find(f => f.id === id);
    if (f) {
      setNotaForm(prev => ({ ...prev, fornecedor_id: f.id, fornecedor_nome: f.nome, cnpj: f.cnpj }));
    }
  };

  const handleEditNota = (nota: NotaFiscal) => {
    setEditingNota(nota);
    setNotaForm({
      fornecedor_id: nota.fornecedor_id || '',
      fornecedor_nome: nota.fornecedor_nome,
      cnpj: nota.cnpj,
      competencia: nota.competencia,
      ano: nota.ano,
      numero_nf: nota.numero_nf,
      data_recebimento: nota.data_recebimento || '',
      status: nota.status,
      data_envio: nota.data_envio || '',
      status_pagamento: nota.status_pagamento,
      valor_nota: nota.valor_nota,
      observacao: nota.observacao || '',
    });
    setDialogOpen(true);
  };

  const handleSubmitNota = () => {
    if (!notaForm.fornecedor_nome || !notaForm.numero_nf) {
      toast({ title: 'Erro', description: 'Preencha fornecedor e número NF.', variant: 'destructive' });
      return;
    }
    if (editingNota) {
      updateNotaMutation.mutate({ id: editingNota.id, updates: {
        fornecedor_id: notaForm.fornecedor_id || null,
        fornecedor_nome: notaForm.fornecedor_nome,
        cnpj: notaForm.cnpj,
        competencia: notaForm.competencia,
        ano: notaForm.ano,
        numero_nf: notaForm.numero_nf,
        data_recebimento: notaForm.data_recebimento || null,
        status: notaForm.status,
        data_envio: notaForm.data_envio || null,
        status_pagamento: notaForm.status_pagamento,
        valor_nota: notaForm.valor_nota,
        observacao: notaForm.observacao || null,
      }});
    } else {
      addNotaMutation.mutate(notaForm);
    }
  };

  // Filtered data
  const filteredNotas = useMemo(() => {
    return notas.filter(n => {
      if (selectedMonth !== 'TODOS' && n.competencia !== selectedMonth) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return n.fornecedor_nome.toLowerCase().includes(term) ||
          n.numero_nf.toLowerCase().includes(term) ||
          n.cnpj.includes(term);
      }
      return true;
    });
  }, [notas, selectedMonth, searchTerm]);

  // Stats
  const stats = useMemo(() => {
    const filtered = filteredNotas;
    const totalInvoices = filtered.length;
    const totalLancado = filtered.filter(n => n.status === 'LANÇADO').length;
    const totalPendente = filtered.filter(n => n.status_pagamento === 'PENDENTE').length;
    const totalPago = filtered.filter(n => n.status_pagamento === 'PAGA TOTALMENTE').length;
    const valorTotal = filtered.reduce((sum, n) => sum + Number(n.valor_nota), 0);
    const valorPago = filtered.filter(n => n.status_pagamento === 'PAGA TOTALMENTE')
      .reduce((sum, n) => sum + Number(n.valor_nota), 0);
    return { totalInvoices, totalLancado, totalPendente, totalPago, valorTotal, valorPago };
  }, [filteredNotas]);

  // Import function
  const handleImportFile = async () => {
    if (!importingFile) {
      toast({ title: 'Erro', description: 'Selecione um arquivo', variant: 'destructive' });
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        // Verificar abas disponíveis
        const sheetNames = workbook.SheetNames;
        let fornecedoresImportados = 0;
        let notasImportadas = 0;
        let erros: string[] = [];

        // 1. Importar Fornecedores
        if (sheetNames.includes('Fornecedores')) {
          const wsForncedores = workbook.Sheets['Fornecedores'];
          const dataFornecedores = XLSX.utils.sheet_to_json(wsForncedores) as any[];
          
          for (const row of dataFornecedores) {
            try {
              const nome = row.Nome || row.nome || row.NOME;
              const cnpj = row.CNPJ || row.cnpj;
              
              if (!nome || !cnpj) {
                erros.push(`Fornecedor sem nome ou CNPJ: linha ${dataFornecedores.indexOf(row) + 2}`);
                continue;
              }

              // Verificar se já existe
              const { data: existing } = await supabase
                .from('gerencia_fornecedores')
                .select('id')
                .eq('cnpj', cnpj)
                .single();

              if (!existing) {
                const { error } = await supabase.from('gerencia_fornecedores').insert({
                  nome, cnpj, created_by: userId, ativo: true,
                });
                if (error) throw error;
                fornecedoresImportados++;
              }
            } catch (err: any) {
              erros.push(`Erro ao importar fornecedor: ${err.message}`);
            }
          }
        }

        // 2. Importar Notas Fiscais
        if (sheetNames.includes('Notas Fiscais')) {
          const wsNotas = workbook.Sheets['Notas Fiscais'];
          const dataNotas = XLSX.utils.sheet_to_json(wsNotas) as any[];
          
          for (const row of dataNotas) {
            try {
              const fornecedor_nome = row['Fornecedor'] || row['fornecedor'] || row.Fornecedor;
              const cnpj = row.CNPJ || row.cnpj;
              const numero_nf = row['Nº NF'] || row['numero_nf'] || row.numero_nf;
              const competencia = row.Competência || row.competencia;
              const ano = parseInt(row.Ano || row.ano || '2026');
              const valor_nota = parseFloat(row['Valor (R$)'] || row.valor || '0');
              const status = row.Status || row.status || 'LANÇADO';
              const status_pagamento = row['Status Pagamento'] || row.pagamento || 'PENDENTE';
              
              if (!fornecedor_nome || !numero_nf) {
                erros.push(`Nota sem fornecedor ou NF: linha ${dataNotas.indexOf(row) + 2}`);
                continue;
              }

              const { error } = await supabase.from('gerencia_notas_fiscais').insert({
                fornecedor_nome,
                cnpj: cnpj || '',
                numero_nf,
                competencia: competencia || 'JANEIRO',
                ano,
                valor_nota,
                status,
                status_pagamento,
                created_by: userId,
              });
              
              if (error) throw error;
              notasImportadas++;
            } catch (err: any) {
              erros.push(`Erro ao importar nota: ${err.message}`);
            }
          }
        }

        // Atualizar dados
        queryClient.invalidateQueries({ queryKey: ['gerencia_fornecedores'] });
        queryClient.invalidateQueries({ queryKey: ['gerencia_notas_fiscais'] });

        setImportDialogOpen(false);
        setImportingFile(null);

        toast({
          title: 'Importação Concluída',
          description: `
✓ Fornecedores: ${fornecedoresImportados}
✓ Notas: ${notasImportadas}
${erros.length > 0 ? `⚠ Erros: ${erros.length}` : ''}
          `,
        });

        if (erros.length > 0) {
          console.warn('Erros na importação:', erros);
        }
      };
      
      reader.readAsBinaryString(importingFile);
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  // Exports
  const handleExportExcel = () => {
    const rows = filteredNotas.map(n => ({
      Fornecedor: n.fornecedor_nome, CNPJ: n.cnpj, Competência: n.competencia,
      Ano: n.ano, 'Nº NF': n.numero_nf, Status: n.status,
      'Status Pagamento': n.status_pagamento,
      'Valor (R$)': Number(n.valor_nota).toFixed(2),
      'Data Recebimento': n.data_recebimento || '-',
      'Data Envio': n.data_envio || '-',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Notas Fiscais');
    XLSX.writeFile(wb, `notas_fiscais_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast({ title: 'Excel exportado!' });
  };

  const handleExportPDF = () => {
    const headers = ['Fornecedor', 'Nº NF', 'Competência', 'Status', 'Pagamento', 'Valor'];
    const rows = filteredNotas.map(n => [
      n.fornecedor_nome, n.numero_nf, `${n.competencia}/${n.ano}`,
      n.status, n.status_pagamento, formatCurrency(Number(n.valor_nota)),
    ]);
    exportToPDF({
      title: 'Relatório de Notas Fiscais - Gerência',
      headers, rows: rows as any,
      fileName: 'relatorio_notas_fiscais',
      orientation: 'landscape',
    });
    toast({ title: 'PDF exportado!' });
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { title: 'Total de Notas', value: stats.totalInvoices, icon: FileText, className: 'text-blue-600' },
          { title: 'Lançadas', value: stats.totalLancado, icon: CheckCircle, className: 'text-emerald-600' },
          { title: 'Pendentes Pgto', value: stats.totalPendente, icon: Clock, className: 'text-amber-600' },
          { title: 'Pagas', value: stats.totalPago, icon: Wallet, className: 'text-teal-600' },
          { title: 'Valor Total', value: formatCurrency(stats.valorTotal), icon: DollarSign, className: 'text-purple-600' },
          { title: 'Valor Pago', value: formatCurrency(stats.valorPago), icon: TrendingUp, className: 'text-emerald-600' },
        ].map((card) => (
          <Card key={card.title}>
            <CardContent className="p-3 flex items-center gap-2">
              <card.icon className={`h-6 w-6 ${card.className} opacity-80 flex-shrink-0`} />
              <div className="min-w-0">
                <p className="text-lg font-bold truncate">{card.value}</p>
                <p className="text-xs text-muted-foreground truncate">{card.title}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Inner Tabs */}
      <Tabs defaultValue="notas">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <TabsList>
            <TabsTrigger value="notas" className="gap-2">
              <FileText className="h-4 w-4" /> Notas Fiscais
            </TabsTrigger>
            <TabsTrigger value="fornecedores" className="gap-2">
              <UsersIcon className="h-4 w-4" /> Fornecedores
            </TabsTrigger>
            <TabsTrigger value="valores" className="gap-2">
              <DollarSign className="h-4 w-4" /> Valores
            </TabsTrigger>
          </TabsList>

          <div className="flex gap-2 items-center flex-wrap">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos os meses</SelectItem>
                {MESES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              onClick={() => setImportDialogOpen(true)}
              className="gap-2"
            >
              <Upload className="h-4 w-4" /> Importar
            </Button>
            <ExportDropdown onExportExcel={handleExportExcel} onExportPDF={handleExportPDF} label="Exportar" />
            <Button onClick={() => { resetNotaForm(); setDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Nova Nota
            </Button>
          </div>
        </div>

        {/* Notas Tab */}
        <TabsContent value="notas" className="mt-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar fornecedor, NF ou CNPJ..." value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-primary/5">
                      <TableHead>Fornecedor</TableHead>
                      <TableHead>CNPJ</TableHead>
                      <TableHead>Competência</TableHead>
                      <TableHead>Nº NF</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Pagamento</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredNotas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          Nenhuma nota fiscal encontrada.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredNotas.map(nota => (
                        <TableRow key={nota.id}>
                          <TableCell className="font-medium">{nota.fornecedor_nome}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{nota.cnpj}</TableCell>
                          <TableCell>{nota.competencia}/{nota.ano}</TableCell>
                          <TableCell>{nota.numero_nf}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={statusColor(nota.status)}>{nota.status}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={statusColor(nota.status_pagamento)}>{nota.status_pagamento}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(Number(nota.valor_nota))}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditNota(nota)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => { if (confirm('Remover esta nota fiscal?')) deleteNotaMutation.mutate(nota.id); }}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fornecedores Tab */}
        <TabsContent value="fornecedores" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Fornecedores Cadastrados</CardTitle>
              <Button size="sm" onClick={() => setSupplierDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Novo Fornecedor
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-primary/5">
                    <TableHead>Nome</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fornecedores.map(f => (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium">{f.nome}</TableCell>
                      <TableCell>{f.cnpj}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 border-emerald-300">Ativo</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {fornecedores.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                        Nenhum fornecedor cadastrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Valores Tab */}
        <TabsContent value="valores" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-5 w-5" /> Editor de Valores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-primary/5">
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Nº NF</TableHead>
                    <TableHead>Competência</TableHead>
                    <TableHead>Status Pgto</TableHead>
                    <TableHead className="text-right">Valor Atual</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notas.map(nota => (
                    <ValorEditorRow key={nota.id} nota={nota} onUpdate={(id, val) =>
                      updateNotaMutation.mutate({ id, updates: { valor_nota: val } })
                    } />
                  ))}
                  {notas.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Nenhuma nota para editar.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New/Edit Nota Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingNota ? 'Editar Nota Fiscal' : 'Nova Nota Fiscal'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Fornecedor *</Label>
              <Select value={notaForm.fornecedor_id} onValueChange={handleSelectFornecedor}>
                <SelectTrigger><SelectValue placeholder="Selecionar fornecedor" /></SelectTrigger>
                <SelectContent>
                  {fornecedores.map(f => <SelectItem key={f.id} value={f.id}>{f.nome} - {f.cnpj}</SelectItem>)}
                </SelectContent>
              </Select>
              {!notaForm.fornecedor_id && (
                <Input className="mt-2" placeholder="Ou digite o nome manualmente"
                  value={notaForm.fornecedor_nome}
                  onChange={(e) => setNotaForm(p => ({ ...p, fornecedor_nome: e.target.value }))} />
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>CNPJ</Label>
                <Input value={notaForm.cnpj} onChange={(e) => setNotaForm(p => ({ ...p, cnpj: e.target.value }))} />
              </div>
              <div>
                <Label>Nº NF *</Label>
                <Input value={notaForm.numero_nf} onChange={(e) => setNotaForm(p => ({ ...p, numero_nf: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Competência</Label>
                <Select value={notaForm.competencia} onValueChange={(v) => setNotaForm(p => ({ ...p, competencia: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MESES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Ano</Label>
                <Select value={String(notaForm.ano)} onValueChange={(v) => setNotaForm(p => ({ ...p, ano: Number(v) }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data Recebimento</Label>
                <Input type="date" value={notaForm.data_recebimento}
                  onChange={(e) => setNotaForm(p => ({ ...p, data_recebimento: e.target.value }))} />
              </div>
              <div>
                <Label>Data Envio</Label>
                <Input type="date" value={notaForm.data_envio}
                  onChange={(e) => setNotaForm(p => ({ ...p, data_envio: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Status</Label>
                <Select value={notaForm.status} onValueChange={(v) => setNotaForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INVOICE_STATUS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status Pagamento</Label>
                <Select value={notaForm.status_pagamento} onValueChange={(v) => setNotaForm(p => ({ ...p, status_pagamento: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_STATUS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Valor da Nota (R$)</Label>
              <Input type="number" step="0.01" min="0" value={notaForm.valor_nota}
                onChange={(e) => setNotaForm(p => ({ ...p, valor_nota: Number(e.target.value) }))} />
            </div>
            <div>
              <Label>Observação</Label>
              <Textarea value={notaForm.observacao} rows={2}
                onChange={(e) => setNotaForm(p => ({ ...p, observacao: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmitNota} disabled={addNotaMutation.isPending || updateNotaMutation.isPending}>
              {editingNota ? 'Salvar Alterações' : 'Adicionar Nota'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Supplier Dialog */}
      <Dialog open={supplierDialogOpen} onOpenChange={setSupplierDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Fornecedor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input value={supplierForm.nome} onChange={(e) => setSupplierForm(p => ({ ...p, nome: e.target.value }))} />
            </div>
            <div>
              <Label>CNPJ *</Label>
              <Input value={supplierForm.cnpj} onChange={(e) => setSupplierForm(p => ({ ...p, cnpj: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSupplierDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => {
              if (!supplierForm.nome || !supplierForm.cnpj) {
                toast({ title: 'Erro', description: 'Preencha nome e CNPJ.', variant: 'destructive' });
                return;
              }
              addSupplierMutation.mutate(supplierForm);
            }} disabled={addSupplierMutation.isPending}>
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Inline row editor for values
function ValorEditorRow({ nota, onUpdate }: { nota: NotaFiscal; onUpdate: (id: string, val: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(Number(nota.valor_nota));

  return (
    <TableRow>
      <TableCell className="font-medium">{nota.fornecedor_nome}</TableCell>
      <TableCell>{nota.numero_nf}</TableCell>
      <TableCell>{nota.competencia}/{nota.ano}</TableCell>
      <TableCell>
        <Badge variant="outline" className={statusColor(nota.status_pagamento)}>{nota.status_pagamento}</Badge>
      </TableCell>
      <TableCell className="text-right">
        {editing ? (
          <Input type="number" step="0.01" className="w-32 ml-auto" value={value}
            onChange={(e) => setValue(Number(e.target.value))} />
        ) : (
          <span className="font-medium">{formatCurrency(Number(nota.valor_nota))}</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        {editing ? (
          <Button size="sm" onClick={() => { onUpdate(nota.id, value); setEditing(false); }}>
            <Save className="h-4 w-4 mr-1" /> Salvar
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4 mr-1" /> Editar
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}

export default LancamentoNotas;
