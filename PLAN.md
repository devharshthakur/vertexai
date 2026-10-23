# VertexAI — Build Plan

**What this document is:** my working reference for building VertexAI, an AI-augmented LMS
with a course-grounded AI tutor. It captures _what_ the app does, _how_ it is structured, and
_why_ each technology is used — so I never have to re-decide things mid-build.

**What it is not:** a replacement for `docs/PRD.md` (canonical product scope, FR IDs, table
DDL). When the two disagree on technology, **this file wins** — our stack is deliberately
substituted (see §3).

**How to use it:** read §1–§5 once, then keep §6–§12 open while building. Update the status
markers (✅ / 🚧 / ⬜) as work completes.

---

## 1. What We Are Building

A learning platform where three kinds of users work in one app:

- **Students** browse a catalog, enroll, watch lectures, take notes, attempt quizzes, earn
  certificates — and ask an **AI tutor** questions that are answered _only from that course's
  own material_, with citations back to the exact lecture.
- **Instructors** author courses (videos, transcripts, assignments, quizzes), review
  AI-generated quiz drafts, and see analytics on where students struggle.
- **Admins** approve courses before they go live, manage users and roles, and watch
  platform-wide metrics.

Single developer, 4 weeks, and explicitly a **learning project** — every concept I touch is
listed in §5 with a plain-language explanation.

---

## 2. Full Project Structure

✅ = exists today · ⬜ = to be created

