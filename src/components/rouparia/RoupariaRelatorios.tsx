import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExportDropdown } from "@/components/ui/export-dropdown";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Trash2, 
  RotateCcw,
  Loader2,
  Download,
  FileSpreadsheet
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import * as XLSX from "xlsx";

interface Movimentacao {
  id: string;
  tipo_movimentacao: string;
  quantidade: number;
  setor_destino: string | null;
  setor_origem: string | null;
  observacao: string | null;
  registrado_por_nome: string;
  created_at: string;
  rouparia_itens: {
    codigo_barras: string;
    rouparia_categorias: {
      nome: string;
    };
  };
}

interface ResumoTipo {
  tipo: string;
  quantidade: number;
}

const TIPO_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode; chartColor: string }> = {
  entrada: { label: "Entrada", color: "bg-green-500/10 text-green-600 border-green-200", icon: <ArrowDownCircle className="w-4 h-4" />, chartColor: "#22c55e" },
  saida: { label: "Saída", color: "bg-blue-500/10 text-blue-600 border-blue-200", icon: <ArrowUpCircle className="w-4 h-4" />, chartColor: "#3b82f6" },
  descarte: { label: "Descarte", color: "bg-red-500/10 text-red-600 border-red-200", icon: <Trash2 className="w-4 h-4" />, chartColor: "#ef4444" },
  devolucao: { label: "Devolução", color: "bg-amber-500/10 text-amber-600 border-amber-200", icon: <RotateCcw className="w-4 h-4" />, chartColor: "#f59e0b" },
};

