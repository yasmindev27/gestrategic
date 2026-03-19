import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, TrendingDown, Minus, AlertCircle, CheckCircle2, 
  Target, Activity, Users, DollarSign
} from 'lucide-react';
import { KPIData } from '@/hooks/useKPIsHospitalar';
import { cn } from '@/lib/utils';

interface CardMetricaProps {
  titulo: string;
  kpi: KPIData;
  unidade?: string;
  icon?: React.ReactNode;
  cor?: 'verde' | 'azul' | 'vermelho' | 'amarelo' | 'roxo';
  showMeta?: boolean;
  compact?: boolean;
}

export const CardMetrica: React.FC<CardMetricaProps> = ({
  titulo,
  kpi,
  unidade = '',
  icon,
  cor = 'azul',
  showMeta = true,
  compact = false,
}) => {
  const cores = {
    verde: 'from-emerald-500/20 to-emerald-600/20 border-emerald-300',
    azul: 'from-blue-500/20 to-blue-600/20 border-blue-300',
    vermelho: 'from-red-500/20 to-red-600/20 border-red-300',
    amarelo: 'from-amber-500/20 to-amber-600/20 border-amber-300',
    roxo: 'from-purple-500/20 to-purple-600/20 border-purple-300',
  };

  const corTexto = {
    verde: 'text-emerald-700',
    azul: 'text-blue-700',
    vermelho: 'text-red-700',
    amarelo: 'text-amber-700',
    roxo: 'text-purple-700',
  };

  const variacaoPositiva = kpi.variacao_percentual >= 0;
  const isBomImpacto = cor === 'verde' ? variacaoPositiva : !variacaoPositiva;

  if (compact) {
    return (
      <div className={cn(
        'rounded-lg border p-4 bg-gradient-to-br',
        cores[cor]
      )}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-600 font-medium">{titulo}</p>
            <p className={cn('text-2xl font-bold mt-2', corTexto[cor])}>
              {kpi.valor_atual.toFixed(1)}{unidade}
            </p>
          </div>
          {icon && (
            <div className={cn('p-2 rounded-lg bg-white/50', corTexto[cor])}>
              {icon}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 mt-3">
          {kpi.tendencia === 'crescente' ? (
            <TrendingUp className={cn('w-4 h-4', isBomImpacto ? 'text-emerald-600' : 'text-red-600')} />
          ) : kpi.tendencia === 'decrescente' ? (
            <TrendingDown className={cn('w-4 h-4', isBomImpacto ? 'text-emerald-600' : 'text-red-600')} />
          ) : (
            <Minus className="w-4 h-4 text-gray-500" />
          )}
          <span className="text-xs font-semibold">
            {kpi.variacao_percentual >= 0 ? '+' : ''}{kpi.variacao_percentual.toFixed(1)}%
          </span>
        </div>
      </div>
    );
  }

  return (
    <Card className={cn('bg-gradient-to-br border-2 overflow-hidden', cores[cor])}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-sm font-medium text-gray-700">{titulo}</CardTitle>
          </div>
          {icon && (
            <div className={cn('p-2 rounded-lg bg-white/70', corTexto[cor])}>
              {icon}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Valor Principal */}
          <div>
            <div className={cn('text-4xl font-bold', corTexto[cor])}>
              {kpi.valor_atual.toFixed(1)}
              <span className="text-lg ml-2 text-gray-600 font-normal">{unidade}</span>
            </div>
          </div>

          {/* Andamento da Meta */}
          {showMeta && (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-600">Meta: {kpi.meta.toFixed(1)}{unidade}</span>
                <Badge 
                  variant={kpi.percentual_meta >= 100 ? 'default' : 'secondary'}
                  className="font-bold"
                >
                  {kpi.percentual_meta.toFixed(0)}%
                </Badge>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    kpi.percentual_meta >= 100 ? 'bg-emerald-500' : 'bg-amber-500'
                  )}
                  style={{ width: `${Math.min(kpi.percentual_meta, 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Variação */}
          <div className="flex items-center justify-between pt-4 border-t border-white/30">
            <span className="text-xs text-gray-600">Período anterior</span>
            <div className="flex items-center gap-2">
              {kpi.tendencia === 'crescente' ? (
                <TrendingUp className={cn('w-4 h-4', isBomImpacto ? 'text-emerald-600' : 'text-red-600')} />
              ) : kpi.tendencia === 'decrescente' ? (
                <TrendingDown className={cn('w-4 h-4', isBomImpacto ? 'text-emerald-600' : 'text-red-600')} />
              ) : (
                <Minus className="w-4 h-4 text-gray-500" />
              )}
              <span className={cn(
                'font-bold text-sm',
                isBomImpacto ? 'text-emerald-600' : 'text-red-600'
              )}>
                {kpi.variacao_percentual >= 0 ? '+' : ''}{kpi.variacao_percentual.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Componente de Grid de Métricas
interface GradeMetricasProps {
  metricas: Array<{
    titulo: string;
    kpi: KPIData;
    unidade?: string;
    icon?: React.ReactNode;
    cor?: 'verde' | 'azul' | 'vermelho' | 'amarelo' | 'roxo';
  }>;
  colunas?: 2 | 3 | 4;
  compact?: boolean;
}

export const GradeMetricas: React.FC<GradeMetricasProps> = ({
  metricas,
  colunas = 4,
  compact = false,
}) => {
  return (
    <div className={cn(
      'grid gap-4',
      colunas === 2 ? 'grid-cols-1 lg:grid-cols-2' :
      colunas === 3 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' :
      'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
    )}>
      {metricas.map((metrica, idx) => (
        <CardMetrica
          key={idx}
          titulo={metrica.titulo}
          kpi={metrica.kpi}
          unidade={metrica.unidade}
          icon={metrica.icon}
          cor={metrica.cor}
          compact={compact}
        />
      ))}
    </div>
  );
};

// Componente de Indicador AI
interface IndicadorAIProps {
  titulo: string;
  valor: number;
  interpretacao: string;
  severidade: 'info' | 'warning' | 'error' | 'success';
  acao?: string;
}

export const IndicadorAI: React.FC<IndicadorAIProps> = ({
  titulo,
  valor,
  interpretacao,
  severidade,
  acao,
}) => {
  const severidadeCores = {
    info: 'bg-blue-500/10 border-blue-300 text-blue-700',
    warning: 'bg-amber-500/10 border-amber-300 text-amber-700',
    error: 'bg-red-500/10 border-red-300 text-red-700',
    success: 'bg-emerald-500/10 border-emerald-300 text-emerald-700',
  };

  const icones = {
    info: <Activity className="w-5 h-5" />,
    warning: <AlertCircle className="w-5 h-5" />,
    error: <AlertCircle className="w-5 h-5" />,
    success: <CheckCircle2 className="w-5 h-5" />,
  };

  return (
    <div className={cn('rounded-lg border-2 p-4', severidadeCores[severidade])}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          {icones[severidade]}
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-sm">{titulo}</h4>
          <p className="text-sm text-gray-700 mt-1">{interpretacao}</p>
          {acao && (
            <p className="text-xs font-medium mt-2 opacity-75">
              💡 {acao}
            </p>
          )}
        </div>
        <div className="text-2xl font-bold opacity-50">
          {valor.toFixed(1)}%
        </div>
      </div>
    </div>
  );
};

// Componente de Status
interface StatusIndicatorProps {
  status: 'excelente' | 'bom' | 'atencao' | 'critico';
  label: string;
  descricao?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  label,
  descricao,
}) => {
  const statusCores = {
    excelente: { bg: 'bg-emerald-500', label: 'Excelente' },
    bom: { bg: 'bg-blue-500', label: 'Bom' },
    atencao: { bg: 'bg-amber-500', label: 'Atenção' },
    critico: { bg: 'bg-red-500', label: 'Crítico' },
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
      <div className={cn('w-3 h-3 rounded-full animate-pulse', statusCores[status].bg)} />
      <div className="flex-1">
        <p className="font-semibold text-sm">{label}</p>
        {descricao && <p className="text-xs text-gray-600">{descricao}</p>}
      </div>
      <span className="text-xs font-bold px-2 py-1 rounded-full bg-white">
        {statusCores[status].label}
      </span>
    </div>
  );
};

// Componente de Gauge/Velocímetro
interface GaugeProps {
  valor: number;
  minimo?: number;
  maximo?: number;
  metas?: Array<{ valor: number; label: string; cor: string }>;
  titulo?: string;
  unidade?: string;
}

export const GaugeMetrica: React.FC<GaugeProps> = ({
  valor,
  minimo = 0,
  maximo = 100,
  metas,
  titulo,
  unidade = '%',
}) => {
  const percentual = ((valor - minimo) / (maximo - minimo)) * 100;
  const restricao = Math.min(Math.max(percentual, 0), 100);

  const getCor = () => {
    if (restricao >= 80) return 'from-emerald-400 to-emerald-600';
    if (restricao >= 60) return 'from-blue-400 to-blue-600';
    if (restricao >= 40) return 'from-amber-400 to-amber-600';
    return 'from-red-400 to-red-600';
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {titulo && <p className="font-semibold text-gray-700">{titulo}</p>}
      
      <div className="relative w-32 h-32">
        {/* Background circular */}
        <svg className="w-full h-full" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="3"
          />
          {/* Indicador colorido */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="url(#gradiente)"
            strokeWidth="3"
            strokeDasharray={`${(restricao / 100) * 283} 283`}
            strokeLinecap="round"
          />
          <defs>
            <linearGradient id="gradiente" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" className={`stop-color-${getCor().split('-')[1]}`} />
              <stop offset="100%" className={`stop-color-${getCor().split('-')[2]}`} />
            </linearGradient>
          </defs>
        </svg>

        {/* Texto central */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-3xl font-bold">{valor.toFixed(0)}</p>
          <p className="text-xs text-gray-600">{unidade}</p>
        </div>
      </div>

      {/* Metas */}
      {metas && (
        <div className="flex gap-2">
          {metas.map((meta, idx) => (
            <div key={idx} className="flex items-center gap-1 text-xs">
              <div className={`w-2 h-2 rounded-full ${meta.cor}`} />
              <span>{meta.label}: {meta.valor}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
