import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, Clock, FileText } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ProximoTurno {
  data: string;
  turno: string;
  setor: string;
}

interface HomeScreenProps {
  userName: string;
  userRole: string;
  pendingActions: {
    horasExtras: number;
    trocasPlantao: number;
    escalasAjustar: number;
  };
}

export const HomeScreen = ({ userName, userRole, pendingActions }: HomeScreenProps) => {
  const [proximosTurnos, setProximosTurnos] = useState<ProximoTurno[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProximosTurnos();
  }, [userName]);

  const loadProximosTurnos = async () => {
    try {
      setLoading(true);
      const hoje = new Date();
      
      // Buscar os próximos 3 turnos
      const { data: escalas } = await (supabase as any)
        .from('escala')
        .select('data, turno, setor_descricao')
        .eq('colaborador_nome', userName)
        .gte('data', format(hoje, 'yyyy-MM-dd'))
        .order('data', { ascending: true })
        .limit(3);

      if (escalas && escalas.length > 0) {
        setProximosTurnos(
          escalas.map((e: any) => ({
            data: format(new Date(e.data), "d 'de' MMMM", { locale: ptBR }),
            turno: e.turno || 'N/A',
            setor: e.setor_descricao || 'N/A',
          }))
        );
      }
    } catch (error) {
      console.error('Erro ao carregar próximos turnos:', error);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="pb-20 pt-4 px-4 md:pb-4 md:pt-6 md:px-8 mx-auto md:max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Olá, {userName}!</h1>
        <p className="text-sm text-gray-600">{userRole}</p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {/* Horas Extras */}
        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 font-medium">Horas Pendentes</p>
                <p className="text-2xl font-bold text-amber-700 mt-1">{pendingActions.horasExtras}</p>
              </div>
              <Clock className="w-8 h-8 text-amber-400" />
            </div>
          </CardContent>
        </Card>

        {/* Trocas de Plantão */}
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 font-medium">Trocas Pendentes</p>
                <p className="text-2xl font-bold text-blue-800 mt-1">{pendingActions.trocasPlantao}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-900 px-1">Ações Rápidas</h2>

        {/* Alertas */}
        {pendingActions.horasExtras > 0 && (
          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm text-gray-900">Horas extras para justificar</p>
                  <p className="text-xs text-gray-600">Você tem {pendingActions.horasExtras} registro(s) aguardando justificativa</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {pendingActions.trocasPlantao > 0 && (
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm text-gray-900">Solicitações em aberto</p>
                  <p className="text-xs text-gray-600">{pendingActions.trocasPlantao} solicitação(ões) de troca aguardando resposta</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {pendingActions.horasExtras === 0 && pendingActions.trocasPlantao === 0 && (
          <Card className="border-l-4 border-l-green-500 bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm text-green-900">Tudo em dia!</p>
                  <p className="text-xs text-green-700">Nenhuma ação pendente no momento</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Next Shift Info */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Próximo Turno</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Data:</span>
            <span className="font-medium text-gray-900">25 de Março (Terça)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Turno:</span>
            <span className="font-medium text-gray-900">Diurno (7h - 19h)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Setor:</span>
            <span className="font-medium text-gray-900">Enfermagem - UTI</span>
          </div>
        </div>
      </div>
    </div>
  );
};
