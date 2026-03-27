
import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Stethoscope, Calendar, ArrowRightLeft, History, CheckCircle, Users, Activity, Upload, FileCheck, ClipboardCheck, ClipboardList, Radio, BedDouble, Siren, ShieldCheck, Pill, Microscope } from 'lucide-react';
import { ProtocolosModule } from '@/components/protocolos/ProtocolosModule';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
  EscalaTecEnfermagem,
} from '@/components/enfermagem';
// SCIRAS components removed – replaced by Protocolos
import { IndicadoresUPA } from '@/components/indicadores';
import { useTrocasDisponiveis, useTrocasPendentes, useMinhasEscalas } from '@/hooks/useEnfermagem';
import type { Escala } from '@/components/enfermagem/types';
import ImportEquipeDialog from '@/components/modules/equipe/ImportEquipeDialog';
import { AprovacaoPontoJustificativa } from '@/components/enfermagem/AprovacaoPontoJustificativa';
import { InternacaoArea } from '@/components/enfermagem/InternacaoArea';
import { UrgenciaArea } from '@/components/enfermagem/UrgenciaArea';
import { CMEArea } from '@/components/enfermagem/CMEArea';
import { ClassificacaoArea } from '@/components/enfermagem/ClassificacaoArea';
import { MedicacaoArea } from '@/components/enfermagem/MedicacaoArea';

