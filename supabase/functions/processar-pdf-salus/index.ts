import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { RateLimiter } from "../_shared/rate-limiter.ts";

// ═════════════════════════════════════════════════════════════════
// Rate Limiter
// ═════════════════════════════════════════════════════════════════
const rateLimiter = new RateLimiter();

// ═════════════════════════════════════════════════════════════════
// Constants
// ═════════════════════════════════════════════════════════════════
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://gestrategic.com', // Restricted CORS
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const CONFIG = {
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50 MB
  CHUNK_SIZE: 1024 * 1024, // 1 MB for base64 conversion
  AI_TIMEOUT: 120000, // 2 minutes
  MAX_CONCURRENT_REQUESTS: 10,
  DB_BATCH_SIZE: 1000,
  LOG_PREFIX: '[processar-pdf-salus]',
};

const ALLOWED_ROLES = ['admin', 'faturamento', 'recepcao', 'nir', 'classificacao'] as const;
const ALLOWED_MIME_TYPES = ['application/pdf', 'application/x-pdf'];
const AI_GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

// ═════════════════════════════════════════════════════════════════
// Interfaces & Types
// ═════════════════════════════════════════════════════════════════
interface PatientInfo {
  nome: string;
  prontuario?: string | null;
  linha?: number;
}

interface ExistingRecord {
  numero_prontuario: string;
  paciente_nome: string | null;
}

interface ProcessingResult {
  success: boolean;
  totalPdf: number;
  totalSistema: number;
  encontrados: number;
  faltando: number;
  pacientes: Array<{
    nome: string;
    prontuario: string | null;
    linha: number;
    existeNoSistema: boolean;
    status: 'encontrado' | 'faltando';
  }>;
  processedAt: string;
}

interface ErrorResponse {
  error: string;
  success: false;
  code?: string;
  timestamp: string;
}

// ═════════════════════════════════════════════════════════════════
// Utility Functions
// ═════════════════════════════════════════════════════════════════

/**
 * Normalize string for comparison
 * @param str Input string
 * @returns Normalized string (lowercase, no accents, no special chars)
 */
function normalizeString(str: string | null): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Convert file to base64 in chunks to avoid stack overflow
 * @param arrayBuffer Binary data
 * @returns Base64 string
 */
function arrayBufferToBase64(arrayBuffer: ArrayBuffer): string {
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  
  // Process in chunks to avoid stack overflow
  for (let i = 0; i < bytes.length; i += CONFIG.CHUNK_SIZE) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CONFIG.CHUNK_SIZE));
  }
  
  return btoa(binary);
}

/**
 * Structured logging
 */
function log(level: 'info' | 'warn' | 'error', message: string, data?: unknown) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    prefix: CONFIG.LOG_PREFIX,
    message,
    ...(data && { data }),
  };
  console.log(JSON.stringify(logEntry));
}

/**
 * Create error response
 */
