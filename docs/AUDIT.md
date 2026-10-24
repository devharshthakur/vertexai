# AUDIT.md — VertexAI code audit

Checklist of findings from the code audit of this repository.

|                  |                                                                                                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Audited revision | `b210608` (branch `main`, 1 commit ahead of `origin/main`)                                                                                                               |
| Date             | 2026-10-21                                                                                                                                                               |
| Depth / focus    | standard, all categories                                                                                                                                                 |
| Baseline checks  | `pnpm lint` ✓ · `pnpm typecheck` ✓ (both green at audit time)                                                                                                            |
| Stack            | Nuxt 4.6.2 (compatibility v5) · Vue 3.5 · TypeScript 6 · shadcn-vue 2.8 + reka-ui · Tailwind v4 · better-auth 1.7.11 + Drizzle adapter · PostgreSQL 17 (pgvector) · pnpm |

## How to use

- Tick a box when that item is **done and verified**, not when work starts.
- Keep the item's "Done when" line honest — it is the acceptance check.
- Record what changed under the item (PR/commit or a one-line note) so the audit history stays useful.
- Ticking an item here marks it for planning. It is not implementation approval, and it does not open a pull request.
- Findings are ordered by leverage: the first four are the ones worth doing next.

Legend: **Effort** S ≈ hours · M ≈ a day · L ≈ multi-day. **Confidence** reflects the evidence gathered, not how many files were read.

---

## Priority 1 — do these first

### [x] SEC-01 — Server-side session/role guard pattern

