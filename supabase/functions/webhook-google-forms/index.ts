import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("Webhook Google Forms recebido:", JSON.stringify(body));

    // Campos esperados do Google Forms:
    // email, mes_preenchimento, unidade_saude, paciente_nome, sexo, faixa_etaria, doenca_agravo
    const {
      email,
      mes_preenchimento,
      unidade_saude,
      paciente_nome,
      sexo,
      faixa_etaria,
      doenca_agravo,
    } = body;

    if (!doenca_agravo) {
      return new Response(
        JSON.stringify({ error: "Campo doenca_agravo é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Gerar número de notificação
    const now = new Date();
    const year = now.getFullYear();
    const seq = Date.now().toString().slice(-5);
    const numero = `EPI-${year}-${seq}`;

    const descricao = [
      `Sexo: ${sexo || "Não informado"}`,
      `Faixa etária: ${faixa_etaria || "Não informada"}`,
      `Mês: ${mes_preenchimento || "Não informado"}`,
      `Unidade: ${unidade_saude || "Não informada"}`,
    ].join(" | ");

    const { error } = await supabase
      .from("sciras_notificacoes_epidemiologicas")
      .insert({
        numero_notificacao: numero,
        tipo: "Notificação Compulsória",
        doenca_agravo: doenca_agravo,
        paciente_nome: paciente_nome || null,
        setor: unidade_saude || "Google Forms",
        descricao: descricao,
        notificador_id: "00000000-0000-0000-0000-000000000000",
        notificador_nome: email || "Google Forms",
        status: "pendente",
        notificado_vigilancia_municipal: false,
        notificado_anvisa: false,
      });

    if (error) {
      console.error("Erro ao inserir notificação:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, numero_notificacao: numero }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Erro no webhook:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno no webhook" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
