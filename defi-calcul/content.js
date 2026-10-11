// Contenu pédagogique des deux parcours.
// "slides" : diapos projetées au TNI. "live" : questions jouables sur téléphone.
// Question live : { q, type:'num'|'qcm', a (num) | opts + c (qcm), unit, tol, t (secondes), e (explication) }

const esc = s => String(s);
const tile = (tag, q, a, w) => `<button class="tile"><span class="tag">${tag}</span><span class="q">${q}</span><span class="a">${a}</span>${w ? `<span class="w">${w}</span>` : ''}<span class="hint">Toucher pour la réponse</span></button>`;
const rules = a => `<ol class="rules">${a.map(x => `<li><span>${x}</span></li>`).join('')}</ol>`;
const fmt = n => n.toLocaleString('fr-FR').replace(/ /g, ' ') + ' €';
const N = (q, a, unit = '', e = '', t = 40, tol) => ({ q, type: 'num', a, unit, e, t, tol });
const C = (q, opts, c, e = '', t = 30) => ({ q, type: 'qcm', opts, c, e, t });
const PHONE = `<div class="note">Cette séance se joue aussi <b>sur téléphone</b> : bouton « Quiz téléphone » en haut de l'écran. Les points sont calculés automatiquement.</div>`;

/* =================================================================== */
/* PARCOURS 1re STMG                                                    */
/* =================================================================== */
const DOM1 = [[12,'45 − 18'],[27,'100 − 64'],[36,'72 ÷ 8'],[9,'9 × 7'],[63,'150 ÷ 3'],[50,'83 − 29'],[54,'120 ÷ 5'],[24,'200 − 125'],[75,'75 ÷ 3'],[25,'1 000 − 960'],[40,'84 ÷ 4'],[21,'61 − 38'],[23,'23 × 4'],[92,'92 − 47'],[45,'180 ÷ 2'],[90,'90 ÷ 6'],[15,'15 × 8'],[120,'250 − 180'],[70,'70 ÷ 5'],[14,'500 − 444'],[56,'56 ÷ 7'],[8,'8 × 11'],[88,'88 ÷ 2 − 10'],[34,'51 − 39']];
const BINGO = [['10 % de 150','15'],['20 % de 150','30'],['50 % de 64','32'],['25 % de 200','50'],['5 % de 80','4'],['1 % de 700','7'],['75 % de 80','60'],['10 % de 45','4,5'],['30 % de 70','21'],['50 % de 17','8,5'],['20 % de 45','9'],['40 % de 30','12'],['15 % de 40','6'],['2 % de 250','5'],['10 % de 3','0,3'],['25 % de 44','11'],['60 % de 40','24'],['100 % de 18','18']];

