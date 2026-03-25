import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

interface EscalaDay {
  dia: number;
  tipo: string;
  setor: string;
  turno: string;
  cor: string;
}

export const EscalaScreen = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [userName, setUserName] = useState('');
  const [escalaMock, setEscalaMock] = useState<Record<string, EscalaDay>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (userName) {
      loadEscala();
    }
  }, [userName, currentMonth]);

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
      console.error('Erro ao carregar usuário:', error);
    }
  };

  const loadEscala = async () => {
    try {
      setLoading(true);
      const ano = currentMonth.getFullYear();
      const mes = currentMonth.getMonth() + 1;

      const { data: escalas } = await (supabase as any)
        .from('escala')
        .select('dia, setor_descricao, turno')
        .eq('colaborador_nome', userName)
        .eq('ano', ano)
        .eq('mes', mes);

      if (escalas) {
        const escalaMap: Record<string, EscalaDay> = {};
        
        escalas.forEach((escala: any) => {
          const dateStr = `${ano}-${String(mes).padStart(2, '0')}-${String(escala.dia).padStart(2, '0')}`;
          const setor = escala.setor_descricao || 'N/A';
          
          // Definir cor baseado no setor
          let cor = 'bg-gray-100 border-gray-300';
          if (setor === 'FOLGA') {
            cor = 'bg-green-100 border-green-300';
          } else if (setor === 'AFASTAMENTO JUSTIFICADO') {
            cor = 'bg-red-100 border-red-300';
          } else if (setor.includes('ACOLHIMENTO')) {
            cor = 'bg-blue-100 border-blue-300';
          } else if (setor.includes('URGÊNCIA')) {
            cor = 'bg-orange-100 border-orange-300';
          } else if (setor.includes('INTERNAÇÃO')) {
            cor = 'bg-purple-100 border-purple-300';
          } else if (setor.includes('CME') || setor.includes('LAB')) {
            cor = 'bg-indigo-100 border-indigo-300';
          } else {
            cor = 'bg-cyan-100 border-cyan-300';
          }
          
          escalaMap[dateStr] = {
            dia: escala.dia,
            tipo: setor,
            setor: setor,
            turno: escala.turno || '',
            cor,
          };
        });
        
        setEscalaMock(escalaMap);
      }
    } catch (error) {
      console.error('Erro ao carregar escala:', error);
    } finally {
      setLoading(false);
    }
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getShiftForDay = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    return escalaMock[dateStr];
  };

  return (
    <div className="pb-20 pt-4 px-4 md:pb-4 md:pt-6 md:px-8 mx-auto md:max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Minha Escala</h1>
        <p className="text-sm text-gray-600">Visualize seus turnos agendados</p>
      </div>

      {/* Month Selector */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h2 className="text-lg font-semibold">
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-2" />
              <p className="text-gray-600 text-sm">Carregando escala...</p>
            </div>
          ) : (
            <>
          {/* Calendar */}
          <div className="grid grid-cols-7 gap-2">
            {/* Day headers */}
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map((day) => (
              <div key={day} className="text-center text-xs font-semibold text-gray-600 py-2">
                {day}
              </div>
            ))}

            {/* Empty cells for days before month starts */}
            {Array.from({ length: getDay(monthStart) }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {/* Days */}
            {daysInMonth.map((day) => {
              const shift = getShiftForDay(day);
              const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
              
              return (
                <div
                  key={format(day, 'yyyy-MM-dd')}
                  className={`
                    p-2 rounded border text-center text-xs transition-all
                    ${shift ? shift.cor : 'bg-gray-50 border-gray-200'}
                    ${isToday ? 'ring-2 ring-primary ring-offset-1' : ''}
                  `}
                >
                  <div className="font-semibold text-gray-900">{format(day, 'd')}</div>
                  {shift && (
                    <>
                      <div className="text-xs mt-1 font-medium text-gray-700 truncate">
                        {shift.tipo}
                      </div>
                      {shift.turno && (
                        <div className="text-xs text-gray-600">{shift.turno}</div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm">Legenda</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded" />
            <span className="text-sm text-gray-700">Turno Diurno (7h - 19h)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-indigo-100 border border-indigo-300 rounded" />
            <span className="text-sm text-gray-700">Turno Noturno (19h - 7h)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-100 border border-green-300 rounded" />
            <span className="text-sm text-gray-700">Folga</span>
          </div>
        </CardContent>
      </Card>

      {/* Próximos Turnos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Próximos Turnos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-3 border border-gray-200 rounded-lg">
              <div className="flex justify-between items-start mb-1">
                <span className="font-medium text-gray-900">25 de Março + {i}</span>
                <Badge variant={i === 1 ? 'default' : 'secondary'} className="text-xs">
                  {i === 1 ? 'Próximo' : `Em ${i} dias`}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-xs text-gray-600">Turno</p>
                  <p className="font-medium text-gray-900">Diurno</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Setor</p>
                  <p className="font-medium text-gray-900">UTI</p>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};