```text
vertexai/
│
├── app/                                    # ── Vue frontend (Nuxt srcDir) ──────────────────
│   ├── app.vue                        ✅   # root: layout + page + toast host
│   ├── app.config.ts                  ✅
│   ├── assets/css/main.css            ✅   # Tailwind v4 + shadcn theme tokens (ONLY global css)
│   │
│   ├── components/
│   │   ├── ui/                        ✅   # shadcn-vue ONLY — installed via CLI, never hand-styled
│   │   │                                 #   installed: button, card, field, input, label, separator
│   │   │                                 #   add later: sidebar, table, dialog, sheet, tabs, select,
│   │   │                                 #   badge, avatar, dropdown-menu, sonner, skeleton,
│   │   │                                 #   progress, accordion, textarea, tooltip, alert-dialog,
│   │   │                                 #   chart, empty, toggle-group, scroll-area, resizable
│   │   ├── layout/                    ⬜   # app shell: AppSidebar (role-driven nav), AppHeader,
│   │   │                                 #   UserNav, NotificationsBell, ModeToggle (move existing ✅)
│   │   ├── auth/                      ✅   # LoginForm, SignupForm
│   │   ├── course/                    ⬜   # CourseCard, CatalogFilters, CourseDetailHeader,
│   │   │                                 #   ModuleAccordion, EnrollButton, ProgressBadge
│   │   ├── player/                    ⬜   # VideoPlayer (resume + speed), LectureNav,
│   │   │                                 #   TranscriptView, NotesPanel, BookmarksList
│   │   ├── quiz/                      ⬜   # QuizAttemptView, QuestionRenderer (mcq/multi/short),
│   │   │                                 #   AttemptResult
│   │   ├── ai-tutor/                  ⬜   # ChatPanel, ChatMessageList, ChatInput, CitationChip,
│   │   │                                 #   TutorModeToggle, SummaryCard, FlashcardDeck, StudyPlanView
│   │   ├── gamification/              ⬜   # StreakCounter, BadgeList, CertificateCard, LeaderboardTable
│   │   ├── instructor/                ⬜   # CourseForm, ModuleEditor, LectureUploadForm, QuizBuilder,
│   │   │                                 #   QuestionEditor, AiQuizReviewCard, AnalyticsCards,
│   │   │                                 #   GradingQueueTable, GradeSubmissionDialog, AnnouncementComposer
│   │   ├── admin/                     ⬜   # UsersTable, RoleSelectDialog, ApprovalQueueTable,
│   │   │                                 #   CoursePreviewDialog, PlatformMetricCards, FlaggedPostsTable
│   │   └── discussion/                ⬜   # ThreadList, PostItem, PostComposer
│   │       # NOTE: no common/ folder — shadcn Empty/Skeleton/Spinner/Alert cover those needs
│   │
│   ├── composables/                        # thin typed wrappers over useFetch / useAsyncData
│   │   ├── useAuthSession.ts          ✅
│   │   ├── useAuthProviders.ts        ✅
│   │   ├── useRole.ts                 ⬜   # derived role flags (isStudent/isInstructor/isAdmin)
│   │   ├── useCourses.ts              ⬜   # catalog list + filters
│   │   ├── useCourse.ts               ⬜   # course detail
│   │   ├── useEnrollment.ts           ⬜
│   │   ├── useLectureProgress.ts      ⬜   # throttled progress posting (~every 10s)
│   │   ├── useNotes.ts                ⬜
│   │   ├── useQuiz.ts                 ⬜
│   │   ├── useAiChat.ts               ⬜   # chat session state + send/receive
│   │   ├── useNotifications.ts        ⬜
│   │   └── useRecommendations.ts      ⬜
│   │
│   ├── layouts/
│   │   ├── default.vue                ✅   # public shell: landing, catalog, auth pages
│   │   └── workspace.vue              ⬜   # authenticated shell: AppSidebar + AppHeader;
│   │                                     #   nav items derive from session role
│   ├── lib/
│   │   ├── auth-client.ts             ✅   # better-auth Vue client
│   │   ├── utils.ts                   ✅   # cn() etc.
│   │   ├── form-errors.ts             ✅
│   │   └── constants.ts               ⬜   # ROLES, CATEGORIES, DIFFICULTIES, TUTOR_MODES
│   │
│   ├── middleware/                         # client-side route guards (UX gate, not security)
│   │   ├── auth.ts                    ✅   # session required → else /auth/login?redirect=…
│   │   ├── guest.ts                   ✅   # signed-in users bounced out of /auth/**
│   │   ├── instructor.ts              ⬜   # role ∈ {instructor, admin}
│   │   └── admin.ts                   ⬜   # role === 'admin'
│   │
│   ├── pages/
│   │   ├── index.vue                  ✅   # landing
│   │   ├── auth/login.vue             ✅
│   │   ├── auth/signup.vue            ✅
│   │   ├── courses/index.vue          ⬜   # catalog: search + category/difficulty filters (public)
│   │   ├── courses/[id]/index.vue     ⬜   # course detail + enroll CTA (public); discussions tab
│   │   ├── dashboard.vue              🚧   # student home: enrollments, progress %, streak (stub ✅)
│   │   ├── learn/[courseId]/index.vue ⬜   # resolves resume position → redirects to lecture
│   │   ├── learn/[courseId]/lectures/[lectureId].vue  ⬜  # player + notes + AI tutor panel
│   │   ├── learn/[courseId]/quizzes/[quizId].vue      ⬜  # quiz attempt + result
│   │   ├── me/assignments.vue         ⬜   # deadlines, submissions, grades
│   │   ├── me/certificates.vue        ⬜
│   │   ├── me/study-plan.vue          ⬜   # study plan + flashcards + recommendations
│   │   ├── instructor/index.vue       ⬜   # my courses + headline stats
│   │   ├── instructor/courses/new.vue ⬜
│   │   ├── instructor/courses/[id]/index.vue     ⬜   # builder: modules, lectures, submit for approval
│   │   ├── instructor/courses/[id]/quizzes.vue   ⬜   # manual builder + AI draft review
│   │   ├── instructor/courses/[id]/grading.vue   ⬜   # submissions queue
│   │   ├── instructor/courses/[id]/analytics.vue ⬜   # drop-off, avg score, time-on-task
│   │   ├── admin/index.vue            ⬜   # platform overview metrics
│   │   ├── admin/users.vue            ⬜   # search, role assign, suspend
│   │   ├── admin/approvals.vue        ⬜   # course approval queue
│   │   └── admin/moderation.vue       ⬜   # flagged forum posts
│   │
│   └── plugins/session.client.ts      ✅   # warm session fetch on client boot
│
├── server/                                 # ── Nitro backend (runs ONLY on the server) ──────
│   ├── api/                                # one file per endpoint; thin — delegates to services
│   │   ├── auth/[...all].ts           ✅   # better-auth catch-all handler
│   │   ├── me.get.ts                  ✅
│   │   ├── health.get.ts              ✅   # uptime / observability
│   │   ├── auth-providers.get.ts      ✅
│   │   ├── courses/                   ⬜   # index.get (catalog, cached) · index.post · [id].get ·
│   │   │                                 #   [id].put · [id]/enroll.post · [id]/approve.post ·
│   │   │                                 #   [id]/modules.post · [id]/announcements.post
│   │   ├── modules/[id]/lectures.post ⬜   # multipart upload → storage + enqueue embedding job
│   │   ├── lectures/                  ⬜   # [id]/video.get (stream, Range support) ·
│   │   │                                 #   [id]/progress.post · [id]/notes.post · [id]/bookmarks.post
│   │   ├── enrollments/me.get         ⬜
│   │   ├── assignments/               ⬜   # index.post (instructor) · [id]/submit.post (student)
│   │   ├── submissions/[id]/grade.put ⬜
│   │   ├── quizzes/                   ⬜   # index.post · [id]/attempt.post
│   │   ├── attempts/[id]/submit.post  ⬜   # auto-grade objective answers, update mastery
│   │   ├── ai/                        ⬜   # the in-process AI module's HTTP surface:
│   │   │                                 #   chat/sessions/index.post · chat/sessions/[id]/messages.post
│   │   │                                 #   · chat/sessions/[id]/mode.put · lectures/[id]/summarize.post
│   │   │                                 #   · lectures/[id]/generate-quiz.post · modules/[id]/flashcards.post
│   │   │                                 #   · study-plan.post
│   │   ├── recommendations/me.get     ⬜
│   │   ├── users/me/badges.get        ⬜
│   │   ├── users/me/streak.get        ⬜
│   │   ├── leaderboard/[courseId].get ⬜   # Redis-cached (60s)
│   │   ├── discussions/               ⬜   # courses/[courseId]/threads/* · threads/[id]/posts/*
│   │   ├── notifications/             ⬜   # index.get · [id]/read.post
│   │   └── admin/                     ⬜   # users/* · courses/pending.get · analytics/overview.get ·
│   │                                     #   moderation/flagged-posts.get
│   │
│   ├── db/
│   │   ├── index.ts                   ✅   # Drizzle client — MUST read process.env so the worker
│   │   │                                 #   process shares the exact same client
│   │   ├── schema/                         # one file per domain (Drizzle table definitions)
│   │   │   ├── auth.ts                ✅   # users, sessions, accounts, verifications (+ role column)
│   │   │   ├── courses.ts             ⬜   # courses, modules, lectures
│   │   │   ├── enrollments.ts         ⬜   # enrollments, lecture_progress, notes, bookmarks
│   │   │   ├── assignments.ts         ⬜   # assignments, assignment_submissions
│   │   │   ├── quizzes.ts             ⬜   # quizzes, quiz_questions, quiz_options, quiz_attempts, quiz_answers
│   │   │   ├── gamification.ts        ⬜   # certificates, badges, user_badges, streaks
│   │   │   ├── ai.ts                  ⬜   # ai_chat_sessions, ai_chat_messages, document_chunks
│   │   │   │                             #   (vector column + ivfflat index), study_plans, flashcards,
│   │   │   │                             #   recommendations
│   │   │   ├── discussions.ts         ⬜   # discussion_threads, discussion_posts, announcements, notifications
│   │   │   ├── admin.ts               ⬜   # course_approvals, payments, audit_logs
│   │   │   └── index.ts               ✅   # re-exports everything (drizzle-kit entry point)
│   │   └── migrations/                ✅   # generated by drizzle-kit — never hand-edit
│   │
│   ├── queues/index.ts                ⬜   # BullMQ producers: API routes call these to ENQUEUE work
│   │
│   ├── services/                           # all business logic lives here; routes stay thin
│   │   ├── course-service.ts          ⬜
│   │   ├── enrollment-service.ts      ⬜
│   │   ├── progress-service.ts        ⬜   # progress % recompute, resume position
│   │   ├── assignment-service.ts      ⬜
│   │   ├── quiz-service.ts            ⬜   # auto-grading, mastery updates
│   │   ├── gamification-service.ts    ⬜   # badges, streaks, certificates
│   │   ├── discussion-service.ts      ⬜
│   │   ├── notification-service.ts    ⬜
│   │   ├── admin-service.ts           ⬜
│   │   ├── storage.ts                 ⬜   # ONE interface: put/get/stream. Local-disk impl now,
│   │   │                                 #   S3 impl later — swapped by env var, callers never change
│   │   └── ai/                        ⬜   # the RAG module (PRD's separate ai-service, done in TS)
│   │       ├── llm-client.ts          ⬜   # Anthropic client wrapper: retries, timeouts, model names
│   │       ├── chunking.ts            ⬜   # transcript → ~500-token chunks with overlap
│   │       ├── embeddings.ts          ⬜   # embeddings provider client (text → number vector)
│   │       ├── retriever.ts           ⬜   # pgvector top-k similarity search, scoped to a course
│   │       ├── chat.ts                ⬜   # prompt assembly (mode + chunks + history) → reply + citations
│   │       ├── summarize.ts           ⬜
│   │       ├── quiz-gen.ts            ⬜
│   │       ├── flashcards.ts          ⬜
│   │       ├── study-plan.ts          ⬜
│   │       ├── recommendations.ts     ⬜   # rule-based + embedding similarity
│   │       └── mastery.ts             ⬜   # per-topic mastery score tracking
│   │
│   ├── utils/                              # auto-imported inside server/ only
│   │   ├── auth.ts                    ✅   # better-auth instance (admin plugin: default role student)
│   │   ├── auth-providers.ts          ✅
│   │   ├── require-session.ts         ✅   # 401 if no session
│   │   ├── require-role.ts            ⬜   # 403 unless session role matches
│   │   ├── validate.ts                ⬜   # zod-validate request bodies/queries (shared schemas)
│   │   └── rate-limit.ts              ⬜   # per-IP on auth, per-user on ai/chat (PRD §8.9)
│   └── middleware/logger.ts           ⬜   # structured request logging
│
├── worker/                                 # ── BullMQ consumers: 2nd process, SAME codebase ──
│   ├── main.ts                      ⬜   # boots all workers; run via `pnpm dev:worker`
│   └── processors/                  ⬜   # embedding.ts · certificate.ts · streaks.ts ·
│                                         #   recommendations.ts · notifications.ts
│
├── shared/                                 # ── code usable on BOTH client and server ────────
│   ├── validation/                       # zod schemas per API payload — ONE source of truth,
│   │   ├── auth.ts                  ✅   #   used by the client form AND the server route
│   │   ├── courses.ts / quizzes.ts / assignments.ts / ai.ts / discussions.ts / admin.ts  ⬜
│   └── types/                       ⬜   # DTO shapes the API returns (Course, QuizAttempt, …)
│
├── docs/PRD.md + PRD.docx             ✅   # canonical product spec
├── public/                          ✅   # static assets only (NEVER user uploads)
├── .data/storage/                   ⬜   # local uploads (videos, PDFs, certificates) — gitignored
├── docker-compose.yml               ✅   # postgres ✅ · redis ⬜ (to add in Week 2)
├── drizzle.config.ts / nuxt.config.ts / components.json / tsconfig.json  ✅
└── package.json                     ✅   # scripts to add: dev:worker, queues dashboard
```