const QV1 = [
 C("La valeur ajoutée mesure…", ["La richesse créée par l'entreprise","Le bénéfice de l'entreprise","Le chiffre d'affaires","Les dettes de l'entreprise"], 0, "La VA, c'est la richesse que l'entreprise crée elle-même, en plus de ce qu'elle achète aux autres."),
 C("Quelle est la bonne formule ?", ["VA = CA + consommations intermédiaires","VA = CA − consommations intermédiaires","VA = CA − salaires","VA = produits − charges"], 1, "VA = CA − consommations intermédiaires (CI). Produits − charges, c'est le résultat."),
 C("Pour une pizzeria, laquelle est une consommation intermédiaire ?", ["La farine","Le salaire du pizzaïolo","Le four acheté pour 10 ans","Les impôts"], 0, "Une CI est transformée pendant la production : la farine devient pizza. Le four est un investissement."),
 C("Pizzeria : CA = 50 000 €, CI = 20 000 €. VA ?", ["70 000 €","2,5 €","30 000 €","20 000 €"], 2, "50 000 − 20 000 = 30 000 €."),
 C("Studio d'enregistrement : CA = 80 000 €, CI = 35 000 €. VA ?", ["115 000 €","45 000 €","55 000 €","35 000 €"], 1, "80 000 − 35 000 = 45 000 €."),
 C("Boutique d'un club de foot : CA = 120 000 €, achats de maillots = 70 000 €, électricité = 5 000 €. VA ?", ["50 000 €","195 000 €","115 000 €","45 000 €"], 3, "CI = 70 000 + 5 000 = 75 000 €. VA = 120 000 − 75 000 = 45 000 €.", 40),
 C("Boulangerie : CA = 200 000 €, CI = 80 000 €, salaires = 70 000 €. VA ?", ["50 000 €","120 000 €","350 000 €","70 000 €"], 1, "Piège ! Les salaires ne sont pas des CI. VA = 200 000 − 80 000 = 120 000 €.", 40),
 C("VA = 60 000 € pour un CA de 150 000 €. Montant des CI ?", ["210 000 €","90 000 €","60 000 €","2,5 €"], 1, "CI = CA − VA = 150 000 − 60 000 = 90 000 €."),
 C("La VA passe de 40 000 € à 50 000 €. Taux de variation ?", ["+10 %","+20 %","+25 %","+80 %"], 2, "(50 000 − 40 000) ÷ 40 000 = 0,25 → +25 %. On divise par la valeur de DÉPART."),
 C("Cinéma : CA = 300 000 €, CI = 180 000 €. Quelle part du CA représente la VA ?", ["60 %","120 %","66,7 %","40 %"], 3, "VA = 120 000 €. 120 000 ÷ 300 000 = 0,40 → 40 % du CA.", 40)
];
const RELAIS1 = [
 ['Pizzeria « Bella Napoli »','4 000 pizzas × 12 €',18000,20000,4000,5000, 48000,30000,6000,'+20 %'],
 ['Studio de musique','400 heures × 50 €',6000,9000,1000,5000, 20000,14000,4000,'−20 %'],
 ['Boutique du club de foot','1 500 maillots × 60 €',54000,25000,3000,6400, 90000,36000,8000,'+25 %'],
 ['Cinéma de quartier','20 000 entrées × 8 €',70000,60000,18000,16000, 160000,90000,12000,'−25 %'],
 ['Food truck burgers','6 000 burgers × 9 €',21000,24000,6000,2000, 54000,33000,3000,'+50 %'],
 ['Pâtisserie','10 000 gâteaux × 4,50 €',15000,22000,4000,3000, 45000,30000,4000,'+33,3 %']
];
const dominoSlides = (DOM, intro) => [
 { kind: 'html', html: `<div class="eyebrow">Version téléphone · toute la classe</div><h2>C'est moi !</h2>
 <p class="lead">Chacun reçoit une carte résultat sur son téléphone. Une formule s'affiche au tableau : celui qui a le résultat a 5 secondes pour appuyer sur « C'est moi ! ».</p>
 ${rules(["Scannez le QR code, choisissez votre nom, tapez votre code.","Le professeur distribue les cartes : regardez bien votre résultat.","Une formule apparaît au tableau. Calculez de tête : est-ce votre résultat ?","Si oui, appuyez sur « C'est moi ! » en moins de 5 secondes. Sinon, ne touchez à rien.","La classe gagne la carte si <b>un seul élève</b> appuie et que c'est le bon."])}
 <div class="note">Bouton « Quiz téléphone » en haut de l'écran. Points pour la jauge : le pourcentage de cartes gagnées. Pas de téléphone ? Diapo suivante : la version papier.</div>` },
 { kind: 'html', html: `<div class="eyebrow">Dominos humains · toute la classe</div><h2>J'ai… Qui a ?</h2>
 <p class="lead">Une seule chaîne de 24 calculs. Si un maillon casse, toute la classe attend : on s'entraide !</p>
 ${rules(["Chaque élève reçoit une carte (fiches à imprimer). L'élève qui a la carte <b>★ DÉPART</b> commence.", `Il lit sa carte : « J'ai ${DOM[0][0]}. Qui a ${DOM[0][1]} ? »`, `Celui qui a la réponse (${DOM[1][0]}) se lève et lit sa carte à son tour.`, "La chaîne revient à la carte DÉPART : on arrête le chrono.", "Objectif : moins de 4 minutes. Puis on bat notre record !"])}
 <div class="note">Ici le chrono <b>monte</b> : lancez-le quand le premier élève lit sa carte. ${intro || ''}</div>` },
 { kind: 'html', html: `<div class="eyebrow">Pour le professeur</div><h2>L'ordre de la chaîne</h2><p>Touchez une carte pour vérifier la réponse si la classe bloque.</p>
 <div class="grid">${DOM.map((d, i) => tile('Carte ' + (i + 1) + (i == 0 ? ' · ★ départ' : ''), `J'ai ${d[0]}. Qui a ${d[1]} ?`, '→ ' + DOM[(i + 1) % 24][0])).join('')}</div>` },
 { kind: 'points', record: true, bareme: `<ul><li>Version téléphone : points = <b>pourcentage de cartes gagnées</b> (calculé automatiquement)</li><li>Version papier, chaîne bouclée en moins de 3 min : <b>100 pts</b></li><li>Moins de 4 min : <b>80 pts</b></li><li>Moins de 5 min : <b>60 pts</b></li><li>Chaîne terminée : <b>40 pts</b></li></ul>` }
];
const cardsOf = DOM => DOM.map((d, i) => ({ f: d[1], r: String(DOM[(i + 1) % 24][0]) }));
const LIVE_BAREME = `<li>Quiz téléphone : points = <b>taux de réussite de la classe</b>, <b>+10</b> au-delà de 80 % (max 100). Calculé automatiquement.</li>`;

const P1 = {
 label: '1re STMG',
 paliers: [
  { n: 1, name: 'Échauffement', d: 'Opérations de base', c: '--p1' },
  { n: 2, name: 'Pourcentages', d: 'Astuces et soldes', c: '--p2' },
  { n: 3, name: 'Taux de variation', d: 'Ça monte, ça descend', c: '--p3' },
  { n: 4, name: 'Calculs de gestion', d: 'Résultat et valeur ajoutée', c: '--p4' },
  { n: 5, name: 'Boss final', d: 'Tout le programme', c: '--p5' }
 ],
 seances: [
 { id: 1, p: 1, title: "J'ai… Qui a ?", short: 'Dominos humains', calc: 'no', mode: 'up', slides: dominoSlides(DOM1, "Moins de 24 élèves ? Donnez deux cartes aux plus à l'aise."), cards: cardsOf(DOM1) },
 { id: 2, p: 1, title: 'Les astuces secrètes du %', short: 'Quiz téléphone', calc: 'no', mode: 'down', slides: [
  { kind: 'html', html: `<div class="eyebrow">1 minute pour retenir</div><h2>Les astuces secrètes</h2>
  <div class="tricks"><div class="trick"><b>10 %</b><span>je divise par 10</span></div><div class="trick"><b>50 %</b><span>je prends la moitié</span></div><div class="trick"><b>25 %</b><span>la moitié de la moitié</span></div><div class="trick"><b>20 %</b><span>2 fois 10 %</span></div><div class="trick"><b>5 %</b><span>la moitié de 10 %</span></div><div class="trick"><b>1 %</b><span>je divise par 100</span></div></div>
  <div class="formula">10 % de 85 € → 85 ÷ 10 = 8,50 €</div>` },
  { kind: 'html', html: `<div class="eyebrow">Échauffement à main levée</div><h2>À vous !</h2><div class="grid">${tile('Cuisine','10 % de 60 €','6 €','60 ÷ 10')}${tile('Musique','50 % de 18 €','9 €','18 ÷ 2')}${tile('Foot','25 % de 40 €','10 €','40 ÷ 2 = 20, puis 20 ÷ 2')}${tile('Films','15 % de 200 €','30 €','10 % = 20 et 5 % = 10')}</div>` },
  { kind: 'html', html: `<div class="eyebrow">Défi sur téléphone</div><h2>Quiz « Les astuces du % »</h2>${rules(["Scannez le QR code affiché au tableau.","Choisissez votre nom et tapez votre code à 4 chiffres.","10 questions, 20 secondes chacune, sans calculatrice.","On ne joue pas les uns contre les autres : c'est le <b>taux de réussite de la classe</b> qui compte."])}` },
  { kind: 'points', bareme: `<ul>${LIVE_BAREME}</ul>` }],
  live: [
   C("Maillot de foot à 85 € : combien vaut une remise de 10 % ?", ["8,50 €","85 €","0,85 €","8 €"], 0, "85 ÷ 10 = 8,50 €", 20),
   C("Crampons à 240 € : combien font 10 % ?", ["2,40 €","24 €","240 €","34 €"], 1, "240 ÷ 10 = 24 €", 20),
   C("Place de concert à 46 € : combien font 50 % ?", ["23 €","92 €","26 €","4,60 €"], 0, "La moitié de 46 = 23 €", 20),
   C("Robot pâtissier à 80 € : combien font 25 % ?", ["25 €","32 €","20 €","4 €"], 2, "80 ÷ 4 = 20 €", 20),
   C("Abonnement streaming à 60 € par an : combien font 5 % ?", ["6 €","5 €","12 €","3 €"], 3, "10 % = 6 €, donc 5 % = 3 €", 20),
   C("Coffret de films à 35 € : combien font 20 % ?", ["3,50 €","7 €","17,50 €","15 €"], 1, "10 % = 3,50 € → 20 % = 7 €", 20),
   C("Combien font 1 % de 900 € ?", ["90 €","0,90 €","9 €","1 €"], 2, "900 ÷ 100 = 9 €", 20),
   C("Menu kebab à 7,50 € : combien font 10 % ?", ["0,75 €","7,50 €","0,075 €","75 €"], 0, "7,50 ÷ 10 = 0,75 €", 20),
   C("Casque audio à 60 € : combien font 75 % ?", ["15 €","40 €","35 €","45 €"], 3, "25 % = 15 € → 75 % = 45 €", 20),
   C("Combien font 15 % de 200 € ? (astuce : 10 % + 5 %)", ["35 €","30 €","20 €","15 €"], 1, "20 + 10 = 30 €", 30)
  ] },
 { id: 3, p: 2, title: 'Black Friday', short: 'Le juste prix des soldes', calc: 'no', mode: 'down', slides: [
  { kind: 'html', html: `<div class="eyebrow">L'outil secret des pros</div><h2>Le coefficient multiplicateur</h2>
  <div class="cols"><div><p class="lead">Une <b>baisse de 20 %</b> : je ne paie plus que 80 % du prix.</p><div class="formula">Prix × 0,80</div></div><div><p class="lead">Une <b>hausse de 10 %</b> : je paie 110 % du prix.</p><div class="formula">Prix × 1,10</div></div></div>
  ${rules(["6 équipes de 4, une feuille de réponses par équipe (ou le quiz téléphone, chacun pour soi).","8 produits à calculer en 5 minutes, sans calculatrice.","Astuce : calculez la remise, puis enlevez-la du prix."])}${PHONE}` },
  { kind: 'html', html: `<div class="eyebrow">Le catalogue · nouveau prix ?</div><h2>Trouvez le nouveau prix</h2><div class="grid">
  ${tile('Mode','Sneakers à 120 € · <span class="down">−20 %</span>','96 €','120 × 0,80 = 96')}${tile('Foot','Maillot à 90 € · <span class="down">−10 %</span>','81 €','90 − 9 = 81')}${tile('Musique','Casque audio à 60 € · <span class="down">−50 %</span>','30 €','La moitié de 60')}${tile('Films',"Place d'avant-première à 12 € · <span class=\"up\">+25 %</span>",'15 €','25 % de 12 = 3 → 12 + 3')}${tile('Cuisine','Plancha à 80 € · <span class="down">−25 %</span>','60 €','25 % de 80 = 20 → 80 − 20')}${tile('Musique','Abonnement à 10 €/mois · <span class="up">+20 %</span>','12 €/mois','20 % de 10 = 2')}${tile('Jeux vidéo','Console à 400 € · <span class="down">−15 %</span>','340 €','10 % = 40 et 5 % = 20 → 400 − 60')}${tile('Cuisine','Pizza à 14 € · <span class="up">+10 %</span> (livraison)','15,40 €','10 % de 14 = 1,40')}${tile('★ Bonus','Veste à 50 € : −30 %, puis encore −10 %','31,50 €',"50 × 0,70 = 35, puis 35 × 0,90 = 31,50. Deux remises ne s'additionnent pas : ce n'est pas −40 % !")}</div>` },
  { kind: 'points', bareme: `<ul><li>Équipes : <b>2 pts</b> par bonne réponse d'équipe (6 × 8 = 96) et <b>+4</b> si une équipe trouve le bonus</li>${LIVE_BAREME}</ul>` }],
  live: [
   N('Sneakers à 120 €, remise de 20 %. Nouveau prix ?', 96, '€', '120 × 0,80 = 96 €'),
   N('Maillot de foot à 90 €, remise de 10 %. Nouveau prix ?', 81, '€', '90 − 9 = 81 €'),
   N('Casque audio à 60 €, remise de 50 %. Nouveau prix ?', 30, '€', 'La moitié de 60 = 30 €'),
   N("Place d'avant-première à 12 €, hausse de 25 %. Nouveau prix ?", 15, '€', '12 + 3 = 15 €'),
   N('Plancha à 80 €, remise de 25 %. Nouveau prix ?', 60, '€', '80 − 20 = 60 €'),
   N('Abonnement musique à 10 €/mois, hausse de 20 %. Nouveau prix ?', 12, '€', '10 + 2 = 12 €'),
   N('Console à 400 €, remise de 15 %. Nouveau prix ?', 340, '€', '400 − 40 − 20 = 340 €'),
   N('Pizza à 14 €, +10 % pour la livraison. Nouveau prix ?', 15.4, '€', '14 + 1,40 = 15,40 €'),
   N('BONUS · Veste à 50 € : −30 %, puis encore −10 %. Prix final ?', 31.5, '€', "35 €, puis 35 × 0,90 = 31,50 €. Pas −40 % !", 50)
  ] },
 { id: 4, p: 2, title: 'Bingo des pourcentages', short: 'Grilles individuelles', calc: 'no', mode: 'down', slides: [
  { kind: 'html', html: `<div class="eyebrow">Chacun sa grille · défi collectif</div><h2>Bingo des pourcentages</h2>${rules(["Chaque élève reçoit une grille différente (fiches à imprimer).","Le professeur tire un calcul. 15 secondes pour le faire de tête.","Si le résultat est sur votre grille, barrez-le.","3 cases alignées : criez « LIGNE ! ». Grille complète : « BINGO ! »","Objectif de la classe : le plus d'élèves possible avec au moins une ligne."])}` },
  { kind: 'bingo', pool: BINGO },
  { kind: 'points', bareme: `<ul><li><b>4 pts</b> par élève qui a validé au moins une ligne (max 96)</li><li><b>+4 pts</b> si au moins un carton plein</li></ul>` }] },
 { id: 5, p: 3, title: 'Ça monte ou ça descend ?', short: 'Debout ou assis', calc: 'half', mode: 'down', slides: [
  { kind: 'html', html: `<div class="eyebrow">Manche 1 · sans calcul</div><h2>Hausse ou baisse ?</h2><p class="lead"><b>Debout</b> = ça monte. <b>Assis</b> = ça descend. Votez avec votre corps !</p><div class="grid">
  ${tile('Films','Place de cinéma : 9 € → 11 €','Hausse ↑')}${tile('Cuisine',"Abonnés d'un youtubeur cuisine : 52 000 → 48 000",'Baisse ↓')}${tile('Foot',"Buts d'un attaquant : 18 → 24",'Hausse ↑')}${tile('Jeux vidéo',"Prix d'un jeu un an après : 70 € → 35 €",'Baisse ↓')}${tile('Musique',"Écoutes d'un single : 2 M → 2,4 M",'Hausse ↑')}</div><p class="small">Chiffres inventés pour l'exercice.</p>` },
  { kind: 'html', html: `<div class="eyebrow">Manche 2 · estimation</div><h2>Plus ou moins de 10 % ?</h2><p class="lead"><b>Debout</b> = la variation dépasse 10 % (en hausse ou en baisse). <b>Assis</b> = moins de 10 %.</p><div class="grid">
  ${tile('Astuce','100 € → 105 €','Moins de 10 %',"+5 €, c'est 5 % de 100")}${tile('Foot','40 places → 50 places','Plus de 10 %',"+10 sur 40, c'est un quart : +25 %")}${tile('Musique','200 € → 190 €','Moins de 10 %','−10 sur 200 : −5 %')}${tile('Cuisine','80 kg → 60 kg','Plus de 10 %','−20 sur 80 : −25 %')}${tile('Cuisine','Baguette : 1,20 € → 1,30 €','Moins de 10 %','10 % de 1,20 = 0,12 ; la hausse est de 0,10')}</div>` },
  { kind: 'html', html: `<div class="eyebrow">Manche 3 · calculatrice autorisée</div><h2>Le calcul exact</h2><div class="formula">(Valeur d'arrivée − Valeur de départ) ÷ Valeur de départ × 100</div><p>Par équipes de 4, ou chacun sur téléphone.</p><div class="grid">
  ${tile('Films','9 € → 11 €','+22,2 %','2 ÷ 9 = 0,222')}${tile('Cuisine','52 000 → 48 000','−7,7 %','−4 000 ÷ 52 000 = −0,077')}${tile('Foot','18 → 24','+33,3 %','6 ÷ 18 = 0,333')}${tile('Jeux vidéo','70 € → 35 €','−50 %','−35 ÷ 70 = −0,5')}${tile('Musique','2 M → 2,4 M','+20 %','0,4 ÷ 2 = 0,2')}</div>${PHONE}` },
  { kind: 'points', bareme: `<ul><li>Manches 1 et 2 : <b>6 pts</b> par question où la majorité vote juste (max 60)</li><li>Manche 3 en équipes : <b>8 pts</b> par calcul réussi par au moins 4 équipes sur 6 (max 40)</li>${LIVE_BAREME.replace('Quiz téléphone', 'Manche 3 sur téléphone')}</ul>` }],
  live: [
   N('Place de cinéma : 9 € → 11 €. Taux de variation en % ? (arrondi à 0,1)', 22.2, '%', '(11 − 9) ÷ 9 × 100 = +22,2 %', 45, 0.3),
   N('Abonnés : 52 000 → 48 000. Taux de variation en % ? (mettez − si baisse)', -7.7, '%', '−4 000 ÷ 52 000 × 100 = −7,7 %', 45, 0.3),
   N("Buts d'un attaquant : 18 → 24. Taux de variation en % ?", 33.3, '%', '6 ÷ 18 × 100 = +33,3 %', 45, 0.4),
   N("Prix d'un jeu : 70 € → 35 €. Taux de variation en % ? (mettez − si baisse)", -50, '%', '−35 ÷ 70 × 100 = −50 %', 40),
   N("Écoutes d'un single : 2 M → 2,4 M. Taux de variation en % ?", 20, '%', '0,4 ÷ 2 × 100 = +20 %', 40)
  ] },
 { id: 6, p: 3, title: 'Cadenas éclair', short: 'Mini escape game', calc: 'yes', mode: 'down', slides: [
  { kind: 'html', html: `<div class="eyebrow">Mini escape game · toute la classe</div><h2>Ouvrez le cadenas</h2>${rules(["Chaque énigme est un taux de variation à calculer (calculatrice autorisée).","Le chiffre du code = <b>le chiffre des dizaines du taux</b>, sans le signe. Exemple : −40 % donne 4.","Les 3 chiffres forment le code du cadenas.","Un porte-parole tape le code au tableau. 3 essais par cadenas.","Cadenas 1 ouvert ? Un cadenas bonus vous attend."])}` },
  { kind: 'lock', code: '347', name: 'Cadenas 1', rule: 'chiffre des dizaines du taux', en: [['A · Foot','Billet de stade : 40 € → 52 €','+30 % → 3','12 ÷ 40 = 0,30'],['B · Cuisine','Kilo de tomates : 2,50 € → 1,50 €','−40 % → 4','−1 ÷ 2,50 = −0,40'],['C · Musique',"Abonnés d'une chanteuse : 8 000 → 13 600",'+70 % → 7','5 600 ÷ 8 000 = 0,70']] },
  { kind: 'lock', code: '156', name: 'Cadenas bonus', rule: 'chiffre des dizaines du taux', en: [['D · Films',"Entrées d'un film : 250 000 → 225 000",'−10 % → 1','−25 000 ÷ 250 000 = −0,10'],['E · Cinéma','Pot de pop-corn : 6 € → 9 €','+50 % → 5','3 ÷ 6 = 0,50'],['F · Foot',"Vues d'un résumé de match : 500 000 → 800 000",'+60 % → 6','300 000 ÷ 500 000 = 0,60']] },
  { kind: 'points', bareme: `<ul><li>Cadenas 1 ouvert : <b>70 pts</b></li><li>Cadenas bonus ouvert : <b>+30 pts</b></li><li>Pas de pénalité pour les essais ratés</li></ul>` }] },
 { id: 7, p: 4, title: 'Mon food truck', short: 'Bénéfice ou perte ?', calc: 'yes', mode: 'down', slides: [
  { kind: 'html', html: `<div class="eyebrow">Le food truck de Sami · une semaine</div><h2>Bénéfice ou perte ?</h2>
  <div class="cols"><div class="tw"><table class="data"><thead><tr><th>Produits</th><th>Montant</th></tr></thead><tbody><tr><td>Ventes de burgers</td><td>2 400 €</td></tr><tr><td>Ventes de boissons</td><td>600 €</td></tr></tbody></table>
  <table class="data" style="margin-top:14px"><thead><tr><th>Charges</th><th>Montant</th></tr></thead><tbody><tr><td>Viande et pain</td><td>1 100 €</td></tr><tr><td>Boissons achetées</td><td>250 €</td></tr><tr><td>Carburant</td><td>150 €</td></tr><tr><td>Location de l'emplacement</td><td>400 €</td></tr><tr><td>Salaire du commis</td><td>700 €</td></tr></tbody></table></div>
  <div class="grid one">${tile('Question 1','Total des produits ?','3 000 €','2 400 + 600')}${tile('Question 2','Total des charges ?','2 600 €','1 100 + 250 + 150 + 400 + 700')}${tile('Question 3','Résultat : bénéfice ou perte ?','Bénéfice de 400 €','3 000 − 2 600 = 400')}</div></div>${PHONE}` },
  { kind: 'html', html: `<div class="eyebrow">Et si… ? On repart à chaque fois de la situation de départ</div><h2>Les coups durs de Sami</h2><div class="grid g3">
  ${tile('Question 4','Le propriétaire augmente la location de 10 %. Nouveau résultat ?','Bénéfice de 360 €','Location : 440 €. Charges : 2 640 €. 3 000 − 2 640 = 360')}${tile('Question 5','Il pleut toute la semaine : ventes de burgers −20 %. Nouveau résultat ?','Perte de 80 €','Burgers : 1 920 €. Produits : 2 520 €. 2 520 − 2 600 = −80')}${tile('★ Bonus',"Dans la question 5, combien de burgers à 8 € faut-il vendre en plus pour ne plus perdre d'argent ?",'10 burgers','80 ÷ 8 = 10')}</div><div class="note">Simplification : on suppose que les autres charges ne changent pas.</div>` },
  { kind: 'points', bareme: `<ul><li>Équipes : <b>18 pts</b> par question (1 à 5) réussie par au moins 4 équipes sur 6, <b>+10</b> pour le bonus</li>${LIVE_BAREME}</ul>` }],
  live: [
   N('Food truck : ventes de burgers 2 400 €, boissons 600 €. Total des produits ?', 3000, '€', '2 400 + 600 = 3 000 €'),
   N('Charges : 1 100 + 250 + 150 + 400 + 700. Total des charges ?', 2600, '€', '= 2 600 €'),
   N('Résultat de la semaine ? (négatif si perte)', 400, '€', '3 000 − 2 600 = 400 € de bénéfice'),
   N('La location (400 €) augmente de 10 %. Nouveau résultat ?', 360, '€', 'Charges : 2 640 €. 3 000 − 2 640 = 360 €', 50),
   N('Retour au départ. Les ventes de burgers (2 400 €) baissent de 20 %. Nouveau résultat ? (− si perte)', -80, '€', '1 920 + 600 = 2 520 ; 2 520 − 2 600 = −80 € : perte', 60),
   N('BONUS · Combien de burgers à 8 € faut-il vendre en plus pour combler cette perte de 80 € ?', 10, 'burgers', '80 ÷ 8 = 10', 40)
  ] },
 { id: 8, p: 4, title: 'Qui veut gagner des points ?', short: 'Spécial valeur ajoutée', calc: 'yes', mode: 'down', slides: [
  { kind: 'html', html: `<div class="eyebrow">Jeu télé · toute la classe joue ensemble</div><h2>Qui veut gagner des points ?</h2>${rules(["10 questions sur la valeur ajoutée, de plus en plus difficiles.","Pour chaque question : 20 secondes de réflexion, puis vote à main levée.","Un capitaine (qui change à chaque question) annonce la réponse finale.","3 jokers, une seule fois chacun : 50/50, l'avis de la classe, l'appel à un ami (30 s)."])}<div class="formula">VA = Chiffre d'affaires − Consommations intermédiaires</div>${PHONE}` },
  { kind: 'qcm', questions: QV1 },
  { kind: 'points', bareme: `<ul><li>Jeu au tableau : <b>10 pts</b> par bonne réponse (max 100)</li>${LIVE_BAREME}</ul>` }],
  live: QV1 },
 { id: 9, p: 4, title: 'Le relais de la gestion', short: 'Équipes de 4', calc: 'yes', mode: 'down', slides: [
  { kind: 'html', html: `<div class="eyebrow">Relais · une feuille passe de main en main</div><h2>Le relais de la gestion</h2>${rules(["<b>Relayeur 1</b> : le chiffre d'affaires (quantité × prix).","<b>Relayeur 2</b> : la valeur ajoutée (CA − CI).","<b>Relayeur 3</b> : le résultat (CA − toutes les charges : CI + salaires + autres).","<b>Relayeur 4</b> : le taux de variation du résultat par rapport à l'an dernier.","Chacun ne fait que SON étape, puis passe la feuille. L'équipe vérifie ensemble à la fin."])}` },
  { kind: 'html', html: `<div class="eyebrow">Les données · une entreprise par équipe</div><h2>À vos calculatrices</h2><div class="tw"><table class="data"><thead><tr><th>Équipe · entreprise</th><th>Ventes</th><th>CI</th><th>Salaires</th><th>Autres charges</th><th>Résultat N−1</th></tr></thead><tbody>${RELAIS1.map((r, i) => `<tr><td><b>${i + 1}</b> · ${r[0]}</td><td>${r[1]}</td><td>${fmt(r[2])}</td><td>${fmt(r[3])}</td><td>${fmt(r[4])}</td><td>${fmt(r[5])}</td></tr>`).join('')}</tbody></table></div>` },
  { kind: 'html', html: `<div class="eyebrow">Correction</div><h2>Où l'erreur s'est-elle glissée ?</h2><div class="tw"><table class="data"><thead><tr><th>Équipe</th><th>1 · CA</th><th>2 · VA</th><th>3 · Résultat</th><th>4 · Taux</th></tr></thead><tbody>${RELAIS1.map((r, i) => `<tr><td><b>${i + 1}</b> · ${r[0]}</td><td class="hidden-ans">${fmt(r[6])}</td><td class="hidden-ans">${fmt(r[7])}</td><td class="hidden-ans">${fmt(r[8])}</td><td class="hidden-ans">${r[9]}</td></tr>`).join('')}</tbody></table></div><button class="btn go" data-reveal>Afficher la correction</button>` },
  { kind: 'points', bareme: `<ul><li><b>4 pts</b> par étape juste (6 équipes × 4 étapes = 96 pts)</li><li><b>+4 pts</b> si toutes les équipes terminent avant la fin du chrono</li></ul>` }] },
 { id: 10, p: 5, title: 'La classe contre le Boss', short: 'Quiz téléphone final', calc: 'yes', mode: 'down', slides: [
  { kind: 'html', html: `<div class="eyebrow">Boss final · tout le programme</div><h2>La classe contre le Boss</h2>${rules(["Quiz téléphone « Boss final » : 12 questions qui reprennent les 9 séances.","Chacun répond sur son téléphone. Calculatrice autorisée.","Le Boss est vaincu si la classe atteint <b>70 % de bonnes réponses</b>.","Le classement des classes s'affiche sur l'écran d'accueil."])}` },
  { kind: 'html', html: `<div class="eyebrow">Avant de partir</div><h2>Regardez d'où vous êtes partis</h2><p class="lead">Sur votre téléphone, ouvrez « Mon carnet ». Comparez votre ressenti de la séance 1 et celui d'aujourd'hui.</p>` },
  { kind: 'points', bareme: `<ul><li>Boss vaincu (70 % ou plus) : <b>100 pts</b></li><li>Sinon : points = taux de réussite de la classe</li></ul>` }],
  bossRule: true,
  live: [
   C('45 − 18 = ?', ['27','33','23','37'], 0, '45 − 18 = 27', 20),
   C('10 % de 85 € = ?', ['0,85 €','8,50 €','85 €','18,50 €'], 1, '85 ÷ 10 = 8,50 €', 20),
   C('Baskets à 120 € soldées à −25 %. Nouveau prix ?', ['30 €','95 €','90 €','100 €'], 2, '120 × 0,75 = 90 €'),
   C('Ticket de concert à 50 € en hausse de 10 %. Nouveau prix ?', ['60 €','55 €','51 €','5 €'], 1, '50 + 5 = 55 €'),
   C('Taux de variation : de 20 € à 25 € ?', ['+5 %','+20 %','+25 %','+125 %'], 2, '5 ÷ 20 = +25 %'),
   C("Abonnés d'une chaîne cuisine : 10 000 → 8 000. Taux ?", ['−20 %','−2 %','+20 %','−25 %'], 0, '−2 000 ÷ 10 000 = −20 %'),
   C('Produits = 5 000 €, charges = 5 600 €. Résultat ?', ['Bénéfice de 600 €','Perte de 600 €','10 600 €','Perte de 6 000 €'], 1, '5 000 − 5 600 = −600 € : perte'),
   C('Quelle est la formule de la valeur ajoutée ?', ['CA + consommations intermédiaires','CA − consommations intermédiaires','Produits − charges','CA − salaires'], 1, 'VA = CA − CI', 20),
   C('Restaurant : CA = 90 000 €, CI = 35 000 €. Valeur ajoutée ?', ['125 000 €','65 000 €','55 000 €','45 000 €'], 2, '90 000 − 35 000 = 55 000 €'),
   C('150 ÷ 6 = ?', ['25','24','30','15'], 0, '150 ÷ 6 = 25', 20),
   C("Un film passe de 2 millions à 3 millions d'entrées. Taux ?", ['+33 %','+100 %','+1 %','+50 %'], 3, '1 ÷ 2 = +50 %'),
   C("200 pizzas vendues à 11 €. Chiffre d'affaires ?", ['2 200 €','211 €','220 €','22 000 €'], 0, '200 × 11 = 2 200 €', 20)
  ] }
 ]
};

