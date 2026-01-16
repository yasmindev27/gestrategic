import { useState } from 'react';
import { Sun, Moon, Calendar, Stethoscope, Users, UserCheck, Save, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ShiftInfo } from '@/types/bed';
import { toast } from 'sonner';

interface ShiftConfigProps {
  shiftInfo: ShiftInfo;
  onShiftInfoChange: (info: ShiftInfo) => void;
  onSave?: () => Promise<void>;
}

export function ShiftConfig({ shiftInfo, onShiftInfoChange, onSave }: ShiftConfigProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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

  return (
    <div className="bg-card rounded-lg border p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          Configuração do Plantão
        </h2>
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
