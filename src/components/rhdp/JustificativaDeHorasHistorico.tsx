import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Clock, AlertCircle, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface JustificativaHora {
  id: string;
  colaborador_id: string;
  colaborador_nome: string;
  data: string;
  horas_valor: number;
  tipo: 'extra' | 'negativa';
  motivo: string;
  justificativa: string;
  status: 'pendente' | 'aprovada' | 'rejeitada';
  aprovador_id?: string;
  aprovador_nome?: string;
  data_aprovacao?: string;
  observacoes_rejeicao?: string;
  created_at: string;
}

export const JustificativaDeHorasHistorico = () => {
  const [justificativas, setJustificativas] = useState<JustificativaHora[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filtroColaborador, setFiltroColaborador] = useState('');
  const [statusFiltro, setStatusFiltro] = useState<'todas' | 'pendente' | 'aprovada' | 'rejeitada'>('todas');

  useEffect(() => {
    loadJustificativas();
  }, []);

  const loadJustificativas = async () => {
    try {
      setIsLoading(true);
      // @ts-nocheck
      const { data, error } = await (supabase as any)
        .from('justificativa_horas')
        .select(`
          id,
          colaborador_id,
          colaborador_nome,
          data,
          horas_valor,
          tipo,
          motivo,
          justificativa,
          status,
          aprovador_id,
          aprovador_nome,
          data_aprovacao,
          observacoes_rejeicao,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJustificativas((data as any) || []);
    } catch (error) {
      console.error('Erro ao carregar justificativas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const justificativasFiltradas = justificativas.filter(j => {
    const matchColaborador = j.colaborador_nome.toLowerCase().includes(filtroColaborador.toLowerCase());
    const matchStatus = statusFiltro === 'todas' || j.status === statusFiltro;
    return matchColaborador && matchStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendente':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
      case 'aprovada':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Aprovada</Badge>;
      case 'rejeitada':
        return <Badge className="bg-red-100 text-red-800"><AlertCircle className="w-3 h-3 mr-1" />Rejeitada</Badge>;
      default:
        return null;
    }
  };

  const getTipoBadge = (tipo: string) => {
    return tipo === 'extra' 
      ? <Badge variant="outline" className="bg-blue-50 text-blue-700">Extra</Badge>
      : <Badge variant="outline" className="bg-orange-50 text-orange-700">Negativa</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Histórico de Justificativas de Horas
          </CardTitle>
          <CardDescription>
            Visualize todas as justificativas de horas extras e negativas com informações de aprovação
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  Buscar Colaborador
                </label>
                <Input
                  placeholder="Nome do colaborador..."
                  value={filtroColaborador}
                  onChange={(e) => setFiltroColaborador(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  Status
                </label>
                <select
                  value={statusFiltro}
                  onChange={(e) => setStatusFiltro(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="todas">Todos</option>
                  <option value="pendente">Pendente</option>
                  <option value="aprovada">Aprovada</option>
                  <option value="rejeitada">Rejeitada</option>
                </select>
              </div>
              <div className="flex items-end">
                <div className="text-sm text-gray-600">
                  <strong>{justificativasFiltradas.length}</strong> resultado(s)
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Justificativas */}
      <div className="space-y-3">
        {justificativasFiltradas.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Nenhuma justificativa encontrada com os filtros selecionados.
            </AlertDescription>
          </Alert>
        ) : (
          justificativasFiltradas.map((justicativa) => (
            <Card key={justicativa.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start">
                  {/* Colaborador */}
                  <div>
                    <p className="text-xs text-gray-600 font-medium">Colaborador</p>
                    <p className="text-sm font-semibold text-gray-900 mt-1">
                      {justicativa.colaborador_nome}
                    </p>
                  </div>

                  {/* Data e Tipo */}
                  <div>
                    <p className="text-xs text-gray-600 font-medium">Data / Tipo</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-medium text-gray-900">
                        {format(new Date(justicativa.data), 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                      {getTipoBadge(justicativa.tipo)}
                    </div>
                  </div>

                  {/* Horas */}
                  <div>
                    <p className="text-xs text-gray-600 font-medium">Horas</p>
                    <p className={`text-sm font-bold mt-1 ${justicativa.tipo === 'extra' ? 'text-blue-600' : 'text-red-600'}`}>
                      {justicativa.horas_valor > 0 ? '+' : ''}{justicativa.horas_valor}h
                    </p>
                  </div>

                  {/* Status */}
                  <div>
                    <p className="text-xs text-gray-600 font-medium">Status</p>
                    <div className="mt-1">
                      {getStatusBadge(justicativa.status)}
                    </div>
                  </div>

                  {/* Aprovador */}
                  <div>
                    <p className="text-xs text-gray-600 font-medium">Aprovador</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">
                      {justicativa.aprovador_nome || '—'}
                    </p>
                    {justicativa.data_aprovacao && (
                      <p className="text-xs text-gray-600 mt-1">
                        {format(new Date(justicativa.data_aprovacao), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </p>
                    )}
                  </div>
                </div>

                {/* Detalhes Expandido */}
                <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-gray-600 font-medium">Motivo</p>
                      <p className="text-gray-900 mt-1">{justicativa.motivo}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 font-medium">Justificativa</p>
                      <p className="text-gray-900 mt-1 max-h-24 overflow-y-auto">{justicativa.justificativa}</p>
                    </div>
                  </div>

                  {justicativa.status === 'rejeitada' && justicativa.observacoes_rejeicao && (
                    <Alert className="mt-3 bg-red-50 border-red-200">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-800">
                        <strong>Motivo da Rejeição:</strong> {justicativa.observacoes_rejeicao}
                      </AlertDescription>
                    </Alert>
                  )}

                  <p className="text-xs text-gray-500 mt-2">
                    Criada em: {format(new Date(justicativa.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
