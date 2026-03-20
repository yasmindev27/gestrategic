import { useState, useEffect } from 'react';
import { useBeds } from '@/hooks/useBeds';
import { useRealTimeBIData } from '@/hooks/useRealTimeBIData';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

/**
 * Componente que valida a sincronização de dados entre
 * Mapa de Leitos e Dashboard BI
 * 
 * Se houver inconsistências, exibe alerta
 */
export function DataSyncValidator() {
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error' | 'mismatch'>('syncing');
  const [occupancyDiff, setOccupancyDiff] = useState(0);

  // Dados do Mapa de Leitos (realidade)
  const { totalOccupancy: mapaOccupancy, isLoading: mapaLoading } = useBeds();

  // Dados do BI (calculados em tempo real)
  const { dados: biDados, loading: biLoading } = useRealTimeBIData();

  useEffect(() => {
    if (mapaLoading || biLoading) {
      setSyncStatus('syncing');
      return;
    }

    if (!biDados || biDados.length === 0) {
      setSyncStatus('error');
      return;
    }

    // Obter ocupação atual do BI (primeiro item = mais recente)
    const biOccupancy = biDados[0]?.ocupacao_leitos || 0;

    // Obter ocupação do Mapa
    const mapaOccupancy_percent =
      mapaOccupancy && mapaOccupancy.total > 0
        ? Math.round((mapaOccupancy.occupied / mapaOccupancy.total) * 100)
        : 0;

    // Comparar
    const diff = Math.abs(biOccupancy - mapaOccupancy_percent);
    setOccupancyDiff(diff);

    if (diff === 0) {
      setSyncStatus('synced');
    } else if (diff <= 5) {
      // Tolerância de 5%
      setSyncStatus('synced');
    } else {
      setSyncStatus('mismatch');
    }
  }, [mapaOccupancy, biDados, mapaLoading, biLoading]);

  // Não renderizar durante carregamento
  if (syncStatus === 'syncing') {
    return null;
  }

  // Dashboard em erro
  if (syncStatus === 'error') {
    return (
      <Card className="border-red-500 bg-red-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <p className="text-sm text-red-800 font-medium">
              Erro: Falha ao sincronizar dados com Supabase
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Dados sincronizados
  if (syncStatus === 'synced') {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <p className="text-sm text-green-800 font-medium">
              ✓ Dados sincronizados com Mapa de Leitos
            </p>
            <Badge variant="outline" className="ml-auto text-xs">
              <Clock className="w-3 h-3 mr-1" />
              Tempo Real
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Dados fora de sincronização
  return (
    <Card className="border-yellow-500 bg-yellow-50">
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-2">
          <AlertTriangle className="w-5 h-5 text-yellow-600" />
          <p className="text-sm text-yellow-800 font-medium">
            ⚠ Inconsistência detectada na ocupação
          </p>
        </div>
        <p className="text-xs text-yellow-700 ml-8">
          Diferença de {occupancyDiff}% entre Mapa de Leitos e Dashboard BI.
          Recarregando dados...
        </p>
      </CardContent>
    </Card>
  );
}
