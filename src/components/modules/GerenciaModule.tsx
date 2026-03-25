import { useState, useEffect, useMemo } from 'react';
import { PlanoDesenvolvimentoSection } from '@/components/gerencia/PlanoDesenvolvimentoSection';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Building2, AlertTriangle, Clock, CheckCircle2, Plus,
  Filter, Users, TrendingUp, Search, History, CalendarClock, FileText, Brain, ReceiptText, GitBranch,
  Stethoscope, Shield, ClipboardCheck, BedDouble, GraduationCap, Wrench,
  ShieldAlert, HardHat, Skull, UtensilsCrossed, Shirt, Activity, BarChart3
} from 'lucide-react';
import { DISCFormModule } from '@/components/disc/DISCFormModule';
import { LancamentoNotas } from '@/components/gerencia/LancamentoNotas';
import { GestaoTalentos } from '@/components/gerencia/GestaoTalentos';
import { DashboardFaturamento } from '@/components/faturamento/DashboardFaturamento';
import { FluxogramaSetores } from '@/components/admin/FluxogramaSetores';
import { ChamadosDashboard } from '@/components/chamados/ChamadosDashboard';
import { IndicadoresUPA } from '@/components/indicadores/IndicadoresUPA';
import { IndicadoresNSP } from '@/components/indicadores/IndicadoresNSP';
import { DashboardConformidade } from '@/components/qualidade/DashboardConformidade';
import { NirDashboardModule } from '@/components/modules/NirDashboardModule';
import DashboardIndicadores from '@/components/lms/DashboardIndicadores';
import { SegurancaPatrimonialModule } from '@/components/modules/SegurancaPatrimonialModule';
import { SegurancaTrabalhoModule } from '@/components/modules/SegurancaTrabalhoModule';
import { DashboardIAIncidentes } from '@/components/gestao-incidentes/DashboardIAIncidentes';
import { RoupariaModule } from '@/components/modules/RoupariaModule';
import { RestauranteModule } from '@/components/modules/RestauranteModule';
import { DashboardBIHospitalar } from '@/components/bi/DashboardBIHospitalar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExportDropdown } from '@/components/ui/export-dropdown';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import { useLogAccess } from '@/hooks/useLogAccess';
import { useSetoresNomes } from '@/hooks/useSetores';
import { LoadingState } from '@/components/ui/loading-state';
import { format, isPast, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { exportToCSV, exportToPDF } from '@/lib/export-utils';
import * as XLSX from 'xlsx';

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }> = {
  concluido: { label: 'Concluído', variant: 'default', className: 'bg-emerald-500/15 text-emerald-700 border-emerald-300' },
  em_andamento: { label: 'Em andamento', variant: 'secondary', className: 'bg-amber-500/15 text-amber-700 border-amber-300' },
  pendente: { label: 'Pendente', variant: 'outline', className: 'bg-muted text-muted-foreground' },
  atrasado: { label: 'Atrasado', variant: 'destructive', className: '' },
};

const PRIORIDADE_CONFIG: Record<string, { label: string; className: string }> = {
  critica: { label: 'Crítica', className: 'bg-red-500/15 text-red-700 border-red-300' },
  alta: { label: 'Alta', className: 'bg-orange-500/15 text-orange-700 border-orange-300' },
  media: { label: 'Média', className: 'bg-yellow-500/15 text-yellow-700 border-yellow-300' },
  baixa: { label: 'Baixa', className: 'bg-blue-500/15 text-blue-700 border-blue-300' },
};

interface PlanoAcao {
  id: string;
  titulo: string;
  descricao: string | null;
  setor: string;
  responsavel_id: string | null;
  responsavel_nome: string;
  status: string;
  prioridade: string;
  prazo: string;
  data_conclusao: string | null;
  observacoes: string | null;
  ultima_atualizacao_por: string | null;
  ultima_atualizacao_em: string | null;
  created_at: string;
}

interface HistoricoItem {
  id: string;
  plano_id: string;
  acao: string;
  detalhes: string | null;
  executado_por_nome: string;
  created_at: string;
}

