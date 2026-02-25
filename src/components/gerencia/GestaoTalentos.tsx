import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Users, Award, BookOpen, AlertTriangle, ChevronLeft,
  TrendingUp, TrendingDown, Star, Target, UserCheck, BarChart3, Loader2, Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, isPast } from 'date-fns';

// ─── Types ────────────────────────────────────────────────────
interface ColaboradorData {
  user_id: string;
  full_name: string;
  cargo: string | null;
  setor: string | null;
  avatar_url: string | null;
  atestados: { data_inicio: string; data_fim: string; tipo: string; dias_afastamento: number; status: string }[];
  capacitacoes: { titulo: string; progresso: number; prazoVencido: boolean; data_limite: string | null; status: string }[];
  pdi: { titulo: string; data_inicio: string; data_fim: string | null; status: string; prioridade: string | null }[];
  disc: { perfil_predominante: string; perfil_secundario: string; score_d: number; score_i: number; score_s: number; score_c: number; leadership_score: number } | null;
  bancoHoras: { data: string; tipo: string; horas: number; motivo: string | null }[];
  saldoHoras: number;
}

const DISC_LABEL: Record<string, string> = {
  D: 'Dominância (D)',
  I: 'Influência (I)',
  S: 'Estabilidade (S)',
  C: 'Conformidade (C)',
};

const DISC_COLORS: Record<string, string> = {
  'Dominância (D)': 'bg-red-500',
  'Influência (I)': 'bg-amber-500',
  'Estabilidade (S)': 'bg-emerald-500',
  'Conformidade (C)': 'bg-blue-500',
};

const DISC_DESCRICOES: Record<string, { descricao: string; pontosFortes: string[]; riscos: string[] }> = {
  D: {
    descricao: 'Perfil Dominante. Orientado a resultados, direto e decidido. Assume riscos e toma decisões rapidamente. Líder natural em situações de pressão.',
    pontosFortes: ['Orientação a resultados', 'Tomada de decisão rápida', 'Liderança sob pressão', 'Determinação e foco'],
    riscos: ['Pode ser impaciente', 'Tendência a decisões impulsivas', 'Dificuldade em delegar'],
  },
  I: {
    descricao: 'Perfil Influenciador. Comunicativo, entusiasta e persuasivo. Motiva equipes com energia e otimismo. Excelente em networking e relações interpessoais.',
    pontosFortes: ['Comunicação persuasiva', 'Motivação de equipes', 'Networking e relações', 'Criatividade e entusiasmo'],
    riscos: ['Pode ser desorganizado', 'Evita confrontos necessários', 'Foco disperso em múltiplos projetos'],
  },
  S: {
    descricao: 'Perfil Estabilizador. Confiável, paciente e cooperativo. Prioriza harmonia e consistência. Referência de estabilidade dentro da equipe.',
    pontosFortes: ['Consistência e confiabilidade', 'Trabalho em equipe', 'Paciência e escuta ativa', 'Foco em processos'],
    riscos: ['Resistência a mudanças rápidas', 'Dificuldade em dar feedback negativo', 'Pode evitar conflitos necessários'],
  },
  C: {
    descricao: 'Perfil Analítico/Conformista. Preciso, meticuloso e orientado a qualidade. Alta competência técnica com atenção a detalhes e conformidade.',
    pontosFortes: ['Alta competência técnica', 'Atenção a detalhes', 'Análise crítica', 'Qualidade e precisão'],
    riscos: ['Pode ser perfeccionista', 'Demora em tomadas de decisão', 'Baixa interação social'],
  },
};

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function getStatusBadge(c: ColaboradorData) {
  const vencidos = c.capacitacoes.filter(cap => cap.prazoVencido).length;
  const pdiPendentes = c.pdi.filter(p => p.status === 'pendente').length;
  const totalPendencias = vencidos + pdiPendentes;

  if (totalPendencias > 0) {
    return <Badge variant="destructive" className="text-xs">{totalPendencias} Pendência{totalPendencias > 1 ? 's' : ''}</Badge>;
  }
  if (c.atestados.length > 0 && c.capacitacoes.every(cap => !cap.prazoVencido)) {
    return <Badge className="text-xs bg-amber-500/15 text-amber-700 border-amber-300">Atenção: Atestado recente</Badge>;
  }
  if (c.capacitacoes.length > 0 && c.capacitacoes.every(cap => cap.progresso >= 100)) {
    return <Badge className="text-xs bg-emerald-500/15 text-emerald-700 border-emerald-300">100% Concluído</Badge>;
  }
  return <Badge variant="secondary" className="text-xs">Em dia</Badge>;
}

