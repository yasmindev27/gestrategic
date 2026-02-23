import { useState, useEffect } from "react";
import { ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface SetorMetrica {
  setor: string;
  total: number;
}

export function MetricasSegurancaWidget() {
  const [metricas, setMetricas] = useState<SetorMetrica[]>([]);
  const [totalSemana, setTotalSemana] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetricas = async () => {
      const semanaAtras = new Date();
      semanaAtras.setDate(semanaAtras.getDate() - 7);

      const { data, error } = await supabase
        .from("alertas_seguranca")
        .select("setor")
        .gte("created_at", semanaAtras.toISOString());

      if (!error && data) {
        const contagem: Record<string, number> = {};
        data.forEach(a => {
          contagem[a.setor] = (contagem[a.setor] || 0) + 1;
        });
        const sorted = Object.entries(contagem)
          .map(([setor, total]) => ({ setor, total }))
          .sort((a, b) => b.total - a.total);
        setMetricas(sorted);
        setTotalSemana(data.length);
      }
      setLoading(false);
    };
    fetchMetricas();
  }, []);

  if (loading) return null;
  if (totalSemana === 0) return null;

  return (
    <Card className="border-destructive/20 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-destructive" />
          Alertas de Segurança — Última Semana
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-2xl font-bold text-destructive">{totalSemana} chamado{totalSemana > 1 ? "s" : ""}</p>
        <div className="space-y-1.5">
          {metricas.slice(0, 5).map(m => (
            <div key={m.setor} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground truncate">{m.setor}</span>
              <Badge variant="outline" className="text-xs">
                {m.total}x
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
