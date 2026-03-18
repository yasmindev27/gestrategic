import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/headers.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { pacientes } = await req.json() as {
      pacientes: Array<{
        paciente_nome: string;
        data_nascimento?: string;
        data_atendimento?: string;
        numero_prontuario?: string;
      }>;
    };

    if (!pacientes || !Array.isArray(pacientes) || pacientes.length === 0) {
      return new Response(
        JSON.stringify({ error: "Lista de pacientes vazia" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Recebidos ${pacientes.length} pacientes para inserção`);

    // Process in batches of 500
    const BATCH_SIZE = 500;
    let totalInseridos = 0;
    let totalDuplicados = 0;
    const erros: string[] = [];

    for (let i = 0; i < pacientes.length; i += BATCH_SIZE) {
      const batch = pacientes.slice(i, i + BATCH_SIZE);
      
      const records = batch.map((p) => ({
        paciente_nome: p.paciente_nome.trim().toUpperCase(),
        numero_prontuario: p.numero_prontuario || null,
        data_atendimento: p.data_atendimento || null,
        status: "ativo",
      }));

      const { data, error } = await supabase
        .from("prontuarios")
        .upsert(records, { 
          onConflict: "numero_prontuario",
          ignoreDuplicates: true 
        })
        .select("id");

      if (error) {
        console.error(`Erro no lote ${i / BATCH_SIZE + 1}:`, error.message);
        erros.push(`Lote ${i / BATCH_SIZE + 1}: ${error.message}`);
      } else {
        totalInseridos += data?.length || 0;
      }
    }

    // Success - no console.log

    return new Response(
      JSON.stringify({
        success: true,
        total_recebidos: pacientes.length,
        total_inseridos: totalInseridos,
        erros: erros.length > 0 ? erros : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    // Error handling without logging
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
