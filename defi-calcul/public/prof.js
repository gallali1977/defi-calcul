'use strict';
/* ================= Outils ================= */
const $ = s => document.querySelector(s);
const app = $('#app');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const mmss = s => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const frn = n => (Math.round(n * 100) / 100).toLocaleString('fr-FR');
async function api(url, opt = {}) {
  const r = await fetch(url, { method: opt.method || (opt.body ? 'POST' : 'GET'), headers: opt.body !== undefined ? { 'Content-Type': 'application/json' } : {}, body: opt.body !== undefined ? JSON.stringify(opt.body) : undefined, credentials: 'same-origin' });
  let j = {}; try { j = await r.json(); } catch (e) {}
  if (r.status === 401 && !opt.quiet) { ME = null; showLogin(); throw new Error(j.error || 'Session expirée.'); }
  if (!r.ok) throw new Error(j.error || 'Une erreur est survenue.');
  return j;
}
let ME = null;
const PCACHE = {};
const parcours = async lvl => PCACHE[lvl] || (PCACHE[lvl] = await api('/api/parcours/' + lvl));
const levelName = l => l === 'T' ? 'Terminale · Gestion et finance' : '1re STMG';
const calcTxt = c => c === 'no' ? 'Sans calculatrice' : c === 'half' ? 'Calculatrice en manche 2/3' : 'Calculatrice autorisée';
let cleanup = () => {};
function setView(html, tni = false) {
  cleanup(); cleanup = () => {};
  document.body.classList.toggle('tni', tni);
  app.innerHTML = html; scrollTo(0, 0);
  const r = location.hash.split('/')[1] || 'home';
  document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('on', a.dataset.r === (r === 'c' ? 'home' : r)));
}
const flash = (el, text, ok = true) => { el.textContent = text; el.className = 'msg ' + (ok ? 'ok' : 'err'); };

/* ================= Connexion ================= */
function showLogin() {
  $('#appbar').hidden = true;
  setView(`<form class="login wrap" id="lf"><div class="eyebrow">Espace professeur</div><h1 class="disp">Défi Calcul</h1>
  <label class="field">Adresse e-mail<input id="le" type="email" autocomplete="username" required></label>
  <label class="field">Mot de passe<input id="lp" type="password" autocomplete="current-password" required></label>
  <button class="btn">Se connecter</button><div class="msg" id="lm"></div>
  <p class="small">Élève ? Scanne le QR code affiché au tableau. · <a href="/confidentialite">Données personnelles</a></p></form>`);
  $('#lf').onsubmit = async e => {
    e.preventDefault();
    try { await api('/api/login', { body: { email: $('#le').value, password: $('#lp').value }, quiet: true }); boot(); }
    catch (err) { flash($('#lm'), err.message, false); }
  };
}
$('#logout').onclick = async () => { await api('/api/logout', { body: {} }).catch(() => {}); ME = null; location.hash = '#/'; showLogin(); };

async function boot() {
  try { ME = await api('/api/me', { quiet: true }); } catch (e) { return showLogin(); }
  $('#appbar').hidden = false; $('#who').textContent = ME.name + (ME.role === 'admin' ? ' · admin' : '');
  route();
}
window.addEventListener('hashchange', () => ME && route());
function route() {
  const h = location.hash.replace(/^#\/?/, '').split('/');
  if (h[0] === 'c' && h[1] && h[2] === 's' && h[3]) return seanceView(+h[1], +h[3]);
  if (h[0] === 'c' && h[1]) return classView(+h[1], h[2] || 'seances');
  if (h[0] === 'live' && h[1]) return liveView(h[1]);
  if (h[0] === 'series') return seriesView(h[1], h[2]);
  if (h[0] === 'admin') return adminView();
  homeView();
}

/* ================= Accueil : classes et classement ================= */
async function homeView() {
  const cls = await api('/api/classes');
  const rank = lvl => cls.filter(c => c.level === lvl).sort((a, b) => b.total - a.total);
  const card = c => `<a class="ccard" href="#/c/${c.id}" style="text-decoration:none;color:inherit"><span class="lv">${levelName(c.level)} · ${c.students} élève${c.students > 1 ? 's' : ''}</span><span class="nm">${esc(c.name)}</span>
   <span class="mini"><i style="width:${Math.min(100, c.total / 10)}%"></i></span><span class="small num">${c.total} / 1 000 points · ${c.total >= c.goal_b ? 'goûter et bonus débloqués' : c.total >= c.goal_g ? 'goûter débloqué' : `goûter à ${c.goal_g}`}</span></a>`;
  const rk = lvl => { const r = rank(lvl); return r.length ? `<div class="panel"><div class="eyebrow">Classement · ${levelName(lvl)}</div><ol class="rank" style="margin-top:10px">${r.map((c, i) => `<li><b>${i + 1}</b><span>${esc(c.name)}</span><b class="num">${c.total} pts</b></li>`).join('')}</ol></div>` : ''; };
  setView(`<div class="wrap"><div class="eyebrow">Rituel de 5 minutes</div><h1 class="disp" style="font-size:clamp(2rem,4vw,3.4rem)">Mes classes</h1>
  <div class="classes">${cls.map(card).join('')}</div>
  <div class="cols" style="margin-top:26px">${rk('1')}${rk('T')}</div></div>`);
}

/* ================= Classe ================= */
function gaugeHTML(c) {
  const t = c.total, g = c.goal_g, b = c.goal_b;
  return `<section class="gauge"><div class="gauge-top"><div><div class="eyebrow">La jauge de la classe</div><div class="gauge-total disp num">${t} <small>/ 1 000 points</small></div></div>
  <div class="small">${t >= b ? 'Goûter et bonus débloqués. Bravo !' : t >= g ? `Goûter débloqué. Encore ${b - t} points pour le bonus sur la note.` : `Encore ${g - t} points pour le goûter.`}</div></div>
  <div class="bar"><div class="bar-fill" style="width:${Math.min(100, t / 10)}%"></div><div class="mark ${t >= g ? 'reached' : ''}" style="left:${g / 10}%"><span>Goûter · ${g}</span></div><div class="mark ${t >= b ? 'reached' : ''}" style="left:${b / 10}%"><span>Bonus note · ${b}</span></div></div></section>`;
}
async function classView(id, tab) {
  const c = await api('/api/classes/' + id), P = await parcours(c.level);
  const tabs = [['seances', 'Séances'], ['eleves', 'Élèves'], ['resultats', 'Résultats'], ['reglages', 'Réglages']];
  setView(`<div class="wrap"><div class="eyebrow">${levelName(c.level)}</div><h1 class="disp" style="font-size:clamp(2rem,4vw,3.4rem)">${esc(c.name)}</h1>
  <div class="tabs">${tabs.map(([k, l]) => `<button data-t="${k}" class="${k === tab ? 'on' : ''}">${l}</button>`).join('')}</div><div id="tab"></div></div>`);
  document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => location.hash = `#/c/${id}/${b.dataset.t}`);
  const T = $('#tab');
  if (tab === 'seances') {
    T.innerHTML = gaugeHTML(c) + `<p class="small" style="margin:-6px 0 16px">Fiches à imprimer (cartes dominos${c.level === '1' ? ', grilles de bingo' : ''}, carnet papier) : <a href="/fiches/Defi-Calcul-${c.level === 'T' ? 'Terminale' : '1re'}-fiches.pdf" target="_blank" rel="noopener">télécharger le PDF</a></p><div class="paliers">${P.paliers.map(pl => `<section class="palier"><div class="palier-name"><div class="eyebrow">Palier ${pl.n}</div><b style="color:var(${pl.c})">${pl.name}</b><span>${pl.d}</span></div>
     <div class="cards">${P.seances.filter(s => s.p === pl.n).map(s => `<a class="scard" style="--c:var(${pl.c});text-decoration:none;color:inherit" href="#/c/${id}/s/${s.id}"><span class="n">${s.id}</span><span class="t">${s.title}${s.liveCount ? '<span class="phone-chip">téléphone</span>' : ''}</span><span class="pts num ${c.points[s.id] == null ? 'none' : ''}">${c.points[s.id] == null ? '—' : c.points[s.id] + ' pts'}</span><span class="m">${s.short} · ${calcTxt(s.calc).toLowerCase()}</span></a>`).join('')}</div></section>`).join('')}</div>`;
  } else if (tab === 'eleves') studentsTab(T, c);
  else if (tab === 'resultats') resultsTab(T, c, P);
  else {
    T.innerHTML = `<form class="panel" id="cf" style="max-width:560px;display:grid;gap:12px">
     <label class="field">Nom de la classe<input id="cn" value="${esc(c.name)}"></label>
     <div class="row"><label class="field">Goûter à (points)<input id="cg" type="number" min="0" max="1000" step="10" value="${c.goal_g}"></label><label class="field">Bonus sur la note à (points)<input id="cb" type="number" min="0" max="1000" step="10" value="${c.goal_b}"></label></div>
     <div class="row"><button class="btn">Enregistrer</button><span class="msg" id="cm"></span></div>
     <p class="small">Record des dominos : ${c.record_s ? mmss(c.record_s) : 'aucun'}. Pour corriger les points d'une seule séance, ouvrez-la puis allez à sa dernière diapo.</p></form>
     <div class="panel" style="max-width:560px;margin-top:16px"><h3>Remettre la jauge à zéro</h3><p class="small">Efface les points de toutes les séances et le record des dominos de ${esc(c.name)}. Les élèves, leurs codes et leurs résultats aux quiz sont conservés.</p>
     <div class="row"><button class="btn warn" id="rz">Remettre la jauge à zéro</button><span class="msg" id="rzm"></span></div></div>`;
    let rzArmed = false;
    $('#rz').onclick = async () => { if (!rzArmed) { rzArmed = true; $('#rz').textContent = `Confirmer : jauge de ${c.name} à zéro`; return; }
      try { await api(`/api/classes/${id}/points`, { method: 'DELETE' }); flash($('#rzm'), 'Jauge remise à zéro.'); $('#rz').textContent = 'Remettre la jauge à zéro'; rzArmed = false; } catch (err) { flash($('#rzm'), err.message, false); } };
    $('#cf').onsubmit = async e => { e.preventDefault(); try { await api('/api/classes/' + id, { method: 'PUT', body: { name: $('#cn').value, goal_g: +$('#cg').value, goal_b: +$('#cb').value } }); flash($('#cm'), 'Enregistré.'); } catch (err) { flash($('#cm'), err.message, false); } };
  }
}

