import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface HoraRecord {
  id: string;
  data: string;
  tipo: string;
  horas: number;
  motivo: string;
  status: string;
  observacao?: string;
  aprovado_em?: string;
  aprovado_por?: string;
}

export const HorasScreen = () => {
  const [showJustificativaModal, setShowJustificativaModal] = useState(false);
  const [selectedHora, setSelectedHora] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [horasPendentes, setHorasPendentes] = useState<HoraRecord[]>([]);
  const [horasAprovadas, setHorasAprovadas] = useState<HoraRecord[]>([]);
  const [horasRejeitadas, setHorasRejeitadas] = useState<HoraRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (userName) {
      loadHoras();
    }
  }, [userName]);

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        let fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Colaborador';
        fullName = fullName
          .toLowerCase()
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        setUserName(fullName);
      }
    } catch (error) {
      // Erro ao carregar dados do usuário silenciado
    }
  };

  const loadHoras = async () => {
    try {
      setLoading(true);
      const { data: horas } = await (supabase as any)
        .from('banco_horas')
        .select('*')
        .eq('funcionario_nome', userName)
        .order('data', { ascending: false });

      if (horas) {
        const pendentes = horas.filter((h: any) => h.status === 'pendente');
        const aprovadas = horas.filter((h: any) => h.status === 'aprovado');
        const rejeitadas = horas.filter((h: any) => h.status === 'rejeitado');

        setHorasPendentes(
          pendentes.map((h: any) => ({
            id: h.id,
            data: format(new Date(h.data), 'dd/MM/yyyy'),
            tipo: h.tipo,
            horas: h.horas,
            motivo: h.motivo || '',
            status: h.status,
            observacao: h.observacao,
          }))
        );

        setHorasAprovadas(
          aprovadas.map((h: any) => ({
            id: h.id,
            data: format(new Date(h.data), 'dd/MM/yyyy'),
            tipo: h.tipo,
            horas: h.horas,
            motivo: h.motivo || '',
            status: h.status,
            observacao: h.observacao,
            aprovado_em: h.aprovado_em ? format(new Date(h.aprovado_em), 'dd/MM/yyyy') : '',
            aprovado_por: h.aprovado_por || '',
          }))
        );

        setHorasRejeitadas(
          rejeitadas.map((h: any) => ({
            id: h.id,
            data: format(new Date(h.data), 'dd/MM/yyyy'),
            tipo: h.tipo,
            horas: h.horas,
            motivo: h.motivo || '',
            status: h.status,
            observacao: h.observacao,
          }))
        );
      }
    } catch (error) {
      // Erro ao carregar horas silenciado
    } finally {
      setLoading(false);
    }
  };

  const openJustificativaModal = (id: string) => {
    setSelectedHora(id);
    setShowJustificativaModal(true);
  };

  return (
    <div className="pb-20 pt-4 px-4 md:pb-4 md:pt-6 md:px-8 mx-auto md:max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Horas Extras e Negativas</h1>
        <p className="text-sm text-gray-600">Gerencie seus registros de horas</p>
      </div>

      {loading ? (
        <Card className="bg-gray-50">
          <CardContent className="pt-6 text-center">
            <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-2" />
            <p className="text-gray-600 text-sm">Carregando horas...</p>
          </CardContent>
        </Card>
      ) : (
        <>
      {/* Resumo */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card>
          <CardContent className="p-3">
            <div className="text-center">
              <p className="text-xs text-gray-600 mb-1">Pendentes</p>
              <p className="text-2xl font-bold text-orange-600">{horasPendentes.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-center">
              <p className="text-xs text-gray-600 mb-1">Aprovadas</p>
              <p className="text-2xl font-bold text-green-600">{horasAprovadas.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-center">
              <p className="text-xs text-gray-600 mb-1">Rejeitadas</p>
              <p className="text-2xl font-bold text-red-600">{horasRejeitadas.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pendentes" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 bg-gray-100 text-xs h-auto">
          <TabsTrigger value="pendentes" className="py-2">
            Pendentes
          </TabsTrigger>
          <TabsTrigger value="aprovadas" className="py-2">
            Aprovadas
          </TabsTrigger>
          <TabsTrigger value="rejeitadas" className="py-2">
            Rejeitadas
          </TabsTrigger>
        </TabsList>

        {/* Pendentes */}
        <TabsContent value="pendentes" className="space-y-3 mt-4">
          {horasPendentes.length === 0 ? (
            <Card className="bg-gray-50">
              <CardContent className="pt-6 text-center">
                <p className="text-gray-600 text-sm">Nenhuma hora pendente</p>
              </CardContent>
            </Card>
          ) : (
            horasPendentes.map((hora) => (
              <Card key={hora.id} className="border-l-4 border-l-orange-500">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{hora.data}</p>
                      <p className="text-xs text-gray-600">{hora.tipo}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${hora.horas < 0 ? 'text-red-600' : 'text-orange-600'}`}>
                        {hora.horas > 0 ? '+' : ''}{hora.horas}h
                      </p>
                      <p className="text-xs text-gray-600">{hora.motivo}</p>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    className="w-full bg-primary hover:bg-primary/90 text-white"
                    onClick={() => openJustificativaModal(hora.id)}
                  >
                    Justificar
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Aprovadas */}
        <TabsContent value="aprovadas" className="space-y-3 mt-4">
          {horasAprovadas.length === 0 ? (
            <Card className="bg-gray-50">
              <CardContent className="pt-6 text-center">
                <p className="text-gray-600 text-sm">Nenhuma hora aprovada</p>
              </CardContent>
            </Card>
          ) : (
            horasAprovadas.map((hora) => (
              <Card key={hora.id} className="border-l-4 border-l-green-500 bg-green-50">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{hora.data}</p>
                      <p className="text-xs text-gray-600">{hora.tipo}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${hora.horas < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {hora.horas > 0 ? '+' : ''}{hora.horas}h
                      </p>
                      <p className="text-xs text-gray-600">{hora.motivo}</p>
                    </div>
                  </div>

                  {hora.observacao && (
                    <div className="bg-white rounded p-2 mb-2 text-xs text-gray-700 border border-green-200">
                      <p className="font-medium mb-1">Justificativa:</p>
                      <p>{hora.observacao}</p>
                    </div>
                  )}

                  <p className="text-xs text-gray-600">
                    Aprovado em <span className="font-medium">{hora.aprovado_em}</span>
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Rejeitadas */}
        <TabsContent value="rejeitadas" className="space-y-3 mt-4">
          {horasRejeitadas.length === 0 ? (
            <Card className="bg-gray-50">
              <CardContent className="pt-6 text-center">
                <p className="text-gray-600 text-sm">Nenhuma hora rejeitada</p>
              </CardContent>
            </Card>
          ) : (
            horasRejeitadas.map((hora) => (
              <Card key={hora.id} className="border-l-4 border-l-red-500 bg-red-50">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{hora.data}</p>
                      <p className="text-xs text-gray-600">{hora.tipo}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${hora.horas < 0 ? 'text-red-600' : 'text-red-600'}`}>
                        {hora.horas > 0 ? '+' : ''}{hora.horas}h
                      </p>
                      <p className="text-xs text-gray-600">{hora.motivo}</p>
                    </div>
                  </div>

                  {hora.observacao && (
                    <div className="bg-white rounded p-2 text-xs text-gray-700 border border-red-200">
                      <p className="font-medium mb-1 text-red-700">Motivo da rejeição:</p>
                      <p>{hora.observacao}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Modal Justificativa */}
      {showJustificativaModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center md:justify-center">
          <Card className="w-full rounded-t-lg md:rounded-lg md:max-w-md max-h-screen md:max-h-auto overflow-y-auto">
            <CardHeader className="pb-3 sticky top-0 bg-white">
              <CardTitle className="text-lg">Justificar Hora</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pb-32 md:pb-6">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Data
                </label>
                <input
                  type="text"
                  value="23/03/2026 - Diurno"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50"
                  disabled
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Tipo
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>Hora Extra</option>
                  <option>Hora Negativa</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Motivo/Descrição
                </label>
                <textarea
                  placeholder="Explique o motivo da hora extra ou negativa..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Anexar comprovante
                </label>
                <input
                  type="file"
                  className="w-full text-sm text-gray-500 file:mr-2 file:px-3 file:py-1 file:rounded file:border-0 file:bg-primary/20 file:text-primary"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowJustificativaModal(false)}
                >
                  Cancelar
                </Button>
                <Button className="flex-1 bg-primary hover:bg-primary/90 text-white">
                  Enviar Justificativa
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
        </>
      )}
    </div>
  );
};