/* =================================================================== */
/* PARCOURS TERMINALE STMG · GESTION ET FINANCE                         */
/* =================================================================== */
const DOMT = [[40,'20 % de 250'],[50,'120 × 0,75'],[90,'25 % de 120'],[30,'80 × 1,25'],[100,'15 % de 400'],[60,'200 − 15 % de 200'],[170,'10 % de 450'],[45,'1 % de 2 000'],[20,'60 × 1,10'],[66,'50 % de 150'],[75,'300 × 0,40'],[120,'5 % de 500'],[25,'35 + 10 % de 350'],[70,'140 × 0,25'],[35,'30 % de 80'],[24,'150 × 1,20'],[180,'75 % de 12'],[9,'2 % de 600'],[12,'50 × 1,60'],[80,'40 % de 140'],[56,'250 × 0,60'],[150,'20 % de 55'],[11,'4 % de 700'],[28,'8 % de 500']];

const QVT = [
 C('La rentabilité financière mesure…', ["Ce que rapportent les capitaux apportés par les associés","Ce que rapportent toutes les ressources de l'entreprise","Le chiffre d'affaires par salarié","La trésorerie disponible"], 0, 'Rentabilité financière = rentabilité des capitaux propres, du point de vue des associés.'),
 C('Quelle est la formule de la rentabilité financière ?', ['Résultat net ÷ CA × 100','Résultat net ÷ capitaux propres × 100','CA ÷ capitaux propres × 100','Capitaux propres ÷ résultat net × 100'], 1, 'RF = résultat net ÷ capitaux propres × 100.'),
 C('Résultat net = 30 000 €, capitaux propres = 200 000 €. Rentabilité financière ?', ['6,67 %','15 %','30 %','1,5 %'], 1, '30 000 ÷ 200 000 = 0,15 → 15 %.', 40),
 C('Quelle est la formule de la rentabilité économique ?', ["Résultat d'exploitation ÷ capitaux investis × 100",'Résultat net ÷ capitaux propres × 100',"CA ÷ capitaux investis × 100","Capitaux investis ÷ résultat d'exploitation × 100"], 0, "RE = résultat d'exploitation ÷ capitaux investis (actif économique) × 100."),
 C("Résultat d'exploitation = 45 000 €, capitaux investis = 300 000 €. Rentabilité économique ?", ['15 %','6,67 %','45 %','30 %'], 0, '45 000 ÷ 300 000 = 0,15 → 15 %.', 40),
 C('Entreprise A : RF = 8 %. Entreprise B : RF = 12 %. Où un associé préfère-t-il investir ?', ['Entreprise A','Entreprise B','C\'est identique','Impossible à dire'], 1, 'Chaque euro apporté rapporte plus chez B : 12 centimes par an contre 8.'),
 C('Capitaux propres = 150 000 €. Les associés veulent une RF de 10 %. Résultat net nécessaire ?', ['1 500 €','10 000 €','15 000 €','150 000 €'], 2, '150 000 × 10 % = 15 000 €.', 40),
 C("Marge = 20 000 €, coût d'achat des marchandises = 80 000 €. Taux de marge ?", ['20 %','25 %','80 %','4 %'], 1, "Taux de marge = marge ÷ coût d'achat = 20 000 ÷ 80 000 = 25 %.", 40),
 C('Marge = 20 000 €, CA HT = 100 000 €. Taux de marque ?', ['20 %','25 %','80 %','5 %'], 0, 'Taux de marque = marge ÷ prix de vente HT = 20 000 ÷ 100 000 = 20 %.', 40),
 C('Capitaux propres stables à 200 000 €. Le résultat net passe de 24 000 € à 30 000 €. La RF passe de 12 % à…', ['13 %','15 %','18 %','25 %'], 1, '30 000 ÷ 200 000 = 15 %.', 40)
];
const RELAIST = [
 // entreprise, Q, PV, CVu, CF, -> CA, MCV, TMCV, SR, PM
 ['Pizzeria « Bella Napoli »', 10000, 12, 4.8, 36000],
 ['Studio de musique', 1200, 50, 20, 30000],
 ['Boutique du club de foot', 4000, 60, 36, 32000],
 ['Cinéma de quartier', 25000, 8, 2, 120000],
 ['Food truck burgers', 8000, 10, 5, 30000],
 ['Pâtisserie', 20000, 4, 1.6, 30000]
].map(([n, q, pv, cvu, cf]) => {
  const ca = q * pv, mcv = ca - q * cvu, t = mcv / ca, sr = cf / t, pm = sr / ca * 12;
  return { n, q, pv, cvu, cf, ca, mcv, t, sr, pm };
});
const fr = (x, d = 2) => Number(x.toFixed(d)).toLocaleString('fr-FR');

