// Porta d'accés de tota la web. S'executa abans que qualsevol pàgina o funció.
// Si la variable SITE_PASSWORD no existeix, la web queda oberta.
// Amb SITE_PASSWORD: demana la contrasenya un cop i guarda una galeta (30 dies).

const COOKIE = "fisica_acces";

async function sha(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("fisica·" + text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function page(error) {
  return `<!doctype html><html lang="ca"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Accés · Física 1r Batx</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,200;0,400;0,600;1,300&family=JetBrains+Mono:wght@600&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:Inter,system-ui,sans-serif;background:#fafaf9;color:#1c1917;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
.card{width:100%;max-width:440px;background:#fff;border:1px solid #1c1917;padding:32px 28px;position:relative}.card::before{content:"";position:absolute;left:-1px;right:-1px;top:-1px;height:6px;background:#b91c1c}
.eyebrow{font-family:"JetBrains Mono",monospace;font-size:11px;font-weight:600;letter-spacing:.2em;text-transform:uppercase;color:#57534e;display:flex;gap:10px;align-items:center;margin-bottom:14px}.eyebrow::before{content:"";width:36px;height:1px;background:#b91c1c}
h1{font-weight:200;font-size:34px;letter-spacing:-.03em;line-height:1.05;margin-bottom:18px}h1 em{font-style:italic;font-weight:300;color:#b91c1c}
p{color:#44403c;font-size:15px;margin-bottom:18px}label{display:block;font-family:"JetBrains Mono",monospace;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#78716c;font-weight:600;margin-bottom:6px}
input{width:100%;padding:11px 12px;border:1px solid #d6d3d1;font-size:16px;font-family:inherit}input:focus{outline:none;border-color:#1c1917}
button{margin-top:14px;width:100%;background:#1c1917;color:#fff;border:0;padding:12px;font-family:"JetBrains Mono",monospace;font-size:12px;letter-spacing:.16em;text-transform:uppercase;font-weight:600;cursor:pointer}button:hover{background:#b91c1c}
.err{color:#b91c1c;font-family:"JetBrains Mono",monospace;font-size:12px;margin-top:10px}
</style></head><body><form class="card" method="post">
<div class="eyebrow">Física · 1r Batx</div><h1>Accés <em>restringit.</em></h1>
<p>Aquesta web és per a la Carla i la seva família. Escriu la contrasenya per entrar-hi.</p>
<label for="pw">Contrasenya</label><input id="pw" name="pw" type="password" autofocus autocomplete="current-password">
<button type="submit">Entra</button>${error ? '<div class="err">✕ Contrasenya incorrecta.</div>' : ''}
</form></body></html>`;
}

export default async (request, context) => {
  const password = Netlify.env.get("SITE_PASSWORD");
  if (!password) return context.next();
  const expected = await sha(password);
  const url = new URL(request.url);

  if (request.method === "POST" && request.headers.get("content-type")?.includes("application/x-www-form-urlencoded")) {
    const form = await request.formData();
    if (form.has("pw")) {
      if (form.get("pw") === password) {
        context.cookies.set({ name: COOKIE, value: expected, path: "/", httpOnly: true, secure: true, sameSite: "Lax", expires: new Date(Date.now() + 30 * 864e5) });
        return Response.redirect(url.origin + url.pathname, 303);
      }
      return new Response(page(true), { status: 401, headers: { "content-type": "text/html; charset=utf-8" } });
    }
  }

  if (context.cookies.get(COOKIE) === expected) return context.next();
  if (url.pathname.startsWith("/api/")) return new Response(JSON.stringify({ error: "Cal iniciar sessió." }), { status: 401, headers: { "content-type": "application/json" } });
  return new Response(page(false), { status: 401, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
};

