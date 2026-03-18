import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Search, ChevronDown, ChevronRight, ArrowRight, Clock, AlertTriangle,
  Users, CheckCircle2, Circle, Ambulance, Stethoscope, Syringe, Heart,
  FlaskConical, Shield, HardHat, Shirt, UtensilsCrossed, Receipt, UserCog,
  ClipboardX, Monitor, Wrench, GraduationCap, Building2, FileText
} from "lucide-react";

interface Tarefa {
  nome: string;
  responsavel: string;
  prioridade: "alta" | "media" | "baixa";
  prazo?: string;
  dependencias?: string[];
  decisao?: boolean;
}

interface SetorFluxo {
  nome: string;
  categoria: "assistencial" | "apoio" | "logistica" | "administrativo";
  icon: React.ElementType;
  cor: string;
  tarefas: Tarefa[];
}

const setoresData: SetorFluxo[] = [
  {
    nome: "NIR",
    categoria: "assistencial",
    icon: Ambulance,
    cor: "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400",
    tarefas: [
      { nome: "Receber solicitação de vaga", responsavel: "Regulador NIR", prioridade: "alta", prazo: "Imediato" },
      { nome: "Verificar disponibilidade de leitos", responsavel: "Regulador NIR", prioridade: "alta", dependencias: ["Mapa de Leitos"], decisao: true },
      { nome: "Autorizar internação via SUS Fácil", responsavel: "Regulador NIR", prioridade: "alta", prazo: "2h" },
      { nome: "Registrar transferência no sistema", responsavel: "Regulador NIR", prioridade: "media" },
      { nome: "Comunicar setor de destino", responsavel: "Regulador NIR", prioridade: "alta", dependencias: ["Enfermagem"] },
      { nome: "Acompanhar lista de faltantes Salus", responsavel: "Regulador NIR", prioridade: "media", prazo: "Diário" },
    ],
  },
  {
    nome: "Médicos",
    categoria: "assistencial",
    icon: Stethoscope,
    cor: "bg-lime-500/10 border-lime-500/30 text-lime-700 dark:text-lime-400",
    tarefas: [
      { nome: "Realizar classificação de risco", responsavel: "Médico Plantonista", prioridade: "alta", prazo: "Imediato" },
      { nome: "Atendimento clínico do paciente", responsavel: "Médico Plantonista", prioridade: "alta" },
      { nome: "Prescrição médica", responsavel: "Médico Plantonista", prioridade: "alta", dependencias: ["Enfermagem"] },
      { nome: "Solicitar exames laboratoriais", responsavel: "Médico Plantonista", prioridade: "media", dependencias: ["Laboratório"], decisao: true },
      { nome: "Avaliar prontuários (CC)", responsavel: "Coordenador Médico", prioridade: "media", prazo: "Semanal" },
      { nome: "Definir alta / internação", responsavel: "Médico Plantonista", prioridade: "alta", decisao: true },
    ],
  },
  {
    nome: "Enfermagem",
    categoria: "assistencial",
    icon: Syringe,
    cor: "bg-cyan-500/10 border-cyan-500/30 text-cyan-700 dark:text-cyan-400",
    tarefas: [
      { nome: "Acolhimento e triagem", responsavel: "Enfermeiro(a)", prioridade: "alta", prazo: "Imediato" },
      { nome: "Administrar medicação", responsavel: "Técnico(a) de Enfermagem", prioridade: "alta", dependencias: ["Médicos"] },
      { nome: "Registrar evolução do paciente", responsavel: "Enfermeiro(a)", prioridade: "media", prazo: "Por turno" },
      { nome: "Gerenciar escalas de plantão", responsavel: "Coordenador(a) Enfermagem", prioridade: "media", prazo: "Mensal" },
      { nome: "Solicitar/aceitar troca de plantão", responsavel: "Profissional de Enfermagem", prioridade: "baixa" },
      { nome: "Passagem de plantão", responsavel: "Enfermeiro(a)", prioridade: "alta", prazo: "A cada turno" },
    ],
  },
  {
    nome: "Assistência Social",
    categoria: "assistencial",
    icon: Heart,
    cor: "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400",
    tarefas: [
      { nome: "Atendimento social ao paciente/família", responsavel: "Assistente Social", prioridade: "alta" },
      { nome: "Cadastro de paciente social", responsavel: "Assistente Social", prioridade: "media" },
      { nome: "Encaminhamento para rede de apoio", responsavel: "Assistente Social", prioridade: "media", decisao: true },
      { nome: "Elaborar relatório de atendimento", responsavel: "Assistente Social", prioridade: "baixa", prazo: "Semanal" },
    ],
  },
  {
    nome: "Laboratório",
    categoria: "apoio",
    icon: FlaskConical,
    cor: "bg-pink-500/10 border-pink-500/30 text-pink-700 dark:text-pink-400",
    tarefas: [
      { nome: "Receber solicitação de exames", responsavel: "Técnico Laboratório", prioridade: "alta", dependencias: ["Médicos"] },
      { nome: "Coletar amostras", responsavel: "Técnico Laboratório", prioridade: "alta", prazo: "30min" },
      { nome: "Processar e analisar amostras", responsavel: "Bioquímico", prioridade: "alta" },
      { nome: "Liberar resultados", responsavel: "Bioquímico", prioridade: "alta", prazo: "2-4h", dependencias: ["Médicos"] },
      { nome: "Gerenciar escala laboratorial", responsavel: "Coordenador Lab", prioridade: "media", prazo: "Mensal" },
    ],
  },
  {
    nome: "Qualidade / NSP",
    categoria: "apoio",
    icon: Shield,
    cor: "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400",
    tarefas: [
      { nome: "Realizar auditorias de segurança", responsavel: "Auditor Qualidade", prioridade: "alta", prazo: "Mensal" },
      { nome: "Analisar incidentes reportados", responsavel: "Coordenador NSP", prioridade: "alta", prazo: "48h" },
      { nome: "Monitorar indicadores NSP", responsavel: "Coordenador NSP", prioridade: "media", prazo: "Mensal" },
      { nome: "Elaborar plano de ação corretiva", responsavel: "Equipe Qualidade", prioridade: "alta", dependencias: ["Todos os setores"], decisao: true },
      { nome: "Controlar conformidade de protocolos", responsavel: "Auditor Qualidade", prioridade: "media" },
    ],
  },
  {
    nome: "Segurança do Trabalho",
    categoria: "apoio",
    icon: HardHat,
    cor: "bg-yellow-500/10 border-yellow-500/30 text-yellow-700 dark:text-yellow-400",
    tarefas: [
      { nome: "Controlar entrega de EPIs", responsavel: "Técnico Seg. Trabalho", prioridade: "alta" },
      { nome: "Realizar rondas de segurança", responsavel: "Técnico Seg. Trabalho", prioridade: "media", prazo: "Diário" },
      { nome: "Gerenciar carteira de vacinação", responsavel: "Técnico Seg. Trabalho", prioridade: "media" },
      { nome: "Registrar notificações de acidentes", responsavel: "Técnico Seg. Trabalho", prioridade: "alta", prazo: "24h" },
      { nome: "Controlar uniformes", responsavel: "Técnico Seg. Trabalho", prioridade: "baixa" },
    ],
  },
  {
    nome: "Rouparia",
    categoria: "logistica",
    icon: Shirt,
    cor: "bg-violet-500/10 border-violet-500/30 text-violet-700 dark:text-violet-400",
    tarefas: [
      { nome: "Controlar estoque de roupas", responsavel: "Responsável Rouparia", prioridade: "media" },
      { nome: "Registrar movimentações (entrada/saída)", responsavel: "Responsável Rouparia", prioridade: "media", prazo: "Diário" },
      { nome: "Categorizar itens por tipo", responsavel: "Responsável Rouparia", prioridade: "baixa" },
      { nome: "Gerar relatórios de consumo", responsavel: "Responsável Rouparia", prioridade: "baixa", prazo: "Mensal" },
    ],
  },
  {
    nome: "Restaurante",
    categoria: "logistica",
    icon: UtensilsCrossed,
    cor: "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400",
    tarefas: [
      { nome: "Cadastrar colaboradores habilitados", responsavel: "Coordenador Restaurante", prioridade: "media" },
      { nome: "Registrar refeições servidas", responsavel: "Atendente Restaurante", prioridade: "alta", prazo: "Por refeição" },
      { nome: "Verificar tentativas de duplicidade", responsavel: "Sistema / Coordenador", prioridade: "alta", decisao: true },
      { nome: "Elaborar relatório quantitativo", responsavel: "Coordenador Restaurante", prioridade: "media", prazo: "Diário" },
    ],
  },
  {
    nome: "Faturamento",
    categoria: "administrativo",
    icon: Receipt,
    cor: "bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400",
    tarefas: [
      { nome: "Controlar saída de prontuários", responsavel: "Faturista", prioridade: "alta", prazo: "Diário" },
      { nome: "Identificar prontuários faltantes", responsavel: "Faturista", prioridade: "alta", dependencias: ["Recepção"] },
      { nome: "Avaliar conformidade de prontuários", responsavel: "Auditor Faturamento", prioridade: "alta" },
      { nome: "Registrar folhas avulsas", responsavel: "Faturista", prioridade: "media" },
      { nome: "Gerar dashboard de faturamento", responsavel: "Coordenador Faturamento", prioridade: "media", prazo: "Mensal" },
    ],
  },
  {
    nome: "RH / DP",
    categoria: "administrativo",
    icon: UserCog,
    cor: "bg-indigo-500/10 border-indigo-500/30 text-indigo-700 dark:text-indigo-400",
    tarefas: [
      { nome: "Gerenciar banco de horas", responsavel: "Analista RH", prioridade: "alta", prazo: "Mensal" },
      { nome: "Central de atestados", responsavel: "Analista DP", prioridade: "alta", prazo: "Diário" },
      { nome: "Controlar movimentações disciplinares", responsavel: "Analista RH", prioridade: "media" },
      { nome: "Gerenciar formulários RH", responsavel: "Analista RH", prioridade: "baixa" },
      { nome: "Cadastrar profissionais de saúde", responsavel: "Analista RH", prioridade: "media", dependencias: ["Administração"] },
    ],
  },
  {
    nome: "Controle de Fichas",
    categoria: "administrativo",
    icon: ClipboardX,
    cor: "bg-orange-500/10 border-orange-500/30 text-orange-700 dark:text-orange-400",
    tarefas: [
      { nome: "Registrar fichas de atendimento", responsavel: "Recepcionista", prioridade: "alta", prazo: "Contínuo" },
      { nome: "Controlar numeração sequencial", responsavel: "Recepcionista", prioridade: "alta" },
      { nome: "Realizar contagem de fichas (PDF)", responsavel: "Coordenador", prioridade: "media", prazo: "Diário" },
    ],
  },
  {
    nome: "TI",
    categoria: "administrativo",
    icon: Monitor,
    cor: "bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-400",
    tarefas: [
      { nome: "Gerenciar chamados de suporte", responsavel: "Analista TI", prioridade: "alta", prazo: "Conforme SLA" },
      { nome: "Manutenção de infraestrutura", responsavel: "Analista TI", prioridade: "media" },
      { nome: "Gerenciar inventário de ativos", responsavel: "Analista TI", prioridade: "media" },
      { nome: "Monitorar dashboard de chamados", responsavel: "Coordenador TI", prioridade: "media", prazo: "Diário" },
    ],
  },
  {
    nome: "Manutenção",
    categoria: "administrativo",
    icon: Wrench,
    cor: "bg-orange-600/10 border-orange-600/30 text-orange-700 dark:text-orange-400",
    tarefas: [
      { nome: "Atender chamados de manutenção", responsavel: "Técnico Manutenção", prioridade: "alta", prazo: "Conforme SLA" },
      { nome: "Manutenção preventiva", responsavel: "Técnico Manutenção", prioridade: "media", prazo: "Mensal" },
      { nome: "Registrar materiais utilizados", responsavel: "Técnico Manutenção", prioridade: "baixa" },
    ],
  },
  {
    nome: "Engenharia Clínica",
    categoria: "administrativo",
    icon: Stethoscope,
    cor: "bg-teal-500/10 border-teal-500/30 text-teal-700 dark:text-teal-400",
    tarefas: [
      { nome: "Gestão de equipamentos médicos", responsavel: "Engenheiro Clínico", prioridade: "alta" },
      { nome: "Calibração e certificação", responsavel: "Engenheiro Clínico", prioridade: "alta", prazo: "Conforme vigência" },
      { nome: "Atender chamados técnicos", responsavel: "Técnico Eng. Clínica", prioridade: "alta", prazo: "Conforme SLA" },
    ],
  },
  {
    nome: "Capacitação / LMS",
    categoria: "administrativo",
    icon: GraduationCap,
    cor: "bg-sky-500/10 border-sky-500/30 text-sky-700 dark:text-sky-400",
    tarefas: [
      { nome: "Criar cronograma de treinamentos", responsavel: "Coordenador Capacitação", prioridade: "media", prazo: "Mensal" },
      { nome: "Aplicar LNTD (Levantamento de Necessidades)", responsavel: "Coordenador Capacitação", prioridade: "media", prazo: "Semestral" },
      { nome: "Registrar lista de presença", responsavel: "Instrutor", prioridade: "alta" },
      { nome: "Aplicar quizzes de avaliação", responsavel: "Instrutor", prioridade: "media" },
      { nome: "Monitorar indicadores de capacitação", responsavel: "Coordenador Capacitação", prioridade: "baixa", prazo: "Mensal" },
    ],
  },
];