/* ---------- Élèves ---------- */
async function studentsTab(T, c) {
  const list = await api(`/api/classes/${c.id}/students`), isAdmin = ME.role === 'admin';
  T.innerHTML = `<div class="cols">
  <div><div class="row" style="justify-content:space-between"><h3>${list.length} élève${list.length > 1 ? 's' : ''}</h3>${isAdmin && list.length ? '<button class="btn ghost sm" id="pr">Imprimer les étiquettes de codes</button>' : ''}</div>
  <div class="tw"><table class="data edit"><thead><tr><th>Prénom</th><th>Initiale</th><th>Code</th><th></th></tr></thead><tbody>
  ${list.map(s => `<tr data-id="${s.id}"><td><input class="in" data-f="first_name" value="${esc(s.first_name)}" style="width:9em"></td><td><input class="in" data-f="initial" value="${esc(s.initial)}" style="width:3.5em"></td>
   <td>${isAdmin ? `<input class="in pin" data-f="pin" value="${esc(s.pin)}" inputmode="numeric" maxlength="4" style="width:5.5em">` : '<span class="small">visible par l\'admin</span>'}</td>
   <td><div class="row"><button class="btn sm" data-a="save">Enregistrer</button>${isAdmin ? '<button class="btn ghost sm" data-a="pin">Nouveau code</button>' : ''}<button class="btn ghost sm" data-a="del">Retirer</button></div></td></tr>`).join('') || '<tr><td colspan="4">Aucun élève pour l\'instant. Importez la liste à droite.</td></tr>'}
  </tbody></table></div><div class="msg" id="sm"></div></div>
  <div class="panel"><h3>Importer la liste</h3>
  <p class="small">Copiez depuis Excel ou Pronote deux colonnes : <b>Prénom</b> puis <b>Nom</b>. Seuls le prénom et la première lettre du nom sont envoyés au serveur : le nom complet ne quitte pas votre ordinateur. Les codes à 4 chiffres sont créés automatiquement.</p>
  <textarea class="in" id="imp" placeholder="Inès&#9;Benali&#10;Lucas&#9;Martin"></textarea>
  <div id="prev" class="small" style="margin:8px 0"></div><div class="row"><button class="btn" id="impb" disabled>Ajouter ces élèves</button><span class="msg" id="im"></span></div></div></div>`;
  let parsed = [];
  $('#imp').oninput = () => {
    const existing = new Set(list.map(s => s.first_name + '|' + s.initial));
    parsed = $('#imp').value.split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(l => {
      let p = l.split(/\t|;/).map(x => x.trim()).filter(Boolean);
      if (p.length < 2) { const w = l.split(/\s+/); p = [w[0], w.slice(1).join(' ')]; }
      let [f, n] = p; if (/^[A-ZÀ-Ý' -]+$/.test(f) && n && !/^[A-ZÀ-Ý' -]+$/.test(n)) [f, n] = [n, f];
      return { first_name: f, nom: n || '' };
    }).filter(x => x.first_name && x.nom);
    const seen = new Set(existing);
    parsed.forEach(x => { const nn = x.nom.replace(/^(de |du |le |la |d')/i, ''); let i = nn[0].toUpperCase(); if (seen.has(x.first_name + '|' + i) && nn[1]) i = nn[0].toUpperCase() + nn[1].toLowerCase(); seen.add(x.first_name + '|' + i); x.initial = i; });
    $('#prev').innerHTML = parsed.length ? `Aperçu : ${parsed.map(x => esc(`${x.first_name} ${x.initial}.`)).join(', ')}` : '';
    $('#impb').disabled = !parsed.length;
  };
  $('#impb').onclick = async () => {
    try { const r = await api(`/api/classes/${c.id}/students`, { body: { students: parsed.map(({ first_name, initial }) => ({ first_name, initial })) } }); $('#imp').value = ''; flash($('#im'), `${r.added} élèves ajoutés.`); setTimeout(() => studentsTab(T, c), 700); }
    catch (e) { flash($('#im'), e.message, false); }
  };
  T.querySelectorAll('tr[data-id]').forEach(tr => {
    const id = tr.dataset.id, val = f => tr.querySelector(`[data-f="${f}"]`)?.value;
    tr.querySelector('[data-a="save"]').onclick = async () => { try { await api('/api/students/' + id, { method: 'PUT', body: { first_name: val('first_name'), initial: val('initial'), pin: isAdmin ? val('pin') : undefined } }); flash($('#sm'), 'Élève enregistré.'); } catch (e) { flash($('#sm'), e.message, false); } };
    const pb = tr.querySelector('[data-a="pin"]'); if (pb) pb.onclick = async () => { const r = await api(`/api/students/${id}/newpin`, { body: {} }); tr.querySelector('[data-f="pin"]').value = r.pin; flash($('#sm'), `Nouveau code : ${r.pin}`); };
    const db = tr.querySelector('[data-a="del"]'); let armed = false;
    db.onclick = async () => { if (!armed) { armed = true; db.textContent = 'Confirmer ?'; db.classList.add('warn'); return; } await api('/api/students/' + id, { method: 'DELETE' }); tr.remove(); };
  });
  const pr = $('#pr'); if (pr) pr.onclick = () => {
    $('#print').innerHTML = `<h2 style="font-family:sans-serif">${esc(c.name)} · codes Défi Calcul</h2><div class="labels">${list.map(s => `<div><b>${esc(s.first_name)} ${esc(s.initial)}.</b><br>Classe ${esc(c.name)} · Code : <b class="pin">${esc(s.pin)}</b><br><small>${location.host}/eleve</small></div>`).join('')}</div>`;
    window.print();
  };
}

/* ---------- Résultats ---------- */
async function resultsTab(T, c, P) {
  const r = await api(`/api/classes/${c.id}/results`);
  const cls = p => p >= 70 ? 'g' : p >= 40 ? 'm' : 'b';
  T.innerHTML = `<p class="small">Réussite aux quiz téléphone (dernier quiz de chaque séance) et ressenti « je me sens capable » de 1 à 5.</p>
  <div class="tw"><table class="data"><thead><tr><th>Élève</th>${P.seances.map(s => `<th title="${esc(s.title)}">S${s.id}</th>`).join('')}</tr></thead><tbody>
  ${r.students.map(s => `<tr><td>${esc(s.label)}</td>${P.seances.map(x => { const v = s.cells[x.id]; return `<td>${v ? `${v.pct != null ? `<span class="cell ${cls(v.pct)}">${v.pct} %</span>` : ''}${v.feel ? ` <span class="small">· ${v.feel}/5</span>` : ''}` : '<span class="small">—</span>'}</td>`; }).join('')}</tr>`).join('') || `<tr><td colspan="11">Pas encore de résultats.</td></tr>`}
  </tbody></table></div>`;
}

/* ================= Séance au TNI ================= */
const T = { mode: 'down', t: 300, run: false, last: 0, h: null }; let actx = null;
function beep(freqs = [880, 880, 880], gap = .25) { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); freqs.forEach((f, i) => { const o = actx.createOscillator(), g = actx.createGain(); o.frequency.value = f; o.connect(g); g.connect(actx.destination); const t = actx.currentTime + i * gap; g.gain.setValueAtTime(.22, t); g.gain.exponentialRampToValueAtTime(.001, t + .25); o.start(t); o.stop(t + .27); }); } catch (e) {} }
function drawT() { const c = $('#clock'); if (!c) return; c.textContent = mmss(T.t); $('#tPlay').textContent = T.run ? '❚❚' : '▶'; $('#timer').classList.toggle('warn', T.mode === 'down' && T.t <= 30 && T.t > 0); const r = $('#recNow'); if (r) r.textContent = mmss(T.t); }
function tick() { const n = performance.now(), dt = (n - T.last) / 1000; T.last = n; if (T.mode === 'down') { T.t -= dt; if (T.t <= 0) { T.t = 0; stopT(); beep(); const tm = $('#timer'); tm.classList.remove('done'); void tm.offsetWidth; tm.classList.add('done'); } } else T.t += dt; drawT(); }
function stopT() { T.run = false; clearInterval(T.h); drawT(); }
function toggleT() { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} if (T.run) return stopT(); if (T.mode === 'down' && T.t <= 0) T.t = 300; T.run = true; T.last = performance.now(); T.h = setInterval(tick, 200); drawT(); }
function resetT() { stopT(); T.t = T.mode === 'down' ? 300 : 0; $('#timer')?.classList.remove('done'); drawT(); }
const fullscreen = () => { try { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(() => {}); } catch (e) {} };

async function seanceView(cid, sid) {
  const c = await api('/api/classes/' + cid), P = await parcours(c.level), S = P.seances.find(s => s.id === sid), pal = P.paliers[S.p - 1];
  let si = 0; const game = {};
  setView(`<div class="top"><a class="back" href="#/c/${cid}" style="text-decoration:none;color:inherit">← ${esc(c.name)}</a>
   <div class="stitle"><div class="eyebrow" style="color:var(${pal.c})">Séance ${S.id} · Palier ${pal.n} · ${pal.name}</div><div class="disp">${S.title}</div></div>
   <span class="badge ${S.calc}">${calcTxt(S.calc)}</span>${S.liveCount ? '<button class="btn gold" id="liveBtn">Quiz téléphone</button>' : ''}
   <div class="timer" id="timer"><span class="tlabel">${S.mode === 'up' ? 'chrono ↑' : '5 min'}</span><span class="clock num" id="clock">5:00</span>
   <button class="tbtn" id="tPlay" aria-label="Lancer ou mettre en pause le chrono">▶</button><button class="tbtn" id="tReset" aria-label="Remettre le chrono à zéro">↺</button><button class="tbtn" id="fsBtn" aria-label="Plein écran">⛶</button></div></div>
   <main class="stage" id="stage"></main>
   <nav class="nav"><button class="btn ghost" id="prevBtn">‹ Précédent</button><div class="dots" id="dots"></div><button class="btn" id="nextBtn">Suivant ›</button></nav>`, true);
  T.mode = S.mode; stopT(); resetT();
  $('#tPlay').onclick = toggleT; $('#tReset').onclick = resetT; $('#fsBtn').onclick = fullscreen;
  if ($('#liveBtn')) $('#liveBtn').onclick = () => launchLive(c, S);
  const stg = $('#stage');
  const go = d => { const n = si + d; if (n < 0 || n >= S.slides.length) return; si = n; render(); scrollTo(0, 0); };
  $('#prevBtn').onclick = () => go(-1); $('#nextBtn').onclick = () => go(1);
  const onKey = e => { if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return; if (e.key === 'ArrowRight') go(1); else if (e.key === 'ArrowLeft') go(-1); else if (e.key === ' ') { e.preventDefault(); toggleT(); } else if (e.key === 'f' || e.key === 'F') fullscreen(); };
  const onTile = e => { const t = e.target.closest('.tile'); if (t) t.classList.toggle('open'); };
  document.addEventListener('keydown', onKey); document.addEventListener('click', onTile);
  cleanup = () => { stopT(); document.removeEventListener('keydown', onKey); document.removeEventListener('click', onTile); };
  function render() {
    const sl = S.slides[si];
    $('#dots').innerHTML = S.slides.map((_, i) => `<i class="${i === si ? 'on' : ''}"></i>`).join('');
    $('#prevBtn').disabled = si === 0; $('#nextBtn').disabled = si === S.slides.length - 1;
    stg.classList.remove('show');
    if (sl.kind === 'html') { stg.innerHTML = sl.html; const r = stg.querySelector('[data-reveal]'); if (r) r.onclick = () => { stg.classList.add('show'); r.hidden = true; }; }
    else if (sl.kind === 'bingo') bingo(stg, sl.pool, game);
    else if (sl.kind === 'qcm') qcm(stg, sl.questions, game);
    else if (sl.kind === 'lock') lock(stg, sl, game);
    else if (sl.kind === 'points') pointsSlide(stg, sl, c, S, game);
  }
  render();
}
function bingo(stg, POOL, game) {
  const B = game.bingo = game.bingo || { left: POOL.map((_, i) => i).sort(() => Math.random() - .5), done: [], show: false };
  const cur = B.done[B.done.length - 1];
  stg.innerHTML = `<div class="eyebrow">Tirage · ${B.done.length} / ${POOL.length} calculs</div><div class="bingo-now"><div class="big num">${cur == null ? 'Prêts ?' : POOL[cur][0]}</div><div class="ans num">${cur != null && B.show ? '= ' + POOL[cur][1] : ''}</div></div>
  <div class="row"><button class="btn" id="draw" ${B.left.length ? '' : 'disabled'}>Tirer un calcul</button><button class="btn ghost" id="showA" ${cur == null || B.show ? 'disabled' : ''}>Montrer la réponse</button></div>
  <div class="hist">${B.done.slice(0, -1).reverse().map(i => `<span>${POOL[i][0]} = <b>${POOL[i][1]}</b></span>`).join('')}</div><p class="small" style="margin-top:14px">Les calculs déjà tirés restent affichés avec leur réponse, pour vérifier une grille gagnante.</p>`;
  $('#draw').onclick = () => { B.done.push(B.left.pop()); B.show = false; bingo(stg, POOL, game); };
  $('#showA').onclick = () => { B.show = true; bingo(stg, POOL, game); };
}
function qcm(stg, QV, game) {
  const G = game.q = game.q || { i: 0, ans: null, res: [], j: {}, hide: [] };
  if (G.i >= QV.length) { const sc = G.res.filter(Boolean).length; game.qScore = sc * 10; stg.innerHTML = `<div class="eyebrow">Fin du jeu</div><h2>${sc} bonnes réponses sur ${QV.length}</h2><div class="formula num">${sc * 10} points pour la classe</div><p class="lead">Passez à la diapo suivante pour les ajouter à la jauge.</p><button class="btn ghost" id="again">Rejouer depuis le début</button>`; $('#again').onclick = () => { game.q = null; qcm(stg, QV, game); }; return; }
  const Q = QV[G.i];
  stg.innerHTML = `<div class="qv"><div><div class="jokers"><button id="j5" ${G.j.f ? 'disabled' : ''}>50/50</button><button id="jc" ${G.j.c ? 'disabled' : ''}>Avis de la classe</button><button id="ja" ${G.j.a ? 'disabled' : ''}>Appel à un ami</button></div>
  <div class="qv-q"><span class="eyebrow" style="color:inherit;opacity:.7">Question ${G.i + 1} / ${QV.length}</span><br>${esc(Q.q)}</div>
  <div class="qv-ans">${Q.opts.map((o, k) => `<button data-k="${k}" class="${G.hide.includes(k) ? 'gone' : ''} ${G.ans != null ? (k === Q.c ? 'ok' : k === G.ans ? 'ko' : '') : ''}"><b>${'ABCD'[k]}</b>${esc(o)}</button>`).join('')}</div>
  <div class="qv-expl" id="qexpl">${G.ans != null ? (G.ans === Q.c ? '<b class="up">Bonne réponse !</b> ' : '<b class="down">Raté, ce n\'est pas grave.</b> ') + esc(Q.e) : ''}</div>
  <div class="row" style="margin-top:12px">${G.ans != null ? `<button class="btn" id="qnext">${G.i < QV.length - 1 ? 'Question suivante' : 'Voir le score'}</button>` : ''}</div></div>
  <ol class="ladder">${QV.map((_, k) => `<li class="${k === G.i ? 'cur' : ''} ${G.res[k] === true ? 'win' : G.res[k] === false ? 'lose' : ''}"><span>${k + 1}</span><span>${(k + 1) * 10} pts</span></li>`).join('')}</ol></div>`;
  stg.querySelectorAll('.qv-ans button').forEach(b => b.onclick = () => { if (G.ans != null) return; G.ans = +b.dataset.k; G.res[G.i] = G.ans === Q.c; qcm(stg, QV, game); });
  const nx = $('#qnext'); if (nx) nx.onclick = () => { G.i++; G.ans = null; G.hide = []; qcm(stg, QV, game); };
  $('#j5').onclick = () => { if (G.j.f || G.ans != null) return; G.j.f = true; G.hide = Q.opts.map((_, k) => k).filter(k => k !== Q.c).sort(() => Math.random() - .5).slice(0, 2); qcm(stg, QV, game); };
  $('#jc').onclick = () => { G.j.c = true; $('#qexpl').innerHTML = '<b>Avis de la classe :</b> levez la main pour A, puis B, puis C, puis D.'; $('#jc').disabled = true; };
  $('#ja').onclick = () => { G.j.a = true; $('#qexpl').innerHTML = '<b>Appel à un ami :</b> le capitaine consulte un camarade pendant 30 secondes.'; $('#ja').disabled = true; };
}
function lock(stg, sl, game) {
  const L = game[sl.code] = game[sl.code] || { tries: 3, ok: false };
  stg.innerHTML = `<div class="eyebrow">${sl.name} · ${sl.rule}</div><h2>${sl.name}</h2><div class="grid g3">${sl.en.map(e => `<button class="tile"><span class="tag">${e[0]}</span><span class="q">${e[1]}</span><span class="a">${e[2]}</span><span class="w">${e[3]}</span><span class="hint">Toucher pour la correction</span></button>`).join('')}</div>
  <div class="lock ${L.ok ? 'ok' : ''}" id="lockBox"><svg viewBox="0 0 84 100" aria-hidden="true"><path class="shackle" d="M20 46V30a22 22 0 0 1 44 0v16" fill="none" stroke="var(--ink)" stroke-width="9" stroke-linecap="round"/><rect x="6" y="44" width="72" height="52" rx="10" fill="${L.ok ? 'var(--go)' : 'var(--signal)'}"/><circle cx="42" cy="66" r="7" fill="var(--paper)"/><rect x="39" y="68" width="6" height="14" rx="3" fill="var(--paper)"/></svg>
  <div class="digits">${[0, 1, 2].map(i => `<input id="d${i}" inputmode="numeric" maxlength="1" aria-label="Chiffre ${i + 1}" ${L.ok ? `value="${sl.code[i]}" disabled` : ''}>`).join('')}</div>
  <div><button class="btn" id="tryBtn" ${L.ok || !L.tries ? 'disabled' : ''}>Essayer le code</button><div class="lmsg" id="lmsg">${L.ok ? 'Cadenas ouvert !' : L.tries ? `${L.tries} essai${L.tries > 1 ? 's' : ''} restant${L.tries > 1 ? 's' : ''}` : 'Plus d\'essai. Touchez les énigmes pour la correction.'}</div></div></div>
  <p class="small">Ne touchez les énigmes qu'à la fin : elles affichent la correction.</p>`;
  const ins = [0, 1, 2].map(i => $('#d' + i));
  ins.forEach((inp, i) => { inp.oninput = () => { inp.value = inp.value.replace(/\D/g, '').slice(-1); if (inp.value && ins[i + 1]) ins[i + 1].focus(); }; inp.onkeydown = e => { if (e.key === 'Enter') $('#tryBtn').click(); }; });
  $('#tryBtn').onclick = () => { const v = ins.map(i => i.value).join(''); if (v.length < 3) { $('#lmsg').textContent = 'Il faut 3 chiffres.'; return; }
    if (v === sl.code) { L.ok = true; beep([523, 659, 784], .12); lock(stg, sl, game); } else { L.tries--; const b = $('#lockBox'); b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); setTimeout(() => lock(stg, sl, game), 450); } };
}
function pointsSlide(stg, sl, c, S, game) {
  const prev = c.points[S.id], sug = game.qScore != null ? game.qScore : prev ?? '';
  stg.innerHTML = `<div class="eyebrow">Fin du défi</div><h2>Combien de points pour la classe ?</h2>
  <div class="pts-box"><div class="bareme"><b>Barème</b>${sl.bareme}
  ${sl.record ? `<p style="margin-top:1em">Temps du chrono : <b class="num" id="recNow">${mmss(T.t)}</b> · Record de la classe : <b class="num" id="recBest">${c.record_s == null ? 'aucun' : mmss(c.record_s)}</b></p><button class="btn ghost" id="recBtn">Enregistrer ce temps</button> <span id="recMsg"></span>` : ''}</div>
  <div class="pts-in"><label for="ptsIn" class="eyebrow" style="color:inherit;opacity:.75">Points gagnés (0 à 100)</label>
  <div class="row" style="margin-top:8px"><input id="ptsIn" type="number" min="0" max="100" value="${sug}"><button class="btn gold" id="ptsBtn">Ajouter à la jauge</button></div>
  <div class="saved" id="ptsMsg">${prev != null ? `Déjà enregistré : ${prev} pts. Un nouvel envoi remplace ce score.` : ''}</div>
  ${prev != null ? '<button class="btn ghost sm" id="ptsDel" style="color:var(--paper);border-color:rgba(255,255,255,.35);margin-top:6px">Effacer le score de cette séance</button>' : ''}</div></div>`;
  const pd = $('#ptsDel'); if (pd) { let a = false; pd.onclick = async () => { if (!a) { a = true; pd.textContent = 'Confirmer : effacer'; return; }
    try { await api(`/api/classes/${c.id}/points/${S.id}`, { method: 'DELETE' }); delete c.points[S.id]; $('#ptsIn').value = ''; pd.remove(); $('#ptsMsg').textContent = 'Score effacé : cette séance ne compte plus dans la jauge.'; } catch (e) { $('#ptsMsg').textContent = e.message; } }; }
  $('#ptsBtn').onclick = async () => { const v = Math.round(+$('#ptsIn').value); if (isNaN(v) || v < 0 || v > 100) { $('#ptsMsg').textContent = 'Entrez un nombre entre 0 et 100.'; return; }
    try { await api(`/api/classes/${c.id}/points/${S.id}`, { method: 'PUT', body: { pts: v } }); c.points[S.id] = v; const tot = Object.values(c.points).reduce((a, b) => a + b, 0); $('#ptsMsg').textContent = `${v} points ajoutés. La jauge de ${c.name} est à ${tot} / 1 000.`; } catch (e) { $('#ptsMsg').textContent = e.message; } };
  if (sl.record) $('#recBtn').onclick = async () => { if (T.t <= 0) { $('#recMsg').textContent = 'Lancez d\'abord le chrono.'; return; }
    const r = await api(`/api/classes/${c.id}/record`, { method: 'PUT', body: { seconds: T.t } }); c.record_s = r.record; $('#recBest').textContent = mmss(r.record); $('#recMsg').textContent = r.better ? 'Nouveau record !' : 'Pas de record cette fois.'; };
}

