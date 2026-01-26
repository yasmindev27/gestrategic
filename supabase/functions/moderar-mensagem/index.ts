import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Lista de palavras ofensivas em português (expandir conforme necessário)
const palavrasOfensivas = [
  // Insultos gerais
  'idiota', 'imbecil', 'otário', 'babaca', 'cretino', 'estúpido', 'burro',
  'retardado', 'débil', 'mongoloide', 'vagabundo', 'lixo', 'verme',
  // Palavrões
  'porra', 'merda', 'caralho', 'buceta', 'cu', 'foder', 'fodido', 'puta',
  'putaria', 'viado', 'bicha', 'bosta', 'cacete', 'corno', 'arrombado',
  // Ofensas raciais/discriminatórias
  'macaco', 'crioulo', 'neguinho', 'preto sujo', 'amarelo',
  // Assédio
  'gostosa', 'delícia', 'safada', 'piranha', 'vadia', 'vagabunda',
  // Ameaças
  'matar', 'morrer', 'acabar com você', 'te pego', 'vou te',
];

// Padrões suspeitos para conteúdo adulto/criminoso
const padroesSuspeitos = [
  /nud[e|ez]/i,
  /porn[o|ô]/i,
  /sex[o|ual]/i,
  /drogas?/i,
  /tráfico/i,
  /arma/i,
  /roubo/i,
  /assassin/i,
  /estupro/i,
  /pedofil/i,
  /menor/i,
  /criança/i,
];

interface ModerationResult {
  isApproved: boolean;
  violations: string[];
  severity: 'none' | 'low' | 'medium' | 'high';
  details: string;
}

function moderarTexto(texto: string): ModerationResult {
  const textoLower = texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const violations: string[] = [];
  let severity: 'none' | 'low' | 'medium' | 'high' = 'none';

  // Verificar palavras ofensivas
  for (const palavra of palavrasOfensivas) {
    const palavraNorm = palavra.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (textoLower.includes(palavraNorm)) {
      violations.push(`Palavra ofensiva detectada: "${palavra}"`);
      severity = severity === 'none' ? 'medium' : 'high';
    }
  }

  // Verificar padrões suspeitos
  for (const padrao of padroesSuspeitos) {
    if (padrao.test(texto)) {
      violations.push(`Conteúdo potencialmente inadequado detectado`);
      severity = 'high';
    }
  }

  // Verificar tentativas de burlar filtros (caracteres especiais entre letras)
  const textoSemEspacos = texto.replace(/[^a-zA-Z]/g, '').toLowerCase();
  for (const palavra of palavrasOfensivas) {
    const palavraSemEspacos = palavra.replace(/[^a-zA-Z]/g, '').toLowerCase();
    if (textoSemEspacos.includes(palavraSemEspacos) && textoSemEspacos.length > 3) {
      if (!violations.some(v => v.includes(palavra))) {
        violations.push(`Tentativa de burlar filtro detectada`);
        severity = 'high';
      }
    }
  }

  return {
    isApproved: violations.length === 0,
    violations,
    severity,
    details: violations.length > 0 
      ? `Mensagem bloqueada: ${violations.join(', ')}`
      : 'Mensagem aprovada'
  };
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verificar usuário autenticado
    const supabaseClient = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { conteudo, tipo, conversa_id } = await req.json();

    console.log(`Moderando mensagem de ${user.id} na conversa ${conversa_id}`);

    // Para texto, usar moderação local
    if (tipo === 'texto') {
      const resultado = moderarTexto(conteudo);
      
      if (!resultado.isApproved) {
        // Registrar log de moderação
        await supabase.from('chat_moderacao_logs').insert({
          user_id: user.id,
          tipo_violacao: resultado.violations.join('; '),
          conteudo_original: conteudo.substring(0, 500), // Limitar tamanho
          acao_tomada: 'bloqueado',
          detalhes: {
            severity: resultado.severity,
            violations: resultado.violations
          }
        });

        console.log(`Mensagem bloqueada: ${resultado.details}`);

        return new Response(
          JSON.stringify({
            approved: false,
            reason: 'Sua mensagem contém conteúdo que viola as políticas de uso do chat corporativo.',
            details: resultado.severity === 'high' 
              ? 'Conteúdo severamente inadequado detectado. Este incidente foi registrado.'
              : 'Por favor, reformule sua mensagem de forma respeitosa e profissional.'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Mensagem aprovada - inserir no banco
      const { data: mensagem, error: insertError } = await supabase
        .from('chat_mensagens')
        .insert({
          conversa_id,
          remetente_id: user.id,
          conteudo,
          tipo: 'texto'
        })
        .select()
        .single();

      if (insertError) {
        console.error('Erro ao inserir mensagem:', insertError);
        return new Response(
          JSON.stringify({ error: 'Erro ao enviar mensagem' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ approved: true, mensagem }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Para imagens, bloquear por padrão (implementar análise de imagem futuramente)
    if (tipo === 'imagem') {
      // Por segurança, imagens passam por moderação adicional
      // Aqui seria integrado um serviço de análise de imagem como Google Vision AI
      return new Response(
        JSON.stringify({
          approved: false,
          reason: 'O envio de imagens está temporariamente desabilitado para revisão de políticas de segurança.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Tipo de conteúdo não suportado' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro na moderação:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
