import { Bed as BedIcon, Users, AlertTriangle, CheckCircle } from 'lucide-react';

interface OccupancySummaryProps {
  occupied: number;
  total: number;
}

export function OccupancySummary({ occupied, total }: OccupancySummaryProps) {
  const available = total - occupied;
  const occupancyRate = total > 0 ? Math.round((occupied / total) * 100) : 0;

  const getOccupancyColor = () => {
    if (occupancyRate >= 90) return 'text-destructive';
    if (occupancyRate >= 70) return 'text-hospital-amber';
    return 'text-hospital-green';
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-card rounded-lg border p-4 flex items-center gap-4">
        <div className="p-3 rounded-xl bg-primary/10">
          <BedIcon className="w-6 h-6 text-primary" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Total de Leitos</p>
          <p className="text-2xl font-bold text-foreground">{total}</p>
        </div>
      </div>

      <div className="bg-card rounded-lg border p-4 flex items-center gap-4">
        <div className="p-3 rounded-xl bg-hospital-green/10">
          <Users className="w-6 h-6 text-hospital-green" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Ocupados</p>
          <p className="text-2xl font-bold text-hospital-green">{occupied}</p>
        </div>
      </div>

      <div className="bg-card rounded-lg border p-4 flex items-center gap-4">
        <div className="p-3 rounded-xl bg-muted">
          <CheckCircle className="w-6 h-6 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Disponíveis</p>
          <p className="text-2xl font-bold text-foreground">{available}</p>
        </div>
      </div>

      <div className="bg-card rounded-lg border p-4 flex items-center gap-4">
        <div className={`p-3 rounded-xl ${
          occupancyRate >= 90 ? 'bg-destructive/10' : 
          occupancyRate >= 70 ? 'bg-hospital-amber/10' : 'bg-hospital-green/10'
        }`}>
          <AlertTriangle className={`w-6 h-6 ${getOccupancyColor()}`} />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Taxa de Ocupação</p>
          <p className={`text-2xl font-bold ${getOccupancyColor()}`}>{occupancyRate}%</p>
        </div>
      </div>
    </div>
  );
}
