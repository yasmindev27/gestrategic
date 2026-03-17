import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/headers.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const internalClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claims, error: claimsErr } = await internalClient.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const { data: roles } = await createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )
      .from("user_roles")
      .select("role")
      .eq("user_id", claims.claims.sub)
      .eq("role", "admin");

    if (!roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // External DB credentials
    const extUrl = Deno.env.get("EXTERNAL_SUPABASE_URL");
    const extKey = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY");
    if (!extUrl || !extKey) {
      return new Response(
        JSON.stringify({ error: "External database credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { tables, mode = "full" } = body as {
      tables?: string[];
      mode?: "full" | "incremental";
    };

    const internalAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const externalAdmin = createClient(extUrl, extKey);

    // Get list of tables to sync
    let tablesToSync: string[] = [];

    if (tables && tables.length > 0) {
      tablesToSync = tables;
    } else {
      // Get all public tables
      const { data: tableList, error: tableErr } = await internalAdmin.rpc(
        "get_public_tables" as any
      ).catch(() => ({ data: null, error: { message: "RPC not found" } }));

      if (tableErr || !tableList) {
        // Fallback: hardcoded main tables
        tablesToSync = [
          "profiles", "user_roles", "prontuarios", "bed_records",
          "incidentes_nsp", "analises_incidentes", "acoes_incidentes",
          "chamados", "chamados_comentarios", "alertas_seguranca",
          "atestados", "banco_horas", "avaliacoes_desempenho",
          "avaliacoes_experiencia", "auditorias_qualidade",
          "auditorias_seguranca_paciente", "achados_auditoria",
          "agenda_items", "agenda_destinatarios",
          "assistencia_social_pacientes", "assistencia_social_atendimentos",
          "assistencia_social_documentos", "assistencia_social_encaminhamentos",
          "chat_conversas", "chat_mensagens", "chat_participantes",
          "nir_registros_producao", "nir_colaboradores",
          "saida_prontuarios", "avaliacoes_prontuarios",
          "cadastros_inconsistentes", "cardapios",
          "cargos", "setores", "colaboradores_restaurante",
          "registros_refeicoes", "escalas_laboratorio",
          "enfermagem_configuracoes", "escalas_enfermagem",
          "trocas_plantao", "extensoes_jornada",
          "passagem_plantao_sbar", "passagem_plantao_tec",
          "passagem_plantao_social",
          "checklist_sinais_vitais", "checklist_limpeza_concorrente",
          "checklist_carrinho_urgencia", "checklist_carrinho_internacao",
          "checklist_fluxometros_bombas", "checklist_uti_movel",
          "checklist_geral_nsp", "checklist_setor_urgencia",
          "controle_sinais_vitais_oxigenio",
          "diagnostico_prescricao_enfermagem",
          "classificacao_risco", "protocolo_atendimentos",
          "protocolo_sepse_adulto", "protocolo_sepse_pediatrico",
          "protocolo_dor_toracica",
          "susfacil_registros", "transferencias_nir",
          "indicadores_nsp", "indicadores_upa",
          "produtos", "movimentacoes_estoque",
          "ativos", "ativos_disponibilidade", "manutencoes",
          "rouparia_itens", "rouparia_movimentacoes",
          "lms_treinamentos", "lms_inscricoes", "lms_presencas",
          "lms_quiz_perguntas", "lms_quiz_respostas",
          "formularios", "formulario_perguntas", "formulario_respostas",
          "disc_results", "logs_auditoria",
          "asos_seguranca", "epis_registros",
          "notificacoes_seguranca_trabalho", "rondas_seguranca_trabalho",
          "uniformes_registros", "vacinas_registros",
          "rondas_patrimoniais", "visitantes", "gestao_conflitos",
          "mapa_danos", "passagem_plantao_seguranca",
          "sciras_vigilancia_iras", "sciras_culturas",
          "sciras_antimicrobianos", "sciras_notificacoes_epidemiologicas",
          "controle_vigencia", "daily_statistics",
          "cafe_litro_diario", "auditoria_temporalidade",
        ];
      } else {
        tablesToSync = (tableList as any[]).map((t: any) => t.table_name);
      }
    }

    const results: Record<string, { synced: number; errors: string[] }> = {};
    let totalSynced = 0;
    let totalErrors = 0;

    for (const table of tablesToSync) {
      const tableResult = { synced: 0, errors: [] as string[] };

      try {
        // Fetch all data from internal table (paginated)
        let allRows: any[] = [];
        let offset = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
          const { data: rows, error: fetchErr } = await internalAdmin
            .from(table)
            .select("*")
            .range(offset, offset + pageSize - 1);

          if (fetchErr) {
            tableResult.errors.push(`Fetch error: ${fetchErr.message}`);
            hasMore = false;
            break;
          }

          if (rows && rows.length > 0) {
            allRows = allRows.concat(rows);
            offset += pageSize;
            hasMore = rows.length === pageSize;
          } else {
            hasMore = false;
          }
        }

        if (allRows.length === 0) {
          tableResult.synced = 0;
          results[table] = tableResult;
          continue;
        }

        // Upsert in batches of 500
        const batchSize = 500;
        for (let i = 0; i < allRows.length; i += batchSize) {
          const batch = allRows.slice(i, i + batchSize);

          const { error: upsertErr } = await externalAdmin
            .from(table)
            .upsert(batch, { onConflict: "id", ignoreDuplicates: false });

          if (upsertErr) {
            tableResult.errors.push(
              `Upsert batch ${Math.floor(i / batchSize) + 1}: ${upsertErr.message}`
            );
            totalErrors++;
          } else {
            tableResult.synced += batch.length;
            totalSynced += batch.length;
          }
        }
      } catch (err) {
        tableResult.errors.push(`Exception: ${(err as Error).message}`);
        totalErrors++;
      }

      results[table] = tableResult;
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          tables_processed: tablesToSync.length,
          total_rows_synced: totalSynced,
          tables_with_errors: totalErrors,
        },
        details: results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Sync error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
