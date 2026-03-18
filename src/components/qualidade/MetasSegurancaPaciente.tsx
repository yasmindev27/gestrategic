import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  UserCheck, 
  MessageSquare, 
  Pill, 
  Scissors, 
  HandMetal, 
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Target,
  Info,
  TrendingUp,
  TrendingDown,
  Activity,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RTooltip } from "recharts";

interface MetaSeguranca {
  id: string;
  numero: number;
  titulo: string;
  descricao: string;
  requisitos_ona: string[];
  icon: React.ElementType;
  score: number;
  status: "conforme" | "alerta" | "nao_conforme";
  indicadores: {
    nome: string;
    valor: number;
    meta: number;
    unidade: string;
    trend?: "up" | "down" | "stable";
  }[];
}

const statusConfig = {
  conforme: { label: "Conforme", color: "bg-green-600", textColor: "text-green-700", bgLight: "bg-green-50 border-green-200", icon: CheckCircle2 },
  alerta: { label: "Alerta", color: "bg-yellow-500", textColor: "text-yellow-700", bgLight: "bg-yellow-50 border-yellow-200", icon: AlertTriangle },
  nao_conforme: { label: "Nao Conforme", color: "bg-red-500", textColor: "text-red-700", bgLight: "bg-red-50 border-red-200", icon: XCircle },
};

