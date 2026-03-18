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
    const { transcricao, titulo, participantes, organizador, horario_inicio, horario_fim } = await req.json();

    if (!transcricao || transcricao.trim().length < 10) {
      return new Response(JSON.stringify({ error: "Transcrição insuficiente para gerar ata." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("Serviço de IA não configurado no ambiente");
      return new Response(
        JSON.stringify({ error: "Serviço de geração de ata temporariamente indisponível" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `Você é um secretário(a) executivo(a) institucional de um hospital/UPA, especializado em redigir ATAS DE REUNIÃO formais, completas e extremamente detalhadas em português brasileiro.

MODELO DE ATA A SEGUIR — sua ata DEVE ter esta estrutura e nível de detalhe:

1. ABERTURA — Contextualize como a reunião foi aberta, quem presidiu, e qual foi o objetivo geral.

2. REGISTRO DETALHADO DAS DISCUSSÕES — Esta é a seção mais importante. Organize por temas/tópicos usando numeração (2.1, 2.2, 2.3...). Para CADA tópico:
   - Descreva em detalhes o que foi discutido
   - Identifique QUEM disse/propôs cada ponto (use os nomes da transcrição)
   - Registre detalhes técnicos, nomes de sistemas, valores, regras de negócio mencionadas
   - Se houve análise de documentos/prontuários/casos, registre CADA caso individualmente com os achados específicos
   - Registre inconsistências, problemas e acertos encontrados
   - NÃO RESUMA — registre com a riqueza de detalhes que foi falada

3. PONTOS CRÍTICOS E ENCAMINHAMENTOS — Tabela com duas colunas: "Problema Identificado" e "Encaminhamento / Responsável". Liste TODOS os problemas discutidos com seus encaminhamentos específicos.

4. ENCERRAMENTO — Parágrafo formal de encerramento informando que os encaminhamentos ficam sob responsabilidade dos setores.

REGRAS OBRIGATÓRIAS:
- NÃO RESUMA. Registre TODOS os pontos com o nível de detalhe em que foram falados.
- RASTREABILIDADE: Identifique QUEM disse ou propôs cada ponto.
- PRESERVAR CONFLITOS: Se houve divergência, registre os dois lados e a conclusão.
- Use linguagem formal e impessoal (terceira pessoa).
- Organize cronologicamente ou por tema, usando numeração hierárquica (1, 1.1, 1.2, 2, 2.1...).`;

    const metadataContext = [
      participantes ? `Participantes: ${Array.isArray(participantes) ? participantes.join(', ') : participantes}` : '',
      organizador ? `Organizador: ${organizador}` : '',
      horario_inicio ? `Horário de início: ${horario_inicio}` : '',
      horario_fim ? `Horário de término: ${horario_fim}` : '',
    ].filter(Boolean).join('\n');

    const userPrompt = `Reunião: "${titulo || "Sem título"}"
${metadataContext ? `\n${metadataContext}\n` : ''}
Transcrição completa:
${transcricao}

Gere a ata completa e detalhada desta reunião conforme o modelo e regras estabelecidos.`;

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
              description: "Gera a ata completa e formal de uma reunião institucional",
              parameters: {
                type: "object",
                properties: {
                  resumo_executivo: {
                    type: "string",
                    description: "Parágrafo curto (3-5 linhas) com visão geral da reunião para referência rápida.",
                  },
                  abertura: {
                    type: "string",
                    description: "Texto formal de abertura da reunião: quem presidiu, objetivo, contexto inicial. 1-3 parágrafos.",
                  },
                  secoes_discussao: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        numero: { type: "string", description: "Numeração hierárquica da seção (ex: '2.1', '2.2', '3')" },
                        titulo: { type: "string", description: "Título descritivo da seção/tema" },
                        conteudo: { type: "string", description: "Texto DETALHADO com tudo que foi discutido neste tópico. Use marcadores (- ) para listar itens. Identifique quem falou. Registre detalhes técnicos, casos analisados, valores, regras de negócio. NÃO RESUMA." },
                      },
                      required: ["numero", "titulo", "conteudo"],
                    },
                    description: "Seções numeradas com o registro detalhado de todas as discussões, organizadas por tema. Esta é a parte mais importante — deve ser rica e completa.",
                  },
                  pontos_criticos: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        problema: { type: "string", description: "Descrição do problema ou ponto crítico identificado" },
                        encaminhamento: { type: "string", description: "Ação/encaminhamento definido e responsável" },
                      },
                      required: ["problema", "encaminhamento"],
                    },
                    description: "Tabela de pontos críticos com seus encaminhamentos/responsáveis.",
                  },
                  decisoes_tomadas: {
                    type: "array",
                    items: { type: "string" },
                    description: "Lista de todas as decisões formais tomadas na reunião.",
                  },
                  pendencias: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        descricao: { type: "string", description: "A pendência/tarefa como foi mencionada" },
                        responsavel: { type: "string", description: "Quem ficou responsável" },
                        prazo: { type: "string", description: "Prazo mencionado ou 'A definir'" },
                      },
                      required: ["descricao", "responsavel", "prazo"],
                    },
                    description: "Todas as tarefas, compromissos e pendências mencionados.",
                  },
                  encerramento: {
                    type: "string",
                    description: "Parágrafo formal de encerramento da reunião.",
                  },
                },
                required: ["resumo_executivo", "abertura", "secoes_discussao", "pontos_criticos", "decisoes_tomadas", "pendencias", "encerramento"],
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

    const ata = {
      resumo_executivo: ataRaw.resumo_executivo || "",
      abertura: ataRaw.abertura || "",
      secoes_discussao: (ataRaw.secoes_discussao || []).map((s: any) => ({
        numero: s.numero || "",
        titulo: s.titulo || "",
        conteudo: s.conteudo || "",
      })),
      pontos_criticos: (ataRaw.pontos_criticos || []).map((p: any) => ({
        problema: p.problema || "",
        encaminhamento: p.encaminhamento || "",
      })),
      decisoes_tomadas: ataRaw.decisoes_tomadas || [],
      pendencias: (ataRaw.pendencias || []).map((p: any) => ({
        descricao: p.descricao || p.tarefa || "",
        responsavel: p.responsavel || "",
        prazo: p.prazo || "A definir",
      })),
      encerramento: ataRaw.encerramento || "",
      // Keep plano_acao for backwards compat with agenda feature
      plano_acao: (ataRaw.pendencias || []).map((p: any) => ({
        tarefa: p.descricao || p.tarefa || "",
        responsavel: p.responsavel || "",
        prazo: p.prazo || "A definir",
      })),
      // Legacy compat
      registro_discussoes: ataRaw.registro_discussoes || "",
      conflitos_alternativas: ataRaw.conflitos_alternativas || [],
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