---

## 3. Decisions Already Made (don't re-litigate)

| #   | Decision            | Choice                                                                                             | Why                                                                                                                                                          | PRD says                  |
| --- | ------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------- |
| 1   | Architecture        | **One Nuxt app** (frontend + API in one deployable)                                                | 1 dev / 4 weeks; SSR + API in one process; no CORS, no second service                                                                                        | React SPA + Express API   |
| 2   | AI service          | **In-process module** `server/services/ai/`                                                        | RAG concepts are language-neutral; a Python service adds tooling, not learning; extraction later is mechanical because the module only touches DB + LLM APIs | Separate FastAPI service  |
| 3   | Auth                | **better-auth session cookies** (DB-backed sessions)                                               | SSR-first app; httpOnly cookies are simpler and safer than hand-rolled JWT; JWT plugin exists if a mobile app ever needs bearer tokens                       | JWT access + refresh      |
| 4   | Roles               | **Single `role` column** on users (better-auth admin plugin)                                       | PRD's roles/user_roles many-to-many is overkill; matrix in PRD §11 never requires one user to hold two roles                                                 | roles + user_roles tables |
| 5   | Jobs                | **Redis + BullMQ**, worker as a **second process** of the same codebase                            | Real queue semantics; keeps slow AI/PDF work off request latency (PRD §14.4); Redis doubles as the cache                                                     | Same                      |
| 6   | Vector store        | **pgvector inside the same Postgres**                                                              | No extra database to run at this scale                                                                                                                       | Same                      |
| 7   | File storage        | **Local disk now, S3 later**, behind one `storage.ts` interface                                    | Least infra in dev; swap is an env var at deploy                                                                                                             | S3/MinIO                  |
| 8   | LLM provider        | **Anthropic (Claude)** for chat/summarize/quiz-gen                                                 | PRD choice; just an API key                                                                                                                                  | Same                      |
| 9   | Embeddings provider | **Decide at Week 3 Day 1** (default: OpenAI `text-embedding-3-small`, 1536 dims — matches PRD DDL) | Vector dimension is baked into the schema, so pick before writing `ai.ts`                                                                                    | Unspecified               |
| 10  | UI                  | **shadcn-vue only** (registry-first, compose second, flag gaps)                                    | Project rule; no other component library, no hand-rolled duplicates                                                                                          | Unspecified               |
| 11  | IDs                 | `users.id` stays **text** (better-auth); new tables use **UUID PKs** with text FK to users         | Matches what better-auth already migrated                                                                                                                    | UUID everywhere           |