const categoriaLabels: Record<string, { label: string; color: string }> = {
  assistencial: { label: "Assistencial", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
  apoio: { label: "Apoio", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  logistica: { label: "Logística", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
  administrativo: { label: "Administrativo", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" },
};

const prioridadeConfig = {
  alta: { label: "Alta", color: "bg-red-500 text-white", icon: AlertTriangle },
  media: { label: "Média", color: "bg-yellow-500 text-black", icon: Clock },
  baixa: { label: "Baixa", color: "bg-green-500 text-white", icon: CheckCircle2 },
};

export function FluxogramaSetores() {
  const [search, setSearch] = useState("");
  const [expandedSetores, setExpandedSetores] = useState<Set<string>>(new Set());
  const [filtroCategoria, setFiltroCategoria] = useState<string>("todos");

  const toggleSetor = (nome: string) => {
    setExpandedSetores(prev => {
      const next = new Set(prev);
      if (next.has(nome)) next.delete(nome);
      else next.add(nome);
      return next;
    });
  };

  const expandAll = () => setExpandedSetores(new Set(setoresData.map(s => s.nome)));
  const collapseAll = () => setExpandedSetores(new Set());

  const filteredSetores = setoresData.filter(s => {
    const matchSearch = search === "" ||
      s.nome.toLowerCase().includes(search.toLowerCase()) ||
      s.tarefas.some(t => t.nome.toLowerCase().includes(search.toLowerCase()) || t.responsavel.toLowerCase().includes(search.toLowerCase()));
    const matchCategoria = filtroCategoria === "todos" || s.categoria === filtroCategoria;
    return matchSearch && matchCategoria;
  });

  const totalTarefas = setoresData.reduce((acc, s) => acc + s.tarefas.length, 0);
  const tarefasAlta = setoresData.reduce((acc, s) => acc + s.tarefas.filter(t => t.prioridade === "alta").length, 0);

  return (
    <div className="space-y-4">
      {/* Header stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{setoresData.length}</p>
              <p className="text-xs text-muted-foreground">Setores</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <FileText className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalTarefas}</p>
              <p className="text-xs text-muted-foreground">Tarefas Mapeadas</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{tarefasAlta}</p>
              <p className="text-xs text-muted-foreground">Prioridade Alta</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <Users className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {new Set(setoresData.flatMap(s => s.tarefas.map(t => t.responsavel))).size}
              </p>
              <p className="text-xs text-muted-foreground">Funções Responsáveis</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar setor, tarefa ou responsável..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-1 flex-wrap">
              <Button size="sm" variant={filtroCategoria === "todos" ? "default" : "outline"} onClick={() => setFiltroCategoria("todos")}>
                Todos
              </Button>
              {Object.entries(categoriaLabels).map(([key, { label }]) => (
                <Button key={key} size="sm" variant={filtroCategoria === key ? "default" : "outline"} onClick={() => setFiltroCategoria(key)}>
                  {label}
                </Button>
              ))}
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={expandAll}>Expandir Todos</Button>
              <Button size="sm" variant="ghost" onClick={collapseAll}>Recolher</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Flowchart */}
      <ScrollArea className="h-[calc(100vh-380px)]">
        <div className="space-y-3 pr-4">
          {filteredSetores.map((setor, idx) => {
            const Icon = setor.icon;
            const isOpen = expandedSetores.has(setor.nome);
            const catInfo = categoriaLabels[setor.categoria];

            return (
              <Collapsible key={setor.nome} open={isOpen} onOpenChange={() => toggleSetor(setor.nome)}>
                <Card className={`border transition-all ${isOpen ? "ring-1 ring-primary/30 shadow-md" : "hover:shadow-sm"}`}>
                  <CollapsibleTrigger asChild>
                    <button className="w-full text-left">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg border ${setor.cor}`}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div>
                              <CardTitle className="text-base">{setor.nome}</CardTitle>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className={catInfo.color}>
                                  {catInfo.label}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {setor.tarefas.length} tarefas
                                </span>
                              </div>
                            </div>
                          </div>
                          {isOpen ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                        </div>
                      </CardHeader>
                    </button>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="pt-0 pb-4">
                      <div className="relative ml-6 border-l-2 border-border/60 pl-6 space-y-4 mt-2">
                        {setor.tarefas.map((tarefa, tIdx) => {
                          const PriIcon = prioridadeConfig[tarefa.prioridade].icon;
                          return (
                            <div key={tIdx} className="relative">
                              {/* Node connector */}
                              <div className="absolute -left-[31px] top-3 w-4 h-4 rounded-full border-2 border-primary bg-background flex items-center justify-center">
                                {tarefa.decisao ? (
                                  <div className="w-2 h-2 bg-yellow-500 rotate-45" />
                                ) : (
                                  <Circle className="h-2 w-2 fill-primary text-primary" />
                                )}
                              </div>

                              <div className={`p-3 rounded-lg border ${tarefa.decisao ? "border-yellow-500/40 bg-yellow-500/5" : "border-border/50 bg-muted/30"}`}>
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      {tarefa.decisao && (
                                        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30 text-[10px]">
                                          ◆ Decisão
                                        </Badge>
                                      )}
                                      <p className="font-medium text-sm text-foreground">{tarefa.nome}</p>
                                    </div>
                                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Users className="h-3 w-3" />
                                        {tarefa.responsavel}
                                      </span>
                                      {tarefa.prazo && (
                                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                          <Clock className="h-3 w-3" />
                                          {tarefa.prazo}
                                        </span>
                                      )}
                                    </div>
                                    {tarefa.dependencias && tarefa.dependencias.length > 0 && (
                                      <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                        {tarefa.dependencias.map(dep => (
                                          <Badge key={dep} variant="secondary" className="text-[10px] h-5">
                                            {dep}
                                          </Badge>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  <Badge className={`${prioridadeConfig[tarefa.prioridade].color} text-[10px] h-5 shrink-0`}>
                                    <PriIcon className="h-3 w-3 mr-1" />
                                    {prioridadeConfig[tarefa.prioridade].label}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>

                {/* Flow connector between sectors */}
                {idx < filteredSetores.length - 1 && (
                  <div className="flex justify-center py-1">
                    <div className="w-px h-4 bg-border/60" />
                  </div>
                )}
              </Collapsible>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
