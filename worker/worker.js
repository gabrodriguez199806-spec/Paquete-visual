/*
  Paquete Visual - intermediario para leer recetas con Gemini (Cloudflare Worker)
  Copyright (C) 2026 Gabriel Rodriguez - AGPL-3.0 o posterior.

  Guarda la clave de Gemini escondida y solo atiende pedidos que vienen de tu sitio.
  Variables del Worker (Settings -> Variables and Secrets):
    GEMINI_KEY       (secreto) tu clave de Google AI Studio
    ALLOWED_ORIGINS  sitios permitidos separados por coma, ej: https://gabrodriguez199806-spec.github.io
    MODEL            opcional, por defecto gemini-flash-lite-latest
*/
const PROMPT = `Sos el asistente de una óptica en Argentina. La imagen es una receta oftalmológica (manuscrita o impresa). Transcribí los valores, sin interpretar ni corregir nada.
Devolvé SOLO un JSON con esta forma:
{"es_receta":true,"tipo":"anteojos"|"lc"|"ambos","fecha":"YYYY-MM-DD" o null,"medico":string o null,
 "od":{"esf":number|null,"cil":number|null,"eje":number|null,"add":number|null},
 "oi":{"esf":number|null,"cil":number|null,"eje":number|null,"add":number|null},
 "indicaciones":[string],"dudas":[string]}
Reglas: OD = ojo derecho, OI (u OS) = ojo izquierdo. "Neutro", "N" o "plano" en esférico = 0. Si hay filas separadas de Lejos y Cerca sin "ADD", la adición es esf de cerca menos esf de lejos. Si un valor no se lee con seguridad, poné null y explicá cuál en "dudas". Si dice lentes de contacto, tipo "lc". "indicaciones" son textos como "antirreflejo", "fotocromático", "uso permanente". Si la imagen no es una receta, "es_receta":false.`;

const MAX_B64 = 8 * 1024 * 1024; // ~6 MB de imagen

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowed = (env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
    const ok = allowed.includes(origin);
    const cors = {
      "Access-Control-Allow-Origin": ok ? origin : "null",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "content-type",
      "Vary": "Origin"
    };
    const out = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { ...cors, "content-type": "application/json" } });

    if (request.method === "OPTIONS") return new Response(null, { status: ok ? 204 : 403, headers: cors });
    if (!ok) return out({ error: "origen no permitido" }, 403);
    if (request.method !== "POST") return out({ error: "solo POST" }, 405);
    if (!env.GEMINI_KEY) return out({ error: "falta GEMINI_KEY" }, 500);

    let body;
    try { body = await request.json(); } catch { return out({ error: "JSON inválido" }, 400); }
    const mime = String(body.mime || "image/jpeg");
    const data = String(body.data || "");
    if (!/^image\/(jpeg|png|webp|heic|heif)$/.test(mime)) return out({ error: "formato no soportado" }, 415);
    if (!data || data.length > MAX_B64) return out({ error: "imagen vacía o muy grande" }, 413);

    const model = env.MODEL || "gemini-flash-lite-latest";
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": env.GEMINI_KEY },
      body: JSON.stringify({
        contents: [{ parts: [{ inline_data: { mime_type: mime, data } }, { text: PROMPT }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0 }
      })
    });
    if (!r.ok) return out({ error: "gemini " + r.status }, 502);
    const j = await r.json();
    const text = ((j.candidates || [])[0]?.content?.parts || []).map(p => p.text || "").join("");
    return out({ text });
  }
};
