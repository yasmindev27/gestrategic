import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Check, X, Clock, AlertCircle, Info } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { differenceInHours, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TrocaValidacao {
  valida: boolean;
  mensagens: string[];
}

interface TrocaPlantao {
  id: string;
  ofertante_nome: string;
  aceitante_nome?: string;
  data_plantao_original: string;
  tipo_plantao_original: string;
  data_plantao_solicitado: string;
  tipo_plantao_solicitado: string;
  status: string;
  created_at?: string;
  requer_aprovacao?: boolean;
}

export const TrocaPlantaoScreen = () => {
  const [showModal, setShowModal] = useState(false);
  const [userName, setUserName] = useState('');
  const [userTurno, setUserTurno] = useState('');
  const [trocasMesAtual, setTrocasMesAtual] = useState(0);
  const [validacao, setValidacao] = useState<TrocaValidacao>({ valida: true, mensagens: [] });
  const [colabaBuscado, setColabaBuscado] = useState('');
  const [turnoColaba, setTurnoColaba] = useState('');
  const [dataTroca, setDataTroca] = useState('');
  const [motivoTroca, setMotivoTroca] = useState('');
  const [loadingValidacao, setLoadingValidacao] = useState(false);
  const [colaboradorSugestoes, setColaboradorSugestoes] = useState<string[]>([]);
  const [mostraSugestoes, setMostraSugestoes] = useState(false);
  const [minhasTrocas, setMinhasTrocas] = useState<TrocaPlantao[]>([]);
  const [trocasRecebidas, setTrocasRecebidas] = useState<TrocaPlantao[]>([]);
  const [loadingTrocas, setLoadingTrocas] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (userName) {
      loadTrocas();
    }
  }, [userName]);

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Colaborador';
        setUserName(fullName);
        
        // Buscar turno atual do usuário
        const { data: escalas } = await (supabase as any)
          .from('escala')
          .select('turno')
          .eq('colaborador_nome', fullName)
          .lte('data', new Date().toISOString().split('T')[0])
          .gte('data', new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0])
          .order('data', { ascending: false })
          .limit(1);
        
        if (escalas && escalas.length > 0) {
          setUserTurno(escalas[0].turno);
        }

        // Contar trocas do mês atual
        const hoje = new Date();
        const anoAtual = hoje.getFullYear();
        const mesAtual = String(hoje.getMonth() + 1).padStart(2, '0');
        const inicioMes = `${anoAtual}-${mesAtual}-01`;
        const fimMes = `${anoAtual}-${mesAtual}-31`;

        const { data: trocas } = await (supabase as any)
          .from('trocas_plantoe')
          .select('id')
          .eq('ofertante_nome', fullName)
          .gte('created_at', inicioMes)
          .lte('created_at', fimMes)
          .in('status', ['aberta', 'aceita', 'pendente', 'aprovada']);

        setTrocasMesAtual(trocas?.length || 0);
      }
    } catch (error) {
      // Erro ao carregar dados silenciado
    }
  };

  const loadTrocas = async () => {
    try {
      setLoadingTrocas(true);
      
      // Minhas solicitações (ofertadas por mim)
      const { data: minhas } = await (supabase as any)
        .from('trocas_plantoe')
        .select('*')
        .eq('ofertante_nome', userName)
        .order('created_at', { ascending: false });

      if (minhas) {
        setMinhasTrocas(minhas);
      }

      // Trocas recebidas (ofertadas para mim)
      const { data: recebidas } = await (supabase as any)
        .from('trocas_plantoe')
        .select('*')
        .eq('aceitante_nome', userName)
        .order('created_at', { ascending: false });

      if (recebidas) {
        setTrocasRecebidas(recebidas);
      }
    } catch (error) {
      // Erro ao carregar trocas silenciado
    } finally {
      setLoadingTrocas(false);
    }
  };

  const buscarColaboradores = async (termo: string) => {
    if (termo.length < 2) {
      setColaboradorSugestoes([]);
      setMostraSugestoes(false);
      return;
    }

    try {
      const { data: colaboradores } = await (supabase as any)
        .from('escala')
        .select('colaborador_nome')
        .ilike('colaborador_nome', `%${termo}%`)
        .neq('colaborador_nome', userName)
        .order('colaborador_nome')
        .limit(10);

      if (colaboradores) {
        const nomesUnicos = [...new Set(colaboradores.map((c: any) => c.colaborador_nome as string))];
        setColaboradorSugestoes(nomesUnicos as string[]);
        setMostraSugestoes(true);
      }
    } catch (error) {
      // Erro ao buscar colaboradores silenciado
    }
  };

  const selecionarColaborador = (nome: string) => {
    setColabaBuscado(nome);
    setMostraSugestoes(false);
    setColaboradorSugestoes([]);
  };

  const validarTroca = async (
    colabaNome: string,
    dataTrocaStr: string,
    turnoSolicitante: string
  ): Promise<TrocaValidacao> => {
    const mensagens: string[] = [];
    let valida = true;

    // 1. Validar se colaborador existe e pegar turno
    const { data: escalasColaba } = await (supabase as any)
      .from('escala')
      .select('turno')
      .eq('colaborador_nome', colabaNome)
      .lte('data', dataTrocaStr)
      .gte('data', new Date(new Date(dataTrocaStr).getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('data', { ascending: false })
      .limit(1);

    if (!escalasColaba || escalasColaba.length === 0) {
      mensagens.push(`❌ Colaborador "${colabaNome}" não encontrado ou sem escala nesse período`);
      valida = false;
    } else {
      setTurnoColaba(escalasColaba[0].turno);

      // 2. Validar se são do mesmo turno
      if (turnoSolicitante !== escalasColaba[0].turno) {
        mensagens.push(`❌ Trocas permitidas apenas entre colaboradores do MESMO TURNO`);
        mensagens.push(`   Você: ${turnoSolicitante} | ${colabaNome}: ${escalasColaba[0].turno}`);
        valida = false;
      } else {
        mensagens.push(`✓ Turnos compatíveis (${turnoSolicitante})`);
      }
    }

    // 3. Validar antecedência mínima de 72 horas
    const dataAgora = new Date();
    const dataTroca = new Date(dataTrocaStr);
    const horasAntecedencia = differenceInHours(dataTroca, dataAgora);
    
    if (horasAntecedencia < 72) {
      mensagens.push(`❌ Antecedência mínima: 72 horas`);
      mensagens.push(`   Você tem: ${Math.round(horasAntecedencia)}h de antecedência`);
      valida = false;
    } else {
      mensagens.push(`✓ Antecedência adequada (${Math.round(horasAntecedencia)}h)`);
    }

    // 4. Validar limite de 2 trocas por mês
    if (trocasMesAtual >= 2) {
      mensagens.push(`❌ Limite de trocas por mês atingido (2/2)`);
      mensagens.push(`   Você já tem ${trocasMesAtual} solicitação(ões) neste mês`);
      valida = false;
    } else {
      mensagens.push(`✓ Limite de trocas: ${trocasMesAtual + 1}/2`);
    }

    return { valida, mensagens };
  };

  const handleValidarTroca = async () => {
    if (!colabaBuscado || !dataTroca) {
      setValidacao({
        valida: false,
        mensagens: ['Preencha o colaborador e a data para validar'],
      });
      return;
    }

    setLoadingValidacao(true);
    const resultado = await validarTroca(colabaBuscado, dataTroca, userTurno);
    setValidacao(resultado);
    setLoadingValidacao(false);
  };

  const handleSolicitarTroca = async () => {
    if (!colabaBuscado || !dataTroca) {
      setValidacao({
        valida: false,
        mensagens: ['Preencha o colaborador e a data para solicitar'],
      });
      return;
    }

    setLoadingValidacao(true);
    const resultado = await validarTroca(colabaBuscado, dataTroca, userTurno);
    setValidacao(resultado);

    if (!resultado.valida) {
      setLoadingValidacao(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await (supabase as any).from('trocas_plantoe').insert([
        {
          ofertante_id: user.id,
          ofertante_nome: userName,
          aceitante_nome: colabaBuscado,
          data_plantao_original: new Date().toISOString().split('T')[0],
          tipo_plantao_original: userTurno,
          data_plantao_solicitado: dataTroca,
          tipo_plantao_solicitado: turnoColaba,
          motivo_oferta: motivoTroca,
          status: 'aberta',
          requer_aprovacao: true,
          registrado_por: user.id,
        },
      ]);

      if (error) throw error;

      alert('✓ Troca de plantão solicitada com sucesso!');
      setShowModal(false);
      setColabaBuscado('');
      setDataTroca('');
      setMotivoTroca('');
      setValidacao({ valida: true, mensagens: [] });
      loadUserData();
    } catch (error) {
      setValidacao({
        valida: false,
        mensagens: ['Erro ao solicitar troca. Tente novamente.'],
      });
    } finally {
      setLoadingValidacao(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      aberta: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      aceita: { color: 'bg-green-100 text-green-800', icon: Check },
      rejeitada: { color: 'bg-red-100 text-red-800', icon: X },
      aprovada: { color: 'bg-green-100 text-green-800', icon: Check },
    };
    const variant = variants[status];
    if (!variant) return null;
    const Icon = variant.icon;
    return (
      <Badge className={`${variant.color} flex items-center gap-1 text-xs`}>
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="pb-20 pt-4 px-4 md:pb-4 md:pt-6 md:px-8 mx-auto md:max-w-6xl">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trocas de Plantão</h1>
          <p className="text-sm text-gray-600">Gerencie suas trocas de turno</p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowModal(true)}
          className="bg-primary hover:bg-primary/90 text-white"
        >
          <Plus className="w-4 h-4 mr-1" />
          Nova Troca
        </Button>
      </div>

      <Tabs defaultValue="minhas" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 bg-gray-100">
          <TabsTrigger value="minhas" className="text-sm">
            Minhas Solicitações
          </TabsTrigger>
          <TabsTrigger value="recebidas" className="text-sm">
            Recebidas
          </TabsTrigger>
        </TabsList>

        {/* Minhas Solicitações */}
        <TabsContent value="minhas" className="space-y-3 mt-4">
          {loadingTrocas ? (
            <Card className="bg-gray-50">
              <CardContent className="pt-6 text-center">
                <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-2" />
                <p className="text-gray-600 text-sm">Carregando trocas...</p>
              </CardContent>
            </Card>
          ) : minhasTrocas.length === 0 ? (
            <Card className="bg-gray-50">
              <CardContent className="pt-6 text-center">
                <p className="text-gray-600 text-sm">Nenhuma solicitação realizada</p>
              </CardContent>
            </Card>
          ) : (
            minhasTrocas.map((sol) => (
              <Card key={sol.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {format(new Date(sol.data_plantao_solicitado), 'dd/MM/yyyy', { locale: ptBR })} - {sol.tipo_plantao_solicitado}
                      </p>
                      <p className="text-xs text-gray-600">com {sol.aceitante_nome || 'Aguardando aceitante'}</p>
                    </div>
                    {getStatusBadge(sol.status)}
                  </div>

                  <div className="space-y-2 text-xs text-gray-600 mb-3 pb-3 border-b">
                    <div className="flex justify-between">
                      <span>De:</span>
                      <span className="font-medium text-gray-900">
                        {format(new Date(sol.data_plantao_original), 'dd/MM/yyyy', { locale: ptBR })} - {sol.tipo_plantao_original}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Para:</span>
                      <span className="font-medium text-gray-900">
                        {format(new Date(sol.data_plantao_solicitado), 'dd/MM/yyyy', { locale: ptBR })} - {sol.tipo_plantao_solicitado}
                      </span>
                    </div>
                  </div>

                  {sol.status === 'aberta' && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        Cancelar
                      </Button>
                      <Button size="sm" className="flex-1 bg-primary hover:bg-primary/90 text-white">
                        Contato
                      </Button>
                    </div>
                  )}

                  {sol.status === 'aceita' && (
                    <div className="space-y-2">
                      <div className="bg-green-50 border border-green-200 rounded p-3 text-xs">
                        <div className="space-y-1 text-green-800">
                          <p className="font-semibold">✓ Troca Aceita</p>
                          <p className="text-green-700">Aguardando aprovação</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {sol.status === 'aprovada' && (
                    <div className="bg-green-50 border border-green-200 rounded p-3 text-xs">
                      <div className="space-y-1 text-green-800">
                        <p className="font-semibold">✓ Troca Aprovada</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Solicitações Recebidas */}
        <TabsContent value="recebidas" className="space-y-3 mt-4">
          {loadingTrocas ? (
            <Card className="bg-gray-50">
              <CardContent className="pt-6 text-center">
                <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-2" />
                <p className="text-gray-600 text-sm">Carregando trocas...</p>
              </CardContent>
            </Card>
          ) : trocasRecebidas.length === 0 ? (
            <Card className="bg-gray-50">
              <CardContent className="pt-6 text-center">
                <p className="text-gray-600 text-sm">Nenhuma solicitação recebida</p>
              </CardContent>
            </Card>
          ) : (
            trocasRecebidas.map((sol) => (
              <Card key={sol.id} className={sol.status === 'aberta' ? 'border-blue-200 bg-blue-50' : ''}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{sol.ofertante_nome}</p>
                      <p className="text-xs text-gray-600">
                        {format(new Date(sol.data_plantao_original), 'dd/MM/yyyy', { locale: ptBR })} ({sol.tipo_plantao_original}) → {format(new Date(sol.data_plantao_solicitado), 'dd/MM/yyyy', { locale: ptBR })} ({sol.tipo_plantao_solicitado})
                      </p>
                    </div>
                    {getStatusBadge(sol.status)}
                  </div>

                  {sol.status === 'aberta' && (
                    <div className="space-y-3">
                      <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-800">
                        <p className="font-semibold mb-1">⏳ Aguardando sua resposta</p>
                        <p className="text-blue-700">Solicitada em: {sol.created_at ? format(new Date(sol.created_at), 'dd/MM/yyyy', { locale: ptBR }) : 'N/A'}</p>
                      </div>
                      <div className="flex gap-2 pt-1 border-t">
                        <Button variant="outline" size="sm" className="flex-1">
                          Recusar
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 bg-primary hover:bg-primary/90 text-white"
                        >
                          Aceitar
                        </Button>
                      </div>
                    </div>
                  )}

                  {sol.status === 'rejeitada' && (
                    <div className="bg-red-50 border border-red-200 rounded p-3 text-xs">
                      <p className="font-semibold text-red-800 mb-1">✗ Rejeitada</p>
                      <p className="text-red-700">Rejeitada em: {sol.created_at ? format(new Date(sol.created_at), 'dd/MM/yyyy', { locale: ptBR }) : 'N/A'}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Modal Nova Troca */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center md:justify-center">
          <Card className="w-full rounded-t-lg md:rounded-lg md:max-w-md max-h-[90vh] overflow-y-auto">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Solicitar Troca de Plantão</CardTitle>
              <p className="text-xs text-gray-600 mt-1">
                Limite: {trocasMesAtual}/2 solicitações neste mês
              </p>
            </CardHeader>
            <CardContent className="space-y-4 pb-32 md:pb-6">
              {/* Info sobre Regras */}
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-3 text-xs text-blue-900">
                  <div className="flex gap-2">
                    <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-medium">Regras de Troca:</p>
                      <ul className="list-disc list-inside space-y-0.5 text-blue-800">
                        <li>Mesmo turno (diurno↔diurno ou noturno↔noturno)</li>
                        <li>Mínimo 72 horas de antecedência</li>
                        <li>Máximo 2 trocas por competência (01-31)</li>
                        <li>As trocas devem ser pagas na mesma competência</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Seu Turno Atual
                </label>
                <input
                  type="text"
                  placeholder="Turno"
                  value={userTurno}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50"
                  disabled
                />
              </div>

              <div className="relative">
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Deseja trocar com (digite o nome)
                </label>
                <input
                  type="text"
                  placeholder="Nome do colega"
                  value={colabaBuscado}
                  onChange={(e) => {
                    setColabaBuscado(e.target.value);
                    buscarColaboradores(e.target.value);
                  }}
                  onFocus={() => colabaBuscado.length >= 2 && setMostraSugestoes(true)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                
                {mostraSugestoes && colaboradorSugestoes.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                    {colaboradorSugestoes.map((nome, idx) => (
                      <button
                        key={idx}
                        onClick={() => selecionarColaborador(nome)}
                        className="w-full text-left px-3 py-2 hover:bg-primary/10 text-sm text-gray-700 border-b border-gray-100 last:border-b-0 transition-colors"
                      >
                        {nome}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Data da Troca Desejada
                </label>
                <input
                  type="date"
                  value={dataTroca}
                  onChange={(e) => setDataTroca(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Motivo da Troca
                </label>
                <textarea
                  placeholder="Explique o motivo..."
                  value={motivoTroca}
                  onChange={(e) => setMotivoTroca(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              {validacao.mensagens.length > 0 && (
                <Card className={validacao.valida ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
                  <CardContent className="p-3">
                    <div className="space-y-1">
                      {validacao.mensagens.map((msg, idx) => (
                        <p key={idx} className={`text-xs ${validacao.valida ? 'text-green-800' : 'text-red-800'} font-medium`}>
                          {msg}
                        </p>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowModal(false);
                    setValidacao({ valida: true, mensagens: [] });
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-primary hover:bg-primary/90 text-white disabled:opacity-50"
                  disabled={loadingValidacao || !colabaBuscado || !dataTroca}
                  onClick={handleSolicitarTroca}
                >
                  {loadingValidacao ? 'Solicitando...' : 'Solicitar Troca'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
