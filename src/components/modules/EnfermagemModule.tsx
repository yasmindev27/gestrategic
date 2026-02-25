import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stethoscope, Calendar, ArrowRightLeft, History, CheckCircle, Users, Bug, BarChart3, FlaskConical, Pill, Bell, Microscope, HeartPulse, Activity, Upload } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { useLogAccess } from '@/hooks/useLogAccess';
import { useRealtimeSync, REALTIME_PRESETS } from '@/hooks/useRealtimeSync';
import { LoadingState } from '@/components/ui/loading-state';
import {
  CalendarioEscalas,
  TrocasDisponiveis,
  MinhasEscalas,
  AprovacaoTrocas,
  NovaEscalaDialog,
  HistoricoTrocas,
} from '@/components/enfermagem';
import {
  VigilanciaIRASComponent,
  IndicadoresInfeccao,
  CulturasMicrobiologicas,
  ControleAntimicrobianos,
  NotificacoesEpidemiologicas,
  PortaECG,
} from '@/components/sciras';
import { IndicadoresUPA } from '@/components/indicadores';
import { useTrocasDisponiveis, useTrocasPendentes, useMinhasEscalas } from '@/hooks/useEnfermagem';
import type { Escala } from '@/components/enfermagem/types';
import ImportEquipeDialog from '@/components/modules/equipe/ImportEquipeDialog';

