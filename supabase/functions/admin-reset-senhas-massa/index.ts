import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: requestingUser } } = await supabaseUser.auth.getUser();
    if (!requestingUser) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await supabaseAdmin
      .from("user_roles").select("role").eq("user_id", requestingUser.id).single();

    if (roleData?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Apenas administradores" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Buscar todos os usuários que devem trocar senha (criados pelo admin)
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("user_id")
      .eq("deve_trocar_senha", true);

    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ success: true, count: 0, message: "Nenhum usuário pendente" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let count = 0;
    const errors: string[] = [];

    for (const profile of profiles) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(
        profile.user_id,
        { password: "123456" }
      );
      if (error) {
        errors.push(`${profile.user_id}: ${error.message}`);
      } else {
        count++;
      }
    }

    return new Response(JSON.stringify({ success: true, count, total: profiles.length, errors }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
