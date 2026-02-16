import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Loader2, BarChart3, FileText, Shield, Users, AlertTriangle, Save, ClipboardList } from 'lucide-react';
import { useNSPIndicators } from '@/hooks/useNSPIndicators';
import {
  MESES, NSP_CATEGORIAS,
  NSP_INDICADORES_ESTRUTURA, NSP_INDICADORES_PROCESSO, NSP_INDICADORES_AUDITORIAS, NSP_INDICADORES_RESULTADO,
} from '@/types/indicators';

const COLORS = ['#2563eb', '#16a34a', '#eab308', '#ea580c', '#dc2626', '#8b5cf6', '#06b6d4', '#f97316'];

export function IndicadoresNSP() {
  const {
    loading, selectedMonth, selectedYear, setSelectedMonth, setSelectedYear,
    filteredIndicators, saveIndicator, calculateStats,
  } = useNSPIndicators();

  const [entryValues, setEntryValues] = useState<Record<string, string>>({});

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Carregando indicadores...</span>
      </div>
    );
  }

  const stats = calculateStats;

  // Incident classification for chart
  const incidentData = filteredIndicators
    .filter(i => i.subcategoria === 'Classificação de Incidentes')
    .map((i, idx) => ({ name: i.indicador, value: Number(i.valor_numero || 0), fill: COLORS[idx % COLORS.length] }))
    .filter(d => d.value > 0);

  // Incident type (OMS) for chart
  const incidentTypeData = filteredIndicators
    .filter(i => i.subcategoria === 'Tipo de Incidentes - OMS')
    .map(i => ({ name: i.indicador, value: Number(i.valor_numero || 0) }))
    .filter(d => d.value > 0);

  const handleSaveEntry = (categoria: string, indicador: string, meta: number | null, subcategoria?: string | null, unidade?: string) => {
    const key = `${categoria}|${indicador}`;
    const val = entryValues[key];
    if (val === undefined || val === '') return;
    saveIndicator({
      mes: selectedMonth, ano: selectedYear, categoria, indicador,
      subcategoria: subcategoria || null,
      valor_numero: parseFloat(val),
      meta, unidade_medida: unidade || 'Nº',
    });
  };

  const getExistingValue = (categoria: string, indicador: string) => {
    return filteredIndicators.find(i => i.categoria === categoria && i.indicador === indicador)?.valor_numero;
  };

  const renderDataEntrySection = (title: string, categoria: string, items: any[]) => (
    <Card key={categoria}>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Indicador</TableHead>
              <TableHead className="w-[100px]">Meta</TableHead>
              <TableHead className="w-[120px]">Valor Atual</TableHead>
              <TableHead className="w-[120px]">Novo Valor</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const key = `${categoria}|${item.indicador}`;
              const existing = getExistingValue(categoria, item.indicador);
              return (
                <TableRow key={item.indicador}>
                  <TableCell className="text-sm">
                    {item.indicador}
                    {item.subcategoria && <Badge variant="outline" className="ml-2 text-xs">{item.subcategoria}</Badge>}
                  </TableCell>
                  <TableCell className="font-mono text-sm">{item.meta ?? '—'}</TableCell>
                  <TableCell className="font-mono text-sm font-medium">{existing != null ? Number(existing) : '—'}</TableCell>
                  <TableCell>
                    <Input
                      type="number" className="h-8"
                      value={entryValues[key] || ''}
                      onChange={e => setEntryValues(prev => ({ ...prev, [key]: e.target.value }))}
                      placeholder={existing?.toString() || '0'}
                    />
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => handleSaveEntry(categoria, item.indicador, item.meta, item.subcategoria, item.unidade)}>
                      <Save className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Núcleo de Segurança do Paciente
          </h2>
          <p className="text-sm text-muted-foreground">Indicadores de Internação - Monitoramento de Incidentes</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>{MESES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={selectedYear.toString()} onValueChange={v => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
            <SelectContent>{[2024, 2025, 2026].map(a => <SelectItem key={a} value={a.toString()}>{a}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Total Internações</p><p className="text-2xl font-bold">{stats.totalInternacoes}</p></div><Users className="h-6 w-6 text-primary opacity-80" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Total Óbitos</p><p className="text-2xl font-bold">{stats.totalObitos}</p></div><AlertTriangle className="h-6 w-6 text-destructive opacity-80" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Profissionais</p><p className="text-2xl font-bold">{stats.totalProfissionais}</p></div><Users className="h-6 w-6 text-blue-600 opacity-80" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Notificações</p><p className="text-2xl font-bold">{stats.totalNotificacoes}</p></div><ClipboardList className="h-6 w-6 text-yellow-600 opacity-80" /></div>{stats.alertasCount > 0 && <Badge variant="destructive" className="mt-2">{stats.alertasCount} alertas</Badge>}</CardContent></Card>
      </div>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="dashboard" className="text-xs sm:text-sm gap-1"><BarChart3 className="h-3 w-3" />Dashboard</TabsTrigger>
          <TabsTrigger value="entrada" className="text-xs sm:text-sm gap-1"><FileText className="h-3 w-3" />Entrada de Dados</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-lg">Classificação de Incidentes</CardTitle></CardHeader>
              <CardContent>
                {incidentData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={incidentData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                        label={({ name, percent }) => `${name.substring(0, 15)}... ${(percent * 100).toFixed(0)}%`}>
                        {incidentData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <div className="flex items-center justify-center h-[250px] text-muted-foreground">Sem dados</div>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-lg">Tipos de Incidentes (OMS)</CardTitle></CardHeader>
              <CardContent>
                {incidentTypeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={incidentTypeData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="flex items-center justify-center h-[250px] text-muted-foreground">Sem dados</div>}
              </CardContent>
            </Card>
          </div>

          {/* Summary table */}
          {filteredIndicators.length > 0 && (
            <Card className="mt-6">
              <CardHeader><CardTitle className="text-lg">Resumo dos Indicadores</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-primary/10">
                        <TableHead>Indicador</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead className="text-right">Meta</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredIndicators.map(ind => {
                        const isAlert = ind.meta !== null && ind.valor_numero !== null &&
                          (ind.meta === 0 ? ind.valor_numero > 0 : ind.valor_numero > ind.meta);
                        return (
                          <TableRow key={ind.id}>
                            <TableCell className="text-sm">{ind.indicador}</TableCell>
                            <TableCell><Badge variant="outline" className="text-xs">{ind.categoria.replace('Indicadores de ', '').replace('Auditorias de ', '')}</Badge></TableCell>
                            <TableCell className="text-right font-mono font-bold">{ind.valor_numero != null ? Number(ind.valor_numero) : '—'}</TableCell>
                            <TableCell className="text-right font-mono">{ind.meta != null ? Number(ind.meta) : '—'}</TableCell>
                            <TableCell>
                              {ind.meta !== null ? (
                                <Badge variant={isAlert ? 'destructive' : 'default'}>{isAlert ? 'Alerta' : 'OK'}</Badge>
                              ) : '—'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="entrada" className="mt-6 space-y-6">
          {renderDataEntrySection('Indicadores de Estrutura', NSP_CATEGORIAS.ESTRUTURA, NSP_INDICADORES_ESTRUTURA)}
          {renderDataEntrySection('Indicadores de Processo', NSP_CATEGORIAS.PROCESSO, NSP_INDICADORES_PROCESSO)}
          {renderDataEntrySection('Auditorias de Segurança', NSP_CATEGORIAS.AUDITORIAS, NSP_INDICADORES_AUDITORIAS)}
          {renderDataEntrySection('Indicadores de Resultado', NSP_CATEGORIAS.RESULTADO, NSP_INDICADORES_RESULTADO)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
