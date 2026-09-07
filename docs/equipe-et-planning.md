# Équipe & Planning — Portail Web Monétique

Ce document complète [`scope-and-stack.fr.md`](scope-and-stack.fr.md) (quoi construire) avec l'organisation d'équipe et le planning (qui fait quoi, et quand). Il correspond aux livrables attendus par le Product Owner (M. TRAN) : composition de l'équipe, planning, liste des tâches (voir `Projet_BUT2.pdf`).

## 1. Répartition des rôles

Le sujet impose 5 personnes maximum, avec ces rôles (jeu de rôles — **tout le monde développe et teste, quel que soit son rôle**) :

| Rôle                        | Membre                     | Compte GitHub             |
| --------------------------- | -------------------------- | ------------------------- |
| Technical Leader            | **Iegor**                  | _(propriétaire du dépôt)_ |
| Scrum Master                | _[Prénom Nom — à choisir]_ | _[à compléter]_           |
| Développeur·se / testeur·se | _[Prénom Nom — à choisir]_ | _[à compléter]_           |
| Développeur·se / testeur·se | _[Prénom Nom — à choisir]_ | _[à compléter]_           |
| Développeur·se / testeur·se | _[Prénom Nom — à choisir]_ | _[à compléter]_           |

**Les 4 autres membres choisissent leur rôle** parmi Scrum Master et Développeur·se/testeur·se (3 postes) lors du premier point d'équipe. En cas d'égalité ou d'hésitation, privilégier la répartition suivante :

- **Scrum Master** : à l'aise pour organiser, communiquer avec le Product Owner (M. TRAN), suivre l'avancement.
- **Développeur·se/testeur·se** (x3) : tout le reste de l'équipe — pas de prérequis particulier, la stack (Node/Express/TypeScript) est nouvelle pour tout le monde de toute façon (voir `scope-and-stack.fr.md` §5).

## 2. Responsabilités par rôle

### Technical Leader

- Décisions d'architecture technique (déjà posées dans `scope-and-stack.fr.md`, à affiner si besoin en cours de route) et cohérence du code entre les epics.
- Met en place et maintient l'infrastructure du projet : dépôt Git, CI, hooks, environnements (voir `CLAUDE.md`).
- Conçoit le schéma de données (MCD/MPD, `prisma/schema.prisma`) au fil des epics, avec les développeurs.
- Relit les Pull Requests pour la cohérence technique, débloque l'équipe sur les points durs.
- Développe des fonctionnalités comme les autres membres.

### Scrum Master

- Anime les rituels Agile : stand-up (lors des séances de TD/TP), planning de sprint, revue de fin de sprint, rétrospective.
- Communique avec le Product Owner (M. TRAN) : remonte l'avancement, les blocages, les décisions à prendre.
- Tient à jour le planning, la liste des tâches et le suivi des livrables (backlog partagé — voir §5).
- Compile les livrables transverses : bilan PowerPoint, synthèse du cahier de tests, suivi du planning dans le dossier de conception.
- Développe des fonctionnalités comme les autres membres.

### Développeur·se / testeur·se (x3)

- Implémente les fonctionnalités des epics qui lui sont assignées (voir §3).
- Écrit les tests automatisés (Jest/Supertest) associés à son code — requis pour merger une PR (voir `CLAUDE.md`).
- Rédige les scénarios de test manuels de ses fonctionnalités pour le cahier de tests (livrable 2).
- Relit les PR des autres membres de l'équipe.
- Documente ce qu'il/elle a développé pour la partie « description technique détaillée » du dossier de conception.

## 3. Phases du projet

Le projet démarre le **02/09/2026** et se termine à la soutenance le **30/11/2026**, avec une marge jusqu'au **15/12/2026** pour la remise finale des livrables. Découpage en 5 phases (≈13 semaines) :

### Phase 0 — Cadrage (02/09 → 14/09, 2 semaines)

Déjà largement engagée : sujet analysé, périmètre et stack définis (`scope-and-stack.fr.md`), squelette du projet créé (dépôt, CI, hooks, structure de fichiers). Reste à faire :

- Toute l'équipe : choix des rôles (§1), prise en main de l'environnement (voir `README.md` — prérequis, installation).
- Scrum Master : mise en place du tableau de backlog (GitHub Projects, Trello, ou équivalent) à partir du backlog produit fourni.
- Technical Leader : revue de l'environnement de chacun (accès au dépôt, hooks Git fonctionnels).

### Phase 1 — Socle technique & authentification (15/09 → 28/09, 2 semaines)

Bloquant pour tout le reste : les écrans PO/Client/Admin dépendent de l'authentification et des droits d'accès. Correspond aux epics 6 et 7 (must-have).

| Qui              | Sur quoi                                                                                                    |
| ---------------- | ----------------------------------------------------------------------------------------------------------- |
| Technical Leader | Modèles Prisma `Utilisateur`/`Entreprise`, migration initiale, middleware de session et de contrôle d'accès |
| Développeur·se 1 | Écran de connexion (3 profils), bandeau après 2 échecs, bouton « œil » (Epic 6)                             |
| Développeur·se 2 | Contrôle d'accès par profil (PO = tout, Client = son SIREN, Admin = pas de données métier) + tests (Epic 7) |
| Développeur·se 3 | Layouts de base par rôle (`views/admin`, `views/po`, `views/client`), navigation                            |
| Scrum Master     | Anime le planning de sprint, suit l'avancement, développe une des tâches ci-dessus avec l'équipe            |

