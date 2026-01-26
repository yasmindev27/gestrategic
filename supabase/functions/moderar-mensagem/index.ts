import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Lista expandida de palavras ofensivas em português
const palavrasOfensivas = [
  // Insultos gerais
  'idiota', 'imbecil', 'otário', 'babaca', 'cretino', 'estúpido', 'burro',
  'retardado', 'débil', 'mongoloide', 'vagabundo', 'lixo', 'verme', 'anta',
  'jumento', 'energúmeno', 'panaca', 'pateta', 'tonto', 'bobo', 'tapado',
  
  // Palavrões e vulgaridades
  'porra', 'merda', 'caralho', 'buceta', 'cu', 'foder', 'fodido', 'foda',
  'putaria', 'bosta', 'cacete', 'corno', 'arrombado', 'desgraçado',
  'filho da puta', 'filha da puta', 'fdp', 'pqp', 'vsf', 'tnc', 'vtnc',
  'cabeça de pica', 'pau no cu', 'vai se foder', 'vai tomar no cu',
  'porra', 'porr4', 'p0rra', 'merd4', 'c4ralho', 'buc3ta',
  
  // Termos de cunho sexual/prostituição
  'puta', 'prostituta', 'prostituto', 'piranha', 'vadia', 'vagabunda',
  'galinha', 'quenga', 'rapariga', 'meretriz', 'michê', 'garota de programa',
  'safada', 'safado', 'devassa', 'devasso', 'promíscua', 'promíscuo',
  'put4', 'v4dia', 'prost1tuta',
  
  // Ofensas homofóbicas
  'viado', 'bicha', 'boiola', 'veado', 'fresco', 'baitola', 'afeminado',
  'sapatão', 'sapata', 'fancha', 'maricona', 'maricas', 'gay' + ' nojento',
  'v1ado', 'b1cha',
  
  // Ofensas raciais/discriminatórias
  'macaco', 'crioulo', 'neguinho', 'preto sujo', 'amarelo', 'japa',
  'branquelo', 'nordestino sujo', 'paraíba', 'baiano burro',
  
  // Assédio sexual
  'gostosa', 'gostoso', 'delícia', 'tesão', 'tesuda', 'tesudo',
  'rabuda', 'rabudo', 'peituda', 'bunduda', 'cavalona',
  
  // Ameaças e violência
  'matar', 'morrer', 'acabar com você', 'te pego', 'vou te pegar',
  'vou te matar', 'te arrebento', 'te acabo', 'te quebro',
  'porrada', 'soco', 'tiro', 'facada', 'esfaquear',
  
  // Crimes
  'crime', 'roubar', 'matar', 'assassinar', 'estuprar', 'sequestrar',
  'traficar', 'traficante', 'bandido', 'criminoso', 'ladrão',
  'assaltar', 'assaltante', 'furtar',
];

// Padrões suspeitos para conteúdo adulto/criminoso
const padroesSuspeitos = [
  /nud[e|ez]/i,
  /porn[o|ô]/i,
  /sex[o|ual]\s*(explicito|oral|anal)/i,
  /drogas?\s*(pesadas?|ilicitas?)/i,
  /tráfico/i,
  /arma\s*de\s*fogo/i,
  /roubo/i,
  /assassin/i,
  /estupro/i,
  /pedofil/i,
  /menor\s*de\s*idade/i,
  /criança.*sex/i,
  /xvideos/i,
  /xhamster/i,
  /pornhub/i,
  /onlyfans/i,
  /nude.*foto/i,
  /foto.*nude/i,
  /pack.*nude/i,
];

interface ModerationResult {
  isApproved: boolean;
  violations: string[];
  severity: 'none' | 'low' | 'medium' | 'high';
  details: string;
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[0-9]/g, (match) => {
      // Substituir números por letras parecidas (l33t speak)
      const map: Record<string, string> = {
        '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b'
      };
      return map[match] || match;
    })
    .replace(/[@]/g, 'a')
    .replace(/[$]/g, 's');
}

