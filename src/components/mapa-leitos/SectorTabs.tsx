import { SECTORS, Sector } from '@/types/bed';
import { 
  Users, 
  User, 
  Baby, 
  Shield, 
  AlertCircle
} from 'lucide-react';

interface SectorTabsProps {
  activeSector: Sector;
  onSectorChange: (sector: Sector) => void;
  occupancyBySector: Record<Sector, { occupied: number; total: number }>;
}

const sectorIcons: Record<Sector, React.ReactNode> = {
  'enfermaria-masculina': <User className="w-4 h-4" />,
  'enfermaria-feminina': <Users className="w-4 h-4" />,
  'pediatria': <Baby className="w-4 h-4" />,
  'isolamento': <Shield className="w-4 h-4" />,
  'urgencia': <AlertCircle className="w-4 h-4" />,
};

export function SectorTabs({ activeSector, onSectorChange, occupancyBySector }: SectorTabsProps) {
  return (
    <div className="bg-card rounded-lg border p-4">
      <div className="flex flex-wrap gap-2">
        {SECTORS.map((sector) => {
          const isActive = activeSector === sector.id;
          const occupancy = occupancyBySector[sector.id];
          
          return (
            <button
              key={sector.id}
              onClick={() => onSectorChange(sector.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                isActive 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {sectorIcons[sector.id]}
              <span className="hidden sm:inline">{sector.name}</span>
              <span className="sm:hidden">{sector.name.split(' ')[0]}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                isActive 
                  ? 'bg-primary-foreground/20' 
                  : 'bg-background'
              }`}>
                {occupancy.occupied}/{occupancy.total}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
