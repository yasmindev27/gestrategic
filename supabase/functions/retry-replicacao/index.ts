import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_RETRIES = 5;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const extUrl = Deno.env.get("EXTERNAL_SUPABASE_URL")!;
    const extKey = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY")!;
    const intUrl = Deno.env.get("SUPABASE_URL")!;
    const intKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const extClient = createClient(extUrl, extKey);
    const intClient = createClient(intUrl, intKey);

    // Buscar itens pendentes na fila
    const { data: pendentes, error: fetchErr } = await intClient
      .from("replicacao_fila")
      .select("*")
      .eq("status", "pendente")
      .order("created_at", { ascending: true })
      .limit(50);

    if (fetchErr) throw fetchErr;
    if (!pendentes || pendentes.length === 0) {
      return new Response(
        JSON.stringify({ message: "Nenhum item pendente", processados: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let sucesso = 0;
    let falha = 0;

    for (const item of pendentes) {
      try {
        if (item.operacao === "DELETE") {
          const payload = item.payload as any;
          if (payload?.id) {
            const { error } = await extClient
              .from(item.tabela)
              .delete()
              .eq("id", payload.id);
            if (error) throw error;
          }
        } else {
          const { error } = await extClient
            .from(item.tabela)
            .upsert(item.payload as any, { onConflict: "id", ignoreDuplicates: false });
          if (error) throw error;
        }

        // Marcar como concluído
        await intClient
          .from("replicacao_fila")
          .update({ status: "concluido", processado_em: new Date().toISOString() })
          .eq("id", item.id);
        sucesso++;
      } catch (err: any) {
        const novasTentativas = (item.tentativas || 0) + 1;
        const novoStatus = novasTentativas >= MAX_RETRIES ? "falha_permanente" : "pendente";

        await intClient
          .from("replicacao_fila")
          .update({
            tentativas: novasTentativas,
            erro: err.message,
            status: novoStatus,
          })
          .eq("id", item.id);
        falha++;
      }
    }

    return new Response(
      JSON.stringify({ processados: pendentes.length, sucesso, falha }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[retry-replicacao]", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