export function GerenciaModule() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { role, userId, isLoading: roleLoading } = useUserRole();
  const { logAction } = useLogAccess();
  const { data: SETORES = [] } = useSetoresNomes();
  const [filterSetor, setFilterSetor] = useState('todos');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedPlanoId, setSelectedPlanoId] = useState<string | null>(null);
  const [editingPlano, setEditingPlano] = useState<PlanoAcao | null>(null);
  const [userName, setUserName] = useState('');

  const [formData, setFormData] = useState({
    titulo: '', descricao: '', setor: '', responsavel_nome: '',
    prioridade: 'media', prazo: '', observacoes: '',
  });

  useEffect(() => { logAction('acesso', 'gerencia'); }, [logAction]);

  useEffect(() => {
    if (!userId) return;
    supabase.from('profiles').select('full_name').eq('user_id', userId).single()
      .then(({ data }) => { if (data) setUserName(data.full_name); });
  }, [userId]);

  // Query planos de ação
  const { data: planos = [], isLoading } = useQuery({
    queryKey: ['gerencia_planos_acao'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gerencia_planos_acao')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as PlanoAcao[];
    },
  });

  // Query inconsistências: profissionais escalados com atestado no mesmo período
  const { data: inconsistencias = [] } = useQuery({
    queryKey: ['gerencia_inconsistencias_escala_atestado'],
    queryFn: async () => {
      // Buscar atestados ativos (pendente ou aprovado)
      const { data: atestados, error: errAt } = await supabase
        .from('atestados')
        .select('funcionario_nome, data_inicio, data_fim, tipo, status')
        .in('status', ['pendente', 'aprovado']);
      if (errAt) throw errAt;
      if (!atestados?.length) return [];

      // Buscar escalas médicas futuras/atuais
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data: escalasMed, error: errEm } = await supabase
        .from('escalas_medicos')
        .select('profissional_id, data_plantao, setor')
        .gte('data_plantao', today);
      if (errEm) throw errEm;

      // Buscar escalas enfermagem futuras/atuais
      const { data: escalasEnf, error: errEe } = await supabase
        .from('enfermagem_escalas')
        .select('profissional_nome, data_plantao, setor')
        .gte('data_plantao', today);
      if (errEe) throw errEe;

      // Buscar nomes dos médicos escalados
      const profIds = [...new Set((escalasMed || []).map(e => e.profissional_id))];
      let profMap = new Map<string, string>();
      if (profIds.length) {
        const { data: profs } = await supabase
          .from('profissionais_saude')
          .select('id, nome')
          .in('id', profIds);
        (profs || []).forEach(p => profMap.set(p.id, p.nome));
      }

      // Cruzar escalas com atestados
      type Inconsistencia = { nome: string; data_plantao: string; setor: string; atestado_inicio: string; atestado_fim: string; tipo_atestado: string };
      const results: Inconsistencia[] = [];

      (escalasMed || []).forEach(e => {
        const nome = profMap.get(e.profissional_id)?.toUpperCase() || '';
        if (!nome) return;
        atestados.forEach(a => {
          if (a.funcionario_nome.toUpperCase() === nome &&
              e.data_plantao >= a.data_inicio && e.data_plantao <= a.data_fim) {
            results.push({ nome: a.funcionario_nome, data_plantao: e.data_plantao, setor: e.setor, atestado_inicio: a.data_inicio, atestado_fim: a.data_fim, tipo_atestado: a.tipo });
          }
        });
      });

      (escalasEnf || []).forEach(e => {
        const nome = e.profissional_nome.toUpperCase();
        atestados.forEach(a => {
          if (a.funcionario_nome.toUpperCase() === nome &&
              e.data_plantao >= a.data_inicio && e.data_plantao <= a.data_fim) {
            results.push({ nome: a.funcionario_nome, data_plantao: e.data_plantao, setor: e.setor, atestado_inicio: a.data_inicio, atestado_fim: a.data_fim, tipo_atestado: a.tipo });
          }
        });
      });

      return results;
    },
    refetchInterval: 60000, // Atualiza a cada 1 min
  });

  // Query histórico for selected plano
  const { data: historico = [] } = useQuery({
    queryKey: ['gerencia_planos_historico', selectedPlanoId],
    queryFn: async () => {
      if (!selectedPlanoId) return [];
      const { data, error } = await supabase
        .from('gerencia_planos_historico')
        .select('*')
        .eq('plano_id', selectedPlanoId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as HistoricoItem[];
    },
    enabled: !!selectedPlanoId,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from('gerencia_planos_acao').insert({
        titulo: data.titulo,
        descricao: data.descricao || null,
        setor: data.setor,
        responsavel_nome: data.responsavel_nome,
        prioridade: data.prioridade,
        prazo: new Date(data.prazo).toISOString(),
        observacoes: data.observacoes || null,
        created_by: userId,
        ultima_atualizacao_por: userName,
        ultima_atualizacao_em: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gerencia_planos_acao'] });
      toast({ title: 'Sucesso', description: 'Plano de ação criado!' });
      setDialogOpen(false);
      resetForm();
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updateData: any = {
        status,
        ultima_atualizacao_por: userName,
        ultima_atualizacao_em: new Date().toISOString(),
      };
      if (status === 'concluido') updateData.data_conclusao = new Date().toISOString();

      const { error } = await supabase.from('gerencia_planos_acao').update(updateData).eq('id', id);
      if (error) throw error;

      // Log history
      await supabase.from('gerencia_planos_historico').insert({
        plano_id: id,
        acao: `Status alterado para: ${STATUS_CONFIG[status]?.label || status}`,
        executado_por: userId,
        executado_por_nome: userName,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gerencia_planos_acao'] });
      toast({ title: 'Status atualizado' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('gerencia_planos_acao').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gerencia_planos_acao'] });
      toast({ title: 'Plano removido' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const resetForm = () => {
    setFormData({ titulo: '', descricao: '', setor: SETORES[0] || '', responsavel_nome: '', prioridade: 'media', prazo: '', observacoes: '' });
    setEditingPlano(null);
  };

  // Derived data
  const enrichedPlanos = useMemo(() => {
    return planos.map(p => {
      const isOverdue = p.status !== 'concluido' && isPast(new Date(p.prazo));
      const effectiveStatus = isOverdue ? 'atrasado' : p.status;
      const daysRemaining = differenceInDays(new Date(p.prazo), new Date());
      return { ...p, effectiveStatus, isOverdue, daysRemaining };
    });
  }, [planos]);

  const filteredPlanos = useMemo(() => {
    return enrichedPlanos.filter(p => {
      if (filterSetor !== 'todos' && p.setor !== filterSetor) return false;
      if (filterStatus !== 'todos' && p.effectiveStatus !== filterStatus) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return p.titulo.toLowerCase().includes(term) ||
          p.responsavel_nome.toLowerCase().includes(term) ||
          p.setor.toLowerCase().includes(term);
      }
      return true;
    });
  }, [enrichedPlanos, filterSetor, filterStatus, searchTerm]);

  // Stats
  const stats = useMemo(() => {
    const total = enrichedPlanos.length;
    const atrasados = enrichedPlanos.filter(p => p.isOverdue).length;
    const concluidos = enrichedPlanos.filter(p => p.status === 'concluido').length;
    const emAndamento = enrichedPlanos.filter(p => p.status === 'em_andamento').length;
    const setoresComAtraso = new Set(enrichedPlanos.filter(p => p.isOverdue).map(p => p.setor)).size;
    return { total, atrasados, concluidos, emAndamento, setoresComAtraso };
  }, [enrichedPlanos]);

  // Resumo por setor
  const resumoSetores = useMemo(() => {
    const map = new Map<string, { total: number; atrasados: number; concluidos: number }>();
    enrichedPlanos.forEach(p => {
      const entry = map.get(p.setor) || { total: 0, atrasados: 0, concluidos: 0 };
      entry.total++;
      if (p.isOverdue) entry.atrasados++;
      if (p.status === 'concluido') entry.concluidos++;
      map.set(p.setor, entry);
    });
    return Array.from(map.entries()).sort((a, b) => b[1].atrasados - a[1].atrasados);
  }, [enrichedPlanos]);

  // Export handlers
  const handleExportExcel = () => {
    const rows = filteredPlanos.map(p => ({
      Título: p.titulo,
      Setor: p.setor,
      Responsável: p.responsavel_nome,
      Status: STATUS_CONFIG[p.effectiveStatus]?.label || p.effectiveStatus,
      Prioridade: PRIORIDADE_CONFIG[p.prioridade]?.label || p.prioridade,
      Prazo: format(new Date(p.prazo), 'dd/MM/yyyy'),
      'Dias Restantes': p.daysRemaining,
      'Última Atualização': p.ultima_atualizacao_por || '-',
      'Atualizado em': p.ultima_atualizacao_em ? format(new Date(p.ultima_atualizacao_em), 'dd/MM/yyyy HH:mm') : '-',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Eficiência Global');
    XLSX.writeFile(wb, `relatorio_eficiencia_global_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast({ title: 'Excel exportado!' });
  };

  const handleExportPDF = () => {
    const headers = ['Título', 'Setor', 'Responsável', 'Status', 'Prazo', 'Prioridade'];
    const rows = filteredPlanos.map(p => [
      p.titulo,
      p.setor,
      p.responsavel_nome,
      STATUS_CONFIG[p.effectiveStatus]?.label || p.effectiveStatus,
      format(new Date(p.prazo), 'dd/MM/yyyy'),
      PRIORIDADE_CONFIG[p.prioridade]?.label || p.prioridade,
    ]);
    exportToPDF({
      title: 'Relatório de Eficiência Global - Gerência',
      headers, rows: rows as any,
      fileName: 'relatorio_eficiencia_global',
      orientation: 'landscape',
    });
    toast({ title: 'PDF exportado!' });
  };

  const handleSubmit = () => {
    if (!formData.titulo || !formData.responsavel_nome || !formData.prazo) {
      toast({ title: 'Erro', description: 'Preencha todos os campos obrigatórios.', variant: 'destructive' });
      return;
    }
    createMutation.mutate(formData);
  };

  if (roleLoading) return <LoadingState message="Carregando módulo de gerência..." />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Central de Gerência</h1>
            <p className="text-sm text-muted-foreground">Controle total multi-setorial da empresa</p>
          </div>
        </div>
        <div className="flex gap-2">
          <ExportDropdown
            onExportExcel={handleExportExcel}
            onExportPDF={handleExportPDF}
            label="Relatório de Eficiência"
          />
          <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Plano de Ação
          </Button>
        </div>
      </div>

      {/* Alert Card - Atrasados */}
      {stats.atrasados > 0 && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <p className="text-lg font-bold text-destructive">{stats.atrasados} Ações Atrasadas na Empresa</p>
              <p className="text-sm text-muted-foreground">
                Distribuídas em {stats.setoresComAtraso} setor{stats.setoresComAtraso > 1 ? 'es' : ''} — ação imediata necessária
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alert Crítico - Inconsistência Escala x Atestado */}
      {inconsistencias.length > 0 && (
        <Card className="border-destructive bg-destructive/10 ring-2 ring-destructive/30">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-destructive/20 animate-pulse">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-lg font-bold text-destructive">{inconsistencias.length} Inconsistência{inconsistencias.length > 1 ? 's' : ''} Crítica{inconsistencias.length > 1 ? 's' : ''} Detectada{inconsistencias.length > 1 ? 's' : ''}</p>
                <p className="text-sm text-destructive/80">Profissionais escalados com atestado registrado no mesmo período</p>
              </div>
            </div>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {inconsistencias.map((inc, idx) => (
                <div key={idx} className="flex flex-wrap items-center gap-2 text-sm p-2 rounded-md bg-destructive/5 border border-destructive/20">
                  <Badge variant="destructive" className="text-xs">CONFLITO</Badge>
                  <span className="font-semibold">{inc.nome}</span>
                  <span className="text-muted-foreground">escalado em</span>
                  <span className="font-medium">{format(new Date(inc.data_plantao + 'T00:00:00'), 'dd/MM/yyyy')}</span>
                  <span className="text-muted-foreground">({inc.setor})</span>
                  <span className="text-destructive font-medium">— Atestado: {format(new Date(inc.atestado_inicio + 'T00:00:00'), 'dd/MM')} a {format(new Date(inc.atestado_fim + 'T00:00:00'), 'dd/MM')}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-primary opacity-80" />
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total de Ações</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-8 w-8 text-amber-500 opacity-80" />
            <div>
              <p className="text-2xl font-bold">{stats.emAndamento}</p>
              <p className="text-sm text-muted-foreground">Em Andamento</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-destructive/30">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-destructive opacity-80" />
            <div>
              <p className="text-2xl font-bold text-destructive">{stats.atrasados}</p>
              <p className="text-sm text-muted-foreground">Atrasadas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-emerald-500 opacity-80" />
            <div>
              <p className="text-2xl font-bold text-emerald-600">{stats.concluidos}</p>
              <p className="text-sm text-muted-foreground">Concluídos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs: Planos de Ação / Visão por Setor */}
      <Tabs defaultValue="bi">
        <TabsList>
          <TabsTrigger value="bi" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Business Intelligence
          </TabsTrigger>
          <TabsTrigger value="planos" className="gap-2">
            <CalendarClock className="h-4 w-4" />
            Planos de Ação
          </TabsTrigger>
          <TabsTrigger value="setores" className="gap-2">
            <Building2 className="h-4 w-4" />
            Visão por Setor
          </TabsTrigger>
          <TabsTrigger value="notas-fiscais" className="gap-2">
            <FileText className="h-4 w-4" />
            Lançamento de Notas
          </TabsTrigger>
          <TabsTrigger value="disc" className="gap-2">
            <Brain className="h-4 w-4" />
            DISC Liderança
          </TabsTrigger>
          <TabsTrigger value="talentos" className="gap-2">
            <Users className="h-4 w-4" />
            Gestão de Talentos
          </TabsTrigger>
        </TabsList>

        {/* -- Tab: BI Hospitalar -- */}
        <TabsContent value="bi" className="mt-4">
          <DashboardBIHospitalar periodoMeses={3} />
        </TabsContent>

        {/* -- Tab: Planos de Ação -- */}
        <TabsContent value="planos" className="mt-4 space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4 flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[200px]">
                <Label className="text-xs text-muted-foreground">Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Título, responsável ou setor..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="w-[180px]">
                <Label className="text-xs text-muted-foreground">Setor</Label>
                <Select value={filterSetor} onValueChange={setFilterSetor}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os setores</SelectItem>
                    {SETORES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-[160px]">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="em_andamento">Em andamento</SelectItem>
                    <SelectItem value="atrasado">Atrasado</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          {isLoading ? (
            <LoadingState message="Carregando planos de ação..." />
          ) : filteredPlanos.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">Nenhum plano de ação encontrado.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-primary/5">
                      <TableHead className="font-semibold">Título</TableHead>
                      <TableHead className="font-semibold">Setor</TableHead>
                      <TableHead className="font-semibold">Responsável</TableHead>
                      <TableHead className="font-semibold">Prazo</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Prioridade</TableHead>
                      <TableHead className="font-semibold">Última Atualização</TableHead>
                      <TableHead className="font-semibold text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPlanos.map((plano) => {
                      const sc = STATUS_CONFIG[plano.effectiveStatus] || STATUS_CONFIG.pendente;
                      const pc = PRIORIDADE_CONFIG[plano.prioridade] || PRIORIDADE_CONFIG.media;
                      return (
                        <TableRow key={plano.id} className={plano.isOverdue ? 'bg-destructive/5' : ''}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {plano.isOverdue && <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />}
                              <span className="font-medium">{plano.titulo}</span>
                            </div>
                          </TableCell>
                          <TableCell>{plano.setor}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <Users className="h-3.5 w-3.5 text-muted-foreground" />
                              {plano.responsavel_nome}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={plano.isOverdue ? 'text-destructive font-medium' : ''}>
                              {format(new Date(plano.prazo), 'dd/MM/yyyy')}
                            </span>
                            {plano.daysRemaining <= 3 && plano.daysRemaining >= 0 && !plano.isOverdue && (
                              <span className="text-xs text-amber-600 ml-1">({plano.daysRemaining}d)</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={sc.className} variant={sc.variant}>{sc.label}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={pc.className} variant="outline">{pc.label}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-xs text-muted-foreground">
                              {plano.ultima_atualizacao_por ? (
                                <>
                                  <p>{plano.ultima_atualizacao_por}</p>
                                  {plano.ultima_atualizacao_em && (
                                    <p>{format(new Date(plano.ultima_atualizacao_em), "dd/MM HH:mm")}</p>
                                  )}
                                </>
                              ) : '-'}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              {plano.effectiveStatus !== 'concluido' && (
                                <Select
                                  value={plano.status}
                                  onValueChange={(v) => updateStatusMutation.mutate({ id: plano.id, status: v })}
                                >
                                  <SelectTrigger className="h-8 w-[130px] text-xs">
                                    <SelectValue placeholder="Alterar" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pendente">Pendente</SelectItem>
                                    <SelectItem value="em_andamento">Em andamento</SelectItem>
                                    <SelectItem value="concluido">Concluído</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => { setSelectedPlanoId(plano.id); setHistoryDialogOpen(true); }}
                              >
                                <History className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* -- Tab: Visão por Setor -- */}
        <TabsContent value="setores" className="mt-4">
          <Tabs defaultValue="geral">
            <TabsList className="flex flex-wrap h-auto gap-1">
              <TabsTrigger value="geral" className="gap-1 text-xs sm:text-sm">
                <Building2 className="h-4 w-4" />
                Geral
              </TabsTrigger>
              <TabsTrigger value="faturamento" className="gap-1 text-xs sm:text-sm">
                <ReceiptText className="h-4 w-4" />
                Faturamento
              </TabsTrigger>
              <TabsTrigger value="indicadores-upa" className="gap-1 text-xs sm:text-sm">
                <Stethoscope className="h-4 w-4" />
                Indicadores UPA
              </TabsTrigger>
              <TabsTrigger value="indicadores-nsp" className="gap-1 text-xs sm:text-sm">
                <Shield className="h-4 w-4" />
                Indicadores NSP
              </TabsTrigger>
              <TabsTrigger value="qualidade" className="gap-1 text-xs sm:text-sm">
                <ClipboardCheck className="h-4 w-4" />
                Qualidade
              </TabsTrigger>
              <TabsTrigger value="nir" className="gap-1 text-xs sm:text-sm">
                <BedDouble className="h-4 w-4" />
                NIR
              </TabsTrigger>
              <TabsTrigger value="capacitacao" className="gap-1 text-xs sm:text-sm">
                <GraduationCap className="h-4 w-4" />
                Capacitação
              </TabsTrigger>
              <TabsTrigger value="seg-patrimonial" className="gap-1 text-xs sm:text-sm">
                <ShieldAlert className="h-4 w-4" />
                Seg. Patrimonial
              </TabsTrigger>
              <TabsTrigger value="seg-trabalho" className="gap-1 text-xs sm:text-sm">
                <HardHat className="h-4 w-4" />
                Seg. Trabalho
              </TabsTrigger>
              <TabsTrigger value="incidentes" className="gap-1 text-xs sm:text-sm">
                <Skull className="h-4 w-4" />
                Incidentes
              </TabsTrigger>
              <TabsTrigger value="rouparia" className="gap-1 text-xs sm:text-sm">
                <Shirt className="h-4 w-4" />
                Rouparia
              </TabsTrigger>
              <TabsTrigger value="restaurante" className="gap-1 text-xs sm:text-sm">
                <UtensilsCrossed className="h-4 w-4" />
                Restaurante
              </TabsTrigger>
              <TabsTrigger value="fluxograma" className="gap-1 text-xs sm:text-sm">
                <GitBranch className="h-4 w-4" />
                Fluxograma
              </TabsTrigger>
            </TabsList>

            <TabsContent value="geral">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {resumoSetores.map(([setor, data]) => (
                  <Card
                    key={setor}
                    className={`cursor-pointer hover:shadow-md transition-shadow ${data.atrasados > 0 ? 'border-destructive/40' : ''}`}
                    onClick={() => { setFilterSetor(setor); }}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold flex items-center justify-between">
                        {setor}
                        {data.atrasados > 0 && (
                          <Badge variant="destructive" className="text-xs">{data.atrasados} atrasado{data.atrasados > 1 ? 's' : ''}</Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex gap-4 text-sm">
                        <span className="text-muted-foreground">Total: <strong>{data.total}</strong></span>
                        <span className="text-emerald-600">Concluídos: <strong>{data.concluidos}</strong></span>
                      </div>
                      <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${data.total > 0 ? (data.concluidos / data.total) * 100 : 0}%` }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {resumoSetores.length === 0 && (
                  <Card className="col-span-full">
                    <CardContent className="p-8 text-center text-muted-foreground">
                      Nenhum plano de ação cadastrado ainda.
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>


            <TabsContent value="faturamento">
              <DashboardFaturamento />
            </TabsContent>

            <TabsContent value="indicadores-upa">
              <IndicadoresUPA />
            </TabsContent>

            <TabsContent value="indicadores-nsp">
              <IndicadoresNSP />
            </TabsContent>

            <TabsContent value="qualidade">
              <DashboardConformidade />
            </TabsContent>

            <TabsContent value="nir">
              <NirDashboardModule />
            </TabsContent>

            <TabsContent value="capacitacao">
              <DashboardIndicadores />
            </TabsContent>

            <TabsContent value="seg-patrimonial">
              <SegurancaPatrimonialModule />
            </TabsContent>

            <TabsContent value="seg-trabalho">
              <SegurancaTrabalhoModule />
            </TabsContent>

            <TabsContent value="incidentes">
              <DashboardIAIncidentes />
            </TabsContent>

            <TabsContent value="rouparia">
              <RoupariaModule />
            </TabsContent>

            <TabsContent value="restaurante">
              <RestauranteModule />
            </TabsContent>

            <TabsContent value="fluxograma">
              <FluxogramaSetores />
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* -- Tab: Lançamento de Notas -- */}
        <TabsContent value="notas-fiscais" className="mt-4">
          <LancamentoNotas />
        </TabsContent>

        {/* -- Tab: DISC Liderança -- */}
        <TabsContent value="disc" className="mt-4">
          <DISCFormModule />
        </TabsContent>

        {/* -- Tab: Gestão de Talentos -- */}
        <TabsContent value="talentos" className="mt-4">
          <GestaoTalentos />
        </TabsContent>

      </Tabs>

      {/* New Plan Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Plano de Ação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título *</Label>
              <Input value={formData.titulo} onChange={(e) => setFormData({ ...formData, titulo: e.target.value })} placeholder="Ex: Revisão de procedimentos de segurança" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Setor *</Label>
                <Select value={formData.setor} onValueChange={(v) => setFormData({ ...formData, setor: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SETORES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Prioridade</Label>
                <Select value={formData.prioridade} onValueChange={(v) => setFormData({ ...formData, prioridade: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="critica">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Responsável *</Label>
                <Input value={formData.responsavel_nome} onChange={(e) => setFormData({ ...formData, responsavel_nome: e.target.value })} placeholder="Nome do responsável" />
              </div>
              <div>
                <Label>Prazo *</Label>
                <Input type="date" value={formData.prazo} onChange={(e) => setFormData({ ...formData, prazo: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={formData.descricao} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} rows={2} placeholder="Detalhes do plano de ação..." />
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea value={formData.observacoes} onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Salvando...' : 'Criar Plano'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Histórico de Interações
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {historico.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma interação registrada.</p>
            ) : (
              historico.map((h) => (
                <div key={h.id} className="flex gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{h.executado_por_nome}</p>
                    <p className="text-sm">{h.acao}</p>
                    {h.detalhes && <p className="text-xs text-muted-foreground mt-0.5">{h.detalhes}</p>}
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(h.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default GerenciaModule;
