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

    const systemPrompt = `Você é um secretário(a) executivo(a) especializado em redigir ATAS DE REUNIÃO completas e detalhadas em português brasileiro.

REGRAS OBRIGATÓRIAS:
1. NÃO RESUMA. Você deve registrar TODOS os pontos discutidos com o nível de detalhe em que foram falados. Se alguém explicou uma lógica de banco de dados, uma regra de negócio, um fluxo operacional — registre os detalhes técnicos, nomes de sistemas, campos, valores, etc.
2. RASTREABILIDADE: Sempre que possível, identifique QUEM disse ou propôs cada ponto (ex: "Fulano propôs que...", "Ciclano questionou se..."). Use os nomes que aparecem na transcrição.
3. PRESERVAR CONFLITOS E ALTERNATIVAS: Se houve discussão entre dois ou mais caminhos/opções, registre TODOS os caminhos considerados, os argumentos a favor e contra, e qual foi escolhido e por quê.
4. PENDÊNCIAS LITERAIS: Extraia CADA tarefa, compromisso ou pendência mencionada literalmente, sem reformular. Mantenha as palavras originais do falante quando possível.
5. O campo "registro_discussoes" deve conter a narrativa completa da reunião, organizada cronologicamente ou por tema, preservando o máximo de detalhes.
6. O campo "resumo_executivo" deve ser um parágrafo curto (3-5 linhas) apenas para referência rápida — os detalhes ficam em "registro_discussoes".`;

    const userPrompt = `Reunião: "${titulo || "Sem título"}"

Transcrição completa:
${transcricao}

Gere a ata detalhada desta reunião conforme as regras.`;

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
              description: "Gera a ata completa e detalhada de uma reunião",
              parameters: {
                type: "object",
                properties: {
                  resumo_executivo: {
                    type: "string",
                    description: "Parágrafo curto (3-5 linhas) com visão geral da reunião para referência rápida.",
                  },
                  registro_discussoes: {
                    type: "string",
                    description: "Narrativa COMPLETA e DETALHADA de tudo que foi discutido na reunião, organizada por tema ou cronologicamente. Inclua detalhes técnicos, regras de negócio, nomes de sistemas, valores, lógicas explicadas. Identifique quem falou o quê sempre que possível. Use parágrafos e marcadores para organizar. NÃO RESUMA — registre com riqueza de detalhes.",
                  },
                  conflitos_alternativas: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        tema: { type: "string", description: "O tema ou questão onde houve divergência ou alternativas" },
                        opcoes_consideradas: { type: "string", description: "As opções/caminhos que foram discutidos, com argumentos prós e contras" },
                        decisao_final: { type: "string", description: "Qual opção foi escolhida e por quê" },
                        proponentes: { type: "string", description: "Quem defendeu cada posição, se identificável" },
                      },
                      required: ["tema", "opcoes_consideradas", "decisao_final"],
                    },
                    description: "Pontos onde houve dúvida, divergência ou escolha entre alternativas. Registre o caminho descartado e o motivo.",
                  },
                  decisoes_tomadas: {
                    type: "array",
                    items: { type: "string" },
                    description: "Lista de todas as decisões tomadas na reunião, com detalhes suficientes para entender o contexto.",
                  },
                  pendencias: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        descricao: { type: "string", description: "A pendência/tarefa EXATAMENTE como foi mencionada, preservando as palavras originais" },
                        responsavel: { type: "string", description: "Quem ficou responsável" },
                        prazo: { type: "string", description: "Prazo mencionado ou 'A definir'" },
                      },
                      required: ["descricao", "responsavel", "prazo"],
                    },
                    description: "TODAS as tarefas, compromissos e pendências mencionados, extraídos literalmente da transcrição.",
                  },
                },
                required: ["resumo_executivo", "registro_discussoes", "conflitos_alternativas", "decisoes_tomadas", "pendencias"],
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

    const ataRaw = JSON.parse(toolCall.function.arguments);

    // Backwards-compatible: map pendencias -> plano_acao for legacy support
    const ata = {
      resumo_executivo: ataRaw.resumo_executivo || "",
      registro_discussoes: ataRaw.registro_discussoes || "",
      conflitos_alternativas: ataRaw.conflitos_alternativas || [],
      decisoes_tomadas: ataRaw.decisoes_tomadas || [],
      pendencias: (ataRaw.pendencias || []).map((p: any) => ({
        descricao: p.descricao || p.tarefa || "",
        responsavel: p.responsavel || "",
        prazo: p.prazo || "A definir",
      })),
      // Keep plano_acao for backwards compat with agenda feature
      plano_acao: (ataRaw.pendencias || []).map((p: any) => ({
        tarefa: p.descricao || p.tarefa || "",
        responsavel: p.responsavel || "",
        prazo: p.prazo || "A definir",
      })),
    };

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
