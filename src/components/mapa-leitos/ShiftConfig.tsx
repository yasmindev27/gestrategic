import { useState, useEffect, useMemo } from 'react';
import { Sun, Moon, Calendar, Stethoscope, Users, UserCheck, Save, Check, History, Loader2, Lock, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { ShiftInfo } from '@/types/bed';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ShiftConfigProps {
  shiftInfo: ShiftInfo;
  onShiftInfoChange: (info: ShiftInfo) => void;
  onSave?: () => Promise<void>;
  onConcluirPlantao?: (justificativa?: string) => Promise<void>;
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

function isTimeAllowed(shiftDate: string, shiftType: string): { allowed: boolean; reason: string } {
  const now = new Date();
  const today = format(now, 'yyyy-MM-dd');
  const currentHour = now.getHours();

  if (shiftDate !== today) {
    return { allowed: false, reason: 'Apenas o plantão do dia atual pode ser alterado.' };
  }

  if (shiftType === 'diurno' && (currentHour < 7 || currentHour >= 19)) {
    return { allowed: false, reason: 'O plantão diurno só pode ser alterado entre 07:00 e 19:00.' };
  }

  if (shiftType === 'noturno' && (currentHour >= 7 && currentHour < 19)) {
    return { allowed: false, reason: 'O plantão noturno só pode ser alterado entre 19:00 e 07:00.' };
  }

  return { allowed: true, reason: '' };
}

export function ShiftConfig({ shiftInfo, onShiftInfoChange, onSave, onConcluirPlantao }: ShiftConfigProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isConcluindo, setIsConcluindo] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedShifts, setSavedShifts] = useState<SavedShift[]>([]);
  const [isLoadingShifts, setIsLoadingShifts] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [concluirDialogOpen, setConcluirDialogOpen] = useState(false);
  const [justificativa, setJustificativa] = useState('');
  const [needsJustificativa, setNeedsJustificativa] = useState(false);

  // User permission state
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserName, setCurrentUserName] = useState('');
  const [originalRegulador, setOriginalRegulador] = useState<string | null>(null);
  const [shiftAlreadySaved, setShiftAlreadySaved] = useState(false);

  // Load current user info and role
  useEffect(() => {
    const loadUserInfo = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [profileRes, roleRes] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('user_id', user.id).single(),
        supabase.from('user_roles').select('role').eq('user_id', user.id),
      ]);

      if (profileRes.data) setCurrentUserName(profileRes.data.full_name || '');
      if (roleRes.data) {
        setIsAdmin(roleRes.data.some((r: any) => r.role === 'admin'));
      }
    };
    loadUserInfo();
  }, []);

  // Load original regulador when shift date/type changes
  useEffect(() => {
    const loadOriginalRegulador = async () => {
      if (!shiftInfo.data || !shiftInfo.tipo) return;

      const { data } = await supabase
        .from('shift_configurations')
        .select('regulador_nir')
        .eq('shift_date', shiftInfo.data)
        .eq('shift_type', shiftInfo.tipo)
        .limit(1)
        .maybeSingle();

      if (data) {
        setOriginalRegulador(data.regulador_nir);
        setShiftAlreadySaved(true);
      } else {
        setOriginalRegulador(null);
        setShiftAlreadySaved(false);
      }
    };
    loadOriginalRegulador();
  }, [shiftInfo.data, shiftInfo.tipo]);

  const timeCheck = useMemo(
    () => isTimeAllowed(shiftInfo.data, shiftInfo.tipo),
    [shiftInfo.data, shiftInfo.tipo]
  );

  // Permission: admin, original regulador, or "Blendon" can edit
  const userCanEdit = useMemo(() => {
    // If shift was never saved, anyone can create the first entry
    if (!shiftAlreadySaved) return true;

    // Admin always can edit (any day)
    if (isAdmin) return true;

    const now = new Date();
    const today = format(now, 'yyyy-MM-dd');
    const isToday = shiftInfo.data === today;

    // Blendon can edit only today's shift
    if (currentUserName && currentUserName.toLowerCase().includes('blendon') && isToday) return true;

    // Original regulador can edit
    if (originalRegulador && currentUserName && 
        originalRegulador.toLowerCase().trim() === currentUserName.toLowerCase().trim()) {
      return true;
    }

    return false;
  }, [shiftAlreadySaved, isAdmin, currentUserName, originalRegulador]);

  const editAllowed = timeCheck.allowed && userCanEdit;
  const blockReason = !timeCheck.allowed 
    ? timeCheck.reason 
    : !userCanEdit 
      ? 'Apenas o administrador, o regulador do plantão ou Blendon podem alterar este plantão.' 
      : '';

  const handleChange = (field: keyof ShiftInfo, value: string) => {
    if (field !== 'tipo' && field !== 'data' && !editAllowed) {
      toast.error(blockReason);
      return;
    }
    setSaved(false);
    onShiftInfoChange({ ...shiftInfo, [field]: value });
  };

  const handleSave = async () => {
    if (!editAllowed) {
      toast.error(blockReason);
      return;
    }
    setIsSaving(true);
    try {
      if (onSave) {
        await onSave();
      }
      setSaved(true);
      // Update original regulador after save
      setOriginalRegulador(shiftInfo.reguladorNIR);
      setShiftAlreadySaved(true);
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

  const isWithin15MinOfEnd = useMemo(() => {
    const now = new Date();
    const today = format(now, 'yyyy-MM-dd');
    if (shiftInfo.data !== today) return false;

    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    if (shiftInfo.tipo === 'diurno') {
      // Diurno ends at 19:00 (1140 min). 15 min before = 18:45 (1125 min)
      return currentMinutes >= 1125 && currentMinutes < 1140;
    } else {
      // Noturno ends at 07:00 (420 min). 15 min before = 06:45 (405 min)
      return currentMinutes >= 405 && currentMinutes < 420;
    }
  }, [shiftInfo.data, shiftInfo.tipo]);

  const handleConcluirClick = () => {
    if (isWithin15MinOfEnd) {
      setNeedsJustificativa(false);
    } else {
      setNeedsJustificativa(true);
    }
    setJustificativa('');
    setConcluirDialogOpen(true);
  };

  const handleConfirmConcluir = async () => {
    if (!onConcluirPlantao) return;
    setIsConcluindo(true);
    try {
      await onConcluirPlantao(needsJustificativa ? justificativa : undefined);
      setConcluirDialogOpen(false);
      toast.success('Plantão concluído! Dados transferidos para o próximo plantão.');
    } catch (error) {
      toast.error('Erro ao concluir plantão.');
    } finally {
      setIsConcluindo(false);
    }
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
            disabled={isSaving || !editAllowed}
            className="gap-2"
            variant={saved ? "outline" : "default"}
          >
            {isSaving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
            ) : !editAllowed ? (
              <Lock className="w-4 h-4" />
            ) : saved ? (
              <Check className="w-4 h-4 text-hospital-green" />
            ) : (
              <Save className="w-4 h-4" />
            )}
           {saved ? 'Salvo' : !editAllowed ? 'Bloqueado' : 'Salvar'}
          </Button>

          {onConcluirPlantao && editAllowed && (
            <Button
              onClick={handleConcluirClick}
              disabled={isConcluindo}
              variant="outline"
              className="gap-2 border-green-500 text-green-700 hover:bg-green-50"
            >
              {isConcluindo ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              Concluir Plantão
            </Button>
          )}
        </div>
      </div>

      {/* Dialog de justificativa para conclusão antecipada */}
      <Dialog open={concluirDialogOpen} onOpenChange={setConcluirDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {needsJustificativa ? 'Justificativa para conclusão antecipada' : 'Confirmar conclusão do plantão'}
            </DialogTitle>
          </DialogHeader>
          {needsJustificativa ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Faltam mais de 15 minutos para o fim do plantão. Por favor, informe o motivo da conclusão antecipada.
              </p>
              <Textarea
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                placeholder="Informe o motivo da conclusão antecipada..."
                rows={3}
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Ao concluir, os dados dos leitos serão transferidos para o próximo plantão. Deseja continuar?
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConcluirDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleConfirmConcluir}
              disabled={needsJustificativa && !justificativa.trim()}
            >
              Confirmar Conclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {!editAllowed && blockReason && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          <Lock className="w-4 h-4 shrink-0" />
          {blockReason}
        </div>
      )}
      
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
            disabled={!editAllowed}
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
            disabled={!editAllowed}
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
            disabled={!editAllowed}
          />
        </div>
      </div>
    </div>
  );
}
