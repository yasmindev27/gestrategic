import { useState, useMemo } from 'react';
import {
  Users, Award, BookOpen, AlertTriangle, ChevronLeft,
  TrendingUp, Star, Target, UserCheck, BarChart3
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// --- MOCK DATA ---
interface Capacitacao {
  curso: string;
  progresso: number;
  prazoVencido: boolean;
}

interface Falta {
  data: string;
  motivo: string;
  tipo: 'justificada' | 'injustificada';
}

interface Atestado {
  data: string;
  motivo: string;
  dias: number;
}

interface PDIItem {
  acao: string;
  prazo: string;
  status: 'pendente' | 'em_andamento' | 'concluido';
}

interface Colaborador {
  id: string;
  nome: string;
  cargo: string;
  setor: string;
  foto: string;
  perfilDISC: { predominante: string; secundario: string; descricao: string; pontosFortes: string[]; riscos: string[] };
  capacitacoes: Capacitacao[];
  faltas: Falta[];
  atestados: Atestado[];
  pdi: PDIItem[];
  engajamentoReunioes: number;
  mediaEquipe: number;
}

const MOCK_COLABORADORES: Colaborador[] = [
  {
    id: '1',
    nome: 'Ana Beatriz',
    cargo: 'Analista de Marketing',
    setor: 'Marketing',
    foto: '',
    perfilDISC: {
      predominante: 'Estabilidade (S)',
      secundario: 'Conformidade (C)',
      descricao: 'Profissional com perfil Estabilizador/Executor. Prioriza a harmonia da equipe e o cumprimento rigoroso de prazos. Trabalha de forma metódica e consistente, sendo uma referência de confiabilidade no time.',
      pontosFortes: ['Foco em prazos e entregas', 'Harmonia interpessoal', 'Consistência e confiabilidade', 'Trabalho em equipe'],
      riscos: ['Resistência a mudanças rápidas', 'Dificuldade em dar feedback negativo'],
    },
    capacitacoes: [
      { curso: 'Growth Hacking', progresso: 80, prazoVencido: false },
      { curso: 'LGPD', progresso: 100, prazoVencido: false },
    ],
    faltas: [],
    atestados: [{ data: '2026-01-15', motivo: 'Virose', dias: 2 }],
    pdi: [
      { acao: 'Concluir certificação Growth Hacking', prazo: '2026-03-15', status: 'em_andamento' },
      { acao: 'Liderar próxima campanha digital', prazo: '2026-04-01', status: 'pendente' },
    ],
    engajamentoReunioes: 92,
    mediaEquipe: 78,
  },
  {
    id: '2',
    nome: 'Marcos Oliveira',
    cargo: 'Desenvolvedor Full-Stack',
    setor: 'Tecnologia',
    foto: '',
    perfilDISC: {
      predominante: 'Conformidade (C)',
      secundario: 'Dominância (D)',
      descricao: 'Profissional com perfil Analítico/Reservado. Possui alta competência técnica, mas demonstra baixa interação social e pendências significativas em compliance. Necessita acompanhamento próximo para garantir aderência às políticas da empresa.',
      pontosFortes: ['Alta competência técnica', 'Pensamento analítico', 'Resolução de problemas complexos', 'Atenção a detalhes'],
      riscos: ['Baixa interação social', 'Pendência em compliance (capacitação vencida)', 'Faltas injustificadas recorrentes', 'Isolamento no time'],
    },
    capacitacoes: [
      { curso: 'Segurança da Informação', progresso: 0, prazoVencido: true },
    ],
    faltas: [
      { data: '2026-01-20', motivo: 'Não informado', tipo: 'injustificada' },
      { data: '2026-02-05', motivo: 'Não informado', tipo: 'injustificada' },
    ],
    atestados: [],
    pdi: [
      { acao: 'Conversa de alinhamento com gestor', prazo: '2026-02-20', status: 'pendente' },
      { acao: 'Concluir treinamento Segurança da Informação', prazo: '2026-02-28', status: 'pendente' },
      { acao: 'Participar de dinâmica de integração', prazo: '2026-03-10', status: 'pendente' },
    ],
    engajamentoReunioes: 45,
    mediaEquipe: 78,
  },
  {
    id: '3',
    nome: 'Sofia Helena',
    cargo: 'Executiva de Vendas',
    setor: 'Vendas',
    foto: '',
    perfilDISC: {
      predominante: 'Influência (I)',
      secundario: 'Dominância (D)',
      descricao: 'Profissional com perfil Influenciador/Dominante. Extremamente focada em metas, competitiva e líder nata. Inspira o time com sua energia e capacidade de persuasão. Forte candidata a posições de liderança.',
      pontosFortes: ['Foco em metas e resultados', 'Liderança natural', 'Comunicação persuasiva', 'Espírito competitivo positivo'],
      riscos: ['Pode ser impaciente com processos lentos', 'Tendência a tomar decisões impulsivas'],
    },
    capacitacoes: [
      { curso: 'Negociação Avançada', progresso: 100, prazoVencido: false },
    ],
    faltas: [
      { data: '2026-01-10', motivo: 'Questão familiar', tipo: 'justificada' },
    ],
    atestados: [
      { data: '2026-01-25', motivo: 'Exame de rotina', dias: 1 },
      { data: '2026-02-08', motivo: 'Exame de rotina', dias: 1 },
    ],
    pdi: [
      { acao: 'Plano de promoção para coordenação', prazo: '2026-06-01', status: 'em_andamento' },
      { acao: 'Mentoria com diretoria comercial', prazo: '2026-04-15', status: 'em_andamento' },
    ],
    engajamentoReunioes: 95,
    mediaEquipe: 78,
  },
];

function getStatusBadge(c: Colaborador) {
  const pendencias: string[] = [];
  const vencidos = c.capacitacoes.filter(cap => cap.prazoVencido);
  const faltasInj = c.faltas.filter(f => f.tipo === 'injustificada');
  const atestadosRecentes = c.atestados.length;

  if (vencidos.length > 0) pendencias.push(`${vencidos.length} curso(s) VENCIDO`);
  if (faltasInj.length > 0) pendencias.push(`${faltasInj.length} falta(s) injustificada(s)`);

  const totalPendencias = vencidos.length + faltasInj.length + c.pdi.filter(p => p.status === 'pendente').length;

  if (totalPendencias > 0) {
    return <Badge variant="destructive" className="text-xs">{totalPendencias} Pendência{totalPendencias > 1 ? 's' : ''}</Badge>;
  }
  if (atestadosRecentes > 0 && c.capacitacoes.every(cap => cap.progresso === 100)) {
    return <Badge className="text-xs bg-amber-500/15 text-amber-700 border-amber-300">Atenção: Atestado recente</Badge>;
  }
  if (c.capacitacoes.every(cap => cap.progresso === 100)) {
    return <Badge className="text-xs bg-emerald-500/15 text-emerald-700 border-emerald-300">100% Concluído</Badge>;
  }
  return <Badge variant="secondary" className="text-xs">Em dia</Badge>;
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

const DISC_COLORS: Record<string, string> = {
  'Dominância (D)': 'bg-red-500',
  'Influência (I)': 'bg-amber-500',
  'Estabilidade (S)': 'bg-emerald-500',
  'Conformidade (C)': 'bg-blue-500',
};

// ─── Deep Dive Profile ────────────────────────────────────────
function PerfilDetalhado({ colaborador, onBack }: { colaborador: Colaborador; onBack: () => void }) {
  const engajamentoData = [
    { name: colaborador.nome.split(' ')[0], Engajamento: colaborador.engajamentoReunioes, 'Média Equipe': colaborador.mediaEquipe },
  ];

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
        <ChevronLeft className="h-4 w-4" /> Voltar para lista
      </Button>

      {/* Header */}
      <Card>
        <CardContent className="p-6 flex flex-col sm:flex-row items-start gap-6">
          <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary flex-shrink-0">
            {getInitials(colaborador.nome)}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <h2 className="text-2xl font-bold">{colaborador.nome}</h2>
              {getStatusBadge(colaborador)}
            </div>
            <p className="text-muted-foreground">{colaborador.cargo} — {colaborador.setor}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <Badge className={`${DISC_COLORS[colaborador.perfilDISC.predominante] || 'bg-muted'} text-white`}>
                {colaborador.perfilDISC.predominante}
              </Badge>
              <Badge variant="outline">{colaborador.perfilDISC.secundario}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Histórico de Presença */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <UserCheck className="h-4 w-4" /> Histórico de Presença
            </CardTitle>
          </CardHeader>
          <CardContent>
            {colaborador.faltas.length === 0 && colaborador.atestados.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhum registro de falta ou atestado.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Motivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {colaborador.faltas.map((f, i) => (
                    <TableRow key={`f-${i}`}>
                      <TableCell className="text-sm">{new Date(f.data + 'T00:00:00').toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell>
                        <Badge variant={f.tipo === 'injustificada' ? 'destructive' : 'secondary'} className="text-xs">
                          Falta {f.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{f.motivo}</TableCell>
                    </TableRow>
                  ))}
                  {colaborador.atestados.map((a, i) => (
                    <TableRow key={`a-${i}`}>
                      <TableCell className="text-sm">{new Date(a.data + 'T00:00:00').toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell>
                        <Badge className="text-xs bg-amber-500/15 text-amber-700 border-amber-300">Atestado ({a.dias}d)</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{a.motivo}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Painel de Capacitação */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-4 w-4" /> Painel de Capacitação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {colaborador.capacitacoes.map((cap, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{cap.curso}</span>
                  <span className={`text-sm font-bold ${cap.prazoVencido ? 'text-destructive animate-pulse' : cap.progresso === 100 ? 'text-emerald-600' : 'text-primary'}`}>
                    {cap.progresso}%
                  </span>
                </div>
                <div className="relative">
                  <Progress value={cap.progresso} className={`h-3 ${cap.prazoVencido ? '[&>div]:bg-destructive' : cap.progresso === 100 ? '[&>div]:bg-emerald-500' : ''}`} />
                </div>
                {cap.prazoVencido && (
                  <div className="flex items-center gap-1 text-xs text-destructive font-semibold animate-pulse">
                    <AlertTriangle className="h-3 w-3" /> PRAZO VENCIDO — Ação imediata necessária
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Análise Comportamental DISC */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="h-4 w-4" /> Análise Comportamental (DISC) — Gerada por IA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 rounded-lg p-4 border border-border mb-4">
              <p className="text-sm leading-relaxed italic">{colaborador.perfilDISC.descricao}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-semibold text-emerald-700 mb-2 flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5" /> Pontos Fortes</h4>
                <ul className="space-y-1">
                  {colaborador.perfilDISC.pontosFortes.map((p, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-emerald-500 mt-1">●</span> {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-amber-700 mb-2 flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> Riscos Identificados</h4>
                <ul className="space-y-1">
                  {colaborador.perfilDISC.riscos.map((r, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-amber-500 mt-1">●</span> {r}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PDI */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" /> PDI — Plano de Desenvolvimento Individual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {colaborador.pdi.map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border">
                  <div className={`h-2 w-2 rounded-full mt-1.5 flex-shrink-0 ${
                    item.status === 'concluido' ? 'bg-emerald-500' :
                    item.status === 'em_andamento' ? 'bg-amber-500' : 'bg-muted-foreground'
                  }`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.acao}</p>
                    <p className="text-xs text-muted-foreground">Prazo: {new Date(item.prazo + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                  </div>
                  <Badge variant="outline" className="text-xs capitalize">
                    {item.status.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Engajamento Chart */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Engajamento em Reuniões vs Média
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={engajamentoData} barGap={8}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis domain={[0, 100]} className="text-xs" />
                <Tooltip />
                <Legend />
                <Bar dataKey="Engajamento" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Média Equipe" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} opacity={0.5} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────
export function GestaoTalentos() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return MOCK_COLABORADORES;
    const term = search.toLowerCase();
    return MOCK_COLABORADORES.filter(c =>
      c.nome.toLowerCase().includes(term) ||
      c.cargo.toLowerCase().includes(term) ||
      c.setor.toLowerCase().includes(term)
    );
  }, [search]);

  const selected = MOCK_COLABORADORES.find(c => c.id === selectedId);

  if (selected) {
    return <PerfilDetalhado colaborador={selected} onBack={() => setSelectedId(null)} />;
  }

  // Summary stats
  const totalPendencias = MOCK_COLABORADORES.reduce((sum, c) => {
    return sum + c.capacitacoes.filter(cap => cap.prazoVencido).length +
      c.faltas.filter(f => f.tipo === 'injustificada').length +
      c.pdi.filter(p => p.status === 'pendente').length;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="h-8 w-8 text-primary opacity-80" />
            <div>
              <p className="text-2xl font-bold">{MOCK_COLABORADORES.length}</p>
              <p className="text-sm text-muted-foreground">Colaboradores</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-primary opacity-80" />
            <div>
              <p className="text-2xl font-bold">{MOCK_COLABORADORES.reduce((s, c) => s + c.capacitacoes.length, 0)}</p>
              <p className="text-sm text-muted-foreground">Capacitações</p>
            </div>
          </CardContent>
        </Card>
        <Card className={totalPendencias > 0 ? 'border-destructive/30' : ''}>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className={`h-8 w-8 ${totalPendencias > 0 ? 'text-destructive' : 'text-muted-foreground'} opacity-80`} />
            <div>
              <p className={`text-2xl font-bold ${totalPendencias > 0 ? 'text-destructive' : ''}`}>{totalPendencias}</p>
              <p className="text-sm text-muted-foreground">Pendências</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Award className="h-8 w-8 text-emerald-500 opacity-80" />
            <div>
              <p className="text-2xl font-bold text-emerald-600">
                {MOCK_COLABORADORES.filter(c => c.capacitacoes.every(cap => cap.progresso === 100 && !cap.prazoVencido)).length}
              </p>
              <p className="text-sm text-muted-foreground">100% em dia</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Input
        placeholder="Buscar por nome, cargo ou setor..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-md"
      />

      {/* Colaborador Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(c => (
          <Card
            key={c.id}
            className="cursor-pointer hover:shadow-lg hover:border-primary/30 transition-all group"
            onClick={() => setSelectedId(c.id)}
          >
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                  {getInitials(c.nome)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{c.nome}</h3>
                  <p className="text-sm text-muted-foreground truncate">{c.cargo}</p>
                  <p className="text-xs text-muted-foreground">{c.setor}</p>
                  <div className="mt-2">{getStatusBadge(c)}</div>
                </div>
              </div>

              {/* Mini DISC badge */}
              <div className="mt-3 flex gap-1.5">
                <Badge className={`${DISC_COLORS[c.perfilDISC.predominante] || 'bg-muted'} text-white text-[10px] px-1.5 py-0`}>
                  {c.perfilDISC.predominante.split('(')[1]?.replace(')', '') || c.perfilDISC.predominante}
                </Badge>
              </div>

              {/* Quick stats */}
              <div className="mt-3 flex gap-3 text-xs text-muted-foreground">
                <span>{c.faltas.length} falta{c.faltas.length !== 1 ? 's' : ''}</span>
                <span>•</span>
                <span>{c.atestados.length} atestado{c.atestados.length !== 1 ? 's' : ''}</span>
                <span>•</span>
                <span>{c.capacitacoes.length} curso{c.capacitacoes.length !== 1 ? 's' : ''}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
