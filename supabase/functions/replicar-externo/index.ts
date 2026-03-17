import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000; // 1s, 2s, 4s (exponencial)

interface ReplicationPayload {
  table: string;
  type: "INSERT" | "UPDATE" | "DELETE";
  record: Record<string, unknown> | null;
  old_record: Record<string, unknown> | null;
}

async function replicateWithRetry(
  extClient: ReturnType<typeof createClient>,
  payload: ReplicationPayload,
  internalClient: ReturnType<typeof createClient>
): Promise<{ success: boolean; error?: string }> {
  const { table, type, record, old_record } = payload;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      if (type === "DELETE") {
        if (!old_record?.id) {
          return { success: true }; // nada para deletar
        }
        const { error } = await extClient
          .from(table)
          .delete()
          .eq("id", old_record.id);
        if (error) throw error;
      } else {
        // INSERT ou UPDATE → upsert
        if (!record) return { success: true };
        const { error } = await extClient.from(table).upsert(record as any, {
          onConflict: "id",
          ignoreDuplicates: false,
        });
        if (error) throw error;
      }
      return { success: true };
    } catch (err: any) {
      console.error(
        `[replicar-externo] Tentativa ${attempt + 1}/${MAX_RETRIES} falhou para ${table}:`,
        err.message
      );

      if (attempt < MAX_RETRIES - 1) {
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay));
      } else {
        // Salvar na fila de retry para processamento posterior
        await enqueueRetry(internalClient, payload, err.message);
        return { success: false, error: err.message };
      }
    }
  }
  return { success: false, error: "Max retries exceeded" };
}

async function enqueueRetry(
  client: ReturnType<typeof createClient>,
  payload: ReplicationPayload,
  errorMsg: string
) {
  try {
    await client.from("replicacao_fila").insert({
      tabela: payload.table,
      operacao: payload.type,
      payload: payload.record || payload.old_record,
      erro: errorMsg,
      tentativas: MAX_RETRIES,
      status: "pendente",
    });
    console.log(`[replicar-externo] Enfileirado para retry: ${payload.table} ${payload.type}`);
  } catch (e: any) {
    console.error("[replicar-externo] Falha ao enfileirar:", e.message);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const extUrl = Deno.env.get("EXTERNAL_SUPABASE_URL");
    const extKey = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY");

    if (!extUrl || !extKey) {
      throw new Error("Credenciais do Supabase externo não configuradas");
    }

    const intUrl = Deno.env.get("SUPABASE_URL")!;
    const intKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const extClient = createClient(extUrl, extKey);
    const intClient = createClient(intUrl, intKey);

    const payload: ReplicationPayload = await req.json();
    console.log(`[replicar-externo] ${payload.type} em ${payload.table}`);

    const result = await replicateWithRetry(extClient, payload, intClient);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: result.success ? 200 : 500,
    });
  } catch (error: any) {
    console.error("[replicar-externo] Erro:", error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
