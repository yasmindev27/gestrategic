import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, MapPin, Calendar, ArrowRightLeft, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useMinhasEscalas, useOfertarTroca, useCancelarTroca, useMinhasTrocas, useConfiguracoes } from '@/hooks/useEnfermagem';
import { TIPOS_PLANTAO, STATUS_ESCALA, STATUS_TROCA } from './types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface MinhasEscalasProps {
  userId: string;
  userName: string;
}

export function MinhasEscalas({ userId, userName }: MinhasEscalasProps) {
  const { data: escalas = [], isLoading } = useMinhasEscalas(userId);
  const { data: minhasTrocas = [] } = useMinhasTrocas(userId);
  const { data: configuracoes = [] } = useConfiguracoes();
  const ofertarTroca = useOfertarTroca();
  const cancelarTroca = useCancelarTroca();

  const [ofertarDialogOpen, setOfertarDialogOpen] = useState(false);
  const [escalaParaOfertar, setEscalaParaOfertar] = useState<string | null>(null);
  const [motivoOferta, setMotivoOferta] = useState('');

  const requerAprovacao = configuracoes.find(c => c.chave === 'requer_aprovacao_troca')?.valor === 'true';

  const getTipoInfo = (tipo: string) => {
    return TIPOS_PLANTAO.find(t => t.value === tipo) || TIPOS_PLANTAO[0];
  };

  const getStatusInfo = (status: string) => {
    return STATUS_ESCALA.find(s => s.value === status) || STATUS_ESCALA[0];
  };

  const getTrocaStatusInfo = (status: string) => {
    return STATUS_TROCA.find(s => s.value === status) || STATUS_TROCA[0];
  };

  const getTrocaParaEscala = (escalaId: string) => {
    return minhasTrocas.find(t => t.escala_id === escalaId && t.ofertante_id === userId);
  };

  const handleOfertarTroca = () => {
    if (!escalaParaOfertar) return;
    ofertarTroca.mutate({
      escalaId: escalaParaOfertar,
      ofertanteId: userId,
      ofertanteNome: userName,
      motivo: motivoOferta,
      requerAprovacao,
    }, {
      onSuccess: () => {
        setOfertarDialogOpen(false);
        setEscalaParaOfertar(null);
        setMotivoOferta('');
      },
    });
  };

  const handleCancelarTroca = (trocaId: string, escalaId: string) => {
    cancelarTroca.mutate({
      trocaId,
      escalaId,
      userId,
      userName,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Meus Plantões
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Meus Próximos Plantões
            {escalas.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {escalas.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {escalas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p>Você não tem plantões agendados.</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {escalas.map(escala => {
                  const tipoInfo = getTipoInfo(escala.tipo_plantao);
                  const statusInfo = getStatusInfo(escala.status);
                  const dataPlantao = parseISO(escala.data_plantao);
                  const trocaAtiva = getTrocaParaEscala(escala.id);

                  return (
                    <Card key={escala.id} className="border">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge className={tipoInfo.cor}>{tipoInfo.label}</Badge>
                              <Badge variant="outline">{escala.setor}</Badge>
                              <Badge className={statusInfo.cor}>{statusInfo.label}</Badge>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Calendar className="h-4 w-4" />
                                <span>
                                  {format(dataPlantao, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Clock className="h-4 w-4" />
                                <span>
                                  {escala.hora_inicio} - {escala.hora_fim}
                                </span>
                              </div>
                            </div>

                            {trocaAtiva && (
                              <div className="flex items-center gap-2 text-sm">
                                <ArrowRightLeft className="h-4 w-4" />
                                <span>
                                  Status da troca:{' '}
                                  <Badge className={getTrocaStatusInfo(trocaAtiva.status).cor}>
                                    {getTrocaStatusInfo(trocaAtiva.status).label}
                                  </Badge>
                                </span>
                                {trocaAtiva.aceitante_nome && (
                                  <span className="text-muted-foreground">
                                    por {trocaAtiva.aceitante_nome}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col gap-2">
                            {escala.status === 'confirmado' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEscalaParaOfertar(escala.id);
                                  setOfertarDialogOpen(true);
                                }}
                              >
                                <ArrowRightLeft className="h-4 w-4 mr-1" />
                                Ofertar
                              </Button>
                            )}

                            {escala.status === 'disponivel_troca' && trocaAtiva && trocaAtiva.status === 'aberta' && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleCancelarTroca(trocaAtiva.id, escala.id)}
                                disabled={cancelarTroca.isPending}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Cancelar
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Dialog open={ofertarDialogOpen} onOpenChange={setOfertarDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ofertar Plantão para Troca</DialogTitle>
            <DialogDescription>
              Seu plantão ficará disponível para outros profissionais aceitarem.
              {requerAprovacao && (
                <span className="block mt-1 text-yellow-600">
                  Trocas requerem aprovação do gestor.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Motivo da troca (opcional)</Label>
              <Textarea
                value={motivoOferta}
                onChange={(e) => setMotivoOferta(e.target.value)}
                placeholder="Ex: Compromisso pessoal, consulta médica..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOfertarDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleOfertarTroca} disabled={ofertarTroca.isPending}>
              Ofertar Plantão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
