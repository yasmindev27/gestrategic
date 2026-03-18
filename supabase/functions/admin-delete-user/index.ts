import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ═════════════════════════════════════════════════════════════════
// Constants
// ═════════════════════════════════════════════════════════════════
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://gestrategic.com",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ═════════════════════════════════════════════════════════════════
// Utility Functions
// ═════════════════════════════════════════════════════════════════

/**
 * Validate UUID format
 */
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Structured logging
 */
function log(level: 'info' | 'warn' | 'error', message: string, data?: unknown) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    prefix: '[admin-delete-user]',
    message,
    ...(data && { data }),
  }));
}

/**
 * Create error response
 */
function createErrorResponse(message: string, statusCode: number = 400): Response {
  return new Response(
    JSON.stringify({ error: message, success: false }),
    { status: statusCode, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
  );
}

// ═════════════════════════════════════════════════════════════════
// Main Handler
// ═════════════════════════════════════════════════════════════════

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return createErrorResponse("Método não permitido", 405);
  }

  const requestId = crypto.randomUUID();
  log('info', 'Iniciando exclusão de usuário', { requestId });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      log('error', 'Variáveis de ambiente não configuradas', { requestId });
      return createErrorResponse("Erro de configuração", 500);
    }

    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      log('warn', 'Sem header Authorization', { requestId });
      return createErrorResponse("Não autorizado", 401);
    }

    // Verify requesting user is admin
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: requestingUser }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !requestingUser) {
      log('warn', 'Falha na autenticação', { requestId, error: authError?.message });
      return createErrorResponse("Usuário não autenticado", 401);
    }

    // Check admin role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUser.id)
      .limit(1);

    if (roleError || !roleData || roleData.length === 0 || roleData[0].role !== "admin") {
      log('warn', 'Acesso negado - não é admin', { requestId, userId: requestingUser.id });
      return createErrorResponse("Apenas administradores podem excluir usuários", 403);
    }

    // Parse and validate request body
    let body: any;
    try {
      body = await req.json();
    } catch {
      log('warn', 'Request body inválido', { requestId });
      return createErrorResponse("Corpo da requisição inválido", 400);
    }

    const { user_id, confirm_delete } = body;

    // Validate user_id format
    if (!user_id || typeof user_id !== 'string' || !isValidUUID(user_id)) {
      log('warn', 'ID do usuário inválido', { requestId });
      return createErrorResponse("ID do usuário inválido", 400);
    }

    // Prevent self-deletion
    if (user_id === requestingUser.id) {
      log('warn', 'Tentativa de auto-exclusão', { requestId, userId: user_id });
      return createErrorResponse("Você não pode excluir sua própria conta", 400);
    }

    // Require confirmation
    if (confirm_delete !== true) {
      log('warn', 'Confirmação não fornecida', { requestId, targetUserId: user_id });
      return createErrorResponse("Confirmação de exclusão é obrigatória", 400);
    }

    // Get user info before deletion for logging
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("full_name, user_id")
      .eq("user_id", user_id)
      .limit(1);

    if (profileError) {
      log('warn', 'Erro ao buscar profile do usuário', { requestId, error: profileError.message });
      return createErrorResponse("Usuário não encontrado", 404);
    }

    if (!userProfile || userProfile.length === 0) {
      log('warn', 'Usuário não encontrado', { requestId, targetUserId: user_id });
      return createErrorResponse("Usuário não encontrado", 404);
    }

    const deletedUserName = userProfile[0]?.full_name || "Desconhecido";

    log('info', 'Excluindo usuário', { 
      requestId, 
      targetUserId: user_id, 
      targetUserName: deletedUserName 
    });

    // Delete user using service role (cascades to profiles and user_roles due to FK constraints)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id);

    if (deleteError) {
      log('error', 'Erro ao excluir usuário', { requestId, error: deleteError.message });
      return createErrorResponse(`Erro ao excluir usuário: ${deleteError.message}`, 400);
    }

    // Log the audit action
    const { error: logError } = await supabaseAdmin
      .from("logs_acesso")
      .insert({
        user_id: requestingUser.id,
        acao: "excluir_usuario",
        modulo: "admin",
        detalhes: {
          usuario_excluido_id: user_id,
          nome: deletedUserName,
          excluido_em: new Date().toISOString(),
        },
      })
      .limit(1);

    if (logError) {
      log('error', 'Erro ao fazer log da exclusão', { requestId, error: logError.message });
      // Continue - logging failure is not critical
    }

    log('info', 'Usuário excluído com sucesso', { 
      requestId, 
      deletedUserId: user_id, 
      deletedUserName 
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Usuário ${deletedUserName} excluído com sucesso`,
        deleted_user_id: user_id,
      }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log('error', 'Exceção não tratada', { requestId, error: message });
    return createErrorResponse("Erro interno do servidor", 500);
  }
});
