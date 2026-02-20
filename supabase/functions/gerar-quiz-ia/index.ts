import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Cache-Control": "no-store, no-cache, must-revalidate",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { tema, objetivo, tipo_treinamento } = await req.json();

    if (!tema) {
      return new Response(JSON.stringify({ error: "Tema é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("Serviço de IA não configurado no ambiente");
      return new Response(
        JSON.stringify({ error: "Serviço de geração de quiz temporariamente indisponível" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `Você é um especialista em educação corporativa hospitalar e saúde. 
Gere exatamente 15 perguntas de múltipla escolha (A, B, C, D) sobre o tema fornecido.
As perguntas devem ser relevantes para o contexto de uma UPA 24h / unidade de saúde.
Varie a dificuldade: 5 fáceis, 5 médias e 5 difíceis.
Cada pergunta deve ter exatamente 4 alternativas e uma resposta correta.`;

    const userPrompt = `Gere 15 perguntas de múltipla escolha sobre o seguinte treinamento:
- Tema: ${tema}
${objetivo ? `- Objetivo: ${objetivo}` : ""}
${tipo_treinamento ? `- Tipo: ${tipo_treinamento}` : ""}

Use a ferramenta generate_quiz para retornar as perguntas.`;

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
              name: "generate_quiz",
              description: "Gera uma lista de perguntas de quiz de múltipla escolha.",
              parameters: {
                type: "object",
                properties: {
                  perguntas: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        pergunta: { type: "string", description: "Texto da pergunta" },
                        opcao_a: { type: "string", description: "Alternativa A" },
                        opcao_b: { type: "string", description: "Alternativa B" },
                        opcao_c: { type: "string", description: "Alternativa C" },
                        opcao_d: { type: "string", description: "Alternativa D" },
                        resposta_correta: {
                          type: "string",
                          enum: ["a", "b", "c", "d"],
                          description: "Letra da alternativa correta (minúscula)",
                        },
                      },
                      required: ["pergunta", "opcao_a", "opcao_b", "opcao_c", "opcao_d", "resposta_correta"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["perguntas"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_quiz" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns instantes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("No tool call response from AI");
    }

    const parsed = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ perguntas: parsed.perguntas }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("gerar-quiz-ia error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