/* ================= Quiz téléphone ================= */
async function launchLive(c, S) {
  const series = await api(`/api/series/${c.level}/${S.id}`);
  const stg = $('#stage');
  stg.innerHTML = `<div class="eyebrow">Quiz téléphone · ${esc(c.name)}</div><h2>Choisissez la série de questions</h2>
  <div class="grid">${series.map(s => `<button class="tile" data-sid="${s.id}" style="min-height:0"><span class="tag">${s.questions.length} questions</span><span class="q">${esc(s.name)}</span><span class="hint">Lancer</span></button>`).join('')}</div>
  <p class="small" style="margin-top:14px">Pour créer une nouvelle série avec d'autres chiffres : menu « Exercices ».</p>`;
  stg.querySelectorAll('[data-sid]').forEach(b => b.addEventListener('click', async e => { e.stopPropagation();
    try { const r = await api('/api/runs', { body: { classId: c.id, seance: S.id, seriesId: +b.dataset.sid } }); location.hash = '#/live/' + r.code; } catch (err) { alert(err.message); } }, true));
}
async function liveView(code) {
  setView(`<div class="top"><a class="back" id="lback" href="#/" style="text-decoration:none;color:inherit">← Retour</a><div class="stitle"><div class="eyebrow" id="leb">Quiz téléphone</div><div class="disp" id="lt">…</div></div>
   <button class="tbtn" style="border-color:var(--line);color:var(--ink)" id="fsBtn" aria-label="Plein écran">⛶</button></div><main class="stage" id="ls"></main>`, true);
  $('#fsBtn').onclick = fullscreen;
  let qr = null, st = null, offset = 0, clockT = null, lastQi = -2, lastStatus = '';
  try { qr = await api(`/api/runs/${code}/qr`); } catch (e) { $('#ls').innerHTML = `<h2>Ce quiz n'existe plus</h2><p>${esc(e.message)}</p><a class="btn" href="#/">Retour aux classes</a>`; return; }
  const es = new EventSource(`/api/runs/${code}/stream`);
  es.onmessage = ev => { st = JSON.parse(ev.data); offset = st.serverNow - Date.now(); draw(); };
  es.onerror = () => { const b = $('#conn'); if (b) b.textContent = 'Connexion perdue, reconnexion…'; };
  cleanup = () => { es.close(); clearInterval(clockT); };
  const act = (action, extra = {}) => api(`/api/runs/${code}/action`, { body: { action, ...extra } }).catch(e => alert(e.message));
  function tickClock() { const el = $('#bc'); if (!el || !st) return; const left = Math.max(0, (st.qEnd - (Date.now() + offset)) / 1000); el.textContent = Math.ceil(left); el.classList.toggle('warn', left <= 5); }
  function drawCards(S, L) {
    if (S.status === 'dealt') {
      L.innerHTML = `<div class="eyebrow">Cartes distribuées</div><h2>${S.dealt} carte${S.dealt > 1 ? 's' : ''} distribuée${S.dealt > 1 ? 's' : ''}</h2>
       <p class="lead">Chaque élève voit son résultat sur son téléphone. Une formule va s'afficher : celui qui a le résultat appuie sur « C'est moi ! » en moins de 5 secondes. Un seul élève doit appuyer.</p>
       ${S.noCard.length ? `<div class="note">Sans carte (toutes les cartes sont distribuées) : ${S.noCard.map(esc).join(', ')}</div>` : ''}
       <div class="row" style="margin-top:22px"><button class="btn go" id="nx">Afficher la première carte</button><button class="btn ghost" id="end">Terminer</button></div>`;
    } else {
      const rev = S.status === 'reveal', rd = S.round || {};
      const why = !rev ? '' : rd.ok ? 'Un seul élève, le bon : la classe gagne la carte !'
        : rd.reason === 'personne' ? `Personne n'a appuyé. Le résultat était chez ${esc(rd.holder || '?')}.`
        : rd.reason === 'plusieurs' ? 'Plusieurs élèves ont appuyé : carte perdue.'
        : `Ce n'était pas le bon élève. Le résultat était chez ${esc(rd.holder || '?')}.`;
      L.innerHTML = `<div class="livebar"><div class="eyebrow">Carte ${S.qi + 1} / ${S.total}</div>${rev ? '' : '<div class="bigclock num" id="bc"></div>'}<div class="answered num">${S.won} gagnée${S.won > 1 ? 's' : ''} sur ${S.played}</div></div>
       <div class="cardf num">${esc(S.formula)}${rev ? ` <span class="up">= ${esc(S.result)}</span>` : ''}</div>
       <div class="pressers">${(S.pressers || []).map(p => `<span class="${rev ? (rd.ok ? 'ok' : 'ko') : ''}"><b>${esc(p.label)}</b> · ${esc(p.r)}</span>`).join('') || (rev ? '' : '<span class="small">En attente de « C\'est moi ! »…</span>')}</div>
       ${rev ? `<div class="verdict ${rd.ok ? 'ok' : 'ko'}">${why}</div>` : ''}
       <div class="row" style="margin-top:22px">${rev ? `<button class="btn go" id="nx">${S.qi + 1 < S.total ? 'Carte suivante' : 'Voir le bilan'}</button>` : ''}<button class="btn ghost" id="end">Terminer la partie</button></div>`;
      if (!rev) { tickClock(); clockT = setInterval(tickClock, 200); }
      if (rev && lastStatus !== 'reveal') beep(rd.ok ? [523, 659, 784] : [330, 262], .14);
    }
    const nx = $('#nx'); if (nx) nx.onclick = () => act('next');
    let armed = false; $('#end').onclick = () => { if (!armed) { armed = true; $('#end').textContent = 'Confirmer : terminer'; return; } act('end'); };
  }
  function draw() {
    const S = st, L = $('#ls');
    $('#lt').textContent = `${S.title}`; $('#leb').textContent = `${S.kind === 'cards' ? 'Version téléphone' : 'Quiz téléphone'} · ${S.className} · ${S.seriesName}`;
    $('#lback').href = `#/c/${S.classId}/s/${S.seance}`;
    clearInterval(clockT);
    if (S.status === 'lobby') {
      L.innerHTML = `<div class="lobby"><div class="qr">${qr.svg}</div><div><div class="eyebrow">Scannez le QR code, ou allez sur</div><p style="font-size:1.4em;font-weight:700;margin:.2em 0;word-break:break-all">${esc(qr.url.replace(/^https?:\/\//, '').replace(/\/j\/.*/, '/j/'))}<span class="joincode">${esc(S.code)}</span></p>
       <p class="lead">Choisis ton nom, tape ton code à 4 chiffres, et attends le départ.</p>
       <div class="answered num">${S.joined.length} élève${S.joined.length > 1 ? 's' : ''} connecté${S.joined.length > 1 ? 's' : ''}</div><div class="chips">${S.joined.map(n => `<span>${esc(n)}</span>`).join('')}</div>
       <div class="row" style="margin-top:22px"><button class="btn go" id="go" ${S.joined.length ? '' : 'disabled'}>${S.kind === 'cards' ? 'Distribuer les cartes' : 'Lancer la première question'}</button><button class="btn ghost" id="end">Annuler</button></div><p class="small" id="conn"></p></div></div>`;
      $('#go').onclick = () => act(S.kind === 'cards' ? 'deal' : 'next'); $('#end').onclick = () => act('end');
    } else if (S.kind === 'cards' && S.status !== 'end') {
      drawCards(S, L);
    } else if (S.status === 'q' || S.status === 'reveal') {
      const q = S.question, rev = S.status === 'reveal' && S.stats;
      L.innerHTML = `<div class="livebar"><div class="eyebrow">Question ${S.qi + 1} / ${S.total}</div>${S.status === 'q' ? `<div class="bigclock num" id="bc"></div>` : ''}<div class="answered num">${S.answered} / ${S.joined.length} réponses</div></div>
       <div class="liveq">${esc(q.q)}</div>
       ${q.type === 'qcm' ? `<div class="lopts">${q.opts.map((o, k) => { const n = rev ? rev.dist[k] : 0, pct = rev && rev.n ? Math.round(100 * n / rev.n) : 0; return `<div class="lopt ${rev ? (k === q.c ? 'ok' : 'dim') : ''}">${rev ? `<span class="fill" style="width:${pct}%"></span>` : ''}<span class="k k${k}">${'ABCD'[k]}</span><span>${esc(o)}</span><span class="num">${rev ? n : ''}</span></div>`; }).join('')}</div>` : `<p class="lead" style="margin-top:14px">Réponse à taper sur le téléphone${q.unit ? ` (en ${esc(q.unit)})` : ''}.</p>`}
       ${rev ? `<div class="revealbox"><div><div class="eyebrow">Bonne réponse</div><div class="ans">${esc(rev.answer)}</div></div><div style="flex:1;min-width:220px"><div class="answered num">${rev.n ? Math.round(100 * rev.correct / rev.n) : 0} % de réussite</div><div>${esc(q.e || '')}</div></div></div>` : ''}
       <div class="row" style="margin-top:22px">${S.status === 'q' ? '<button class="btn" id="rv">Afficher la réponse</button>' : `<button class="btn go" id="nx">${S.qi + 1 < S.total ? 'Question suivante' : 'Voir le bilan'}</button>`}<button class="btn ghost" id="end">Terminer le quiz</button></div>`;
      if (S.status === 'q') { tickClock(); clockT = setInterval(tickClock, 250); $('#rv').onclick = () => act('reveal'); } else $('#nx').onclick = () => act('next');
      let armed = false; $('#end').onclick = () => { if (!armed) { armed = true; $('#end').textContent = 'Confirmer : terminer'; return; } act('end'); };
      if (S.status === 'reveal' && lastStatus !== 'reveal') beep([660, 880], .15);
    } else if (S.status === 'end') {
      const sm = S.summary;
      L.innerHTML = `<div class="eyebrow">Bilan · ${sm.players} élève${sm.players > 1 ? 's' : ''}</div><h2>${S.kind === 'cards' ? `${sm.won} carte${sm.won > 1 ? 's' : ''} gagnée${sm.won > 1 ? 's' : ''} sur ${sm.total}` : `${sm.rate} % de bonnes réponses`}</h2>
       <div class="pctq">${sm.perQ.map((p, i) => `<div style="height:${Math.max(3, p)}%" title="${S.kind === 'cards' ? 'Carte' : 'Question'} ${i + 1} : ${p} %"><span>${S.kind === 'cards' ? 'C' : 'Q'}${i + 1}</span></div>`).join('')}</div>
       <div class="pts-in" style="margin-top:42px;max-width:560px"><label for="ptsIn" class="eyebrow" style="color:inherit;opacity:.75">Points proposés pour la jauge</label>
       <div class="row" style="margin-top:8px"><input id="ptsIn" type="number" min="0" max="100" value="${sm.suggested}"><button class="btn gold" id="ptsBtn">Ajouter à la jauge</button></div><div class="saved" id="ptsMsg"></div></div>
       <p class="small">Les élèves indiquent maintenant sur leur téléphone s'ils se sentent capables (de 1 à 5).</p>
       <a class="btn ghost" href="#/c/${S.classId}" style="margin-top:10px">Retour à la classe</a>`;
      $('#ptsBtn').onclick = async () => { const v = Math.round(+$('#ptsIn').value); try { await api(`/api/classes/${S.classId}/points/${S.seance}`, { method: 'PUT', body: { pts: v } }); $('#ptsMsg').textContent = `${v} points ajoutés à la jauge.`; } catch (e) { $('#ptsMsg').textContent = e.message; } };
    }
    lastQi = S.qi; lastStatus = S.status;
  }
}

