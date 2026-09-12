/* ============================================================
   FÍSICA 1r BATX · aplicació: navegació, comprova-ho, tutor
   ============================================================ */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const views = $$('.view');
  const topics = views.map(v => ({ id: v.dataset.topic, title: v.dataset.title, unit: v.dataset.unit, num: v.dataset.num, el: v }));
  const UNITS = { '0': 'Unitat 0 · Magnituds i mesura', '1': 'Unitat 1 · Cinemàtica en una dimensió', 'E': 'Eines · Matemàtiques' };
  const store = {
    get(k, d) { try { const v = localStorage.getItem('fisica.' + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('fisica.' + k, JSON.stringify(v)); } catch {} }
  };
  const toastEl = $('#toast'); let toastT;
  function toast(msg, cls) { toastEl.textContent = msg; toastEl.className = 'toast show ' + (cls || ''); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('show'), 2600); }

  /* ---------- navegació ---------- */
  const sidebar = $('#sidebar');
  function buildNav() {
    sidebar.innerHTML = '';
    const done = store.get('done', {});
    const home = document.createElement('div'); home.className = 'nav-group';
    home.innerHTML = `<a href="#inici" data-id="inici"><span class="n">○</span>Inici</a>`; sidebar.appendChild(home);
    for (const u of ['0', '1', 'E']) {
      const g = document.createElement('div'); g.className = 'nav-group';
      g.innerHTML = `<div class="eyebrow plain">${UNITS[u]}</div>`;
      topics.filter(t => t.unit === u).forEach(t => {
        const a = document.createElement('a'); a.href = '#' + t.id; a.dataset.id = t.id; a.className = done[t.id] ? 'done' : '';
        a.innerHTML = `<span class="n">${t.num}</span><span>${t.title}</span>`; g.appendChild(a);
      });
      sidebar.appendChild(g);
    }
    const map = $('#homeMap'); if (map) {
      map.innerHTML = '';
      for (const u of ['0', '1', 'E']) {
        const row = document.createElement('div'); row.className = 'unit-row';
        const [big, rest] = UNITS[u].split(' · ');
        row.innerHTML = `<div class="uh"><b>${big.replace('Unitat ', '')}</b>${rest}</div><div class="topic-list"></div>`;
        const list = row.querySelector('.topic-list');
        topics.filter(t => t.unit === u).forEach(t => { const a = document.createElement('a'); a.href = '#' + t.id; a.className = done[t.id] ? 'done' : ''; a.innerHTML = `<span class="n">${t.num}</span>${t.title}`; list.appendChild(a); });
        map.appendChild(row);
      }
    }
  }
  const inited = new Set();
  function show(id) {
    const t = topics.find(x => x.id === id) || topics[0];
    views.forEach(v => v.classList.toggle('active', v === t.el));
    $$('.sidebar a').forEach(a => a.classList.toggle('active', a.dataset.id === t.id));
    $('#topbarMeta').textContent = t.unit ? `${t.num} · ${t.title}` : 'Unitats 0 · 1';
    document.title = (t.unit ? t.title + ' · ' : '') + 'Física 1r Batx';
    if (!inited.has(t.id)) {
      inited.add(t.id);
      $$('.interactive', t.el).forEach(box => { const fn = window.INTERACTIVES && window.INTERACTIVES[box.dataset.interactive]; if (fn) { try { fn(box); } catch (e) { console.error(box.dataset.interactive, e); box.innerHTML = '<p style="padding:16px;color:var(--stone-500)">Aquest interactiu no s\'ha pogut carregar.</p>'; } } });
      buildPager(t);
    }
    sidebar.classList.remove('open'); $('#scrim').classList.remove('show');
    window.scrollTo({ top: 0 });
    chat.setTopic(t);
  }
  function buildPager(t) {
    const i = topics.indexOf(t); if (i < 1) return;
    const prev = topics[i - 1], next = topics[i + 1];
    const p = document.createElement('div'); p.className = 'pager';
    p.innerHTML = `<a href="#${prev.id}">↩ ${prev.unit ? prev.num + ' · ' : ''}${prev.title}</a>${next ? `<a href="#${next.id}">${next.num} · ${next.title} →</a>` : '<span></span>'}`;
    t.el.appendChild(p);
  }
  function route() { const id = location.hash.replace('#', '') || 'inici'; show(topics.some(t => t.id === id) ? id : 'inici'); }
  window.addEventListener('hashchange', route);
  $('#menuBtn').addEventListener('click', () => { const o = sidebar.classList.toggle('open'); $('#scrim').classList.toggle('show', o); });

  /* ---------- comprova-ho ---------- */
  $$('.q').forEach(q => {
    const ans = +q.dataset.answer, btns = $$('.opts button', q), why = $('.why', q), expl = $('.expl', q);
    btns.forEach((b, i) => b.addEventListener('click', () => {
      btns.forEach(x => x.classList.remove('right', 'wrong'));
      b.classList.add(i === ans ? 'right' : 'wrong'); if (i !== ans) btns[ans].classList.add('right');
      why.hidden = false; why.className = 'why ' + (i === ans ? 'ok' : 'ko'); why.innerHTML = (i === ans ? '<strong>Ben fet.</strong> ' : '<strong>Encara no.</strong> ') + expl.innerHTML;
      q.dataset.state = i === ans ? 'ok' : 'ko';
      const view = q.closest('.view'); const all = $$('.q', view);
      if (all.every(x => x.dataset.state === 'ok')) { const done = store.get('done', {}); if (!done[view.dataset.topic]) { done[view.dataset.topic] = true; store.set('done', done); buildNav(); $$('.sidebar a').forEach(a => a.classList.toggle('active', a.dataset.id === view.dataset.topic)); toast('Tema comprovat ✓'); } }
    }));
  });

  /* ---------- tutor (xat) ---------- */
  const CHIPS = {
    inici: ['Per on començo si no entenc els vectors?', 'Què és el més important de la unitat 0?', 'Com et faig preguntes d\'un exercici del llibre?'],
    magnituds: ['Per què l\'alegria no és una magnitud?', 'Diferència entre mesura directa i indirecta amb un exemple', 'Es poden sumar metres i segons?'],
    si: ['Explica\'m els factors de conversió amb 90 km/h', 'Per què 1 m² són 10 000 cm²?', 'Com escric 0,000036 en notació científica?'],
    dimensional: ['Equació dimensional de la pressió pas a pas', 'Per què el ½ no compta?', 'Com sé si una fórmula és homogènia?'],
    vectors: ['Diferència entre direcció i sentit', 'Com trobo l\'angle si a_x és negativa?', 'Què vol dir 3i + 5j?'],
    'operacions-vectors': ['Per què el producte escalar és un nombre?', 'Com calculo l\'angle entre dos vectors?', 'Què és el vector unitari i per a què serveix?'],
    error: ['Quantes xifres significatives té 0,0250?', 'Explica\'m l\'error absolut i el relatiu amb un exemple', 'Com arrodoneixo el resultat final?'],
    metode: ['Quina diferència hi ha entre hipòtesi i llei?', 'Com faig una hipòtesi per a la pràctica del pèndol?', 'Què vol dir directament proporcional?'],
    moviment: ['Per què es diu que el moviment és relatiu?', 'Què és un mòbil puntual?', 'Diferència entre trajectòria i gràfic x-t'],
    posicio: ['Desplaçament i distància: quan són iguals?', 'Un desplaçament negatiu què vol dir?', 'Què és Δ?'],
    velocitat: ['Explica\'m la velocitat instantània sense límits', 'Per què la velocitat mitjana pot ser zero?', 'Com passo de km/h a m/s?'],
    acceleracio: ['Acceleració negativa vol dir frenar?', 'Per què al punt més alt v = 0 però a no?', 'Què són els m/s²?'],
    mru: ['D\'on surt x = x₀ + v·t?', 'Com plantejo un problema de trobada?', 'Què vol dir el pendent del gràfic x-t?'],
    mrua: ['D\'on surt el ½ de la fórmula?', 'Quina equació uso si no tinc el temps?', 'Com sé si el mòbil frena o accelera?'],
    caiguda: ['Per què tot cau igual?', 'Com trio el signe de g?', 'Quant triga a pujar una pilota llançada a 15 m/s?'],
    grafics: ['Com llegeixo l\'àrea sota el gràfic v-t?', 'Què vol dir que el gràfic v-t talli l\'eix?', 'El gràfic x-t és el dibuix del camí?'],
    derivada: ['Explica\'m què és una derivada amb un exemple', 'Deriva x = 3t² + 2t', 'Per què derivar la posició dona la velocitat?'],
    trigo: ['Quan uso sinus i quan cosinus?', 'Com trobo l\'angle d\'un vector amb a_x negativa?', 'Com poso la calculadora en graus?']
  };
  const chat = (function () {
    const drawer = $('#drawer'), log = $('#drawerLog'), form = $('#drawerForm'), input = $('#drawerInput'), chips = $('#drawerChips'), scrim = $('#scrim');
    let topic = topics[0], histories = store.get('chat', {}), busy = false;
    function hist() { return histories[topic.id] || (histories[topic.id] = []); }
    function save() { for (const k in histories) histories[k] = histories[k].slice(-30); store.set('chat', histories); }
    function md(t) {
      const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>').replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,;:!?]|$)/g, '$1<strong>$2</strong>');
      const lines = t.split('\n'); let html = '', list = null, para = [];
      const flush = () => { if (para.length) { html += '<p>' + inline(para.join(' ')) + '</p>'; para = []; } };
      const closeList = () => { if (list) { html += `</${list}>`; list = null; } };
      for (const raw of lines) {
        const l = raw.trim();
        let m;
        if ((m = l.match(/^[-•*]\s+(.*)/))) { flush(); if (list !== 'ul') { closeList(); list = 'ul'; html += '<ul>'; } html += '<li>' + inline(m[1]) + '</li>'; }
        else if ((m = l.match(/^\d+[.)]\s+(.*)/))) { flush(); if (list !== 'ol') { closeList(); list = 'ol'; html += '<ol>'; } html += '<li>' + inline(m[1]) + '</li>'; }
        else if (l === '') { flush(); closeList(); }
        else { closeList(); para.push(l); }
      }
      flush(); closeList(); return html;
    }
    function render() {
      log.innerHTML = '';
      const h = hist();
      if (!h.length) log.innerHTML = `<div class="msg tutor"><div class="who">Tutor</div><div class="body"><p>Soc aquí per al tema <strong>${topic.title}</strong>. Pregunta el que vulguis, en català o en castellà: un concepte, un exercici del llibre, un dubte tonto. No n'hi ha cap.</p></div></div>`;
      for (const m of h) add(m.role, m.content, false);
      chips.innerHTML = ''; (CHIPS[topic.id] || []).forEach(q => { const b = document.createElement('button'); b.textContent = q; b.addEventListener('click', () => { input.value = q; send(); }); chips.appendChild(b); });
      log.scrollTop = log.scrollHeight;
    }
    function add(role, content, streaming) {
      const d = document.createElement('div'); d.className = 'msg ' + (role === 'user' ? 'user' : role === 'error' ? 'error' : 'tutor');
      d.innerHTML = `<div class="who">${role === 'user' ? 'Tu' : role === 'error' ? 'Error' : 'Tutor'}</div><div class="body${streaming ? ' streaming' : ''}"></div>`;
      const body = d.lastChild; if (role === 'user' || role === 'error') body.textContent = content; else body.innerHTML = md(content);
      log.appendChild(d); log.scrollTop = log.scrollHeight; return body;
    }
    function siteKey() { let k = store.get('key', ''); return k; }
    async function send() {
      const text = input.value.trim(); if (!text || busy) return;
      input.value = ''; busy = true; $('#drawerSend').disabled = true;
      hist().push({ role: 'user', content: text }); add('user', text, false); save();
      const body = add('assistant', '', true); let acc = '';
      try {
        const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-site-key': siteKey() }, body: JSON.stringify({ topic: topic.id, messages: hist().map(m => ({ role: m.role, content: m.content })) }) });
        if (res.status === 401) {
          body.parentElement.remove();
          const k = prompt('Aquesta web demana una clau d\'accés (la té qui l\'ha configurada):');
          if (k !== null) { store.set('key', k); hist().pop(); input.value = text; busy = false; $('#drawerSend').disabled = false; return send(); }
          throw new Error('Cal la clau d\'accés per parlar amb el tutor.');
        }
        if (!res.ok) { let e = 'Error ' + res.status; try { e = (await res.json()).error || e; } catch {} throw new Error(e); }
        const reader = res.body.getReader(), dec = new TextDecoder();
        while (true) { const { done, value } = await reader.read(); if (done) break; acc += dec.decode(value, { stream: true }); body.innerHTML = md(acc); log.scrollTop = log.scrollHeight; }
        body.classList.remove('streaming');
        if (!acc.trim()) throw new Error('El tutor no ha respost. Torna-ho a provar.');
        hist().push({ role: 'assistant', content: acc }); save();
      } catch (err) {
        body.parentElement.remove(); hist().pop(); save();
        add('error', err.message.includes('Failed to fetch') ? 'No s\'ha pogut connectar amb el tutor. Si estàs obrint la web en local sense Netlify, el xat no funciona: cal desplegar-la o executar "netlify dev".' : err.message, false);
      } finally { busy = false; $('#drawerSend').disabled = false; input.focus(); }
    }
    form.addEventListener('submit', e => { e.preventDefault(); send(); });
    input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
    $('#drawerClear').addEventListener('click', () => { histories[topic.id] = []; save(); render(); });
    function open() { drawer.classList.add('open'); if (window.innerWidth < 900) scrim.classList.add('show'); render(); setTimeout(() => input.focus(), 250); }
    function close() { drawer.classList.remove('open'); scrim.classList.remove('show'); }
    $('#drawerClose').addEventListener('click', close); scrim.addEventListener('click', () => { close(); sidebar.classList.remove('open'); });
    $('#askBtn').addEventListener('click', open); $$('.askbar .ask').forEach(b => b.addEventListener('click', open));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    return { open, close, setTopic(t) { topic = t; $('#drawerTopicNum').textContent = t.num || 'inici'; $('#drawerTopicTitle').textContent = t.title; if (drawer.classList.contains('open')) render(); } };
  })();

  buildNav(); route();
})();
