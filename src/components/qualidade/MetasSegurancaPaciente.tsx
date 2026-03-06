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
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Info,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";

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
    // Meta 1: Identificação correta do paciente
    const incidentesIdentificacao = incidentes.filter(i => 
      i.descricao?.toLowerCase().includes("identificação") || 
      i.descricao?.toLowerCase().includes("pulseira") ||
      i.descricao?.toLowerCase().includes("homônimo")
    ).length;
    const score1 = Math.max(0, 100 - (incidentesIdentificacao * 10));

    // Meta 2: Comunicação efetiva
    const incidentesComunicacao = incidentes.filter(i => 
      i.descricao?.toLowerCase().includes("comunicação") || 
      i.descricao?.toLowerCase().includes("passagem de plantão") ||
      i.descricao?.toLowerCase().includes("prescrição verbal")
    ).length;
    const score2 = Math.max(0, 100 - (incidentesComunicacao * 10));

    // Meta 3: Segurança na prescrição e administração de medicamentos
    const incidentesMedicamentos = incidentes.filter(i => 
      i.descricao?.toLowerCase().includes("medicamento") || 
      i.descricao?.toLowerCase().includes("medicação") ||
      i.descricao?.toLowerCase().includes("prescrição") ||
      i.descricao?.toLowerCase().includes("dose")
    ).length;
    const score3 = Math.max(0, 100 - (incidentesMedicamentos * 8));

    // Meta 4: Cirurgia segura
    const incidentesCirurgia = incidentes.filter(i => 
      i.descricao?.toLowerCase().includes("cirurgia") || 
      i.descricao?.toLowerCase().includes("procedimento") ||
      i.descricao?.toLowerCase().includes("lateralidade")
    ).length;
    const score4 = Math.max(0, 100 - (incidentesCirurgia * 15));

    // Meta 5: Higienização das mãos
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
    const score5 = auditoriasHigiene.length > 0 
      ? Math.round((conformesHigiene / auditoriasHigiene.length) * 100) 
      : 75;

    // Meta 6: Prevenção de quedas e lesões por pressão
    const incidentesQuedas = incidentes.filter(i => 
      i.descricao?.toLowerCase().includes("queda") || 
      i.descricao?.toLowerCase().includes("lesão por pressão") ||
      i.descricao?.toLowerCase().includes("lpp") ||
      i.descricao?.toLowerCase().includes("úlcera")
    ).length;
    const score6 = Math.max(0, 100 - (incidentesQuedas * 8));

    return [
      {
        id: "meta1",
        numero: 1,
        titulo: "Identificação Correta do Paciente",
        descricao: "Garantir a identificação inequívoca de todos os pacientes em todos os pontos de atendimento, utilizando pelo menos dois identificadores (nome completo e data de nascimento).",
        requisitos_ona: [
          "Protocolo de identificação do paciente implementado",
          "Uso de pulseiras de identificação em 100% dos pacientes internados",
          "Verificação dupla antes de procedimentos, medicações e exames",
          "Processo definido para pacientes homônimos",
        ],
        icon: UserCheck,
        score: score1,
        status: calcStatus(score1),
        indicadores: [
          { nome: "Incidentes de identificação", valor: incidentesIdentificacao, meta: 0, unidade: "" },
          { nome: "Score de conformidade", valor: score1, meta: 95, unidade: "%" },
        ],
      },
      {
        id: "meta2",
        numero: 2,
        titulo: "Comunicação Efetiva",
        descricao: "Melhorar a comunicação entre profissionais de saúde, utilizando técnicas padronizadas como SBAR para passagem de plantão e ordens verbais.",
        requisitos_ona: [
          "Protocolo SBAR implementado para passagem de plantão",
          "Read-back para ordens verbais e telefônicas",
          "Padronização de siglas e abreviações",
          "Registro e rastreabilidade de comunicações críticas",
        ],
        icon: MessageSquare,
        score: score2,
        status: calcStatus(score2),
        indicadores: [
          { nome: "Incidentes de comunicação", valor: incidentesComunicacao, meta: 0, unidade: "" },
          { nome: "Score de conformidade", valor: score2, meta: 90, unidade: "%" },
        ],
      },
      {
        id: "meta3",
        numero: 3,
        titulo: "Segurança na Prescrição e Administração de Medicamentos",
        descricao: "Garantir a segurança no uso de medicamentos, incluindo os de alta vigilância (MAV), através dos 9 certos da administração.",
        requisitos_ona: [
          "Lista de Medicamentos de Alta Vigilância (MAV) definida e divulgada",
          "Dupla checagem para MAV e eletrólitos concentrados",
          "Protocolo dos 9 certos implementado",
          "Rastreabilidade de prescrição-dispensação-administração",
        ],
        icon: Pill,
        score: score3,
        status: calcStatus(score3),
        indicadores: [
          { nome: "Incidentes com medicamentos", valor: incidentesMedicamentos, meta: 0, unidade: "" },
          { nome: "Score de conformidade", valor: score3, meta: 90, unidade: "%" },
        ],
      },
      {
        id: "meta4",
        numero: 4,
        titulo: "Cirurgia Segura",
        descricao: "Assegurar cirurgias no local, procedimento e paciente corretos, com checklist de segurança cirúrgica em todos os procedimentos.",
        requisitos_ona: [
          "Checklist de cirurgia segura (OMS) implementado",
          "Marcação de lateralidade padronizada",
          "Time-out realizado antes de cada procedimento",
          "Contagem de instrumentais e compressas documentada",
        ],
        icon: Scissors,
        score: score4,
        status: calcStatus(score4),
        indicadores: [
          { nome: "Incidentes cirúrgicos", valor: incidentesCirurgia, meta: 0, unidade: "" },
          { nome: "Score de conformidade", valor: score4, meta: 95, unidade: "%" },
        ],
      },
      {
        id: "meta5",
        numero: 5,
        titulo: "Higienização das Mãos",
        descricao: "Reduzir o risco de infecções relacionadas à assistência à saúde (IRAS) através da higienização adequada das mãos nos 5 momentos preconizados pela OMS.",
        requisitos_ona: [
          "Disponibilidade de insumos em todos os pontos de assistência",
          "Adesão aos 5 momentos da higienização das mãos",
          "Auditorias periódicas de conformidade",
          "Programa de educação continuada sobre higienização",
        ],
        icon: HandMetal,
        score: score5,
        status: calcStatus(score5),
        indicadores: [
          { nome: "Auditorias realizadas", valor: auditoriasHigiene.length, meta: 10, unidade: "" },
          { nome: "Taxa de conformidade", valor: score5, meta: 80, unidade: "%" },
        ],
      },
      {
        id: "meta6",
        numero: 6,
        titulo: "Prevenção de Quedas e Lesões por Pressão",
        descricao: "Prevenir quedas e lesões por pressão (LPP) em pacientes internados, através de avaliação de risco sistemática e medidas preventivas.",
        requisitos_ona: [
          "Escala de Morse/Braden aplicada na admissão e periodicamente",
          "Protocolo de prevenção de quedas implementado",
          "Protocolo de prevenção de LPP com mudança de decúbito",
          "Notificação e investigação de eventos de queda/LPP",
        ],
        icon: ShieldAlert,
        score: score6,
        status: calcStatus(score6),
        indicadores: [
          { nome: "Incidentes de queda/LPP", valor: incidentesQuedas, meta: 0, unidade: "" },
          { nome: "Score de conformidade", valor: score6, meta: 90, unidade: "%" },
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
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative w-28 h-28 flex-shrink-0">
              <svg className="w-full h-full" viewBox="0 0 100 100">
                <circle
                  className="text-muted stroke-current"
                  strokeWidth="8"
                  fill="transparent"
                  r="42"
                  cx="50"
                  cy="50"
                />
                <circle
                  className={`${scoreGeral >= 80 ? "text-green-600" : scoreGeral >= 60 ? "text-yellow-600" : "text-red-600"} stroke-current`}
                  strokeWidth="8"
                  strokeLinecap="round"
                  fill="transparent"
                  r="42"
                  cx="50"
                  cy="50"
                  strokeDasharray={`${scoreGeral * 2.64} 264`}
                  transform="rotate(-90 50 50)"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-2xl font-bold ${scoreGeral >= 80 ? "text-green-600" : scoreGeral >= 60 ? "text-yellow-600" : "text-red-600"}`}>
                  {scoreGeral}%
                </span>
                <span className="text-[10px] text-muted-foreground font-medium">ONA N1</span>
              </div>
            </div>

            <div className="flex-1 text-center md:text-left">
              <h3 className="text-lg font-bold text-foreground">
                Metas Internacionais de Segurança do Paciente
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Monitoramento das 6 metas obrigatórias para acreditação ONA Nível 1 - Acreditado
              </p>
              <div className="flex gap-4 mt-3 justify-center md:justify-start">
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
          </div>
        </CardContent>
      </Card>

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
                
                <Progress 
                  value={meta.score} 
                  className="h-2"
                />

                {/* Indicadores */}
                <div className="space-y-1.5">
                  {meta.indicadores.map((ind, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{ind.nome}</span>
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
