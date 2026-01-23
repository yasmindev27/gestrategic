import { useState, useEffect } from 'react';
import { FileWarning, Search, Download, FileText, Calendar, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { exportToCSV, exportToPDF } from '@/lib/export-utils';

interface ProntuarioFaltante {
  id: string;
  paciente_nome: string | null;
  numero_prontuario: string;
  registrado_recepcao_em: string | null;
  created_at: string;
  observacao_classificacao: string | null;
}

export function ListaFaltantesSalus() {
  const [faltantes, setFaltantes] = useState<ProntuarioFaltante[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchFaltantes();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('faltantes-salus')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'saida_prontuarios',
          filter: 'observacao_classificacao=ilike.%Importado via Salus%'
        },
        () => {
          fetchFaltantes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchFaltantes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('saida_prontuarios')
        .select('id, paciente_nome, numero_prontuario, registrado_recepcao_em, created_at, observacao_classificacao')
        .ilike('observacao_classificacao', '%Importado via Salus%')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFaltantes(data || []);
    } catch (err) {
      console.error('Erro ao buscar faltantes:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredFaltantes = faltantes.filter((item) => {
    // Search filter
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      item.paciente_nome?.toLowerCase().includes(searchLower) ||
      item.numero_prontuario.toLowerCase().includes(searchLower);

    // Date filter
    const itemDate = item.registrado_recepcao_em
      ? new Date(item.registrado_recepcao_em)
      : new Date(item.created_at);

    const matchesDateFrom = !dateFrom || itemDate >= dateFrom;
    const matchesDateTo = !dateTo || itemDate <= new Date(dateTo.getTime() + 86400000); // Add 1 day for inclusive

    return matchesSearch && matchesDateFrom && matchesDateTo;
  });

  const clearFilters = () => {
    setSearchTerm('');
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const hasActiveFilters = searchTerm || dateFrom || dateTo;

  const getExportData = () => {
    const headers = ['Nome do Paciente', 'Data de Saída', 'Status'];
    const rows = filteredFaltantes.map((item) => [
      item.paciente_nome || '-',
      item.registrado_recepcao_em
        ? format(new Date(item.registrado_recepcao_em), "dd/MM/yyyy HH:mm")
        : '-',
      'Falta prontuário físico',
    ]);
    return { headers, rows };
  };

  const handleExportCSV = () => {
    const { headers, rows } = getExportData();
    exportToCSV({
      title: 'Prontuários Faltantes - Salus',
      headers,
      rows,
      fileName: 'prontuarios_faltantes_salus',
    });
  };

  const handleExportPDF = () => {
    const { headers, rows } = getExportData();
    exportToPDF({
      title: 'Prontuários Faltantes - Salus',
      headers,
      rows,
      fileName: 'prontuarios_faltantes_salus',
      orientation: 'portrait',
    });
  };

  const isEmpty = faltantes.length === 0;

  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <FileWarning className="h-5 w-5 text-destructive" />
            <div>
              <CardTitle className="text-destructive">
                Prontuários Faltantes - Salus
              </CardTitle>
              <CardDescription>
                Pacientes importados do Salus que não possuem prontuário físico
              </CardDescription>
            </div>
          </div>
          <Badge variant="destructive" className="w-fit">
            {filteredFaltantes.length} de {faltantes.length} registro(s)
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Carregando lista de faltantes...
          </div>
        ) : isEmpty ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileWarning className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Nenhum prontuário faltante registrado.</p>
            <p className="text-sm mt-1">Utilize a ferramenta "Importar Salus" para processar novos PDFs.</p>
          </div>
        ) : (
          <>
            {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou prontuário..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Popover open={showFilters} onOpenChange={setShowFilters}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Filter className="h-4 w-4" />
                  Filtros
                  {hasActiveFilters && (
                    <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center">
                      !
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Data Inicial</Label>
                    <CalendarComponent
                      mode="single"
                      selected={dateFrom}
                      onSelect={setDateFrom}
                      locale={ptBR}
                      className="rounded-md border mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Data Final</Label>
                    <CalendarComponent
                      mode="single"
                      selected={dateTo}
                      onSelect={setDateTo}
                      locale={ptBR}
                      className="rounded-md border mt-1"
                    />
                  </div>
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="w-full gap-2"
                    >
                      <X className="h-4 w-4" />
                      Limpar Filtros
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportCSV}>
                  <FileText className="h-4 w-4 mr-2" />
                  Exportar CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPDF}>
                  <FileText className="h-4 w-4 mr-2" />
                  Exportar PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-muted-foreground">Filtros ativos:</span>
            {searchTerm && (
              <Badge variant="secondary" className="gap-1">
                Busca: {searchTerm}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => setSearchTerm('')}
                />
              </Badge>
            )}
            {dateFrom && (
              <Badge variant="secondary" className="gap-1">
                De: {format(dateFrom, 'dd/MM/yyyy')}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => setDateFrom(undefined)}
                />
              </Badge>
            )}
            {dateTo && (
              <Badge variant="secondary" className="gap-1">
                Até: {format(dateTo, 'dd/MM/yyyy')}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => setDateTo(undefined)}
                />
              </Badge>
            )}
          </div>
        )}

        {/* Table */}
        <div className="rounded-md border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome do Paciente</TableHead>
                <TableHead>Data de Saída</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFaltantes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                    Nenhum registro encontrado com os filtros aplicados
                  </TableCell>
                </TableRow>
              ) : (
                filteredFaltantes.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.paciente_nome || '-'}
                    </TableCell>
                    <TableCell>
                      {item.registrado_recepcao_em ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {format(new Date(item.registrado_recepcao_em), "dd/MM/yyyy HH:mm")}
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="destructive" className="whitespace-nowrap">
                        Falta prontuário físico
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