export function EnfermagemModule() {
  const navigate = useNavigate();
  const location = useLocation();
  // Tab principal sincronizada com a URL: /dashboard/enfermagem/:tab
  const mainTab = location.pathname.split('/')[3] || 'operacional';
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
  // mainTab agora é derivado da URL
  const [operacionalTab, setOperacionalTab] = useState('meus-plantoes');
  const [canAccessProtocolos, setCanAccessProtocolos] = useState(false);
  // scirasTab removed

  useEffect(() => {
    logAction('acesso', 'enfermagem');
  }, [logAction]);

  // Check if user can access Protocolos (SCIRAS profile or Coord. Enfermagem or admin)
  useEffect(() => {
    async function checkProtocolosAccess() {
      if (!userId) return;
      // Check SCIRAS profile via two separate queries to avoid join issues
      const { data: perfilData } = await supabase
        .from('usuario_perfil')
        .select('perfil_id')
        .eq('user_id', userId);
      
      let hasSciras = false;
      if (perfilData && perfilData.length > 0) {
        const perfilIds = perfilData.map((p: any) => p.perfil_id);
        const { data: perfisData } = await supabase
          .from('perfis_sistema')
          .select('id, nome')
          .in('id', perfilIds);
        hasSciras = perfisData?.some((p: any) => p.nome === 'SCIRAS') || false;
      }

      // Check coordinator cargo or SCIRAS cargo
      const { data: profileData } = await supabase
        .from('profiles')
        .select('cargo')
        .eq('user_id', userId)
        .single();
      const cargoLower = profileData?.cargo?.toLowerCase() || '';
      const isCoord = cargoLower.includes('coordenador') && cargoLower.includes('enfermagem');
      const isCargoSciras = cargoLower.includes('sciras');
      setCanAccessProtocolos(role === 'admin' || hasSciras || isCoord || isCargoSciras);
    }
    checkProtocolosAccess();
  }, [userId, role]);

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

  const { data: trocasDisponiveis = [], isLoading: loadingTrocas, error: errorTrocas } = useTrocasDisponiveis();
  const { data: trocasPendentes = [], isLoading: loadingPendentes, error: errorPendentes } = useTrocasPendentes();
  const { data: minhasEscalas = [], isLoading: loadingEscalas, error: errorEscalas } = useMinhasEscalas(userId || undefined);

  const isGestor = role === 'admin' || role === 'gestor';
  const trocasDisponiveisCount = trocasDisponiveis.filter(t => t.ofertante_id !== userId).length;

  if (roleLoading || loadingTrocas || loadingPendentes || loadingEscalas) return <LoadingState message="Carregando módulo de enfermagem..." />;
  if (!session) return <LoadingState message="Verificando autenticação..." />;

  if (errorTrocas || errorPendentes || errorEscalas) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px]">
        <p className="text-destructive font-medium mb-2">Erro ao carregar dados. Tente novamente mais tarde.</p>
        <Button variant="outline" onClick={() => navigate(0)}>Recarregar</Button>
      </div>
    );
  }

  const handleDayClick = (date: Date, escalas: Escala[]) => {
    console.log('Dia clicado:', date, escalas);
  };

  const handleAddClick = (date: Date) => {
    setSelectedDate(date);
    setNovaEscalaOpen(true);
  };

  const areas = [
    { value: "operacional", label: "Gestão Operacional", icon: Users },
    { value: "internacao", label: "Internação", icon: BedDouble },
    { value: "urgencia", label: "Urgência", icon: Siren },
    { value: "cme", label: "CME", icon: ShieldCheck },
    { value: "classificacao", label: "Classificação", icon: ClipboardCheck },
    { value: "medicacao", label: "Medicação", icon: Pill },
    ...(canAccessProtocolos ? [{ value: "scih", label: "SCIH", icon: Microscope }] : []),
    ...(isGestor ? [
      { value: "indicadores-upa", label: "Indicadores UPA", icon: Activity },
    ] : []),
  ];

  const renderContent = () => {
    switch (mainTab) {
      case "operacional":
        return (
          <div className="space-y-6">
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
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
                        <Upload className="h-4 w-4 mr-2" />
                        Importar Escala
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Importar escalas de enfermagem a partir de planilha Excel</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={() => setNovaEscalaOpen(true)}>
                        <Calendar className="h-4 w-4 mr-2" />
                        Nova Escala
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Criar uma nova escala de plantão manualmente</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
            <ImportEquipeDialog open={importDialogOpen} onOpenChange={setImportDialogOpen} type="escala" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="cursor-pointer hover:shadow-sm transition-shadow" onClick={() => setOperacionalTab('meus-plantoes')}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Meus Plantões</p>
                      <p className="text-2xl font-bold">{minhasEscalas.length}</p>
                    </div>
                    <Calendar className="h-6 w-6 text-primary opacity-60" />
                  </div>
                </CardContent>
              </Card>
              <Card className="cursor-pointer hover:shadow-sm transition-shadow" onClick={() => setOperacionalTab('pega-plantao')}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Disponíveis para Troca</p>
                      <p className="text-2xl font-bold">{trocasDisponiveisCount}</p>
                    </div>
                    <ArrowRightLeft className="h-6 w-6 text-muted-foreground opacity-60" />
                  </div>
                </CardContent>
              </Card>
              {isGestor && (
                <Card className="cursor-pointer hover:shadow-sm transition-shadow" onClick={() => setOperacionalTab('aprovacoes')}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Aguardando Aprovação</p>
                        <p className="text-2xl font-bold">{trocasPendentes.length}</p>
                      </div>
                      <CheckCircle className="h-6 w-6 text-muted-foreground opacity-60" />
                    </div>
                    {trocasPendentes.length > 0 && (
                      <Badge className="mt-2 bg-amber-50 text-amber-700 border border-amber-200 text-[11px]">Ação necessária</Badge>
                    )}
                  </CardContent>
                </Card>
              )}
              <Card className="cursor-pointer hover:shadow-sm transition-shadow" onClick={() => setOperacionalTab('historico')}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Histórico</p>
                      <p className="text-xs text-muted-foreground">Ver todas as trocas</p>
                    </div>
                    <History className="h-6 w-6 text-muted-foreground opacity-60" />
                  </div>
                </CardContent>
              </Card>
            </div>
            <Tabs value={operacionalTab} onValueChange={setOperacionalTab}>
              <TabsList className="flex flex-wrap gap-1 h-auto p-1">
                <TabsTrigger value="meus-plantoes" className="gap-2 text-xs">
                  <Calendar className="h-3.5 w-3.5" /> Plantões
                </TabsTrigger>
                <TabsTrigger value="pega-plantao" className="gap-2 text-xs">
                  <ArrowRightLeft className="h-3.5 w-3.5" /> Pega Plantão
                  {trocasDisponiveisCount > 0 && <Badge variant="secondary" className="ml-1 text-[10px]">{trocasDisponiveisCount}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="calendario" className="gap-2 text-xs">
                  <Users className="h-3.5 w-3.5" /> Calendário
                </TabsTrigger>
                {isGestor && (
                  <TabsTrigger value="aprovacoes" className="gap-2 text-xs">
                    <CheckCircle className="h-3.5 w-3.5" /> Aprovações
                    {trocasPendentes.length > 0 && <Badge variant="destructive" className="ml-1 text-[10px]">{trocasPendentes.length}</Badge>}
                  </TabsTrigger>
                )}
                <TabsTrigger value="historico" className="gap-2 text-xs">
                  <History className="h-3.5 w-3.5" /> Histórico
                </TabsTrigger>
                {isGestor && (
                  <>
                    <TabsTrigger value="escala-tecnicos" className="gap-2 text-xs">
                      <ClipboardList className="h-3.5 w-3.5" /> Escala Técnicos
                    </TabsTrigger>
                    <TabsTrigger value="escala-enfermeiros" className="gap-2 text-xs">
                      <Stethoscope className="h-3.5 w-3.5" /> Escala Enfermeiros
                    </TabsTrigger>
                    <TabsTrigger value="escala-radiologia" className="gap-2 text-xs">
                      <Radio className="h-3.5 w-3.5" /> Escala Radiologia
                    </TabsTrigger>
                    <TabsTrigger value="aprovacao-ponto" className="gap-2 text-xs">
                      <ClipboardCheck className="h-3.5 w-3.5" /> Aprovação Ponto
                    </TabsTrigger>
                  </>
                )}
              </TabsList>
              <TabsContent value="meus-plantoes" className="mt-4">
                <MinhasEscalas userId={userId ?? ''} userName={userName ?? ''} />
              </TabsContent>
              <TabsContent value="pega-plantao" className="mt-4"><TrocasDisponiveis userId={userId || ''} userName={userName || ''} /></TabsContent>
              <TabsContent value="calendario" className="mt-4"><CalendarioEscalas onDayClick={handleDayClick} onAddClick={isGestor ? handleAddClick : undefined} selectedSetor={selectedSetor} /></TabsContent>
              {isGestor && <TabsContent value="aprovacoes" className="mt-4"><AprovacaoTrocas userId={userId || ''} userName={userName || ''} /></TabsContent>}
              <TabsContent value="historico" className="mt-4"><HistoricoTrocas /></TabsContent>
              {isGestor && (
                <>
                  <TabsContent value="escala-tecnicos" className="mt-4"><EscalaTecEnfermagem tipo="tecnicos" /></TabsContent>
                  <TabsContent value="escala-enfermeiros" className="mt-4"><EscalaTecEnfermagem tipo="enfermeiros" /></TabsContent>
                  <TabsContent value="escala-radiologia" className="mt-4"><EscalaTecEnfermagem tipo="radiologia" /></TabsContent>
                  <TabsContent value="aprovacao-ponto" className="mt-4"><AprovacaoPontoJustificativa /></TabsContent>
                </>
              )}
            </Tabs>
          </div>
        );
      case "internacao": return <InternacaoArea />;
      case "urgencia": return <UrgenciaArea />;
      case "cme": return <CMEArea />;
      case "classificacao": return <ClassificacaoArea />;
      case "medicacao": return <MedicacaoArea />;
      case "scih": return <ProtocolosModule />;
      case "indicadores-upa": return <IndicadoresUPA />;
      default: return null;
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-foreground">Enfermagem</h1>
        <p className="text-xs text-muted-foreground">Gestão operacional, escalas e vigilância</p>
      </div>

      <div className="flex gap-4">
        {/* Sidebar de áreas */}
        <nav className="w-52 shrink-0 space-y-0.5">
          {areas.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => {
                if (mainTab !== value) {
                  navigate(`/dashboard/enfermagem/${value}`);
                }
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-left text-[13px] transition-colors ${
                mainTab === value
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          {renderContent()}
        </div>
      </div>

      <NovaEscalaDialog
        open={novaEscalaOpen}
        onOpenChange={setNovaEscalaOpen}
        selectedDate={selectedDate}
        creatorId={userId || ''}
      />
    </div>
  );
}
