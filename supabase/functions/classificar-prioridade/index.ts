import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ═════════════════════════════════════════════════════════════════
// Constants
// ═════════════════════════════════════════════════════════════════
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://gestrategic.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const CONFIG = {
  AI_TIMEOUT: 30000, // 30 seconds
  MAX_TITULO_LENGTH: 200,
  MAX_DESCRICAO_LENGTH: 2000,
  MAX_CATEGORIA_LENGTH: 50,
  LOG_PREFIX: '[classificar-prioridade]',
};

const VALID_PRIORITIES = ['urgente', 'alta', 'media', 'baixa'] as const;
type Priority = typeof VALID_PRIORITIES[number];

// ═════════════════════════════════════════════════════════════════
// Utility Functions
// ═════════════════════════════════════════════════════════════════

/**
 * Structured logging
 */
function log(level: 'info' | 'warn' | 'error', message: string, data?: unknown) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    prefix: CONFIG.LOG_PREFIX,
    message,
    ...(data && { data }),
  }));
}

/**
 * Create error response
 */
function createErrorResponse(message: string, statusCode: number = 400): Response {
  return new Response(
    JSON.stringify({ 
      error: message, 
      prioridade: 'media', // Safe fallback
      sucesso: false 
    }),
    { status: statusCode, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
  );
}

/**
 * Ensure priority is valid
 */
function normalizePriority(priority: string | null | undefined): Priority {
  if (!priority) return 'media';
  const normalized = String(priority).toLowerCase().trim();
  return VALID_PRIORITIES.includes(normalized as Priority) ? (normalized as Priority) : 'media';
}

// ═════════════════════════════════════════════════════════════════
// Main Handler
// ═════════════════════════════════════════════════════════════════

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return createErrorResponse('Método não permitido', 405);
  }

  const requestId = crypto.randomUUID();
  log('info', 'Iniciando classificação de prioridade', { requestId });

  try {
    // Validate environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!supabaseUrl || !supabaseAnonKey || !lovableApiKey) {
      log('error', 'Variáveis de ambiente não configuradas', { requestId });
      return createErrorResponse('Erro de configuração', 500);
    }

    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      log('warn', 'Sem header Authorization', { requestId });
      return createErrorResponse('Não autorizado', 401);
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      log('warn', 'Falha na autenticação', { requestId, error: authError?.message });
      return createErrorResponse('Usuário não autenticado', 401);
    }

    log('info', 'Usuário autenticado', { requestId, userId: user.id });

    // Parse and validate request body
    let body: any;
    try {
      body = await req.json();
    } catch {
      log('warn', 'Request body inválido', { requestId });
      return createErrorResponse('Corpo da requisição inválido', 400);
    }

    const { titulo, descricao, categoria } = body;

    // Validate required fields
    if (!titulo || typeof titulo !== 'string' || !titulo.trim()) {
      log('warn', 'Título inválido ou vazio', { requestId });
      return createErrorResponse('Título é obrigatório', 400);
    }

    if (!descricao || typeof descricao !== 'string' || !descricao.trim()) {
      log('warn', 'Descrição inválida ou vazia', { requestId });
      return createErrorResponse('Descrição é obrigatória', 400);
    }

    // Validate field lengths
    if (titulo.length > CONFIG.MAX_TITULO_LENGTH) {
      log('warn', 'Título muito longo', { requestId, received: titulo.length });
      return createErrorResponse(`Título não pode exceder ${CONFIG.MAX_TITULO_LENGTH} caracteres`, 400);
    }

    if (descricao.length > CONFIG.MAX_DESCRICAO_LENGTH) {
      log('warn', 'Descrição muito longa', { requestId, received: descricao.length });
      return createErrorResponse(`Descrição não pode exceder ${CONFIG.MAX_DESCRICAO_LENGTH} caracteres`, 400);
    }

    const categoriaStr = categoria ? String(categoria).trim().substring(0, CONFIG.MAX_CATEGORIA_LENGTH) : 'geral';

    log('info', 'Entrada validada', { requestId, tituloLen: titulo.length, descricaoLen: descricao.length });

    // Build system prompt
    const systemPrompt = `Você é um especialista em classificação de chamados em ambiente hospitalar/UPA. 
Sua função é analisar chamados e classificar a prioridade com base nos critérios de saúde e urgência.

CRITÉRIOS DE CLASSIFICAÇÃO:

URGENTE (vermelho):
- Equipamento de suporte à vida (ventiladores, monitores de UTI, desfibriladores)
- Sistemas críticos offline (prontuário eletrônico, rede em área de emergência)
- Falta de energia/água em áreas críticas
- Risco iminente à vida do paciente

ALTA (laranja):
- Equipamentos de diagnóstico importantes com falha
- Sistemas que afetam múltiplos setores
- Equipamentos de centro cirúrgico

MÉDIA (amarelo):
- Equipamentos de rotina com falha
- Problemas de TI com impacto moderado

BAIXA (verde):
- Solicitações de melhorias
- Atualizações não urgentes

Retorne APENAS uma das palavras: urgente, alta, media ou baixa (em minúsculo, sem explicações).`;

    log('info', 'Enviando para IA', { requestId, categoria: categoriaStr });

    // Call AI API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.AI_TIMEOUT);

    let aiResponse: Response;
    try {
      aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            { 
              role: 'user', 
              content: `Categoria: ${categoriaStr}\n\nTítulo: ${titulo}\n\nDescrição: ${descricao}` 
            },
          ],
          max_tokens: 10,
          temperature: 0.1,
        }),
        signal: controller.signal,
      } as RequestInit);
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof DOMException && error.name === 'AbortError') {
        log('error', 'Timeout ao processar com IA', { requestId });
        return createErrorResponse('Timeout ao processar', 504);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      log('error', `Erro na API Lovable: ${aiResponse.status}`, { requestId, errorText });
      return createErrorResponse('Erro ao processar com IA', 500);
    }

    let aiData: any;
    try {
      aiData = await aiResponse.json();
    } catch {
      log('error', 'Resposta da IA não é JSON válido', { requestId });
      return createErrorResponse('Resposta inválida da IA', 500);
    }

    const content = aiData.choices?.[0]?.message?.content?.trim().toLowerCase() || '';
    if (!content) {
      log('warn', 'Resposta vazia da IA', { requestId });
      return createErrorResponse('Resposta vazia da IA', 500);
    }

    const classificacao = normalizePriority(content);
    log('info', 'Classificação concluída', { requestId, resultado: classificacao });

    return new Response(
      JSON.stringify({
        prioridade: classificacao,
        sucesso: true,
        processado_em: new Date().toISOString(),
      }),
      { 
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    log('error', 'Exceção não tratada', { requestId, error: message });
    return createErrorResponse('Erro ao classificar prioridade', 500);
  }
});
