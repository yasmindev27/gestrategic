import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock, ArrowRightLeft } from "lucide-react";

interface PassagemRecord {
  id: string;
  shift_date: string;
  shift_type: string;
  colaborador_saida_nome: string;
  data_hora_conclusao: string;
  colaborador_entrada_nome: string | null;
  data_hora_assuncao: string | null;
  tempo_troca_minutos: number | null;
  justificativa: string | null;
}

export function PassagemPlantaoReport() {
  const [records, setRecords] = useState<PassagemRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("passagem_plantao")
      .select("*")
      .order("data_hora_conclusao", { ascending: false })
      .limit(100);

    if (!error && data) {
      setRecords(data as PassagemRecord[]);
    }
    setIsLoading(false);
  };

  const filtered = records.filter((r) => {
    if (dataInicio && r.shift_date < dataInicio) return false;
    if (dataFim && r.shift_date > dataFim) return false;
    return true;
  });

  const formatDateTime = (dt: string | null) => {
    if (!dt) return "—";
    try {
      return format(new Date(dt), "dd/MM/yyyy HH:mm", { locale: ptBR });
    } catch {
      return "—";
    }
  };

  const formatTempo = (minutos: number | null) => {
    if (minutos === null || minutos === undefined) return "Pendente";
    if (minutos < 60) return `${Math.round(minutos)} min`;
    const h = Math.floor(minutos / 60);
    const m = Math.round(minutos % 60);
    return `${h}h ${m}min`;
  };

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
          <ArrowRightLeft className="h-5 w-5 text-primary" />
          Filtros
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <Label>Data Início</Label>
            <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Data Fim</Label>
            <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
          <Clock className="h-5 w-5 text-primary" />
          Passagens de Plantão
        </h2>

        {isLoading ? (
          <p className="text-muted-foreground text-center py-8">Carregando...</p>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Nenhuma passagem de plantão registrada para o período selecionado.
          </p>
        ) : (
          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Plantão</TableHead>
                  <TableHead>Saiu (Concluiu)</TableHead>
                  <TableHead>Data/Hora Conclusão</TableHead>
                  <TableHead>Assumiu</TableHead>
                  <TableHead>Data/Hora Assunção</TableHead>
                  <TableHead>Tempo de Troca</TableHead>
                  <TableHead>Justificativa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.shift_date ? format(new Date(r.shift_date + "T12:00:00"), "dd/MM/yyyy") : "—"}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        r.shift_type === "diurno" ? "bg-amber-100 text-amber-800" : "bg-indigo-100 text-indigo-800"
                      }`}>
                        {r.shift_type === "diurno" ? "☀️ Diurno" : "🌙 Noturno"}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">{r.colaborador_saida_nome}</TableCell>
                    <TableCell>{formatDateTime(r.data_hora_conclusao)}</TableCell>
                    <TableCell className="font-medium">{r.colaborador_entrada_nome || "—"}</TableCell>
                    <TableCell>{formatDateTime(r.data_hora_assuncao)}</TableCell>
                    <TableCell>
                      <span className={`font-medium ${
                        r.tempo_troca_minutos !== null && r.tempo_troca_minutos > 30
                          ? "text-destructive"
                          : r.tempo_troca_minutos !== null
                            ? "text-green-600"
                            : "text-muted-foreground"
                      }`}>
                        {formatTempo(r.tempo_troca_minutos)}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {r.justificativa || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