const PT = {
 label: 'Terminale STMG · Gestion et finance',
 paliers: [
  { n: 1, name: 'Rappels', d: 'Pourcentages et coefficients', c: '--p1' },
  { n: 2, name: 'Coûts et marges', d: 'Du coût d\'achat au prix de vente', c: '--p2' },
  { n: 3, name: 'Seuil de rentabilité', d: 'Charges fixes, MCV, point mort', c: '--p3' },
  { n: 4, name: 'Rentabilité', d: 'Économique et financière', c: '--p4' },
  { n: 5, name: 'Boss final', d: 'Tout le programme', c: '--p5' }
 ],
 seances: [
 { id: 1, p: 1, title: "J'ai… Qui a ? Spécial %", short: 'Dominos humains', calc: 'no', mode: 'up', slides: dominoSlides(DOMT, 'Version Terminale : pourcentages et coefficients.'), cards: cardsOf(DOMT) },
 { id: 2, p: 1, title: 'Coefficients et taux', short: 'Quiz téléphone', calc: 'no', mode: 'down', slides: [
  { kind: 'html', html: `<div class="eyebrow">Les réflexes à avoir</div><h2>Coefficient multiplicateur</h2>
  <div class="tricks"><div class="trick"><b>+20 %</b><span>× 1,20</span></div><div class="trick"><b>−35 %</b><span>× 0,65</span></div><div class="trick"><b>+8 %</b><span>× 1,08</span></div><div class="trick"><b>HT → TTC</b><span>× 1,20 (TVA 20 %)</span></div><div class="trick"><b>TTC → HT</b><span>÷ 1,20</span></div><div class="trick"><b>Deux hausses</b><span>on multiplie les coefficients</span></div></div>
  <div class="formula">+10 % puis +10 % → 1,10 × 1,10 = 1,21 → +21 %</div>` },
  { kind: 'html', html: `<div class="eyebrow">Défi sur téléphone</div><h2>Quiz « Coefficients et taux »</h2>${rules(["Scannez le QR code affiché au tableau.","Choisissez votre nom et tapez votre code à 4 chiffres.","10 questions, sans calculatrice.","C'est le <b>taux de réussite de la classe</b> qui compte."])}` },
  { kind: 'points', bareme: `<ul>${LIVE_BAREME}</ul>` }],
  live: [
   N('Hausse de 20 % : coefficient multiplicateur ?', 1.2, '', '1 + 0,20 = 1,20', 25),
   N('Baisse de 35 % : coefficient multiplicateur ?', 0.65, '', '1 − 0,35 = 0,65', 25),
   C('Un coefficient de 1,08 correspond à…', ['+8 %','+108 %','−8 %','+0,8 %'], 0, '1,08 = 1 + 0,08 → +8 %', 20),
   N('Prix de 250 € augmenté de 12 %. Nouveau prix ?', 280, '€', '250 × 1,12 = 280 €'),
   N('Prix de 80 € après une baisse de 15 %. Nouveau prix ?', 68, '€', '80 × 0,85 = 68 €'),
   N("Le CA passe de 400 000 € à 460 000 €. Taux de variation en % ?", 15, '%', '60 000 ÷ 400 000 = 15 %'),
   C('Hausse de 10 %, puis encore hausse de 10 %. Variation globale ?', ['+20 %','+21 %','+11 %','+100 %'], 1, '1,10 × 1,10 = 1,21 → +21 %'),
   C('Baisse de 50 %, puis hausse de 50 %. Variation globale ?', ['0 %','−25 %','+25 %','−50 %'], 1, '0,5 × 1,5 = 0,75 → −25 %'),
   N('Prix TTC = 120 € avec une TVA à 20 %. Prix HT ?', 100, '€', '120 ÷ 1,20 = 100 €'),
   N('Après une hausse de 25 %, un prix vaut 150 €. Prix de départ ?', 120, '€', '150 ÷ 1,25 = 120 €. On divise, on ne retire pas 25 % !', 45)
  ] },
 { id: 3, p: 2, title: 'La Crêpe Volante', short: 'Du coût d\'achat au coût de revient', calc: 'yes', mode: 'down', slides: [
  { kind: 'html', html: `<div class="eyebrow">Hiérarchie des coûts · 2 000 crêpes par mois</div><h2>La Crêpe Volante</h2>
  <div class="cols"><div class="tw"><table class="data"><thead><tr><th>Données du mois</th><th>Montant</th></tr></thead><tbody>
  <tr><td>Achats farine, œufs, lait</td><td>1 400 €</td></tr><tr><td>Transport des achats</td><td>100 €</td></tr><tr><td>Main-d'œuvre de production</td><td>1 800 €</td></tr><tr><td>Énergie des crêpières</td><td>300 €</td></tr><tr><td>Emballages de vente</td><td>200 €</td></tr><tr><td>Publicité</td><td>200 €</td></tr><tr class="tot"><td>Prix de vente d'une crêpe</td><td>3,50 €</td></tr></tbody></table></div>
  <div><div class="formula small-f">Coût d'achat → + production → coût de production → + distribution → coût de revient</div>${rules(['Par équipes de 4, ou chacun sur téléphone.','Calculez chaque coût, puis le résultat.'])}</div></div>${PHONE}` },
  { kind: 'html', html: `<div class="eyebrow">Correction</div><h2>Étape par étape</h2><div class="grid">
  ${tile('Étape 1',"Coût d'achat des matières ?",'1 500 €','1 400 + 100')}${tile('Étape 2','Coût de production ? (et par crêpe)','3 600 € · 1,80 €','1 500 + 1 800 + 300 = 3 600 ; ÷ 2 000')}${tile('Étape 3','Coût de revient ? (et par crêpe)','4 000 € · 2,00 €','3 600 + 200 + 200')}${tile('Étape 4','Résultat du mois ? (et par crêpe)','3 000 € · 1,50 €','CA = 2 000 × 3,50 = 7 000 ; 7 000 − 4 000')}${tile('★ Bonus','Le prix de vente baisse de 20 %. Nouveau résultat du mois ?','1 600 €','Prix : 2,80 € ; CA : 5 600 € ; 5 600 − 4 000')}</div>` },
  { kind: 'points', bareme: `<ul><li>Équipes : <b>20 pts</b> par étape réussie par au moins 4 équipes sur 6 (max 80), <b>+20</b> pour le bonus</li>${LIVE_BAREME}</ul>` }],
  live: [
   N("Achats 1 400 € + transport 100 €. Coût d'achat des matières ?", 1500, '€', '1 400 + 100 = 1 500 €', 30),
   N('Coût de production du mois ? (coût d\'achat + main-d\'œuvre 1 800 € + énergie 300 €)', 3600, '€', '1 500 + 1 800 + 300 = 3 600 €', 45),
   N('Coût de production d\'UNE crêpe ? (2 000 crêpes)', 1.8, '€', '3 600 ÷ 2 000 = 1,80 €', 40),
   N('Coût de revient du mois ? (+ emballages 200 € + publicité 200 €)', 4000, '€', '3 600 + 400 = 4 000 €', 40),
   N('Résultat du mois ? (2 000 crêpes vendues 3,50 €)', 3000, '€', 'CA = 7 000 € ; 7 000 − 4 000 = 3 000 €', 50),
   N('BONUS · Le prix baisse de 20 %. Nouveau résultat du mois ?', 1600, '€', '2,80 × 2 000 = 5 600 ; 5 600 − 4 000 = 1 600 €', 60)
  ] },
 { id: 4, p: 2, title: 'Marge ou marque ?', short: 'Le duel des taux', calc: 'yes', mode: 'down', slides: [
  { kind: 'html', html: `<div class="eyebrow">Ne plus jamais confondre</div><h2>Marge ou marque ?</h2>
  <div class="cols"><div><p class="lead"><b>Taux de marge</b> : on compare au <b>coût d'achat</b>.</p><div class="formula">Marge ÷ Coût d'achat HT × 100</div></div><div><p class="lead"><b>Taux de marque</b> : on compare au <b>prix de vente</b>.</p><div class="formula">Marge ÷ Prix de vente HT × 100</div></div></div>
  <div class="note">Moyen mnémotechnique : <b>marQUE</b> comme « ce que voit le client », le prix de vente. La marge unitaire = PV HT − coût d'achat HT.</div>` },
  { kind: 'html', html: `<div class="eyebrow">Échauffement</div><h2>Sneakers achetées 60 € HT, vendues 90 € HT</h2><div class="grid">${tile('1','Marge unitaire ?','30 €','90 − 60')}${tile('2','Taux de marge ?','50 %','30 ÷ 60')}${tile('3','Taux de marque ?','33,3 %','30 ÷ 90')}${tile('4','Lequel est le plus grand ?','Le taux de marge','On divise par un nombre plus petit, le coût d\'achat')}</div>${PHONE}` },
  { kind: 'points', bareme: `<ul>${LIVE_BAREME}</ul>` }],
  live: [
   N('Sneakers achetées 60 € HT, vendues 90 € HT. Marge unitaire ?', 30, '€', '90 − 60 = 30 €', 25),
   N('Même cas. Taux de marge en % ?', 50, '%', '30 ÷ 60 = 50 %', 30),
   N('Même cas. Taux de marque en % ? (arrondi à 0,1)', 33.3, '%', '30 ÷ 90 = 33,3 %', 35, 0.2),
   N("Coût d'achat 40 € HT, taux de marge 25 %. Prix de vente HT ?", 50, '€', '40 × 1,25 = 50 €', 40),
   N('Prix de vente HT 200 €, taux de marque 40 %. Marge unitaire ?', 80, '€', '200 × 40 % = 80 €', 40),
   N("Maillot acheté 25 € HT, vendu 75 € TTC (TVA 20 %). Marge unitaire HT ?", 37.5, '€', 'PV HT = 75 ÷ 1,20 = 62,50 ; 62,50 − 25 = 37,50 €', 60),
   C('Pour une marge positive, quel taux est toujours le plus grand ?', ['Le taux de marge','Le taux de marque','Ils sont toujours égaux','Ça dépend du produit'], 0, 'Même marge, mais on divise par le coût d\'achat, plus petit que le prix de vente.', 30),
   N("Pizzeria : 1 000 pizzas vendues 12 € HT, coût d'achat 4 € HT par pizza. Marge globale ?", 8000, '€', '(12 − 4) × 1 000 = 8 000 €', 45)
  ] },
 { id: 5, p: 3, title: 'Fixe ou variable ?', short: 'Debout ou assis', calc: 'half', mode: 'down', slides: [
  { kind: 'html', html: `<div class="eyebrow">Manche 1 · sans calcul</div><h2>Fixe ou variable ?</h2><p class="lead"><b>Debout</b> = charge variable (elle suit l'activité). <b>Assis</b> = charge fixe.</p><div class="grid">
  ${tile('Pizzeria','Le loyer du local','Fixe','Même montant, qu\'on vende 10 ou 1 000 pizzas')}${tile('Pizzeria','La farine des pizzas','Variable','Plus de pizzas = plus de farine')}${tile('Boutique','Le salaire mensuel du gérant','Fixe')}${tile('Boutique','La commission de 5 % des vendeurs','Variable','Elle dépend des ventes')}${tile('Studio','L\'assurance annuelle','Fixe')}${tile('Food truck','Les emballages des livraisons','Variable')}</div>` },
  { kind: 'html', html: `<div class="eyebrow">Manche 2 · calculatrice autorisée</div><h2>Le tableau de résultat différentiel</h2>
  <div class="cols"><div class="tw"><table class="data"><tbody><tr><td>Chiffre d'affaires</td><td>60 000 €</td></tr><tr><td>− Charges variables</td><td>24 000 €</td></tr><tr class="tot"><td>= Marge sur coût variable (MCV)</td><td class="hidden-ans">36 000 €</td></tr><tr><td>Taux de MCV</td><td class="hidden-ans">60 %</td></tr><tr><td>− Charges fixes</td><td>27 000 €</td></tr><tr class="tot"><td>= Résultat</td><td class="hidden-ans">9 000 €</td></tr></tbody></table></div>
  <div><div class="formula small-f">MCV = CA − charges variables<br>Taux de MCV = MCV ÷ CA<br>Résultat = MCV − charges fixes</div><button class="btn go" data-reveal>Afficher la correction</button></div></div>
  <div class="grid">${tile('★ Bonus','Le CA augmente de 10 % (les charges variables suivent). Nouveau résultat ?','12 600 € (+40 %)','MCV : 39 600 € ; 39 600 − 27 000. Le résultat grimpe plus vite que le CA !')}</div>${PHONE}` },
  { kind: 'points', bareme: `<ul><li>Manche 1 : <b>8 pts</b> par question où la majorité vote juste (max 48)</li><li>Manche 2 en équipes : <b>13 pts</b> par calcul réussi par au moins 4 équipes sur 6 (max 52)</li>${LIVE_BAREME.replace('Quiz téléphone', 'Manche 2 sur téléphone')}</ul>` }],
  live: [
   N('CA = 60 000 €, charges variables = 24 000 €. Marge sur coût variable ?', 36000, '€', '60 000 − 24 000 = 36 000 €', 35),
   N('Taux de marge sur coût variable en % ?', 60, '%', '36 000 ÷ 60 000 = 60 %', 35),
   N('Charges fixes = 27 000 €. Résultat ?', 9000, '€', '36 000 − 27 000 = 9 000 €', 35),
   N('BONUS · Le CA augmente de 10 % (charges variables proportionnelles). Nouveau résultat ?', 12600, '€', 'MCV = 66 000 × 60 % = 39 600 ; − 27 000 = 12 600 €', 60)
  ] },
 { id: 6, p: 3, title: 'Cadenas du point mort', short: 'Mini escape game', calc: 'yes', mode: 'down', slides: [
  { kind: 'html', html: `<div class="eyebrow">Mini escape game · toute la classe</div><h2>Le cadenas du point mort</h2>
  <div class="formula small-f">Seuil de rentabilité = Charges fixes ÷ Taux de MCV<br>Point mort (en mois) = SR ÷ CA annuel × 12</div>
  ${rules(["Chaque énigme : calculez le seuil de rentabilité, puis le point mort en mois.","Le chiffre du code = <b>le point mort en mois</b>.","Un porte-parole tape le code au tableau. 3 essais par cadenas.","On suppose des ventes régulières sur l'année."])}` },
  { kind: 'lock', code: '946', name: 'Cadenas 1', rule: 'point mort en mois', en: [['A · Salon de coiffure','CF = 36 000 € · taux de MCV = 40 % · CA annuel = 120 000 €','9 mois','SR = 36 000 ÷ 0,40 = 90 000 ; 90 000 ÷ 120 000 × 12 = 9'],["B · Salle d'escalade",'CF = 60 000 € · taux de MCV = 75 % · CA annuel = 240 000 €','4 mois','SR = 80 000 ; 80 000 ÷ 240 000 × 12 = 4'],['C · Food truck','CF = 18 000 € · taux de MCV = 60 % · CA annuel = 60 000 €','6 mois','SR = 30 000 ; 30 000 ÷ 60 000 × 12 = 6']] },
  { kind: 'lock', code: '268', name: 'Cadenas bonus', rule: 'point mort en mois', en: [['D · Studio photo','CF = 7 500 € · taux de MCV = 50 % · CA annuel = 90 000 €','2 mois','SR = 15 000 ; 15 000 ÷ 90 000 × 12 = 2'],['E · Pizzeria','CF = 70 000 € · taux de MCV = 70 % · CA annuel = 200 000 €','6 mois','SR = 100 000 ; 100 000 ÷ 200 000 × 12 = 6'],['F · Boutique de foot','CF = 24 000 € · taux de MCV = 30 % · CA annuel = 120 000 €','8 mois','SR = 80 000 ; 80 000 ÷ 120 000 × 12 = 8']] },
  { kind: 'points', bareme: `<ul><li>Cadenas 1 ouvert : <b>70 pts</b></li><li>Cadenas bonus ouvert : <b>+30 pts</b></li></ul>` }] },
 { id: 7, p: 3, title: 'La salle de sport Punch', short: 'Seuil et point mort', calc: 'yes', mode: 'down', slides: [
  { kind: 'html', html: `<div class="eyebrow">Une année d'activité · ventes régulières</div><h2>Quand la salle devient-elle rentable ?</h2>
  <div class="cols"><div class="tw"><table class="data"><tbody><tr><td>CA annuel (abonnements)</td><td>180 000 €</td></tr><tr><td>Charges variables</td><td>72 000 €</td></tr><tr><td>Charges fixes</td><td>54 000 €</td></tr><tr><td>Début d'activité</td><td>1<sup>er</sup> janvier</td></tr></tbody></table></div>
  <div class="grid one">${tile('1','Marge sur coût variable et taux ?','108 000 € · 60 %','180 000 − 72 000 ; 108 000 ÷ 180 000')}${tile('2','Seuil de rentabilité ?','90 000 €','54 000 ÷ 0,60')}${tile('3','Point mort ?','6 mois → 30 juin','90 000 ÷ 180 000 × 12')}</div></div>${PHONE}` },
  { kind: 'html', html: `<div class="eyebrow">Pour aller plus loin</div><h2>Sécurité et coup dur</h2><div class="grid g3">
  ${tile('4','Résultat annuel ?','54 000 €','108 000 − 54 000')}${tile('5','Marge de sécurité et indice de sécurité ?','90 000 € · 50 %','180 000 − 90 000 ; 90 000 ÷ 180 000')}${tile('★ Bonus','La salle loue de nouvelles machines : +18 000 € de charges fixes. Nouveau point mort ?','8 mois → 31 août','SR = 72 000 ÷ 0,60 = 120 000 ; 120 000 ÷ 180 000 × 12 = 8')}</div>` },
  { kind: 'points', bareme: `<ul><li>Équipes : <b>15 pts</b> par question (1 à 5) réussie par au moins 4 équipes sur 6, <b>+25</b> pour le bonus</li>${LIVE_BAREME}</ul>` }],
  live: [
   N('CA = 180 000 €, charges variables = 72 000 €. Taux de MCV en % ?', 60, '%', '108 000 ÷ 180 000 = 60 %', 45),
   N('Charges fixes = 54 000 €. Seuil de rentabilité ?', 90000, '€', '54 000 ÷ 0,60 = 90 000 €', 40),
   N('Point mort, en mois ?', 6, 'mois', '90 000 ÷ 180 000 × 12 = 6 mois → 30 juin', 40),
   N('Résultat annuel ?', 54000, '€', '108 000 − 54 000 = 54 000 €', 35),
   N('Indice de sécurité en % ? (marge de sécurité ÷ CA)', 50, '%', '(180 000 − 90 000) ÷ 180 000 = 50 %', 45),
   N('BONUS · Charges fixes +18 000 €. Nouveau point mort en mois ?', 8, 'mois', 'SR = 72 000 ÷ 0,60 = 120 000 ; × 12 ÷ 180 000 = 8 mois', 60)
  ] },
 { id: 8, p: 4, title: 'Qui veut gagner des points ?', short: 'Spécial rentabilité', calc: 'yes', mode: 'down', slides: [
  { kind: 'html', html: `<div class="eyebrow">Jeu télé · toute la classe joue ensemble</div><h2>Qui veut gagner des points ?</h2>${rules(["10 questions sur la rentabilité et les marges.","20 secondes de réflexion, puis vote à main levée.","Un capitaine annonce la réponse finale.","3 jokers : 50/50, l'avis de la classe, l'appel à un ami."])}<div class="formula small-f">Rentabilité financière = Résultat net ÷ Capitaux propres<br>Rentabilité économique = Résultat d'exploitation ÷ Capitaux investis</div>${PHONE}` },
  { kind: 'qcm', questions: QVT },
  { kind: 'points', bareme: `<ul><li>Jeu au tableau : <b>10 pts</b> par bonne réponse (max 100)</li>${LIVE_BAREME}</ul>` }],
  live: QVT },
 { id: 9, p: 4, title: 'Le relais du seuil', short: 'Équipes de 4', calc: 'yes', mode: 'down', slides: [
  { kind: 'html', html: `<div class="eyebrow">Relais · une feuille passe de main en main</div><h2>Le relais du seuil</h2>${rules(["<b>Relayeur 1</b> : le chiffre d'affaires (quantité × prix).","<b>Relayeur 2</b> : la marge sur coût variable (CA − quantité × coût variable unitaire).","<b>Relayeur 3</b> : le seuil de rentabilité (CF ÷ taux de MCV).","<b>Relayeur 4</b> : le point mort en mois (SR ÷ CA × 12).","Chacun ne fait que SON étape. L'équipe vérifie ensemble à la fin."])}` },
  { kind: 'html', html: `<div class="eyebrow">Les données · une entreprise par équipe</div><h2>À vos calculatrices</h2><div class="tw"><table class="data"><thead><tr><th>Équipe · entreprise</th><th>Quantité</th><th>Prix unitaire</th><th>Coût variable unitaire</th><th>Charges fixes</th></tr></thead><tbody>${RELAIST.map((r, i) => `<tr><td><b>${i + 1}</b> · ${r.n}</td><td>${r.q.toLocaleString('fr-FR')}</td><td>${fr(r.pv)} €</td><td>${fr(r.cvu)} €</td><td>${fmt(r.cf)}</td></tr>`).join('')}</tbody></table></div>` },
  { kind: 'html', html: `<div class="eyebrow">Correction</div><h2>Où l'erreur s'est-elle glissée ?</h2><div class="tw"><table class="data"><thead><tr><th>Équipe</th><th>1 · CA</th><th>2 · MCV (taux)</th><th>3 · SR</th><th>4 · Point mort</th></tr></thead><tbody>${RELAIST.map((r, i) => `<tr><td><b>${i + 1}</b> · ${r.n}</td><td class="hidden-ans">${fmt(r.ca)}</td><td class="hidden-ans">${fmt(r.mcv)} (${fr(r.t * 100, 1)} %)</td><td class="hidden-ans">${fmt(Math.round(r.sr))}</td><td class="hidden-ans">${fr(r.pm, 1)} mois</td></tr>`).join('')}</tbody></table></div><button class="btn go" data-reveal>Afficher la correction</button>` },
  { kind: 'points', bareme: `<ul><li><b>4 pts</b> par étape juste (6 équipes × 4 étapes = 96 pts)</li><li><b>+4 pts</b> si toutes les équipes terminent avant la fin du chrono</li></ul>` }] },
 { id: 10, p: 5, title: 'La classe contre le Boss', short: 'Quiz téléphone final', calc: 'yes', mode: 'down', slides: [
  { kind: 'html', html: `<div class="eyebrow">Boss final · tout le programme</div><h2>La classe contre le Boss</h2>${rules(["Quiz téléphone « Boss final » : 12 questions de Gestion et finance.","Chacun répond sur son téléphone. Calculatrice autorisée.","Le Boss est vaincu si la classe atteint <b>70 % de bonnes réponses</b>.","Le classement des classes s'affiche sur l'écran d'accueil."])}` },
  { kind: 'html', html: `<div class="eyebrow">Avant de partir</div><h2>Regardez d'où vous êtes partis</h2><p class="lead">Sur votre téléphone, ouvrez « Mon carnet ». Ces calculs tomberont au bac : vous savez les faire.</p>` },
  { kind: 'points', bareme: `<ul><li>Boss vaincu (70 % ou plus) : <b>100 pts</b></li><li>Sinon : points = taux de réussite de la classe</li></ul>` }],
  bossRule: true,
  live: [
   N('Hausse de 15 % : coefficient multiplicateur ?', 1.15, '', '1 + 0,15', 25),
   N('Prix TTC = 60 €, TVA 20 %. Prix HT ?', 50, '€', '60 ÷ 1,20 = 50 €', 30),
   N('Achat 50 € HT, vente 80 € HT. Taux de marge en % ?', 60, '%', '30 ÷ 50 = 60 %', 40),
   N('Même cas. Taux de marque en % ?', 37.5, '%', '30 ÷ 80 = 37,5 %', 40),
   N('Coût de production 3 000 €, charges de distribution 500 €. Coût de revient ?', 3500, '€', '3 000 + 500', 30),
   N('CA = 100 000 €, charges variables = 35 000 €. Taux de MCV en % ?', 65, '%', '65 000 ÷ 100 000 = 65 %', 40),
   N('Charges fixes = 26 000 €, taux de MCV = 65 %. Seuil de rentabilité ?', 40000, '€', '26 000 ÷ 0,65 = 40 000 €', 45),
   C('SR = 40 000 €, CA annuel = 100 000 €. Point mort ?', ['4,8 mois','4 mois','2,5 mois','8 mois'], 0, '40 000 ÷ 100 000 × 12 = 4,8 mois', 40),
   C('Le loyer d\'un magasin est une charge…', ['Fixe','Variable','Exceptionnelle','Financière'], 0, 'Il ne dépend pas du volume des ventes.', 20),
   N('Résultat net = 18 000 €, capitaux propres = 120 000 €. Rentabilité financière en % ?', 15, '%', '18 000 ÷ 120 000 = 15 %', 40),
   N('Le CA passe de 500 000 € à 450 000 €. Taux de variation en % ? (− si baisse)', -10, '%', '−50 000 ÷ 500 000 = −10 %', 40),
   N('MCV = 80 000 €, charges fixes = 60 000 €. Résultat ?', 20000, '€', '80 000 − 60 000 = 20 000 €', 30)
  ] }
 ]
};

module.exports = { PARCOURS: { '1': P1, 'T': PT }, DOM1, DOMT, BINGO, RELAIST };
