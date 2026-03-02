import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, BarChart3, Loader2, TrendingUp, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useProtocoloAtendimentos, TipoProtocolo } from '@/hooks/useProtocoloAtendimentos';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { ExportDropdown } from '@/components/ui/export-dropdown';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Props {
  tipo: TipoProtocolo;
  titulo: string;
  onBack: () => void;
}

const tipoLabels: Record<string, string> = {
  dor_toracica: 'Dor Torácica',
  sepse_adulto: 'Sepse Adulto',
  sepse_pediatrico: 'Sepse Pediátrico',
};

const COLORS = ['hsl(var(--primary))', 'hsl(var(--destructive))', 'hsl(142, 71%, 45%)', 'hsl(38, 92%, 50%)'];

export const ProtocoloConsolidado = ({ tipo, titulo, onBack }: Props) => {
  const now = new Date();
  const [competencia, setCompetencia] = useState(format(now, 'yyyy-MM'));
  const { data: allAtendimentos, isLoading } = useProtocoloAtendimentos(tipo);

  // Generate last 12 months
  const meses = useMemo(() => {
    const start = subMonths(now, 11);
    return eachMonthOfInterval({ start, end: now }).map(d => ({
      value: format(d, 'yyyy-MM'),
      label: format(d, 'MMMM yyyy', { locale: ptBR }),
    }));
  }, []);

  // Filter by competency
  const atendimentos = useMemo(() => {
    return (allAtendimentos || []).filter((a: any) => a.competency === competencia);
  }, [allAtendimentos, competencia]);

  // Stats
  const stats = useMemo(() => {
    const total = atendimentos.length;
    const withinTarget = atendimentos.filter((a: any) => a.within_target).length;
    const times = atendimentos.map((a: any) => a.porta_ecg_minutes || 0).filter((t: number) => t > 0);
    const avg = times.length > 0 ? times.reduce((a: number, b: number) => a + b, 0) / times.length : 0;
    const median = times.length > 0 ? times.sort((a: number, b: number) => a - b)[Math.floor(times.length / 2)] : 0;
    return {
      total,
      withinTarget,
      outOfTarget: total - withinTarget,
      percentWithinTarget: total > 0 ? Math.round((withinTarget / total) * 100) : 0,
      avgTime: Math.round(avg * 10) / 10,
      medianTime: median,
    };
  }, [atendimentos]);

  // Monthly evolution (last 6 months)
  const evolucaoMensal = useMemo(() => {
    const last6 = meses.slice(-6);
    return last6.map(m => {
      const monthData = (allAtendimentos || []).filter((a: any) => a.competency === m.value);
      const total = monthData.length;
      const withinTarget = monthData.filter((a: any) => a.within_target).length;
      return {
        mes: format(new Date(m.value + '-01'), 'MMM/yy', { locale: ptBR }),
        total,
        dentroDaMeta: withinTarget,
        foraDaMeta: total - withinTarget,
      };
    });
  }, [allAtendimentos, meses]);

  // Pie data
  const pieData = [
    { name: 'Dentro da Meta', value: stats.withinTarget },
    { name: 'Fora da Meta', value: stats.outOfTarget },
  ];

  // Risk classification distribution
  const riskData = useMemo(() => {
    const counts: Record<string, number> = {};
    atendimentos.forEach((a: any) => {
      const risk = a.risk_classification || 'Não informado';
      counts[risk] = (counts[risk] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [atendimentos]);

  const exportExcel = () => {
    const data = [{
      'Competência': competencia,
      'Total Atendimentos': stats.total,
      'Dentro da Meta': stats.withinTarget,
      'Fora da Meta': stats.outOfTarget,
      '% Dentro da Meta': `${stats.percentWithinTarget}%`,
      'Tempo Médio (min)': stats.avgTime,
      'Mediana (min)': stats.medianTime,
    }];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Consolidado');
    XLSX.writeFile(wb, `consolidado_${tipo}_${competencia}.xlsx`);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(`Consolidado Mensal — ${tipoLabels[tipo]}`, 14, 20);
    doc.setFontSize(10);
    doc.text(`Competência: ${competencia}`, 14, 28);
    autoTable(doc, {
      startY: 34,
      head: [['Indicador', 'Valor']],
      body: [
        ['Total Atendimentos', String(stats.total)],
        ['Dentro da Meta', String(stats.withinTarget)],
        ['Fora da Meta', String(stats.outOfTarget)],
        ['% Dentro da Meta', `${stats.percentWithinTarget}%`],
        ['Tempo Médio (min)', String(stats.avgTime)],
        ['Mediana (min)', String(stats.medianTime)],
      ],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] },
    });
    doc.save(`consolidado_${tipo}_${competencia}.pdf`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Consolidado Mensal — {tipoLabels[tipo]}</h2>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select value={competencia} onValueChange={setCompetencia}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {meses.map(m => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ExportDropdown onExportExcel={exportExcel} onExportPDF={exportPDF} disabled={stats.total === 0} />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-600">{stats.percentWithinTarget}%</p>
                  <p className="text-xs text-muted-foreground">Dentro da Meta</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.avgTime} min</p>
                  <p className="text-xs text-muted-foreground">Tempo Médio</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-destructive">{stats.outOfTarget}</p>
                  <p className="text-xs text-muted-foreground">Fora da Meta</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Evolução Mensal</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={evolucaoMensal}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="mes" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Bar dataKey="dentroDaMeta" name="Dentro da Meta" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="foraDaMeta" name="Fora da Meta" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Aderência à Meta</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.total === 0 ? (
                  <div className="flex items-center justify-center h-[260px] text-muted-foreground text-sm">
                    Sem dados para o período selecionado.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        <Cell fill="hsl(142, 71%, 45%)" />
                        <Cell fill="hsl(0, 84%, 60%)" />
                      </Pie>
                      <Legend />
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Risk distribution */}
          {riskData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Distribuição por Classificação de Risco</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={riskData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" className="text-xs" />
                    <YAxis dataKey="name" type="category" className="text-xs" width={120} />
                    <Tooltip />
                    <Bar dataKey="value" name="Atendimentos" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};
