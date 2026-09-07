# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

Web portal + data warehouse for card-payment monitoring, built for the BUT2 "Qualité de développement" module (see `docs/scope-and-stack.md` for full context: subject, dates, deliverables, functional scope, data model, and architecture). Read that file first for anything about _what_ to build; this file covers _how_ to work in the repo.

Team of 5 (Scrum Master, Technical Leader, 3 Developers/testers), everyone contributes to development. Deadline: 30/11/2026 (oral defense/demo), final deliverables by 15/12/2026.

## Stack

Node.js + Express + TypeScript, EJS server-rendered views, PostgreSQL via Prisma (v7, CommonJS output via `moduleFormat = "cjs"`, driver adapter `@prisma/adapter-pg`), session-based auth (`express-session` + `bcrypt`), `exceljs` for XLS/CSV export, Puppeteer for PDF export, Chart.js for statistics screens. Full rationale in `docs/scope-and-stack.md` §5.

Basic scaffold is in place (`package.json`, `tsconfig.json`, ESLint/Prettier, Jest, Prisma). Key commands: `npm run dev` (dev server with reload), `npm run build`, `npm test`, `npm run lint`, `npm run prisma:migrate`. Full list in `README.md`.

Prisma 7 notes (easy to get wrong, see the `prisma-upgrade-v7` skill installed under `.claude/skills/` for details): connection URL lives in `prisma.config.ts`, not in `schema.prisma`; the generated client goes to `src/generated/prisma` (gitignored, regenerate with `npx prisma generate` after cloning or changing the schema); client instantiation requires a `PrismaPg` adapter (see `src/lib/prisma.ts`), not a bare `new PrismaClient()`.

## Naming & language conventions

- Identifiers (variables, functions, classes) in **English**, including generic logic (`count`, `index`, `total`).
- **Domain/business terms stay in French** where that's the clearer or exact spec term — e.g. `remise`, `impaye`, `siren`, `raisonSociale` — rather than forcing a translation like `batch` or `unpaidTransaction`. Use judgment: if an English term is just as clear, prefer it for basic fields; if the French term is what the spec, the client (M. TRAN), and teammates actually say, keep it French.
- **Comments in French.**
- Match whichever convention a file already uses rather than mixing styles within one file.

## Code style

ESLint + Prettier, enforced (not just advisory). Set up as a pre-commit hook or CI check once the project is scaffolded, so style issues are caught before merge rather than in review.

## Git workflow

- Feature branches per user story/task, merged via PR.
- At least one teammate reviews before merging to `main` — keep `main` deployable.
- Commit messages: free-form, but clear and descriptive (no fixed Epic/US-ID prefix convention).
- Tests must pass before a PR merges. New logic in `services/`/`controllers/` should come with Jest/Supertest tests — this is both a quality bar and groundwork for the _cahier de tests_ deliverable.

## Architecture reminders

Layered Express app: `routes/` → `controllers/` → `services/` → Prisma. No separate REST API for the browser UI (views render server-side); only chart data goes through a small JSON endpoint. Full breakdown in `docs/scope-and-stack.md` §6.

## Scope discipline

MVP-first: auth/access-control (Epic 6/7), cash announcements (Epic 1), remise search + drill-down (Epic 2), and exports (Epic 5) are the must-have floor. Unpaid search (Epic 3) is should-have. Charts and extras (Epic 4, color-by-bracket) are stretch — cut these first if a sprint falls behind, not the must-have list. Full breakdown in `docs/scope-and-stack.md` §3.
