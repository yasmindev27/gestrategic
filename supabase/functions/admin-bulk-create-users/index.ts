import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401, headers: corsHeaders });
    }

    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: requestingUser } } = await supabaseUser.auth.getUser();
    if (!requestingUser) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), { status: 401, headers: corsHeaders });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUser.id)
      .single();

    if (roleData?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Apenas administradores" }), { status: 403, headers: corsHeaders });
    }

    // Get all profissionais that don't have a user account yet
    const { data: profissionais, error: fetchError } = await supabaseAdmin
      .from("profissionais_saude")
      .select("nome, registro_profissional, especialidade")
      .eq("status", "ativo")
      .not("registro_profissional", "is", null);

    if (fetchError) throw fetchError;

    // Get existing matriculas
    const { data: existingProfiles } = await supabaseAdmin
      .from("profiles")
      .select("matricula")
      .not("matricula", "is", null);

    const existingMatriculas = new Set((existingProfiles || []).map((p: any) => p.matricula));

    const toCreate = (profissionais || []).filter(
      (p: any) => p.registro_profissional && !existingMatriculas.has(p.registro_profissional)
    );

    let created = 0;
    let errors: string[] = [];

    for (const prof of toCreate) {
      try {
        const email = `${prof.registro_profissional}@interno.local`;
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: "123456",
          email_confirm: true,
          user_metadata: { full_name: prof.nome },
        });

        if (createError) {
          errors.push(`${prof.nome}: ${createError.message}`);
          continue;
        }

        // Update profile
        await supabaseAdmin
          .from("profiles")
          .update({
            matricula: prof.registro_profissional,
            cargo: prof.especialidade,
            deve_trocar_senha: true,
          })
          .eq("user_id", newUser.user.id);

        created++;
      } catch (e) {
        errors.push(`${prof.nome}: ${e.message}`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        total: toCreate.length,
        created, 
        errors_count: errors.length,
        errors: errors.slice(0, 20)
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: corsHeaders }
    );
  }
});
