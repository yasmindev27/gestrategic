import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
};

// Lista MUITO expandida de palavras ofensivas em português (incluindo drogas, gírias, variações)
const palavrasOfensivas = [
  // Insultos gerais
  'idiota', 'imbecil', 'otário', 'otario', 'babaca', 'cretino', 'estúpido', 'estupido',
  'burro', 'burra', 'retardado', 'retardada', 'débil', 'debil', 'mongoloide', 'vagabundo',
  'vagabunda', 'lixo', 'verme', 'anta', 'jumento', 'jumenta', 'energúmeno', 'panaca',
  'pateta', 'tonto', 'tonta', 'bobo', 'boba', 'tapado', 'tapada', 'ignorante', 'imbecil',
  'trouxa', 'otaria', 'mané', 'mane', 'palhaço', 'palhaco', 'ridículo', 'ridiculo',
  
  // Palavrões e vulgaridades
  'porra', 'porr4', 'p0rra', 'merda', 'merd4', 'm3rda', 'caralho', 'c4ralho', 'car4lho',
  'buceta', 'buc3ta', 'bucket4', 'xoxota', 'xereca', 'cu', 'cú', 'foder', 'f0der',
  'fodido', 'fodida', 'foda', 'f0da', 'putaria', 'put4ria', 'bosta', 'b0sta',
  'cacete', 'cac3te', 'corno', 'c0rno', 'chifrudo', 'arrombado', 'arrombada',
  'desgraçado', 'desgraçada', 'desgracado', 'desgracada', 'filho da puta', 'filha da puta',
  'fdp', 'pqp', 'vsf', 'tnc', 'vtnc', 'lmfao', 'pnc', 'kct', 'cabeça de pica',
  'pau no cu', 'vai se foder', 'vai tomar no cu', 'vai se fuder', 'fuder', 'fud3r',
  'piroca', 'pir0ca', 'pica', 'p1ca', 'rola', 'r0la', 'pau', 'p4u', 'pinto', 'p1nto',
  'saco', 'sac0', 'bunda', 'bund4', 'peito', 'p3ito',
  
  // Termos de cunho sexual/prostituição
  'puta', 'put4', 'prostituta', 'prost1tuta', 'prostituto', 'piranha', 'p1ranha',
  'vadia', 'v4dia', 'vad1a', 'vagabunda', 'galinha', 'gal1nha', 'quenga', 'rapariga',
  'meretriz', 'michê', 'miche', 'garota de programa', 'gp', 'safada', 'safado',
  'saf4da', 'saf4do', 'devassa', 'devasso', 'promíscua', 'promíscuo', 'promiscua',
  'promiscuo', 'putinha', 'put1nha', 'putinho', 'cachorra', 'cach0rra',
  
  // Ofensas homofóbicas
  'viado', 'v1ado', 'vi4do', 'bicha', 'b1cha', 'bich4', 'boiola', 'b01ola',
  'veado', 'v3ado', 'fresco', 'fr3sco', 'baitola', 'afeminado', 'sapatão', 'sapata',
  'sapato', 'fancha', 'maricona', 'maricas', 'gay nojento', 'traveco', 'tr4veco',
  
  // Ofensas raciais/discriminatórias
  'macaco', 'mac4co', 'crioulo', 'crioul0', 'neguinho', 'preto sujo', 'amarelo',
  'japinha', 'japa', 'branquelo', 'nordestino sujo', 'paraíba', 'paraiba', 'baiano burro',
  'negão', 'negao', 'nega', 'negro sujo', 'pretinho', 'mulato', 'macaca',
  
  // Assédio sexual
  'gostosa', 'g0stosa', 'gostoso', 'g0stoso', 'delícia', 'del1cia', 'delicia',
  'tesão', 'tesao', 'tes4o', 'tesuda', 'tesudo', 'rabuda', 'rabudo', 'peituda',
  'bunduda', 'cavalona', 'cavalão', 'cavalao', 'gatinha', 'gat1nha',
  
  // Ameaças e violência
  'matar', 'mat4r', 'morrer', 'acabar com você', 'te pego', 'vou te pegar',
  'vou te matar', 'te arrebento', 'te acabo', 'te quebro', 'porrada', 'p0rrada',
  'soco', 'tiro', 't1ro', 'facada', 'fac4da', 'esfaquear', 'esfaqu3ar',
  'vou acabar contigo', 'desgraça', 'desgraca', 'inferno', '1nferno',
  
  // Crimes
  'crime', 'cr1me', 'roubar', 'r0ubar', 'assassinar', 'assassin4r', 'estuprar',
  'estupr4r', 'sequestrar', 's3questrar', 'traficar', 'traf1car', 'traficante',
  'trafic4nte', 'bandido', 'band1do', 'criminoso', 'crim1noso', 'ladrão', 'ladrao',
  'ladr4o', 'assaltar', 'ass4ltar', 'assaltante', 'furtar', 'furt4r',
  
  // DROGAS - Lista muito expandida
  'maconha', 'mac0nha', 'm4conha', 'macon ha', 'cannabis', 'cann4bis', 'marijuana',
  'marijuan4', 'erva', '3rva', 'baseado', 'bas3ado', 'beck', 'b3ck', 'bagulho',
  'bagulh0', 'ganja', 'g4nja', 'skunk', 'hash', 'haxixe', 'hax1xe', 'hashish',
  'cocaína', 'coca1na', 'cocaina', 'c0caina', 'coca', 'c0ca', 'pó', 'pó branco',
  'po branco', 'farinha', 'far1nha', 'crack', 'cr4ck', 'pedra', 'p3dra',
  'heroína', 'hero1na', 'heroina', 'her01na', 'hero', 'h3ro', 'lsd', 'ácido',
  'acido', 'ac1do', 'ecstasy', 'ext4sy', 'mdma', 'md', 'bala', 'b4la',
  'metanfetamina', 'meth', 'm3th', 'cristal', 'cr1stal', 'anfetamina', 'anf3tamina',
  'cetamina', 'c3tamina', 'ketamina', 'k3tamina', 'special k', 'cogumelo', 'c0gumelo',
  'psilocibina', 'ayahuasca', 'dmt', 'lança perfume', 'lanca perfume', 'loló', 'lolo',
  'l0l0', 'cheirinho', 'ch31rinho', 'cola', 'c0la', 'thinner', 'th1nner',
  'rebite', 'reb1te', 'bolinha', 'b0linha', 'drogas', 'dr0gas', 'droga', 'dr0ga',
  'entorpecente', 'ent0rpecente', 'narcótico', 'narc0tico', 'narcotico', 'viciado',
  'vic1ado', 'overdose', '0verdose', 'chapado', 'chap4do', 'lombrado', 'l0mbrado',
  'doidão', 'doid4o', 'doidao', 'noiado', 'n01ado', 'n0iado', 'crackudo', 'cr4ckudo',
  'maconheiro', 'macon heiro', 'noia', 'n01a', 'pino', 'p1no', 'carreira', 'carr31ra',
  'cheirar', 'ch31rar', 'fumar erva', 'fumar maconha', 'fumar beck', 'usar droga',
  'vender droga', 'comprar droga', 'trafico de drogas', 'tráfico de drogas',
  
  // Sites/termos pornográficos
  'xvideos', 'xv1deos', 'xhamster', 'xh4mster', 'pornhub', 'p0rnhub', 'onlyfans',
  '0nlyfans', 'redtube', 'r3dtube', 'youporn', 'y0uporn', 'brazzers', 'brazz3rs',
  'hentai', 'h3ntai', 'nude', 'nud3', 'nudes', 'nud3s', 'pack', 'p4ck',
  'sexo', 's3xo', 'sex0', 'pornô', 'porno', 'p0rno', 'pornografia', 'p0rnografia',
  
  // Variações com espaços e caracteres especiais
  'm a c o n h a', 'c o c a i n a', 'd r o g a', 'p u t a', 'm e r d a',
];

