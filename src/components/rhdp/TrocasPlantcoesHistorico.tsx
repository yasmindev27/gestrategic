import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Clock, AlertCircle, FilterX, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TrocaPlantao {
  id: string;
  ofertante_id: string;
  ofertante_nome: string;
  aceitante_id?: string;
  aceitante_nome?: string;
  data_oferta: string;
  horario_oferta: string;
  data_solicitada: string;
  horario_solicitado: string;
  motivo_oferta?: string;
  status: 'aberta' | 'aceita' | 'pendente_aprovacao' | 'aprovada' | 'rejeitada' | 'cancelada' | 'expirada';
  requer_aprovacao: boolean;
  aprovador_id?: string;
  aprovador_nome?: string;
  data_aprovacao?: string;
  justificativa_rejeicao?: string;
  created_at: string;
}

export const TrocasPlantcoesHistorico = () => {
  const [trocas, setTrocas] = useState<TrocaPlantao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filtroColaborador, setFiltroColaborador] = useState('');
  const [statusFiltro, setStatusFiltro] = useState<'todas' | 'aberta' | 'aceita' | 'aprovada' | 'rejeitada' | 'cancelada'>('todas');

  useEffect(() => {
    loadTrocas();
  }, []);

  const loadTrocas = async () => {
    try {
      setIsLoading(true);
      // @ts-nocheck
      const { data, error } = await (supabase as any)
        .from('trocas_plantoe')
        .select(`
          id,
          ofertante_id,
          ofertante_nome,
          aceitante_id,
          aceitante_nome,
          data_oferta,
          horario_oferta,
          data_solicitada,
          horario_solicitado,
          motivo_oferta,
          status,
          requer_aprovacao,
          aprovador_id,
          aprovador_nome,
          data_aprovacao,
          justificativa_rejeicao,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTrocas((data as any) || []);
    } catch (error) {
      console.error('Erro ao carregar trocas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const trocasFiltradas = trocas.filter(t => {
    const matchOfertante = t.ofertante_nome.toLowerCase().includes(filtroColaborador.toLowerCase());
    const matchAceitante = t.aceitante_nome?.toLowerCase().includes(filtroColaborador.toLowerCase());
    const matchColaborador = matchOfertante || matchAceitante;
    const matchStatus = statusFiltro === 'todas' || t.status === statusFiltro;
    return matchColaborador && matchStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'aberta':
        return <Badge className="bg-blue-100 text-blue-800"><Zap className="w-3 h-3 mr-1" />Aberta</Badge>;
      case 'aceita':
        return <Badge className="bg-purple-100 text-purple-800"><CheckCircle className="w-3 h-3 mr-1" />Aceita</Badge>;
      case 'pendente_aprovacao':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
      case 'aprovada':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Aprovada</Badge>;
      case 'rejeitada':
        return <Badge className="bg-red-100 text-red-800"><AlertCircle className="w-3 h-3 mr-1" />Rejeitada</Badge>;
      case 'cancelada':
        return <Badge variant="outline" className="bg-gray-100 text-gray-800"><FilterX className="w-3 h-3 mr-1" />Cancelada</Badge>;
      default:
        return null;
    }
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
            <Zap className="h-5 w-5" />
            Histórico de Trocas de Plantão
          </CardTitle>
          <CardDescription>
            Visualize todas as trocas de plantão solicitadas com informações de aprovação
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
                  Buscar Colaborador (Ofertante ou Aceitante)
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
                  <option value="aberta">Aberta</option>
                  <option value="aceita">Aceita</option>
                  <option value="pendente_aprovacao">Pendente Aprovação</option>
                  <option value="aprovada">Aprovada</option>
                  <option value="rejeitada">Rejeitada</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </div>
              <div className="flex items-end">
                <div className="text-sm text-gray-600">
                  <strong>{trocasFiltradas.length}</strong> resultado(s)
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Trocas */}
      <div className="space-y-3">
        {trocasFiltradas.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Nenhuma troca de plantão encontrada com os filtros selecionados.
            </AlertDescription>
          </Alert>
        ) : (
          trocasFiltradas.map((troca) => (
            <Card key={troca.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="space-y-4">
                  {/* Row 1: Ofertante e Aceitante */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border-l-4 border-blue-500 pl-4">
                      <p className="text-xs text-gray-600 font-medium">Ofertante</p>
                      <p className="text-sm font-semibold text-gray-900 mt-1">
                        {troca.ofertante_nome}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {format(new Date(`${troca.data_oferta}T${troca.horario_oferta}`), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </p>
                    </div>

                    <div className="border-l-4 border-green-500 pl-4">
                      <p className="text-xs text-gray-600 font-medium">Aceitante</p>
                      {troca.aceitante_nome ? (
                        <>
                          <p className="text-sm font-semibold text-gray-900 mt-1">
                            {troca.aceitante_nome}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            {format(new Date(`${troca.data_solicitada}T${troca.horario_solicitado}`), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-gray-500 italic mt-1">
                          Aguardando aceite
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Row 2: Status e Aprovador */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
                    <div>
                      <p className="text-xs text-gray-600 font-medium">Status</p>
                      <div className="mt-2">
                        {getStatusBadge(troca.status)}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-gray-600 font-medium">Aprovação</p>
                      <p className="text-sm font-medium text-gray-900 mt-1">
                        {troca.requer_aprovacao ? 'Requer' : 'Sem'}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-600 font-medium">Aprovador</p>
                      <p className="text-sm font-medium text-gray-900 mt-1">
                        {troca.aprovador_nome || '—'}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-600 font-medium">Data de Aprovação</p>
                      {troca.data_aprovacao ? (
                        <p className="text-sm text-gray-900 mt-1">
                          {format(new Date(troca.data_aprovacao), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-500 italic mt-1">—</p>
                      )}
                    </div>
                  </div>

                  {/* Motivo e Rejeição */}
                  {(troca.motivo_oferta || troca.justificativa_rejeicao) && (
                    <div className="pt-4 border-t border-gray-200 space-y-2">
                      {troca.motivo_oferta && (
                        <div>
                          <p className="text-xs text-gray-600 font-medium">Motivo da Troca</p>
                          <p className="text-sm text-gray-900 mt-1">{troca.motivo_oferta}</p>
                        </div>
                      )}

                      {troca.status === 'rejeitada' && troca.justificativa_rejeicao && (
                        <Alert className="mt-3 bg-red-50 border-red-200">
                          <AlertCircle className="h-4 w-4 text-red-600" />
                          <AlertDescription className="text-red-800">
                            <strong>Motivo da Rejeição:</strong> {troca.justificativa_rejeicao}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}

                  <p className="text-xs text-gray-500 mt-2">
                    ID: {troca.id.slice(0, 8)}... | Criada em: {format(new Date(troca.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
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