---

## 4. Tech Stack Map

| Layer           | We use                                             | Used for                                         | (PRD §13 suggestion — superseded) |
| --------------- | -------------------------------------------------- | ------------------------------------------------ | --------------------------------- |
| Framework       | **Nuxt 4 / Vue 3 / TypeScript** (SSR)              | Pages, components, API — one app                 | React 18 + Vite SPA               |
| Data fetching   | `useFetch` / `useAsyncData` (typed)                | Client → our API                                 | TanStack Query                    |
| UI              | **shadcn-vue** + reka-ui + **Tailwind v4**         | Every visible element                            | —                                 |
| Server          | **Nitro** server routes (`server/`)                | REST-ish JSON API                                | Express/NestJS                    |
| Auth            | **better-auth** + Drizzle adapter (+ admin plugin) | Signup, login, sessions, roles, ban              | Hand-rolled JWT                   |
| Database        | **PostgreSQL** via **Drizzle ORM**                 | System of record                                 | Same                              |
| Vector search   | **pgvector** extension                             | Embeddings for RAG                               | Same                              |
| Cache + queue   | **Redis** + **BullMQ**                             | Caching (catalog, leaderboard) + background jobs | Same                              |
| LLM             | **Anthropic API (Claude)**                         | Tutor chat, summaries, quiz generation           | Same                              |
| Embeddings      | Provider TBD at Week 3 (see §3 #9)                 | Text → vectors for RAG                           | Unspecified                       |
| Storage         | Local disk → **S3** (env-swapped)                  | Videos, PDFs, certificates                       | S3/MinIO                          |
| Validation      | **zod** schemas in `shared/`                       | Forms + API payloads, one source of truth        | —                                 |
| Package manager | **pnpm**                                           | Everything                                       | npm/pnpm                          |

---

## 5. Concepts Primer (for a beginner — read before the week that uses them)

Each concept: what it is in plain words, and **how this project uses it**.

### 5.1 SSR & the full-stack split (read: now)

Nuxt renders pages on the server first (fast first paint, SEO for the public catalog), then
"hydrates" them into an interactive Vue app. Code in `app/` can run on **both** server and
browser; code in `server/` runs **only** on the server. Rule of thumb: anything touching the
database, secrets, or the LLM lives in `server/` — never import it from `app/`.

### 5.2 Sessions vs JWT (read: now)

After login, the server gives the browser an **httpOnly cookie** containing a session token.
On every request the server looks that token up in the `sessions` table to learn who you are.
JWT instead packs identity _into_ the token itself. For a server-rendered app, DB sessions are
simpler and revocable (banning a user = deleting a row). **We use better-auth DB sessions.**

### 5.3 ORM & migrations (read: Week 1)

An ORM lets me describe tables as TypeScript objects (`server/db/schema/`) instead of writing
SQL by hand. `drizzle-kit generate` turns schema changes into versioned SQL **migration files**;
`drizzle-kit migrate` applies them. Never edit the database by hand — change a schema file,
generate, migrate.

### 5.4 Redis (read: Week 2)

Redis is an in-memory key-value store — extremely fast, not durable like Postgres. Two jobs here:

1. **Cache**: store expensive read results (catalog page, leaderboard) with a TTL so repeated
   requests skip the database.
2. **Queue transport**: BullMQ stores its job lists in Redis (see next concept).

### 5.5 Queues & workers (BullMQ) (read: Week 2)

Some work is too slow for an HTTP request: embedding a transcript, rendering a PDF certificate.
Instead of making the user wait, the API route **enqueues a job** ("embed lecture X") and
responds immediately. A separate **worker process** pulls jobs off the queue and does them.

Analogy: a restaurant. The waiter (API route) doesn't cook — they pin a ticket to the rail
(Redis queue). The kitchen (worker) cooks when it can. `pnpm dev` runs the waiters;
`pnpm dev:worker` runs the kitchen. **Repeatable jobs** (streaks, recommendations) are the same
system on a schedule, like a cron.

### 5.6 LLM basics (read: Week 3)

A large language model is a **stateless** text-in/text-out API: it remembers nothing between
calls, so "memory" = us re-sending chat history each time. The input (the **prompt**) is
measured in **tokens** (roughly ¾ of a word); cost and latency grow with tokens. Everything
the model "knows" about our course must be _put into the prompt_ — which is exactly what RAG does.

### 5.7 Embeddings (read: Week 3)

An **embedding model** turns text into a fixed-length list of numbers (a **vector**, e.g. 1536
numbers). Texts with similar meaning get vectors that are numerically _close_. This gives
computers a notion of semantic similarity: "What is a pivot in quicksort?" lands near the
quicksort paragraph of the transcript even if the words don't overlap.

### 5.8 Vector search & pgvector (read: Week 3)

pgvector adds a `vector` column type and a **distance operator** to Postgres. Finding the most
relevant chunks = `ORDER BY embedding <=> questionVector LIMIT 6` — the 6 chunks whose vectors
are closest (cosine distance) to the question's vector, filtered to the current course. An
**ivfflat index** keeps this fast once there are many chunks.

### 5.9 RAG — Retrieval-Augmented Generation (read: Week 3)

The core idea of the whole product, in two pipelines:

- **Ingestion (offline, worker):** transcript → split into chunks → embed each chunk → store in
  `document_chunks` with its course/lecture IDs.
- **Query (live, API):** student asks → embed the question → fetch top-k closest chunks _of that
  course_ → build a prompt = those chunks + chat history + depth mode + the question → send to
  Claude → return the answer plus **citations** (which lectures the chunks came from).

Why RAG instead of asking the LLM directly: the answer is **grounded** in the actual course
content (fewer made-up facts), it stays **course-scoped**, and we can show **sources**.

### 5.10 Chunking & overlap (read: Week 3)

LLMs and embeddings work on limited text sizes, so transcripts are split into ~500-token chunks.
Chunks **overlap** slightly (e.g. 50 tokens) so an idea that spans a boundary isn't cut in half.
Too small = lost context; too large = noisy retrieval.

### 5.11 Rate limiting (read: Week 4)

A per-user/per-IP counter (in Redis) that rejects requests over a budget: 10/min per IP on auth
endpoints (brute-force protection), 20/min per user on AI chat (cost control — every call costs
money), 100/min elsewhere.

### 5.12 Caching & invalidation (read: Week 4)

Cache = save a computed answer, reuse it until it might be stale. Ours: catalog listing (TTL 5
min, **plus explicit invalidation** when a course is approved/updated) and leaderboard (TTL 60s).
Rule: cache reads that are frequent and tolerate slight staleness; never cache per-user private
data without the user in the cache key.

---

## 6. How the App Works — Logic & Lifecycles

### 6.1 A normal page request (e.g. opening the catalog)

1. Browser hits a Nuxt page (`app/pages/courses/index.vue`).
2. The page calls a composable (`useCourses`) which calls `useFetch('/api/courses', …)`.
3. Nitro route `server/api/courses/index.get.ts` runs: validates query params (zod schema from
   `shared/validation/`), asks the service (`course-service`) for data, returns JSON.
4. The service talks to Postgres via Drizzle, optionally reading/writing the Redis cache.
5. The page renders with shadcn components. No business logic in the route, no fetching in
   components — composables in between.

### 6.2 The three security gates (every protected request passes all that apply)

1. **Route middleware** (`app/middleware/`) — UX gate: sends guests to login, hides pages from
   the wrong role. _Not real security_ — it only shapes navigation.
2. **Server guards** — real security: `requireSession` (401 if logged out) then `requireRole`
   (403 if wrong role) at the top of the route.
3. **Ownership checks** — in the **service layer**: "does this instructor own this course?"
   checked before any mutation (PRD §11).

### 6.3 A background job (e.g. lecture uploaded)

1. API route saves the lecture + transcript, then calls a **queue producer** (`server/queues/`)
   to enqueue `embed-lecture { lectureId }`, and responds to the user immediately.
2. BullMQ stores the job in Redis.
3. The **worker process** picks it up: runs `processors/embedding.ts` → chunk → embed → insert
   into `document_chunks`.
4. Failure handling: BullMQ retries with backoff; a permanently failing job lands in the
   failed set for inspection.

### 6.4 Where AI chat differs

Chat is **live**: the user is waiting, so it does _not_ go through the queue. The route calls
`services/ai/chat.ts` directly (embed question → retrieve → prompt → Claude → save + respond).
Only the _ingestion_ (heavy, once per lecture) goes through the worker.

---

## 7. Data Model in Plain Language

Full DDL lives in PRD §7. Groups and relationships (✅ = migrated):

- **Auth ✅** — `users` (includes `role`: student/instructor/admin, and ban fields),
  `sessions`, `accounts` (password/OAuth credentials), `verifications`. Managed by better-auth.
- **Courses** — a `course` (belongs to an instructor; `status` pending/approved/rejected gates
  catalog visibility) → has ordered `modules` → each has ordered `lectures` (video URL,
  transcript, duration, extra resources).
- **Learning** — `enrollments` links student↔course and caches `progress_percent`;
  `lecture_progress` tracks watched seconds + completion per lecture per enrollment;
  `notes` and `bookmarks` are timestamped annotations on lectures.
- **Assessment** — `assignments` (rubric + deadline) with `assignment_submissions` (file,
  grade, feedback); `quizzes` → `quiz_questions` → `quiz_options` (correct flags);
  a student run is a `quiz_attempt` with `quiz_answers`. Quizzes may be AI-generated drafts.
- **Gamification** — `certificates` (PDF URL), `badges` + `user_badges`, `streaks` (one row per
  user: current/longest streak + last active date).
- **AI** — `ai_chat_sessions` (per user per course, with depth mode) → `ai_chat_messages`
  (sender, content, cited lecture IDs); `document_chunks` holds transcript chunks + embedding
  vectors (the tutor's "knowledge"); `study_plans`, `flashcards`, `recommendations`.
- **Community** — `discussion_threads` → `discussion_posts` (flaggable for moderation);
  `announcements` per course; `notifications` per user.
- **Governance** — `course_approvals` (admin decision + comment), `payments` (stub — no real
  gateway this build), `audit_logs` (who did what to which entity).

Deviations from PRD §7 to remember: no `roles`/`user_roles` tables (role column instead);
`users.id` is **text** (better-auth), so FKs to users are text while new tables get UUID PKs.

---

## 8. Features → Stack Map

### 8.1 Student module

| FR  | Feature               | Logic (how it works)                                                                                           | Lives in                                                        | Tech / concepts              |
| --- | --------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ---------------------------- |
| S1  | Register/login        | Form validates with shared zod schema → better-auth → session cookie → redirect                                | `pages/auth/*`, `auth-client.ts`                                | better-auth, sessions (§5.2) |
| S2  | Dashboard             | Fetch my enrollments joined with progress + streak row; render cards                                           | `pages/dashboard.vue`, `enrollments/me.get`                     | Drizzle joins                |
| S3  | Catalog               | Public list with category/difficulty/search/pagination; cached 5 min                                           | `pages/courses/index.vue`, `courses/index.get`                  | Redis cache (§5.12)          |
| S4  | Video player          | HTML5 video; restore `watched_seconds` on load; post progress ~every 10s; speed control                        | `player/VideoPlayer.vue`, `lectures/[id]/progress.post`         | Range streaming, throttling  |
| S5  | Notes & bookmarks     | Timestamped rows keyed to user+lecture; clicking seeks the player                                              | `player/NotesPanel.vue`, `lectures/[id]/{notes,bookmarks}.post` | —                            |
| S6  | Assignment submission | Multipart upload → storage service → submission row (before deadline check)                                    | `me/assignments.vue`, `assignments/[id]/submit.post`            | Storage interface (§3 #7)    |
| S7  | Quiz engine           | Start attempt → render by question type → submit → auto-grade objective types, short-answer flagged for review | `learn/.../quizzes/[quizId].vue`, `attempts/[id]/submit.post`   | Grading logic in service     |
| S8  | Certificates          | On 100% completion, enqueue PDF job → render → storage → row → notification                                    | worker `processors/certificate.ts`                              | Queue (§5.5), PDF gen        |
| S9  | Badges                | After quiz/course events, evaluate milestone rules, insert `user_badges`                                       | `gamification-service.ts`                                       | Rule evaluation              |
| S10 | Recommendations       | Nightly job scores courses vs. quiz history + embedding similarity; widget reads results                       | worker + `recommendations/me.get`                               | Embeddings (§5.7)            |

### 8.2 AI tutor module

| FR  | Feature                 | Logic                                                                                                                              | Lives in                                          | Tech / concepts       |
| --- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | --------------------- |
| A1  | Course-scoped chat      | Session row ties user+course+mode; messages append to it                                                                           | `ai-tutor/ChatPanel.vue`, `ai/chat/*`             | LLM (§5.6)            |
| A2  | RAG answers + citations | Embed question → top-k chunks of this course → prompt → Claude → store `source_lecture_ids` → citation chips deep-link to lectures | `services/ai/{retriever,chat}.ts`                 | **RAG (§5.9)**        |
| A3  | Lecture summaries       | Transcript (+ retrieved chunks if long) → summarize prompt → key points                                                            | `ai/lectures/[id]/summarize.post`                 | Prompting             |
| A4  | Study plans             | Quiz score history → plan prompt → JSON plan stored in `study_plans`                                                               | `me/study-plan.vue`, `ai/study-plan.post`         | Structured LLM output |
| A5  | Auto quiz drafts        | Transcript → generate 5–10 Q&A → saved as draft quiz (`is_ai_generated`) pending instructor approval                               | `ai/lectures/[id]/generate-quiz.post` + review UI | Structured LLM output |
| A6  | Depth modes             | Mode on the session changes the system prompt (beginner/intermediate/advanced explanation depth)                                   | `TutorModeToggle.vue`, `chat.ts`                  | Prompt engineering    |
| A7  | Flashcards              | Module content → Q/A pairs into `flashcards`; deck UI for revision                                                                 | `ai/modules/[id]/flashcards.post`                 | —                     |
| A8  | Mastery tracking        | Per-topic scores derived from quiz answers + interactions; feeds mode defaults and recommendations                                 | `services/ai/mastery.ts`                          | —                     |

### 8.3 Instructor module

| FR  | Feature            | Logic                                                                              | Lives in                                              | Tech / concepts  |
| --- | ------------------ | ---------------------------------------------------------------------------------- | ----------------------------------------------------- | ---------------- |
| I1  | Create course      | Form → course row `status: pending` (invisible in catalog until approved)          | `instructor/courses/new.vue`, `courses/index.post`    | RBAC + ownership |
| I2  | Material upload    | Video → storage; transcript → DB + enqueue embedding job                           | `LectureUploadForm.vue`, `modules/[id]/lectures.post` | Storage, queue   |
| I3  | Assignments        | Rubric JSON + deadline; submissions listed for grading                             | `instructor/.../grading.vue`                          | —                |
| I4  | Quiz build/approve | Manual builder, or AI draft → review/edit → approve                                | `instructor/.../quizzes.vue`                          | —                |
| I5  | Analytics          | Aggregate `lecture_progress` (drop-off), `quiz_attempts` (avg score), time-on-task | `instructor/.../analytics.vue`, chart components      | SQL aggregation  |
| I6  | Announcements      | Row per course → notifications fan-out to enrolled students                        | `AnnouncementComposer.vue`                            | Notification job |

### 8.4 Admin module

| FR  | Feature          | Logic                                                                                                                                   | Lives in                                           | Tech / concepts       |
| --- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | --------------------- |
| AD1 | Course approval  | Queue of `status: pending` → preview → approve/reject + comment → `course_approvals` row → notify instructor → invalidate catalog cache | `admin/approvals.vue`, `courses/[id]/approve.post` | Cache invalidation    |
| AD2 | User management  | Search/list; suspend = better-auth ban                                                                                                  | `admin/users.vue`                                  | better-auth admin API |
| AD3 | Platform metrics | Counts over users/enrollments/completions/payments                                                                                      | `admin/index.vue`, `admin/analytics/overview.get`  | SQL aggregation       |
| AD4 | Role management  | Set role via better-auth admin API (`adminRoles: ['admin']` guard)                                                                      | `RoleSelectDialog.vue`                             | RBAC                  |
| AD5 | Moderation       | List flagged posts → unflag or delete                                                                                                   | `admin/moderation.vue`                             | —                     |

---

## 9. User Flows (logic, step by step)

### 9.1 Sign up → first enrollment

1. Visitor opens `/auth/signup` (guest middleware; signed-in users are bounced away).
2. Form submits → better-auth creates the user with default role **student** and signs them in
   (httpOnly session cookie) → redirect to the page they originally wanted, else `/dashboard`.
3. They browse `/courses` (public, filters hit the cached catalog endpoint).
4. On a course page → **Enroll** → server checks session, creates the enrollment → redirect to
   `/learn/{courseId}` which computes the resume position (first incomplete lecture) and
   forwards to that lecture.

### 9.2 The learning loop (the daily habit)

1. Player loads lecture: streams video from `/api/lectures/{id}/video`, seeks to
   `watched_seconds`, posts progress every ~10s.
2. ≥90% watched → lecture marked complete → service recomputes the enrollment's
   `progress_percent`.
3. Student adds timestamped notes/bookmarks; opens the **AI tutor panel** when stuck (flow 9.3);
   asks for a **summary** after finishing a lecture.
4. Module finished → quiz unlocked → attempt → auto-graded → mastery scores update → weak
   topics surface in the study plan and recommendations.
5. Course hits 100% → certificate job → badges evaluated → notification. Daily streak is
   maintained by the streak job checking each day's activity.

### 9.3 AI tutor conversation (RAG — read with §5.9)

1. First question in a course creates a chat session (default mode: intermediate).
2. Each message: embed → retrieve top-k chunks **of this course** → assemble prompt (mode +
   chunks + recent history + question) → Claude → save both messages with source lecture IDs.
3. UI renders the reply with citation chips; clicking one jumps to that lecture/timestamp.
4. Switching depth mode re-phrases future answers (beginner = analogies, advanced = terse).

### 9.4 Instructor authoring → course goes live

1. Admin grants the **instructor** role (no self-service upgrade — PRD FR-AD4).
2. Instructor creates a course (pending) → adds modules → uploads lectures. Each transcript
   triggers the embedding job, making the lecture searchable by the tutor.
3. Quizzes: build manually, or click **Generate from lecture** → AI draft appears in the review
   list → edit/approve.
4. **Submit for approval** → admin approves → course becomes listed, catalog cache invalidated,
   instructor notified.
5. Ongoing: grade submissions, post announcements, watch drop-off analytics.

### 9.5 Admin governance

1. `/admin` shows platform health (DAU, enrollments, completion rate, revenue stub).
2. `/admin/approvals`: review pending courses → decision + comment recorded → notification out.
3. `/admin/users`: search → change role or suspend (ban) — both via better-auth admin API,
   both recorded in `audit_logs`.
4. `/admin/moderation`: flagged posts → unflag or remove.

---

## 10. Background Jobs (all BullMQ; producers in `server/queues/`, consumers in `worker/`)

| Job               | Trigger                                                | What it does                                                  | Concepts   |
| ----------------- | ------------------------------------------------------ | ------------------------------------------------------------- | ---------- |
| Embed lecture     | Lecture upload with transcript                         | Chunk → embed → insert `document_chunks`                      | §5.5, §5.9 |
| Certificate PDF   | Enrollment reaches 100%                                | Render PDF → storage → `certificates` row → notify            | §5.5       |
| Streak evaluation | Daily (repeatable job)                                 | For each active user: extend/reset streak from activity dates | cron-style |
| Recommendations   | Nightly (repeatable)                                   | Recompute per-user course scores into `recommendations`       | §5.7       |
| Notifications     | Events (grade posted, approval decision, announcement) | Insert `notifications` row + send email if configured         | —          |

---

## 11. Build Order — 4 Weeks

Current state: **Week 1 Days 1–3 done** (repo, Docker Postgres, auth + roles, auth pages,
route middleware, base UI). Each week ends demoable; buffer days absorb overruns (PRD §12.1).

### Week 1 — Foundation & catalog (finish the loop: register → browse → enroll)

- ✅ Day 1–3: repo, DB, auth, RBAC base
- ⬜ Day 4: `courses.ts` schema (courses/modules/lectures) → migrate → catalog + course CRUD
  routes with validation, ownership checks, pagination
- ⬜ Day 5: catalog page + course detail page (public), enroll endpoint + button
- ⬜ Day 6–7: student dashboard wired to real enrollments; buffer + tests
- **Milestone:** register → login → browse → enroll works end-to-end.

### Week 2 — Learning core

- ⬜ Day 8: storage service (local disk) + lecture upload + video streaming route
- ⬜ Day 9: progress tracking (resume, throttle), notes, bookmarks — player page assembled
- ⬜ Day 10: assignments (create/submit/grade)
- ⬜ Day 11: quiz builder + attempt + auto-grading
- ⬜ Day 12: **add Redis to docker-compose + worker skeleton** → certificate PDF job, badges,
  daily streak job
- ⬜ Day 13–14: instructor analytics; buffer + tests
- **Milestone:** a student completes a full course loop and gets a certificate.

### Week 3 — AI tutor

- ⬜ Day 15: pick embeddings provider (§3 #9) → `ai.ts` schema incl. pgvector → `llm-client` +
  `embeddings` clients
- ⬜ Day 16: ingestion pipeline (chunking + embedding job) — verify retrieval quality by hand
- ⬜ Day 17: chat endpoint with citations + chat panel UI
- ⬜ Day 18: summarize + flashcards
- ⬜ Day 19: quiz generation + instructor review UI
- ⬜ Day 20–21: depth modes, mastery, study plan, recommendations job; buffer
- **Milestone:** tutor answers course-grounded questions with citations; drafts quizzes.

### Week 4 — Admin, community, hardening, ship

- ⬜ Day 22: admin users + approvals
- ⬜ Day 23: admin analytics + moderation
- ⬜ Day 24: discussions, announcements, notifications (in-app; email if time)
- ⬜ Day 25: dark-mode pass, accessibility pass, rate limiting, caching pass
- ⬜ Day 26: containerize, CI pipeline, staging deploy
- ⬜ Day 27: load test basics, security review, bug fixes
- ⬜ Day 28: seed demo data, README, production deploy
- **Milestone:** all three workspaces live end-to-end.

---

## 12. Conventions & Rules (keep the codebase healthy)

**Where does X go?**

| Writing…                          | Put it in                                                                         |
| --------------------------------- | --------------------------------------------------------------------------------- |
| A page / URL                      | `app/pages/` (guard via `middleware/`, shell via `layouts/workspace.vue`)         |
| UI built from shadcn parts        | `app/components/<domain>/` — registry-first, compose second, flag gaps            |
| A fetch of server data            | `app/composables/use<Thing>.ts` wrapping `useFetch`                               |
| An endpoint                       | `server/api/<resource>/...` — **thin**: validate → guard → call service → respond |
| Business rules / ownership checks | `server/services/<domain>-service.ts`                                             |
| Anything LLM/RAG                  | `server/services/ai/`                                                             |
| Slow or scheduled work            | enqueue in `server/queues/`, consume in `worker/processors/`                      |
| A request/response shape          | zod in `shared/validation/`, return type in `shared/types/`                       |
| A table                           | `server/db/schema/<domain>.ts` → `pnpm db:generate` → `pnpm db:migrate`           |

**Hard rules**

1. Routes never contain business logic; services never touch HTTP objects (pass plain args).
2. UI comes from shadcn-vue only; semantic color tokens, no raw colors, no `space-*` (use `gap-*`).
3. Every mutation validates its body with a `shared/validation` zod schema — same schema as the
   client form.
4. Secrets only in `.env` / server code — never in `app/` code.
5. Worker and web share code **only** through `server/` + `shared/`, never through `app/`.
6. Explicit imports (this repo disables auto-scanning of components/composables).
7. After changing code: `pnpm validate` must pass before finishing.

---

## 13. Configuration / Environment Variables

- `DATABASE_URL` — Postgres connection (docker-compose in dev)
- `REDIS_URL` — Redis connection (Week 2+)
- `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` — auth
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` — optional social login
- `ANTHROPIC_API_KEY` — LLM (Week 3)
- Embeddings provider key — Week 3, name depends on §3 #9
- `STORAGE_DRIVER` (`local` | `s3`), `STORAGE_DIR` — storage swap point
- Email provider vars — Week 4 (if email notifications are enabled)

---

## 14. Decisions Deferred (with their deadlines)

| Decision                               | Deadline                             | Default leaning                                              |
| -------------------------------------- | ------------------------------------ | ------------------------------------------------------------ |
| Embeddings provider + vector dimension | Week 3 Day 1 (before `ai.ts` schema) | OpenAI `text-embedding-3-small` (1536 dims, matches PRD DDL) |
| Email sending provider                 | Week 4 Day 24                        | In-app notifications first; email if time                    |
| S3 credentials/bucket                  | Deploy (Week 4 Day 26)               | Local disk until then                                        |
| Deployment target                      | Week 4 Day 26                        | Single container host running web + worker                   |
| Payments                               | Out of scope (PRD §15)               | `payments` table is a stub for metrics shape only            |