/* ================= Exercices : séries de questions ================= */
async function seriesView(lvl = '1', sid) {
  const P = await parcours(lvl), withLive = P.seances.filter(s => s.liveCount && s.liveKind !== 'cards');
  sid = +(sid || withLive[0].id);
  const list = await api(`/api/series/${lvl}/${sid}`);
  setView(`<div class="wrap"><div class="eyebrow">Exercices</div><h1 class="disp" style="font-size:clamp(2rem,4vw,3.2rem)">Séries de questions</h1>
  <p class="lead">Chaque quiz téléphone peut avoir plusieurs séries. Dupliquez la série d'origine, changez les chiffres, et choisissez la série au lancement du quiz.</p>
  <div class="row" style="margin:14px 0"><label class="field">Parcours<select class="in" id="lv"><option value="1" ${lvl === '1' ? 'selected' : ''}>1re STMG</option><option value="T" ${lvl === 'T' ? 'selected' : ''}>Terminale · Gestion et finance</option></select></label>
  <label class="field">Séance<select class="in" id="se">${withLive.map(s => `<option value="${s.id}" ${s.id === sid ? 'selected' : ''}>Séance ${s.id} · ${esc(s.title)}</option>`).join('')}</select></label></div>
  <div class="grid">${list.map((s, i) => `<div class="tile" style="cursor:default"><span class="tag">${s.questions.length} questions</span><span class="q">${esc(s.name)}</span><div class="row" style="margin-top:auto">${s.builtin ? '' : `<button class="btn sm" data-ed="${i}">Modifier</button>`}<button class="btn ghost sm" data-dup="${i}">Dupliquer</button>${s.builtin ? '' : `<button class="btn ghost sm" data-del="${s.id}">Supprimer</button>`}</div></div>`).join('')}</div>
  <div id="ed"></div></div>`);
  $('#lv').onchange = () => location.hash = `#/series/${$('#lv').value}`;
  $('#se').onchange = () => location.hash = `#/series/${lvl}/${$('#se').value}`;
  document.querySelectorAll('[data-ed]').forEach(b => b.onclick = () => editor(lvl, sid, list[+b.dataset.ed]));
  document.querySelectorAll('[data-dup]').forEach(b => b.onclick = () => { const s = list[+b.dataset.dup]; editor(lvl, sid, { id: null, name: s.name.replace(" (d'origine)", '') + ' · copie', questions: JSON.parse(JSON.stringify(s.questions)) }); });
  document.querySelectorAll('[data-del]').forEach(b => { let armed = false; b.onclick = async () => { if (!armed) { armed = true; b.textContent = 'Confirmer ?'; return; } await api('/api/series/' + b.dataset.del, { method: 'DELETE' }); seriesView(lvl, sid); }; });
}
function editor(lvl, sid, s) {
  const E = $('#ed'), qs = s.questions;
  const rowH = (q, i) => `<tr data-i="${i}"><td class="num"><b>${i + 1}</b></td>
   <td><select class="in" data-f="type"><option value="num" ${q.type === 'num' ? 'selected' : ''}>Nombre</option><option value="qcm" ${q.type === 'qcm' ? 'selected' : ''}>QCM</option></select></td>
   <td style="min-width:260px"><textarea class="in" data-f="q" style="min-height:70px;font-family:inherit">${esc(q.q)}</textarea><input class="in" data-f="e" placeholder="Explication affichée après la réponse" value="${esc(q.e || '')}" style="width:100%;margin-top:6px"></td>
   <td style="min-width:240px">${q.type === 'qcm' ? [0, 1, 2, 3].map(k => `<div class="row" style="margin-bottom:4px;flex-wrap:nowrap"><input type="radio" name="c${i}" data-c="${k}" ${q.c === k ? 'checked' : ''} aria-label="Bonne réponse ${'ABCD'[k]}"><input class="in" data-o="${k}" value="${esc((q.opts || [])[k] || '')}" placeholder="Proposition ${'ABCD'[k]}" style="flex:1"></div>`).join('')
     : `<div class="row"><label class="field">Réponse<input class="in" data-f="a" value="${q.a != null ? esc(String(q.a).replace('.', ',')) : ''}" style="width:8em"></label><label class="field">Unité<input class="in" data-f="unit" value="${esc(q.unit || '')}" style="width:5em"></label><label class="field">Tolérance<input class="in" data-f="tol" value="${q.tol != null ? esc(String(q.tol).replace('.', ',')) : ''}" placeholder="auto" style="width:5em"></label></div>`}</td>
   <td><input class="in" data-f="t" type="number" min="10" max="240" value="${q.t || 30}" style="width:5em"> s</td>
   <td><button class="btn ghost sm" data-rm>Retirer</button></td></tr>`;
  const read = () => [...E.querySelectorAll('tr[data-i]')].map(tr => {
    const g = f => tr.querySelector(`[data-f="${f}"]`)?.value ?? '';
    const type = g('type'), q = { type, q: g('q'), e: g('e'), t: +g('t') || 30 };
    if (type === 'qcm') { q.opts = [0, 1, 2, 3].map(k => tr.querySelector(`[data-o="${k}"]`)?.value || '').filter(Boolean); const c = tr.querySelector('[data-c]:checked'); q.c = c ? +c.dataset.c : -1; }
    else { q.a = g('a'); q.unit = g('unit'); q.tol = g('tol'); }
    return q;
  });
  const draw = () => {
    E.innerHTML = `<div class="panel" style="margin-top:22px"><div class="row" style="justify-content:space-between"><label class="field">Nom de la série<input class="in" id="sn" value="${esc(s.name)}" style="width:22em;max-width:100%"></label><span class="small">Pour un QCM, cochez la bonne proposition. Pour un nombre, la tolérance accepte les arrondis (ex. 0,3).</span></div>
    <div class="tw"><table class="data edit"><thead><tr><th>#</th><th>Type</th><th>Question</th><th>Réponse</th><th>Temps</th><th></th></tr></thead><tbody>${qs.map(rowH).join('')}</tbody></table></div>
    <div class="row"><button class="btn ghost" id="addq">Ajouter une question</button><button class="btn go" id="saveS">Enregistrer la série</button><span class="msg" id="em"></span></div></div>`;
    E.querySelectorAll('[data-f="type"]').forEach(sel => sel.onchange = () => { const cur = read(); const i = +sel.closest('tr').dataset.i; cur[i].type = sel.value; if (sel.value === 'qcm' && !cur[i].opts) cur[i].opts = ['', '', '', '']; qs.splice(0, qs.length, ...cur); draw(); });
    E.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { const cur = read(); cur.splice(+b.closest('tr').dataset.i, 1); qs.splice(0, qs.length, ...cur); draw(); });
    $('#addq').onclick = () => { const cur = read(); cur.push({ type: 'num', q: '', a: '', unit: '€', t: 40 }); qs.splice(0, qs.length, ...cur); draw(); };
    $('#saveS').onclick = async () => {
      const body = { name: $('#sn').value, questions: read() };
      try { if (s.id) await api('/api/series/' + s.id, { method: 'PUT', body }); else await api(`/api/series/${lvl}/${sid}`, { body }); seriesView(lvl, sid); }
      catch (e) { flash($('#em'), e.message, false); }
    };
  };
  draw(); E.scrollIntoView({ behavior: 'smooth' });
}

