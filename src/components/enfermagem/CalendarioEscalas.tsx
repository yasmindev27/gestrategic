import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useEscalas } from '@/hooks/useEnfermagem';
import type { Escala } from './types';
import { TIPOS_PLANTAO, STATUS_ESCALA } from './types';

interface CalendarioEscalasProps {
  onDayClick?: (date: Date, escalas: Escala[]) => void;
  onAddClick?: (date: Date) => void;
  selectedSetor?: string;
}

export function CalendarioEscalas({ onDayClick, onAddClick, selectedSetor }: CalendarioEscalasProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const mes = currentDate.getMonth();
  const ano = currentDate.getFullYear();

  const { data: escalas = [], isLoading } = useEscalas(mes, ano);

  const filteredEscalas = useMemo(() => {
    if (!selectedSetor || selectedSetor === 'todos') return escalas;
    return escalas.filter(e => e.setor === selectedSetor);
  }, [escalas, selectedSetor]);

  const daysInMonth = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const getEscalasForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return filteredEscalas.filter(e => e.data_plantao === dateStr);
  };

  const getTipoInfo = (tipo: string) => {
    return TIPOS_PLANTAO.find(t => t.value === tipo) || TIPOS_PLANTAO[0];
  };

  const getStatusInfo = (status: string) => {
    return STATUS_ESCALA.find(s => s.value === status) || STATUS_ESCALA[0];
  };

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  // Preencher dias vazios no início do mês
  const firstDayOfMonth = startOfMonth(currentDate).getDay();
  const emptyDays = Array(firstDayOfMonth).fill(null);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Calendário de Escalas
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-medium min-w-[140px] text-center">
              {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-96 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {/* Cabeçalho com dias da semana */}
            {weekDays.map(day => (
              <div
                key={day}
                className="text-center text-sm font-medium text-muted-foreground py-2"
              >
                {day}
              </div>
            ))}

            {/* Dias vazios no início */}
            {emptyDays.map((_, index) => (
              <div key={`empty-${index}`} className="min-h-[100px]" />
            ))}

            {/* Dias do mês */}
            {daysInMonth.map(day => {
              const dayEscalas = getEscalasForDay(day);
              const hasDisponivelTroca = dayEscalas.some(e => e.status === 'disponivel_troca');

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    'min-h-[100px] border rounded-lg p-1 cursor-pointer hover:bg-accent/50 transition-colors',
                    isToday(day) && 'border-primary border-2',
                    hasDisponivelTroca && 'bg-yellow-50 dark:bg-yellow-950/20'
                  )}
                  onClick={() => onDayClick?.(day, dayEscalas)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={cn(
                        'text-sm font-medium',
                        isToday(day) && 'text-primary'
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                    {onAddClick && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddClick(day);
                        }}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <div className="space-y-0.5 overflow-hidden max-h-[70px]">
                    {dayEscalas.slice(0, 3).map(escala => {
                      const tipoInfo = getTipoInfo(escala.tipo_plantao);
                      const statusInfo = getStatusInfo(escala.status);
                      return (
                        <div
                          key={escala.id}
                          className={cn(
                            'text-xs px-1 py-0.5 rounded truncate',
                            escala.status === 'disponivel_troca'
                              ? 'bg-yellow-200 text-yellow-900 animate-pulse'
                              : tipoInfo.cor
                          )}
                          title={`${escala.profissional_nome} - ${tipoInfo.label}`}
                        >
                          {escala.profissional_nome.split(' ')[0]}
                        </div>
                      );
                    })}
                    {dayEscalas.length > 3 && (
                      <div className="text-xs text-muted-foreground text-center">
                        +{dayEscalas.length - 3} mais
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Legenda */}
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="text-sm text-muted-foreground">Legenda:</span>
          {TIPOS_PLANTAO.map(tipo => (
            <Badge key={tipo.value} variant="outline" className={tipo.cor}>
              {tipo.label}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
