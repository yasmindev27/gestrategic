import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, MapPin, User, Calendar, ArrowRightLeft, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTrocasDisponiveis, useAceitarTroca, useConfiguracoes } from '@/hooks/useEnfermagem';
import { TIPOS_PLANTAO } from './types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface TrocasDisponiveisProps {
  userId: string;
  userName: string;
}

export function TrocasDisponiveis({ userId, userName }: TrocasDisponiveisProps) {
  const { data: trocas = [], isLoading } = useTrocasDisponiveis();
  const { data: configuracoes = [] } = useConfiguracoes();
  const aceitarTroca = useAceitarTroca();

  const requerAprovacao = configuracoes.find(c => c.chave === 'requer_aprovacao_troca')?.valor === 'true';

  const getTipoInfo = (tipo: string) => {
    return TIPOS_PLANTAO.find(t => t.value === tipo) || TIPOS_PLANTAO[0];
  };

  const handleAceitarTroca = (trocaId: string) => {
    aceitarTroca.mutate({
      trocaId,
      aceitanteId: userId,
      aceitanteNome: userName,
      requerAprovacao,
    });
  };

  // Filtrar trocas que não são do próprio usuário
  const trocasDisponiveis = trocas.filter(t => t.ofertante_id !== userId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Plantões Disponíveis para Troca
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowRightLeft className="h-5 w-5 text-yellow-600" />
          Plantões Disponíveis para Troca
          {trocasDisponiveis.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {trocasDisponiveis.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {trocasDisponiveis.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ArrowRightLeft className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <p>Nenhum plantão disponível para troca no momento.</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {trocasDisponiveis.map(troca => {
                if (!troca.escala) return null;
                const tipoInfo = getTipoInfo(troca.escala.tipo_plantao);
                const dataPlantao = parseISO(troca.escala.data_plantao);

                return (
                  <Card key={troca.id} className="border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/10">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={tipoInfo.cor}>{tipoInfo.label}</Badge>
                            <Badge variant="outline">{troca.escala.setor}</Badge>
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
                                {troca.escala.hora_inicio} - {troca.escala.hora_fim}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <User className="h-4 w-4" />
                              <span>Ofertado por: {troca.ofertante_nome}</span>
                            </div>
                            {troca.motivo_oferta && (
                              <div className="flex items-center gap-2 text-muted-foreground sm:col-span-2">
                                <span className="italic">"{troca.motivo_oferta}"</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              className="shrink-0"
                              disabled={aceitarTroca.isPending}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Pegar
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar aceitação do plantão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Você está prestes a aceitar o plantão de{' '}
                                <strong>{troca.ofertante_nome}</strong> no dia{' '}
                                <strong>
                                  {format(dataPlantao, "dd/MM/yyyy", { locale: ptBR })}
                                </strong>{' '}
                                ({troca.escala.hora_inicio} - {troca.escala.hora_fim}).
                                {requerAprovacao && (
                                  <span className="block mt-2 text-yellow-600">
                                    Atenção: Esta troca precisará de aprovação do gestor.
                                  </span>
                                )}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleAceitarTroca(troca.id)}
                              >
                                Confirmar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
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
  );
}
