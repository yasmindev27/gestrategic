import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
};

interface PatientInfo {
  nome: string;
  prontuario?: string;
  linha?: number;
}

interface ExistingRecord {
  numero_prontuario: string;
  paciente_nome: string | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Verify user role
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: roles } = await supabaseService
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const allowedRoles = ['admin', 'faturamento', 'recepcao', 'nir', 'classificacao'];
    const hasAccess = roles?.some(r => allowedRoles.includes(r.role));
    if (!hasAccess) {
      return new Response(
        JSON.stringify({ error: 'Acesso negado' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Process file
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return new Response(
        JSON.stringify({ error: 'Nenhum arquivo enviado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processando arquivo: ${file.name}, tipo: ${file.type}, tamanho: ${file.size}`);

    // Convert file to base64 (chunk-based to avoid stack overflow on large files)
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const CHUNK = 8192;
    let binary = '';
    for (let i = 0; i < bytes.length; i += CHUNK) {
      binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
    }
    const base64 = btoa(binary);

    // Use Lovable AI to extract patient data from the PDF
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error("Serviço de IA não configurado no ambiente");
      return new Response(
        JSON.stringify({ error: "Serviço de processamento temporariamente indisponível", success: false }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Enviando PDF para análise via IA...');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Você é um especialista em extrair dados de documentos médicos. Sua tarefa é analisar o documento PDF e extrair a lista de pacientes.

INSTRUÇÕES:
1. Identifique todos os nomes de pacientes no documento
2. Para cada paciente, tente identificar também o número do prontuário se disponível
3. Retorne APENAS um JSON válido no seguinte formato, sem nenhum texto adicional:

{"pacientes": [{"nome": "NOME COMPLETO DO PACIENTE", "prontuario": "número ou null"}]}

REGRAS:
- Nomes devem estar em MAIÚSCULAS
- Ignore cabeçalhos, rodapés e textos que não são nomes de pacientes
- Se não encontrar pacientes, retorne: {"pacientes": []}
- Retorne SOMENTE o JSON, sem explicações ou markdown`
          },
          {
            role: 'user',
            content: [
              {
                type: 'file',
                file: {
                  filename: file.name,
                  file_data: `data:${file.type};base64,${base64}`
                }
              },
              {
                type: 'text',
                text: 'Extraia a lista de pacientes deste documento PDF do sistema Salus. Retorne apenas o JSON com os dados.'
              }
            ]
          }
        ],
        temperature: 0.1,
        max_tokens: 4000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Erro na API Lovable:', errorText);
      throw new Error(`Erro ao processar com IA: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || '';
    
    console.log('Resposta da IA recebida, parseando JSON...');

    // Parse the JSON response
    let pacientes: PatientInfo[] = [];
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        pacientes = parsed.pacientes || [];
      }
    } catch (parseError) {
      console.error('Erro ao parsear resposta da IA:', parseError);
      console.log('Conteúdo recebido:', content);
    }

    console.log(`Encontrados ${pacientes.length} pacientes no PDF`);

    // Fetch existing records from database
    const { data: existingRecords, error: dbError } = await supabaseService
      .from('saida_prontuarios')
      .select('numero_prontuario, paciente_nome');

    if (dbError) {
      console.error('Erro ao buscar registros existentes:', dbError);
      throw dbError;
    }

    console.log(`Encontrados ${existingRecords?.length || 0} registros existentes no sistema`);

    // Compare and find missing patients
    const existingNomes = new Set(
      (existingRecords || [])
        .filter(r => r.paciente_nome)
        .map(r => normalizeString(r.paciente_nome!))
    );
    
    const existingProntuarios = new Set(
      (existingRecords || [])
        .map(r => normalizeString(r.numero_prontuario))
    );

    const resultado = pacientes.map((paciente, index) => {
      const nomeNormalizado = normalizeString(paciente.nome);
      const prontuarioNormalizado = paciente.prontuario ? normalizeString(paciente.prontuario) : null;
      
      const existeNoSistema = existingNomes.has(nomeNormalizado) || 
        (prontuarioNormalizado && existingProntuarios.has(prontuarioNormalizado));
      
      return {
        nome: paciente.nome,
        prontuario: paciente.prontuario || null,
        linha: index + 1,
        existeNoSistema,
        status: existeNoSistema ? 'encontrado' : 'faltando'
      };
    });

    const faltando = resultado.filter(r => r.status === 'faltando');
    const encontrados = resultado.filter(r => r.status === 'encontrado');

    console.log(`Análise concluída: ${encontrados.length} encontrados, ${faltando.length} faltando`);

    return new Response(
      JSON.stringify({
        success: true,
        totalPdf: pacientes.length,
        totalSistema: existingRecords?.length || 0,
        encontrados: encontrados.length,
        faltando: faltando.length,
        pacientes: resultado,
        listaPdf: pacientes,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Erro ao processar PDF:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro ao processar arquivo';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}