/* ================= Réglages ================= */
async function adminView() {
  const isAdmin = ME.role === 'admin', users = isAdmin ? await api('/api/users') : [], cls = isAdmin ? await api('/api/classes') : [];
  setView(`<div class="wrap"><div class="eyebrow">Réglages</div><h1 class="disp" style="font-size:clamp(2rem,4vw,3.2rem)">Compte et administration</h1>
  <div class="cols" style="margin-top:18px">
  <form class="panel" id="pwf" style="display:grid;gap:10px"><h3>Changer mon mot de passe</h3><label class="field">Mot de passe actuel<input class="in" type="password" id="po" autocomplete="current-password"></label><label class="field">Nouveau mot de passe (10 caractères minimum)<input class="in" type="password" id="pn" autocomplete="new-password"></label><div class="row"><button class="btn">Modifier</button><span class="msg" id="pm"></span></div></form>
  ${isAdmin ? `<div class="panel"><h3>Comptes professeurs</h3><ul class="rank" style="margin:10px 0">${users.map(u => `<li><b>${u.role === 'admin' ? '★' : '·'}</b><span>${esc(u.name)} <span class="small">${esc(u.email)}</span></span>${u.id === ME.id ? '<span class="small">vous</span>' : `<button class="btn ghost sm" data-du="${u.id}">Supprimer</button>`}</li>`).join('')}</ul>
   <form id="uf" style="display:grid;gap:8px"><div class="row"><input class="in" id="un" placeholder="Prénom Nom"><input class="in" id="ue" type="email" placeholder="adresse e-mail"></div><div class="row"><input class="in" id="up" type="text" placeholder="mot de passe provisoire"><select class="in" id="ur"><option value="prof">Professeur</option><option value="admin">Administrateur</option></select><button class="btn">Créer</button></div><span class="msg" id="um"></span></form>
   <p class="small">Un professeur voit toutes les classes, lance les séances et saisit les points. Seul un administrateur voit et modifie les codes des élèves.</p></div>
  <div class="panel"><h3>Classes</h3><ul class="rank" style="margin:10px 0">${cls.map(c => `<li><b>·</b><span>${esc(c.name)} <span class="small">${levelName(c.level)}</span></span><button class="btn ghost sm" data-dc="${c.id}">Supprimer</button></li>`).join('')}</ul>
   <form id="cfm" class="row"><input class="in" id="ncn" placeholder="ex. 1STMG3"><select class="in" id="ncl"><option value="1">1re STMG</option><option value="T">Terminale GF</option></select><button class="btn">Ajouter</button><span class="msg" id="ncm"></span></form></div>
  <div class="panel"><h3>Fin d'année scolaire</h3><p>Efface tous les élèves, leurs codes, leurs réponses, les carnets et les jauges. Les classes, les comptes et les séries de questions sont conservés.</p>
   <div class="row"><input class="in" id="pg" placeholder="Tapez EFFACER"><button class="btn warn" id="pgb">Tout effacer</button><span class="msg" id="pgm"></span></div></div>` : ''}
  </div></div>`);
  $('#pwf').onsubmit = async e => { e.preventDefault(); try { await api('/api/me/password', { method: 'PUT', body: { old: $('#po').value, password: $('#pn').value } }); flash($('#pm'), 'Mot de passe modifié.'); } catch (err) { flash($('#pm'), err.message, false); } };
  if (!isAdmin) return;
  $('#uf').onsubmit = async e => { e.preventDefault(); try { await api('/api/users', { body: { name: $('#un').value, email: $('#ue').value, password: $('#up').value, role: $('#ur').value } }); adminView(); } catch (err) { flash($('#um'), err.message, false); } };
  document.querySelectorAll('[data-du]').forEach(b => { let a = false; b.onclick = async () => { if (!a) { a = true; b.textContent = 'Confirmer ?'; return; } await api('/api/users/' + b.dataset.du, { method: 'DELETE' }); adminView(); }; });
  document.querySelectorAll('[data-dc]').forEach(b => { let a = false; b.onclick = async () => { if (!a) { a = true; b.textContent = 'Confirmer : élèves et points effacés'; return; } await api('/api/classes/' + b.dataset.dc, { method: 'DELETE' }); adminView(); }; });
  $('#cfm').onsubmit = async e => { e.preventDefault(); try { await api('/api/classes', { body: { name: $('#ncn').value, level: $('#ncl').value } }); adminView(); } catch (err) { flash($('#ncm'), err.message, false); } };
  $('#pgb').onclick = async () => { try { await api('/api/admin/purge', { body: { confirm: $('#pg').value.trim() } }); flash($('#pgm'), 'Données de l\'année effacées.'); } catch (err) { flash($('#pgm'), err.message, false); } };
}

boot();
