import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
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

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      console.error("Serviço de IA não configurado no ambiente");
      return new Response(
        JSON.stringify({ error: "Serviço temporariamente indisponível", prioridade: "media", sucesso: false }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { titulo, descricao, categoria } = await req.json();

    if (!titulo || !descricao) {
      return new Response(
        JSON.stringify({ error: 'Título e descrição são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `Você é um especialista em classificação de chamados em ambiente hospitalar/UPA. 
Sua função é analisar chamados e classificar a prioridade com base nos critérios de saúde e urgência.

CRITÉRIOS DE CLASSIFICAÇÃO:

URGENTE (vermelho):
- Equipamento de suporte à vida (ventiladores, monitores de UTI, desfibriladores)
- Sistemas críticos offline (prontuário eletrônico, rede em área de emergência)
- Falta de energia/água em áreas críticas
- Risco iminente à vida do paciente
- Equipamentos de imagem em uso emergencial

ALTA (laranja):
- Equipamentos de diagnóstico importantes com falha
- Sistemas que afetam múltiplos setores
- Infraestrutura com degradação significativa
- Equipamentos de centro cirúrgico
- Problemas que podem escalar para urgente

MÉDIA (amarelo):
- Equipamentos de rotina com falha
- Problemas de TI que afetam produtividade
- Manutenção preventiva atrasada
- Pequenos vazamentos ou problemas estruturais
- Substituição de peças não críticas

BAIXA (verde):
- Solicitações de melhorias
- Manutenção preventiva programada
- Atualizações de software não urgentes
- Ajustes estéticos ou de conforto
- Solicitações informativas

Categoria do chamado: ${categoria}

Analise o título e descrição abaixo e retorne APENAS uma palavra em minúsculo: urgente, alta, media ou baixa.
Não inclua explicação, apenas a classificação.`;

    console.log(`Classificando chamado: ${titulo} - Categoria: ${categoria}`);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Título: ${titulo}\n\nDescrição: ${descricao}` }
        ],
        max_tokens: 10,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro da API:', errorText);
      throw new Error(`Erro na API de IA: ${response.status}`);
    }

    const data = await response.json();
    const classificacao = data.choices[0]?.message?.content?.trim().toLowerCase() || 'media';
    
    // Validar que a resposta é uma das prioridades válidas
    const prioridadesValidas = ['urgente', 'alta', 'media', 'baixa'];
    const prioridadeFinal = prioridadesValidas.includes(classificacao) ? classificacao : 'media';

    console.log(`Classificação resultado: ${prioridadeFinal}`);

    return new Response(
      JSON.stringify({ 
        prioridade: prioridadeFinal,
        sucesso: true 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Erro na classificação:', errorMessage);
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        prioridade: 'media', // Fallback para média em caso de erro
        sucesso: false
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
