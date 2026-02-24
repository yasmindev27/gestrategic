import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

type TableName =
  | "refeicoes_registros"
  | "bed_records"
  | "enfermagem_escalas"
  | "chamados"
  | "incidentes_nsp"
  | "alertas_seguranca"
  | "agenda_items"
  | "daily_statistics"
  | "profiles"
  | "prontuarios"
  | "chat_mensagens"
  | "enfermagem_trocas"
  | "escalas_medicos"
  | "auditorias_qualidade"
  | "rouparia_movimentacoes";

/**
 * Hook centralizado de sincronização em tempo real.
 * Escuta mudanças nas tabelas especificadas e invalida
 * automaticamente as queries do React Query associadas.
 *
 * @param tables - Array de { table, queryKeys } indicando qual tabela
 *   escutar e quais queryKeys invalidar quando ela mudar.
 * @param enabled - Ativa/desativa a escuta (default: true).
 */
export const useRealtimeSync = (
  tables: readonly { readonly table: TableName; readonly queryKeys: readonly (readonly string[])[] }[],
  enabled = true
) => {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!enabled || tables.length === 0) return;

    const channelName = `realtime-sync-${tables.map((t) => t.table).join("-")}`;

    let channel = supabase.channel(channelName);

    tables.forEach(({ table, queryKeys }) => {
      channel = channel.on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table },
        () => {
          // Invalidar todas as queryKeys associadas a esta tabela
          queryKeys.forEach((key) => {
            queryClient.invalidateQueries({ queryKey: key });
          });
        }
      );
    });

    channel.subscribe();
    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [enabled, queryClient, tables]);
};

/**
 * Presets de sincronização por módulo — facilita a integração
 * sem precisar saber os nomes das queryKeys manualmente.
 */
export const REALTIME_PRESETS = {
  restaurante: [
    { table: "refeicoes_registros" as TableName, queryKeys: [["refeicoes"], ["registros-refeicoes"], ["relatorio-refeicoes"]] },
  ],
  mapaLeitos: [
    { table: "bed_records" as TableName, queryKeys: [["bed-records"], ["beds"], ["occupancy"]] },
  ],
  enfermagem: [
    { table: "enfermagem_escalas" as TableName, queryKeys: [["escalas"], ["enfermagem-escalas"]] },
    { table: "enfermagem_trocas" as TableName, queryKeys: [["trocas"], ["enfermagem-trocas"]] },
  ],
  chamados: [
    { table: "chamados" as TableName, queryKeys: [["chamados"], ["chamados-dashboard"]] },
  ],
  nir: [
    { table: "bed_records" as TableName, queryKeys: [["bed-records"], ["beds"]] },
    { table: "prontuarios" as TableName, queryKeys: [["prontuarios"], ["sus-facil"]] },
  ],
  qualidade: [
    { table: "incidentes_nsp" as TableName, queryKeys: [["incidentes"], ["indicadores-nsp"]] },
    { table: "auditorias_qualidade" as TableName, queryKeys: [["auditorias"]] },
  ],
  seguranca: [
    { table: "alertas_seguranca" as TableName, queryKeys: [["alertas-seguranca"]] },
  ],
  agenda: [
    { table: "agenda_items" as TableName, queryKeys: [["agenda"], ["agenda-items"], ["tarefas"]] },
  ],
  dashboard: [
    { table: "daily_statistics" as TableName, queryKeys: [["daily-statistics"], ["stats"]] },
    { table: "chamados" as TableName, queryKeys: [["chamados"]] },
    { table: "alertas_seguranca" as TableName, queryKeys: [["alertas-seguranca"]] },
    { table: "agenda_items" as TableName, queryKeys: [["agenda"], ["tarefas"]] },
  ],
  chat: [
    { table: "chat_mensagens" as TableName, queryKeys: [["chat-mensagens"], ["chat"]] },
  ],
  rh: [
    { table: "profiles" as TableName, queryKeys: [["profiles"], ["profissionais"], ["equipe"]] },
  ],
} as const;
