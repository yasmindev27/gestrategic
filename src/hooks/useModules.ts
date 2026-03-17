import { lazy, ComponentType, LazyExoticComponent } from "react";
import { useUserRole } from "./useUserRole";
import { useMemo } from "react";

// Types for module configuration
export interface ModuleConfig {
  id: string;
  label: string;
  component: LazyExoticComponent<ComponentType<any>> | ComponentType<any>;
  props?: Record<string, any>;
  requiresRoles?: string[];
  lazyLoaded?: boolean;
}

// Lazy loaded modules for better code splitting
const LazyModules = {
  EnfermagemModule: lazy(() => import("@/components/modules/EnfermagemModule")),
};

// Module registry with role-based access
export const useModules = () => {
  const {
    isAdmin,
    isGestor,
    isTI,
    isManutencao,
    isEngenhariaCinica,
    isLaboratorio,
    isNir,
    isRecepcao,
    isFaturamento,
    isRHDP,
    isRestaurante,
    isAssistenciaSocial,
    isQualidade,
    isMedicos,
    isEnfermagem,
    isSeguranca,
    isRouparia,
  } = useUserRole();

  // Memoized module access checks
  const moduleAccess = useMemo(() => ({
    dashboard: true, // Everyone can access dashboard
    nir: isAdmin || isNir,
    faturamento: isAdmin || isFaturamento || isRecepcao,
    mapaLeitos: isAdmin || isNir || isEnfermagem || isAssistenciaSocial,
    enfermagem: isAdmin || isGestor || isEnfermagem,
    laboratorio: isAdmin || isLaboratorio || isMedicos || isGestor,
    restaurante: isAdmin || isRestaurante,
    rhdp: isAdmin || isRHDP,
    assistenciaSocial: isAdmin || isAssistenciaSocial,
    qualidade: isAdmin || isQualidade,
    recepcao: isAdmin || isRecepcao,
    tecnicoTI: isAdmin || isTI,
    tecnicoManutencao: isAdmin || isManutencao,
    tecnicoEngenharia: isAdmin || isEngenhariaCinica,
    medicos: isAdmin || isMedicos,
    rouparia: isAdmin || isRouparia,
    admin: isAdmin,
    gerencia: isAdmin || isGestor,
    logs: isAdmin,
    agenda: true,
    equipe: isAdmin || isGestor,
    chat: true,
    abrirChamado: true,
    colaborador: true,
    lms: true,
    segurancaPatrimonial: isAdmin || isSeguranca,
    segurancaTrabalho: isAdmin || isSeguranca,
  }), [
    isAdmin, isGestor, isTI, isManutencao, isEngenhariaCinica,
    isLaboratorio, isNir, isRecepcao, isFaturamento, isRHDP,
    isRestaurante, isAssistenciaSocial, isQualidade, isMedicos, isEnfermagem,
    isSeguranca, isRouparia
  ]);

  const canAccessModule = (moduleId: string): boolean => {
    return moduleAccess[moduleId as keyof typeof moduleAccess] ?? false;
  };

  return {
    moduleAccess,
    canAccessModule,
    LazyModules,
  };
};

// Query keys for consistent caching
export const queryKeys = {
  chamados: {
    all: ['chamados'] as const,
    list: (filters?: Record<string, any>) => ['chamados', 'list', filters] as const,
    detail: (id: string) => ['chamados', 'detail', id] as const,
    stats: (period?: string) => ['chamados', 'stats', period] as const,
  },
  beds: {
    all: ['beds'] as const,
    byShift: (date: string, shift: string) => ['beds', date, shift] as const,
    records: (date: string, sector: string) => ['beds', 'records', date, sector] as const,
  },
  profiles: {
    all: ['profiles'] as const,
    current: ['profiles', 'current'] as const,
    byId: (id: string) => ['profiles', id] as const,
  },
  agenda: {
    all: ['agenda'] as const,
    items: (userId?: string) => ['agenda', 'items', userId] as const,
  },
  escalas: {
    all: ['escalas'] as const,
    byMonth: (month: number, year: number) => ['escalas', month, year] as const,
  },
} as const;

export default useModules;
