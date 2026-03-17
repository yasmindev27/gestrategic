/**
 * Gestrategic — Helpers centralizados para Supabase
 * Data fetching padronizado, paginação, auditoria automática.
 */

import { supabase } from "@/integrations/supabase/client";
import type { PaginatedResult } from "@/types/global";

// ─── Paginação recursiva (supera limite de 1000 do Supabase) ──────
export async function fetchAllRows<T>(
  tableName: string,
  options?: {
    select?: string;
    filters?: Array<{ column: string; op: "eq" | "in" | "gte" | "lte" | "ilike"; value: any }>;
    orderBy?: { column: string; ascending?: boolean };
    pageSize?: number;
  }
): Promise<T[]> {
  const pageSize = options?.pageSize ?? 1000;
  let allData: T[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from(tableName)
      .select(options?.select ?? "*")
      .range(from, from + pageSize - 1);

    if (options?.filters) {
      for (const f of options.filters) {
        switch (f.op) {
          case "eq": query = query.eq(f.column, f.value); break;
          case "in": query = query.in(f.column, f.value); break;
          case "gte": query = query.gte(f.column, f.value); break;
          case "lte": query = query.lte(f.column, f.value); break;
          case "ilike": query = query.ilike(f.column, f.value); break;
        }
      }
    }

    if (options?.orderBy) {
      query = query.order(options.orderBy.column, { ascending: options.orderBy.ascending ?? true });
    }

    const { data, error } = await query;
    if (error) throw error;

    allData = [...allData, ...(data as T[])];
    hasMore = (data?.length ?? 0) === pageSize;
    from += pageSize;
  }

  return allData;
}

// ─── Contagem exata (usando count: "exact") ───────────────────────
export async function fetchExactCount(
  tableName: string,
  filters?: Array<{ column: string; op: "eq" | "in" | "gte" | "lte"; value: any }>
): Promise<number> {
  let query = supabase
    .from(tableName)
    .select("*", { count: "exact", head: true });

  if (filters) {
    for (const f of filters) {
      switch (f.op) {
        case "eq": query = query.eq(f.column, f.value); break;
        case "in": query = query.in(f.column, f.value); break;
        case "gte": query = query.gte(f.column, f.value); break;
        case "lte": query = query.lte(f.column, f.value); break;
      }
    }
  }

  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

// ─── Log de auditoria centralizado ────────────────────────────────
export async function logAuditAction(
  acao: string,
  modulo: string,
  detalhes?: Record<string, unknown>
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("logs_acesso").insert({
      user_id: user.id,
      acao,
      modulo,
      detalhes: detalhes ?? null,
    });
  } catch (error) {
    console.error("[Audit] Erro ao registrar log:", error);
  }
}

// ─── Mutação com auditoria automática ─────────────────────────────
export async function mutateWithAudit<T>(options: {
  table: string;
  operation: "insert" | "update" | "delete";
  data?: Record<string, unknown>;
  match?: Record<string, unknown>;
  modulo: string;
  acao: string;
  detalhes?: Record<string, unknown>;
}): Promise<T | null> {
  const { table, operation, data, match, modulo, acao, detalhes } = options;

  let result: any = null;

  switch (operation) {
    case "insert": {
      const { data: inserted, error } = await supabase
        .from(table)
        .insert(data!)
        .select()
        .single();
      if (error) throw error;
      result = inserted;
      break;
    }
    case "update": {
      let query = supabase.from(table).update(data!);
      if (match) {
        for (const [key, value] of Object.entries(match)) {
          query = query.eq(key, value);
        }
      }
      const { data: updated, error } = await query.select().single();
      if (error) throw error;
      result = updated;
      break;
    }
    case "delete": {
      let query = supabase.from(table).delete();
      if (match) {
        for (const [key, value] of Object.entries(match)) {
          query = query.eq(key, value);
        }
      }
      const { error } = await query;
      if (error) throw error;
      break;
    }
  }

  // Log automático
  await logAuditAction(acao, modulo, {
    ...detalhes,
    operacao: operation,
    tabela: table,
  });

  return result as T | null;
}

// ─── Query keys centralizadas ─────────────────────────────────────
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