export default function EnfermagemModule() {
  const navigate = useNavigate();
  const { role, isLoading: roleLoading, userId } = useUserRole();
  const { logAction } = useLogAccess();
  useRealtimeSync(REALTIME_PRESETS.enfermagem);
  const [session, setSession] = useState<{ user: { id: string } } | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [setores, setSetores] = useState<string[]>([]);
  const [selectedSetor, setSelectedSetor] = useState<string>('todos');
  const [novaEscalaOpen, setNovaEscalaOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [mainTab, setMainTab] = useState('operacional');
  const [operacionalTab, setOperacionalTab] = useState('meus-plantoes');
  const [scirasTab, setScirasTab] = useState('vigilancia');

  useEffect(() => {
    logAction('acesso', 'enfermagem');
  }, [logAction]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) navigate('/auth');
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) navigate('/auth');
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    async function loadUserName() {
      if (!userId) return;
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', userId)
        .single();
      if (data) setUserName(data.full_name);
    }
    loadUserName();
  }, [userId]);

  useEffect(() => {
    async function loadSetores() {
      const { data } = await supabase
        .from('setores')
        .select('nome')
        .eq('ativo', true)
        .order('nome');
      if (data) setSetores(data.map(s => s.nome));
    }
    loadSetores();
  }, []);

  const { data: trocasDisponiveis = [] } = useTrocasDisponiveis();
  const { data: trocasPendentes = [] } = useTrocasPendentes();
  const { data: minhasEscalas = [] } = useMinhasEscalas(userId || undefined);

  const isGestor = role === 'admin' || role === 'gestor';
  const trocasDisponiveisCount = trocasDisponiveis.filter(t => t.ofertante_id !== userId).length;

  if (roleLoading) return <LoadingState message="Carregando módulo de enfermagem..." />;
  if (!session) return <LoadingState message="Verificando autenticação..." />;

  const handleDayClick = (date: Date, escalas: Escala[]) => {
    console.log('Dia clicado:', date, escalas);
  };

  const handleAddClick = (date: Date) => {
    setSelectedDate(date);
    setNovaEscalaOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Stethoscope className="h-7 w-7 text-primary" />
            Módulo de Enfermagem
          </h1>
          <p className="text-muted-foreground">
            Gestão operacional de escalas e vigilância epidemiológica SCIRAS
          </p>
        </div>
      </div>

      {/* Tabs de nível superior */}
      <Tabs value={mainTab} onValueChange={setMainTab}>
        <TabsList className="h-auto p-1">
          <TabsTrigger value="operacional" className="gap-2 text-sm px-4 py-2">
            <Users className="h-4 w-4" />
            Gestão Operacional
          </TabsTrigger>
          {isGestor && (
            <>
              <TabsTrigger value="sciras" className="gap-2 text-sm px-4 py-2">
                <Microscope className="h-4 w-4" />
                SCIRAS & Epidemiologia
              </TabsTrigger>
              <TabsTrigger value="indicadores-upa" className="gap-2 text-sm px-4 py-2">
                <Activity className="h-4 w-4" />
                Indicadores UPA
              </TabsTrigger>
            </>
          )}
        </TabsList>

        {/* ── Gestão Operacional ── */}
        <TabsContent value="operacional" className="mt-6 space-y-6">
          {/* Header de ações do gestor */}
          {isGestor && (
            <div className="flex flex-wrap gap-2 justify-end">
              <Select value={selectedSetor} onValueChange={setSelectedSetor}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filtrar por setor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os setores</SelectItem>
                  {setores.map(setor => (
                    <SelectItem key={setor} value={setor}>{setor}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Importar Escala
              </Button>
              <Button onClick={() => setNovaEscalaOpen(true)}>
                <Calendar className="h-4 w-4 mr-2" />
                Nova Escala
              </Button>
            </div>
          )}

          <ImportEquipeDialog
            open={importDialogOpen}
            onOpenChange={setImportDialogOpen}
            type="escala"
          />

          {/* Cards de estatísticas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setOperacionalTab('meus-plantoes')}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Meus Plantões</p>
                    <p className="text-2xl font-bold">{minhasEscalas.length}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-primary opacity-80" />
                </div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setOperacionalTab('pega-plantao')}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Disponíveis para Troca</p>
                    <p className="text-2xl font-bold">{trocasDisponiveisCount}</p>
                  </div>
                  <ArrowRightLeft className="h-8 w-8 text-warning opacity-80" />
                </div>
                {trocasDisponiveisCount > 0 && (
                  <Badge variant="secondary" className="mt-2 animate-pulse">Plantões disponíveis!</Badge>
                )}
              </CardContent>
            </Card>
            {isGestor && (
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setOperacionalTab('aprovacoes')}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Aguardando Aprovação</p>
                      <p className="text-2xl font-bold">{trocasPendentes.length}</p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-warning opacity-80" />
                  </div>
                  {trocasPendentes.length > 0 && (
                    <Badge variant="destructive" className="mt-2">Ação necessária</Badge>
                  )}
                </CardContent>
              </Card>
            )}
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setOperacionalTab('historico')}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Histórico</p>
                    <p className="text-sm text-muted-foreground">Ver todas as trocas</p>
                  </div>
                  <History className="h-8 w-8 text-muted-foreground opacity-80" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sub-tabs operacionais */}
          <Tabs value={operacionalTab} onValueChange={setOperacionalTab}>
            <TabsList className="flex flex-wrap gap-1 h-auto p-1">
              <TabsTrigger value="meus-plantoes" className="gap-2">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Meus Plantões</span>
                <span className="sm:hidden">Plantões</span>
              </TabsTrigger>
              <TabsTrigger value="pega-plantao" className="gap-2">
                <ArrowRightLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Pega Plantão</span>
                <span className="sm:hidden">Trocar</span>
                {trocasDisponiveisCount > 0 && (
                  <Badge variant="secondary" className="ml-1">{trocasDisponiveisCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="calendario" className="gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Calendário</span>
                <span className="sm:hidden">Cal.</span>
              </TabsTrigger>
              {isGestor && (
                <TabsTrigger value="aprovacoes" className="gap-2">
                  <CheckCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">Aprovações</span>
                  <span className="sm:hidden">Aprovar</span>
                  {trocasPendentes.length > 0 && (
                    <Badge variant="destructive" className="ml-1">{trocasPendentes.length}</Badge>
                  )}
                </TabsTrigger>
              )}
              <TabsTrigger value="historico" className="gap-2">
                <History className="h-4 w-4" />
                <span className="hidden sm:inline">Histórico</span>
                <span className="sm:hidden">Hist.</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="meus-plantoes" className="mt-6">
              <MinhasEscalas userId={userId || ''} userName={userName || ''} />
            </TabsContent>
            <TabsContent value="pega-plantao" className="mt-6">
              <TrocasDisponiveis userId={userId || ''} userName={userName || ''} />
            </TabsContent>
            <TabsContent value="calendario" className="mt-6">
              <CalendarioEscalas
                onDayClick={handleDayClick}
                onAddClick={isGestor ? handleAddClick : undefined}
                selectedSetor={selectedSetor}
              />
            </TabsContent>
            {isGestor && (
              <TabsContent value="aprovacoes" className="mt-6">
                <AprovacaoTrocas userId={userId || ''} userName={userName || ''} />
              </TabsContent>
            )}
            <TabsContent value="historico" className="mt-6">
              <HistoricoTrocas />
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* ── SCIRAS & Epidemiologia ── */}
        <TabsContent value="sciras" className="mt-6 space-y-6">
          <Tabs value={scirasTab} onValueChange={setScirasTab}>
            <TabsList className="flex flex-wrap gap-1 h-auto p-1">
              <TabsTrigger value="vigilancia" className="gap-2">
                <Bug className="h-4 w-4" />
                <span className="hidden sm:inline">Vigilância IRAS</span>
                <span className="sm:hidden">IRAS</span>
              </TabsTrigger>
              <TabsTrigger value="indicadores" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Indicadores</span>
                <span className="sm:hidden">Ind.</span>
              </TabsTrigger>
              <TabsTrigger value="culturas" className="gap-2">
                <FlaskConical className="h-4 w-4" />
                <span className="hidden sm:inline">Culturas</span>
                <span className="sm:hidden">Cult.</span>
              </TabsTrigger>
              <TabsTrigger value="antimicrobianos" className="gap-2">
                <Pill className="h-4 w-4" />
                <span className="hidden sm:inline">Antimicrobianos</span>
                <span className="sm:hidden">ATM</span>
              </TabsTrigger>
              <TabsTrigger value="notificacoes" className="gap-2">
                <Bell className="h-4 w-4" />
                <span className="hidden sm:inline">Epidemiologia</span>
                <span className="sm:hidden">Epi.</span>
              </TabsTrigger>
              <TabsTrigger value="porta-ecg" className="gap-2">
                <HeartPulse className="h-4 w-4" />
                <span className="hidden sm:inline">Porta-ECG</span>
                <span className="sm:hidden">ECG</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="vigilancia" className="mt-6">
              <VigilanciaIRASComponent userId={userId || ''} userName={userName || ''} />
            </TabsContent>
            <TabsContent value="indicadores" className="mt-6">
              <IndicadoresInfeccao userId={userId || ''} userName={userName || ''} />
            </TabsContent>
            <TabsContent value="culturas" className="mt-6">
              <CulturasMicrobiologicas userId={userId || ''} userName={userName || ''} />
            </TabsContent>
            <TabsContent value="antimicrobianos" className="mt-6">
              <ControleAntimicrobianos userId={userId || ''} userName={userName || ''} />
            </TabsContent>
            <TabsContent value="notificacoes" className="mt-6">
              <NotificacoesEpidemiologicas userId={userId || ''} userName={userName || ''} />
            </TabsContent>
            <TabsContent value="porta-ecg" className="mt-6">
              <PortaECG userId={userId || ''} userName={userName || ''} />
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* ── Indicadores Emergência ── */}
        <TabsContent value="indicadores-upa" className="mt-6">
          <IndicadoresUPA />
        </TabsContent>
      </Tabs>

      <NovaEscalaDialog
        open={novaEscalaOpen}
        onOpenChange={setNovaEscalaOpen}
        selectedDate={selectedDate}
        creatorId={userId || ''}
      />
    </div>
  );
}
