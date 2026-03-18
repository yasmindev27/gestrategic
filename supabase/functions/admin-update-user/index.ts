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
    
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUser.id)
      .single();

    if (roleData?.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Apenas administradores podem editar usuários" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { user_id, full_name, matricula, cargo, setor, email, password } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "ID do usuário é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get current user data for logging
    const { data: currentProfile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, cargo, setor")
      .eq("user_id", user_id)
      .single();

    // Update profile
    const profileUpdates: Record<string, string> = {};
    if (full_name) profileUpdates.full_name = full_name;
    if (matricula !== undefined) profileUpdates.matricula = matricula;
    if (cargo !== undefined) profileUpdates.cargo = cargo;
    if (setor !== undefined) profileUpdates.setor = setor;

    if (Object.keys(profileUpdates).length > 0) {
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update(profileUpdates)
        .eq("user_id", user_id);

      if (profileError) {
        console.error("Error updating profile:", profileError);
        return new Response(
          JSON.stringify({ error: "Erro ao atualizar perfil" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Update auth user if email, password, or matricula changed
    const authUpdates: { email?: string; password?: string; user_metadata?: Record<string, string> } = {};
    if (email) {
      authUpdates.email = email;
    } else if (matricula !== undefined && !email) {
      // If matricula changed but no explicit email, update the internal email to match
      const { data: currentAuth } = await supabaseAdmin.auth.admin.getUserById(user_id);
      if (currentAuth?.user?.email?.endsWith('@interno.local')) {
        authUpdates.email = `${matricula}@interno.local`;
      }
    }
    if (password) authUpdates.password = password;
    if (full_name) authUpdates.user_metadata = { full_name };

    if (Object.keys(authUpdates).length > 0) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        user_id,
        authUpdates
      );

      if (authError) {
        console.error("Error updating auth:", authError);
        return new Response(
          JSON.stringify({ error: authError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Log the action
    await supabaseAdmin.from("logs_acesso").insert({
      user_id: requestingUser.id,
      acao: "editar_usuario",
      modulo: "admin",
      detalhes: { 
        usuario_editado_id: user_id,
        nome_anterior: currentProfile?.full_name,
        alteracoes: { ...profileUpdates, email_alterado: !!email, senha_alterada: !!password }
      },
    });

    return new Response(
      JSON.stringify({ success: true }),
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
