// Crée (ou met à jour) un compte administrateur.
// Usage : node scripts/create-admin.js prenom.nom@exemple.fr "Prénom Nom" "MotDePasseLong"
const bcrypt = require('bcryptjs');
const { db } = require('../server.js');
const [email, name, pw] = process.argv.slice(2);
if (!email || !name || !pw || pw.length < 10) {
  console.log('Usage : node scripts/create-admin.js email "Prénom Nom" "mot de passe (10 caractères minimum)"');
  process.exit(1);
}
const hash = bcrypt.hashSync(pw, 11);
const ex = db.prepare('SELECT id FROM users WHERE email=?').get(email.toLowerCase());
if (ex) db.prepare("UPDATE users SET name=?, pass_hash=?, role='admin' WHERE id=?").run(name, hash, ex.id);
else db.prepare("INSERT INTO users (email, name, pass_hash, role) VALUES (?,?,?,'admin')").run(email.toLowerCase(), name, hash);
console.log(`Compte administrateur prêt : ${email}`);
process.exit(0);
