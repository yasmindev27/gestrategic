import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Loader2, BarChart3, FileText, Users, Activity, AlertTriangle, Save, TrendingUp } from 'lucide-react';
import { useUPAIndicators } from '@/hooks/useUPAIndicators';
import {
  MESES, UPA_CATEGORIAS, getAllUPAIndicators,
  UPA_INDICADORES_ESTRUTURA, UPA_INDICADORES_PROCESSO, UPA_INDICADORES_RESULTADO, UPA_INDICADORES_GESTAO,
} from '@/types/indicators';

const RISK_COLORS: Record<string, string> = {
  'Azul': '#2563eb', 'Verde': '#16a34a', 'Amarelo': '#eab308',
  'Laranja': '#ea580c', 'Vermelho': '#dc2626', 'Branco': '#6b7280',
};

export function IndicadoresUPA() {
  const {
    loading, selectedMonth, selectedYear, setSelectedMonth, setSelectedYear,
    filteredIndicators, saveIndicator, calculateStats,
  } = useUPAIndicators();

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

  // Risk classification data for chart
  const riskData = ['Azul', 'Verde', 'Amarelo', 'Laranja', 'Vermelho', 'Branco'].map(color => {
    const ind = filteredIndicators.find(i => i.indicador.includes(color));
    return { name: color, value: Number(ind?.valor_numero || 0), fill: RISK_COLORS[color] };
  }).filter(d => d.value > 0);

  // Age profile data
  const ageData = filteredIndicators
    .filter(i => i.subcategoria?.includes('Perfil Idade'))
    .map(i => ({ name: i.indicador.split('(')[0].trim(), value: Number(i.valor_numero || 0) }))
    .filter(d => d.value > 0);

  const handleSaveEntry = (categoria: string, indicador: string, meta: number | null, subcategoria?: string | null) => {
    const key = `${categoria}|${indicador}`;
    const val = entryValues[key];
    if (val === undefined || val === '') return;
    saveIndicator({
      mes: selectedMonth, ano: selectedYear, categoria, indicador,
      subcategoria: subcategoria || null,
      valor_numero: parseFloat(val),
      meta, unidade_medida: 'Nº',
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
                  <TableCell className="font-mono text-sm font-medium">{existing ?? '—'}</TableCell>
                  <TableCell>
                    <Input
                      type="number" className="h-8"
                      value={entryValues[key] || ''}
                      onChange={e => setEntryValues(prev => ({ ...prev, [key]: e.target.value }))}
                      placeholder={existing?.toString() || '0'}
                    />
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => handleSaveEntry(categoria, item.indicador, item.meta, item.subcategoria)}>
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
            <Activity className="h-5 w-5 text-primary" />
            Indicadores Assistenciais - UPA
          </h2>
          <p className="text-sm text-muted-foreground">Unidade de Pronto Atendimento - Monitoramento de Indicadores</p>
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
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Total Atendimentos</p><p className="text-2xl font-bold">{stats.totalAtendimentos}</p></div><Users className="h-6 w-6 text-primary opacity-80" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Taxa Mortalidade</p><p className="text-2xl font-bold">{stats.taxaMortalidade}</p></div><AlertTriangle className="h-6 w-6 text-destructive opacity-80" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Colaboradores</p><p className="text-2xl font-bold">{stats.colaboradores}</p></div><Users className="h-6 w-6 text-blue-600 opacity-80" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Alertas</p><p className="text-2xl font-bold">{stats.alertasCount}</p></div><AlertTriangle className="h-6 w-6 text-yellow-600 opacity-80" /></div>{stats.alertasCount > 0 && <Badge variant="destructive" className="mt-2">Ação necessária</Badge>}</CardContent></Card>
      </div>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="dashboard" className="text-xs sm:text-sm gap-1"><BarChart3 className="h-3 w-3" />Dashboard</TabsTrigger>
          <TabsTrigger value="entrada" className="text-xs sm:text-sm gap-1"><FileText className="h-3 w-3" />Entrada de Dados</TabsTrigger>
          <TabsTrigger value="epidemiologico" className="text-xs sm:text-sm gap-1"><Activity className="h-3 w-3" />Perfil Epidemiológico</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-lg">Classificação de Risco</CardTitle></CardHeader>
              <CardContent>
                {riskData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={riskData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {riskData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <div className="flex items-center justify-center h-[250px] text-muted-foreground">Sem dados</div>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-lg">Perfil por Faixa Etária</CardTitle></CardHeader>
              <CardContent>
                {ageData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={ageData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="flex items-center justify-center h-[250px] text-muted-foreground">Sem dados</div>}
              </CardContent>
            </Card>
          </div>

          {/* Indicators table summary */}
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
                          (ind.meta === 0 ? ind.valor_numero > 0 : Math.abs(((ind.valor_numero - ind.meta) / ind.meta) * 100) > 20);
                        return (
                          <TableRow key={ind.id}>
                            <TableCell className="text-sm">{ind.indicador}</TableCell>
                            <TableCell><Badge variant="outline" className="text-xs">{ind.categoria.replace('Indicadores de ', '')}</Badge></TableCell>
                            <TableCell className="text-right font-mono font-bold">{ind.valor_numero ?? '—'}</TableCell>
                            <TableCell className="text-right font-mono">{ind.meta ?? '—'}</TableCell>
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
          {renderDataEntrySection('Indicadores de Estrutura', UPA_CATEGORIAS.ESTRUTURA, UPA_INDICADORES_ESTRUTURA)}
          {renderDataEntrySection('Indicadores de Processo', UPA_CATEGORIAS.PROCESSO, UPA_INDICADORES_PROCESSO)}
          {renderDataEntrySection('Indicadores de Resultado', UPA_CATEGORIAS.RESULTADO, UPA_INDICADORES_RESULTADO)}
          {renderDataEntrySection('Gestão de Pessoas', UPA_CATEGORIAS.GESTAO_PESSOAS, UPA_INDICADORES_GESTAO)}
        </TabsContent>

        <TabsContent value="epidemiologico" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-lg">Distribuição por Gênero</CardTitle></CardHeader>
              <CardContent>
                {(() => {
                  const genderData = filteredIndicators
                    .filter(i => i.subcategoria === 'Perfil Gênero')
                    .map(i => ({ name: i.indicador.replace('Sexo ', ''), value: Number(i.valor_numero || 0), fill: i.indicador.includes('Masculino') ? '#2563eb' : '#ec4899' }))
                    .filter(d => d.value > 0);
                  return genderData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie data={genderData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                          {genderData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <div className="flex items-center justify-center h-[250px] text-muted-foreground">Sem dados</div>;
                })()}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-lg">Tempos Médios por Classificação</CardTitle></CardHeader>
              <CardContent>
                {(() => {
                  const tempoData = filteredIndicators
                    .filter(i => i.indicador.startsWith('Tempo Médio'))
                    .map(i => {
                      const label = i.indicador.match(/Classificação (\w+)/)?.[1] || '';
                      return { name: label, value: Number(i.valor_numero || 0), meta: Number(i.meta || 0), fill: RISK_COLORS[label] || '#6b7280' };
                    })
                    .filter(d => d.value > 0);
                  return tempoData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={tempoData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" name="Tempo (min)" radius={[4, 4, 0, 0]}>
                          {tempoData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                        </Bar>
                        <Bar dataKey="meta" name="Meta (min)" fill="#9ca3af" opacity={0.3} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <div className="flex items-center justify-center h-[250px] text-muted-foreground">Sem dados</div>;
                })()}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
