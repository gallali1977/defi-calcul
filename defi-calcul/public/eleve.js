'use strict';
const $ = s => document.querySelector(s);
const M = $('#m');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
async function api(url, body) {
  const r = await fetch(url, { method: body ? 'POST' : 'GET', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined, credentials: 'same-origin' });
  let j = {}; try { j = await r.json(); } catch (e) {}
  if (!r.ok) { const e = new Error(j.error || 'Une erreur est survenue.'); e.status = r.status; throw e; }
  return j;
}
const parts = location.pathname.split('/');
const CODE = parts[1] === 'j' ? (parts[2] || '').toUpperCase() : null;

/* ================= Carnet ================= */
async function carnet() {
  $('#hd').textContent = 'Mon carnet';
  try {
    const c = await api('/api/eleve/carnet');
    $('#hd').textContent = `${c.me} · ${c.className}`;
    const done = c.seances.filter(s => c.cells[s.id]?.pct != null), avg = done.length ? Math.round(done.reduce((a, s) => a + c.cells[s.id].pct, 0) / done.length) : null;
    M.innerHTML = `<div class="eyebrow">${esc(c.parcours)}</div><h1 class="disp" style="font-size:2em">Mon carnet de progression</h1>
     ${avg != null ? `<p class="lead">Ta réussite moyenne aux quiz : <b>${avg} %</b>. Compare-toi à toi-même, pas aux autres.</p>` : '<p class="lead">Ton carnet se remplira à chaque défi joué sur téléphone.</p>'}
     <ul class="carnet">${c.seances.map(s => { const v = c.cells[s.id] || {}; return `<li><b>${s.id}</b><span>${esc(s.title)}<br><span class="small">${v.feel ? `Je me sens capable : ${v.feel}/5` : 'Ressenti non renseigné'}</span></span><span class="num" style="font-weight:700">${v.pct != null ? v.pct + ' %' : '—'}</span></li>`; }).join('')}</ul>
     <button class="btn ghost sm" id="lo" style="margin-top:14px">Ce n'est pas moi : me déconnecter</button>`;
    $('#lo').onclick = async () => { await api('/api/eleve/logout', {}); location.reload(); };
  } catch (e) {
    M.innerHTML = `<h1 class="disp" style="font-size:1.8em">Mon carnet</h1><p class="lead">Pour voir ton carnet, connecte-toi une première fois en scannant le QR code d'un défi au tableau.</p>`;
  }
}

