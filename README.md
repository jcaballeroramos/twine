# Física 1r Batx · Entendre-ho

Web d'estudi per a Física de 1r de Batxillerat (unitats 0 i 1 del llibre de McGraw-Hill, Serra · Mercadé · Armengol): magnituds i mesura, vectors, error, mètode científic i cinemàtica en una dimensió. Cada tema té una explicació curta, un exemple quotidià, un interactiu SVG, els errors típics, tres preguntes de comprovació i un tutor per xat que ja sap en quin tema ets.

## Estructura

```
web/                      front estàtic (sense build)
  index.html              tot el contingut (18 vistes: inici + 17 temes)
  assets/css/style.css
  assets/js/interactives.js   18 interactius SVG
  assets/js/app.js            navegació, comprova-ho, client del xat
netlify/functions/
  chat.mjs                funció v2 amb streaming → POST /api/chat
  topics.mjs              context de cada tema per al tutor
netlify/edge-functions/
  gate.js                 porta d'accés amb contrasenya per a tota la web
netlify.toml
```

El xat crida l'API de Claude (`claude-opus-5`) directament amb `fetch`, sense dependències npm. El servidor només reenvia el text; la clau de l'API mai no arriba al navegador.

## Desplegar a Netlify

1. A [app.netlify.com](https://app.netlify.com): **Add new site → Import an existing project → GitHub** i tria aquest repositori. Branca a desplegar: `main` (o la branca on siguin aquests fitxers). Netlify llegeix `netlify.toml`: publica `web/` i les funcions de `netlify/functions/`. No cal build command.
2. **Site configuration → Environment variables**, afegeix:
   - `ANTHROPIC_API_KEY` (obligatòria): clau de [console.anthropic.com](https://console.anthropic.com).
   - `SITE_PASSWORD` (recomanada): una paraula qualsevol. Si hi és, tota la web (pàgines i xat) demana la contrasenya un cop per navegador i la recorda 30 dies (`netlify/edge-functions/gate.js`). Sense aquesta variable la web queda oberta.
   - `CLAUDE_MODEL` (opcional): per canviar de model; per defecte `claude-opus-5`.
3. **Deploy**. L'adreça serà `https://<nom>.netlify.app`. A partir d'aquí, cada push a la branca redesplega.

Per provar en local amb el xat: `npm i -g netlify-cli`, `netlify link` i `netlify dev` amb les variables al fitxer `.env`. Sense Netlify, `npx serve web` mostra la web però el xat no funciona.

## Cost aproximat del xat

Cada pregunta envia el context del tema (unes 1 500 paraules, en memòria cau) i l'historial de la conversa (fins a 24 missatges). Amb Claude Opus 5, una conversa d'estudi normal costa cèntims. El límit `max_tokens` és 4 000 per resposta.

## Afegir temes

Cada tema és una `<section class="view">` a `web/index.html` amb `data-topic`, `data-unit`, `data-num` i `data-title`; la navegació i els enllaços de la portada es generen sols. Un interactiu nou és una funció `I.nom` a `interactives.js` i un `<div class="interactive" data-interactive="nom">`. El context del tutor per a un tema nou va a `netlify/functions/topics.mjs` i les preguntes suggerides a `CHIPS` dins `app.js`.
