/* ============================================================
   FÍSICA 1r BATX · interactius (SVG, sense dependències)
   Cada interactiu és una funció registrada a I[nom] que rep el
   contenidor <div class="interactive" data-interactive="nom">.
   ============================================================ */
(function () {
  'use strict';
  const I = {};
  const NS = 'http://www.w3.org/2000/svg';

  /* ---------- utilitats ---------- */
  function fmt(n, d = 2) {
    if (!isFinite(n)) return '—';
    let s = (Math.abs(n) < 1e-12 ? 0 : n).toFixed(d);
    if (Object.is(+s, -0) || +s === 0) s = (0).toFixed(d);
    return s.replace('.', ',');
  }
  function sci(n) {
    if (n === 0) return '0';
    const e = Math.floor(Math.log10(Math.abs(n)));
    const m = n / Math.pow(10, e);
    return `${fmt(m, 2)}·10<sup>${e}</sup>`;
  }
  function el(tag, attrs = {}, children = []) {
    const e = document.createElement(tag);
    for (const k in attrs) {
      if (k === 'html') e.innerHTML = attrs[k];
      else if (k === 'text') e.textContent = attrs[k];
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), attrs[k]);
      else e.setAttribute(k, attrs[k]);
    }
    for (const c of [].concat(children)) if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    return e;
  }
  function svg(tag, attrs = {}) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

  function shell(container, opts) {
    clear(container);
    const head = el('div', { class: 'ihead' }, [
      el('div', { class: 'eyebrow', html: `Interactiu <span class="sep">·</span> ${opts.title}` }),
      el('div', { class: 'hint', text: opts.hint || '' })
    ]);
    const canvas = el('div', { class: 'canvas' });
    const panel = el('div', { class: 'panel' });
    const body = el('div', { class: 'ibody' + (opts.stack ? ' stack' : '') }, [canvas, panel]);
    container.appendChild(head); container.appendChild(body);
    return { canvas, panel };
  }
  function slider(panel, label, min, max, step, value, onInput, fmtVal) {
    const lab = el('label', { html: `${label} <span class="val"></span>` });
    const inp = el('input', { type: 'range', min, max, step, value });
    const v = lab.querySelector('.val');
    const upd = () => { v.textContent = fmtVal ? fmtVal(+inp.value) : inp.value; };
    inp.addEventListener('input', () => { upd(); onInput(+inp.value); });
    panel.appendChild(lab); panel.appendChild(inp); upd();
    return inp;
  }
  function readout(panel, rows) {
    const box = el('div', { class: 'readout' });
    const map = {};
    for (const r of rows) {
      const line = el('div', { class: r.big ? 'big' : '' }, [el('span', { html: r.label }), el('span', { html: '' })]);
      map[r.key] = line.lastChild; box.appendChild(line);
    }
    const note = el('span', { class: 'note' }); box.appendChild(note);
    panel.appendChild(box);
    return { set: (k, html) => { if (map[k]) map[k].innerHTML = html; }, note: (html) => { note.innerHTML = html; } };
  }

  /* gràfic 2D amb eixos */
  function graph(parent, o) {
    const W = o.w || 360, H = o.h || 240, m = { l: 44, r: 14, t: 18, b: 32 };
    const s = svg('svg', { viewBox: `0 0 ${W} ${H}` });
    const X = x => m.l + (x - o.xmin) / (o.xmax - o.xmin) * (W - m.l - m.r);
    const Y = y => H - m.b - (y - o.ymin) / (o.ymax - o.ymin) * (H - m.t - m.b);
    const g = svg('g', { class: 'svg-grid' });
    const xt = o.xticks || 5, yt = o.yticks || 4;
    for (let i = 0; i <= xt; i++) { const x = o.xmin + (o.xmax - o.xmin) * i / xt; g.appendChild(svg('line', { x1: X(x), x2: X(x), y1: m.t, y2: H - m.b })); s.appendChild(text(X(x), H - m.b + 16, fmt(x, o.xd ?? 0), 'svg-label', 'middle')); }
    for (let i = 0; i <= yt; i++) { const y = o.ymin + (o.ymax - o.ymin) * i / yt; g.appendChild(svg('line', { x1: m.l, x2: W - m.r, y1: Y(y), y2: Y(y) })); s.appendChild(text(m.l - 6, Y(y) + 4, fmt(y, o.yd ?? 0), 'svg-label', 'end')); }
    s.appendChild(g);
    // eixos
    s.appendChild(svg('line', { class: 'svg-axis', x1: m.l, x2: W - m.r, y1: Y(0 >= o.ymin && 0 <= o.ymax ? 0 : o.ymin), y2: Y(0 >= o.ymin && 0 <= o.ymax ? 0 : o.ymin) }));
    s.appendChild(svg('line', { class: 'svg-axis', x1: X(0 >= o.xmin && 0 <= o.xmax ? 0 : o.xmin), x2: X(0 >= o.xmin && 0 <= o.xmax ? 0 : o.xmin), y1: m.t, y2: H - m.b }));
    s.appendChild(text(W - m.r, H - 4, o.xlabel || 't (s)', 'svg-mono muted', 'end'));
    s.appendChild(text(m.l + 4, m.t - 6, o.ylabel || '', 'svg-mono muted', 'start'));
    const layer = svg('g'); s.appendChild(layer);
    parent.appendChild(s);
    return { s, X, Y, layer, W, H, m,
      clip: (x) => Math.max(o.xmin, Math.min(o.xmax, x)),
      path: (pts, cls) => { const d = pts.map((p, i) => (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1)).join(' '); const p = svg('path', { d, class: cls || 'svg-curve' }); layer.appendChild(p); return p; },
      dot: (x, y, r, cls) => { const c = svg('circle', { cx: X(x), cy: Y(y), r: r || 5, class: cls || 'svg-handle' }); layer.appendChild(c); return c; },
      label: (x, y, t, cls, anchor) => { const tt = text(X(x), Y(y), t, cls || 'svg-mono', anchor); layer.appendChild(tt); return tt; }
    };
  }
  function text(x, y, t, cls, anchor) {
    const e = svg('text', { x, y, class: cls || 'svg-mono', 'text-anchor': anchor || 'start' });
    e.textContent = t; return e;
  }
  function arrow(layer, x1, y1, x2, y2, cls, id) {
    const g = svg('g');
    const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1;
    const ux = dx / L, uy = dy / L;
    const hx = x2 - ux * 10, hy = y2 - uy * 10;
    g.appendChild(svg('line', { x1, y1, x2: hx, y2: hy, class: cls }));
    g.appendChild(svg('polygon', { points: `${x2},${y2} ${hx - uy * 5},${hy + ux * 5} ${hx + uy * 5},${hy - ux * 5}`, class: cls, style: 'fill: currentColor; stroke: none' }));
    g.setAttribute('style', `color: ${cls === 'svg-vec2' ? 'var(--accent)' : cls === 'svg-vec3' ? 'var(--cat-blue)' : 'var(--ink)'}`);
    layer.appendChild(g); return g;
  }
  function drag(svgEl, handle, toCoords, onMove) {
    let active = false;
    const pt = (ev) => { const r = svgEl.getBoundingClientRect(); const vb = svgEl.viewBox.baseVal; const p = ev.touches ? ev.touches[0] : ev; return [(p.clientX - r.left) / r.width * vb.width, (p.clientY - r.top) / r.height * vb.height]; };
    const start = (ev) => { active = true; ev.preventDefault(); };
    const move = (ev) => { if (!active) return; ev.preventDefault(); onMove(toCoords(...pt(ev))); };
    const end = () => { active = false; };
    handle.addEventListener('mousedown', start); handle.addEventListener('touchstart', start, { passive: false });
    window.addEventListener('mousemove', move); window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('mouseup', end); window.addEventListener('touchend', end);
  }
  function player(panel, onTick, opts = {}) {
    let playing = false, last = 0, t = 0, raf;
    const tmax = opts.tmax || 10;
    const btn = el('button', { class: 'btn', text: 'Reprodueix' });
    const reset = el('button', { class: 'btn ghost', text: 'Reinicia', style: 'margin-left:8px' });
    const row = el('div', {}, [btn, reset]);
    const sl = slider(panel, 'Temps t', 0, tmax, 0.05, 0, v => { t = v; onTick(t); }, v => fmt(v, 2) + ' s');
    function loop(now) { if (!playing) return; const dt = (now - last) / 1000; last = now; t = Math.min(tmax, t + dt * (opts.speed || 1)); sl.value = t; sl.dispatchEvent(new Event('input')); if (t >= tmax) stop(); else raf = requestAnimationFrame(loop); }
    function stop() { playing = false; btn.textContent = 'Reprodueix'; cancelAnimationFrame(raf); }
    btn.addEventListener('click', () => { if (playing) return stop(); if (t >= tmax) t = 0; playing = true; btn.textContent = 'Pausa'; last = performance.now(); raf = requestAnimationFrame(loop); });
    reset.addEventListener('click', () => { stop(); t = 0; sl.value = 0; sl.dispatchEvent(new Event('input')); });
    panel.appendChild(row);
    return { get t() { return t; }, set(v) { t = v; sl.value = v; sl.dispatchEvent(new Event('input')); }, stop };
  }

  /* ===================================================== 0.1 valor + unitat */
  I.valorunitat = function (c) {
    const { canvas, panel } = shell(c, { title: 'Valor + unitat', hint: 'Tria una situació i mira què és una magnitud, què és mesurar-la i de quina mena és.', stack: true });
    const data = [
      { q: 'La teva alçada', v: '1,68', u: 'm', ins: 'una cinta mètrica', tipus: 'directe', esc: 'escalar', why: 'La llegeixes directament a la cinta. Un sol nombre ho diu tot.' },
      { q: 'La velocitat del bus a la C-16', v: '80', u: 'km/h', ins: 'el velocímetre (o distància i temps)', tipus: 'directe amb velocímetre, indirecte si calcules Δx/Δt', esc: 'vectorial', why: '80 km/h cap a Berga o cap a Bagà: cal el sentit.' },
      { q: 'L\'àrea de l\'habitació', v: '12,5', u: 'm²', ins: 'un regle, dos cops, i una multiplicació', tipus: 'indirecte', esc: 'escalar', why: 'No hi ha cap aparell d\'àrea: mesures costats i calcules.' },
      { q: 'La temperatura de l\'aigua', v: '27', u: '°C (300 K)', ins: 'un termòmetre', tipus: 'directe', esc: 'escalar', why: 'Un nombre i prou. Cap direcció.' },
      { q: 'La força amb què empenys una porta', v: '15', u: 'N', ins: 'un dinamòmetre', tipus: 'directe', esc: 'vectorial', why: 'Empènyer cap endins o cap enfora no és el mateix.' },
      { q: 'La bellesa d\'una posta de sol', v: '?', u: '?', ins: 'cap', tipus: '—', esc: '—', why: 'No es pot mesurar ni expressar en cap unitat. No és una magnitud física.' }
    ];
    const sel = el('select'); data.forEach((d, i) => sel.appendChild(el('option', { value: i, text: d.q })));
    panel.appendChild(el('label', { text: 'Situació' })); panel.appendChild(sel);
    const R = readout(panel, [{ key: 'v', label: 'Valor + unitat', big: true }, { key: 'i', label: 'Instrument' }, { key: 't', label: 'Mesurament' }, { key: 'e', label: 'Tipus de magnitud' }]);
    const big = el('div', { style: 'font-family:var(--mono);font-size:clamp(28px,5vw,56px);font-weight:300;padding:14px 6px;letter-spacing:-0.02em' });
    canvas.appendChild(big);
    function upd() { const d = data[+sel.value]; big.innerHTML = d.v === '?' ? '<span style="color:var(--stone-400)">? ?</span>' : `${d.v} <span style="color:var(--accent)">${d.u}</span>`; R.set('v', d.v === '?' ? 'no en té' : `${d.v} ${d.u}`); R.set('i', d.ins); R.set('t', d.tipus); R.set('e', d.esc); R.note(d.why); }
    sel.addEventListener('change', upd); upd();
  };

  /* ===================================================== 0.2 prefixos */
  I.prefixos = function (c) {
    const { canvas, panel } = shell(c, { title: 'Prefixos del SI', hint: 'Mou el control i mira com el prefix substitueix zeros.' });
    const P = { 12: ['tera', 'T'], 9: ['giga', 'G'], 6: ['mega', 'M'], 3: ['kilo', 'k'], 2: ['hecto', 'h'], 1: ['deca', 'da'], 0: ['—', ''], '-1': ['deci', 'd'], '-2': ['centi', 'c'], '-3': ['mil·li', 'm'], '-6': ['micro', 'μ'], '-9': ['nano', 'n'], '-12': ['pico', 'p'] };
    const steps = [-12, -9, -6, -3, -2, -1, 0, 1, 2, 3, 6, 9, 12];
    const ex = { 12: '1 Tm ≈ 6,7 vegades la distància Terra-Sol', 9: '1 GW: la potència d\'una central nuclear', 6: '1 Mm = 1000 km, Bagà–Sevilla més o menys', 3: '1 km: del centre de Bagà al pont del Bastareny i tornar', 2: '1 hm: un camp de futbol', 1: '1 dam: la llargada d\'un autobús', 0: '1 m: un pas llarg', '-1': '1 dm: un pam', '-2': '1 cm: l\'ample d\'un dit', '-3': '1 mm: el gruix d\'una targeta', '-6': '1 μm: un bacteri', '-9': '1 nm: uns 10 àtoms en fila', '-12': '1 pm: menys que un àtom' };
    const big = el('div', { style: 'padding:10px 6px' });
    canvas.appendChild(big);
    let idx = 6;
    const sl = slider(panel, 'Exponent', 0, steps.length - 1, 1, idx, v => { idx = v; upd(); }, v => '10^' + steps[v]);
    const R = readout(panel, [{ key: 'p', label: 'Prefix', big: true }, { key: 'n', label: 'Vol dir' }, { key: 'e', label: 'Exemple' }]);
    function upd() {
      const e = steps[idx]; const [name, sym] = P[e];
      const num = e >= 0 ? '1' + '0'.repeat(e) : '0,' + '0'.repeat(-e - 1) + '1';
      big.innerHTML = `<div style="font-family:var(--mono);font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--stone-500);margin-bottom:8px">1 ${sym}m &nbsp;=&nbsp; 10<sup>${e}</sup> m &nbsp;=</div><div style="font-family:var(--mono);font-size:clamp(22px,3.6vw,42px);font-weight:300;word-break:break-all;line-height:1.2">${num.replace(/(\d)(?=(\d{3})+$)/g, '$1 ')} <span style="color:var(--accent)">m</span></div>`;
      R.set('p', e === 0 ? 'cap prefix' : `${name} (${sym})`); R.set('n', e === 0 ? 'la unitat tal qual' : (e > 0 ? `× ${num.replace(/(\d)(?=(\d{3})+$)/g, '$1 ')}` : `÷ ${'1' + '0'.repeat(-e)}`)); R.set('e', ex[e]);
      R.note(e > 0 ? 'Múltiple: el prefix multiplica la unitat.' : e < 0 ? 'Submúltiple: el prefix divideix la unitat.' : 'Sense prefix: la unitat base.');
    }
    upd();
  };

  /* ===================================================== 0.2 conversor */
  I.conversor = function (c) {
    const { canvas, panel } = shell(c, { title: 'Factors de conversió', hint: 'Escriu un valor, tria les unitats i mira la cadena de fraccions que fa la feina.' });
    const CATS = {
      longitud: { base: 'm', units: { km: 1000, m: 1, dm: 0.1, cm: 0.01, mm: 0.001 } },
      superfície: { base: 'm²', units: { 'km²': 1e6, 'm²': 1, 'dm²': 1e-2, 'cm²': 1e-4, 'mm²': 1e-6 } },
      volum: { base: 'm³', units: { 'm³': 1, 'dm³ (L)': 1e-3, 'cm³ (mL)': 1e-6, 'mm³': 1e-9 } },
      massa: { base: 'kg', units: { t: 1000, kg: 1, g: 1e-3, mg: 1e-6 } },
      temps: { base: 's', units: { h: 3600, min: 60, s: 1, ms: 1e-3 } },
      velocitat: { base: 'm/s', units: { 'km/h': 1000 / 3600, 'm/s': 1, 'cm/s': 0.01, 'km/min': 1000 / 60 }, num: { 'km/h': ['km', 1000, 'h', 3600], 'm/s': ['m', 1, 's', 1], 'cm/s': ['cm', 0.01, 's', 1], 'km/min': ['km', 1000, 'min', 60] } }
    };
    const cat = el('select'); Object.keys(CATS).forEach(k => cat.appendChild(el('option', { value: k, text: k })));
    const val = el('input', { type: 'number', value: '72', step: 'any' });
    const from = el('select'), to = el('select');
    panel.appendChild(el('label', { text: 'Magnitud' })); panel.appendChild(cat);
    panel.appendChild(el('label', { text: 'Valor' })); panel.appendChild(val);
    const row = el('div', { class: 'row' }, [el('div', {}, [el('label', { text: 'De' }), from]), el('div', {}, [el('label', { text: 'A' }), to])]);
    panel.appendChild(row);
    const R = readout(panel, [{ key: 'r', label: 'Resultat', big: true }]);
    const chain = el('div', { class: 'chain' }); canvas.appendChild(chain);
    function fillUnits() { clear(from); clear(to); const u = Object.keys(CATS[cat.value].units); u.forEach(k => { from.appendChild(el('option', { value: k, text: k })); to.appendChild(el('option', { value: k, text: k })); }); from.value = u[0]; to.value = u[1]; }
    function frac(n, d) { return `<span class="frac"><span>${n}</span><span>${d}</span></span>`; }
    function num(x) { return Math.abs(x) >= 1e6 || (Math.abs(x) < 1e-3 && x !== 0) ? sci(x) : fmt(x, x % 1 === 0 ? 0 : 4).replace(/,?0+$/, ''); }
    function upd() {
      const C = CATS[cat.value], v = +val.value || 0, f = from.value, t = to.value;
      const res = v * C.units[f] / C.units[t];
      let html = `${num(v)} ${f}`;
      if (f === t) { html += ' = ' + num(v) + ' ' + t; }
      else if (C.num) {
        const [ln, lf, tn, tf] = C.num[f], [ln2, lf2, tn2, tf2] = C.num[t];
        if (ln !== ln2) html += ' · ' + frac(`${num(lf)} m`, `1 ${ln}`) + ' · ' + frac(`1 ${ln2}`, `${num(lf2)} m`);
        if (tn !== tn2) html += ' · ' + frac(`1 ${tn}`, `${num(tf)} s`) + ' · ' + frac(`${num(tf2)} s`, `1 ${tn2}`);
        html += ` = <span class="keep">${num(res)} ${t}</span>`;
      } else {
        if (C.units[f] !== 1) html += ' · ' + frac(`${num(C.units[f])} ${C.base}`, `1 ${f}`);
        if (C.units[t] !== 1) html += ' · ' + frac(`1 ${t}`, `${num(C.units[t])} ${C.base}`);
        html += ` = <span class="keep">${num(res)} ${t}</span>`;
      }
      chain.innerHTML = html;
      R.set('r', `${num(res)} ${t}`);
      R.note(C.num ? 'Cada fracció val 1. Es col·loquen de manera que la unitat que vols eliminar quedi un cop a dalt i un cop a baix.' : (cat.value === 'superfície' || cat.value === 'volum' ? 'Fixa\'t que el factor porta l\'exponent: 1 m² són 10 000 cm², no 100.' : 'Cada fracció val 1: el numerador i el denominador són la mateixa quantitat.'));
    }
    cat.addEventListener('change', () => { fillUnits(); upd(); });
    [val, from, to].forEach(x => x.addEventListener('input', upd));
    cat.value = 'velocitat'; fillUnits(); upd();
  };

  /* ===================================================== 0.3 dimensional */
  I.dimensional = function (c) {
    const { canvas, panel } = shell(c, { title: 'Equació dimensional', hint: 'Tria una magnitud i mira com es construeix a partir de L, M i T.' });
    const D = [
      { n: 'velocitat', f: 'v = Δx / Δt', s: '[v] = L / T', r: 'L·T<sup>-1</sup>', u: 'm/s' },
      { n: 'acceleració', f: 'a = Δv / Δt', s: '[a] = (L·T<sup>-1</sup>) / T', r: 'L·T<sup>-2</sup>', u: 'm/s²' },
      { n: 'força', f: 'F = m · a', s: '[F] = M · L·T<sup>-2</sup>', r: 'M·L·T<sup>-2</sup>', u: 'kg·m/s² = N (newton)' },
      { n: 'energia / treball', f: 'W = F · Δx', s: '[W] = M·L·T<sup>-2</sup> · L', r: 'M·L<sup>2</sup>·T<sup>-2</sup>', u: 'kg·m²/s² = J (joule)' },
      { n: 'energia cinètica', f: 'E<sub>c</sub> = ½ · m · v²', s: '[E<sub>c</sub>] = M · (L·T<sup>-1</sup>)²', r: 'M·L<sup>2</sup>·T<sup>-2</sup>', u: 'J (el ½ no compta)' },
      { n: 'potència', f: 'P = W / t', s: '[P] = M·L<sup>2</sup>·T<sup>-2</sup> / T', r: 'M·L<sup>2</sup>·T<sup>-3</sup>', u: 'J/s = W (watt)' },
      { n: 'pressió', f: 'p = F / S', s: '[p] = M·L·T<sup>-2</sup> / L<sup>2</sup>', r: 'M·L<sup>-1</sup>·T<sup>-2</sup>', u: 'N/m² = Pa (pascal)' },
      { n: 'densitat', f: 'ρ = m / V', s: '[ρ] = M / L<sup>3</sup>', r: 'M·L<sup>-3</sup>', u: 'kg/m³' },
      { n: 'quantitat de moviment', f: 'p = m · v', s: '[p] = M · L·T<sup>-1</sup>', r: 'M·L·T<sup>-1</sup>', u: 'kg·m/s' },
      { n: 'freqüència', f: 'f = 1 / T', s: '[f] = 1 / T', r: 'T<sup>-1</sup>', u: 's⁻¹ = Hz (hertz)' },
      { n: 'càrrega elèctrica', f: 'Q = I · t', s: '[Q] = I · T', r: 'I·T', u: 'A·s = C (coulomb)' }
    ];
    const sel = el('select'); D.forEach((d, i) => sel.appendChild(el('option', { value: i, text: d.n })));
    panel.appendChild(el('label', { text: 'Magnitud' })); panel.appendChild(sel);
    const R = readout(panel, [{ key: 'r', label: 'Equació dimensional', big: true }, { key: 'u', label: 'Unitat SI' }]);
    const box = el('div', { class: 'chain', style: 'font-size:15px' }); canvas.appendChild(box);
    function upd() { const d = D[+sel.value]; box.innerHTML = `<div style="color:var(--stone-500);font-size:11px;letter-spacing:.16em;text-transform:uppercase;margin-bottom:6px">1 · definició</div><div>${d.f}</div><div style="color:var(--stone-500);font-size:11px;letter-spacing:.16em;text-transform:uppercase;margin:14px 0 6px">2 · substitueix cada peça per la seva dimensió</div><div>${d.s}</div><div style="color:var(--stone-500);font-size:11px;letter-spacing:.16em;text-transform:uppercase;margin:14px 0 6px">3 · simplifica els exponents</div><div class="keep">[${d.n.split(' ')[0]}] = ${d.r}</div>`; R.set('r', d.r); R.set('u', d.u); R.note('Els nombres (½, 2, π) i els angles no tenen dimensió i desapareixen.'); }
    sel.addEventListener('change', upd); upd();
  };

  /* ===================================================== 0.4 vector */
  I.vector = function (c) {
    const { canvas, panel } = shell(c, { title: 'Un vector i les seves components', hint: 'Arrossega la punta de la fletxa. Mira com canvien components, mòdul i angle.' });
    const G = graph(canvas, { w: 380, h: 340, xmin: -8, xmax: 8, ymin: -7, ymax: 7, xticks: 8, yticks: 7, xlabel: 'X', ylabel: 'Y' });
    let a = { x: 3, y: 5 };
    const comps = svg('g'); G.layer.appendChild(comps);
    const arrG = svg('g'); G.layer.appendChild(arrG);
    const handle = G.dot(a.x, a.y, 9);
    const R = readout(panel, [{ key: 'c', label: 'Components (a<sub>x</sub>, a<sub>y</sub>)', big: true }, { key: 'ij', label: 'Amb i⃗ i j⃗' }, { key: 'm', label: 'Mòdul |a⃗| = √(a<sub>x</sub>² + a<sub>y</sub>²)' }, { key: 'ang', label: 'Angle α = tg<sup>-1</sup>(a<sub>y</sub>/a<sub>x</sub>)' }, { key: 'pol', label: 'Forma polar' }]);
    const snap = el('label', {}, [el('input', { type: 'checkbox', checked: 'checked', style: 'width:auto;margin-right:8px' }), 'Ajusta a valors enters']);
    panel.appendChild(snap);
    const chk = snap.querySelector('input');
    function upd() {
      clear(comps); clear(arrG);
      comps.appendChild(svg('line', { class: 'svg-comp', x1: G.X(a.x), y1: G.Y(0), x2: G.X(a.x), y2: G.Y(a.y) }));
      comps.appendChild(svg('line', { class: 'svg-comp', x1: G.X(0), y1: G.Y(a.y), x2: G.X(a.x), y2: G.Y(a.y) }));
      arrow(arrG, G.X(0), G.Y(0), G.X(a.x), G.Y(0), 'svg-vec2');
      arrow(arrG, G.X(a.x), G.Y(0), G.X(a.x), G.Y(a.y), 'svg-vec3');
      arrow(arrG, G.X(0), G.Y(0), G.X(a.x), G.Y(a.y), 'svg-vec');
      const m = Math.hypot(a.x, a.y); let ang = Math.atan2(a.y, a.x) * 180 / Math.PI;
      arrG.appendChild(text(G.X(a.x / 2), G.Y(0) + (a.y >= 0 ? 16 : -8), 'aₓ = ' + fmt(a.x, 1), 'svg-mono red', 'middle'));
      arrG.appendChild(text(G.X(a.x) + (a.x >= 0 ? 6 : -6), G.Y(a.y / 2) + 4, 'aᵧ = ' + fmt(a.y, 1), 'svg-mono', a.x >= 0 ? 'start' : 'end')).setAttribute('fill', 'var(--cat-blue)');
      if (m > 0.5) { const pa = svg('path', { d: `M ${G.X(1.2)} ${G.Y(0)} A ${G.X(1.2) - G.X(0)} ${G.X(1.2) - G.X(0)} 0 ${Math.abs(ang) > 180 ? 1 : 0} ${ang >= 0 ? 0 : 1} ${G.X(1.2 * Math.cos(ang * Math.PI / 180))} ${G.Y(1.2 * Math.sin(ang * Math.PI / 180))}`, class: 'svg-curve red', style: 'stroke-width:1.5' }); arrG.appendChild(pa); arrG.appendChild(text(G.X(1.6 * Math.cos(ang / 2 * Math.PI / 180)) + 4, G.Y(1.6 * Math.sin(ang / 2 * Math.PI / 180)) + 4, 'α', 'svg-mono red')); }
      handle.setAttribute('cx', G.X(a.x)); handle.setAttribute('cy', G.Y(a.y));
      const calcAng = Math.atan(a.y / a.x) * 180 / Math.PI;
      R.set('c', `(${fmt(a.x, 1)}, ${fmt(a.y, 1)})`);
      R.set('ij', `${fmt(a.x, 1)} i⃗ ${a.y < 0 ? '−' : '+'} ${fmt(Math.abs(a.y), 1)} j⃗`);
      R.set('m', `√(${fmt(a.x * a.x, 1)} + ${fmt(a.y * a.y, 1)}) = ${fmt(m, 2)}`);
      R.set('ang', a.x === 0 ? (a.y >= 0 ? '90°' : '−90°') : `${fmt(calcAng, 1)}°${a.x < 0 ? ' + 180° = ' + fmt(ang < 0 ? ang + 360 : ang, 1) + '°' : ''}`);
      R.set('pol', `${fmt(m, 2)}<sub>${fmt(ang < 0 ? ang + 360 : ang, 1)}°</sub>`);
      R.note(a.x < 0 ? 'a<sub>x</sub> és negativa: la calculadora dona un angle del quadrant equivocat i cal sumar-hi 180°.' : 'Mòdul: la llargada. Angle: quant s\'aixeca respecte de l\'eix X, en sentit contrari a les agulles del rellotge.');
    }
    drag(G.s, handle, (px, py) => { let x = -8 + (px - G.m.l) / (G.W - G.m.l - G.m.r) * 16, y = 7 - (py - G.m.t) / (G.H - G.m.t - G.m.b) * 14; x = Math.max(-8, Math.min(8, x)); y = Math.max(-7, Math.min(7, y)); if (chk.checked) { x = Math.round(x); y = Math.round(y); } return { x, y }; }, p => { a = p; upd(); });
    upd();
  };

  /* ===================================================== 0.5 dos vectors */
  I.dosvectors = function (c) {
    const { canvas, panel } = shell(c, { title: 'Suma i producte escalar', hint: 'Arrossega les dues puntes. La fletxa blava és la suma; el nombre de sota, el producte escalar.' });
    const G = graph(canvas, { w: 380, h: 340, xmin: -8, xmax: 8, ymin: -7, ymax: 7, xticks: 8, yticks: 7, xlabel: 'X', ylabel: 'Y' });
    let a = { x: 4, y: 2 }, b = { x: -2, y: 5 };
    const layer = svg('g'); G.layer.appendChild(layer);
    const ha = G.dot(a.x, a.y, 9), hb = G.dot(b.x, b.y, 9); hb.setAttribute('style', 'stroke: var(--accent)');
    const showSum = el('label', {}, [el('input', { type: 'checkbox', checked: 'checked', style: 'width:auto;margin-right:8px' }), 'Mostra la suma a⃗ + b⃗']);
    panel.appendChild(showSum);
    const R = readout(panel, [{ key: 'a', label: 'a⃗ (negre)' }, { key: 'b', label: 'b⃗ (vermell)' }, { key: 's', label: 'a⃗ + b⃗ (blau)', big: true }, { key: 'd', label: 'a⃗ · b⃗ = a<sub>x</sub>b<sub>x</sub> + a<sub>y</sub>b<sub>y</sub>', big: true }, { key: 'ang', label: 'Angle: cos α = a⃗·b⃗ / (|a⃗|·|b⃗|)' }]);
    function upd() {
      clear(layer);
      const s = { x: a.x + b.x, y: a.y + b.y };
      if (showSum.querySelector('input').checked) {
        layer.appendChild(svg('line', { class: 'svg-comp', x1: G.X(a.x), y1: G.Y(a.y), x2: G.X(s.x), y2: G.Y(s.y) }));
        layer.appendChild(svg('line', { class: 'svg-comp', x1: G.X(b.x), y1: G.Y(b.y), x2: G.X(s.x), y2: G.Y(s.y) }));
        arrow(layer, G.X(0), G.Y(0), G.X(s.x), G.Y(s.y), 'svg-vec3');
      }
      arrow(layer, G.X(0), G.Y(0), G.X(a.x), G.Y(a.y), 'svg-vec');
      arrow(layer, G.X(0), G.Y(0), G.X(b.x), G.Y(b.y), 'svg-vec2');
      layer.appendChild(text(G.X(a.x) + 8, G.Y(a.y) - 8, 'a', 'svg-mono'));
      layer.appendChild(text(G.X(b.x) + 8, G.Y(b.y) - 8, 'b', 'svg-mono red'));
      ha.setAttribute('cx', G.X(a.x)); ha.setAttribute('cy', G.Y(a.y)); hb.setAttribute('cx', G.X(b.x)); hb.setAttribute('cy', G.Y(b.y));
      const dot = a.x * b.x + a.y * b.y, ma = Math.hypot(a.x, a.y), mb = Math.hypot(b.x, b.y);
      const cos = ma && mb ? dot / (ma * mb) : 0, ang = Math.acos(Math.max(-1, Math.min(1, cos))) * 180 / Math.PI;
      R.set('a', `(${fmt(a.x, 0)}, ${fmt(a.y, 0)}) · |a⃗| = ${fmt(ma, 2)}`); R.set('b', `(${fmt(b.x, 0)}, ${fmt(b.y, 0)}) · |b⃗| = ${fmt(mb, 2)}`);
      R.set('s', `(${fmt(s.x, 0)}, ${fmt(s.y, 0)}) · mòdul ${fmt(Math.hypot(s.x, s.y), 2)}`);
      R.set('d', `${fmt(a.x, 0)}·${fmt(b.x, 0)} + ${fmt(a.y, 0)}·${fmt(b.y, 0)} = ${fmt(dot, 0)}`);
      R.set('ang', `cos α = ${fmt(cos, 2)} → α = ${fmt(ang, 1)}°`);
      R.note((Math.abs(dot) < 1e-9 ? 'Producte escalar zero: perpendiculars (α = 90°). ' : dot > 0 ? 'Positiu: α < 90°, van "més aviat d\'acord". ' : 'Negatiu: α > 90°, van "més aviat en contra". ') + `Fixa't que |a⃗ + b⃗| = ${fmt(Math.hypot(s.x, s.y), 2)} i |a⃗| + |b⃗| = ${fmt(ma + mb, 2)}: sumar mòduls no dona el mòdul de la suma.`);
    }
    const toC = (px, py) => ({ x: Math.max(-8, Math.min(8, Math.round(-8 + (px - G.m.l) / (G.W - G.m.l - G.m.r) * 16))), y: Math.max(-7, Math.min(7, Math.round(7 - (py - G.m.t) / (G.H - G.m.t - G.m.b) * 14))) });
    drag(G.s, ha, toC, p => { a = p; upd(); }); drag(G.s, hb, toC, p => { b = p; upd(); });
    showSum.querySelector('input').addEventListener('change', upd);
    upd();
  };

  /* ===================================================== 0.6 errors */
  I.errors = function (c) {
    const { canvas, panel } = shell(c, { title: 'Mitjana, error absolut i relatiu', hint: 'Escriu les mesures separades per espais o comes. Prova amb les del llibre o amb les teves.' });
    const ta = el('textarea', { text: '3,43 3,51 3,45 3,47 3,44 3,43 3,42 3,44 3,46 3,47' });
    const sens = el('input', { type: 'number', value: '0,01', step: 'any' }); sens.value = '0.01';
    const unit = el('input', { type: 'text', value: 's' });
    panel.appendChild(el('label', { text: 'Mesures' })); panel.appendChild(ta);
    panel.appendChild(el('div', { class: 'row' }, [el('div', {}, [el('label', { text: 'Sensibilitat aparell' }), sens]), el('div', {}, [el('label', { text: 'Unitat' }), unit])]));
    const R = readout(panel, [{ key: 'n', label: 'Nombre de mesures' }, { key: 'm', label: 'Mitjana m̄' }, { key: 'ea', label: 'Error absolut e<sub>a</sub>' }, { key: 'res', label: 'Resultat', big: true }, { key: 'er', label: 'Error relatiu e<sub>r</sub>' }]);
    const tbl = el('div', { class: 'tablewrap' }); canvas.appendChild(tbl);
    function upd() {
      const vals = ta.value.replace(/,/g, '.').split(/[\s;]+/).map(Number).filter(v => isFinite(v) && ta.value.trim());
      const u = unit.value.trim(), s = +sens.value || 0;
      if (vals.length < 2) { tbl.innerHTML = '<p style="color:var(--stone-500);padding:10px">Calen almenys dues mesures.</p>'; return; }
      const mean = vals.reduce((p, q) => p + q, 0) / vals.length;
      const dev = vals.map(v => Math.abs(v - mean));
      let ea = Math.max(...dev); if (ea < s) ea = s;
      // arrodonir error a una xifra significativa i la mitjana al mateix decimal
      const eaR = +ea.toPrecision(1); const dec = Math.max(0, -Math.floor(Math.log10(eaR)));
      const meanR = mean.toFixed(dec);
      const er = ea / mean * 100;
      let rows = vals.map((v, i) => `<tr><td class="mono">${i + 1}</td><td class="mono">${fmt(v, 3).replace(/0+$/, '').replace(/,$/, '')} ${u}</td><td class="mono">|${fmt(v, 2)} − ${fmt(mean, 3)}| = ${fmt(dev[i], 3)}${dev[i] === Math.max(...dev) ? ' <span class="keep">◀ màx</span>' : ''}</td></tr>`).join('');
      tbl.innerHTML = `<table class="data"><thead><tr><th>#</th><th>Mesura m<sub>i</sub></th><th>Error particular e<sub>i</sub> = |m<sub>i</sub> − m̄|</th></tr></thead><tbody>${rows}</tbody></table>`;
      R.set('n', vals.length); R.set('m', `${fmt(mean, 3)} ${u}`);
      R.set('ea', `${fmt(ea, 3)} ${u}${ea === s && Math.max(...dev) < s ? ' (l\'instrumental, més gran que la dispersió)' : ''} → ${fmt(eaR, dec)} ${u}`);
      R.set('res', `(${meanR.replace('.', ',')} ± ${fmt(eaR, dec)}) ${u}`);
      R.set('er', `${fmt(ea, 3)} / ${fmt(mean, 3)} · 100 = ${fmt(er, 1)} %`);
      R.note(er < 2 ? 'Menys d\'un 2 %: una mesura molt bona.' : er < 5 ? 'Entre el 2 i el 5 %: acceptable al laboratori de l\'institut.' : 'Més del 5 %: revisa el mètode o l\'aparell, o hi ha un valor absurd que convé eliminar.');
    }
    [ta, sens, unit].forEach(x => x.addEventListener('input', upd)); upd();
  };

  /* ===================================================== 0.7 densitat */
  I.densitat = function (c) {
    const { canvas, panel } = shell(c, { title: 'Massa contra volum', hint: 'Canvia el material i afegeix soroll de mesura. La recta passa per l\'origen i el pendent és la densitat.' });
    const MAT = { ferro: 7.8, alumini: 2.7, aigua: 1.0, or: 19.3, fusta_pi: 0.5 };
    const sel = el('select'); Object.keys(MAT).forEach(k => sel.appendChild(el('option', { value: k, text: k.replace('_', ' ') + ' (' + fmt(MAT[k], 1) + ' g/cm³)' })));
    panel.appendChild(el('label', { text: 'Material' })); panel.appendChild(sel);
    let noise = 0;
    slider(panel, 'Error de mesura', 0, 10, 1, 0, v => { noise = v; upd(); }, v => v + ' %');
    const R = readout(panel, [{ key: 'q', label: 'Quocients m/V' }, { key: 'p', label: 'Pendent de la recta', big: true }]);
    const holder = el('div'); canvas.appendChild(holder);
    const V = [0.8, 1.6, 2.3, 3.1, 4.0];
    let seed = 1;
    function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280 - 0.5; }
    function upd() {
      clear(holder); seed = 7;
      const rho = MAT[sel.value]; const pts = V.map(v => [v, rho * v * (1 + noise / 100 * 2 * rnd())]);
      const ymax = Math.ceil(rho * 4.2 / 5) * 5 || 5;
      const G = graph(holder, { w: 380, h: 260, xmin: 0, xmax: 4.5, ymin: 0, ymax, xticks: 9, yticks: 5, xlabel: 'V (cm³)', ylabel: 'm (g)', xd: 1 });
      G.path([[0, 0], [4.5, rho * 4.5]], 'svg-curve red');
      pts.forEach(p => G.dot(p[0], p[1], 5, 'svg-handle'));
      G.label(3.2, rho * 3.2 + ymax * 0.06, 'pendent = ρ', 'svg-mono red');
      R.set('q', pts.map(p => fmt(p[1] / p[0], 1)).join(' · '));
      R.set('p', `${fmt(rho, 1)} g/cm³`);
      R.note(noise ? 'Amb error de mesura els punts no cauen exactament sobre la recta, però el quocient es manté al voltant del mateix valor: la llei aguanta.' : 'Cada punt és una peça diferent. Massa i volum són directament proporcionals: m = ρ·V.');
    }
    sel.addEventListener('change', upd); upd();
  };

  window.INTERACTIVES = I;
  window.INTERACTIVES._u = { fmt, el, svg, clear, shell, slider, readout, graph, text, arrow, drag, player };
})();

