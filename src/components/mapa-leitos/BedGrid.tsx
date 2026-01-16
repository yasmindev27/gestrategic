import { forwardRef, memo } from 'react';
import { Bed, Sector, SECTORS } from '@/types/bed';
import { BedCard } from './BedCard';

interface BedGridProps {
  sector: Sector;
  beds: Bed[];
  onBedClick: (bed: Bed) => void;
}

export const BedGrid = memo(forwardRef<HTMLDivElement, BedGridProps>(
  function BedGrid({ sector, beds, onBedClick }, ref) {
    const sectorConfig = SECTORS.find((s) => s.id === sector);
    const sectorName = sectorConfig?.name || sector;

    const sectorBeds = beds.filter((bed) => bed.sector === sector);

    return (
      <div ref={ref} className="bg-card rounded-lg border p-6 animate-in fade-in duration-300">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-foreground">{sectorName}</h3>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-hospital-green"></div>
              <span className="text-muted-foreground">Ocupado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-muted-foreground/30"></div>
              <span className="text-muted-foreground">Disponível</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-hospital-amber"></div>
              <span className="text-muted-foreground">Extra</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sectorBeds.map((bed) => (
            <BedCard key={bed.id} bed={bed} onClick={() => onBedClick(bed)} />
          ))}
        </div>
      </div>
    );
  }
));
