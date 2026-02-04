import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get incidents from last 7 days
    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - 7);

    const { data: incidentes, error } = await supabase
      .from("incidentes_nsp")
      .select("*")
      .gte("data_ocorrencia", dataInicio.toISOString())
      .order("data_ocorrencia", { ascending: false });

    if (error) throw error;

    // Aggregate data for AI analysis
    const stats = {
      total: incidentes?.length || 0,
      por_tipo: {} as Record<string, number>,
      por_setor: {} as Record<string, number>,
      por_categoria: {} as Record<string, number>,
      por_risco: {} as Record<string, number>,
      quase_erros: 0,
      eventos_adversos: 0,
    };

    incidentes?.forEach((inc) => {
      // By type
      stats.por_tipo[inc.tipo_incidente] = (stats.por_tipo[inc.tipo_incidente] || 0) + 1;
      
      // By sector
      stats.por_setor[inc.setor] = (stats.por_setor[inc.setor] || 0) + 1;
      
      // By category
      if (inc.categoria_operacional) {
        stats.por_categoria[inc.categoria_operacional] = (stats.por_categoria[inc.categoria_operacional] || 0) + 1;
      }
      
      // By risk
      stats.por_risco[inc.classificacao_risco] = (stats.por_risco[inc.classificacao_risco] || 0) + 1;
      
      // Specific counts
      if (inc.tipo_incidente === "quase_erro") stats.quase_erros++;
      if (inc.tipo_incidente === "evento_adverso") stats.eventos_adversos++;
    });

    // Get previous week for comparison
    const dataInicioAnterior = new Date(dataInicio);
    dataInicioAnterior.setDate(dataInicioAnterior.getDate() - 7);

    const { data: incidentesAnteriores } = await supabase
      .from("incidentes_nsp")
      .select("tipo_incidente, setor, categoria_operacional")
      .gte("data_ocorrencia", dataInicioAnterior.toISOString())
      .lt("data_ocorrencia", dataInicio.toISOString());

    const statsAnteriores = {
      total: incidentesAnteriores?.length || 0,
      por_setor: {} as Record<string, number>,
      por_categoria: {} as Record<string, number>,
    };

    incidentesAnteriores?.forEach((inc) => {
      statsAnteriores.por_setor[inc.setor] = (statsAnteriores.por_setor[inc.setor] || 0) + 1;
      if (inc.categoria_operacional) {
        statsAnteriores.por_categoria[inc.categoria_operacional] = (statsAnteriores.por_categoria[inc.categoria_operacional] || 0) + 1;
      }
    });

    // Call AI to generate summary
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    const prompt = `Analise os dados de incidentes hospitalares da última semana e gere um resumo executivo para a gestão de qualidade.

DADOS DA SEMANA ATUAL:
- Total de incidentes: ${stats.total}
- Quase-erros: ${stats.quase_erros}
- Eventos adversos: ${stats.eventos_adversos}
- Por tipo: ${JSON.stringify(stats.por_tipo)}
- Por setor: ${JSON.stringify(stats.por_setor)}
- Por categoria: ${JSON.stringify(stats.por_categoria)}
- Por classificação de risco: ${JSON.stringify(stats.por_risco)}

DADOS DA SEMANA ANTERIOR (comparativo):
- Total: ${statsAnteriores.total}
- Por setor: ${JSON.stringify(statsAnteriores.por_setor)}
- Por categoria: ${JSON.stringify(statsAnteriores.por_categoria)}

Com base nesses dados, identifique:
1. Tendências preocupantes (aumento em setores/categorias específicas)
2. Setores que precisam de atenção prioritária
3. Recomendações específicas de ação baseadas nas normas ONA/Qmentum
4. Indicadores de melhoria ou piora em relação à semana anterior`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { 
            role: "system", 
            content: "Você é um consultor de gestão da qualidade hospitalar especializado em ONA e Qmentum. Gere relatórios concisos e acionáveis para a gestão." 
          },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "gerar_resumo_semanal",
              description: "Gera resumo semanal estruturado de incidentes",
              parameters: {
                type: "object",
                properties: {
                  resumo_executivo: { type: "string", description: "Resumo em 2-3 frases" },
                  tendencias: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        tipo: { type: "string", enum: ["alerta", "melhoria", "estavel"] },
                        descricao: { type: "string" },
                        setor: { type: "string" },
                        variacao_percentual: { type: "number" }
                      },
                      required: ["tipo", "descricao"]
                    }
                  },
                  setores_criticos: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        setor: { type: "string" },
                        motivo: { type: "string" },
                        prioridade: { type: "string", enum: ["alta", "media", "baixa"] }
                      },
                      required: ["setor", "motivo", "prioridade"]
                    }
                  },
                  recomendacoes: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        acao: { type: "string" },
                        setor_alvo: { type: "string" },
                        base_normativa: { type: "string" },
                        prazo: { type: "string" }
                      },
                      required: ["acao", "prazo"]
                    }
                  },
                  indicadores: {
                    type: "object",
                    properties: {
                      variacao_total: { type: "number" },
                      status_geral: { type: "string", enum: ["critico", "atencao", "controlado", "excelente"] },
                      meta_atingida: { type: "boolean" }
                    },
                    required: ["status_geral"]
                  }
                },
                required: ["resumo_executivo", "tendencias", "recomendacoes", "indicadores"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "gerar_resumo_semanal" } }
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("Erro no serviço de IA");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      throw new Error("Resposta da IA inválida");
    }

    const resumo = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ 
      success: true, 
      resumo,
      dados_brutos: stats,
      periodo: {
        inicio: dataInicio.toISOString(),
        fim: new Date().toISOString()
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Erro ao gerar resumo:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Erro desconhecido",
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
