import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ShiftInfo } from '@/types/bed';

function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function detectCurrentShift(): { tipo: 'diurno' | 'noturno'; data: string } {
  // Brasília = UTC-3
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const brasiliaTime = new Date(utcMs - 3 * 3600000);
  const hour = brasiliaTime.getHours();

  // Diurno: 07:00–18:59  |  Noturno: 19:00–06:59
  const isNoturno = hour >= 19 || hour < 7;

  // For noturno between 00:00-06:59, the shift_date is the previous day (when the shift started at 19h)
  let shiftDate: Date;
  if (isNoturno && hour < 7) {
    shiftDate = new Date(brasiliaTime);
    shiftDate.setDate(shiftDate.getDate() - 1);
  } else {
    shiftDate = brasiliaTime;
  }

  const data = formatLocalDate(shiftDate);
  return { tipo: isNoturno ? 'noturno' : 'diurno', data };
}

export function useShiftConfig(initialDate?: string) {
  const detected = detectCurrentShift();
  const [shiftInfo, setShiftInfo] = useState<ShiftInfo>({
    tipo: detected.tipo,
    data: initialDate || detected.data,
    medicos: '',
    enfermeiros: '',
    reguladorNIR: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const previousShiftTypeRef = useRef<string>(shiftInfo.tipo);
  const previousDateRef = useRef<string>(shiftInfo.data);
  const isSavingRef = useRef(false);

  const loadShiftConfig = useCallback(async (date: string, shiftType: 'diurno' | 'noturno') => {
    const { data, error } = await supabase
      .from('shift_configurations')
      .select('*')
      .eq('shift_date', date)
      .eq('shift_type', shiftType)
      .maybeSingle();

    if (error) {
      console.error('Error loading shift config:', error);
      return null;
    }

    return data;
  }, []);

  const saveShiftConfig = useCallback(async (info?: ShiftInfo) => {
    const configToSave = info || shiftInfo;
    
    if (isSavingRef.current) return;
    
    isSavingRef.current = true;
    const { error } = await supabase.from('shift_configurations').upsert({
      shift_date: configToSave.data,
      shift_type: configToSave.tipo,
      medicos: configToSave.medicos,
      enfermeiros: configToSave.enfermeiros,
      regulador_nir: configToSave.reguladorNIR,
    }, {
      onConflict: 'shift_date,shift_type'
    });

    // Check if there's a pending passagem (no assunção yet) and fill it
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && configToSave.reguladorNIR) {
        const { data: pendingPassagem } = await supabase
          .from('passagem_plantao')
          .select('id, data_hora_conclusao')
          .eq('shift_date', configToSave.data)
          .eq('shift_type', configToSave.tipo)
          .is('data_hora_assuncao', null)
          .limit(1)
          .maybeSingle();

        if (pendingPassagem) {
          const now = new Date();
          const conclusao = new Date(pendingPassagem.data_hora_conclusao);
          const tempoMinutos = (now.getTime() - conclusao.getTime()) / 60000;

          await supabase.from('passagem_plantao').update({
            colaborador_entrada_id: user.id,
            colaborador_entrada_nome: configToSave.reguladorNIR,
            data_hora_assuncao: now.toISOString(),
            tempo_troca_minutos: Math.round(tempoMinutos * 100) / 100,
          }).eq('id', pendingPassagem.id);
        }
      }
    } catch { /* non-critical */ }

    isSavingRef.current = false;

    if (error) {
      console.error('Error saving shift config:', error);
      throw error;
    }
  }, [shiftInfo]);

  useEffect(() => {
    const needsReload = 
      previousShiftTypeRef.current !== shiftInfo.tipo || 
      previousDateRef.current !== shiftInfo.data;

    if (!needsReload && !isLoading) {
      return;
    }

    const loadConfig = async () => {
      setIsLoading(true);
      const config = await loadShiftConfig(shiftInfo.data, shiftInfo.tipo);
      
      if (config) {
        setShiftInfo(prev => ({
          ...prev,
          medicos: config.medicos || '',
          enfermeiros: config.enfermeiros || '',
          reguladorNIR: config.regulador_nir || '',
        }));
      } else {
        // Auto-fill regulador with logged-in user's name
        let userName = '';
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            userName = user.user_metadata?.full_name || user.email?.split('@')[0] || '';
          }
        } catch {}
        setShiftInfo(prev => ({
          ...prev,
          medicos: '',
          enfermeiros: '',
          reguladorNIR: userName,
        }));
      }
      
      previousShiftTypeRef.current = shiftInfo.tipo;
      previousDateRef.current = shiftInfo.data;
      setIsLoading(false);
    };

    loadConfig();
  }, [shiftInfo.tipo, shiftInfo.data, loadShiftConfig, isLoading]);

  const updateShiftInfo = useCallback((updates: Partial<ShiftInfo>) => {
    setShiftInfo(prev => ({ ...prev, ...updates }));
  }, []);

  return {
    shiftInfo,
    isLoading,
    updateShiftInfo,
    saveShiftConfig,
  };
}
