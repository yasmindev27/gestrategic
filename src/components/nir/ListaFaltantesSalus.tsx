import { useState, useEffect } from 'react';
import { FileWarning, Search, Download, Calendar, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

  const handleExportCSV = () => {
    const headers = ['Nome do Paciente', 'Nº Prontuário', 'Data de Saída', 'Status'];
    const rows = filteredFaltantes.map((item) => [
      item.paciente_nome || '-',
      item.numero_prontuario,
      item.registrado_recepcao_em
        ? format(new Date(item.registrado_recepcao_em), "dd/MM/yyyy HH:mm")
        : '-',
      'Falta prontuário físico',
    ]);

    const csvContent = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `prontuarios_faltantes_salus_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading && faltantes.length === 0) {
    return (
      <Card className="border-destructive/20 bg-destructive/5">
        <CardContent className="py-8 text-center text-muted-foreground">
          Carregando lista de faltantes...
        </CardContent>
      </Card>
    );
  }

  if (faltantes.length === 0) {
    return null; // Don't show anything if no missing records
  }

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
            <Button variant="outline" onClick={handleExportCSV} className="gap-2">
              <Download className="h-4 w-4" />
              Exportar CSV
            </Button>
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
                <TableHead>Nº Prontuário</TableHead>
                <TableHead>Data de Saída</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFaltantes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    Nenhum registro encontrado com os filtros aplicados
                  </TableCell>
                </TableRow>
              ) : (
                filteredFaltantes.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.paciente_nome || '-'}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {item.numero_prontuario}
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
      </CardContent>
    </Card>
  );
}
