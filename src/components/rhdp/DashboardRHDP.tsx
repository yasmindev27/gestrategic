import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Calendar, Users, FileText, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const MESES = [
  { value: "01", label: "Janeiro" },
  { value: "02", label: "Fevereiro" },
  { value: "03", label: "Março" },
  { value: "04", label: "Abril" },
  { value: "05", label: "Maio" },
  { value: "06", label: "Junho" },
  { value: "07", label: "Julho" },
  { value: "08", label: "Agosto" },
  { value: "09", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];

interface Atestado {
  id: string;
  funcionario_user_id: string;
  funcionario_nome: string;
  data_inicio: string;
  dias_afastamento: number;
  tipo: string;
  cid: string | null;
}

interface ColaboradorAlerta {
  nome: string;
  quantidade: number;
  totalDias: number;
  tipos: string[];
}

export const DashboardRHDP = () => {
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, "0");
  const currentYear = String(new Date().getFullYear());

  const [mesSelecionado, setMesSelecionado] = useState(currentMonth);
  const [anoSelecionado, setAnoSelecionado] = useState(currentYear);
  const [atestados, setAtestados] = useState<Atestado[]>([]);
  const [loading, setLoading] = useState(true);

  const anos = useMemo(() => {
    const y = new Date().getFullYear();
    return [String(y - 1), String(y), String(y + 1)];
  }, []);

  useEffect(() => {
    loadAtestados();
  }, [mesSelecionado, anoSelecionado]);

  const loadAtestados = async () => {
    setLoading(true);
    const startDate = `${anoSelecionado}-${mesSelecionado}-01`;
    const endMonth = parseInt(mesSelecionado);
    const endYear = parseInt(anoSelecionado);
    const lastDay = new Date(endYear, endMonth, 0).getDate();
    const endDate = `${anoSelecionado}-${mesSelecionado}-${String(lastDay).padStart(2, "0")}`;

    const { data, error } = await supabase
      .from("atestados")
      .select("id, funcionario_user_id, funcionario_nome, data_inicio, dias_afastamento, tipo, cid")
      .gte("data_inicio", startDate)
      .lte("data_inicio", endDate)
      .order("funcionario_nome");

    if (!error && data) {
      setAtestados(data);
    }
    setLoading(false);
  };

  const colaboradoresAlerta = useMemo<ColaboradorAlerta[]>(() => {
    const map = new Map<string, ColaboradorAlerta>();
    atestados.forEach((a) => {
      const key = a.funcionario_nome;
      if (!map.has(key)) {
        map.set(key, { nome: key, quantidade: 0, totalDias: 0, tipos: [] });
      }
      const entry = map.get(key)!;
      entry.quantidade += 1;
      entry.totalDias += a.dias_afastamento;
      if (a.tipo && !entry.tipos.includes(a.tipo)) {
        entry.tipos.push(a.tipo);
      }
    });
    return Array.from(map.values())
      .filter((c) => c.quantidade > 1)
      .sort((a, b) => b.quantidade - a.quantidade || b.totalDias - a.totalDias);
  }, [atestados]);

  const chartData = useMemo(() => {
    return colaboradoresAlerta.slice(0, 10).map((c) => ({
      name: c.nome.length > 18 ? c.nome.substring(0, 18) + "…" : c.nome,
      fullName: c.nome,
      atestados: c.quantidade,
      dias: c.totalDias,
    }));
  }, [colaboradoresAlerta]);

  const totalAtestados = atestados.length;
  const totalDias = atestados.reduce((sum, a) => sum + a.dias_afastamento, 0);
  const mesLabel = MESES.find((m) => m.value === mesSelecionado)?.label || "";

  const BAR_COLORS = [
    "hsl(var(--destructive))",
    "hsl(var(--warning))",
    "hsl(var(--primary))",
    "hsl(var(--info))",
  ];

  const getBarColor = (qty: number) => {
    if (qty >= 4) return BAR_COLORS[0];
    if (qty >= 3) return BAR_COLORS[1];
    return BAR_COLORS[2];
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Período:</span>
            </div>
            <Select value={mesSelecionado} onValueChange={setMesSelecionado}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MESES.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={anoSelecionado} onValueChange={setAnoSelecionado}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {anos.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalAtestados}</p>
                <p className="text-xs text-muted-foreground">Atestados no mês</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-info">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-info/10">
                <TrendingUp className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalDias}</p>
                <p className="text-xs text-muted-foreground">Total dias afastamento</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-warning">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-warning/10">
                <Users className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{colaboradoresAlerta.length}</p>
                <p className="text-xs text-muted-foreground">Colaboradores em alerta</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {colaboradoresAlerta.filter((c) => c.quantidade >= 3).length}
                </p>
                <p className="text-xs text-muted-foreground">Críticos (3+ atestados)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Colaboradores com múltiplos atestados — {mesLabel}/{anoSelecionado}
            </CardTitle>
            <CardDescription>
              Colaboradores que apresentaram mais de 1 atestado no mês selecionado
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : chartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <Users className="h-12 w-12 mb-3 opacity-40" />
                <p className="font-medium">Nenhum colaborador em alerta</p>
                <p className="text-sm">Não há colaboradores com mais de 1 atestado em {mesLabel}/{anoSelecionado}</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 12 }} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-popover border rounded-lg p-3 shadow-lg text-sm">
                          <p className="font-semibold">{d.fullName}</p>
                          <p className="text-muted-foreground">Atestados: <strong>{d.atestados}</strong></p>
                          <p className="text-muted-foreground">Dias afastado: <strong>{d.dias}</strong></p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="atestados" radius={[0, 6, 6, 0]} barSize={24}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={getBarColor(entry.atestados)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Tabela detalhada */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Detalhamento por colaborador
            </CardTitle>
            <CardDescription>
              Lista completa de colaboradores com recorrência de atestados
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : colaboradoresAlerta.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <FileText className="h-12 w-12 mb-3 opacity-40" />
                <p className="font-medium">Sem registros</p>
                <p className="text-sm">Nenhum colaborador com recorrência neste período</p>
              </div>
            ) : (
              <div className="max-h-[320px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Colaborador</TableHead>
                      <TableHead className="text-center">Atestados</TableHead>
                      <TableHead className="text-center">Dias</TableHead>
                      <TableHead>Tipos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {colaboradoresAlerta.map((c, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{c.nome}</TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={c.quantidade >= 3 ? "destructive" : "secondary"}
                            className="font-bold"
                          >
                            {c.quantidade}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-medium">{c.totalDias}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {c.tipos.map((t, j) => (
                              <Badge key={j} variant="outline" className="text-xs">
                                {t}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
