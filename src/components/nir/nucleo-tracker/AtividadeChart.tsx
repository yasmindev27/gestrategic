import { RegistroProducao } from "./types";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useMemo } from "react";

interface Props {
  registros: RegistroProducao[];
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(160 45% 40%)",
  "hsl(38 92% 50%)",
  "hsl(199 89% 48%)",
  "hsl(0 72% 51%)",
];

export function AtividadeChart({ registros }: Props) {
  const data = useMemo(() => {
    const byAtividade: Record<string, number> = {};
    registros.forEach((r) => {
      byAtividade[r.atividade] = (byAtividade[r.atividade] || 0) + r.quantidade;
    });
    return Object.entries(byAtividade).map(([name, value]) => ({ name, value }));
  }, [registros]);

  if (data.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h2 className="text-lg font-semibold text-foreground mb-4">Distribuição por Atividade</h2>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={100}
            dataKey="value"
            label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
            labelLine={false}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              color: "hsl(var(--foreground))",
            }}
          />
          <Legend wrapperStyle={{ fontSize: "12px" }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
