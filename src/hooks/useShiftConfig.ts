import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ShiftInfo } from '@/types/bed';

export function useShiftConfig(initialDate?: string) {
  const [shiftInfo, setShiftInfo] = useState<ShiftInfo>({
    tipo: 'diurno',
    data: initialDate || new Date().toISOString().split('T')[0],
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
        setShiftInfo(prev => ({
          ...prev,
          medicos: '',
          enfermeiros: '',
          reguladorNIR: '',
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
