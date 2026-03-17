/**
 * Gestrategic — RBAC Module Guard
 * Componente que valida permissão de acesso antes de renderizar um módulo.
 * Usa a lógica centralizada do useModules para decisão.
 */

import { ReactNode } from "react";
import { useModules } from "@/hooks/useModules";
import { useUserRole } from "@/hooks/useUserRole";
import AccessDenied from "@/components/AccessDenied";
import { Loader2 } from "lucide-react";

interface ModuleGuardProps {
  moduleId: string;
  children: ReactNode;
  /** Se true, mostra "Acesso Negado" ao invés de ocultar */
  showDenied?: boolean;
  /** Permissão mínima: 'read' (visualizar) ou 'write' (modificar) */
  permission?: "read" | "write";
}

export const ModuleGuard = ({
  moduleId,
  children,
  showDenied = true,
  permission = "read",
}: ModuleGuardProps) => {
  const { isLoading } = useUserRole();
  const { canAccessModule } = useModules();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasAccess = canAccessModule(moduleId);

  if (!hasAccess) {
    if (showDenied) {
      return <AccessDenied onTryAgain={() => window.location.reload()} />;
    }
    return null;
  }

  return <>{children}</>;
};

export default ModuleGuard;
