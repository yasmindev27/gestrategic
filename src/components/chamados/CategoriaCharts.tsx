import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Legend,
} from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Chamado, categoriaLabels, statusLabels, statusColors, prioridadeColors } from "./types";

interface CategoriaChartsProps {
  chamados: Chamado[];
}

const COLORS = [
  "hsl(210, 65%, 45%)",
  "hsl(142, 50%, 45%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 72%, 51%)",
  "hsl(199, 89%, 48%)",
  "hsl(270, 50%, 50%)",
  "hsl(180, 50%, 45%)",
  "hsl(330, 50%, 50%)",
];

export const CategoriaCharts = ({ chamados }: CategoriaChartsProps) => {
  const [selectedCategoria, setSelectedCategoria] = useState<string | null>(null);
  const [drillDownOpen, setDrillDownOpen] = useState(false);

  // Agrupar por categoria
  const categoriaData = chamados.reduce((acc, chamado) => {
    const cat = chamado.categoria;
    if (!acc[cat]) {
      acc[cat] = { categoria: categoriaLabels[cat] || cat, count: 0, key: cat };
    }
    acc[cat].count++;
    return acc;
  }, {} as Record<string, { categoria: string; count: number; key: string }>);

  const barData = Object.values(categoriaData)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const pieData = barData.map((item, index) => ({
    ...item,
    fill: COLORS[index % COLORS.length],
  }));

  const total = chamados.length;

  const handleBarClick = (data: any) => {
    if (data && data.activePayload) {
      const categoria = data.activePayload[0]?.payload?.key;
      if (categoria) {
        setSelectedCategoria(categoria);
        setDrillDownOpen(true);
      }
    }
  };

  const handlePieClick = (data: any) => {
    if (data && data.key) {
      setSelectedCategoria(data.key);
      setDrillDownOpen(true);
    }
  };

  const filteredChamados = selectedCategoria
    ? chamados.filter((c) => c.categoria === selectedCategoria)
    : [];

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart - Ranking */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ranking por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={barData}
                  layout="vertical"
                  onClick={handleBarClick}
                  style={{ cursor: "pointer" }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" />
                  <YAxis 
                    type="category" 
                    dataKey="categoria" 
                    width={120}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value: number) => [value, "Chamados"]}
                    labelFormatter={(label) => `Categoria: ${label}`}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="hsl(210, 65%, 45%)" 
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Clique em uma barra para ver os chamados
            </p>
          </CardContent>
        </Card>

        {/* Pie Chart - Distribuição */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Distribuição por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="count"
                    onClick={handlePieClick}
                    style={{ cursor: "pointer" }}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [
                      `${value} (${((value / total) * 100).toFixed(1)}%)`,
                      "Chamados",
                    ]}
                  />
                  <Legend 
                    formatter={(value) => <span className="text-xs">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Clique em uma fatia para ver os chamados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Drill-down Dialog */}
      <Dialog open={drillDownOpen} onOpenChange={setDrillDownOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Chamados - {categoriaLabels[selectedCategoria || ""] || selectedCategoria}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Abertura</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredChamados.map((chamado) => (
                  <TableRow key={chamado.id}>
                    <TableCell className="font-mono text-sm">
                      {chamado.numero_chamado}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {chamado.titulo}
                    </TableCell>
                    <TableCell>
                      <Badge className={prioridadeColors[chamado.prioridade]}>
                        {chamado.prioridade}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[chamado.status]}>
                        {statusLabels[chamado.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(chamado.data_abertura), "dd/MM/yy HH:mm", {
                        locale: ptBR,
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredChamados.length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                Nenhum chamado encontrado.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
