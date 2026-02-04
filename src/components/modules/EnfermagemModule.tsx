import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stethoscope, Calendar, ArrowRightLeft, History, CheckCircle, Users } from 'lucide-react';
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
import { LoadingState } from '@/components/ui/loading-state';
import {
  CalendarioEscalas,
  TrocasDisponiveis,
  MinhasEscalas,
  AprovacaoTrocas,
  NovaEscalaDialog,
  HistoricoTrocas,
} from '@/components/enfermagem';
import { useTrocasDisponiveis, useTrocasPendentes, useMinhasEscalas } from '@/hooks/useEnfermagem';
import type { Escala } from '@/components/enfermagem/types';

export default function EnfermagemModule() {
  const navigate = useNavigate();
  const { role, isLoading: roleLoading, userId } = useUserRole();
  const { logAction } = useLogAccess();
  const [session, setSession] = useState<{ user: { id: string } } | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [setores, setSetores] = useState<string[]>([]);
  const [selectedSetor, setSelectedSetor] = useState<string>('todos');
  const [novaEscalaOpen, setNovaEscalaOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [activeTab, setActiveTab] = useState('meus-plantoes');

  // Registrar acesso ao módulo
  useEffect(() => {
    logAction('acesso', 'enfermagem');
  }, [logAction]);

  // Verificar sessão e obter nome do usuário
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

  // Obter nome do usuário
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

  // Carregar setores
  useEffect(() => {
    async function loadSetores() {
      const { data } = await supabase
        .from('setores')
        .select('nome')
        .eq('ativo', true)
        .order('nome');

      if (data) {
        setSetores(data.map(s => s.nome));
      }
    }
    loadSetores();
  }, []);

  // Queries para contadores
  const { data: trocasDisponiveis = [] } = useTrocasDisponiveis();
  const { data: trocasPendentes = [] } = useTrocasPendentes();
  const { data: minhasEscalas = [] } = useMinhasEscalas(userId || undefined);

  const isGestor = role === 'admin' || role === 'gestor';
  const trocasDisponiveisCount = trocasDisponiveis.filter(t => t.ofertante_id !== userId).length;

  if (roleLoading) {
    return <LoadingState message="Carregando módulo de enfermagem..." />;
  }

  if (!session) {
    return <LoadingState message="Verificando autenticação..." />;
  }

  const handleDayClick = (date: Date, escalas: Escala[]) => {
    // Pode abrir um modal com detalhes do dia ou similar
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
            Gestão de escalas e trocas de plantão
          </p>
        </div>

        {isGestor && (
          <div className="flex gap-2">
            <Select value={selectedSetor} onValueChange={setSelectedSetor}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por setor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os setores</SelectItem>
                {setores.map(setor => (
                  <SelectItem key={setor} value={setor}>
                    {setor}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => setNovaEscalaOpen(true)}>
              <Calendar className="h-4 w-4 mr-2" />
              Nova Escala
            </Button>
          </div>
        )}
      </div>

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('meus-plantoes')}>
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

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('pega-plantao')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Disponíveis para Troca</p>
                <p className="text-2xl font-bold">{trocasDisponiveisCount}</p>
              </div>
              <ArrowRightLeft className="h-8 w-8 text-yellow-600 opacity-80" />
            </div>
            {trocasDisponiveisCount > 0 && (
              <Badge variant="secondary" className="mt-2 animate-pulse">
                Plantões disponíveis!
              </Badge>
            )}
          </CardContent>
        </Card>

        {isGestor && (
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('aprovacoes')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Aguardando Aprovação</p>
                  <p className="text-2xl font-bold">{trocasPendentes.length}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-orange-600 opacity-80" />
              </div>
              {trocasPendentes.length > 0 && (
                <Badge variant="destructive" className="mt-2">
                  Ação necessária
                </Badge>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('historico')}>
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

      {/* Tabs principais */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 lg:w-auto lg:inline-grid">
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
              <Badge variant="secondary" className="ml-1">
                {trocasDisponiveisCount}
              </Badge>
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
                <Badge variant="destructive" className="ml-1">
                  {trocasPendentes.length}
                </Badge>
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

      {/* Dialog para nova escala */}
      <NovaEscalaDialog
        open={novaEscalaOpen}
        onOpenChange={setNovaEscalaOpen}
        selectedDate={selectedDate}
        creatorId={userId || ''}
      />
    </div>
  );
}
