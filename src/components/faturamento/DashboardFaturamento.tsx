import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Users,
  Loader2,
  RefreshCw,
  Trophy,
  CalendarIcon,
} from "lucide-react";
import { format, subDays, parseISO, startOfDay, startOfWeek, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface SaidaProntuario {
  id: string;
  status: string;
  data_atendimento: string | null;
  created_at: string;
}

interface Avaliacao {
  id: string;
  saida_prontuario_id: string | null;
  avaliador_id: string;
  is_finalizada: boolean;
  data_inicio: string;
  data_conclusao: string | null;
}

interface Profile {
  user_id: string;
  full_name: string;
  cargo: string | null;
}

type Granularity = "day" | "week" | "month";
type DateRange = "1d" | "7d" | "30d" | "90d";

const RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: "1d", label: "Hoje" },
  { value: "7d", label: "Últimos 7 dias" },
  { value: "30d", label: "Últimos 30 dias" },
  { value: "90d", label: "Últimos 90 dias" },
];

const GRAN_OPTIONS: { value: Granularity; label: string }[] = [
  { value: "day", label: "Dia" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mês" },
];

const rangeToDays: Record<DateRange, number> = { "1d": 1, "7d": 7, "30d": 30, "90d": 90 };

function groupByKey(date: string, gran: Granularity): string {
  const d = parseISO(date);
  if (gran === "day") return format(d, "dd/MM");
  if (gran === "week") return `Sem ${format(startOfWeek(d, { locale: ptBR }), "dd/MM")}`;
  return format(startOfMonth(d), "MMM/yy", { locale: ptBR });
}

export function DashboardFaturamento() {
  const [saidas, setSaidas] = useState<SaidaProntuario[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalPendentesGeral, setTotalPendentesGeral] = useState(0);
  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const [granularity, setGranularity] = useState<Granularity>("day");
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const [perfFilterNome, setPerfFilterNome] = useState("");
  const [perfFilterPeriodo, setPerfFilterPeriodo] = useState<"all" | "day" | "week" | "month" | "custom">("all");
  const [perfDateFrom, setPerfDateFrom] = useState<Date | undefined>(undefined);
  const [perfDateTo, setPerfDateTo] = useState<Date | undefined>(undefined);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const since = dateRange === "1d"
        ? startOfDay(new Date()).toISOString()
        : subDays(new Date(), rangeToDays[dateRange]).toISOString();

      const pageSize = 1000;

      // Fetch all saidas in range
      const allSaidas: SaidaProntuario[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("saida_prontuarios")
          .select("id, status, data_atendimento, created_at")
          .gte("created_at", since)
          .range(from, from + pageSize - 1);
        if (error) throw error;
        allSaidas.push(...((data || []) as SaidaProntuario[]));
        if ((data || []).length < pageSize) break;
        from += pageSize;
      }

      // Fetch all avaliacoes in range
      const allAvaliacoes: Avaliacao[] = [];
      from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("avaliacoes_prontuarios")
          .select("id, saida_prontuario_id, avaliador_id, is_finalizada, data_inicio, data_conclusao")
          .gte("data_inicio", since)
          .range(from, from + pageSize - 1);
        if (error) throw error;
        allAvaliacoes.push(...((data || []) as Avaliacao[]));
        if ((data || []).length < pageSize) break;
        from += pageSize;
      }

      // Fetch profiles for avaliadores
      const avaliadorIds = [...new Set(allAvaliacoes.map((a) => a.avaliador_id).filter(Boolean))];
      let profilesData: Profile[] = [];
      if (avaliadorIds.length > 0) {
        const { data, error: profilesError } = await supabase
          .from("profiles")
          .select("user_id, full_name, cargo")
          .in("user_id", avaliadorIds);
        if (profilesError) {
          console.error("[Dashboard Fat] Erro ao buscar profiles:", profilesError);
        }
        profilesData = (data || []) as Profile[];
        console.log("[Dashboard Fat] Profiles carregados:", profilesData.length, "de", avaliadorIds.length, "IDs");
      }

      // Calcular pendentes gerais usando contagem eficiente
      const { count: totalSaidasCount, error: errSaidas } = await supabase
        .from("saida_prontuarios")
        .select("*", { count: "exact", head: true });
      if (errSaidas) throw errSaidas;

      const { count: totalAvalFinCount, error: errAvalFin } = await supabase
        .from("avaliacoes_prontuarios")
        .select("*", { count: "exact", head: true })
        .eq("is_finalizada", true)
        .not("saida_prontuario_id", "is", null);
      if (errAvalFin) throw errAvalFin;

      const pendentesGeral = (totalSaidasCount || 0) - (totalAvalFinCount || 0);
      console.log("[Dashboard Fat] saidas:", totalSaidasCount, "avalFin:", totalAvalFinCount, "pendentes:", pendentesGeral);
      setTotalPendentesGeral(Math.max(pendentesGeral, 0));

      setSaidas(allSaidas);
      setAvaliacoes(allAvaliacoes);
      setProfiles(profilesData);
    } catch (err) {
      console.error("Dashboard faturamento error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    setSelectedPeriod(null); // Clear graph selection on range change
  }, [dateRange]);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  // Metas individuais por profissional (nome → meta diária)
  const METAS_INDIVIDUAIS: Record<string, number> = {
    "Maxuel": 200,
    "Emily": 200,
    "Carolynna": 100,
  };
  const META_PADRAO = 200;

  const getMetaProfissional = (nome: string): number => {
    const found = Object.entries(METAS_INDIVIDUAIS).find(([key]) =>
      nome.toLowerCase().includes(key.toLowerCase())
    );
    return found ? found[1] : META_PADRAO;
  };

  const kpis = useMemo(() => {
    const total = saidas.length;
    const avaliados = avaliacoes.filter((a) => a.is_finalizada).length;
    const avaliadoIds = new Set(
      avaliacoes.filter((a) => a.is_finalizada && a.saida_prontuario_id).map((a) => a.saida_prontuario_id!)
    );
    const pendentes = saidas.filter((s) => !avaliadoIds.has(s.id)).length;
    const taxaPendencia = total > 0 ? ((pendentes / total) * 100).toFixed(1) : "0.0";

    // Calcula meta diária total baseada nas metas individuais de cada profissional ativo
    const profissionaisAtivosIds = [...new Set(avaliacoes.filter(a => a.avaliador_id).map(a => a.avaliador_id))];
    const numProfissionais = Math.max(profissionaisAtivosIds.length, 1);
    const META_DIARIA_TOTAL = profissionaisAtivosIds.reduce((sum, id) => {
      const profile = profiles.find(p => p.user_id === id);
      const nome = profile?.full_name || "";
      return sum + getMetaProfissional(nome);
    }, 0) || META_PADRAO;

    // Meta diária: só é atingida quando lançamentos E avaliações >= META_DIARIA_TOTAL
    const dias = rangeToDays[dateRange];
    const mediaLancamentosDia = dias > 0 ? (total / dias) : 0;
    const mediaAvaliacoesDia = dias > 0 ? (avaliados / dias) : 0;
    const menorMedia = Math.min(mediaLancamentosDia, mediaAvaliacoesDia);
    const progressoMetaDiaria = Math.min((menorMedia / META_DIARIA_TOTAL) * 100, 100);
    const metaDiariaAtingida = mediaLancamentosDia >= META_DIARIA_TOTAL && mediaAvaliacoesDia >= META_DIARIA_TOTAL;

    // Tempo médio em horas
    const tempos = avaliacoes
      .filter((a) => a.is_finalizada && a.data_conclusao && a.data_inicio)
      .map((a) => {
        const diff =
          new Date(a.data_conclusao!).getTime() - new Date(a.data_inicio).getTime();
        return diff / (1000 * 60 * 60);
      });
    const tempoMedio =
      tempos.length > 0 ? (tempos.reduce((s, v) => s + v, 0) / tempos.length).toFixed(1) : "—";

    return {
      total,
      avaliados,
      pendentes: totalPendentesGeral,
      taxaPendencia: total > 0 ? ((totalPendentesGeral / total) * 100).toFixed(1) : "0.0",
      tempoMedio,
      mediaLancamentosDia: mediaLancamentosDia.toFixed(0),
      mediaAvaliacoesDia: mediaAvaliacoesDia.toFixed(0),
      progressoMetaDiaria: Math.round(progressoMetaDiaria),
      metaDiariaAtingida,
      metaDiariaTotal: META_DIARIA_TOTAL,
      numProfissionais,
    };
  }, [saidas, avaliacoes, dateRange, totalPendentesGeral]);

  // ── Gráfico de Tendências ─────────────────────────────────────────────────
  const chartData = useMemo(() => {
    const buckets: Record<string, { lancados: number; pendentes: number; avaliados: number }> = {};

    const ensureBucket = (key: string) => {
      if (!buckets[key]) buckets[key] = { lancados: 0, pendentes: 0, avaliados: 0 };
    };

    const avaliadoIds = new Set(
      avaliacoes.filter((a) => a.is_finalizada && a.saida_prontuario_id).map((a) => a.saida_prontuario_id!)
    );

    saidas.forEach((s) => {
      if (!s.created_at) return;
      const key = groupByKey(s.created_at, granularity);
      ensureBucket(key);
      buckets[key].lancados++;
      if (!avaliadoIds.has(s.id)) buckets[key].pendentes++;
    });

    avaliacoes
      .filter((a) => a.is_finalizada && a.data_conclusao)
      .forEach((a) => {
        const key = groupByKey(a.data_conclusao!, granularity);
        ensureBucket(key);
        buckets[key].avaliados++;
      });

    return Object.entries(buckets)
      .map(([key, val]) => ({ periodo: key, ...val }))
      .sort((a, b) => a.periodo.localeCompare(b.periodo));
  }, [saidas, avaliacoes, granularity]);

  // ── Tabela de Performance (filtrável por período clicado) ────────────────
  const performanceData = useMemo(() => {
    // Filtrar por período do gráfico clicado — usa data_conclusao para finalizadas (igual ao gráfico)
    let filteredAvaliacoes = selectedPeriod
      ? avaliacoes.filter((a) => {
          // Para finalizadas, usa data_conclusao (mesma lógica do gráfico)
          // Para não finalizadas, usa data_inicio
          const dateStr = a.is_finalizada ? a.data_conclusao : a.data_inicio;
          if (!dateStr) return false;
          return groupByKey(dateStr, granularity) === selectedPeriod;
        })
      : avaliacoes;

    // Filtrar por período (dia/semana/mês/custom) da tabela
    if (perfFilterPeriodo === "custom") {
      filteredAvaliacoes = filteredAvaliacoes.filter((a) => {
        const dateStr = a.is_finalizada ? (a.data_conclusao || a.data_inicio) : a.data_inicio;
        if (!dateStr) return false;
        const d = new Date(dateStr);
        if (perfDateFrom && d < startOfDay(perfDateFrom)) return false;
        if (perfDateTo && d > new Date(startOfDay(perfDateTo).getTime() + 86400000 - 1)) return false;
        return true;
      });
    } else if (perfFilterPeriodo !== "all") {
      const now = new Date();
      const startDate = perfFilterPeriodo === "day"
        ? startOfDay(now)
        : perfFilterPeriodo === "week"
          ? startOfWeek(now, { locale: ptBR })
          : startOfMonth(now);
      filteredAvaliacoes = filteredAvaliacoes.filter((a) => {
        const dateStr = a.is_finalizada ? (a.data_conclusao || a.data_inicio) : a.data_inicio;
        if (!dateStr) return false;
        return new Date(dateStr) >= startDate;
      });
    }

    const map: Record<string, {
      avaliador_id: string;
      iniciadas: number;
      avaliados: number;
      pendentes: number;
      // dias com atividade → { totalDias, diasComAvaliacao }
      diasAtividade: Record<string, { qualquer: boolean; avaliou: boolean }>;
    }> = {};

    filteredAvaliacoes.forEach((a) => {
      // Ignora registros sem avaliador identificado
      if (!a.avaliador_id) return;

      if (!map[a.avaliador_id]) {
        map[a.avaliador_id] = {
          avaliador_id: a.avaliador_id,
          iniciadas: 0,
          avaliados: 0,
          pendentes: 0,
          diasAtividade: {},
        };
      }
      const entry = map[a.avaliador_id];
      entry.iniciadas++;

      // Dia da atividade (usando data_inicio)
      const dia = a.data_inicio ? a.data_inicio.slice(0, 10) : "desconhecido";
      if (!entry.diasAtividade[dia]) {
        entry.diasAtividade[dia] = { qualquer: true, avaliou: false };
      }

      if (a.is_finalizada) {
        entry.avaliados++;
        entry.diasAtividade[dia].avaliou = true;
      } else {
        entry.pendentes++;
      }
    });

    // Multiplicador de dias úteis conforme período selecionado
    const getMultiplicadorDias = (): number => {
      if (perfFilterPeriodo === "day") return 1;
      if (perfFilterPeriodo === "week") return 5; // dias úteis na semana
      if (perfFilterPeriodo === "month") return 22; // dias úteis no mês
      if (perfFilterPeriodo === "custom" && perfDateFrom && perfDateTo) {
        // Contar dias úteis (seg-sex) no intervalo
        let count = 0;
        const start = startOfDay(perfDateFrom);
        const end = startOfDay(perfDateTo);
        const cursor = new Date(start);
        while (cursor <= end) {
          const dow = cursor.getDay();
          if (dow !== 0 && dow !== 6) count++;
          cursor.setDate(cursor.getDate() + 1);
        }
        return Math.max(count, 1);
      }
      // "all" — usa dias do range global
      return Math.max(rangeToDays[dateRange], 1);
    };
    const multiplicadorDias = getMultiplicadorDias();

    return Object.values(map)
      .map((item) => {
        const profile = profiles.find((p) => p.user_id === item.avaliador_id);

        const nome = profile?.full_name || `ID:${item.avaliador_id.slice(0, 8)}`;
        const metaDiaria = getMetaProfissional(nome);
        const META_AVALIADOS = metaDiaria * multiplicadorDias;

        // Fator 1 — Meta de avaliações (35%): avaliados >= meta do período
        const fatorMeta = Math.min(item.avaliados / META_AVALIADOS, 1);

        // Fator 2 — Taxa de conclusão (30%): avaliados / iniciadas
        const fatorConclusao = item.iniciadas > 0 ? item.avaliados / item.iniciadas : 0;

        // Fator 3 — Sem pendências (15%): quanto menos pendentes, melhor
        const fatorSemPendencias = item.iniciadas > 0
          ? 1 - (item.pendentes / item.iniciadas)
          : 1;

        // Fator 4 — Dias produtivos (20%): dias em que avaliou / dias com qualquer atividade
        const totalDiasAtivos = Object.keys(item.diasAtividade).length;
        const diasComAvaliacao = Object.values(item.diasAtividade).filter((d) => d.avaliou).length;
        const diasSoLancou = totalDiasAtivos - diasComAvaliacao;
        const fatorDiasProdutivos = totalDiasAtivos > 0
          ? diasComAvaliacao / totalDiasAtivos
          : 0;

        // Score composto 0–100
        const scoreCompost =
          (fatorMeta * 0.35 +
           fatorConclusao * 0.30 +
           fatorSemPendencias * 0.15 +
           fatorDiasProdutivos * 0.20) * 100;
        const score = Math.round(scoreCompost);

        const metaAvaliados = item.avaliados >= META_AVALIADOS;
        // progressoMeta agora pode ultrapassar 100% para mostrar excedente
        const progressoMeta = Math.round((item.avaliados / META_AVALIADOS) * 100);

        // Conclusão baseada na quantidade real vs meta
        let taxaConclusao = META_AVALIADOS > 0 ? Math.round((item.avaliados / META_AVALIADOS) * 100) : 0;

        // Faltante para meta do período e meta diária
        const faltantePeriodo = Math.max(META_AVALIADOS - item.avaliados, 0);
        const faltanteDiario = Math.max(metaDiaria - item.avaliados, 0);

        return {
          ...item,
          nome,
          cargo: profile?.cargo || "—",
          meta: META_AVALIADOS,
          metaDiaria,
          score,
          metaAvaliados,
          progressoMeta,
          taxaConclusao,
          diasSoLancou,
          totalDiasAtivos,
          diasComAvaliacao,
          faltantePeriodo,
          faltanteDiario,
        };
      })
      .filter((item) => !perfFilterNome || item.nome.toLowerCase().includes(perfFilterNome.toLowerCase()))
      .sort((a, b) => b.score - a.score);
  }, [avaliacoes, profiles, selectedPeriod, granularity, perfFilterPeriodo, perfFilterNome, perfDateFrom, perfDateTo]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Carregando dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header + Filtros */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Dashboard de Faturamento
          </h3>
          <p className="text-muted-foreground text-sm">Visão gerencial — acesso restrito</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className={`border-l-4 ${kpis.metaDiariaAtingida ? "border-l-primary" : "border-l-amber-500"}`}>
          <CardContent className="pt-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Lançamentos</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <p className="text-3xl font-bold text-foreground">{kpis.total.toLocaleString("pt-BR")}</p>
                  {kpis.metaDiariaAtingida && (
                    <span className="text-xs font-semibold text-green-600">✓ Meta/dia</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Lanç: <span className="font-medium">{kpis.mediaLancamentosDia}/dia</span>
                  {" · "}Aval: <span className="font-medium">{kpis.mediaAvaliacoesDia}/dia</span>
                  {" · "}meta: {kpis.metaDiariaTotal}/dia ({kpis.numProfissionais} prof)
                </p>
                {/* Barra de progresso da meta */}
                <div className="mt-2 w-full bg-muted rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all ${
                      kpis.metaDiariaAtingida ? "bg-primary" : "bg-amber-500"
                    }`}
                    style={{ width: `${kpis.progressoMetaDiaria}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{kpis.progressoMetaDiaria}% da meta diária</p>
              </div>
              <div className={`p-2 rounded-lg ml-3 ${kpis.metaDiariaAtingida ? "bg-primary/10" : "bg-amber-500/10"}`}>
                <FileText className={`h-5 w-5 ${kpis.metaDiariaAtingida ? "text-primary" : "text-amber-500"}`} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-destructive">
          <CardContent className="pt-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Taxa de Pendência</p>
                <p className="text-3xl font-bold text-foreground mt-1">{kpis.taxaPendencia}%</p>
                <p className="text-xs text-muted-foreground mt-1">{kpis.pendentes.toLocaleString("pt-BR")} sem avaliação</p>
              </div>
              <div className="p-2 bg-destructive/10 rounded-lg">
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Avaliados</p>
                <p className="text-3xl font-bold text-foreground mt-1">{kpis.avaliados.toLocaleString("pt-BR")}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {kpis.total > 0 ? (((kpis.avaliados / kpis.total) * 100).toFixed(1)) : "0.0"}% do total
                </p>
              </div>
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Tempo Médio de Resposta</p>
                <p className="text-3xl font-bold text-foreground mt-1">{kpis.tempoMedio}</p>
                <p className="text-xs text-muted-foreground mt-1">horas (lançamento → avaliação)</p>
              </div>
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Tendências */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Tendências de Produção
              </CardTitle>
              <CardDescription>Lançados × Pendentes × Avaliados ao longo do tempo</CardDescription>
            </div>
            <Select value={granularity} onValueChange={(v) => setGranularity(v as Granularity)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GRAN_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              Nenhum dado encontrado para o período selecionado.
            </div>
          ) : (
            <>
              {selectedPeriod && (
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="secondary" className="text-xs">
                    Filtrando: {selectedPeriod}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-muted-foreground"
                    onClick={() => setSelectedPeriod(null)}
                  >
                    ✕ Limpar filtro
                  </Button>
                </div>
              )}
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                onClick={(e) => {
                  if (e && e.activeLabel) {
                    setSelectedPeriod(prev =>
                      prev === e.activeLabel ? null : e.activeLabel as string
                    );
                  }
                }}
                style={{ cursor: "pointer" }}
              >
                <defs>
                  <linearGradient id="colorLancados" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorPendentes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorAvaliados" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="periodo" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value, name) => [value, name]}
                  labelFormatter={(label) => `${label} — clique para filtrar`}
                />
                <Legend />
                {selectedPeriod && (
                  <ReferenceLine
                    x={selectedPeriod}
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    strokeDasharray="4 2"
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="lancados"
                  name="Lançados"
                  stroke="#3b82f6"
                  fill="url(#colorLancados)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="pendentes"
                  name="Pendentes"
                  stroke="#f59e0b"
                  fill="url(#colorPendentes)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="avaliados"
                  name="Avaliados"
                  stroke="#22c55e"
                  fill="url(#colorAvaliados)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
            </>
          )}
        </CardContent>
      </Card>

      {/* Tabela de Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            Performance por Avaliador
            {selectedPeriod && (
              <Badge variant="outline" className="ml-2 text-xs font-normal">
                {selectedPeriod}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            {selectedPeriod
              ? `Clique em outro dia no gráfico para mudar o filtro, ou "Limpar filtro" para ver todos`
              : "Clique em um dia no gráfico para filtrar por período"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filtros da tabela */}
          <div className="flex flex-col gap-3 mb-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <input
                type="text"
                placeholder="Buscar avaliador..."
                value={perfFilterNome}
                onChange={(e) => setPerfFilterNome(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-full sm:w-56"
              />
              <div className="flex gap-1 flex-wrap">
                {[
                  { value: "all" as const, label: "Todos" },
                  { value: "day" as const, label: "Hoje" },
                  { value: "week" as const, label: "Semana" },
                  { value: "month" as const, label: "Mês" },
                  { value: "custom" as const, label: "Período" },
                ].map((opt) => (
                  <Button
                    key={opt.value}
                    variant={perfFilterPeriodo === opt.value ? "default" : "outline"}
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => { setPerfFilterPeriodo(opt.value); if (opt.value !== "all") setSelectedPeriod(null); }}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>
            {perfFilterPeriodo === "custom" && (
              <div className="flex items-center gap-2 flex-wrap">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("h-8 text-xs gap-1", !perfDateFrom && "text-muted-foreground")}>
                      <CalendarIcon className="h-3.5 w-3.5" />
                      {perfDateFrom ? format(perfDateFrom, "dd/MM/yyyy") : "Data início"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={perfDateFrom}
                      onSelect={setPerfDateFrom}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
                <span className="text-xs text-muted-foreground">até</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("h-8 text-xs gap-1", !perfDateTo && "text-muted-foreground")}>
                      <CalendarIcon className="h-3.5 w-3.5" />
                      {perfDateTo ? format(perfDateTo, "dd/MM/yyyy") : "Data fim"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={perfDateTo}
                      onSelect={setPerfDateTo}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
                {(perfDateFrom || perfDateTo) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-muted-foreground"
                    onClick={() => { setPerfDateFrom(undefined); setPerfDateTo(undefined); }}
                  >
                    ✕ Limpar datas
                  </Button>
                )}
              </div>
            )}
          </div>
          {performanceData.length === 0 ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Users className="h-5 w-5 mr-2" />
              Nenhuma avaliação registrada no período.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Profissional</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead className="text-center">Avaliados</TableHead>
                  <TableHead className="text-center">Faltam p/ Meta</TableHead>
                  <TableHead className="text-center">Dias s/ Avaliação</TableHead>
                  <TableHead className="text-center">Conclusão</TableHead>
                  <TableHead className="text-center">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {performanceData.map((item, index) => (
                  <TableRow key={item.avaliador_id}>
                    <TableCell>
                      <div className="flex items-center justify-center">
                        {item.metaAvaliados && item.score >= 80 ? (
                          <Trophy className="h-4 w-4 text-amber-500" />
                        ) : (
                          <span className="text-muted-foreground text-sm font-medium">{index + 1}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{item.nome}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{item.cargo}</TableCell>

                    {/* Avaliados vs Meta 100 */}
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <Badge
                          variant="outline"
                          className={item.metaAvaliados ? "border-green-400 text-green-700" : ""}
                        >
                          {item.avaliados}{item.metaAvaliados && " ✓"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {item.progressoMeta > 100
                            ? `${item.progressoMeta}% da meta (${item.meta}) — Excedente!`
                            : `${item.progressoMeta}% da meta (${item.meta})`}
                        </span>
                      </div>
                    </TableCell>

                    {/* Pendentes — faltante para meta */}
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <Badge
                          variant="outline"
                          className={
                            item.faltantePeriodo === 0
                              ? "border-green-400 text-green-700"
                              : item.faltantePeriodo <= 50
                              ? "border-amber-400 text-amber-700"
                              : "border-destructive text-destructive"
                          }
                        >
                          {item.faltantePeriodo === 0 ? "✓ Meta batida" : `-${item.faltantePeriodo}`}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {item.faltanteDiario === 0
                            ? "Meta diária OK"
                            : `Faltam ${item.faltanteDiario} hoje (${item.metaDiaria}/dia)`}
                        </span>
                      </div>
                    </TableCell>

                    {/* Dias que só lançou, não avaliou */}
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <Badge
                          variant="outline"
                          className={
                            item.diasSoLancou === 0
                              ? "border-green-400 text-green-700"
                              : item.diasSoLancou <= 2
                              ? "border-amber-400 text-amber-700"
                              : "border-destructive text-destructive"
                          }
                        >
                          {item.diasSoLancou}
                          {item.diasSoLancou === 0 && " ✓"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {item.diasComAvaliacao}/{item.totalDiasAtivos} dias ativos
                        </span>
                      </div>
                    </TableCell>

                    {/* Taxa de conclusão */}
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <span
                          className={`text-sm font-semibold ${
                            item.taxaConclusao >= 100
                              ? "text-green-600"
                              : item.taxaConclusao >= 80
                              ? "text-green-600"
                              : item.taxaConclusao >= 50
                              ? "text-amber-600"
                              : "text-destructive"
                          }`}
                        >
                          {item.taxaConclusao}%
                        </span>
                        {item.taxaConclusao > 100 && (
                          <span className="text-xs text-green-600 font-medium">
                            Excedente +{item.taxaConclusao - 100}%
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Score composto */}
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 bg-muted rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              item.score >= 80
                                ? "bg-green-500"
                                : item.score >= 50
                                ? "bg-amber-500"
                                : "bg-destructive"
                            }`}
                            style={{ width: `${item.score}%` }}
                          />
                        </div>
                        <span
                          className={`text-sm font-bold w-10 ${
                            item.score >= 80
                              ? "text-green-600"
                              : item.score >= 50
                              ? "text-amber-600"
                              : "text-destructive"
                          }`}
                        >
                          {item.score}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