// Padrões suspeitos expandidos
const padroesSuspeitos = [
  /nud[e|ez]/i,
  /porn[o|ô|0]/i,
  /sex[o|ual]\s*(explicito|oral|anal|0ral|4nal)/i,
  /drogas?\s*(pesadas?|ilicitas?|1licitas?)/i,
  /tráfico/i,
  /trafico/i,
  /arma\s*de\s*fogo/i,
  /arma\s*de\s*f0g0/i,
  /roubo/i,
  /r0ubo/i,
  /assassin/i,
  /4ss4ssin/i,
  /estupro/i,
  /3stupro/i,
  /pedofil/i,
  /p3dofil/i,
  /menor\s*de\s*idade/i,
  /crian[cç]a.*sex/i,
  /xvideos/i,
  /xhamster/i,
  /pornhub/i,
  /onlyfans/i,
  /nude.*foto/i,
  /foto.*nude/i,
  /pack.*nude/i,
  /nude.*pack/i,
  /maconha/i,
  /mac0nha/i,
  /m4conha/i,
  /cocaina/i,
  /coca[ií]na/i,
  /c0caina/i,
  /heroina/i,
  /hero[ií]na/i,
  /crack\b/i,
  /baseado/i,
  /bagulho/i,
  /ganja/i,
  /haxixe/i,
  /ecstasy/i,
  /lsd\b/i,
  /mdma/i,
  /anfetamina/i,
  /metanfetamina/i,
  /ketamina/i,
  /cogumelo.*magico/i,
  /loló/i,
  /lan[cç]a.*perfume/i,
  /cheirar.*cola/i,
];

