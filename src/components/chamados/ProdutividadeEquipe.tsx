import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Medal, TrendingUp, TrendingDown } from "lucide-react";
import { AtendenteProdutividade } from "./types";

interface ProdutividadeEquipeProps {
  produtividade: AtendenteProdutividade[];
  isLoading: boolean;
}

const formatTime = (hours: number): string => {
  if (hours < 1) {
    return `${Math.round(hours * 60)}min`;
  }
  if (hours < 24) {
    return `${hours.toFixed(1)}h`;
  }
  return `${(hours / 24).toFixed(1)}d`;
};

const getMedalColor = (index: number): string => {
  switch (index) {
    case 0: return "text-yellow-500";
    case 1: return "text-gray-400";
    case 2: return "text-amber-600";
    default: return "text-muted-foreground";
  }
};

export const ProdutividadeEquipe = ({ produtividade, isLoading }: ProdutividadeEquipeProps) => {
  const chartData = produtividade.slice(0, 10).map((p) => ({
    nome: p.nome.split(" ")[0],
    chamados: p.chamadosAtendidos,
    sla: p.percentualSLA,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Tabela Ranqueada */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Medal className="h-5 w-5 text-yellow-500" />
            Ranking de Produtividade
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <span className="text-muted-foreground">Carregando...</span>
            </div>
          ) : produtividade.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum dado de produtividade disponível.
            </div>
          ) : (
            <div className="max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Atendente</TableHead>
                    <TableHead className="text-center">Atendidos</TableHead>
                    <TableHead className="text-center">Tempo Médio</TableHead>
                    <TableHead className="text-center">SLA</TableHead>
                    <TableHead className="text-center">Reabertos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {produtividade.map((atendente, index) => (
                    <TableRow key={atendente.id}>
                      <TableCell>
                        {index < 3 ? (
                          <Medal className={`h-5 w-5 ${getMedalColor(index)}`} />
                        ) : (
                          <span className="text-muted-foreground">{index + 1}</span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {atendente.nome}
                      </TableCell>
                      <TableCell className="text-center font-bold">
                        {atendente.chamadosAtendidos}
                      </TableCell>
                      <TableCell className="text-center">
                        {formatTime(atendente.tempoMedioAtendimento)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          variant="outline"
                          className={
                            atendente.percentualSLA >= 80 
                              ? "border-success text-success" 
                              : atendente.percentualSLA >= 60
                              ? "border-warning text-warning"
                              : "border-destructive text-destructive"
                          }
                        >
                          {atendente.percentualSLA.toFixed(0)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={atendente.chamadosReabertos > 0 ? "text-destructive" : "text-success"}>
                          {atendente.chamadosReabertos}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gráfico Comparativo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Chamados Atendidos x SLA</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" />
                <YAxis 
                  type="category" 
                  dataKey="nome" 
                  width={80}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip 
                  formatter={(value: number, name: string) => {
                    if (name === "sla") return [`${value.toFixed(1)}%`, "SLA"];
                    return [value, "Chamados"];
                  }}
                />
                <Legend />
                <Bar 
                  dataKey="chamados" 
                  name="Chamados" 
                  fill="hsl(210, 65%, 45%)" 
                  radius={[0, 4, 4, 0]}
                />
                <Bar 
                  dataKey="sla" 
                  name="SLA %" 
                  fill="hsl(142, 50%, 45%)" 
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
