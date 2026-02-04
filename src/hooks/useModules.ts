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
  } = useUserRole();

  // Memoized module access checks
  const moduleAccess = useMemo(() => ({
    dashboard: true, // Everyone can access dashboard
    nir: isAdmin || isNir,
    faturamento: isAdmin || isFaturamento,
    mapaLeitos: isAdmin || isNir,
    enfermagem: isAdmin || isGestor,
    laboratorio: isAdmin || isLaboratorio,
    restaurante: isAdmin || isRestaurante,
    rhdp: isAdmin || isRHDP,
    assistenciaSocial: isAdmin || isAssistenciaSocial,
    qualidade: isAdmin || isQualidade,
    recepcao: isAdmin || isRecepcao,
    tecnicoTI: isAdmin || isTI,
    tecnicoManutencao: isAdmin || isManutencao,
    tecnicoEngenharia: isAdmin || isEngenhariaCinica,
    admin: isAdmin,
    logs: isAdmin,
    agenda: true,
    equipe: isAdmin || isGestor,
    chat: true,
    abrirChamado: true,
  }), [
    isAdmin, isGestor, isTI, isManutencao, isEngenhariaCinica,
    isLaboratorio, isNir, isRecepcao, isFaturamento, isRHDP,
    isRestaurante, isAssistenciaSocial, isQualidade
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
