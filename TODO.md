# TODO — VertexAI

> Status: **2026-10-28** · `main` @ `83ed027` · `pnpm validate` green · local Postgres running · working tree clean.

The Week 1 student loop is complete: register → browse catalog → open a course → enroll → dashboard. The rest of the PRD (learning content, assessments, AI tutor, instructor workspace, admin panel, community, hardening) is still unbuilt. `docs/PLAN.md` still marks Week 1 as Days 1–3; treat this file as the current status until that document is refreshed.

## Status against the PRD

| Area                     | PRD refs      | Status      | What exists today                                                                                                                                                                                                                                         |
| ------------------------ | ------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth, sessions, roles    | FR-S1, FR-AD4 | 🟡 Partial  | better-auth email/password, optional GitHub OAuth, httpOnly DB sessions, default `student` role, admin plugin primitives, account settings and avatar menu. No email verification and no application-level role-management UI.                            |
| Catalog & discovery      | FR-S3         | ✅ Done     | Public list with `q`, category, difficulty, pagination; categories endpoint; responsive filters and empty/error/loading states. Rating filter intentionally omitted — the data model has no ratings.                                                      |
| Course detail            | PRD §8.2      | ✅ Done     | Public course page with curriculum; pending courses visible only to their owner/admin.                                                                                                                                                                    |
| Course authoring         | FR-I1         | 🟡 API only | `POST /api/courses`, `PUT /api/courses/:id`, `POST /api/courses/:id/modules`, `GET /api/courses/mine`. Ownership/admin checks in the service layer. No instructor pages, no lecture uploads.                                                              |
| Enrollment & dashboard   | FR-S2         | 🟡 Partial  | Idempotent enrollment, `/api/enrollments/me`, real enrolled-course cards, progress bar and loading/error/empty states. `progress_percent` is never written, so every course shows 0%; no streak counter.                                                  |
| Lectures & player        | FR-S4, FR-S5  | ❌ Missing  | No `lecture_progress`, notes or bookmarks tables; no storage service, upload, streaming route, player page, resume position, speed control, or timestamped notes.                                                                                         |
| Assignments              | FR-S6, FR-I3  | ❌ Missing  | No schema, endpoints, submission upload, deadline handling, rubric, grading queue or feedback UI.                                                                                                                                                         |
| Quizzes                  | FR-S7, FR-I4  | ❌ Missing  | No quiz schema, builder, attempt flow, MCQ/multi-select/short-answer renderer, or auto-grading.                                                                                                                                                           |
| Gamification             | FR-S8, FR-S9  | ❌ Missing  | No certificates, PDF job, badges, user badges or streaks.                                                                                                                                                                                                 |
| Recommendations          | FR-S10, FR-A4 | ❌ Missing  | No recommendations or study-plan tables/logic.                                                                                                                                                                                                            |
| AI tutor & RAG           | FR-A1–FR-A8   | ❌ Missing  | No AI schema, pgvector tables, embedding/LLM clients, chunking, retrieval, citations, summaries, quiz generation, flashcards, depth modes or mastery tracking. No AI code exists yet; the implementation shape is an open decision (see below).           |
| Instructor analytics     | FR-I5, FR-I6  | ❌ Missing  | No drop-off, quiz-score or time-on-task aggregates; no announcements.                                                                                                                                                                                     |
| Admin panel              | FR-AD1–FR-AD5 | ❌ Missing  | No approval endpoint/queue, no `course_approvals`, no user list/suspend/role UI, no platform metrics, no moderation. better-auth's admin plugin already supplies role/ban primitives and endpoints; the app has no admin surface over them.               |
| Community & notification | PRD §3.1      | ❌ Missing  | No discussions, replies, flagging, announcements or notifications.                                                                                                                                                                                        |
| Non-functional           | PRD §6, §8.9  | 🟡 Partial  | Zod validation, server guards, ownership checks, a health probe and shadcn-vue components with semantic tokens exist. No app-level rate limits (only better-auth defaults), no cache, no structured request logging, no tests, no CI, no i18n, no deploy. |
| UX                       | PRD §3.1      | 🟡 Partial  | Responsive shadcn-vue UI, dark mode, real loading/empty/error states, account settings. No workspace shell, no instructor/admin navigation, no WCAG audit.                                                                                                |

Legend: ✅ done · 🟡 partial / API only · ❌ not started.

### What a reviewer can demo today

- **Visitor:** landing page, public catalog with filters/search/pagination, approved course detail.
- **Student:** sign up, sign in, enroll (idempotent), dashboard with enrolled courses and a 0% progress bar.
- **Instructor:** nothing in the UI. The API can create a `pending` course and add modules; there is no way to upload a lecture or submit for approval.
- **Admin:** nothing in the UI. Role promotion happens through better-auth's admin API/DB; there is no approval queue or user-management screen.

### Gaps that will block the next demo

