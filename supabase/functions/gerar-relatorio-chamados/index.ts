import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Cache-Control": "no-store, no-cache, must-revalidate",
};

interface ChamadoData {
  total: number;
  abertos: number;
  emAndamento: number;
  resolvidos: number;
  cancelados: number;
  porCategoria: Record<string, number>;
  porPrioridade: Record<string, number>;
  tempoMedioResolucao: number;
  percentualSLA: number;
  taxaReabertura: number;
  produtividadeEquipe: Array<{
    nome: string;
    chamadosAtendidos: number;
    percentualSLA: number;
  }>;
  periodo: {
    inicio: string;
    fim: string;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verificar autenticação
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("Requisição sem header de autorização");
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error("Usuário não autenticado:", authError?.message);
      return new Response(
        JSON.stringify({ error: "Usuário não autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Usuário autenticado: ${user.id}`);

    // Verificar se o usuário tem role admin ou gestor
    const { data: roleData, error: roleError } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleError || !roleData) {
      console.error("Erro ao buscar role do usuário:", roleError?.message);
      return new Response(
        JSON.stringify({ error: "Acesso negado - usuário sem role definida" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const allowedRoles = ['admin', 'gestor'];
    if (!allowedRoles.includes(roleData.role)) {
      console.error(`Usuário ${user.id} tentou acessar relatório sem permissão. Role: ${roleData.role}`);
      return new Response(
        JSON.stringify({ error: "Acesso negado - apenas administradores e gestores podem gerar relatórios" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Usuário ${user.id} com role ${roleData.role} autorizado a gerar relatório`);

    const { dados }: { dados: ChamadoData } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("Serviço de IA não configurado no ambiente");
      return new Response(
        JSON.stringify({ error: "Serviço de relatório temporariamente indisponível" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `Você é um analista especializado em gestão de chamados e suporte técnico em ambiente hospitalar. 
Sua função é analisar dados de chamados e gerar relatórios executivos completos e acionáveis.

Diretrizes:
- Seja objetivo e focado em insights acionáveis
- Use linguagem profissional mas acessível
- Destaque pontos positivos e áreas de melhoria
- Sugira ações concretas baseadas nos dados
- Considere o contexto hospitalar (criticidade, urgência, impacto em pacientes)
- Formate o relatório com seções claras usando markdown`;

    const prompt = `Analise os seguintes dados de chamados do período de ${dados.periodo.inicio} a ${dados.periodo.fim} e gere um relatório executivo completo:

## Dados para Análise:

**Resumo Geral:**
- Total de chamados: ${dados.total}
- Abertos: ${dados.abertos}
- Em andamento: ${dados.emAndamento}
- Resolvidos: ${dados.resolvidos}
- Cancelados: ${dados.cancelados}

**Por Categoria:**
${Object.entries(dados.porCategoria).map(([cat, count]) => `- ${cat}: ${count}`).join('\n')}

**Por Prioridade:**
${Object.entries(dados.porPrioridade).map(([prio, count]) => `- ${prio}: ${count}`).join('\n')}

**Métricas de Desempenho:**
- Tempo médio de resolução: ${dados.tempoMedioResolucao.toFixed(1)} horas
- Percentual de SLA cumprido: ${dados.percentualSLA.toFixed(1)}%
- Taxa de reabertura: ${dados.taxaReabertura.toFixed(1)}%

**Produtividade da Equipe (Top 5):**
${dados.produtividadeEquipe.slice(0, 5).map((p, i) => 
  `${i + 1}. ${p.nome}: ${p.chamadosAtendidos} chamados, ${p.percentualSLA.toFixed(0)}% SLA`
).join('\n')}

---

Gere um relatório executivo estruturado com as seguintes seções:
1. **Resumo Executivo** - Visão geral do período
2. **Principais Indicadores** - Análise dos KPIs
3. **Análise por Categoria** - Temas mais recorrentes e tendências
4. **Produtividade da Equipe** - Desempenho individual e coletivo
5. **Gargalos Identificados** - Pontos de atenção e riscos
6. **Sugestões de Melhoria** - Recomendações acionáveis

Seja específico e baseie todas as conclusões nos dados fornecidos.`;

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
          { role: "user", content: prompt },
        ],
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Por favor, adicione créditos à sua conta." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      // Error fetching from AI gateway - handled silently
      throw new Error("Erro ao gerar relatório com IA");
    }

    const data = await response.json();
    const relatorio = data.choices?.[0]?.message?.content || "Não foi possível gerar o relatório.";

    return new Response(
      JSON.stringify({ relatorio }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    // Error generating report - return safe error message
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Erro desconhecido ao gerar relatório" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
