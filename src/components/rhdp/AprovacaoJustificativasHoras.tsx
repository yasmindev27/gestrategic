import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, XCircle, Clock, FileText, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface JustificativaParaAprovar {
  id: string;
  colaborador_id: string;
  colaborador_nome: string;
  data: string;
  horas_valor: number;
  tipo: 'extra' | 'negativa';
  motivo: string;
  justificativa: string;
  status: 'pendente' | 'aprovada' | 'rejeitada';
  created_at: string;
}

export const AprovacaoJustificativasHoras = () => {
  const { userId } = useUserRole();
  const { toast } = useToast();
  const [justificativas, setJustificativas] = useState<JustificativaParaAprovar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadJustificativas();
  }, [userId]);

  const loadJustificativas = async () => {
    try {
      setIsLoading(true);

      // Buscar subordinados do gerente
      // @ts-nocheck
      const { data: subordinados, error: subError } = await (supabase as any).rpc(
        'get_manager_subordinates',
        { manager_id: userId }
      );

      if (subError) throw subError;

      const subordinadosIds = (subordinados as any[])?.map((s: any) => s.id) || [];

      if (subordinadosIds.length === 0) {
        setJustificativas([]);
        return;
      }

      // Buscar justificativas pendentes dos subordinados
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
          created_at
        `)
        .in('colaborador_id', subordinadosIds)
        .eq('status', 'pendente')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJustificativas((data as any) || []);
    } catch (error) {
      console.error('Erro ao carregar justificativas:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as justificativas',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAprovacao = async (justificativaId: string, approvalStatus: 'aprovada' | 'rejeitada') => {
    try {
      setProcessingId(justificativaId);

      // @ts-nocheck
      const { error } = await (supabase as any)
        .from('justificativa_horas')
        .update({
          status: approvalStatus,
          aprovador_id: userId,
          data_aprovacao: new Date().toISOString(),
          observacoes_rejeicao: approvalStatus === 'rejeitada' ? rejectionReasons[justificativaId] : null,
        })
        .eq('id', justificativaId);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: `Justificativa ${approvalStatus === 'aprovada' ? 'aprovada' : 'rejeitada'} com sucesso`,
      });

      setJustificativas(prev => prev.filter(j => j.id !== justificativaId));
      setRejectionReasons(prev => {
        const newReasons = { ...prev };
        delete newReasons[justificativaId];
        return newReasons;
      });
      setExpandedId(null);
    } catch (error) {
      console.error('Erro ao processar justificativa:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível processar a justificativa',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const getTipoBadge = (tipo: string) => {
    return tipo === 'extra'
      ? <Badge className="bg-blue-100 text-blue-800">Extra</Badge>
      : <Badge className="bg-orange-100 text-orange-800">Negativa</Badge>;
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
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Aprovação de Justificativas de Horas
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600">{justificativas.length}</div>
              <p className="text-sm text-gray-600 mt-1">Pendentes</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Justificativas */}
      <div className="space-y-3">
        {justificativas.length === 0 ? (
          <Alert>
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle>Nenhuma pendência</AlertTitle>
            <AlertDescription>
              Não há justificativas de horas aguardando sua aprovação no momento.
            </AlertDescription>
          </Alert>
        ) : (
          justificativas.map((justificativa) => (
            <Card
              key={justificativa.id}
              className={`cursor-pointer transition-all ${
                expandedId === justificativa.id ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => setExpandedId(expandedId === justificativa.id ? null : justificativa.id)}
            >
              <CardContent className="p-4">
                {/* Header - Collapsed View */}
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">{justificativa.colaborador_nome}</h3>
                      {getTipoBadge(justificativa.tipo)}
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
                      <div>
                        <p className="text-xs font-medium">Data</p>
                        <p>{format(new Date(justificativa.data), 'dd/MM/yyyy', { locale: ptBR })}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium">Horas</p>
                        <p className={`font-bold ${justificativa.tipo === 'extra' ? 'text-blue-600' : 'text-red-600'}`}>
                          {justificativa.horas_valor > 0 ? '+' : ''}{justificativa.horas_valor}h
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium">Motivo</p>
                        <p>{justificativa.motivo}</p>
                      </div>
                    </div>
                  </div>
                  <Clock className="h-5 w-5 text-yellow-600 ml-4" />
                </div>

                {/* Expanded View */}
                {expandedId === justificativa.id && (
                  <div className="mt-6 pt-6 border-t border-gray-200 space-y-4">
                    {/* Justificativa Detalhada */}
                    <div>
                      <p className="text-sm font-semibold text-gray-900 mb-2">Justificativa Apresentada</p>
                      <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <p className="text-sm text-gray-700">{justificativa.justificativa}</p>
                      </div>
                    </div>

                    {/* Data de Criação */}
                    <p className="text-xs text-gray-500">
                      Enviada em {format(new Date(justificativa.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </p>

                    {/* Seção de Rejeição (se expandido) */}
                    {expandedId === justificativa.id && (
                      <div>
                        <p className="text-sm font-semibold text-gray-900 mb-2">Motivo da Rejeição (se aplicável)</p>
                        <Textarea
                          placeholder="Digite o motivo da rejeição..."
                          value={rejectionReasons[justificativa.id] || ''}
                          onChange={(e) =>
                            setRejectionReasons(prev => ({
                              ...prev,
                              [justificativa.id]: e.target.value,
                            }))
                          }
                          className="text-sm"
                          rows={3}
                        />
                      </div>
                    )}

                    {/* Botões de Ação */}
                    <div className="flex gap-3 pt-4">
                      <Button
                        variant="outline"
                        className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                        onClick={() => handleAprovacao(justificativa.id, 'rejeitada')}
                        disabled={
                          processingId === justificativa.id ||
                          (expandedId === justificativa.id && !rejectionReasons[justificativa.id])
                        }
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Recusar
                      </Button>
                      <Button
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        onClick={() => handleAprovacao(justificativa.id, 'aprovada')}
                        disabled={processingId === justificativa.id}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Aprovar
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
