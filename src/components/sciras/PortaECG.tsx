import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { differenceInMinutes } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  Plus, Save, Loader2, AlertCircle, BarChart3, FileText, Users,
  CheckCircle2, Clock, TrendingUp, AlertTriangle, Trash2, Eye, X,
} from 'lucide-react';

// ── Types ──
type RiskClassification = 'vermelho' | 'laranja' | 'amarelo' | 'verde' | 'azul';

const RISK_LABELS: Record<RiskClassification, string> = {
  vermelho: 'Vermelho - Emergência',
  laranja: 'Laranja - Muito Urgente',
  amarelo: 'Amarelo - Urgente',
  verde: 'Verde - Pouco Urgente',
  azul: 'Azul - Não Urgente',
};

const RISK_COLORS: Record<RiskClassification, string> = {
  vermelho: '#dc2626',
  laranja: '#ea580c',
  amarelo: '#eab308',
  verde: '#16a34a',
  azul: '#2563eb',
};

const CONDUCT_OPTIONS = [
  'Medicação', 'Oxigênio', 'Monitorização', 'Encaminhamento',
  'Observação', 'Transferência', 'Cateterismo', 'Trombolítico',
];

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

// ── Form Schema ──
const formSchema = z.object({
  competence_month: z.number().min(1).max(12),
  competence_year: z.number().min(2020),
  record_number: z.string().min(1, 'Número do prontuário é obrigatório'),
  patient_name: z.string().optional(),
  sex: z.enum(['masculino', 'feminino', 'outro']),
  age: z.number().min(0).max(150),
  arrival_time: z.string().min(1, 'Hora de chegada é obrigatória'),
  ecg_time: z.string().min(1, 'Hora do ECG é obrigatória'),
  goal_minutes: z.number().min(1),
  delay_reason: z.string().optional(),
  delay_reason_other: z.string().optional(),
  conducts: z.array(z.string()),
  risk_classification: z.enum(['vermelho', 'laranja', 'amarelo', 'verde', 'azul']),
  first_doctor_time: z.string().optional(),
  initial_diagnosis: z.string().optional(),
  medical_report: z.string().optional(),
  action_plan: z.string().optional(),
  observations: z.string().optional(),
});

