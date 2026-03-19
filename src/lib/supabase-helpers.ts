import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

type TableName = keyof Database["public"]["Tables"];

export async function logAuditAction(
  acao: string,
  modulo: string,
  detalhes?: Record<string, unknown>
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await (supabase.from("logs_acesso") as any).insert({
      user_id: user.id,
      acao,
      modulo,
      detalhes: (detalhes as Record<string, unknown>) ?? null,
    });
  } catch (error) {
    // Audit logging failure silently in production
  }
}

export async function fetchExactCount(
  table: ReturnType<typeof supabase.from>,
): Promise<number> {
  // Caller should pass supabase.from("table").select("*", { count: "exact", head: true })
  // This is a helper pattern - actual usage inline in hooks is preferred
  return 0;
}

export const queryKeys = {
  chamados: {
    all: ["chamados"] as const,
    list: (filters?: Record<string, any>) => ["chamados", "list", filters] as const,
    detail: (id: string) => ["chamados", "detail", id] as const,
    stats: (period?: string) => ["chamados", "stats", period] as const,
  },
  beds: {
    all: ["beds"] as const,
    byShift: (date: string, shift: string) => ["beds", date, shift] as const,
    records: (date: string, sector: string) => ["beds", "records", date, sector] as const,
  },
  profiles: {
    all: ["profiles"] as const,
    current: ["profiles", "current"] as const,
    byId: (id: string) => ["profiles", id] as const,
  },
  agenda: {
    all: ["agenda"] as const,
    items: (userId?: string) => ["agenda", "items", userId] as const,
  },
  escalas: {
    all: ["escalas"] as const,
    byMonth: (month: number, year: number) => ["escalas", month, year] as const,
  },
  incidentes: {
    all: ["incidentes"] as const,
    detail: (id: string) => ["incidentes", id] as const,
  },
  restaurante: {
    colaboradores: ["restaurante", "colaboradores"] as const,
    refeicoes: (date: string) => ["restaurante", "refeicoes", date] as const,
  },
  rouparia: {
    itens: ["rouparia", "itens"] as const,
    movimentacoes: ["rouparia", "movimentacoes"] as const,
  },
} as const;
