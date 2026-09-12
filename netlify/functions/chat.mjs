// Tutor de física · Netlify Function (v2, streaming)
// Rep {topic, messages} i retorna text en streaming des de l'API de Claude.
// Sense dependències: crida directa a POST https://api.anthropic.com/v1/messages.
//
// Variables d'entorn (Site configuration → Environment variables):
//   ANTHROPIC_API_KEY   obligatòria
//   (la contrasenya de tota la web la gestiona netlify/edge-functions/gate.js)
//   CLAUDE_MODEL        opcional; per defecte claude-opus-5

import { TOPICS } from "./topics.mjs";

const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5";
const MAX_HISTORY = 24;          // missatges (usuari + tutor) que es conserven
const MAX_MESSAGE_CHARS = 4000;  // límit per missatge d'usuari

const SYSTEM_BASE = `Ets el tutor de física de la Carla, una alumna de 16 anys que fa 1r de Batxillerat a l'institut de Bagà (Berguedà, Catalunya). El seu llibre és "Física 1r Batxillerat" de McGraw-Hill (Serra, Mercadé, Armengol). Fa poc que ha començat el curs i el que li costa són els conceptes bàsics: no vol memoritzar fórmules, vol entendre-les.

Com treballes:
- Respon en la llengua en què t'escriu. Si escriu en català, català; si escriu en castellà, castellà. Els termes tècnics dona'ls sempre també en català, que és la llengua de la classe i de l'examen (mòdul, sentit, desplaçament, xifres significatives...).
- Llenguatge molt senzill, de conversa, frases curtes. Res de vocabulari de llibre si hi ha una paraula normal que ho digui igual. Vés directe a l'explicació. Cap preàmbul, cap "bona pregunta". Explica la idea amb una imatge concreta de la seva vida abans que amb la fórmula: el bus de Bagà a Berga, pujar al Pedraforca, la bici, el mòbil, el marcador d'un partit, l'aixeta de la dutxa. Després connecta la imatge amb la notació del llibre.
- Primer la intuïció, després la fórmula, després un exemple numèric petit amb unitats. Tanca amb una sola pregunta curta perquè comprovi que ho ha entès, quan tingui sentit. Mai més d'una pregunta.
- Respostes curtes: paràgrafs de dues o tres frases. Si la pregunta és gran, dona'n la primera peça i ofereix continuar.
- Matemàtiques en text pla llegible: v = Δx / Δt, 10^3, √(a² + b²), 2,5·10^-3. Sense LaTeX ni símbols de dòlar. Fes servir la coma decimal (3,45) com al llibre. Pots fer servir **negreta** per als termes clau i llistes curtes amb guions quan ajudin.
- Si li demanen fer un exercici del llibre o dels deures, no li donis la solució de cop: fes-li fer el primer pas (esquema, dades amb unitats, què es demana), corregeix-lo i avança pas a pas. Si després d'intentar-ho et demana la resolució completa, dona-la sencera i ordenada.
- Si s'equivoca, digues-li exactament on i per què, sense embuts i sense drama. Els errors habituals (barrejar unitats, oblidar el signe, confondre distància i desplaçament, pensar que acceleració vol dir anar ràpid) tracta'ls com el que són: trampes que li passen a tothom.
- No inventis dades, constants ni exemples que no puguis justificar. Si no saps una cosa, digues-ho.
- Mantén-te en física i en les matemàtiques que necessita per a la física. Si pregunta una altra cosa, respon breument i torna al tema.
- Cap emoji.`;

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });
}

export default async (req) => {
  if (req.method !== "POST") return json(405, { error: "Només POST" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return json(500, { error: "Falta ANTHROPIC_API_KEY a les variables d'entorn de Netlify." });

  let payload;
  try { payload = await req.json(); } catch { return json(400, { error: "JSON invàlid" }); }

  const topicId = typeof payload.topic === "string" && TOPICS[payload.topic] ? payload.topic : "inici";
  const topic = TOPICS[topicId];

  const raw = Array.isArray(payload.messages) ? payload.messages : [];
  const messages = raw
    .filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-MAX_HISTORY)
    .map(m => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_CHARS) }));

  // La conversa ha de començar per l'usuari i alternar rols.
  while (messages.length && messages[0].role !== "user") messages.shift();
  const clean = [];
  for (const m of messages) {
    if (clean.length && clean[clean.length - 1].role === m.role) clean[clean.length - 1].content += "\n\n" + m.content;
    else clean.push(m);
  }
  if (!clean.length || clean[clean.length - 1].role !== "user") return json(400, { error: "Cal un missatge d'usuari." });

  const system = [
    { type: "text", text: SYSTEM_BASE, cache_control: { type: "ephemeral" } },
    { type: "text", text: `Tema obert ara mateix a la web: "${topic.title}".\n\nResum del que diu el llibre sobre aquest tema (fes servir aquesta notació i aquests exemples):\n${topic.context}` }
  ];

  let upstream;
  try {
    upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "server-side-fallback-2026-07-01"
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4000,
        stream: true,
        system,
        messages: clean,
        output_config: { effort: "medium" },
        fallbacks: "default"
      })
    });
  } catch (err) {
    return json(502, { error: "No s'ha pogut connectar amb l'API: " + err.message });
  }

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => "");
    let detail = text;
    try { detail = JSON.parse(text).error?.message || text; } catch {}
    return json(upstream.status, { error: `API ${upstream.status}: ${detail.slice(0, 400)}` });
  }

  // Reenviem només el text (text_delta) com a flux de text pla.
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstream.body.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let idx;
          while ((idx = buffer.indexOf("\n")) >= 0) {
            const line = buffer.slice(0, idx).trim();
            buffer = buffer.slice(idx + 1);
            if (!line.startsWith("data:")) continue;
            const data = line.slice(5).trim();
            if (!data || data === "[DONE]") continue;
            let evt;
            try { evt = JSON.parse(data); } catch { continue; }
            if (evt.type === "content_block_delta" && evt.delta?.type === "text_delta") {
              controller.enqueue(encoder.encode(evt.delta.text));
            } else if (evt.type === "message_delta" && evt.delta?.stop_reason === "refusal") {
              controller.enqueue(encoder.encode("\n\n[El tutor no ha pogut respondre aquesta pregunta. Prova de formular-la d'una altra manera.]"));
            } else if (evt.type === "error") {
              controller.enqueue(encoder.encode("\n\n[Error de l'API: " + (evt.error?.message || "desconegut") + "]"));
            }
          }
        }
      } catch (err) {
        controller.enqueue(encoder.encode("\n\n[S'ha tallat la connexió: " + err.message + "]"));
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no"
    }
  });
};

export const config = { path: "/api/chat" };
