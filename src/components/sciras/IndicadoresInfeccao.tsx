import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { LoadingState } from '@/components/ui/loading-state';
import { StatCard } from '@/components/ui/stat-card';
import { toast } from 'sonner';
import { Plus, TrendingUp, Activity, Thermometer, Droplets } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { IndicadorDiario } from './types';

interface Props {
  userId: string;
  userName: string;
}

export function IndicadoresInfeccao({ userId, userName }: Props) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [periodoFilter, setPeriodoFilter] = useState('30');

  const dataInicio = subDays(new Date(), parseInt(periodoFilter));

  const { data: indicadores = [], isLoading } = useQuery({
    queryKey: ['sciras-indicadores', periodoFilter],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sciras_indicadores_diarios')
        .select('*')
        .gte('data_registro', format(dataInicio, 'yyyy-MM-dd'))
        .order('data_registro', { ascending: true });
      if (error) throw error;
      return data as IndicadorDiario[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (form: Partial<IndicadorDiario>) => {
      const { error } = await supabase.from('sciras_indicadores_diarios').insert({
        ...form,
        registrado_por: userId,
        registrado_por_nome: userName,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sciras-indicadores'] });
      setDialogOpen(false);
      toast.success('Indicador registrado com sucesso');
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Cálculo das taxas de densidade de incidência
  const totais = useMemo(() => {
    const totalCVC = indicadores.reduce((acc, i) => acc + i.cvc_dia, 0);
    const totalSVD = indicadores.reduce((acc, i) => acc + i.svd_dia, 0);
    const totalVM = indicadores.reduce((acc, i) => acc + i.vm_dia, 0);
    const totalIPCS = indicadores.reduce((acc, i) => acc + i.ipcs_novas, 0);
    const totalITU = indicadores.reduce((acc, i) => acc + i.itu_novas, 0);
    const totalPAV = indicadores.reduce((acc, i) => acc + i.pav_novas, 0);
    const totalPacientes = indicadores.reduce((acc, i) => acc + i.pacientes_dia, 0);

    return {
      densidadeIPCS: totalCVC > 0 ? ((totalIPCS / totalCVC) * 1000).toFixed(2) : '0',
      densidadeITU: totalSVD > 0 ? ((totalITU / totalSVD) * 1000).toFixed(2) : '0',
      densidadePAV: totalVM > 0 ? ((totalPAV / totalVM) * 1000).toFixed(2) : '0',
      taxaGeral: totalPacientes > 0 ? (((totalIPCS + totalITU + totalPAV) / totalPacientes) * 1000).toFixed(2) : '0',
      totalInfeccoes: totalIPCS + totalITU + totalPAV,
      totalPacientes,
    };
  }, [indicadores]);

  // Dados agrupados para gráfico
  const chartData = useMemo(() => {
    const grouped: Record<string, any> = {};
    indicadores.forEach(i => {
      const key = i.data_registro;
      if (!grouped[key]) grouped[key] = { data: format(new Date(key + 'T12:00:00'), 'dd/MM'), ipcs: 0, itu: 0, pav: 0 };
      grouped[key].ipcs += i.ipcs_novas;
      grouped[key].itu += i.itu_novas;
      grouped[key].pav += i.pav_novas;
    });
    return Object.values(grouped);
  }, [indicadores]);

  if (isLoading) return <LoadingState message="Carregando indicadores..." />;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="IPCS / 1000 CVC-dia" value={totais.densidadeIPCS} icon={Activity} variant="destructive" />
        <StatCard title="ITU / 1000 SVD-dia" value={totais.densidadeITU} icon={Droplets} variant="info" />
        <StatCard title="PAV / 1000 VM-dia" value={totais.densidadePAV} icon={Thermometer} variant="warning" />
        <StatCard title="Taxa Geral / 1000 pac-dia" value={totais.taxaGeral} icon={TrendingUp} variant="success" />
      </div>

      {/* Filtros e ação */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <Select value={periodoFilter} onValueChange={setPeriodoFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
            <SelectItem value="180">Últimos 6 meses</SelectItem>
          </SelectContent>
        </Select>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Registrar Indicadores</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Registro Diário de Indicadores</DialogTitle>
            </DialogHeader>
            <NovoIndicadorForm onSubmit={(f) => createMutation.mutate(f)} isLoading={createMutation.isPending} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Gráfico */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Evolução de Infecções</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="data" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Legend />
                <Bar dataKey="ipcs" name="IPCS" fill="hsl(var(--destructive))" />
                <Bar dataKey="itu" name="ITU" fill="hsl(var(--primary))" />
                <Bar dataKey="pav" name="PAV" fill="hsl(var(--warning))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Resumo */}
      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            Total de <span className="font-bold text-foreground">{totais.totalInfeccoes}</span> infecções registradas em{' '}
            <span className="font-bold text-foreground">{totais.totalPacientes}</span> pacientes-dia no período selecionado.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function NovoIndicadorForm({ onSubmit, isLoading }: { onSubmit: (f: any) => void; isLoading: boolean }) {
  const [form, setForm] = useState({
    data_registro: format(new Date(), 'yyyy-MM-dd'),
    setor: '',
    pacientes_dia: 0,
    cvc_dia: 0,
    svd_dia: 0,
    vm_dia: 0,
    ipcs_novas: 0,
    itu_novas: 0,
    pav_novas: 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.setor || !form.data_registro) {
      toast.error('Preencha data e setor');
      return;
    }
    onSubmit(form);
  };

  const numField = (label: string, key: string) => (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input type="number" min={0} value={(form as any)[key]} onChange={e => setForm(p => ({ ...p, [key]: parseInt(e.target.value) || 0 }))} />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Data *</Label>
          <Input type="date" value={form.data_registro} onChange={e => setForm(p => ({ ...p, data_registro: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Setor *</Label>
          <Input value={form.setor} onChange={e => setForm(p => ({ ...p, setor: e.target.value }))} placeholder="Ex: UTI Adulto" />
        </div>
      </div>
      {numField('Pacientes-dia', 'pacientes_dia')}
      <div className="grid grid-cols-3 gap-4">
        {numField('CVC-dia', 'cvc_dia')}
        {numField('SVD-dia', 'svd_dia')}
        {numField('VM-dia', 'vm_dia')}
      </div>
      <div className="grid grid-cols-3 gap-4">
        {numField('IPCS novas', 'ipcs_novas')}
        {numField('ITU novas', 'itu_novas')}
        {numField('PAV novas', 'pav_novas')}
      </div>
      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? 'Salvando...' : 'Registrar'}
      </Button>
    </form>
  );
}