function moderarTexto(texto: string): ModerationResult {
  const textoNormalizado = normalizeText(texto);
  const textoOriginalLower = texto.toLowerCase();
  const violations: string[] = [];
  let severity: 'none' | 'low' | 'medium' | 'high' = 'none';

  console.log(`Texto original: "${texto}"`);
  console.log(`Texto normalizado: "${textoNormalizado}"`);

  // Verificar palavras ofensivas
  for (const palavra of palavrasOfensivas) {
    const palavraNorm = normalizeText(palavra);
    
    // Verificar no texto normalizado
    if (textoNormalizado.includes(palavraNorm)) {
      violations.push(`Termo inadequado detectado`);
      severity = severity === 'none' ? 'medium' : 'high';
      console.log(`Palavra bloqueada encontrada: "${palavra}"`);
      break; // Uma violação é suficiente para bloquear
    }
    
    // Verificar correspondência exata de palavra
    const regex = new RegExp(`\\b${palavraNorm}\\b`, 'i');
    if (regex.test(textoNormalizado)) {
      violations.push(`Termo inadequado detectado`);
      severity = severity === 'none' ? 'medium' : 'high';
      console.log(`Palavra bloqueada (regex): "${palavra}"`);
      break;
    }
  }

  // Verificar padrões suspeitos
  if (violations.length === 0) {
    for (const padrao of padroesSuspeitos) {
      if (padrao.test(texto) || padrao.test(textoNormalizado)) {
        violations.push(`Conteúdo potencialmente inadequado detectado`);
        severity = 'high';
        console.log(`Padrão suspeito encontrado: ${padrao}`);
        break;
      }
    }
  }

  // Verificar tentativas de burlar filtros (caracteres especiais entre letras)
  if (violations.length === 0) {
    const textoSemEspacos = texto.replace(/[^a-zA-ZÀ-ÿ]/g, '').toLowerCase();
    const textoSemEspacosNorm = normalizeText(textoSemEspacos);
    
    for (const palavra of palavrasOfensivas) {
      if (palavra.length < 4) continue; // Ignorar palavras muito curtas
      
      const palavraSemEspacos = palavra.replace(/[^a-zA-ZÀ-ÿ]/g, '').toLowerCase();
      const palavraSemEspacosNorm = normalizeText(palavraSemEspacos);
      
      if (textoSemEspacosNorm.includes(palavraSemEspacosNorm)) {
        violations.push(`Tentativa de burlar filtro detectada`);
        severity = 'high';
        console.log(`Tentativa de burlar com: "${palavra}"`);
        break;
      }
    }
  }

  const isApproved = violations.length === 0;
  console.log(`Resultado: ${isApproved ? 'APROVADO' : 'BLOQUEADO'} - Violations: ${violations.length}`);

  return {
    isApproved,
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
    console.log(`Conteúdo: "${conteudo}"`);

    // Para texto, usar moderação local
    if (tipo === 'texto') {
      const resultado = moderarTexto(conteudo);
      
      if (!resultado.isApproved) {
        // Registrar log de moderação usando service role
        const { error: logError } = await supabase.from('chat_moderacao_logs').insert({
          user_id: user.id,
          tipo_violacao: resultado.violations.join('; '),
          conteudo_original: conteudo.substring(0, 500),
          acao_tomada: 'bloqueado',
          detalhes: {
            severity: resultado.severity,
            violations: resultado.violations
          }
        });

        if (logError) {
          console.error('Erro ao registrar log de moderação:', logError);
        }

        console.log(`Mensagem BLOQUEADA: ${resultado.details}`);

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

      console.log(`Mensagem APROVADA e inserida: ${mensagem.id}`);

      return new Response(
        JSON.stringify({ approved: true, mensagem }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Para imagens, bloquear por padrão
    if (tipo === 'imagem') {
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