export function RoupariaRelatorios() {
  const [isLoading, setIsLoading] = useState(true);
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [resumoPorTipo, setResumoPorTipo] = useState<ResumoTipo[]>([]);
  const [resumoPorCategoria, setResumoPorCategoria] = useState<{ nome: string; quantidade: number }[]>([]);
  
  // Filtros
  const [dataInicio, setDataInicio] = useState(format(subDays(new Date(), 180), "yyyy-MM-dd"));
  const [dataFim, setDataFim] = useState(format(new Date(), "yyyy-MM-dd"));
  const [filterTipo, setFilterTipo] = useState<string>("all");

  const buildQuery = useCallback((from: number, to: number) => {
    let query = supabase
      .from("rouparia_movimentacoes")
      .select(`
        *,
        rouparia_itens (
          codigo_barras,
          rouparia_categorias (nome)
        )
      `)
      .gte("created_at", `${dataInicio}T00:00:00`)
      .lte("created_at", `${dataFim}T23:59:59`)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (filterTipo !== "all") {
      query = query.eq("tipo_movimentacao", filterTipo);
    }

    return query;
  }, [dataInicio, dataFim, filterTipo]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);

    const PAGE_SIZE = 1000;
    let allData: any[] = [];
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await buildQuery(from, from + PAGE_SIZE - 1);
      if (error || !data || data.length === 0) {
        hasMore = false;
      } else {
        allData = [...allData, ...data];
        from += PAGE_SIZE;
        if (data.length < PAGE_SIZE) hasMore = false;
      }
    }

    if (allData.length > 0) {
      const typedData = allData as unknown as Movimentacao[];
      setMovimentacoes(typedData);

      const tipoMap: Record<string, number> = {};
      const categoriaMap: Record<string, number> = {};

      typedData.forEach((mov) => {
        tipoMap[mov.tipo_movimentacao] = (tipoMap[mov.tipo_movimentacao] || 0) + mov.quantidade;
        const catNome = mov.rouparia_itens?.rouparia_categorias?.nome;
        if (catNome) {
          categoriaMap[catNome] = (categoriaMap[catNome] || 0) + mov.quantidade;
        }
      });

      setResumoPorTipo(
        Object.entries(tipoMap).map(([tipo, quantidade]) => ({ tipo, quantidade }))
      );

      setResumoPorCategoria(
        Object.entries(categoriaMap)
          .map(([nome, quantidade]) => ({ nome, quantidade }))
          .sort((a, b) => b.quantidade - a.quantidade)
          .slice(0, 10)
      );
    } else {
      setMovimentacoes([]);
      setResumoPorTipo([]);
      setResumoPorCategoria([]);
    }

    setIsLoading(false);
  }, [buildQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExportExcel = () => {
    const exportData = movimentacoes.map((mov) => ({
      "Data/Hora": format(new Date(mov.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }),
      "Código": mov.rouparia_itens.codigo_barras,
      "Categoria": mov.rouparia_itens.rouparia_categorias.nome,
      "Tipo": TIPO_LABELS[mov.tipo_movimentacao].label,
      "Quantidade": mov.quantidade,
      "Setor Destino": mov.setor_destino || "-",
      "Setor Origem": mov.setor_origem || "-",
      "Registrado por": mov.registrado_por_nome,
      "Observação": mov.observacao || "-",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Movimentações");
    XLSX.writeFile(wb, `rouparia_relatorio_${format(new Date(), "yyyyMMdd")}.xlsx`);
  };

  const setQuickFilter = (days: number) => {
    const end = new Date();
    const start = subDays(end, days);
    setDataInicio(format(start, "yyyy-MM-dd"));
    setDataFim(format(end, "yyyy-MM-dd"));
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label>Data Início</Label>
              <Input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-[160px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Data Fim</Label>
              <Input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="w-[160px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {Object.entries(TIPO_LABELS).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setQuickFilter(7)}>
                7 dias
              </Button>
              <Button variant="outline" size="sm" onClick={() => setQuickFilter(30)}>
                30 dias
              </Button>
              <Button variant="outline" size="sm" onClick={() => setQuickFilter(90)}>
                90 dias
              </Button>
            </div>
            <ExportDropdown onExportExcel={handleExportExcel} disabled={movimentacoes.length === 0} />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Cards de Resumo */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(TIPO_LABELS).map(([tipo, { label, icon, chartColor }]) => {
              const total = resumoPorTipo.find((r) => r.tipo === tipo)?.quantidade || 0;
              return (
                <Card key={tipo}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div 
                        className="p-2 rounded-lg" 
                        style={{ backgroundColor: `${chartColor}20` }}
                      >
                        {icon}
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{label}</p>
                        <p className="text-2xl font-bold">{total}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Gráficos */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Gráfico de Barras - Por Categoria */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Top 10 Categorias</CardTitle>
              </CardHeader>
              <CardContent>
                {resumoPorCategoria.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={resumoPorCategoria} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="nome" type="category" width={120} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="quantidade" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    Sem dados para exibir
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Gráfico de Pizza - Por Tipo */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Distribuição por Tipo</CardTitle>
              </CardHeader>
              <CardContent>
                {resumoPorTipo.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={resumoPorTipo}
                        dataKey="quantidade"
                        nameKey="tipo"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ tipo, percent }) => 
                          `${TIPO_LABELS[tipo]?.label || tipo}: ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {resumoPorTipo.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={TIPO_LABELS[entry.tipo]?.chartColor || "#8884d8"} 
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value, name) => [value, TIPO_LABELS[name as string]?.label || name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    Sem dados para exibir
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Tabela de Movimentações */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Histórico de Movimentações ({movimentacoes.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-center">Qtd</TableHead>
                      <TableHead>Setor</TableHead>
                      <TableHead>Registrado por</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movimentacoes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Nenhuma movimentação no período
                        </TableCell>
                      </TableRow>
                    ) : (
                      movimentacoes.slice(0, 50).map((mov) => {
                        const tipoInfo = TIPO_LABELS[mov.tipo_movimentacao];
                        return (
                          <TableRow key={mov.id}>
                            <TableCell className="text-sm">
                              {format(new Date(mov.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </TableCell>
                            <TableCell className="font-medium">
                              {mov.rouparia_itens.rouparia_categorias.nome}
                            </TableCell>
                            <TableCell>
                              <Badge className={tipoInfo.color} variant="outline">
                                {tipoInfo.icon}
                                <span className="ml-1">{tipoInfo.label}</span>
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center font-medium">
                              {mov.quantidade}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {mov.setor_destino || mov.setor_origem || "-"}
                            </TableCell>
                            <TableCell className="text-sm">
                              {mov.registrado_por_nome}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
              {movimentacoes.length > 50 && (
                <p className="text-sm text-muted-foreground text-center mt-4">
                  Mostrando 50 de {movimentacoes.length} registros. Exporte para ver todos.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
