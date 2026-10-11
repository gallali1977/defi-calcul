'use strict';
// Défi Calcul · serveur (Express + SQLite + Server-Sent Events)
const express = require('express');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const QR = require('qrcode');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { PARCOURS } = require('./content');

const PORT = +process.env.PORT || 3100;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const PUBLIC_URL = (process.env.PUBLIC_URL || '').replace(/\/$/, '');
fs.mkdirSync(DATA_DIR, { recursive: true });

/* ------------------------------------------------------------------ */
/* Base de données                                                     */
/* ------------------------------------------------------------------ */
const db = new Database(path.join(DATA_DIR, 'defi-calcul.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(`
CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL, pass_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'prof');
CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, kind TEXT NOT NULL, ref_id INTEGER NOT NULL, expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS classes (id INTEGER PRIMARY KEY, name TEXT NOT NULL, level TEXT NOT NULL, goal_g INTEGER NOT NULL DEFAULT 600, goal_b INTEGER NOT NULL DEFAULT 800, record_s INTEGER);
CREATE TABLE IF NOT EXISTS students (id INTEGER PRIMARY KEY, class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE, first_name TEXT NOT NULL, initial TEXT NOT NULL, pin TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS points (class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE, seance INTEGER NOT NULL, pts INTEGER NOT NULL, PRIMARY KEY (class_id, seance));
CREATE TABLE IF NOT EXISTS series (id INTEGER PRIMARY KEY, level TEXT NOT NULL, seance INTEGER NOT NULL, name TEXT NOT NULL, questions TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS runs (id INTEGER PRIMARY KEY, code TEXT UNIQUE NOT NULL, class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE, seance INTEGER NOT NULL, total INTEGER NOT NULL, status TEXT NOT NULL, created INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS answers (run_id INTEGER NOT NULL REFERENCES runs(id) ON DELETE CASCADE, student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE, qi INTEGER NOT NULL, value TEXT, ok INTEGER NOT NULL, PRIMARY KEY (run_id, student_id, qi));
CREATE TABLE IF NOT EXISTS feelings (student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE, seance INTEGER NOT NULL, score INTEGER NOT NULL, PRIMARY KEY (student_id, seance));
`);
if (!db.prepare('SELECT COUNT(*) n FROM classes').get().n) {
  const ins = db.prepare('INSERT INTO classes (name, level) VALUES (?, ?)');
  [['1STMG2', '1'], ['1STMG3', '1'], ['TSTMG1', 'T'], ['TSTMG2', 'T']].forEach(c => ins.run(...c));
}
db.prepare("UPDATE runs SET status='end' WHERE status!='end'").run();
db.prepare('DELETE FROM sessions WHERE expires < ?').run(Date.now());

/* ------------------------------------------------------------------ */
/* Outils                                                              */
/* ------------------------------------------------------------------ */
const now = () => Date.now();
const token = () => crypto.randomBytes(32).toString('hex');
const randPin = () => String(crypto.randomInt(0, 10000)).padStart(4, '0');
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const runCode = () => Array.from({ length: 5 }, () => CODE_CHARS[crypto.randomInt(CODE_CHARS.length)]).join('');
const clean = (s, max = 40) => String(s ?? '').replace(/[<>]/g, '').trim().slice(0, max);
const initialFmt = v => { v = clean(v, 3).replace(/\./g, ''); return v ? v[0].toUpperCase() + v.slice(1).toLowerCase() : ''; };
const label = s => `${s.first_name} ${s.initial}.`;
const frNum = n => (Math.round(n * 100) / 100).toLocaleString('fr-FR').replace(/ /g, ' ');

function parseNum(v) {
  let s = String(v ?? '').replace(/[\s  ]/g, '').replace(/−|–/g, '-').replace(',', '.').replace(/[^0-9.+-]/g, '');
  if (!/^[+-]?\d*\.?\d+$/.test(s)) return null;
  return parseFloat(s);
}
function isCorrect(q, value) {
  if (q.type === 'qcm') return +value === q.c;
  const n = parseNum(value);
  if (n === null) return false;
  const tol = q.tol ?? Math.max(0.011, Math.abs(q.a) * 0.001);
  return Math.abs(n - q.a) <= tol;
}
const answerText = q => q.type === 'qcm' ? q.opts[q.c] : `${frNum(q.a)}${q.unit ? ' ' + q.unit : ''}`;

function getSeance(level, id) {
  const P = PARCOURS[level];
  return P && P.seances.find(s => s.id === +id);
}
function seriesFor(level, seance) {
  const s = getSeance(level, seance);
  const list = [];
  if (s && s.live) list.push({ id: 0, name: "Série A (d'origine)", questions: s.live, builtin: true });
  db.prepare('SELECT * FROM series WHERE level=? AND seance=? ORDER BY id').all(level, +seance)
    .forEach(r => list.push({ id: r.id, name: r.name, questions: JSON.parse(r.questions) }));
  return list;
}
function sanitizeQuestions(qs) {
  if (!Array.isArray(qs) || !qs.length || qs.length > 30) throw new Error('Entre 1 et 30 questions.');
  return qs.map(q => {
    const base = { q: clean(q.q, 220), t: Math.min(240, Math.max(10, +q.t || 30)), e: clean(q.e, 220) };
    if (!base.q) throw new Error('Chaque question doit avoir un énoncé.');
    if (q.type === 'qcm') {
      const opts = (q.opts || []).map(o => clean(o, 90)).filter(Boolean);
      if (opts.length < 2 || opts.length > 4) throw new Error(`« ${base.q} » : il faut 2 à 4 propositions.`);
      const c = +q.c;
      if (!(c >= 0 && c < opts.length)) throw new Error(`« ${base.q} » : indiquez la bonne proposition.`);
      return { ...base, type: 'qcm', opts, c };
    }
    const a = parseNum(q.a);
    if (a === null) throw new Error(`« ${base.q} » : la réponse doit être un nombre.`);
    const out = { ...base, type: 'num', a, unit: clean(q.unit, 12) };
    const tol = parseNum(q.tol); if (tol !== null && tol > 0) out.tol = tol;
    return out;
  });
}

/* ------------------------------------------------------------------ */
/* Limitation des essais                                               */
/* ------------------------------------------------------------------ */
const attempts = new Map();
function limited(key, max, windowMs) {
  const t = now(), a = (attempts.get(key) || []).filter(x => t - x < windowMs);
  attempts.set(key, a);
  return a.length >= max;
}
function fail(key) { (attempts.get(key) || attempts.set(key, []).get(key)).push(now()); }
setInterval(() => { const t = now(); for (const [k, a] of attempts) if (!a.some(x => t - x < 3600e3)) attempts.delete(k); }, 600e3).unref();

/* ------------------------------------------------------------------ */
/* Application                                                         */
/* ------------------------------------------------------------------ */
const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.set({ 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin', 'X-Frame-Options': 'SAMEORIGIN' });
  next();
});
app.use(express.json({ limit: '300kb' }));
app.use(cookieParser());
// Les requêtes qui modifient des données doivent être en JSON (protection CSRF simple)
app.use('/api', (req, res, next) => {
  if (req.method !== 'GET' && !req.is('application/json')) return res.status(415).json({ error: 'Format de requête invalide.' });
  next();
});

const cookieOpts = (req, days) => ({ httpOnly: true, sameSite: 'lax', secure: req.secure, maxAge: days * 864e5, path: '/' });
function session(req, name, kind) {
  const t = req.cookies[name];
  if (!t) return null;
  const s = db.prepare('SELECT * FROM sessions WHERE token=? AND kind=?').get(t, kind);
  if (!s || s.expires < now()) return null;
  return s;
}
function prof(req, res, next) {
  const s = session(req, 'dc_prof', 'prof');
  const u = s && db.prepare('SELECT id, email, name, role FROM users WHERE id=?').get(s.ref_id);
  if (!u) return res.status(401).json({ error: 'Session expirée : reconnectez-vous.' });
  req.user = u; next();
}
const admin = (req, res, next) => req.user.role === 'admin' ? next() : res.status(403).json({ error: 'Réservé à l\'administrateur.' });
function eleve(req) {
  const s = session(req, 'dc_eleve', 'eleve');
  return s && db.prepare('SELECT * FROM students WHERE id=?').get(s.ref_id);
}
const wrap = fn => (req, res) => { try { fn(req, res); } catch (e) { console.error(e); res.status(400).json({ error: e.message || 'Erreur.' }); } };

/* ---------------- Comptes professeurs ---------------- */
app.post('/api/login', wrap((req, res) => {
  const ip = 'login:' + req.ip;
  if (limited(ip, 10, 15 * 60e3)) return res.status(429).json({ error: 'Trop d\'essais. Réessayez dans 15 minutes.' });
  const u = db.prepare('SELECT * FROM users WHERE email=?').get(clean(req.body.email, 120).toLowerCase());
  if (!u || !bcrypt.compareSync(String(req.body.password || ''), u.pass_hash)) { fail(ip); return res.status(401).json({ error: 'Adresse ou mot de passe incorrect.' }); }
  const t = token();
  db.prepare('INSERT INTO sessions VALUES (?,?,?,?)').run(t, 'prof', u.id, now() + 30 * 864e5);
  res.cookie('dc_prof', t, cookieOpts(req, 30)).json({ ok: true });
}));
app.post('/api/logout', (req, res) => {
  if (req.cookies.dc_prof) db.prepare('DELETE FROM sessions WHERE token=?').run(req.cookies.dc_prof);
  res.clearCookie('dc_prof', { path: '/' }).json({ ok: true });
});
app.get('/api/me', prof, (req, res) => res.json(req.user));
app.put('/api/me/password', prof, wrap((req, res) => {
  const u = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
  if (!bcrypt.compareSync(String(req.body.old || ''), u.pass_hash)) return res.status(400).json({ error: 'Mot de passe actuel incorrect.' });
  if (String(req.body.password || '').length < 10) return res.status(400).json({ error: 'Le nouveau mot de passe doit faire au moins 10 caractères.' });
  db.prepare('UPDATE users SET pass_hash=? WHERE id=?').run(bcrypt.hashSync(req.body.password, 11), u.id);
  res.json({ ok: true });
}));
app.get('/api/users', prof, admin, (req, res) => res.json(db.prepare('SELECT id, email, name, role FROM users ORDER BY name').all()));
app.post('/api/users', prof, admin, wrap((req, res) => {
  const email = clean(req.body.email, 120).toLowerCase(), name = clean(req.body.name, 60), pw = String(req.body.password || '');
  if (!/^[^@\s]+@[^@\s]+$/.test(email) || !name) throw new Error('Nom et adresse e-mail obligatoires.');
  if (pw.length < 10) throw new Error('Mot de passe : au moins 10 caractères.');
  if (db.prepare('SELECT 1 FROM users WHERE email=?').get(email)) throw new Error('Cette adresse existe déjà.');
  db.prepare('INSERT INTO users (email, name, pass_hash, role) VALUES (?,?,?,?)').run(email, name, bcrypt.hashSync(pw, 11), req.body.role === 'admin' ? 'admin' : 'prof');
  res.json({ ok: true });
}));
app.delete('/api/users/:id', prof, admin, wrap((req, res) => {
  if (+req.params.id === req.user.id) throw new Error('Vous ne pouvez pas supprimer votre propre compte.');
  db.prepare("DELETE FROM sessions WHERE kind='prof' AND ref_id=?").run(+req.params.id);
  db.prepare('DELETE FROM users WHERE id=?').run(+req.params.id);
  res.json({ ok: true });
}));

/* ---------------- Contenus ---------------- */
app.get('/api/parcours/:level', prof, wrap((req, res) => {
  const P = PARCOURS[req.params.level];
  if (!P) throw new Error('Parcours inconnu.');
  const extra = db.prepare('SELECT seance, COUNT(*) n FROM series WHERE level=? GROUP BY seance').all(req.params.level);
  res.json({ ...P, seances: P.seances.map(s => ({ ...s, live: undefined, liveCount: s.live ? s.live.length : 0, seriesCount: (s.live ? 1 : 0) + (extra.find(x => x.seance === s.id)?.n || 0) })) });
}));
app.get('/api/series/:level/:seance', prof, (req, res) => res.json(seriesFor(req.params.level, req.params.seance)));
app.post('/api/series/:level/:seance', prof, wrap((req, res) => {
  if (!getSeance(req.params.level, req.params.seance)) throw new Error('Séance inconnue.');
  const qs = sanitizeQuestions(req.body.questions), name = clean(req.body.name, 60) || 'Nouvelle série';
  const r = db.prepare('INSERT INTO series (level, seance, name, questions) VALUES (?,?,?,?)').run(req.params.level, +req.params.seance, name, JSON.stringify(qs));
  res.json({ id: r.lastInsertRowid });
}));
app.put('/api/series/:id', prof, wrap((req, res) => {
  const qs = sanitizeQuestions(req.body.questions), name = clean(req.body.name, 60) || 'Série';
  db.prepare('UPDATE series SET name=?, questions=? WHERE id=?').run(name, JSON.stringify(qs), +req.params.id);
  res.json({ ok: true });
}));
app.delete('/api/series/:id', prof, (req, res) => { db.prepare('DELETE FROM series WHERE id=?').run(+req.params.id); res.json({ ok: true }); });

/* ---------------- Classes et jauges ---------------- */
function classSummary(c) {
  const pts = db.prepare('SELECT seance, pts FROM points WHERE class_id=?').all(c.id);
  const students = db.prepare('SELECT COUNT(*) n FROM students WHERE class_id=?').get(c.id).n;
  return { ...c, total: pts.reduce((a, p) => a + p.pts, 0), points: Object.fromEntries(pts.map(p => [p.seance, p.pts])), students };
}
app.get('/api/classes', prof, (req, res) => res.json(db.prepare('SELECT * FROM classes ORDER BY level, name').all().map(classSummary)));
app.get('/api/classes/:id', prof, wrap((req, res) => {
  const c = db.prepare('SELECT * FROM classes WHERE id=?').get(+req.params.id);
  if (!c) throw new Error('Classe introuvable.');
  res.json(classSummary(c));
}));
app.post('/api/classes', prof, admin, wrap((req, res) => {
  const name = clean(req.body.name, 30); if (!name) throw new Error('Nom de classe obligatoire.');
  const level = req.body.level === 'T' ? 'T' : '1';
  res.json({ id: db.prepare('INSERT INTO classes (name, level) VALUES (?,?)').run(name, level).lastInsertRowid });
}));
app.put('/api/classes/:id', prof, wrap((req, res) => {
  const c = db.prepare('SELECT * FROM classes WHERE id=?').get(+req.params.id); if (!c) throw new Error('Classe introuvable.');
  const g = Math.max(0, Math.min(1000, +req.body.goal_g || c.goal_g)), b = Math.max(0, Math.min(1000, +req.body.goal_b || c.goal_b));
  db.prepare('UPDATE classes SET name=?, goal_g=?, goal_b=? WHERE id=?').run(clean(req.body.name, 30) || c.name, g, b, c.id);
  res.json({ ok: true });
}));
app.delete('/api/classes/:id', prof, admin, (req, res) => { db.prepare('DELETE FROM classes WHERE id=?').run(+req.params.id); res.json({ ok: true }); });
app.put('/api/classes/:id/points/:seance', prof, wrap((req, res) => {
  const v = Math.round(+req.body.pts);
  if (!(v >= 0 && v <= 100)) throw new Error('Les points vont de 0 à 100.');
  db.prepare('INSERT INTO points VALUES (?,?,?) ON CONFLICT(class_id, seance) DO UPDATE SET pts=excluded.pts').run(+req.params.id, +req.params.seance, v);
  res.json({ ok: true });
}));
app.delete('/api/classes/:id/points/:seance', prof, (req, res) => { db.prepare('DELETE FROM points WHERE class_id=? AND seance=?').run(+req.params.id, +req.params.seance); res.json({ ok: true }); });
app.put('/api/classes/:id/record', prof, wrap((req, res) => {
  const c = db.prepare('SELECT * FROM classes WHERE id=?').get(+req.params.id), s = Math.round(+req.body.seconds);
  if (!c || !(s > 0)) throw new Error('Temps invalide.');
  const better = c.record_s == null || s < c.record_s;
  if (better) db.prepare('UPDATE classes SET record_s=? WHERE id=?').run(s, c.id);
  res.json({ record: better ? s : c.record_s, better });
}));

/* ---------------- Élèves ---------------- */
function uniquePin(classId) {
  const used = new Set(db.prepare('SELECT pin FROM students WHERE class_id=?').all(classId).map(r => r.pin));
  for (let i = 0; i < 200; i++) { const p = randPin(); if (!used.has(p) && !/^(\d)\1{3}$/.test(p)) return p; }
  return randPin();
}
app.get('/api/classes/:id/students', prof, (req, res) => {
  const rows = db.prepare('SELECT * FROM students WHERE class_id=? ORDER BY first_name, initial').all(+req.params.id);
  res.json(rows.map(s => ({ id: s.id, first_name: s.first_name, initial: s.initial, pin: req.user.role === 'admin' ? s.pin : null })));
});
app.post('/api/classes/:id/students', prof, wrap((req, res) => {
  const cid = +req.params.id;
  if (!db.prepare('SELECT 1 FROM classes WHERE id=?').get(cid)) throw new Error('Classe introuvable.');
  const list = Array.isArray(req.body.students) ? req.body.students : [req.body];
  const ins = db.prepare('INSERT INTO students (class_id, first_name, initial, pin) VALUES (?,?,?,?)');
  let n = 0;
  db.transaction(() => {
    for (const s of list.slice(0, 60)) {
      const f = clean(s.first_name, 30), i = initialFmt(s.initial);
      if (!f || !i) continue;
      ins.run(cid, f, i, uniquePin(cid)); n++;
    }
  })();
  res.json({ added: n });
}));
app.put('/api/students/:id', prof, wrap((req, res) => {
  const s = db.prepare('SELECT * FROM students WHERE id=?').get(+req.params.id); if (!s) throw new Error('Élève introuvable.');
  const f = clean(req.body.first_name, 30) || s.first_name, i = initialFmt(clean(req.body.initial, 3) || s.initial);
  let pin = s.pin;
  if (req.body.pin != null && req.user.role === 'admin') {
    pin = String(req.body.pin).trim();
    if (!/^\d{4}$/.test(pin)) throw new Error('Le code doit comporter exactement 4 chiffres.');
    if (db.prepare('SELECT 1 FROM students WHERE class_id=? AND pin=? AND id!=?').get(s.class_id, pin, s.id)) throw new Error('Ce code est déjà utilisé dans la classe.');
  }
  db.prepare('UPDATE students SET first_name=?, initial=?, pin=? WHERE id=?').run(f, i, pin, s.id);
  res.json({ ok: true });
}));
app.post('/api/students/:id/newpin', prof, admin, wrap((req, res) => {
  const s = db.prepare('SELECT * FROM students WHERE id=?').get(+req.params.id); if (!s) throw new Error('Élève introuvable.');
  const pin = uniquePin(s.class_id);
  db.prepare('UPDATE students SET pin=? WHERE id=?').run(pin, s.id);
  db.prepare("DELETE FROM sessions WHERE kind='eleve' AND ref_id=?").run(s.id);
  res.json({ pin });
}));
app.delete('/api/students/:id', prof, (req, res) => {
  db.prepare("DELETE FROM sessions WHERE kind='eleve' AND ref_id=?").run(+req.params.id);
  db.prepare('DELETE FROM students WHERE id=?').run(+req.params.id);
  res.json({ ok: true });
});

/* ---------------- Résultats et carnets ---------------- */
function carnet(studentId, classId, level) {
  const rows = db.prepare(`SELECT r.seance, r.total, r.id, SUM(a.ok) ok FROM answers a JOIN runs r ON r.id=a.run_id
    WHERE a.student_id=? AND r.class_id=? GROUP BY r.id ORDER BY r.id`).all(studentId, classId);
  const out = {};
  rows.forEach(r => { out[r.seance] = { pct: Math.round(100 * r.ok / r.total) }; });
  db.prepare('SELECT seance, score FROM feelings WHERE student_id=?').all(studentId)
    .forEach(f => { (out[f.seance] = out[f.seance] || {}).feel = f.score; });
  return out;
}
app.get('/api/classes/:id/results', prof, wrap((req, res) => {
  const c = db.prepare('SELECT * FROM classes WHERE id=?').get(+req.params.id); if (!c) throw new Error('Classe introuvable.');
  const st = db.prepare('SELECT * FROM students WHERE class_id=? ORDER BY first_name, initial').all(c.id);
  res.json({ students: st.map(s => ({ id: s.id, label: label(s), cells: carnet(s.id, c.id, c.level) })) });
}));

/* ---------------- Fin d'année ---------------- */
app.post('/api/admin/purge', prof, admin, wrap((req, res) => {
  if (req.body.confirm !== 'EFFACER') throw new Error('Tapez EFFACER pour confirmer.');
  db.transaction(() => {
    db.prepare("DELETE FROM sessions WHERE kind='eleve'").run();
    ['answers', 'feelings', 'runs', 'students', 'points'].forEach(t => db.prepare(`DELETE FROM ${t}`).run());
    db.prepare('UPDATE classes SET record_s=NULL').run();
  })();
  res.json({ ok: true });
}));

/* ------------------------------------------------------------------ */
/* Quiz en direct                                                      */
/* ------------------------------------------------------------------ */
const RUNS = new Map();
function newRun(classRow, seance, series) {
  let code; do code = runCode(); while (RUNS.has(code) || db.prepare('SELECT 1 FROM runs WHERE code=?').get(code));
  const s = getSeance(classRow.level, seance);
  const id = db.prepare('INSERT INTO runs (code, class_id, seance, total, status, created) VALUES (?,?,?,?,?,?)')
    .run(code, classRow.id, seance, series.questions.length, 'lobby', now()).lastInsertRowid;
  const R = { id, code, classId: classRow.id, className: classRow.name, level: classRow.level, seance, title: s.title, boss: !!s.bossRule,
    seriesName: series.name, questions: series.questions, status: 'lobby', qi: -1, qEnd: 0, timer: null,
    joined: new Map(), answers: [], feelings: new Map(), clients: new Set(), created: now() };
  RUNS.set(code, R);
  return R;
}
function summary(R) {
  const n = R.joined.size, tot = R.questions.length;
  let ok = 0; R.answers.forEach(m => m.forEach(a => { ok += a.ok ? 1 : 0; }));
  const rate = n ? ok / (n * tot) : 0;
  const suggested = R.boss ? (rate >= 0.7 ? 100 : Math.round(rate * 100)) : Math.min(100, Math.round(rate * 100) + (rate >= 0.8 ? 10 : 0));
  const perQ = R.questions.map((q, i) => { const m = R.answers[i] || new Map(); let c = 0; m.forEach(a => c += a.ok ? 1 : 0); return n ? Math.round(100 * c / n) : 0; });
  return { players: n, rate: Math.round(rate * 100), suggested, perQ };
}
function stateFor(R, client) {
  const q = R.questions[R.qi], base = { status: R.status, qi: R.qi, total: R.questions.length, title: R.title, className: R.className, seance: R.seance, serverNow: now(), qEnd: R.qEnd };
  const m = R.answers[R.qi] || new Map();
  if (client.role === 'prof') {
    const st = { ...base, code: R.code, classId: R.classId, level: R.level, seriesName: R.seriesName, joined: [...R.joined.values()], answered: m.size };
    if (q) st.question = q;
    if (q && (R.status === 'reveal' || R.status === 'end')) {
      let c = 0; const dist = q.type === 'qcm' ? q.opts.map(() => 0) : null;
      m.forEach(a => { if (a.ok) c++; if (dist && dist[+a.v] != null) dist[+a.v]++; });
      st.stats = { correct: c, n: m.size, dist, answer: answerText(q) };
    }
    if (R.status === 'end') st.summary = summary(R);
    return st;
  }
  const st = { ...base, me: R.joined.get(client.sid) || null };
  if (q && R.status !== 'end') {
    st.question = { q: q.q, type: q.type, opts: q.opts, unit: q.unit };
    const mine = m.get(client.sid);
    st.myAnswer = mine ? mine.v : null;
    if (R.status === 'reveal') st.reveal = { ok: mine ? mine.ok : false, answer: answerText(q), e: q.e };
  }
  if (R.status === 'end') {
    let ok = 0; R.answers.forEach(mm => { const a = mm.get(client.sid); if (a && a.ok) ok++; });
    st.end = { ok, total: R.questions.length, feeling: R.feelings.get(client.sid) || null };
  }
  return st;
}
function push(R) {
  for (const c of R.clients) {
    try { c.res.write(`data: ${JSON.stringify(stateFor(R, c))}\n\n`); } catch (e) { R.clients.delete(c); }
  }
}
function doReveal(R) {
  if (R.status !== 'q') return;
  clearTimeout(R.timer); R.status = 'reveal'; push(R);
}
function startQuestion(R, i) {
  R.qi = i; R.status = 'q'; R.answers[i] = R.answers[i] || new Map();
  R.qEnd = now() + (R.questions[i].t || 30) * 1000;
  clearTimeout(R.timer); R.timer = setTimeout(() => doReveal(R), R.qEnd - now() + 400);
  push(R);
}
function getRun(code) { return RUNS.get(String(code || '').toUpperCase()); }
setInterval(() => { // ménage : on oublie les quiz de plus de 6 heures
  for (const [k, R] of RUNS) if (now() - R.created > 6 * 3600e3) { R.clients.forEach(c => { try { c.res.end(); } catch (e) {} }); RUNS.delete(k); }
}, 600e3).unref();

app.post('/api/runs', prof, wrap((req, res) => {
  const c = db.prepare('SELECT * FROM classes WHERE id=?').get(+req.body.classId); if (!c) throw new Error('Classe introuvable.');
  const series = seriesFor(c.level, req.body.seance).find(s => s.id === +(req.body.seriesId || 0));
  if (!series) throw new Error('Cette séance n\'a pas de quiz téléphone.');
  for (const [k, R] of RUNS) if (R.classId === c.id && R.status !== 'end') { R.status = 'end'; db.prepare("UPDATE runs SET status='end' WHERE id=?").run(R.id); push(R); }
  res.json({ code: newRun(c, +req.body.seance, series).code });
}));
app.get('/api/runs/:code/qr', prof, async (req, res) => { try {
  const R = getRun(req.params.code); if (!R) return res.status(404).json({ error: 'Quiz introuvable.' });
  const base = PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
  const url = `${base}/j/${R.code}`;
  const svg = await QR.toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' });
  res.json({ url, svg });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.post('/api/runs/:code/action', prof, wrap((req, res) => {
  const R = getRun(req.params.code); if (!R) throw new Error('Quiz introuvable.');
  const a = req.body.action;
  if (a === 'next') { if (R.status === 'lobby' || R.status === 'reveal') { if (R.qi + 1 < R.questions.length) startQuestion(R, R.qi + 1); else a2end(R); } }
  else if (a === 'reveal') doReveal(R);
  else if (a === 'end') a2end(R);
  else if (a === 'kick') { R.joined.delete(+req.body.studentId); push(R); }
  res.json({ ok: true });
}));
function a2end(R) {
  clearTimeout(R.timer); R.status = 'end'; db.prepare("UPDATE runs SET status='end' WHERE id=?").run(R.id); push(R);
}
function sse(req, res, client, R) {
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  res.flushHeaders();
  client.res = res; R.clients.add(client);
  res.write(`data: ${JSON.stringify(stateFor(R, client))}\n\n`);
  const ping = setInterval(() => { try { res.write(': ping\n\n'); } catch (e) {} }, 20000);
  req.on('close', () => { clearInterval(ping); R.clients.delete(client); });
}
app.get('/api/runs/:code/stream', prof, (req, res) => {
  const R = getRun(req.params.code); if (!R) return res.status(404).end();
  sse(req, res, { role: 'prof' }, R);
});

/* ---------------- Côté élève ---------------- */
app.get('/api/join/:code', wrap((req, res) => {
  const R = getRun(req.params.code);
  if (!R) return res.status(404).json({ error: 'Ce défi est terminé ou le code est incorrect.' });
  const s = eleve(req);
  const me = s && s.class_id === R.classId ? { id: s.id, label: label(s) } : null;
  const out = { className: R.className, title: R.title, status: R.status, me };
  if (!me && R.status !== 'end') out.roster = db.prepare('SELECT * FROM students WHERE class_id=? ORDER BY first_name, initial').all(R.classId).map(x => ({ id: x.id, label: label(x) }));
  res.json(out);
}));
app.post('/api/join/:code/login', wrap((req, res) => {
  const R = getRun(req.params.code); if (!R || R.status === 'end') throw new Error('Ce défi est terminé.');
  const sid = +req.body.studentId, ipKey = 'pin-ip:' + req.ip, stKey = 'pin-st:' + sid;
  if (limited(stKey, 5, 10 * 60e3) || limited(ipKey, 40, 10 * 60e3)) return res.status(429).json({ error: 'Trop d\'essais. Attends 10 minutes ou demande ton code au professeur.' });
  const s = db.prepare('SELECT * FROM students WHERE id=? AND class_id=?').get(sid, R.classId);
  if (!s || s.pin !== String(req.body.pin || '').trim()) { fail(stKey); fail(ipKey); return res.status(401).json({ error: 'Code incorrect.' }); }
  attempts.delete(stKey);
  const t = token();
  db.prepare('INSERT INTO sessions VALUES (?,?,?,?)').run(t, 'eleve', s.id, now() + 300 * 864e5);
  res.cookie('dc_eleve', t, cookieOpts(req, 300)).json({ ok: true });
}));
app.get('/api/join/:code/stream', (req, res) => {
  const R = getRun(req.params.code), s = eleve(req);
  if (!R || !s || s.class_id !== R.classId) return res.status(403).end();
  if (!R.joined.has(s.id)) { R.joined.set(s.id, label(s)); push(R); }
  sse(req, res, { role: 'eleve', sid: s.id }, R);
});
app.post('/api/join/:code/answer', wrap((req, res) => {
  const R = getRun(req.params.code), s = eleve(req);
  if (!R || !s || s.class_id !== R.classId) return res.status(403).json({ error: 'Non connecté.' });
  if (R.status !== 'q' || +req.body.qi !== R.qi) return res.status(409).json({ error: 'Trop tard pour cette question.' });
  if (now() > R.qEnd + 1500) return res.status(409).json({ error: 'Temps écoulé.' });
  const m = R.answers[R.qi];
  if (m.has(s.id)) return res.json({ ok: true });
  if (!R.joined.has(s.id)) R.joined.set(s.id, label(s));
  const q = R.questions[R.qi], v = clean(req.body.value, 30), ok = isCorrect(q, v);
  m.set(s.id, { v, ok });
  db.prepare('INSERT OR REPLACE INTO answers VALUES (?,?,?,?,?)').run(R.id, s.id, R.qi, v, ok ? 1 : 0);
  if (m.size >= R.joined.size) doReveal(R); else push(R);
  res.json({ ok: true });
}));
app.post('/api/join/:code/feeling', wrap((req, res) => {
  const R = getRun(req.params.code), s = eleve(req);
  if (!R || !s || s.class_id !== R.classId) return res.status(403).json({ error: 'Non connecté.' });
  const v = Math.round(+req.body.score); if (!(v >= 1 && v <= 5)) throw new Error('Choisis entre 1 et 5.');
  R.feelings.set(s.id, v);
  db.prepare('INSERT OR REPLACE INTO feelings VALUES (?,?,?)').run(s.id, R.seance, v);
  push(R); res.json({ ok: true });
}));
app.get('/api/eleve/carnet', wrap((req, res) => {
  const s = eleve(req); if (!s) return res.status(401).json({ error: 'Non connecté.' });
  const c = db.prepare('SELECT * FROM classes WHERE id=?').get(s.class_id);
  const P = PARCOURS[c.level];
  res.json({ me: label(s), className: c.name, parcours: P.label, seances: P.seances.map(x => ({ id: x.id, title: x.title, p: x.p })), cells: carnet(s.id, c.id, c.level) });
}));
app.post('/api/eleve/feeling', wrap((req, res) => {
  const s = eleve(req); if (!s) return res.status(401).json({ error: 'Non connecté.' });
  const v = Math.round(+req.body.score), seance = Math.round(+req.body.seance);
  if (!(v >= 1 && v <= 5) || !(seance >= 1 && seance <= 10)) throw new Error('Valeur invalide.');
  db.prepare('INSERT OR REPLACE INTO feelings VALUES (?,?,?)').run(s.id, seance, v);
  res.json({ ok: true });
}));
app.post('/api/eleve/logout', (req, res) => {
  if (req.cookies.dc_eleve) db.prepare('DELETE FROM sessions WHERE token=?').run(req.cookies.dc_eleve);
  res.clearCookie('dc_eleve', { path: '/' }).json({ ok: true });
});

/* ---------------- Pages ---------------- */
const pub = path.join(__dirname, 'public');
app.use(express.static(pub, { index: false, maxAge: '1h' }));
app.get(['/j/:code', '/eleve'], (req, res) => res.sendFile(path.join(pub, 'eleve.html')));
app.get('/confidentialite', (req, res) => res.sendFile(path.join(pub, 'confidentialite.html')));
app.get('/', (req, res) => res.sendFile(path.join(pub, 'prof.html')));
app.use((req, res) => res.status(404).send('Page introuvable.'));

if (require.main === module) app.listen(PORT, '127.0.0.1', () => console.log(`Défi Calcul en écoute sur http://127.0.0.1:${PORT}`));
module.exports = { app, db };
