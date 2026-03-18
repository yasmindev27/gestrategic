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
    const cleaned = raw.replace(/\s+/g, " ").trim();
    
    // Try to split date from time
    const spaceIdx = cleaned.indexOf(" ");
    const datePart = spaceIdx > 0 ? cleaned.substring(0, spaceIdx) : cleaned;
    const timePart = spaceIdx > 0 ? cleaned.substring(spaceIdx + 1) : "";

    // Split date by common separators
    const parts = datePart.split(/[\/\-\.]/);
    if (parts.length < 2) return null;

    let day: number, month: number, year: number;

    if (parts.length === 2) {
      // DD/MM format without year — assume 2025
      day = parseInt(parts[0]);
      month = parseInt(parts[1]);
      year = 2025;
    } else {
      // DD/MM/YYYY or DD/MM/YY
      day = parseInt(parts[0]);
      month = parseInt(parts[1]);
      year = parseInt(parts[2]);
    }

    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;

    // Fix 2-digit year
    if (year < 100) {
      year = year > 50 ? 1900 + year : 2000 + year;
    }

    // Brazilian format is DD/MM/YYYY. If day > 12, it's definitely the day.
    // If month > 12, then it's swapped (M/D/Y format from Excel).
    if (month > 12 && day <= 12) {
      [day, month] = [month, day];
    }

    // Validate
    if (month < 1 || month > 12) return null;
    if (day < 1 || day > 31) return null;

    // Sanity: incident dates should be between 2024 and 2026
    if (year < 2024 || year > 2026) return null;

    // Parse time
    let hours = 8, minutes = 0;
    if (timePart) {
      const tParts = timePart.split(":");
      if (tParts.length >= 2) {
        const h = parseInt(tParts[0]);
        const m = parseInt(tParts[1]);
        if (!isNaN(h) && h >= 0 && h <= 23) hours = h;
        if (!isNaN(m) && m >= 0 && m <= 59) minutes = m;
      }
    }

    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00-03:00`;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d.toISOString();
  } catch {
    return null;
  }
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
        .map((r: any) => {
          // Try data_ocorrido first, then data_abertura, then fallback
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
            numero_notificacao: "",
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
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
