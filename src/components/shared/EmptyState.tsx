/**
 * 📭 ComponentesEmpty State Padronizados
 * Garante UX consistente quando não há dados
 */

import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  /** Ícone a ser exibido (Lucide React) */
  icon?: LucideIcon;
  /** Título da mensagem (ex: "Nenhuma pendência encontrada") */
  title: string;
  /** Descrição opcional (ex: "Aguarde novas atribuições...") */
  description?: string;
  /** Ação secundária (ex: "Recarregar", "Criar novo") */
  actionLabel?: string;
  /** Callback da ação */
  onAction?: () => void;
  /** Classname adicional */
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 py-12 px-4 text-center ${className}`}
    >
      {Icon && (
        <div className="rounded-full bg-gray-100 p-6 dark:bg-gray-800">
          <Icon className="h-8 w-8 text-gray-500 dark:text-gray-400" />
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </h3>
        {description && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {description}
          </p>
        )}
      </div>

      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          variant="outline"
          size="sm"
          className="mt-2"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

/**
 * Variante específica para pendências/tarefas vazias
 */
export function EmptyPendencies() {
  return (
    <EmptyState
      title="Nenhuma pendência encontrada"
      description="Todas as tarefas foram finalizadas para esta unidade"
      className="rounded-lg border border-dashed border-gray-200 dark:border-gray-700"
    />
  );
}

/**
 * Variante específica para dados vazios em tabelas/listas
 */
export function EmptyData({
  entityName = "dados",
  description,
}: {
  entityName?: string;
  description?: string;
}) {
  return (
    <EmptyState
      title={`Nenhum ${entityName} disponível`}
      description={description || `Não há registros de ${entityName} para exibir`}
      className="rounded-lg border border-dashed border-gray-200 dark:border-gray-700"
    />
  );
}

/**
 * Variante para pesquisas/filtros sem resultados
 */
export function EmptySearchResults({
  query,
  onClear,
}: {
  query: string;
  onClear?: () => void;
}) {
  return (
    <EmptyState
      title="Nenhum resultado encontrado"
      description={`Sua busca por "${query}" não retornou resultados. Tente outro termo ou filtro.`}
      actionLabel={onClear ? "Limpar filtros" : undefined}
      onAction={onClear}
      className="rounded-lg border border-dashed border-gray-200 dark:border-gray-700"
    />
  );
}
