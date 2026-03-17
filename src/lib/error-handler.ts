/**
 * Gestrategic — Tratamento de erros global
 * Padroniza mensagens de erro para rede, permissão e validação.
 */

import { toast } from "@/hooks/use-toast";

interface SupabaseError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

/** Classificação do erro */
type ErrorType = "network" | "permission" | "validation" | "not_found" | "unknown";

function classifyError(error: unknown): { type: ErrorType; message: string } {
  if (!error) return { type: "unknown", message: "Erro desconhecido" };

  const msg = error instanceof Error ? error.message : String(error);
  const code = (error as SupabaseError)?.code;

  // Erros de rede
  if (msg.includes("Failed to fetch") || msg.includes("NetworkError") || msg.includes("ECONNREFUSED")) {
    return { type: "network", message: "Falha de conexão com o servidor. Verifique sua internet." };
  }

  // Erros de permissão / RLS
  if (code === "42501" || msg.includes("row-level security") || msg.includes("permission denied") || msg.includes("insufficient_privilege")) {
    return { type: "permission", message: "Você não tem permissão para esta ação." };
  }

  // Violação de constraint
  if (code === "23505") {
    return { type: "validation", message: "Este registro já existe (dado duplicado)." };
  }
  if (code === "23503") {
    return { type: "validation", message: "Registro referenciado não encontrado." };
  }
  if (code === "23502") {
    return { type: "validation", message: "Campo obrigatório não preenchido." };
  }

  // Not found
  if (msg.includes("PGRST116") || msg.includes("No rows")) {
    return { type: "not_found", message: "Registro não encontrado." };
  }

  return { type: "unknown", message: msg };
}

/** Toast de erro padronizado */
export function handleError(error: unknown, context?: string): void {
  const { type, message } = classifyError(error);

  const titles: Record<ErrorType, string> = {
    network: "Erro de conexão",
    permission: "Acesso negado",
    validation: "Erro de validação",
    not_found: "Não encontrado",
    unknown: "Erro",
  };

  toast({
    title: titles[type],
    description: context ? `${context}: ${message}` : message,
    variant: "destructive",
  });

  // Log para depuração
  console.error(`[${type.toUpperCase()}]${context ? ` ${context}:` : ""}`, error);
}

/** Toast de sucesso padronizado */
export function handleSuccess(message: string, description?: string): void {
  toast({
    title: message,
    description,
  });
}
