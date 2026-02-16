import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Cache-Control": "no-store, no-cache, must-revalidate",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { transcricao, titulo } = await req.json();

    if (!transcricao || transcricao.trim().length < 10) {
      return new Response(JSON.stringify({ error: "Transcrição insuficiente para gerar ata." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `Você é um assistente especializado em gerar atas de reuniões institucionais em português brasileiro.
Analise a transcrição fornecida e retorne EXCLUSIVAMENTE uma chamada de ferramenta com os dados estruturados.
Seja objetivo e profissional. Se a transcrição for curta ou incompleta, faça o melhor possível com o conteúdo disponível.`;

    const userPrompt = `Reunião: "${titulo || "Sem título"}"

Transcrição:
${transcricao}

Gere a ata estruturada desta reunião.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "gerar_ata",
              description: "Gera a ata estruturada de uma reunião",
              parameters: {
                type: "object",
                properties: {
                  resumo_executivo: { type: "string", description: "Resumo executivo da reunião em 2-4 parágrafos" },
                  decisoes_tomadas: {
                    type: "array",
                    items: { type: "string" },
                    description: "Lista de decisões tomadas na reunião",
                  },
                  plano_acao: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        tarefa: { type: "string" },
                        responsavel: { type: "string" },
                        prazo: { type: "string" },
                      },
                      required: ["tarefa", "responsavel", "prazo"],
                    },
                    description: "Plano de ação com tarefas, responsáveis e prazos",
                  },
                },
                required: ["resumo_executivo", "decisoes_tomadas", "plano_acao"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "gerar_ata" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes para IA." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI error:", response.status, text);
      throw new Error("Falha na geração da ata");
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      throw new Error("Resposta da IA não contém dados estruturados");
    }

    const ata = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ ata }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
