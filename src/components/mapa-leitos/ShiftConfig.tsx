import { useState, useEffect } from 'react';
import { Sun, Moon, Calendar, Stethoscope, Users, UserCheck, Save, Check, History, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ShiftInfo } from '@/types/bed';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ShiftConfigProps {
  shiftInfo: ShiftInfo;
  onShiftInfoChange: (info: ShiftInfo) => void;
  onSave?: () => Promise<void>;
}

interface SavedShift {
  id: string;
  shift_date: string;
  shift_type: string;
  medicos: string | null;
  enfermeiros: string | null;
  regulador_nir: string | null;
  created_at: string;
}

export function ShiftConfig({ shiftInfo, onShiftInfoChange, onSave }: ShiftConfigProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedShifts, setSavedShifts] = useState<SavedShift[]>([]);
  const [isLoadingShifts, setIsLoadingShifts] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleChange = (field: keyof ShiftInfo, value: string) => {
    setSaved(false);
    onShiftInfoChange({ ...shiftInfo, [field]: value });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (onSave) {
        await onSave();
      }
      setSaved(true);
      toast.success('Configuração do plantão salva com sucesso!');
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      toast.error('Erro ao salvar configuração');
    } finally {
      setIsSaving(false);
    }
  };

  const loadSavedShifts = async () => {
    setIsLoadingShifts(true);
    try {
      const { data, error } = await supabase
        .from('shift_configurations')
        .select('*')
        .order('shift_date', { ascending: false })
        .order('shift_type', { ascending: true })
        .limit(50);

      if (error) throw error;
      setSavedShifts(data || []);
    } catch (error) {
      toast.error('Erro ao carregar plantões salvos');
    } finally {
      setIsLoadingShifts(false);
    }
  };

  const handleSelectShift = (shift: SavedShift) => {
    onShiftInfoChange({
      tipo: shift.shift_type as 'diurno' | 'noturno',
      data: shift.shift_date,
      medicos: shift.medicos || '',
      enfermeiros: shift.enfermeiros || '',
      reguladorNIR: shift.regulador_nir || '',
    });
    setDialogOpen(false);
    toast.success(`Plantão de ${format(new Date(shift.shift_date + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR })} carregado`);
  };

  return (
    <div className="bg-card rounded-lg border p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          Configuração do Plantão
        </h2>
        <div className="flex items-center gap-2">
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (open) loadSavedShifts();
          }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <History className="w-4 h-4" />
                Plantões Salvos
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <History className="w-5 h-5 text-primary" />
                  Plantões Salvos
                </DialogTitle>
              </DialogHeader>
              {isLoadingShifts ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : savedShifts.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhum plantão salvo encontrado.</p>
              ) : (
                <div className="space-y-2">
                  {savedShifts.map((shift) => (
                    <button
                      key={shift.id}
                      onClick={() => handleSelectShift(shift)}
                      className="w-full text-left rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {shift.shift_type === 'diurno' ? (
                            <Sun className="w-4 h-4 text-amber-500" />
                          ) : (
                            <Moon className="w-4 h-4 text-indigo-500" />
                          )}
                          <span className="font-semibold">
                            {format(new Date(shift.shift_date + 'T12:00:00'), "dd/MM/yyyy (EEEE)", { locale: ptBR })}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {shift.shift_type === 'diurno' ? 'Diurno' : 'Noturno'}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-1 text-xs text-muted-foreground">
                        {shift.regulador_nir && (
                          <p><span className="font-medium">Regulador:</span> {shift.regulador_nir}</p>
                        )}
                        {shift.medicos && (
                          <p className="truncate"><span className="font-medium">Médicos:</span> {shift.medicos}</p>
                        )}
                        {shift.enfermeiros && (
                          <p className="truncate"><span className="font-medium">Enfermeiros:</span> {shift.enfermeiros}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </DialogContent>
          </Dialog>

          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            className="gap-2"
            variant={saved ? "outline" : "default"}
          >
            {isSaving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
            ) : saved ? (
              <Check className="w-4 h-4 text-hospital-green" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saved ? 'Salvo' : 'Salvar Plantão'}
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Tipo de Plantão</Label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleChange('tipo', 'diurno')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all duration-200 ${
                shiftInfo.tipo === 'diurno'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-muted bg-muted/30 text-muted-foreground hover:border-primary/50'
              }`}
            >
              <Sun className="w-5 h-5" />
              <span className="font-medium">Diurno</span>
            </button>
            <button
              type="button"
              onClick={() => handleChange('tipo', 'noturno')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all duration-200 ${
                shiftInfo.tipo === 'noturno'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-muted bg-muted/30 text-muted-foreground hover:border-primary/50'
              }`}
            >
              <Moon className="w-5 h-5" />
              <span className="font-medium">Noturno</span>
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="data" className="text-sm font-medium flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Data do Plantão
          </Label>
          <Input
            id="data"
            type="date"
            value={shiftInfo.data}
            onChange={(e) => handleChange('data', e.target.value)}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="reguladorNIR" className="text-sm font-medium flex items-center gap-2">
            <UserCheck className="w-4 h-4" />
            Regulador NIR
          </Label>
          <Input
            id="reguladorNIR"
            value={shiftInfo.reguladorNIR}
            onChange={(e) => handleChange('reguladorNIR', e.target.value)}
            placeholder="Nome do regulador"
          />
        </div>

        <div className="space-y-2 md:col-span-2 lg:col-span-1">
          <Label htmlFor="medicos" className="text-sm font-medium flex items-center gap-2">
            <Stethoscope className="w-4 h-4" />
            Médicos
          </Label>
          <Textarea
            id="medicos"
            value={shiftInfo.medicos}
            onChange={(e) => handleChange('medicos', e.target.value)}
            placeholder="Nomes dos médicos de plantão"
            rows={2}
          />
        </div>

        <div className="space-y-2 md:col-span-2 lg:col-span-2">
          <Label htmlFor="enfermeiros" className="text-sm font-medium flex items-center gap-2">
            <Users className="w-4 h-4" />
            Enfermeiros
          </Label>
          <Textarea
            id="enfermeiros"
            value={shiftInfo.enfermeiros}
            onChange={(e) => handleChange('enfermeiros', e.target.value)}
            placeholder="Nomes dos enfermeiros de plantão"
            rows={2}
          />
        </div>
      </div>
    </div>
  );
}
