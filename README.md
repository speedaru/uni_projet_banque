# Portail Web Monétique — Projet BUT2

Portail Web permettant aux clients d'une banque (e-commerçants, commerçants, artisans) de consulter leur activité monétique : annonces de trésorerie, recherche de remises, recherche d'impayés, statistiques et export de rapports (CSV, XLS, PDF).

Projet réalisé dans le cadre du module **Qualité de développement** (BUT2, IUT de Champs — Université Gustave Eiffel).

Pour le contexte complet (sujet, backlog, choix techniques détaillés, modèle de données, architecture), voir [`docs/scope-and-stack.fr.md`](docs/scope-and-stack.fr.md).

## Sommaire

- [Prérequis](#prérequis)
- [Installation](#installation)
- [Structure du projet](#structure-du-projet)
- [Workflow de contribution](#workflow-de-contribution)
- [Documentation](#documentation)
- [Équipe](#équipe)

## Prérequis

À installer sur votre machine avant de pouvoir travailler sur le projet :

| Outil                                              | Version conseillée        | À quoi ça sert                                                                                                              |
| -------------------------------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| [Node.js](https://nodejs.org/)                     | LTS la plus récente (20+) | Exécute le serveur Express et tous les outils du projet (npm, TypeScript, Prisma...)                                        |
| npm                                                | Fourni avec Node.js       | Gestionnaire de paquets — installe toutes les dépendances du projet                                                         |
| [Git](https://git-scm.com/)                        | Récente                   | Gestion de version, travail en branches/PR                                                                                  |
| [PostgreSQL](https://www.postgresql.org/download/) | 15+                       | Base de données relationnelle utilisée en local pour développer (une instance séparée tourne aussi sur le VPS pour la prod) |

**TypeScript** n'a pas besoin d'être installé séparément : il sera ajouté comme dépendance du projet (`npm install` s'en chargera). Si vous utilisez VS Code, le support TypeScript est déjà intégré, aucune extension n'est nécessaire pour ça.

### Extensions VS Code conseillées

Installez :

- **ESLint** (`dbaeumer.vscode-eslint`)
- **Prettier - Code formatter** (`esbenp.prettier-vscode`)
- **Prisma** (`Prisma.prisma`) — coloration syntaxique pour `schema.prisma`

### Vérifier votre installation

```bash
node -v      # doit afficher v20.x ou plus récent
npm -v
git --version
psql --version
```

## Installation

```bash
# 1. Cloner le dépôt
git clone <url-du-dépôt>
cd projet_banque

# 2. Installer les dépendances
# (Puppeteer télécharge son propre Chromium au passage, ça peut prendre quelques minutes.
#  Cette étape installe aussi automatiquement les git hooks, voir plus bas.)
npm install

# 3. Configurer les variables d'environnement à partir du template
cp .env.example .env
# puis éditer .env : renseigner la chaîne de connexion PostgreSQL locale, un vrai
# SESSION_SECRET (voir le commentaire dans .env.example pour le générer), etc.
# .env ne doit jamais être commité (il est dans .gitignore).

# 4. Générer le client Prisma et appliquer les migrations de base de données
npx prisma migrate dev

# 5. Lancer le serveur en mode développement (rechargement automatique)
npm run dev
```

L'application est alors accessible sur `http://localhost:3000`.

### Scripts npm disponibles

| Commande                 | Effet                                                          |
| ------------------------ | -------------------------------------------------------------- |
| `npm run dev`            | Lance le serveur en mode développement (rechargement auto)     |
| `npm run build`          | Compile le TypeScript vers `dist/`                             |
| `npm start`              | Lance le serveur compilé (`dist/server.js`)                    |
| `npm run lint`           | Vérifie le code avec ESLint                                    |
| `npm run lint:fix`       | Corrige automatiquement ce qui peut l'être                     |
| `npm run format`         | Formate tout le projet avec Prettier                           |
| `npm test`               | Lance les tests automatisés (Jest)                             |
| `npm run prisma:migrate` | Crée/applique une migration de base de données                 |
| `npm run prisma:studio`  | Ouvre Prisma Studio (interface visuelle de la base de données) |

## Structure du projet

```
docs/            → documentation du projet (périmètre, stack, spécifications fournies)
src/
  routes/        → définitions de routes (par rôle : admin/po/client)
  controllers/   → gestion des requêtes/réponses (à créer au fil des epics)
  services/      → logique métier (à créer au fil des epics)
  lib/           → utilitaires partagés (ex. client Prisma)
  generated/     → code généré par Prisma, jamais commité
  app.ts         → configuration de l'application Express
  server.ts      → point d'entrée (démarre le serveur)
views/           → templates EJS
public/          → fichiers statiques (CSS, JS client)
prisma/          → schéma de base de données et migrations
tests/           → tests automatisés (Jest + Supertest)
```

Détail complet de l'architecture dans [`docs/scope-and-stack.fr.md`](docs/scope-and-stack.fr.md#6-architecture-générale).

## Workflow de contribution

Conventions complètes dans [`CLAUDE.md`](CLAUDE.md). Résumé pour bien démarrer :

### Branches et Pull Requests

- Une branche par user story/tâche (ex. `epic1-annonces-tresorerie`, `epic6-login`), jamais de commit direct sur `main`.
- Ouvrir une Pull Request vers `main` une fois la tâche prête ; au moins un⋅e autre membre de l'équipe relit avant de merger.
- `main` doit toujours rester déployable.

### Git hooks (installés automatiquement)

`npm install` installe aussi les hooks Git du projet (via [Husky](https://typicode.github.io/husky/), configuré dans `.husky/`) :

| Hook         | Ce qu'il fait                                                                    | Quand                 |
| ------------ | -------------------------------------------------------------------------------- | --------------------- |
| `pre-commit` | Lance ESLint (`--fix`) et Prettier sur les fichiers modifiés (via `lint-staged`) | À chaque `git commit` |
| `pre-push`   | Lance la suite de tests (`npm test`)                                             | À chaque `git push`   |

Si un hook échoue, le commit/push est bloqué — corrigez le problème signalé (ou lancez `npm run lint:fix` / `npm run format`) puis réessayez. Ne contournez pas les hooks avec `--no-verify` sauf cas exceptionnel discuté avec l'équipe.

Si `npm install` a été lancé avant que les hooks existent, relancez simplement `npm install` (ou `npx husky`) pour les (ré)installer.

### Intégration continue (CI)

Chaque Pull Request déclenche automatiquement un workflow GitHub Actions ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) qui vérifie le lint, le format, la génération du client Prisma, la compilation et les tests. Une PR ne doit pas être mergée tant que la CI n'est pas verte.

### Convention de commit

Pas de format imposé (pas de préfixe Epic/US obligatoire) — un message clair et descriptif suffit.

## Documentation

- [`docs/scope-and-stack.fr.md`](docs/scope-and-stack.fr.md) — périmètre fonctionnel, stack technique, modèle de données, stratégie de tests, déploiement (version française)
- [`docs/scope-and-stack.md`](docs/scope-and-stack.md) — même contenu, version anglaise (référence pour `CLAUDE.md`)
- [`docs/`](docs/) — documents fournis par le Product Owner (sujet, spécifications fonctionnelles, backlog produit)
- [`CLAUDE.md`](CLAUDE.md) — conventions de développement (nommage, style de code, workflow Git)
- [`.github/workflows/ci.yml`](.github/workflows/ci.yml) — pipeline d'intégration continue

## Équipe

Équipe de 5 : 1 Scrum Master, 1 Technical Leader, 3 Développeurs/testeurs. Tout le monde participe au développement, aux tests et à la rédaction des livrables.
