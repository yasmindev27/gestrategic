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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Get the authorization header to verify the requesting user is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user's token to verify they're admin
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: requestingUser } } = await supabaseUser.auth.getUser();
    if (!requestingUser) {
      return new Response(
        JSON.stringify({ error: "Usuário não autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if requesting user is admin using service role client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUser.id)
      .single();

    if (roleData?.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Apenas administradores podem criar usuários" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, password, full_name, cargo, setor, role, matricula } = await req.json();

    // Validar campos obrigatórios - precisa de email OU matrícula
    if (!full_name) {
      return new Response(
        JSON.stringify({ error: "Nome completo é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!email && !matricula) {
      return new Response(
        JSON.stringify({ error: "Email ou matrícula é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Gerar email fictício se apenas matrícula foi fornecida
    const userEmail = email || `${matricula}@interno.local`;

    // Gerar senha segura aleatória se não fornecida
    function generateSecurePassword(): string {
      const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
      const lower = "abcdefghijkmnpqrstuvwxyz";
      const digits = "23456789";
      const special = "!@#$%&*";
      const all = upper + lower + digits + special;
      // Garantir ao menos 1 de cada categoria
      let password =
        upper[Math.floor(Math.random() * upper.length)] +
        lower[Math.floor(Math.random() * lower.length)] +
        digits[Math.floor(Math.random() * digits.length)] +
        special[Math.floor(Math.random() * special.length)];
      for (let i = 4; i < 16; i++) {
        password += all[Math.floor(Math.random() * all.length)];
      }
      // Embaralhar para não ter padrão fixo no início
      return password.split("").sort(() => Math.random() - 0.5).join("");
    }

    const generatedPassword = !password ? generateSecurePassword() : null;
    const userPassword = password || generatedPassword!;

    // Create user using admin client
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: userEmail,
      password: userPassword,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (createError) {
      console.error("Error creating user:", createError);
      
      // Return user-friendly error messages in Portuguese
      let errorMessage = createError.message;
      if (createError.message.includes("already been registered") || 
          (createError as any).code === "email_exists") {
        errorMessage = email 
          ? "Este e-mail já está cadastrado no sistema"
          : "Esta matrícula já está cadastrada no sistema";
      }
      
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update profile with additional info (cargo, setor, matricula, e flag de troca de senha)
    const profileUpdate: Record<string, unknown> = { deve_trocar_senha: true };
    if (cargo) profileUpdate.cargo = cargo;
    if (setor) profileUpdate.setor = setor;
    if (matricula) profileUpdate.matricula = matricula;
    
    await supabaseAdmin
      .from("profiles")
      .update(profileUpdate)
      .eq("user_id", newUser.user.id);

    // Update role if different from default
    if (role && role !== "funcionario") {
      await supabaseAdmin
        .from("user_roles")
        .update({ role })
        .eq("user_id", newUser.user.id);
    }

    // Log the action
    await supabaseAdmin.from("logs_acesso").insert({
      user_id: requestingUser.id,
      acao: "criar_usuario",
      modulo: "admin",
      detalhes: { 
        novo_usuario_id: newUser.user.id,
        email: email || null,
        matricula: matricula || null,
        nome: full_name,
        role: role || "funcionario"
      },
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: { id: newUser.user.id, email: userEmail, matricula },
        // Retornar senha gerada para que admin possa comunicar ao usuário de forma segura
        // A senha será exibida apenas uma vez na interface do admin
        ...(generatedPassword ? { senhaTemporaria: generatedPassword } : {})
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
