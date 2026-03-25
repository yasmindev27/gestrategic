/**
 * 📅 Formatadores de Data Padronizados para GEStrategic
 * Garante consistência em todas as exibições de data do sistema
 * Formato padrão: DD/MM/YYYY HH:mm
 */

import { format, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Formata data/hora completa (DD/MM/YYYY HH:mm)
 */
export const formatDateTime = (date: Date | string | null | undefined): string => {
  if (!date) return "-";
  
  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    if (!isValid(dateObj)) return "-";
    
    return format(dateObj, "dd/MM/yyyy HH:mm", { locale: ptBR });
  } catch {
    return "-";
  }
};

/**
 * Formata apenas a data (DD/MM/YYYY)
 */
export const formatDate = (date: Date | string | null | undefined): string => {
  if (!date) return "-";
  
  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    if (!isValid(dateObj)) return "-";
    
    return format(dateObj, "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return "-";
  }
};

/**
 * Formata apenas a hora (HH:mm)
 */
export const formatTime = (date: Date | string | null | undefined): string => {
  if (!date) return "-";
  
  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    if (!isValid(dateObj)) return "-";
    
    return format(dateObj, "HH:mm", { locale: ptBR });
  } catch {
    return "-";
  }
};

/**
 * Formata data e hora com descrição relativa (ex: "hoje às 14:30")
 */
export const formatDateTimeRelative = (
  date: Date | string | null | undefined
): string => {
  if (!date) return "-";
  
  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    if (!isValid(dateObj)) return "-";
    
    return format(dateObj, "EEEE, dd 'de' MMMM 'às' HH:mm", { locale: ptBR });
  } catch {
    return "-";
  }
};

/**
 * Formata apenas dia e mês (DD/MM)
 */
export const formatDateShort = (date: Date | string | null | undefined): string => {
  if (!date) return "-";
  
  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    if (!isValid(dateObj)) return "-";
    
    return format(dateObj, "dd/MM", { locale: ptBR });
  } catch {
    return "-";
  }
};

/**
 * Valida se uma string é uma data válida (ISO 8601)
 */
export const isValidDate = (dateString: string): boolean => {
  try {
    const dateObj = parseISO(dateString);
    return isValid(dateObj);
  } catch {
    return false;
  }
};
