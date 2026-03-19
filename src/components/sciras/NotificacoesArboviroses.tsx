import { useState, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SearchInput } from '@/components/ui/search-input';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingState } from '@/components/ui/loading-state';
import { toast } from 'sonner';
import { Upload, ExternalLink, Bug, FileSpreadsheet, Users, Calendar, AlertTriangle, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1Q1zW-Uuh7wzS93XHPIlR4wXjkAkodtSq1G2gdcTbBFQ/edit?gid=1114819951#gid=1114819951';

interface Arbovirose {
  id: string;
  paciente_nome: string;
  data_nascimento: string | null;
  idade: number | null;
  data_notificacao: string;
  unidade_notificadora: string | null;
  suspeita: string;
  grupo: string | null;
  endereco: string | null;
  bairro: string | null;
  comorbidades: string | null;
  data_inicio_sintomas: string | null;
  dias_evolucao: number | null;
  lab_data: string | null;
  lab_exame: string | null;
  sorologia_data: string | null;
  sorologia_resultado: string | null;
  ciclo1_data: string | null;
  ciclo1_hematocrito: string | null;
  ciclo1_gl: string | null;
  ciclo1_plaquetas: string | null;
  ciclo2_data: string | null;
  ciclo2_hematocrito: string | null;
  ciclo2_gl: string | null;
  ciclo2_plaquetas: string | null;
  ciclo3_data: string | null;
  ciclo3_hematocrito: string | null;
  ciclo3_gl: string | null;
  ciclo3_plaquetas: string | null;
  investigacao_campo: string | null;
  created_at: string;
}

function parseDate(val: any): string | null {
  if (!val) return null;
  const s = String(val).trim();
  // DD/MM/YYYY
  const match = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, d, m, y] = match;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);
  // Excel serial number
  if (!isNaN(Number(s)) && Number(s) > 30000) {
    const date = new Date((Number(s) - 25569) * 86400 * 1000);
    return format(date, 'yyyy-MM-dd');
  }
  return null;
}

function parseInteger(val: any): number | null {
  if (!val) return null;
  const n = parseInt(String(val).trim(), 10);
  return isNaN(n) ? null : n;
}

