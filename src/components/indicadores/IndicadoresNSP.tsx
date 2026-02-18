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
  PieChart, Pie, Cell, Legend, Area, AreaChart,
} from 'recharts';
import { Loader2, BarChart3, FileText, Shield, Users, AlertTriangle, Save, ClipboardList, TrendingUp, Target, Pencil } from 'lucide-react';
import { useNSPIndicators } from '@/hooks/useNSPIndicators';
import {
  MESES, NSP_CATEGORIAS,
  NSP_INDICADORES_ESTRUTURA, NSP_INDICADORES_PROCESSO, NSP_INDICADORES_AUDITORIAS, NSP_INDICADORES_RESULTADO,
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
  const [editingMeta, setEditingMeta] = useState<{ categoria: string; indicador: string; currentMeta: number | null } | null>(null);
  const [newMetaValue, setNewMetaValue] = useState('');

  const stats = calculateStats;

  // ── Monthly evolution data ──
  const monthlyEvolutionData = useMemo(() => {
    return MESES.map((mes, idx) => {
      const monthIndicators = indicators.filter(i => i.mes === mes && i.ano === selectedYear);
      const internacoes = monthIndicators.find(i => i.indicador === 'Número de Internações')?.valor_numero || null;
      const obitos = monthIndicators.find(i => i.indicador === 'Número de Óbitos')?.valor_numero || null;
      const notificacoes = monthIndicators.find(i => i.indicador === 'Número Total de Notificações de Incidentes')?.valor_numero || null;
      const naoConformidades = monthIndicators.find(i => i.indicador === 'Não Conformidades')?.valor_numero || null;
      return {
        mes: MESES_SHORT[idx],
        Internações: internacoes != null ? Number(internacoes) : null,
        Óbitos: obitos != null ? Number(obitos) : null,
        Notificações: notificacoes != null ? Number(notificacoes) : null,
        'Não Conformidades': naoConformidades != null ? Number(naoConformidades) : null,
      };
    });
  }, [indicators, selectedYear]);

  const incidentRatesEvolution = useMemo(() => {
    const rateIndicators = [
      'Taxa de incidentes - Quedas',
      'Taxa de incidentes - Medicamentos',
      'Taxa de incidentes - Lesão de Pele',
      'Taxa de incidentes - Flebite',
    ];
    return MESES.map((mes, idx) => {
      const monthIndicators = indicators.filter(i => i.mes === mes && i.ano === selectedYear);
      const row: any = { mes: MESES_SHORT[idx] };
      rateIndicators.forEach(name => {
        const shortName = name.replace('Taxa de incidentes - ', '');
        const val = monthIndicators.find(i => i.indicador === name)?.valor_numero;
        row[shortName] = val != null ? Number(val) : null;
      });
      return row;
    });
  }, [indicators, selectedYear]);

  const auditEvolution = useMemo(() => {
    const auditIndicators = [
      'Conformidade na identificação dos pacientes',
      'Conformidade nas barreiras de prevenção de Queda',
      'Conformidade nas barreiras de prevenção de Lesão por Pressão',
    ];
    return MESES.map((mes, idx) => {
      const monthIndicators = indicators.filter(i => i.mes === mes && i.ano === selectedYear);
      const row: any = { mes: MESES_SHORT[idx] };
      auditIndicators.forEach(name => {
        const shortName = name.replace('Conformidade na ', '').replace('Conformidade nas barreiras de prevenção de ', 'Prev. ');
        const val = monthIndicators.find(i => i.indicador === name)?.valor_numero;
        row[shortName] = val != null ? Number(val) : null;
      });
      row['Meta'] = 100;
      return row;
    });
  }, [indicators, selectedYear]);

  const hasEvolutionData = monthlyEvolutionData.some(d => d.Internações !== null || d.Notificações !== null);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Carregando indicadores...</span>
      </div>
    );
  }

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

  const renderDataEntrySection = (title: string, categoria: string, items: any[]) => (
    <Card key={categoria}>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Indicador</TableHead>
              <TableHead className="w-[120px]">Meta</TableHead>
              <TableHead className="w-[120px]">Valor Atual</TableHead>
              <TableHead className="w-[120px]">Novo Valor</TableHead>
              <TableHead className="w-[80px]"></TableHead>
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
            Núcleo de Segurança do Paciente
          </h2>
          <p className="text-sm text-muted-foreground">Indicadores de Internação - Monitoramento de Incidentes</p>
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
              exportToCSV({ title: `Indicadores NSP - ${selectedMonth} ${selectedYear}`, headers, rows, fileName: `indicadores_nsp_${selectedMonth}_${selectedYear}` });
            }}
            onExportPDF={async () => {
              const pdfTitle = `Indicadores NSP - ${selectedMonth} ${selectedYear}`;
              const { doc, logoImg } = await createStandardPdf(pdfTitle, 'landscape');

              // 1) KPIs summary
              autoTable(doc, {
                startY: 32,
                head: [['Total Internações', 'Total Óbitos', 'Profissionais', 'Notificações', 'Alertas']],
                body: [[stats.totalInternacoes, stats.totalObitos, stats.totalProfissionais, stats.totalNotificacoes, stats.alertasCount]],
                styles: { fontSize: 9, cellPadding: 3, halign: 'center' },
                headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
              });

              // 2) Classificação de Incidentes
              if (incidentData.length > 0) {
                const lastY = (doc as any).lastAutoTable?.finalY || 50;
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.text('Classificação de Incidentes', 14, lastY + 8);
                autoTable(doc, {
                  startY: lastY + 12,
                  head: [['Incidente', 'Quantidade']],
                  body: incidentData.map(d => [d.name, d.value]),
                  styles: { fontSize: 8, cellPadding: 2 },
                  headStyles: { fillColor: [52, 152, 219], textColor: 255, fontStyle: 'bold' },
                  margin: { top: 32, bottom: 28 },
                });
              }

              // 3) Tipos de Incidentes (OMS)
              if (incidentTypeData.length > 0) {
                const lastY = (doc as any).lastAutoTable?.finalY || 80;
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.text('Tipos de Incidentes (OMS)', 14, lastY + 8);
                autoTable(doc, {
                  startY: lastY + 12,
                  head: [['Tipo', 'Quantidade']],
                  body: incidentTypeData.map(d => [d.name, d.value]),
                  styles: { fontSize: 8, cellPadding: 2 },
                  headStyles: { fillColor: [52, 152, 219], textColor: 255, fontStyle: 'bold' },
                  margin: { top: 32, bottom: 28 },
                });
              }

              // 4) Tabela principal de indicadores
              const lastY2 = (doc as any).lastAutoTable?.finalY || 100;
              doc.setFontSize(11);
              doc.setFont('helvetica', 'bold');
              doc.text('Resumo dos Indicadores', 14, lastY2 + 8);
              autoTable(doc, {
                startY: lastY2 + 12,
                head: [['Indicador', 'Categoria', 'Valor', 'Meta', 'Status']],
                body: filteredIndicators.map(i => {
                  const isAlert = i.meta !== null && i.valor_numero !== null && (i.meta === 0 ? i.valor_numero > 0 : i.valor_numero > i.meta);
                  return [
                    i.indicador, i.categoria.replace('Indicadores de ', '').replace('Auditorias de ', ''),
                    i.valor_numero != null ? Number(i.valor_numero) : '—',
                    i.meta != null ? Number(i.meta) : '—',
                    i.meta !== null ? (isAlert ? 'Alerta' : 'OK') : '—',
                  ];
                }),
                styles: { fontSize: 8, cellPadding: 2 },
                headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [245, 245, 245] },
                margin: { top: 32, bottom: 28 },
              });

              savePdfWithFooter(doc, pdfTitle, `indicadores_nsp_${selectedMonth}_${selectedYear}`, logoImg);
            }}
          />
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
          <TabsTrigger value="evolucao" className="text-xs sm:text-sm gap-1"><TrendingUp className="h-3 w-3" />Evolução Mensal</TabsTrigger>
          <TabsTrigger value="entrada" className="text-xs sm:text-sm gap-1"><FileText className="h-3 w-3" />Entrada de Dados</TabsTrigger>
        </TabsList>

        {/* ── Dashboard Tab ── */}
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
                ) : <div className="flex items-center justify-center h-[250px] text-muted-foreground">Sem dados para o período</div>}
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
                ) : <div className="flex items-center justify-center h-[250px] text-muted-foreground">Sem dados para o período</div>}
              </CardContent>
            </Card>
          </div>

          {/* Summary table with editable meta */}
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
                            <TableCell><Badge variant="outline" className="text-xs">{ind.categoria.replace('Indicadores de ', '').replace('Auditorias de ', '')}</Badge></TableCell>
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
          {/* Main indicators evolution */}
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
                    <Line type="monotone" dataKey="Óbitos" stroke="#dc2626" strokeWidth={2} dot={{ r: 4 }} connectNulls />
                    <Line type="monotone" dataKey="Notificações" stroke="#eab308" strokeWidth={2} dot={{ r: 4 }} connectNulls />
                    <Line type="monotone" dataKey="Não Conformidades" stroke="#ea580c" strokeWidth={2} dot={{ r: 4 }} connectNulls />
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

          {/* Incident rates evolution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Evolução das Taxas de Incidentes ({selectedYear})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={incidentRatesEvolution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="Quedas" stroke="#dc2626" fill="#dc2626" fillOpacity={0.1} strokeWidth={2} connectNulls />
                  <Area type="monotone" dataKey="Medicamentos" stroke="#2563eb" fill="#2563eb" fillOpacity={0.1} strokeWidth={2} connectNulls />
                  <Area type="monotone" dataKey="Lesão de Pele" stroke="#eab308" fill="#eab308" fillOpacity={0.1} strokeWidth={2} connectNulls />
                  <Area type="monotone" dataKey="Flebite" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.1} strokeWidth={2} connectNulls />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Audit conformity evolution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" />
                Conformidade das Auditorias ({selectedYear})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={auditEvolution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 110]} tick={{ fontSize: 12 }} unit="%" />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                    formatter={(value: any, name: string) => [name === 'Meta' ? `${value}%` : value != null ? `${value}%` : '—', name]}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="identificação dos pacientes" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} connectNulls />
                  <Line type="monotone" dataKey="Prev. Queda" stroke="#16a34a" strokeWidth={2} dot={{ r: 4 }} connectNulls />
                  <Line type="monotone" dataKey="Prev. Lesão por Pressão" stroke="#eab308" strokeWidth={2} dot={{ r: 4 }} connectNulls />
                  <Line type="monotone" dataKey="Meta" stroke="#dc2626" strokeWidth={1} strokeDasharray="8 4" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Entrada de Dados Tab ── */}
        <TabsContent value="entrada" className="mt-6 space-y-6">
          {renderDataEntrySection('Indicadores de Estrutura', NSP_CATEGORIAS.ESTRUTURA, NSP_INDICADORES_ESTRUTURA)}
          {renderDataEntrySection('Indicadores de Processo', NSP_CATEGORIAS.PROCESSO, NSP_INDICADORES_PROCESSO)}
          {renderDataEntrySection('Auditorias de Segurança', NSP_CATEGORIAS.AUDITORIAS, NSP_INDICADORES_AUDITORIAS)}
          {renderDataEntrySection('Indicadores de Resultado', NSP_CATEGORIAS.RESULTADO, NSP_INDICADORES_RESULTADO)}
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
