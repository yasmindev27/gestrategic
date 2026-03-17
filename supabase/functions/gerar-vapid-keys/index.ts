const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function base64UrlEncode(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Generate ECDSA P-256 key pair for VAPID
    const keyPair = await crypto.subtle.generateKey(
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["sign", "verify"]
    );

    // Export public key as raw (65 bytes uncompressed)
    const publicKeyRaw = new Uint8Array(
      await crypto.subtle.exportKey("raw", keyPair.publicKey)
    );

    // Export private key as PKCS8
    const privateKeyPkcs8 = new Uint8Array(
      await crypto.subtle.exportKey("pkcs8", keyPair.privateKey)
    );

    const publicKeyBase64 = base64UrlEncode(publicKeyRaw);
    const privateKeyBase64 = base64UrlEncode(privateKeyPkcs8);

    return new Response(
      JSON.stringify({
        publicKey: publicKeyBase64,
        privateKey: privateKeyBase64,
        instructions: "Adicione VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY como secrets no projeto.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
