import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import { format, parseISO, startOfDay, eachDayOfInterval, subMonths, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Chamado } from "./types";

interface EvolucaoChartProps {
  chamados: Chamado[];
  dataInicio: Date | null;
  dataFim: Date | null;
}

export const EvolucaoChart = ({ chamados, dataInicio, dataFim }: EvolucaoChartProps) => {
  const chartData = useMemo(() => {
    if (!dataInicio || !dataFim) return [];

    const days = eachDayOfInterval({ start: dataInicio, end: dataFim });
    
    return days.map((day) => {
      const abertos = chamados.filter((c) => {
        const abertura = startOfDay(parseISO(c.data_abertura));
        return isSameDay(abertura, day);
      }).length;

      const fechados = chamados.filter((c) => {
        if (!c.data_resolucao) return false;
        const resolucao = startOfDay(parseISO(c.data_resolucao));
        return isSameDay(resolucao, day);
      }).length;

      return {
        data: format(day, "dd/MM", { locale: ptBR }),
        abertos,
        fechados,
      };
    });
  }, [chamados, dataInicio, dataFim]);

  // Comparação com período anterior
  const comparisonData = useMemo(() => {
    if (!dataInicio || !dataFim) return [];

    const periodLength = Math.ceil((dataFim.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24));
    const previousStart = new Date(dataInicio);
    previousStart.setDate(previousStart.getDate() - periodLength);
    const previousEnd = new Date(dataInicio);
    previousEnd.setDate(previousEnd.getDate() - 1);

    const currentDays = eachDayOfInterval({ start: dataInicio, end: dataFim });
    
    return currentDays.map((day, index) => {
      const previousDay = new Date(previousStart);
      previousDay.setDate(previousDay.getDate() + index);

      const currentCount = chamados.filter((c) => {
        const abertura = startOfDay(parseISO(c.data_abertura));
        return isSameDay(abertura, day);
      }).length;

      const previousCount = chamados.filter((c) => {
        const abertura = startOfDay(parseISO(c.data_abertura));
        return isSameDay(abertura, previousDay);
      }).length;

      return {
        data: format(day, "dd/MM", { locale: ptBR }),
        atual: currentCount,
        anterior: previousCount,
      };
    });
  }, [chamados, dataInicio, dataFim]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Evolução Abertos x Fechados */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Evolução: Abertos x Fechados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorAbertos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(210, 65%, 45%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(210, 65%, 45%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorFechados" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142, 50%, 45%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(142, 50%, 45%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="data" 
                  tick={{ fontSize: 11 }}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="abertos"
                  name="Abertos"
                  stroke="hsl(210, 65%, 45%)"
                  fill="url(#colorAbertos)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="fechados"
                  name="Fechados"
                  stroke="hsl(142, 50%, 45%)"
                  fill="url(#colorFechados)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Comparação com Período Anterior */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Comparação com Período Anterior</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="data" 
                  tick={{ fontSize: 11 }}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="atual"
                  name="Período Atual"
                  stroke="hsl(210, 65%, 45%)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="anterior"
                  name="Período Anterior"
                  stroke="hsl(210, 20%, 60%)"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
