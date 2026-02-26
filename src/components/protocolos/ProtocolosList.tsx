import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProtocoloAtendimentos, useProtocoloStats, TipoProtocolo } from '@/hooks/useProtocoloAtendimentos';
import { Plus, Search, Clock, CheckCircle, XCircle, BarChart3 } from 'lucide-react';

interface Props {
  tipo: TipoProtocolo;
  titulo: string;
  onNovo: () => void;
}

const MESES = ['01','02','03','04','05','06','07','08','09','10','11','12'];

export const ProtocolosList = ({ tipo, titulo, onNovo }: Props) => {
  const now = new Date();
  const [competency, setCompetency] = useState(format(now, 'yyyy-MM'));
  const [search, setSearch] = useState('');
  
  const { data: atendimentos = [], isLoading } = useProtocoloAtendimentos(tipo, competency);
  const { data: stats } = useProtocoloStats(tipo, competency);

  const filtered = useMemo(() => {
    if (!search) return atendimentos;
    const q = search.toLowerCase();
    return atendimentos.filter((a: any) =>
      a.record_number?.toLowerCase().includes(q) ||
      a.patient_name?.toLowerCase().includes(q)
    );
  }, [atendimentos, search]);

  const [year, month] = competency.split('-');

  return (
    <div className="space-y-4">
      {/* KPIs */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-primary opacity-70" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Atendimentos</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-emerald-500 opacity-70" />
              <div>
                <p className="text-2xl font-bold">{stats.withinTarget}</p>
                <p className="text-xs text-muted-foreground">Dentro da Meta</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <XCircle className="h-8 w-8 text-destructive opacity-70" />
              <div>
                <p className="text-2xl font-bold">{stats.total - stats.withinTarget}</p>
                <p className="text-xs text-muted-foreground">Fora da Meta</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Clock className="h-8 w-8 text-amber-500 opacity-70" />
              <div>
                <p className="text-2xl font-bold">{stats.average} min</p>
                <p className="text-xs text-muted-foreground">Média Tempo</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={month} onValueChange={(m) => setCompetency(`${year}-${m}`)}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MESES.map(m => (
              <SelectItem key={m} value={m}>
                {new Date(2026, parseInt(m) - 1).toLocaleString('pt-BR', { month: 'long' })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={year} onValueChange={(y) => setCompetency(`${y}-${month}`)}>
          <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[2024, 2025, 2026, 2027].map(y => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar prontuário ou paciente..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Button onClick={onNovo} className="gap-2">
          <Plus className="h-4 w-4" /> Novo Atendimento
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Prontuário</TableHead>
                <TableHead>Paciente</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Tempo</TableHead>
                <TableHead>Meta</TableHead>
                <TableHead>Classificação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {isLoading ? 'Carregando...' : 'Nenhum registro encontrado.'}
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.record_number}</TableCell>
                  <TableCell>{a.patient_name || '-'}</TableCell>
                  <TableCell>{a.arrival_time ? format(new Date(a.arrival_time), 'dd/MM/yyyy HH:mm') : '-'}</TableCell>
                  <TableCell>
                    <Badge variant={a.within_target ? 'default' : 'destructive'}>
                      {a.porta_ecg_minutes} min
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {a.within_target ? (
                      <Badge variant="outline" className="text-emerald-600 border-emerald-300">✓ Dentro</Badge>
                    ) : (
                      <Badge variant="outline" className="text-destructive border-destructive/30">✗ Fora</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {a.risk_classification && (
                      <Badge className={
                        a.risk_classification === 'vermelho' ? 'bg-red-500' :
                        a.risk_classification === 'laranja' ? 'bg-orange-500' :
                        a.risk_classification === 'amarelo' ? 'bg-yellow-500 text-black' :
                        a.risk_classification === 'verde' ? 'bg-green-500' :
                        'bg-blue-500'
                      }>
                        {a.risk_classification}
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
