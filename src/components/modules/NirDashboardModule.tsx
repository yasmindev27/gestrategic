import { useState, useEffect } from 'react';
import { 
  Ambulance, 
  Bed, 
  Users, 
  TrendingUp, 
  TrendingDown,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  CalendarDays,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { format, subDays, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { SECTORS } from '@/types/bed';
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

const COLORS = ['hsl(142, 70%, 40%)', 'hsl(210, 65%, 45%)', 'hsl(38, 90%, 50%)', 'hsl(0, 72%, 51%)', 'hsl(280, 60%, 50%)'];

export const NirDashboardModule = () => {
  const { isAdmin, isNir, isLoading: isLoadingRole } = useUserRole();
  const [isLoading, setIsLoading] = useState(true);
  const [occupancyStats, setOccupancyStats] = useState<OccupancyStats>({
    totalBeds: 0,
    occupiedBeds: 0,
    availableBeds: 0,
    occupancyRate: 0
  });
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [sectorOccupancy, setSectorOccupancy] = useState<SectorOccupancy[]>([]);
  const [todayAdmissions, setTodayAdmissions] = useState(0);
  const [todayDischarges, setTodayDischarges] = useState(0);

  const hasAccess = isAdmin || isNir;

  useEffect(() => {
    if (!hasAccess || isLoadingRole) return;
    
    loadDashboardData();
  }, [hasAccess, isLoadingRole]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Load bed records for today
      const { data: bedRecords, error: bedError } = await supabase
        .from('bed_records')
        .select('bed_id, sector, patient_name, data_alta, data_internacao')
        .eq('shift_date', today);

      if (bedError) throw bedError;

      // Calculate total beds from SECTORS config
      let totalBeds = 0;
      SECTORS.forEach(sector => {
        totalBeds += sector.beds.length;
      });

      // Calculate occupied beds
      const occupiedBeds = bedRecords?.filter(r => r.patient_name && !r.data_alta).length || 0;
      const availableBeds = totalBeds - occupiedBeds;
      const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

      setOccupancyStats({
        totalBeds,
        occupiedBeds,
        availableBeds,
        occupancyRate
      });

      // Calculate sector occupancy
      const sectorStats: SectorOccupancy[] = SECTORS.map(sector => {
        const sectorBeds = sector.beds.length;
        const sectorOccupied = bedRecords?.filter(
          r => r.sector === sector.id && r.patient_name && !r.data_alta
        ).length || 0;
        
        return {
          name: sector.name,
          occupied: sectorOccupied,
          total: sectorBeds,
          rate: sectorBeds > 0 ? Math.round((sectorOccupied / sectorBeds) * 100) : 0
        };
      });
      setSectorOccupancy(sectorStats);

      // Calculate today's admissions and discharges
      const todayAdm = bedRecords?.filter(r => r.data_internacao === today).length || 0;
      const todayDis = bedRecords?.filter(r => r.data_alta?.startsWith(today)).length || 0;
      setTodayAdmissions(todayAdm);
      setTodayDischarges(todayDis);

      // Load daily statistics for the last 7 days
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), 6 - i);
        return format(date, 'yyyy-MM-dd');
      });

      const { data: dailyData, error: dailyError } = await supabase
        .from('daily_statistics')
        .select('date, admissions, discharges, total_patients')
        .in('date', last7Days)
        .order('date', { ascending: true });

      if (dailyError) throw dailyError;

      const stats: DailyStats[] = last7Days.map(date => {
        const dayData = dailyData?.find(d => d.date === date);
        return {
          date: format(new Date(date), 'dd/MM', { locale: ptBR }),
          admissions: dayData?.admissions || 0,
          discharges: dayData?.discharges || 0,
          total: dayData?.total_patients || 0
        };
      });
      setDailyStats(stats);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
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
      <div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Ambulance className="h-6 w-6 text-primary" />
          Dashboard de Regulação - NIR
        </h2>
        <p className="text-muted-foreground">
          Núcleo Interno de Regulação - Gestão de Fluxo Hospitalar
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* KPI Cards */}
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

          {/* Today's Flow */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-success/30">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <CalendarDays className="h-4 w-4" />
                      Internações Hoje
                    </p>
                    <p className="text-4xl font-bold text-success">{todayAdmissions}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-success/10">
                    <ArrowUpRight className="h-8 w-8 text-success" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-info/30">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <CalendarDays className="h-4 w-4" />
                      Altas Hoje
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

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sector Occupancy */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bed className="h-5 w-5 text-primary" />
                  Ocupação por Setor
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sectorOccupancy} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 100]} unit="%" />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        width={120}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip 
                        formatter={(value: number, name: string) => [
                          `${value}%`,
                          'Ocupação'
                        ]}
                        labelFormatter={(label) => label}
                      />
                      <Bar 
                        dataKey="rate" 
                        fill="hsl(var(--primary))"
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Occupancy Distribution Pie */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Distribuição de Pacientes
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
                        fill="#8884d8"
                        dataKey="occupied"
                      >
                        {sectorOccupancy.map((entry, index) => (
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

          {/* Weekly Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Evolução Semanal - Internações e Altas
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
                    <Line 
                      type="monotone" 
                      dataKey="admissions" 
                      name="Internações"
                      stroke="hsl(142, 70%, 40%)" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(142, 70%, 40%)' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="discharges" 
                      name="Altas"
                      stroke="hsl(199, 89%, 48%)" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(199, 89%, 48%)' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="total" 
                      name="Total Pacientes"
                      stroke="hsl(210, 65%, 45%)" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(210, 65%, 45%)' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Sector Details Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Detalhamento por Setor
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
                        <td className="text-center py-3 px-4">{sector.total - sector.occupied}</td>
                        <td className="text-center py-3 px-4">
                          <span className={`font-semibold ${getOccupancyColor(sector.rate)}`}>
                            {sector.rate}%
                          </span>
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