1. **Progress is a placeholder.** `enrollments.progress_percent` defaults to `0` and no code updates it. The dashboard is honest about enrollment, not about learning progress.
2. **Only `approved` courses are enrollable, but there is no approval path.** A course created through the API stays invisible until someone edits the database. Build the approval endpoint or seed an approved course before demoing authoring.
3. **Week 2 needs content, but there is no instructor UI or storage.** Lecture upload cannot be exercised end-to-end yet.
4. **No seed data.** Every demo currently depends on manually inserted rows. Add a repeatable seed script.
5. **The README feature list is aspirational.** It describes lectures, assignments, quizzes, certificates, AI tutor and analytics that do not exist yet. Keep it clearly forward-looking until those slices ship.

## Next work

The order below keeps the PRD's weekly increments but pulls **instructor authoring + a minimal approval path** forward: Week 2 cannot be demoed without published lecture content.

### P0 — Close the authoring loop

- [ ] Add `app/middleware/instructor.ts` (role ∈ `instructor`, `admin`) and a role-aware workspace layout/nav.
- [ ] Add `/instructor` — list the signed-in instructor's courses from `GET /api/courses/mine`.
- [ ] Add `/instructor/courses/new` — create-course form using `createCourseSchema`; show `pending` status clearly.
- [ ] Add `/instructor/courses/[id]` — edit metadata and add/reorder modules.
- [ ] Add the `course_approvals` table (`course_id`, `reviewed_by`, `decision`, `comment`, `reviewed_at`).
- [ ] Add `GET /api/admin/courses/pending` and an admin decision endpoint (`approve` / `reject`) behind `requireRole('admin')`; record the decision.
- [ ] Add `/admin/approvals` — pending queue with course preview and approve/reject actions.
- [ ] Add a seed script for local/demo data: admin, instructor, student, an approved course with modules and a lecture.
- [ ] Acceptance: instructor creates a course → admin approves → course appears in the catalog → student enrolls.

### P0 — Lecture content and player (PRD Week 2, Days 8–9)

- [ ] Add `server/services/storage.ts` with a local-disk driver (`.data/storage`, gitignored) and env-based configuration; keep the interface S3-compatible for later.
- [ ] Add `POST /api/modules/:id/lectures` — multipart upload validated to the owning instructor/admin; store the file and create the lecture row.
- [ ] Add `GET /api/lectures/:id/video` with HTTP Range support for progressive playback.
- [ ] Add `lecture_progress`, `notes` and `bookmarks` tables + migration, with indexes on user/lecture/course.
- [ ] Add a progress service: throttled watched-seconds updates, ≥90% completion, recompute enrollment `progress_percent`.
- [ ] Add `POST /api/lectures/:id/progress`, `POST /api/lectures/:id/notes`, `POST /api/lectures/:id/bookmarks` (or the equivalent nested routes) with session + enrollment checks.
- [ ] Add `/learn/[courseId]` (resume redirect) and `/learn/[courseId]/lectures/[lectureId]` (player + curriculum nav).
- [ ] Player: restore last position, playback-speed control, mark complete, resume across reloads.
- [ ] Notes/bookmarks: timestamped create/list/delete, click-to-seek.
- [ ] Point dashboard cards and enrolled-course links at the learning route; show real progress.
- [ ] Acceptance: watch a lecture → progress persists → dashboard % updates; notes/bookmarks survive a reload.

### P0 — Assignments and quizzes (PRD Week 2, Days 10–11)

- [ ] Add `assignments` and `assignment_submissions` schema + migration.
- [ ] Instructor: create assignment (instructions, rubric JSON, deadline); list submissions; grade with feedback.
- [ ] Student: assignments page with deadlines, submission upload, grade/feedback view.
- [ ] Enforce deadline and course-enrollment checks in the service layer; reuse the storage service.
- [ ] Add quiz schema: `quizzes`, `quiz_questions`, `quiz_options`, `quiz_attempts`, `quiz_answers` + migration.
- [ ] Instructor manual quiz builder: MCQ, multi-select and short-answer questions, with question ordering.
- [ ] Student attempt flow and result view; auto-grade objective types; flag short answers for manual review.
- [ ] Store attempt history and expose it to the dashboard/analytics.
- [ ] Acceptance: student submits an assignment and sees a grade; a quiz attempt is auto-graded correctly.

### P1 — Gamification and instructor analytics (PRD Week 2, Days 12–14)

- [ ] Add Redis to `docker-compose.yml`, a BullMQ queue producer, and a worker process (`pnpm dev:worker`).
- [ ] Certificate job: render a PDF on 100% completion, store it, create a `certificates` row, expose a download page.
- [ ] Badges and `user_badges`: first course completed, 7-day streak, perfect quiz score.
- [ ] Daily streak job + `streaks` table; surface current/longest streak on the dashboard.
- [ ] Instructor analytics: per-lecture drop-off, average quiz score, time-on-task; charts from shadcn-vue.
- [ ] Announcements: instructor composer + enrolled-student notification fan-out.
- [ ] Acceptance: a student completes a course and receives a certificate; the instructor sees real aggregates.

### P1 — AI tutor and RAG (PRD Week 3)

