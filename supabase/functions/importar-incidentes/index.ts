import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/headers.ts";

function parseClassificacao(raw: string | null): string {
  if (!raw) return "moderado";
  const lower = raw.toLowerCase().trim();
  if (lower.includes("catastróf") || lower.includes("catastrofi")) return "catastrofico";
  if (lower.includes("grave")) return "grave";
  if (lower.includes("moderado") || lower.includes("moderada")) return "moderado";
  if (lower.includes("leve")) return "leve";
  return "moderado";
}

function parseTipoIncidente(raw: string | null): string {
  if (!raw) return "incidente_sem_dano";
  const lower = raw.toLowerCase().trim();
  if (lower.includes("evento adverso") || lower.includes("evento com dano")) return "evento_adverso";
  if (lower.includes("near miss") || lower.includes("quase") || lower.includes("quase um erro")) return "quase_erro";
  if (lower.includes("circunstância") || lower.includes("circunstancia")) return "incidente_sem_dano";
  if (lower.includes("não conformidade") || lower.includes("nao conformidade")) return "incidente_sem_dano";
  if (lower.includes("evento sem dano")) return "incidente_sem_dano";
  return "incidente_sem_dano";
}

function parseDate(raw: string | null): string | null {
  if (!raw || raw === "." || raw === "..." || raw === "-" || raw === "00" || raw === "0000") return null;
  
  try {
    // Try DD/MM/YYYY or DD/MM/YY format
    const parts = raw.replace(/\s+/g, " ").trim().split(/[\/\-\.]/);
    if (parts.length >= 3) {
      let day = parseInt(parts[0]);
      let month = parseInt(parts[1]);
      let year = parseInt(parts[2].split(" ")[0]); // Remove time part
      
      // Handle Excel date serial
      if (day > 31 && month <= 12) {
        // Swap - might be M/D/Y format
        [day, month] = [month, day];
      }
      
      if (year < 100) year += 2000;
      if (month < 1 || month > 12) return null;
      if (day < 1 || day > 31) return null;
      
      // Extract time if present
      const timeParts = raw.split(" ");
      let hours = "08", minutes = "00";
      if (timeParts.length > 1) {
        const time = timeParts[timeParts.length - 1];
        const tParts = time.split(":");
        if (tParts.length >= 2) {
          hours = tParts[0].padStart(2, "0");
          minutes = tParts[1].padStart(2, "0");
        }
      }
      
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${hours}:${minutes}:00-03:00`;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return null;
      return d.toISOString();
    }
  } catch {
    return null;
  }
  return null;
}

function cleanText(raw: string | null | undefined): string {
  if (!raw || raw === "." || raw === ".." || raw === "..." || raw === "-" || raw === "00" || raw === "0000") return "";
  return raw.trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { records } = await req.json();
    
    if (!records || !Array.isArray(records) || records.length === 0) {
      return new Response(JSON.stringify({ error: "Nenhum registro fornecido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let inserted = 0;
    let errors: string[] = [];
    const batchSize = 50;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const rows = batch
        .filter((r: any) => {
          const desc = cleanText(r.descricao);
          return desc.length > 5; // Skip empty/meaningless rows
        })
        .map((r: any) => {
          const dataOcorrencia = parseDate(r.data_ocorrido) || parseDate(r.data_abertura) || new Date().toISOString();
          const pacienteNome = cleanText(r.paciente_nome);
          const prontuario = cleanText(r.prontuario);
          const setorNotificante = cleanText(r.setor_notificante) || "Não informado";
          const setorNotificado = cleanText(r.setor_notificado) || setorNotificante;
          const descricao = cleanText(r.descricao);
          const correcao = cleanText(r.correcao);
          const classificacaoEvento = cleanText(r.classificacao_evento);
          const danoCausa = cleanText(r.dano_qual);
          const notificante = cleanText(r.assinatura_notificante);

          const classificacaoRisco = parseClassificacao(danoCausa || classificacaoEvento);
          const tipoIncidente = parseTipoIncidente(classificacaoEvento);

          const fullDesc = correcao
            ? `${descricao}\n\nCorreção/Ação imediata: ${correcao}`
            : descricao;

          return {
            numero_notificacao: "", // trigger generates
            tipo_incidente: tipoIncidente,
            data_ocorrencia: dataOcorrencia,
            local_ocorrencia: setorNotificado,
            setor: setorNotificado,
            setor_origem: setorNotificante,
            descricao: fullDesc,
            classificacao_risco: classificacaoRisco,
            status: "notificado",
            notificacao_anonima: !notificante,
            notificador_nome: notificante || null,
            paciente_envolvido: pacienteNome.length > 3,
            paciente_nome: pacienteNome || null,
            paciente_prontuario: prontuario || null,
            observacoes: classificacaoEvento ? `Classificação original: ${classificacaoEvento}` : null,
          };
        });

      if (rows.length > 0) {
        const { error } = await supabase.from("incidentes_nsp").insert(rows);
        if (error) {
          errors.push(`Batch ${i / batchSize + 1}: ${error.message}`);
        } else {
          inserted += rows.length;
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        inserted, 
        total: records.length,
        errors: errors.length > 0 ? errors : undefined 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
