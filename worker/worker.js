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
    // acepta los nombres de variables sin importar mayúsculas (GEMINI_KEY, Gemini_key, ALLOWED_ORIGINS, Allowed_origins…)
    const pick = re => { const k = Object.keys(env || {}).find(k => re.test(k)); return k ? String(env[k]) : ""; };
    const KV = env.TEXTOS || null;
    env = { GEMINI_KEY: pick(/^gemini/i), ALLOWED_ORIGINS: pick(/origin/i), MODEL: pick(/^model$/i), PINES: pick(/^pines$/i) };
    const origin = request.headers.get("Origin") || "";
    const allowed = (env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim().replace(/\/+$/, "")).filter(Boolean);
    const ok = allowed.includes(origin);
    const cors = {
      "Access-Control-Allow-Origin": ok ? origin : "null",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "content-type",
      "Vary": "Origin"
    };
    const out = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { ...cors, "content-type": "application/json" } });

    if (request.method === "OPTIONS") return new Response(null, { status: ok ? 204 : 403, headers: cors });
    if (!ok) return out({ error: "origen no permitido" }, 403);
    const path = new URL(request.url).pathname.replace(/\/+$/, "");
    if (path === "/textos") return textos(request, env, KV, out);
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

/* Textos propios de cada sucursal (frases y texto legal), guardados en KV.
   GET  /textos?o=codigo                      -> { textos }
   POST /textos { o, pin, textos:{...} }      -> guarda; el PIN se compara con el secreto PINES
   PINES: "codigo:pin,codigo2:pin2" (secreto del Worker). */
const CAMPOS = ["intro", "contacto", "saludo", "legal"];
async function textos(request, env, KV, out) {
  if (!KV) return out({ error: "falta el almacenamiento TEXTOS" }, 500);
  const slugOk = s => /^[a-z0-9-]{1,40}$/.test(s);
  if (request.method === "GET") {
    const o = new URL(request.url).searchParams.get("o") || "";
    if (!slugOk(o)) return out({ error: "código inválido" }, 400);
    return out({ textos: (await KV.get("textos:" + o, "json")) || {} });
  }
  if (request.method !== "POST") return out({ error: "método no permitido" }, 405);
  let b; try { b = await request.json(); } catch { return out({ error: "JSON inválido" }, 400); }
  const o = String(b.o || "");
  if (!slugOk(o)) return out({ error: "código inválido" }, 400);
  const failKey = "fallos:" + o;
  const fallos = Number(await KV.get(failKey)) || 0;
  if (fallos >= 5) return out({ error: "demasiados intentos, probá en una hora" }, 429);
  // tolera comillas, espacios, saltos de línea, ";" o "=" en el secreto PINES
  const pines = Object.fromEntries(String(env.PINES || "").replace(/["'`{}]/g, "").split(/[,;\n]+/)
    .map(x => x.split(/[:=]/).map(s => s.trim())).filter(x => x.length === 2 && x[0] && x[1]).map(([k, v]) => [k.toLowerCase(), v]));
  if (!Object.keys(pines).length) return out({ error: "falta el secreto PINES" }, 500);
  if (!pines[o]) return out({ error: "esta sucursal no tiene PIN en PINES" }, 500);
  if (String(b.pin || "").trim() !== pines[o]) {
    await KV.put(failKey, String(fallos + 1), { expirationTtl: 3600 });
    return out({ error: "PIN incorrecto" }, 401);
  }
  const t = {};
  for (const k of CAMPOS) if (typeof b.textos?.[k] === "string") t[k] = b.textos[k].slice(0, 800);
  await KV.put("textos:" + o, JSON.stringify(t));
  return out({ ok: true, textos: t });
}