// ── Hook ──
function usePortaECG(month?: number, year?: number) {
  return useQuery({
    queryKey: ['porta-ecg', month, year],
    queryFn: async () => {
      let query = supabase
        .from('porta_ecg_atendimentos')
        .select('*')
        .order('created_at', { ascending: false });

      if (month) query = query.eq('competence_month', month);
      if (year) query = query.eq('competence_year', year);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
}

// ── Main Component ──
interface PortaECGProps {
  userId: string;
  userName: string;
}

export function PortaECG({ userId, userName }: PortaECGProps) {
  const [activeView, setActiveView] = useState('dashboard');
  const [showForm, setShowForm] = useState(false);
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const queryClient = useQueryClient();

  const { data: attendances = [], isLoading } = usePortaECG(selectedMonth, selectedYear);
  const years = Array.from({ length: 10 }, (_, i) => currentDate.getFullYear() - i);

  // Stats
  const stats = useMemo(() => {
    if (attendances.length === 0) {
      return { total: 0, withinGoal: 0, outsideGoal: 0, withinGoalPct: 0, avgMin: 0, medianMin: 0, p90Min: 0 };
    }
    const minutes = attendances.map((a: any) => a.door_to_ecg_minutes).sort((a: number, b: number) => a - b);
    const withinGoal = attendances.filter((a: any) => a.within_goal).length;
    const sum = minutes.reduce((acc: number, m: number) => acc + m, 0);
    const median = minutes.length % 2 === 0
      ? (minutes[minutes.length / 2 - 1] + minutes[minutes.length / 2]) / 2
      : minutes[Math.floor(minutes.length / 2)];
    const p90Index = Math.ceil(minutes.length * 0.9) - 1;
    return {
      total: attendances.length,
      withinGoal,
      outsideGoal: attendances.length - withinGoal,
      withinGoalPct: (withinGoal / attendances.length) * 100,
      avgMin: sum / attendances.length,
      medianMin: median,
      p90Min: minutes[p90Index] || 0,
    };
  }, [attendances]);

  const riskDistribution = useMemo(() => {
    const counts: Record<string, number> = { vermelho: 0, laranja: 0, amarelo: 0, verde: 0, azul: 0 };
    attendances.forEach((a: any) => { counts[a.risk_classification]++; });
    return Object.entries(counts).map(([key, value]) => ({
      name: key.charAt(0).toUpperCase() + key.slice(1),
      value,
      color: RISK_COLORS[key as RiskClassification],
    }));
  }, [attendances]);

  const delayReasonsData = useMemo(() => {
    const outside = attendances.filter((a: any) => !a.within_goal);
    const counts: Record<string, number> = {};
    outside.forEach((a: any) => {
      const reason = a.delay_reason || 'Não especificado';
      counts[reason] = (counts[reason] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [attendances]);

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('porta_ecg_atendimentos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['porta-ecg'] });
      toast.success('Atendimento excluído');
    },
    onError: () => toast.error('Erro ao excluir'),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Indicador Porta-ECG
          </h2>
          <p className="text-sm text-muted-foreground">
            Monitoramento do tempo entre chegada e realização do ECG em dor torácica
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? <><X className="h-4 w-4 mr-2" />Fechar</> : <><Plus className="h-4 w-4 mr-2" />Novo Atendimento</>}
        </Button>
      </div>

      {showForm && (
        <AttendanceFormCard
          userId={userId}
          onSuccess={() => {
            setShowForm(false);
            queryClient.invalidateQueries({ queryKey: ['porta-ecg'] });
          }}
        />
      )}

      {/* Filtros */}
      <div className="flex items-center gap-2">
        <Select value={selectedMonth.toString()} onValueChange={v => setSelectedMonth(parseInt(v))}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MONTHS.map((m, i) => <SelectItem key={i} value={(i + 1).toString()}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={selectedYear.toString()} onValueChange={v => setSelectedYear(parseInt(v))}>
          <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Tabs value={activeView} onValueChange={setActiveView}>
        <TabsList>
          <TabsTrigger value="dashboard" className="gap-2"><BarChart3 className="h-4 w-4" />Dashboard</TabsTrigger>
          <TabsTrigger value="atendimentos" className="gap-2"><FileText className="h-4 w-4" />Atendimentos</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-4 space-y-6">
          {/* KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KPICard title="Total de Casos" value={stats.total} icon={<Users className="h-6 w-6" />} color="text-primary" />
            <KPICard
              title="Dentro da Meta"
              value={`${stats.withinGoalPct.toFixed(1)}%`}
              subtitle={`${stats.withinGoal} atendimentos`}
              icon={<CheckCircle2 className="h-6 w-6" />}
              color={stats.withinGoalPct >= 80 ? 'text-green-600' : stats.withinGoalPct >= 60 ? 'text-yellow-600' : 'text-destructive'}
            />
            <KPICard
              title="Tempo Médio"
              value={`${stats.avgMin.toFixed(1)} min`}
              subtitle={`Mediana: ${stats.medianMin.toFixed(1)} min`}
              icon={<Clock className="h-6 w-6" />}
              color="text-blue-600"
            />
            <KPICard
              title="P90"
              value={`${stats.p90Min.toFixed(1)} min`}
              subtitle="Percentil 90"
              icon={<TrendingUp className="h-6 w-6" />}
              color="text-orange-600"
            />
          </div>

          {/* Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-lg">Distribuição por Classificação de Risco</CardTitle></CardHeader>
              <CardContent>
                {riskDistribution.some(d => d.value > 0) ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={riskDistribution.filter(d => d.value > 0)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {riskDistribution.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[250px] text-muted-foreground">Sem dados</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  Principais Motivos de Atraso
                </CardTitle>
              </CardHeader>
              <CardContent>
                {delayReasonsData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={delayReasonsData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[250px] text-muted-foreground">Nenhum atraso registrado</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="atendimentos" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Atendimentos do Período</CardTitle></CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : attendances.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground">Nenhum atendimento registrado neste período</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-primary/10">
                        <TableHead>Prontuário</TableHead>
                        <TableHead>Paciente</TableHead>
                        <TableHead>Idade</TableHead>
                        <TableHead>Risco</TableHead>
                        <TableHead>Porta-ECG</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Condutas</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendances.map((a: any) => (
                        <TableRow key={a.id}>
                          <TableCell className="font-mono">{a.record_number}</TableCell>
                          <TableCell>{a.patient_name || '—'}</TableCell>
                          <TableCell>{a.age}</TableCell>
                          <TableCell>
                            <Badge style={{ backgroundColor: RISK_COLORS[a.risk_classification as RiskClassification] + '22', color: RISK_COLORS[a.risk_classification as RiskClassification] }}>
                              {a.risk_classification}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono font-bold">{a.door_to_ecg_minutes} min</TableCell>
                          <TableCell>
                            <Badge variant={a.within_goal ? 'default' : 'destructive'}>
                              {a.within_goal ? 'Na meta' : 'Fora da meta'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {(a.conducts || []).map((c: string, i: number) => (
                                <Badge key={i} variant="outline" className="text-xs">{c}</Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir atendimento?</AlertDialogTitle>
                                  <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteMutation.mutate(a.id)}>Excluir</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── KPI Card ──
function KPICard({ title, value, subtitle, icon, color }: { title: string; value: string | number; subtitle?: string; icon: React.ReactNode; color: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className={`${color} opacity-80`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Attendance Form Card ──
function AttendanceFormCard({ userId, onSuccess }: { userId: string; onSuccess: () => void }) {
  const currentDate = new Date();
  const [doorToEcgMinutes, setDoorToEcgMinutes] = useState<number | null>(null);
  const [isOutsideGoal, setIsOutsideGoal] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      competence_month: currentDate.getMonth() + 1,
      competence_year: currentDate.getFullYear(),
      record_number: '',
      patient_name: '',
      sex: 'masculino',
      age: 0,
      arrival_time: '',
      ecg_time: '',
      goal_minutes: 10,
      delay_reason: '',
      delay_reason_other: '',
      conducts: [],
      risk_classification: 'amarelo',
      first_doctor_time: '',
      initial_diagnosis: '',
      medical_report: '',
      action_plan: '',
      observations: '',
    },
  });

  const arrivalTime = form.watch('arrival_time');
  const ecgTime = form.watch('ecg_time');
  const goalMinutes = form.watch('goal_minutes');

  useEffect(() => {
    if (arrivalTime && ecgTime) {
      const minutes = differenceInMinutes(new Date(ecgTime), new Date(arrivalTime));
      setDoorToEcgMinutes(minutes);
      setIsOutsideGoal(minutes > goalMinutes);
    } else {
      setDoorToEcgMinutes(null);
      setIsOutsideGoal(false);
    }
  }, [arrivalTime, ecgTime, goalMinutes]);

  const createMutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const { error } = await supabase.from('porta_ecg_atendimentos').insert({
        competence_month: values.competence_month,
        competence_year: values.competence_year,
        record_number: values.record_number,
        patient_name: values.patient_name || null,
        sex: values.sex,
        age: values.age,
        arrival_time: values.arrival_time,
        ecg_time: values.ecg_time,
        door_to_ecg_minutes: doorToEcgMinutes || 0,
        within_goal: !isOutsideGoal,
        goal_minutes: values.goal_minutes,
        delay_reason: values.delay_reason || null,
        delay_reason_other: values.delay_reason_other || null,
        conducts: values.conducts,
        risk_classification: values.risk_classification,
        first_doctor_time: values.first_doctor_time || null,
        initial_diagnosis: values.initial_diagnosis || null,
        medical_report: values.medical_report || null,
        action_plan: values.action_plan || null,
        observations: values.observations || null,
        created_by: userId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Atendimento registrado com sucesso');
      onSuccess();
    },
    onError: () => toast.error('Erro ao registrar atendimento'),
  });

  const years = Array.from({ length: 10 }, (_, i) => currentDate.getFullYear() - i);

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="text-lg">Cadastrar Atendimento</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(v => createMutation.mutate(v))} className="space-y-6">
            {/* Competência */}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="competence_month" render={({ field }) => (
                <FormItem>
                  <FormLabel>Mês de Competência</FormLabel>
                  <Select value={String(field.value)} onValueChange={v => field.onChange(parseInt(v))}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={form.control} name="competence_year" render={({ field }) => (
                <FormItem>
                  <FormLabel>Ano</FormLabel>
                  <Select value={String(field.value)} onValueChange={v => field.onChange(parseInt(v))}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
            </div>

            {/* Paciente */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <FormField control={form.control} name="record_number" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nº Prontuário *</FormLabel>
                  <FormControl><Input placeholder="Ex: 12345" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="patient_name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Paciente</FormLabel>
                  <FormControl><Input placeholder="Opcional" {...field} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="sex" render={({ field }) => (
                <FormItem>
                  <FormLabel>Sexo *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="masculino">Masculino</SelectItem>
                      <SelectItem value="feminino">Feminino</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={form.control} name="age" render={({ field }) => (
                <FormItem>
                  <FormLabel>Idade *</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} max={150} {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
                  </FormControl>
                </FormItem>
              )} />
            </div>

            {/* Indicador Porta-ECG */}
            <Card className="bg-muted/30">
              <CardHeader><CardTitle className="text-base">Indicador Porta-ECG</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <FormField control={form.control} name="arrival_time" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hora de Chegada *</FormLabel>
                      <FormControl><Input type="datetime-local" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="ecg_time" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hora do ECG *</FormLabel>
                      <FormControl><Input type="datetime-local" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="goal_minutes" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meta (min)</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} {...field} onChange={e => field.onChange(parseInt(e.target.value) || 10)} />
                      </FormControl>
                    </FormItem>
                  )} />
                </div>

                {doorToEcgMinutes !== null && (
                  <Alert variant={isOutsideGoal ? 'destructive' : 'default'} className={!isOutsideGoal ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : ''}>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="flex items-center gap-3">
                      <span className="font-medium">
                        Tempo Porta-ECG: <span className="font-mono font-bold">{doorToEcgMinutes} minutos</span>
                      </span>
                      <Badge variant={isOutsideGoal ? 'destructive' : 'default'}>
                        {isOutsideGoal ? 'FORA DA META' : 'DENTRO DA META'}
                      </Badge>
                    </AlertDescription>
                  </Alert>
                )}

                {isOutsideGoal && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField control={form.control} name="delay_reason" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Motivo do Atraso</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="Demora triagem">Demora na triagem</SelectItem>
                            <SelectItem value="Equipamento indisponível">Equipamento indisponível</SelectItem>
                            <SelectItem value="Equipe ocupada">Equipe ocupada</SelectItem>
                            <SelectItem value="Paciente instável">Paciente instável</SelectItem>
                            <SelectItem value="Outro">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="delay_reason_other" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Especifique</FormLabel>
                        <FormControl><Input placeholder="Descreva o motivo" {...field} /></FormControl>
                      </FormItem>
                    )} />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Classificação e Conduta */}
            <div className="grid gap-4 lg:grid-cols-2">
              <FormField control={form.control} name="risk_classification" render={({ field }) => (
                <FormItem>
                  <FormLabel>Classificação de Risco *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {(Object.keys(RISK_LABELS) as RiskClassification[]).map(k => (
                        <SelectItem key={k} value={k}>{RISK_LABELS[k]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={form.control} name="first_doctor_time" render={({ field }) => (
                <FormItem>
                  <FormLabel>Horário do Primeiro Médico</FormLabel>
                  <FormControl><Input type="datetime-local" {...field} /></FormControl>
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="conducts" render={() => (
              <FormItem>
                <FormLabel>Condutas</FormLabel>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {CONDUCT_OPTIONS.map(conduct => (
                    <FormField key={conduct} control={form.control} name="conducts" render={({ field }) => (
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(conduct)}
                            onCheckedChange={checked => {
                              const current = field.value || [];
                              field.onChange(checked ? [...current, conduct] : current.filter(c => c !== conduct));
                            }}
                          />
                        </FormControl>
                        <FormLabel className="text-sm font-normal cursor-pointer">{conduct}</FormLabel>
                      </FormItem>
                    )} />
                  ))}
                </div>
              </FormItem>
            )} />

            {/* Relatório */}
            <div className="grid gap-4 lg:grid-cols-2">
              <FormField control={form.control} name="initial_diagnosis" render={({ field }) => (
                <FormItem>
                  <FormLabel>Diagnóstico Inicial</FormLabel>
                  <FormControl><Input placeholder="Ex: IAM, Angina..." {...field} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="medical_report" render={({ field }) => (
                <FormItem>
                  <FormLabel>Relatório Médico</FormLabel>
                  <FormControl><Textarea placeholder="Descreva o atendimento..." {...field} /></FormControl>
                </FormItem>
              )} />
            </div>

            {isOutsideGoal && (
              <FormField control={form.control} name="action_plan" render={({ field }) => (
                <FormItem>
                  <FormLabel>Plano de Ação</FormLabel>
                  <FormControl><Textarea placeholder="Plano de ação para melhoria..." {...field} /></FormControl>
                </FormItem>
              )} />
            )}

            <FormField control={form.control} name="observations" render={({ field }) => (
              <FormItem>
                <FormLabel>Observações</FormLabel>
                <FormControl><Textarea placeholder="Observações adicionais..." {...field} /></FormControl>
              </FormItem>
            )} />

            <div className="flex justify-end gap-4">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</> : <><Save className="h-4 w-4 mr-2" />Salvar Atendimento</>}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