### Phase 2 — Cœur métier (29/09 → 26/10, 4 semaines)

La phase la plus grosse : Epics 1, 2 et 5 (must-have). C'est ici que se répartissent le plus clairement les epics entre développeurs.

| Qui                                 | Sur quoi                                                                                                             |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Développeur·se 1                    | Epic 1 — Annonces de trésorerie (vues PO tous comptes / par compte, vue Client, tri, rouge si négatif)               |
| Développeur·se 2                    | Epic 2 — Recherche de remise (recherche, détail par clic, nombre de résultats, recherche par n° remise)              |
| Développeur·se 3 + Technical Leader | Epic 5 — Exports XLS/CSV/PDF (`exceljs` + Puppeteer), branché sur les tableaux des epics 1 et 2                      |
| Scrum Master                        | Coordonne l'intégration entre les 3 chantiers, prend en charge des tâches secondaires (tri, formats de champs, etc.) |

### Phase 3 — Impayés & stabilisation (27/10 → 09/11, 2 semaines)

Epic 3 (should-have), plus consolidation de ce qui a été fait en phase 1-2.

| Qui                    | Sur quoi                                                                                                                  |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 1 à 2 développeur·se·s | Epic 3 — Recherche des impayés (filtres, tri croissant/décroissant, somme par SIREN pour le PO)                           |
| Reste de l'équipe      | Correction de bugs remontés, complément des tests automatisés, début de rédaction du cahier de tests pour les epics 1/2/5 |
| Technical Leader       | Passe de relecture/qualité sur le code déjà mergé                                                                         |

### Phase 4 — Bonus & déploiement (10/11 → 23/11, 2 semaines)

Epic 4 (stretch, uniquement si le planning le permet — voir `scope-and-stack.fr.md` §3.3) et mise en production.

| Qui                    | Sur quoi                                                                                        |
| ---------------------- | ----------------------------------------------------------------------------------------------- |
| 1 à 2 développeur·se·s | Epic 4 — Graphiques (histogramme/courbe, camembert par motif, export PDF) si le temps le permet |
| Technical Leader       | Déploiement sur le VPS (Nginx, HTTPS via Let's Encrypt, PM2, nom de domaine)                    |
| Scrum Master           | Finalise l'exécution du cahier de tests, avance la rédaction du dossier de conception           |

**Si le planning est serré à ce stade, l'Epic 4 est la première chose qu'on coupe** (voir la règle de priorisation dans `scope-and-stack.fr.md` §3.3) — le temps se reporte sur la stabilisation et les livrables.

### Phase 5 — Finalisation & soutenance (24/11 → 30/11, 1 semaine + marge jusqu'au 15/12)

| Qui              | Sur quoi                                                                         |
| ---------------- | -------------------------------------------------------------------------------- |
| Toute l'équipe   | Bug bash final, relecture du code source (commentaires), répétition de la démo   |
| Scrum Master     | Finalise le PowerPoint (organisation, déroulement, bilan)                        |
| Un·e volontaire  | Enregistre le manuel utilisateur (vidéo YouTube/MP4)                             |
| Technical Leader | Vérifie que l'application déployée est stable pour la démo du 30/11              |
| Toute l'équipe   | Dépôt des livrables sur le Google Drive de l'équipe (au plus tard le 15/12/2026) |

## 4. Livrables : qui porte quoi

| Livrable (voir `Projet_BUT2.pdf`)             | Porté par                                                                                          |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Application en HTTPS avec nom de domaine      | Technical Leader (déploiement), toute l'équipe (développement)                                     |
| Dossier de conception technique détaillée     | Technical Leader (architecture, MCD/MPD) + Scrum Master (compilation) + chacun documente sa partie |
| Cahier de tests                               | Chaque développeur·se rédige les scénarios de ses fonctionnalités, Scrum Master compile            |
| PowerPoint (organisation, déroulement, bilan) | Scrum Master (pilotage), toute l'équipe contribue                                                  |
| Manuel utilisateur (vidéo)                    | À définir en Phase 5, tourne entre les membres                                                     |
| Code source commenté                          | Toute l'équipe (voir conventions de commentaires dans `CLAUDE.md`)                                 |

## 5. Rituels Agile

- **Stand-up** : à chaque séance de TD/TP, en présence du Product Owner (M. TRAN) quand prévu — chacun partage ce qui est fait, ce qui bloque.
- **Sprint planning** : en début de chaque phase (§3) — on découpe les tâches de la phase en tickets assignés.
- **Revue de fin de sprint / de phase** : démo de ce qui a été fait, ajustement du planning si retard.
- **Rétrospective** : ce qui a bien/mal fonctionné, à ajuster pour la phase suivante.
- **Backlog** : dérivé de `Backlog du produit.pdf`, suivi dans un tableau partagé (GitHub Projects recommandé, vu que le code est déjà sur GitHub).

## 6. Prochaines étapes

1. Chaque membre confirme son rôle (§1) lors du premier point d'équipe.
2. Le Scrum Master crée le tableau de backlog et y transpose les user stories du `Backlog du produit.pdf`.
3. L'équipe démarre la Phase 1 (§3) : chacun installe son environnement (`README.md`) et prend son ticket.
