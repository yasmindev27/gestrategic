import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, Calendar, User, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useTrocasPendentes, useAprovarTroca } from '@/hooks/useEnfermagem';
import { TIPOS_PLANTAO } from './types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface AprovacaoTrocasProps {
  userId: string;
  userName: string;
}

export function AprovacaoTrocas({ userId, userName }: AprovacaoTrocasProps) {
  const { data: trocasPendentes = [], isLoading } = useTrocasPendentes();
  const aprovarTroca = useAprovarTroca();

  const [rejeitarDialogOpen, setRejeitarDialogOpen] = useState(false);
  const [trocaParaRejeitar, setTrocaParaRejeitar] = useState<string | null>(null);
  const [justificativa, setJustificativa] = useState('');

  const getTipoInfo = (tipo: string) => {
    return TIPOS_PLANTAO.find(t => t.value === tipo) || TIPOS_PLANTAO[0];
  };

  const handleAprovar = (trocaId: string) => {
    aprovarTroca.mutate({
      trocaId,
      aprovadorId: userId,
      aprovadorNome: userName,
      aprovado: true,
    });
  };

  const handleRejeitar = () => {
    if (!trocaParaRejeitar) return;
    aprovarTroca.mutate({
      trocaId: trocaParaRejeitar,
      aprovadorId: userId,
      aprovadorNome: userName,
      aprovado: false,
      justificativa,
    }, {
      onSuccess: () => {
        setRejeitarDialogOpen(false);
        setTrocaParaRejeitar(null);
        setJustificativa('');
      },
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Trocas Aguardando Aprovação
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
            <CheckCircle className="h-5 w-5 text-orange-600" />
            Trocas Aguardando Aprovação
            {trocasPendentes.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {trocasPendentes.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {trocasPendentes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p>Nenhuma troca aguardando aprovação.</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {trocasPendentes.map(troca => {
                  if (!troca.escala) return null;
                  const tipoInfo = getTipoInfo(troca.escala.tipo_plantao);
                  const dataPlantao = parseISO(troca.escala.data_plantao);

                  return (
                    <Card key={troca.id} className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/10">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={tipoInfo.cor}>{tipoInfo.label}</Badge>
                            <Badge variant="outline">{troca.escala.setor}</Badge>
                          </div>

                          <div className="flex items-center gap-2 text-sm">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{troca.ofertante_nome}</span>
                            <ArrowRight className="h-4 w-4" />
                            <span className="font-medium">{troca.aceitante_nome}</span>
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
                          </div>

                          {troca.motivo_oferta && (
                            <div className="text-sm text-muted-foreground italic">
                              Motivo: "{troca.motivo_oferta}"
                            </div>
                          )}

                          <div className="flex gap-2 pt-2">
                            <Button
                              size="sm"
                              onClick={() => handleAprovar(troca.id)}
                              disabled={aprovarTroca.isPending}
                              className="flex-1"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Aprovar
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setTrocaParaRejeitar(troca.id);
                                setRejeitarDialogOpen(true);
                              }}
                              disabled={aprovarTroca.isPending}
                              className="flex-1"
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Rejeitar
                            </Button>
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

      <Dialog open={rejeitarDialogOpen} onOpenChange={setRejeitarDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Troca</DialogTitle>
            <DialogDescription>
              Informe o motivo da rejeição para que os profissionais envolvidos sejam notificados.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Justificativa</Label>
              <Textarea
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                placeholder="Ex: Conflito de horário, profissional não habilitado para o setor..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejeitarDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleRejeitar} disabled={aprovarTroca.isPending}>
              Confirmar Rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
