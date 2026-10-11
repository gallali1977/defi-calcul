# Défi Calcul

Rituel de calcul de 5 minutes pour les classes de STMG : diaporama au TNI avec chrono, jauge collective par classe, quiz sur téléphone avec QR code, carnet de progression des élèves.

- **1re STMG** : 10 séances (opérations, pourcentages, taux de variation, résultat, valeur ajoutée).
- **Terminale STMG Gestion et finance** : 10 séances (coefficients, coûts, marges, seuil de rentabilité, point mort, rentabilité).

Adresse prévue : **https://calcul.grandoralstmg.cloud**

---

## Installation sur le VPS Hostinger

L'application tourne à côté de la plateforme Grand oral, sur son propre sous-domaine et son propre port (3100). Elle ne touche pas à l'autre site.

Toutes les commandes se tapent dans le terminal du VPS : hPanel → **VPS** → **Terminal du navigateur** (ou en SSH).

### Étape 0 · Vérifier ce qui est déjà installé

```bash
node -v          # il faut la version 18 ou plus
nginx -v         # le serveur web
sudo ss -ltnp | grep 3100   # doit ne rien afficher (port libre)
```

- Si `node -v` ne répond pas : `curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs`
- Si le port 3100 est déjà pris : choisissez 3110 et remplacez `3100` dans les deux fichiers du dossier `deploy/`.
- Si `nginx -v` ne répond pas, la plateforme Grand oral utilise sans doute un autre outil (Caddy, Docker, Coolify…). Dans ce cas, arrêtez-vous ici et envoyez-moi le résultat des trois commandes : j'adapte la configuration.

### Étape 1 · Créer le sous-domaine

hPanel → **Domaines** → `grandoralstmg.cloud` → **DNS / Serveurs de noms** → **Ajouter un enregistrement** :

| Type | Nom | Pointe vers | TTL |
|---|---|---|---|
| A | `calcul` | l'adresse IP du VPS (visible dans hPanel → VPS) | 3600 |

La propagation prend de quelques minutes à une heure.

### Étape 2 · Déposer le code

Le plus simple : créez un dépôt **privé** `defi-calcul` sur GitHub et déposez-y le contenu du dossier (glisser-déposer dans « Add file → Upload files »). Puis sur le VPS :

```bash
sudo mkdir -p /var/www && cd /var/www
sudo git clone https://github.com/VOTRE-COMPTE/defi-calcul.git
cd defi-calcul
sudo npm install --omit=dev
```

(GitHub demande un identifiant et un « personal access token » pour un dépôt privé, comme pour la plateforme Grand oral.)

### Étape 3 · Dossier des données et compte administrateur

```bash
sudo mkdir -p /var/lib/defi-calcul
sudo chown www-data:www-data /var/lib/defi-calcul
sudo -u www-data DATA_DIR=/var/lib/defi-calcul node scripts/create-admin.js votre.adresse@ac-versailles.fr "Ramzi G." "UnMotDePasseLong2026"
```

Choisissez un vrai mot de passe (10 caractères minimum). Vous pourrez le changer dans l'application (menu Réglages).

### Étape 4 · Lancer le service

```bash
sudo cp deploy/defi-calcul.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now defi-calcul
sudo systemctl status defi-calcul     # doit afficher « active (running) »
```

### Étape 5 · Brancher le sous-domaine (nginx + HTTPS)

```bash
sudo cp deploy/nginx-defi-calcul.conf /etc/nginx/sites-available/defi-calcul
sudo ln -s /etc/nginx/sites-available/defi-calcul /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d calcul.grandoralstmg.cloud
```

Si `certbot` n'existe pas : `sudo apt install -y certbot python3-certbot-nginx`.

Ouvrez **https://calcul.grandoralstmg.cloud** : la page de connexion professeur s'affiche.

### Étape 6 · Sauvegarde automatique (recommandé)

```bash
sudo apt install -y sqlite3
sudo cp deploy/sauvegarde.sh /usr/local/bin/defi-calcul-sauvegarde
(sudo crontab -l 2>/dev/null; echo "30 2 * * * /usr/local/bin/defi-calcul-sauvegarde") | sudo crontab -
```

Une copie de la base est faite chaque nuit dans `/var/backups/defi-calcul` (30 jours conservés).

---

## Mettre à jour l'application

Après avoir remplacé les fichiers sur GitHub :

```bash
cd /var/www/defi-calcul && sudo git pull && sudo npm install --omit=dev && sudo systemctl restart defi-calcul
```

Les classes, élèves, points et séries sont dans `/var/lib/defi-calcul` : une mise à jour ne les efface pas.

## En cas de problème

```bash
sudo journalctl -u defi-calcul -n 50    # les derniers messages de l'application
sudo systemctl restart defi-calcul
```

---

## Prise en main

1. **Classes** : 1STMG2, 1STMG3, TSTMG1 et TSTMG2 sont créées au premier lancement (modifiables dans Réglages).
2. **Élèves** : dans une classe, onglet Élèves, collez depuis Excel ou Pronote deux colonnes Prénom et Nom. Seuls le prénom et l'initiale du nom sont envoyés au serveur. Un code à 4 chiffres est créé pour chaque élève. Bouton « Imprimer les étiquettes de codes » pour les distribuer.
3. **Séance** : ouvrez la séance du jour au TNI. Chrono, diapos, cases à toucher pour révéler les réponses. Dernière diapo : saisie des points de la classe.
4. **Quiz téléphone** : bouton jaune « Quiz téléphone » dans les séances qui le proposent. Les élèves scannent le QR code, choisissent leur nom et tapent leur code. Les réponses arrivent en direct, la correction s'affiche au tableau et sur chaque téléphone, et les points sont proposés automatiquement.
5. **Exercices** : dupliquez une série de questions, changez les chiffres et choisissez-la au lancement du quiz.
6. **Résultats** : réussite de chaque élève par séance et ressenti « je me sens capable ».
7. **Comptes** : Réglages → Comptes professeurs. Un professeur voit toutes les classes ; seul un administrateur voit et modifie les codes des élèves.
8. **Fin d'année** : Réglages → Fin d'année scolaire → taper EFFACER.

## Données personnelles (RGPD)

- Données élèves : prénom, initiale du nom, classe, code à 4 chiffres tiré au hasard, réponses et ressenti. Pas de nom complet, pas de date de naissance, pas d'e-mail, pas de traceur.
- Hébergement en France (VPS Hostinger). Effacement complet en fin d'année.
- Une page d'information pour les élèves est en ligne à l'adresse `/confidentialite`. À transmettre au chef d'établissement, et au DPO académique s'il le demande.
- Les tentatives de connexion sont limitées : 5 codes faux bloquent l'élève 10 minutes.

## Technique

Node.js 18+, Express, SQLite (better-sqlite3), Server-Sent Events pour le direct, QR codes générés sur le serveur. Pas de service externe hormis les polices Google Fonts.