/* ============================================================
   Unitat 1 · cinemàtica + eines
   ============================================================ */
(function () {
  'use strict';
  const I = window.INTERACTIVES;
  const { fmt, el, svg, clear, shell, slider, readout, graph, text, arrow, player } = I._u;

  function car(layer, x, y, cls) {
    const g = svg('g', { transform: `translate(${x},${y})` });
    g.appendChild(svg('rect', { x: -14, y: -12, width: 28, height: 12, style: `fill:${cls === 'red' ? 'var(--accent)' : 'var(--ink)'}` }));
    g.appendChild(svg('rect', { x: -8, y: -19, width: 14, height: 8, style: `fill:${cls === 'red' ? 'var(--accent)' : 'var(--ink)'}` }));
    g.appendChild(svg('circle', { cx: -8, cy: 0, r: 3.5, style: 'fill:white;stroke:var(--ink);stroke-width:1.5' }));
    g.appendChild(svg('circle', { cx: 8, cy: 0, r: 3.5, style: 'fill:white;stroke:var(--ink);stroke-width:1.5' }));
    layer.appendChild(g); return g;
  }
  function line1D(parent, o) {
    const W = 380, H = o.h || 90, m = 24;
    const s = svg('svg', { viewBox: `0 0 ${W} ${H}` });
    const X = x => m + (x - o.xmin) / (o.xmax - o.xmin) * (W - 2 * m);
    const y = H - 30;
    s.appendChild(svg('line', { class: 'svg-axis', x1: m - 8, x2: W - m + 8, y1: y, y2: y }));
    const n = o.ticks || 10;
    for (let i = 0; i <= n; i++) { const x = o.xmin + (o.xmax - o.xmin) * i / n; s.appendChild(svg('line', { class: 'svg-axis', x1: X(x), x2: X(x), y1: y - 4, y2: y + 4 })); s.appendChild(text(X(x), y + 18, fmt(x, o.xd || 0), 'svg-label', 'middle')); }
    s.appendChild(text(W - m + 8, y - 8, o.unit || 'x (m)', 'svg-mono muted', 'end'));
    const layer = svg('g'); s.appendChild(layer);
    parent.appendChild(s);
    return { s, X, y, layer };
  }

  /* ===================================================== 1.1 relatiu */
  I.relatiu = function (c) {
    const { canvas, panel } = shell(c, { title: 'El moviment és relatiu', hint: 'Un bus per la carretera i una persona que camina pel passadís. Canvia des d\'on ho mires.' });
    let vBus = 10, vP = 1, frame = 'carretera';
    const W = 380, H = 150;
    const s = svg('svg', { viewBox: `0 0 ${W} ${H}` }); canvas.appendChild(s);
    const road = svg('g'); s.appendChild(road); const scene = svg('g'); s.appendChild(scene);
    const fsel = el('select'); [['carretera', 'la carretera (algú dret a la vorera)'], ['bus', 'el bus (algú assegut al seient)']].forEach(([v, t]) => fsel.appendChild(el('option', { value: v, text: t })));
    panel.appendChild(el('label', { text: 'Sistema de referència: miro des de' })); panel.appendChild(fsel);
    slider(panel, 'Velocitat del bus', 0, 20, 1, vBus, v => { vBus = v; }, v => v + ' m/s');
    slider(panel, 'Passatger dins el bus', -2, 2, 0.5, vP, v => { vP = v; }, v => (v > 0 ? 'cap endavant ' : v < 0 ? 'cap enrere ' : 'assegut ') + fmt(Math.abs(v), 1) + ' m/s');
    const R = readout(panel, [{ key: 'b', label: 'Velocitat del bus' }, { key: 'p', label: 'Velocitat del passatger', big: true }, { key: 'a', label: 'Velocitat dels arbres' }]);
    let busX = 0, pX = 0, last = performance.now();
    function draw(now) {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      busX += vBus * dt * 8; pX += vP * dt * 8;
      const shift = frame === 'bus' ? -busX : 0;
      clear(road); clear(scene);
      road.appendChild(svg('line', { class: 'svg-axis', x1: 0, x2: W, y1: 110, y2: 110 }));
      for (let i = -2; i < 12; i++) { const x = ((i * 60 + shift) % (W + 120) + W + 120) % (W + 120) - 60; road.appendChild(svg('rect', { x, y: 76, width: 6, height: 34, style: 'fill:var(--stone-400)' })); road.appendChild(svg('circle', { cx: x + 3, cy: 70, r: 12, style: 'fill:var(--stone-300)' })); }
      const bx = frame === 'bus' ? W / 2 : ((busX % (W + 160)) + W + 160) % (W + 160) - 80;
      const bus = svg('g', { transform: `translate(${bx},110)` });
      bus.appendChild(svg('rect', { x: -60, y: -40, width: 120, height: 36, style: 'fill:var(--ink)' }));
      for (let i = 0; i < 4; i++) bus.appendChild(svg('rect', { x: -52 + i * 28, y: -34, width: 20, height: 14, style: 'fill:var(--stone-100)' }));
      bus.appendChild(svg('circle', { cx: -38, cy: 0, r: 6, style: 'fill:white;stroke:var(--ink);stroke-width:2' })); bus.appendChild(svg('circle', { cx: 38, cy: 0, r: 6, style: 'fill:white;stroke:var(--ink);stroke-width:2' }));
      const px = Math.max(-50, Math.min(50, ((pX + 50) % 100 + 100) % 100 - 50));
      bus.appendChild(svg('circle', { cx: px, cy: -26, r: 5, style: 'fill:var(--accent)' })); bus.appendChild(svg('rect', { x: px - 3, y: -22, width: 6, height: 14, style: 'fill:var(--accent)' }));
      scene.appendChild(bus);
      scene.appendChild(text(8, 20, frame === 'bus' ? 'vist des del bus' : 'vist des de la vorera', 'svg-mono muted'));
      const vBusRel = frame === 'bus' ? 0 : vBus, vPRel = frame === 'bus' ? vP : vBus + vP, vArb = frame === 'bus' ? -vBus : 0;
      R.set('b', fmt(vBusRel, 1) + ' m/s'); R.set('p', fmt(vPRel, 1) + ' m/s'); R.set('a', fmt(vArb, 1) + ' m/s');
      R.note(frame === 'bus' ? 'Des del seient, el bus està quiet i són els arbres els que passen cap enrere. El passatger només té la velocitat amb què camina.' : 'Des de la vorera, el passatger que camina cap endavant va més ràpid que el bus: les velocitats se sumen (v = v_bus + v_passatger).');
      raf = requestAnimationFrame(draw);
    }
    fsel.addEventListener('change', () => { frame = fsel.value; });
    let raf = requestAnimationFrame(draw);
  };

  /* ===================================================== 1.2 posició */
  I.posicio = function (c) {
    const { canvas, panel } = shell(c, { title: 'Posició, desplaçament, distància', hint: 'Una excursió d\'una hora sobre una recta. Mou el temps i mira les tres magnituds.' });
    // keyframes (min, km): surt de la plaça, va a l'ermita (4 km), torna 2 km, torna a avançar
    const K = [[0, 0], [30, 4], [45, 2], [60, 5]];
    function xOf(t) { for (let i = 1; i < K.length; i++) if (t <= K[i][0]) { const [t0, x0] = K[i - 1], [t1, x1] = K[i]; return x0 + (x1 - x0) * (t - t0) / (t1 - t0); } return K[K.length - 1][1]; }
    function distOf(t) { let d = 0; for (let i = 1; i < K.length; i++) { const [t0, x0] = K[i - 1], [t1, x1] = K[i]; if (t <= t0) break; const tt = Math.min(t, t1); d += Math.abs(x0 + (x1 - x0) * (tt - t0) / (t1 - t0) - x0); } return d; }
    const L = line1D(canvas, { xmin: -1, xmax: 6, ticks: 7, unit: 'x (km)', h: 80 });
    L.layer.appendChild(text(L.X(0), L.y - 30, 'plaça', 'svg-label', 'middle')); L.layer.appendChild(text(L.X(4), L.y - 30, 'ermita', 'svg-label', 'middle')); L.layer.appendChild(text(L.X(5), L.y - 30, 'refugi', 'svg-label', 'middle'));
    const walker = svg('g'); L.layer.appendChild(walker);
    const G = graph(canvas, { w: 380, h: 200, xmin: 0, xmax: 60, ymin: -1, ymax: 6, xticks: 6, yticks: 7, xlabel: 't (min)', ylabel: 'x (km)' });
    G.path(K, 'svg-curve');
    const dot = G.dot(0, 0, 5);
    const R = readout(panel, [{ key: 'x', label: 'Posició x(t)', big: true }, { key: 'd', label: 'Desplaçament Δx = x(t) − x(0)' }, { key: 's', label: 'Distància recorreguda' }]);
    player(panel, t => {
      const m = t / 60 * 60; const x = xOf(m), d = distOf(m);
      clear(walker); walker.appendChild(svg('circle', { cx: L.X(x), cy: L.y - 12, r: 6, style: 'fill:var(--accent)' })); walker.appendChild(svg('rect', { x: L.X(x) - 3, y: L.y - 8, width: 6, height: 8, style: 'fill:var(--accent)' }));
      dot.setAttribute('cx', G.X(m)); dot.setAttribute('cy', G.Y(x));
      R.set('x', fmt(x, 1) + ' km'); R.set('d', fmt(x, 1) + ' − 0 = ' + fmt(x, 1) + ' km'); R.set('s', fmt(d, 1) + ' km');
      R.note(m < 30 ? 'Va cap a l\'ermita en línia recta i sense girar cua: desplaçament i distància coincideixen.' : m < 45 ? 'Torna enrere: la distància continua creixent però el desplaçament baixa. Al gràfic, la línia baixa.' : 'Torna a avançar fins al refugi. Fixa\'t que la distància (el comptaquilòmetres) sempre és més gran o igual que el desplaçament.');
    }, { tmax: 60, speed: 6 });
    panel.querySelector('label').innerHTML = 'Temps t <span class="val"></span>';
    const sl = panel.querySelector('input[type=range]'); const v = panel.querySelector('label .val');
    const fix = () => { v.textContent = fmt(+sl.value, 0) + ' min'; }; sl.addEventListener('input', fix); fix();
    sl.dispatchEvent(new Event('input'));
  };

  /* ===================================================== 1.3 secant → tangent */
  function secantWidget(c, opts) {
    const { canvas, panel } = shell(c, opts.shell);
    const f = opts.f, df = opts.df;
    const G = graph(canvas, opts.graph);
    const pts = []; for (let t = opts.graph.xmin; t <= opts.graph.xmax + 1e-9; t += (opts.graph.xmax - opts.graph.xmin) / 120) pts.push([t, f(t)]);
    G.path(pts, 'svg-curve');
    const layer = svg('g'); G.layer.appendChild(layer);
    let t0 = opts.t0, dt = opts.dt0;
    const R = readout(panel, [{ key: 'p', label: 'Punts (t, x)' }, { key: 'vm', label: 'Pendent de la secant = Δx / Δt', big: true }, { key: 'v', label: 'Pendent de la tangent (derivada)' }]);
    function upd() {
      clear(layer);
      const t1 = Math.min(opts.graph.xmax, t0 + dt), x0 = f(t0), x1 = f(t1), vm = dt > 0 ? (x1 - x0) / (t1 - t0) : df(t0);
      const v = df(t0);
      // tangent
      const a = opts.graph.xmin, b = opts.graph.xmax;
      layer.appendChild(svg('line', { class: 'svg-curve', style: 'stroke:var(--cat-blue);stroke-dasharray:5 4', x1: G.X(a), y1: G.Y(x0 + v * (a - t0)), x2: G.X(b), y2: G.Y(x0 + v * (b - t0)) }));
      if (dt > 0.001) {
        layer.appendChild(svg('line', { class: 'svg-curve red', x1: G.X(a), y1: G.Y(x0 + vm * (a - t0)), x2: G.X(b), y2: G.Y(x0 + vm * (b - t0)) }));
        layer.appendChild(svg('line', { class: 'svg-comp', x1: G.X(t0), y1: G.Y(x0), x2: G.X(t1), y2: G.Y(x0) }));
        layer.appendChild(svg('line', { class: 'svg-comp', x1: G.X(t1), y1: G.Y(x0), x2: G.X(t1), y2: G.Y(x1) }));
        layer.appendChild(text(G.X((t0 + t1) / 2), G.Y(x0) + 14, 'Δt', 'svg-mono red', 'middle'));
        layer.appendChild(text(G.X(t1) + 6, G.Y((x0 + x1) / 2) + 4, 'Δx', 'svg-mono red'));
        layer.appendChild(svg('circle', { cx: G.X(t1), cy: G.Y(x1), r: 5, class: 'svg-handle', style: 'stroke:var(--accent)' }));
      }
      layer.appendChild(svg('circle', { cx: G.X(t0), cy: G.Y(x0), r: 6, class: 'svg-handle' }));
      R.set('p', `(${fmt(t0, 2)}, ${fmt(x0, 2)}) i (${fmt(t1, 2)}, ${fmt(x1, 2)})`);
      R.set('vm', dt > 0.001 ? `${fmt(x1 - x0, 3)} / ${fmt(t1 - t0, 3)} = ${fmt(vm, 3)} ${opts.unit}` : `Δt → 0: ${fmt(v, 3)} ${opts.unit}`);
      R.set('v', `${fmt(v, 3)} ${opts.unit}`);
      R.note(dt > 1 ? 'Amb Δt gran, la secant (vermella) és la velocitat mitjana de l\'interval i s\'allunya de la tangent (blava).' : dt > 0.05 ? 'Δt petit: la secant ja gairebé coincideix amb la tangent. El quocient s\'acosta al valor instantani.' : 'Δt pràcticament zero: la secant s\'ha convertit en la tangent. Aquest pendent és la derivada: ' + opts.dfText + '.');
    }
    slider(panel, opts.tLabel || 'Instant t₀', opts.graph.xmin, opts.graph.xmax - 0.05, 0.05, t0, v => { t0 = v; upd(); }, v => fmt(v, 2) + ' s');
    slider(panel, 'Interval Δt (fes-lo petit)', 0, opts.dtmax, 0.01, dt, v => { dt = v; upd(); }, v => fmt(v, 2) + ' s');
    upd();
  }
  I.secant = function (c) {
    secantWidget(c, {
      shell: { title: 'De la velocitat mitjana a la instantània', hint: 'Fes Δt cada cop més petit i mira com la secant es converteix en la tangent.' },
      f: t => 0.5 * t * t, df: t => t, dfText: 'v = t (per a x = ½t²)', unit: 'm/s',
      graph: { w: 380, h: 280, xmin: 0, xmax: 8, ymin: 0, ymax: 32, xticks: 8, yticks: 4, xlabel: 't (s)', ylabel: 'x (m) · x = ½ t²' },
      t0: 3, dt0: 3, dtmax: 4
    });
  };
  I.derivada = function (c) {
    const { canvas, panel } = shell(c, { title: 'Derivada = pendent de la tangent', hint: 'Tria una funció i mou el punt. Compara el pendent amb la regla de la taula.' });
    const F = {
      'x = 2·t': { f: t => 2 * t, df: () => 2, txt: 'v = 2 (constant)', ymin: -1, ymax: 16 },
      'x = t²': { f: t => t * t, df: t => 2 * t, txt: 'v = 2·t', ymin: -1, ymax: 40 },
      'x = 6·t − t²': { f: t => 6 * t - t * t, df: t => 6 - 2 * t, txt: 'v = 6 − 2·t', ymin: -8, ymax: 12 },
      'x = 5 (constant)': { f: () => 5, df: () => 0, txt: 'v = 0', ymin: -1, ymax: 10 }
    };
    const sel = el('select'); Object.keys(F).forEach(k => sel.appendChild(el('option', { value: k, text: k })));
    panel.appendChild(el('label', { text: 'Funció' })); panel.appendChild(sel);
    const holder = el('div'); canvas.appendChild(holder);
    const sub = el('div'); panel.appendChild(sub);
    function build() {
      clear(holder); clear(sub);
      const o = F[sel.value];
      const G = graph(holder, { w: 380, h: 280, xmin: 0, xmax: 6, ymin: o.ymin, ymax: o.ymax, xticks: 6, yticks: 4, xlabel: 't (s)', ylabel: sel.value });
      const pts = []; for (let t = 0; t <= 6.001; t += 0.05) pts.push([t, o.f(t)]);
      G.path(pts, 'svg-curve');
      const layer = svg('g'); G.layer.appendChild(layer);
      let t0 = 2;
      const R = readout(sub, [{ key: 'x', label: 'Posició x(t₀)' }, { key: 'v', label: 'Derivada en t₀ (pendent)', big: true }, { key: 'r', label: 'Regla aplicada' }]);
      function upd() { clear(layer); const x0 = o.f(t0), v = o.df(t0); layer.appendChild(svg('line', { class: 'svg-curve', style: 'stroke:var(--cat-blue)', x1: G.X(0), y1: G.Y(x0 - v * t0), x2: G.X(6), y2: G.Y(x0 + v * (6 - t0)) })); layer.appendChild(svg('circle', { cx: G.X(t0), cy: G.Y(x0), r: 6, class: 'svg-handle' })); R.set('x', fmt(x0, 2) + ' m'); R.set('v', fmt(v, 2) + ' m/s'); R.set('r', o.txt); R.note(v > 0 ? 'Pendent positiu: x creix, el mòbil va cap al costat positiu.' : v < 0 ? 'Pendent negatiu: x decreix, el mòbil retrocedeix.' : 'Pendent zero: en aquest instant el mòbil està aturat.'); }
      slider(sub, 'Instant t₀', 0, 6, 0.05, t0, v => { t0 = v; upd(); }, v => fmt(v, 2) + ' s');
      upd();
    }
    sel.addEventListener('change', build); build();
  };

  /* ===================================================== 1.4 acceleració (signes) */
  I.acceleracio = function (c) {
    const { canvas, panel } = shell(c, { title: 'Velocitat i acceleració amb signe', hint: 'Tria v₀ i a i reprodueix. La fletxa negra és la velocitat; la vermella, l\'acceleració.' });
    let v0 = 6, a = -2;
    const L = line1D(canvas, { xmin: -40, xmax: 40, ticks: 8, unit: 'x (m)', h: 110 });
    const layer = svg('g'); L.layer.appendChild(layer);
    const G = graph(canvas, { w: 380, h: 190, xmin: 0, xmax: 8, ymin: -12, ymax: 12, xticks: 8, yticks: 4, xlabel: 't (s)', ylabel: 'v (m/s)' });
    const vpath = G.path([], 'svg-curve'); const vdot = G.dot(0, 0, 5);
    slider(panel, 'Velocitat inicial v₀', -10, 10, 1, v0, v => { v0 = v; redraw(); }, v => fmt(v, 0) + ' m/s');
    slider(panel, 'Acceleració a', -4, 4, 0.5, a, v => { a = v; redraw(); }, v => fmt(v, 1) + ' m/s²');
    const R = readout(panel, [{ key: 'v', label: 'v = v₀ + a·t', big: true }, { key: 'x', label: 'Posició x = v₀·t + ½·a·t²' }, { key: 'estat', label: 'Què fa el mòbil' }]);
    let P;
    function redraw() { const pts = []; for (let t = 0; t <= 8.001; t += 0.1) pts.push([t, Math.max(-12, Math.min(12, v0 + a * t))]); vpath.setAttribute('d', pts.map((p, i) => (i ? 'L' : 'M') + G.X(p[0]).toFixed(1) + ' ' + G.Y(p[1]).toFixed(1)).join(' ')); tick(P ? P.t : 0); }
    function tick(t) {
      const v = v0 + a * t, x = v0 * t + 0.5 * a * t * t;
      clear(layer);
      const cx = L.X(Math.max(-40, Math.min(40, x)));
      car(layer, cx, L.y - 6);
      if (Math.abs(v) > 0.05) arrow(layer, cx, L.y - 40, cx + v * 5, L.y - 40, 'svg-vec');
      if (Math.abs(a) > 0.05) arrow(layer, cx, L.y - 56, cx + a * 12, L.y - 56, 'svg-vec2');
      layer.appendChild(text(cx, L.y - 62, 'a', 'svg-mono red', 'middle')); layer.appendChild(text(cx, L.y - 44, 'v', 'svg-mono', 'middle'));
      vdot.setAttribute('cx', G.X(t)); vdot.setAttribute('cy', G.Y(Math.max(-12, Math.min(12, v))));
      R.set('v', `${fmt(v0, 0)} + (${fmt(a, 1)})·${fmt(t, 1)} = ${fmt(v, 2)} m/s`); R.set('x', fmt(x, 2) + ' m');
      let estat, note;
      if (Math.abs(a) < 0.05) { estat = 'MRU: v constant'; note = 'Acceleració zero: la velocitat no canvia. Va ràpid o a poc a poc, però sempre igual.'; }
      else if (Math.abs(v) < 0.05) { estat = 'v = 0: s\'atura un instant'; note = 'Velocitat zero però acceleració no: ara mateix canvia de sentit.'; }
      else if (Math.sign(v) === Math.sign(a)) { estat = 'va cada cop més ràpid'; note = `v i a tenen el mateix signe (${v > 0 ? 'positiu' : 'negatiu'}): el mòdul de la velocitat creix. ${v < 0 ? 'Cap a l\'esquerra, però accelerant.' : ''}`; }
      else { estat = 'frena'; note = 'v i a tenen signes contraris: el mòdul de la velocitat baixa. Si continua, s\'aturarà i donarà mitja volta.'; }
      R.set('estat', estat); R.note(note);
    }
    P = player(panel, tick, { tmax: 8 });
    redraw();
  };

  /* ===================================================== 1.5 MRU · 1.6 MRUA */
  function kinWidget(c, o) {
    const { canvas, panel } = shell(c, o.shell);
    let x0 = o.x0, v0 = o.v0, a = o.a0;
    const L = line1D(canvas, { xmin: -50, xmax: 150, ticks: 8, unit: 'x (m)', h: 90 });
    const carL = svg('g'); L.layer.appendChild(carL);
    const gx = graph(canvas, { w: 380, h: 180, xmin: 0, xmax: 10, ymin: -50, ymax: 150, xticks: 5, yticks: 4, xlabel: 't (s)', ylabel: 'x (m)' });
    const gv = graph(canvas, { w: 380, h: 150, xmin: 0, xmax: 10, ymin: -20, ymax: 30, xticks: 5, yticks: 5, xlabel: 't (s)', ylabel: 'v (m/s)' });
    const px = gx.path([], 'svg-curve'), pv = gv.path([], 'svg-curve red');
    const area = svg('path', { class: 'svg-area' }); gv.layer.insertBefore(area, pv);
    const dx = gx.dot(0, 0, 5), dv = gv.dot(0, 0, 5);
    slider(panel, 'Posició inicial x₀', -40, 100, 5, x0, v => { x0 = v; redraw(); }, v => fmt(v, 0) + ' m');
    slider(panel, 'Velocitat' + (o.accel ? ' inicial v₀' : ' v'), -15, 25, 1, v0, v => { v0 = v; redraw(); }, v => fmt(v, 0) + ' m/s');
    if (o.accel) slider(panel, 'Acceleració a', -4, 4, 0.5, a, v => { a = v; redraw(); }, v => fmt(v, 1) + ' m/s²');
    const R = readout(panel, o.accel
      ? [{ key: 'eq', label: 'Equació del moviment' }, { key: 'x', label: 'x(t)', big: true }, { key: 'v', label: 'v(t) = v₀ + a·t' }, { key: 'ar', label: 'Àrea sota v-t (desplaçament)' }]
      : [{ key: 'eq', label: 'Equació del moviment' }, { key: 'x', label: 'x(t)', big: true }, { key: 'v', label: 'v(t)' }, { key: 'ar', label: 'Àrea sota v-t (desplaçament)' }]);
    let P;
    function eqText() { return o.accel ? `x = ${fmt(x0, 0)} ${v0 < 0 ? '−' : '+'} ${fmt(Math.abs(v0), 0)}·t ${a < 0 ? '−' : '+'} ½·${fmt(Math.abs(a), 1)}·t²` : `x = ${fmt(x0, 0)} ${v0 < 0 ? '−' : '+'} ${fmt(Math.abs(v0), 0)}·t`; }
    function xf(t) { return x0 + v0 * t + 0.5 * a * t * t; } function vf(t) { return v0 + a * t; }
    function redraw() { const P1 = [], P2 = []; for (let t = 0; t <= 10.001; t += 0.1) { P1.push([t, Math.max(-50, Math.min(150, xf(t)))]); P2.push([t, Math.max(-20, Math.min(30, vf(t)))]); } px.setAttribute('d', P1.map((p, i) => (i ? 'L' : 'M') + gx.X(p[0]).toFixed(1) + ' ' + gx.Y(p[1]).toFixed(1)).join(' ')); pv.setAttribute('d', P2.map((p, i) => (i ? 'L' : 'M') + gv.X(p[0]).toFixed(1) + ' ' + gv.Y(p[1]).toFixed(1)).join(' ')); R.set('eq', eqText()); tick(P ? P.t : 0); }
    function tick(t) {
      const x = xf(t), v = vf(t);
      clear(carL); car(carL, L.X(Math.max(-50, Math.min(150, x))), L.y - 6, o.accel ? 'red' : '');
      dx.setAttribute('cx', gx.X(t)); dx.setAttribute('cy', gx.Y(Math.max(-50, Math.min(150, x))));
      dv.setAttribute('cx', gv.X(t)); dv.setAttribute('cy', gv.Y(Math.max(-20, Math.min(30, v))));
      let d = `M ${gv.X(0)} ${gv.Y(0)}`; for (let s = 0; s <= t + 1e-9; s += 0.1) d += ` L ${gv.X(s)} ${gv.Y(Math.max(-20, Math.min(30, vf(s))))}`; d += ` L ${gv.X(t)} ${gv.Y(0)} Z`; area.setAttribute('d', d);
      R.set('x', `${fmt(x, 1)} m`); R.set('v', `${fmt(v, 1)} m/s`); R.set('ar', `Δx = ${fmt(x - x0, 1)} m`);
      if (o.accel) R.note(Math.abs(a) < 0.05 ? 'Amb a = 0 torna a ser un MRU: la paràbola es converteix en recta.' : Math.sign(v) !== Math.sign(v0) && Math.abs(v0) > 0.05 ? 'La velocitat ha canviat de signe: el mòbil ha donat mitja volta. Al gràfic x-t és el vèrtex de la paràbola.' : 'Gràfic x-t: paràbola (el pendent va canviant). Gràfic v-t: recta de pendent a. L\'àrea ombrejada és el desplaçament.');
      else R.note(v === 0 ? 'Velocitat zero: aturat. La recta x-t és horitzontal.' : `Gràfic x-t: recta de pendent ${fmt(v0, 0)}. Gràfic v-t: horitzontal. L'àrea ombrejada (${fmt(v0, 0)} × ${fmt(t, 1)}) és el desplaçament.`);
    }
    P = player(panel, tick, { tmax: 10 });
    redraw();
  }
  I.mru = c => kinWidget(c, { shell: { title: 'Simulador MRU', hint: 'Canvia x₀ i v. Mira la recta del gràfic x-t i l\'àrea sota v-t.' }, x0: 20, v0: 8, a0: 0, accel: false });
  I.mrua = c => kinWidget(c, { shell: { title: 'Simulador MRUA', hint: 'Prova v₀ positiva amb a negativa: el cotxe frena, s\'atura i torna.' }, x0: 0, v0: 20, a0: -3, accel: true });

  /* ===================================================== 1.7 caiguda */
  I.caiguda = function (c) {
    const { canvas, panel } = shell(c, { title: 'Caiguda lliure i llançament vertical', hint: 'Eix Y cap amunt, origen a terra, g = 9,8 m/s². Llança cap amunt o deixa caure.' });
    const g = 9.8; let y0 = 20, v0 = 0; const YMAX = 80;
    const W = 120, H = 330;
    const wrap = el('div', { style: 'display:flex;gap:12px;align-items:flex-start' }); canvas.appendChild(wrap);
    const s = svg('svg', { viewBox: `0 0 ${W} ${H}`, style: 'flex:0 0 110px;width:110px' }); wrap.appendChild(s);
    const right = el('div', { style: 'flex:1;min-width:0' }); wrap.appendChild(right);
    const Y = y => H - 20 - y / YMAX * (H - 40);
    s.appendChild(svg('line', { class: 'svg-axis', x1: 30, x2: 30, y1: Y(YMAX), y2: Y(0) }));
    for (let y = 0; y <= YMAX; y += 10) { s.appendChild(svg('line', { class: 'svg-axis', x1: 26, x2: 34, y1: Y(y), y2: Y(y) })); s.appendChild(text(22, Y(y) + 4, y, 'svg-label', 'end')); }
    s.appendChild(svg('rect', { x: 0, y: Y(0), width: W, height: 20, style: 'fill:var(--stone-200)' }));
    s.appendChild(text(W - 4, 14, 'y (m)', 'svg-mono muted', 'end'));
    const ball = svg('g'); s.appendChild(ball);
    const gy = graph(right, { w: 300, h: 170, xmin: 0, xmax: 5, ymin: 0, ymax: YMAX, xticks: 5, yticks: 4, xlabel: 't (s)', ylabel: 'y (m)' });
    const gv = graph(right, { w: 300, h: 150, xmin: 0, xmax: 5, ymin: -30, ymax: 30, xticks: 5, yticks: 4, xlabel: 't (s)', ylabel: 'v (m/s)' });
    const py = gy.path([], 'svg-curve'), pv = gv.path([], 'svg-curve red'); const dy = gy.dot(0, 0, 5), dv = gv.dot(0, 0, 5);
    slider(panel, 'Alçada inicial y₀', 0, 40, 1, y0, v => { y0 = v; redraw(); }, v => v + ' m');
    slider(panel, 'Velocitat inicial v₀ (+ amunt)', -10, 25, 1, v0, v => { v0 = v; redraw(); }, v => fmt(v, 0) + ' m/s');
    const R = readout(panel, [{ key: 'y', label: 'y = y₀ + v₀·t − ½·g·t²', big: true }, { key: 'v', label: 'v = v₀ − g·t' }, { key: 'h', label: 'Alçada màxima' }, { key: 'tg', label: 'Temps fins a terra' }, { key: 'vg', label: 'Velocitat en arribar' }]);
    let P, tGround;
    function yf(t) { return y0 + v0 * t - 0.5 * g * t * t; } function vf(t) { return v0 - g * t; }
    function redraw() {
      tGround = (v0 + Math.sqrt(v0 * v0 + 2 * g * y0)) / g;
      const P1 = [], P2 = []; for (let t = 0; t <= Math.min(5, tGround) + 1e-9; t += 0.05) { P1.push([t, Math.max(0, yf(t))]); P2.push([t, Math.max(-30, Math.min(30, vf(t)))]); }
      py.setAttribute('d', P1.map((p, i) => (i ? 'L' : 'M') + gy.X(p[0]).toFixed(1) + ' ' + gy.Y(p[1]).toFixed(1)).join(' '));
      pv.setAttribute('d', P2.map((p, i) => (i ? 'L' : 'M') + gv.X(p[0]).toFixed(1) + ' ' + gv.Y(p[1]).toFixed(1)).join(' '));
      const hmax = v0 > 0 ? y0 + v0 * v0 / (2 * g) : y0;
      R.set('h', `${fmt(hmax, 2)} m${v0 > 0 ? ' (a t = ' + fmt(v0 / g, 2) + ' s, quan v = 0)' : ''}`);
      R.set('tg', `${fmt(tGround, 2)} s`); R.set('vg', `${fmt(vf(tGround), 2)} m/s (${fmt(Math.abs(vf(tGround)) * 3.6, 0)} km/h)`);
      tick(P ? P.t : 0);
    }
    function tick(t) {
      const tt = Math.min(t, tGround), y = Math.max(0, yf(tt)), v = vf(tt);
      clear(ball); ball.appendChild(svg('circle', { cx: 70, cy: Y(Math.min(YMAX, y)), r: 8, style: 'fill:var(--accent)' }));
      if (Math.abs(v) > 0.2 && tt < tGround) arrow(ball, 90, Y(Math.min(YMAX, y)), 90, Y(Math.min(YMAX, y)) - v * 2.2, 'svg-vec');
      arrow(ball, 50, Y(Math.min(YMAX, y)), 50, Y(Math.min(YMAX, y)) + 22, 'svg-vec2'); ball.appendChild(text(50, Y(Math.min(YMAX, y)) + 36, 'g', 'svg-mono red', 'middle'));
      dy.setAttribute('cx', gy.X(Math.min(5, tt))); dy.setAttribute('cy', gy.Y(y)); dv.setAttribute('cx', gv.X(Math.min(5, tt))); dv.setAttribute('cy', gv.Y(Math.max(-30, Math.min(30, v))));
      R.set('y', `${fmt(y, 2)} m`); R.set('v', `${fmt(v, 2)} m/s`);
      R.note(tt >= tGround ? 'Ha arribat a terra. Les fórmules continuarien per sota de y = 0, però el terra no ho permet.' : v > 0.2 ? 'Puja frenant: v positiva, g cap avall. Signes contraris.' : Math.abs(v) <= 0.2 ? 'Punt més alt: v = 0 un instant, però l\'acceleració continua sent g cap avall.' : 'Baixa accelerant: v negativa i g cap avall. Mateix signe: cada segon va 9,8 m/s més ràpid.');
    }
    P = player(panel, tick, { tmax: 5, speed: 0.5 });
    redraw();
  };

  /* ===================================================== 1.8 gràfics */
  I.grafics = function (c) {
    const { canvas, panel } = shell(c, { title: 'Del gràfic v-t a tot el moviment', hint: 'Tria un perfil de velocitat. L\'àrea ombrejada és el desplaçament; el pendent, l\'acceleració.' });
    const PROF = {
      'Arrenca, manté, frena': [[0, 0], [3, 6], [7, 6], [10, 0]],
      'Va i torna': [[0, 4], [4, 4], [4.01, -4], [8, -4], [8.01, 0], [10, 0]],
      'Frena, s\'atura i retrocedeix': [[0, 8], [8, -8], [10, -8]],
      'MRU': [[0, 5], [10, 5]]
    };
    const sel = el('select'); Object.keys(PROF).forEach(k => sel.appendChild(el('option', { value: k, text: k })));
    panel.appendChild(el('label', { text: 'Perfil de velocitat' })); panel.appendChild(sel);
    const holder = el('div'); canvas.appendChild(holder);
    const sub = el('div'); panel.appendChild(sub);
    function vOf(K, t) { for (let i = 1; i < K.length; i++) if (t <= K[i][0]) { const [t0, v0] = K[i - 1], [t1, v1] = K[i]; return v0 + (v1 - v0) * (t - t0) / (t1 - t0); } return K[K.length - 1][1]; }
    function aOf(K, t) { for (let i = 1; i < K.length; i++) if (t <= K[i][0]) { const [t0, v0] = K[i - 1], [t1, v1] = K[i]; return t1 - t0 < 0.05 ? 0 : (v1 - v0) / (t1 - t0); } return 0; }
    function build() {
      clear(holder); clear(sub); const K = PROF[sel.value];
      const gv = graph(holder, { w: 380, h: 190, xmin: 0, xmax: 10, ymin: -10, ymax: 10, xticks: 10, yticks: 4, xlabel: 't (s)', ylabel: 'v (m/s)' });
      const area = svg('path', { class: 'svg-area' }); gv.layer.appendChild(area);
      gv.path(K, 'svg-curve red'); const dv = gv.dot(0, vOf(K, 0), 5);
      const xs = []; let x = 0; for (let t = 0; t <= 10.001; t += 0.05) { x += vOf(K, t) * 0.05; xs.push([t, x]); }
      const xmax = Math.max(5, ...xs.map(p => Math.abs(p[1])));
      const gx = graph(holder, { w: 380, h: 190, xmin: 0, xmax: 10, ymin: -Math.ceil(xmax / 10) * 10, ymax: Math.ceil(xmax / 10) * 10, xticks: 10, yticks: 4, xlabel: 't (s)', ylabel: 'x (m) · l\'àrea acumulada' });
      gx.path(xs, 'svg-curve'); const dx = gx.dot(0, 0, 5);
      const R = readout(sub, [{ key: 'v', label: 'v(t) · alçada de la línia' }, { key: 'a', label: 'a(t) · pendent', big: true }, { key: 'x', label: 'Δx · àrea fins a t', big: true }, { key: 'd', label: 'Distància · àrea en valor absolut' }]);
      player(sub, t => {
        let x = 0, d = 0, dd = `M ${gv.X(0)} ${gv.Y(0)}`; for (let s = 0; s <= t + 1e-9; s += 0.05) { const v = vOf(K, s); x += v * 0.05; d += Math.abs(v) * 0.05; dd += ` L ${gv.X(s)} ${gv.Y(v)}`; } dd += ` L ${gv.X(t)} ${gv.Y(0)} Z`; area.setAttribute('d', dd);
        const v = vOf(K, t), a = aOf(K, t);
        dv.setAttribute('cx', gv.X(t)); dv.setAttribute('cy', gv.Y(v)); dx.setAttribute('cx', gx.X(t)); dx.setAttribute('cy', gx.Y(x));
        R.set('v', fmt(v, 1) + ' m/s'); R.set('a', fmt(a, 1) + ' m/s²'); R.set('x', fmt(x, 1) + ' m'); R.set('d', fmt(d, 1) + ' m');
        R.note(v < -0.05 ? 'La línia és per sota de l\'eix: v negativa, el mòbil retrocedeix i l\'àrea compta negativa. La distància, en canvi, continua creixent.' : Math.abs(a) < 0.05 ? 'Tram horitzontal: acceleració zero, MRU. Al gràfic x-t és una recta.' : a > 0 ? 'La línia puja: a > 0. Al gràfic x-t la corba s\'empina.' : 'La línia baixa: a < 0. Si v és positiva, frena; el gràfic x-t s\'aplana.');
      }, { tmax: 10 });
    }
    sel.addEventListener('change', build); build();
  };

  /* ===================================================== E.2 trigo */
  I.trigo = function (c) {
    const { canvas, panel } = shell(c, { title: 'Components amb sinus i cosinus', hint: 'Mou l\'angle i el mòdul. El triangle rectangle és sempre el mateix dibuix.' });
    let ang = 30, mod = 8;
    const G = graph(canvas, { w: 380, h: 320, xmin: -10, xmax: 10, ymin: -9, ymax: 9, xticks: 4, yticks: 6, xlabel: 'X', ylabel: 'Y' });
    const layer = svg('g'); G.layer.appendChild(layer);
    slider(panel, 'Angle α', 0, 360, 1, ang, v => { ang = v; upd(); }, v => v + '°');
    slider(panel, 'Mòdul a', 1, 9, 0.5, mod, v => { mod = v; upd(); }, v => fmt(v, 1));
    const R = readout(panel, [{ key: 'c', label: 'cos α · sin α · tg α' }, { key: 'x', label: 'a<sub>x</sub> = a · cos α', big: true }, { key: 'y', label: 'a<sub>y</sub> = a · sin α', big: true }, { key: 'chk', label: 'Comprovació Pitàgores' }]);
    function upd() {
      clear(layer); const r = ang * Math.PI / 180, ax = mod * Math.cos(r), ay = mod * Math.sin(r);
      layer.appendChild(svg('polygon', { points: `${G.X(0)},${G.Y(0)} ${G.X(ax)},${G.Y(0)} ${G.X(ax)},${G.Y(ay)}`, class: 'svg-area' }));
      layer.appendChild(svg('path', { d: `M ${G.X(1.5)} ${G.Y(0)} A ${G.X(1.5) - G.X(0)} ${G.X(1.5) - G.X(0)} 0 ${ang > 180 ? 1 : 0} 0 ${G.X(1.5 * Math.cos(r))} ${G.Y(1.5 * Math.sin(r))}`, class: 'svg-curve red', style: 'stroke-width:1.5' }));
      arrow(layer, G.X(0), G.Y(0), G.X(ax), G.Y(0), 'svg-vec2'); arrow(layer, G.X(ax), G.Y(0), G.X(ax), G.Y(ay), 'svg-vec3'); arrow(layer, G.X(0), G.Y(0), G.X(ax), G.Y(ay), 'svg-vec');
      layer.appendChild(text(G.X(ax / 2), G.Y(0) + (ay >= 0 ? 16 : -8), 'a·cos α', 'svg-mono red', 'middle'));
      const ty = text(G.X(ax) + (ax >= 0 ? 6 : -6), G.Y(ay / 2) + 4, 'a·sin α', 'svg-mono', ax >= 0 ? 'start' : 'end'); ty.setAttribute('fill', 'var(--cat-blue)'); layer.appendChild(ty);
      layer.appendChild(text(G.X(ax / 2) - 10 * Math.sin(r), G.Y(ay / 2) - 10 * Math.cos(r), 'a', 'svg-mono', 'middle'));
      layer.appendChild(text(G.X(2 * Math.cos(r / 2)) + 2, G.Y(2 * Math.sin(r / 2)) + 4, 'α', 'svg-mono red'));
      R.set('c', `${fmt(Math.cos(r), 2)} · ${fmt(Math.sin(r), 2)} · ${Math.abs(Math.cos(r)) < 0.01 ? '∞' : fmt(Math.tan(r), 2)}`);
      R.set('x', `${fmt(mod, 1)} · ${fmt(Math.cos(r), 2)} = ${fmt(ax, 2)}`); R.set('y', `${fmt(mod, 1)} · ${fmt(Math.sin(r), 2)} = ${fmt(ay, 2)}`);
      R.set('chk', `√(${fmt(ax * ax, 1)} + ${fmt(ay * ay, 1)}) = ${fmt(Math.hypot(ax, ay), 1)}`);
      const q = ang % 360; R.note(q === 0 || q === 180 ? 'Vector horitzontal: la component y és zero.' : q === 90 || q === 270 ? 'Vector vertical: la component x és zero.' : ax < 0 ? `Segon o tercer quadrant: a_x negativa. La calculadora et donaria tg⁻¹(${fmt(ay, 1)}/${fmt(ax, 1)}) = ${fmt(Math.atan(ay / ax) * 180 / Math.PI, 1)}°; cal sumar 180° per arribar a ${ang}°.` : 'Primer o quart quadrant: a_x positiva, la calculadora dona l\'angle bo directament.');
    }
    upd();
  };
})();