function createErrorResponse(
  error: unknown,
  statusCode: number = 500,
  code: string = 'INTERNAL_ERROR'
): Response {
  const message = error instanceof Error ? error.message : String(error);
  
  // Don't expose sensitive details in production
  const isProduction = Deno.env.get('ENVIRONMENT') === 'production';
  const safeMessage = isProduction && statusCode === 500 ? 'Erro ao processar arquivo' : message;
  
  const errorResponse: ErrorResponse = {
    error: safeMessage,
    success: false,
    code,
    timestamp: new Date().toISOString(),
  };
  
  return new Response(JSON.stringify(errorResponse), {
    status: statusCode,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

// ═════════════════════════════════════════════════════════════════
// Main Handler
// ═════════════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return createErrorResponse('Método não permitido', 405, 'METHOD_NOT_ALLOWED');
  }

  const requestId = crypto.randomUUID();
  log('info', `Iniciando processamento`, { requestId });

  try {
    // 1. Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      log('warn', 'Sem header Authorization', { requestId });
      return createErrorResponse('Não autorizado', 401, 'MISSING_AUTH');
    }

    // 2. Validate environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey || !lovableApiKey) {
      log('error', 'Variáveis de ambiente não configuradas', { requestId });
      return createErrorResponse('Erro de configuração', 500, 'CONFIG_ERROR');
    }

    // 3. Authenticate user
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      log('warn', 'Falha na autenticação', { requestId, error: authError?.message });
      return createErrorResponse('Usuário não autenticado', 401, 'AUTH_FAILED');
    }

    log('info', 'Usuário autenticado', { requestId, userId: user.id });

    // 3.5. Check rate limit (2 req/min per user - heavy operation)
    const rateLimitCheck = rateLimiter.check(
      'processar-pdf-salus',
      user.id,
      { maxRequests: 2, windowMs: 60 * 1000 }
    );

    if (!rateLimitCheck.allowed) {
      log('warn', 'Rate limit excedido para PDF', { requestId, userId: user.id });
      return new Response(
        JSON.stringify({
          error: 'Taxa de requisições excedida. Tente novamente em ' + rateLimitCheck.retryAfter + ' segundos.',
          success: false,
          code: 'RATE_LIMIT_EXCEEDED',
          timestamp: new Date().toISOString(),
        }),
        {
          status: 429,
          headers: {
            ...CORS_HEADERS,
            'X-RateLimit-Limit': String(rateLimitCheck.limit),
            'X-RateLimit-Remaining': String(rateLimitCheck.remaining),
            'Retry-After': String(rateLimitCheck.retryAfter),
          },
        }
      );
    }

    // 4. Verify user role
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

    const { data: roles, error: roleError } = await supabaseService
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .limit(10); // Prevent unbounded query

    if (roleError) {
      log('error', 'Erro ao buscar roles', { requestId, error: roleError.message });
      return createErrorResponse('Erro ao validar permissões', 500, 'ROLE_FETCH_ERROR');
    }

    const hasAccess = roles?.some(r => ALLOWED_ROLES.includes(r.role as typeof ALLOWED_ROLES[number]));
    if (!hasAccess) {
      log('warn', 'Acesso negado - permissão insuficiente', { requestId, userId: user.id, roles });
      return createErrorResponse('Acesso negado - permissão insuficiente', 403, 'INSUFFICIENT_PERMISSION');
    }

    // 5. Parse and validate file
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      log('warn', 'Nenhum arquivo enviado', { requestId });
      return createErrorResponse('Nenhum arquivo enviado', 400, 'MISSING_FILE');
    }

    // 6. Validate file
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      log('warn', `Tipo de arquivo inválido: ${file.type}`, { requestId });
      return createErrorResponse('Tipo de arquivo não permitido', 400, 'INVALID_FILE_TYPE');
    }

    if (file.size === 0) {
      log('warn', 'Arquivo vazio', { requestId });
      return createErrorResponse('Arquivo vazio', 400, 'EMPTY_FILE');
    }

    if (file.size > CONFIG.MAX_FILE_SIZE) {
      log('warn', `Arquivo muito grande: ${file.size} bytes`, { 
        requestId, 
        maxSize: CONFIG.MAX_FILE_SIZE 
      });
      return createErrorResponse('Arquivo muito grande (máx 50 MB)', 413, 'FILE_TOO_LARGE');
    }

    log('info', `Arquivo validado: ${file.name}`, { 
      requestId, 
      filename: file.name,
      size: file.size,
      type: file.type
    });

    // 7. Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const base64 = arrayBufferToBase64(arrayBuffer);

    // 8. Call AI API with timeout controller
    log('info', 'Enviando PDF para análise via IA', { requestId });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.AI_TIMEOUT);

    let aiResponse: Response;
    try {
      aiResponse = await fetch(AI_GATEWAY_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            {
              role: 'system',
              content: `Você é um especialista em extrair dados de documentos médicos. Sua tarefa é analisar o documento PDF e extrair a lista de pacientes.

INSTRUÇÕES:
1. Identifique todos os nomes de pacientes no documento
2. Para cada paciente, tente identificar também o número do prontuário se disponível
3. Retorne APENAS um JSON válido no seguinte formato, sem nenhum texto adicional:

{"pacientes": [{"nome": "NOME COMPLETO DO PACIENTE", "prontuario": "número ou null"}]}

REGRAS:
- Nomes devem estar em MAIÚSCULAS
- Ignore cabeçalhos, rodapés e textos que não são nomes de pacientes
- Se não encontrar pacientes, retorne: {"pacientes": []}
- Retorne SOMENTE o JSON, sem explicações ou markdown`
            },
            {
              role: 'user',
              content: [
                {
                  type: 'file',
                  file: {
                    filename: file.name,
                    file_data: `data:${file.type};base64,${base64}`,
                  },
                },
                {
                  type: 'text',
                  text: 'Extraia a lista de pacientes deste documento PDF do sistema Salus. Retorne apenas o JSON com os dados.',
                },
              ],
            },
          ],
          temperature: 0.1,
          max_tokens: 4000,
        }),
        signal: controller.signal,
      } as RequestInit,
      });
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof DOMException && error.name === 'AbortError') {
        log('error', 'Timeout ao processar com IA', { requestId });
        return createErrorResponse('Timeout ao processar arquivo', 504, 'AI_TIMEOUT');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      log('error', `Erro na API Lovable: ${aiResponse.status}`, { requestId, errorText });
      return createErrorResponse('Erro ao processar com IA', 500, 'AI_API_ERROR');
    }

    let aiData: any;
    try {
      aiData = await aiResponse.json();
    } catch (parseError) {
      log('error', 'Resposta da IA não é JSON válido', { requestId });
      return createErrorResponse('Resposta inválida da IA', 500, 'INVALID_AI_RESPONSE');
    }

    const content = aiData.choices?.[0]?.message?.content || '';
    if (!content) {
      log('warn', 'Resposta vazia da IA', { requestId });
      return createErrorResponse('Resposta vazia da IA', 500, 'EMPTY_AI_RESPONSE');
    }

    log('info', 'Resposta da IA recebida', { requestId, contentLength: content.length });

    // 9. Parse JSON from AI response
    let pacientes: PatientInfo[] = [];
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('JSON não encontrado na resposta da IA');
      }

      const parsed: any = JSON.parse(jsonMatch[0]);

      if (!parsed.pacientes || !Array.isArray(parsed.pacientes)) {
        throw new Error('Campo "pacientes" não encontrado ou não é um array');
      }

      // Validate and sanitize patient data
      pacientes = parsed.pacientes
        .filter((p: any) => p && typeof p.nome === 'string' && p.nome.trim())
        .map((p: any) => ({
          nome: p.nome.trim(),
          prontuario: p.prontuario ? String(p.prontuario).trim() : null,
        }));

      log('info', `Pacientes extraídos da IA: ${pacientes.length}`, { requestId });
    } catch (parseError) {
      log('error', 'Erro ao parsear resposta da IA', {
        requestId,
        error: parseError instanceof Error ? parseError.message : String(parseError),
      });
      return createErrorResponse('Erro ao processar resposta da IA', 500, 'AI_PARSE_ERROR');
    }

    if (pacientes.length === 0) {
      log('warn', 'Nenhum paciente encontrado no PDF', { requestId });
      // Return valid response even with 0 patients
    }

    // 10. Fetch existing records from database with LIMIT
    log('info', 'Buscando registros existentes no banco de dados', { requestId });

    const { data: existingRecords, error: dbError } = await supabaseService
      .from('saida_prontuarios')
      .select('numero_prontuario, paciente_nome')
      .limit(CONFIG.DB_BATCH_SIZE); // CRITICAL: Add limit to prevent unbounded query

    if (dbError) {
      log('error', 'Erro ao buscar registros existentes', {
        requestId,
        error: dbError.message,
      });
      return createErrorResponse('Erro ao validar no sistema', 500, 'DB_READ_ERROR');
    }

    const totalSystemRecords = existingRecords?.length || 0;
    log('info', `Registros existentes no sistema: ${totalSystemRecords}`, { requestId });

    // 11. Compare and find missing patients
    const existingNomes = new Set<string>();
    const existingProntuarios = new Set<string>();

    (existingRecords || []).forEach(r => {
      if (r.paciente_nome) {
        existingNomes.add(normalizeString(r.paciente_nome));
      }
      if (r.numero_prontuario) {
        existingProntuarios.add(normalizeString(r.numero_prontuario));
      }
    });

    const resultado = pacientes.map((paciente, index) => {
      const nomeNormalizado = normalizeString(paciente.nome);
      const prontuarioNormalizado = paciente.prontuario ? normalizeString(paciente.prontuario) : null;

      const existeNoSistema =
        existingNomes.has(nomeNormalizado) ||
        (prontuarioNormalizado && existingProntuarios.has(prontuarioNormalizado));

      return {
        nome: paciente.nome,
        prontuario: paciente.prontuario || null,
        linha: index + 1,
        existeNoSistema,
        status: existeNoSistema ? 'encontrado' : ('faltando' as const),
      };
    });

    const encontrados = resultado.filter(r => r.status === 'encontrado').length;
    const faltando = resultado.filter(r => r.status === 'faltando').length;

    log('info', 'Análise concluída', {
      requestId,
      totalPdf: pacientes.length,
      encontrados,
      faltando,
    });

    // 12. Return successful response
    const successResponse: ProcessingResult = {
      success: true,
      totalPdf: pacientes.length,
      totalSistema: totalSystemRecords,
      encontrados,
      faltando,
      pacientes: resultado,
      processedAt: new Date().toISOString(),
    };

    return new Response(JSON.stringify(successResponse), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    log('error', 'Exceção não tratada', { requestId, error: message });
    return createErrorResponse(error, 500, 'INTERNAL_ERROR');
  }
});