export function NotificacoesArboviroses() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [importing, setImporting] = useState(false);

  const { data: registros = [], isLoading } = useQuery({
    queryKey: ['notificacoes-arboviroses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notificacoes_arboviroses')
        .select('*')
        .order('data_notificacao', { ascending: false });
      if (error) throw error;
      return data as Arbovirose[];
    },
  });

  const importMutation = useMutation({
    mutationFn: async (rows: any[]) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .single();

      const records = rows.map((r) => ({
        paciente_nome: String(r[0] || '').trim(),
        data_nascimento: parseDate(r[1]),
        idade: parseInteger(r[2]),
        data_notificacao: parseDate(r[3]) || format(new Date(), 'yyyy-MM-dd'),
        unidade_notificadora: String(r[4] || 'UPA').trim(),
        suspeita: String(r[5] || 'DENGUE').trim().toUpperCase(),
        grupo: String(r[6] || '').trim() || null,
        endereco: String(r[7] || '').trim() || null,
        bairro: String(r[8] || '').trim() || null,
        comorbidades: String(r[9] || '').trim() || null,
        data_inicio_sintomas: parseDate(r[11]),
        dias_evolucao: parseInteger(r[12]),
        lab_data: parseDate(r[14]),
        lab_exame: String(r[15] || '').trim() || null,
        sorologia_data: parseDate(r[17]),
        sorologia_resultado: String(r[18] || '').trim() || null,
        ciclo1_data: parseDate(r[20]),
        ciclo1_hematocrito: String(r[21] || '').trim() || null,
        ciclo1_gl: String(r[22] || '').trim() || null,
        ciclo1_plaquetas: String(r[23] || '').trim() || null,
        ciclo2_data: parseDate(r[25]),
        ciclo2_hematocrito: String(r[26] || '').trim() || null,
        ciclo2_gl: String(r[27] || '').trim() || null,
        ciclo2_plaquetas: String(r[28] || '').trim() || null,
        ciclo3_data: parseDate(r[30]),
        ciclo3_hematocrito: String(r[31] || '').trim() || null,
        ciclo3_gl: String(r[32] || '').trim() || null,
        ciclo3_plaquetas: String(r[33] || '').trim() || null,
        investigacao_campo: String(r[35] || '').trim() || null,
        registrado_por: user.id,
        registrado_por_nome: profile?.full_name || user.email,
      })).filter(r => r.paciente_nome.length > 0);

      if (records.length === 0) throw new Error('Nenhum registro válido encontrado');

      // Delete existing and insert fresh (full replacement)
      await supabase.from('notificacoes_arboviroses').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      // Insert in batches of 100
      for (let i = 0; i < records.length; i += 100) {
        const batch = records.slice(i, i + 100);
        const { error } = await supabase.from('notificacoes_arboviroses').insert(batch);
        if (error) throw error;
      }

      return records.length;
    },
    onSuccess: (count) => {
      toast.success(`${count} notificações importadas com sucesso`);
      queryClient.invalidateQueries({ queryKey: ['notificacoes-arboviroses'] });
    },
    onError: (err: any) => {
      toast.error('Erro na importação: ' + err.message);
    },
  });

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      
      // Try to find UPA sheet
      const sheetName = wb.SheetNames.find(s => s.toUpperCase().includes('UPA')) || wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      
      // Skip header row
      const dataRows = rows.slice(1).filter(r => r.some((cell: any) => String(cell).trim()));
      
      await importMutation.mutateAsync(dataRows);
    } catch (err: any) {
      toast.error('Erro ao ler arquivo: ' + err.message);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const filtered = useMemo(() => {
    if (!search) return registros;
    const term = search.toLowerCase();
    return registros.filter(r =>
      r.paciente_nome.toLowerCase().includes(term) ||
      r.suspeita.toLowerCase().includes(term) ||
      r.bairro?.toLowerCase().includes(term) ||
      r.grupo?.toLowerCase().includes(term)
    );
  }, [registros, search]);

  // Stats
  const stats = useMemo(() => {
    const totalNotif = registros.length;
    const porSuspeita = registros.reduce((acc, r) => {
      acc[r.suspeita] = (acc[r.suspeita] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const concluidos = registros.filter(r => r.investigacao_campo?.toUpperCase() === 'CONCLUÍDO').length;
    return { totalNotif, porSuspeita, concluidos };
  }, [registros]);

  const suspeitaColor = (s: string) => {
    const upper = s.toUpperCase();
    if (upper.includes('DENGUE')) return 'destructive';
    if (upper.includes('ZIKA')) return 'secondary';
    if (upper.includes('CHIK')) return 'default';
    return 'outline';
  };

  const formatDateBR = (d: string | null) => {
    if (!d) return '—';
    try {
      const [y, m, day] = d.split('-');
      return `${day}/${m}/${y}`;
    } catch { return d; }
  };

  if (isLoading) return <LoadingState message="Carregando notificações..." />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Bug className="h-5 w-5 text-warning" />
            Notificações de Arboviroses — UPA
          </h2>
          <p className="text-sm text-muted-foreground">Vigilância epidemiológica de Dengue, Zika e Chikungunya</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.open(GOOGLE_SHEET_URL, '_blank')}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Planilha Google
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={importing}>
            <Upload className="h-4 w-4 mr-2" />
            {importing ? 'Importando...' : 'Importar Planilha'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleImport}
          />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats.totalNotif}</p>
                <p className="text-xs text-muted-foreground">Total Notificações</p>
              </div>
            </div>
          </CardContent>
        </Card>
        {Object.entries(stats.porSuspeita).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([suspeita, count]) => (
          <Card key={suspeita} className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 text-warning" />
                <div>
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-xs text-muted-foreground">{suspeita}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-success" />
              <div>
                <p className="text-2xl font-bold">{stats.concluidos}</p>
                <p className="text-xs text-muted-foreground">Concluídos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <SearchInput value={search} onChange={setSearch} placeholder="Buscar paciente, suspeita, bairro..." />

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Bug}
          title="Nenhuma notificação"
          description="Importe a planilha do Google Sheets para visualizar os dados aqui."
        />
      ) : (
        <div className="border rounded-lg overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Paciente</TableHead>
                <TableHead>Idade</TableHead>
                <TableHead>Data Notif.</TableHead>
                <TableHead>Suspeita</TableHead>
                <TableHead>Grupo</TableHead>
                <TableHead>Bairro</TableHead>
                <TableHead>Início Sintomas</TableHead>
                <TableHead>Comorbidades</TableHead>
                <TableHead>Investigação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium max-w-[200px] truncate">{r.paciente_nome}</TableCell>
                  <TableCell>{r.idade || '—'}</TableCell>
                  <TableCell>{formatDateBR(r.data_notificacao)}</TableCell>
                  <TableCell>
                    <Badge variant={suspeitaColor(r.suspeita) as any}>{r.suspeita}</Badge>
                  </TableCell>
                  <TableCell>
                    {r.grupo && <Badge variant="outline">{r.grupo}</Badge>}
                  </TableCell>
                  <TableCell className="max-w-[150px] truncate">{r.bairro || '—'}</TableCell>
                  <TableCell>{formatDateBR(r.data_inicio_sintomas)}</TableCell>
                  <TableCell className="max-w-[150px] truncate text-xs">{r.comorbidades || '—'}</TableCell>
                  <TableCell>
                    <Badge variant={r.investigacao_campo?.toUpperCase() === 'CONCLUÍDO' ? 'default' : 'secondary'}>
                      {r.investigacao_campo || 'Pendente'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