// ─── Deep Dive Profile ────────────────────────────────────────
function PerfilDetalhado({ colaborador, mediaGeral, onBack }: { colaborador: ColaboradorData; mediaGeral: number; onBack: () => void }) {
  const discKey = colaborador.disc?.perfil_predominante || null;
  const discInfo = discKey ? DISC_DESCRICOES[discKey] : null;
  const discLabel = discKey ? (DISC_LABEL[discKey] || discKey) : null;
  const discSecLabel = colaborador.disc?.perfil_secundario ? (DISC_LABEL[colaborador.disc.perfil_secundario] || colaborador.disc.perfil_secundario) : null;

  const engajamento = colaborador.pdi.length > 0
    ? Math.round((colaborador.pdi.filter(p => p.status === 'concluido').length / colaborador.pdi.length) * 100)
    : 0;

  const engajamentoData = [
    { name: colaborador.full_name.split(' ')[0], Engajamento: engajamento, 'Média Equipe': mediaGeral },
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
            {getInitials(colaborador.full_name)}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <h2 className="text-2xl font-bold">{colaborador.full_name}</h2>
              {getStatusBadge(colaborador)}
            </div>
            <p className="text-muted-foreground">{colaborador.cargo || 'Sem cargo'} — {colaborador.setor || 'Sem setor'}</p>
            {discLabel && (
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge className={`${DISC_COLORS[discLabel] || 'bg-muted'} text-white`}>{discLabel}</Badge>
                {discSecLabel && <Badge variant="outline">{discSecLabel}</Badge>}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Banco de Horas */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" /> Banco de Horas
            <Badge variant={colaborador.saldoHoras >= 0 ? 'secondary' : 'destructive'} className="ml-auto text-xs">
              Saldo: {colaborador.saldoHoras >= 0 ? '+' : ''}{colaborador.saldoHoras.toFixed(1)}h
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {colaborador.bancoHoras.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhum registro de banco de horas.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Horas</TableHead>
                  <TableHead>Motivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {colaborador.bancoHoras.slice(0, 10).map((b, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm">{format(new Date(b.data + 'T00:00:00'), 'dd/MM/yy')}</TableCell>
                    <TableCell>
                      <Badge variant={b.tipo === 'credito' ? 'secondary' : 'outline'} className={`text-xs ${b.tipo === 'credito' ? 'bg-emerald-500/15 text-emerald-700 border-emerald-300' : 'bg-red-500/15 text-red-700 border-red-300'}`}>
                        {b.tipo === 'credito' ? 'Crédito' : 'Débito'}
                      </Badge>
                    </TableCell>
                    <TableCell className={`text-sm font-medium ${b.tipo === 'credito' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {b.tipo === 'credito' ? '+' : '-'}{b.horas.toFixed(1)}h
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground truncate max-w-[150px]">{b.motivo || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {colaborador.bancoHoras.length > 10 && (
            <p className="text-xs text-muted-foreground text-center mt-2">Mostrando 10 de {colaborador.bancoHoras.length} registros</p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Histórico de Presença (Atestados) */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <UserCheck className="h-4 w-4" /> Histórico de Atestados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {colaborador.atestados.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhum atestado registrado.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Período</TableHead>
                    <TableHead>Dias</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {colaborador.atestados.map((a, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm">
                        {format(new Date(a.data_inicio + 'T00:00:00'), 'dd/MM/yy')} — {format(new Date(a.data_fim + 'T00:00:00'), 'dd/MM/yy')}
                      </TableCell>
                      <TableCell className="text-sm">{a.dias_afastamento}d</TableCell>
                      <TableCell className="text-sm capitalize">{a.tipo}</TableCell>
                      <TableCell>
                        <Badge variant={a.status === 'aprovado' ? 'secondary' : 'outline'} className="text-xs capitalize">{a.status}</Badge>
                      </TableCell>
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
            {colaborador.capacitacoes.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma capacitação vinculada.</p>
            ) : colaborador.capacitacoes.map((cap, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{cap.titulo}</span>
                  <span className={`text-sm font-bold ${cap.prazoVencido ? 'text-destructive animate-pulse' : cap.progresso >= 100 ? 'text-emerald-600' : 'text-primary'}`}>
                    {cap.progresso}%
                  </span>
                </div>
                <Progress value={cap.progresso} className={`h-3 ${cap.prazoVencido ? '[&>div]:bg-destructive' : cap.progresso >= 100 ? '[&>div]:bg-emerald-500' : ''}`} />
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
        {discInfo && (
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Star className="h-4 w-4" /> Análise Comportamental (DISC)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/50 rounded-lg p-4 border border-border mb-4">
                <p className="text-sm leading-relaxed italic">{discInfo.descricao}</p>
                {colaborador.disc && (
                  <p className="text-xs text-muted-foreground mt-2">Score de Liderança: {colaborador.disc.leadership_score}/50 | D:{colaborador.disc.score_d} I:{colaborador.disc.score_i} S:{colaborador.disc.score_s} C:{colaborador.disc.score_c}</p>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-emerald-700 mb-2 flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5" /> Pontos Fortes</h4>
                  <ul className="space-y-1">
                    {discInfo.pontosFortes.map((p, i) => (
                      <li key={i} className="text-sm flex items-start gap-2"><span className="text-emerald-500 mt-1">●</span> {p}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-amber-700 mb-2 flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> Riscos Identificados</h4>
                  <ul className="space-y-1">
                    {discInfo.riscos.map((r, i) => (
                      <li key={i} className="text-sm flex items-start gap-2"><span className="text-amber-500 mt-1">●</span> {r}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!discInfo && (
          <Card className="lg:col-span-2">
            <CardContent className="p-6 text-center text-muted-foreground">
              <Star className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Avaliação DISC não realizada. Solicite o preenchimento na aba "DISC Liderança".</p>
            </CardContent>
          </Card>
        )}

        {/* PDI via Agenda */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" /> PDI — Tarefas da Agenda
            </CardTitle>
          </CardHeader>
          <CardContent>
            {colaborador.pdi.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma tarefa atribuída na agenda.</p>
            ) : (
              <div className="space-y-3">
                {colaborador.pdi.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border">
                    <div className={`h-2 w-2 rounded-full mt-1.5 flex-shrink-0 ${
                      item.status === 'concluido' ? 'bg-emerald-500' :
                      item.status === 'em_andamento' ? 'bg-amber-500' : 'bg-muted-foreground'
                    }`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.titulo}</p>
                      <p className="text-xs text-muted-foreground">
                        Início: {format(new Date(item.data_inicio), 'dd/MM/yy')}
                        {item.data_fim && ` — Fim: ${format(new Date(item.data_fim), 'dd/MM/yy')}`}
                      </p>
                    </div>
                    <Badge variant={item.prioridade === 'alta' || item.prioridade === 'urgente' ? 'destructive' : 'outline'} className="text-xs capitalize">
                      {item.status?.replace('_', ' ') || 'pendente'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Engajamento Chart */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Conclusão de Tarefas vs Média
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

  // Fetch all profiles
  const { data: profiles = [], isLoading: loadingProfiles } = useQuery({
    queryKey: ['gestao_talentos_profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, cargo, setor, avatar_url')
        .not('full_name', 'is', null)
        .order('full_name');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch atestados
  const { data: atestados = [] } = useQuery({
    queryKey: ['gestao_talentos_atestados'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('atestados')
        .select('funcionario_user_id, funcionario_nome, data_inicio, data_fim, tipo, dias_afastamento, status')
        .order('data_inicio', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch LMS inscricoes + treinamentos for capacitação
  const { data: inscricoes = [] } = useQuery({
    queryKey: ['gestao_talentos_lms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lms_inscricoes')
        .select('usuario_id, usuario_nome, status, nota, data_conclusao, material_acessado_em, treinamento_id');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: treinamentos = [] } = useQuery({
    queryKey: ['gestao_talentos_treinamentos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lms_treinamentos')
        .select('id, titulo, data_limite, status, nota_minima_aprovacao');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch agenda items + destinatarios for PDI
  const { data: agendaItems = [] } = useQuery({
    queryKey: ['gestao_talentos_agenda'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agenda_items')
        .select('id, titulo, data_inicio, data_fim, status, prioridade, tipo')
        .order('data_inicio', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: agendaDest = [] } = useQuery({
    queryKey: ['gestao_talentos_agenda_dest'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agenda_destinatarios')
        .select('agenda_item_id, usuario_id');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch DISC results
  const { data: discResults = [] } = useQuery({
    queryKey: ['gestao_talentos_disc'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('disc_results')
        .select('nome_completo, setor, perfil_predominante, perfil_secundario, score_d, score_i, score_s, score_c, leadership_score, created_by')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch Banco de Horas
  const { data: bancoHoras = [] } = useQuery({
    queryKey: ['gestao_talentos_banco_horas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('banco_horas')
        .select('funcionario_user_id, data, tipo, horas, motivo')
        .order('data', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Build treinamento map
  const treinamentoMap = useMemo(() => {
    const m = new Map<string, typeof treinamentos[0]>();
    treinamentos.forEach(t => m.set(t.id, t));
    return m;
  }, [treinamentos]);

  // Build agenda per user
  const agendaPerUser = useMemo(() => {
    const m = new Map<string, typeof agendaItems>();
    agendaDest.forEach(d => {
      const items = m.get(d.usuario_id) || [];
      const item = agendaItems.find(a => a.id === d.agenda_item_id);
      if (item) items.push(item);
      m.set(d.usuario_id, items);
    });
    return m;
  }, [agendaItems, agendaDest]);

  // Build colaboradores
  const colaboradores = useMemo<ColaboradorData[]>(() => {
    return profiles.map(p => {
      const userAtestados = atestados
        .filter(a => a.funcionario_user_id === p.user_id)
        .map(a => ({
          data_inicio: a.data_inicio,
          data_fim: a.data_fim,
          tipo: a.tipo,
          dias_afastamento: a.dias_afastamento,
          status: a.status,
        }));

      const userInscricoes = inscricoes.filter(i => i.usuario_id === p.user_id);
      const userCapacitacoes = userInscricoes.map(insc => {
        const t = treinamentoMap.get(insc.treinamento_id);
        const concluido = insc.status === 'aprovado' || insc.status === 'concluido';
        const materialAcessado = !!insc.material_acessado_em;
        let progresso = 0;
        if (concluido) progresso = 100;
        else if (materialAcessado) progresso = 50;

        const prazoVencido = t?.data_limite ? isPast(new Date(t.data_limite)) && !concluido : false;
        return {
          titulo: t?.titulo || 'Treinamento',
          progresso,
          prazoVencido,
          data_limite: t?.data_limite || null,
          status: insc.status,
        };
      });

      const userPdi = (agendaPerUser.get(p.user_id) || []).map(a => ({
        titulo: a.titulo,
        data_inicio: a.data_inicio,
        data_fim: a.data_fim,
        status: a.status || 'pendente',
        prioridade: a.prioridade,
      }));

      // Match DISC by name or created_by
      const discMatch = discResults.find(d =>
        d.created_by === p.user_id ||
        d.nome_completo?.toUpperCase() === p.full_name?.toUpperCase()
      );

      // Banco de Horas
      const userBH = bancoHoras.filter(b => b.funcionario_user_id === p.user_id);
      const userBancoHoras = userBH.map(b => ({
        data: b.data,
        tipo: b.tipo,
        horas: Number(b.horas),
        motivo: b.motivo,
      }));
      const saldoHoras = userBH.reduce((sum, b) => {
        return sum + (b.tipo === 'credito' ? Number(b.horas) : -Number(b.horas));
      }, 0);

      return {
        user_id: p.user_id,
        full_name: p.full_name,
        cargo: p.cargo,
        setor: p.setor,
        avatar_url: p.avatar_url,
        atestados: userAtestados,
        capacitacoes: userCapacitacoes,
        pdi: userPdi,
        bancoHoras: userBancoHoras,
        saldoHoras: Math.round(saldoHoras * 100) / 100,
        disc: discMatch ? {
          perfil_predominante: discMatch.perfil_predominante,
          perfil_secundario: discMatch.perfil_secundario,
          score_d: discMatch.score_d,
          score_i: discMatch.score_i,
          score_s: discMatch.score_s,
          score_c: discMatch.score_c,
          leadership_score: discMatch.leadership_score,
        } : null,
      };
    });
  }, [profiles, atestados, inscricoes, treinamentoMap, agendaPerUser, discResults, bancoHoras]);

  // Média geral de conclusão de tarefas
  const mediaGeral = useMemo(() => {
    const totals = colaboradores.filter(c => c.pdi.length > 0);
    if (totals.length === 0) return 0;
    const avg = totals.reduce((sum, c) => {
      return sum + (c.pdi.filter(p => p.status === 'concluido').length / c.pdi.length) * 100;
    }, 0) / totals.length;
    return Math.round(avg);
  }, [colaboradores]);

  const filtered = useMemo(() => {
    if (!search) return colaboradores;
    const term = search.toLowerCase();
    return colaboradores.filter(c =>
      c.full_name.toLowerCase().includes(term) ||
      (c.cargo || '').toLowerCase().includes(term) ||
      (c.setor || '').toLowerCase().includes(term)
    );
  }, [search, colaboradores]);

  const selected = colaboradores.find(c => c.user_id === selectedId);

  if (selected) {
    return <PerfilDetalhado colaborador={selected} mediaGeral={mediaGeral} onBack={() => setSelectedId(null)} />;
  }

  // Stats
  const totalPendencias = colaboradores.reduce((sum, c) => {
    return sum + c.capacitacoes.filter(cap => cap.prazoVencido).length + c.pdi.filter(p => p.status === 'pendente').length;
  }, 0);

  if (loadingProfiles) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Carregando colaboradores...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="h-8 w-8 text-primary opacity-80" />
            <div>
              <p className="text-2xl font-bold">{colaboradores.length}</p>
              <p className="text-sm text-muted-foreground">Colaboradores</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-primary opacity-80" />
            <div>
              <p className="text-2xl font-bold">{colaboradores.reduce((s, c) => s + c.capacitacoes.length, 0)}</p>
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
                {colaboradores.filter(c => c.disc !== null).length}
              </p>
              <p className="text-sm text-muted-foreground">Avaliações DISC</p>
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
        {filtered.map(c => {
          const discLabel = c.disc?.perfil_predominante ? (DISC_LABEL[c.disc.perfil_predominante] || c.disc.perfil_predominante) : null;
          return (
            <Card
              key={c.user_id}
              className="cursor-pointer hover:shadow-lg hover:border-primary/30 transition-all group"
              onClick={() => setSelectedId(c.user_id)}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                    {getInitials(c.full_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{c.full_name}</h3>
                    <p className="text-sm text-muted-foreground truncate">{c.cargo || 'Sem cargo'}</p>
                    <p className="text-xs text-muted-foreground">{c.setor || 'Sem setor'}</p>
                    <div className="mt-2">{getStatusBadge(c)}</div>
                  </div>
                </div>

                {discLabel && (
                  <div className="mt-3">
                    <Badge className={`${DISC_COLORS[discLabel] || 'bg-muted'} text-white text-[10px] px-1.5 py-0`}>
                      {discLabel.split('(')[1]?.replace(')', '') || discLabel}
                    </Badge>
                  </div>
                )}

                <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>{c.atestados.length} atestado{c.atestados.length !== 1 ? 's' : ''}</span>
                  <span>•</span>
                  <span>{c.capacitacoes.length} curso{c.capacitacoes.length !== 1 ? 's' : ''}</span>
                  <span>•</span>
                  <span>{c.pdi.length} tarefa{c.pdi.length !== 1 ? 's' : ''}</span>
                  {c.bancoHoras.length > 0 && (
                    <>
                      <span>•</span>
                      <span className={c.saldoHoras >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                        BH: {c.saldoHoras >= 0 ? '+' : ''}{c.saldoHoras.toFixed(1)}h
                      </span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>Nenhum colaborador encontrado.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
