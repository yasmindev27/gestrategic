import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { storagePaths } = await req.json();
    if (!storagePaths || !Array.isArray(storagePaths) || storagePaths.length === 0) {
      throw new Error("storagePaths é obrigatório (array de caminhos no bucket reunioes)");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Download all audio files and convert to base64
    const audioContents: { path: string; base64: string; mimeType: string }[] = [];

    for (const path of storagePaths) {
      const { data, error } = await supabase.storage.from("reunioes").download(path);
      if (error) {
        console.error(`Erro ao baixar ${path}:`, error);
        throw new Error(`Não foi possível baixar o arquivo: ${path}`);
      }

      const arrayBuffer = await data.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < uint8Array.length; i++) {
        binary += String.fromCharCode(uint8Array[i]);
      }
      const base64 = btoa(binary);

      const ext = path.split(".").pop()?.toLowerCase() || "ogg";
      const mimeType = ext === "ogg" ? "audio/ogg" : ext === "mp3" ? "audio/mpeg" : ext === "wav" ? "audio/wav" : `audio/${ext}`;

      audioContents.push({ path, base64, mimeType });
    }

    console.log(`Transcrevendo ${audioContents.length} arquivo(s) de áudio...`);

    // Build messages with audio content for Gemini
    const contentParts: any[] = [
      {
        type: "text",
        text: `Você é um transcritor profissional. Transcreva os áudios a seguir de forma LITERAL e COMPLETA em português brasileiro. 
Mantenha TODAS as palavras faladas, incluindo hesitações, repetições e erros de fala.
Identifique diferentes falantes quando possível (Falante 1, Falante 2, etc.).
NÃO resuma, NÃO omita detalhes. Transcreva tudo exatamente como foi dito.
Separe os áudios com "--- ÁUDIO X ---" quando houver mais de um.`,
      },
    ];

    for (let i = 0; i < audioContents.length; i++) {
      contentParts.push({
        type: "input_audio",
        input_audio: {
          data: audioContents[i].base64,
          format: audioContents[i].mimeType === "audio/ogg" ? "ogg" : audioContents[i].mimeType === "audio/mpeg" ? "mp3" : "wav",
        },
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: contentParts,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Erro na API de IA:", response.status, errText);
      throw new Error(`Erro na transcrição via IA: ${response.status}`);
    }

    const result = await response.json();
    const transcricao = result.choices?.[0]?.message?.content || "";

    console.log("Transcrição concluída. Tamanho:", transcricao.length, "caracteres");

    return new Response(JSON.stringify({ transcricao }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Erro:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