- [ ] **Decision:** pick the embeddings provider and dimension (default leaning: OpenAI `text-embedding-3-small`, 1536 dims) before writing the schema.
- [ ] Add `ai.ts` schema: `ai_chat_sessions`, `ai_chat_messages`, `document_chunks` with `vector(1536)`, ivfflat index, `study_plans`, `flashcards`, `recommendations`.
- [ ] Enable the `vector` extension in a migration; verify the Docker image already ships pgvector (it does).
- [ ] Add an Anthropic client wrapper (timeouts, retries, model constants) and an embeddings client.
- [ ] Chunking + ingestion job: transcript → overlapping chunks → embeddings → `document_chunks`; backfill command for existing lectures.
- [ ] Retriever scoped by `course_id`; chat prompt includes mode, recent history, top-k chunks, and the question.
- [ ] Chat API + panel UI with source citations that deep-link to lecture/timestamp.
- [ ] Lecture summarization endpoint + UI.
- [ ] Flashcard generation per module + deck UI.
- [ ] Auto-quiz generation from a transcript + instructor review/approve flow.
- [ ] Depth modes (beginner/intermediate/advanced) persisted on the session and applied to prompts.
- [ ] Per-topic mastery tracking; feed difficulty defaults and recommendations.
- [ ] Study plan from quiz history; rule-based + embedding recommendations.
- [ ] Acceptance: a tutor answer cites only the current course's material; no cross-course leakage; generated quizzes land in an instructor review queue.

### P1 — Admin and community (PRD Week 4, Days 22–24)

- [ ] Admin users: list/search, suspend/unsuspend (better-auth ban), assign/revoke role; write `audit_logs`.
- [ ] Admin overview: DAU, enrollments, completion rate, revenue stub from `payments`.
- [ ] Moderation queue for flagged discussion posts; unflag/delete.
- [ ] Discussions: per-course threads, posts, replies, flagging; ownership/moderation checks.
- [ ] Announcements and in-app notifications; email only if a provider is chosen.
- [ ] Acceptance: all three role workspaces are usable end-to-end.

### P2 — Hardening and delivery (PRD Week 4, Days 25–28)

- [ ] Rate limits per PRD §8.9: auth 10/min/IP, AI chat 20/min/user, everything else 100/min/user.
- [ ] Redis cache for catalog listings (5 min + invalidation on approval/update) and leaderboards (60 s) if built.
- [ ] Structured request logging + request IDs; keep `/api/health` green.
- [ ] Resolve SEC-02 (email verification) and record the decision.
- [ ] Accessibility pass: keyboard navigation, labels, focus states, contrast, reduced motion.
- [ ] i18n scaffolding (English strings extracted; no full translation).
- [ ] Add Vitest + `pnpm test`; cover validation schemas, server guards, enrollment/progress, quiz grading, and AI prompt assembly.
- [ ] Add GitHub Actions CI: format check, lint, typecheck, tests.
- [ ] Containerize the app; add a staging deploy + smoke test.
- [ ] Seed demo data for every role and the main flows.
- [ ] Sync README/docs with reality; fix the broken `docs/PRD.md` link.
- [ ] Acceptance: CI green, staging demo works, seeded data covers the full student/instructor/admin story.

## Open decisions

- **Embeddings provider + dimension** — must be fixed before the `document_chunks` migration (PRD default is 1536).
- **AI service shape** — `docs/PLAN.md` chooses an in-process TS module under `server/services/ai/`; the repository defaults still treat Python/FastAPI vs TS as open. Confirm before Week 3 rather than adding a second service casually.
- **Email verification** — enable it (needs a mailer) or accept unverified sessions for this build and document the choice (SEC-02).
- **Storage** — local disk for the build; S3/MinIO driver at deploy.
- **Queue/cache** — Redis + BullMQ is the documented plan; nothing is installed yet.
- **Rating filter** — PRD FR-S3 mentions ratings, but the PRD schema has no ratings table. Either add a ratings model or record the omission.
- **Payments/revenue** — gateway is out of scope; decide whether the `payments` stub and revenue metric are in scope for the admin dashboard.

## Carry-over from `docs/AUDIT.md` (still open)

- [ ] **BUG-02** — Credential forms do not wrap `authClient` calls in `try/catch`, and the server error is not cleared while editing. A network rejection can leave the form stuck; add the error boundary and clear-on-change.
- [ ] **TEST-01** — No test runner, `test` script or test file.
- [ ] **DX-01** — No CI; enforcement is local Husky hooks only.
- [ ] **DEBT-01** — Redundant direct `vue-router` dependency in `package.json`.
- [ ] **DEBT-02** — `cn` has two import paths (`cn` package vs `@/lib/utils` alias); align `components.json` and generated components.
- [ ] **SEC-02** — Unverified email addresses receive working sessions; decide and record.

## Definition of done for the remaining build

1. A student can register, enroll, watch lectures, take notes, submit assignments, pass quizzes, and earn a certificate.
2. An instructor can create a course, upload lectures, build/review quizzes, grade submissions, and see analytics.
3. An admin can approve courses, manage users/roles, view platform metrics, and moderate flagged content.
4. The AI tutor answers only from the current course's material, with citations, and supports summaries, flashcards, quiz drafts, depth modes, and a study plan.
5. `pnpm validate` and `pnpm test` pass; CI is green; the app is deployed and demoable with seed data.
