import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1Q1zW-Uuh7wzS93XHPIlR4wXjkAkodtSq1G2gdcTbBFQ/export?format=csv&gid=1114819951';

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let current = '';
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(current);
        current = '';
      } else if (ch === '\n' || (ch === '\r' && text[i + 1] === '\n')) {
        row.push(current);
        current = '';
        rows.push(row);
        row = [];
        if (ch === '\r') i++;
      } else {
        current += ch;
      }
    }
  }
  if (current || row.length > 0) {
    row.push(current);
    rows.push(row);
  }
  return rows;
}

function parseDateBR(val: string): string | null {
  if (!val) return null;
  const s = val.trim();
  const match = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, d, m, y] = match;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);
  // Excel serial
  const num = Number(s);
  if (!isNaN(num) && num > 30000) {
    const date = new Date((num - 25569) * 86400 * 1000);
    return date.toISOString().substring(0, 10);
  }
  return null;
}

function parseInteger(val: string): number | null {
  if (!val) return null;
  const n = parseInt(val.trim(), 10);
  return isNaN(n) ? null : n;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const userId = claimsData.claims.sub as string;

    // Get user name
    const { data: profile } = await supabase.from('profiles').select('full_name').eq('user_id', userId).single();
    const userName = profile?.full_name || 'Sistema';

    // Fetch CSV from Google Sheets
    console.log('Fetching Google Sheets CSV...');
    const csvResponse = await fetch(SHEET_CSV_URL);
    if (!csvResponse.ok) {
      throw new Error(`Erro ao buscar planilha: HTTP ${csvResponse.status}`);
    }
    const csvText = await csvResponse.text();
    console.log(`CSV fetched: ${csvText.length} bytes`);

    // Parse CSV
    const allRows = parseCSV(csvText);
    // Skip header row
    const dataRows = allRows.slice(1).filter(r => r.length > 0 && r[0]?.trim());

    console.log(`Parsed ${dataRows.length} data rows`);

    if (dataRows.length === 0) {
      return new Response(JSON.stringify({ success: true, count: 0, message: 'Nenhum dado encontrado na planilha' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Map rows to records
    const records = dataRows.map((r) => ({
      paciente_nome: (r[0] || '').trim(),
      data_nascimento: parseDateBR(r[1] || ''),
      idade: parseInteger(r[2] || ''),
      data_notificacao: parseDateBR(r[3] || '') || new Date().toISOString().substring(0, 10),
      unidade_notificadora: (r[4] || 'UPA').trim(),
      suspeita: (r[5] || 'DENGUE').trim().toUpperCase(),
      grupo: (r[6] || '').trim() || null,
      endereco: (r[7] || '').trim() || null,
      bairro: (r[8] || '').trim() || null,
      comorbidades: (r[9] || '').trim() || null,
      data_inicio_sintomas: parseDateBR(r[11] || ''),
      dias_evolucao: parseInteger(r[12] || ''),
      lab_data: parseDateBR(r[14] || ''),
      lab_exame: (r[15] || '').trim() || null,
      sorologia_data: parseDateBR(r[17] || ''),
      sorologia_resultado: (r[18] || '').trim() || null,
      ciclo1_data: parseDateBR(r[20] || ''),
      ciclo1_hematocrito: (r[21] || '').trim() || null,
      ciclo1_gl: (r[22] || '').trim() || null,
      ciclo1_plaquetas: (r[23] || '').trim() || null,
      ciclo2_data: parseDateBR(r[25] || ''),
      ciclo2_hematocrito: (r[26] || '').trim() || null,
      ciclo2_gl: (r[27] || '').trim() || null,
      ciclo2_plaquetas: (r[28] || '').trim() || null,
      ciclo3_data: parseDateBR(r[30] || ''),
      ciclo3_hematocrito: (r[31] || '').trim() || null,
      ciclo3_gl: (r[32] || '').trim() || null,
      ciclo3_plaquetas: (r[33] || '').trim() || null,
      investigacao_campo: (r[35] || '').trim() || null,
      registrado_por: userId,
      registrado_por_nome: userName,
    })).filter(r => r.paciente_nome.length > 0);

    // Use service role for bulk operations
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    // Delete all existing records
    await adminClient.from('notificacoes_arboviroses').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // Insert in batches of 100
    let inserted = 0;
    for (let i = 0; i < records.length; i += 100) {
      const batch = records.slice(i, i + 100);
      const { error } = await adminClient.from('notificacoes_arboviroses').insert(batch);
      if (error) {
        console.error(`Batch error at index ${i}:`, error);
        throw new Error(`Erro ao inserir lote ${i}: ${error.message}`);
      }
      inserted += batch.length;
    }

    console.log(`Successfully synced ${inserted} records`);

    return new Response(JSON.stringify({ success: true, count: inserted, message: `${inserted} notificações sincronizadas com sucesso` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Sync error:', error);
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
