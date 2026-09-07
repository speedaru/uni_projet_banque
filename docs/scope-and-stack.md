# Scope & Stack — Portail Web Monétique

## 1. Project context

**Subject**: Constitution d'un portail Web et d'un entrepôt de données pour la gestion de paiement par cartes bancaires, for the BUT2 "Qualité de développement" module at IUT Champs (Université Gustave Eiffel), taught by M. L. TRAN.

- **MOA (client)**: M. TRAN, acting as Product Owner
- **MOE (us)**: team of 5, Agile/Scrum, roles: 1 Scrum Master, 1 Technical Leader, 3 Developers/testers — everyone contributes to development regardless of role
- **Dates**: start 02/09/2026, end 30/11/2026, oral defense + demo 30/11/2026 (13h45–17h45, amphi Blaise Pascal), final deliverables deadline 15/12/2026 on the team's Google Drive
- **Required deliverables**:
  1. Live application over HTTPS with a domain name
  2. Dossier de conception technique détaillée (architecture diagram, MCD/MPD, per-function technical description)
  3. Cahier de tests (scenarios, test cases, execution records)
  4. Project retrospective as a PowerPoint (organization, progress, outcomes)
  5. User manual as a YouTube/MP4 video
  6. Well-commented, delivered source code

Technology choice is explicitly free (the subject lists Java/JSP, Python, PHP/MySQL, HTML/CSS, MongoDB, Access, and other open-source tools only as examples).

## 2. Domain summary

The portal lets business clients of a bank (e-commerce sites, shopkeepers, artisans) consult their card-payment activity ("monétique"): cash-position announcements, deposit batches ("remises") with transaction-level drill-down, unpaid transactions ("impayés"), and statistics. Data can be exported as CSV/XLS or printed as PDF reports.

Key domain vocabulary (see `Explications_de_la_remise.pdf`):

- **Remise**: a deposit batch number (like a bordereau), created when a merchant's transactions are grouped for settlement. Unique, used to trace a batch of transactions.
- **Numéro d'autorisation**: a unique identifier generated per card payment when the payment authorization server is queried.
- **Impayé**: a transaction that has a date/time but no funds available in the payer's account. Represented as a transaction with a **negative** amount (e.g. -45 EUR) — no real money is actually removed for this project, we just store negative-amount rows to represent it. Motifs are coded 01–08 (fraude à la carte, compte à découvert, compte clôturé, compte bloqué, provision insuffisante, opération contestée, titulaire décédé, raison non communiquée).

Three user profiles:

- **Admin**: creates/deletes client accounts, only with Product Owner's agreement (checkbox/radio confirmation in the UI); cannot view business/financial data — redirected to their own admin page if they try.
- **Product Owner (PO)**: sees all client accounts and all their data.
- **Client**: sees only their own account's data (scoped by SIREN).

## 3. Functional scope

### 3.1 Must-have (core — graded floor)

| Epic                            | Feature                                                                                                                                                                                                                    |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Epic 6 — Authentication         | Login per profile (Admin/PO/Client), warning banner after 2 failed attempts ("ATTENTION : C'est votre dernier essai…"), password visibility toggle ("l'œil")                                                               |
| Epic 7 — Access rights          | PO sees all accounts; Client sees only their own (by SIREN); Admin has no access to business data                                                                                                                          |
| Epic 1 — Annonces de trésorerie | PO: all-accounts and per-account cash announcement views; Client: own-account view. Filters: SIREN, raison sociale, date de valeur. Sortable table (SIREN, montant). Negative totals shown in red.                         |
| Epic 2 — Recherche de remise    | Search remises by SIREN/raison sociale/date range; PO sees all companies, Client sees own; row count displayed above table; click-through to transaction-level detail; search by remise number; negative totals in red     |
| Epic 5 — Édition des rapports   | Export any results table as XLS, CSV, and PDF; report titles in uppercase (e.g. "LISTE DES REMISES DE L'ENTREPRISE DUPONT N° SIREN 456 278 556 322"); extraction date shown on the document (e.g. "EXTRAIT DU 07/10/2026") |

### 3.2 Should-have

| Epic                           | Feature                                                                                                                                                       |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Epic 3 — Recherche des impayés | Search unpaid transactions by SIREN/raison sociale/date range/dossier number; sort ascending/descending by amount; PO: sum of unpaid amounts grouped by SIREN |

### 3.3 Stretch (added only if time allows, after must/should-have is solid)

| Epic                                | Feature                                                                                                                                                                                                     |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Epic 3 (extra)                      | Color-coded rows by amount bracket (every 100)                                                                                                                                                              |
| Epic 4 — Graphiques de statistiques | Histogram or line chart of unpaid-amount evolution (date range, or rolling 4/12 months); pie chart of unpaid amounts by motif; PDF export / print of the chart; unpaid amount vs. total turnover comparison |

