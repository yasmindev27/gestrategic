import { useState } from 'react';
import { format, parseISO, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { History, Calendar, ArrowRight, Filter } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { STATUS_TROCA, TIPOS_PLANTAO } from './types';
import type { Troca, Escala } from './types';

export function HistoricoTrocas() {
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [dataInicio, setDataInicio] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [dataFim, setDataFim] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data: trocas = [], isLoading } = useQuery({
    queryKey: ['historico-trocas', filtroStatus, dataInicio, dataFim],
    queryFn: async () => {
      let query = supabase
        .from('enfermagem_trocas')
        .select(`
          *,
          escala:enfermagem_escalas(*)
        `)
        .gte('created_at', dataInicio)
        .lte('created_at', dataFim + 'T23:59:59')
        .order('created_at', { ascending: false });

      if (filtroStatus !== 'todos') {
        query = query.eq('status', filtroStatus);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as (Troca & { escala: Escala })[];
    },
  });

  const getStatusInfo = (status: string) => {
    return STATUS_TROCA.find(s => s.value === status) || STATUS_TROCA[0];
  };

  const getTipoInfo = (tipo: string) => {
    return TIPOS_PLANTAO.find(t => t.value === tipo) || TIPOS_PLANTAO[0];
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Histórico de Trocas
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filtros */}
        <div className="flex flex-wrap gap-4 mb-4 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filtros:</span>
          </div>
          <div className="flex gap-2 items-center">
            <Label htmlFor="status" className="text-sm">Status:</Label>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {STATUS_TROCA.map(status => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 items-center">
            <Label htmlFor="dataInicio" className="text-sm">De:</Label>
            <Input
              id="dataInicio"
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-auto"
            />
          </div>
          <div className="flex gap-2 items-center">
            <Label htmlFor="dataFim" className="text-sm">Até:</Label>
            <Input
              id="dataFim"
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="w-auto"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : trocas.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <p>Nenhuma troca encontrada no período selecionado.</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {trocas.map(troca => {
                if (!troca.escala) return null;
                const statusInfo = getStatusInfo(troca.status);
                const tipoInfo = getTipoInfo(troca.escala.tipo_plantao);
                const dataPlantao = parseISO(troca.escala.data_plantao);

                return (
                  <Card key={troca.id} className="border">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={statusInfo.cor}>{statusInfo.label}</Badge>
                            <Badge className={tipoInfo.cor}>{tipoInfo.label}</Badge>
                            <Badge variant="outline">{troca.escala.setor}</Badge>
                          </div>

                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-medium">{troca.ofertante_nome}</span>
                            {troca.aceitante_nome && (
                              <>
                                <ArrowRight className="h-4 w-4" />
                                <span className="font-medium">{troca.aceitante_nome}</span>
                              </>
                            )}
                          </div>

                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>
                                Plantão: {format(dataPlantao, 'dd/MM/yyyy')}
                              </span>
                            </div>
                            <span>•</span>
                            <span>
                              Solicitado: {format(parseISO(troca.created_at), 'dd/MM/yyyy HH:mm')}
                            </span>
                          </div>

                          {troca.aprovador_nome && (
                            <div className="text-sm text-muted-foreground">
                              {troca.status === 'aprovada' ? 'Aprovado' : 'Rejeitado'} por: {troca.aprovador_nome}
                              {troca.data_aprovacao && (
                                <span> em {format(parseISO(troca.data_aprovacao), 'dd/MM/yyyy HH:mm')}</span>
                              )}
                            </div>
                          )}

                          {troca.justificativa_rejeicao && (
                            <div className="text-sm text-red-600 italic">
                              Motivo: "{troca.justificativa_rejeicao}"
                            </div>
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
  );
}