export function MetasSegurancaPaciente() {
  const [incidentes, setIncidentes] = useState<any[]>([]);
  const [auditorias, setAuditorias] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [incRes, audRes] = await Promise.all([
      supabase.from("incidentes_nsp").select("*").order("created_at", { ascending: false }),
      supabase.from("auditorias_seguranca_paciente").select("*").order("created_at", { ascending: false }),
    ]);
    if (incRes.data) setIncidentes(incRes.data);
    if (audRes.data) setAuditorias(audRes.data);
    setIsLoading(false);
  };

  const calcStatus = (score: number): "conforme" | "alerta" | "nao_conforme" => {
    if (score >= 80) return "conforme";
    if (score >= 60) return "alerta";
    return "nao_conforme";
  };

  const metas: MetaSeguranca[] = useMemo(() => {
    const totalInc = incidentes.length;
    const encerrados = incidentes.filter(i => i.status === "encerrado").length;
    const comResp = incidentes.filter(i => i.responsavel_tratativa_nome).length;
    const comPlano = incidentes.filter(i => i.plano_acao).length;
    const comEvid = incidentes.filter(i => i.evidencia_url).length;
    const taxaEncerramento = totalInc > 0 ? Math.round((encerrados / totalInc) * 100) : 100;
    const taxaAtribuicao = totalInc > 0 ? Math.round((comResp / totalInc) * 100) : 100;
    const taxaPlano = totalInc > 0 ? Math.round((comPlano / totalInc) * 100) : 100;

    // Helper: calcula score baseado na taxa de resolução dos incidentes dessa categoria
    const calcCategoryScore = (filtered: any[]) => {
      if (filtered.length === 0) return 95; // sem incidentes = excelente
      const resolvidos = filtered.filter(i => i.status === "encerrado").length;
      const comTratativa = filtered.filter(i => i.plano_acao || i.responsavel_tratativa_nome).length;
      const taxaResolucao = Math.round((resolvidos / filtered.length) * 100);
      const taxaTratativa = Math.round((comTratativa / filtered.length) * 100);
      // Score: 60% taxa resolução + 40% taxa tratativa
      return Math.round(taxaResolucao * 0.6 + taxaTratativa * 0.4);
    };

    // Meta 1: Identificação correta do paciente
    const incIdentificacao = incidentes.filter(i => {
      const d = (i.descricao || "").toLowerCase();
      return d.includes("identificação") || d.includes("pulseira") || d.includes("homônimo") || d.includes("placa");
    });
    const score1 = calcCategoryScore(incIdentificacao);

    // Meta 2: Comunicação efetiva
    const incComunicacao = incidentes.filter(i => {
      const d = (i.descricao || "").toLowerCase();
      return d.includes("comunicação") || d.includes("passagem") || d.includes("plantão") ||
        d.includes("prescrição verbal") || d.includes("evolução") || d.includes("informação");
    });
    const score2 = calcCategoryScore(incComunicacao);

    // Meta 3: Segurança na prescrição e administração de medicamentos
    const incMedicamentos = incidentes.filter(i => {
      const d = (i.descricao || "").toLowerCase();
      return d.includes("medicamento") || d.includes("medicação") || d.includes("prescrição") ||
        d.includes("dose") || d.includes("dipirona") || d.includes("alergia") || 
        d.includes("antibiótico") || d.includes("atb") || d.includes("insulina");
    });
    const score3 = calcCategoryScore(incMedicamentos);

    // Meta 4: Cirurgia/Procedimento seguro
    const incCirurgia = incidentes.filter(i => {
      const d = (i.descricao || "").toLowerCase();
      return d.includes("cirurgia") || d.includes("procedimento") || d.includes("lateralidade") ||
        d.includes("sutura") || d.includes("iot") || d.includes("tubo");
    });
    const score4 = calcCategoryScore(incCirurgia);

    // Meta 5: Higienização das mãos / Prevenção de infecção
    const auditoriasHigiene = auditorias.filter(a => 
      a.tipo === "higienizacao_maos" || a.tipo === "seguranca_paciente"
    );
    const conformesHigiene = auditoriasHigiene.filter(a => {
      if (a.respostas && typeof a.respostas === 'object') {
        const r = a.respostas as Record<string, string>;
        const total = Object.keys(r).length;
        const ok = Object.values(r).filter(v => v === 'conforme' || v === 'sim' || v === 'sim_completo').length;
        return total > 0 && (ok / total) >= 0.8;
      }
      return false;
    }).length;
    const incInfeccao = incidentes.filter(i => {
      const d = (i.descricao || "").toLowerCase();
      return d.includes("contaminad") || d.includes("infecção") || d.includes("lixo") ||
        d.includes("descarte") || d.includes("perfurocortante") || d.includes("agulha") ||
        d.includes("equipo") || d.includes("sangue");
    });
    const score5Audit = auditoriasHigiene.length > 0 
      ? Math.round((conformesHigiene / auditoriasHigiene.length) * 100) 
      : 75;
    const score5Inc = calcCategoryScore(incInfeccao);
    const score5 = Math.round(score5Audit * 0.4 + score5Inc * 0.6);

    // Meta 6: Prevenção de quedas e lesões por pressão
    const incQuedas = incidentes.filter(i => {
      const d = (i.descricao || "").toLowerCase();
      return d.includes("queda") || d.includes("lesão por pressão") || d.includes("lpp") ||
        d.includes("úlcera") || d.includes("risco de queda") || d.includes("grade") ||
        d.includes("contenção") || d.includes("pulseira preta");
    });
    const score6 = calcCategoryScore(incQuedas);

    return [
      {
        id: "meta1", numero: 1,
        titulo: "Identificação Correta do Paciente",
        descricao: "Garantir a identificação inequívoca de todos os pacientes em todos os pontos de atendimento.",
        requisitos_ona: [
          "Protocolo de identificação do paciente implementado",
          "Uso de pulseiras de identificação em 100% dos pacientes internados",
          "Verificação dupla antes de procedimentos, medicações e exames",
          "Processo definido para pacientes homônimos",
        ],
        icon: UserCheck, score: score1, status: calcStatus(score1),
        indicadores: [
          { nome: "Incidentes relacionados", valor: incIdentificacao.length, meta: 0, unidade: "", trend: "down" as const },
          { nome: "Resolvidos", valor: incIdentificacao.filter(i => i.status === "encerrado").length, meta: incIdentificacao.length, unidade: "" },
          { nome: "Taxa de resolução", valor: incIdentificacao.length > 0 ? Math.round((incIdentificacao.filter(i => i.status === "encerrado").length / incIdentificacao.length) * 100) : 100, meta: 95, unidade: "%" },
        ],
      },
      {
        id: "meta2", numero: 2,
        titulo: "Comunicação Efetiva",
        descricao: "Melhorar a comunicação entre profissionais utilizando técnicas padronizadas como SBAR.",
        requisitos_ona: [
          "Protocolo SBAR implementado para passagem de plantão",
          "Read-back para ordens verbais e telefônicas",
          "Padronização de siglas e abreviações",
          "Registro e rastreabilidade de comunicações críticas",
        ],
        icon: MessageSquare, score: score2, status: calcStatus(score2),
        indicadores: [
          { nome: "Incidentes relacionados", valor: incComunicacao.length, meta: 0, unidade: "", trend: "down" as const },
          { nome: "Resolvidos", valor: incComunicacao.filter(i => i.status === "encerrado").length, meta: incComunicacao.length, unidade: "" },
          { nome: "Taxa de resolução", valor: incComunicacao.length > 0 ? Math.round((incComunicacao.filter(i => i.status === "encerrado").length / incComunicacao.length) * 100) : 100, meta: 90, unidade: "%" },
        ],
      },
      {
        id: "meta3", numero: 3,
        titulo: "Segurança na Prescrição e Administração de Medicamentos",
        descricao: "Garantir a segurança no uso de medicamentos, incluindo MAV, através dos 9 certos da administração.",
        requisitos_ona: [
          "Lista de Medicamentos de Alta Vigilância (MAV) definida e divulgada",
          "Dupla checagem para MAV e eletrólitos concentrados",
          "Protocolo dos 9 certos implementado",
          "Rastreabilidade de prescrição-dispensação-administração",
        ],
        icon: Pill, score: score3, status: calcStatus(score3),
        indicadores: [
          { nome: "Incidentes com medicamentos", valor: incMedicamentos.length, meta: 0, unidade: "", trend: "down" as const },
          { nome: "Resolvidos", valor: incMedicamentos.filter(i => i.status === "encerrado").length, meta: incMedicamentos.length, unidade: "" },
          { nome: "Com plano de ação", valor: taxaPlano, meta: 85, unidade: "%" },
        ],
      },
      {
        id: "meta4", numero: 4,
        titulo: "Procedimento Seguro",
        descricao: "Assegurar procedimentos no local e paciente corretos, com checklist de segurança em todos os procedimentos.",
        requisitos_ona: [
          "Checklist de segurança (OMS) implementado",
          "Marcação de lateralidade padronizada",
          "Time-out realizado antes de cada procedimento",
          "Contagem de instrumentais documentada",
        ],
        icon: Scissors, score: score4, status: calcStatus(score4),
        indicadores: [
          { nome: "Incidentes de procedimento", valor: incCirurgia.length, meta: 0, unidade: "" },
          { nome: "Resolvidos", valor: incCirurgia.filter(i => i.status === "encerrado").length, meta: incCirurgia.length, unidade: "" },
          { nome: "Taxa de resolução", valor: incCirurgia.length > 0 ? Math.round((incCirurgia.filter(i => i.status === "encerrado").length / incCirurgia.length) * 100) : 100, meta: 95, unidade: "%" },
        ],
      },
      {
        id: "meta5", numero: 5,
        titulo: "Prevenção de Infecções / Higienização das Mãos",
        descricao: "Reduzir o risco de IRAS através da higienização adequada das mãos e prevenção de contaminação.",
        requisitos_ona: [
          "Disponibilidade de insumos em todos os pontos de assistência",
          "Adesão aos 5 momentos da higienização das mãos (OMS)",
          "Auditorias periódicas de conformidade",
          "Descarte correto de resíduos e perfurocortantes",
        ],
        icon: HandMetal, score: score5, status: calcStatus(score5),
        indicadores: [
          { nome: "Incidentes de contaminação", valor: incInfeccao.length, meta: 0, unidade: "", trend: "down" as const },
          { nome: "Auditorias realizadas", valor: auditoriasHigiene.length, meta: 10, unidade: "" },
          { nome: "Conformidade auditoria", valor: score5Audit, meta: 80, unidade: "%" },
        ],
      },
      {
        id: "meta6", numero: 6,
        titulo: "Prevenção de Quedas e Lesões por Pressão",
        descricao: "Prevenir quedas e LPP em pacientes internados, com avaliação de risco e medidas preventivas.",
        requisitos_ona: [
          "Escala de Morse/Braden aplicada na admissão",
          "Protocolo de prevenção de quedas implementado",
          "Protocolo de prevenção de LPP com mudança de decúbito",
          "Notificação e investigação de eventos de queda/LPP",
        ],
        icon: ShieldAlert, score: score6, status: calcStatus(score6),
        indicadores: [
          { nome: "Incidentes de queda/LPP", valor: incQuedas.length, meta: 0, unidade: "", trend: "down" as const },
          { nome: "Resolvidos", valor: incQuedas.filter(i => i.status === "encerrado").length, meta: incQuedas.length, unidade: "" },
          { nome: "Taxa de resolução", valor: incQuedas.length > 0 ? Math.round((incQuedas.filter(i => i.status === "encerrado").length / incQuedas.length) * 100) : 100, meta: 90, unidade: "%" },
        ],
      },
    ];
  }, [incidentes, auditorias]);

  const scoreGeral = useMemo(() => {
    if (metas.length === 0) return 0;
    return Math.round(metas.reduce((acc, m) => acc + m.score, 0) / metas.length);
  }, [metas]);

  const totalConformes = metas.filter(m => m.status === "conforme").length;
  const totalAlertas = metas.filter(m => m.status === "alerta").length;
  const totalNaoConformes = metas.filter(m => m.status === "nao_conforme").length;

  // Stats gerais de gestão
  const totalInc = incidentes.length;
  const encerrados = incidentes.filter(i => i.status === "encerrado").length;
  const comResp = incidentes.filter(i => i.responsavel_tratativa_nome).length;
  const comPlano = incidentes.filter(i => i.plano_acao).length;

  // Distribution by meta for pie chart
  const metaDistData = metas.map(m => ({
    name: `Meta ${m.numero}`,
    value: m.score,
  }));
  const META_COLORS = ["hsl(210 70% 50%)", "hsl(150 60% 45%)", "hsl(30 90% 55%)", "hsl(280 60% 55%)", "hsl(190 70% 45%)", "hsl(350 70% 55%)"];

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Score Geral ONA Nível 1 */}
      <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-transparent">
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row items-center gap-6">
            <div className="relative w-28 h-28 flex-shrink-0">
              <svg className="w-full h-full" viewBox="0 0 100 100">
                <circle className="text-muted stroke-current" strokeWidth="8" fill="transparent" r="42" cx="50" cy="50" />
                <circle
                  className={`${scoreGeral >= 80 ? "text-green-600" : scoreGeral >= 60 ? "text-yellow-600" : "text-red-600"} stroke-current`}
                  strokeWidth="8" strokeLinecap="round" fill="transparent" r="42" cx="50" cy="50"
                  strokeDasharray={`${scoreGeral * 2.64} 264`} transform="rotate(-90 50 50)"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-2xl font-bold ${scoreGeral >= 80 ? "text-green-600" : scoreGeral >= 60 ? "text-yellow-600" : "text-red-600"}`}>
                  {scoreGeral}%
                </span>
                <span className="text-[10px] text-muted-foreground font-medium">ONA N1</span>
              </div>
            </div>

            <div className="flex-1 text-center lg:text-left">
              <h3 className="text-lg font-bold text-foreground">
                Metas Internacionais de Segurança do Paciente
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Monitoramento das 6 metas obrigatórias para acreditação ONA Nível 1 - Acreditado
              </p>
              <div className="flex gap-4 mt-3 justify-center lg:justify-start flex-wrap">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-600" />
                  <span className="text-sm">{totalConformes} Conformes</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                  <span className="text-sm">{totalAlertas} Alertas</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <span className="text-sm">{totalNaoConformes} Nao Conformes</span>
                </div>
              </div>
            </div>

            {/* Mini KPIs */}
            <div className="grid grid-cols-2 gap-3 text-center flex-shrink-0">
              <div className="px-4 py-2 rounded-lg bg-background border">
                <p className="text-2xl font-bold text-foreground">{totalInc}</p>
                <p className="text-[10px] text-muted-foreground">Total Notificações</p>
              </div>
              <div className="px-4 py-2 rounded-lg bg-background border">
                <p className="text-2xl font-bold text-green-600">{totalInc > 0 ? Math.round((encerrados / totalInc) * 100) : 0}%</p>
                <p className="text-[10px] text-muted-foreground">Encerrados</p>
              </div>
              <div className="px-4 py-2 rounded-lg bg-background border">
                <p className="text-2xl font-bold text-primary">{totalInc > 0 ? Math.round((comResp / totalInc) * 100) : 0}%</p>
                <p className="text-[10px] text-muted-foreground">Com Responsável</p>
              </div>
              <div className="px-4 py-2 rounded-lg bg-background border">
                <p className="text-2xl font-bold text-amber-600">{totalInc > 0 ? Math.round((comPlano / totalInc) * 100) : 0}%</p>
                <p className="text-[10px] text-muted-foreground">Com Plano</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Radar-like score comparison */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Score por Meta de Segurança
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-6 gap-2">
              {metas.map((meta, idx) => {
                const config = statusConfig[meta.status];
                return (
                  <div key={meta.id} className="flex flex-col items-center gap-1">
                    <div className="relative w-16 h-16">
                      <svg className="w-full h-full" viewBox="0 0 100 100">
                        <circle className="text-muted stroke-current" strokeWidth="10" fill="transparent" r="38" cx="50" cy="50" />
                        <circle
                          className={`${config.textColor} stroke-current`}
                          strokeWidth="10" strokeLinecap="round" fill="transparent" r="38" cx="50" cy="50"
                          strokeDasharray={`${meta.score * 2.39} 239`} transform="rotate(-90 50 50)"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className={`text-sm font-bold ${config.textColor}`}>{meta.score}%</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground text-center leading-tight">Meta {meta.numero}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Distribuição por Score</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={metaDistData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                  {metaDistData.map((_, i) => <Cell key={i} fill={META_COLORS[i % META_COLORS.length]} />)}
                </Pie>
                <RTooltip formatter={(value: number) => `${value}%`} />
                <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: "10px" }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Cards das 6 Metas */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {metas.map((meta) => {
          const Icon = meta.icon;
          const config = statusConfig[meta.status];
          const StatusIcon = config.icon;

          return (
            <Card key={meta.id} className={`border ${config.bgLight} transition-all hover:shadow-md`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${meta.status === "conforme" ? "bg-green-100" : meta.status === "alerta" ? "bg-yellow-100" : "bg-red-100"}`}>
                      <Icon className={`h-5 w-5 ${config.textColor}`} />
                    </div>
                    <div>
                      <Badge variant="outline" className="text-[10px] mb-1">
                        Meta {meta.numero}
                      </Badge>
                      <CardTitle className="text-sm leading-tight">{meta.titulo}</CardTitle>
                    </div>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge className={`${config.color} text-white text-xs`}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {meta.score}%
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{config.label}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground line-clamp-2">{meta.descricao}</p>
                
                <Progress value={meta.score} className="h-2" />

                {/* Indicadores */}
                <div className="space-y-1.5">
                  {meta.indicadores.map((ind, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground flex items-center gap-1">
                        {ind.trend === "down" && <TrendingDown className="h-3 w-3 text-green-600" />}
                        {ind.trend === "up" && <TrendingUp className="h-3 w-3 text-red-600" />}
                        {ind.nome}
                      </span>
                      <span className="font-medium">
                        {ind.valor}{ind.unidade}
                        {ind.meta > 0 && (
                          <span className="text-muted-foreground ml-1">/ {ind.meta}{ind.unidade}</span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Requisitos ONA */}
                <details className="group">
                  <summary className="flex items-center gap-1 text-xs font-medium text-primary cursor-pointer hover:underline">
                    <Info className="h-3 w-3" />
                    Requisitos ONA Nível 1
                  </summary>
                  <ul className="mt-2 space-y-1">
                    {meta.requisitos_ona.map((req, idx) => (
                      <li key={idx} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                        <CheckCircle2 className="h-3 w-3 mt-0.5 text-primary flex-shrink-0" />
                        {req}
                      </li>
                    ))}
                  </ul>
                </details>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Rodapé informativo ONA */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Target className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium">ONA Nível 1 - Acreditado</p>
              <p className="text-xs text-muted-foreground">
                A acreditação ONA Nível 1 atesta que a instituição atende aos requisitos fundamentais de segurança do paciente 
                em todas as áreas de atividade, com foco nas 6 Metas Internacionais de Segurança do Paciente (IPSG). 
                Os indicadores são calculados em tempo real com base nos registros de incidentes, auditorias e protocolos do sistema.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