This ordering exists because the team is new to the whole stack (Node/Express/TypeScript/PostgreSQL/Prisma) and the timeline is fixed (≈12 weeks including the design doc, tests, and video). If a sprint runs behind, stretch items are the first to be cut or descoped, not the must-have list.

## 4. Data model (informed by field formats in the spec)

Core entities, to be refined into a full MCD/MPD in the conception document:

- **Utilisateur** (login, mot de passe hashé, rôle: admin/po/client, entreprise associée si client)
- **Entreprise** (n° SIREN char(9), raison sociale char(20))
- **Remise** (n° remise, date traitement, entreprise, nombre transactions, devise, montant total, sens)
- **Transaction** (n° SIREN, date vente, n° carte char(16) masqué, réseau char(2): CB/VS/MC…, n° autorisation char(6), devise char(3), montant num(5,2), sens char(1), remise associée)
- **Impayé** (transaction associée, date remise, n° dossier impayé char(5), motif [table des 8 codes], libellé impayé char(20))
- **MotifImpaye** (code, libellé) — static lookup table (8 rows)

## 5. Technology stack

| Concern                   | Choice                                                                                                            | Why                                                                                                                                                                                            |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Language                  | TypeScript                                                                                                        | Compile-time safety fits a "Qualité de développement" module; pairs well with Prisma's generated types                                                                                         |
| Backend runtime/framework | Node.js + Express                                                                                                 | Team's strongest stack; far less setup ceremony than a Java web stack (no app server/XML config) for a team with zero prior web dev experience                                                 |
| Views                     | Server-rendered EJS templates                                                                                     | Matches a mostly forms/tables/filters app; no separate frontend build pipeline, client routing, or state management to learn on top of everything else                                         |
| Database                  | PostgreSQL                                                                                                        | Relational data with joins (entreprise → remise → transaction → impayé); the team's VPS is a persistent server so a real DB process is practical (unlike SQLite's weak concurrent-write story) |
| ORM                       | Prisma                                                                                                            | Type-safe queries, built-in migrations (useful evidence for the MCD/MPD deliverable), strong docs for Node+Postgres beginners                                                                  |
| Auth                      | `express-session` + `bcrypt`                                                                                      | Session-based fits server-rendered pages better than JWT; no client-side token handling needed                                                                                                 |
| Exports (XLS/CSV)         | `exceljs`                                                                                                         | One library covers both spreadsheet formats                                                                                                                                                    |
| Exports (PDF)             | Puppeteer (renders an EJS report template to PDF)                                                                 | Reuses HTML/CSS the team already knows instead of an imperative PDF-drawing API                                                                                                                |
| Charts                    | Chart.js                                                                                                          | Simple, well-documented, canvas-based; fed by a small JSON endpoint                                                                                                                            |
| Testing                   | Jest + Supertest                                                                                                  | Automated tests for services/controllers (auth, access control, export formatting, calculations); paired with a manual test-scenario document for the cahier de tests deliverable              |
| Deployment                | Team's VPS: Nginx (reverse proxy + Let's Encrypt HTTPS) + PM2 (keeps the Node process alive) + a real domain name | Satisfies the "application en https avec un nom de domaine" deliverable directly                                                                                                               |

## 6. High-level architecture

Single Express app, layered:

```
routes/        → thin route definitions, grouped by role (admin/po/client) and by epic
controllers/   → request/response handling, calls services
services/      → business logic (cash announcements, remise search, impayé search, report generation)
prisma/        → schema.prisma (source of truth for MCD/MPD), migrations, generated client
views/         → EJS templates, per role, sharing layout partials
public/        → static CSS/JS (Chart.js glue, table sort/filter helpers)
```

No separate REST API layer for the browser UI — routes render views directly. A small internal JSON endpoint feeds Chart.js data for the statistics screens (Epic 4).

## 7. Testing strategy

- **Automated** (Jest + Supertest): login/session logic, per-profile access control (a Client request for another SIREN's data must be rejected), export file generation (correct columns, uppercase titles, extraction date present), amount/sign calculations for impayés.
- **Manual, documented** (the cahier de tests deliverable): scenario-based test cases per epic — e.g. "PO consults all accounts' cash announcements for a given date," "Client attempts to view another company's remises (expected: denied)," "Export a remise search result as PDF and verify title/date formatting" — with steps, expected result, and actual execution result recorded.

## 8. Deployment

- Node app process managed by PM2 on the team's VPS.
- Nginx as reverse proxy, terminating TLS via Let's Encrypt (Certbot), routed to a purchased/assigned domain name.
- PostgreSQL running on the same VPS, accessed by the app over localhost.
- Environment-specific config (DB connection string, session secret) via `.env`, not committed to source control.

## 9. Roles

5-person team: 1 Scrum Master, 1 Technical Leader, 3 Developers/testers. Per the subject, role labels aside, everyone participates in development, testing, and the write-ups.
