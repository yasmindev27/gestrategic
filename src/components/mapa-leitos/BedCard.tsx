import { forwardRef, memo } from 'react';
import { User, AlertCircle } from 'lucide-react';
import { Bed } from '@/types/bed';

interface BedCardProps {
  bed: Bed;
  onClick: () => void;
}

export const BedCard = memo(forwardRef<HTMLDivElement, BedCardProps>(
  function BedCard({ bed, onClick }, ref) {
    const isOccupied = bed.patient !== null;
    const isExtra = typeof bed.number === 'string';

    const getCardClass = () => {
      if (isExtra && isOccupied) return 'border-2 border-hospital-amber bg-hospital-amber-light';
      if (isExtra) return 'border-2 border-hospital-amber/50 bg-muted/50';
      if (isOccupied) return 'border-2 border-hospital-green bg-hospital-green-light';
      return 'border-2 border-muted bg-muted/30';
    };

    const getBedLabel = () => {
      if (typeof bed.number === 'string') return bed.number;
      return String(bed.number).padStart(2, '0');
    };

    return (
      <div 
        ref={ref}
        className={`${getCardClass()} rounded-lg p-4 transition-all hover:shadow-md cursor-pointer`} 
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={`text-lg font-bold ${
              isOccupied ? 'text-hospital-green' : isExtra ? 'text-hospital-amber' : 'text-muted-foreground'
            }`}>
              LEITO {getBedLabel()}
            </span>
          </div>
          <div className={`p-2 rounded-lg ${
            isOccupied 
              ? 'bg-hospital-green/20 text-hospital-green' 
              : 'bg-muted text-muted-foreground'
          }`}>
            {isOccupied ? <User className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          </div>
        </div>

        {isOccupied && bed.patient ? (
          <div className="space-y-2">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Paciente</p>
              <p className="font-semibold text-foreground truncate">{bed.patient.nome}</p>
            </div>
            
            {bed.patient.hipoteseDiagnostica && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">HD</p>
                <p className="text-sm text-foreground line-clamp-2">{bed.patient.hipoteseDiagnostica}</p>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                bed.patient.susFacil === 'sim' 
                  ? 'bg-hospital-green/20 text-hospital-green' 
                  : 'bg-muted text-muted-foreground'
              }`}>
                SUS Fácil: {bed.patient.susFacil === 'sim' ? 'Sim' : bed.patient.susFacil === 'nao' ? 'Não' : '-'}
              </span>
            </div>
          </div>
        ) : (
          <div className="h-20 flex items-center justify-center">
            <p className="text-muted-foreground text-sm">Leito disponível</p>
          </div>
        )}
      </div>
    );
  }
));
