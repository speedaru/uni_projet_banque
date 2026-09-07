# Périmètre & Stack technique — Portail Web Monétique

_Traduction de `scope-and-stack.md`. En cas de divergence, la version anglaise fait foi (référencée depuis `CLAUDE.md`)._

## 1. Contexte du projet

**Sujet** : Constitution d'un portail Web et d'un entrepôt de données pour la gestion de paiement par cartes bancaires, dans le cadre du module BUT2 « Qualité de développement » à l'IUT de Champs (Université Gustave Eiffel), enseigné par M. L. TRAN.

- **MOA (client)** : M. TRAN, en tant que Product Owner
- **MOE (nous)** : équipe de 5 personnes, Agile/Scrum, rôles : 1 Scrum Master, 1 Technical Leader, 3 Développeurs/testeurs — tout le monde participe au développement quel que soit le rôle
- **Dates** : début 02/09/2026, fin 30/11/2026, soutenance orale + démo le 30/11/2026 (13h45–17h45, amphi Blaise Pascal), remise finale des livrables au plus tard le 15/12/2026 sur le Google Drive de l'équipe
- **Livrables attendus** :
  1. Application en ligne en HTTPS avec un nom de domaine
  2. Dossier de conception technique détaillée (schéma d'architecture, MCD/MPD, description technique par fonctionnalité)
  3. Cahier de tests (scénarios, cas de tests, exécutions)
  4. Bilan du projet sous forme de PowerPoint (organisation, déroulement, résultats)
  5. Manuel utilisateur sous forme de vidéo YouTube/MP4
  6. Code source bien commenté, livré

Le choix technologique est explicitement libre (le sujet cite Java/JSP, Python, PHP/MySQL, HTML/CSS, MongoDB, Access et d'autres outils open source uniquement à titre d'exemples).

## 2. Résumé du domaine métier

Le portail permet aux clients entreprises d'une banque (sites e-commerce, commerçants, artisans) de consulter leur activité monétique : annonces de trésorerie, remises (lots de transactions) avec détail transaction par transaction, transactions impayées, et statistiques. Les données peuvent être exportées en CSV/XLS ou imprimées sous forme de rapports PDF.

Vocabulaire métier clé (voir `Explications_de_la_remise.pdf`) :

- **Remise** : un numéro de lot de dépôt (type bordereau), créé lorsque les transactions d'un commerçant sont regroupées pour règlement. Unique, sert à tracer un lot de transactions.
- **Numéro d'autorisation** : identifiant unique généré à chaque paiement par carte, lors de l'interrogation du serveur d'autorisation de paiement.
- **Impayé** : une transaction qui a une date/heure mais pour laquelle les fonds ne sont pas disponibles sur le compte du payeur. Représentée comme une transaction à montant **négatif** (par exemple -45 EUR) — pour ce projet, aucun argent n'est réellement retiré, on stocke simplement des lignes à montant négatif pour représenter le cas. Les motifs sont codés de 01 à 08 (fraude à la carte, compte à découvert, compte clôturé, compte bloqué, provision insuffisante, opération contestée, titulaire décédé, raison non communiquée).

Trois profils utilisateurs :

- **Admin** : crée/supprime des comptes clients, uniquement avec l'accord du Product Owner (case à cocher/bouton radio de confirmation dans l'interface) ; n'a pas accès aux données métier/financières — redirigé vers sa propre page admin en cas de tentative.
- **Product Owner (PO)** : voit tous les comptes clients et toutes leurs données.
- **Client** : voit uniquement les données de son propre compte (filtrées par SIREN).

## 3. Périmètre fonctionnel

### 3.1 Indispensable (socle noté)