interface ModerationResult {
  isApproved: boolean;
  violations: string[];
  severity: 'none' | 'low' | 'medium' | 'high';
  details: string;
}

function normalizeText(text: string): string {
  let normalized = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // Remove acentos
  
  // Substituir números por letras (l33t speak)
  const leetMap: Record<string, string> = {
    '0': 'o', '1': 'i', '2': 'z', '3': 'e', '4': 'a', 
    '5': 's', '6': 'g', '7': 't', '8': 'b', '9': 'g'
  };
  
  for (const [num, letter] of Object.entries(leetMap)) {
    normalized = normalized.replace(new RegExp(num, 'g'), letter);
  }
  
  // Substituir caracteres especiais
  normalized = normalized
    .replace(/[@]/g, 'a')
    .replace(/[$]/g, 's')
    .replace(/[!]/g, 'i')
    .replace(/[|]/g, 'l');
  
  return normalized;
}

function removeSpacesAndSpecialChars(text: string): string {
  return text.replace(/[^a-zA-ZÀ-ÿ]/g, '').toLowerCase();
}

function moderarTexto(texto: string): ModerationResult {
  const textoNormalizado = normalizeText(texto);
  const textoSemEspacos = removeSpacesAndSpecialChars(texto);
  const textoSemEspacosNorm = normalizeText(textoSemEspacos);
  const violations: string[] = [];
  let severity: 'none' | 'low' | 'medium' | 'high' = 'none';

  console.log(`Texto original: "${texto}"`);
  console.log(`Texto normalizado: "${textoNormalizado}"`);
  console.log(`Texto sem espaços: "${textoSemEspacosNorm}"`);

  // Verificar palavras ofensivas (incluindo variações)
  for (const palavra of palavrasOfensivas) {
    const palavraNorm = normalizeText(palavra);
    const palavraSemEspacos = removeSpacesAndSpecialChars(palavra);
    const palavraSemEspacosNorm = normalizeText(palavraSemEspacos);
    
    // Verificar no texto normalizado
    if (textoNormalizado.includes(palavraNorm)) {
      violations.push(`Termo inadequado detectado: ${palavra}`);
      severity = 'high';
      console.log(`BLOQUEADO - Palavra encontrada: "${palavra}" em texto normalizado`);
      break;
    }
    
    // Verificar com regex (palavra completa)
    const regex = new RegExp(`\\b${palavraNorm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(textoNormalizado)) {
      violations.push(`Termo inadequado detectado: ${palavra}`);
      severity = 'high';
      console.log(`BLOQUEADO - Palavra (regex): "${palavra}"`);
      break;
    }
    
    // Verificar tentativa de burlar com espaços/caracteres especiais
    if (palavraSemEspacosNorm.length >= 4 && textoSemEspacosNorm.includes(palavraSemEspacosNorm)) {
      violations.push(`Tentativa de burlar filtro detectada`);
      severity = 'high';
      console.log(`BLOQUEADO - Tentativa de burlar com: "${palavra}"`);
      break;
    }
  }

  // Verificar padrões suspeitos
  if (violations.length === 0) {
    for (const padrao of padroesSuspeitos) {
      if (padrao.test(texto) || padrao.test(textoNormalizado) || padrao.test(textoSemEspacosNorm)) {
        violations.push(`Conteúdo potencialmente inadequado detectado`);
        severity = 'high';
        console.log(`BLOQUEADO - Padrão suspeito: ${padrao}`);
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

    const { conteudo, tipo, conversa_id, arquivo_url } = await req.json();

    console.log(`Moderando mensagem de ${user.id} na conversa ${conversa_id}`);
    console.log(`Conteúdo: "${conteudo}"`);
    console.log(`Tipo: ${tipo}`);

    // Para texto, usar moderação
    if (tipo === 'texto') {
      const resultado = moderarTexto(conteudo);
      
      if (!resultado.isApproved) {
        await supabase.from('chat_moderacao_logs').insert({
          user_id: user.id,
          tipo_violacao: resultado.violations.join('; '),
          conteudo_original: conteudo.substring(0, 500),
          acao_tomada: 'bloqueado',
          detalhes: {
            severity: resultado.severity,
            violations: resultado.violations
          }
        });

        console.log(`Mensagem BLOQUEADA: ${resultado.details}`);

        return new Response(
          JSON.stringify({
            approved: false,
            reason: 'Sua mensagem contém conteúdo que viola as políticas de uso do chat corporativo.',
            details: 'Por favor, reformule sua mensagem de forma respeitosa e profissional. Este incidente foi registrado.'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

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

    // Para arquivos, verificar tipo
    if (tipo === 'arquivo' && arquivo_url) {
      const extensoesProibidas = ['.exe', '.bat', '.cmd', '.msi', '.scr', '.vbs', '.js', '.jar'];
      const extensao = arquivo_url.toLowerCase().substring(arquivo_url.lastIndexOf('.'));
      
      if (extensoesProibidas.includes(extensao)) {
        await supabase.from('chat_moderacao_logs').insert({
          user_id: user.id,
          tipo_violacao: 'Arquivo executável proibido',
          conteudo_original: arquivo_url,
          acao_tomada: 'bloqueado',
          detalhes: { extensao }
        });

        return new Response(
          JSON.stringify({
            approved: false,
            reason: 'Este tipo de arquivo não é permitido por motivos de segurança.'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: mensagem, error: insertError } = await supabase
        .from('chat_mensagens')
        .insert({
          conversa_id,
          remetente_id: user.id,
          conteudo: conteudo || 'Arquivo anexado',
          tipo: 'arquivo',
          arquivo_url
        })
        .select()
        .single();

      if (insertError) {
        console.error('Erro ao inserir mensagem com arquivo:', insertError);
        return new Response(
          JSON.stringify({ error: 'Erro ao enviar arquivo' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ approved: true, mensagem }),
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
