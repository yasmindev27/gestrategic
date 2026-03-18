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

const CONFIG = {
  MIN_PASSWORD_LENGTH: 12,
  LOG_PREFIX: "[admin-create-user]",
};

const VALID_ROLES = ["admin", "gestor", "funcionario", "recepcao", "classificacao", "nir", "faturamento"] as const;

// ═════════════════════════════════════════════════════════════════
// Utility Functions
// ═════════════════════════════════════════════════════════════════

/**
 * Generate cryptographically secure temporary password
 */
function generateSecurePassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  const randomValues = crypto.getRandomValues(new Uint8Array(CONFIG.MIN_PASSWORD_LENGTH));
  for (let byte of randomValues) {
    password += chars[byte % chars.length];
  }
  return password;
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

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
  log('info', 'Iniciando criação de usuário', { requestId });

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
      return createErrorResponse("Apenas administradores podem criar usuários", 403);
    }

    // Parse and validate request body
    let body: any;
    try {
      body = await req.json();
    } catch {
      log('warn', 'Request body inválido', { requestId });
      return createErrorResponse("Corpo da requisição inválido", 400);
    }

    const { email, full_name, cargo, setor, role, matricula, send_invite } = body;

    // Validate required fields
    if (!full_name || typeof full_name !== 'string' || !full_name.trim()) {
      log('warn', 'Nome completo inválido', { requestId });
      return createErrorResponse("Nome completo é obrigatório", 400);
    }

    if (!email || typeof email !== 'string' || !isValidEmail(email)) {
      log('warn', 'Email inválido', { requestId });
      return createErrorResponse("Email válido é obrigatório", 400);
    }

    if (role && !VALID_ROLES.includes(role as typeof VALID_ROLES[number])) {
      log('warn', `Role inválido: ${role}`, { requestId });
      return createErrorResponse(`Role inválido. Valores válidos: ${VALID_ROLES.join(', ')}`, 400);
    }

    // Generate secure temporary password
    const userPassword = generateSecurePassword();
    const userRole = role || "funcionario";

    log('info', 'Criando usuário', { requestId, email, role: userRole });

    // Create user with admin API
    const { data: newUserData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase(),
      password: userPassword,
      email_confirm: true,
      user_metadata: { full_name: full_name.trim() },
    });

    if (createError) {
      log('warn', 'Erro ao criar usuário', { requestId, error: createError.message });
      
      let errorMessage = "Erro ao criar usuário";
      if (createError.message.includes("already been registered") || 
          (createError as any).code === "email_exists") {
        errorMessage = "Este e-mail já está cadastrado no sistema";
      }
      
      return createErrorResponse(errorMessage, 400);
    }

    const newUser = newUserData.user;
    if (!newUser) {
      log('error', 'Usuário criado mas sem dados retornados', { requestId });
      return createErrorResponse("Erro ao criar usuário", 500);
    }

    // Update profile
    const profileUpdate: Record<string, unknown> = {
      full_name: full_name.trim(),
      deve_trocar_senha: true,
    };
    
    if (cargo) profileUpdate.cargo = String(cargo).trim();
    if (setor) profileUpdate.setor = String(setor).trim();
    if (matricula) profileUpdate.matricula = String(matricula).trim();

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update(profileUpdate)
      .eq("user_id", newUser.id);

    if (profileError) {
      log('error', 'Erro ao atualizar profile', { requestId, error: profileError.message });
      // Continue - não eh crítico
    }

    // Update role if not default
    if (userRole !== "funcionario") {
      const { error: roleUpdateError } = await supabaseAdmin
        .from("user_roles")
        .update({ role: userRole })
        .eq("user_id", newUser.id)
        .limit(1);

      if (roleUpdateError) {
        log('error', 'Erro ao atualizar role', { requestId, error: roleUpdateError.message });
      }
    }

    // Log the action
    await supabaseAdmin
      .from("logs_acesso")
      .insert({
        user_id: requestingUser.id,
        acao: "criar_usuario",
        modulo: "admin",
        detalhes: {
          novo_usuario_id: newUser.id,
          email,
          matricula: matricula || null,
          nome: full_name,
          role: userRole,
          criado_em: new Date().toISOString(),
        },
      })
      .limit(1);

    log('info', 'Usuário criado com sucesso', { requestId, userId: newUser.id, email });

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: newUser.id,
          email,
          full_name,
          role: userRole,
          deve_trocar_senha: true,
        },
        message: "Usuário criado com sucesso. Será necessário atualizar a senha no primeiro acesso.",
      }),
      { status: 201, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log('error', 'Exceção não tratada', { requestId, error: message });
    return createErrorResponse("Erro interno do servidor", 500);
  }
});