| Epic                            | Fonctionnalité                                                                                                                                                                                                                                                                                   |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Epic 6 — Authentification       | Connexion par profil (Admin/PO/Client), bandeau d'avertissement après 2 tentatives échouées (« ATTENTION : C'est votre dernier essai… »), bouton pour afficher le mot de passe en clair (« l'œil »)                                                                                              |
| Epic 7 — Droits d'accès         | Le PO voit tous les comptes ; le Client ne voit que le sien (par SIREN) ; l'Admin n'a aucun accès aux données métier                                                                                                                                                                             |
| Epic 1 — Annonces de trésorerie | PO : vues « tous comptes » et « par compte » ; Client : vue de son propre compte. Filtres : SIREN, raison sociale, date de valeur. Tableau triable (SIREN, montant). Totaux négatifs affichés en rouge.                                                                                          |
| Epic 2 — Recherche de remise    | Recherche de remises par SIREN/raison sociale/plage de dates ; le PO voit toutes les entreprises, le Client ne voit que la sienne ; nombre de résultats affiché au-dessus du tableau ; clic pour afficher le détail des transactions ; recherche par numéro de remise ; totaux négatifs en rouge |
| Epic 5 — Édition des rapports   | Export de tout tableau de résultats en XLS, CSV et PDF ; titres de rapport en majuscules (ex. « LISTE DES REMISES DE L'ENTREPRISE DUPONT N° SIREN 456 278 556 322 ») ; date d'extraction affichée sur le document (ex. « EXTRAIT DU 07/10/2026 »)                                                |

### 3.2 Souhaitable

| Epic                           | Fonctionnalité                                                                                                                                                         |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Epic 3 — Recherche des impayés | Recherche des impayés par SIREN/raison sociale/plage de dates/n° dossier ; tri croissant/décroissant par montant ; PO : somme des montants impayés regroupée par SIREN |

### 3.3 Bonus (ajouté seulement si le temps le permet, une fois le socle indispensable/souhaitable solide)

| Epic                             | Fonctionnalité                                                                                                                                                                                                                              |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Epic 3 (bonus)                   | Lignes colorées par tranche de montant (par tranche de 100)                                                                                                                                                                                 |
| Epic 4 — Graphiques statistiques | Histogramme ou courbe d'évolution des impayés (plage de dates, ou 4/12 mois glissants) ; diagramme en camembert des impayés par motif ; export PDF/impression du graphique ; comparaison du montant des impayés au chiffre d'affaires total |

Cet ordre de priorité s'explique par le fait que l'équipe découvre toute la stack (Node/Express/TypeScript/PostgreSQL/Prisma) et que le délai est fixe (≈12 semaines, dossier de conception, tests et vidéo compris). Si un sprint prend du retard, ce sont les éléments bonus qui sautent en premier, jamais le socle indispensable.

## 4. Modèle de données (déduit des formats de champs de la spécification)

Entités principales, à affiner en un MCD/MPD complet dans le dossier de conception :

- **Utilisateur** (login, mot de passe hashé, rôle : admin/po/client, entreprise associée si client)
- **Entreprise** (n° SIREN char(9), raison sociale char(20))
- **Remise** (n° remise, date traitement, entreprise, nombre transactions, devise, montant total, sens)
- **Transaction** (n° SIREN, date vente, n° carte char(16) masqué, réseau char(2) : CB/VS/MC…, n° autorisation char(6), devise char(3), montant num(5,2), sens char(1), remise associée)
- **Impayé** (transaction associée, date remise, n° dossier impayé char(5), motif [table des 8 codes], libellé impayé char(20))
- **MotifImpaye** (code, libellé) — table de référence statique (8 lignes)

## 5. Stack technique

| Sujet                     | Choix                                                                                                                                | Pourquoi                                                                                                                                                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Langage                   | TypeScript                                                                                                                           | Le typage à la compilation cadre bien avec un module « Qualité de développement » ; s'associe bien aux types générés par Prisma                                                                                                                        |
| Runtime/framework backend | Node.js + Express                                                                                                                    | Stack la plus maîtrisée par l'équipe ; bien moins de cérémonie de configuration qu'une stack Java (pas de serveur d'applications ni de config XML) pour une équipe sans expérience web préalable                                                       |
| Vues                      | Templates EJS rendus côté serveur                                                                                                    | Adapté à une application principalement composée de formulaires/tableaux/filtres ; pas de pipeline de build frontend séparé, ni de routage client, ni de gestion d'état à apprendre en plus du reste                                                   |
| Base de données           | PostgreSQL                                                                                                                           | Données relationnelles avec jointures (entreprise → remise → transaction → impayé) ; le VPS de l'équipe étant un serveur persistant, un vrai processus de base de données est réaliste (contrairement à SQLite, peu adapté aux écritures concurrentes) |
| ORM                       | Prisma                                                                                                                               | Requêtes typées, migrations intégrées (utile comme preuve pour le livrable MCD/MPD), documentation solide pour les débutants Node+Postgres                                                                                                             |
| Authentification          | `express-session` + `bcrypt`                                                                                                         | L'authentification par session convient mieux à des pages rendues côté serveur qu'un JWT ; pas de gestion de token côté client                                                                                                                         |
| Export (XLS/CSV)          | `exceljs`                                                                                                                            | Une seule bibliothèque couvre les deux formats de tableur                                                                                                                                                                                              |
| Export (PDF)              | Puppeteer (rend un template EJS de rapport en PDF)                                                                                   | Réutilise les compétences HTML/CSS déjà acquises par l'équipe plutôt qu'une API impérative de dessin PDF                                                                                                                                               |
| Graphiques                | Chart.js                                                                                                                             | Simple, bien documenté, basé sur canvas ; alimenté par un petit endpoint JSON                                                                                                                                                                          |
| Tests                     | Jest + Supertest                                                                                                                     | Tests automatisés pour les services/contrôleurs (authentification, contrôle d'accès, format des exports, calculs) ; complétés par un document de scénarios de test manuels pour le livrable cahier de tests                                            |
| Déploiement               | VPS de l'équipe : Nginx (reverse proxy + HTTPS via Let's Encrypt) + PM2 (maintient le processus Node actif) + un vrai nom de domaine | Répond directement à l'exigence « application en https avec un nom de domaine »                                                                                                                                                                        |

## 6. Architecture générale

Une seule application Express, en couches :

```
routes/        → définitions de routes légères, regroupées par rôle (admin/po/client) et par epic
controllers/   → gestion des requêtes/réponses, appelle les services
services/      → logique métier (annonces de trésorerie, recherche de remise, recherche d'impayés, génération de rapports)
prisma/        → schema.prisma (source de vérité pour le MCD/MPD), migrations, client généré
views/         → templates EJS, par rôle, avec des partials de layout partagés
public/        → CSS/JS statiques (intégration Chart.js, aides au tri/filtrage des tableaux)
```

Pas de couche API REST séparée pour l'interface navigateur — les routes rendent les vues directement. Un petit endpoint JSON interne alimente les données Chart.js pour les écrans de statistiques (Epic 4).

## 7. Stratégie de tests

- **Automatisés** (Jest + Supertest) : logique de connexion/session, contrôle d'accès par profil (une requête d'un Client sur les données d'un autre SIREN doit être refusée), génération des fichiers d'export (bonnes colonnes, titres en majuscules, date d'extraction présente), calculs de montant/signe pour les impayés.
- **Manuels, documentés** (livrable cahier de tests) : cas de tests basés sur des scénarios par epic — par exemple « Le PO consulte les annonces de trésorerie de tous les comptes pour une date donnée », « Un Client tente de consulter les remises d'une autre entreprise (résultat attendu : refusé) », « Exporter un résultat de recherche de remise en PDF et vérifier le format du titre/de la date » — avec les étapes, le résultat attendu et le résultat d'exécution réel consigné.

## 8. Déploiement

- Processus Node géré par PM2 sur le VPS de l'équipe.
- Nginx en reverse proxy, terminaison TLS via Let's Encrypt (Certbot), routé vers un nom de domaine acheté/attribué.
- PostgreSQL exécuté sur le même VPS, accédé par l'application en localhost.
- Configuration spécifique à l'environnement (chaîne de connexion à la base, secret de session) via `.env`, non versionné dans le contrôle de source.

## 9. Rôles

Équipe de 5 personnes : 1 Scrum Master, 1 Technical Leader, 3 Développeurs/testeurs. Comme le précise le sujet, au-delà des intitulés de rôles, tout le monde participe au développement, aux tests et à la rédaction des livrables.