/* ============================================================
   Eines noves + pràctica del pèndol
   ============================================================ */
(function () {
  'use strict';
  const I = window.INTERACTIVES;
  const { fmt, el, svg, clear, shell, slider, readout, graph, text } = I._u;

  /* ===================================================== 0.8 pèndol */
  I.pendol = function (c) {
    const { canvas, panel } = shell(c, { title: 'El pèndol al laboratori', hint: 'Canvia la llargada, la massa i l\'angle. Mira què fa canviar el període i què no.' });
    const g = 9.81;
    let r = 0.60, massa = 50, ang = 10, t0 = performance.now();
    const wrap = el('div', { style: 'display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap' }); canvas.appendChild(wrap);
    const W = 190, H = 260;
    const s = svg('svg', { viewBox: `0 0 ${W} ${H}`, style: 'flex:0 0 180px;width:180px' }); wrap.appendChild(s);
    const right = el('div', { style: 'flex:1;min-width:230px' }); wrap.appendChild(right);
    s.appendChild(svg('rect', { x: 40, y: 18, width: 110, height: 6, style: 'fill:var(--stone-300)' }));
    const swing = svg('g'); s.appendChild(swing);
    const ruler = svg('g'); s.appendChild(ruler);
    const gT = graph(right, { w: 330, h: 190, xmin: 0, xmax: 1.3, ymin: 0, ymax: 6, xticks: 4, yticks: 3, xlabel: 'r (m)', ylabel: 'T² (s²)', xd: 1 });
    const line = gT.path([], 'svg-curve red');
    const pts = svg('g'); gT.layer.appendChild(pts);
    slider(panel, 'Llargada del fil r', 0.1, 1.2, 0.05, r, v => { r = v; upd(); }, v => fmt(v * 100, 0) + ' cm');
    slider(panel, 'Massa de la bola', 10, 200, 10, massa, v => { massa = v; upd(); }, v => v + ' g');
    slider(panel, 'Angle inicial', 5, 30, 1, ang, v => { ang = v; upd(); }, v => v + '°');
    const R = readout(panel, [
      { key: 'T', label: 'Període T = 2π√(r/g)', big: true },
      { key: 't10', label: 'El que marcaria el cronòmetre (10 oscil·lacions)' },
      { key: 'K', label: 'Quocient K = T² / r' },
      { key: 'g', label: 'Gravetat: g = 4π² / K', big: true }
    ]);
    function T() { return 2 * Math.PI * Math.sqrt(r / g); }
    function upd() {
      const per = T(), K = per * per / r;
      R.set('T', fmt(per, 2) + ' s'); R.set('t10', fmt(per * 10, 1) + ' s');
      R.set('K', `${fmt(per * per, 2)} / ${fmt(r, 2)} = ${fmt(K, 2)} s²/m`);
      R.set('g', `39,48 / ${fmt(K, 2)} = ${fmt(4 * Math.PI * Math.PI / K, 2)} m/s²`);
      const th = ang * Math.PI / 180, corr = th * th / 16;
      R.note(ang > 12
        ? `Angle gran: la fórmula T = 2π√(r/g) només val per a angles petits. A ${ang}° el període real seria un ${fmt(corr * 100, 1)} % més llarg (${fmt(per * (1 + corr), 2)} s). Per això a la pràctica es fa servir 5° o 10°.`
        : (massa !== 50 || ang !== 10
          ? 'Fixa-t\'hi: has canviat la massa o l\'angle i el període no s\'ha mogut ni una centèsima. Només la llargada el canvia.'
          : 'Mou la llargada i mira com canvia el període. Després prova de moure la massa i l\'angle: no passa res.'));
      clear(pts);
      const P = []; for (let x = 0; x <= 1.3; x += 0.05) P.push([x, 4 * Math.PI * Math.PI / g * x]);
      line.setAttribute('d', P.map((p, i) => (i ? 'L' : 'M') + gT.X(p[0]).toFixed(1) + ' ' + gT.Y(Math.min(6, p[1])).toFixed(1)).join(' '));
      [0.3, 0.6, 0.9].forEach(x => { const y = 4 * Math.PI * Math.PI / g * x; if (y <= 6) pts.appendChild(svg('circle', { cx: gT.X(x), cy: gT.Y(y), r: 4, style: 'fill:var(--stone-400)' })); });
      const yc = Math.min(6, per * per); pts.appendChild(svg('circle', { cx: gT.X(r), cy: gT.Y(yc), r: 6, class: 'svg-handle' }));
    }
    function draw(now) {
      const th = ang * Math.PI / 180 * Math.cos(2 * Math.PI * (now - t0) / 1000 / T());
      const px = 95, py = 24, L = 40 + r * 140;
      const bx = px + L * Math.sin(th), by = py + L * Math.cos(th);
      clear(swing); clear(ruler);
      swing.appendChild(svg('line', { x1: px, y1: py, x2: px, y2: py + L, style: 'stroke:var(--stone-300);stroke-width:1;stroke-dasharray:3 3' }));
      swing.appendChild(svg('line', { x1: px, y1: py, x2: bx, y2: by, style: 'stroke:var(--ink);stroke-width:1.5' }));
      swing.appendChild(svg('circle', { cx: bx, cy: by, r: 5 + massa / 28, style: 'fill:var(--accent)' }));
      ruler.appendChild(svg('line', { x1: 26, y1: py, x2: 26, y2: py + L, style: 'stroke:var(--stone-500);stroke-width:1' }));
      ruler.appendChild(svg('line', { x1: 22, y1: py, x2: 30, y2: py, style: 'stroke:var(--stone-500);stroke-width:1' }));
      ruler.appendChild(svg('line', { x1: 22, y1: py + L, x2: 30, y2: py + L, style: 'stroke:var(--stone-500);stroke-width:1' }));
      const lab = text(20, py + L / 2, 'r', 'svg-mono muted', 'end'); ruler.appendChild(lab);
      requestAnimationFrame(draw);
    }
    upd(); requestAnimationFrame(draw);
  };

  /* ===================================================== E.1 potències */
  I.potencies = function (c) {
    const { canvas, panel } = shell(c, { title: 'Operar amb potències de 10', hint: 'Tria dos nombres i una operació. Mira la regla que s\'aplica.' });
    let a = 3, n = 6, b = 4, m = -3, op = '×';
    const chain = el('div', { class: 'chain', style: 'font-size:15px;line-height:2.1' }); canvas.appendChild(chain);
    const row1 = el('div', { class: 'row' }, [el('div', {}, [el('label', { text: 'Primer nombre' }), el('input', { type: 'number', value: a, step: 'any' })]), el('div', {}, [el('label', { text: 'Exponent' }), el('input', { type: 'number', value: n })])]);
    const opSel = el('select'); ['×', '÷', '+'].forEach(o => opSel.appendChild(el('option', { value: o, text: o === '×' ? 'multiplicar ×' : o === '÷' ? 'dividir ÷' : 'sumar +' })));
    const row2 = el('div', { class: 'row' }, [el('div', {}, [el('label', { text: 'Segon nombre' }), el('input', { type: 'number', value: b, step: 'any' })]), el('div', {}, [el('label', { text: 'Exponent' }), el('input', { type: 'number', value: m })])]);
    panel.appendChild(row1); panel.appendChild(el('label', { text: 'Operació' })); panel.appendChild(opSel); panel.appendChild(row2);
    const ins = row1.querySelectorAll('input'), ins2 = row2.querySelectorAll('input');
    const R = readout(panel, [{ key: 'reg', label: 'Regla' }, { key: 'res', label: 'Resultat', big: true }, { key: 'dec', label: 'Escrit sencer' }]);
    function sciHTML(x, e) { return `${fmt(x, 2).replace(/,00$/, '')}·10<sup>${e}</sup>`; }
    function norm(x, e) { if (x === 0) return [0, 0]; while (Math.abs(x) >= 10) { x /= 10; e++; } while (Math.abs(x) < 1) { x *= 10; e--; } return [x, e]; }
    function upd() {
      a = +ins[0].value || 0; n = Math.round(+ins[1].value || 0); b = +ins2[0].value || 0; m = Math.round(+ins2[1].value || 0); op = opSel.value;
      let html = `${sciHTML(a, n)} &nbsp;${op}&nbsp; ${sciHTML(b, m)}`, x, e, regla;
      if (op === '×') { x = a * b; e = n + m; regla = 'Multiplica els nombres i SUMA els exponents.'; html += `<br>= (${fmt(a, 2).replace(/,00$/, '')} · ${fmt(b, 2).replace(/,00$/, '')}) · 10<sup>${n} + ${m}</sup> = ${sciHTML(x, e)}`; }
      else if (op === '÷') { x = b !== 0 ? a / b : NaN; e = n - m; regla = 'Divideix els nombres i RESTA els exponents.'; html += `<br>= (${fmt(a, 2).replace(/,00$/, '')} / ${fmt(b, 2).replace(/,00$/, '')}) · 10<sup>${n} − ${m}</sup> = ${sciHTML(x, e)}`; }
      else { const E = Math.max(n, m); const aa = a * Math.pow(10, n - E), bb = b * Math.pow(10, m - E); x = aa + bb; e = E; regla = 'Per sumar, primer el MATEIX exponent. Després se sumen només els nombres.'; html += `<br>= ${sciHTML(aa, E)} + ${sciHTML(bb, E)} = ${sciHTML(x, e)}`; }
      const [xn, en] = norm(x, e);
      if (Math.abs(x) >= 10 || (Math.abs(x) < 1 && x !== 0)) html += `<br>= <span class="keep">${sciHTML(xn, en)}</span> <span style="color:var(--stone-500)">(ajustat: el nombre ha de quedar entre 1 i 10)</span>`;
      else html += ` <span class="keep">✓</span>`;
      chain.innerHTML = html;
      R.set('reg', regla); R.set('res', sciHTML(xn, en));
      const val = xn * Math.pow(10, en);
      R.set('dec', Math.abs(en) > 8 ? 'massa llarg per escriure\'l' : val.toLocaleString('ca-ES', { maximumFractionDigits: 10 }));
      R.note(op === '+' ? 'Amb sumes i restes els exponents NO es toquen: només es fa que siguin iguals.' : 'Els nombres de davant es multipliquen o divideixen; els exponents se sumen o es resten. Mai al revés.');
    }
    [...ins, ...ins2, opSel].forEach(x => x.addEventListener('input', upd));
    upd();
  };

  /* ===================================================== E.2 aïllar */
  I.aillar = function (c) {
    const { canvas, panel } = shell(c, { title: 'Aïllar una lletra', hint: 'Tria una fórmula i quina lletra busques. Es desmunta pas a pas.' });
    const F = {
      'v = v₀ + a·t': {
        'v₀': ['Vull v₀ i està sumada a l\'altre costat.', 'La a·t multiplica: passa restant.', 'v₀ = v − a·t'],
        'a': ['Primer trec la v₀, que suma: v − v₀ = a·t', 'Ara la t multiplica la a: passa dividint.', 'a = (v − v₀) / t'],
        't': ['Primer trec la v₀, que suma: v − v₀ = a·t', 'Ara la a multiplica la t: passa dividint.', 't = (v − v₀) / a']
      },
      'x = x₀ + v·t': {
        'v': ['Trec la x₀, que suma: x − x₀ = v·t', 'La t multiplica: passa dividint.', 'v = (x − x₀) / t'],
        't': ['Trec la x₀, que suma: x − x₀ = v·t', 'La v multiplica: passa dividint.', 't = (x − x₀) / v'],
        'x₀': ['La x₀ està sola sumant.', 'El v·t passa restant.', 'x₀ = x − v·t']
      },
      'v² = v₀² + 2·a·Δx': {
        'v': ['La v està al quadrat.', 'Passa a l\'altre costat com a arrel de TOT el que hi ha.', 'v = √(v₀² + 2·a·Δx)'],
        'a': ['Trec la v₀², que suma: v² − v₀² = 2·a·Δx', 'El 2·Δx multiplica: passa dividint.', 'a = (v² − v₀²) / (2·Δx)'],
        'Δx': ['Trec la v₀², que suma: v² − v₀² = 2·a·Δx', 'El 2·a multiplica: passa dividint.', 'Δx = (v² − v₀²) / (2·a)']
      },
      'T = 2π·√(r/g)': {
        'r': ['El 2π multiplica: passa dividint. T/(2π) = √(r/g)', 'L\'arrel passa com a quadrat: (T/2π)² = r/g', 'La g divideix: passa multiplicant.', 'r = g·(T / 2π)²'],
        'g': ['El 2π multiplica: passa dividint. T/(2π) = √(r/g)', 'L\'arrel passa com a quadrat: (T/2π)² = r/g', 'Ara la g està a sota: es creuen.', 'g = r / (T / 2π)²  =  4π²·r / T²']
      },
      'ρ = m / V': {
        'm': ['La V està dividint.', 'Passa multiplicant a l\'altre costat.', 'm = ρ · V'],
        'V': ['La V està dividint: primer la pujo. ρ·V = m', 'Ara la ρ multiplica: passa dividint.', 'V = m / ρ']
      },
      'e_r = (e_a / m̄)·100': {
        'e_a': ['El 100 multiplica: passa dividint. e_r/100 = e_a/m̄', 'La m̄ divideix: passa multiplicant.', 'e_a = (e_r / 100) · m̄']
      }
    };
    const fSel = el('select'); Object.keys(F).forEach(k => fSel.appendChild(el('option', { value: k, text: k })));
    const uSel = el('select');
    panel.appendChild(el('label', { text: 'Fórmula' })); panel.appendChild(fSel);
    panel.appendChild(el('label', { text: 'Quina lletra busques' })); panel.appendChild(uSel);
    const box = el('div', { class: 'chain', style: 'font-size:15px' }); canvas.appendChild(box);
    function fillU() { clear(uSel); Object.keys(F[fSel.value]).forEach(k => uSel.appendChild(el('option', { value: k, text: k }))); }
    function upd() {
      const steps = F[fSel.value][uSel.value] || [];
      box.innerHTML = `<div style="color:var(--stone-500);font-size:11px;letter-spacing:.16em;text-transform:uppercase;margin-bottom:10px">Partim de &nbsp;·&nbsp; ${fSel.value}</div>` +
        steps.map((t, i) => i === steps.length - 1
          ? `<div style="margin-top:12px;font-size:18px" class="keep">${t}</div>`
          : `<div style="margin:6px 0"><span style="color:var(--stone-400)">${i + 1}.</span> ${t}</div>`).join('');
    }
    fSel.addEventListener('change', () => { fillU(); upd(); });
    uSel.addEventListener('change', upd);
    fillU(); upd();
  };

  /* ===================================================== E.5 quina fórmula */
  I.quinaformula = function (c) {
    const { canvas, panel } = shell(c, { title: 'Quina fórmula faig servir?', hint: 'Marca el que et donen i tria el que et demanen.', stack: true });
    const VARS = [
      { k: 'v0', n: 'velocitat inicial v₀' },
      { k: 'v', n: 'velocitat final v' },
      { k: 'a', n: 'acceleració a' },
      { k: 't', n: 'temps t' },
      { k: 'dx', n: 'desplaçament Δx' }
    ];
    const EQ = [
      { f: 'x = x₀ + v·t', v: ['dx', 'v', 't'], nota: 'MRU: velocitat constant (a = 0).' },
      { f: 'v = v₀ + a·t', v: ['v', 'v0', 'a', 't'], nota: 'La que relaciona velocitats i temps.' },
      { f: 'x = x₀ + v₀·t + ½·a·t²', v: ['dx', 'v0', 'a', 't'], nota: 'La de la posició. Si busques la t i no la tens, surt una equació de segon grau.' },
      { f: 'v² = v₀² + 2·a·Δx', v: ['v', 'v0', 'a', 'dx'], nota: 'La que no porta el temps.' }
    ];
    const known = new Set(['v0', 'a', 't']);
    let want = 'dx';
    const boxes = el('div', { style: 'display:flex;flex-wrap:wrap;gap:10px 18px;margin-bottom:4px' });
    VARS.forEach(v => {
      const lab = el('label', { style: 'font-family:var(--sans);font-size:14.5px;letter-spacing:0;text-transform:none;color:var(--stone-800);font-weight:400;margin:0;display:flex;gap:7px;align-items:center' });
      const inp = el('input', { type: 'checkbox', style: 'width:auto' }); if (known.has(v.k)) inp.checked = true;
      inp.addEventListener('change', () => { inp.checked ? known.add(v.k) : known.delete(v.k); upd(); });
      lab.appendChild(inp); lab.appendChild(document.createTextNode(v.n)); boxes.appendChild(lab);
    });
    panel.appendChild(el('label', { text: 'Què et donen' })); panel.appendChild(boxes);
    const wSel = el('select'); VARS.forEach(v => wSel.appendChild(el('option', { value: v.k, text: v.n })));
    wSel.value = want; wSel.addEventListener('change', () => { want = wSel.value; upd(); });
    panel.appendChild(el('label', { text: 'Què et demanen' })); panel.appendChild(wSel);
    const out = el('div'); canvas.appendChild(out);
    function upd() {
      known.delete(want);
      clear(out);
      const ok = EQ.filter(e => e.v.includes(want) && e.v.every(x => x === want || known.has(x)));
      if (ok.length) {
        out.appendChild(el('div', { class: 'eyebrow', html: 'Fes servir', style: 'margin-bottom:12px' }));
        ok.forEach(e => {
          out.appendChild(el('div', { class: 'formula', html: `${e.f}<small>${e.nota}</small>`, style: 'display:block;margin-bottom:10px' }));
        });
        out.appendChild(el('p', { style: 'color:var(--stone-600);font-size:14.5px', html: 'Aïlla-hi <strong>' + (VARS.find(v => v.k === want) || {}).n + '</strong> i substitueix. Recorda els signes: el que va en sentit contrari al positiu, negatiu.' }));
      } else {
        const falten = EQ.map(e => ({ e, f: e.v.filter(x => x !== want && !known.has(x)) })).filter(o => o.e.v.includes(want)).sort((p, q) => p.f.length - q.f.length)[0];
        out.appendChild(el('div', { class: 'eyebrow', html: 'Encara no es pot', style: 'margin-bottom:12px' }));
        out.appendChild(el('p', { style: 'color:var(--stone-700);font-size:15px;max-width:60ch', html: falten
          ? `Amb aquestes dades no n'hi ha prou. La més a prop és <span class="k">${falten.e.f}</span>, i et falta: <strong>${falten.f.map(k => (VARS.find(v => v.k === k) || {}).n).join(', ')}</strong>.<br><br>Sovint la dada que falta és a l'enunciat amb paraules: "parteix del repòs" és v₀ = 0, "s'atura" és v = 0, "cau lliurement" és a = 9,8 m/s². Si no hi és, es treu en dos passos: primer una altra fórmula per trobar-la, i després aquesta.`
          : 'Tria alguna dada més.' }));
      }
    }
    upd();
  };
})();
