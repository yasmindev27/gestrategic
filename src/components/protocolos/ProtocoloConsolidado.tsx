import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, BarChart3, Loader2, TrendingUp, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useProtocoloAtendimentos, TipoProtocolo } from '@/hooks/useProtocoloAtendimentos';
import { format, eachMonthOfInterval, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { ExportDropdown } from '@/components/ui/export-dropdown';
import { createStandardPdf, savePdfWithFooter } from '@/lib/export-utils';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

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
  const { data: allAtendimentos, isLoading, isError, error } = useProtocoloAtendimentos(tipo);

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

  // Age distribution
  const idadeData = useMemo(() => {
    const faixas: Record<string, number> = { '0-17': 0, '18-39': 0, '40-59': 0, '60-79': 0, '80+': 0, 'N/I': 0 };
    atendimentos.forEach((a: any) => {
      const age = a.age;
      if (age == null) { faixas['N/I']++; }
      else if (age < 18) faixas['0-17']++;
      else if (age < 40) faixas['18-39']++;
      else if (age < 60) faixas['40-59']++;
      else if (age < 80) faixas['60-79']++;
      else faixas['80+']++;
    });
    return Object.entries(faixas).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));
  }, [atendimentos]);

  // Sex distribution
  const sexoData = useMemo(() => {
    const counts: Record<string, number> = {};
    atendimentos.forEach((a: any) => {
      const s = a.sex || 'Não informado';
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [atendimentos]);

  // Troponin within target time analysis
  const troponinaData = useMemo(() => {
    let comTroponina = 0;
    let semTroponina = 0;
    let dentroTempo = 0;
    let foraTempo = 0;
    atendimentos.forEach((a: any) => {
      if (a.troponin_sample1_collection_time && a.troponin_sample1_release_time) {
        comTroponina++;
        const coleta = new Date(a.troponin_sample1_collection_time).getTime();
        const resultado = new Date(a.troponin_sample1_release_time).getTime();
        const diffMin = (resultado - coleta) / 60000;
        if (diffMin <= 60) dentroTempo++;
        else foraTempo++;
      } else {
        semTroponina++;
      }
    });
    return { comTroponina, semTroponina, dentroTempo, foraTempo };
  }, [atendimentos]);

  const exportExcel = () => {
    // Summary sheet
    const summaryData = [{
      'Competência': competencia,
      'Total Atendimentos': stats.total,
      'Dentro da Meta': stats.withinTarget,
      'Fora da Meta': stats.outOfTarget,
      '% Dentro da Meta': `${stats.percentWithinTarget}%`,
      'Tempo Médio (min)': stats.avgTime,
      'Mediana (min)': stats.medianTime,
    }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryData), 'Resumo');

    // Age sheet
    if (idadeData.length > 0) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(idadeData.map(d => ({ 'Faixa Etária': d.name, 'Quantidade': d.value }))), 'Idade');
    }
    // Sex sheet
    if (sexoData.length > 0) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sexoData.map(d => ({ 'Sexo': d.name, 'Quantidade': d.value }))), 'Sexo');
    }
    // Risk sheet
    if (riskData.length > 0) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(riskData.map(d => ({ 'Classificação': d.name, 'Quantidade': d.value }))), 'Risco');
    }
    // Troponina sheet
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{
      'Com Troponina': troponinaData.comTroponina,
      'Sem Troponina': troponinaData.semTroponina,
      'Dentro do Tempo (≤60min)': troponinaData.dentroTempo,
      'Fora do Tempo (>60min)': troponinaData.foraTempo,
    }]), 'Troponina');

    // Detail sheet
    const detailRows = atendimentos.map((a: any) => ({
      'Nº Registro': a.record_number || '',
      'Paciente': a.patient_name || '',
      'Idade': a.age ?? '',
      'Sexo': a.sex || '',
      'Classificação de Risco': a.risk_classification || '',
      'Tempo Porta-ECG (min)': a.porta_ecg_minutes ?? '',
      'Dentro da Meta': a.within_target ? 'Sim' : 'Não',
      'Troponina 1ª Amostra': a.troponin_sample1_result || '',
    }));
    if (detailRows.length > 0) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detailRows), 'Detalhado');
    }

    XLSX.writeFile(wb, `consolidado_${tipo}_${competencia}.xlsx`);
  };

  const exportPDF = async () => {
    const pdfTitle = `Consolidado Mensal — ${tipoLabels[tipo]}`;
    const { doc, logoImg } = await createStandardPdf(pdfTitle);

    const getFinalY = () => (doc as any).lastAutoTable?.finalY ?? (doc as any).previousAutoTable?.finalY ?? 80;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Competência: ${competencia}`, 14, 30);

    // KPIs table
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
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      margin: { top: 32, bottom: 30 },
    });

    let cursorY = getFinalY() + 8;

    // Idade
    if (idadeData.length > 0) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Distribuição por Faixa Etária', 14, cursorY);
      autoTable(doc, {
        startY: cursorY + 3,
        head: [['Faixa Etária', 'Qtd']],
        body: idadeData.map(d => [d.name, String(d.value)]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        margin: { top: 32, bottom: 30 },
      });
      cursorY = getFinalY() + 8;
    }

    // Sexo
    if (sexoData.length > 0) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Distribuição por Sexo', 14, cursorY);
      autoTable(doc, {
        startY: cursorY + 3,
        head: [['Sexo', 'Qtd']],
        body: sexoData.map(d => [d.name, String(d.value)]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        margin: { top: 32, bottom: 30 },
      });
      cursorY = getFinalY() + 8;
    }

    // Classificação de Risco
    if (riskData.length > 0) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Classificação de Risco', 14, cursorY);
      autoTable(doc, {
        startY: cursorY + 3,
        head: [['Classificação', 'Qtd']],
        body: riskData.map(d => [d.name, String(d.value)]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        margin: { top: 32, bottom: 30 },
      });
      cursorY = getFinalY() + 8;
    }

    // Troponina
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Troponina — Tempo de Resultado', 14, cursorY);
    autoTable(doc, {
      startY: cursorY + 3,
      head: [['Indicador', 'Valor']],
      body: [
        ['Com Troponina', String(troponinaData.comTroponina)],
        ['Sem Troponina', String(troponinaData.semTroponina)],
        ['Dentro do Tempo (≤60min)', String(troponinaData.dentroTempo)],
        ['Fora do Tempo (>60min)', String(troponinaData.foraTempo)],
      ],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      margin: { top: 32, bottom: 30 },
    });

    // Tabela detalhada dos atendimentos
    cursorY = getFinalY() + 10;
    if (atendimentos.length > 0) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Detalhamento dos Atendimentos', 14, cursorY);
      autoTable(doc, {
        startY: cursorY + 3,
        head: [['Nº', 'Paciente', 'Idade', 'Sexo', 'Class. Risco', 'Porta-ECG (min)', 'Meta', 'Troponina']],
        body: atendimentos.map((a: any) => [
          a.record_number || '-',
          a.patient_name || '-',
          a.age != null ? String(a.age) : '-',
          a.sex || '-',
          a.risk_classification || '-',
          a.porta_ecg_minutes != null ? String(a.porta_ecg_minutes) : '-',
          a.within_target ? 'Sim' : 'Não',
          a.troponin_sample1_result || '-',
        ]),
        styles: { fontSize: 7 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        margin: { top: 32, bottom: 30 },
      });
    }

    savePdfWithFooter(doc, pdfTitle, `consolidado_${tipo}_${competencia}`, logoImg);
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
      ) : isError ? (
        <div className="text-center py-12 text-destructive">
          <p>Erro ao carregar dados: {(error as any)?.message || 'Erro desconhecido'}</p>
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

          {/* Demographics & Clinical */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Age distribution */}
            {idadeData.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Distribuição por Faixa Etária</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={idadeData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip />
                      <Bar dataKey="value" name="Pacientes" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Sex distribution */}
            {sexoData.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Distribuição por Sexo</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={sexoData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                        {sexoData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Legend />
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Risk distribution */}
            {riskData.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Classificação de Risco</CardTitle>
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

            {/* Troponina */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Troponina — Tempo de Resultado</CardTitle>
              </CardHeader>
              <CardContent>
                {troponinaData.comTroponina === 0 ? (
                  <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">
                    Nenhuma troponina registrada no período.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Dentro (≤60min)', value: troponinaData.dentroTempo },
                            { name: 'Fora (>60min)', value: troponinaData.foraTempo },
                          ]}
                          cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                          <Cell fill="hsl(142, 71%, 45%)" />
                          <Cell fill="hsl(0, 84%, 60%)" />
                        </Pie>
                        <Legend />
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex justify-around text-center text-xs text-muted-foreground">
                      <div>
                        <p className="text-lg font-bold text-foreground">{troponinaData.comTroponina}</p>
                        <p>Com troponina</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-foreground">{troponinaData.semTroponina}</p>
                        <p>Sem troponina</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};
