import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Ambulance, 
  Bed, 
  Users, 
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  CalendarDays,
  Loader2,
  Download,
  FileSpreadsheet,
  FileText,
  Clock,
  Filter,
  RefreshCw,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { SECTORS } from '@/types/bed';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';

interface OccupancyStats {
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  occupancyRate: number;
}

interface DailyStats {
  date: string;
  admissions: number;
  discharges: number;
  total: number;
}

interface SectorOccupancy {
  name: string;
  occupied: number;
  total: number;
  rate: number;
}

interface SusFacilStats {
  entradasPendentes: number;
  saidasPendentes: number;
  efetivadosHoje: number;
  urgentes: number;
}

interface StayAndTurnover {
  avgStayDays: number;
  turnoverRate: number;
  totalDischargesMonth: number;
}

const COLORS = [
  'hsl(142, 70%, 40%)',
  'hsl(210, 65%, 45%)',
  'hsl(38, 90%, 50%)',
  'hsl(0, 72%, 51%)',
  'hsl(280, 60%, 50%)',
];

type DatePreset = 'today' | 'week' | 'month' | 'custom';

/** Total installed capacity (regular + extra beds) */
const TOTAL_BEDS = SECTORS.reduce(
  (sum, s) => sum + s.beds.length + (s.extraBeds?.length || 0),
  0
);

const SECTOR_BED_COUNTS = SECTORS.map((s) => ({
  id: s.id,
  name: s.name,
  total: s.beds.length + (s.extraBeds?.length || 0),
}));

