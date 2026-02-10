import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface IncidenteData {
  descricao: string;
  setor: string;
  categoria_operacional?: string;
  paciente_envolvido?: boolean;
  equipamento_nome?: string;
}

interface AnaliseResponse {
  classificacao_sugerida: {
    tipo: string;
    label: string;
    confianca: number;
    justificativa: string;
  };
  causas_provaveis: {
    categoria: string;
    descricao: string;
    probabilidade: string;
  }[];
  plano_acao: {
    acao: string;
    responsavel_sugerido: string;
    prazo_sugerido: string;
    prioridade: string;
  }[];
  resumo_tecnico: string;
}

const SYSTEM_PROMPT = `Você é um especialista em Gestão de Riscos Hospitalares com profundo conhecimento em:
- Normas ONA (Organização Nacional de Acreditação)
- Metodologia Qmentum Internacional
- Protocolo de Londres para Análise de Causa Raiz
- Classificação de Incidentes da OMS (WHO)
- LGPD aplicada à saúde

Sua função é analisar incidentes/notificações e fornecer:

1. CLASSIFICAÇÃO DO INCIDENTE conforme padrão OMS:
   - "circunstancia_notificavel": Situação com potencial de dano, mas sem evento real
   - "quase_erro": O erro aconteceu, mas NÃO atingiu o paciente (Near Miss)
   - "incidente_sem_dano": Atingiu o paciente, mas NÃO causou lesão
   - "evento_adverso": Resultou em dano real ao paciente

2. ANÁLISE DE CAUSA RAIZ (Protocolo de Londres):
   - Falha Humana (atenção, treinamento, fadiga)
   - Falha de Processo (protocolo inexistente, confuso ou não seguido)
   - Falha de Equipamento (manutenção, calibração, disponibilidade)
   - Falha de Comunicação (passagem de plantão, prescrição, registros)
   - Falha Organizacional (cultura, supervisão, recursos)
   - Fatores do Paciente (condição clínica, aderência)

3. PLANO DE AÇÃO IMEDIATO baseado em boas práticas ONA/Qmentum.

Use linguagem técnica hospitalar. Seja objetivo e prático.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Usuário não autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Role-based access control
    const supabaseAdmin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const allowedRoles = ["admin", "qualidade", "enfermagem", "nsp", "gestor"];
    const hasAccess = roles?.some((r: { role: string }) => allowedRoles.includes(r.role));
    if (!hasAccess) {
      return new Response(
        JSON.stringify({ error: "Acesso negado. Permissão insuficiente." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { incidente, tipo_analise = "completa" } = await req.json() as { 
      incidente: IncidenteData; 
      tipo_analise?: "classificacao" | "causas" | "plano" | "completa" 
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    // Build prompt based on analysis type
    let userPrompt = `Analise o seguinte incidente hospitalar:

SETOR: ${incidente.setor}
CATEGORIA: ${incidente.categoria_operacional || "Não especificada"}
PACIENTE ENVOLVIDO: ${incidente.paciente_envolvido ? "Sim" : "Não"}
${incidente.equipamento_nome ? `EQUIPAMENTO: ${incidente.equipamento_nome}` : ""}

DESCRIÇÃO DO OCORRIDO:
${incidente.descricao}

---
`;

    if (tipo_analise === "classificacao") {
      userPrompt += "Retorne APENAS a classificação sugerida do incidente.";
    } else if (tipo_analise === "causas") {
      userPrompt += "Retorne APENAS a análise de causas prováveis (Protocolo de Londres).";
    } else if (tipo_analise === "plano") {
      userPrompt += "Retorne APENAS o plano de ação sugerido.";
    } else {
      userPrompt += "Retorne a análise completa: classificação, causas e plano de ação.";
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analisar_incidente",
              description: "Retorna análise estruturada do incidente hospitalar",
              parameters: {
                type: "object",
                properties: {
                  classificacao_sugerida: {
                    type: "object",
                    properties: {
                      tipo: { 
                        type: "string", 
                        enum: ["circunstancia_notificavel", "quase_erro", "incidente_sem_dano", "evento_adverso"] 
                      },
                      label: { type: "string" },
                      confianca: { type: "number", description: "0 a 100" },
                      justificativa: { type: "string" }
                    },
                    required: ["tipo", "label", "confianca", "justificativa"]
                  },
                  causas_provaveis: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        categoria: { 
                          type: "string",
                          enum: ["falha_humana", "falha_processo", "falha_equipamento", "falha_comunicacao", "falha_organizacional", "fator_paciente"]
                        },
                        descricao: { type: "string" },
                        probabilidade: { type: "string", enum: ["alta", "media", "baixa"] }
                      },
                      required: ["categoria", "descricao", "probabilidade"]
                    }
                  },
                  plano_acao: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        acao: { type: "string" },
                        responsavel_sugerido: { type: "string" },
                        prazo_sugerido: { type: "string" },
                        prioridade: { type: "string", enum: ["imediata", "curto_prazo", "medio_prazo"] }
                      },
                      required: ["acao", "responsavel_sugerido", "prazo_sugerido", "prioridade"]
                    }
                  },
                  resumo_tecnico: { type: "string", description: "Resumo executivo em 2-3 frases" }
                },
                required: ["classificacao_sugerida", "causas_provaveis", "plano_acao", "resumo_tecnico"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "analisar_incidente" } }
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
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Entre em contato com o administrador." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Erro no serviço de IA");
    }

    const aiResponse = await response.json();
    
    // Extract tool call result
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error("Resposta da IA inválida");
    }

    const analise: AnaliseResponse = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ success: true, analise }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Erro ao analisar incidente:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Erro desconhecido",
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
