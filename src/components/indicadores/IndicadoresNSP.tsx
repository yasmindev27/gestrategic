import { useState, useMemo, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ExportDropdown } from '@/components/ui/export-dropdown';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Loader2, BarChart3, FileText, Shield, Users, AlertTriangle, Save, ClipboardList, TrendingUp, Target, Pencil, Activity, Heart } from 'lucide-react';
import { useNSPIndicators } from '@/hooks/useNSPIndicators';
import {
  MESES, NSP_CATEGORIAS,
  NSP_INDICADORES_ESTRUTURA, NSP_INDICADORES_PROCESSO, NSP_INDICADORES_RESULTADO,
  NSP_INDICADORES_SEPSE, NSP_INDICADORES_DOR_TORACICA,
} from '@/types/indicators';
import { exportToCSV, exportToPDF, createStandardPdf, savePdfWithFooter } from '@/lib/export-utils';
import autoTable from 'jspdf-autotable';

const COLORS = ['#2563eb', '#16a34a', '#eab308', '#ea580c', '#dc2626', '#8b5cf6', '#06b6d4', '#f97316'];
const MESES_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export function IndicadoresNSP() {
  const {
    indicators, loading, selectedMonth, selectedYear, setSelectedMonth, setSelectedYear,
    filteredIndicators, saveIndicator, calculateStats,
  } = useNSPIndicators();

  const [entryValues, setEntryValues] = useState<Record<string, string>>({});
  const [entryObs, setEntryObs] = useState<Record<string, string>>({});
  const [editingMeta, setEditingMeta] = useState<{ categoria: string; indicador: string; currentMeta: number | null } | null>(null);
  const [newMetaValue, setNewMetaValue] = useState('');

  const stats = calculateStats;

  // ── Monthly evolution data ──
  const monthlyEvolutionData = useMemo(() => {
    return MESES.map((mes, idx) => {
      const monthIndicators = indicators.filter(i => i.mes === mes && i.ano === selectedYear);
      const internacoes = monthIndicators.find(i => i.indicador === 'Número de Internações')?.valor_numero || null;
      const taxaOcupacao = monthIndicators.find(i => i.indicador === 'Taxa de Ocupação')?.valor_numero || null;
      const mortalidade = monthIndicators.find(i => i.indicador === 'Taxa de Mortalidade')?.valor_numero || null;
      return {
        mes: MESES_SHORT[idx],
        Internações: internacoes != null ? Number(internacoes) : null,
        'Taxa Ocupação (%)': taxaOcupacao != null ? Number(taxaOcupacao) : null,
        Mortalidade: mortalidade != null ? Number(mortalidade) : null,
      };
    });
  }, [indicators, selectedYear]);

  const protocolEvolution = useMemo(() => {
    return MESES.map((mes, idx) => {
      const monthIndicators = indicators.filter(i => i.mes === mes && i.ano === selectedYear);
      const sepse = monthIndicators.find(i => i.categoria === NSP_CATEGORIAS.SEPSE && i.indicador === 'Total de Protocolos Abertos')?.valor_numero;
      const dorToracica = monthIndicators.find(i => i.categoria === NSP_CATEGORIAS.DOR_TORACICA && i.indicador === 'Total de Protocolos Abertos')?.valor_numero;
      return {
        mes: MESES_SHORT[idx],
        Sepse: sepse != null ? Number(sepse) : null,
        'Dor Torácica': dorToracica != null ? Number(dorToracica) : null,
      };
    });
  }, [indicators, selectedYear]);

  const hasEvolutionData = monthlyEvolutionData.some(d => d.Internações !== null || d.Mortalidade !== null);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Carregando indicadores...</span>
      </div>
    );
  }

  // Perfil epidemiológico for pie chart
  const perfilAdultoData = [
    { name: 'Masculino', value: Number(filteredIndicators.find(i => i.indicador === 'Perfil Epidemiológico Adulto - Sexo Masculino')?.valor_numero || 0) },
    { name: 'Feminino', value: Number(filteredIndicators.find(i => i.indicador === 'Perfil Epidemiológico Adulto - Sexo Feminino')?.valor_numero || 0) },
  ].filter(d => d.value > 0);

  const perfilInfantilValue = Number(filteredIndicators.find(i => i.indicador === 'Perfil Epidemiológico Infantil')?.valor_numero || 0);

  // Desfechos Sepse
  const desfechoSepseData = filteredIndicators
    .filter(i => i.categoria === NSP_CATEGORIAS.SEPSE && i.subcategoria === 'Desfecho Clínico')
    .map((i, idx) => ({ name: i.indicador.replace('Desfecho Clínico - ', ''), value: Number(i.valor_numero || 0), fill: COLORS[idx % COLORS.length] }))
    .filter(d => d.value > 0);

  // Desfechos Dor Torácica
  const desfechoDorData = filteredIndicators
    .filter(i => i.categoria === NSP_CATEGORIAS.DOR_TORACICA && i.subcategoria === 'Desfecho Clínico')
    .map((i, idx) => ({ name: i.indicador.replace('Desfecho Clínico - ', ''), value: Number(i.valor_numero || 0), fill: COLORS[idx % COLORS.length] }))
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

  const handleSaveMeta = () => {
    if (!editingMeta) return;
    const newMeta = newMetaValue === '' ? null : parseFloat(newMetaValue);
    const existing = filteredIndicators.find(
      i => i.categoria === editingMeta.categoria && i.indicador === editingMeta.indicador
    );
    saveIndicator({
      mes: selectedMonth, ano: selectedYear,
      categoria: editingMeta.categoria,
      indicador: editingMeta.indicador,
      subcategoria: existing?.subcategoria || null,
      valor_numero: existing?.valor_numero ?? 0,
      meta: newMeta,
      unidade_medida: existing?.unidade_medida || 'Nº',
    });
    setEditingMeta(null);
    setNewMetaValue('');
  };

  const getExistingValue = (categoria: string, indicador: string) => {
    return filteredIndicators.find(i => i.categoria === categoria && i.indicador === indicador)?.valor_numero;
  };

  const getExistingMeta = (categoria: string, indicador: string) => {
    return filteredIndicators.find(i => i.categoria === categoria && i.indicador === indicador)?.meta;
  };

  const renderDataEntrySection = (title: string, categoria: string, items: any[], icon?: React.ReactNode) => (
    <Card key={categoria}>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Indicador</TableHead>
              <TableHead className="w-[100px]">Meta</TableHead>
              <TableHead className="w-[100px]">Valor Atual</TableHead>
              <TableHead className="w-[120px]">Novo Valor</TableHead>
              <TableHead className="w-[160px]">Observações</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const key = `${categoria}|${item.indicador}`;
              const existing = getExistingValue(categoria, item.indicador);
              const currentMeta = getExistingMeta(categoria, item.indicador) ?? item.meta;
              return (
                <TableRow key={item.indicador}>
                  <TableCell className="text-sm">
                    {item.indicador}
                    {item.subcategoria && <Badge variant="outline" className="ml-2 text-xs">{item.subcategoria}</Badge>}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-sm">{currentMeta ?? '—'}</span>
                      <Button
                        size="icon" variant="ghost" className="h-6 w-6"
                        onClick={() => {
                          setEditingMeta({ categoria, indicador: item.indicador, currentMeta });
                          setNewMetaValue(currentMeta?.toString() || '');
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
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
                    <Input
                      type="text" className="h-8 text-xs"
                      value={entryObs[key] || ''}
                      onChange={e => setEntryObs(prev => ({ ...prev, [key]: e.target.value }))}
                      placeholder="Obs..."
                    />
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => handleSaveEntry(categoria, item.indicador, currentMeta, item.subcategoria, item.unidade)}>
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
            Indicadores Hospitalares
          </h2>
          <p className="text-sm text-muted-foreground">Internação — Protocolos de Sepse e Dor Torácica</p>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>{MESES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={selectedYear.toString()} onValueChange={v => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
            <SelectContent>{[2024, 2025, 2026].map(a => <SelectItem key={a} value={a.toString()}>{a}</SelectItem>)}</SelectContent>
          </Select>
          <ExportDropdown
            onExportCSV={() => {
              const headers = ['Indicador', 'Categoria', 'Subcategoria', 'Valor', 'Meta', 'Unidade'];
              const rows = filteredIndicators.map(i => [
                i.indicador, i.categoria, i.subcategoria || '', 
                i.valor_numero != null ? Number(i.valor_numero) : '', 
                i.meta != null ? Number(i.meta) : '', 
                i.unidade_medida || ''
              ]);
              exportToCSV({ title: `Indicadores Hospitalares - ${selectedMonth} ${selectedYear}`, headers, rows, fileName: `indicadores_hospitalares_${selectedMonth}_${selectedYear}` });
            }}
            onExportPDF={async () => {
              const pdfTitle = `Indicadores Hospitalares - ${selectedMonth} ${selectedYear}`;
              const { doc, logoImg } = await createStandardPdf(pdfTitle, 'landscape');

              autoTable(doc, {
                startY: 32,
                head: [['Indicador', 'Categoria', 'Valor', 'Meta', 'Unidade']],
                body: filteredIndicators.map(i => [
                  i.indicador, i.categoria,
                  i.valor_numero != null ? Number(i.valor_numero) : '—',
                  i.meta != null ? Number(i.meta) : '—',
                  i.unidade_medida || 'Nº',
                ]),
                styles: { fontSize: 8, cellPadding: 2 },
                headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [245, 245, 245] },
                margin: { top: 32, bottom: 28 },
              });

              savePdfWithFooter(doc, pdfTitle, `indicadores_hospitalares_${selectedMonth}_${selectedYear}`, logoImg);
            }}
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Internações</p><p className="text-2xl font-bold">{stats.totalInternacoes}</p></div><Users className="h-6 w-6 text-primary opacity-80" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Taxa de Ocupação</p><p className="text-2xl font-bold">{stats.taxaOcupacao}%</p></div><BarChart3 className="h-6 w-6 text-primary opacity-80" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Taxa de Mortalidade</p><p className="text-2xl font-bold">{stats.taxaMortalidade}</p></div><AlertTriangle className="h-6 w-6 text-destructive opacity-80" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Protocolos Sepse</p><p className="text-2xl font-bold">{stats.protocolosSepse}</p></div><Activity className="h-6 w-6 text-primary opacity-80" /></div></CardContent></Card>
      </div>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="dashboard" className="text-xs sm:text-sm gap-1"><BarChart3 className="h-3 w-3" />Dashboard</TabsTrigger>
          <TabsTrigger value="evolucao" className="text-xs sm:text-sm gap-1"><TrendingUp className="h-3 w-3" />Evolução Mensal</TabsTrigger>
          <TabsTrigger value="entrada" className="text-xs sm:text-sm gap-1"><FileText className="h-3 w-3" />Entrada de Dados</TabsTrigger>
        </TabsList>

        {/* ── Dashboard Tab ── */}
        <TabsContent value="dashboard" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Perfil Epidemiológico Adulto */}
            <Card>
              <CardHeader><CardTitle className="text-lg">Perfil Epidemiológico - Adulto</CardTitle></CardHeader>
              <CardContent>
                {perfilAdultoData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={perfilAdultoData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        <Cell fill="#2563eb" />
                        <Cell fill="#ec4899" />
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <div className="flex items-center justify-center h-[250px] text-muted-foreground">Sem dados para o período</div>}
              </CardContent>
            </Card>

            {/* Perfil Epidemiológico Infantil */}
            <Card>
              <CardHeader><CardTitle className="text-lg">Perfil Epidemiológico Infantil</CardTitle></CardHeader>
              <CardContent>
                {perfilInfantilValue > 0 ? (
                  <div className="flex flex-col items-center justify-center h-[250px]">
                    <span className="text-5xl font-bold text-primary">{perfilInfantilValue}</span>
                    <span className="text-muted-foreground mt-2">Total de atendimentos infantis</span>
                  </div>
                ) : <div className="flex items-center justify-center h-[250px] text-muted-foreground">Sem dados para o período</div>}
              </CardContent>
            </Card>

            {/* Desfechos Sepse */}
            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Activity className="h-5 w-5 text-destructive" />Desfechos - Protocolo Sepse</CardTitle></CardHeader>
              <CardContent>
                {desfechoSepseData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={desfechoSepseData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {desfechoSepseData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <div className="flex items-center justify-center h-[250px] text-muted-foreground">Sem dados para o período</div>}
              </CardContent>
            </Card>

            {/* Desfechos Dor Torácica */}
            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Heart className="h-5 w-5 text-destructive" />Desfechos - Dor Torácica</CardTitle></CardHeader>
              <CardContent>
                {desfechoDorData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={desfechoDorData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {desfechoDorData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <div className="flex items-center justify-center h-[250px] text-muted-foreground">Sem dados para o período</div>}
              </CardContent>
            </Card>
          </div>

          {/* Summary table */}
          {filteredIndicators.length > 0 && (
            <Card className="mt-6">
              <CardHeader><CardTitle className="text-lg flex items-center gap-2">Resumo dos Indicadores <Target className="h-4 w-4 text-muted-foreground" /></CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-primary/5">
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
                            <TableCell><Badge variant="outline" className="text-xs">{ind.categoria}</Badge></TableCell>
                            <TableCell className="text-right font-mono font-bold">{ind.valor_numero != null ? Number(ind.valor_numero) : '—'}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <span className="font-mono">{ind.meta != null ? Number(ind.meta) : '—'}</span>
                                <Button
                                  size="icon" variant="ghost" className="h-6 w-6"
                                  onClick={() => {
                                    setEditingMeta({ categoria: ind.categoria, indicador: ind.indicador, currentMeta: ind.meta != null ? Number(ind.meta) : null });
                                    setNewMetaValue(ind.meta?.toString() || '');
                                  }}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
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

        {/* ── Evolução Mensal Tab ── */}
        <TabsContent value="evolucao" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Evolução Mensal — Indicadores Gerais ({selectedYear})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {hasEvolutionData ? (
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={monthlyEvolutionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                      labelStyle={{ fontWeight: 'bold' }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="Internações" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} connectNulls />
                    <Line type="monotone" dataKey="Taxa Ocupação (%)" stroke="#16a34a" strokeWidth={2} dot={{ r: 4 }} connectNulls />
                    <Line type="monotone" dataKey="Mortalidade" stroke="#dc2626" strokeWidth={2} dot={{ r: 4 }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-[320px] text-muted-foreground gap-2">
                  <TrendingUp className="h-12 w-12 opacity-30" />
                  <p>Sem dados suficientes para exibir a evolução mensal</p>
                  <p className="text-xs">Preencha os indicadores na aba "Entrada de Dados" para visualizar os gráficos</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Protocolos evolution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-destructive" />
                Evolução — Protocolos Abertos ({selectedYear})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={protocolEvolution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                  />
                  <Legend />
                  <Bar dataKey="Sepse" fill="#dc2626" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Dor Torácica" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Entrada de Dados Tab ── */}
        <TabsContent value="entrada" className="mt-6 space-y-6">
          {renderDataEntrySection('Indicadores de Estrutura', NSP_CATEGORIAS.ESTRUTURA, NSP_INDICADORES_ESTRUTURA, <ClipboardList className="h-4 w-4 text-primary" />)}
          {renderDataEntrySection('Indicadores de Processo', NSP_CATEGORIAS.PROCESSO, NSP_INDICADORES_PROCESSO, <Users className="h-4 w-4 text-primary" />)}
          {renderDataEntrySection('Indicadores de Resultado', NSP_CATEGORIAS.RESULTADO, NSP_INDICADORES_RESULTADO, <Target className="h-4 w-4 text-primary" />)}
          {renderDataEntrySection('Protocolo de Sepse', NSP_CATEGORIAS.SEPSE, NSP_INDICADORES_SEPSE, <Activity className="h-4 w-4 text-destructive" />)}
          {renderDataEntrySection('Protocolo de Dor Torácica', NSP_CATEGORIAS.DOR_TORACICA, NSP_INDICADORES_DOR_TORACICA, <Heart className="h-4 w-4 text-destructive" />)}
        </TabsContent>
      </Tabs>

      {/* Edit Meta Dialog */}
      <Dialog open={!!editingMeta} onOpenChange={(open) => !open && setEditingMeta(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Editar Meta
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">{editingMeta?.indicador}</p>
            <div className="space-y-2">
              <Label>Meta atual: <span className="font-mono font-bold">{editingMeta?.currentMeta ?? 'Não definida'}</span></Label>
              <Input
                type="number"
                value={newMetaValue}
                onChange={(e) => setNewMetaValue(e.target.value)}
                placeholder="Nova meta (deixe vazio para remover)"
                onKeyDown={(e) => e.key === 'Enter' && handleSaveMeta()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMeta(null)}>Cancelar</Button>
            <Button onClick={handleSaveMeta}>
              <Save className="h-4 w-4 mr-2" />
              Salvar Meta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}