export const NirDashboardModule = () => {
  const { isAdmin, isNir, isLoading: isLoadingRole } = useUserRole();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [datePreset, setDatePreset] = useState<DatePreset>('today');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());

  const [occupancyStats, setOccupancyStats] = useState<OccupancyStats>({
    totalBeds: TOTAL_BEDS, occupiedBeds: 0, availableBeds: TOTAL_BEDS, occupancyRate: 0,
  });
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [sectorOccupancy, setSectorOccupancy] = useState<SectorOccupancy[]>([]);
  const [todayAdmissions, setTodayAdmissions] = useState(0);
  const [todayDischarges, setTodayDischarges] = useState(0);
  const [susFacilStats, setSusFacilStats] = useState<SusFacilStats>({
    entradasPendentes: 0, saidasPendentes: 0, efetivadosHoje: 0, urgentes: 0,
  });
  const [stayAndTurnover, setStayAndTurnover] = useState<StayAndTurnover>({
    avgStayDays: 0, turnoverRate: 0, totalDischargesMonth: 0,
  });

  const realtimeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasAccess = isAdmin || isNir;

  const loadBedData = useCallback(async () => {
    const { getBrasiliaDateString, getBrasiliaHours } = await import('@/lib/brasilia-time');
    const today = getBrasiliaDateString();
    const currentHour = getBrasiliaHours();
    const currentShift = currentHour >= 7 && currentHour < 19 ? 'diurno' : 'noturno';

    // 1) Current occupancy — filter by CURRENT shift to match Mapa de Leitos
    const { data: currentRecords, error: bedError } = await supabase
      .from('bed_records')
      .select('bed_id, sector, patient_name, motivo_alta')
      .eq('shift_date', today)
      .eq('shift_type', currentShift);

    if (bedError) throw bedError;

    const occupiedRecords = currentRecords?.filter(r => r.patient_name && !r.motivo_alta) || [];
    const occupiedBeds = occupiedRecords.length;
    const availableBeds = Math.max(0, TOTAL_BEDS - occupiedBeds);
    const occupancyRate = TOTAL_BEDS > 0 ? Math.round((occupiedBeds / TOTAL_BEDS) * 100) : 0;

    setOccupancyStats({ totalBeds: TOTAL_BEDS, occupiedBeds, availableBeds, occupancyRate });

    // 2) Occupancy by sector
    const sectorStats: SectorOccupancy[] = SECTOR_BED_COUNTS.map((sc) => {
      const sectorOccupied = occupiedRecords.filter(r => r.sector === sc.id).length;
      return {
        name: sc.name,
        occupied: sectorOccupied,
        total: sc.total,
        rate: sc.total > 0 ? Math.round((sectorOccupied / sc.total) * 100) : 0,
      };
    });
    setSectorOccupancy(sectorStats);

    // 3) Admissions & Discharges — query across the selected date range
    const startDateStr = format(startDate, 'yyyy-MM-dd');
    const endDateStr = format(endDate, 'yyyy-MM-dd');

    const { data: rangeRecords } = await supabase
      .from('bed_records')
      .select('bed_id, patient_name, data_internacao, data_alta, motivo_alta, shift_date, shift_type')
      .gte('shift_date', startDateStr)
      .lte('shift_date', endDateStr);

    // Deduplicate by bed_id + patient_name to avoid counting same patient across shifts
    const admissionSet = new Set<string>();
    const dischargeSet = new Set<string>();

    rangeRecords?.forEach(r => {
      const key = `${r.bed_id}|${(r.patient_name || '').trim()}`;

      if (r.data_internacao && r.data_internacao >= startDateStr && r.data_internacao <= endDateStr) {
        admissionSet.add(key);
      }

      if (r.motivo_alta && r.data_alta) {
        const altaDate = r.data_alta.split('T')[0];
        if (altaDate >= startDateStr && altaDate <= endDateStr) {
          dischargeSet.add(key);
        }
      }
    });

    setTodayAdmissions(admissionSet.size);
    setTodayDischarges(dischargeSet.size);

    // 4) Daily evolution chart
    const daysToShow = isSameDay(startDate, endDate) ? 7 : Math.min(30, Math.ceil((endDate.getTime() - startDate.getTime()) / (86400000)) + 1);
    const baseDate = isSameDay(startDate, endDate) ? new Date() : endDate;
    const dateRange = Array.from({ length: daysToShow }, (_, i) => format(subDays(baseDate, daysToShow - 1 - i), 'yyyy-MM-dd'));

    const { data: dailyData } = await supabase
      .from('daily_statistics')
      .select('date, admissions, discharges, total_patients')
      .in('date', dateRange)
      .order('date', { ascending: true });

    setDailyStats(dateRange.map(date => {
      const d = dailyData?.find(x => x.date === date);
      return {
        date: format(new Date(date + 'T12:00:00'), 'dd/MM', { locale: ptBR }),
        admissions: d?.admissions || 0,
        discharges: d?.discharges || 0,
        total: d?.total_patients || 0,
      };
    }));

    // 5) Stay & Turnover (last 30 days, deduplicated by bed_id + patient_name)
    const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');
    const { data: allRecords } = await supabase
      .from('bed_records')
      .select('bed_id, patient_name, data_alta, created_at, motivo_alta')
      .gte('shift_date', thirtyDaysAgo);

    if (allRecords && allRecords.length > 0) {
      // Deduplicate by bed_id + patient_name; prefer record with data_alta
      const stayMap = new Map<string, { created_at: string; data_alta: string | null; motivo_alta: string | null }>();
      allRecords.forEach(r => {
        if (!r.patient_name) return;
        const key = `${r.bed_id}|${r.patient_name.trim()}`;
        const existing = stayMap.get(key);
        if (!existing || (r.data_alta && !existing.data_alta) || r.created_at < existing.created_at) {
          stayMap.set(key, {
            created_at: existing ? (r.created_at < existing.created_at ? r.created_at : existing.created_at) : r.created_at,
            data_alta: r.data_alta || existing?.data_alta || null,
            motivo_alta: r.motivo_alta || existing?.motivo_alta || null,
          });
        }
      });

      const stayDurations: number[] = [];
      let dischCount = 0;

      stayMap.forEach(r => {
        const startTs = new Date(r.created_at).getTime();

        if (r.motivo_alta && r.data_alta) {
          dischCount++;
          const endTs = new Date(r.data_alta).getTime();
          const days = (endTs - startTs) / 86400000;
          if (days >= 0 && days < 365) stayDurations.push(days);
        } else {
          const days = (Date.now() - startTs) / 86400000;
          if (days >= 0 && days < 365) stayDurations.push(days);
        }
      });

      const avgStay = stayDurations.length > 0
        ? stayDurations.reduce((a, b) => a + b, 0) / stayDurations.length
        : 0;

      setStayAndTurnover({
        avgStayDays: Math.round(avgStay * 10) / 10,
        turnoverRate: TOTAL_BEDS > 0 ? Math.round((dischCount / TOTAL_BEDS) * 100) / 100 : 0,
        totalDischargesMonth: dischCount,
      });
    }
  }, [startDate, endDate]);

  const loadSusFacilData = useCallback(async () => {
    const { getBrasiliaDateString } = await import('@/lib/brasilia-time');
    const today = getBrasiliaDateString();

    const { data, error } = await supabase
      .from('regulacao_sus_facil')
      .select('tipo, status, prioridade, data_resposta');

    if (error) throw error;

    setSusFacilStats({
      entradasPendentes: data?.filter(s => s.tipo === 'entrada' && s.status === 'pendente').length || 0,
      saidasPendentes: data?.filter(s => s.tipo === 'saida' && s.status === 'pendente').length || 0,
      efetivadosHoje: data?.filter(s => s.status === 'efetivada' && s.data_resposta?.startsWith(today)).length || 0,
      urgentes: data?.filter(s => s.prioridade === 'urgente' && s.status === 'pendente').length || 0,
    });
  }, []);

  const loadDashboardData = useCallback(async () => {
    if (!hasAccess) return;
    setIsLoading(true);
    try {
      await Promise.all([loadBedData(), loadSusFacilData()]);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [hasAccess, loadBedData, loadSusFacilData]);

  // Initial load
  useEffect(() => {
    if (!hasAccess || isLoadingRole) return;
    loadDashboardData();
  }, [hasAccess, isLoadingRole, loadDashboardData]);

  // Realtime subscriptions with 2s debounce to prevent flood
  useEffect(() => {
    if (!hasAccess || isLoadingRole) return;

    const debouncedRefresh = () => {
      if (realtimeTimerRef.current) clearTimeout(realtimeTimerRef.current);
      realtimeTimerRef.current = setTimeout(() => loadDashboardData(), 2000);
    };

    const bedChannel = supabase
      .channel('nir-dash-beds')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bed_records' }, debouncedRefresh)
      .subscribe();

    const susFacilChannel = supabase
      .channel('nir-dash-susfacil')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'regulacao_sus_facil' }, debouncedRefresh)
      .subscribe();

    return () => {
      if (realtimeTimerRef.current) clearTimeout(realtimeTimerRef.current);
      supabase.removeChannel(bedChannel);
      supabase.removeChannel(susFacilChannel);
    };
  }, [hasAccess, isLoadingRole, loadDashboardData]);

  const handleDatePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    const today = new Date();
    switch (preset) {
      case 'today':
        setStartDate(today);
        setEndDate(today);
        break;
      case 'week':
        setStartDate(startOfWeek(today, { locale: ptBR }));
        setEndDate(endOfWeek(today, { locale: ptBR }));
        break;
      case 'month':
        setStartDate(startOfMonth(today));
        setEndDate(endOfMonth(today));
        break;
    }
  };

  const exportToCSV = () => {
    try {
      const headers = ['Setor', 'Ocupados', 'Total', 'Disponíveis', 'Taxa (%)', 'Status'];
      const rows = sectorOccupancy.map(sector => [
        sector.name,
        sector.occupied.toString(),
        sector.total.toString(),
        Math.max(0, sector.total - sector.occupied).toString(),
        sector.rate.toString(),
        sector.rate >= 90 ? 'Crítico' : sector.rate >= 70 ? 'Atenção' : 'Normal',
      ]);

      const csvContent = [
        `Relatório NIR - ${format(startDate, 'dd/MM/yyyy', { locale: ptBR })}${!isSameDay(startDate, endDate) ? ` a ${format(endDate, 'dd/MM/yyyy', { locale: ptBR })}` : ''}`,
        '',
        `Total de Leitos: ${occupancyStats.totalBeds}`,
        `Leitos Ocupados: ${occupancyStats.occupiedBeds}`,
        `Leitos Disponíveis: ${occupancyStats.availableBeds}`,
        `Taxa de Ocupação: ${occupancyStats.occupancyRate}%`,
        `Permanência Média: ${stayAndTurnover.avgStayDays} dias`,
        `Rotatividade: ${stayAndTurnover.turnoverRate}`,
        `Internações no período: ${todayAdmissions}`,
        `Altas no período: ${todayDischarges}`,
        '',
        headers.join(','),
        ...rows.map(row => row.join(',')),
      ].join('\n');

      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `relatorio-nir-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      link.click();
      toast({ title: "Exportado!", description: "Relatório CSV gerado com sucesso." });
    } catch {
      toast({ title: "Erro", description: "Erro ao exportar CSV.", variant: "destructive" });
    }
  };

  const exportToPDF = async () => {
    try {
      const { createStandardPdf, savePdfWithFooter } = await import('@/lib/export-utils');
      const { doc, logoImg } = await createStandardPdf('Relatório NIR - Dashboard de Regulação');

      const dateText = isSameDay(startDate, endDate)
        ? format(startDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
        : `${format(startDate, 'dd/MM/yyyy', { locale: ptBR })} a ${format(endDate, 'dd/MM/yyyy', { locale: ptBR })}`;

      doc.setFontSize(10);
      doc.text(`Período: ${dateText}`, 14, 32);

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Indicadores Gerais', 14, 42);

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total de Leitos: ${occupancyStats.totalBeds}`, 14, 52);
      doc.text(`Leitos Ocupados: ${occupancyStats.occupiedBeds}`, 14, 59);
      doc.text(`Leitos Disponíveis: ${occupancyStats.availableBeds}`, 14, 66);
      doc.text(`Taxa de Ocupação: ${occupancyStats.occupancyRate}%`, 14, 73);
      doc.text(`Permanência Média: ${stayAndTurnover.avgStayDays} dias`, 105, 52);
      doc.text(`Rotatividade: ${stayAndTurnover.turnoverRate}`, 105, 59);
      doc.text(`Internações no período: ${todayAdmissions}`, 105, 66);
      doc.text(`Altas no período: ${todayDischarges}`, 105, 73);

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Ocupação por Setor', 14, 88);

      autoTable(doc, {
        startY: 94,
        head: [['Setor', 'Ocupados', 'Total', 'Disponíveis', 'Taxa (%)', 'Status']],
        body: sectorOccupancy.map(sector => [
          sector.name,
          sector.occupied,
          sector.total,
          Math.max(0, sector.total - sector.occupied),
          `${sector.rate}%`,
          sector.rate >= 90 ? 'Crítico' : sector.rate >= 70 ? 'Atenção' : 'Normal',
        ]),
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185] },
        margin: { bottom: 28 },
      });

      savePdfWithFooter(doc, 'Relatório NIR - Dashboard de Regulação', `relatorio-nir-${format(new Date(), 'yyyy-MM-dd')}`, logoImg);
      toast({ title: "Exportado!", description: "Relatório PDF gerado com sucesso." });
    } catch {
      toast({ title: "Erro", description: "Erro ao exportar PDF.", variant: "destructive" });
    }
  };

  if (isLoadingRole) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-destructive">
            <Ambulance className="h-5 w-5" />
            <span>Você não tem permissão para acessar o Dashboard NIR.</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getOccupancyColor = (rate: number) => {
    if (rate >= 90) return 'text-destructive';
    if (rate >= 70) return 'text-warning';
    return 'text-success';
  };

  const getOccupancyBg = (rate: number) => {
    if (rate >= 90) return 'bg-destructive/10';
    if (rate >= 70) return 'bg-warning/10';
    return 'bg-success/10';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Ambulance className="h-6 w-6 text-primary" />
            Dashboard de Regulação — NIR
          </h2>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <p className="text-muted-foreground text-sm">Gestão de Fluxo Hospitalar</p>
            <Badge variant="outline" className="gap-1 text-xs">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              Tempo real
            </Badge>
            <span className="text-xs text-muted-foreground">
              {format(lastUpdate, 'HH:mm:ss', { locale: ptBR })}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadDashboardData} disabled={isLoading} className="gap-2">
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            Atualizar
          </Button>

          <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
            {(['today', 'week', 'month'] as const).map(p => (
              <Button key={p} variant={datePreset === p ? 'default' : 'ghost'} size="sm" onClick={() => handleDatePresetChange(p)}>
                {p === 'today' ? 'Hoje' : p === 'week' ? 'Semana' : 'Mês'}
              </Button>
            ))}
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="h-4 w-4" />
                {isSameDay(startDate, endDate)
                  ? format(startDate, 'dd/MM/yyyy', { locale: ptBR })
                  : `${format(startDate, 'dd/MM', { locale: ptBR })} – ${format(endDate, 'dd/MM', { locale: ptBR })}`}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                selected={{ from: startDate, to: endDate }}
                onSelect={(range) => {
                  if (range?.from) {
                    setStartDate(range.from);
                    setEndDate(range.to || range.from);
                    setDatePreset('custom');
                  }
                }}
                initialFocus
                locale={ptBR}
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportToCSV} className="gap-2">
                <FileSpreadsheet className="h-4 w-4" /> CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToPDF} className="gap-2">
                <FileText className="h-4 w-4" /> PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* SUS Fácil KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-l-4 border-l-success">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-success/10">
                    <ArrowDownRight className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Entradas Pendentes</p>
                    <p className="text-2xl font-bold">{susFacilStats.entradasPendentes}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-info">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-info/10">
                    <ArrowUpRight className="h-5 w-5 text-info" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Saídas Pendentes</p>
                    <p className="text-2xl font-bold">{susFacilStats.saidasPendentes}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-primary">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <CheckCircle className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Efetivadas Hoje</p>
                    <p className="text-2xl font-bold">{susFacilStats.efetivadosHoje}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-warning">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-warning/10">
                    <AlertTriangle className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Urgentes</p>
                    <p className="text-2xl font-bold">{susFacilStats.urgentes}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Occupancy summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total de Leitos</p>
                    <p className="text-3xl font-bold">{occupancyStats.totalBeds}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-primary/10">
                    <Bed className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Leitos Ocupados</p>
                    <p className="text-3xl font-bold text-success">{occupancyStats.occupiedBeds}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-success/10">
                    <Users className="h-6 w-6 text-success" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Leitos Disponíveis</p>
                    <p className="text-3xl font-bold">{occupancyStats.availableBeds}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-muted">
                    <Bed className="h-6 w-6 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Taxa de Ocupação</p>
                    <p className={`text-3xl font-bold ${getOccupancyColor(occupancyStats.occupancyRate)}`}>
                      {occupancyStats.occupancyRate}%
                    </p>
                  </div>
                  <div className={`p-3 rounded-xl ${getOccupancyBg(occupancyStats.occupancyRate)}`}>
                    <Activity className={`h-6 w-6 ${getOccupancyColor(occupancyStats.occupancyRate)}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sector occupancy cards */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bed className="h-5 w-5 text-primary" />
                Taxa de Ocupação por Setor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {sectorOccupancy.map((sector) => (
                  <div key={sector.name} className={`rounded-lg border p-4 text-center ${getOccupancyBg(sector.rate)}`}>
                    <p className="text-xs font-medium text-muted-foreground mb-1">{sector.name}</p>
                    <p className={`text-2xl font-bold ${getOccupancyColor(sector.rate)}`}>{sector.rate}%</p>
                    <p className="text-xs text-muted-foreground mt-1">{sector.occupied}/{sector.total} leitos</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Stay & Turnover */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-l-4 border-l-primary">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Clock className="h-4 w-4" /> Permanência Média
                    </p>
                    <p className="text-4xl font-bold text-primary">{stayAndTurnover.avgStayDays}</p>
                    <p className="text-xs text-muted-foreground mt-1">dias (últimos 30 dias)</p>
                  </div>
                  <div className="p-4 rounded-xl bg-primary/10">
                    <Clock className="h-8 w-8 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-secondary">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" /> Rotatividade de Leitos
                    </p>
                    <p className="text-4xl font-bold text-foreground">{stayAndTurnover.turnoverRate}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stayAndTurnover.totalDischargesMonth} altas / {occupancyStats.totalBeds} leitos (30 dias)
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-secondary/10">
                    <TrendingUp className="h-8 w-8 text-secondary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Admissions & Discharges */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-l-4 border-l-success">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <CalendarDays className="h-4 w-4" />
                      Internações {datePreset === 'today' ? 'Hoje' : 'no Período'}
                    </p>
                    <p className="text-4xl font-bold text-success">{todayAdmissions}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-success/10">
                    <ArrowUpRight className="h-8 w-8 text-success" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-info">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <CalendarDays className="h-4 w-4" />
                      Altas {datePreset === 'today' ? 'Hoje' : 'no Período'}
                    </p>
                    <p className="text-4xl font-bold text-info">{todayDischarges}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-info/10">
                    <ArrowDownRight className="h-8 w-8 text-info" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bed className="h-5 w-5 text-primary" /> Ocupação por Setor
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sectorOccupancy} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 100]} unit="%" />
                      <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(value: number) => [`${value}%`, 'Ocupação']} />
                      <Bar dataKey="rate" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" /> Distribuição de Pacientes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={sectorOccupancy.filter(s => s.occupied > 0)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        dataKey="occupied"
                      >
                        {sectorOccupancy.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [`${value} pacientes`, 'Ocupados']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Evolution chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" /> Evolução — Internações e Altas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="admissions" name="Internações" stroke="hsl(142, 70%, 40%)" strokeWidth={2} dot={{ fill: 'hsl(142, 70%, 40%)' }} />
                    <Line type="monotone" dataKey="discharges" name="Altas" stroke="hsl(199, 89%, 48%)" strokeWidth={2} dot={{ fill: 'hsl(199, 89%, 48%)' }} />
                    <Line type="monotone" dataKey="total" name="Total Pacientes" stroke="hsl(210, 65%, 45%)" strokeWidth={2} dot={{ fill: 'hsl(210, 65%, 45%)' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Detail table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" /> Detalhamento por Setor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Setor</th>
                      <th className="text-center py-3 px-4 font-medium text-muted-foreground">Ocupados</th>
                      <th className="text-center py-3 px-4 font-medium text-muted-foreground">Total</th>
                      <th className="text-center py-3 px-4 font-medium text-muted-foreground">Disponíveis</th>
                      <th className="text-center py-3 px-4 font-medium text-muted-foreground">Taxa</th>
                      <th className="text-center py-3 px-4 font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sectorOccupancy.map((sector) => (
                      <tr key={sector.name} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="py-3 px-4 font-medium">{sector.name}</td>
                        <td className="text-center py-3 px-4 text-success font-semibold">{sector.occupied}</td>
                        <td className="text-center py-3 px-4">{sector.total}</td>
                        <td className="text-center py-3 px-4">{Math.max(0, sector.total - sector.occupied)}</td>
                        <td className="text-center py-3 px-4">
                          <span className={`font-semibold ${getOccupancyColor(sector.rate)}`}>{sector.rate}%</span>
                        </td>
                        <td className="text-center py-3 px-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getOccupancyBg(sector.rate)} ${getOccupancyColor(sector.rate)}`}>
                            {sector.rate >= 90 ? 'Crítico' : sector.rate >= 70 ? 'Atenção' : 'Normal'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