Authorization today is client route middleware only (`app/middleware/auth.ts:7-13`, `app/middleware/guest.ts:6-11`). No server route performs a session or role check; the only `/api` routes are `auth/[...all]` (better-auth's own handler), `auth-providers` and `health` (both intentionally public). No live exposure exists today, but the next feature (catalog/enrollment APIs) ships exposed if it copies the current pattern — client middleware does not protect API calls, and it is trivially bypassable.

- **Impact:** high for the next feature, none live today
- **Effort:** S–M · **Risk:** low · **Confidence:** HIGH (source-observed)
- **Evidence:** `app/middleware/auth.ts:7-13`, `app/middleware/guest.ts:6-11`, `server/api/`, `server/utils/auth.ts`
- **Fix sketch:** add a server util (e.g. `server/utils/requireSession.ts`) built on `auth.api.getSession({ headers })` plus a role-check helper, and apply it to every new data route.
- **Done when:** a reusable server guard exists, one representative route uses it, and an unauthenticated request to that route is rejected with 401.
- **Change (2026-10-21):** added `server/utils/require-session.ts` (`requireSession` → 401, `requireRole` → 403, both on `auth.api.getSession`) and applied it to `server/api/me.get.ts`; verified 401 unauthenticated, 200 authenticated, public routes unchanged.

### [x] BUG-01 — `/api/health` throws instead of reporting a degraded database

`server/api/health.get.ts:5-9` awaits the probe with no error handling. When the database is down the rejection escapes the handler, so Nitro returns an unstructured 500 (and in dev the error details reach the response) instead of the `{ status, database }` contract the README describes.

- **Impact:** low–med (probe consumers get no usable degraded signal)
- **Effort:** S · **Risk:** low · **Confidence:** HIGH in source; runtime path not executed during the audit
- **Evidence:** `server/api/health.get.ts:5-9`, README `GET /api/health` note (line 73)
- **Fix sketch:** wrap the probe in try/catch, return `503` with `{ status: 'error', database: 'down' }` on failure.
- **Done when:** with the database stopped the endpoint returns 503 and a JSON body, and 200 with `{ status: 'ok', database: 'up' }` when it is running.
- **Change (2026-10-23):** wrapped the probe in `server/api/health.get.ts` in try/catch, logging the failure server-side and returning `503` with `{ status: 'error', database: 'down' }`; verified the pre-fix `500`, the `503` body with an unreachable `DATABASE_URL`, the `200` body against the local database, and unchanged `/api/auth-providers` (200) / `/api/me` (401); `pnpm validate` green.

### [ ] BUG-02 — Credential form submit path has no error boundary

`LoginForm.vue:50-65` and the `SignupForm.vue` equivalent call `authClient.signIn.email` / `signUp.email` without try/catch, so a thrown transport error propagates unhandled instead of surfacing in the form (and may leave the form stuck submitting). The `serverError` message also stays on screen while the visitor edits the fields.

- **Impact:** low–med
- **Effort:** S · **Risk:** low · **Confidence:** MED (absence observed; the stuck-state consequence is plausible, not reproduced)
- **Evidence:** `app/components/auth/LoginForm.vue:50-65`, `app/components/auth/SignupForm.vue`, `app/components/auth/LoginForm.vue:153-155`
- **Fix sketch:** wrap the client call in try/catch and set `serverError`; clear `serverError` on field change.
- **Done when:** a rejected request shows an in-form message and the form returns to an idle state; editing a field clears the stale error.

### [ ] TEST-01 — No test infrastructure at all

There is no test runner, no `test` script and no test file in the repository (glob + grep verified). Unprotected seams: `shared/validation/auth.ts`, `app/lib/form-errors.ts`, the middleware redirect logic, the health endpoint, and the server guards SEC-01 would add. Establishing a baseline is a maintainer decision, not an automatic fix.

- **Impact:** med · **Effort:** M · **Risk:** low · **Confidence:** HIGH
- **Evidence:** `package.json` (no test deps or script), repository-wide globs
- **Fix sketch:** add Vitest (or `@nuxt/test-utils`) plus a small suite over the seams above.
- **Done when:** a `pnpm test` script exists, runs green, and covers the validation schemas, the middleware redirect decision and the SEC-01 guard.

---

## Priority 2 — cheap hygiene

### [ ] DX-01 — No CI; enforcement is local only _(proposal)_

Husky runs staged lint/format on commit (`.husky/pre-commit` → `.nano-staged.mjs`) and full `typecheck` + `lint` on push (`.husky/pre-push`). There is no CI configuration (no `.github/`, `.gitlab-ci.yml`, or equivalent), so pushed history is unenforced.

- **Impact:** low–med · **Effort:** S · **Risk:** low · **Confidence:** HIGH
- **Fix sketch:** a minimal workflow running the already-green `pnpm typecheck` and `pnpm lint` (and `pnpm db:check` if a database service is added).
- **Done when:** a workflow runs on push and pull request and fails on a deliberate lint or type error.

### [ ] DEBT-01 — Redundant direct `vue-router` dependency

`package.json:67` pins `vue-router@5.4.0` directly, but no source file imports it — routing comes from Nuxt. A redundant pin can skew the router version Nuxt resolves.

- **Impact:** low · **Effort:** S · **Risk:** low · **Confidence:** MED (no source import found by grep; removal needs a build check)
- **Evidence:** `package.json:67`, repository-wide grep for `vue-router` imports
- **Fix sketch:** remove the direct dependency and let Nuxt supply the router.
- **Done when:** the dependency is gone, the app still builds, and `pnpm typecheck` and `pnpm lint` stay green.

### [ ] DEBT-02 — `cn` helper has two sources of truth

Generated UI components import the `cn` package directly (`app/components/ui/button/Button.vue:5`), while `components.json:18` aliases utils to `@/lib/utils` and `app/lib/utils.ts:1` is a one-line re-export of the same package. The package itself is legitimate — `cn@0.5.0` is the official shadcn-ui package (trusted GitHub publisher, "drop-in replacement for clsx + tailwind-merge"), verified against the npm registry — so this is configuration drift, not a supply-chain problem. Future `shadcn-vue add` runs will keep writing `from 'cn'`.

- **Impact:** low · **Effort:** S · **Risk:** low · **Confidence:** HIGH
- **Fix sketch:** pick one canonical import (accept the package import and make the alias match, or vendor a local helper) and align `components.json` and the generated components.
- **Done when:** one import path is used everywhere, `components.json` matches it, and the UI components still render correct merged classes.

---

## Decision required (not a defect)

### [ ] SEC-02 — Unverified email addresses receive working sessions

`server/utils/auth.ts:23-27` enables email/password with `autoSignIn: true` and no `emailVerification`; better-auth's `requireEmailVerification` is opt-in, so a new account is signed in immediately. No mailer exists in the stack yet. Today the blast radius is small: `defaultRole: 'student'` and role promotion is admin-only, so this does not grant elevated access.

- **Impact:** med · **Effort:** M (needs a mailer) · **Risk:** med · **Confidence:** HIGH on behaviour, product judgement required
- **Fix sketch:** either accept it for the 4-week build and record the decision, or add a mailer plus `requireEmailVerification` with a `sendVerificationEmail` callback.
- **Done when:** the decision is recorded in the README or a decision log, and — if verification is adopted — an unverified account cannot obtain a session.

---

## Product direction options (proposals, not defects)

Options, not obligations — pick the slice that fits the build plan.

- [ ] **NEXT-A — Catalog + enrollment vertical slice.** LMS schema (courses / modules / lectures / enrollments, PRD §7) + catalog pages + enrollment API. Establishes the data-layer pattern everything else reuses. _Prerequisite: SEC-01._
- [ ] **NEXT-B — Progress tracking + notes/bookmarks.** Builds on NEXT-A; covers PRD §3.1 and §5.
- [ ] **NEXT-C — Instructor authoring + admin approval queue.** Exercises the student / instructor / admin roles that auth already carries.
- [ ] **Deferred (already agreed in README):** RAG tutor, pgvector embeddings, Redis, mail — until course content exists. The AI service stack is still an open decision.

**Done when (for whichever is chosen):** the slice ships with its schema, migration, server routes behind the SEC-01 guard, pages, and a `pnpm test` cover for the new logic.

---

## Verified during the audit — no action required

Checked and cleared; listed so the same ground is not re-covered. Tick if you want to record the review.

- [x] **better-auth hardening is adequate by default.** Verified in the official 1.7 docs: production rate limiting is on (100 requests / 10s, with a stricter `/sign-in/email` rule of 3 / 10s), origin validation against the app base URL, `SameSite=Lax` session cookies, scrypt password hashing, 7-day session expiry. Missing explicit config is not a missing protection. `trustedOrigins` is only needed if extra origins are added (e.g. preview deployments) — see SEC-02 for the one real gap.
- [x] **Database layer is sound.** `pg` `Pool(max: 10)` with a `globalThis` singleton, an idle-client `error` listener, and lazy creation on first use (`server/db/index.ts`). Migration `0000` matches the current auth schema.
- [x] **Open redirect is closed** — the forms sanitise the post-login `redirect` to a same-origin path.
- [x] **`/api/auth-providers` exposes provider names only** — no secret material, correctly unauthenticated.
- [x] **shadcn-vue critical rules and Vue 3 practices pass** in application code: `FieldGroup`/`Field` form layout (no `space-y-*`), `data-icon` on button icons without sizing classes, `gap-*` spacing, `size-*` for square boxes, semantic colour tokens only, minimal reactive state, no `v-html`, hydration-safe colour-mode toggle.
- [x] **README is accurate** for the claims sampled: routes table, `/api/auth-providers`, "no domain tables modelled yet", the forms pattern, local-development ports and the Drizzle workflow. No docs findings.
- [x] **No performance findings** — no list rendering, hot paths or unbounded queries exist at this stage, and the client session is read from better-auth's shared store (no per-caller refetch).
- [x] **`cn@0.5.0` is the official shadcn-ui package**, confirmed against the npm registry (trusted publisher `shadcn`, repository `github.com/shadcn-ui/cn`). No typosquat or supply-chain concern.

---

## Coverage and limits

- **Covered:** auth and session flow end-to-end, server config, route middleware, data layer and migrations, health endpoint, credential forms and shared validation, shadcn-vue/Vue conventions, dependency manifest, Husky hooks, CI presence, README accuracy, and the PRD-grounded next steps.
- **Not covered:** runtime testing (the database was not started and the app was not booted), adversarial security testing, a vulnerability-database dependency scan, and mobile or accessibility audits.
- **Method:** four bounded read-only discovery passes, then direct verification of every decision-bearing file, official better-auth documentation, and the npm registry.
