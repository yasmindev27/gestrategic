import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  MapPin,
  Navigation,
  Clock,
  Phone,
  CheckCircle,
  AlertCircle,
  Loader,
} from 'lucide-react';
import { useState } from 'react';

export const RotasScreen = () => {
  const [selectedRota, setSelectedRota] = useState<string | null>(null);

  // Mock data
  const rotasHoje = [
    {
      id: '1',
      numero: 'RT-001',
      status: 'ativa',
      origem: 'Hospital Central - RJ',
      destino: 'Clínica Dr. Silva - Niterói',
      distancia: '35 km',
      tempoEstimado: '1h 15min',
      saida: '08:00',
      chegadaPrevista: '09:15',
      paradas: [
        { local: 'Farmácia Central', endereco: 'Av. Brasil, 1000' },
        { local: 'Clínica Dr. Silva', endereco: 'Rua das Flores, 500' },
      ],
      contato: '(21) 99999-0001',
      responsavel: 'Dr. Carlos Mendes',
      temperatura: 'Controlada (2-8°C)',
    },
    {
      id: '2',
      numero: 'RT-002',
      status: 'concluida',
      origem: 'Hospital Central - RJ',
      destino: 'UPA São Gonçalo',
      distancia: '28 km',
      tempoEstimado: '1h 0min',
      saida: '11:00',
      chegadaPrevista: '12:00',
      chegadaReal: '12:05',
      paradas: [
        { local: 'UPA São Gonçalo', endereco: 'Av. Dr. Theophilo Gonçalves, 1000' },
      ],
      contato: '(21) 98888-0002',
      responsavel: 'Dra. Ana Costa',
      temperatura: 'Controlada (2-8°C)',
    },
  ];

  const rotasAgendadas = [
    {
      id: '1',
      numero: 'RT-003',
      data: '25/03/2026',
      status: 'agendada',
      origem: 'Hospital Central - RJ',
      destino: 'Laboratório Central - Botafogo',
      distancia: '12 km',
      tempoEstimado: '45min',
      saida: '14:00',
      paradas: [
        { local: 'Laboratório Central', endereco: 'Av. Ataulfo de Paiva, 500' },
      ],
      responsavel: 'Recepção - Lab',
      temperatura: 'Temperatura ambiente',
    },
  ];

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      ativa: { color: 'bg-green-100 text-green-800', icon: Navigation },
      concluida: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
      agendada: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      atrasada: { color: 'bg-red-100 text-red-800', icon: AlertCircle },
    };
    const variant = variants[status];
    if (!variant) return null;
    const Icon = variant.icon;
    const labels: Record<string, string> = {
      ativa: 'Em Rota',
      concluida: 'Concluída',
      agendada: 'Agendada',
      atrasada: 'Atrasada',
    };
    return (
      <Badge className={`${variant.color} flex items-center gap-1 text-xs`}>
        <Icon className="w-3 h-3" />
        {labels[status]}
      </Badge>
    );
  };

  return (
    <div className="pb-20 pt-4 px-4 md:pb-4 md:pt-6 md:px-8 mx-auto md:max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Minhas Rotas</h1>
        <p className="text-sm text-gray-600">Acompanhe suas entregas</p>
      </div>

      <Tabs defaultValue="hoje" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 bg-gray-100">
          <TabsTrigger value="hoje" className="text-sm">
            Hoje
          </TabsTrigger>
          <TabsTrigger value="agendadas" className="text-sm">
            Agendadas
          </TabsTrigger>
        </TabsList>

        {/* Rotas de Hoje */}
        <TabsContent value="hoje" className="space-y-3 mt-4">
          {rotasHoje.map((rota) => (
            <Card
              key={rota.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedRota(selectedRota === rota.id ? null : rota.id)}
            >
              <CardContent className="p-4">
                {/* Header */}
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-gray-900">{rota.numero}</span>
                      {getStatusBadge(rota.status)}
                    </div>
                    <p className="text-xs text-gray-600">{rota.saida} - {rota.tempoEstimado}</p>
                  </div>
                  <div className="text-right text-xs font-medium">
                    <p className="text-gray-900">{rota.distancia}</p>
                  </div>
                </div>

                {/* Rotas */}
                <div className="space-y-2 mb-3 pb-3 border-b">
                  <div className="flex gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-600">Saída</p>
                      <p className="font-medium text-gray-900">{rota.origem}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-600">Destino</p>
                      <p className="font-medium text-gray-900">{rota.destino}</p>
                    </div>
                  </div>
                </div>

                {/* Expandido */}
                {selectedRota === rota.id && (
                  <div className="space-y-4 pt-3 border-t">
                    {/* Paradas */}
                    <div>
                      <p className="text-sm font-semibold text-gray-900 mb-2">Paradas</p>
                      {rota.paradas.map((parada, idx) => (
                        <div key={idx} className="flex gap-2 text-sm mb-2">
                          <div className="flex flex-col items-center">
                            <div className="w-2 h-2 bg-blue-600 rounded-full mt-1" />
                            {idx < rota.paradas.length - 1 && (
                              <div className="w-0.5 h-6 bg-gray-300" />
                            )}
                          </div>
                          <div className="pb-2">
                            <p className="font-medium text-gray-900">{parada.local}</p>
                            <p className="text-xs text-gray-600">{parada.endereco}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Informações */}
                    <div className="bg-gray-50 rounded p-3 space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Responsável:</span>
                        <span className="font-medium text-gray-900">{rota.responsavel}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Contato:</span>
                        <span className="font-medium text-gray-900">{rota.contato}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Temperatura:</span>
                        <span className="font-medium text-gray-900">{rota.temperatura}</span>
                      </div>
                      {rota.status === 'ativa' && (
                        <div className="flex justify-between pt-2 border-t">
                          <span className="text-gray-600">Chegada Prevista:</span>
                          <span className="font-bold text-blue-600">{rota.chegadaPrevista}</span>
                        </div>
                      )}
                      {rota.status === 'concluida' && (
                        <div className="flex justify-between pt-2 border-t">
                          <span className="text-gray-600">Chegada Real:</span>
                          <span className="font-bold text-green-600">{rota.chegadaReal}</span>
                        </div>
                      )}
                    </div>

                    {/* Ações */}
                    {rota.status === 'ativa' && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                        >
                          <Phone className="w-4 h-4 mr-1" />
                          Ligar
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 bg-primary hover:bg-primary/90 text-white"
                        >
                          <Navigation className="w-4 h-4 mr-1" />
                          Navegar
                        </Button>
                      </div>
                    )}

                    {rota.status === 'concluida' && (
                      <Button variant="outline" size="sm" className="w-full">
                        Confirmar Conclusão
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Rotas Agendadas */}
        <TabsContent value="agendadas" className="space-y-3 mt-4">
          {rotasAgendadas.map((rota) => (
            <Card key={rota.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-gray-900">{rota.numero}</span>
                      {getStatusBadge(rota.status)}
                    </div>
                    <p className="text-xs text-gray-600">{rota.data} às {rota.saida}</p>
                  </div>
                  <span className="text-xs font-medium text-gray-600">{rota.distancia}</span>
                </div>

                <div className="space-y-2 text-xs">
                  <p className="text-gray-600">
                    <span className="font-medium text-gray-900">{rota.origem}</span> →{' '}
                    <span className="font-medium text-gray-900">{rota.destino}</span>
                  </p>
                  <p className="text-gray-600">
                    Tempo estimado: <span className="font-medium">{rota.tempoEstimado}</span>
                  </p>
                </div>

                <Button variant="outline" size="sm" className="w-full mt-3">
                  Ver Detalhes
                </Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* Resumo Diário */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-sm">Resumo do Dia</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Rotas Concluídas:</span>
            <span className="font-bold text-green-600">1/2</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Distância Total:</span>
            <span className="font-bold">95 km</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Tempo Total:</span>
            <span className="font-bold">2h 30min</span>
          </div>
          <div className="flex justify-between pt-2 border-t">
            <span className="text-gray-600">Próxima Rota:</span>
            <span className="font-bold text-blue-600">RT-002 às 14:00</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