/* ================= Identification ================= */
async function join() {
  let info;
  try { info = await api('/api/join/' + CODE); }
  catch (e) { M.innerHTML = `<h1 class="disp" style="font-size:1.8em">Oups</h1><p class="lead">${esc(e.message)}</p><a class="btn" href="/eleve">Voir mon carnet</a>`; return; }
  $('#hd').textContent = info.className;
  if (info.me) return play(info);
  if (!info.roster) { M.innerHTML = `<p class="lead">Ce défi est terminé.</p>`; return; }
  let sel = null, pin = '';
  const draw = () => {
    if (!sel) {
      M.innerHTML = `<div class="eyebrow">${esc(info.title)}</div><h1 class="disp" style="font-size:1.7em">Qui es-tu ?</h1><input class="in" id="f" placeholder="Chercher mon prénom" style="width:100%"><div class="roster" id="r"></div>`;
      const fill = () => { const q = $('#f').value.toLowerCase(); $('#r').innerHTML = info.roster.filter(s => s.label.toLowerCase().includes(q)).map(s => `<button data-id="${s.id}">${esc(s.label)}</button>`).join(''); $('#r').querySelectorAll('button').forEach(b => b.onclick = () => { sel = info.roster.find(s => s.id === +b.dataset.id); pin = ''; draw(); }); };
      $('#f').oninput = fill; fill();
    } else {
      M.innerHTML = `<div class="eyebrow">Bonjour</div><h1 class="disp" style="font-size:1.8em">${esc(sel.label)}</h1><p>Tape ton code secret à 4 chiffres.</p>
       <div class="pinshow">${[0, 1, 2, 3].map(i => `<i>${pin[i] ? '•' : ''}</i>`).join('')}</div><div class="msg err" id="pe"></div>
       <div class="pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button data-n="${n}">${n}</button>`).join('')}<button data-x="back" aria-label="Effacer">⌫</button><button data-n="0">0</button><button data-x="no" style="font-size:.8em">Pas moi</button></div>`;
      M.querySelectorAll('[data-n]').forEach(b => b.onclick = () => { if (pin.length < 4) pin += b.dataset.n; draw(); if (pin.length === 4) send(); });
      M.querySelector('[data-x="back"]').onclick = () => { pin = pin.slice(0, -1); draw(); };
      M.querySelector('[data-x="no"]').onclick = () => { sel = null; draw(); };
    }
  };
  const send = async () => {
    try { await api(`/api/join/${CODE}/login`, { studentId: sel.id, pin }); join(); }
    catch (e) { pin = ''; draw(); $('#pe').textContent = e.message; if (navigator.vibrate) navigator.vibrate(200); }
  };
  draw();
}

/* ================= Jeu ================= */
function play(info) {
  $('#hd').textContent = `${info.me.label} · ${info.className}`;
  let st = null, offset = 0, clockT = null, sending = false, sign = '', lastKey = '', draft = '';
  const es = new EventSource(`/api/join/${CODE}/stream`);
  es.onmessage = ev => { st = JSON.parse(ev.data); offset = st.serverNow - Date.now(); if (st.kind === 'cards') drawCards(); else draw(); };
  let buzzed = -1;
  function drawCards() {
    clearInterval(clockT);
    const c = st.card;
    if (st.status === 'lobby') { M.innerHTML = `<div class="wait"><div class="eyebrow">${esc(st.title)}</div><h1 class="disp" style="font-size:1.8em;margin:.4em 0">C'est bon, tu es connecté·e !</h1><p>Le professeur va distribuer les cartes.</p><div class="dotz">•••</div></div>`; return; }
    if (st.status === 'end') {
      const e = st.end || {}; es.close();
      M.innerHTML = `<div class="eyebrow">${esc(st.title)} · terminé</div><h1 class="disp" style="font-size:2.2em">${e.won} / ${e.total}</h1><p class="lead">Cartes gagnées par la classe. ${e.total && e.won / e.total >= .7 ? 'Belle équipe !' : 'On fera encore mieux la prochaine fois !'}</p>
       <div class="panel"><b>Après ce défi, je me sens capable…</b><p class="small" style="margin:.2em 0 .6em">1 = pas du tout · 5 = tout à fait</p><div class="feel">${[1, 2, 3, 4, 5].map(n => `<button data-f="${n}" class="${e.feeling === n ? 'on' : ''}">${n}</button>`).join('')}</div><div class="msg ok" id="fm">${e.feeling ? 'Merci !' : ''}</div></div>
       <a class="btn" href="/eleve" style="justify-content:center">Voir mon carnet</a>`;
      M.querySelectorAll('[data-f]').forEach(b => b.onclick = async () => { await api(`/api/join/${CODE}/feeling`, { score: +b.dataset.f }).catch(() => api('/api/eleve/feeling', { score: +b.dataset.f, seance: st.seance }).catch(() => {})); M.querySelectorAll('[data-f]').forEach(x => x.classList.toggle('on', x === b)); $('#fm').textContent = 'Merci !'; });
      return;
    }
    if (!c) { M.innerHTML = `<div class="wait"><h2 class="disp" style="font-size:1.6em">Pas de carte pour toi cette fois</h2><p>Toutes les cartes sont distribuées. Calcule quand même chaque formule de tête : c'est un bon entraînement !</p></div>`; return; }
    const q = st.status === 'q', rev = st.status === 'reveal', rd = st.round || {};
    let msg = '';
    if (rev) msg = rd.mine
      ? (rd.ok ? `<div class="result ok"><span class="big">Bravo !</span>C'était bien toi : la classe gagne la carte.</div>`
        : rd.pressed ? `<div class="result ko"><span class="big">C'était toi !</span>Mais un autre élève a aussi appuyé.</div>`
        : `<div class="result ko"><span class="big">C'était toi !</span>Reste bien attentif pour la suite.</div>`)
      : rd.pressed ? `<div class="result ko"><span class="big">Pas ta carte</span>Ce résultat n'était pas le tien.</div>`
      : `<div class="result ${rd.ok ? 'ok' : 'ko'}"><span class="big">${rd.ok ? 'Carte gagnée' : 'Carte perdue'}</span>Regarde le tableau.</div>`;
    M.innerHTML = `<div class="row" style="justify-content:space-between"><div class="eyebrow">${st.status === 'dealt' ? 'Ta carte' : `Carte ${st.qi + 1} / ${st.total}`}</div>${q ? '<div class="pclock num" id="pc"></div>' : ''}</div>
      <div class="mycard"><div class="eyebrow">Mon résultat</div><div class="r num">${esc(c.r)}</div></div>
      ${st.status === 'dealt' ? '<p class="lead" style="text-align:center">Retiens ton résultat et regarde le tableau.</p>' : ''}
      ${q ? `<button class="itsme" id="me" ${st.pressed ? 'disabled' : ''}>${st.pressed ? 'Envoyé !' : 'C\'est moi !'}</button>` : ''}
      ${msg}<div class="msg err" id="am"></div>
      <p class="small" style="text-align:center">La classe a gagné ${st.won} carte${st.won > 1 ? 's' : ''} sur ${st.played}.</p>`;
    if (q) {
      const b = $('#me');
      if (b && !st.pressed) b.onclick = async () => { b.disabled = true; b.textContent = 'Envoyé !'; if (navigator.vibrate) navigator.vibrate(40); try { await api(`/api/join/${CODE}/press`, { qi: st.qi }); } catch (e) { $('#am').textContent = e.message; } };
      const tk = () => { const el = $('#pc'); if (!el) return; const left = Math.max(0, (st.qEnd - (Date.now() + offset)) / 1000); el.textContent = Math.ceil(left); el.classList.toggle('warn', left <= 2); if (left <= 0 && b) b.disabled = true; };
      tk(); clockT = setInterval(tk, 200);
    }
    if (rev && buzzed !== st.qi) { buzzed = st.qi; if (navigator.vibrate) navigator.vibrate(rd.ok ? 60 : [80, 60, 80]); }
  }
  es.onerror = () => { if (es.readyState === 2) M.innerHTML = '<p class="lead">Connexion perdue. Recharge la page.</p>'; };
  const tick = () => { const el = $('#pc'); if (!el || !st) return; const tot = (st.question && st.qEnd) ? st.qEnd - (Date.now() + offset) : 0; const left = Math.max(0, tot / 1000); el.textContent = Math.ceil(left); el.classList.toggle('warn', left <= 5); const b = $('#pb'); if (b) b.style.width = Math.min(100, left / (st._dur || 30) * 100) + '%'; };
  async function answer(v) {
    if (sending) return; sending = true;
    try { await api(`/api/join/${CODE}/answer`, { qi: st.qi, value: v }); st.myAnswer = String(v); draw(); }
    catch (e) { const m = $('#am'); if (m) m.textContent = e.message; }
    sending = false;
  }
  function draw() {
    const key = st.status + ':' + st.qi + ':' + (st.myAnswer != null);
    if (key === lastKey && st.status !== 'end') return; // évite d'effacer la saisie en cours
    lastKey = key; clearInterval(clockT);
    if (st.status === 'lobby') { M.innerHTML = `<div class="wait"><div class="eyebrow">${esc(st.title)}</div><h1 class="disp" style="font-size:1.8em;margin:.4em 0">C'est bon, tu es connecté·e !</h1><p>Regarde le tableau : le défi va commencer.</p><div class="dotz">•••</div></div>`; return; }
    if (st.status === 'q') {
      const q = st.question; st._dur = Math.max(1, (st.qEnd - st.serverNow) / 1000);
      if (st.myAnswer != null) { M.innerHTML = `<div class="eyebrow">Question ${st.qi + 1} / ${st.total}</div><div class="wait"><h2 class="disp" style="font-size:1.6em">Réponse envoyée</h2><p>Attends la correction au tableau.</p><div class="dotz">•••</div></div>`; return; }
      M.innerHTML = `<div class="row" style="justify-content:space-between"><div class="eyebrow">Question ${st.qi + 1} / ${st.total}</div><div class="pclock num" id="pc"></div></div><div class="pbar"><i id="pb"></i></div>
       <div class="pq">${esc(q.q)}</div>
       ${q.type === 'qcm' ? `<div class="popts">${q.opts.map((o, k) => `<button class="p${k}" data-k="${k}"><span class="k">${'ABCD'[k]}</span><span>${esc(o)}</span></button>`).join('')}</div>`
        : `<div class="numin"><button class="sign" id="sg" aria-label="Changer le signe">${sign === '-' ? '−' : '±'}</button><input id="v" inputmode="decimal" autocomplete="off" placeholder="ta réponse" value="${esc(draft)}">${q.unit ? `<span class="unit">${esc(q.unit)}</span>` : ''}</div><button class="btn go" id="ok" style="justify-content:center;font-size:1.2em;padding:14px">Valider</button>`}
       <div class="msg err" id="am"></div>`;
      if (q.type === 'qcm') M.querySelectorAll('[data-k]').forEach(b => b.onclick = () => answer(+b.dataset.k));
      else { const v = $('#v'); v.focus(); v.oninput = () => draft = v.value; $('#sg').onclick = () => { sign = sign === '-' ? '' : '-'; $('#sg').textContent = sign === '-' ? '−' : '±'; v.focus(); };
        const go = () => { const raw = v.value.trim(); if (!raw) { $('#am').textContent = 'Tape une réponse.'; return; } answer((sign === '-' && !/^[-−]/.test(raw) ? '-' : '') + raw); draft = ''; sign = ''; };
        $('#ok').onclick = go; v.onkeydown = e => { if (e.key === 'Enter') go(); }; }
      tick(); clockT = setInterval(tick, 250); return;
    }
    if (st.status === 'reveal') {
      const r = st.reveal || {}; draft = ''; sign = '';
      M.innerHTML = `<div class="eyebrow">Question ${st.qi + 1} / ${st.total}</div>
       <div class="result ${r.ok ? 'ok' : 'ko'}"><span class="big">${r.ok ? 'Bravo !' : st.myAnswer == null ? 'Pas de réponse' : 'Pas cette fois'}</span>${r.ok ? 'Bonne réponse.' : 'Ce n\'est pas grave : regarde la méthode.'}</div>
       <div class="panel"><div class="eyebrow">Bonne réponse</div><div class="disp" style="font-size:1.8em;color:var(--go)">${esc(r.answer)}</div><p style="margin:.4em 0 0">${esc(r.e || '')}</p></div>
       <p class="small">Attends la question suivante.</p>`;
      if (navigator.vibrate) navigator.vibrate(r.ok ? 60 : [80, 60, 80]);
      return;
    }
    if (st.status === 'end') {
      const e = st.end || {}; es.close();
      M.innerHTML = `<div class="eyebrow">${esc(st.title)} · terminé</div><h1 class="disp" style="font-size:2.4em">${e.ok} / ${e.total}</h1><p class="lead">${e.ok / e.total >= .8 ? 'Excellent travail !' : e.ok / e.total >= .5 ? 'Bien joué, tu progresses.' : 'Chaque défi te fait progresser. On continue !'}</p>
       <div class="panel"><b>Après ce défi, je me sens capable…</b><p class="small" style="margin:.2em 0 .6em">1 = pas du tout · 5 = tout à fait</p><div class="feel">${[1, 2, 3, 4, 5].map(n => `<button data-f="${n}" class="${e.feeling === n ? 'on' : ''}">${n}</button>`).join('')}</div><div class="msg ok" id="fm">${e.feeling ? 'Merci !' : ''}</div></div>
       <a class="btn" href="/eleve" style="justify-content:center">Voir mon carnet</a>`;
      M.querySelectorAll('[data-f]').forEach(b => b.onclick = async () => { try { await api(`/api/join/${CODE}/feeling`, { score: +b.dataset.f }); } catch (err) { await api('/api/eleve/feeling', { score: +b.dataset.f, seance: st.seance }).catch(() => {}); } M.querySelectorAll('[data-f]').forEach(x => x.classList.toggle('on', x === b)); $('#fm').textContent = 'Merci !'; });
    }
  }
}

if (CODE) join(); else carnet();
